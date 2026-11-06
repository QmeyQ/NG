/**
 * PVP - 联机模式比赛管理器，继承 Mag
 * 只负责网络同步（权威端选举、心跳保活、状态同步、操作广播），规则判定委托给 Rule
 * 权威端通过帧同步广播游戏状态，非权威端接收并应用；权威端失联时自动选举新权威端
 */
import { Timer } from "../../libs/time";
import { MatchPhase, TeamSide } from "./mag";
import { Mag } from "./mag";
import { Cha , ChaState} from "../obj/cha";
import { Gnet } from "../../libs/gobe/net";
import { Ball } from "../obj/ball";
import { State } from "../engine/phyCfg";
import { PlayerInfo } from "../../libs/GOBE";
import * as Proto from "../../libs/pvpProto";
import * as Msg from "../../libs/gobe/msg";

/** PVP 联机配置 */
export interface PVP_Config {
    /** 心跳间隔（ms），权威端每间隔发送一次帧同步 */
    heartbeatInterval: number;
    /** 权威端超时时间（ms），超过此时间未收到权威端帧则触发选举 */
    authorityTimeout: number;
    /** 状态提案确认超时（ms），超时后自动补全未确认玩家 */
    stateConfirmTimeout: number;
    /** 位置容差（米），超过此距离触发位置补偿 */
    positionTolerance: number;
    /** 时间容差（ms），超过此偏差同步倒计时起点 */
    timeTolerance: number;
    /** 位置补偿速率（0~1），每帧补偿的比例 */
    compensationRate: number;
}

export class PVP extends Mag {
    /** 本地玩家的 GOBE ID */
    private _gobeId: string = "";
    /** 本地玩家控制的角色 */
    private _localCha: Cha | null = null;
    /** 每个客户端均维护的逐玩家角色快照；权威端掉线后供新权威端恢复。 */
    private _playerStateCache: Map<string, any> = new Map();
    /** 最近一次权威比赛状态快照。 */
    private _cachedGlobalStatus: any = null;
    /** 该快照在本机时基上的"新鲜时刻"：接管重放时要按 (now - 此值) 扣掉已经流走的剩余时间。 */
    private _cachedGlobalStatusAt = 0;
    /** 本房间恢复缓存键，存在 window 上以便同一客户端重建 PVP 实例时沿用。 */
    private _recoveryCacheKey = "";
    private _lastStateReportAt = 0;
    private _lastStateRequestAt = 0;
    /** GOBE 玩家 ID → 角色实例的映射 */
    private _playerChaMap: Map<string, Cha> = new Map();
    /** 房间内所有玩家 ID 列表 */
    private _allPlayerIds: PlayerInfo[] = [];
    /** 当前权威端 ID */
    private _currentAuthId: string | null = null;
    /** 本机作为权威端时的快照序号(接收侧的"已见过多少"由 msg 层按发送方分别记) */
    private _authFrameSeq = 0;
    /** 权威任期：旧权威延迟到达的帧不能覆盖新权威状态。 */
    private _authorityTerm = 1;
    private _lastSyncGapLogAt = 0;
    /** 本地是否为权威端 */
    private _amAuth: boolean = false;
    /** 上次收到权威端心跳的时间戳 */
    private _lastHeartbeat: number = 0;
    /** 待确认的状态提案映射 */
    private _proposals: Map<string, any> = new Map();
    /** 状态提案计数器，用于生成唯一提案 ID */
    private _proposeCounter: number = 0;
    /** 统一帧同步线程：权威端发送 state+authId+frame；非权威端发送本地角色位置帧并检测权威端超时 */
    private sup: any = null;

    /**
     * msg 层身份上下文: 全部按引用读——权威端与任期在局中会变, 不能发送时才拍快照。
     * onAnyMessage 是存活判定的消息侧口径: 被规则丢弃的权威消息同样算"还在说话"。
     */
    private _msgCtx: Msg.SpaceCtx = {
        selfId: () => this._gobeId,
        authId: () => this._currentAuthId,
        authTerm: () => this._authorityTerm,
        onAnyMessage: (senderId: string) => {
            if (this._pidEq(senderId, this._currentAuthId)) this._lastAuthSyncAt = Timer.now();
        }
    };
    /** B 通道处理器注册表; destroy 时按引用摘除, 旧实例不会抢第二局的消息 */
    private _msgSubs: Record<string, (data: any, senderId: string) => void> = {
        [Proto.Kind.Action]: (d, s) => this._applyAction(d, s),
        [Proto.Kind.Eagle]: (d, s) => this._onEagleMsg(d, s),
        [Proto.Kind.StatePropose]: (d, s) => this._onStatePropose(d, s),
        [Proto.Kind.StateConfirm]: (d, s) => this._onStateConfirm(d, s),
        [Proto.Kind.StateFinal]: (d, s) => this._onStateFinal(d, s),
        [Proto.Kind.AuthDeclare]: (d, s) => this._onAuthDeclare(d, s),
        [Proto.Kind.SyncRecover]: (d, s) => this._onSyncRecoverRequest(d, s),
        [Proto.Kind.BallRecovery]: (d, s) => this._onBallRecovery(d, s),
        [Proto.Kind.RoleRecoverRequest]: (d, s) => this._onPlayerStateRecoveryRequest(d, s),
        [Proto.Kind.RoleRecover]: (d, s) => this._onPlayerStateRecovery(d, s),
        [Proto.Kind.PlayerStateReport]: (d, s) => this._onPlayerStateReport(d, s),
        [Proto.Kind.AnimStateRequest]: (d, s) => this._onAnimationStateRequest(d, s),
        [Proto.Kind.AnimStateBroadcast]: (d, s) => this._onAnimationStateBroadcast(d, s),
        [Proto.Kind.NonAuthFrame]: (d, s) => this._applyNonAuthFrame(d, s),
        // 击球事件: 可靠通道单条到达, 一条就是一段新轨迹的起点(不再随权威帧批量携带)
        [Proto.Kind.HitEvent]: (d, s) => this._applyHitEvents([d], s),
        // 兜底对齐: 权威端球停止(落地/死球)时报一次它自己的球位
        [Proto.Kind.BallStop]: (d, s) => this._onBallStop(d, s),
        [Proto.Kind.AuthCandidate]: (d, s) => this._onAuthCandidate(d.candidate, s, d.authTerm)
    };

    /** PVP 配置参数 */

    private pvpCfg: PVP_Config = {
        heartbeatInterval: 100,
        authorityTimeout: 500,
        stateConfirmTimeout: 1000,  // 确认窗口 1s: 真网络 RTT+GOBE 帧聚合(50ms×2)抖动下 500ms 偶发误判强制通过
        positionTolerance: 1.0,
        timeTolerance: 2000,
        compensationRate: 0.15,
    };

    /**
     * 构造函数 - 初始化 PVP 联机比赛管理器
     * @param p1 本地玩家挂载的 Laya.Sprite3D 节点
     * @param ball 比赛用球实例
     * @param isSingle 是否单机模式（PVP 中通常为 false）
     */
    constructor(p1: Laya.Sprite3D, ball: Ball, isSingle: boolean = false, p2?: Laya.Sprite3D, racket?: Laya.Sprite3D) {
        super(p1, ball, isSingle, p2, racket);
        this.isPvpMode = true;  // 非权威端 rule 不本地推进(状态由权威端 state 帧驱动)
        // 覆盖基类状态变更回调：仅当本地为权威端时才发起状态提案同步
        this.onStateChange = () => {
            if (!this._amAuth || this._destroyed) return;
            this._proposeStateChange();
            // 状态切换(包括倒计时结束分球/回合重置)后尽快发布权威快照，
            // 不必等待下一轮固定心跳；50ms 合并窗口避免同一帧重复发送。
            this._scheduleAuthFlush();
        };
    }

    // ---------- 初始化 ----------

    /**
     * 初始化联机比赛 - 解析角色分配、绑定本地角色并启动帧同步
     * 流程：
     *   1. 从全局 gamePlayerAssignments 读取 GOBE 玩家 ID → 角色索引的协商结果
     *   2. 建立 playerId → Cha 映射，确定本地控制角色
     *   3. 调用 bindNetwork 绑定网络回调
     *   4. 启动 GOBE 帧同步通道
     * @returns 本地玩家控制的角色实例
     */
    public setup(): Cha {
        const allCha = this.players;
        const localGobeId = Gnet.getCurrentPlayerId();
        const playerChaMap: Map<string, Cha> = new Map();
        let localCha: Cha | null = null;

        // 读取房间协商阶段写入的角色分配表。该表在极端场景切换/重连时可能为空或不完整；
        // 若只给 localCha 兜底却不补 playerChaMap，权威端收到远端 nonAuthFrame 时就找不到
        // 对应角色，远端状态不会应用到权威端。先保留有效协商结果，再为缺失玩家分配空闲角色。
        const rawAssignments: { playerId: string, roleId: number }[] = (window as any).gamePlayerAssignments || [];
        const roomIds = (Gnet.getPlayers() || [])
            .map((p: any) => String(p.playerId ?? "").trim())
            .filter((id: string) => !!id);
        const orderedIds = Array.from(new Set(roomIds)).sort();
        const assignedIds = new Set<string>();
        const usedRoles = new Set<number>();

        for (const a of rawAssignments) {
            const pid = String(a?.playerId ?? "").trim();
            const roleId = Number(a?.roleId);
            if (!pid || !Number.isInteger(roleId) || roleId < 0 || roleId >= allCha.length) continue;
            if (orderedIds.length && !orderedIds.includes(pid)) continue;
            if (assignedIds.has(pid) || usedRoles.has(roleId)) continue;
            playerChaMap.set(pid, allCha[roleId]);
            assignedIds.add(pid);
            usedRoles.add(roleId);
        }

        const freeRoles: number[] = [];
        for (let i = 0; i < allCha.length; i++) if (!usedRoles.has(i)) freeRoles.push(i);
        for (const pid of orderedIds) {
            if (assignedIds.has(pid)) continue;
            const roleId = freeRoles.shift();
            if (roleId === undefined) {
                console.warn(`[PVP] 没有空闲角色可分配给玩家 ${pid}`);
                continue;
            }
            playerChaMap.set(pid, allCha[roleId]);
            assignedIds.add(pid);
            usedRoles.add(roleId);
            console.warn(`[PVP] 玩家 ${pid} 缺少协商分配，临时补映射到角色 ${allCha[roleId].id}`);
        }

        // 按规范化 ID 找本地角色，避免 number/string 或空白差异导致双端抢同一个角色。
        const cleanLocalId = String(localGobeId ?? "").trim();
        for (const [pid, cha] of playerChaMap) {
            if (String(pid).trim() === cleanLocalId) { localCha = cha; break; }
        }
        if (!localCha) {
            const idx = orderedIds.indexOf(cleanLocalId);
            const roleId = idx >= 0 ? (idx % allCha.length) : 0;
            localCha = allCha[roleId];
            playerChaMap.set(cleanLocalId || String(localGobeId), localCha);
            console.warn(`[PVP] 协商表未命中本地玩家 ${localGobeId}，按稳定房间索引 ${idx} 兜底角色 ${localCha.id}`);
        }

        console.log(`[PVP] 角色映射: ${JSON.stringify(Array.from(playerChaMap.entries()).map(([pid, cha]) => ({ playerId: pid, roleId: cha.id })))}`);
        console.log(`[PVP] 本地玩家 ${localGobeId} 控制角色 ${localCha.id}`);

        this.bindNetwork(localGobeId, localCha, playerChaMap);

        // 启动 GOBE 帧同步通道(双端都调, 幂等): 实测 startFrameSync 各端调用均成功
        // (先到者开启, 后到者 101114 already-start 由 GNet 吞掉)。
        // 【旧版两 bug】: ① 函数引用比较恒 false 从未调用; ② 仅房主调 + room.ownerId
        // 各端视角不一致(matchRoom 并发, 真实服务器实锤双端各认自己是房主)会漏开
        Gnet.startFrameSync((err: any) => {
            if (err) {
                console.error("[PVP] 帧同步启动失败:", err.message);
            } else {
                console.log("[PVP] 帧同步已启动");
            }
        });

        return localCha;
    }

    // ---------- 绑定网络 ----------

