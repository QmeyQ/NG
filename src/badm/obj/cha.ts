/**
 * Cha - 羽毛球角色。
 * 重点修改：
 * 1. 移动与击球完全解耦：HIT_WINDUP / HIT_RECOVERY 期间仍允许普通移动。
 * 2. 跳跃接球期间移动速度减半；鱼跃期间禁止手动移动。
 * 3. Mag 的位置补偿可以继续调用 move()，不会再被“击球状态”错误拦截。
 */
import { Timer } from "../../libs/time";
import { Ani } from "./ani";
import { Obj } from "./obj";
import { Au } from "../../libs/au";

const ANIM_NAMES: string[] = [
    "up", "up_right", "right", "down_right",
    "down", "down_left", "left", "up_left"
];

export enum ChaState {
    IDLE = 0,
    MOVE = 1,
    HIT_WINDUP = 2,
    HIT_RECOVERY = 3,
    HIT = 4,
}

export type ReceiveAction = "none" | "jumphit" | "diving";

export interface ChaAttr {
    id: number;
    side: -1 | 1;
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

    public id = 0;
    public side: -1 | 1 = -1;
    public odd = true;
    public spd = 6;

    /** 普通击球基础范围；Mag 可按具体动作进一步缩放 */
    public hitRange = 2;
    public hitHeight = 1;

    public state = ChaState.IDLE;
    public power = 700;
    public upTime = 1;

    private _moveDir: Laya.Vector3 = new Laya.Vector3();
    private _movePower = 0;
    private _isMoving = false;
    private _lastUpdateTime = 0;
    private _lastMoveAnimIdx = -1;

    public isP = false;

    public canAct = true;
    /** Mag 的位置补偿移动 */
    public compMoving = false;

    /** 跳跃/鱼跃接球动作 */
    public receiveAction: ReceiveAction = "none";
    /** jumphit 时允许的移动速度倍率 */
    public jumpMoveSpeedScale = 0.5;
    /** diving 移动速度倍率(特殊击球只有移速快慢, 无瞬移) */
    public diveSpeedScale = 2;
    /** mag 驱动的鱼跃冲刺进行中(旧冲程模型残留兼容, 新语义仅调移速) */
    public diveDriving = false;
    /** 是否鱼跃中 */
    public get isDiving(): boolean { return this.receiveAction === "diving"; }
    public get isJumping(): boolean { return this.receiveAction === "jumphit"; }

    // ==================== 跳跃系统(jumphit y 轴高度) ====================
    /** 当前跳跃高度(米, y 轴位移) */
    public jumpY = 0;
    /** 最大跳跃高度(米) */
    public jumpMaxH = 1.2;
    /** 上升到最大高度耗时(ms)——按后摇时间规划跳跃高度变化过程 */
    public jumpRiseDur = 600;
    /** 跳跃相位: none=未跳 / up=按住起跳中 / down=松手后下降中 */
    public jumpPhase: 'none' | 'up' | 'down' = 'none';
    /** 起跳时地面 y */
    private _jumpBaseY = 0;
    /** 下降速度(m/s), 转 down 时按当前高度与下降时长规划 */
    private _jumpDownSpd = 0;
    /** 规划的下降时长(ms)——后摇=下降时长+150(保证后摇结束前真实落地) */
    private _jumpDownDur = 0;
    /** 跳跃积分独立时间戳(与移动 _lastUpdateTime 解耦) */
    private _jumpLastMs = 0;

    // ==================== 鱼跃限距(用户规格: 达最大距离必须终止) ====================
    /** 鱼跃累计位移(m) */
    public diveTraveled = 0;
    /** 鱼跃最大位移(米, 超过即终止) */
    public diveMaxDistance = 2.5;
    /** 鱼跃起始位置 */
    private _diveStartX = 0;
    private _diveStartZ = 0;
    /** 鱼跃冲程已满(达最大距离, mag 滞留分支据此起身终止) */
    public get diveDone(): boolean { return this.isDiving && this.diveTraveled >= this.diveMaxDistance - 1e-6; }

