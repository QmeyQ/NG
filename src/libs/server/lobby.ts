/**
 * Lobby - GOBE 地区大厅房(100人) + 点对点消息 + 云兜底
 * 不轮询云函数: 实时消息/好友请求通知走 GOBE sendToClient/onMessage;
 * 进入社交自动创建/加入本地区大厅房(房间标记 kind=lobby+region, 与匹配/游戏房区分);
 * 进房成功记录房间号到 DB(te setroom); 自动建大厅群(地区+区+号码);
 * 发消息自动加入对方房间点对点; 对方房间不存在/无人(下线)才云函数兜底。
 */
import { Gnet } from "../gobe/net";
import { Timer } from "../time";
import * as NetBoot from "../netboot";
import { Cloud } from "./cloud";

const REGION_MAP: Record<string, string> = {
    "Asia/Shanghai": "华东", "Asia/Chongqing": "西南", "Asia/Harbin": "东北",
    "Asia/Urumqi": "西北", "Asia/Guangzhou": "华南", "Asia/Beijing": "华北"
};
const REGION_CODE: Record<string, string> = { "华东": "HD", "华南": "HN", "华北": "HB", "东北": "DB", "西南": "XN", "西北": "XB" };
export function regionCode(): string { return REGION_CODE[region()] || "HD"; }
export function region(): string {
    try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; return REGION_MAP[tz] || "华东"; } catch (e) { return "华东"; }
}
export function lobbyTag(): string { return "lobby:" + region(); }

/** 解耦: 消息/云兜底由 social 注入 sink, lobby 不反向依赖 social */
let chatSink: ((m: any) => void) | null = null;
let freqSink: (() => void) | null = null;
let cloudSend: ((target: string, payload: string, cb?: (ok: boolean) => void, gid?: string) => void) | null = null;
let groupSink: ((gid: string, name: string, oldGids: string[]) => void) | null = null;
let roomOfSink: ((target: string) => string) | null = null;
let syncSink: (() => void) | null = null;
export function setSinks(s: { chat: (m: any) => void; freq: () => void; cloud: (t: string, p: string, cb?: (ok: boolean) => void, gid?: string) => void; group: (gid: string, name: string, oldGids: string[]) => void; roomOf: (t: string) => string; sync?: () => void }): void { chatSink = s.chat; freqSink = s.freq; cloudSend = s.cloud; groupSink = s.group; roomOfSink = s.roomOf; syncSink = s.sync || null; }

let ensured = false;
let msgBound = false;
let myRoom = "";

function bindMsg(): void {
    if (msgBound) return;
    msgBound = true;
    // 【接收侧实锤】GOBE SDK 的 room.onRecvFromClient 只回 {roomId,sendPlayerId,msg}, 不带 imType,
    // 故 Gnet.onMessage(type) 永远不触发(与 PVP msg.ts 一致: 走 onClient .catch-all + 载荷自带 k 标签)。
    // 只处理社交 k 标签(chat/invite/invroom/freq/facc), PVP 信封(kind=...)在此被忽略, 互不耦合。
    Gnet.onClient((info: any) => {
        try { (window as any).__mcAny = ((window as any).__mcAny || 0) + 1; (window as any).__mcAnyType = info && info.type; } catch (e) { }
        if (!info || typeof info.msg !== "string") return;
        let d: any = null; try { d = JSON.parse(info.msg); } catch (e) { return; }
        if (!d || typeof d.k !== "string") return;
        try { (window as any).__mcRecv = ((window as any).__mcRecv || 0) + 1; (window as any).__mcLast = info.msg; } catch (e) { }
        const from = String(d.from || info.sendPlayerId || "");
        if (d.k === "chat" && from && chatSink) chatSink({ id: d.id || (Date.now() + ":g"), from, gid: d.gid ? String(d.gid) : undefined, text: String(d.text || ""), ts: Number(d.ts) || Date.now(), w: Number(d.w) || 0 });
        else if (d.k === "invite" && from && chatSink) chatSink({ id: d.id || (Date.now() + ":i"), from, gid: d.gid ? String(d.gid) : undefined, text: "[对局邀请] " + (d.invite && d.invite.mode === "doubles" ? "羽毛球双打" : "羽毛球单打"), ts: Number(d.ts) || Date.now(), inv: d.invite });
        else if (d.k === "invroom" && from && chatSink) chatSink({ id: d.id || (Date.now() + ":r"), from, gid: d.gid ? String(d.gid) : undefined, text: "[对局房已建] 点击加入", ts: Number(d.ts) || Date.now(), room: String(d.room || ""), invId: String(d.inviteId || "") });
        else if (d.k === "freq" && freqSink) freqSink();
        else if (d.k === "facc" && syncSink) syncSink();
    });
}

