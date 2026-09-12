/**
 * PVE - 单机/AI 模式比赛管理器，继承 Mag
 * 无网络同步，始终作为权威端（isAuthoritative = true）
 * 负责装配和管理 AI 控制器列表，每帧驱动非本地角色的 AI 更新
 */
import { Mag, MatchPhase, TeamSide, CourtCfg, MatchMode } from "./mag";
export { MatchPhase, TeamSide, CourtCfg, MatchMode };
import { Ball } from "../obj/ball";
import { AIControl, AIDifficulty } from "../NPC/ai";
import { Cha } from "../obj/cha";

export class PVE extends Mag {
    /** AI 控制器列表，每个非本地角色对应一个 AIControl */
    private _aiList: AIControl[] = [];
    /** 本地玩家控制的角色 */
    private _localCha: Cha | null = null;

    constructor(p1: Laya.Sprite3D, ball: Ball, isSingle: boolean = false) {
        super(p1, ball, isSingle);
    }

    // ---------- AI 管理 ----------
    public addAI(ai: AIControl): void {
        if (this._aiList.indexOf(ai) < 0) this._aiList.push(ai);
    }
    public removeAI(ai: AIControl): void {
        const i = this._aiList.indexOf(ai);
        if (i >= 0) this._aiList.splice(i, 1);
    }
    public clearAIs(): void { this._aiList.length = 0; }
    public get aiList(): AIControl[] { return this._aiList; }

    public setLocalCha(cha: Cha): void { this._localCha = cha; }
    public get localCha(): Cha | null { return this._localCha; }

    /** 单机默认装配：把所有非本地角色挂上 AI */
    public setupDefaultAI(ball: Ball, difficulty: AIDifficulty = AIDifficulty.NORMAL): void {
        if (!this._localCha) { console.warn("[PVE] setupDefaultAI 前请先 setLocalCha"); return; }
        for (const cha of this.players) {
            if (cha === this._localCha) continue;
            if (this._aiList.some(a => (a as any).cha === cha)) continue;
            this.addAI(new AIControl(cha, ball, this, difficulty));
        }
    }

        /**
     * 获取发球目标点（供 AI 发球决策使用）
     * 目标位于对方接发球区的对角位置，遵循羽毛球发球规则：
     * - 根据发球方得分奇偶性决定左右发球区
     * - 落点在对角线方向
     * @returns {x, z} 目标坐标
     */
    public getServeTarget(): { x: number, z: number } {
        const r = this.rule;   // Rule 实例，包含所有比赛状态
        const recvTeam = this.servingTeam === TeamSide.LEFT ? TeamSide.RIGHT : TeamSide.LEFT;
        const isSrvEven = this.scores[this.servingTeam] % 2 === 0;
        const rcvSign = recvTeam === TeamSide.LEFT ? 1 : -1;
        const zSign = (isSrvEven ? 1 : -1) * rcvSign;
        const x = recvTeam === TeamSide.LEFT ? this.court.halfLength * -0.6 : this.court.halfLength * 0.6;
        return { x, z: zSign * 0.5 };
    }

    // ---------- 覆写 update：驱动 AI ----------
    public update(): void {
        super.update();
        for (const ai of this._aiList) ai.update();
    }

    // ---------- 清理 ----------
    public destroy(): void {
        this._aiList.length = 0;
        this._localCha = null;
    }
}
