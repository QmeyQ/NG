// @ts-nocheck
// online - g2 联机房间生命周期(匹配/创建/等待/进入/离开)。
// 低耦合: 只依赖平台 NetBoot/Gnet/SceneNav/Res + RoomSession; 对战内帧同步在 Main.startBattleNet。
// 房间标记 roomType=g2battle, 与羽毛球 demo / 大厅 lobby: 区分。
import { Gnet } from "../libs/gobe/net";
import * as NetBoot from "../libs/netboot";
import { RoomSession } from "./roomSession";
import { SceneNav } from "../libs/nav";
import { Res as PRes } from "../libs/res/res";
import { Dialog } from "../ui/DIalog";

const ROOM_TYPE = "g2battle";
try { (window as any).__g2OnlineDbg = () => ({ busy: G2Online["busy"], init: Gnet.checkInitialized(), room: (Gnet.getRoom() || {}).id || null, owner: Gnet.isRoomOwner(), players: G2Online["playerIds"]() }); (window as any).__g2OnlineLeave = (cb: any) => G2Online.leave(cb || (() => { })); } catch (e) { }
const WAIT_TIMEOUT = 60000;

export class G2Online {
    private static busy = false;
    private static waitNode: any = null;
    private static waitTimer: any = null;
    private static roomCb: ((room: any) => void) | null = null;
    private static joinCb: ((player: any) => void) | null = null;

    /** 一键匹配: 先扫新鲜等待房(45s 内创建且未满)直接 join, 避免撮合进断线客户端遗留的鬼房;
     *  无新鲜房才 matchRoom; matchRoom 若仍撮合到鬼房(createTime 过期)则退出自建。 */
    static match(): void {
        this.start("匹配对手中…", (cb) => {
            Gnet.getAvailableRooms((err: any, info: any) => {
                const list = (info && (info.rooms || info.roomList || info.data)) || [];
                const now = Date.now();
                let pick: any = null;
                for (const r of list) {
                    const props = this.props(r);
                    const cnt = (r.playerCount !== undefined ? r.playerCount : (r.players || r.playerList || []).length) || 0;
                    if (props.createTime && now - props.createTime < 45000 && cnt < 2) { pick = r; break; }
                }
                if (pick) { Gnet.joinRoom(String(pick.id || pick.roomId), cb); return; }
                Gnet.matchRoom({ matchParams: {}, maxPlayers: 2, roomType: ROOM_TYPE }, (e: any, room: any) => {
                    if (e) { cb(e, null); return; }
                    if (this.isStale(room)) {
                        console.warn("[g2online] matched stale room, recreate:", room && room.id);
                        Gnet.leaveRoom(() => {
                            Gnet.createRoom("g2:" + NetBoot.openId() + ":" + Date.now(), 2, cb, { roomType: ROOM_TYPE, enableFrameSync: true });
                        });
                        return;
                    }
                    cb(null, room);
                });
            }, { roomType: ROOM_TYPE, limit: 20 });
        });
    }

    private static props(r: any): any {
        try { return typeof r.customRoomProperties === 'string' ? JSON.parse(r.customRoomProperties) : (r.customRoomProperties || {}); } catch (e) { return {}; }
    }

    private static isStale(r: any): boolean {
        const p = this.props(r);
        return !!p.createTime && Date.now() - p.createTime > 45000;
    }

    /** 创建房间等待加入 */
    static create(): void {
        this.start("等待对手加入…", (cb) => {
            Gnet.createRoom("g2:" + NetBoot.openId() + ":" + Date.now(), 2, cb, { roomType: ROOM_TYPE, enableFrameSync: true });
        });
    }

    private static start(text: string, doRoom: (cb: (err: any, room: any) => void) => void): void {
        if (this.busy) return;
        this.busy = true;
        NetBoot.ensure(false, (ok: boolean, msg?: string) => {
            if (!ok) { console.error("[g2online] netboot fail:", msg); this.busy = false; Dialog.toast(msg || "联机初始化失败"); return; }
            this.showWait(text);
            doRoom((err: any, room: any) => {
                if (err) { console.error("[g2online] room fail:", err && (err.message || err)); this.hideWait(); this.busy = false; Dialog.toast("房间失败: " + (err.message || err)); return; }
                this.afterRoom(room);
            });
        });
    }