    /**
     * 绑定网络 - 建立 GOBE ID 与角色的映射，初始化权威端并注册网络回调
     * 流程：
     *   1. 记录本地 gobeId、本地角色、玩家-角色映射
     *   2. 拉取房间玩家列表，默认取首位为初始权威端
     *   3. 注册 Gnet 消息回调（_onRecvMsg）与帧回调（_onFrame）
     *   4. 若本地为权威端则启动帧同步线程
     *   5. 启动权威端看门狗，监测权威端心跳
     * @param gobeId 本地玩家的 GOBE ID
     * @param localCha 本地玩家控制的角色
     * @param playerChaMap 全房间 playerId → Cha 的映射
     */
    public bindNetwork(gobeId: string, localCha: Cha, playerChaMap: Map<string, Cha>): void {
        // 一页只允许一个"会说话的"同步实例: 场景没销毁干净(预制体场景并存、重复 match_start 二次进场景)时,
        // 旧实例的心跳线程照样往【当前房间】发权威帧与选举声明——实测把新局的任期在 7 秒内顶到 5,
        // 现场看起来像"协议在互抢权威", 其实是上一局的尸体在说话。
        // 这里只停旧线程、不拆旧实例: 旧场景的 onDestroy 仍会自己走完整销毁;
        // 抢先 destroy() 反而可能把"两个实例都还有用"的正常路径打断(销毁会连带摘掉全局消息/帧回调)。
        if (PVP._live && PVP._live !== this) {
            console.warn('[PVP] 发现上一局仍在运行的同步实例, 停掉它的心跳线程(其场景销毁时自行完整清理)');
            PVP._live._stopAuthFrameSync();
        }
        PVP._live = this;
        this._destroyed = false;
        this._gobeId = gobeId;
        this._localCha = localCha;
        this._playerChaMap = playerChaMap;
        this._initRecoveryCache();

        // 拉取房间所有玩家 ID 列表
        this._allPlayerIds = Gnet.getPlayers();
        if (!this._partyReady()) {
            // 房间玩家表还没补齐就绑网是灾难: 权威端选举取"排序首位"、状态提案取"参与者集合",
            // 两张半张表会各认各的权威(实测一端拿到 1 人表自封权威, 另一端拿到空表直接不绑,
            // 于是联机退化成两端各开一局、彼此一条状态都收不到)。这里不绑不启心跳, 到点重试。
            this._scheduleSetupRetry();
            return;
        }

        // 初始权威端锚定 = 规范化排序玩家列表首位(全端确定性共识)。
        // 【真实服务器实锤 2026-10-25】room.ownerId 各端视角可不一致(matchRoom 并发建房:
        // 双端各认自己是房主) → 不可作唯一锚; 排序首位双端 players 集合一致 → 共识确定。
        // 旧版 getPlayers()[0] 原序取首位(顺序双端不保证一致) → 双端各认不同权威 → 互降级震荡
        const firstPid = this._allPlayerIds.map((p: any) => String(p.playerId).trim()).sort()[0];
        this._currentAuthId = firstPid ?? this._allPlayerIds[0].playerId;
        this._amAuth = this._pidEq(this._gobeId, this._currentAuthId);
        this.isAuthoritative = this._amAuth;
        this._lastHeartbeat = Timer.now();
        // 帧静默基准与心跳同时刻建立: 否则刚绑网的非权威端第一拍就算出"静默=整个开机时长"立即升格
        this._lastAuthFrameAt = Timer.now();

        // 注册点对点消息：信封解析、去重、过期判定全在 msg 层，本处只管投递
        Gnet.off('client');
        Msg.bind('game', this._msgCtx, this._msgSubs);
        this._clientCb = (info: any) => {
            if (this._destroyed) return;
            Msg.dispatchInfo(info);
        };
        Gnet.onClient(this._clientCb);

        // 注册帧同步回调：权威端广播的帧在此处理(同样字段化, destroy 精确摘除)
        Gnet.offFrame(this._frameCb);
        this._frameCb = (msg: any) => {
            if (this._destroyed) return;
            this._onFrame(msg);
        };
        Gnet.onFrame(this._frameCb);

        // 对端离开/房间解散: 对局已经不可能继续。旧版这里什么都没绑, 对手一退, 本端就在
        // "没有对手的单机局"里继续发球打分, 玩家只能自己点返回(实测被 GOBE 移出房间后
        // 另一端 45 秒毫无反应)。回调按引用摘除, 与 load 页的同名回调互不影响。
        this._leaveCb = (player: any) => {
            const id = String((player && (player.playerId || player.id)) || '');
            if (!id || this._pidEq(id, this._gobeId)) return;
            const left = (Gnet.getPlayers() || []).length;
            console.warn(`[PVP] 对端 ${id} 离开房间, 房内剩 ${left} 人`);
            if (left > 1) return;
            this._stopAuthFrameSync();
            this.onPeerLeft?.(id);
        };
        Gnet.onLeave(this._leaveCb);
        this._dismissCb = (roomId: string) => {
            console.warn(`[PVP] 房间 ${roomId} 解散, 本局已没有对手`);
            this._stopAuthFrameSync();
            this.onPeerLeft?.('');
        };
        Gnet.onDismiss(this._dismissCb);

        // 启动统一帧同步线程：权威端发送状态帧，非权威端发送本地角色位置帧并检测权威端超时
        this._startAuthFrameSync();
        // 非权威端首次进入或重连后主动向当前权威端取回本玩家状态与比赛快照。
        if (!this._amAuth) Timer.setTimeout(120, () => this._requestPlayerStateRecovery("bind"));
        else this._restoreCachedStateAfterTakeover();

        console.log(`[PVP] 我是权威端: ${this._amAuth} (${this._gobeId}), 当前权威端: ${this._currentAuthId}`, this._allPlayerIds);
    }

    /** 玩家 id 规范化相等比较: openId(userid) 与 GOBE p.playerId 可能 number/string/空白差异,
     *  严格 === 断链 → 判定恒 false → 双权威/零权威震荡(localCha 修复同款教训) */
    private _pidEq(a: any, b: any): boolean {
        return String(a == null ? '' : a).trim() === String(b == null ? '' : b).trim();
    }

    /**
     * 房间玩家表是否已经覆盖指派表里的全部玩家。
     * 依据取 gamePlayerAssignments 而不是本机房间表: 那张表是房主在【双方都已进房】之后才发出的
     * (role_assign), 它比 GOBE 下发给本机的 room.players 快照更早地刻画了"这局有几个人"。
     */
    private _partyReady(): boolean {
        const raw: any[] = (window as any).gamePlayerAssignments || [];
        const want = new Set<string>();
        for (const a of raw) { const pid = String(a?.playerId ?? '').trim(); if (pid) want.add(pid); }
        const local = String(this._gobeId || Gnet.getCurrentPlayerId() || '').trim();
        if (local) want.add(local);
        const have = new Set<string>((Gnet.getPlayers() || [])
            .map((p: any) => String(p.playerId ?? '').trim()).filter((s: string) => !!s));
        for (const pid of want) if (!have.has(pid)) return false;
        return want.size > 0;
    }

    /** 重试上限 25 次 × 200ms = 5s: 房间表随 GOBE 同步包下发(实测 1s 内到位), 再久就不该继续干等 */
    private _setupRetryTid: string | null = null;
    private _setupRetryLeft = 25;

    /** 房间表补齐后重跑整段 setup: 角色映射同样依赖这张表, 只补 bindNetwork 会留下缺人的映射 */
    private _scheduleSetupRetry(): void {
        if (this._destroyed || this._setupRetryTid != null) return;
        if (this._setupRetryLeft-- <= 0 || !Gnet.getRoom()) {
            console.warn('[PVP] 房间玩家表始终不齐, 本局不再尝试建立同步');
            // 绑不出同步 = 这局从一开始就没有对手(实测: 带着空房间表进场景的一端会自顾自打完一整局,
            // 比分/球位与另一端完全无关)。与对端离场走同一个上报口径, 至少让玩家知道这不是联机。
            this.onPeerLeft?.('');
            return;
        }
        this._setupRetryTid = Timer.setTimeout(200, () => {
            this._setupRetryTid = null;
            if (this._destroyed || !Gnet.getRoom()) return;
            this.setup();
        });
    }

    // ---------- 操作同步 ----------

    /**
     * 同步玩家操作 - 将本地操作广播给房间内其他玩家
     * 对击球操作做特殊处理：当无 params（普通击球）时附带球位置，
     * 便于接收端校正球位置后再应用击球，避免位置漂移导致击空
     * @param opt 操作描述对象，需包含 type 字段（'hit' | 'move' 等）
     */
    public syncAction(opt: any): void {
        if (!this._gobeId || this._destroyed) return;
        // 权威端本地操作已经生效：击球事件即刻入历史并用可靠通道广播(轨迹只由那一条决定)。
        if (this._amAuth) {
            if (opt.type === 'hit') this._queueHitEvent(this._makeHitEvent(opt, this._gobeId), true);
            this._scheduleAuthFlush();
            return;
        }
        // move 节流(移动同步主犯之一): 摇杆 touchmove 高频(60/s)逐条 sendToClient 会
        // 打爆点对点通道(GOBE 限流丢弃 = "移动完全没同步") —— 50ms 一条; 状态显著变化
        // (角度>10°/力度变化)立即放行; 末次状态记录待发, 节流窗到点补发保证最终态(含 stop)必达
        if (opt.type === 'move') {
            const now = Timer.now();
            const last = this._moveSyncLast;
            const changed = !last ||
                Math.abs(((opt.angH - last.angH + 540) % 360) - 180) > 10 ||
                opt.power !== last.power;
            if (!changed && now - this._moveSyncAt < 50) return;
            this._moveSyncAt = now;
            this._moveSyncLast = { angH: opt.angH, power: opt.power };
        }
        const payload: any = { time: Timer.now(), ...opt };
        // 击球只上报"意图"(谁在什么时刻用什么参数出手), 不附带球坐标/物理状态:
        // 球的初始条件由权威端按自己的模拟生成, 免得非权威端把自己这边的球当成事实源。
        if (opt.type === 'hit') payload.eventId = `${this._gobeId}:${payload.time}:${this._hitEventCounter++}`;
        // 定向发房主(用户规格: 操作→房主→帧同步发布)
        Msg.send(Proto.Kind.Action, payload, [this._currentAuthId]);
    }

    /** move 节流状态: 上次发送时刻与内容 */
    private _moveSyncAt = 0;
    private _moveSyncLast: { angH: number, power: number } | null = null;

    /** 最近的权威击球事件。随权威帧重复携带，靠 eventId 去重，降低单次帧丢失导致漏击球的概率。 */
    private _pendingHitEvents: any[] = [];
    private _hitEventCounter = 0;
    /** 权威端全局击球序号；解决不同发送者本地时间/事件 ID 无法建立统一顺序的问题。 */
    private _authHitSequence = 0;
    private _lastAppliedAuthHitSeq = 0;
    private _lastHitGapLogAt = 0;
    private _lastHitRejectLogAt = 0;
    /** 最近一次收到权威端任何同步信息(帧或消息)的时刻——存活判定的口径 */
    private _lastAuthSyncAt = 0;
    /** 最近一次收到【权威快照帧】的时刻——帧通道单独卡死(消息照来)时的要状态依据 */
    private _lastAuthFrameAt = 0;
    /** 最近一次向权威端发消息请求同步的时刻 */
    private _lastSyncAskAt = 0;
    private _lastRecoveryRequestAt = 0;
    private _recoveryRequestCounter = 0;
    private static readonly HIT_EVENT_RETAIN = 32;
    /** 当前页里唯一允许存活的同步实例(bindNetwork 接管, destroy 交还) */
    private static _live: PVP | null = null;
    /** 同步线程存活计数(现场取证用): tx=本端发过的权威帧轮次, rx=收到并对过账的权威帧数 */
    private _txAuthFrames = 0;
    private _rxAuthFrames = 0;
    private _tickErrLoggedAt = 0;
    /** 权威帧被 msg 层拒绝的理由分布, 以及最近一次的身份对照(信封 from vs GOBE 报的实收 playerId) */
    private _authFrameDrops: Record<string, number> = {};
    private _lastAuthFrameFrom: any[] = [];
    /** 进 _onFrame 的原始帧次数(与 _rxAuthFrames 之差=解析/分发环节的损耗) */
    private _rxFrameTicks = 0;
    /** __qa.mute(ms) 设置的"暂停发送"截止时刻(仅调试环境写入, 玩家侧恒 0) */
    private _mutedUntil = 0;
    /** 球停止兜底对齐: 本次停止是否已上报过 + 上报序号(接收端按它去重) */
    private _ballStopAnnounced = false;
    private _ballStopCounter = 0;

    /**
     * 组一条权威击球事件(字段定义见 pvpProto.checkHit)。
     * 关键点: ballPos/chaPos/ball 一律取【本机(权威端)自己的模拟】在 ev.time 时刻的状态,
     * 不取发送方自称的坐标——否则接收端的射程判定两个操作数来自同一个包, 永远通过。
     */
    private _makeHitEvent(opt: any, playerId: string, eventId?: string, time?: number): any {
        const t = time ?? Timer.now();
        const st: any = this._ballStateAt(t);
        const snap = Proto.encodeBall(st);
        const pos = st ? { x: st.pos.x, y: st.pos.y, z: st.pos.z } : null;
        const cha = this._playerChaMap.get(playerId) || (this._pidEq(playerId, this._gobeId) ? this._localCha : null);
        const chaPos = cha ? { x: cha.x, y: cha.y, z: cha.z } : null;
        return {
            v: Proto.V,
            eventId: eventId || `${playerId}:${t}:${this._hitEventCounter++}`,
            playerId,
            time: t,
            authTerm: this._authorityTerm,
            type: 'hit',
            params: opt.params ?? null,
            angH: opt.angH,
            power: opt.power,
            ballPos: pos,
            chaPos,
            ball: snap
        };
    }

    /**
     * 取本机球在 t 时刻的物理状态: 优先用物理内核的历史表(phy.map, 与 ball.hitAt 回退同一套),
     * 历史里没有就退回当前状态(补算时长由 Proto.catchUpTarget 封顶, 不会飞出去)。
     */
    private _ballStateAt(t: number): any {
        const phy: any = (this.ball as any)?.phy;
        const st: any = phy?.state;
        if (!st) return null;
        if (phy.map && t < st.time) {
            const layout = phy.map.timeTo(t);
            const lookback = phy.MAX_LOOKBACK || 10;
            let hist: any = null;
            for (let i = 0; i <= lookback; i++) {
                const set = phy.map.get(layout - i);
                if (!set || !set.size) continue;
                for (const s of set) {
                    if (s.time <= t && (!hist || s.time > hist.time)) hist = s;
                }
            }
            if (hist) return hist;
        }
        return st;
    }

