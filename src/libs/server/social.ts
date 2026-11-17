/**
 * Social - 社交服务层(好友/私信/群/战绩/排行/分享邀请)
 *
 * 消息转交契约(服务端不存会话, 只转交):
 *   发送 → 写入对方/群成员待转交缓冲 mes; 任何读到自己行的云函数响应都附带 mes;
 *   客户端把 mes 合并进本地收件缓存(IDB cloud_social.recvMsg)后回 ack(ids), 服务端删除已送达条目。
 *   会话/历史全在本地缓存, 服务端 mes 仅作"未送达"暂存。
 * 好友身价: request 携带 price(0..500, 默认1), 发送方扣、accept 到账接收方、reject 退还。
 * 屏蔽词: 服务端命中标记 w=1, 客户端渲染红色(仍转交)。
 * 群: group create 建群行+成员 social.g; msg 带 gid 转交全体成员。
 */
import { Cloud } from "./cloud";
import { IDBStorage } from "../IDBStorage";
import { Timer } from "../time";
import { wxEnv } from "../wx";
import { Gnet } from "../gobe/net";
import * as Lobby from "./lobby";

export interface FriendProfile {
    userid: string;
    name: string;
    head: string;
    flag: string;
    win: number;
    play: number;
}

export interface SocialState {
    f: string[];
    req: Array<{ id: string; ts: number; price?: number }>;
    blk: string[];
    g: string[];
}

export interface Message {
    id: string;
    from: string;
    to?: string;
    gid?: string;
    text: string;
    ts: number;
    /** 屏蔽词命中标记(服务端置 1), 客户端渲染红色 */
    w?: number;
    inv?: any;
    room?: string;
    invId?: string;
}

export interface MatchRecord {
    win: number;
    play: number;
    last: number;
    recent: Array<{ w: number; m: string; ts: number }>;
}

export interface GroupInfo { gid: string; name: string; members: string[]; owner?: string; }

interface LocalCache {
    profiles: Record<string, FriendProfile>;
    sentReq: string[];
    sentMsg: Message[];
    recvMsg: Message[];
    convs: Array<{ key: string; peer?: string; gid?: string; ts: number }>;
    groups: Record<string, GroupInfo>;
    readTs: number;
    invited: string;
    lastPrice: number;
}

const SENT_MSG_MAX = 200;
const RECV_MSG_MAX = 500;
const POLL_MS = 20000;
export const PRICE_MAX = 500;
export const PRICE_DEFAULT = 1;

export class Social {
    static lastMsg: string = "";
    static onChange: (() => void) | null = null;
    /** 新消息提醒回调(UI 注入: 声音+toast); suppressNotify=true(正在看聊天面板)时不提醒 */
    static onNewMessage: ((m: Message) => void) | null = null;
    static suppressNotify: boolean = false;
    private static fireNotify(m: Message): void {
        const me = Cloud.getUser();
        if (me && String(m.from) === me.userid) return; // 自己的消息不提醒
        if (Social.onNewMessage) { try { Social.onNewMessage(m); } catch (e) { } }
    }

    private static db: IDBStorage = new IDBStorage();
    private static cache: LocalCache = { profiles: {}, sentReq: [], sentMsg: [], recvMsg: [], convs: [], groups: {}, readTs: 0, invited: "", lastPrice: PRICE_DEFAULT };
    private static _state: SocialState = { f: [], req: [], blk: [], g: [] };
    private static _record: MatchRecord = { win: 0, play: 0, last: 0, recent: [] };
    private static _rank: FriendProfile[] = [];
    private static _ready: boolean = false;
    private static _syncing: boolean = false;
    private static _pollTid: string | null = null;
    private static _reqNotify: number = 0;

    static get ready(): boolean { return Social._ready; }
    static get state(): SocialState { return Social._state; }
    /** 本地收件缓存(转交送达后落本地) */
    static get mes(): Message[] { return Social.cache.recvMsg; }
    static get record(): MatchRecord { return Social._record; }
    static get rank(): FriendProfile[] { return Social._rank; }
    static get sentReq(): string[] { return Social.cache.sentReq; }
    static get sentMsg(): Message[] { return Social.cache.sentMsg; }
    static get readTs(): number { return Social.cache.readTs; }
    /** +号徽标: 好友申请+未读+实时请求通知 */
    static get badge(): number { return Social._state.req.length + Social.unread() + Social._reqNotify; }
    static bumpReqNotify(): void { Social._reqNotify++; Social.notify(); }
    /** GOBE 收到的消息落本地(不经过云) */
    static receiveLocal(m: Message): void {
        if (Social.cache.recvMsg.some(x => x.id === m.id)) return;
        Social.cache.recvMsg.push(m);
        if (Social.cache.recvMsg.length > RECV_MSG_MAX) Social.cache.recvMsg = Social.cache.recvMsg.slice(Social.cache.recvMsg.length - RECV_MSG_MAX);
        Social.save(); Social.notify(); Social.fireNotify(m);
    }
    static get groups(): Record<string, GroupInfo> { return Social.cache.groups; }
    static get lastPrice(): number { return Social.cache.lastPrice; }

