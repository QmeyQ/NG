/**
 * AGC 云函数代理 Worker
 *
 * 请求：
 * POST /              云函数调用
 * POST /token         AGC accessToken 换发 / 注册(两条分支都顺带回传 gobe{token,exp,clientId,appId})
 * POST /gobe/token    GOBE Token 换发(连接失败/到期时的单独取用入口)
 * GET  /gobe/debug    服务端排障快照(不含任何密钥)
 * GET  /health        健康检查
 *
 * 响应信封(客户端只认业务形态, 见 src/libs/cloud.ts):
 *   业务态一律 { code, msg, wv, ...extra }, 与 te 云函数的 { code, v, msg } 同构;
 *   code: 0成功 1用户不存在 2认证失败 3背包不足 4金币不足 5参数/路由错误
 *         6已注册 7注册过频 8用户请求过频 9注册须走/token 10 IP 频率限制
 *         11 Worker/上游异常
 *   限流类额外带 retryAfter(秒, null=永久), HTTP 同步给 Retry-After 头。
 *   error 字段保留(老客户端 gobeToken 分支在读), 与新客户端的 code 判定并存。
 */

import { parseCredential } from './agc/credential.js';
import { getClientCredential } from './agc/servicesConfig.js';
import { callFunction } from './agc/functionService.js';
import { getAccessToken } from './agc/tokenService.js';

import { AgcError, FunctionErrorCode } from './agc/error.js';
import {
  getClientIp,
  gate,
  getRiskSnapshot,
  regAllowed,
  regHit,
  regResetSec,
  userHistoryGate
} from './risk.js';
import { getUserCallHistory } from './agc.js';

/** Worker 版本号, 排障时与 te 的 v 区分开(故用 wv 字段) */
const WORKER_VERSION = 'v1106a';

