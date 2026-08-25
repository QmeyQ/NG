/**
 * Cha - 角色类，管理羽毛球选手的状态机与击球逻辑
 * 状态：IDLE / MOVE / HIT_WINDUP / HIT_RECOVERY / HIT
 * 包含移动、击球（蓄力→释放→后摇）、持球跟随、方向指示器等功能
 */
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

/** 角色状态机枚举 */
export enum ChaState {
    /** 空闲 */
    IDLE = 0,
    /** 移动中 */
    MOVE = 1,
    /** 击球前摇（蓄力） */
    HIT_WINDUP = 2,
    /** 击球后摇（恢复） */
    HIT_RECOVERY = 3,
    /** 击球瞬间 */
    HIT = 4,
}

/** 角色属性接口 */
export interface ChaAttr {
    /** 角色 ID */
    id: number;
    /** 所在边：-1=左队, 1=右队 */
    side: -1 | 1;
    /** X 坐标 */
    x: number;
    /** Y 坐标 */
    y: number;
    /** Z 坐标 */
    z: number;
    /** 移动速度 */
    spd: number;
    /** 击球范围 */
    hitRange: number;
    /** 当前状态 */
    state: ChaState;
    /** 前摇时间系数 */
    upTime: number;
}

/** 击球参数接口 */
export interface StrokeParams {
    /** 击球力度 */
    power: number;
    /** 水平角度（0~360） */
    angH: number;
    /** 垂直角度 */
    angV: number;
    /** 旋转（旋球） */
    spi: Laya.Vector3;
}

class ChaUpdateScript extends Laya.Script {
    public cha: Cha;
    onUpdate(): void {
        if (this.cha) this.cha.update();
    }
}

export class Cha extends Obj {
    /** 动画控制器 */
    private _ani: Ani;

    /** 角色 ID */
    id = 0;
    /** 所在边：-1=左队, 1=右队 */
    side = -1;
    /** 双打发球区：true=左区(奇数分), false=右区(偶数分) */
    odd = true;
    /** 移动速度 */
    spd = 6;
    /** 击球范围（米） */
    hitRange = 2;
    /** 击球高度（y 坐标，默认1） */
    hitHeight = 1;
    /** 当前状态 */
    state = ChaState.IDLE;
    /** 最大击球力度 */
    power = 700;
    /** 前摇时间系数 */
    upTime = 1;

    /** 移动方向向量 */
    private _moveDir: Laya.Vector3 = new Laya.Vector3();
    /** 移动力度（0~10） */
    private _movePower: number = 0;
    /** 是否正在移动 */
    private _isMoving: boolean = false;
    /** 上次更新时间戳 */
    private _lastUpdateTime: number = 0;
    /** 上次移动动画索引 */
    private _lastMoveAnimIdx: number = -1;


    /** 待执行的击球参数 */
    private _pendingStroke: StrokeParams | null = null;
    /** 当前关联的球 */
    private _pendingBall: Ball | null = null;
    /** 是否持球 */
    public isP = false;

    /** 当前后摇持续时间（ms） */
    private _currentRecoveryDuration: number = 0;
    /** 方向指示器 3D 精灵 */
    private _dirIndicator: Laya.Sprite3D;

    /** 是否允许行动（移动和击球） */
    public canAct: boolean = true;

    /** 获取移动方向向量 */
    public get moveDir(): Laya.Vector3 { return this._moveDir; }
    /** 获取是否正在移动 */
    public get isMoving(): boolean { return this._isMoving; }
    
    /** 持球骨骼节点引用（LeftHand） */
    private _ballHolderNode: Laya.Sprite3D | null = null;
    /** 球原始父节点 */
    private _ballOriginalParent: Laya.Sprite3D | null = null;

