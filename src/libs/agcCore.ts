/**
 * agcCore - AGC 云函数直连公共层(平台无关)
 *
 * 架构: Worker 既是凭据代理也是 web 端唯一通道(client_secret 不出 Worker):
 *   客户端 te 密匙 → POST Worker /token → access_token → 微信端直连 AGC 网关调函数
 *   web 端 → 一律 POST Worker / (华为网关不回 CORS 头, 预检 404, 直连不通)
 *   注册: POST Worker /token {reg:true} → Worker 限流 + te reg + 下发 token/key/user
 *
 * 宏 AGCWEB(控制 web 直连启用, 微信端恒走 agcWx 直连):
 *   - 未 define(默认): 运行时兜底 = !wxEnv, 即微信端恒 false
 *   - release 同步时 esbuild --define:AGCWEB=false 可编译期消除 web 直连分支(不进微信包)
 *   - IDE 直发(未 define): typeof 守卫安全, 微信端永不执行 web 实现
 *
 * 直连协议(逆向自 Worker functionService 服务端 SDK 模式):
 *   POST {AGC_GW}api/wisefunction/functions/{AGC_HASH}/{name}-$latest
 *   Bearer token + clientid/productid 标识头, secret 绝不进前端
 */
import { wxEnv, pFetch } from "./wx";

/** 发布宏: esbuild --define:AGCWEB=false 编译期消除 web 直连; 未 define 时运行时兜底 */
declare const AGCWEB: boolean | undefined;

/**
 * web 直连启用开关: 只有显式 --define:AGCWEB=true 才开。
 * 运行时默认改为 false(原为 !wxEnv)的实测依据:
 *   OPTIONS https://connect-api.cloud.huawei.com/api/wisefunction/... → 404, 无 Access-Control-Allow-Origin
 * 该地址是 AGC 托管 API 网关, 预检进不到我们的函数代码, 函数里加头无效;
 * 而 Authorization/clientid/productid 是自定义头, 浏览器必发预检 → web 直连在这条链路上不可能通。
 * web 端一律走 Worker(www.normalgame.cn 预检实测 204 + ACAO:*), 微信端保留直连(wx.request 无 CORS)。
 */
export const agcWebOn: boolean = (typeof AGCWEB !== 'undefined') ? !!AGCWEB : false;

/** 本端能否直连 AGC 网关: 微信端恒可, web 端仅当宏显式打开 */
export function directAllowed(): boolean {
    return wxEnv || agcWebOn;
}

// ==================== AGC 公开标识(网关路径组成, secret 只在 Worker) ====================

/** AGC 服务端网关(CN 区) */
export const AGC_GW = 'https://connect-api.cloud.huawei.com/';
/** 函数路径 hash = base62(md5("agc:{developerId}@{projectId}")) */
export const AGC_HASH = '44xzleD2Xjmz71HK0SE1Y8';
/** 项目凭据 client_id(标识头 clientid) */
export const AGC_CLIENT_ID = '1503913765794529216';
/** 项目 id(标识头 productid) */
export const AGC_PRODUCT_ID = '388421841221717430';

/** Worker 基址(cloud.ts Cloud.BASE 同源引用, 避免循环依赖) */
export const AGC_PROXY = 'https://www.normalgame.cn/';

// ==================== Worker 响应归一化 ====================

/** 限流类业务码: 服务端要求退避, 客户端不得即时重试 */
const LIMITED_CODES = [7, 8, 10];

/** 老版 Worker 的 { error:{ code:'RATE_LIMITED' } } 符号码 → 业务码 */
const ERROR_CODE_MAP: Record<string, number> = {
    RATE_LIMITED: 10,
    USER_RATE_LIMITED: 8,
    REGISTRATION_ENDPOINT_ONLY: 9,
    INTERNAL: 11,
    GET_ACCESS_TOKEN_FAIL: 11,
    GET_CREDENTIAL_NULL: 11,
    TIMEOUT_OUT_OF_RANGE: 5
};

/** 是否限流响应(需按 retryAfter 退避, 不能当"网络失败"去重发) */
export function isLimitedRes(res: any): boolean {
    return !!res && typeof res === 'object' && LIMITED_CODES.indexOf(Number(res.code)) >= 0;
}

