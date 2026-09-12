/**
 * PVP - 联机模式比赛管理器，继承 Mag
 * 只负责网络同步（权威端选举、心跳保活、状态同步、操作广播），规则判定委托给 Rule
 * 权威端通过帧同步广播游戏状态，非权威端接收并应用；权威端失联时自动选举新权威端
 */
import { Timer } from "../../libs/time";
import { MatchPhase, TeamSide } from "./mag";
import { Mag } from "./mag";
import { Cha , ChaState} from "../obj/cha";
import { Gnet } from "../../libs/GNet";
import { Ball } from "../obj/ball";
import { State } from "../engine/phyCfg";
import { PlayerInfo } from "../../libs/GOBE";

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
    /** GOBE 玩家 ID → 角色实例的映射 */
    private _playerChaMap: Map<string, Cha> = new Map();
    /** 房间内所有玩家 ID 列表 */
    private _allPlayerIds: PlayerInfo[] = [];
    /** 当前权威端 ID */
    private _currentAuthId: string | null = null;
    /** 本地是否为权威端 */
    private _amAuth: boolean = false;
    /** 上次收到权威端心跳的时间戳 */
    private _lastHeartbeat: number = 0;
    /** 待确认的状态提案映射 */
    private _proposals: Map<string, any> = new Map();
    /** 已确认的状态提案 ID 集合 */
    private _confirmed: Set<string> = new Set();
    /** 状态提案计数器，用于生成唯一提案 ID */
    private _proposeCounter: number = 0;
    /** 统一帧同步线程：权威端发送 state+authId+frame；非权威端发送本地角色位置帧并检测权威端超时 */
    private sup: any = null;
    /** PVP 配置参数 */

    private pvpCfg: PVP_Config = {
        heartbeatInterval: 100,
        authorityTimeout: 500,
        stateConfirmTimeout: 500,
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
    constructor(p1: Laya.Sprite3D, ball: Ball, isSingle: boolean = false) {
        super(p1, ball, isSingle);
        // 覆盖基类状态变更回调：仅当本地为权威端时才发起状态提案同步
        this.onStateChange = () => {
            if (this._amAuth) this._proposeStateChange();
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

        // 读取房间协商阶段写入的角色分配表（playerId → roleId 索引）
        const assignments: { playerId: string, roleId: number }[] = (window as any).gamePlayerAssignments || null;
        if (assignments && assignments.length > 0) {
            for (const a of assignments) {
                // 仅处理合法索引，防止越界
                if (a.roleId >= 0 && a.roleId < allCha.length) {
                    const cha = allCha[a.roleId];
                    playerChaMap.set(a.playerId, cha);
                    // 命中本地玩家 ID 时记录其控制的角色
                    if (a.playerId === localGobeId) localCha = cha;
                }
            }
            console.log(`[PVP] 角色分配: ${JSON.stringify(assignments)}`);
        } else {
            // 无协商分配时回退到默认：本地玩家控制 0 号角色
            console.log("[PVP] 无协商分配，使用默认本地角色");
            localCha = allCha[0];
        }

        // 兜底：若协商表中未命中本地玩家，仍强制取 0 号角色
        if (!localCha) localCha = allCha[0];
        console.log(`[PVP] 本地玩家 ${localGobeId} 控制角色 ${localCha.id}`);

        this.bindNetwork(localGobeId, localCha, playerChaMap);

        // 启动 GOBE 帧同步通道，权威端将在此通道上广播帧
        if(Gnet.getRoomOwnerId == Gnet.getRoomPlayerId)
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
        this._gobeId = gobeId;
        this._localCha = localCha;
        this._playerChaMap = playerChaMap;

        // 拉取房间所有玩家 ID 列表
        this._allPlayerIds =  Gnet.getPlayers();
        if (this._allPlayerIds.length === 0) {
            console.warn("[PVP] 房间玩家列表为空");
            return;
        }

        // 初始权威端约定为玩家列表首位（房间内所有玩家计算结果一致）
        this._currentAuthId = this._allPlayerIds[0].playerId;
        this._amAuth = (this._gobeId === this._currentAuthId);
        this.isAuthoritative = this._amAuth;
        this._lastHeartbeat = Timer.now();

        // 注册点对点消息回调：解析 JSON 后分发到 _onRecvMsg
        Gnet.off('client');
        Gnet.onClient((info: any) => {
            try {
                const data = JSON.parse(info.msg);
                this._onRecvMsg(data, info.sendPlayerId);
            } catch (e) { }
        });

        // 注册帧同步回调：权威端广播的帧在此处理
        Gnet.onFrame((msg: any) => this._onFrame(msg));

        // 启动统一帧同步线程：权威端发送状态帧，非权威端发送本地角色位置帧并检测权威端超时
        this._startAuthFrameSync();

        console.log(`[PVP] 我是权威端: ${this._amAuth} (${this._gobeId}), 当前权威端: ${this._currentAuthId}`, this._allPlayerIds);
    }

    // ---------- 操作同步 ----------

    /**
     * 同步玩家操作 - 将本地操作广播给房间内其他玩家
     * 对击球操作做特殊处理：当无 params（普通击球）时附带球位置，
     * 便于接收端校正球位置后再应用击球，避免位置漂移导致击空
     * @param opt 操作描述对象，需包含 type 字段（'hit' | 'move' 等）
     */
    public syncAction(opt: any): void {
        if (!this._gobeId) return;
        const msg: any = { kind: 'action', playerId: this._gobeId, time:Timer.now(), ...opt };
        // 击球且无 params 时附带当前球位置，接收端据此校正球位置
        if (opt.type === 'hit' && !opt.params ) {
            console.log("空参击球")
            const phy = (this.ball as any).phy;
            if (phy) msg.ballPos = { x: phy.state.pos.x, y: phy.state.pos.y, z: phy.state.pos.z };
            console.log(msg)
        }
        this._sendMsg(msg);
    }

    /**
     * 发送点对点消息 - 将数据 JSON 序列化后通过 Gnet 广播
     * @param data 待发送的原始对象
     */
    private _sendMsg(data: any): void {
        Gnet.sendToClient(1, JSON.stringify(data));
    }

    /**
     * 接收消息分发 - 根据消息 kind 路由到对应处理器
     * 忽略自己发送的消息，避免回环
     * @param data 已解析的消息对象
     * @param senderId 发送方 GOBE ID
     */
    private _onRecvMsg(data: any, senderId: string): void {
        if (senderId === this._gobeId) return;
        switch (data.kind) {
            case 'action': this._applyAction(data, senderId); break;
            case 'state_propose': this._onStatePropose(data, senderId); break;
            case 'state_confirm': this._onStateConfirm(data, senderId); break;
            case 'state_final': this._onStateFinal(data, senderId); break;
            case 'auth_declare': this._onAuthDeclare(data, senderId); break;
        }
    }

    /**
     * 应用远端玩家操作 - 在对应角色上重放 hit / move
     * @param data 操作消息体
     * @param senderId 发送方 GOBE ID，用于查找其控制的角色
     */
    private _applyAction(data: any, senderId: string): void {
        const cha = this._playerChaMap.get(senderId);
        if (!cha) return;
        switch (data.type) {
            case 'hit':
                if (data.params) {
                    // 带参数击球：直接透传 params（如方向、力度等）
                    this.hit(data.params, cha);
                } else {
                    // 无参数击球：先用附带球位置校正球，再执行击球,反作弊校验：data.time
                    if (data.ballPos) {
                        console.log("无参auu击球", data.ballPos)
                            this.ball.pos = new Laya.Vector3(data.ballPos.x, data.ballPos.y, data.ballPos.z);
                    }
                    this.hit(undefined, cha);
                }
                break;
            case 'move':
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
    private _startAuthFrameSync(): void {
        if (this.sup) return;
        this.sup = Timer.setInterval(this.pvpCfg.heartbeatInterval, () => {
            if (this._amAuth) {
                // 权威端：发送全角色帧 + 比赛状态 + 权威端 ID
                const frame = this.serializeFrame();
                Gnet.sendFrame(JSON.stringify({ frame, state: JSON.stringify(this._buildStatus()),
                     authId: this._gobeId }));
            } else {
                // 非权威端：发送本地角色位置帧（含房间id/state/time/认定的权威端）
                Gnet.sendFrame(this.serializeNonAuthFrame());
                // 在线程中检测权威端心跳超时，超时则推进选举
                if (Timer.now() - this._lastHeartbeat > this.pvpCfg.authorityTimeout) {
                    this._advanceAuthority();
                }
            }
        });
        console.log(`[PVP] 帧同步线程已启动 (${this._gobeId}, 权威端=${this._amAuth})`);
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
        // 兼容单帧与帧数组两种形态
        const frameMsgs = Array.isArray(msg) ? msg : [msg];
        for (const fm of frameMsgs) {
            if (!fm.frameInfo) continue;
            for (const fi of fm.frameInfo) {
                // 跳过自己发送的帧，避免回环
                if (fi.playerId === this._gobeId) continue;
                for (const data of fi.data) {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.nonAuthFrame) {
                            // 非权威端帧：根据 playerId 应用对应角色位置/状态
                            this._applyNonAuthFrame(parsed, fi.playerId);
                        } else if (parsed.authId) {
                            // 权威端帧：先检测权威端存活，再应用状态与帧
                            this._detectAuthority(parsed.authId, fi.playerId);
                            if (parsed.state) this.applyState(parsed.state);
                            if (parsed.frame) this.applyFrame(parsed.frame);
                        } else if (parsed.authCandidate) {
                            // 权威端候选帧：参与新权威端选举
                            this._onAuthCandidate(parsed.authCandidate, fi.playerId);
                        } else {
                            // 普通帧：直接应用
                            this.applyFrame(data);
                        }
                    } catch (e) {
                        // JSON 解析失败时降级为普通帧处理
                        this.applyFrame(data);
                    }
                }
            }
        }
    }

    /**
     * 检测权威端心跳 - 收到权威端帧时刷新心跳时间戳
     * 若本地原为权威端但收到其他权威端帧，则降级为非权威端（避免双权威端）
     * @param frameAuthId 帧中声明的权威端 ID
     * @param senderId 实际发送该帧的玩家 ID
     */
    private _detectAuthority(frameAuthId: string, senderId: string): void {
        // 忽略自己声明的权威端帧
        if (frameAuthId === this._gobeId) return;
        // 仅当发送方即为声明的权威端时才认可（防止伪造）
        if (senderId !== frameAuthId) {
            console.log("权威端不匹配：", senderId, frameAuthId)
            return;
        }
        if (this._amAuth) {
            // 双权威端冲突：本地降级，让位给对方
            console.log(`[PVP] 检测到其他权威端 ${frameAuthId}，本地降级为非权威端${this._gobeId}`);
            this._amAuth = false;
            this.isAuthoritative = false;
            // 统一帧同步线程无需停启，切换 _amAuth 后自动走非权威端分支
        }

        // 刷新当前权威端与心跳时间戳
        this._currentAuthId = frameAuthId;
        this._lastHeartbeat = Timer.now();
    }

    /**
     * 处理权威端候选帧 - 参与新权威端选举
     * 两种情形：
     *   1. 候选为自己且当前非权威端且原权威端已超时：立即接管成为新权威端
     *   2. 候选为他人且原权威端已超时：跟随该候选，重置等待其心跳
     * @param candidateId 被推举的候选权威端 ID
     * @param senderId 推举发起方 ID
     */
    private _onAuthCandidate(candidateId: string, senderId: string): void {
        if (senderId === this._gobeId) return;

        if (candidateId === this._gobeId && !this._amAuth) {
            // 候选为自己：仅在原权威端确实超时后才接管，避免误判
            if (Timer.now() - this._lastHeartbeat > this.pvpCfg.authorityTimeout) {
                console.log(`[PVP] 收到 ${senderId} 推举自己为新权威端，立即接管`);
                this._currentAuthId = this._gobeId;
                this._amAuth = true;
                this.isAuthoritative = true;
                this._lastHeartbeat = Timer.now();
                // 统一帧同步线程无需停启，切换 _amAuth 后自动走权威端分支
                // 广播权威端声明，让其他端降级
                this._sendMsg({ kind: 'auth_declare', playerId: this._gobeId });
            }
        } else if (candidateId !== this._gobeId) {
            // 候选为他人：原权威端超时且候选变更时跟随，重置心跳等待新权威端心跳
            if (Timer.now() - this._lastHeartbeat > this.pvpCfg.authorityTimeout) {
                if (this._currentAuthId !== candidateId) {
                    console.log(`[PVP] 收到 ${senderId} 推举 ${candidateId}，跟随并重置等待`);
                    this._currentAuthId = candidateId;
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
        const idx = this._allPlayerIds.findIndex((p: any) => p.playerId === this._currentAuthId);
        let nextIdx: number;
        if (idx === -1) {
            // 当前权威端已不在列表（异常退出），从头开始
            nextIdx = 0;
        } else {
            nextIdx = (idx + 1) % this._allPlayerIds.length;
        }

        const nextAuthId = this._allPlayerIds[nextIdx].playerId;
        this._currentAuthId = nextAuthId;
        this._lastHeartbeat = Timer.now();

        console.log(`[PVP] 权威端失联 >${this.pvpCfg.authorityTimeout}ms，切换候选权威端为: ${nextAuthId}`);

        if (this._currentAuthId === this._gobeId) {
            // 候选为自己：立即接管，广播声明
            this._amAuth = true;
            this.isAuthoritative = true;
            // 统一帧同步线程无需停启，切换 _amAuth 后自动走权威端分支
            this._sendMsg({ kind: 'auth_declare', playerId: this._gobeId });
            console.log(`[PVP] 已成为权威端`);
        } else {
            // 候选为他人：发送候选帧，全房间共同认定新权威端
            Gnet.sendFrame(JSON.stringify({ authCandidate: nextAuthId }));
            console.log(`[PVP] 发送权威端变更同步帧，认定新权威端为: ${nextAuthId}`);
        }
    }

    /**
     * 处理权威端声明 - 收到新权威端的 auth_declare 消息
     * 若本地原为权威端则降级，并刷新当前权威端与心跳
     * @param data 消息体（含 playerId）
     * @param senderId 声明方 GOBE ID，即新权威端
     */
    private _onAuthDeclare(data: any, senderId: string): void {
        if (senderId === this._gobeId) return;
        if (this._amAuth) {
            // 双权威端冲突：本地降级
            console.log(`[PVP] 收到 ${senderId} 的权威端声明，本地降级为非权威端${this._gobeId}`);
            this._amAuth = false;
            this.isAuthoritative = false;
            // 统一帧同步线程无需停启，切换 _amAuth 后自动走非权威端分支
        }
        // 认定发送方为新权威端，刷新心跳
        this._currentAuthId = senderId;
        this._lastHeartbeat = Timer.now();
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
        this._sendMsg({ kind: 'state_propose', playerId: this._gobeId, proposeId, status });
        console.log("构建提案", { kind: 'state_propose', playerId: this._gobeId, proposeId, status })
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
        console.log("强制通过提案")
        for (const pid of p.allPlayers) if (!p.okplay[pid]) p.okplay[pid] = true;
        this._sendFinal(p);
    }

    /**
     * 下发最终状态 - 清理超时定时器，广播 state_final 并移除提案
     * @param p 已完成的提案对象
     */
    private _sendFinal(p: any): void {
        if (p.timeoutId) { Timer.clear(p.timeoutId); p.timeoutId = null; }
        this._sendMsg({ kind: 'state_final', playerId: this._gobeId, proposeId: p.proposeId, status: p.status, okplay: p.okplay });
        this._proposals.delete(p.proposeId);
        console.log(`[PVP] 提案 $ 已强制通过，下发最终状态`, { kind: 'state_final', playerId: this._gobeId, proposeId: p.proposeId, status: p.status, okplay: p.okplay });
    }

    /**
     * 处理状态提案（非权威端） - 收到权威端提案后应用状态并回复确认
     * 同一提案仅处理一次（_confirmed 去重）
     * @param data 提案消息体（含 proposeId、status）
     * @param senderId 提案发起方（权威端）ID
     */
    private _onStatePropose(data: any, senderId: string): void {
        const { proposeId, status } = data;
        // 同一提案仅处理一次
        if (this._confirmed.has(proposeId)) return;
        this._confirmed.add(proposeId);
        // 应用状态（带位置/时间补偿）
        this._applyStateWithCompensation(status);
        // 回复确认
        this._sendMsg({ kind: 'state_confirm', playerId: this._gobeId, proposeId });
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
     * 仅认可当前权威端的最终状态，且同一提案仅应用一次
     * @param data 最终状态消息体（含 proposeId、status）
     * @param senderId 发送方（权威端）ID
     */
    private _onStateFinal(data: any, senderId: string): void {
        // 仅认可当前权威端的最终状态
        if (senderId !== this._currentAuthId) return;
        const key = data.proposeId + '_final';
        // 同一最终状态仅应用一次
        if (this._confirmed.has(key)) return;
        this._confirmed.add(key);
        this._applyStateWithCompensation(data.status);
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
            isBallAssigned: this.isBallAssigned,
            isServeShot: this.isServeShot,
            serverId: this.currentServer?.id ?? -1,
            receiverId: this.currentReceiver?.id ?? -1,
            countdownStartTime: this.countdownStartTime,
            serveStartTime: this.serveStartTime,
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
     * 带补偿地应用比赛状态 - 直接覆盖本地状态，并对倒计时做时间偏差校正
     * 校正策略：
     *   - 比分/阶段/球权等直接覆盖（移除积分预测，以权威端为准）
     *   - 倒计时起点：当本地与远端已流逝时间偏差超过 timeTolerance 时才同步起点
     *   - 应用后触发 onScoreChanged 与 onCountdown 回调，刷新 UI
     * @param st 已解析的状态对象
     */
    private _applyStateWithCompensation(st: any): void {
        // ★ 移除积分预测：直接应用权威端状态，不再对比本地分数阻挡覆盖
        this.phase = st.phase;
        this.scores[TeamSide.LEFT] = st.scores.left;
        this.scores[TeamSide.RIGHT] = st.scores.right;
        this.servingTeam = st.servingTeam;
        this.currentHitTeam = st.currentHitTeam;
        this.gamesWon[TeamSide.LEFT] = st.gamesWon.left;
        this.gamesWon[TeamSide.RIGHT] = st.gamesWon.right;
        this.isBallAssigned = st.isBallAssigned;
        this.isServeShot = st.isServeShot;

        // 通过 ID 反查角色实例，恢复发球/接发球方
        if (st.serverId >= 0) this.currentServer = this.players.find(p => p.id === st.serverId) ?? null;
        if (st.receiverId >= 0) this.currentReceiver = this.players.find(p => p.id === st.receiverId) ?? null;
        // 倒计时起点校正：仅当本地与远端流逝时间偏差超阈值时才同步，避免微小抖动频繁重置
        if (st.countdownStartTime) {
            const localElapsed = this.countdownStartTime ? Timer.now() - this.countdownStartTime : 0;
            const remoteElapsed = Timer.now() - st.countdownStartTime;
            if (Math.abs(localElapsed - remoteElapsed) > this.pvpCfg.timeTolerance) {
                this.countdownStartTime = st.countdownStartTime;
            }
        }
        if (st.serveStartTime) this.serveStartTime = st.serveStartTime;

        // 触发比分变更回调，刷新 UI
        this.onScoreChanged?.(this.scores[TeamSide.LEFT], this.scores[TeamSide.RIGHT]);
        // 处于倒计时阶段时刷新倒计时显示
        if (this.phase === MatchPhase.COUNTDOWN && this.onCountdown) {
            const elapsed = Timer.now() - this.countdownStartTime;
            this.onCountdown(Math.max(0, Math.ceil((this.cfg.countdownDuration - elapsed) / 1000)));
        }
    }

    // ---------- 帧序列化 ----------

    /**
     * 序列化帧 - 收集所有角色位置/状态与球位置，供权威端广播瞬时画面
     * @returns JSON 字符串，包含 players（id/x/y/z/isP/state）与 ball（x/y/z）
     */
    public serializeFrame(): string {
        if (!this._localCha) return "{}";
        // 收集所有角色的位置、isP 标志与状态
        const players = this.players.map(p => ({ id: p.id, x: p.x, y: p.y, z: p.z, isP: p.isP, state: p.state }));
        // 球位置取自物理组件
        const phy = (this.ball as any).phy;
        const ballData = phy ? { x: phy.state.pos.x, y: phy.state.pos.y, z: phy.state.pos.z } : null;
        return JSON.stringify({ players, ball: ballData });
    }

    /**
     * 序列化非权威端帧 - 构建本地角色位置帧，供非权威端每200ms广播
     * 帧字段：
     *   - nonAuthFrame: 标记位，供接收端识别非权威端帧
     *   - playerId: 自身房间id，供接收端按 playerId 找到对应角色应用
     *   - authId: 自身认定的权威端，供交叉验证权威端一致性
     *   - time: 发送时间戳
     *   - cha: 本地角色快照（id/x/y/z/isP/state）
     * @returns JSON 字符串
     */
    public serializeNonAuthFrame(): string {
        if (!this._localCha) return "{}";
        const cha = this._localCha;
        return JSON.stringify({
            nonAuthFrame: true,
            playerId: this._gobeId,
            authId: this._currentAuthId,
            time: Timer.now(),
            cha: { id: cha.id, x: cha.x, y: cha.y, z: cha.z, isP: cha.isP, state: cha.state }
        });
    }

    /**
     * 应用帧 - 将权威端广播的瞬时画面应用到本地，带位置补偿
     * 补偿策略：
     *   - 角色位置：偏差超 positionTolerance 则瞬移校正；中等偏差则按 compensationRate 插值平滑
     *   - 角色状态：远端 IDLE 而本地为 MOVE/HIT_WINDUP 时执行 move 空参进入 IDLE
     *   - 球位置：仅在球非本地计算且本地角色非击球方时校正，避免覆盖本地击球结果
     * @param frameStr JSON 格式的帧字符串
     */
    public applyFrame(frameStr: string): void {
        try {
            const frame = JSON.parse(frameStr);
            if (!frame.players) return;
            // 位置容差平方，避免开方
            const tolSq = this.pvpCfg.positionTolerance * this.pvpCfg.positionTolerance;
            const rate = this.pvpCfg.compensationRate;
            for (const fp of frame.players) {
                const target = this.players.find(p => p.id === fp.id);
                // 跳过本地角色（本地角色由本地输入驱动，不覆盖）
                if (!target || target === this._localCha) continue;
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
                // 远端已 IDLE 而本地为 MOVE 或 HIT_WINDUP：执行 move 空参进入 IDLE
                if (fp.state == ChaState.IDLE && (target.state == ChaState.MOVE || target.state == ChaState.HIT_WINDUP)) {
                    target.move(-1, -1);
                }
                target.isP = fp.isP;
            }
            // 球位置校正：仅在球非本地计算且本地非击球方时，避免覆盖本地击球
            if (frame.ball) {
                const phy = (this.ball as any).phy;
                if (phy && !phy.isCalc && !(this._localCha && this._localCha.isP)) {
                    const bx = frame.ball.x - this.ball.x, by = frame.ball.y - this.ball.y, bz = frame.ball.z - this.ball.z;
                    // 球偏差超容差才瞬移校正
                    if (bx * bx + by * by + bz * bz > tolSq) this.ball.pos = new Laya.Vector3(frame.ball.x, frame.ball.y, frame.ball.z);
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
    private _applyNonAuthFrame(parsed: any, senderId: string): void {
        // 优先用帧内 playerId，回退到帧发送方 id
        const playerId = parsed.playerId || senderId;
        const target = this._playerChaMap.get(playerId);
        // 找不到对应角色或即本地角色则跳过（本地角色由本地输入驱动，不覆盖）
        if (!target || target === this._localCha) return;

        const c = parsed.cha;
        if (!c) return;

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
        // 远程 IDLE 而本地为 MOVE 或 HIT_WINDUP：执行 move 空参进入 IDLE
        if (c.state == ChaState.IDLE && (target.state == ChaState.MOVE || target.state == ChaState.HIT_WINDUP)) {
            target.move(-1, -1);
        }
        target.isP = c.isP;
    }

    // ---------- 清理 ----------

    /**
     * 销毁 - 停止帧同步线程，清理所有提案定时器与提案/确认集合
     * 在比赛结束或离开房间时调用，防止定时器泄漏
     */
    public destroy(): void {
        this._stopAuthFrameSync();
        // 清理所有提案的超时定时器
        for (const [_, p] of this._proposals) if (p.timeoutId) Timer.clear(p.timeoutId);
        this._proposals.clear();
        this._confirmed.clear();
    }
}