    /**
     * 击球事件入历史窗口; publish=true 时同时用【可靠通道】广播全房。
     * 只有"本机(权威端)刚生成的事件"才 publish: 从线上收到的事件再发一次就是回声。
     * 球是绝对时间驱动的确定性模拟, 这一条 (参数 + 进入时刻 + 入口状态) 之后就不需要同步球位了,
     * 所以它必须可靠送达(有损的 10Hz 帧做不到): 丢一条, 两端从那一刻起就是两段弹道。
     */
    private _queueHitEvent(event: any, publish: boolean = false): void {
        if (!event?.eventId) return;
        // 由权威端分配统一的击球序号，不能直接使用各客户端自己的本地序号。
        if (this._amAuth && !Number.isFinite(event.authorityHitSeq)) event.authorityHitSeq = ++this._authHitSequence;
        if (Number.isFinite(event.authorityHitSeq)) this._authHitSequence = Math.max(this._authHitSequence, event.authorityHitSeq);
        // 同一事件不重复入队, 也不重复广播
        if (this._pendingHitEvents.some(e => e.eventId === event.eventId)) return;
        this._pendingHitEvents.push(event);
        this._pendingHitEvents.sort((a, b) => (a.authorityHitSeq ?? Number.MAX_SAFE_INTEGER) - (b.authorityHitSeq ?? Number.MAX_SAFE_INTEGER));
        if (this._pendingHitEvents.length > PVP.HIT_EVENT_RETAIN) this._pendingHitEvents.splice(0, this._pendingHitEvents.length - PVP.HIT_EVENT_RETAIN);
        if (publish) Msg.send(Proto.Kind.HitEvent, event);
    }

    private _applyHitEvents(events: any[], senderId: string): void {
        if (!Array.isArray(events)) return;
        // 先按权威端序号排序。时间戳只能辅助诊断，不能用不同客户端时钟直接决定顺序。
        const ordered = events.slice().sort((a, b) => {
            const as = Number.isFinite(a?.authorityHitSeq) ? a.authorityHitSeq : Number.MAX_SAFE_INTEGER;
            const bs = Number.isFinite(b?.authorityHitSeq) ? b.authorityHitSeq : Number.MAX_SAFE_INTEGER;
            return as - bs || (a?.time ?? 0) - (b?.time ?? 0);
        });
        for (const ev of ordered) {
            if (!ev || typeof ev.eventId !== 'string') continue;
            // 结构/数值范围/时效/权威任期 + eventId 去重【已在 msg 层做过】(dispatch → accept 是唯一入口)。
            // 这里绝不能再 accept 一次: 同 eventId 第二遍必然被判 dedupe, 击球事件会被自己吃掉。
            // 被 accept 拒掉的事件到不了这里, 所以"锚点坏了就地重锚"不再在此触发;
            // 链断的真正信号是下面的 authorityHitSeq 缺口——缺号就请求一次完整检查点。
            // 已经应用过更晚击球的情况下，迟到旧事件绝不能把球回滚到过去；记录并等待下一份完整权威击球起点。
            if (Number.isFinite(ev.authorityHitSeq) && ev.authorityHitSeq <= this._lastAppliedAuthHitSeq) {
                this._queueHitEvent(ev);
                continue;
            }
            if (Number.isFinite(ev.authorityHitSeq) && ev.authorityHitSeq > this._lastAppliedAuthHitSeq + 1) {
                const now = Timer.now();
                if (now - this._lastHitGapLogAt > 1000) {
                    this._lastHitGapLogAt = now;
                    console.warn(`[PVP Sync] 击球事件序号缺口 ${this._lastAppliedAuthHitSeq} -> ${ev.authorityHitSeq}; 请求一次权威物理检查点恢复`);
                }
                this._requestSyncRecovery('hit-sequence-gap');
            }
            if (Number.isFinite(ev.authorityHitSeq)) this._lastAppliedAuthHitSeq = ev.authorityHitSeq;
            // 每个客户端保留最近事件；若权威端切换，本机升权威后可继续转发事件历史窗口。
            this._queueHitEvent(ev);
            // 本地已经预测/执行过的击球不再重放；其他客户端以权威事件为准。
            if (this._pidEq(ev.playerId, this._gobeId)) continue;
            let cha = this._playerChaMap.get(ev.playerId);
            if (!cha) {
                for (const [id, c] of this._playerChaMap) if (this._pidEq(id, ev.playerId)) { cha = c; break; }
            }
            if (!cha) continue;
            const snap = Proto.decodeBall(ev.ball);
            // 分歧检测: 权威端击球瞬间的球位与本端同一时刻的历史球位差太多, 说明两端早已分叉,
            // 单纯重放这条事件只会把误差带进之后整段轨迹 → 顺带要一份完整快照。
            const own = this._ballStateAt(ev.time);
            if (snap && own && Proto.ballDistance(snap, own) > Proto.BALL_HIT_TOL) {
                this._logHitReject(ev, 'diverged');
                this._requestSyncRecovery('hit-diverged');
            }
            // 击球者位置是【入口状态】的一部分, 只要数值有限就照单全收
            // (原来用场地边界卡一道, 球被打到场外时这条就被丢掉 → 对端连"谁在哪打的"都不知道)
            if (ev.chaPos && [ev.chaPos.x, ev.chaPos.y, ev.chaPos.z].every(Number.isFinite)) {
                cha.x = ev.chaPos.x; cha.y = ev.chaPos.y; cha.z = ev.chaPos.z;
            }
            const phy: any = (this.ball as any).phy;
            // 写回权威击球瞬间的球状态(定点字段 + iSync; 只写浮点影子会被下一步 iSync 覆盖)
            if (snap && Proto.applyBall(phy, snap)) {
                this.ball.pos = new Laya.Vector3(snap.pos.x, snap.pos.y, snap.pos.z);
                phy.isSleeping = false;
                phy.lastGndHit = null;
                phy.lastNetHit = null;
            }
            if (ev.params) {
                const params = { ...ev.params };
                if (params.spi && typeof params.spi === 'object') params.spi = new Laya.Vector3(params.spi.x || 0, params.spi.y || 0, params.spi.z || 0);
                this.hit(params, cha, ev.time);
            } else this.hit(undefined, cha, ev.time);
        }
    }

    /** 击球事件被拒的节流日志(同一原因 1s 内只打一次, 防弱网刷屏) */
    private _logHitReject(ev: any, why: string): void {
        const now = Timer.now();
        if (now - this._lastHitRejectLogAt < 1000) return;
        this._lastHitRejectLogAt = now;
        console.warn(`[PVP Sync] 丢弃击球事件 reason=${why} player=${ev?.playerId} age=${now - (ev?.time ?? now)}ms seq=${ev?.authorityHitSeq ?? 'n/a'}`);
    }

    /** 非权威端仅在检测到击球序号缺口等硬分歧时请求一次恢复。 */
    private _requestSyncRecovery(reason: string): void {
        if (this._amAuth || this._destroyed || !this._currentAuthId) return;
        const now = Timer.now();
        if (now - this._lastRecoveryRequestAt < 1000) return;
        this._lastRecoveryRequestAt = now;
        Msg.send(Proto.Kind.SyncRecover, {
            requestId: `${this._gobeId}:recover:${now}:${this._recoveryRequestCounter++}`,
            reason, lastHitSeq: this._lastAppliedAuthHitSeq,
            lastFrameSeq: Msg.lastAcceptedSeq(Proto.Kind.AuthFrame, this._currentAuthId)
        }, [this._currentAuthId]);
    }

    /** 权威端响应恢复请求：向请求方发一份比赛/角色/球快照(球用协议层定点快照)。 */
    private _onSyncRecoverRequest(data: any, senderId: string): void {
        if (!this._amAuth) return;
        Msg.send(Proto.Kind.BallRecovery, {
            requestId: data.requestId,
            hitSeq: this._authHitSequence, state: JSON.stringify(this._buildStatus()),
            frame: this.serializeFrame(),
            ball: Proto.encodeBall((this.ball as any)?.phy?.state),
            bt: Timer.now(),
            // 权威端此刻是否在算这颗球: 恢复端照此接回自己的物理开关, 否则会把静止的球接着积分出去
            bc: !!(this.ball as any)?.phy?.isCalc
        }, [senderId]);
        console.warn(`[PVP Sync] 已向 ${senderId} 发送一次异常恢复快照，原因=${data.reason || 'unknown'}`);
    }

    /** 只接受当前权威端发给本机的恢复快照；恢复比赛、角色与球状态后继续正常模拟。 */
    private _onBallRecovery(data: any, senderId: string): void {
        if (Number.isFinite(data.authTerm) && data.authTerm > this._authorityTerm) this._authorityTerm = data.authTerm;
        if (data.state) this.applyState(data.state);
        if (data.frame) this.applyFrame(data.frame);
        const snap = Proto.decodeBall(data.ball);
        if (snap) {
            const phy: any = (this.ball as any)?.phy;
            // 权威的模拟开关是这颗球"该不该继续积分"的唯一口径: 静止的球补算就是凭空飞出去
            if (phy?.state && data.bc === false) phy.isCalc = false;
            this._hardSnapBall(snap);
            // 快照是权威端 bt 时刻的球, 本端补算到现在(补算时长封顶, 与击球重放同一规则)
            const from = Proto.isNum(data.bt) ? data.bt : Timer.now();
            if (phy?.state && data.bc !== false) Proto.catchUpBall(phy, from, Timer.now());
        }
        if (Number.isFinite(data.hitSeq)) this._lastAppliedAuthHitSeq = Math.max(this._lastAppliedAuthHitSeq, data.hitSeq);
        console.warn(`[PVP Sync] 已应用权威异常恢复快照 requestId=${data.requestId || 'n/a'}; 后续恢复正常本地物理模拟`);
    }

    /** 无条件把球落到权威快照(用于"确认本机已经错了"的恢复场合, 常规帧校正走 _correctBall) */
    private _hardSnapBall(snap: Proto.BallSnap): void {
        const phy: any = (this.ball as any)?.phy;
        if (!phy?.state || !Proto.applyBall(phy, snap)) return;
        this.ball.pos = new Laya.Vector3(snap.pos.x, snap.pos.y, snap.pos.z);
        phy.isSleeping = false;
        phy.lastGndHit = null;
        phy.lastNetHit = null;
    }

    /**
     * 鹰眼确认进入挑战阶段(用户规格: 一个玩家确认了另一个也要一起进):
     * 本地转段(rule.beginEagleChallenge) + 广播 eagle 消息——对端收到后同样转段并经
     * mag.onEagleRemoteConfirm 回调进回放(badm 接线 _startEagleEye)。幂等(非确认阶段 no-op)。
     */
    public confirmEagle(): void {
        // 确认权不再要求"本机此刻必须处于 EAGLE_CONFIRM": 双击发生在玩家手上,
        // 状态位可能比这一下晚 100~200ms 才从权威帧到达, 用本地阶段卡住就会出现
        // "一个人进了鹰眼、另一个人压根没进"(用户明确要修的那条)。
        this.rule.beginEagleChallenge();
        // 把【本端记录的轨迹】一起发过去: 回放播的是各自的记录, 只要有一端没采到就没有回放,
        // 双端必须看同一段画面, 所以这段数据也要同步。
        Msg.send(Proto.Kind.Eagle, { act: 'confirm', track: Proto.encodeTrack(this.eagleRecPts || []) });
    }

    /**
     * 收到对端鹰眼确认: 无条件转入挑战阶段并同进回放(双端同一画面)。
     * track 缺失或本机没有记录时, 用对端传来的轨迹兜底 —— 鹰眼这一段两端必须"一样",
     * 不能因为谁的本地记录没采到就掉队。
     */
    private _onEagleMsg(data: any, senderId: string): void {
        if (data.act !== 'confirm') return;
        const remote = Proto.decodeTrack(data.track);
        const local: any[] = this.eagleRecPts || [];
        if (remote && local.length < 2) {
            this.eagleRecPts = remote as any;
            this.eagleRecDone = true;
        }
        if (this.phase !== (MatchPhase as any).EAGLE_CHALLENGE) this.rule.beginEagleChallenge();
        (this as any).onEagleRemoteConfirm?.();
    }

    /**
     * 应用远端玩家操作 - 在对应角色上重放 hit / move
     * @param data 操作消息体
     * @param senderId 发送方 GOBE ID，用于查找其控制的角色
     */
    private _applyAction(data: any, senderId: string): void {
        // 规范化查找: Map 严格键匹配对 number/string 差异断链 → 重放丢失
        let cha = this._playerChaMap.get(senderId);
        if (!cha) {
            for (const [k, v] of this._playerChaMap) {
                if (this._pidEq(k, senderId)) { cha = v; break; }
            }
        }
        if (!cha) return;
        // 状态同步反馈(用户规格): 重发消息附带的 pos = 权威端直接校准该角色位置
        if (data.pos) {
            cha.x = data.pos.x; cha.z = data.pos.z;
            if (data.pos.y !== undefined) cha.y = data.pos.y;
        }
        // 只有当前权威端可以生成并广播击球事件；重复到达的同一 eventId 不重复入队。
        // 事件的球/角色初始条件一律取权威端自己的模拟(见 _makeHitEvent), 不吃发送方声称的数据。
        if (this._amAuth && data.type === 'hit') {
            this._queueHitEvent(this._makeHitEvent(data, senderId, data.eventId, data.time), true);
        }
        // 房主收到操作后即时发布权威帧(50ms 合并抖动), 不等心跳周期
        if (this._amAuth) this._scheduleAuthFlush();
        switch (data.type) {
            case 'hit':
                // 时间驱动击球同步(用户规格): 击球消息带击球时刻——重放走 mag.hit(前摇表现) +
                // hitTime 透传, 出手时 ball.hitAt 回退球到过去击球时刻起算轨迹再 simTo 现在,
                // 双端从同一 (t, 参数) 出发位置必收敛("各打各的"根治);
                // 落地救起判定(击球时刻早于落地才可 cancel)由 hit 事件 canRescueSettle 把关
                if (data.params) {
                    const params = { ...data.params };
                    if (params.spi && typeof params.spi === 'object') params.spi = new Laya.Vector3(params.spi.x || 0, params.spi.y || 0, params.spi.z || 0);
                    this.hit(params, cha, data.time);
                } else this.hit(undefined, cha);
                break;
            case 'move':
                // 远端玩家移动重放同本地: 特殊击球期间移动照常(移速快慢由 cha 统一模型)
                this.notifyUserMove(cha);
                cha.move(data.angH, data.power);
                break;
        }
    }


