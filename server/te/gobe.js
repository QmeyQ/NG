/**
 * te/gobe.js - 在云函数侧换取 GOBE(联机对战)开发者 accessToken
 *
 * 为什么在函数里取而不是在 Cloudflare Worker 里取:
 *   华为 CN 客户端网关 connect-drcn.dbankcloud.cn 会拦截 Workers 出网
 *   (实测 501 invalid request, 见 server/cloud/src/agc/tokenService.js 同款坑),
 *   而云函数本身跑在华为网络里, 直连该网关正常。
 *
 * 凭据只从函数环境变量读(AGC 控制台 → 云函数 → 配置 → 环境变量), 不落仓库:
 *   GOBE_CLIENT_ID / GOBE_CLIENT_SECRET / GOBE_APP_ID
 *
 * 实例内缓存: GOBE token 有效期约 1 小时, 提前 2 分钟刷新; 失败时保留逐网关现场。
 */
const https = require('https');

const TOKEN_PATH = '/agc/apigw/oauth2/v1/token';
/** 依次尝试的签发网关(CN 优先, 其余为兜底), token 与后续调用须同网关 */
const GATEWAYS = [
    'connect-drcn.dbankcloud.cn',
    'connect-dra.dbankcloud.cn',
    'connect-drru.hispace.dbankcloud.ru',
    'connect-dre.dbankcloud.cn'
];
const EARLY_MS = 120 * 1000;
const TIMEOUT_MS = 8000;

let cached = null;   // { token, expireAt, gateway }
let pending = null;  // 并发去重

/** 用内置 https, 不给函数包加依赖(打包体积与安装失败风险都归零) */
function postToken(host, body) {
    return new Promise((resolve) => {
        const req = https.request({
            host,
            path: TOKEN_PATH,
            method: 'POST',
            timeout: TIMEOUT_MS,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, (res) => {
            let text = '';
            res.setEncoding('utf8');
            res.on('data', (c) => { text += c; });
            res.on('end', () => resolve({ status: res.statusCode, text }));
        });
        req.on('timeout', () => { req.destroy(new Error('timeout ' + TIMEOUT_MS + 'ms')); });
        req.on('error', (e) => resolve({ status: 0, text: '', error: String(e && e.message || e) }));
        req.write(body);
        req.end();
    });
}

/** 打一次网关列表, 成功即缓存; 全程失败返回逐网关现场(不含 secret/token) */
async function fetchFromGateways() {
    const cred = {
        clientId: String(process.env.GOBE_CLIENT_ID || ''),
        clientSecret: String(process.env.GOBE_CLIENT_SECRET || '')
    };
    if (!cred.clientId || !cred.clientSecret) {
        return { ok: false, fatal: '缺少环境变量 GOBE_CLIENT_ID / GOBE_CLIENT_SECRET', attempts: [] };
    }

    const body = JSON.stringify({
        useJwt: 0,
        grant_type: 'client_credentials',
        client_id: cred.clientId,
        client_secret: cred.clientSecret
    });

    const attempts = [];
    for (const host of GATEWAYS) {
        const r = await postToken(host, body);
        let json = null;
        try { json = JSON.parse(r.text); } catch (e) { /* 拦截页是 HTML */ }
        const ok = r.status === 200 && json && !!json.access_token;
        attempts.push({
            host,
            status: r.status,
            ok,
            code: json && (json.code !== undefined ? json.code : (json.ret && json.ret.code)),
            error: r.error || null,
            bodyHead: (r.text || '').slice(0, 160)
        });
        if (ok) {
            const ttl = Number(json.expires_in) > 0 ? Number(json.expires_in) : 3600;
            cached = {
                token: json.access_token,
                expireAt: Date.now() + ttl * 1000,
                gateway: host
            };
            return { ok: true, attempts };
        }
    }
    return { ok: false, attempts };
}

/**
 * 取 GOBE accessToken。
 * 恒返回对象(不返回 null): 成功 {ok:true, token, expiresIn, gateway};
 * 失败 {ok:false, fatal?, attempts:[逐网关现场]} —— 让调用方一次调用就看到真相,
 * 不必再多跑一次 gprobe。
 */
async function getGobeToken() {
    if (cached && Date.now() < cached.expireAt - EARLY_MS) {
        return { ok: true, token: cached.token, expiresIn: Math.round((cached.expireAt - Date.now()) / 1000), gateway: cached.gateway };
    }
    if (!pending) {
        pending = fetchFromGateways().finally(() => { pending = null; });
    }
    const r = await pending;
    if (!r.ok || !cached) return { ok: false, fatal: r.fatal || null, attempts: r.attempts || [] };
    return { ok: true, token: cached.token, expiresIn: Math.round((cached.expireAt - Date.now()) / 1000), gateway: cached.gateway };
}

/**
 * 排障用: 强制走一遍网关列表并回传现场(不含 token/secret), 且顺带说明是否拿到。
 * 缓存命中时也照样探一次, 因为排查时关心的正是"现在还能不能通"。
 */
async function probeGobeToken() {
    const r = await fetchFromGateways();
    return {
        ok: r.ok,
        fatal: r.fatal || null,
        gateway: cached ? cached.gateway : null,
        ttlSec: cached ? Math.round((cached.expireAt - Date.now()) / 1000) : null,
        envSeen: { clientId: !!process.env.GOBE_CLIENT_ID, clientSecret: !!process.env.GOBE_CLIENT_SECRET, appId: !!process.env.GOBE_APP_ID },
        attempts: r.attempts
    };
}

module.exports = { getGobeToken, probeGobeToken };