function roomProps(r: any): any {
    try { return typeof r.customRoomProperties === "string" ? JSON.parse(r.customRoomProperties) : (r.customRoomProperties || {}); } catch (e) { return {}; }
}
function playerUserId(p: any): string {
    try { const pr = typeof p.customPlayerProperties === "string" ? JSON.parse(p.customPlayerProperties) : (p.customPlayerProperties || {}); return String(pr.userid || ""); } catch (e) { return ""; }
}
export function roomPlayerIdOf(userid: string): string | null {
    const ps = Gnet.getPlayers() || [];
    for (const p of ps) if (playerUserId(p) === String(userid)) return String(p.playerId);
    return null;
}
export function currentRoom(): string { return myRoom || String(Gnet.getRoom()?.id || ""); }

function afterJoin(roomId: string, cb?: (ok: boolean) => void, isLobby: boolean = true): void {
    myRoom = roomId;
    bindMsg();
    try {
        (window as any).__gobeDbg = () => {
            const rr: any = Gnet.getRoom();
            return {
                room: rr && rr.id,
                recvN: rr && rr.onRecvFromClient && rr.onRecvFromClient.handlerLength && rr.onRecvFromClient.handlerLength(),
                players: (Gnet.getPlayers() || []).map((pp: any) => ({ id: pp.playerId, props: pp.customPlayerProperties })),
                any: (window as any).__mcAny || 0, recv: (window as any).__mcRecv || 0,
                sendFail: (window as any).__sendFail || 0, sendFailMsg: (window as any).__sendFailMsg || ""
            };
        };
        const rr0: any = Gnet.getRoom();
        if (rr0 && rr0.onSendToClientFailed) rr0.onSendToClientFailed((e: any) => { try { (window as any).__sendFail = ((window as any).__sendFail || 0) + 1; (window as any).__sendFailMsg = JSON.stringify(e); } catch (er) { } });
    } catch (e) { }
    // joinRoom 回调时 client.room 可能未挂载→桥接空绑; 本地定时重绑(非云轮询)
    [300, 1000, 2500, 5000].forEach(ms => Timer.setTimeout(ms, () => Gnet.ensureBridge()));
    const uu = Cloud.getUser();
    if (uu) Gnet.updatePlayerProperties({ customPlayerProperties: JSON.stringify({ userid: uu.userid, head: uu.head || "", playerName: uu.name || "" }) }, () => { });
    const u = Cloud.getUser();
    // 最小云写入: 仅大区房才记录房间号; 与本地记录一致则复用, 不调 setroom; 匹配/非大区房绝不写房间信息。
    if (isLobby) {
        let prevRoom = "", prevGid = "";
        try { prevRoom = localStorage.getItem("lobby_room") || ""; prevGid = localStorage.getItem("lobby_gid") || ""; } catch (e) { }
        const doGroup = (): void => {
            Cloud.teWrite("lobbygroup", { userid: u ? u.userid : "", key: u ? u.key : "", code: regionCode(), name: region() + "区大厅" }, (res: any) => {
                if (res && res.code === 0 && res.gid) { try { localStorage.setItem("lobby_gid", String(res.gid)); } catch (e) { } if (groupSink) groupSink(String(res.gid), String(res.name || ""), Array.isArray(res.oldLobbyGids) ? res.oldLobbyGids : []); }
            });
        };
        if (roomId !== prevRoom) {
            if (u) Cloud.teWrite("setroom", { userid: u.userid, key: u.key, room: roomId }, () => { });
            try { localStorage.setItem("lobby_room", roomId); } catch (e) { }
            doGroup();
        } else if (prevGid && groupSink) {
            groupSink(prevGid, region() + "区大厅", []); // 同房复用本地群记录, 零云调用
        } else {
            doGroup();
        }
    }
    scheduleConverge();
    if (cb) cb(true);
}

/** 大区房收敛(纯 GOBE, 无云调用): 进房后延时重扫可用大厅房, 若存在更小的规范房号则迁过去。
 *  解决两人同时进社交各自 createRoom 的竞态→分裂成两个房→大区广播互不可达。确定性选最小房号, 全员收敛到同一房。 */
let converging = false;
function scheduleConverge(): void {
    Timer.setTimeout(2500, () => {
        if (converging || !Gnet.getRoom()) return;
        Gnet.getAvailableRooms((err: any, info: any) => {
            const rooms: any[] = (info && (info.rooms || info)) || [];
            let best = "";
            for (const r of rooms) {
                const pr = roomProps(r);
                if (pr && pr.kind === "lobby" && pr.region === region() && (r.playerCount || 0) < 100) {
                    const rid = String(r.id || r.roomId || "");
                    if (rid && (!best || rid < best)) best = rid;
                }
            }
            const cur = currentRoom();
            if (cur && (!best || cur < best)) best = cur; // 自己房号更小则不动(避免向大房号跳)
            if (best && best !== cur) {
                converging = true;
                const u = Cloud.getUser();
                Gnet.leaveRoom(() => {
                    Gnet.joinRoom(best, (e: any) => {
                        converging = false;
                        if (!e) afterJoin(best, undefined, true);
                    }, { customPlayerProperties: JSON.stringify({ userid: u ? u.userid : "", head: u ? u.head || "" : "", playerName: u ? u.name || "" : "" }) });
                });
            }
        }, { limit: 50 });
    });
}