    // ========== 帧同步线程管理 ==========

    /**
     * 启动统一帧同步线程 - 按心跳间隔定时运行，按权威端身份分支：
     *   - 权威端：广播 frame（全角色位置）+ state（比赛状态快照）+ authId（本权威端 ID）
     *   - 非权威端：广播本地角色位置帧（serializeNonAuthFrame），并检测权威端心跳超时，
     *     超时则调用 _advanceAuthority 推进权威端选举
     * 已存在则跳过，避免重复启动
     */
    /**
     * 房主即时权威帧发布(50ms 合并抖动): 收到操作消息/自身操作后触发——
     * 远端 150ms 内(操作传输+合并窗)看到状态变化, 不等 100ms 心跳轮询的相位差。
     * 仅权威端有意义; 定时器单例复用。
     */
    private _authFlushTid: string | null = null;
    /** 已销毁标志: 所有网络回调/线程入口守卫, 防场景销毁后残留实例继续收发 */
    private _destroyed = false;
    /** 点对点消息回调引用(destroy 精确摘除) */
    private _clientCb: ((info: any) => void) | null = null;
    /** 帧同步回调引用(destroy 精确摘除) */
    private _frameCb: ((msg: any) => void) | null = null;
    /** 对端离开/房间解散回调引用(destroy 精确摘除) */
    private _leaveCb: ((player: any) => void) | null = null;
    private _dismissCb: ((roomId: string) => void) | null = null;
    private _scheduleAuthFlush(): void {
        if (!this._amAuth || this._destroyed) return;
        if (this._authFlushTid != null) return;
        this._authFlushTid = Timer.setTimeout(50, () => {
            this._authFlushTid = null;
            if (!this._amAuth || this._destroyed) return;
            this._sendAuthFrame();
        });
    }

    /**
     * 发送权威帧(用户规格): 切分帧时每个 chunk 独立 sendFrame, 确保完整同步不丢部分。
     * - 单帧: { frame, state, authId } 一次发送
     * - 切分帧: 每个 chunk 独立发送, state 仅附首个 chunk 避免重复, 后续 chunk 仅含 frame 片段 + authId
     */
    /** 获取当前房间的本地恢复缓存。缓存只保存在本客户端，不依赖权威端在线。 */
    private _initRecoveryCache(): void {
        const room: any = Gnet.getRoom();
        const ids = (Gnet.getPlayers() || []).map((p: any) => String(p.playerId)).sort().join(",");
        this._recoveryCacheKey = String(room?.roomId || room?.id || ids || "pvp-default");
        const w: any = window as any;
        if (!w.__pvpRecoveryCache) w.__pvpRecoveryCache = {};
        const saved = w.__pvpRecoveryCache[this._recoveryCacheKey];
        if (saved && typeof saved === "object") {
            this._cachedGlobalStatus = saved.status || null;
            // 缓存里的状态是【存进来那一刻】有效的, 接管重放时要按存后流走的时长扣减;
            // 同一页面的 window 缓存, updatedAt 与本机 Timer 时基同系, 可直接当新鲜时刻用。
            this._cachedGlobalStatusAt = Number.isFinite(saved.updatedAt) ? saved.updatedAt : Timer.now();
            if (saved.players && typeof saved.players === "object") {
                for (const id of Object.keys(saved.players)) this._playerStateCache.set(id, saved.players[id]);
            }
            if (Number.isFinite(saved.authTerm)) this._authorityTerm = Math.max(this._authorityTerm, saved.authTerm);
            console.log(`[PVP Recovery] 已载入本地缓存：玩家快照 ${this._playerStateCache.size} 个`);
        }
    }

    private _getRecoveryStore(): any {
        const w: any = window as any;
        if (!w.__pvpRecoveryCache) w.__pvpRecoveryCache = {};
        if (!w.__pvpRecoveryCache[this._recoveryCacheKey]) w.__pvpRecoveryCache[this._recoveryCacheKey] = { players: {} };
        return w.__pvpRecoveryCache[this._recoveryCacheKey];
    }

    private _safeParseJson(value: any, fallback: any): any {
        if (value == null) return fallback;
        if (typeof value === "object") return value;
        try { return JSON.parse(value); } catch (e) { return fallback; }
    }

    /**
     * 记录最近一份权威状态快照 + 它在本机时基上的新鲜时刻。
     * 时刻必须和快照成对写入: 升格接管时靠它把缓存的剩余时间"老练化"
     * (上一权威 3 秒前发布的 serveRemainMs=8000, 接管时真实剩余只剩约 5 秒)。
     */
    private _cacheStatus(st: any, at: number = Timer.now()): void {
        if (!st) return;
        this._cachedGlobalStatus = st;
        this._cachedGlobalStatusAt = at;
    }

    private _captureCharacter(cha: any): any {
        // root 不存在代表角色节点尚未创建或已销毁；不能伪造原点快照，否则其他客户端会看到角色瞬移/消失。
        if (!cha || !cha.root) return null;
        const moveState = cha.moveState && typeof cha.moveState === "object"
            ? { ang: Number(cha.moveState.ang), power: Number(cha.moveState.power) } : null;
        return {
            id: cha.id,
            x: Number(cha.x) || 0,
            y: Number(cha.y) || 0,
            z: Number(cha.z) || 0,
            isP: !!cha.isP,
            state: Number(cha.state) || 0,
            isMoving: !!cha.isMoving,
            moveState,
            anim: typeof cha.getAnimationSyncState === "function" ? cha.getAnimationSyncState() : undefined,
            updatedAt: Timer.now()
        };
    }

    private _capturePlayerSnapshot(playerId: string, cha: any): void {
        const snapshot = this._captureCharacter(cha);
        if (!playerId || !snapshot) return;
        this._recordPlayerSnapshot(playerId, snapshot);
    }

    private _recordPlayerSnapshot(playerId: string, snapshot: any): void {
        if (!playerId || !snapshot || typeof snapshot !== "object") return;
        const cleanId = String(playerId).trim();
        if (!cleanId) return;
        this._playerStateCache.set(cleanId, { ...snapshot, playerId: cleanId, updatedAt: Number(snapshot.updatedAt) || Timer.now() });
    }

    private _recordFrameSnapshot(frameData: any): void {
        const chunks = Array.isArray(frameData) ? frameData : [frameData];
        for (const chunk of chunks) {
            const frame = this._safeParseJson(chunk, null);
            if (!frame || !Array.isArray(frame.players)) continue;
            for (const fp of frame.players) {
                let playerId = "";
                for (const [pid, cha] of this._playerChaMap) {
                    if (Number((cha as any)?.id) === Number(fp.id)) { playerId = String(pid); break; }
                }
                if (!playerId) playerId = `role:${fp.id}`;
                this._recordPlayerSnapshot(playerId, fp);
            }
        }
    }

    private _persistRecoveryCache(): void {
        if (!this._recoveryCacheKey) return;
        const store = this._getRecoveryStore();
        store.status = this._cachedGlobalStatus;
        store.players = store.players || {};
        this._playerStateCache.forEach((snapshot, playerId) => { store.players[playerId] = snapshot; });
        store.authTerm = this._authorityTerm;
        store.authId = this._currentAuthId;
        store.updatedAt = Timer.now();
    }

    private _applyCharacterSnapshot(playerId: string, snapshot: any): void {
        if (!snapshot) return;
        let cha: any = this._playerChaMap.get(String(playerId));
        if (!cha) {
            for (const [pid, item] of this._playerChaMap) {
                if (this._pidEq(pid, playerId)) { cha = item; break; }
            }
        }
        if (!cha || !cha.root) return;
        if ([snapshot.x, snapshot.y, snapshot.z].every((v: any) => Number.isFinite(Number(v)))) {
            cha.x = Number(snapshot.x); cha.y = Number(snapshot.y); cha.z = Number(snapshot.z);
        }
        if (typeof snapshot.isP === "boolean") cha.isP = snapshot.isP;
        if (snapshot.state === ChaState.IDLE && (cha.state === ChaState.MOVE || cha.state === ChaState.HIT_WINDUP)) cha.move(-1, -1);
        else if (snapshot.state === ChaState.MOVE && snapshot.moveState && Number.isFinite(snapshot.moveState.ang) && Number.isFinite(snapshot.moveState.power)) {
            cha.move(snapshot.moveState.ang, snapshot.moveState.power);
        }
        if (snapshot.anim && typeof cha.applyAnimationSync === "function") cha.applyAnimationSync(snapshot.anim);
    }

    private _restoreCachedStateAfterTakeover(): void {
        if (!this._amAuth) return;
        if (this._cachedGlobalStatus) {
            // 缓存快照的剩余时间是【它被发布/收到的那一刻】的值: 接管前本机已经静默观察了
            // 一段(升格判据 2~3s), 照搬等于给新权威凭空续命——发球倒计时会被重新算成满格,
            // 两端从此跑两个状态机。按本机时基扣掉已经流走的时长再重基时钟。
            this._applyStateWithCompensation(this._cachedGlobalStatus, Math.max(0, Timer.now() - this._cachedGlobalStatusAt));
        }
        this._playerStateCache.forEach((snapshot, playerId) => this._applyCharacterSnapshot(playerId, snapshot));
        this._persistRecoveryCache();
        console.warn(`[PVP Recovery] 新权威端已从本地缓存恢复比赛状态与 ${this._playerStateCache.size} 个玩家快照`);
        this._scheduleAuthFlush();
    }

    private _requestPlayerStateRecovery(reason: string): void {
        if (this._destroyed || this._amAuth || !this._currentAuthId || !this._gobeId) return;
        const now = Timer.now();
        if (now - this._lastStateRequestAt < 800) return;
        this._lastStateRequestAt = now;
        Msg.send(Proto.Kind.RoleRecoverRequest, {
            requestId: `${this._gobeId}:state:${now}`, reason
        }, [this._currentAuthId]);
    }

    private _onPlayerStateRecoveryRequest(data: any, senderId: string): void {
        if (!this._amAuth) return;
        const frame = this.serializeFrame();
        const state = JSON.stringify(this._buildStatus());
        this._cacheStatus(this._safeParseJson(state, this._cachedGlobalStatus));
        this._recordFrameSnapshot(frame);
        this._capturePlayerSnapshot(this._gobeId, this._localCha);
        const players: any = {};
        this._playerStateCache.forEach((snapshot, id) => { players[id] = snapshot; });
        Msg.send(Proto.Kind.RoleRecover, {
            requestId: data.requestId, state, frame, players, updatedAt: Timer.now()
        }, [senderId]);
        this._persistRecoveryCache();
    }

    private _onPlayerStateRecovery(data: any, senderId: string): void {
        if (Number.isFinite(data.authTerm) && data.authTerm > this._authorityTerm) this._authorityTerm = data.authTerm;
        if (data.state) {
            this._cacheStatus(this._safeParseJson(data.state, this._cachedGlobalStatus));
            this.applyState(data.state);
        }
        if (data.frame) {
            this._recordFrameSnapshot(data.frame);
            this.applyFrame(data.frame);
        }
        if (data.players && typeof data.players === "object") {
            for (const playerId of Object.keys(data.players)) {
                this._recordPlayerSnapshot(playerId, data.players[playerId]);
                this._applyCharacterSnapshot(playerId, data.players[playerId]);
            }
        }
        this._persistRecoveryCache();
        console.log(`[PVP Recovery] 已从权威端 ${senderId} 恢复本玩家与全房间角色状态 requestId=${data.requestId || "n/a"}`);
    }

    private _onPlayerStateReport(data: any, senderId: string): void {
        if (!this._amAuth || !data.snapshot) return;
        // 只允许玩家更新自己被分配的角色，避免错误映射/伪造报告覆盖其他玩家角色。
        let assignedCha: any = null;
        for (const [pid, cha] of this._playerChaMap) {
            if (this._pidEq(pid, senderId)) { assignedCha = cha; break; }
        }
        if (!assignedCha || Number(assignedCha.id) !== Number(data.characterId) || Number(assignedCha.id) !== Number(data.snapshot.id)) return;
        const snapshot = data.snapshot;
        if (![snapshot.x, snapshot.y, snapshot.z].every((v: any) => Number.isFinite(Number(v)))) return;
        const stateSnapshot = { ...snapshot };
        delete stateSnapshot.anim;
        this._applyCharacterSnapshot(senderId, stateSnapshot);
        this._recordPlayerSnapshot(senderId, snapshot);
        this._persistRecoveryCache();
        this._scheduleAuthFlush();
        console.warn(`[PVP Sync] 已接收玩家 ${senderId} 的状态纠正报告并更新权威角色快照`);
    }

