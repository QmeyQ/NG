/**
 * netboot - 联机对战(GOBE)会话初始化
 *
 * accessToken 在登录/注册的响应里就一起下发了(te reg / te bag(gt=1) / Worker /token 都带 gobe),
 * 所以正常路径这里只是"拿手上这张 token 建 client", 不发任何网络请求。
 * 只有两种情况会单独去换 token: accessToken 到期、连接失败后的重试(force)。
 *
 * 调用点: 选局页(slecet)拿到用户身份即调 ensure() 预热; 匹配页(load)复用同一个 client,
 * 失败/过期时才带 force 再进来。
 */
import { Gnet } from "./gobe/net";
import { Cloud } from "./cloud";
import { gobeToken, gobeFresh, AGC_PROXY } from "./agcCore";

type Done = (ok: boolean, msg?: string) => void;

/** init 失败时自动拉 Worker /gobe/debug 看服务端真实配置 */
Gnet.diagnoseEndpoint = (AGC_PROXY || '').replace(/\/+$/, '') + '/gobe/debug';

/** 进行中的初始化(并发调用挂同一队列, 只建一个 client) */
let _pending: Done[] | null = null;

/** GOBE 会话是否已就绪 */
export function ready(): boolean {
    return Gnet.checkInitialized();
}

/** 本会话 openId(GOBE 身份 = Cloud userid) */
export function openId(): string {
    const u = Cloud.getUser();
    return u ? String(u.userid || "") : "";
}

/** 手上的联机 accessToken 是否还有效(过期后 GOBE 会话必断, 调用方据此决定是否 force) */
export function tokenValid(): boolean {
    const u = Cloud.getUser();
    return !!u && !!u.key && gobeFresh(u.userid, u.key);
}

/**
 * 确保 Gnet 已初始化。
 * @param force 作废手上的 token 单独换一张新的并重建 client(连接失败 / token 到期)
 */
export function ensure(force: boolean, cb: Done): void {
    if (!force && ready()) { cb(true); return; }
    // 上一次 init 还没出结果: 排队等同一份结果, 不并发建 client
    if (_pending) { _pending.push(cb); return; }

    const u = Cloud.getUser();
    const userid = u ? String(u.userid || "") : "";
    const key = u ? String(u.key || "") : "";
    if (!userid || !key) { cb(false, "缺少用户身份，无法初始化联机服务"); return; }

    // 登录下发过就是纯内存命中(零请求), 打点用来确认"没单独调 accesstoken"
    const cached = gobeFresh(userid, key);
    _pending = [cb];

    // 旧 client 还挂在房间里时绝不能覆盖(丢 lastRoomId 就恢复不了原房间); 不在了才拆干净再建
    const old: any = Gnet.client;
    if (old && !Gnet.getRoom()) {
        try { old.removeAllListeners && old.removeAllListeners(); } catch (e) { /* 已半瘫的 client 摘监听会抛 */ }
        try { old.destroy && old.destroy(); } catch (e) { /* 同上: 尽力而为, 新 client 照建 */ }
        Gnet.client = null;
    }

    gobeToken(userid, key, force).then((r: any) => {
        if (!r || r.code !== 0 || !r.token) {
            finish(false, (r && r.msg) || "获取联机 accessToken 失败");
            return;
        }
        // 服务端下发的应用级标识优先, 缺失才回退常量(回退值须与 Worker vars/实时服务器同值)
        const clientId = r.clientId || Gnet.EXPECTED_CLIENT_ID;
        const appId = r.appId || Gnet.EXPECTED_APP_ID;

        console.info('[GOBE_INIT_DIAG]', JSON.stringify({
            event: 'init_started',
            clientId: clientId,
            appId: appId,
            clientIdMatchesExpected: clientId === Gnet.EXPECTED_CLIENT_ID,
            appIdMatchesExpected: appId === Gnet.EXPECTED_APP_ID,
            tokenFrom: cached ? 'login' : (force ? 'refetch' : 'fetch'),
            workerVersion: r.wv || null,
            openId: userid,
            tokenLength: r.token.length,
            tokenSegments: r.token.split('.').length,
        }));

        Gnet.init({
            clientId: clientId,
            appId: appId,
            accessToken: r.token,
            openId: userid
        }, (err: Error | null) => {
            if (err) { finish(false, err.message); return; }
            finish(true);
        });
    }).catch((e: any) => {
        finish(false, String((e && e.message) || e));
    });
}

/** 收口一次初始化: 所有等待者共享结果, 队列先清再回调(回调里再 ensure 不会被吞) */
function finish(ok: boolean, msg?: string): void {
    const list = _pending || [];
    _pending = null;
    list.forEach((fn) => {
        try { fn(ok, msg); } catch (e) { console.error("[netboot] 回调异常:", e); }
    });
}