/**
 * 一次 Worker HTTP 响应 → 业务形态 { code, msg, ... }
 * ①认 status(旧代码只看 body, 429/502 与 200 长得一样)
 * ②认 { error:{...} } 信封(旧代码交回上层后 code 恒 undefined, "被 IP 封禁"就退化成了
 *   无信息失败, 玩家重试反而把封禁越拉越长)
 * ③保留云函数返回值被二次序列化成字符串的 quirk
 * 网络级失败由调用方 catch 成 null, 不在此列(那才是可安全重发的情况)。
 */
export function parseWorkerRes(status: number, txt: string): any {
    let parsed: any;
    try {
        const v = JSON.parse(txt);
        parsed = (typeof v === 'string') ? JSON.parse(v) : v;
    } catch {
        parsed = null;
    }

    if (parsed === null || parsed === undefined) {
        // 非 JSON: Cloudflare/网关的 HTML 错误页、空响应
        console.error('[Agc] 响应非 JSON:', String(txt).slice(0, 200));
        return {
            code: status === 429 ? 10 : (status >= 500 ? 11 : 5),
            msg: status === 429 ? '请求过于频繁，请稍后重试' : '服务暂时不可用，请稍后重试',
            httpStatus: status
        };
    }
    if (typeof parsed !== 'object') return { code: 5, msg: String(parsed), httpStatus: status };
    if (typeof parsed.code === 'number') {
        parsed.httpStatus = status;
        return parsed;
    }
    if (parsed.error === undefined) {
        parsed.httpStatus = status;
        return parsed;
    }
    const e: any = typeof parsed.error === 'object' ? parsed.error : { message: String(parsed.error) };
    const code = ERROR_CODE_MAP[String(e.code)]
        || (status === 429 ? 10 : (status >= 500 ? 11 : 5));
    return {
        code: code,
        msg: e.message || String(e.code || '请求失败'),
        retryAfter: e.retryAfter,
        recent: e.recent,
        limit: e.limit,
        httpStatus: status
    };
}

/** 取响应文本并归一(status 与 body 一起看) */
function readBiz(r: any): Promise<any> {
    return r.text().then((txt: string) => parseWorkerRes(r.status || 0, txt));
}

// ==================== token 管理(Worker /token 换发) ====================

/** Worker /token 响应 */
export interface AgcTokenRes {
    code: number;
    token?: string;
    exp?: number;
    /** 注册分支附带 */
    key?: string;
    user?: any;
    msg?: string;
    /** 限流类(7/8/10)退避秒数, null=无期限(永久封禁) */
    retryAfter?: number | null;
    httpStatus?: number;
    /** 登录/注册顺带下发的联机(GOBE)凭据; 服务端换不到时为 null */
    gobe?: GobeCred | null;
    /** 单独取 GOBE token 时平级返回的应用标识 */
    clientId?: string;
    appId?: string;
}

/** 联机对战(GOBE)开发者 accessToken 及其配套标识 */
export interface GobeCred {
    token?: string;
    /** 剩余有效秒数 */
    exp?: number;
    clientId?: string;
    appId?: string;
}

let _tk: { token: string; exp: number; userid: string } | null = null;
let _tkPend: { userid: string; promise: Promise<AgcTokenRes | null> } | null = null;
let _regPend: Promise<AgcTokenRes | null> | null = null;

/** 内存注入 token；token 缓存绑定 userid，切换账号时必须重新向 Worker 验证。 */
export function agcSetToken(token: string, exp: number, userid: string): void {
    _tk = { token: token, exp: exp, userid: String(userid) };
}

function tokenFresh(userid: string): boolean {
    return !!_tk && _tk.userid === String(userid) && Date.now() < _tk.exp - 120 * 1000;
}

/**
 * 唯一注册入口：POST Worker /token { reg: true }。
 * 不传 userid/key；Worker 只做 IP 注册风控，成功后返回新用户及密匙。
 */
export function agcRegister(): Promise<AgcTokenRes | null> {
    if (_regPend) return _regPend;
    const p = pFetch(AGC_PROXY + 'token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reg: true })
    }).then(readBiz).then((res): AgcTokenRes | null => {
        if (res && res.code === 0 && res.token && res.user && res.user.userid) {
            const exp = Date.now() + (Number(res.exp) || 3300) * 1000;
            agcSetToken(res.token, exp, String(res.user.userid));
            // 注册即带回联机 token: 存进缓存, 选局页 Gnet.init 直接复用, 不必再单独跑一次 /gobe/token
            seedGobe(String(res.user.userid), String(res.key || ''), res.gobe);
        }
        return res;
    }).catch((e): AgcTokenRes | null => {
        console.error('[Agc] /token 注册请求失败:', e);
        return null;
    });
    _regPend = p;
    p.then(() => { if (_regPend === p) _regPend = null; });
    return p;
}