    /** 非权威客户端请求纠正自己的动画状态；权威端验证玩家-角色映射后统一广播。 */
    private _onAnimationStateRequest(data: any, senderId: string): void {
        if (!this._amAuth) return;
        const stateId = Number(data.animId);
        if (!Number.isInteger(stateId) || stateId < 0) return;

        let assignedCha: any = null;
        for (const [pid, cha] of this._playerChaMap) {
            if (this._pidEq(pid, senderId)) { assignedCha = cha; break; }
        }
        if (!assignedCha || Number(assignedCha.id) !== Number(data.characterId)
            || typeof assignedCha.applyAnimationStateId !== "function") return;
        if (!assignedCha.applyAnimationStateId(stateId)) return;

        // 权威端立即把最终状态广播给全房间；常规权威帧也会持续携带同一个状态 ID。
        Msg.send(Proto.Kind.AnimStateBroadcast, {
            playerId: senderId,
            characterId: Number(assignedCha.id),
            animId: stateId,
            changedAt: Timer.now()
        });
        this._scheduleAuthFlush();
    }

    /** 仅接受当前权威端的动画状态广播，并在本地按状态 ID 切换，不重置播放进度。 */
    private _onAnimationStateBroadcast(data: any, senderId: string): void {
        if (Number.isFinite(data.authTerm) && data.authTerm > this._authorityTerm) this._authorityTerm = data.authTerm;
        const stateId = Number(data.animId);
        if (!Number.isInteger(stateId) || stateId < 0) return;

        let target: any = null;
        for (const [pid, cha] of this._playerChaMap) {
            if (this._pidEq(pid, data.playerId)) { target = cha; break; }
        }
        if (!target || Number(target.id) !== Number(data.characterId)
            || typeof target.applyAnimationStateId !== "function") return;
        target.applyAnimationStateId(stateId);
    }

    /**
     * 发送权威帧: 单帧一次发完; 超阈值时每个分片独立发送(接收端按分片各自解析增量合并),
     * 同一轮分片共用 syncSeq —— 序号规则是"小于已接受即过期", 等号放行正是给分片用的。
     */
    private _sendAuthFrame(): void {
        const frame = this.serializeFrame();
        const state = JSON.stringify(this._buildStatus());
        this._cacheStatus(this._safeParseJson(state, null));
        this._recordFrameSnapshot(frame);
        this._capturePlayerSnapshot(this._gobeId, this._localCha);
        this._persistRecoveryCache();
        const syncSeq = ++this._authFrameSeq;
        // 帧里不再携带击球事件: 轨迹起点改走可靠通道单条广播(_queueHitEvent publish),
        // 靠"随帧重发若干轮"补救等于默认弹道需要连续纠偏——那是本架构要消灭的东西。
        // 击球历史窗口(_pendingHitEvents)只留给 recovery(迟入/接管时一次性补齐整段链)。
        const emit = (chunk: any, withState: boolean) => Msg.send(Proto.Kind.AuthFrame, {
            frame: chunk, state: withState ? state : undefined,
            authTerm: this._authorityTerm, syncSeq
        });
        if (typeof frame === 'string') emit(frame, true);
        else frame.forEach((chunk: string, i: number) => emit(chunk, i === 0));
        this._maybeAnnounceBallStop();
    }

    /**
     * 兜底对齐(用户规格): 球【停止】的那一刻, 权威端把自己的球位报一次给对端。
     * 主路径仍然是"每一次击球同步一次入口(参数+时刻+入口状态+击球者位置)";
     * 这一条负责把残余误差清零: 弹道跑到停止点后就不再变化, 此时对齐是无损的,
     * 也正好挡住"一处偏差滚成整局不同步"的最坏情况。
     * 只在 停止/起算 的跳变边上发一次(_ballStopAnnounced 闸), 不是每帧都发。
     */
    private _maybeAnnounceBallStop(): void {
        const phy: any = (this.ball as any)?.phy;
        if (!phy?.state) return;
        const stopped = phy.isCalc === false || phy.isSleeping === true;
        if (!stopped) { this._ballStopAnnounced = false; return; }
        if (this._ballStopAnnounced) return;
        this._ballStopAnnounced = true;
        const ball = Proto.encodeBall(phy.state);
        if (!ball) return;
        Msg.send(Proto.Kind.BallStop, {
            stopId: `${this._gobeId}:${++this._ballStopCounter}`,
            bt: Timer.now(), ball
        });
    }

    /** 对端球停止上报: 落位并停算(此时本端没有任何弹道值得保护), 下一拍起双端同一状态 */
    private _onBallStop(data: any, senderId: string): void {
        if (this._amAuth || this._destroyed) return;
        const phy: any = (this.ball as any)?.phy;
        const snap = Proto.decodeBall(data.ball);
        if (!phy?.state || !snap) return;
        if (!Proto.applyBall(phy, snap)) return;
        phy.isCalc = false;
        phy.isSleeping = true;
        this.ball.pos = new Laya.Vector3(snap.pos.x, snap.pos.y, snap.pos.z);
    }

    private _startAuthFrameSync(): void {
        if (this.sup) return;
        this.sup = Timer.setInterval(this.pvpCfg.heartbeatInterval, () => {
            // 整段必须吞异常: Timer.setInterval 在回调抛错后不再排下一次(Timer.ts 的 check 里
            // func() 先于 reschedule)——一次异常 = 本局同步线程永久死亡, 现场表现是"对端从此
            // 什么都收不到", 而线程自己不会报第二次错。
            try {
                // 只有"房间对象都没了"才这一拍什么都不发(既不撞 Gnet.sendFrame 的 "Not in a room",
                // 也不再把日志刷满把现场证据冲走)。人数<=1 不能当停发的依据: GOBE 换 room 实例时会
                // 短暂只报自己(实测把这一条当成停发条件, 双端 tx 同时冻死, 整局再没人动过一格)。
                // 真正"对端走了"由 onLeave/onDismiss 事件报, 那里人数是事件后的权威口径。
                if (!Gnet.getRoom()) return;
                // __qa.mute(ms) 注入的"这端暂时不说话": 只停发送, 不断线不掉房, 用来实测权威交接
                if (Timer.now() < this._mutedUntil) return;
                if (this._amAuth) {
                    // 权威端：发送全角色帧 + 比赛状态 + 权威端 ID
                    this._sendAuthFrame();
                    this._txAuthFrames++;
                } else {
                    // 非权威端也持续保存自己的角色快照，并将其他玩家快照保留在本地缓存。
                    this._capturePlayerSnapshot(this._gobeId, this._localCha);
                    this._persistRecoveryCache();
                    // 非权威端：发送本地角色位置帧（含本端认定的权威端任期）
                    const nonAuth = this.serializeNonAuthFrame();
                    if (nonAuth) Msg.send(Proto.Kind.NonAuthFrame, nonAuth);
                    // 阶段感知的权威端存活判定(取代 500ms 硬超时升格)
                    this._watchAuthority();
                }
            } catch (e) {
                const now = Timer.now();
                if (now - this._tickErrLoggedAt > 1000) {
                    this._tickErrLoggedAt = now;
                    console.error(`[PVP] 帧同步线程异常(线程继续存活): ${(e as any)?.message || e}`);
                }
            }
        });
        console.log(`[PVP] 帧同步线程已启动 (${this._gobeId}, 权威端=${this._amAuth})`);
    }

    /**
     * 权威端存活三级判定(用户规格): 
     *   1) 帧静默 > ASK_SYNC_MS(1s)    → 主动发"消息同步请求", 要权威端用消息把状态回过来(不靠帧)
     *   2) 发球阶段帧静默 > 2s          → 进入升格流程(发球阶段本应每秒都有一帧)
     *   3) 帧静默 > PROMOTE_SILENT_MS(3s) → 升格自己为权威端
     * 升格口径是【帧】, 不是"帧+消息都没说话": 权威端是唯一模拟器, 帧停了就是画面停了,
     * 消息能回状态也只是 1Hz 的急救包(实测权威端停发 4.5s 期间, 对端靠急救包把球位误差
     * 拖到 42m 还判定"权威端活着不升格")。消息通道仍参与第 1 级: 帧丢但消息在 = 先要, 不急。
     */
    private _watchAuthority(): void {
        if (this._amAuth || this._destroyed) return;
        const now = Timer.now();
        // 还没建立基准(刚接管/刚绑定): 先记时点, 不能按"静默很久"立刻升格
        if (!this._lastAuthSyncAt) {
            this._lastAuthSyncAt = now;
            this._lastAuthFrameAt = now;
            this._lastSyncAskAt = now;
            return;
        }
        const frameSilent = now - this._lastAuthFrameAt;
        const serving = this.phase === MatchPhase.SERVING;
        const peers = (Gnet.getPlayers() || []).length;
        if (frameSilent > Proto.PROMOTE_SILENT_MS || (serving && frameSilent > Proto.SERVING_SILENT_MS)) {
            // 房间里已经没对手了就不再喊升格: 选举本身也会因人数<=1 什么都不做,
            // 实测这样每秒刷一条警告, 200 条把真正的现场证据挤出日志环形缓冲
            if (peers <= 1) return;
            console.warn(`[PVP] 权威端帧静默 ${Math.round(frameSilent)}ms → 进入升格`);
            this._advanceAuthority();
            return;
        }
        if (frameSilent > Proto.ASK_SYNC_MS && now - this._lastSyncAskAt > Proto.ASK_RETRY_MS) {
            if (peers <= 1) return;
            this._lastSyncAskAt = now;
            console.warn(`[PVP Sync] 权威端帧静默 ${Math.round(frameSilent)}ms(${serving ? '发球阶段' : '常规'}), 发消息请求状态同步`);
            this._requestSyncRecovery(serving ? 'serving-frame-silent' : 'frame-silent');
        }
    }

    /**
     * 停止帧同步线程 - 清理定时器并置空引用
     * 在销毁时调用；权威端升降级无需停启，仅切换 _amAuth 即可在线程内分支
     */
    private _stopAuthFrameSync(): void {
        if (this.sup) {
            Timer.clear(this.sup);
            this.sup = null;
            console.log(`[PVP] 帧同步线程已停止 (${this._gobeId})`);
        }
    }

    // ========== 帧同步接收与权威端检测 ==========

    /**
     * 帧同步接收回调 - 解析帧数据并分发处理
     * 处理四类帧内容：
     *   1. 非权威端帧（含 nonAuthFrame）：根据 playerId 应用对应角色位置/状态
     *   2. 权威端帧（含 authId）：检测权威端、应用状态与帧
     *   3. 权威端候选帧（含 authCandidate）：交给 _onAuthCandidate 处理选举
     *   4. 普通帧：直接 applyFrame
     * @param msg 帧消息，可能是单帧或帧数组
     */
    private _onFrame(msg: any): void {
        this._rxFrameTicks++;
        // 兼容单帧与帧数组两种形态
        const frameMsgs = Array.isArray(msg) ? msg : [msg];
        for (const fm of frameMsgs) {
            if (!fm.frameInfo) continue;
            for (const fi of fm.frameInfo) {
                // 跳过自己发送的帧，避免回环
                if (this._pidEq(fi.playerId, this._gobeId)) continue;
                for (const data of fi.data) {
                    let parsed: any = null;
                    try { parsed = JSON.parse(data); } catch (e) { continue; }
                    if (!parsed || typeof parsed.kind !== 'string') continue;
                    if (parsed.kind === Proto.Kind.AuthFrame) this._onAuthFrame(parsed, fi.playerId);
                    else Msg.dispatch(parsed, fi.playerId);
                }
            }
        }
    }

    /**
     * 权威快照帧入口: 信封规则(发送者身份/任期/序号过期)交 msg.accept,
     * 权威裁决与状态落盘留在这里——只有这里的逻辑知道"比赛状态"是什么。
     */
    private _onAuthFrame(parsed: any, senderId: string): void {
        const prevSeq = Msg.lastAcceptedSeq(Proto.Kind.AuthFrame, senderId);
        const why = Msg.accept(Proto.Kind.AuthFrame, parsed, senderId);
        if (why) {
            // 每一种拒绝都要留下现场: 这里曾经只报 stale-seq, 其余理由(身份不符/任期过期/
            // 非权威端发来)整帧静默丢弃, 结果是"帧明明收到了却一条都没落地"无从下手。
            this._authFrameDrops[why] = (this._authFrameDrops[why] || 0) + 1;
            this._lastAuthFrameFrom = [parsed.from, senderId, this._currentAuthId, parsed.authTerm, this._authorityTerm];
            if (why === 'stale-seq' && Timer.now() - this._lastSyncGapLogAt > 1000) {
                this._lastSyncGapLogAt = Timer.now();
                console.warn(`[PVP Sync] 忽略过期权威快照 seq=${parsed.syncSeq}, 当前=${prevSeq}`);
            } else if (why !== 'stale-seq' && Timer.now() - this._lastSyncGapLogAt > 1000) {
                this._lastSyncGapLogAt = Timer.now();
                console.warn(`[PVP Sync] 权威快照帧被拒 原因=${why} from=${parsed.from} 实收=${senderId}`
                    + ` 本机认定权威=${this._currentAuthId} 任期=${parsed.authTerm}/${this._authorityTerm}`);
            }
            return;
        }
        // 击球事件队列即使随旧帧乱序到达也先按 eventId 去重，避免因丢帧漏掉保留窗口中的事件；
        // 旧帧不得回滚比赛状态与角色位置。
        // 任期不在这里预先吸收: 吸收必须等 _detectAuthority 裁决完——先把本机任期抬到对方档位,
        // "对方任期更高"就永久退化成"任期相等", 只剩 playerId 定序, 大 id 那一端再也不肯让位。
        this._detectAuthority(parsed.from, senderId, parsed.authTerm);
        if (!this._pidEq(parsed.from, this._currentAuthId)) return;
        this._rxAuthFrames++;
        this._lastAuthFrameAt = Timer.now();
        if (parsed.hitEvents) this._applyHitEvents(parsed.hitEvents, senderId);
        const seq = Number(parsed.syncSeq);
        if (Proto.isNum(seq) && prevSeq > 0 && seq > prevSeq + 1) {
            const now = Timer.now();
            if (now - this._lastSyncGapLogAt > 1000) {
                this._lastSyncGapLogAt = now;
                console.warn(`[PVP Sync] 检测到权威帧缺口 ${prevSeq} -> ${seq}; 采用最新权威快照恢复状态/角色位置`);
            }
        }
        if (parsed.state) {
            this._cacheStatus(this._safeParseJson(parsed.state, this._cachedGlobalStatus));
            this.applyState(parsed.state);
        }
        if (parsed.frame) {
            this._recordFrameSnapshot(parsed.frame);
            this.applyFrame(parsed.frame);
            // 非权威端若发现自己的角色状态与权威快照不一致，通过消息把本地真实状态回报给权威端。
            this._verifySelfInAuthFrame(parsed.frame);
        }
        this._persistRecoveryCache();
    }

