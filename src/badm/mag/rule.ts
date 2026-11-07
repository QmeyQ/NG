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
    ENDED = 5,
    EAGLE_CONFIRM = 6,
    /** 鹰眼挑战阶段(用户规格: 双击确认后进入, 5 秒回放阶段; 未确认跳过) */
    EAGLE_CHALLENGE = 7
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
    /** 待落地结算(延时 1s, 允许 1s 内回退重算) */
    private _pendingSettle: { pos: { x: number, y: number, z: number }, tid: string, tLand?: number } | null = null;
    /** 落地结算延时(ms): 1s 窗口允许乱序击球消息回退重算 */
    private static readonly SETTLE_DELAY = 1000;
    /** 上次广播的倒计时数字，用于检测秒数变化 */
    private _lastCountdownNum: number = 0;

    /**
     * 计时标记必须显式起表: Timer.invoke 对没有起过表的键会自起并返回 -1,
     * 于是"剩余 = 上限 - (-1)"= 满额多 1 毫秒。PVP 非权威端从不跑 _updateServing
     * (update 在 rule.ts 顶部就被拦住), SERVE 键对它而言从未起过 —— 它一旦升格为权威端,
     * 第一帧读到的就是这根空键, 发球倒计时被算成整段上限并冻在 HUD 上。
     */
    private _elapsed(key: string): number {
        if (!Timer.has(key)) Timer.start(key);
        return Timer.invoke(key);
    }

    /** 当前阶段挂在哪根计时线上(无计时线=返回 null) */
    private _clockKey(): string | null {
        const m = this._mag;
        if (m.phase === MatchPhase.COUNTDOWN) return Rule.COUNTDOWN_KEY;
        if (m.phase === MatchPhase.SERVING) return Rule.SERVE_KEY;
        if (m.phase === MatchPhase.EAGLE_CONFIRM || m.phase === MatchPhase.EAGLE_CHALLENGE) return Rule.EAGLE_KEY;
        return null;
    }

    /** 当前阶段的计时线总长(ms), 与 remainMs() 同一套口径 */
    private _clockSpan(): number {
        const m = this._mag;
        if (m.phase === MatchPhase.COUNTDOWN) return m.cfg.countdownDuration;
        if (m.phase === MatchPhase.SERVING) return m.cfg.serveTimeLimit;
        return m.phase === MatchPhase.EAGLE_CONFIRM ? Rule.EAGLE_CONFIRM_MS : Rule.EAGLE_CHALLENGE_MS;
    }

    /**
     * 权威端是本回合唯一时钟源: 非权威端把本地计时线起点与"上次已播秒数"显式对齐到权威的剩余毫秒。
     * 起点用【本端时钟】按剩余反推(权威的绝对时间戳在两端设备钟差下毫无意义,
     * 这也是 _buildStatus 只同步 remainMs 不同步时间戳的原因)。
     * 本机日后升格权威时, _updateServing/_updateCountdown 就从这根格子上继续走。
     * HUD 秒数用"变化"而不是"变小"作播出条件: 新一回合权威端会把秒数【抬高】(发球 1 → 准备 5),
     * 按变小判断会漏播, HUD 冻在旧数字上。
     */
    public syncClock(remainMs: number): void {
        const m = this._mag;
        const key = this._clockKey();
        if (!key) return;
        const span = this._clockSpan();
        const remain = Math.max(0, Math.min(span, remainMs));
        Timer.setMark(key, Timer.now() - (span - remain));
        const sec = Math.max(0, Math.ceil(remain / 1000));
        if (sec === this._lastCountdownNum) return;
        this._lastCountdownNum = sec;
        m.onCountdown?.(sec, m.phase === MatchPhase.SERVING ? 5 : 3);
    }

    /** 倒计时定时器键 */
    private static readonly COUNTDOWN_KEY = 'countdown';
    /** 发球超时定时器键 */
    private static readonly SERVE_KEY = 'serve';
    /** 鹰眼确认/挑战阶段计时键(两阶段复用: 确认 3s, 双击转挑战时重计 5s) */
    private static readonly EAGLE_KEY = 'eagleCd';
    /** 鹰眼确认阶段时长(用户规格: 只设 3 秒) */
    private static readonly EAGLE_CONFIRM_MS = 3000;
    /** 鹰眼挑战阶段时长(用户规格: 双击确认后真正进入 5 秒挑战回放阶段) */
    private static readonly EAGLE_CHALLENGE_MS = 5000;

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

        ball.on('hit', (info: { hitterId: number, stroke: StrokeParams, time?: number }) => {
            const m = this._mag;
            if (!m.isAuthoritative) return;
            const hitter = m.players.find(p => p.id === info.hitterId);
            if (!hitter) return;
            if (m.phase === MatchPhase.COUNTDOWN && !m.isBallAssigned) return;

            for (const p of m.players) p.isP = false;
            this._isNetHitProcessed = false;
            this._isGroundHitProcessed = false;
            // 击球取消待落地结算(仅 PVP 延时窗口 + 击球时刻早于落地时刻, 用户规格 v3):
            // 乱序消息(击球在落地前, 消息晚到)回退重算合法; 落地后才出手不可救起——
            // PVE 立即结算无窗口; 击球时刻缺失保守不 cancel(判罚优先)
            if (m.isPvpMode && info.time != null && this.canRescueSettle(info.time)) {
                this.cancelPendingSettle();
            }
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
            this._scheduleSettle(pos);
        });
    }

    /**
     * 延时落地结算(用户规格 v3):
     * - PVE: 立即结算(延时 0)——1s 救起窗口是 PVP 抵消网络延时的专用机制, 单机无乱序,
     *   落地即判罚, 落地后击球(死球)不影响判罚
     * - PVP: 延时 1s 窗口允许乱序击球消息回退重算, 但有条件——击球时刻必须早于落地时刻
     *   (canRescueSettle); 击球在落地之后 = 球已落地才出手, 不能救起, 判罚照常
     * - 首次落地为准: 贴地/弹跳期间 groundHit 每帧重发, 已有待结算不重排
     * @param pos 落地位置
     */
    private _scheduleSettle(pos: { x: number, y: number, z: number }): void {
        if (!this._mag.isAuthoritative) return;
        if (this._pendingSettle) return;
        const m = this._mag;
        // 落地时刻(物理时轴): 与击球消息 time 同系, 救起判定 tHit < tLand 用
        const tLand = m.ball ? m.ball.snapshot().time : Timer.now();
        const delay = m.isPvpMode ? Rule.SETTLE_DELAY : 0;
        const tid = Timer.setTimeout(delay, () => {
            this._pendingSettle = null;
            this.settleGroundHit(pos);
        });
        this._pendingSettle = { pos, tid, tLand };
    }

    /**
     * PVP 延时结算窗口内击球是否允许救起(用户规格: 击球时间点在球落地之前才能救起):
     * 乱序消息场景——对手/队友击球发生在落地前, 消息因网络延时晚到(落在 1s 窗口内),
     * 回退重算合法; 击球时刻在落地时刻或之后 = 球已落地才出手, 不可救起(判罚照常)。
     */
    public canRescueSettle(tHit: number): boolean {
        const ps: any = this._pendingSettle;
        if (!ps || ps.tLand == null) return false;
        return tHit < ps.tLand;
    }

    /** 取消待落地结算(回退击球时调用, 作废旧落地判定) */
    public cancelPendingSettle(): void {
        if (this._pendingSettle) {
            Timer.clear(this._pendingSettle.tid);
            this._pendingSettle = null;
        }
    }

    /** 鹰眼窗口开合状态(提示层): EAGLE_CONFIRM 阶段=开; 供 badm 显示双击提示与 PVP 同步 */
    private _eagleWinOpen = false;
    private _eagleTid: string | null = null;

    private _offerEagleChallenge(): void {
        const m = this._mag;
        if (!m.isAuthoritative || !m.onEagleChallengeWindow) return;
        if (m.phase === MatchPhase.ENDED) return; // 比赛结束不开(挡结束流程)
        // 无回放记录不开窗(用户规格: 没有存储记录则跳过鹰眼确认阶段)
        if (m.ball && !m.ball.hasTrack()) return;
        this.closeEagleWindow(); // 防重: 先关旧窗再开新窗
        this._eagleWinOpen = true;
        m.onEagleChallengeWindow?.(true);
        this._eagleTid = Timer.setTimeout(3000, () => {
            this._eagleTid = null;
            this._eagleWinOpen = false;
            m.onEagleChallengeWindow?.(false);
        });
    }

    /** 关闭鹰眼挑战窗口(双击进入回放/回合重置; 幂等) */
    public closeEagleWindow(): void {
        if (this._eagleTid != null) { Timer.clear(this._eagleTid); this._eagleTid = null; }
        if (this._eagleWinOpen) {
            this._eagleWinOpen = false;
            this._mag.onEagleChallengeWindow?.(false);
        }
    }

    /**
     * 非权威端同步开窗(PVP applyState 驱动, 权威端 eagleWin=true 时调):
     * 只开本地提示, 不排 3s 定时器——关窗时机由权威端 state eagleWin=false 同步
     * (权威端窗口 3s 超时 → 下一帧 state 带关 → 本地随之关)
     */
    public openEagleWindowSync(): void {
        if (this._eagleWinOpen) return;
        this._eagleWinOpen = true;
        this._mag.onEagleChallengeWindow?.(true);
    }

    /** 鹰眼挑战窗口当前开合状态(PVP state 同步: 非权威端据此开关本地窗口提示) */
    public get eagleWinOpen(): boolean { return this._eagleWinOpen; }

    /** 当前阶段倒计时剩余毫秒(PVP _buildStatus 相对化同步用; 非倒计时阶段返回 -1) */
    public remainMs(): number {
        const m = this._mag;
        if (m.phase === MatchPhase.COUNTDOWN) {
            return Math.max(0, m.cfg.countdownDuration - this._elapsed(Rule.COUNTDOWN_KEY));
        }
        if (m.phase === MatchPhase.SERVING) {
            return Math.max(0, m.cfg.serveTimeLimit - this._elapsed(Rule.SERVE_KEY));
        }
        if (m.phase === MatchPhase.EAGLE_CONFIRM) {
            return Math.max(0, Rule.EAGLE_CONFIRM_MS - this._elapsed(Rule.EAGLE_KEY));
        }
        if (m.phase === MatchPhase.EAGLE_CHALLENGE) {
            return Math.max(0, Rule.EAGLE_CHALLENGE_MS - this._elapsed(Rule.EAGLE_KEY));
        }
        return -1;
    }



    /**
     * 落地结算(groundHit 事件与浮空兜底共用):
     * 界内/界外/发球区判定 + score。浮空兜底(badm.ts 检测球低速悬停未结算)直接调本方法。
     */
    public settleGroundHit(pos: { x: number, y: number, z: number }): void {
        const m = this._mag;
        if (!m.isAuthoritative) return;
        if (this._isGroundHitProcessed) return;
        // 仅 RALLYING 结算(用户规格: 球落结算后分配球权前不结算)——SERVING 期合法发球
        // 击出瞬间即转 RALLYING(hit 事件 SERVING 分支), 球钉手上不会落地; SERVING 期落地
        // 只能是死球残留(COUNTDOWN 期被打飞的球拖到 SERVING 才落) = 凭空误判分通道, 收紧
        if (m.phase !== MatchPhase.RALLYING) return;
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
        this._lastCountdownNum = 5;
        m.currentHitTeam = m.servingTeam;
        this._updateServerAndReceiver();
        this._forceTeleportAll();
        this._resetBallForServe();
        // 开局把球停在发球员身前: 不这么做, 准备阶段那颗球就杵在场景原点 (0,0,0)
        // (钉球只在发球阶段做, 见 Mag._updateBallHolding, 所以准备期要有人给它一个位置)
        m.parkBallAt(m.currentServer);
        this.closeEagleWindow();
        Timer.start(Rule.COUNTDOWN_KEY);
        m.onCountdown?.(5, 3);
    }

    // ---------- 每帧更新 ----------

    /**
     * 每帧更新：根据当前阶段分发到对应的更新逻辑
     * 由 Mag.update() 调用
     */
    public update(): void {
        const m = this._mag;
        // PVP 非权威端禁止本地推进(根因: 本地 _updateCountdown 到点自切 SERVING+分球,
        // 又被权威端 state 帧覆盖回 COUNTDOWN → 倒计时卡状态/阶段错乱; 阶段/倒计时/
        // 鹰眼窗口全部由 applyState 驱动, 本地只做显示)
        if (m.isPvpMode && !m.isAuthoritative) return;
        if (m.phase === MatchPhase.COUNTDOWN) {
            this._updateCountdown();
        } else if (m.phase === MatchPhase.SERVING) {
            this._updateServing();
        } else if (m.phase === MatchPhase.RALLYING) {
            this._updateRally();
        } else if (m.phase === MatchPhase.EAGLE_CONFIRM) {
            this._updateEagleConfirm();
        } else if (m.phase === MatchPhase.EAGLE_CHALLENGE) {
            this._updateEagleChallenge();
        }
    }

    /**
     * 鹰眼确认阶段推进(用户规格: 正式计时阶段只设 3 秒):
     * - 回放中(ball.playing)计时挂起——回放最长 5s > 3s, 不挂起会把阶段切走
     * - 每秒变化广播 onCountdown(sec, 3)(全程红)——badm 显示"双击进入鹰眼挑战 N"+倒计时音
     * - 超时 → 清窗 + 转下一回合(换边传送消费暂存标志)
     */
    private _updateEagleConfirm(): void {
        const m = this._mag;
        if (m.ball && m.ball.playing) return;
        const remain = Math.max(0, Rule.EAGLE_CONFIRM_MS - this._elapsed(Rule.EAGLE_KEY));
        if (remain <= 0) {
            this.endEagleConfirm();
            return;
        }
        const sec = Math.ceil(remain / 1000);
        if (sec < this._lastCountdownNum) {
            this._lastCountdownNum = sec;
            m.onCountdown?.(sec, 3);
        }
    }

    /**
     * 鹰眼挑战阶段推进(用户规格: 双击确认后真正进入 5 秒挑战阶段):
     * - 双击(beginEagleChallenge)时与回放同时开始计 5s——回放硬限时同为 5s 到点
     *   _stopEagleEye → endEagleConfirm 正常收尾, 本分支计时是兜底(回放异常/双击提前退出)
     * - 每秒广播 onCountdown(sec,3)——badm/PVP 显示"鹰眼挑战 N"
     * - 超时 → endEagleConfirm 转下一回合
     */
    private _updateEagleChallenge(): void {
        const m = this._mag;
        const remain = Math.max(0, Rule.EAGLE_CHALLENGE_MS - this._elapsed(Rule.EAGLE_KEY));
        if (remain <= 0) {
            this.endEagleConfirm();
            return;
        }
        const sec = Math.ceil(remain / 1000);
        if (sec < this._lastCountdownNum) {
            this._lastCountdownNum = sec;
            m.onCountdown?.(sec, 3);
        }
    }

    /**
     * 双击确认进入鹰眼挑战阶段(badm 双击链调, 用户规格: 确认了就要增加这个阶段):
     * EAGLE_CONFIRM(3s) → EAGLE_CHALLENGE(5s), 重计 EAGLE_KEY——与回放同时开始计时,
     * 回放 5s 到点结束/双击提前退出/本阶段 5s 兜底 → endEagleConfirm 转下一回合。
     */
    public beginEagleChallenge(): void {
        const m = this._mag;
        if (m.phase !== MatchPhase.EAGLE_CONFIRM) return;
        m.phase = MatchPhase.EAGLE_CHALLENGE;
        this._lastCountdownNum = 6;
        Timer.start(Rule.EAGLE_KEY);  // 重计 5s(确认期已耗部分作废)
        m.onCountdown?.(5, 3);
        m.onStateChange?.();
    }

    /**
     * 结束鹰眼确认/挑战阶段(回放结束后 badm 调 / 两阶段超时兜底):
     * 权威端转下一回合; PVP 非权威端轻转本地 phase(重置由权威端 state 帧同步驱动)。
     */
    public endEagleConfirm(): void {
        const m = this._mag;
        if (m.phase !== MatchPhase.EAGLE_CONFIRM && m.phase !== MatchPhase.EAGLE_CHALLENGE) return;
        this.closeEagleWindow();
        const tp = this._eagleTeleport;
        this._eagleTeleport = false;
        if (m.isPvpMode && !m.isAuthoritative) {
            m.phase = MatchPhase.COUNTDOWN;
            return;
        }
        this._beginNextRound(tp);
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
        const elapsed = this._elapsed(Rule.COUNTDOWN_KEY);
        const remainingMs = Math.max(0, m.cfg.countdownDuration - elapsed);
        const remainingSeconds = Math.ceil(remainingMs / 1000);

        // 准备阶段(用户规格): 全程无人持球(分球挪到本阶段结束), 每秒广播倒计时(3s 起红)
        if (remainingSeconds >= 0 && remainingSeconds < this._lastCountdownNum) {
            this._lastCountdownNum = remainingSeconds;
            m.onCountdown?.(remainingSeconds, 3);
        }
        if (remainingMs <= 0) {
            // 准备结束 → 分配球权(此时才有人持球) + 启动发球计时 → 转发球阶段
            m.isBallAssigned = true;
            this._assignBall();
            Timer.start(Rule.SERVE_KEY);
            this._lastCountdownNum = Math.ceil(m.cfg.serveTimeLimit / 1000) + 1;
            m.phase = MatchPhase.SERVING;
            m.onCountdown?.(0, 3);
            m.onStateChange?.();
            // 发球阶段开始(用户规格: 鹰眼记录每次发球阶段才清——旧回合记录作废,
            // 死球期乱飞的轨迹没清也不会覆盖正式记录)
            m.onServeStart?.();
        }
    }

    private _updateServing(): void {
        const m = this._mag;
        // 发球阶段倒计时广播(用户规格: 10s 发球, 5s 起红字)
        const remainMs = Math.max(0, m.cfg.serveTimeLimit - this._elapsed(Rule.SERVE_KEY));
        const sec = Math.ceil(remainMs / 1000);
        if (sec < this._lastCountdownNum) {
            this._lastCountdownNum = sec;
            m.onCountdown?.(sec, 5);
        }
        if (remainMs <= 0) {
            this.score(m.servingTeam === TeamSide.LEFT ? TeamSide.RIGHT : TeamSide.LEFT, "发球超时");
        }
    }

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
        }else{
            //if(!/超时/.test(String(reason ?? '')))
            
        }
        this._offerEagleChallenge()
        // 鹰眼确认阶段(用户规格: 结算后正式计时阶段, 只设 3 秒)——有回放记录才进,
        // 期间双击进回放(ball.playing 时计时挂起), 超时/回放结束 → _beginNextRound 转回合;
        // 无记录跳过确认阶段直接转回合(旧 _offerEagleChallenge 窗口机制废除, 阶段化取代)
        if (m.ball && m.ball.hasTrack() && !m.matchEnded) {
            m.phase = MatchPhase.EAGLE_CONFIRM;
            this._eagleTeleport = needTeleport;  // 换边传送暂存(确认期结束转段时消费)
            Timer.start(Rule.EAGLE_KEY);
            this._lastCountdownNum = 4;
            this._eagleWinOpen = true;  // 窗口提示开(closeEagleWindow 幂等关)
            m.onEagleChallengeWindow?.(true);
            m.onCountdown?.(3, 3);
            m.onStateChange?.();
            return;
        }
        this._beginNextRound(needTeleport);
    }

    /** 换边传送暂存(进 EAGLE_CONFIRM 时存, 转段时消费) */
    private _eagleTeleport = false;

    /**
     * 转入下一回合(COUNTDOWN 准备期): 鹰眼确认阶段结束(超时/回放结束 endEagleConfirm)或
     * 无记录跳过时调用——原 score 内联的回合重置段整体迁此(球权/持球/计时/换边传送)。
     */
    private _beginNextRound(needTeleport: boolean = false): void {
        const m = this._mag;
        m.phase = MatchPhase.COUNTDOWN;
        m.isBallAssigned = false;
        this._lastCountdownNum = 5;
        m.lastHitCha = null;
        m.isServeShot = false;
        m.currentHitTeam = m.servingTeam;
        this._resetBallForServe();
        this.closeEagleWindow();
        this._updateServerAndReceiver();
        if (needTeleport) this._forceTeleportAll();
        Timer.start(Rule.COUNTDOWN_KEY);
        m.onCountdown?.(5, 3);
        m.onStateChange?.();

    }

    // ---------- 私有辅助 ----------

    /**
     * 回合重置立即复位物理球(不等 ballAssignDelay): 击球判罚引发的 resetMatch 窗口期,
     * phy.isCalc 仍 true(球按残态物理飞)+isP 全 false(跟随断)——立即关模拟+清持球权,
     * 球由 mag._updateBallHolding 兜底钉回发球员(isP 空窗自动钉 currentServer)。
     */
    private _resetBallForServe(): void {
        const m = this._mag;
        if (!m.ball) return;
        m.authBallHolderId = -1;
        m.ball.halt();
        // 熄火只走 Ball 的公开面: 内核开关与命中记录只有它自己能动。
        // (这里原来直接写 phy.isCalc/isSleeping 再 clearNetHit/clearGroundHit——
        //  "谁都能改物理"正是联机两端各改各的的入口)
    }

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
            // 权威端自己也要记这份持球口径: 非权威端是从状态帧里读的, 权威端不写就一直是 -1,
            // 于是「谁持球」这个判定在两端不等价 → 发球阶段一端钉回手上、另一端还躺在地上
            m.authBallHolderId = server.id;
            m.ball.halt();
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