    // ==================== 击球范围调试绘制(默认开启) ====================
    /** 调试开关: 线框绘制判定区域(前方扇形/背后窄扇/高度带/鱼跃矩形/脚下十字), 不遮挡角色 */
    public static dbgRange = true;
    private _dbgNode: Laya.Sprite3D | null = null;
    private _dbgLines: Laya.PixelLineRenderer | null = null;
    private static _dbgC1: Laya.Color | null = null;
    private static _dbgC2: Laya.Color | null = null;
    private static _dbgC3: Laya.Color | null = null;
    private static _dbgC4: Laya.Color | null = null;
    private static _dbgC5: Laya.Color | null = null;
    private static _dbgC6: Laya.Color | null = null;

    private _ballHolderNode: Laya.Sprite3D | null = null;

    constructor(root: Laya.Sprite3D, attr?: ChaAttr) {
        super(root);

        if (attr) {
            this.id = attr.id ?? this.id;
            this.side = attr.side ?? this.side;
            this.spd = attr.spd ?? this.spd;
            this.hitRange = attr.hitRange ?? this.hitRange;
            this.state = attr.state ?? this.state;
            this.upTime = attr.upTime ?? this.upTime;
        }

        this._ani = new Ani(root);
        this._ani.rootMotion = true;

        const findBone = (node: Laya.Node, name: string): Laya.Sprite3D | null => {
            if (node.name === name && node instanceof Laya.Sprite3D) return node;
            for (let i = 0; i < node.numChildren; i++) {
                const found = findBone(node.getChildAt(i), name);
                if (found) return found;
            }
            return null;
        };

        this._ballHolderNode = findBone(this.root, "LP");
        if (!this._ballHolderNode) {
            console.warn("[Cha] 未找到 LP 骨骼，持球跟随使用备用位置。");
        }

        const sc = new Laya.Script();
        sc.onUpdate = this.update.bind(this);
        sc.onLateUpdate = () => {
        this._ani.update();
        }
        root.addComponentInstance(sc);


        Au.load("hit", "nor/girl/au/hit.MP3");
    }

    public playAnim(name: string, fade: number = 0.05): void {
        this._ani.crossFade(name, fade);
    }

    public freezeAnim(): void {
        this._ani.freeze();
    }

    public unfreezeAnim(): void {
        this._ani.unfreeze();
    }

    public setAnimSpeed(speed: number): void {
        this._ani.setSpeed(speed);
    }

    /** 当前动画同步快照：只包含离散状态 ID，不发送动画进度、速度或冻结状态。 */
    public getAnimationSyncState(): { id: number } {
        return { id: this._ani.currentStateId };
    }

    /** 当前动画状态 ID，供客户端向权威端请求纠正。 */
    public getAnimationStateId(): number {
        return this._ani.currentStateId;
    }

    /** 应用离散动画状态 ID；只在动画状态不同时切换，不同步进度。 */
    public applyAnimationStateId(stateId: number): boolean {
        return this._ani.syncStateById(stateId, 0.05);
    }

    /** 应用远端动画快照。兼容旧 name 字段，但不读取 normalizedTime。 */
    public applyAnimationSync(anim: any): void {
        if (!anim) return;
        if (Number.isInteger(anim.id)) {
            this.applyAnimationStateId(anim.id);
            return;
        }
        if (typeof anim.name === "string" && anim.name) this._ani.syncState(anim.name);
    }

    public setHolding(): void {
        this.isP = true;
    }

    public get ballHolderNode(): Laya.Sprite3D | null {
        return this._ballHolderNode;
    }

    public setMoveSpeed(power: number): void {
        const intPower = Math.floor(Math.max(0, power) * 10);
        this._movePower = intPower;
        if (intPower <= 0) return;
        this._ani.setSpeed(Math.max(0.3, intPower / 5));
    }

    public get moveDir(): Laya.Vector3 { return this._moveDir; }
    public get isMoving(): boolean { return this._isMoving; }
    /** 最近一次 move 调用的本地角(0~10 力度语义, PVP 校正消息透传用) */
    private _lastMoveAngle = 0;
    private _lastMovePower = 0;
    /** 当前移动状态(供 PVP 校正消息透传真实移动而非一律 stop): null=未在移动 */
    public get moveState(): { ang: number, power: number } | null {
        return this._isMoving ? { ang: this._lastMoveAngle, power: this._lastMovePower } : null;
    }

    // ==================== 击球范围调试绘制 ====================