    /**
     * 检测权威端心跳 - 收到权威端帧时刷新心跳时间戳
     * 若本地原为权威端但收到其他权威端帧，则降级为非权威端（避免双权威端）
     * @param frameAuthId 帧中声明的权威端 ID
     * @param senderId 实际发送该帧的玩家 ID
     */
    /**
     * 双权威冲突裁决: 任期高者胜; 任期相同按 playerId 定序。
     * 两端用同一个函数算出的结果互补(一方让位、另一方守住), 不会出现"互相让位→都没权威"
     * 也不会出现"双方都自封→权威端来回翻转"(实测: 两端各跑各的 rule 定时器, 发球权一交接球位就分家)。
     */
    private _shouldYieldTo(peerId: string, peerTerm: number): boolean {
        const p = Number(peerTerm);
        if (Number.isFinite(p) && p > this._authorityTerm) return true;
        if (Number.isFinite(p) && p < this._authorityTerm) return false;
        return String(peerId) > String(this._gobeId);
    }

    private _detectAuthority(frameAuthId: string, senderId: string, peerTerm?: number): void {
        // 忽略自己声明的权威端帧
        if (this._pidEq(frameAuthId, this._gobeId)) return;
        // 仅当发送方即为声明的权威端时才认可（防止伪造）。
        if (!this._pidEq(senderId, frameAuthId)) {
            console.log("权威端不匹配：", senderId, frameAuthId);
            return;
        }
        const p = Number(peerTerm);
        const newerTerm = Proto.isNum(p) && p > this._authorityTerm;
        // 已认定权威端仍在心跳期内时拒绝分裂权威抢回控制权——但【任期更高】是唯一例外:
        // 新权威的第一批帧必然早于本机把身份切过去, 旧权威的最后一帧任期不可能比它高,
        // 拿心跳窗口挡住它就是把选举锁死在死人身上。
        if (!newerTerm && this._currentAuthId && !this._pidEq(this._currentAuthId, frameAuthId)
            && Timer.now() - this._lastHeartbeat <= this.pvpCfg.authorityTimeout) {
            console.warn(`[PVP Sync] 拒绝非当前权威端快照 ${frameAuthId}; 当前=${this._currentAuthId}`);
            return;
        }
        if (this._amAuth) {
            // 只有裁决判对方该持有权威时才让位(裁决用的是本机【未吸收对方任期】的任期, 见 _onAuthFrame)
            if (!this._shouldYieldTo(frameAuthId, p)) {
                console.warn(`[PVP] 拒绝对方权威声明 ${frameAuthId} term=${peerTerm}; 本机 term=${this._authorityTerm} 继续持有权威`);
                return;
            }
            if (newerTerm) this._authorityTerm = p;
            console.log(`[PVP] 检测到其他权威端 ${frameAuthId}，本地降级为非权威端${this._gobeId}`);
            this._amAuth = false;
            this.isAuthoritative = false;
            // 统一帧同步线程无需停启，切换 _amAuth 后自动走非权威端分支
        } else if (newerTerm) {
            // 非权威端跟任期走: 新权威的快照要立刻被当成"当前权威"应用, 否则整批开局状态被丢弃
            this._authorityTerm = p;
        }

        // 权威端变化后本端身份立即跟进
        const authorityChanged = !this._pidEq(this._currentAuthId, frameAuthId);
        this._currentAuthId = frameAuthId;
        this._lastHeartbeat = Timer.now();
        this._lastAuthSyncAt = Timer.now();
        this._lastAuthFrameAt = Timer.now();
        if (authorityChanged && !this._amAuth) {
            Timer.setTimeout(120, () => this._requestPlayerStateRecovery("authority_changed"));
        }
    }

    /**
     * 处理权威端候选帧 - 参与新权威端选举
     * 两种情形：
     *   1. 候选为自己且当前非权威端且原权威端已超时：立即接管成为新权威端
     *   2. 候选为他人且原权威端已超时：跟随该候选，重置等待其心跳
     * @param candidateId 被推举的候选权威端 ID
     * @param senderId 推举发起方 ID
     */
    private _onAuthCandidate(candidateId: string, senderId: string, candidateTerm?: number): void {
        if (this._pidEq(senderId, this._gobeId)) return;

        if (this._pidEq(candidateId, this._gobeId) && !this._amAuth) {
            // 候选为自己：仅在原权威端确实超时后才接管，避免误判
            if (Timer.now() - this._lastHeartbeat > this.pvpCfg.authorityTimeout) {
                console.log(`[PVP] 收到 ${senderId} 推举自己为新权威端，立即接管`);
                if (Number.isFinite(candidateTerm)) this._authorityTerm = Math.max(this._authorityTerm, candidateTerm as number);
                this._currentAuthId = this._gobeId;
                this._authFrameSeq = 0;
                this._amAuth = true;
                this.isAuthoritative = true;
                this._lastHeartbeat = Timer.now();
                // 统一帧同步线程无需停启，切换 _amAuth 后自动走权威端分支
                // 广播权威端声明，让其他端降级(任期与身份都在信封里)
                Msg.send(Proto.Kind.AuthDeclare);
                this._restoreCachedStateAfterTakeover();
            }
        } else if (!this._pidEq(candidateId, this._gobeId)) {
            // 候选为他人：原权威端超时且候选变更时跟随，重置心跳等待新权威端心跳
            if (Timer.now() - this._lastHeartbeat > this.pvpCfg.authorityTimeout) {
                if (!this._pidEq(this._currentAuthId, candidateId)) {
                    console.log(`[PVP] 收到 ${senderId} 推举 ${candidateId}，跟随并重置等待`);
                    this._currentAuthId = candidateId;
                    this._authFrameSeq = 0;
                }
                if (Number.isFinite(candidateTerm) && (candidateTerm as number) >= this._authorityTerm) {
                    this._authorityTerm = candidateTerm as number;
                }
            }
        }
    }


    /**
     * 推进权威端选举 - 当前权威端失联时按玩家列表轮转选择下一候选
     * 流程：
     *   1. 单人房间或本地已是权威端则跳过
     *   2. 在 _allPlayerIds 中取当前权威端的下一个作为候选
     *   3. 若候选为自己：直接接管并广播 auth_declare
     *   4. 若候选为他人：发送 authCandidate 帧通知全房间跟随
     */
    private _advanceAuthority(): void {
        // 单人房间无需选举
        if (this._allPlayerIds.length <= 1) return;
        // 本地已是权威端无需推进
        if (this._amAuth) return;

        // 在玩家列表中定位当前权威端，取下一索引（环形）
        // _allPlayerIds 为玩家对象数组，需按 playerId 字段查找而非 indexOf
        // 公认排序取下一任(房间顺序轮转, 顺序拿不准时按 playerId 字典序)——不随机
        const ids: string[] = this._allPlayerIds.map((p: any) => String(p.playerId)).filter((s: string) => !!s);
        const nextAuthId = Proto.pickPromotable(ids, this._currentAuthId, this._gobeId);
        this._authorityTerm += 1;
        this._currentAuthId = nextAuthId;
        this._lastHeartbeat = Timer.now();
        // 本轮选举自己也要重新起算帧静默, 否则下一次 100ms 又判"静默超上限"重复选举
        this._lastAuthFrameAt = Timer.now();

        console.log(`[PVP] 权威端帧静默超上限, 升格候选: ${nextAuthId}; 任期=${this._authorityTerm}`);

        if (this._pidEq(this._currentAuthId, this._gobeId)) {
            // 候选为自己：立即接管，广播声明
            this._authFrameSeq = 0;
            this._amAuth = true;
            this.isAuthoritative = true;
            // 统一帧同步线程无需停启，切换 _amAuth 后自动走权威端分支
            Msg.send(Proto.Kind.AuthDeclare);
            this._restoreCachedStateAfterTakeover();
            console.log(`[PVP] 已成为权威端`);
        } else {
            // 候选为他人：发送候选帧，全房间共同认定新权威端
            Msg.send(Proto.Kind.AuthCandidate, { candidate: nextAuthId });
            console.log(`[PVP] 发送权威端变更同步帧，认定新权威端为: ${nextAuthId}`);
        }
    }

    /**
     * 处理权威端声明 - 收到新权威端的 auth_declare 消息
     * 若本地原为权威端则降级，并刷新当前权威端与心跳
     * 身份/任期下限的过滤在 msg 层(from 与实收发件人核对、小任期整封丢弃)，
     * 这里只做双权威冲突裁决与身份切换。
     * @param senderId 声明方 GOBE ID，即新权威端
     */
    private _onAuthDeclare(data: any, senderId: string): void {
        const incomingTerm = Number(data.authTerm);
        const newerTerm = Proto.isNum(incomingTerm) && incomingTerm > this._authorityTerm;
        if (this._amAuth) {
            // 双权威冲突同样走裁决: 只有对方该持有权威才让位(否则拒收声明, 本机守住)。
            // 裁决必须早于任期吸收: 先抬齐档位,"对方任期更高"就永远判不出来, 大 id 那端死守 →
            // 两端同时自封权威、各算各的球(实测球位差 60m、比分分家)。
            if (!this._shouldYieldTo(senderId, incomingTerm)) {
                console.warn(`[PVP] 拒收权威端声明 ${senderId} term=${incomingTerm}; 本机 term=${this._authorityTerm} 继续持有权威`);
                return;
            }
            console.log(`[PVP] 收到 ${senderId} 的权威端声明，本地降级为非权威端${this._gobeId}`);
            this._amAuth = false;
            this.isAuthoritative = false;
            // 统一帧同步线程无需停启，切换 _amAuth 后自动走非权威端分支
        }
        if (newerTerm) this._authorityTerm = incomingTerm;
        // 认定发送方为新权威端，刷新心跳；切换后主动请求一次权威恢复快照。
        const authorityChanged = !this._pidEq(this._currentAuthId, senderId);
        if (authorityChanged) this._authFrameSeq = 0;
        this._currentAuthId = senderId;
        this._lastHeartbeat = Timer.now();
        this._lastAuthFrameAt = Timer.now();
        this._lastAuthSyncAt = Timer.now();
        if (authorityChanged && !this._amAuth) {
            Timer.setTimeout(120, () => this._requestPlayerStateRecovery("auth_declare"));
        }
    }

    // ---------- 状态提案 ----------

    /**
     * 发起状态提案 - 权威端在状态变更时向全房间提案新状态，等待各端确认
     * 流程：
     *   1. 仅权威端且多人房间才提案
     *   2. 生成唯一 proposeId，构建状态快照
     *   3. 广播 state_propose，启动确认超时定时器
     *   超时未全员确认则自动补全（_onProposeTimeout）
     */
    private _proposeStateChange(): void {
        if (!this._amAuth || this._allPlayerIds.length <= 1) return;
        // 生成全局唯一提案 ID：玩家ID_时间戳_计数器
        const proposeId = `${this._gobeId}_${Timer.now()}_${this._proposeCounter++}`;
        const status = this._buildStatus();
        // okplay 记录各玩家确认状态，初始仅自己已确认
        // allPlayers 需存 playerId 字符串数组，供后续 okplay[pid] 按字符串键查找
        const proposal = { proposeId, status, okplay: { [this._gobeId]: true }, allPlayers: this._allPlayerIds.map((p: any) => p.playerId), timeoutId: null as any };
        this._proposals.set(proposeId, proposal);
        Msg.send(Proto.Kind.StatePropose, { proposeId, status });
        // 启动确认超时：超时后强制通过（补全未确认玩家）
        proposal.timeoutId = Timer.setTimeout(this.pvpCfg.stateConfirmTimeout, () => this._onProposeTimeout(proposeId));
    }

    /**
     * 提案超时处理 - 未全员确认时强制补全并下发最终状态
     * 避免某端卡死导致状态永远无法推进
     * @param proposeId 超时的提案 ID
     */
    private _onProposeTimeout(proposeId: string): void {
        const p = this._proposals.get(proposeId);
        if (!p) return;
        // 将所有未确认玩家标记为已确认（强制通过）
        console.warn("[PVP] 提案确认超时:", proposeId, "未确认:", p.allPlayers.filter((pid: string) => !p.okplay[pid]))
        for (const pid of p.allPlayers) if (!p.okplay[pid]) p.okplay[pid] = true;
        this._sendFinal(p, true);
    }