    static init(cb?: () => void): void {
        if (Social._ready) { if (cb) cb(); return; }
        Social.db.get("cloud_social", (rec: any) => {
            if (rec && typeof rec === "object") {
                Social.cache.profiles = rec.profiles || {};
                Social.cache.sentReq = Array.isArray(rec.sentReq) ? rec.sentReq : [];
                Social.cache.sentMsg = Array.isArray(rec.sentMsg) ? rec.sentMsg : [];
                Social.cache.recvMsg = Array.isArray(rec.recvMsg) ? rec.recvMsg : [];
                Social.cache.convs = Array.isArray(rec.convs) ? rec.convs : [];
                Social.cache.groups = rec.groups || {};
                Social.cache.readTs = Number(rec.readTs) || 0;
                Social.cache.invited = String(rec.invited || "");
                Social.cache.lastPrice = Number(rec.lastPrice) >= 0 ? Number(rec.lastPrice) : PRICE_DEFAULT;
            }
            Social._ready = true;
            try { if (localStorage.getItem("qa")) (window as any).__Social = Social; } catch (e) { }
            Lobby.setSinks({
                chat: (m) => Social.receiveLocal(m),
                freq: () => { Social.bumpReqNotify(); Social.sync(); },
                cloud: (t, p, cb, gid) => Social.sendCloud(t, p, cb, gid),
                group: (gid, name, oldGids) => { Social.pruneLobbyConvs(gid, Lobby.region(), oldGids); Social.addConvEntry({ key: "g:" + gid, gid }); Social.notify(); },
                roomOf: (t) => { const p = Social.profile(t) as any; return p && p.room ? String(p.room) : ""; },
                sync: () => { Social.sync(); }
            });
            Social.captureInvite();
            if (cb) cb();
        });
    }

    private static save(): void { Social.db.set("cloud_social", Social.cache, (): void => { }); }
    static notify(): void { if (Social.onChange) { try { Social.onChange(); } catch (e) { console.error("[Social] onChange:", e); } } }
    private static fail(res: any, fallback: string): void {
        Social.lastMsg = (res && res.msg) || (res == null ? "网络异常，请检查网络后重试" : fallback);
    }

    static profile(id: string): FriendProfile | null { return Social.cache.profiles[String(id)] || null; }
    static group(gid: string): GroupInfo | null { return Social.cache.groups[String(gid)] || null; }

    static unread(): number { return Social.cache.recvMsg.filter(m => Number(m.ts) > Social.cache.readTs).length; }
    static markRead(): void {
        const last = Social.cache.recvMsg.reduce((a, m) => Math.max(a, Number(m.ts) || 0), 0);
        if (last > Social.cache.readTs) { Social.cache.readTs = last; Social.save(); Social.notify(); }
    }

    /** 转交送达: 合并待转交 mes 进本地收件缓存, 然后 ack 让服务端删除 */
    static handlePending(list: any): void {
        if (!Array.isArray(list) || !list.length) return;
        const have = new Set(Social.cache.recvMsg.map(m => String(m.id)));
        const add: Message[] = [];
        for (const m of list) {
            if (!m || !m.id || have.has(String(m.id))) continue;
            let text = String(m.text || ""); let inv: any = undefined; let room: string | undefined = undefined; let invId: string | undefined = undefined;
            // 转发经云兜底时 text 是 k 标签 JSON 载荷(chat/invite/invroom), 解析还原成结构化消息(与 GOBE 接收一致)
            if (text.charAt(0) === "{") { try { const d = JSON.parse(text); if (d && typeof d.k === "string") { if (d.k === "chat") text = String(d.text || ""); else if (d.k === "invite") { text = "[对局邀请] " + (d.invite && d.invite.mode === "doubles" ? "羽毛球双打" : "羽毛球单打"); inv = d.invite; } else if (d.k === "invroom") { text = "[对局房已建] 点击加入"; room = String(d.room || ""); invId = String(d.inviteId || ""); } } } catch (e) { } }
            add.push({ id: String(m.id), from: String(m.from || ""), gid: m.gid ? String(m.gid) : undefined, text, ts: Number(m.ts) || 0, w: Number(m.w) || 0, inv, room, invId });
            have.add(String(m.id));
        }
        if (!add.length) return;
        Social.cache.recvMsg = Social.cache.recvMsg.concat(add);
        if (Social.cache.recvMsg.length > RECV_MSG_MAX) Social.cache.recvMsg = Social.cache.recvMsg.slice(Social.cache.recvMsg.length - RECV_MSG_MAX);
        Social.save();
        Social.notify();
        for (const m of add) Social.fireNotify(m);
        Social.ack(add.map(m => m.id));
    }