    /**
     * 调试绘制判定区域(由 Mag.update 每帧喂参, 默认开启)。
     * 全线段构建(PixelLineRenderer)不遮挡角色:
     * - 前方扇形: rangeF 半径 × angF 半角(本地+z 前方), 底/顶两条弧 + 端点竖线 = 立体高度带
     * - 背后窄扇: rangeB × angB(暗红)
     * - 鱼跃矩形: 沿冲出方向(世界系角) len×wid 橙色框(近似 dot>0.35 延伸判定)
     * - 脚下十字 + 中心竖线(白): 对照视觉模型与逻辑位置(x/y/z)的偏移
     * 高度带: y ∈ [cha.y+hMin, cha.y+hMax](jumphit 时 hMax 含 highBonus)。
     */
    public dbgHitRange(o: {
        rangeF: number, angF: number,
        rangeB: number, angB: number,
        hMin: number, hMax: number,
        dive?: { ang: number, len: number, wid: number } | null,
        ball?: { x: number, y: number, z: number } | null
    }): void {
        if (!Cha.dbgRange) { this._disposeDbg(); return; }
        this._ensureDbg();
        const L = this._dbgLines;
        if (!L) return;

        if (!Cha._dbgC1) {
            Cha._dbgC1 = new Laya.Color(0.2, 1, 0.4, 1);    // 前方绿
            Cha._dbgC2 = new Laya.Color(1, 0.3, 0.3, 1);    // 背后红
            Cha._dbgC3 = new Laya.Color(1, 0.62, 0.1, 1);   // 鱼跃橙
            Cha._dbgC4 = new Laya.Color(1, 1, 1, 1);        // 位置十字/前向白
            Cha._dbgC5 = new Laya.Color(0, 1, 1, 1);        // 球连线青
            Cha._dbgC6 = new Laya.Color(1, 1, 0.2, 1);      // 球竖线黄
        }
        L.clear();

        const rot = this.root.transform.rotation;
        const cy = this.y;
        // 本地扇形弧点: 本地前方=+z, θ∈[-half,half](前) / [180-half,180+half](后)
        const arc = (r: number, half: number, back: boolean, h: number, out: Laya.Vector3[]): void => {
            const base = back ? 180 : 0;
            const segs = 10;
            for (let i = 0; i <= segs; i++) {
                const th = (base - half + (2 * half * i / segs)) * Math.PI / 180;
                const local = new Laya.Vector3(Math.sin(th) * r, 0, Math.cos(th) * r);
                const world = new Laya.Vector3();
                Laya.Vector3.transformQuat(local, rot, world);
                out.push(new Laya.Vector3(this.x + world.x, cy + h, this.z + world.z));
            }
        };
        const drawArc = (pts: Laya.Vector3[], c: Laya.Color): void => {
            for (let i = 0; i < pts.length - 1; i++) L.addLine(pts[i], pts[i + 1], c, c);
        };

        // 前方扇形: 底弧 + 顶弧 + 两端竖线(立体高度带)
        const bot: Laya.Vector3[] = []; const top: Laya.Vector3[] = [];
        arc(o.rangeF, o.angF, false, o.hMin, bot);
        arc(o.rangeF, o.angF, false, o.hMax, top);
        drawArc(bot, Cha._dbgC1!);
        drawArc(top, Cha._dbgC1!);
        if (bot.length === top.length) {
            L.addLine(bot[0], top[0], Cha._dbgC1!, Cha._dbgC1!);
            L.addLine(bot[bot.length - 1], top[top.length - 1], Cha._dbgC1!, Cha._dbgC1!);
        }

        // 背后窄扇(底弧)
        const back: Laya.Vector3[] = [];
        arc(o.rangeB, o.angB, true, o.hMin, back);
        drawArc(back, Cha._dbgC2!);

        // 鱼跃矩形: 沿冲出方向(receiveAngle 世界系角, atan2(x,z) 语义 0=+z——与判定同步) len×wid
        if (o.dive) {
            const rad = o.dive.ang * Math.PI / 180;
            const dir = new Laya.Vector3(Math.sin(rad), 0, Math.cos(rad));
            const perp = new Laya.Vector3(-dir.z, 0, dir.x);
            const w2 = o.dive.wid / 2;
            const dy = cy + Math.max(0.1, o.hMin + 0.35);
            const c = (d: number, s: number): Laya.Vector3 => new Laya.Vector3(
                this.x + dir.x * d + perp.x * s, dy, this.z + dir.z * d + perp.z * s);
            const n0 = c(0.15, -w2), n1 = c(0.15, w2), f0 = c(o.dive.len, -w2), f1 = c(o.dive.len, w2);
            L.addLine(n0, n1, Cha._dbgC3!, Cha._dbgC3!);
            L.addLine(f0, f1, Cha._dbgC3!, Cha._dbgC3!);
            L.addLine(n0, f0, Cha._dbgC3!, Cha._dbgC3!);
            L.addLine(n1, f1, Cha._dbgC3!, Cha._dbgC3!);
        }

        // 脚下十字 + 中心竖线(白): 逻辑位置 vs 视觉模型偏移对照
        const w = Cha._dbgC4!;
        const gy = cy + 0.02;
        L.addLine(new Laya.Vector3(this.x - 0.35, gy, this.z), new Laya.Vector3(this.x + 0.35, gy, this.z), w, w);
        L.addLine(new Laya.Vector3(this.x, gy, this.z - 0.35), new Laya.Vector3(this.x, gy, this.z + 0.35), w, w);
        L.addLine(new Laya.Vector3(this.x, cy + o.hMin, this.z), new Laya.Vector3(this.x, cy + o.hMax, this.z), w, w);

        // 前向箭头(白亮): 本地+z(逻辑判定前方)世界化 1.6m —— 与角色视觉面朝对照,
        // 偏差即"模型朝向 vs 判定朝向"根因(击球侧转/扇形画歪的直接证据)
        {
            const fwd = new Laya.Vector3();
            Laya.Vector3.transformQuat(new Laya.Vector3(0, 0, 1), rot, fwd);
            const sy = cy + 0.9;
            L.addLine(
                new Laya.Vector3(this.x, sy, this.z),
                new Laya.Vector3(this.x + fwd.x * 1.6, sy, this.z + fwd.z * 1.6), w, w);
        }

        // 球可视化(黄竖线+青连线): 一眼看出球与扇形/十字的距离与角度关系
        if (o.ball) {
            const y = Cha._dbgC6!;
            L.addLine(
                new Laya.Vector3(o.ball.x, 0.02, o.ball.z),
                new Laya.Vector3(o.ball.x, o.ball.y + 0.6, o.ball.z), y, y);
            const c5 = Cha._dbgC5!;
            L.addLine(
                new Laya.Vector3(this.x, cy + 0.5, this.z),
                new Laya.Vector3(o.ball.x, o.ball.y, o.ball.z), c5, c5);
        }
    }

