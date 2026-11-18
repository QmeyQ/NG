export interface BattleRoomInfo {
    roomId: string;
    roomName?: string;
    playerId?: string;
    playerCount?: number;
    players?: string[];
    isOwner?: boolean;
    battleSeq?: number;
    control?: { op: string; seq?: number; until: number } | null;
}

/** 跨场景传递联机房间信息：load.ls 房间流程写入，trace.ls 对战场景读取。 */
export class RoomSession {
    private static _current: BattleRoomInfo | null = null;

    static set(info: BattleRoomInfo | null): void {
        RoomSession._current = info;
    }

    static get(): BattleRoomInfo | null {
        return RoomSession._current;
    }

    static clear(): void {
        RoomSession._current = null;
    }

    static getSeq(): number {
        return (RoomSession._current && RoomSession._current.battleSeq) || 1;
    }

    static setSeq(seq: number): void {
        if (RoomSession._current) RoomSession._current.battleSeq = seq;
    }

    static setControl(ctrl: { op: string; seq?: number; until: number } | null): void {
        if (RoomSession._current) RoomSession._current.control = ctrl;
    }

    static getControl(): any {
        const ctrl = RoomSession._current && RoomSession._current.control;
        return ctrl && ctrl.until > Date.now() ? ctrl : null;
    }

    private static _appliedCtrl: string = "";

    static markControlApplied(key: string): boolean {
        if (!key || RoomSession._appliedCtrl === key) return false;
        RoomSession._appliedCtrl = key;
        return true;
    }
}
