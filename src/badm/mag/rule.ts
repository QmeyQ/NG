/**
 * Rule - 羽毛球规则引擎（自治）
 * 接收 Mag 引用，通过 this._mag.xxx 操作所有共享状态
 * 自己注册 Ball 事件，处理所有判罚
 */
import { Cha, StrokeParams } from "../obj/cha";
import { Ball } from "../obj/ball";
import { NetHitInfo } from "../engine/phyCfg";
import { Timer } from "../../libs/time";
import { Mag } from "./mag";

// ==================== 枚举定义 ====================

/** 比赛模式：单打 / 双打 */
export enum MatchMode {
    /** 单打*/
    SINGLE = 1,
    DOUBLE = 2
}

/** 比赛阶段状态机 */
export enum MatchPhase {
    WAITING_START = 0,
    COUNTDOWN = 1,
    SERVING = 2,
    RALLYING = 3,
    SCORING = 4,
    ENDED = 5
}

/** 队伍边：左队 / 右队 */
export enum TeamSide {
    LEFT = -1,
    RIGHT = 1
}

// ==================== 接口定义 ====================

/** 场地尺寸配置 */
export interface CourtCfg {
    halfLength: number;
    halfWidth: number;
    serveLineX: number;
    serveHalfZ: number;
}

/** 比赛规则配置 */
export interface MatchCfg {
    maxScore: number;
    bestOf: number;
    serveTimeLimit: number;
    countdownDuration: number;
    ballAssignDelay: number;
}

// ==================== Rule 类 ====================

export class Rule {
    /** Mag 引用，通过它读写所有共享状态 */
    private _mag: Mag;
    /** 触网事件已处理标记（防止重复判罚） */
    private _isNetHitProcessed: boolean = false;
    /** 落地事件已处理标记（防止重复判罚） */
    private _isGroundHitProcessed: boolean = false;
    /** 上次广播的倒计时数字，用于检测秒数变化 */
    private _lastCountdownNum: number = 0;

    /** 倒计时定时器键 */
    private static readonly COUNTDOWN_KEY = 'countdown';
    /** 发球超时定时器键 */
    private static readonly SERVE_KEY = 'serve';

    /**
     * 构造函数：保存 Mag 引用并注册球事件监听
     * @param mag 比赛管理器引用
     */
    constructor(mag: Mag) {
        this._mag = mag;
        this._registerEvents();
    }

    // ---------- 事件注册 ----------

