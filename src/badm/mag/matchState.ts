/**
 * matchState — 比赛状态与规则类型的唯一定义处。
 *
 * 所有权：
 * - Mag 持有 MatchState 实例（对象/生命周期编排）；
 * - Rule 是 MatchState 的唯一状态机推进者（阶段/比分/发球权/局数）；
 * - PVP.applyState 是远端权威状态的唯一覆盖入口；badm/UI/物理层只读。
 *
 * 这里只放纯数据与枚举，不放 Cha/Ball/网络引用——那些属于 Mag/PVP。
 */

/** 比赛模式：单打 / 双打 */
export enum MatchMode {
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
    /** 鹰眼挑战阶段(双击确认后进入, 5 秒回放阶段) */
    EAGLE_CHALLENGE = 7
}

/** 队伍边：左队 / 右队(场地边标，换边时队伍会交换边标) */
export enum TeamSide {
    LEFT = -1,
    RIGHT = 1
}

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

/**
 * 比赛共享状态。
 * gamesWon 的键是【当前场地边】，换边时必须随队伍交换——它记录的是队伍赢了几局，
 * 不能因为队伍换到另一边就把冠军判给对面。
 */
export class MatchState {
    phase: MatchPhase = MatchPhase.WAITING_START;
    scores: Record<TeamSide, number> = { [TeamSide.LEFT]: 0, [TeamSide.RIGHT]: 0 };
    servingTeam: TeamSide = TeamSide.LEFT;
    currentHitTeam: TeamSide = TeamSide.RIGHT;
    gamesWon: Record<TeamSide, number> = { [TeamSide.LEFT]: 0, [TeamSide.RIGHT]: 0 };
    gameEnded = false;
    matchEnded = false;
    isBallAssigned = false;
    isServeShot = false;
    lastScoreReason = "";

    /** 一局开始时清零本局比分(局数不清) */
    resetGameScores(): void {
        this.scores[TeamSide.LEFT] = 0;
        this.scores[TeamSide.RIGHT] = 0;
    }

    /** 整场开始时清零全部计分状态 */
    resetMatch(): void {
        this.phase = MatchPhase.COUNTDOWN;
        this.resetGameScores();
        this.gamesWon[TeamSide.LEFT] = 0;
        this.gamesWon[TeamSide.RIGHT] = 0;
        this.servingTeam = TeamSide.LEFT;
        this.gameEnded = false;
        this.matchEnded = false;
        this.isBallAssigned = false;
        this.isServeShot = false;
        this.lastScoreReason = "";
    }
}