    /** 懒建调试渲染节点(挂 Scene3D 不挂角色 root: 免受角色缩放影响, 场景销毁连带清理) */
    private _ensureDbg(): void {
        if (this._dbgNode && !this._dbgNode.destroyed && this._dbgLines) return;
        if (!this._dbgNode || this._dbgNode.destroyed) {
            this._dbgNode = new Laya.Sprite3D("cha_dbg_" + this.id);
            const scene3d: any = (Laya.stage.getChildByName("root") as any)?.getChildByName("Scene3D") || (Laya.stage as any)._scene3Ds?.[0];
            if (!scene3d) return;
            scene3d.addChild(this._dbgNode);
            this._dbgLines = null;
        }
        if (!this._dbgLines) {
            this._dbgLines = new Laya.PixelLineRenderer();
            this._dbgLines.maxLineCount = 96;
            this._dbgNode.addComponentInstance(this._dbgLines);
        }
    }

    /** 摘除调试绘制节点 */
    private _disposeDbg(): void {
        if (this._dbgNode && !this._dbgNode.destroyed) this._dbgNode.destroy();
        this._dbgNode = null;
        this._dbgLines = null;
    }

    public move(pos: { x: number; y: number; z: number }): void;
    public move(angle: number, power: number): void;
    public move(arg1: { x: number; y: number; z: number } | number, arg2?: number): void {
        // 强制站位：不受动作锁定影响
        if (typeof arg1 === "object") {
            this.x = arg1.x;
            this.y = arg1.y;
            this.z = arg1.z;
            return;
        }

        // 特殊击球无瞬移(用户规格): 移动照常只是最大速度变快/变慢(diving 2 倍/jumphit 减半),
        // 旧 diving 手动移动拦截删除; 后摇期间仍禁玩家手动移动(补偿/驱动放行)
        if (this.state === ChaState.HIT_RECOVERY && !this.compMoving && !this.diveDriving) return;
        if (!this.canAct && !this.compMoving) return;

        const angle = arg1;
        const power = Math.max(0, arg2 ?? 0);
        const intPower = Math.floor(power * 10);
        this._lastMoveAngle = angle;
        this._lastMovePower = power;

        if (intPower <= 0) {
            this._isMoving = false;
            this._movePower = 0;
            // 停止移动时必须同步逻辑状态；否则远端帧一直报告 MOVE，权威端反复执行 stop，
            // 动画/状态机永久不一致。击球前摇/后摇状态不在这里覆盖。
            if (this.state === ChaState.MOVE) this.state = ChaState.IDLE;
            this._ani.crossFade("stand", 0.5);
            return;
        }


        const rad = angle * Math.PI / 180;
        const intentX = Math.cos(rad);
        const intentZ = Math.sin(rad);

        // 本项目约定：角色视觉右侧对应局部 -X
        const localIntent = new Laya.Vector3(-intentX, 0, intentZ);
        const worldIntent = new Laya.Vector3();

        Laya.Vector3.transformQuat(localIntent, this.root.transform.rotation, worldIntent);
        worldIntent.y = 0;

        if (worldIntent.x !== 0 || worldIntent.z !== 0) {
            Laya.Vector3.normalize(worldIntent, worldIntent);
        }

        const wasMoving = this._isMoving;   // 必须在设置 true 之前捕获，否则永远为 true
        this._moveDir.setValue(worldIntent.x, 0, worldIntent.z);
        this._isMoving = true;
        this._movePower = intPower;

        this._moveDir.setValue(worldIntent.x, 0, worldIntent.z);
        this._isMoving = true;
        this._movePower = intPower;

        // ★ 只在从静止变为移动时重置计时，避免每帧 move 清空 elapsedMs
        if (!wasMoving) {
            this._lastUpdateTime = Timer.now();
        }

        let animAngle = Math.atan2(intentX, intentZ) * 180 / Math.PI;
        if (animAngle < 0) animAngle += 360;
        const newIdx = Math.round(animAngle / 45) % 8;

        // 击球过程中移动保持原击球动画，不互相覆盖。
        if (this.state === ChaState.IDLE || this.state === ChaState.MOVE) {
            if (this.state !== ChaState.MOVE) {
                this.state = ChaState.MOVE;
                this._lastMoveAnimIdx = newIdx;
                this._ani.crossFade(ANIM_NAMES[newIdx], 0.1);
            } else if (newIdx !== this._lastMoveAnimIdx) {
                this._lastMoveAnimIdx = newIdx;
                this._ani.crossFade(ANIM_NAMES[newIdx], 0.1);
            }
        }

        // 特殊击球移速快慢(用户规格): jumphit 减半 / diving 2 倍 / 普通 1 倍
        const actionSpeed = this.isJumping ? this.jumpMoveSpeedScale
            : (this.isDiving ? this.diveSpeedScale : 1);
        this._ani.setSpeed(Math.max(0.3, intPower / 5 * actionSpeed));
    }

