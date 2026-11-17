/**
 * Invite - 对局邀请模块(低耦合: 仅依赖 Cloud.te / Social 消息通道 / Lobby 房间)
 * 邀请 id = 发起人 userid; create/accept/setroom/get 走 te; 邀请消息走聊天通道(k=invite);
 * 满员后发起人退大区房创建 match:<inviteId> 房, 其他人经 invite.room  joinRoom(先退大区房)。
 */
import { Cloud } from "./cloud";
import { Social } from "./social";
import * as Lobby from "./lobby";
import { Gnet } from "../gobe/net";

export interface MatchInvite { id: string; mode: "singles" | "doubles"; need: number; members: string[]; ts: number; room: string; }

export class Invite {
    static lastMsg = "";
    static onCreate: ((inv: MatchInvite) => void) | null = null;

    static create(mode: "singles" | "doubles", cb?: (inv: MatchInvite | null) => void): void {
        const u = Cloud.getUser(); if (!u) { if (cb) cb(null); return; }
        Cloud.teWrite("invite", { userid: u.userid, key: u.key, action: "create", mode }, (res: any) => {
            if (res && res.code === 0 && res.invite) { Invite.lastMsg = ""; if (cb) cb(res.invite); }
            else { Invite.lastMsg = (res && res.msg) || "创建邀请失败"; if (cb) cb(null); }
        });
    }
    static accept(inviter: string, cb?: (inv: MatchInvite | null, full?: boolean) => void): void {
        const u = Cloud.getUser(); if (!u) { if (cb) cb(null); return; }
        Cloud.teWrite("invite", { userid: u.userid, key: u.key, action: "accept", inviter }, (res: any) => {
            if (res && res.code === 0 && res.invite) { Invite.lastMsg = ""; if (cb) cb(res.invite, !!res.full); }
            else { Invite.lastMsg = (res && res.msg) || "接受邀请失败"; if (cb) cb(null); }
        });
    }
    static get(inviter: string, cb?: (inv: MatchInvite | null) => void): void {
        const u = Cloud.getUser(); if (!u) { if (cb) cb(null); return; }
        Cloud.teSafe("invite", { userid: u.userid, key: u.key, action: "get", inviter }, (res: any) => {
            if (res && res.code === 0 && res.invite) { if (cb) cb(res.invite); } else if (cb) cb(null);
        });
    }
    /** 满员后发起人建房(退大区房), 写回 invite.room 并广播 */
    static hostCreateRoom(inv: MatchInvite, cb?: (room: string) => void): void {
        const u = Cloud.getUser(); if (!u || u.userid !== inv.id) { if (cb) cb(""); return; }
        Lobby.leaveForMatch(() => {
            Gnet.createRoom("match:" + inv.id, inv.need, (e: any, room: any) => {
                const rid = String(room?.id || room?.roomId || Gnet.getRoom()?.id || "");
                if (e || !rid) { if (cb) cb(""); return; }
                Cloud.teWrite("invite", { userid: u.userid, key: u.key, action: "setroom", inviter: inv.id, room: rid }, () => { });
                Social.sendPayload("", JSON.stringify({ k: "invroom", inviteId: inv.id, room: rid }), undefined, inv.id);
                if (cb) cb(rid);
            }, { customProperties: JSON.stringify({ kind: "match", inviteId: inv.id, mode: inv.mode }) });
        });
    }
    /** 加入邀请房(退大区房) */
    static joinRoom(inv: MatchInvite, cb?: (ok: boolean) => void): void {
        if (!inv.room) { if (cb) cb(false); return; }
        Lobby.leaveForMatch(() => {
            Gnet.joinRoom(inv.room, (e: any) => { if (cb) cb(!e); }, { customPlayerProperties: JSON.stringify({ userid: Cloud.getUser()?.userid || "" }) });
        });
    }
}