    /**
     * 下发最终状态 - 清理超时定时器，广播 state_final 并移除提案
     * @param p 已完成的提案对象
     * @param forced true=确认超时强制补全 / false=全员确认正常完成
     */
    private _sendFinal(p: any, forced: boolean = false): void {
        if (p.timeoutId) { Timer.clear(p.timeoutId); p.timeoutId = null; }
        Msg.send(Proto.Kind.StateFinal, { proposeId: p.proposeId, status: p.status, okplay: p.okplay });
        this._proposals.delete(p.proposeId);
        console.log(forced
            ? `[PVP] 提案 ${p.proposeId} 确认超时, 强制通过下发最终状态`
            : `[PVP] 提案 ${p.proposeId} 全员确认, 下发最终状态`);
    }

    /**
     * 处理状态提案（非权威端） - 收到权威端提案后应用状态并回复确认
     * 权威身份与"同一提案只处理一次"由 msg 层按 registry 判定
     * @param data 提案消息体（含 proposeId、status）
     * @param senderId 提案发起方（权威端）ID
     */
    private _onStatePropose(data: any, senderId: string): void {
        const { proposeId, status } = data;
        // 应用状态（带位置/时间补偿）
        this._applyStateWithCompensation(status);
        this._cacheStatus(this._safeParseJson(status, this._cachedGlobalStatus));
        this._persistRecoveryCache();
        // 回复确认
        Msg.send(Proto.Kind.StateConfirm, { proposeId });
    }

    /**
     * 处理状态确认（权威端） - 收到某端确认后标记，全员确认则下发最终状态
     * @param data 确认消息体（含 proposeId）
     * @param senderId 确认方 ID
     */
    private _onStateConfirm(data: any, senderId: string): void {
        const p = this._proposals.get(data.proposeId);
        if (!p) return;
        p.okplay[senderId] = true;
        // 全员确认则下发最终状态
        if (p.allPlayers.every((id: string) => p.okplay[id])) this._sendFinal(p);
    }

    /**
     * 处理最终状态（非权威端） - 应用权威端下发的最终状态
     * @param data 最终状态消息体（含 proposeId、status）
     */
    private _onStateFinal(data: any, senderId: string): void {
        this._applyStateWithCompensation(data.status);
        this._cacheStatus(this._safeParseJson(data.status, this._cachedGlobalStatus));
        this._persistRecoveryCache();
    }

    // ---------- 状态序列化 ----------

    /**
     * 构建比赛状态快照 - 收集所有需同步的比赛状态字段
     * @returns 状态对象，包含阶段、比分、发球方、当前击球方、局数、球权、发球/接发球方、倒计时与发球起始时间、时间戳
     */
    private _buildStatus(): any {
        return {
            phase: this.phase,
            scores: { left: this.scores[TeamSide.LEFT], right: this.scores[TeamSide.RIGHT] },
            servingTeam: this.servingTeam,
            currentHitTeam: this.currentHitTeam,
            gamesWon: { left: this.gamesWon[TeamSide.LEFT], right: this.gamesWon[TeamSide.RIGHT] },
            gameEnded: this.gameEnded,
            matchEnded: this.matchEnded,
            lastScoreReason: this.lastScoreReason,
            lastHitChaId: this.lastHitCha?.id ?? -1,
            isBallAssigned: this.isBallAssigned,
            // isBallAssigned 只代表本回合是否已分球；ballHolderChaId 才是明确的持球角色。
            // 进入回合后可能 isBallAssigned=true 但无人持球，因此使用 -1 表示当前没有持球者。
            ballHolderChaId: this.isBallAssigned ? (this.players.find(p => p.isP)?.id ?? -1) : -1,
            isServeShot: this.isServeShot,
            serverId: this.currentServer?.id ?? -1,
            receiverId: this.currentReceiver?.id ?? -1,
            // 只发相对剩余毫秒: 两端设备钟差未知, 绝对起点(countdownStartTime/serveStartTime)
            // 既无消费者也无法对齐, 时钟重基一律由 rule.syncClock 在本端时基上完成。
            // 分开同步倒计时与发球计时剩余值；相对时间避免客户端系统时钟差导致计时漂移。
            cdRemainMs: (this.phase === MatchPhase.COUNTDOWN || this.phase === (MatchPhase as any).EAGLE_CONFIRM || this.phase === (MatchPhase as any).EAGLE_CHALLENGE) ? this.rule.remainMs() : -1,
            serveRemainMs: this.phase === MatchPhase.SERVING ? this.rule.remainMs() : -1,
            // 鹰眼挑战窗口开合(同步给非权威端: 双击进鹰眼提示)
            eagleWin: this.rule.eagleWinOpen,
            time: Timer.now(),
        };
    }

    /**
     * 应用比赛状态（字符串形式） - 解析后调用带补偿的应用方法
     * @param stateStr JSON 格式的状态字符串
     */
    public applyState(stateStr: string): void {
        try { this._applyStateWithCompensation(JSON.parse(stateStr)); } catch (e) { }
    }

    /**
     * 带补偿地应用比赛状态 - 直接覆盖本地状态（非权威端唯一状态源）
     * - 比分/阶段/球权等直接覆盖（以权威端为准; 非权威端 rule.update 已禁本地推进）
     * - 发球/准备/鹰眼计时: 权威端给的剩余毫秒是唯一口径, 交给 rule.syncClock 重设计时线
     *   并播 HUD 秒数——绝对时间戳在双端设备时钟有差时倒计时必错乱(旧版 timeTolerance
     *   校正比较同为钟差无意义, 已删)
     * - 鹰眼窗口: eagleWin 开合同步到本地 rule(非权威端双击进鹰眼的提示由此而来)
     * @param ageMs 本包"距今多久": 只用于接管时重放缓存状态(上一权威的剩余要按静默时长扣掉),
     *              常规收到的状态传 0(网络延时远小于秒级显示粒度)
     */
    private _applyStateWithCompensation(st: any, ageMs: number = 0): void {
        // 不完整/损坏的状态包不得部分覆盖本地状态。
        if (!st || typeof st.phase !== 'number' || !st.scores || !st.gamesWon) return;
        const prevPhase = this.phase;
        this.phase = st.phase;
        this.scores[TeamSide.LEFT] = st.scores.left;
        this.scores[TeamSide.RIGHT] = st.scores.right;
        this.servingTeam = st.servingTeam;
        this.currentHitTeam = st.currentHitTeam;
        this.gamesWon[TeamSide.LEFT] = st.gamesWon.left;
        this.gamesWon[TeamSide.RIGHT] = st.gamesWon.right;
        if (typeof st.gameEnded === 'boolean') this.gameEnded = st.gameEnded;
        if (typeof st.matchEnded === 'boolean') this.matchEnded = st.matchEnded;
        if (typeof st.lastScoreReason === 'string') this.lastScoreReason = st.lastScoreReason;
        if (typeof st.isBallAssigned === 'boolean') this.isBallAssigned = st.isBallAssigned;
        this.isServeShot = st.isServeShot;

        // 权威状态显式指定持球角色，不能依赖普通角色帧的 isP：普通帧会跳过本地控制角色，
        // 导致本机持球标记无法被权威端纠正。新协议中 -1 表示当前无人持球。
        let holderNow = -1;
        if (typeof st.ballHolderChaId === 'number') {
            holderNow = this.isBallAssigned ? st.ballHolderChaId : -1;
            // holderId 只是"球此刻钉在谁手上"的附件口径(两端各自按本机角色位置钉, 本来就一致);
            // 绝不能拿 Ball.isP 当依据——那个字段只有早已废弃的 Ball.ball() 会写。
            this.authBallHolderId = holderNow;
            for (const p of this.players) p.isP = holderNow >= 0 && p.id === holderNow;
        }

        // 这里【不】动本端的物理开关: 球什么时候落地由本端物理自己判(同一内核同一参数, 判定点必然
        // 一致), 钉回手上由 mag._updateBallHolding 在"已落地/已分配球权"时做。
        // 之前这里按 holderId 直接把 isCalc 关掉, 结果权威端一句过期的"球在我手上"就把对端的球
        // 冻在半空 1.6s 不动(实测连续 4 个样本本端 y=0.93 悬着、对端已经落到 z=-7.24)。

        // 通过 ID 反查角色实例，恢复发球/接发球方与最近击球角色；-1 也必须清空旧引用。
        this.currentServer = typeof st.serverId === 'number' && st.serverId >= 0
            ? (this.players.find(p => p.id === st.serverId) ?? null) : null;
        this.currentReceiver = typeof st.receiverId === 'number' && st.receiverId >= 0
            ? (this.players.find(p => p.id === st.receiverId) ?? null) : null;
        this.lastHitCha = typeof st.lastHitChaId === 'number' && st.lastHitChaId >= 0
            ? (this.players.find(p => p.id === st.lastHitChaId) ?? null) : null;

        // 时钟重基: 剩余毫秒按阶段取(servicing 走 serveRemainMs, 准备/鹰眼走 cdRemainMs)。
        // 旧版这里只写 serveStartTime/countdownStartTime 并自己调 onCountdown: 那两个字段没有任何
        // 消费者, 真正的计时线是 rule 的 'serve'/'countdown' 键, 本端不跑 rule.update() 就从不
        // Timer.start 它——一旦升格权威, 第一帧撞上 Timer.invoke 的自起副作用(返回 -1 → 剩余算成
        // 满额 10s), HUD 冻在"请发球10"而上一权威早已演完"发球超时", 两端状态机从此不同步。
        const remainMs = this.phase === MatchPhase.SERVING ? st.serveRemainMs : st.cdRemainMs;
        if (typeof remainMs === 'number' && remainMs >= 0) this.rule.syncClock(remainMs - ageMs);

        // 触发比分变更回调，刷新 UI
        this.onScoreChanged?.(this.scores[TeamSide.LEFT], this.scores[TeamSide.RIGHT]);

        // 鹰眼挑战窗口同步(权威端开/关 → 本地 rule 开/关, 非权威端双击提示由此驱动;
        // 回放进行中不重开提示——本地双击进回放时权威端窗口可能还开着)
        if (typeof st.eagleWin === 'boolean') {
            if (st.eagleWin && !this.rule.eagleWinOpen && !this.eaglePlaying) this.rule.openEagleWindowSync();
            else if (!st.eagleWin && this.rule.eagleWinOpen) this.rule.closeEagleWindow();
        }

        // 阶段本身就是同步入口: 权威端已经进到鹰眼挑战而本机还在别的阶段(确认消息丢了/晚了),
        // 也要立刻跟进回放 —— 用户要的"任何状态下只要同步到, 另一端当即就进那个状态",
        // 不能被"有没有收到那一条 eagle 消息"卡住。
        if (st.phase === (MatchPhase as any).EAGLE_CHALLENGE
            && prevPhase !== (MatchPhase as any).EAGLE_CHALLENGE && !this.eaglePlaying) {
            console.warn(`[PVP] 权威端已进入鹰眼挑战(本机阶段 ${prevPhase}→${st.phase}), 按状态同进`);
            (this as any).onEagleRemoteConfirm?.();
        }
    }

    // ---------- 帧序列化 ----------

    /**
     * 序列化帧 - 收集所有角色位置/状态与球位置，供权威端广播瞬时画面
     * 数据量大时(超 FRAME_CHUNK_MAX)切分成多帧: ball 单独一帧 + players 分批,
     * 接收端逐帧 applyFrame 增量合并, 确保完整同步不丢部分(用户规格)
     * @returns JSON 字符串(小帧)或字符串数组(切分帧)
     */
    /** 帧切分阈值(字节): 单帧超过此值则切分, 确保完整同步不丢部分 */
    private static readonly FRAME_CHUNK_MAX = 4096;

    public serializeFrame(): string | string[] {
        if (!this._localCha) return "{}";
        // 只同步根节点有效且坐标有限的角色。无效坐标不能序列化为 JSON null，
        // 否则接收端做减法得到 NaN，或者把 null 写回 transform 后角色被送到原点/视野外。
        const players: any[] = [];
        for (const p of this.players) {
            try {
                if (!(p as any)?.root) continue;
                const x = Number(p.x), y = Number(p.y), z = Number(p.z);
                if (![x, y, z].every(Number.isFinite)) {
                    console.warn(`[PVP Sync] 跳过无效角色坐标 role=${p.id}`, { x, y, z });
                    continue;
                }
                const anim = typeof (p as any).getAnimationSyncState === "function"
                    ? (p as any).getAnimationSyncState() : undefined;
                const moveState: any = (p as any).moveState;
                players.push({
                    id: p.id, x, y, z,
                    isP: p.isP, state: p.state, isMoving: !!(p as any).isMoving,
                    moveState: moveState && typeof moveState === "object"
                        && Number.isFinite(Number(moveState.ang)) && Number.isFinite(Number(moveState.power))
                        ? { ang: Number(moveState.ang), power: Number(moveState.power) } : null,
                    anim
                });
            } catch (e) {
                console.warn(`[PVP Sync] 序列化角色失败，跳过 role=${(p as any)?.id}`, e);
            }
        }
        // 权威帧【不再】携带球快照: 球是绝对时间驱动的确定性模拟, 只要 (参数 + 进入时刻 + 入口状态)
        // 这一条同步到位, 之后两端各自 simTo(现在) 的结果必然一致; 连续发弹道位置是错的方向——
        // 它把"两端本该一致的东西"变成"每帧被权威拽一次", 于是永远在纠偏、永远留残差。
        // 球的一致性改由两处保证: 击球事件(可靠通道) + recovery(迟入/接管/链断时给一次锚点)。
        const json = JSON.stringify({ players });
        if (json.length <= PVP.FRAME_CHUNK_MAX) {
            return json;
        }
        // 切分：players 分批(接收端按分片各自解析, 互不打断)
        const chunks: string[] = [];
        const batch: any[] = [];
        let batchLen = 2; // "[]"
        for (const p of players) {
            const s = JSON.stringify(p);
            if (batchLen + s.length + 1 > PVP.FRAME_CHUNK_MAX && batch.length) {
                chunks.push(JSON.stringify({ players: batch }));
                batch.length = 0; batchLen = 2;
            }
            batch.push(p); batchLen += s.length + 1;
        }
        if (batch.length) chunks.push(JSON.stringify({ players: batch }));
        return chunks;
    }