    /** 开始/切换接球动作，Mag 在确定球后使用 */
    public beginReceiveAction(action: ReceiveAction): void {
        this.receiveAction = action;
        if (action === "diving") {
            // 鱼跃限距(用户规格: 达最大距离必须终止): 记起始位置供累计位移
            this.diveTraveled = 0;
            this._diveStartX = this.x;
            this._diveStartZ = this.z;
        }
        if (action === "none") {
            this._ani.setSpeed(1);
        }
    }

    // ==================== 跳跃系统(用户规格 v2) ====================

    /** 起跳: 按住不松一直起跳直到最大跳跃高度(到顶自动开始下降, 用户规格"达到最大高度必须开始下降") */
    public beginJump(): void {
        this._jumpBaseY = this.y - this.jumpY;
        this._jumpLastMs = Timer.now();
        this.jumpPhase = 'up';
    }

    /** 转下降: 按当前高度规划下降速度与时长(高度越高后摇越长; downDur+150 = 后摇, 保证后摇内真实落地) */
    private _planDescent(): void {
        this.jumpPhase = 'down';
        this._jumpLastMs = Timer.now();
        // 下降时长 = 基础 400ms + 高度加成 600ms(满高) → 速度 = 高度 / 时长
        this._jumpDownDur = 400 + (this.jumpY / this.jumpMaxH) * 600;
        this._jumpDownSpd = Math.max(this.jumpY, 0.001) / (this._jumpDownDur / 1000);
    }