    /** 送达确认: 服务端删除已缓存到本地的条目 */
    static ack(ids: string[]): void {
        const u = Cloud.getUser();
        if (!u || !ids.length) return;
        Cloud.teWrite("ack", { userid: u.userid, key: u.key, ids: ids }, (): void => { });
    }

    static sync(cb?: (ok: boolean) => void): void {
        const u = Cloud.getUser();
        if (!u) { Social.lastMsg = "尚未登录"; if (cb) cb(false); return; }
        if (Social._syncing) { if (cb) cb(false); return; }
        Social._syncing = true;
        Cloud.teSafe("sync", { userid: u.userid, key: u.key }, (res: any) => {
            Social._syncing = false;
            if (res && res.code === 0) {
                Social.lastMsg = "";
                Social._state = Object.assign({ f: [], req: [], blk: [], g: [] }, res.social || {});
                Social._reqNotify = 0;
                Social._record = res.record || { win: 0, play: 0, last: 0, recent: [] };
                Social.handlePending(res.mes);
                Social.cache.sentReq = Social.cache.sentReq.filter(id => Social._state.f.indexOf(id) < 0);
                const missing = Social._state.f.filter(id => !Social.cache.profiles[id]);
                Social.fetchProfiles(missing, () => { Social.save(); Social.notify(); if (cb) cb(true); });
            } else { Social.fail(res, "社交数据同步失败"); Social.notify(); if (cb) cb(false); }
        });
    }

    private static fetchProfiles(ids: string[], cb: () => void): void {
        const u = Cloud.getUser();
        if (!u || !ids.length) { cb(); return; }
        Cloud.teSafe("profiles", { userid: u.userid, key: u.key, ids: ids }, (res: any) => {
            if (res && res.code === 0 && Array.isArray(res.users)) for (const p of res.users) Social.cache.profiles[String(p.userid)] = p;
            cb();
        });
    }

    static find(target: string, cb?: (p: FriendProfile | null) => void): void {
        const u = Cloud.getUser();
        if (!u) { Social.lastMsg = "尚未登录"; if (cb) cb(null); return; }
        Cloud.teSafe("find", { userid: u.userid, key: u.key, target: target }, (res: any) => {
            if (res && res.code === 0 && res.user) { Social.lastMsg = ""; Social.cache.profiles[String(res.user.userid)] = res.user; Social.save(); if (cb) cb(res.user); }
            else { Social.fail(res, "未找到该用户"); if (cb) cb(null); }
        });
    }

    /** 好友申请(携带身价 price, 默认上次/1) */
    static request(target: string, cb?: (ok: boolean) => void): void {
        const u = Cloud.getUser();
        if (!u) { Social.lastMsg = "尚未登录"; if (cb) cb(false); return; }
        Cloud.teWrite("friend", { userid: u.userid, key: u.key, action: "request", target: target }, (res: any) => {
            if (res && res.code === 0) {
                Social.lastMsg = "";
                if (Social.cache.sentReq.indexOf(target) < 0) Social.cache.sentReq.push(target);
                Lobby.notifyFriendReq(target);
                Social.handlePending(res.mes);
                Social.save(); Social.notify(); if (cb) cb(true);
            } else { Social.fail(res, "好友申请失败"); Social.notify(); if (cb) cb(false); }
        });
    }