    /**
     * 构造函数：初始化角色属性、动画、持球骨骼、更新脚本和方向指示器
     * @param root 3D 根节点
     * @param attr 角色属性（可选）
     * @param ball 关联的球（可选，初始化时强制传递）
     */
    constructor(root: Laya.Sprite3D, attr?: ChaAttr, ball?: Ball) {
        super(root);
        if (attr) {
            this.id = attr.id ?? this.id;
            this.side = attr.side ?? this.side ?? -1;
            this.spd = attr.spd ?? this.spd;
            this.hitRange = attr.hitRange ?? this.hitRange;
            this.state = attr.state ?? this.state;
            this.upTime = attr.upTime ?? this.upTime;
        }
        if (ball) {
            this._pendingBall = ball;
        }
        this._ani = new Ani(root);
        // 启用根运动
        this._ani.rootMotion = false;

        // 【新增】查找并缓存持球骨骼节点
        const findBone = (node: Laya.Node, name: string): Laya.Sprite3D | null => {
            if (node.name === name && node instanceof Laya.Sprite3D) return node;
            for (let i = 0; i < node.numChildren; i++) {
                const found = findBone(node.getChildAt(i), name);
                if (found) return found;
            }
            return null;
        };
        const holderNode = findBone(this.root, "LeftHand");
        if (holderNode) {
            this._ballHolderNode = holderNode;
        } else {
            console.warn("[Cha] 未找到 LeftHand 骨骼，球将使用默认跟随位置");
        }

        let sc = new Laya.Script();
        sc.onUpdate = this.update.bind(this);
        root.addComponentInstance(sc)
        this._createDirIndicator();
        // 初始同步位置
    }

    /** 创建方向指示器（红色箭头，移动时显示） */
    private _createDirIndicator(): void {
        this._dirIndicator = new Laya.Sprite3D();
        const mat = new Laya.BlinnPhongMaterial();
        mat.albedoColor = new Laya.Color(1, 0, 0, 1);
        const box = new Laya.MeshSprite3D(Laya.PrimitiveMesh.createBox(0.1, 0.1, 0.6));
        box.transform.localPosition = new Laya.Vector3(0, 0, 0.3);
        box.meshRenderer.material = mat;
        this._dirIndicator.addChild(box);
        const cone = new Laya.MeshSprite3D(Laya.PrimitiveMesh.createCone(0.15, 0.3));
        cone.transform.localPosition = new Laya.Vector3(0, 0, 0.75);
        cone.transform.localRotationEuler = new Laya.Vector3(90, 0, 0);
        cone.meshRenderer.material = mat;
        this._dirIndicator.addChild(cone);
        this._dirIndicator.transform.localPosition = new Laya.Vector3(0, 0.05, 0);
        this._dirIndicator.active = false;
        this.root.addChild(this._dirIndicator);
    }

    // ---------- 击球 ----------
    /**
     * 击球入口：根据当前状态推进击球流程
     * - IDLE/MOVE → 进入前摇（HIT_WINDUP）
     * - HIT_WINDUP → 前摇满则执行击球
     * - HIT_RECOVERY → 忽略
     * @param stroke 击球参数（power=-1 表示无参数击球/释放蓄力）
     * @param ball 关联的球（可选）
     */
    public hit(stroke?: StrokeParams, ball?: Ball): void {
        if (ball) {
            this._pendingBall = ball;
        }
        const isValidStroke = stroke && stroke.power !== -1;
 if(isValidStroke) this._pendingStroke = this._calcHitParams(stroke, this._pendingBall);
        switch (this.state) {
            case ChaState.IDLE:
            case ChaState.MOVE:
                if (isValidStroke) {
                   if (!this._pendingStroke) {
                        this._interruptHit();
                        return;
                    }
                    const animName = this._selectHitAnim(this._pendingStroke, this._pendingBall);
                    Timer.start(`windup_${this.id}`);
                    this._ani.crossFade(animName, 0.05);
                    this.state = ChaState.HIT_WINDUP;
                    const bp = this._pendingBall;
                    const dXZ = Math.sqrt((this.x - bp.x) ** 2 + (this.z - bp.z) ** 2);
                    console.log(`%c[Cha:${this.id}] 前摇开始 HIT_WINDUP upTime=${this.upTime} 蓄力${this.upTime * 1000}ms
  球位置=(${bp.x.toFixed(2)},${bp.y.toFixed(2)},${bp.z.toFixed(2)}) Cha位置=(${this.x.toFixed(2)},${this.y.toFixed(2)},${this.z.toFixed(2)}) 球XZ距离=${dXZ.toFixed(2)}`, "color: #FF00FF;");

                } else {
                    this._interruptHit();
                }
                break;

            case ChaState.HIT_WINDUP:
                if (!this._pendingStroke) {
                    this._interruptHit();
                    return;
                }
                if (Timer.invoke(`windup_${this.id}`) >= this.upTime * 200) {
                    if(stroke.power == -1) {
                        console.log(`%c[Cha:${this.id}] hit()在HIT_WINDUP中调用, 前摇已满 → _executeHit`, "color: #FF00FF;");
                        this._executeHit();
                    }
                }
                break;
            case ChaState.HIT_RECOVERY:
                return;
        }
    }
    /** 设置持球：标记 isP，禁用球物理计算 */
    ball(ball: Ball): void {
    this._pendingBall = ball;
    this.isP = true;
    ball.phy.isCalc = false;

    // 【注释】直接挂骨骼有问题，改回跟随骨骼方式
    // if (this._ballHolderNode && ball.root.parent !== this._ballHolderNode) {
    //     ...
    // }
}
    /** 清除球权：取消持球标记并释放球引用 */
    public clearBall(): void {
        this.isP = false;
        this._releaseBall();
        this._pendingBall = null;
    }
    /** 释放球（当前为空实现，跟随方式无需释放） */
    private _releaseBall(): void {
    // 【注释】直接挂骨骼有问题，改回跟随骨骼方式，无需释放
    // if (!this._pendingBall) return;
    // ...
}

