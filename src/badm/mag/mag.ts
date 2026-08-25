/**
 * Mag - 比赛管理抽象基类，持有所有共享状态（球、选手列表、比分、发球权、场地配置、比赛阶段）
 * Rule 通过引用操作这些状态，PVP/PVE 子类通过继承扩展同步逻辑
 */
import { Cha } from "../cha";
import { Ball } from "../ball";
import { Rule, MatchMode, MatchPhase, TeamSide, CourtCfg, MatchCfg } from "./rule";
export { MatchMode, MatchPhase, TeamSide, CourtCfg, MatchCfg };

/**
 * Mag - 比赛管理基类
 * 持有所有共享状态，Rule 通过引用操作这些状态
 * 子类（PVP/PVE）通过 this.xxx 直接访问
 */
export abstract class Mag {
    // ---------- 核心对象 ----------
    public ball: Ball;
    public players: Cha[] = [];
    public rule: Rule;

    // ---------- 比赛状态 ----------
    public phase: MatchPhase = MatchPhase.WAITING_START;
    public scores: Record<TeamSide, number> = { [TeamSide.LEFT]: 0, [TeamSide.RIGHT]: 0 };
    public servingTeam: TeamSide = TeamSide.LEFT;
    public currentHitTeam: TeamSide = TeamSide.RIGHT;
    public gamesWon: Record<TeamSide, number> = { [TeamSide.LEFT]: 0, [TeamSide.RIGHT]: 0 };
    public gameEnded: boolean = false;
    public matchEnded: boolean = false;

    // ---------- 球员/场地 ----------
    public teamMap: Map<Cha, TeamSide> = new Map();
    public court: CourtCfg;
    public cfg: MatchCfg;
    public currentServer: Cha | null = null;
    public currentReceiver: Cha | null = null;
    public mode: MatchMode;
    public isSingle: boolean = false;

    // ---------- 内部状态（子类需访问） ----------
    public isBallAssigned: boolean = false;
    public isServeShot: boolean = false;
    public lastHitCha: Cha | null = null;
    public lastScoreReason: string = "";
    public countdownStartTime: number = 0;
    public serveStartTime: number = 0;
    public isAuthoritative: boolean = true;

    // ---------- 回调 ----------
    public onScoreChanged?: (l: number, r: number) => void;
    public onGameEnded?: (winner: TeamSide) => void;
    public onMatchEnded?: (winner: TeamSide) => void;
    public onSideSwitch?: () => void;
    public onCountdown?: (count: number) => void;
    public onStateChange?: () => void;
    public onTeleport?: () => void;
    public onHit?: () => void;

    constructor(p1: Laya.Sprite3D, ball: Ball, isSingle: boolean = false) {
        this.ball = ball;
        this.isSingle = isSingle;
        this._initPlayers(p1);
        this.mode = this.players.length === 2 ? MatchMode.SINGLE : MatchMode.DOUBLE;
        this.court = this.mode === MatchMode.SINGLE
            ? { halfLength: 6.7, halfWidth: 2.59, serveLineX: 1.98, serveHalfZ: 2.59 }
            : { halfLength: 6.7, halfWidth: 3.05, serveLineX: 1.98, serveHalfZ: 1.525 };
        this.cfg = { maxScore: 21, bestOf: 3, serveTimeLimit: 15000, countdownDuration: 15000, ballAssignDelay: 5000 };
        this._initTeams();

        // Rule 接收 Mag 引用，自治操作所有状态
        this.rule = new Rule(this);
    }