/** 限流退避: userid → 解禁时刻。再请求只会把 Worker 侧封禁越拉越长 */
const _blocked: Record<string, number> = {};

function blockedRes(uid: string): AgcTokenRes | null {
    const until = _blocked[uid] || 0;
    if (until <= Date.now()) return null;
    return {
        code: 8,
        msg: '操作过于频繁，请 ' + Math.ceil((until - Date.now()) / 1000) + ' 秒后重试',
        retryAfter: Math.ceil((until - Date.now()) / 1000)
    };
}

function rememberBlock(uid: string, res: AgcTokenRes | null): void {
    if (!res || !isLimitedRes(res)) return;
    const sec = Number(res.retryAfter) > 0 ? Number(res.retryAfter) : 60;
    _blocked[uid] = Date.now() + sec * 1000;
}

/**
 * 获取已注册用户的 AGC access_token。
 * 必须提供 userid/key；首次或缓存过期时由 Worker 调用 TE agt 验证后换发。
 * 无凭据时直接失败，注册必须显式调用 agcRegister()。
 */
export function agcToken(userid?: string, key?: string): Promise<AgcTokenRes | null> {
    const uid = String(userid || '');
    const secret = String(key || '');
    if (!uid || !secret) {
        return Promise.resolve({ code: 5, msg: '缺少已注册用户 userid/key；请先完成注册' });
    }
    if (tokenFresh(uid)) {
        return Promise.resolve({ code: 0, token: _tk!.token, exp: Math.max(1, Math.floor((_tk!.exp - Date.now()) / 1000)) });
    }
    const blocked = blockedRes(uid);
    if (blocked) return Promise.resolve(blocked);
    if (_tkPend && _tkPend.userid === uid) return _tkPend.promise;

    const p = pFetch(AGC_PROXY + 'token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid: uid, key: secret, reg: false })
    }).then(readBiz).then((res): AgcTokenRes | null => {
        if (res && res.code === 0 && res.token) {
            const exp = Date.now() + (Number(res.exp) || 3300) * 1000;
            agcSetToken(res.token, exp, uid);
            seedGobe(uid, secret, res.gobe);
        }
        rememberBlock(uid, res);
        return res;
    }).catch((e): AgcTokenRes | null => {
        console.error('[Agc] /token 用户验证请求失败:', e);
        return null;
    });
    _tkPend = { userid: uid, promise: p };
    p.then(() => { if (_tkPend && _tkPend.promise === p) _tkPend = null; });
    return p;
}

let _gtk: { token: string; exp: number; identity: string; clientId: string; appId: string } | null = null;
let _gtkPend: { identity: string; promise: Promise<AgcTokenRes | null> } | null = null;

function gobeIdentity(userid: string, key: string): string {
    return String(userid) + ':' + String(key);
}

/** 距过期留 2 分钟余量(与 te 函数侧、Worker 侧三处口径一致) */
function gobeUsable(expMs: number): boolean {
    return Date.now() < expMs - 120 * 1000;
}

/**
 * 收下登录/注册顺带下发的联机 accessToken(存内存, 不落 IDB——有效期约 1 小时)。
 * @returns 是否注入成功(无 token 时 false, 调用方之后仍可自行取)
 */
export function seedGobe(userid: string, key: string, gobe?: GobeCred | null): boolean {
    if (!gobe || !gobe.token) return false;
    _gtk = {
        token: String(gobe.token),
        exp: Date.now() + (Number(gobe.exp) || 3300) * 1000,
        identity: gobeIdentity(userid, key),
        clientId: String(gobe.clientId || ''),
        appId: String(gobe.appId || '')
    };
    return true;
}

/** 缓存里的联机 accessToken 是否还能用(过期或换账号即 false) */
export function gobeFresh(userid: string, key: string): boolean {
    return !!_gtk && _gtk.identity === gobeIdentity(userid, key) && gobeUsable(_gtk.exp);
}