    /**
     * 移动角色（重载）
     * - 传位置对象 {x,y,z}：强制传送到指定坐标（Mag 调用）
     * - 传角度+力度：按方向移动，力度<=0 时停止
     * @param arg1 位置对象或角度
     * @param arg2 力度（0~1）
     */
    move(pos: { x: number; y: number; z: number }): void;
    move(angle: number, power: number): void;
    move(arg1: any, arg2?: number): void {
        if (this.state === ChaState.HIT_RECOVERY) return;

        // 1. 如果是 Mag 传位置对象（强制站位），直接执行
        if (typeof arg1 === 'object' && 'x' in arg1 && 'y' in arg1 && 'z' in arg1) {
            this.x = arg1.x;
            this.y = arg1.y;
            this.z = arg1.z;
            // /this.root.transform.position = new Laya.Vector3(this.x, this.y, this.z);

            return;
        }

        const angle = arg1 as number;
        const intPower = Math.floor(arg2 * 10);

        // 2. 如果是停止指令 (power <= 0)，无条件放行，确保能随时停下
        if (intPower <= 0) {
            this._isMoving = false;
            if (this.state === ChaState.MOVE || this.state === ChaState.HIT_WINDUP) {
                const wasWindup = this.state === ChaState.HIT_WINDUP;
                this.state = ChaState.IDLE;
                this._lastMoveAnimIdx = -1;
                this._ani.crossFade('idle', 0.1);
                this._ani.setSpeed(1.0);
                if (wasWindup) {
                    Timer.clear(`windup_${this.id}`);
                    this._ani.unfreeze();
                }
            }

            return;
        }

        // 3. 【新增】如果是移动指令，检查是否被 Mag 锁定
        if (!this.canAct) return;

        // 【核心修改】1. 将输入角度转换为统一的局部意图向量 (约定：0°=向右+X，90°=向前+Z)
        const rad = angle * Math.PI / 180;
        const intentX = Math.cos(rad);
        const intentZ = Math.sin(rad);

        // 2. 将局部意图转换为世界移动方向
        // 【修复点】因为模型面朝 +Z，它在引擎中相当于背对默认前向(-Z)，所以它的视觉右方其实是 -X
        const localIntent = new Laya.Vector3(-intentX, 0, intentZ); 
        const worldIntent = new Laya.Vector3();
        Laya.Vector3.transformQuat(localIntent, this.root.transform.rotation, worldIntent);
        worldIntent.y = 0; // 锁定Y轴
        Laya.Vector3.normalize(worldIntent, worldIntent);
        this._moveDir.setValue(worldIntent.x, 0, worldIntent.z);

        // 3. 统一计算动画索引（这部分逻辑是对的，保持不变）
        let animAngle = Math.atan2(intentX, intentZ) * 180 / Math.PI;
        if (animAngle < 0) animAngle += 360;
        const newIdx = Math.round(animAngle / 45) % 8;

        if (!this._isMoving) {
            this._isMoving = true;
            this._lastUpdateTime = Timer.now();
        }
        this._movePower = intPower;


        if (this.state !== ChaState.MOVE) {
            if (this.state === ChaState.HIT_WINDUP) {
                Timer.clear(`windup_${this.id}`);
                this._ani.unfreeze();
            }
            this.state = ChaState.MOVE;
            this._lastMoveAnimIdx = newIdx;
            this._ani.crossFade(ANIM_NAMES[newIdx], 0.1);
        } else if (newIdx !== this._lastMoveAnimIdx) {
            this._lastMoveAnimIdx = newIdx;
            this._ani.crossFade(ANIM_NAMES[newIdx], 0.1);
        }

        const animSpeed = Math.max(0.3, intPower / 5);
        this._ani.setSpeed(animSpeed);

        // 【修改】移除这里的球位置更新逻辑，统一放到 update 中处理，以保证静止时球也能跟随
    }

