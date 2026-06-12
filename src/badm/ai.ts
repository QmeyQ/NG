import { Cha, ChaState } from "./cha";
import { Ball } from "./ball";
import { Match, MatchState, Player } from "./match";
import { Timer } from "../libs/time";

export enum AIDifficulty {
    EASY = 0.3,
    NORMAL = 0.5,
    HARD = 0.8,
    EXPERT = 0.95
}

export class AIControl {
    private cha: Cha;
    private ball: Ball;
    private match: Match;

    public difficulty: number = 0.5;
    private homePos: Laya.Vector3 = new Laya.Vector3();

    private isReacting: boolean = false;
    private targetPos: Laya.Vector3 = new Laya.Vector3();
    private _serveTimerId: string | null = null;
    private _hitTimerId: string | null = null;

    private _moveThreshold: number = 0.3;
    private _missChance: number = 0;
    private _angleNoise: number = 0;
    private _reactionBaseMs: number = 0;

    constructor(cha: Cha, ball: Ball, match: Match, difficulty?: number) {
        this.cha = cha;
        this.ball = ball;
        this.match = match;
        if (difficulty !== undefined) this.difficulty = difficulty;

        this.homePos.setValue(3, 0, 0);
        this._applyDifficulty();
    }

    private _applyDifficulty(): void {
        const d = this.difficulty;
        this._reactionBaseMs = 600 - d * 400;
        this._missChance = (1 - d) * 0.15;
        this._angleNoise = (1 - d) * 30;
        this._moveThreshold = 0.2 + (1 - d) * 0.5;
    }

    public setDifficulty(d: number): void {
        this.difficulty = Math.max(0, Math.min(1, d));
        this._applyDifficulty();
    }

    public update(): void {
        if (this.match.state === MatchState.SERVING && this.match.currentServer?.id === this.cha.id) {
            this.handleServe();
            return;
        }

        if (this.match.state === MatchState.IDLE) {
            this.moveTo(this.homePos);
            return;
        }

        if (this.match.state !== MatchState.PLAYING) return;

        if (this.match.lastHitter?.id === this.cha.id) {
            this.moveTo(this.homePos);
            return;
        }

        this.chaseBall();
        this.tryHit();
    }

    private handleServe(): void {
        if (this.isReacting) return;
        this.isReacting = true;

        const delay = this._reactionBaseMs + 400 + Math.random() * 300;
        this._serveTimerId = Timer.setTimeout(delay, () => {
            this._serveTimerId = null;
            if (this.match.state !== MatchState.SERVING) {
                this.isReacting = false;
                return;
            }

            // angH: 0=正Z, 90=正X, 270=负X
            // AI在右侧(X>0)，往左侧(X<0)打 → angH ≈ 270
            const serveParams = {
                power: 50 + this.difficulty * 30 + Math.random() * 10,
                angH: 270 + (Math.random() - 0.5) * 20,
                angV: 30 + Math.random() * 20
            };

            this.match.recordHit(this.match.currentServer!, { x: this.cha.x, z: this.cha.z });
            this.cha.hit(serveParams, this.ball);

            this._hitTimerId = Timer.setTimeout(200 + Math.random() * 200, () => {
                this._hitTimerId = null;
                if (this.cha.state === ChaState.HIT_WINDUP) {
                    this.cha.hit(undefined);
                }
                this.isReacting = false;
            });
        });
    }

    private chaseBall(): void {
        const ballVel = this.ball.phy.state.vel;
        const ballX = this.ball.x;
        const ballZ = this.ball.z;
        const ballY = this.ball.y;

        const ballInAIHalf = ballX > 0;
        const ballMovingToAI = ballVel.x > 0;

        if (ballMovingToAI || (ballInAIHalf && ballY < 3)) {
            const pred = this._predictLandPos(ballX, ballY, ballZ, ballVel.x, ballVel.y, ballVel.z);
            let predX = pred.x;
            let predZ = pred.z;

            if (predX < 0.3) predX = 0.3;
            if (predX > 6.5) predX = 6.5;

            const halfWidth = this.match.court.width / 2;
            if (Math.abs(predZ) > halfWidth) {
                predZ = Math.sign(predZ) * halfWidth * 0.8;
            }

            this.targetPos.x = predX;
            this.targetPos.y = 0;
            this.targetPos.z = predZ;
        } else {
            this.targetPos.x = this.homePos.x;
            this.targetPos.y = 0;
            this.targetPos.z = ballZ * 0.3;
        }

        this.moveTo(this.targetPos);
    }