    /**
     * 注册 Ball 的 hit / netHit / groundHit 事件回调
     * - hit: 球员击球时校验发球站位、连击、同队连击等规则
     * - netHit: 记录触网状态
     * - groundHit: 球落地时判定界内/界外/得分
     * 非权威端直接跳过（仅权威端执行判罚）
     */
    private _registerEvents(): void {
        const ball = this._mag.ball;

        ball.on('hit', (info: { hitterId: number, stroke: StrokeParams }) => {
            const m = this._mag;
            if (!m.isAuthoritative) return;
            const hitter = m.players.find(p => p.id === info.hitterId);
            if (!hitter) return;
            if (m.phase === MatchPhase.COUNTDOWN && !m.isBallAssigned) return;

            for (const p of m.players) p.isP = false;
            this._isNetHitProcessed = false;
            this._isGroundHitProcessed = false;
            const hitterTeam = m.teamMap.get(hitter)!;

            if (m.phase === MatchPhase.SERVING || m.phase === MatchPhase.COUNTDOWN) {
                if (m.mode === MatchMode.DOUBLE && m.currentServer !== hitter) {
                    this.score(m.servingTeam === TeamSide.LEFT ? TeamSide.RIGHT : TeamSide.LEFT, "非发球员击球");
                    return;
                }
                if (!this.checkServePosition(hitter)) {
                    this.score(m.servingTeam === TeamSide.LEFT ? TeamSide.RIGHT : TeamSide.LEFT, "发球站位违规");
                    return;
                }
                m.phase = MatchPhase.RALLYING;
                m.lastHitCha = hitter;
                m.isServeShot = true;
                m.currentHitTeam = hitterTeam;

                m.onCountdown?.(0);
                m.onHit?.();
                return;
            }

            if (m.phase === MatchPhase.RALLYING) {
                if (m.mode === MatchMode.DOUBLE && m.isServeShot && m.currentReceiver !== hitter) {
                    this.score(hitterTeam === TeamSide.LEFT ? TeamSide.RIGHT : TeamSide.LEFT, "非接球员击球");
                    return;
                }
                if (m.lastHitCha === hitter) {
                    this.score(hitterTeam === TeamSide.LEFT ? TeamSide.RIGHT : TeamSide.LEFT, "连击");
                    return;
                }
                if (m.mode === MatchMode.DOUBLE && m.currentHitTeam === hitterTeam) {
                    this.score(hitterTeam === TeamSide.LEFT ? TeamSide.RIGHT : TeamSide.LEFT, "同队连击");
                    return;
                }
                m.currentHitTeam = hitterTeam;
                m.lastHitCha = hitter;
                m.isServeShot = false;

                m.onHit?.();
            }
        });

        ball.on('netHit', (info: NetHitInfo) => {
            if (this._isNetHitProcessed) return;
            if (info.headPastNet || info.featherPastNet) {
                this._isNetHitProcessed = true;
            }
        });

        ball.on('groundHit', (pos: { x: number, y: number, z: number }) => {
            const m = this._mag;
            if (!m.isAuthoritative) return;
            if (this._isGroundHitProcessed) return;
            if (m.phase !== MatchPhase.RALLYING && m.phase !== MatchPhase.SERVING) return;
            this._isGroundHitProcessed = true;

            const landX = pos.x, landZ = pos.z;
            const landingTeam = landX > 0 ? TeamSide.RIGHT : TeamSide.LEFT;

            if (landingTeam === m.currentHitTeam) {
                this.score(m.currentHitTeam === TeamSide.LEFT ? TeamSide.RIGHT : TeamSide.LEFT, "球落己方场地");
                return;
            }

            let isIn: boolean;
            if (m.isServeShot) {
                isIn = this._isServeIn(landX, landZ);
            } else {
                isIn = this._isRallyIn(landX, landZ);
            }

            if (isIn) {
                this.score(landingTeam === TeamSide.LEFT ? TeamSide.RIGHT : TeamSide.LEFT, "IN得分");
            } else {
                if (m.isServeShot && Math.abs(landX) <= m.court.serveLineX) {
                    this.score(m.currentHitTeam === TeamSide.LEFT ? TeamSide.RIGHT : TeamSide.LEFT, "发球未过发球线");
                } else {
                    this.score(m.currentHitTeam === TeamSide.LEFT ? TeamSide.RIGHT : TeamSide.LEFT, "OUT！！！");
                }
            }
        });
    }

    // ---------- 初始化 ----------

    /**
     * 初始化/重置比赛：清零比分、设置初始发球方、传送玩家到站位、启动倒计时
     */
    public initMatch(): void {
        const m = this._mag;
        m.phase = MatchPhase.COUNTDOWN;
        m.scores = { [TeamSide.LEFT]: 0, [TeamSide.RIGHT]: 0 };
        m.servingTeam = TeamSide.LEFT;
        m.gamesWon = { [TeamSide.LEFT]: 0, [TeamSide.RIGHT]: 0 };
        m.gameEnded = false;
        m.matchEnded = false;
        m.isBallAssigned = false;
        m.isServeShot = false;
        m.lastHitCha = null;
        this._lastCountdownNum = 15;
        m.currentHitTeam = m.servingTeam;
        this._updateServerAndReceiver();
        this._forceTeleportAll();
        m.countdownStartTime = Timer.now();
        m.serveStartTime = Timer.now();
        Timer.start(Rule.COUNTDOWN_KEY);
        m.onCountdown?.(15);
    }