    /** 获取角色属性快照 */
    get(): any {
        return { id: this.id, side: this.side, spd: this.spd, hitRange: this.hitRange, state: this.state };
    }

    /** 批量设置角色属性并同步位置 */
    set(data: Partial<any>): void {
        Object.assign(this, data);
        
    }


    /** 同步 this.x/y/z 到 root 位置 */
    // private _syncNodePos(): void {
    //     // this.root.transform.position = new Laya.Vector3(this.x, this.y, this.z);
    // }

    /**
     * 计算击球参数：根据球距离和高度判定击球类型（normal/jump/dive），调整力度
     * @param stroke 原始击球参数
     * @param ball 球对象
     * @returns 调整后的击球参数，或 null 表示无法击球
     */
    private _calcHitParams(stroke: StrokeParams, ball?: Obj): StrokeParams | null {
        if (!ball || !stroke) return stroke;
        // 用 XZ 距离判定击球类型（高度由 hit type 处理）
        const distXZ = Math.sqrt(
            (this.x - ball.x) ** 2 +
            (this.z - ball.z) ** 2
        );
        let power = stroke.power;
        let type: 'normal' | 'jump' | 'dive' = 'normal';

        const heightDiff = ball.y - this.y;
        if (heightDiff > 1.2 && distXZ < this.hitRange * 1.2) {
            type = 'jump';
        } else if (distXZ > this.hitRange * 0.8 && distXZ <= this.hitRange) {
            type = 'dive';
        }

        if (type === 'jump' || type === 'dive') {
            power = Math.min(power, this.power);
        }
        return {
            power: Math.max(3, power),
            angH: stroke.angH,
            angV: stroke.angV,
            spi: stroke.spi,
        };
    }

    /**
     * 选择击球动画：根据球高度和距离选择 jump_smash/low_hit/dive/hit_normal
     * @param stroke 击球参数
     * @param ball 球对象
     * @returns 动画状态名
     */
    private _selectHitAnim(stroke: StrokeParams, ball: Obj): string {
        if (!ball) return 'hit_normal';
        const dist = Math.sqrt(
            (this.x - ball.x) ** 2 +
            (this.y - ball.y) ** 2 +
            (this.z - ball.z) ** 2
        );
        const h = ball.y - this.y;
        if (h > 1.5) return 'lefthit';
        if (h < -0.5) return 'low_hit';
        if (dist > this.hitRange * 0.9) return 'dive';
        return 'hit_normal';
    }

    /** 执行击球：判定球距离，调用 ball.hit()，进入后摇状态 */
    private _executeHit(): void {
        if (!this._pendingStroke || !this._pendingBall) {
            this._interruptHit();
            return;
        }

        this.isP = false; // 击球后失去球权
        this._releaseBall(); // 将球从骨骼放回场景
        let recoveryDuration = this.upTime * 400;

        const distXZ = Math.sqrt(
            (this.x - this._pendingBall.x) ** 2 +
            (this.z - this._pendingBall.z) ** 2
        );
        console.log(`%c[Cha:${this.id}] _executeHit 击球执行!
  球位置=(${this._pendingBall.x.toFixed(2)},${this._pendingBall.y.toFixed(2)},${this._pendingBall.z.toFixed(2)}) Cha位置=(${this.x.toFixed(2)},${this.y.toFixed(2)},${this.z.toFixed(2)}) 球XZ距离=${distXZ.toFixed(2)} hitRange=${this.hitRange} 阈值=${(this.hitRange * 1.5).toFixed(2)} power=${this._pendingStroke.power.toFixed(0)}`, "color: #00FF00; font-weight:bold;"
,this._pendingStroke.angH,this._pendingStroke.angV,this._pendingStroke.spi);
        if (distXZ <= this.hitRange * 1.5) {
            this._pendingBall.hit(
                this._pendingStroke.power,
                this._pendingStroke.angH,
                this._pendingStroke.angV,
                this._pendingStroke.spi,
                this.id
            );
            console.log(`%c[Cha:${this.id}] → ball.hit 成功!`, "color: #00FF00; font-weight:bold;");
        } else {
            recoveryDuration *= 0.5;
            console.log(`%c[Cha:${this.id}] → 距离太远未击球! distXZ=${distXZ.toFixed(2)} > ${(this.hitRange * 1.5).toFixed(2)}`, "color: #FF0000; font-weight:bold;");
        }

        this._currentRecoveryDuration = recoveryDuration;
        const animName = this._selectHitAnim(this._pendingStroke, this._pendingBall);
        this._ani.crossFade(animName, 0.05);

        Timer.clear(`windup_${this.id}`);
        Timer.start(`recovery_${this.id}`);
        this._ani.crossFade('hit_recovery', 0.1);
        this.state = ChaState.HIT_RECOVERY;
        console.log(`%c[Cha:${this.id}] 后摇开始 HIT_RECOVERY duration=${recoveryDuration.toFixed(0)}ms`, "color: #888888;");
    }