    /** 创建新聊天: 给选中好友建对话条目(没发过消息也出现在对话列表), 区别于建群 */
    static createChat(peer: string, cb?: (ok: boolean) => void): void {
        const key = "p:" + peer;
        if (!Social.cache.convs.some(c => c.key === key)) Social.cache.convs.push({ key, peer, ts: Date.now() });
        Social.save(); Social.notify(); if (cb) cb(true);
    }
    /** 大区群单例: 只保留当前大厅群对话条目, 清理历史重复大厅群 */
    static pruneLobbyConvs(keepGid: string, regionName?: string, oldGids?: string[]): void {
        const seen = new Set<string>();
        const rn = regionName || "";
        Social.cache.convs = Social.cache.convs.filter(c => {
            if (c.gid && c.gid !== keepGid) {
                const g = Social.cache.groups[c.gid];
                const isLobby = c.gid.indexOf("globby") === 0 || (oldGids || []).indexOf(c.gid) >= 0 || (g && rn && g.name && g.name.indexOf(rn + "区") === 0);
                if (isLobby) { const u = Cloud.getUser(); if (u) Cloud.teWrite("group", { userid: u.userid, key: u.key, action: "leave", gid: c.gid }, () => { }); return false; }
            }
            if (seen.has(c.key)) return false;
            seen.add(c.key); return true;
        });
        const badGid = (g?: string): boolean => !!g && g !== keepGid && (g.indexOf("globby") === 0 || (oldGids || []).indexOf(g) >= 0);
        Social.cache.recvMsg = Social.cache.recvMsg.filter(m => !badGid(m.gid));
        Social.cache.sentMsg = Social.cache.sentMsg.filter(m => !badGid(m.gid));
        Social.save();
    }
    static addConvEntry(entry: { key: string; peer?: string; gid?: string }): void {
        if (!Social.cache.convs.some(c => c.key === entry.key)) Social.cache.convs.push({ key: entry.key, peer: entry.peer, gid: entry.gid, ts: Date.now() });
        Social.save();
    }
    static get convs(): Array<{ key: string; peer?: string; gid?: string; ts: number }> { return Social.cache.convs; }

    /** 设置自己的身价(隐私栏; 0-500 默认1, 个人设置不涉及金币转移) */
    static setPrice(price: number, cb?: (ok: boolean) => void): void {
        const u = Cloud.getUser();
        if (!u) { Social.lastMsg = "尚未登录"; if (cb) cb(false); return; }
        let p = Math.trunc(Number(price));
        if (!isFinite(p) || p < 0) p = PRICE_DEFAULT;
        if (p > PRICE_MAX) p = PRICE_MAX;
        Cloud.teWrite("setprice", { userid: u.userid, key: u.key, price: p }, (res: any) => {
            if (res && res.code === 0) { Social.lastMsg = ""; Social._state = Object.assign({}, Social._state, { price: p }); Social.save(); Social.notify(); if (cb) cb(true); }
            else { Social.fail(res, "身价设置失败"); Social.notify(); if (cb) cb(false); }
        });
    }
    static get price(): number { return (Social._state as any).price >= 0 ? (Social._state as any).price : PRICE_DEFAULT; }

    static accept(id: string, cb?: (ok: boolean) => void): void { Social.friendAction("accept", id, cb); }
    static reject(id: string, cb?: (ok: boolean) => void): void { Social.friendAction("reject", id, cb); }
    static remove(id: string, cb?: (ok: boolean) => void): void { Social.friendAction("remove", id, cb); }

    private static friendAction(action: string, id: string, cb?: (ok: boolean) => void): void {
        const u = Cloud.getUser();
        if (!u) { Social.lastMsg = "尚未登录"; if (cb) cb(false); return; }
        Cloud.teWrite("friend", { userid: u.userid, key: u.key, action: action, target: id }, (res: any) => {
            try { (window as any).__friendLog = { action, id, code: res && res.code, msg: res && res.msg }; } catch (e) { }
            if (res && res.code === 0) {
                Social.lastMsg = "";
                if (action === "accept" && res.friend) Social.cache.profiles[String(res.friend.userid)] = res.friend;
                if (action === "accept") Lobby.notifyFriendAccept(id);
                if (action === "remove") { Social.cache.sentReq = Social.cache.sentReq.filter(x => x !== id); delete Social.cache.profiles[id]; }
                Social.handlePending(res.mes);
                Social.save();
                Social.sync(() => { if (cb) cb(true); });
            } else { Social.fail(res, "好友操作失败"); Social.notify(); if (cb) cb(false); }
        });
    }

