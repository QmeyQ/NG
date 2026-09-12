/**
 * Mag - 比赛管理抽象基类，持有所有共享状态（球、选手列表、比分、发球权、场地配置、比赛阶段）
 * Rule 通过引用操作这些状态，PVP/PVE 子类通过继承扩展同步逻辑
 */
import { Cha, ChaState, StrokeParams } from "../obj/cha";
import { Ball } from "../obj/ball";
import { Rule, MatchMode, MatchPhase, TeamSide, CourtCfg, MatchCfg } from "./rule";
import { Timer } from "../../libs/time";
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

    /** 击球状态表：每个角色的待执行击球参数和球位置 */
    private _hitStates: Map<Cha, { stroke: StrokeParams, ballPos: Laya.Vector3 | null, recoveryDuration: number, compensating: boolean, lastDist: number, animName: string }> = new Map();

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

        const cha1 = new Cha(p1, undefined);
        cha1.id = 0;
        cha1.odd = false;
        this.players.push(cha1);

        if (this.isSingle) {
            const cha3 = new Cha(charNodes[1], undefined);
            cha3.id = 2;
            cha3.odd = false;
            this.players.push(cha3);
        } else {
            const cha2 = new Cha(charNodes[1], undefined);
            cha2.id = 1;
            cha2.odd = true;
            const cha3 = new Cha(charNodes[2], undefined);
            cha3.id = 2;
            cha3.odd = false;
            const cha4 = new Cha(charNodes[3], undefined);
            cha4.id = 3;
            cha4.odd = true;
            this.players.push(cha2, cha3, cha4);
        }

        const dressCfg = {
            meshs:
            {
                body: ["nor@girl/lm/body.lm", "nor@girl/lmat/body.lmat"],
                shirt: ["nor@girl/lm/shirt.lm", "nor@girl/lmat/hair.lmat"],
                hair: ["nor@girl/lm/hair.lm", "nor@girl/lmat/hair.lmat"],
                racket: ["nor@girl/lm/racket.lm", "nor@girl/lmat/racket.lmat"],
                shoes: ["nor@girl/lm/shoes.lm", "nor@girl/lmat/shoes.lmat"],
                shorts: ["nor@girl/lm/shorts.lm", "nor@girl/lmat/shorts.lmat"]
            },
            tex:
            {
                "body.lmat": ["nor@girl/tex/body.png"],
                "shirt.lmat": ["nor@girl/tex/hair.jpg"],
                "hair.lmat": ["nor@girl/tex/hair.jpg"],
                "racket.lmat": ["nor@girl/tex/racket.png"],
                "shoes.lmat": ["nor@girl/tex/hair.jpg"],
                "shorts.lmat": ["nor@girl/tex/hair.jpg"]
            },
            clips:
            {
                "stand": "nor@girl/lani/stand.lani",
                "up": "nor@girl/lani/up.lani",
                "up_right": "nor@girl/lani/up.lani",
                "right": "nor@girl/lani/right.lani",
                "down_right": "nor@girl/lani/right.lani",
                "down": "nor@girl/lani/down.lani",
                "down_left": "nor@girl/lani/left.lani",
                "left": "nor@girl/lani/left.lani",
                "up_left": "nor@girl/lani/up.lani",
                "hit_normal": "nor@girl/lani/flathit.lani",
                "low_hit": "nor@girl/lani/flathit.lani",
                "@diving": "nor@girl/lani/diving.lani"
            }
        };
        for (const cha of this.players) {
            cha.setDress(dressCfg)
        }
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
    public update(): void {
        this.rule.update();
        this._updateBallHolding();
        this._updateHitStates();
    }

    /** 持球跟随：每帧将球位置同步到持球角色的骨骼世界坐标 */
    private _updateBallHolding(): void {
        for (const cha of this.players) {
            if (!cha.isP) continue;
            const holderNode = cha.ballHolderNode;
            if (holderNode) {
                const wm = holderNode.transform.worldMatrix;
                this.ball.pos = new Laya.Vector3(wm.elements[12], wm.elements[13], wm.elements[14]);
            } else {
                const dir = cha.x > 0 ? -1 : 1;
                this.ball.pos = new Laya.Vector3(cha.x + 0.5 * dir, 1.0, cha.z);
            }
        }
    }

    /** 推进所有角色的击球状态机（位置补偿→前摇→等待击球→后摇→恢复） */
    private _updateHitStates(): void {
        for (const cha of this.players) {
            const state = this._hitStates.get(cha);
            if (state && state.compensating && state.ballPos) {
                const bp = state.ballPos;
                const distXZ = Math.sqrt((cha.x - bp.x) ** 2 + (cha.z - bp.z) ** 2);
                if (distXZ <= cha.hitRange || distXZ > state.lastDist) {
                    cha.move(-1, 0);
                    cha.compMoving = false;
                    state.compensating = false;
                    if (cha.state === ChaState.HIT_WINDUP) {
                        cha.freezeAnim();
                    } else if (cha.state === ChaState.IDLE) {
                        cha.playAnim('stand', 0.1);
                        this._hitStates.delete(cha);
                    }
                } else {
                    state.lastDist = distXZ;
                    const dx = bp.x - cha.x;
                    const dz = bp.z - cha.z;
                    const worldDir = new Laya.Vector3(dx, 0, dz);
                    Laya.Vector3.normalize(worldDir, worldDir);
                    const invQuat = new Laya.Quaternion();
                    Laya.Quaternion.invert(cha.root.transform.rotation, invQuat);
                    const localDir = new Laya.Vector3();
                    Laya.Vector3.transformQuat(worldDir, invQuat, localDir);
                    const outAngle = (Math.atan2(localDir.z, -localDir.x) * 180 / Math.PI + 360) % 360;
                    const maxDist = cha.hitRange * 2;
                    const dynPower = Math.max(0.1, Math.min(distXZ / maxDist, 1.0));
                    cha.move(outAngle, dynPower);
                }
            }
            if (cha.state === ChaState.HIT_WINDUP) {
                if (state) {
                    const curBallPos = new Laya.Vector3(this.ball.x, this.ball.y, this.ball.z);
                    state.ballPos = curBallPos;
                    const newAnim = this._selectHitAnim(cha, curBallPos);
                    if (newAnim !== state.animName) {
                        state.animName = newAnim;
                        cha.unfreezeAnim();
                        cha.playAnim(newAnim, 0.05);
                        const isDiveOrJump = newAnim === 'diving' || newAnim === 'lefthit';
                        const dXZ = Math.sqrt((cha.x - curBallPos.x) ** 2 + (cha.z - curBallPos.z) ** 2);
                        if (isDiveOrJump && dXZ <= cha.hitRange * 2 && !state.compensating) {
                            state.compensating = true;
                            state.lastDist = dXZ;
                            cha.compMoving = true;
                        } else if (!isDiveOrJump && state.compensating) {
                            state.compensating = false;
                            cha.compMoving = false;
                            cha.move(-1, 0);
                        }
                    }
                }
                if (Timer.invoke(`windup_${cha.id}`) >= 2000) {
                    this._executeHit(cha);
                } else if (Timer.invoke(`windup_${cha.id}`) >= cha.upTime * 200) {
                    cha.freezeAnim();
                }
            } else if (cha.state === ChaState.HIT_RECOVERY) {
                const recTime = Timer.invoke(`recovery_${cha.id}`);
                if (state && recTime >= state.recoveryDuration) {
                    cha.state = ChaState.IDLE;
                    if (!state.compensating) {
                        cha.playAnim('stand', 0.1);
                        this._hitStates.delete(cha);
                    }
                }
            }
        }
    }

    /** 执行击球：判定距离，调用 ball.hit()，进入后摇 */
    private _executeHit(cha: Cha): void {
        const state = this._hitStates.get(cha);
        if (!state) return;
        cha.isP = false;
        const recoveryDuration = cha.upTime * 400;
        const bp = state.ballPos;
        const dist = bp ? Laya.Vector3.distance(new Laya.Vector3(bp.x, bp.y, bp.z), cha.pos) : -1;
        console.log(`%c[Mag] _executeHit chaId=${cha.id} 击球执行!
  球位置=${bp ? `(${bp.x.toFixed(2)},${bp.y.toFixed(2)},${bp.z.toFixed(2)})` : 'null'} Cha位置=(${cha.x.toFixed(2)},${cha.y.toFixed(2)},${cha.z.toFixed(2)}) 
  球距离=${dist.toFixed(2)} angV=${state.stroke.angV.toFixed(2)} power=${state.stroke.power.toFixed(0)} `, "color: #00FF00; font-weight:bold;"
,state.stroke.angH,state.stroke.angV,state.stroke.spi);
        if (dist <= cha.hitRange) {
            this.ball.hit(state.stroke.power, state.stroke.angH, state.stroke.angV, state.stroke.spi, cha.id);
            console.log(`%c[Mag] → ball.hit 成功! chaId=${cha.id}`, "color: #00FF00; font-weight:bold;");
        } else {
            console.log(`%c[Mag] → 距离太远未击球! chaId=${cha.id} dist=${dist.toFixed(2)} > ${cha.hitRange}`, "color: #FF0000; font-weight:bold;");
        }
        state.recoveryDuration = recoveryDuration;
        const animName = this._selectHitAnim(cha, state.ballPos);
        state.animName = animName;
        cha.playAnim(animName, 0.05);
        Timer.clear(`windup_${cha.id}`);
        Timer.start(`recovery_${cha.id}`);
        cha.playAnim('hit_recovery', 0.1);
        cha.state = ChaState.HIT_RECOVERY;
        console.log(`%c[Mag] 后摇开始 chaId=${cha.id} HIT_RECOVERY duration=${recoveryDuration.toFixed(0)}ms`, "color: #888888;");
    }

    /** 选择击球动画：根据球高度和距离选择动画 */
    private _selectHitAnim(cha: Cha, ballPos?: Laya.Vector3): string {
        if(cha.isP){
            return "offhit";
        }
        if (!ballPos) return 'flathit';
        const dist = Laya.Vector3.distance(cha.pos, ballPos);
        const h = ballPos.y - cha.y;
        if (h > 1.5) return 'jumphit';
        if (h < -0.5) return 'flathit';
        if (dist > cha.hitRange && ballPos.y <= 1) return 'diving';
        return 'hit_normal';
    }

    /**
     * 击球入口：直接处理击球，管理击球状态机
     * 按 cha.state 分支：IDLE/MOVE 开始前摇，WINDUP 蓄力更新，补偿移动中特殊处理，RECOVERY 忽略
     * @param stroke 击球参数（有值开始蓄力前摇，undefined 即 power=-1 执行击球）
     * @param cha 击球角色
     */
    public hit(stroke: StrokeParams | undefined, cha: Cha): void {
        const state = this._hitStates.get(cha);
        switch (cha.state) {
            case ChaState.IDLE:
                if (!stroke) return;
                this._startWindup(stroke, cha);
                break;
            case ChaState.MOVE:
                if (state && state.compensating) {
                    if (stroke) {
                        state.stroke = stroke;
                    } else {

                        this._executeHit(cha);
                    }
                } else {
                    if (!stroke) return;
                    this._startWindup(stroke, cha);
                }
                break;
            case ChaState.HIT_WINDUP:
                if (stroke) {
                    if (state) state.stroke = stroke;
                } else {
                    this._executeHit(cha);
                }
                break;
        }
    }

    /** 开始前摇：选动画、启动计时器、判定是否需要位置补偿 */
    private _startWindup(stroke: StrokeParams, cha: Cha): void {
        const ballPos = new Laya.Vector3(this.ball.x, this.ball.y, this.ball.z);
        const animName = this._selectHitAnim(cha, ballPos);
        Timer.start(`windup_${cha.id}`);
        cha.playAnim(animName, 0.05);
        cha.state = ChaState.HIT_WINDUP;
        const dXZ = Math.sqrt((cha.x - ballPos.x) ** 2 + (cha.z - ballPos.z) ** 2);
        const isDiveOrJump = animName === 'diving' || animName === 'lefthit';
        const canCompensate = isDiveOrJump && dXZ <= cha.hitRange * 2;
        this._hitStates.set(cha, { stroke, ballPos, recoveryDuration: 0, compensating: canCompensate, lastDist: dXZ, animName });
        if (canCompensate) {
            cha.compMoving = true;
            const dx = ballPos.x - cha.x;
            const dz = ballPos.z - cha.z;
            const worldDir = new Laya.Vector3(dx, 0, dz);
            Laya.Vector3.normalize(worldDir, worldDir);
            const invQuat = new Laya.Quaternion();
            Laya.Quaternion.invert(cha.root.transform.rotation, invQuat);
            const localDir = new Laya.Vector3();
            Laya.Vector3.transformQuat(worldDir, invQuat, localDir);
            const outAngle = (Math.atan2(localDir.z, -localDir.x) * 180 / Math.PI + 360) % 360;
            cha.move(outAngle, 1);
        }
        console.log(`%c[Mag] 前摇开始 chaId=${cha.id} HIT_WINDUP upTime=${cha.upTime} 补偿=${canCompensate}
  球位置=(${ballPos.x.toFixed(2)},${ballPos.y.toFixed(2)},${ballPos.z.toFixed(2)}) Cha位置=(${cha.x.toFixed(2)},${cha.y.toFixed(2)},${cha.z.toFixed(2)}) 球XZ距离=${dXZ.toFixed(2)}`, "color: #FF00FF;");
    }

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