    // ---------- 每帧更新 ----------

    /**
     * 每帧更新：根据当前阶段分发到对应的更新逻辑
     * 由 Mag.update() 调用
     */
    public update(): void {
        const m = this._mag;
        if (m.phase === MatchPhase.COUNTDOWN) {
            this._updateCountdown();
        } else if (m.phase === MatchPhase.SERVING) {
            this._updateServing();
        } else if (m.phase === MatchPhase.RALLYING) {
            this._updateRally();
        }
    }

    /**
     * 倒计时阶段更新：
     * - 倒计时过半后分配球给发球员
     * - 检查发球超时
     * - 广播倒计时秒数变化
     * - 倒计时结束转入发球阶段
     */
    private _updateCountdown(): void {
        const m = this._mag;
        const elapsed = Timer.invoke(Rule.COUNTDOWN_KEY);
        const remainingMs = Math.max(0, m.cfg.countdownDuration - elapsed);
        const remainingSeconds = Math.ceil(remainingMs / 1000);

        if (!m.isBallAssigned && elapsed >= m.cfg.ballAssignDelay) {
            m.isBallAssigned = true;
            this._assignBall();
            Timer.start(Rule.SERVE_KEY);
        }
        if (m.isBallAssigned && Timer.invoke(Rule.SERVE_KEY) > m.cfg.serveTimeLimit) {
            this.score(m.servingTeam === TeamSide.LEFT ? TeamSide.RIGHT : TeamSide.LEFT, "发球超时");
            return;
        }
        if (remainingSeconds >= 0 && remainingSeconds < this._lastCountdownNum) {
            this._lastCountdownNum = remainingSeconds;
            m.onCountdown?.(remainingSeconds);
        }
        if (remainingMs <= 0) {
            m.phase = MatchPhase.SERVING;
            m.serveStartTime = Timer.now();
            m.onCountdown?.(0);
            m.onStateChange?.();
        }
    }

    /**
     * 发球阶段更新：检查发球超时，超时则判对方得分
     */
    private _updateServing(): void {
        const m = this._mag;
        if (Timer.invoke(Rule.SERVE_KEY) > m.cfg.serveTimeLimit) {
            this.score(m.servingTeam === TeamSide.LEFT ? TeamSide.RIGHT : TeamSide.LEFT, "发球超时");
        }
    }

    /**
     * 对打阶段更新：检查所有球员是否越界（进入对方半场），越界则判对方得分
     */
    private _updateRally(): void {
        const m = this._mag;
        for (const p of m.players) {
            const t = m.teamMap.get(p)!;
            if (t === TeamSide.LEFT && p.x > 0.2) {
                this.score(TeamSide.RIGHT, "球员越界");
                return;
            }
            if (t === TeamSide.RIGHT && p.x < -0.2) {
                this.score(TeamSide.LEFT, "球员越界");
                return;
            }
        }
    }

    // ---------- 核心得分 ----------