    /** 发消息: 单聊走 GOBE 点对点(云兜底); 群走 GOBE 广播(无房时云兜底); 发件留底本地 */
    static send(target: string, text: string, cb?: (ok: boolean) => void, gid?: string): void {
        const u = Cloud.getUser();
        if (!u) { Social.lastMsg = "尚未登录"; if (cb) cb(false); return; }
        const body = String(text == null ? "" : text).trim();
        if (!body) { Social.lastMsg = "消息不能为空"; if (cb) cb(false); return; }
        if (body.length > 200) { Social.lastMsg = "消息过长(最多 200 字)"; if (cb) cb(false); return; }
        const pushSent = (id: string): void => {
            Social.cache.sentMsg.push({ id, from: u.userid, to: gid ? undefined : target, gid: gid || undefined, text: body, ts: Date.now() });
            if (Social.cache.sentMsg.length > SENT_MSG_MAX) Social.cache.sentMsg = Social.cache.sentMsg.slice(Social.cache.sentMsg.length - SENT_MSG_MAX);
            Social.save(); Social.notify();
        };
        if (gid) {
            if (Gnet.getRoom()) {
                const id = Date.now() + ":" + Math.random().toString(36).slice(2, 8);
                Gnet.sendToClient(Gnet.ROUTE_OTHERS, JSON.stringify({ k: "chat", id, from: u.userid, gid, text: body, ts: Date.now() }));
                pushSent(id); Social.lastMsg = ""; if (cb) cb(true);
            } else Social.sendCloud(target, text, cb, gid);
            return;
        }
        Lobby.sendTo(target, body, (ok, viaCloud) => {
            if (ok) { Social.lastMsg = ""; pushSent(Date.now() + ":local"); if (cb) cb(true); }
            else { Social.fail(null, "消息发送失败"); Social.notify(); if (cb) cb(false); }
        });
    }

    /** 发送原始 payload(邀请/ invroom 等) */
    static sendPayload(target: string, payload: string, cb?: (ok: boolean) => void, gid?: string): void {
        Lobby.sendRaw(target, payload, (ok) => { if (cb) cb(ok); }, gid);
    }
    /** 云兜底发送(te msg 转交; text 可为原始 JSON payload) */
    static sendCloud(target: string, text: string, cb?: (ok: boolean) => void, gid?: string): void {
        const u = Cloud.getUser();
        if (!u) { if (cb) cb(false); return; }
        const body = String(text == null ? "" : text).trim();
        const d: any = { userid: u.userid, key: u.key, text: body };
        if (gid) d.gid = gid; else d.target = target;
        Cloud.teWrite("msg", d, (res: any) => {
            if (res && res.code === 0) {
                Social.lastMsg = "";
                Social.cache.sentMsg.push({ id: String(res.id || (Date.now() + ":local")), from: u.userid, to: gid ? undefined : target, gid: gid || undefined, text: body, ts: Date.now() });
                if (Social.cache.sentMsg.length > SENT_MSG_MAX) Social.cache.sentMsg = Social.cache.sentMsg.slice(Social.cache.sentMsg.length - SENT_MSG_MAX);
                Social.save(); Social.notify(); if (cb) cb(true);
            } else { Social.fail(res, "消息发送失败"); Social.notify(); if (cb) cb(false); }
        });
    }

    /** 清空本地收件(并 ack 服务端待转交) */
    static clearInbox(cb?: (ok: boolean) => void): void {
        const ids = Social.cache.recvMsg.map(m => m.id);
        Social.cache.recvMsg = [];
        Social.save(); Social.notify();
        if (ids.length) Social.ack(ids);
        if (cb) cb(true);
    }

    /** 建群 */
    static createGroup(name: string, members: string[], cb?: (g: GroupInfo | null) => void, lobby?: boolean): void {
        const u = Cloud.getUser();
        if (!u) { Social.lastMsg = "尚未登录"; if (cb) cb(null); return; }
        Cloud.teWrite("group", { userid: u.userid, key: u.key, action: "create", name: name, members: members, lobby: !!lobby }, (res: any) => {
            if (res && res.code === 0 && res.gid) {
                Social.lastMsg = "";
                const g: GroupInfo = { gid: String(res.gid), name: String(res.name || name), members: Array.isArray(res.members) ? res.members : members };
                Social.cache.groups[g.gid] = g;
                Social.addConvEntry({ key: "g:" + g.gid, gid: g.gid });
                Social.save(); Social.notify(); if (cb) cb(g);
            } else { Social.fail(res, "建群失败"); Social.notify(); if (cb) cb(null); }
        });
    }

