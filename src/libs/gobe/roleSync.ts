/**
 * roleSync — 角色指派同步(match 空间的唯一持有者, 应用级单例)
 *
 * 协议规范在 pvpProto 文件头(改协议先改那里): 权威(房间 playerId 排序首位)满员出表广播;
 * 无表客户端 role_sync 周期索要; 任何持表端定向应答; 表落地 = 开赛, 无 ack/开赛令;
 * 进游戏后表冻结只应答——权威已进游戏场景仍能回表, 这正是"恢复房间"的通路。
 *
 * 为什么单例而不是挂在 load 上: 匹配页预制体跳游戏时只摘除不销毁, 但 sceneShow 会重置状态;
 * 表与 handler 必须活过场景跳转(对端恢复请求到达时本端已在游戏场景)。挂 window 是
 * qa.ts 同款防护: 脚本被切进多个 bundle 时模块级变量会各存一份, 跨场景就读不到同一张表。
 *
 * 消息泵不自己装: Msg.installPump() 是全应用唯一 client 泵(见 msg.ts), 这里只保证
 * 每次模式切换都补装一次(Gnet.destroy 会清订阅, MPM Set 语义同引用重复注册是无操作)。
 */
import { Gnet } from "./net";
import { Timer } from "../time";
import * as Msg from "./msg";
import * as Proto from "../pvpProto";

export interface AssignTable {
    assignSeq: number;
    roomId: string;
    assignments: any[];
}

type Mode = 'idle' | 'match' | 'game';

export class RoleSyncImpl {
    private _mode: Mode = 'idle';
    private _roomId: string = '';
    private _maxPlayers: number = 2;
    private _table: AssignTable | null = null;
    private _appliedSeq: number = 0;
    private _bcastTid: string | null = null;
    private _reqTid: string | null = null;
    private _reqSeq: number = 0;

    /** 表落地(仅 match 模式触发): load 订阅 → 写 window 全局并跳游戏场景 */
    public onAssigned: ((t: AssignTable) => void) | null = null;
    /** 房间人数变化(进/离): load 订阅 → 刷新按钮 x/y 文案 */
    public onRoomChanged: (() => void) | null = null;

    private _ctx: Msg.SpaceCtx = {
        selfId: () => String(Gnet.getCurrentPlayerId() || ''),
        authId: () => Proto.assignAuthorityId(Gnet.getPlayers()),
        authTerm: () => 0
    };
    private _subs: Record<string, (d: any, s: string) => void> = {
        [Proto.Kind.RoleAssign]: (d, s) => this._onAssign(d, s),
        [Proto.Kind.RoleSync]: (d, s) => this._onSync(d, s)
    };
    private _joinCb = (): void => this._roomChanged();
    private _leaveCb = (): void => this._roomChanged();

    /** 装好 match 空间 handler + 常驻泵 + 房间人数监听(幂等, 场景重入/destroy 后补装都走这里) */
    public install(): void {
        Msg.installPump();
        Msg.bind('match', this._ctx, this._subs);
        Gnet.onJoin(this._joinCb);
        Gnet.onLeave(this._leaveCb);
    }

    /** 进房(新匹配/恢复旧房间都走这里): 无表开始索要, 本机是权威且满员则出表 */
    public enterRoom(roomId: string, maxPlayers: number): void {
        this.install();
        if (this._mode === 'game') return;
        const rid = String(roomId || '');
        if (rid && rid !== this._roomId) this._clearTable();
        if (rid) this._roomId = rid;
        this._maxPlayers = Math.max(2, maxPlayers || 2);
        this._mode = 'match';
        this._checkGenerate();
        this._syncTimers();
    }

    /** 表落地即将跳游戏: 停周期广播与索要; 表冻结, 之后只应答 role_sync */
    public enterGame(): void {
        this.install();
        this._mode = 'game';
        this._stopTimers();
    }

    /** 退房/取消/回匹配页重置: 表作废(下一局重新出表) */
    public leave(): void {
        this._mode = 'idle';
        this._stopTimers();
        this._clearTable();
        this._roomId = '';
    }

    /** QA 遥测(__qa.state().page 取这里) */
    public state(): any {
        return {
            mode: this._mode,
            roomId: this._roomId,
            authority: Proto.assignAuthorityId(Gnet.getPlayers()),
            assignSeq: this._table ? this._table.assignSeq : 0,
            appliedSeq: this._appliedSeq,
            resolved: this._appliedSeq > 0,
            finalAssignment: this._table ? this._table.assignments : null
        };
    }

    // ==================== 内部 ====================

    private _selfId(): string { return String(Gnet.getCurrentPlayerId() || ''); }

    private _amAuthority(): boolean {
        const me = this._selfId();
        return !!me && Proto.assignAuthorityId(Gnet.getPlayers()) === me;
    }

    private _roomIdNow(): string {
        const room: any = Gnet.getRoom();
        return String((room && (room.id || room.roomId)) || this._roomId || '');
    }

    private _clearTable(): void {
        this._table = null;
        this._appliedSeq = 0;
    }

    private _stopTimers(): void {
        if (this._bcastTid != null) { Timer.clear(this._bcastTid); this._bcastTid = null; }
        if (this._reqTid != null) { Timer.clear(this._reqTid); this._reqTid = null; }
    }

