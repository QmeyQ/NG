/**
 * Cha - 角色类，管理羽毛球选手的状态机与击球逻辑
 * 状态：IDLE / MOVE / HIT_WINDUP / HIT_RECOVERY / HIT
 * 包含移动、击球（蓄力→释放→后摇）、持球跟随、方向指示器等功能
 */
import { Timer } from "../../libs/time";
import { Ani } from "./ani";
import { Obj } from "./obj";
import { Au } from "../../libs/au";

import { load } from "../../load";

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


    /** 是否持球 */
    public isP = false;

    /** 方向指示器 3D 精灵 */
    private _dirIndicator: Laya.Sprite3D;

    /** 是否允许行动（移动和击球） */
    public canAct: boolean = true;
    /** 位置补偿移动中：非 MOVE 状态（WINDUP/RECOVERY/IDLE）下位移继续，直到 Mag 结束补偿 */
    public compMoving: boolean = false;

    /** 补偿期间动态调整移动速度（不触发状态切换和动画 crossFade） */
    public setMoveSpeed(power: number): void {
        const intPower = Math.floor(power * 10);
        if (intPower <= 0) return;
        this._movePower = intPower;
        const animSpeed = Math.max(0.3, intPower / 5);
        this._ani.setSpeed(animSpeed);
    }

    /** 获取移动方向向量 */
    public get moveDir(): Laya.Vector3 { return this._moveDir; }
    /** 获取是否正在移动 */
    public get isMoving(): boolean { return this._isMoving; }

    /** 持球骨骼节点引用（LeftHand） */
    private _ballHolderNode: Laya.Sprite3D | null = null;


    /** 获取持球骨骼节点（供 Mag 同步球位置） */
    public get ballHolderNode(): Laya.Sprite3D | null { return this._ballHolderNode; }

    /**
     * 构造函数：初始化角色属性、动画、持球骨骼、更新脚本和方向指示器
     * @param root 3D 根节点
     * @param attr 角色属性（可选）
     */
    constructor(root: Laya.Sprite3D, attr?: ChaAttr) {
        super(root);
        if (attr) {
            this.id = attr.id ?? this.id;
            this.side = attr.side ?? this.side ?? -1;
            this.spd = attr.spd ?? this.spd;
            this.hitRange = attr.hitRange ?? this.hitRange;
            this.state = attr.state ?? this.state;
            this.upTime = attr.upTime ?? this.upTime;
        }
        this._ani = new Ani(root);
        // 启用根运动
        this._ani.rootMotion = true;

        // 【新增】查找并缓存持球骨骼节点
        const findBone = (node: Laya.Node, name: string): Laya.Sprite3D | null => {
            if (node.name === name && node instanceof Laya.Sprite3D) return node;
            for (let i = 0; i < node.numChildren; i++) {
                const found = findBone(node.getChildAt(i), name);
                if (found) return found;
            }
            return null;
        };
        const holderNode = findBone(this.root, "LP");
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
        Au.load("hit", "nor@girl/au/hit.MP3");
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


    // ---------- 动画控制（供 Mag 调用） ----------
    /** 播放动画 */
    public playAnim(name: string, fade: number = 0.05): void {
        this._ani.crossFade(name, fade);
    }
    /** 冻结动画 */
    public freezeAnim(): void {
        this._ani.freeze();
    }
    /** 解冻动画 */
    public unfreezeAnim(): void {
        this._ani.unfreeze();
    }
    /** 设置动画速度 */
    public setAnimSpeed(speed: number): void {
        this._ani.setSpeed(speed);
    }

    /** 设置持球标记（球物理由 Mag 控制） */
    setHolding(): void {
        this.isP = true;
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
        const isRecovery = this.state === ChaState.HIT_RECOVERY;
        if (isRecovery && !this.compMoving) return;

        // 1. 如果是 Mag 传位置对象（强制站位），直接执行
        if (typeof arg1 === 'object' && 'x' in arg1 && 'y' in arg1 && 'z' in arg1) {
            if (!isRecovery) {
                this.x = arg1.x;
                this.y = arg1.y;
                this.z = arg1.z;
            }
            return;
        }

        const angle = arg1 as number;
        const intPower = Math.floor(arg2 * 10);

        // 2. 如果是停止指令 (power <= 0)，无条件放行，确保能随时停下
        //    (-1, 0) 仅停止位移，不切 idle、保持当前动画；(负power) 停止并切回 idle
        if (intPower <= 0) {
            this._isMoving = false;
            if (intPower < 0 && this.state === ChaState.MOVE) {
                this.state = ChaState.IDLE;
                this._lastMoveAnimIdx = -1;
                this._ani.crossFade('stand', 0.1);
                this._ani.setSpeed(1.0);
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


        // RECOVERY 期间不切换状态和动画，只更新移动参数
        if (!isRecovery) {
            if (this.state !== ChaState.MOVE) {
                this.state = ChaState.MOVE;
                this._lastMoveAnimIdx = newIdx;
                this._ani.crossFade(ANIM_NAMES[newIdx], 0.1);
            } else if (newIdx !== this._lastMoveAnimIdx) {
                this._lastMoveAnimIdx = newIdx;
                this._ani.crossFade(ANIM_NAMES[newIdx], 0.1);
            }
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
     * 每帧更新：推进移动、方向指示器
     * 由 Laya.Script.onUpdate 自动调用
     */
    update(): void {
        const now = Timer.now();

        // ---------- 移动逻辑 ----------
        if (this._isMoving && (this.state === ChaState.MOVE || this.compMoving)) {
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