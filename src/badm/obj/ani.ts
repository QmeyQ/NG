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

    private boneNode: Laya.Sprite3D | null = null; // 根骨骼节点

    /** 是否启用根运动（可直接修改） */
    public rootMotion: boolean = true;

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
        // console.log(`[Ani] 角色根节点: ${owner}`);
        this._anim = owner.getComponent(Laya.Animator);
        if (!this._anim) {
            console.log('[Ani] 未找到 Animator，附加并初始化');
            this._anim = owner.addComponent(Laya.Animator) as Laya.Animator;
            const layer = new Laya.AnimatorControllerLayer('Base');
            layer.defaultWeight = 1;
            layer.playOnWake = true;
            this._anim.addControllerLayer(layer);
        }
        this._findRootBone(rootBoneName);

        // console.log(`[Ani] 根骨骼节点: ${this.boneNode}`);
    }

    /** 查找根骨骼节点 */
    private _findRootBone(rootBoneName: string): void {
        //if (!this._anim) return;

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
            // console.log(`[Ani] 找到根骨骼: ${rootBoneName}`);
        } else {
            console.warn(`[Ani] 未找到根骨骼: ${rootBoneName}，根运动将使用 owner 节点`);
        }
    }



    /**
     * 每帧更新（处理根运动，需外部每帧调用——cha.update 开头已接）。
     * 【用户规格 2026-10-25】根骨骼(Hips)世界位置对齐角色(owner)位置：
     * - XZ(水平)对齐 owner 世界位置(cha.x/z 同源) —— 动画根位移/漂移被完全抵消,
     *   且不再依赖"初始局部偏移×父矩阵"(旧 expectedWorldPos 在换边/重定位后基准过期)
     * - Y(高度)保留动画原生值 —— 跳跃/下蹲高度变化不受影响
     */
    public update(): void {
        if (!this.rootMotion || !this._anim || !this._rootBone || !this.boneNode.parent) return;

        const parentNode = this.boneNode.parent as Laya.Sprite3D;
        const parentMat = parentNode.transform.worldMatrix;

        // 1. 根骨骼被 Animator 驱动后的【实际世界坐标】
        // 技巧：用原点 (0,0,0) 乘骨骼自身的世界矩阵，提取出的就是它真实的绝对世界坐标
        const currentWorldPos = new Laya.Vector3();
        Laya.Vector3.transformCoordinate(new Laya.Vector3(0, 0, 0), this.boneNode.transform.worldMatrix, currentWorldPos);

        // 2. 目标世界坐标: XZ 对齐角色位置(owner, cha.x/z 同源), Y 保留动画原生高度
        const ownerPos = this._owner.transform.position;
        const targetWorldPos = new Laya.Vector3(
            ownerPos.x,
            currentWorldPos.y,
            ownerPos.z
        );

        // 3. 世界→局部: 父节点逆矩阵把目标世界坐标拉回骨骼局部空间
        const invParentMat = new Laya.Matrix4x4();
        parentMat.cloneTo(invParentMat);
        invParentMat.invert(invParentMat);

        const targetLocalPos = new Laya.Vector3();
        Laya.Vector3.transformCoordinate(targetWorldPos, invParentMat, targetLocalPos);

        // 4. 赋值局部坐标完成对齐
        this._rootBone.localPosition = targetLocalPos;
    }
    // ---------- 动画播放控制 ----------
    private _stateReady(stateName: string): boolean {
        if (!this._anim) return false;
        const layer = this._anim.getControllerLayer(0);
        if (!layer) return false;
        const state = layer.getAnimatorState(stateName);
        return !!(state && state.clip);
    }

    play(stateName: string, duration?: number): void {
        if (!this._stateReady(stateName)) {
            console.warn(`[Ani] 动画状态未就绪，跳过 play: ${stateName}`);
            return;
        }
        //console.log("Ani play", stateName, duration);
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
        if (!this._stateReady(stateName)) {
            //console.warn(`[Ani] 动画状态未就绪，跳过 crossFade: ${stateName}`);
            return;
        }
        //console.log("Ani crossFade", stateName, duration);
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
        //console.log("Ani freeze");
        this._frozen = true;
        this._anim.speed = 0;
    }

    unfreeze(): void {
        //console.log("Ani unfreeze");
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

    /**
     * 项目角色动画的固定状态表。核心状态 ID 不依赖 Laya 私有字段的枚举顺序，
     * 即使某些版本无法枚举 Animator._controllerLayers，也能保持各端 ID 一致。
     */
    private _getStableStateNames(): string[] {
        const coreNames = [
            "stand",
            "up", "up_right", "right", "down_right", "down", "down_left", "left", "up_left",
            "lhit", "rhit", "lhighhit", "rhighhit", "llowhit", "rlowhit",
            "jumphit", "diving"
        ];
        const known = new Set(coreNames);
        // 额外 Animator 状态追加在固定核心列表之后；同一角色资源需在所有客户端保持一致。
        const extras = Array.from(new Set(this.gets().filter((name) => typeof name === "string" && !!name && !known.has(name))))
            .sort((a, b) => a.localeCompare(b));
        return coreNames.concat(extras);
    }

    /** 当前动画状态 ID；ID 只标识动画类型，不包含播放进度。 */
    get currentStateId(): number {
        const state = this.currentState;
        if (!state) return -1;
        return this._getStableStateNames().indexOf(state);
    }

    /** 将离散状态 ID 解析为动画名；无效 ID 返回 null。 */
    getStateNameById(stateId: number): string | null {
        if (!Number.isInteger(stateId) || stateId < 0) return null;
        const names = this._getStableStateNames();
        return stateId < names.length ? names[stateId] : null;
    }

    /** 应用离散动画状态：只有状态不同才切换，绝不校准/重置动画进度。 */
    syncStateById(stateId: number, fade: number = 0.05): boolean {
        const stateName = this.getStateNameById(stateId);
        if (!stateName || !this._stateReady(stateName)) return false;
        if (this.currentState !== stateName) {
            this._frozen = false;
            this._paused = false;
            this._anim.crossFade(stateName, Math.max(0, fade), 0, 0);
            this._anim.speed = this._speed;
        }
        return true;
    }

    /** 兼容旧调用：只按动画名称切换，不再同步 normalizedTime、速度或冻结状态。 */
    syncState(stateName: string, _speed: number = 1, _normalizedTime?: number, _frozen?: boolean): void {
        if (!stateName || !this._stateReady(stateName)) return;
        if (this.currentState !== stateName) {
            this._frozen = false;
            this._paused = false;
            this._anim.crossFade(stateName, 0.05, 0, 0);
            this._anim.speed = this._speed;
        }
    }

    get currentSpeed(): number { return this._speed; }
    get isFrozen(): boolean { return this._frozen; }
    get isPaused(): boolean { return this._paused; }

    get currentState(): string | null {
        try {
            const info: any = this._anim?.getCurrentAnimatorPlayState(0);
            return info?.animatorState?.name ?? null;
        } catch (_) {
            return null;
        }
    }
}