    private static afterRoom(room: any): void {
        const players = this.playerIds();
        if (players.length >= 2) { this.enter(room); return; }
        // 等第二人: onRoomChange 驱动, 不轮询
        this.roomCb = (rm: any) => {
            console.log("[g2online] roomChange players=", JSON.stringify(this.playerIds()), "room=", rm && (rm.id || rm.roomId));
            if (this.playerIds().length >= 2) {
                const r = Gnet.getRoom() || room;
                this.cleanupWait();
                this.enter(r);
            }
        };
        Gnet.onRoomChange(this.roomCb);
        // onRoomChange 只在房间属性变化时触发; 玩家加入走 onJoin, 必须同时监听(实测创建者等不到第二人)
        this.joinCb = () => { if (this.roomCb) this.roomCb(Gnet.getRoom()); };
        Gnet.onJoin(this.joinCb);
        this.waitTimer = setTimeout(() => {
            this.cleanupWait();
            this.leave(() => { });
            Dialog.toast("等待超时, 已退出房间");
        }, WAIT_TIMEOUT);
    }

    private static playerIds(): string[] {
        const ps = (Gnet.getPlayers ? Gnet.getPlayers() : []) || [];
        return ps.map((p: any) => p && (p.playerId || p.openId || p.id)).filter((x: any) => !!x);
    }

    private static enter(room: any): void {
        this.cleanupWait();
        this.busy = false;
        const ids = this.playerIds();
        RoomSession.set({
            roomId: String(room && (room.id || room.roomId) || ""),
            roomName: (room && room.roomName) || "g2对战",
            playerId: Gnet.getCurrentPlayerId(),
            players: ids,
            playerCount: ids.length,
            isOwner: Gnet.isRoomOwner(),
            battleSeq: 1,
            control: null
        });
        try { (window as any).__g2Offline = false; } catch (e) { }
        try { PRes.clear("g2/game/trace.ls"); } catch (e) { }
        SceneNav.open("g2/game/trace.ls", undefined, (done) => {
            PRes.get("g2/game/trace.ls").then((n: any) => done(n || null)).catch(() => done(null));
        });
    }

    /** 离开/解散房间(房主解散), 完成后回调 */
    static leave(cb: () => void): void {
        this.cleanupWait();
        this.busy = false;
        const done = () => { try { cb(); } catch (e) { } };
        try {
            if (Gnet.getRoom() && Gnet.isRoomOwner()) Gnet.dismissRoom(() => done());
            else if (Gnet.getRoom()) Gnet.leaveRoom(() => done());
            else done();
        } catch (e) { done(); }
    }

    private static showWait(text: string): void {
        this.hideWait();
        const box = new Laya.GBox();
        box.name = "g2Wait";
        box.size(460, 150);
        box.pos((Laya.stage.width - 460) / 2, Laya.stage.height / 2 - 75);
        box.background = Laya.DrawRectCmd.create(0, 0, 460, 150, "#2f4f8f", "#5a7fbf", 2);
        const lb = new Laya.GTextField();
        lb.text = text; lb.fontSize = 36; lb.color = "#ffffff";
        lb.width = 460; lb.height = 80; lb.align = "center"; lb.valign = "middle";
        box.addChild(lb);
        const cancel = new Laya.GBox();
        cancel.name = "g2WaitCancel";
        cancel.size(160, 50); cancel.pos(150, 92);
        cancel.background = Laya.DrawRectCmd.create(0, 0, 160, 50, "#8f2f2f", "#bf5a5a", 2);
        const cl = new Laya.GTextField();
        cl.text = "取消"; cl.fontSize = 28; cl.color = "#ffffff";
        cl.width = 160; cl.height = 50; cl.align = "center"; cl.valign = "middle";
        cancel.addChild(cl);
        cancel.on(Laya.Event.CLICK, this, () => {
            this.cleanupWait();
            try { Gnet.cancelMatch(() => { }); } catch (e) { }
            this.leave(() => { });
        });
        box.addChild(cancel);
        Laya.stage.addChild(box);
        this.waitNode = box;
    }

    private static hideWait(): void {
        if (this.waitNode && !this.waitNode.destroyed) { this.waitNode.removeSelf(); this.waitNode.destroy(); }
        this.waitNode = null;
    }

    private static cleanupWait(): void {
        this.hideWait();
        if (this.waitTimer) { clearTimeout(this.waitTimer); this.waitTimer = null; }
        if (this.roomCb) { try { Gnet.offRoomChange(this.roomCb); } catch (e) { } this.roomCb = null; }
        if (this.joinCb) { try { Gnet.offJoin(this.joinCb); } catch (e) { } this.joinCb = null; }
    }
}