/**
 * 取联机对战(GOBE)开发者 accessToken
 * 正常路径不需要单独调用: 登录/注册的 gobe 字段已 seedGobe 进缓存, 命中即零请求返回。
 * 只有两种情况真的会打网络——token 到期、连接失败后 force 重取。
 * 前端只持 userid + 用户密匙, 真凭据在云函数环境变量里, 由 te 的 gt 分支向华为换。
 * 通道: 已持 AGC token 时直连云函数(省一趟 Worker 往返), 直连不通再回退 Worker /gobe/token。
 * 响应形态: { code, token, exp, clientId, appId } / { code, msg }
 */
export function gobeToken(userid?: string, key?: string, force: boolean = false): Promise<AgcTokenRes | null> {
    const uid = String(userid || '');
    const secret = String(key || '');
    if (!uid || !secret) return Promise.resolve({ code: 5, msg: '缺少已注册用户 userid/key' });
    const identity = gobeIdentity(uid, secret);
    if (!force && _gtk && _gtk.identity === identity && gobeUsable(_gtk.exp)) {
        return Promise.resolve({
            code: 0,
            token: _gtk.token,
            exp: Math.floor((_gtk.exp - Date.now()) / 1000),
            clientId: _gtk.clientId,
            appId: _gtk.appId
        });
    }
    if (_gtkPend && _gtkPend.identity === identity) return _gtkPend.promise;
    const blocked = blockedRes(identity);
    if (blocked) return Promise.resolve(blocked);

    const viaWorker = (): Promise<AgcTokenRes | null> =>
        pFetch(AGC_PROXY + 'gobe/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userid: uid, key: secret })
        }).then(readBiz).then((res): AgcTokenRes | null => {
            rememberBlock(identity, res);
            return (res && typeof res === 'object') ? res : null;
        }).catch((e): AgcTokenRes | null => {
            console.error('[Gobe] /gobe/token 调用失败:', e);
            return null;
        });

    const p = agcToken(uid, secret).then((t): Promise<AgcTokenRes | null> => {
        // 连 AGC token 都被限流, 再打 Worker 只会加重封禁
        if (t && isLimitedRes(t)) return Promise.resolve(t);
        // web 端不试直连(网关无 CORS, 白吃一次预检失败), 直接走 Worker
        if (!directAllowed() || !t || !t.token) return viaWorker();
        return agcDirect('te', { t: 'gt', d: { userid: uid, key: secret } }, t.token)
            .then((res): Promise<AgcTokenRes | null> => {
                // null = 直连根本没通(CORS/网络), 交给 Worker; 有响应就按业务码办
                if (res == null) return viaWorker();
                rememberBlock(identity, res);
                return Promise.resolve(typeof res === 'object' ? res : null);
            });
    });
    _gtkPend = { identity: identity, promise: p };
    p.then((res) => {
        if (res && res.code === 0 && res.token) {
            _gtk = {
                token: res.token,
                exp: Date.now() + (Number(res.exp) || 3300) * 1000,
                identity: identity,
                clientId: String(res.clientId || ''),
                appId: String(res.appId || '')
            };
        }
        if (_gtkPend && _gtkPend.promise === p) _gtkPend = null;
    });
    return p;
}

// ==================== 直连调用(平台无关, pFetch 自适应) ====================

/**
 * 直连 AGC 网关调云函数(须已持 token)
 * 返回: 业务 JSON / null(网络层失败, 调用方回退 Worker 代理)
 */
export function agcDirect(name: string, data: any, token: string): Promise<any> {
    // 客户端直连通道禁止注册；注册必须走 Worker /token {reg:true}，由 Worker 执行 IP 风控。
    if (name === 'te' && data && data.t === 'reg') {
        return Promise.resolve({ code: 9, msg: '注册必须通过 Worker /token {reg:true}' });
    }
    const url = AGC_GW + 'api/wisefunction/functions/' + AGC_HASH + '/' + name + '-$latest';
    return pFetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
            clientid: AGC_CLIENT_ID,
            productid: AGC_PRODUCT_ID,
            'x-nuwa-trace-id': ''
        },
        body: data === undefined ? '' : JSON.stringify(data)
    }).then((r) => r.text()).then((txt): any => {
        try {
            const v = JSON.parse(txt);
            return (typeof v === 'string') ? JSON.parse(v) : v;
        } catch (e) {
            console.error('[Agc] 直连响应解析失败:', txt.slice(0, 200));
            return null;
        }
    }).catch((e): any => {
        console.warn('[Agc] 直连失败(将回退 Worker):', e && e.message || e);
        return null;
    });
}