/**
 * PVP - 联机模式比赛管理器，继承 Mag
 * 只负责网络同步（权威端选举、心跳保活、状态同步、操作广播），规则判定委托给 Rule
 * 权威端通过帧同步广播游戏状态，非权威端接收并应用；权威端失联时自动选举新权威端
 */
import { Timer } from "../../libs/time";
import { MatchPhase, TeamSide } from "./mag";
import { Mag } from "./mag";
import { Cha } from "../cha";
import { Gnet } from "../../libs/GNet";
import { Ball, ChaState } from "../ball";
import { State } from "../phyCfg";

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
    private _allPlayerIds: string[] = [];
    /** 当前权威端 ID */
    private _currentAuthId: string | null = null;
    /** 本地是否为权威端 */
    private _amAuth: boolean = false;
    /** 上次收到权威端心跳的时间戳 */
    private _lastHeartbeat: number = 0;
    /** 权威端看门狗定时器 */
    private _watchdogTimer: any = null;
    /** 待确认的状态提案映射 */
    private _proposals: Map<string, any> = new Map();
    /** 已确认的状态提案 ID 集合 */
    private _confirmed: Set<string> = new Set();
    /** 状态提案计数器，用于生成唯一提案 ID */
    private _proposeCounter: number = 0;
    /** 权威端帧同步线程（仅权威端运行，发送 state + authId + frame） */
    private sup: any = null;
    /** PVP 配置参数 */

    private pvpCfg: PVP_Config = {
        heartbeatInterval: 200,
        authorityTimeout: 500,
        stateConfirmTimeout: 500,
        positionTolerance: 1.0,
        timeTolerance: 2000,
        compensationRate: 0.15,
    };

    constructor(p1: Laya.Sprite3D, ball: Ball, isSingle: boolean = false) {
        super(p1, ball, isSingle);
        this.onStateChange = () => {
            if (this._amAuth) this._proposeStateChange();
        };
    }

    // ---------- 初始化 ----------
    public setup(): Cha {
        const allCha = this.players;
        const localGobeId = Gnet.getCurrentPlayerId();
        const playerChaMap: Map<string, Cha> = new Map();
        let localCha: Cha | null = null;

        const assignments: { playerId: string, roleId: number }[] = (window as any).gamePlayerAssignments || null;
        if (assignments && assignments.length > 0) {
            for (const a of assignments) {
                if (a.roleId >= 0 && a.roleId < allCha.length) {
                    const cha = allCha[a.roleId];
                    playerChaMap.set(a.playerId, cha);
                    if (a.playerId === localGobeId) localCha = cha;
                }
            }
            console.log(`[PVP] 角色分配: ${JSON.stringify(assignments)}`);
        } else {
            console.log("[PVP] 无协商分配，使用默认本地角色");
            localCha = allCha[0];
        }

        if (!localCha) localCha = allCha[0];
        console.log(`[PVP] 本地玩家 ${localGobeId} 控制角色 ${localCha.id}`);

        this.bindNetwork(localGobeId, localCha, playerChaMap);

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
    public bindNetwork(gobeId: string, localCha: Cha, playerChaMap: Map<string, Cha>): void {
        this._gobeId = gobeId;
        this._localCha = localCha;
        this._playerChaMap = playerChaMap;

        const players = Gnet.getPlayers();
        this._allPlayerIds = players.map((p: any) => p.playerId);
        if (this._allPlayerIds.length === 0) {
            console.warn("[PVP] 房间玩家列表为空");
            return;
        }

        this._currentAuthId = this._allPlayerIds[0];
        this._amAuth = (this._gobeId === this._currentAuthId);
        this.isAuthoritative = this._amAuth;
        this._lastHeartbeat = Timer.now();

        Gnet.onClient((info: any) => {
            try {
                const data = JSON.parse(info.msg);
                this._onRecvMsg(data, info.sendPlayerId);
            } catch (e) { }
        });

        Gnet.onFrame((msg: any) => this._onFrame(msg));

        if (this._amAuth) {
            this._startAuthFrameSync();
        }

        this._startWatchdog();

        console.log(`[PVP] 我是权威端: ${this._amAuth} (${this._gobeId}), 当前权威端: ${this._currentAuthId}`);
    }

    // ---------- 操作同步 ----------
    public syncAction(opt: any): void {
        if (!this._gobeId) return;
        const msg: any = { kind: 'action', playerId: this._gobeId, ...opt };
        if (opt.type === 'hit' && !opt.params) {
            const phy = (this.ball as any).phy;
            if (phy) msg.ballPos = { x: phy.state.pos.x, y: phy.state.pos.y, z: phy.state.pos.z };
        }
        this._sendMsg(msg);
    }

    private _sendMsg(data: any): void {
        Gnet.sendToClient(1, JSON.stringify(data));
    }

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

    private _applyAction(data: any, senderId: string): void {
        const cha = this._playerChaMap.get(senderId);
        if (!cha) return;
        switch (data.type) {
            case 'hit':
                if (data.params) {
                    cha.hit(data.params, this.ball);
                } else {
                    if (data.ballPos) {
                        const phy = (this.ball as any).phy;
                        if (phy) {
                            phy.isCalc = false;
                            this.ball.pos = new Laya.Vector3(data.ballPos.x, data.ballPos.y, data.ballPos.z);
                        }
                    }
                    cha.hit();
                }
                break;
            case 'move':
                // ★ 修正反向移动：由于双方玩家面朝方向相反，角度需要取反
                cha.move(data.angH, data.power);
                break;
        }
    }

    // ========== 权威端帧同步线程管理 ==========

    private _startAuthFrameSync(): void {
        if (this.sup) return;
        this.sup = Timer.setInterval(this.pvpCfg.heartbeatInterval, () => {
            const frame = this.serializeFrame();
            Gnet.sendFrame(JSON.stringify({ frame, state: this.serializeState(), authId: this._gobeId }));
        });
        console.log(`[PVP] 权威端帧同步线程已启动 (${this._gobeId})`);
    }

    private _stopAuthFrameSync(): void {
        if (this.sup) {
            Timer.clear(this.sup);
            this.sup = null;
            console.log(`[PVP] 权威端帧同步线程已停止 (${this._gobeId})`);
        }
    }

    // ========== 帧同步接收与权威端检测 ==========

    private _onFrame(msg: any): void {
        const frameMsgs = Array.isArray(msg) ? msg : [msg];
        for (const fm of frameMsgs) {
            if (!fm.frameInfo) continue;
            for (const fi of fm.frameInfo) {
                if (fi.playerId === this._gobeId) continue;
                for (const data of fi.data) {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.authId) {
                            this._detectAuthority(parsed.authId, fi.playerId);
                            if (parsed.state) this.applyState(parsed.state);
                            if (parsed.frame) this.applyFrame(parsed.frame);
                        } else if (parsed.authCandidate) {
                            this._onAuthCandidate(parsed.authCandidate, fi.playerId);
                        } else {
                            this.applyFrame(data);
                        }
                    } catch (e) {
                        this.applyFrame(data);
                    }
                }
            }
        }
    }

    private _detectAuthority(frameAuthId: string, senderId: string): void {
        if (frameAuthId === this._gobeId) return;
        if (senderId !== frameAuthId) return;

        if (this._amAuth) {
            console.log(`[PVP] 检测到其他权威端 ${frameAuthId}，关闭自身权威端线程`);
            this._amAuth = false;
            this.isAuthoritative = false;
            this._stopAuthFrameSync();
        }

        this._currentAuthId = frameAuthId;
        this._lastHeartbeat = Timer.now();
    }

    private _onAuthCandidate(candidateId: string, senderId: string): void {
        if (senderId === this._gobeId) return;

        if (candidateId === this._gobeId && !this._amAuth) {
            if (Timer.now() - this._lastHeartbeat > this.pvpCfg.authorityTimeout) {
                console.log(`[PVP] 收到 ${senderId} 推举自己为新权威端，立即接管`);
                this._currentAuthId = this._gobeId;
                this._amAuth = true;
                this.isAuthoritative = true;
                this._lastHeartbeat = Timer.now();
                this._startAuthFrameSync();
                this._sendMsg({ kind: 'auth_declare', playerId: this._gobeId });
            }
        } else if (candidateId !== this._gobeId) {
            if (Timer.now() - this._lastHeartbeat > this.pvpCfg.authorityTimeout) {
                if (this._currentAuthId !== candidateId) {
                    console.log(`[PVP] 收到 ${senderId} 推举 ${candidateId}，跟随并重置等待`);
                    this._currentAuthId = candidateId;
                    this._lastHeartbeat = Timer.now();
                }
            }
        }
    }

    // ========== 权威端看门狗 ==========

    private _startWatchdog(): void {
        if (this._watchdogTimer) Timer.clear(this._watchdogTimer);
        const checkInterval = Math.max(100, Math.floor(this.pvpCfg.authorityTimeout / 2));
        this._watchdogTimer = Timer.setInterval(checkInterval, () => {
            if (Timer.now() - this._lastHeartbeat > this.pvpCfg.authorityTimeout) {
                this._advanceAuthority();
            }
        });
    }

    private _advanceAuthority(): void {
        if (this._allPlayerIds.length <= 1) return;
        if (this._amAuth) return;

        const idx = this._allPlayerIds.indexOf(this._currentAuthId!);
        let nextIdx: number;
        if (idx === -1) {
            nextIdx = 0;
        } else {
            nextIdx = (idx + 1) % this._allPlayerIds.length;
        }

        const nextAuthId = this._allPlayerIds[nextIdx];
        this._currentAuthId = nextAuthId;
        this._lastHeartbeat = Timer.now();

        console.log(`[PVP] 权威端失联 >${this.pvpCfg.authorityTimeout}ms，切换候选权威端为: ${nextAuthId}`);

        if (this._currentAuthId === this._gobeId) {
            this._amAuth = true;
            this.isAuthoritative = true;
            this._startAuthFrameSync();
            this._sendMsg({ kind: 'auth_declare', playerId: this._gobeId });
            console.log(`[PVP] 已成为权威端，启动权威端帧同步线程`);
        } else {
            Gnet.sendFrame(JSON.stringify({ authCandidate: nextAuthId }));
            console.log(`[PVP] 发送权威端变更同步帧，认定新权威端为: ${nextAuthId}`);
        }
    }

    private _onAuthDeclare(data: any, senderId: string): void {
        if (senderId === this._gobeId) return;
        if (this._amAuth) {
            console.log(`[PVP] 收到 ${senderId} 的权威端声明，关闭自身权威端线程`);
            this._amAuth = false;
            this.isAuthoritative = false;
            this._stopAuthFrameSync();
        }
        this._currentAuthId = senderId;
        this._lastHeartbeat = Timer.now();
    }

    // ---------- 状态提案 ----------
    private _proposeStateChange(): void {
        if (!this._amAuth || this._allPlayerIds.length <= 1) return;
        const proposeId = `${this._gobeId}_${Timer.now()}_${this._proposeCounter++}`;
        const status = this._buildStatus();
        const proposal = { proposeId, status, okplay: { [this._gobeId]: true }, allPlayers: this._allPlayerIds, timeoutId: null as any };
        this._proposals.set(proposeId, proposal);
        this._sendMsg({ kind: 'state_propose', playerId: this._gobeId, proposeId, status });
        proposal.timeoutId = Timer.setTimeout(this.pvpCfg.stateConfirmTimeout, () => this._onProposeTimeout(proposeId));
    }

    private _onProposeTimeout(proposeId: string): void {
        const p = this._proposals.get(proposeId);
        if (!p) return;
        for (const pid of p.allPlayers) if (!p.okplay[pid]) p.okplay[pid] = true;
        this._sendFinal(p);
    }

    private _sendFinal(p: any): void {
        if (p.timeoutId) { Timer.clear(p.timeoutId); p.timeoutId = null; }
        this._sendMsg({ kind: 'state_final', playerId: this._gobeId, proposeId: p.proposeId, status: p.status, okplay: p.okplay });
        this._proposals.delete(p.proposeId);
    }

    private _onStatePropose(data: any, senderId: string): void {
        const { proposeId, status } = data;
        if (this._confirmed.has(proposeId)) return;
        this._confirmed.add(proposeId);
        this._applyStateWithCompensation(status);
        this._sendMsg({ kind: 'state_confirm', playerId: this._gobeId, proposeId });
    }

    private _onStateConfirm(data: any, senderId: string): void {
        const p = this._proposals.get(data.proposeId);
        if (!p) return;
        p.okplay[senderId] = true;
        if (p.allPlayers.every((id: string) => p.okplay[id])) this._sendFinal(p);
    }

    private _onStateFinal(data: any, senderId: string): void {
        if (senderId !== this._currentAuthId) return;
        const key = data.proposeId + '_final';
        if (this._confirmed.has(key)) return;
        this._confirmed.add(key);
        this._applyStateWithCompensation(data.status);
    }

    // ---------- 状态序列化 ----------
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

    public serializeState(): string { return JSON.stringify(this._buildStatus()); }

    public applyState(stateStr: string): void {
        try { this._applyStateWithCompensation(JSON.parse(stateStr)); } catch (e) { }
    }

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

        if (st.serverId >= 0) this.currentServer = this.players.find(p => p.id === st.serverId) ?? null;
        if (st.receiverId >= 0) this.currentReceiver = this.players.find(p => p.id === st.receiverId) ?? null;
        if (st.countdownStartTime) {
            const localElapsed = this.countdownStartTime ? Timer.now() - this.countdownStartTime : 0;
            const remoteElapsed = Timer.now() - st.countdownStartTime;
            if (Math.abs(localElapsed - remoteElapsed) > this.pvpCfg.timeTolerance) {
                this.countdownStartTime = st.countdownStartTime;
            }
        }
        if (st.serveStartTime) this.serveStartTime = st.serveStartTime;

        this.onScoreChanged?.(this.scores[TeamSide.LEFT], this.scores[TeamSide.RIGHT]);
        if (this.phase === MatchPhase.COUNTDOWN && this.onCountdown) {
            const elapsed = Timer.now() - this.countdownStartTime;
            this.onCountdown(Math.max(0, Math.ceil((this.cfg.countdownDuration - elapsed) / 1000)));
        }
    }

    // ---------- 帧序列化 ----------
    public serializeFrame(): string {
        if (!this._localCha) return "{}";
        const players = this.players.map(p => ({ id: p.id, x: p.x, y: p.y, z: p.z, isP: p.isP, state: p.state }));
        const phy = (this.ball as any).phy;
        const ballData = phy ? { x: phy.state.pos.x, y: phy.state.pos.y, z: phy.state.pos.z } : null;
        return JSON.stringify({ players, ball: ballData });
    }

    public applyFrame(frameStr: string): void {
        try {
            const frame = JSON.parse(frameStr);
            if (!frame.players) return;
            const tolSq = this.pvpCfg.positionTolerance * this.pvpCfg.positionTolerance;
            const rate = this.pvpCfg.compensationRate;
            for (const fp of frame.players) {
                const target = this.players.find(p => p.id === fp.id);
                if (!target || target === this._localCha) continue;
                const dx = fp.x - target.x, dy = fp.y - target.y, dz = fp.z - target.z;
                const distSq = dx * dx + dy * dy + dz * dz;
                if (distSq > tolSq) {
                    target.x = fp.x; target.y = fp.y; target.z = fp.z;
                } else if (distSq > 0.01) {
                    target.x += dx * rate;
                    target.z += dz * rate;
                }
                if (fp.state == ChaState.IDLE && target.state != ChaState.IDLE) {
                    target.move(-1, -1);
                }
                target.isP = fp.isP;
            }
            if (frame.ball) {
                const phy = (this.ball as any).phy;
                if (phy && !phy.isCalc && !(this._localCha && this._localCha.isP)) {
                    const bx = frame.ball.x - this.ball.x, by = frame.ball.y - this.ball.y, bz = frame.ball.z - this.ball.z;
                    if (bx * bx + by * by + bz * bz > tolSq) this.ball.pos = new Laya.Vector3(frame.ball.x, frame.ball.y, frame.ball.z);
                }
            }
        } catch (e) { }
    }

    // ---------- 清理 ----------
    public destroy(): void {
        this._stopAuthFrameSync();
        if (this._watchdogTimer) {
            Timer.clear(this._watchdogTimer);
            this._watchdogTimer = null;
        }
        for (const [_, p] of this._proposals) if (p.timeoutId) Timer.clear(p.timeoutId);
        this._proposals.clear();
        this._confirmed.clear();
    }
}