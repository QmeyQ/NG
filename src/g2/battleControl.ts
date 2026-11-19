import { Gnet } from "../libs/gobe/net";

export type ControlOp = "rematch" | "toLobby";

/** 局后控制通道：再来一局 / 返回房间 与断线感知（房间实时消息，不依赖帧同步）。 */
export class BattleControl {
    public static current: any = null;
    private static hooked: boolean = false;
    private static readonly CONTROL_TYPE: number = 200;

    static setCurrent(main: any): void {
        BattleControl.current = main;
    }

    static hook(): void {
        if (BattleControl.hooked) return;
        BattleControl.hooked = true;
        Gnet.onClient((info: any) => {
            try {
                let msg: any = info && (info.msg !== undefined ? info.msg : info.data);
                if (typeof msg === "string") msg = JSON.parse(msg);
                const op = msg && msg.op;
                if (op && BattleControl.current && typeof BattleControl.current.onRemoteControl === "function") {
                    BattleControl.current.onRemoteControl(op, msg);
                }
            } catch (e) { /* ignore malformed control message */ }
        });
        Gnet.onJoin((player: any) => {
            if (BattleControl.current && typeof BattleControl.current.onRemoteJoin === "function") BattleControl.current.onRemoteJoin(player);
        });
        Gnet.onDisconnect((info: any) => {
            if (BattleControl.current && typeof BattleControl.current.onDisconnectSignal === "function") BattleControl.current.onDisconnectSignal(info);
        });
        Gnet.onLeave((player: any) => {
            if (BattleControl.current && typeof BattleControl.current.onRemoteLeave === "function") {
                BattleControl.current.onRemoteLeave(player);
            }
        });
        Gnet.onDismiss(() => {
            if (BattleControl.current && typeof BattleControl.current.onRemoteLeave === "function") {
                BattleControl.current.onRemoteLeave(null);
            }
        });
    }

    static send(op: ControlOp, seq?: number): void {
        try {
            const me = Gnet.getCurrentPlayerId ? Gnet.getCurrentPlayerId() : "";
            const players = (Gnet.getPlayers ? Gnet.getPlayers() : []) || [];
            const ids = players.map((pl: any) => pl && (pl.playerId || pl.openId || pl.id)).filter((id: any) => !!id && id !== me);
            // 契约: sendToClient 第一参=路由模式(0/1/2), 不是消息类型; 载荷自带 op
        Gnet.sendToClient(ids.length ? Gnet.ROUTE_TARGET : Gnet.ROUTE_OTHERS, JSON.stringify({ op: op, seq: seq }), ids.length ? ids : undefined);
        } catch (e) { /* control channel not ready */ }
    }
}