    static groupInfo(gid: string, cb?: (g: GroupInfo | null) => void): void {
        const u = Cloud.getUser();
        if (!u) { if (cb) cb(null); return; }
        const cached = Social.cache.groups[gid];
        Cloud.teSafe("group", { userid: u.userid, key: u.key, action: "info", gid: gid }, (res: any) => {
            if (res && res.code === 0) {
                const g: GroupInfo = { gid: gid, name: String(res.name || ""), members: Array.isArray(res.members) ? res.members : [], owner: String(res.owner || "") };
                Social.cache.groups[gid] = g; Social.save(); if (cb) cb(g);
            } else if (cached) { if (cb) cb(cached); }
            else { Social.fail(res, "群信息加载失败"); if (cb) cb(null); }
        });
    }

    static refreshRank(limit: number, cb?: (ok: boolean) => void): void {
        const u = Cloud.getUser();
        if (!u) { Social.lastMsg = "尚未登录"; if (cb) cb(false); return; }
        Cloud.teSafe("rank", { userid: u.userid, key: u.key, limit: limit }, (res: any) => {
            if (res && res.code === 0) { Social.lastMsg = ""; Social._rank = Array.isArray(res.users) ? res.users : []; Social.notify(); if (cb) cb(true); }
            else { Social.fail(res, "排行榜加载失败"); Social.notify(); if (cb) cb(false); }
        });
    }

    static reportResult(win: boolean, mode: "pve" | "pvp"): void {
        const u = Cloud.getUser();
        if (!u) return;
        Cloud.teWrite("score", { userid: u.userid, key: u.key, win: win ? 1 : 0, mode: mode }, (res: any) => {
            if (res && res.code === 0 && res.record) { Social._record = res.record; Social.handlePending(res.mes); Social.notify(); }
            else if (res && res.code !== 0) console.warn("[Social] 战绩上报未成功:", res.code, res.msg || "");
        });
    }

    /** 不再轮询云函数: 实时走 GOBE(lobby); 仅保留空实现兼容调用点 */
    static startPolling(): void { /* no cloud polling */ }
    static stopPolling(): void { if (Social._pollTid != null) { Timer.clear(Social._pollTid); Social._pollTid = null; } }

    static captureInvite(): void {
        try { if (wxEnv) return; const m = /[?&]inv=([A-Za-z0-9_-]{1,32})/.exec(location.search || ""); if (m) localStorage.setItem("social_inviter", m[1]); } catch (e) { }
    }
    static tryInviteFriend(): void {
        const u = Cloud.getUser();
        if (!u) return;
        let inv = ""; try { inv = localStorage.getItem("social_inviter") || ""; } catch (e) { }
        if (!inv || inv === u.userid || Social.cache.invited === inv) return;
        Cloud.teWrite("friend", { userid: u.userid, key: u.key, action: "request", target: inv, price: PRICE_DEFAULT }, (res: any) => {
            if (res && (res.code === 0 || res.code === 12)) { Social.cache.invited = inv; if (res.code === 0 && Social.cache.sentReq.indexOf(inv) < 0) Social.cache.sentReq.push(inv); Social.save(); Social.notify(); }
        });
    }
    static inviteLink(): string {
        const u = Cloud.getUser(); if (!u) return "";
        try { return location.origin + location.pathname + "?inv=" + encodeURIComponent(u.userid); } catch (e) { return "?inv=" + u.userid; }
    }
    static copyInvite(cb?: (ok: boolean) => void): void {
        const link = Social.inviteLink(); if (!link) { if (cb) cb(false); return; }
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(() => { if (cb) cb(true); }, () => Social.fallbackCopy(link, cb));
            else Social.fallbackCopy(link, cb);
        } catch (e) { Social.fallbackCopy(link, cb); }
    }
    private static fallbackCopy(link: string, cb?: (ok: boolean) => void): void {
        try { window.prompt("长按/全选复制邀请链接：", link); if (cb) cb(true); } catch (e) { if (cb) cb(false); }
    }
    static shareWX(): boolean {
        const g: any = globalThis as any; const u = Cloud.getUser();
        if (!wxEnv || !g.wx || !g.wx.shareAppMessage || !u) return false;
        try { g.wx.shareAppMessage({ title: "来和我打羽毛球！", query: "inv=" + u.userid }); return true; } catch (e) { return false; }
    }
}