    /**
     * 非权威端本地角色位置帧载荷（id/x/y/z/isP/state/moveState/anim）。
     * 身份、时刻、任期由 msg 层的信封给出，这里只描述"我这边的画面"。
     */
    public serializeNonAuthFrame(): any {
        if (!this._localCha || this._destroyed) return null;
        const cha = this._localCha;
        // 暂无有效角色节点/坐标时不发送 (0,0,0) 假坐标；接收端会忽略没有 cha 的帧。
        if (!(cha as any).root) return { cha: null };
        const x = Number(cha.x), y = Number(cha.y), z = Number(cha.z);
        if (![x, y, z].every(Number.isFinite)) {
            console.warn(`[PVP Sync] 本地角色坐标无效，暂不广播 player=${this._gobeId}`, { x, y, z });
            return { cha: null };
        }
        return {
            cha: {
                id: cha.id, x, y, z,
                isP: cha.isP, state: cha.state, isMoving: !!(cha as any).isMoving,
                moveState: (cha as any).moveState && typeof (cha as any).moveState === "object"
                    ? { ang: Number((cha as any).moveState.ang), power: Number((cha as any).moveState.power) } : null,
                anim: typeof (cha as any).getAnimationSyncState === "function"
                    ? (cha as any).getAnimationSyncState() : undefined
            }
        };
    }

    /**
     * 应用帧 - 将权威端广播的瞬时画面应用到本地，带位置补偿
     * 补偿策略：
     *   - 角色位置：偏差超 positionTolerance 则瞬移校正；中等偏差则按 compensationRate 插值平滑
     *   - 角色状态：远端 IDLE 而本地为 MOVE/HIT_WINDUP 时执行 move 空参进入 IDLE
     *   - 球位置：仅在球非本地计算且本地角色非击球方时校正，避免覆盖本地击球结果
     * @param frameStr JSON 格式的帧字符串
     */
    public applyFrame(frameStr: string | string[]): void {
        // 切分帧(用户规格): 数组形态逐帧增量合并, 确保完整同步不丢部分
        const arr = Array.isArray(frameStr) ? frameStr : [frameStr];
        for (const f of arr) this._applyOneFrame(f);
    }

    private _applyOneFrame(frameStr: string): void {
        try {
            const frame = JSON.parse(frameStr);
            if (!frame.players) return;
            // 位置容差平方，避免开方
            const tolSq = this.pvpCfg.positionTolerance * this.pvpCfg.positionTolerance;
            const rate = this.pvpCfg.compensationRate;
            if (frame.players) {
                for (const fp of frame.players) {
                    const target = this.players.find(p => Number(p.id) === Number(fp.id));
                    // 跳过本地角色（本地角色由本地输入驱动，不覆盖）。拒绝 null/NaN/Infinity 坐标，
                    // 防止一帧坏数据把远端角色瞬移到原点或污染 transform。
                    if (!target || target === this._localCha || !(target as any).root) continue;
                    if (![fp.x, fp.y, fp.z].every((v: any) => typeof v === "number" && Number.isFinite(v))) continue;
                    const dx = fp.x - target.x, dy = fp.y - target.y, dz = fp.z - target.z;
                    const distSq = dx * dx + dy * dy + dz * dz;
                    if (distSq > tolSq) {
                        // 偏差过大：瞬移校正
                        target.x = fp.x; target.y = fp.y; target.z = fp.z;
                    } else if (distSq > 0.01) {
                        // 中等偏差：按比例插值平滑（仅 x/z，y 由地面决定）
                        target.x += dx * rate;
                        target.z += dz * rate;
                    }
                    if (typeof fp.isP === "boolean") target.isP = fp.isP;
                    // 权威帧同步远端动作/移动状态；只同步远端角色，不覆盖本地输入角色。
                    if (fp.state === ChaState.IDLE && (target.state === ChaState.MOVE || target.state === ChaState.HIT_WINDUP)) {
                        target.move(-1, -1);
                    } else if (fp.state === ChaState.MOVE && fp.moveState
                        && Number.isFinite(fp.moveState.ang) && Number.isFinite(fp.moveState.power)) {
                        target.move(fp.moveState.ang, fp.moveState.power);
                    }
                    if (fp.anim && typeof (target as any).applyAnimationSync === "function") {
                        (target as any).applyAnimationSync(fp.anim);
                    }
                }
            }

        } catch (e) { }
    }

    /**
     * 应用非权威端帧 - 根据帧中 playerId 找到对应角色，应用位置与状态
     * 应用策略：
     *   - 按 playerId 在 _playerChaMap 中查找角色（找不到或为本地角色则跳过）
     *   - 位置补偿：与 applyFrame 同策略（超容差瞬移，中等偏差插值平滑）
     *   - 状态同步：远程 IDLE 而本地为 MOVE/HIT_WINDUP 时执行 move 空参进入 IDLE
     *   - 帧中 authId 为发送方认定的权威端，可用于辅助检测一致性
     * @param parsed 非权威端帧对象（含 nonAuthFrame/playerId/authId/time/cha）
     * @param senderId 帧发送方 GOBE ID
     */
    /**
     * 状态同步反馈(用户规格核心): 校验权威帧中自己角色的状态与位置——
     * - 状态不符(本地已停 MOVE→IDLE 而帧中仍 MOVE/或反向) → 重发 move 停止消息 + 当前位置
     * - 位置偏差超容差 → 重发 move + 当前位置(房主 _applyAction 的 pos 校准)
     * 节流 400ms 防风暴(权威帧 100ms 一轮, 连续多轮不符才补一次)。
     */
    private _lastSelfVerifyAt = 0;
    private _lastAnimStateRequestAt = 0;
    private _lastAnimStateRequestId = -1;

    private _verifySelfInAuthFrame(frameStr: any): void {
        if (!this._localCha || this._amAuth || this._destroyed) return;
        const chunks: any[] = Array.isArray(frameStr) ? frameStr : [frameStr];
        let authSelf: any = null;
        for (const chunk of chunks) {
            let frame: any = chunk;
            if (typeof chunk === "string") {
                try { frame = JSON.parse(chunk); } catch (e) { continue; }
            }
            if (!frame || !Array.isArray(frame.players)) continue;
            const found = frame.players.find((fp: any) => Number(fp.id) === Number(this._localCha!.id));
            if (found) { authSelf = found; break; }
        }
        if (!authSelf) return;

        const local = this._captureCharacter(this._localCha);
        const dx = Number(authSelf.x || 0) - local.x;
        const dz = Number(authSelf.z || 0) - local.z;
        const distanceSq = dx * dx + dz * dz;
        const moving = !!(this._localCha as any).isMoving;
        // 移动中的正常网络延迟会产生短暂位置差；只在大偏差时报告，避免把延迟误判成状态错误。
        const positionLimit = moving ? this.pvpCfg.positionTolerance * 3 : this.pvpCfg.positionTolerance;
        const positionMismatch = distanceSq > positionLimit * positionLimit;
        const stateMismatch = Number(authSelf.state) !== Number(local.state);
        const possessionMismatch = typeof authSelf.isP === "boolean" && authSelf.isP !== local.isP;
        const authAnim = authSelf.anim;
        const localAnim = local.anim;
        const authAnimId = Number(authAnim?.id);
        const localAnimId = Number(localAnim?.id);
        const animationMismatch = Number.isInteger(authAnimId) && Number.isInteger(localAnimId)
            && authAnimId >= 0 && localAnimId >= 0 && authAnimId !== localAnimId;

        const now = Timer.now();
        // 动画只同步开始/切换状态，不同步播放进度；状态不一致时只向权威端请求状态 ID。
        if (animationMismatch && (now - this._lastAnimStateRequestAt >= 300 || this._lastAnimStateRequestId !== localAnimId)) {
            this._lastAnimStateRequestAt = now;
            this._lastAnimStateRequestId = localAnimId;
            // 身份与任期由 msg 层信封给出(from/authTerm), 载荷只描述"要哪个动画状态"
            Msg.send(Proto.Kind.AnimStateRequest, {
                characterId: local.id,
                animId: localAnimId,
                requestAt: now
            });
        }

        // 位置/游戏逻辑状态仍走原有纠正通道，但动画不再混入整包状态报告。
        if (!positionMismatch && !stateMismatch && !possessionMismatch) return;
        if (now - this._lastStateReportAt < 500) return;
        this._lastStateReportAt = now;
        const stateReport = { ...local };
        delete stateReport.anim;
        console.warn(`[PVP] 本地角色与权威快照不一致，回报本地状态给权威端 state=${local.state}/${authSelf.state}, 偏差=${Math.sqrt(distanceSq).toFixed(2)}m`);
        Msg.send(Proto.Kind.PlayerStateReport, {
            characterId: local.id,
            snapshot: stateReport,
            reportAt: now
        });
    }

    private _applyNonAuthFrame(parsed: any, senderId: string): void {
        // 所有客户端缓存每名玩家的角色信息；权威端失联时，新权威端可从本地缓存恢复。
        this._recordPlayerSnapshot(senderId, parsed.cha);
        this._persistRecoveryCache();
        // 发送者身份由 msg 层与 GOBE 实收发件人核对过, 这里直接按它找角色
        let target = this._playerChaMap.get(senderId);
        if (!target) {
            for (const [k, v] of this._playerChaMap) {
                if (this._pidEq(k, senderId)) { target = v; break; }
            }
        }
        // 找不到对应角色或即本地角色则跳过（本地角色由本地输入驱动，不覆盖）
        if (!target || target === this._localCha || !target.root) return;

        const c = parsed.cha;
        if (!c || ![c.x, c.y, c.z].every((v: any) => typeof v === "number" && Number.isFinite(v))) return;

        // 位置补偿：偏差超容差瞬移，中等偏差插值平滑
        const tolSq = this.pvpCfg.positionTolerance * this.pvpCfg.positionTolerance;
        const rate = this.pvpCfg.compensationRate;
        const dx = c.x - target.x, dy = c.y - target.y, dz = c.z - target.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq > tolSq) {
            // 偏差过大：瞬移校正
            target.x = c.x; target.y = c.y; target.z = c.z;
        } else if (distSq > 0.01) {
            // 中等偏差：按比例插值平滑（仅 x/z，y 由地面决定）
            target.x += dx * rate;
            target.z += dz * rate;
        }
        // 非权威帧是权威端接收远端玩家状态的兜底路径：同步移动起停、持球和动画。
        // 不依赖点对点 action 一定先于帧到达，避免权威端一直把远端玩家留在 idle。
        if (c.state === ChaState.IDLE && (target.state === ChaState.MOVE || target.state === ChaState.HIT_WINDUP)) {
            target.move(-1, -1);
        } else if (c.state === ChaState.MOVE && c.moveState
            && Number.isFinite(c.moveState.ang) && Number.isFinite(c.moveState.power)) {
            target.move(c.moveState.ang, c.moveState.power);
        }
        if (typeof c.isP === "boolean") target.isP = c.isP;
        // 非权威帧不直接改写动画；玩家发现与权威状态 ID 不一致时发送 anim_state_request，
        // 由权威端验证后通过 anim_state_broadcast 统一下发。
    }

    // ---------- 清理 ----------

    /**
     * 销毁 - 停止帧同步线程，清理所有提案定时器与提案/确认集合
     * 在比赛结束或离开房间时调用，防止定时器泄漏
     */
    public destroy(): void {
        // 销毁标志先行: 挂在途的网络回调立即失效(幂等可重入)
        this._destroyed = true;
        if (PVP._live === this) PVP._live = null;
        this._amAuth = false;
        this.isAuthoritative = false;
        this._stopAuthFrameSync();
        if (this._authFlushTid != null) { Timer.clear(this._authFlushTid); this._authFlushTid = null; }
        if (this._setupRetryTid != null) { Timer.clear(this._setupRetryTid); this._setupRetryTid = null; }
        // 摘除 GNet 回调(精确引用): 旧版不清 = 残留实例继续吃消息/帧,
        // 第二局双实例并存互抢(收不到消息/提案强制通过) + 旧心跳 serializeFrame 崩
        if (this._clientCb) { Gnet.off('client', this._clientCb); this._clientCb = null; }
        if (this._frameCb) { Gnet.offFrame(this._frameCb); this._frameCb = null; }
        if (this._leaveCb) { Gnet.off("leave", this._leaveCb); this._leaveCb = null; }
        if (this._dismissCb) { Gnet.off("dismiss", this._dismissCb); this._dismissCb = null; }
        // 清理待落地结算定时器
        this.rule.cancelPendingSettle();
        // 清理所有提案的超时定时器
        for (const [_, p] of this._proposals) if (p.timeoutId) Timer.clear(p.timeoutId);
        this._proposals.clear();
        // 击球事件/提案的去重表在 msg 层按发送方各自维护(跨实例), 这里只清本实例的待发队列
        this._pendingHitEvents.length = 0;
        this._playerChaMap.clear();
        super.destroy();
    }
}