    private _predictLandTime(ballY: number, ballVelY: number): number {
        if (ballVelY < -0.1 && ballY > 0.1) {
            const g = 9.8;
            const disc = ballVelY * ballVelY + 2 * g * ballY;
            if (disc >= 0) {
                const t = (-ballVelY + Math.sqrt(disc)) / g;
                return Math.max(0.1, t);
            }
            return ballY / Math.abs(ballVelY);
        } else if (ballVelY >= 0 && ballY > 0.1) {
            const g = 9.8;
            const tUp = ballVelY / g;
            const hPeak = ballY + ballVelY * tUp - 0.5 * g * tUp * tUp;
            if (hPeak > 0) {
                const tDown = Math.sqrt(2 * hPeak / g);
                return tUp + tDown;
            }
            return 1.0;
        }
        return 0.5;
    }

    private _predictLandPos(ballX: number, ballY: number, ballZ: number, velX: number, velY: number, velZ: number): { x: number, z: number, t: number } {
        let px = ballX, py = ballY, pz = ballZ;
        let vx = velX, vy = velY, vz = velZ;
        const dt = 0.016;
        const g = 9.8;
        const dragK = 0.214;
        let t = 0;

        for (let i = 0; i < 200 && py > 0.01; i++) {
            const v = Math.sqrt(vx * vx + vy * vy + vz * vz);
            if (v > 0.01) {
                const drag = dragK * v * v;
                const invV = 1 / v;
                vx -= vx * invV * drag * dt;
                vy -= (g + vy * invV * drag) * dt;
                vz -= vz * invV * drag * dt;
            } else {
                vy -= g * dt;
            }
            px += vx * dt;
            py += vy * dt;
            pz += vz * dt;
            t += dt;
        }

        return { x: px, z: pz, t: Math.max(0.1, t) };
    }

    private moveTo(target: Laya.Vector3): void {
        const dx = target.x - this.cha.x;
        const dz = target.z - this.cha.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > this._moveThreshold) {
            // cha.move约定: angle=0→正Z, 90→正X, 和atan2(dx,dz)一致
            const angle = Math.atan2(dx, dz) * 180 / Math.PI;
            let normAngle = (angle + 360) % 360;
            const urgency = Math.min(1, dist / 2);
            this.cha.move(normAngle, urgency);
        } else {
            this.cha.move(0, 0);
        }
    }

    private tryHit(): void {
        if (this.cha.state === ChaState.HIT_WINDUP) return;
        if (this.cha.state === ChaState.HIT_RECOVERY) return;

        const dx = this.ball.x - this.cha.x;
        const dy = this.ball.y - this.cha.y;
        const dz = this.ball.z - this.cha.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < this.cha.hitRange) {
            if (Math.random() < this._missChance) {
                return;
            }

            const hitParams = this._chooseStroke(dx, dy, dz, dist);

            this.match.recordHit({ id: this.cha.id, team: 'B', side: 'right' }, { x: this.cha.x, z: this.cha.z });
            this.cha.hit(hitParams, this.ball);

            this._hitTimerId = Timer.setTimeout(80 + Math.random() * 120, () => {
                this._hitTimerId = null;
                if (this.cha.state === ChaState.HIT_WINDUP) {
                    this.cha.hit(undefined);
                }
            });
        }
    }

    private _chooseStroke(dx: number, dy: number, dz: number, dist: number): { power: number; angH: number; angV: number } {
        const courtWidth = this.match.court.width;

        let hitPower: number;
        let hitAngH: number;
        let hitAngV: number;

        const targetX = -2 - Math.random() * 4;
        let targetZ: number;

        const dirRoll = Math.random();

        if (dirRoll < 0.35) {
            targetZ = -Math.sign(dz) * courtWidth * 0.35;
        } else if (dirRoll < 0.65) {
            targetZ = Math.sign(dz) * courtWidth * 0.35;
        } else {
            targetZ = (Math.random() - 0.5) * courtWidth * 0.4;
        }

        const dirX = targetX - this.cha.x;
        const dirZ = targetZ - this.cha.z;
        const angleToTarget = Math.atan2(dirX, dirZ) * 180 / Math.PI;
        hitAngH = ((angleToTarget + 360) % 360) + (Math.random() - 0.5) * this._angleNoise;

        const typeRoll = Math.random();

        if (dy > 1.5) {
            hitPower = 90 + this.difficulty * 15;
            hitAngV = -15 - Math.random() * 15;
        } else if (dy < -0.3) {
            hitPower = 55 + this.difficulty * 20;
            hitAngV = 35 + Math.random() * 15;
        } else if (typeRoll < 0.4) {
            hitPower = 80 + this.difficulty * 15;
            hitAngV = 5 + Math.random() * 10;
        } else {
            hitPower = 65 + this.difficulty * 25;
            hitAngV = 25 + Math.random() * 20;
        }

        hitPower += (Math.random() - 0.5) * this._angleNoise * 0.5;

        return {
            power: Math.max(30, Math.min(120, hitPower)),
            angH: hitAngH,
            angV: hitAngV
        };
    }

    public destroy(): void {
        if (this._serveTimerId) Timer.clear(this._serveTimerId);
        if (this._hitTimerId) Timer.clear(this._hitTimerId);
        this._serveTimerId = null;
        this._hitTimerId = null;
    }
}
