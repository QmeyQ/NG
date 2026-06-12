// Cha.ts
import { Timer } from "../libs/time";
import { Ani } from "./ani";
import { Ball } from "./ball";
import { Obj } from "./obj";

const DIR_VECTORS: Laya.Vector3[] = [
    new Laya.Vector3(0, 0, 1),
    new Laya.Vector3(0.707, 0, 0.707),
    new Laya.Vector3(1, 0, 0),
    new Laya.Vector3(0.707, 0, -0.707),
    new Laya.Vector3(0, 0, -1),
    new Laya.Vector3(-0.707, 0, -0.707),
    new Laya.Vector3(-1, 0, 0),
    new Laya.Vector3(-0.707, 0, 0.707),
];

const ANIM_NAMES: string[] = [
    'up', 'up_right', 'right', 'down_right',
    'down', 'down_left', 'left', 'up_left'
];

export enum ChaState {
    IDLE = 0,
    MOVE = 1,
    HIT_WINDUP = 2,
    HIT_RECOVERY = 3,
    HIT = 4,
}

export interface ChaAttr {
    id: number;
    side: 'left' | 'right';
    x: number;
    y: number;
    z: number;
    spd: number;
    hitRange: number;
    state: ChaState;
    upTime: number;
}

export interface StrokeParams {
    power: number;
    angH: number;
    angV: number;
    spi: Laya.Vector3;
}

export class Cha extends Obj {
    private _ani: Ani;

    id = 0;
    side = 'r';
    spd = 2;
    hitRange = 2;
    state = ChaState.IDLE;
    power = 700;
    upTime = 1;//前摇/后摇系数

    // 移动相关
    private _moveDir: Laya.Vector3 = new Laya.Vector3();
    private _movePower: number = 0;
    private _moveStartPos: Laya.Vector3 = new Laya.Vector3();
    private _isMoving: boolean = false;

    // 击球状态
    private _pendingStroke: StrokeParams | null = null;
    private _pendingBall: Ball | null = null;
    public isP = false;   // 球权标记

    private _moveIntervalId: string | null = null;

    // 记录当前后摇需要持续的时间
    private _currentRecoveryDuration: number = 0;

    constructor(root: Laya.Sprite3D, attr?: ChaAttr) {
        super(root);
        if (attr) {
            this.id = attr.id ?? this.id;
            this.side = attr.side ?? this.side ?? 'r';
            this.spd = attr.spd ?? this.spd;
            this.hitRange = attr.hitRange ?? this.hitRange;
            this.state = attr.state ?? this.state;
            this.upTime = attr.upTime ?? this.upTime;
            this._syncAttrToNodePos();
        }
        this._ani = new Ani(root);
        console.log("可用的动画状态:", this._ani.gets());
        this._moveStartPos.setValue(this.x, this.y, this.z);
        this._ani.rootMotion = true;
        let sc = new Laya.Script();
        sc.onUpdate = this.update.bind(this);
        this.root.addComponentInstance(sc);
        console.log("xxxx", this.x, this.y, this.z, this.root, this.root.transform.position, this.root.transform.position.x);
    }

    // ---------- 击球 ----------
    public hit(stroke?: StrokeParams, ball?: Ball): void {
        if (ball) {
            this._pendingBall = ball;
            console.log("setball", this._pendingBall);
        }

        // 判断是否为有效参数：有stroke且power不为undefined
        const isValidStroke = stroke && stroke.power !== undefined;

        switch (this.state) {
            case ChaState.IDLE:
            case ChaState.MOVE:
                if (isValidStroke) {
                    // IDLE/MOVE + 有效参数 → 开始前摇
                    this._pendingStroke = this._calcHitParams(stroke!, this._pendingBall);
                    const animName = this._selectHitAnim(this._pendingStroke, this._pendingBall);
                    Timer.start("windup");
                    this._ani.crossFade(animName, 0.05);
                    this.state = ChaState.HIT_WINDUP;
                } else {
                    // 无效参数，打断当前状态
                    this._interruptHit();
                }
                break;

            case ChaState.HIT_WINDUP:
                if (isValidStroke) {
                    // HIT_WINDUP + 有效参数 → 更新参数
                    this._pendingStroke = this._calcHitParams(stroke!, this._pendingBall);

                    // 大于最大hold时间 → 执行击球
                    if (Timer.invoke("windup") >= this.upTime * 1000) {
                        this._executeHit();
                    }
                } else {
                    // HIT_WINDUP + 无效参数 → 执行击球（传入true检查距离以决定是否减半后摇）
                    this._executeHit();
                }
                break;

            case ChaState.HIT_RECOVERY:
                // 后摇期间不能再次击球，可根据需求扩展为排队或忽略
                console.log("击球后摇中，忽略击球指令", Timer.invoke("recovery"));
                return;
        }
    }