async function resolveCredential(env) {
  if (env.AGC_CREDENTIAL || env.AGC_CLIENT_ID) {
    return parseCredential(env);
  }
  try {
    return await getClientCredential();
  } catch (err) {
    throw new AgcError(
      FunctionErrorCode.GET_CREDENTIAL_NULL,
      `agconnect-services.json 配置无效: ${err.message}`
    );
  }
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;

    // ================= 静态资源跨域 =================
    if (path.startsWith('/js/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
      }
      const response = await fetch(request);
      const newResponse = new Response(response.body, response);
      const cors = corsHeaders();
      Object.entries(cors).forEach(([k, v]) => { newResponse.headers.set(k, v); });
      newResponse.headers.append('Vary', 'Origin');
      return newResponse;
    }

    // ================= CORS 预检 =================
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // ================= IP 风控（不允许 SRV_KEY 绕过） =================
    const ip = getClientIp(request);
    const ipGate = gate(ip);
    if (!ipGate.ok) {
      const msg = ipGate.retryAfter === null
        ? '请求过于频繁，IP 已被永久封禁'
        : `请求过于频繁，请 ${ipGate.retryAfter} 秒后再试`;
      // code 10 + retryAfter: 客户端据此退避, 不再 250ms 连打加剧封禁
      return bizResponse(10, msg, {
        status: 429,
        retryAfter: ipGate.retryAfter,
        error: {
          code: 'RATE_LIMITED',
          message: msg,
          level: ipGate.level,
          retryAfter: ipGate.retryAfter
        }
      });
    }

    const url = new URL(request.url);

    // ================= 健康检查 =================
    if (request.method === 'GET' && url.pathname === '/health') {
      return jsonResponse({ ok: true, wv: WORKER_VERSION });
    }

    // ================= 排障快照 =================
    // 客户端(Gnet.runDiagnostics)在 GOBE init 失败时 GET 此地址看服务端真实配置与
    // 最近一次换 token 的失败现场。只回标识/状态, 不含 secret/token。
    if (request.method === 'GET' && url.pathname === '/gobe/debug') {
      return debugSnapshot(env, ip);
    }

    // ================= 普通 Token 接口 =================
    if (request.method === 'POST' && url.pathname === '/token') {
      return tokenEndpoint(request, env);
    }

    // ================= GOBE Token 接口 =================
    if (request.method === 'POST' && url.pathname === '/gobe/token') {
      return gobeTokenEndpoint(request, env);
    }

    // ================= 云函数代理 =================
    if (
      request.method !== 'POST' ||
      !['/', '/call', '/function'].includes(url.pathname)
    ) {
      return bizResponse(5, `不支持的路径或方法: ${request.method} ${url.pathname}`, {
        status: 405,
        error: 'Method Not Allowed'
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return bizResponse(5, '请求体必须是合法 JSON', {
        status: 400,
        error: '请求体必须是合法 JSON'
      });
    }

    let funcParams;
    if (body && typeof body === 'object' && typeof body.name === 'string') {
      funcParams = {
        name: body.name,
        version: body.version ? String(body.version) : '',
        data: body.data,
        timeout: Number(body.timeout) || undefined
      };
    } else if (env.AGC_DEFAULT_FUNCTION_NAME) {
      funcParams = {
        name: env.AGC_DEFAULT_FUNCTION_NAME,
        version: '',
        data: body,
        timeout: undefined
      };
    } else {
      return bizResponse(5, '请求体需包含 name 字段，或配置 AGC_DEFAULT_FUNCTION_NAME', {
        status: 400,
        error: '请求体需包含 name 字段，或配置 AGC_DEFAULT_FUNCTION_NAME'
      });
    }

    // 注册只有 /token { reg: true } 一个入口。
    // 禁止通过普通云函数代理直接调用 te.reg，避免绕过注册接口策略。
    const isTeReg =
      funcParams.name === 'te' &&
      funcParams.data &&
      funcParams.data.t === 'reg';
    if (isTeReg) {
      return bizResponse(9, '注册请使用 POST /token，并传入 { reg: true }', {
        status: 400,
        error: {
          code: 'REGISTRATION_ENDPOINT_ONLY',
          message: '注册请使用 POST /token，并传入 { reg: true }'
        }
      });
    }

    const requestData = funcParams.data && typeof funcParams.data === 'object'
      ? funcParams.data : {};
    const requestDetails = requestData.d && typeof requestData.d === 'object'
      ? requestData.d : requestData;
    const historyUserId = requestData.t !== 'agt' && requestDetails.userid
      ? String(requestDetails.userid) : '';

    try {
      const cred = await resolveCredential(env);
      if (historyUserId) {
        let historyGate = null;
        try {
          const history = await getUserCallHistory(cred, env, historyUserId);
          historyGate = userHistoryGate(history, env);
        } catch (riskErr) {
          // CloudDB 直连查询失败不应拖垮正常业务；记录后放行（fail-open）
          console.error('[risk] CloudDB 风控查询失败，已放行:', riskErr && riskErr.message || riskErr);
        }
        if (historyGate && !historyGate.ok) {
          return bizResponse(8, '用户请求过于频繁，请稍后重试', {
            status: 429,
            retryAfter: historyGate.retryAfter,
            recent: historyGate.recent,
            limit: historyGate.limit,
            error: {
              code: historyGate.code,
              message: '用户请求过于频繁，请稍后重试',
              retryAfter: historyGate.retryAfter,
              recent: historyGate.recent,
              limit: historyGate.limit
            }
          });
        }
      }
      const result = await callFunction(cred, funcParams);
      return new Response(result, {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
};

// ==================================================
// 普通 Token 接口
// ==================================================

function parseTeResult(text) {
  try {
    const v = JSON.parse(text);
    return typeof v === 'string' ? JSON.parse(v) : v;
  } catch {
    return null;
  }
}

/**
 * 验证真实注册用户：te.agt 只做密匙计算校验，不查询用户记录。
 * te.bag 同时校验 userid/key 并读取用户记录，可识别已删除/不存在的用户。
 * bag 带 gt=1，因此登录响应顺带带回 GOBE accessToken(联机对战)，客户端不再单独请求。
 * withGobe=false 用于 /gobe/token：那次调用本身就在取 GOBE，不必让 bag 顺带再取一遍。
 */
async function verifyRegisteredUser(cred, userid, key, withGobe = true) {
  const checkText = await callFunction(cred, {
    name: 'te',
    version: '',
    data: { t: 'bag', d: withGobe ? { userid, key, gt: 1 } : { userid, key } }
  });
  const check = parseTeResult(checkText);
  if (!check || check.code !== 0) {
    return {
      ok: false,
      code: check && Number.isFinite(Number(check.code)) ? Number(check.code) : 5,
      msg: (check && check.msg) || (check && check.code === 1 ? '用户不存在或已失效' : '用户密匙验证失败')
    };
  }
  return { ok: true, gobe: check.gobe || null };
}

async function tokenEndpoint(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return bizResponse(5, '请求体必须是合法 JSON', { status: 400 });
  }

  const ip = getClientIp(request);

  // 注册是唯一允许无 userid/key 的入口；只执行 IP 注册风控。
  // 在解析 AGC 凭据/访问云函数之前先限流，避免被限流请求继续消耗上游资源。
  const isRegistration = !!(body && body.reg === true);
  if (isRegistration && !regAllowed(ip)) {
    return bizResponse(7, '注册过于频繁，请明日再试', {
      status: 429,
      retryAfter: regResetSec()
    });
  }

  try {
    const cred = await resolveCredential(env);

    // 注册分支：不调用 agt，不要求已有用户身份，只做 IP 风控。
    if (isRegistration) {
      // 先确保能取得 AGC Token，再创建用户，避免 Token 服务失败时留下已创建但客户端拿不到的账号。
      const token = await getAccessToken(cred);
      const regText = await callFunction(cred, {
        name: 'te',
        version: '',
        data: { t: 'reg', d: {} }
      });
      const reg = parseTeResult(regText);
      if (!reg || reg.code !== 0 || !reg.key || !reg.user) {
        return bizResponse((reg && reg.code) || 5, (reg && reg.msg) || '注册失败', {
          status: 502
        });
      }
      regHit(ip);
      // gobe: te reg 顺带换好的联机 accessToken(取不到时为 null, 客户端自己单独取)
      return bizResponse(0, 'ok', {
        key: reg.key,
        user: reg.user,
        token,
        exp: 3300,
        gobe: reg.gobe || null
      });
    }

    // 用户验证分支
    const userid = body && body.userid ? String(body.userid) : '';
    const key = body && body.key ? String(body.key) : '';
    if (!userid || !key) {
      return bizResponse(5, '缺少 userid/key', { status: 400 });
    }
    const verified = await verifyRegisteredUser(cred, userid, key);
    if (!verified.ok) {
      return bizResponse(verified.code, verified.msg, { status: 401 });
    }
    let historyGate = null;
    try {
      const history = await getUserCallHistory(cred, env, userid);
      historyGate = userHistoryGate(history, env);
    } catch (riskErr) {
      console.error('[risk] CloudDB 风控查询失败，已放行:', riskErr && riskErr.message || riskErr);
    }
    if (historyGate && !historyGate.ok) {
      return bizResponse(8, '用户请求过于频繁，请稍后重试', {
        status: 429,
        retryAfter: historyGate.retryAfter,
        recent: historyGate.recent,
        limit: historyGate.limit
      });
    }
    const token = await getAccessToken(cred);
    return bizResponse(0, 'ok', { token, exp: 3300, gobe: verified.gobe });

  } catch (err) {
    return errorResponse(err);
  }
}

// ==================================================
// GOBE Token 接口
// ==================================================

async function gobeTokenEndpoint(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return bizResponse(5, '请求体必须是合法 JSON', { status: 400 });
  }

  const userid = body && body.userid ? String(body.userid) : '';
  const key = body && body.key ? String(body.key) : '';
  if (!userid || !key) {
    return bizResponse(5, '缺少 userid/key', { status: 400 });
  }

  try {
    const cred = await resolveCredential(env);
    const verified = await verifyRegisteredUser(cred, userid, key, false);
    if (!verified.ok) {
      return bizResponse(verified.code, verified.msg, { status: 401 });
    }

    let historyGate = null;
    try {
      const history = await getUserCallHistory(cred, env, userid);
      historyGate = userHistoryGate(history, env);
    } catch (riskErr) {
      console.error('[risk] CloudDB 风控查询失败，已放行:', riskErr && riskErr.message || riskErr);
    }
    if (historyGate && !historyGate.ok) {
      return bizResponse(8, '用户请求过于频繁，请稍后重试', {
        status: 429,
        retryAfter: historyGate.retryAfter,
        recent: historyGate.recent,
        limit: historyGate.limit
      });
    }

    // GOBE accessToken 改由云函数侧换取: 云函数在华为网络内, 而 Worker 直连 CN 客户端网关
    // 会被拦(501)。te 的 gt 分支自带 code.keyOk 身份校验, 所以这里不额外传凭据。
    const gtText = await callFunction(cred, {
      name: 'te',
      version: '',
      data: { t: 'gt', d: { userid, key } }
    });
    const gt = parseTeResult(gtText);
    const gtCode = gt && Number.isFinite(Number(gt.code)) ? Number(gt.code) : 11;
    if (!gt || gt.code !== 0 || !gt.token) {
      // 记下现场供 /gobe/debug 回读, 同时透给客户端: 一次调用就能区分"凭据不对"与"网关拦截"
      lastGobeFailure = {
        at: Date.now(),
        code: gtCode,
        msg: (gt && gt.msg) || '获取联机 accessToken 失败',
        fatal: (gt && gt.fatal) || null,
        attempts: (gt && gt.attempts) || null
      };
      return bizResponse(gtCode, lastGobeFailure.msg, {
        status: gtCode === 2 ? 401 : 502,
        fatal: lastGobeFailure.fatal,
        attempts: lastGobeFailure.attempts
      });
    }
    lastGobeFailure = null;

    return bizResponse(0, 'ok', {
      token: gt.token,
      clientId: gt.clientId || env.GOBE_CLIENT_ID || '',
      appId: gt.appId || env.GOBE_APP_ID || '',
      exp: Number(gt.exp) || 3300
    });

  } catch (err) {
    return errorResponse(err);
  }
}

// ==================================================
// 错误处理
// ==================================================

function errorResponse(err) {
  if (err instanceof AgcError) {
    const status =
      err.code === FunctionErrorCode.GET_CREDENTIAL_NULL ? 500
      : err.code === FunctionErrorCode.TIMEOUT_OUT_OF_RANGE ? 400
      : err.code === FunctionErrorCode.GET_ACCESS_TOKEN_FAIL ? 502
      : 502;
    // 凭据/参数类错误客户端重试无意义(5), 上游换 token/调用失败可退避重试(11)
    const code = status === 400 ? 5 : 11;
    const extra = { status, error: { code: err.code, message: err.message } };
    if (err.detail !== undefined && err.detail !== '') {
      extra.error.detail = err.detail;
    }
    return bizResponse(code, err.message || '服务端配置异常', extra);
  }
  console.error('调用云函数失败:', err);
  return bizResponse(11, err.message || 'internal error', {
    status: 500,
    error: { code: 'INTERNAL', message: err.message || 'internal error' }
  });
}

// ==================================================
// 排障快照
// ==================================================

/**
 * 最近一次 gt(换 GOBE token) 的失败现场。
 * 这样 /gobe/debug 在"客户端已经试过并失败了"之后能直接给出原因, 而不必再造一个
 * 免登录入口去主动打华为 token 接口(那等于把刷华为配额的口子开在公网上)。
 */
let lastGobeFailure = null;

function debugSnapshot(env, ip) {
  const agcMode = (env.AGC_CREDENTIAL || env.AGC_CLIENT_ID) ? 'server-sdk' : 'zero-config';

  return bizResponse(0, 'ok', {
    serverTime: Date.now(),
    region: env.AGC_REGION || 'CN',
    agcMode,
    // GOBE token 已改由云函数侧换取: Worker 只保留标识 vars, 不需要再配 GOBE secret
    gobe: {
      sourcedFrom: 'te gt',
      clientId: env.GOBE_CLIENT_ID || '',
      appId: env.GOBE_APP_ID || '',
      workerHasClientSecret: !!env.GOBE_CLIENT_SECRET
    },
    lastGobeFailure,
    risk: getRiskSnapshot(ip)
  });
}

// ==================================================
// CORS / JSON
// ==================================================

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function jsonResponse(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(), ...headers }
  });
}

/**
 * 业务形态响应: 客户端(cloud.ts/agcCore.ts)只按 code 判定, 拿到 {error:...} 会退化成
 * 无信息的"未知失败"且不停重试。故所有 Worker 侧错误也带 code/msg/wv,
 * 限流再带 retryAfter(正文 + Retry-After 头)供客户端退避。
 * @param {number} code 业务码, 见文件头信封说明
 * @param {string} msg 可直接提示给玩家的文案
 * @param {object} extra 附加字段; status=HTTP 状态码, retryAfter=退避秒数(null=无期限)
 */
function bizResponse(code, msg, extra = {}) {
  const { status = 200, retryAfter, ...rest } = extra;
  const payload = { code, msg, wv: WORKER_VERSION, ...rest };
  if (retryAfter !== undefined) payload.retryAfter = retryAfter;
  const headers = {};
  if (typeof retryAfter === 'number' && retryAfter > 0) {
    headers['Retry-After'] = String(retryAfter);
  }
  return jsonResponse(payload, status, headers);
}