    /**
     * 核心得分方法：为指定队伍加 1 分并推进比赛状态
     * - 更新比分和发球权
     * - 检查本局赢家和比赛赢家
     * - 本局结束时换边并重置比分
     * - 触发 onScoreChanged / onGameEnded / onMatchEnded 回调
     * @param team 得分队伍
     * @param reason 判定原因（用于 UI 显示）
     */
    public score(team: TeamSide, reason?: string): void {
        const m = this._mag;
        if (m.phase === MatchPhase.SCORING || m.phase === MatchPhase.ENDED) return;

        m.scores[team]++;
        m.servingTeam = team;
        m.lastScoreReason = reason || "";
        this._isNetHitProcessed = false;
        this._isGroundHitProcessed = false;
        m.isServeShot = false;
        m.onScoreChanged?.(m.scores[TeamSide.LEFT], m.scores[TeamSide.RIGHT]);

        const winner = this._getGameWinner();
        if (winner !== null) {
            m.gamesWon[winner]++;
            m.onGameEnded?.(winner);
            const matchWinner = this._getMatchWinner();
            if (matchWinner !== null) {
                m.matchEnded = true;
                m.phase = MatchPhase.ENDED;
                m.onMatchEnded?.(matchWinner);
                m.onStateChange?.();
                return;
            } else {
                m.gameEnded = true;
            }
        }

        let needTeleport = false;
        if (m.gameEnded) {
            this._switchSides();
            m.scores[TeamSide.LEFT] = 0;
            m.scores[TeamSide.RIGHT] = 0;
            m.gameEnded = false;
            needTeleport = true;
        }

        m.phase = MatchPhase.COUNTDOWN;
        m.isBallAssigned = false;
        this._lastCountdownNum = 15;
        m.lastHitCha = null;
        m.isServeShot = false;
        m.currentHitTeam = m.servingTeam;
        m.countdownStartTime = Timer.now();
        m.serveStartTime = Timer.now();
        this._updateServerAndReceiver();
        if (needTeleport) this._forceTeleportAll();
        Timer.start(Rule.COUNTDOWN_KEY);
        m.onCountdown?.(15);
        m.onStateChange?.();
    }

    // ---------- 私有辅助 ----------

    /**
     * 将球分配给当前发球员：设置发球员球权，重置物理状态
     * cha 不再持有 Ball 对象，持球通过 isP 标记和 Mag 的持球跟随逻辑处理
     */
    private _assignBall(): void {
        const m = this._mag;
        const server = m.currentServer;
        if (server && m.ball) {
            for (const p of m.players) p.isP = false;
            server.isP = true;
            m.ball.phy.isCalc = false;
            const phy = (m.ball as any).phy;
            if (phy) {
                phy.clearNetHit?.();
                phy.clearGroundHit?.();
                if (typeof phy.clearCache === 'function') phy.clearCache();
            }
        }
    }

    /**
     * 根据当前发球方和比分更新发球员和接球员
     * - 单打：发球方唯一球员发球，对方接球
     * - 双打：按"左单右双"原则，偶数分站右区(odd=false)，奇数分站左区(odd=true)
     */
    private _updateServerAndReceiver(): void {
    const m = this._mag;
    if (m.mode === MatchMode.SINGLE) {
        const left = m.players.find(p => m.teamMap.get(p) === TeamSide.LEFT);
        const right = m.players.find(p => m.teamMap.get(p) === TeamSide.RIGHT);
        m.currentServer = m.servingTeam === TeamSide.LEFT ? left! : right!;
        m.currentReceiver = m.servingTeam === TeamSide.LEFT ? right! : left!;
        return;
    }
    // 双打
    const srvPlayers = m.players.filter(p => m.teamMap.get(p) === m.servingTeam);
    const recvPlayers = m.players.filter(p => m.teamMap.get(p) !== m.servingTeam);
    if (srvPlayers.length === 0 || recvPlayers.length === 0) {
        // 保护：如果队伍分配错误，使用前两个球员
        console.warn("[Rule] 队伍分配异常，使用前两个球员作为发球方和接发球方");
        const left = m.players[0];
        const right = m.players[1];
        m.currentServer = m.servingTeam === TeamSide.LEFT ? left : right;
        m.currentReceiver = m.servingTeam === TeamSide.LEFT ? right : left;
        return;
    }
    const isEven = m.scores[m.servingTeam] % 2 === 0;
    // 发球员：偶数分时 odd=false（右区），奇数分时 odd=true（左区）
    m.currentServer = srvPlayers.find(p => p.odd === !isEven) ?? srvPlayers[0];
    // 接发球员：odd 与发球员相反
    const recvOdd = !m.currentServer.odd;
    m.currentReceiver = recvPlayers.find(p => p.odd === recvOdd) ?? recvPlayers[0];

}

    /**
     * 强制传送所有玩家到各自的发球站位，并对齐朝向
     * 仅在开局和换边时调用
     */
    private _forceTeleportAll(): void {
        const m = this._mag;
        for (const p of m.players) {
            const pos = this.getPlayerServePosition(p);
            p.move(pos);
        }
        this._alignAllFacing();
        m.onTeleport?.();
    }