    /** 定时器按需启停: 匹配页无表→索要; 匹配页持表且本机是权威→周期重播 */
    private _syncTimers(): void {
        const needReq = this._mode === 'match' && !this._table;
        if (needReq && this._reqTid == null) {
            this._reqTid = Timer.setInterval(Proto.ASSIGN_SYNC_MS, () => this._sendSync());
            this._sendSync();
        } else if (!needReq && this._reqTid != null) {
            Timer.clear(this._reqTid); this._reqTid = null;
        }
        const needBcast = this._mode === 'match' && !!this._table && this._amAuthority();
        if (needBcast && this._bcastTid == null) {
            this._bcastTid = Timer.setInterval(Proto.ASSIGN_BROADCAST_MS, () => {
                if (this._mode !== 'match' || !this._table) return;
                Msg.send(Proto.Kind.RoleAssign, {
                    assignSeq: this._table.assignSeq, roomId: this._table.roomId, assignments: this._table.assignments
                });
            });
        } else if (!needBcast && this._bcastTid != null) {
            Timer.clear(this._bcastTid); this._bcastTid = null;
        }
    }

    /** 表是否恰好覆盖当前房间玩家集合(人数变了=表过期, 权威在匹配页要重出) */
    private _covers(t: AssignTable, players: any[]): boolean {
        if (t.assignments.length !== players.length) return false;
        const ids = new Set(t.assignments.map((a: any) => String(a.playerId).trim()));
        for (const p of players) if (!ids.has(String(p.playerId).trim())) return false;
        return true;
    }

    /** 出表唯一入口: 匹配页 + 满员 + 本机权威 + (无表或表未覆盖当前玩家集合) */
    private _checkGenerate(): void {
        if (this._mode !== 'match') return;
        const room: any = Gnet.getRoom();
        if (!room) return;
        const players = Gnet.getPlayers() || [];
        if (players.length < (room.maxPlayers || this._maxPlayers)) return;
        if (!this._amAuthority()) return;
        if (this._table && this._covers(this._table, players)) return;
        const roleIds = players.map((_p: any, i: number) => i);
        for (let i = roleIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = roleIds[i]; roleIds[i] = roleIds[j]; roleIds[j] = t;
        }
        const assignments = players.map((p: any, i: number) => ({
            playerId: String(p.playerId),
            roleId: roleIds[i],
            teamId: Proto.teamOfRoleId(roleIds[i], players.length)
        }));
        const t: AssignTable = { assignSeq: Timer.now(), roomId: this._roomIdNow(), assignments };
        this._table = t;
        this._roomId = t.roomId;
        Msg.send(Proto.Kind.RoleAssign, { assignSeq: t.assignSeq, roomId: t.roomId, assignments });
        console.log(`[roleSync] 权威出表 seq=${t.assignSeq}: ${JSON.stringify(assignments)}`);
        this._apply(t);
    }

    /** 表落地 = 开赛(无协商): 记录 → 停索要 → 通知 load 跳场景 */
    private _apply(t: AssignTable): void {
        this._table = t;
        this._appliedSeq = t.assignSeq;
        this._syncTimers();
        this.onAssigned?.(t);
    }

    private _sendSync(): void {
        if (this._mode !== 'match' || this._table || !Gnet.getRoom()) return;
        Msg.send(Proto.Kind.RoleSync, { requestId: this._selfId() + '-' + (++this._reqSeq), roomId: this._roomIdNow() });
    }

    /** 收到分配表: 广播只认当前权威; 定向应答(to=本机)认任何持表端; 更大 seq 才采纳; 游戏中冻结 */
    private _onAssign(d: any, senderId: string): void {
        const myRoom = this._roomIdNow();
        if (d.roomId && myRoom && String(d.roomId) !== myRoom) return;
        const seq = Number(d.assignSeq);
        if (this._appliedSeq > 0 && seq <= this._appliedSeq) return;
        if (this._mode === 'game') {
            console.warn(`[roleSync] 对局中表已经冻结, 忽略更新的 role_assign seq=${seq}`);
            return;
        }
        // idle(已取消/已回菜单)不落地: 否则迟到的广播会把刚取消的用户又拽进游戏
        if (this._mode !== 'match') return;
        const players = Gnet.getPlayers() || [];
        const room: any = Gnet.getRoom();
        if (!room || players.length < (room.maxPlayers || this._maxPlayers)) return;
        if (!this._covers(d, players)) return;
        const to = d.to != null ? String(d.to) : '';
        if (to) {
            if (to !== this._selfId()) return;
        } else if (String(senderId) !== Proto.assignAuthorityId(Gnet.getPlayers())) {
            console.warn(`[roleSync] 丢弃非权威广播 role_assign from=${senderId}`);
            return;
        }
        console.log(`[roleSync] 采纳分配表 seq=${seq} from=${senderId}${to ? '(定向应答)' : '(广播)'}`);
        this._apply({ assignSeq: seq, roomId: String(d.roomId || myRoom), assignments: d.assignments });
    }

    /** 收到索要: 持表就定向回一份(任何模式都回——权威已进游戏时这是恢复房间的唯一定向通路) */
    private _onSync(d: any, senderId: string): void {
        if (!this._table) return;
        const myRoom = this._roomIdNow();
        if (d.roomId && myRoom && String(d.roomId) !== myRoom) return;
        Msg.send(Proto.Kind.RoleAssign, {
            assignSeq: this._table.assignSeq, roomId: this._table.roomId,
            assignments: this._table.assignments, requestId: d.requestId
        }, [String(senderId)]);
    }

    private _roomChanged(): void {
        if (this._mode !== 'match') return;
        this._checkGenerate();
        this._syncTimers();
        this.onRoomChanged?.();
        // onJoin 派发可能早于本地 players 列表更新(旧 load 的实测教训), 延时复查一次满员
        Timer.setTimeout(300, () => {
            if (this._mode !== 'match') return;
            this._checkGenerate();
            this._syncTimers();
            this.onRoomChanged?.();
        });
    }
}

const W: any = typeof window !== 'undefined' ? window : ({} as any);
export const RoleSync: RoleSyncImpl = W.__roleSync || (W.__roleSync = new RoleSyncImpl());