export function ensure(cb?: (ok: boolean) => void): void {
    if (ensured && Gnet.getRoom()) { if (cb) cb(true); return; }
    let tries = 0;
    const attempt = (): void => {
        NetBoot.ensure(false, () => {
            if (!Gnet.checkInitialized()) { if (tries++ < 6) { Timer.setTimeout(1500, attempt); return; } if (cb) cb(false); return; }
        const tag = lobbyTag();
        Gnet.getAvailableRooms((err: any, info: any) => {
            const rooms: any[] = (info && (info.rooms || info)) || [];
            let target: any = null;
            for (const r of rooms) {
                const pr = roomProps(r);
                if (pr && pr.kind === "lobby" && pr.region === region() && (r.playerCount || 0) < 100) { target = r; break; }
            }
            if (target) {
                Gnet.joinRoom(String(target.id || target.roomId), (e: any) => { if (e) { if (cb) cb(false); } else afterJoin(String(target.id || target.roomId), cb); }, { customPlayerProperties: JSON.stringify({ userid: Cloud.getUser()?.userid || "", head: Cloud.getUser()?.head || "", playerName: Cloud.getUser()?.name || "" }) });
            } else {
                Gnet.createRoom(tag, 100, (e: any, room: any) => { if (e) { if (cb) cb(false); } else afterJoin(String(room?.id || room?.roomId || Gnet.getRoom()?.id || ""), cb); }, { customProperties: JSON.stringify({ kind: "lobby", region: region() }) });
            }
        }, { limit: 50 });
        });
    };
    attempt();
}

/** 退大区房(去对局房前必须退, 同一时间仅一个房间) */
export function leaveForMatch(cb?: () => void): void {
    myRoom = "";
    Gnet.leaveRoom(() => { if (cb) cb(); });
}

/** 原始 payload 发送: 群=广播; 单玩家=同房点对点; 不在同房/找不到→云兜底(不跳房, 省资源) */
export function sendRaw(target: string, payload: string, cb?: (ok: boolean, viaCloud?: boolean) => void, gid?: string): void {
    const u = Cloud.getUser(); if (!u) { if (cb) cb(false); return; }
    const __log = (o: any): void => { try { (window as any).__sendLog = (window as any).__sendLog || []; (window as any).__sendLog.push(o); } catch (e) { } };
    if (gid) {
        __log({ kind: "bcast", gid, room: currentRoom(), players: (Gnet.getPlayers() || []).length });
        if (Gnet.getRoom()) { Gnet.sendToClient(Gnet.ROUTE_OTHERS, payload); if (cb) cb(true, false); }
        else if (cloudSend) cloudSend(target, payload, cb, gid);
        return;
    }
    // 单玩家: 对方就在当前房→GOBE 点对点; 找不到对方(离线/异房)→直接云兜底。
    // 不再 joinRoom 跳房: 省 GOBE 进房开销, 也避免跳房触发 setroom 云写入(更省资源)。
    const pid = roomPlayerIdOf(target);
    __log({ kind: "p2p", target, pid, room: currentRoom(), players: (Gnet.getPlayers() || []).length });
    if (pid) { Gnet.sendToClient(Gnet.ROUTE_TARGET, payload, [pid]); if (cb) cb(true, false); }
    else cloudFallback(target, payload, cb);
}
function cloudFallback(target: string, payload: string, cb?: (ok: boolean, viaCloud?: boolean) => void): void {
    if (cloudSend) cloudSend(target, payload, (ok) => { if (cb) cb(ok, true); });
    else if (cb) cb(false, true);
}

/** 文本消息封装 */
export function sendTo(target: string, text: string, cb?: (ok: boolean, viaCloud?: boolean) => void): void {
    const u = Cloud.getUser(); if (!u) { if (cb) cb(false); return; }
    sendRaw(target, JSON.stringify({ k: "chat", id: Date.now() + ":" + Math.random().toString(36).slice(2, 8), from: u.userid, text, ts: Date.now() }), cb);
}
/** 好友请求通知: 同房间则 GOBE 通知对方徽标 */
export function notifyFriendReq(target: string): void {
    const pid = roomPlayerIdOf(target);
    try { (window as any).__freqLog = { target, pid, room: currentRoom() }; } catch (e) { }
    if (pid) Gnet.sendToClient(Gnet.ROUTE_TARGET, JSON.stringify({ k: "freq", from: Cloud.getUser()?.userid || "" }), [pid]);
}
/** 好友申请被同意: 通知申请方即时重同步(无需轮询/手动刷新) */
export function notifyFriendAccept(target: string): void {
    const pid = roomPlayerIdOf(target);
    try { (window as any).__faccLog = { target, pid, room: currentRoom() }; } catch (e) { }
    if (pid) Gnet.sendToClient(Gnet.ROUTE_TARGET, JSON.stringify({ k: "facc", from: Cloud.getUser()?.userid || "" }), [pid]);
}
/** 退出大厅群后自动换房 */
export function rejoin(cb?: (ok: boolean) => void): void {
    ensured = false; myRoom = "";
    Gnet.leaveRoom(() => { ensure(cb); });
}