    /**
     * 换边：交换所有玩家的队伍归属和 servingTeam，同步更新 cha.side
     * 不直接传送，由调用方决定是否传送
     */
    private _switchSides(): void {
        const m = this._mag;
        const newMap = new Map<Cha, TeamSide>();
        for (const [cha, team] of m.teamMap) {
            const newTeam = team === TeamSide.LEFT ? TeamSide.RIGHT : TeamSide.LEFT;
            newMap.set(cha, newTeam);
            cha.side = newTeam === TeamSide.LEFT ? -1 : 1;
        }
        m.teamMap.clear();
        for (const [cha, team] of newMap) m.teamMap.set(cha, team);
        m.servingTeam = m.servingTeam === TeamSide.LEFT ? TeamSide.RIGHT : TeamSide.LEFT;
        m.onSideSwitch?.();
    }

    /**
     * 对齐所有玩家朝向：左队朝 +90°，右队朝 -90°
     */
    private _alignAllFacing(): void {
        const m = this._mag;
        for (const p of m.players) {
            const side = m.teamMap.get(p);
            if (side === undefined) continue;
            p.root.transform.rotationEuler = new Laya.Vector3(0, side === TeamSide.LEFT ? 90 : -90, 0);
        }
    }

    // ---------- 规则判定（公开） ----------

    /**
     * 检查发球员站位是否合规
     * - 必须在己方半场内
     * - 必须在正确的发球区（偶数分右区 z>0，奇数分左区 z<0）
     * @param hitter 击球者
     * @returns true 表示站位合规
     */
    public checkServePosition(hitter: Cha): boolean {
        const m = this._mag;
        const isSrvEven = m.scores[m.servingTeam] % 2 === 0;
        const srvSign = m.servingTeam === TeamSide.LEFT ? 1 : -1;
        const zSign = (isSrvEven ? 1 : -1) * srvSign;
        const inMySide = m.servingTeam === TeamSide.RIGHT
            ? hitter.x > 0 && hitter.x < m.court.halfLength
            : hitter.x < 0 && hitter.x > -m.court.halfLength;
        const inCorrectZone = zSign > 0
            ? hitter.z > 0 && hitter.z < m.court.serveHalfZ
            : hitter.z < 0 && hitter.z > -m.court.serveHalfZ;
        return inMySide && inCorrectZone;
    }

    /**
     * 判断发球落点是否在接发球区内（界内）
     * - 必须落在对方半场
     * - 必须过发球线（|x| > serveLineX）
     * - 必须在正确的接发球区（对角区域）
     * @param landX 落点 X 坐标
     * @param landZ 落点 Z 坐标
     * @returns true 表示发球界内
     */
    private _isServeIn(landX: number, landZ: number): boolean {
        const m = this._mag;
        const recvTeam = m.servingTeam === TeamSide.LEFT ? TeamSide.RIGHT : TeamSide.LEFT;
        const isSrvEven = m.scores[m.servingTeam] % 2 === 0;
        const rcvSign = recvTeam === TeamSide.LEFT ? 1 : -1;
        const zSign = (isSrvEven ? 1 : -1) * rcvSign;
        const zMin = zSign > 0 ? 0 : -m.court.serveHalfZ;
        const zMax = zSign > 0 ? m.court.serveHalfZ : 0;
        if (landX * (recvTeam === TeamSide.LEFT ? -1 : 1) < 0) return false;
        if (Math.abs(landX) <= m.court.serveLineX) return false;
        if (Math.abs(landX) >= m.court.halfLength) return false;
        if (landZ <= zMin || landZ >= zMax) return false;
        return true;
    }