    /** 松手时刻: 停止上升开始下降(在此高度击球); 已在下降/已落地则无操作 */
    public endJump(): void {
        if (this.jumpPhase !== 'up') return;
        this._planDescent();
    }

    /** 强制复位(收尾/回合重置兜底): 正常路径已自然落地(jumpY=0 无瞬移);
     *  异常路径(超时起身时还在空中)才瞬移落地——用户规格"不能直接回到原点高度" */
    public resetJump(): void {
        if (this.jumpY > 0.001) {
            // 兜底: 还在空中, 强制落地
            this.jumpY = 0;
            this.y = this._jumpBaseY;
        }
        this.jumpPhase = 'none';
        this._jumpDownSpd = 0;
        this._jumpDownDur = 0;
    }

    /** 后摇时长 = 下降时长 + 150ms 缓冲(用户规格: 必须计算好时间在达到后摇时间前真实的落地) */
    public jumpRecoveryDur(): number {
        const downDur = this._jumpDownDur > 0 ? this._jumpDownDur : 400 + (this.jumpY / this.jumpMaxH) * 600;
        return downDur + 150;
    }

    /** 跳跃积分(update 驱动): up 到顶自动转 down(用户规格); down 按规划速度真实落地 */
    private _updateJump(dtMs: number): void {
        if (this.jumpPhase === 'up') {
            const rise = (this.jumpMaxH / this.jumpRiseDur) * dtMs;
            this.jumpY = Math.min(this.jumpY + rise, this.jumpMaxH);
            if (this.jumpY >= this.jumpMaxH) this._planDescent();  // 到顶即降
        } else if (this.jumpPhase === 'down') {
            this.jumpY = Math.max(0, this.jumpY - this._jumpDownSpd * dtMs / 1000);
            if (this.jumpY <= 0) { this.jumpPhase = 'none'; this._jumpDownSpd = 0; this._jumpDownDur = 0; }
        } else {
            return;
        }
        this.y = this._jumpBaseY + this.jumpY;
    }

    public get(): any {
        return {
            id: this.id,
            side: this.side,
            spd: this.spd,
            hitRange: this.hitRange,
            state: this.state,
            receiveAction: this.receiveAction
        };
    }

    public set(data: Partial<any>): void {
        Object.assign(this, data);
    }

    public update(): void {
        const now = Timer.now();

        // 移动与击球状态解耦：IDLE/MOVE/HIT_WINDUP/HIT_RECOVERY 都允许移动；
        // diving/jumphit 移动照常(特殊击球只有移速快慢, 无瞬移)
        const canIntegrateMove =
            this._isMoving &&
            this._movePower > 0 &&
            (this.state !== ChaState.HIT_RECOVERY || this.compMoving || this.diveDriving);

        if (canIntegrateMove) {
            let elapsedMs = now - this._lastUpdateTime;
            if (elapsedMs > 50) elapsedMs = 50;
            if (elapsedMs < 0) elapsedMs = 0;
            this._lastUpdateTime = now;

            const actionSpeed = this.isJumping ? this.jumpMoveSpeedScale
                : (this.isDiving ? this.diveSpeedScale : 1);
            let totalDist = this.spd * (this._movePower / 10) * actionSpeed * elapsedMs / 1000;

            // 鱼跃限距(用户规格: 达最大距离必须终止): 截断本步位移到剩余额度,
            // 截断后 move 照常(_isMoving 保持, 状态收尾由 mag 滞留分支查 diveDone 起身)
            if (this.isDiving) {
                const remain = this.diveMaxDistance - this.diveTraveled;
                if (remain <= 0) {
                    totalDist = 0;
                } else if (totalDist > remain) {
                    totalDist = remain;
                }
                this.diveTraveled += totalDist;
            }

            if (totalDist > 0) {
                this.x += this._moveDir.x * totalDist;
                this.z += this._moveDir.z * totalDist;
            }
        } else {
            this._lastUpdateTime = now;
        }

        // 跳跃 y 轴积分(按住起跳/松手下降, 高度变化过程按后摇时间规划)——独立时间戳
        if (this.jumpPhase !== 'none') {
            let jumpDt = now - this._jumpLastMs;
            if (jumpDt > 50) jumpDt = 50;
            if (jumpDt < 0) jumpDt = 0;
            this._jumpLastMs = now;
            this._updateJump(jumpDt);
        }
    }

    public destroy(): void {
        super.destroy();


        this._ani = undefined;
    }
}
