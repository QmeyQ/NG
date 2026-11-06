/**
 * Cloud - 云函数调用(直连优先 + Worker 代理回退) + 用户本地管理(IDB)
 *
 * 调用通道(见 agcCore/agcWeb/agcWx):
 *   微信端 → agcWx 直连 AGC 网关(wx.request 无 CORS), 失败回退 Worker
 *   web 端 → 恒走 Worker 代理(华为 wisefunction 网关不回 CORS 头, 浏览器预检 404, 直连无解;
 *            需要时才用 --define:AGCWEB=true 打开)
 *   注册   → POST Worker /token {reg:true}: 限流 + te reg + 下发直连 token
 *   Worker → POST {BASE} {name, data} 传统代理通道(回退/管理端 mag 用)
 *
 * te 云函数 t 分发: reg / agt / gt(单独取 GOBE token) / gprobe / user / bag / set / buy / del
 * 联机 accessToken 不单独要: reg 与 bag(d.gt=1, 即登录验证) 的响应就带 gobe 字段, 见 netboot.ts
 * te 错误码: 0成功 1用户不存在 2认证失败 3背包数量不足 4金币不足 5参数错误 6已注册
 * Worker 侧码(与 te 同构的 { code, msg, wv } 形态, 老版 { error:{...} } 由本层归一):
 *   7注册过频 8用户请求过频 9注册须走/token 10 IP 频率限制(含封禁) 11 Worker/上游异常
 *   限流类(7/8/10)带 retryAfter(秒), 客户端必须退避——即时连打只会加长封禁
 *
 * 本地用户记录(idb mainStore key=cloud_user):
 *   { userid, key(密匙), name, flag, head, dollar, bag, bagSynced }
 */
import { Timer } from "./time";
import { IDBStorage } from "./IDBStorage";
import { pFetch, wxEnv } from "./wx";
import { agcRegister, AGC_PROXY, AgcTokenRes, isLimitedRes, parseWorkerRes, seedGobe } from "./agcCore";
import { webCall, webReady } from "./agcWeb";
import { wxCall } from "./agcWx";

export interface CloudUser {
    userid: string;
    key: string;
    name: string;
    flag: string;
    head: string;
    dollar: number;
    bag: Record<string, number>;
    bagSynced: boolean;
}

export class Cloud {
    static BASE: string = AGC_PROXY;

    /** 最近一次失败的提示文案(限流原因等), 供 UI 直接展示; 成功时清空 */
    static lastMsg: string = "";

    private static db: IDBStorage = new IDBStorage();
    private static _user: CloudUser | null = null;
    private static _reging: boolean = false;
    private static _regCallbacks: Array<(u: CloudUser | null) => void> = [];
    private static _initing: boolean = false;
    private static _initCallbacks: Array<(u: CloudUser | null, from?: "local" | "reg") => void> = [];

    // ==================== 基础调用 ====================