    /**
     * 判断对打阶段落点是否在场地内（界内）
     * @param landX 落点 X 坐标
     * @param landZ 落点 Z 坐标
     * @returns true 表示界内
     */
    private _isRallyIn(landX: number, landZ: number): boolean {
        const m = this._mag;
        return Math.abs(landX) < m.court.halfLength && Math.abs(landZ) < m.court.halfWidth;
    }

    /**
     * 判断本局（一局21分制）是否有赢家
     * - 30分封顶制：先到30分者胜
     * - 21分制：先到21分且领先2分者胜
     * @returns 赢家队伍，null 表示本局未结束
     */
    private _getGameWinner(): TeamSide | null {
        const m = this._mag;
        const left = m.scores[TeamSide.LEFT], right = m.scores[TeamSide.RIGHT];
        const max = Math.max(left, right), diff = Math.abs(left - right);
        if (max >= 30) return left > right ? TeamSide.LEFT : TeamSide.RIGHT;
        if (max >= m.cfg.maxScore && diff >= 2) return left > right ? TeamSide.LEFT : TeamSide.RIGHT;
        return null;
    }

    /**
     * 判断整场比赛是否有赢家（根据 bestOf 局数制）
     * @returns 赢家队伍，null 表示比赛未结束
     */
    private _getMatchWinner(): TeamSide | null {
        const m = this._mag;
        const winReq = Math.ceil(m.cfg.bestOf / 2);
        if (m.gamesWon[TeamSide.LEFT] >= winReq) return TeamSide.LEFT;
        if (m.gamesWon[TeamSide.RIGHT] >= winReq) return TeamSide.RIGHT;
        return null;
    }

    /**
     * 获取指定玩家的发球站位坐标
     * - 发球员：站在己方半场底线附近（发球线后方）
     * - 发球员队友（双打）：站在发球线附近（前方）
     * - 接球员：站在己方半场底线附近
     * - 接球员队友（双打）：站在后场防守位
     * 
     * 单打时：发球员和接球员都站在底线附近
     * 双打时：发球员在底线，队友在前场发球线附近
     */
    public getPlayerServePosition(cha: Cha): { x: number, y: number, z: number } {
        const m = this._mag;
        const team = m.teamMap.get(cha);
        if (team === undefined) return { x: 0, y: 0, z: 0 };

    // 统一计算发球员的 Z 方向（由发球方得分奇偶决定）
        const isSrvEven = m.scores[m.servingTeam] % 2 === 0;
        const srvSign = m.servingTeam === TeamSide.LEFT ? 1 : -1;
        const zSrv = (isSrvEven ? 1 : -1) * srvSign * m.court.serveHalfZ * 0.5;

        const recvTeam = m.servingTeam === TeamSide.LEFT ? TeamSide.RIGHT : TeamSide.LEFT;
        const isRcvEven = m.scores[recvTeam] % 2 === 0;
        const rcvSign = recvTeam === TeamSide.LEFT ? 1 : -1;
        const zRcv = (isRcvEven ? 1 : -1) * rcvSign * m.court.serveHalfZ * 0.5;

        const isServerTeam = team === m.servingTeam;
        const isServer = cha === m.currentServer;
        const isReceiver = cha === m.currentReceiver;
    // 接球员的 Z 方向与发球员相反（对角线）
    const zRecv = -zSrv;

        //双打站位分配
        if (isServerTeam) {
            if (isServer) {
                return { x: team === TeamSide.LEFT ? -m.court.halfLength * 0.7 : m.court.halfLength * 0.7, y: 0, z: zSrv };
            }
            return { x: team === TeamSide.LEFT ? -m.court.serveLineX * 1.2 : m.court.serveLineX * 1.2, y: 0, z: -zSrv };
        } else {
            if (isReceiver) {
                return { x: team === TeamSide.LEFT ? -m.court.halfLength * 0.3 : m.court.halfLength * 0.3, y: 0, z: zRecv };
            }
            return { x: team === TeamSide.LEFT ? -m.court.halfLength * 0.6 : m.court.halfLength * 0.6, y: 0, z: -zRecv };
        }
    }
}