    /** 中断击球：从前摇状态回到 IDLE */
    private _interruptHit(): void {
        if (this.state === ChaState.HIT_WINDUP) {
            this.state = ChaState.IDLE;
            this._ani.crossFade('idle', 0.1);
            Timer.clear(`windup_${this.id}`);
            this._ani.unfreeze();
        }
    }

    /**
     * 每帧更新：推进移动、前摇/后摇状态机、持球跟随、方向指示器
     * 由 Laya.Script.onUpdate 自动调用
     */
    update(): void {
        const now = Timer.now();

        // ---------- 移动逻辑 ----------
        if (this._isMoving && this.state === ChaState.MOVE) {
            let elapsedMs = now - this._lastUpdateTime;
            if (elapsedMs > 50) elapsedMs = 50;
            this._lastUpdateTime = now;

            const totalDist = this.spd * this._movePower * elapsedMs / 10000;
            if (totalDist > 0) {
                this.x += this._moveDir.x * totalDist;
                this.z += this._moveDir.z * totalDist;
                // 同步位置到根节点
            }
        } else {
            this._lastUpdateTime = now;
        }

        // ---------- 击球状态 ----------
        if (this.state === ChaState.HIT_WINDUP) {
            const windupTarget = this.upTime * 2000;//最大前摇时间
            if (Timer.invoke(`windup_${this.id}`) >= windupTarget) {
                const bp = this._pendingBall;
                const dXZ = bp ? Math.sqrt((this.x - bp.x) ** 2 + (this.z - bp.z) ** 2) : -1;
                console.log(`%c[Cha:${this.id}] 达到最大前摇时间 windup=${Timer.invoke(`windup_${this.id}`).toFixed(0)}ms >= ${windupTarget}ms → 执行击球
  球位置=${bp ? `(${bp.x.toFixed(2)},${bp.y.toFixed(2)},${bp.z.toFixed(2)})` : 'null'} Cha位置=(${this.x.toFixed(2)},${this.y.toFixed(2)},${this.z.toFixed(2)}) 球XZ距离=${dXZ.toFixed(2)}`, "color: #FF00FF;");
                this._executeHit();
            } else if (Timer.invoke(`windup_${this.id}`) >= this.upTime * 200) {
                this._ani.freeze();
            }
        } else if (this.state === ChaState.HIT_RECOVERY) {
            const recTime = Timer.invoke(`recovery_${this.id}`);
            if (recTime >= this._currentRecoveryDuration) {
                console.log(`%c[Cha:${this.id}] 后摇完成 recovery=${recTime.toFixed(0)}ms >= ${this._currentRecoveryDuration.toFixed(0)}ms → IDLE`, "color: #888888;");
                this.state = ChaState.IDLE;
                this._ani.crossFade('idle', 0.1);
                this._pendingStroke = null;
            }
        }

        // ---------- 持球跟随逻辑 ----------
        // 每帧将球位置同步到骨骼世界坐标
        if (this.isP && this._pendingBall) {
            if (this._ballHolderNode) {
                const wm = this._ballHolderNode.transform.worldMatrix;
                this._pendingBall.pos = new Laya.Vector3(wm.elements[12], wm.elements[13], wm.elements[14]);
            } else {
                const dir = this.x > 0 ? -1 : 1;
                this._pendingBall.pos = new Laya.Vector3(this.x + 0.5 * dir, 1.0, this.z);
            }
        }

        // ---------- 方向指示器 ----------
        if (this._dirIndicator) {
            if (this._isMoving && this._movePower > 0) {
                this._dirIndicator.active = true;
                // 指示器与根节点旋转同步
                this._dirIndicator.transform.rotation = this.root.transform.rotation;
            } else {
                this._dirIndicator.active = false;
            }
        }

        this._ani.update();
    }

    /** 销毁角色：清理方向指示器和动画控制器 */
    destroy(): void {
        super.destroy();

        if (this._dirIndicator) {
            this._dirIndicator.destroy();
            this._dirIndicator = null;
        }
        this._ani = undefined;
    }
}