    private _initPlayers(p1: Laya.Sprite3D): void {
        const scene3D = p1.parent as Laya.Sprite3D;
        const charNodes: Laya.Sprite3D[] = [p1];
        const cloneCount = (this.isSingle ? 2 : 4) - 1;
        for (let i = 0; i < cloneCount; i++) {
            const clone = p1.clone() as Laya.Sprite3D;
            scene3D.addChild(clone);
            charNodes.push(clone);
        }

        const cha1 = new Cha(p1, undefined, this.ball);
        cha1.id = 0;
        cha1.odd = false;
        this.players.push(cha1);

        if (this.isSingle) {
            const cha3 = new Cha(charNodes[1], undefined, this.ball);
            cha3.id = 2;
            cha3.odd = false;
            this.players.push(cha3);
        } else {
            const cha2 = new Cha(charNodes[1], undefined, this.ball);
            cha2.id = 1;
            cha2.odd = true;
            const cha3 = new Cha(charNodes[2], undefined, this.ball);
            cha3.id = 2;
            cha3.odd = false;
            const cha4 = new Cha(charNodes[3], undefined, this.ball);
            cha4.id = 3;
            cha4.odd = true;
            this.players.push(cha2, cha3, cha4);
        }

        const dressCfg = {
            meshs:
            {
                body: ["nor@girl/lm/body.lm", "nor@girl/lmat/Body_Unlit.002.lmat"],
                shirt: ["nor@girl/lm/shirt.lm", "nor@girl/lmat/Sailor_White.002.lmat"],
                hair: ["nor@girl/lm/hair.lm", "nor@girl/lmat/Hair_black.002.lmat"],
                face: ["nor@girl/lm/face.lm", "nor@girl/lmat/Face_Tooth.002.lmat"],
                shoes: ["nor@girl/lm/shoes.lm", "nor@girl/lmat/Cloth_Black.001.lmat"],
                shorts: ["nor@girl/lm/shorts.lm", "nor@girl/lmat/Cloth_Denim.002.lmat"]
            },
            mats:
            {
                "Body_Unlit.002": "nor@girl/lmat/Body_Unlit.002.lmat",
                "Hair_black.002": "nor@girl/lmat/Hair_black.002.lmat",
                "Sailor_White": "nor@girl/lmat/Sailor_White.002.lmat",
                "Face_Tooth.002": "nor@girl/lmat/Face_Tooth.002.lmat",
                "Cloth_Denim.002": "nor@girl/lmat/Cloth_Denim.002.lmat",
                "Cloth_Black.001": "nor@girl/lmat/Cloth_Black.001.lmat",
            },
            clips:
            {
                "idle": "nor@girl/lani/stand.lani",
                "up": "nor@girl/lani/up.lani",
                "up_right": "nor@girl/lani/up.lani",
                "right": "nor@girl/lani/right.lani",
                "down_right": "nor@girl/lani/right.lani",
                "down": "nor@girl/lani/back.lani",
                "down_left": "nor@girl/lani/left.lani",
                "left": "nor@girl/lani/left.lani",
                "up_left": "nor@girl/lani/up.lani",
                "hit_normal": "nor@girl/lani/flathit.lani",
                "low_hit": "nor@girl/lani/flathit.lani",
                "@diving": "nor@girl/lani/diving.lani"
            }
        };
        for (const cha of this.players) cha.setDress(dressCfg);
    }

    private _initTeams(): void {
        if (this.mode === MatchMode.SINGLE) {
            this.teamMap.set(this.players[0], TeamSide.LEFT);
            this.teamMap.set(this.players[1], TeamSide.RIGHT);
            this.players[0].side = -1;
            this.players[1].side = 1;
        } else {
            this.teamMap.set(this.players[0], TeamSide.LEFT);
            this.teamMap.set(this.players[1], TeamSide.LEFT);
            this.teamMap.set(this.players[2], TeamSide.RIGHT);
            this.teamMap.set(this.players[3], TeamSide.RIGHT);
            this.players[0].side = -1;
            this.players[1].side = -1;
            this.players[2].side = 1;
            this.players[3].side = 1;
        }
    }

    // ---------- 公开方法 ----------
    public startMatch(): void { this.rule.initMatch(); }
    public update(): void { this.rule.update(); }

    // ---------- 子类可覆写的钩子 ----------
    protected _onStateChanged(): void { this.onStateChange?.(); }

    // ---------- 辅助查询 ----------
    public getTeam(cha: Cha): TeamSide | undefined { return this.teamMap.get(cha); }
    public getTeamPlayers(team: TeamSide): Cha[] { return this.players.filter(p => this.teamMap.get(p) === team); }
    public isServer(cha: Cha): boolean { return cha === this.currentServer; }
    public isReceiver(cha: Cha): boolean { return cha === this.currentReceiver; }
    public checkServePosition(hitter: Cha): boolean { return this.rule.checkServePosition(hitter); }
    public getPlayerServePosition(cha: Cha): { x: number, y: number, z: number } { return this.rule.getPlayerServePosition(cha); }

    // ---------- 比分显示信息 ----------
    public getDisplayInfo(): { left: number, right: number, status: string, reason: string } {
        let status = '';
        let reason = '';
        if (this.phase === MatchPhase.COUNTDOWN) {
            if (!this.isBallAssigned) {
                status = 'ready';
                reason = this.lastScoreReason || '请准备';
            } else {
                status = 'serving';
            }
        } else if (this.phase === MatchPhase.SERVING) {
            status = 'serving';
        }
        return { left: this.scores[TeamSide.LEFT], right: this.scores[TeamSide.RIGHT], status, reason };
    }
}
