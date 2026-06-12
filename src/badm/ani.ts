/**
 * Ani.ts 动画控制器，负责动画状态切换、播放控制与根运动处理
 * 
 * 构造：new Ani(owner: Laya.Sprite3D, rootBoneName?: string)
 * 
 * play(stateName: string, duration?: number): void         播放指定动画，duration为播放时长(秒)，自动缩放动画速度
 * setSpeed(speed: number): void                            设置全局动画速度倍数
 * pause(): void                                            暂停动画
 * resume(): void                                           恢复动画
 * freeze(): void                                           冻结动画（停在当前帧）
 * unfreeze(): void                                         解冻动画
 * crossFade(stateName: string, duration: number): void     淡入淡出切换到指定动画
 * gets(): string[]                                         获取所有动画状态名称列表
 * get currentState(): string | null                        获取当前播放状态名
 * update(): void                                           每帧更新（处理根运动，需外部调用）
 * 
 * 属性：
 * rootMotion: boolean                                      是否启用根运动（默认 false）
 */

export class Ani {
    private _owner: Laya.Sprite3D;
    private _anim: Laya.Animator;
    public _rootBone: Laya.Transform3D | null = null;
    private _rootOffset: Laya.Vector3 = new Laya.Vector3(); // 根骨骼相对于 owner 的初始偏移
    private _lastRootPos: Laya.Vector3 = new Laya.Vector3(); // 上一帧根骨骼的世界位置
    private boneNode: Laya.Sprite3D | null = null; // 根骨骼节点

    /** 是否启用根运动（可直接修改） */
    public rootMotion: boolean = false;

    // 动画播放相关
    private _speed: number = 1.0;
    private _paused: boolean = false;
    private _frozen: boolean = false;

    /**
     * @param owner 角色根节点（Sprite3D）
     * @param rootBoneName 根骨骼名称，默认 "Hips"
     */
    constructor(owner: Laya.Sprite3D, rootBoneName: string = "Hips") {
        this._owner = owner;
        this._anim = owner.getComponent(Laya.Animator);
        if (!this._anim) {
            console.warn("[Ani] 未找到 Animator 组件");
        }
        this._findRootBone(rootBoneName);
        this._calcRootOffset();
        this._recordRootPosition();
        console.log(`[oner] 根骨骼初始位置:` ,this._owner);
        let sc = new Laya.Script();
        sc.onUpdate = this.update.bind(this);
        this.boneNode.addComponentInstance(sc);
        console.log(`[Ani] 根骨骼节点: ${this.boneNode}`);
    }

    /** 查找根骨骼节点 */
    private _findRootBone(rootBoneName: string): void {
        if (!this._anim) return;

        const findNode = (node: Laya.Node, name: string): Laya.Sprite3D | null => {
            if (node.name === name && node instanceof Laya.Sprite3D) {
                return node;
            }
            for (let i = 0; i < node.numChildren; i++) {
                const child = node.getChildAt(i);
                const found = findNode(child, name);
                if (found) return found;
            }
            return null;
        };

        this.boneNode = findNode(this._owner, rootBoneName);
        if (this.boneNode) {
            this._rootBone = this.boneNode.transform;
            console.log(`[Ani] 找到根骨骼: ${rootBoneName}`);
        } else {
            console.warn(`[Ani] 未找到根骨骼: ${rootBoneName}，根运动将使用 owner 节点`);
        }
    }

    /** 计算根骨骼相对于 owner 的初始偏移（忽略 Y 轴） */
    private _calcRootOffset(): void {
        if (this._rootBone) {
            this._rootOffset.x = this._rootBone.position.x - this._owner.transform.position.x;
            this._rootOffset.y = 0; // 忽略 Y 轴
            this._rootOffset.z = this._rootBone.position.z - this._owner.transform.position.z;
            console.log(`[Ani] 根骨骼初始偏移: ${this._rootOffset}`);
        } else {
            this._rootOffset.setValue(0, 0, 0);
        }
    }

    /** 记录当前根骨骼位置（用于计算增量） */
    private _recordRootPosition(): void {
        if (this._rootBone) {
            this._rootBone.position.cloneTo(this._lastRootPos);
        } else {
            this._owner.transform.position.cloneTo(this._lastRootPos);
        }
    }

    /**
     * 每帧更新（处理根运动）
     * - 如果启用根运动，则强制根骨骼的 XZ 坐标跟随 owner 的位置 + 偏移，Y 轴保留动画计算值。
     * - 这样可以抵消动画中根骨骼的位移，同时保持正确的骨骼层级关系。
     */
    public update(): void {
        if (!this.rootMotion || !this._anim) return;

        const rootBone = this._rootBone;
        if (!rootBone) return;

        // 强制根骨骼 XZ 对齐到 owner 位置 + 偏移，Y 保持不变（由动画控制）
        const newX = this._owner.transform.position.x + this._rootOffset.x;
        const newZ = this._owner.transform.position.z + this._rootOffset.z;
        rootBone.position = new Laya.Vector3(newX, rootBone.position.y, newZ);

        // 更新记录的位置，防止后续可能的计算错误（实际上不再使用 _lastRootPos）
        this._recordRootPosition();
    }

    // ---------- 动画播放控制 ----------
    play(stateName: string, duration?: number): void {
        console.log("Ani play", stateName, duration);
        this._frozen = false;
        if (duration !== undefined && duration > 0) {
            const clip = this._anim.getControllerLayer(0)?.getAnimatorState(stateName)?.clip;
            if (clip) {
                const originalDuration = clip.duration();
                const targetSpeed = originalDuration / duration;
                this._anim.speed = targetSpeed * this._speed;
            } else {
                this._anim.speed = this._speed;
            }
        } else {
            this._anim.speed = this._speed;
        }
        this._anim.play(stateName, 0, 0);
        if (this._paused) {
            this._anim.speed = 0;
        }
    }

    crossFade(stateName: string, duration: number): void {
        console.log("Ani crossFade", stateName, duration);
        this._frozen = false;
        this._anim.crossFade(stateName, duration, 0, 0);
        this._anim.speed = this._paused ? 0 : this._speed;
    }

    setSpeed(speed: number): void {
        this._speed = Math.max(0, speed);
        if (!this._paused && !this._frozen) {
            this._anim.speed = this._speed;
        }
    }

    pause(): void {
        this._paused = true;
        this._anim.speed = 0;
    }

    resume(): void {
        this._paused = false;
        if (!this._frozen) {
            this._anim.speed = this._speed;
        }
    }

    freeze(): void {
        console.log("Ani freeze");
        this._frozen = true;
        this._anim.speed = 0;
    }

    unfreeze(): void {
        console.log("Ani unfreeze");
        this._frozen = false;
        if (!this._paused) {
            this._anim.speed = this._speed;
        }
    }

    gets(): string[] {
        const states: string[] = [];
        const layers = (this._anim as any)._controllerLayers;
        if (!layers || !Array.isArray(layers)) return states;
        for (const layer of layers) {
            const layerStates = layer._states;
            if (!layerStates || !Array.isArray(layerStates)) continue;
            for (const state of layerStates) {
                if (state && state.name) states.push(state.name);
            }
        }
        return states;
    }

    get currentState(): string | null {
        const info = this._anim.getCurrentAnimatorPlayState(0);
        return info ? info.animatorState.name : null;
    }
}