    // 设置球权
    ball(ball: Ball): void {
        this._pendingBall = ball;
        this.isP = true;
    }

    move(pos: { x: number; y: number; z: number }): void;
    move(angle: number, power: number): void;
    move(arg1: any, arg2?: number): void {
        if (this.state === ChaState.HIT_RECOVERY) return;
        if (typeof arg1 === 'object' && 'x' in arg1 && 'y' in arg1 && 'z' in arg1) {
            this.x = Math.floor(arg1.x);
            this.y = Math.floor(arg1.y);
            this.z = Math.floor(arg1.z);
            this._moveStartPos.setValue(this.x, this.y, this.z);
            this._stopMove();
            return;
        }

        const angle = arg1 as number;
        const intPower = Math.floor(arg2! * 10);

        if (intPower <= 0) {
            this._stopMove();
            return;
        }

        const rad = angle * Math.PI / 180;
        const dirX = Math.sin(rad);
        const dirZ = Math.cos(rad);

        if (!this._isMoving) {
            this._moveStartPos.setValue(this.x, this.y, this.z);
            Timer.start("move");
            this._isMoving = true;
            this._startMoveInterval();
        }

        this._moveDir.setValue(dirX, 0, dirZ);
        this._movePower = intPower;

        if (this.state !== ChaState.MOVE) {
            this.state = ChaState.MOVE;
            this._playMoveAnim(this._moveDir);
        }
        if (this.isP) {
            this._pendingBall.pos = new Laya.Vector3(this.x, this.y, this.z);
        }
    }

    get(): any {
        return { id: this.id, side: this.side, spd: this.spd, hitRange: this.hitRange, state: this.state, };
    }

    set(data: Partial<any>): void {
        Object.assign(this, data);
        this._syncAttrToNodePos();
        this._moveStartPos.setValue(this.x, this.y, this.z);
    }

    private _syncAttrToNodePos(): void {
        this.x = this.x;
        this.y = this.y;
        this.z = this.z;
    }

    private _stopMove(): void {
        if (!this._isMoving) return;
        this._movePower = 0;
        this._isMoving = false;
        this._clearMoveInterval();
        if (this.state === ChaState.MOVE) {
            this.state = ChaState.IDLE;
            this._ani.crossFade('idle', 0.1);
        }
    }

    private _startMoveInterval(): void {
        if (this._moveIntervalId) return;
        this._moveIntervalId = Timer.setInterval(16, () => {
            if (!this._isMoving) {
                this._clearMoveInterval();
                return;
            }
            const elapsedMs = Timer.invoke("move");
            Timer.start("move");
            const totalDist = this.spd * this._movePower * elapsedMs / 10000;
            if (totalDist > 0) {
                this.x = this.x + this._moveDir.x * totalDist;
                this.z = this.z + this._moveDir.z * totalDist;
            }
        });
    }

    private _clearMoveInterval(): void {
        if (this._moveIntervalId) {
            Timer.clear(this._moveIntervalId);
            this._moveIntervalId = null;
        }
    }

    private _playMoveAnim(dir: Laya.Vector3): void {
        let angle = Math.atan2(dir.z, dir.x) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        let idx = Math.round(angle / 45) % 8;
        idx = (idx + 2) % 8;
        this._ani.crossFade(ANIM_NAMES[idx], 0.1);
    }