    /** 调用云函数: Cloud.call(name, 参数json, callback) */
    static call(name: string, data: any, callback?: (res: any) => void): Promise<any> {
        const p = pFetch(Cloud.BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name, data: data })
        }).then((r) => r.text().then((txt) => parseWorkerRes(r.status || 0, txt))
        ).catch((e): any => {
            console.error("[Cloud] 调用失败:", e);
            return null;
        });
        if (callback) p.then((res) => callback(res));
        return p;
    }

    /** te 云函数快捷调用(Worker 代理直通, 回退通道) */
    static te(t: string, d: any, callback?: (res: any) => void): Promise<any> {
        return Cloud.call("te", { t: t, d: d }, callback);
    }

    /**
     * te 单次调用: 平台直连优先, Worker 代理兜底
     * 返回形态: 业务 JSON | null
     * safe=true(幂等读): 直连网络失败回退 Worker 重发(请求可能未达, 安全)
     * safe=false(非幂等写 user/set/buy/del): 直连请求已发出但失败时不回退(防重复扣费),
     *   直连通道未启用(token 未取到/降级)才走 Worker
     */
    private static teOnce(t: string, d: any, cb: (res: any) => void, safe: boolean = true): void {
        const a = Cloud.auth();
        let p: Promise<any>;
        if (a && wxEnv) {
            p = wxCall("te", { t: t, d: d }, a.userid, a.key);
        } else if (a && webReady()) {
            p = webCall("te", { t: t, d: d }, a.userid, a.key);
        } else {
            p = Promise.resolve(undefined);
        }
        p.then((res: any) => {
            if (res != null) { cb(res); return; }
            if (res === null && !safe) { cb(null); return; }
            Cloud.te(t, d, cb);
        });
    }

    /**
     * te 调用 + 多实例容错重试
     * AGC 函数多实例各自独立文件系统, 请求随机分流: code 1(该实例无用户数据)
     * 或网络失败(null)时自动重试(相当于换实例), 全部尝试完才把最后结果交给回调
     */
    private static teRetry(t: string, d: any, attempts: number, callback?: (res: any) => void): void {
        let left = attempts;
        const once = (): void => {
            Cloud.teOnce(t, d, (res: any) => {
                // 限流响应带服务端 retryAfter, 继续即时重发只会在 Worker 侧把封禁越拉越长
                // → 立即交回上层提示(读请求幂等, 玩家手动重试即可)
                if (isLimitedRes(res)) {
                    Cloud.lastMsg = (res && res.msg) || "请求过于频繁，请稍后重试";
                    if (callback) callback(res);
                    return;
                }
                if (left > 1 && (res === null || (res && res.code === 1))) {
                    left--;
                    Timer.setTimeout(250, once);
                    return;
                }
                Cloud.lastMsg = "";
                if (callback) callback(res);
            });
        };
        once();
    }

    // ==================== 用户本地管理 ====================

    static getUser(): CloudUser | null {
        return Cloud._user;
    }

    private static save(cb?: () => void): void {
        if (!Cloud._user) return;
        Cloud.db.set("cloud_user", Cloud._user, () => cb && cb());
    }

    /**
     * 读取本地用户；没有有效本地身份时，只通过 Worker /token {reg:true} 注册。
     * 并发 init 共用一次读取/注册，确保每个调用方都收到回调。
     */
    static init(cb?: (u: CloudUser | null, from?: "local" | "reg") => void): void {
        if (cb) Cloud._initCallbacks.push(cb);
        if (Cloud._initing) return;
        Cloud._initing = true;
        Cloud.db.get("cloud_user", (rec: any) => {
            if (rec && rec.userid && rec.key) {
                Cloud._user = rec as CloudUser;
                Cloud.finishInit(Cloud._user, "local");
                return;
            }
            Cloud.reg((u) => Cloud.finishInit(u, "reg"));
        });
    }

    private static finishInit(u: CloudUser | null, from: "local" | "reg"): void {
        Cloud._initing = false;
        const callbacks = Cloud._initCallbacks.splice(0);
        callbacks.forEach((fn) => {
            try { fn(u, from); } catch (e) { console.error("[Cloud] init 回调异常:", e); }
        });
    }

    /**
     * 云端验证当前用户是否存在(强制走网络, 不受 bagSynced 缓存影响)
     * d.gt=1: 这一次"登录验证"顺带向服务端要联机(GOBE) accessToken,
     * 回到 seedGobe 存内存 → 选局页 NetBoot.ensure() 直接建会话, 玩家点匹配时不再单独换 token。
     * 返回: "ok"=存在(顺带同步背包/金币) / "gone"=用户不存在或已封禁(code 1/2)
     *      / "limited"=服务端限流(msg 为退避提示) / "err"=网络异常
     */
    static verify(cb?: (r: "ok" | "gone" | "limited" | "err", u?: CloudUser, msg?: string) => void): void {
        const a = Cloud.auth();
        if (!a) { if (cb) cb("err"); return; }
        Cloud.teRetry("bag", { userid: a.userid, key: a.key, gt: 1 }, 6, (res: any) => {
            if (res && res.code === 0) {
                if (res.gobe) seedGobe(a.userid, a.key, res.gobe);
                const u = Cloud._user;
                if (u) {
                    u.bag = res.bag || {};
                    if (res.dollar !== undefined) u.dollar = res.dollar;
                    u.bagSynced = true;
                    Cloud.save();
                }
                if (cb) cb("ok", Cloud._user || undefined);
            } else if (res && (res.code === 1 || res.code === 2)) {
                if (cb) cb("gone");
            } else if (isLimitedRes(res)) {
                if (cb) cb("limited", undefined, res.msg);
            } else {
                if (cb) cb("err");
            }
        });
    }

    /**
     * 注册: 唯一入口 POST Worker /token {reg:true}。
     * Worker 只做 IP 风控并调用 TE reg；不需要已有 userid/key。
     * 注册请求不自动重试，避免响应丢失时重复创建多个账号。
     */
    static reg(cb?: (u: CloudUser | null) => void): void {
        if (cb) Cloud._regCallbacks.push(cb);
        if (Cloud._reging) return;
        Cloud._reging = true;

        const finish = (u: CloudUser | null): void => {
            Cloud._reging = false;
            const callbacks = Cloud._regCallbacks.splice(0);
            callbacks.forEach((fn) => {
                try { fn(u); } catch (e) { console.error("[Cloud] 注册回调异常:", e); }
            });
        };

        agcRegister().then((r: AgcTokenRes | null) => {
            if (!r || r.code !== 0 || !r.key || !r.user) {
                console.error("[Cloud] 注册失败:", r);
                // 限流(7)/上游异常(11)等原因只有 Worker 知道, 透出去玩家才知道该等还是该重试
                Cloud.lastMsg = (r && r.msg) || "";
                finish(null);
                return;
            }
            Cloud.lastMsg = "";
            const u = r.user;
            const userid = String(u.userid || "");
            if (!userid) {
                console.error("[Cloud] 注册失败: 服务器未返回 userid");
                finish(null);
                return;
            }
            const name = u.name || ("玩家" + userid.slice(-4));
            const flag = u.flag || "美好的一天开始喽！";
            Cloud._user = {
                userid: userid,
                key: r.key,
                name: name,
                flag: flag,
                head: u.head || "",
                dollar: u.dollar !== undefined ? u.dollar : 1,
                bag: u.bag || {},
                bagSynced: true
            };
            Cloud.save(() => finish(Cloud._user));
        }).catch((e) => {
            console.error("[Cloud] 注册请求异常:", e);
            finish(null);
        });
    }

    private static auth(): { userid: string; key: string } | null {
        const u = Cloud._user;
        return u ? { userid: u.userid, key: u.key } : null;
    }

    /** 更新昵称/签名：先做本地前置校验并乐观更新 UI 数据，云端返回后以服务端 user 为准。 */
    static update(fields: { name?: string; flag?: string }, cb?: (res: any) => void): void {
        const a = Cloud.auth();
        const u = Cloud._user;
        if (!a || !u) { if (cb) cb(null); return; }

        // 调用方只在用户确实编辑过昵称时传 name；改名每次消耗 1 金币。
        const rename = fields.name !== undefined;
        if (rename && (Number(u.dollar) || 0) < 1) {
            if (cb) cb({ code: 4 });
            return;
        }

        const before = { name: u.name, flag: u.flag, dollar: u.dollar };
        const d: any = { userid: a.userid, key: a.key };
        if (fields.name !== undefined) d.name = fields.name;
        if (fields.flag !== undefined) d.flag = fields.flag;

        // 乐观更新：先改内存态并持久化，界面可以立即显示；随后仍由服务端最终校准。
        if (fields.name !== undefined) u.name = fields.name;
        if (fields.flag !== undefined) u.flag = fields.flag;
        if (rename) u.dollar = Math.max(0, (Number(u.dollar) || 0) - 1);
        Cloud.save();

        // 非幂等写不自动重试，避免响应丢失时重复扣费。
        Cloud.teOnce("user", d, (res: any) => {
            if (res && res.code === 0 && res.user) {
                Cloud.applyUser(res.user); // 以云端完整状态覆盖乐观状态
            } else {
                // 失败时撤销本次乐观变更；使用增量回滚金币，避免覆盖其他本地金币变动。
                if (Cloud._user === u) {
                    if (fields.name !== undefined && u.name === fields.name) u.name = before.name;
                    if (fields.flag !== undefined && u.flag === fields.flag) u.flag = before.flag;
                    if (rename) u.dollar = (Number(u.dollar) || 0) + 1;
                    Cloud.save();
                }
            }
            if (cb) cb(res);
        }, false);
    }

    /** 应用服务端返回的 user 数据到本地并落盘 */
    static applyUser(user: any): void {
        if (!Cloud._user || !user) return;
        const u = Cloud._user;
        if (user.name !== undefined) u.name = user.name;
        if (user.flag !== undefined) u.flag = user.flag;
        if (user.head !== undefined) u.head = user.head;
        if (user.dollar !== undefined) u.dollar = user.dollar;
        if (user.bag !== undefined) {
            u.bag = user.bag;
            u.bagSynced = true;
        }
        Cloud.save();
    }

    /** 背包: 本地已同步则直接返回(尽量少调用云函数) */
    static loadBag(cb?: (bag: Record<string, number> | null) => void): void {
        const u = Cloud._user;
        if (!u) { if (cb) cb(null); return; }
        if (u.bagSynced) { if (cb) cb(u.bag); return; }
        const a = Cloud.auth();
        Cloud.teRetry("bag", { userid: a.userid, key: a.key }, 3, (res: any) => {
            if (res && res.code === 0) {
                u.bag = res.bag || {};
                if (res.dollar !== undefined) u.dollar = res.dollar;
                u.bagSynced = true;
                Cloud.save();
                if (cb) cb(u.bag);
            } else if (cb) cb(u.bag);
        });
    }

    /** 设置头像：本地先校验背包数量并乐观扣除 1，云端回复后以完整 user 状态校准。 */
    static setHead(head: string, cb?: (res: any) => void): void {
        const a = Cloud.auth();
        const u = Cloud._user;
        if (!a || !u) { if (cb) cb(null); return; }
        if (u.head === head) { if (cb) cb({ code: 0, user: u }); return; }

        // 背包尚未确认时先尝试拉取；不能拿未同步的本地数量作准。
        if (!u.bagSynced) {
            Cloud.loadBag(() => {
                if (!u.bagSynced) { if (cb) cb(null); return; }
                Cloud.setHead(head, cb);
            });
            return;
        }

        const count = Number(u.bag?.[head]) || 0;
        if (count < 1) { if (cb) cb({ code: 3 }); return; }

        const beforeHead = u.head;
        u.head = head;
        u.bag[head] = count - 1;
        if (u.bag[head] <= 0) delete u.bag[head];
        Cloud.save(); // 本地状态先完成

        // 非幂等写不自动重试，避免响应丢失时重复消耗背包。
        Cloud.teOnce("set", { head: head, userid: a.userid, key: a.key }, (res: any) => {
            if (res && res.code === 0 && res.user) {
                Cloud.applyUser(res.user); // 云端完整状态覆盖乐观状态
            } else {
                if (Cloud._user === u) {
                    if (u.head === head) u.head = beforeHead;
                    u.bag[head] = (Number(u.bag[head]) || 0) + 1;
                    Cloud.save();
                }
            }
            if (cb) cb(res);
        }, false);
    }

    /** 购买商品：本地先校验金币并乐观更新，云端回复后再校准完整用户状态。 */
    static buy(item: string, cb?: (res: any) => void): void {
        const a = Cloud.auth();
        const u = Cloud._user;
        if (!a || !u) { if (cb) cb(null); return; }

        const isDollar = /(^|\/)dollar\.png$/i.test(item);
        const coins = Number(u.dollar) || 0;
        if (coins < 1) { if (cb) cb({ code: 4 }); return; }

        // 本地立即执行：普通商品金币 -1、背包 +1；金币商品按现有规则净增加 4。
        u.dollar = isDollar ? coins + 4 : coins - 1;
        if (!isDollar) u.bag[item] = (Number(u.bag[item]) || 0) + 1;
        Cloud.save();

        // 非幂等写不自动重试；成功时用服务端返回的完整状态修正本地预测值。
        Cloud.teOnce("buy", { item: item, userid: a.userid, key: a.key }, (res: any) => {
            if (res && res.code === 0 && res.user) {
                Cloud.applyUser(res.user);
            } else {
                if (Cloud._user === u) {
                    u.dollar = (Number(u.dollar) || 0) + (isDollar ? -4 : 1);
                    if (!isDollar) {
                        const n = (Number(u.bag[item]) || 0) - 1;
                        if (n > 0) u.bag[item] = n;
                        else delete u.bag[item];
                    }
                    Cloud.save();
                }
            }
            if (cb) cb(res);
        }, false);
    }

    /** 注销: te t:"del" 服务端删除整个用户文件夹 + 清本地记录 */
    static del(cb?: (ok: boolean) => void): void {
        const a = Cloud.auth();
        if (!a) {
            Cloud.db.delete("cloud_user", () => {
                Cloud._user = null;
                if (cb) cb(true);
            });
            return;
        }
        Cloud.teOnce("del", { userid: a.userid, key: a.key }, (res: any) => {
            if (res && res.code === 0) {
                Cloud.db.delete("cloud_user", () => {
                    Cloud._user = null;
                    if (cb) cb(true);
                });
            } else if (cb) cb(false);
        }, false);
    }

    /**
     * 清空本地所有存储:
     * - localStorage(隐私同意状态等)
     * - IDB mainStore+fileStore(用户记录 cloud_user + 资源包索引/缓存 res_* + 断点续传状态)
     *   (Cloud.db 与 Res.net.storage 同库同 store, clear 一次全清)
     */
    static clearLocal(cb?: () => void): void {
        try { localStorage.clear(); } catch (e) { console.warn('[Cloud] localStorage 清空失败', e); }
        Cloud._user = null;
        Cloud.db.clear(() => { if (cb) cb(); });
    }
}