    private _calcHitParams(stroke: StrokeParams, ball?: Obj): StrokeParams {
        if (!ball) return stroke;
        const dist = Math.sqrt(
            (this.x - ball.x) ** 2 +
            (this.y - ball.y) ** 2 +
            (this.z - ball.z) ** 2
        );
        let power = stroke.power;
        let type: 'normal' | 'jump' | 'dive' = 'normal';

        const heightDiff = ball.y - this.y;
        if (heightDiff > 1.2 && dist < this.hitRange * 1.2) {
            type = 'jump';
            console.log(`起跳击球: ${heightDiff}`);
        } else if (dist > this.hitRange * 0.8 && dist <= this.hitRange) {
            type = 'dive';
            console.log(` 鱼跃击球: ${dist}`);
        }

        if (type === 'jump' || type === 'dive') {
            power = Math.min(power, this.power);
        }
        if(dist > this.hitRange){
            console.log(`击球距离超出范围: ${dist}`);
            return ;
        }
        return {
            power: Math.max(3, power),
            angH: stroke.angH,
            angV: stroke.angV,
            spi: stroke.spi,
        };
    }

    private _selectHitAnim(stroke: StrokeParams, ball: Obj): string {
        if (!ball) return 'hit_normal';
        const dist = Math.sqrt(
            (this.x - ball.x) ** 2 +
            (this.y - ball.y) ** 2 +
            (this.z - ball.z) ** 2
        );
        const h = ball.y - this.y;
        if (h > 1.5) return 'jump_smash';
        if (h < -0.5) return 'low_hit';
        if (dist > this.hitRange * 0.9) return 'dive';
        return 'hit_normal';
    }

    /**
     * 执行真正的击球逻辑
     */
    private _executeHit(): void {
        if (!this._pendingStroke || !this._pendingBall) {
            this._interruptHit();
            return;
        }

        this.isP = false;

        // 基础后摇时间
        let recoveryDuration = this.upTime * 2000;

        // 如果是由无效参数触发的击球，判断球是否不在击球范围
        const dist = Math.sqrt(
            (this.x - this._pendingBall.x) ** 2 +
            (this.y - this._pendingBall.y) ** 2 +
            (this.z - this._pendingBall.z) ** 2
        );
        console.log(`[Ball] 击球距离: ${dist}`);
        console.log('chaposition:', this.x, this.y, this.z);
        console.log(`ballposition: ${this._pendingBall.x},${this._pendingBall.y},${this._pendingBall.z}`);
        if (dist > this.hitRange) {
            // 不在击球范围，降低一半的击球后摇
            recoveryDuration *= 0.5;
        } else {
            // 在击球范围内，正常后摇
            this._pendingBall.hit(this._pendingStroke.power, this._pendingStroke.angH, this._pendingStroke.angV, this._pendingStroke.spi);
        }

        this._currentRecoveryDuration = recoveryDuration;

        // 播放击球动画 & 通知Ball类击球
        const animName = this._selectHitAnim(this._pendingStroke, this._pendingBall);
        this._ani.crossFade(animName, 0.05);

        // 转入后摇
        Timer.clear("windup");
        Timer.start("recovery");
        this._ani.crossFade('hit_recovery', 0.1);
        this.state = ChaState.HIT_RECOVERY;
    }

    private _interruptHit(): void {
        if (this.state === ChaState.HIT_WINDUP) {
            this.state = ChaState.IDLE;
            this._ani.crossFade('idle', 0.1);
            Timer.clear("windup");
        }
    }

    update(): void {
        if (this.state === ChaState.HIT_WINDUP) {
            // 前摇时间超过一半时冻结动画（蓄力表现）
            if (Timer.invoke("windup") >= this.upTime * 500) {
                this._ani.freeze();
            }
        } else if (this.state === ChaState.HIT_RECOVERY) {
            // 后摇结束，回到Idle状态
            if (Timer.invoke("recovery") >= this._currentRecoveryDuration) {
                this.state = ChaState.IDLE;
                this._ani.crossFade('idle', 0.1);
                this._pendingStroke = null; // 清理已使用的参数
            }
        }
    }

    destroy(): void {
        this._clearMoveInterval();
        super.destroy();
        this._ani = undefined;
    }
}