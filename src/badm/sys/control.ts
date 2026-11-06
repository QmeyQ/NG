/**
 * Control - 输入控制器
 *
 * 本版重点：
 * - UI 从 Control 中独立为 CUI。
 * - 取消双击移动 / 第二触点（TOUCH2）/ MOV2 / DOBMOV 逻辑，只保留双击 hit。
 * - 双击 hit 区域触发特殊接球（鱼跃/跳杀），移动摇杆白点切换为回旋镖箭头。
 * - hit 区域设置合并进 add()：控件 name === "hit" 时自动读取控件位置与大小配置区域，
 *   摇杆操作原点 = 手指按下位置（控件区域只做按下判定）。
 * - hit 不绘制底圈；箭头最大长度 = 屏幕最短边一半（竖屏即 width 一半）。
 * - angH 由移动摇杆方向决定，默认正前方。
 * - angV 由 hit 滑动方向决定：上半圈从左到右 0→90，下半圈从左到右 0→-90。
 * - power 由 hit 滑动距离决定。
 * - 移动摇杆：直接用「按下起点」到「当前点」的绝对偏移计算方向和力度。
 *
 * 新增：
 * - sin：单手 / 双手模式切换。true=单手（默认），false=双手。
 *   单手：angH 由 hit 按住时长（最长 0.7s）× 滑动方向（上=+/下=-）决定；
 *         angV 由 hit 滑动方向决定（上半圈 0→90，下半圈 0→-90）；
 *         hit 摇杆额外绘制红色 angH 指示箭头。
 *   双手：angV 由移动摇杆方向决定（上推=+90 高球，下推=-90 下压，左右=0 平抽），
 *         无移动时默认 30 度；angH 由 hit 滑动方向映射水平全向角
 *         （上滑=正前 0，右滑=90，下滑=180，左滑=270）；
 *         hit 摇杆不画红箭头；power 均由 hit 滑动距离决定。
 * - 双击 hit 只切换「特殊接球」这个游戏逻辑标志（并让移动摇杆白点渲染为回旋镖），
 *   完全不改变移动操作逻辑：谁按移动区谁开自己的摇杆，
 *   原点仍是按下点，方向 / 力度仍按原有算法走。
 * - 多指触摸：_moveActive 只被移动手指改写；_hitActive 只被击球手指改写；
 *   特殊模式只是一个布尔量，与上面两条链互不持有引用。
 *   触摸路由按「触摸点 id」精确分流（start/move/end 三事件都带 id），
 *   第二根手指按下（TOUCH2）同样参与 hit/移动区域判定——双指先移动后击球成立。
 */
import { Timer } from "../../libs/time";
import { Inp, InpFlag } from "../../libs/inp";
import { CUI } from "../../ui/cui";
import { MPMD, MPM } from "../../libs/mpm";

export class Control {
    private _stage: Laya.Stage;
    private _inp: Inp;
    private _cui: CUI;

    public readonly region: MPMD = new MPMD(100);
    public readonly events: MPM = new MPM();
    public readonly mpmd: Map<any, any> = new Map();
    public readonly mpm: Map<string, any> = new Map();

    private _seq = 0;

    private _moveActive = false;
    private _hitActive = false;
    private _specialHitActive = false;
    /** 特殊击球 angV 冻结标志(单手模式): 产生有效滑动(hitMinDistance)即冻结蓄力累计 */
    private _angVFrozen = false;


    /** 当前驱动 hit 摇杆的触摸点 id（-1 = 无；用 id 不用 finger 序号防撞号） */
    private _hitId = -1;
    /** 当前驱动移动摇杆的触摸点 id（-1 = 无） */
    private _moveId = -1;

    /** 移动摇杆按下起点（绝对屏幕坐标） */
    private _moveStart = new Laya.Vector2();
    /** 最近一次移动点（绝对屏幕坐标，仅用于记录/调试） */
    private _lastMove = new Laya.Vector2();

    private _hitStart = new Laya.Vector2();

    private _lastMoveAngle = 0;

    /** 单手模式 angH 蓄力时长上限(ms): 松手立即出手后, 按住越久 angH 越大(上限即满蓄力) */
    public maxHoldTime = 500;

    public hitMaxRadius = 110;
    public fixedHitRegion = true;
    public hitMinDistance = 20;

    public defaultHitPower = 0.5;
    public defaultAngH = 90;
    public defaultAngV = 90;

    public onMove: ((angle: number, power: number) => void) | null = null;
    public onHit: ((params?: any, spi?: Laya.Vector3) => void) | null = null;
    public onStop: (() => void) | null = null;

    /** 特殊接球（双击 hit）输入回调：active=true 表示持续期间 */
    public onSpecialHit: ((active: boolean, angle: number, power: number) => void) | null = null;

    public enableMove = true;
    public enableHit = true;

    // ============================================================
    // 控制模式
    // ============================================================

    /**
     * 单手模式开关：
     *   true  = 单手（默认，angH 由 hit 按住时长决定，hit 摇杆画红箭头）；
     *   false = 双手（angV 由移动方向决定，angH 由 hit 滑动方向决定，不画红箭头）。
     *   由 badm.ts 读取 menu 设置页 double 开关（localStorage "double"）赋值。
     */
    public sin: boolean = true;

    // ============================================================
    // 单手模式状态
    // ============================================================

    /** hit 按下时刻（ms），仅在 _hitActive 期间有效 */
    private _hitStartTime = 0;
    /** 单手模式下由按住时长推算出的 angH（-90 ~ +90） */
    private _hitAngle = 0;
    /** 单手模式：滑动方向符号（+1 上 / -1 下），中途改变方向不重置计时 */
    private _hitDirSign = 1;
    /** 最近一次 hit 的滑动信息（用于按时间重算 angH 与结算） */
    private _hitLastVx = 0;
    private _hitLastVy = 0;
    private _hitLastDistance = 0;

    // ============================================================
    // 双手模式状态
    // ============================================================

    /** 当前移动力度（0 表示没有移动方向） */
    private _currentMovePower = 0;

    constructor(stage: Laya.Stage, options?: any) {
        this._stage = stage;
        this._inp = new Inp(stage);
        this._cui = new CUI();

        Object.assign(this, options || {});
        if (this.fixedHitRegion) {
            this.hitMaxRadius = this._cui.hitMaxRadius;
        }
        this._bindInpEvents();
        // 屏幕适配/Relation 重算后控件舞台矩形变化, 刷新已注册区域(hit 判定区跟手)
        this._stage.on(Laya.Event.RESIZE, this, () => this.refreshRegion());
    }

    /** 暴露给外部的 CUI 实例（按需读取半径/位置等） */
    public get cui(): CUI { return this._cui; }

    /** 暴露 Inp 事件队列入口(用户规格): 外部经 ctrl.inp.on('dobclick', cb) 注册手势事件, 统一双击判定 */
    public get inp(): Inp { return this._inp; }

    // ============================================================
    // 区域注册 / 反查 / 命中
    // ============================================================

    /**
     * 注册可交互控件。
     * 若控件 name === "hit"，自动用控件位置与大小配置 hit 区域。
     */
    public add(
        control: any,
        event: string = "click",
        callback?: (...args: any[]) => void,
        id?: string
    ): string {
        const rect = this._getControlRect(control);
        const key = id || `${control?.name || "control"}_${++this._seq}`;

        const region = {
            id: key,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            control: control,
            event: event,
            callback: callback,
        };

        this.mpmd.set(control, region);
        this.mpm.set(key, region);
        this.region.add(region);
        if (callback) this.events.on(key, callback);

        // 控件 name 为 "hit"：自动配置 hit 区域
        if (control?.name === "hit") {
            this._cui.setHitZone(rect.x, rect.y, rect.width, rect.height);
            this.hitMaxRadius = this._cui.hitMaxRadius;
        }

        return key;
    }

    public remove(controlOrId: any): void {
        const region = typeof controlOrId === "string"
            ? this.mpm.get(controlOrId)
            : this.mpmd.get(controlOrId);
        if (!region) return;

        this.region.del(region);
        this.events.unon(region.id);
        this.mpm.delete(region.id);
        if (region.control) this.mpmd.delete(region.control);

        // 被移除的是 hit 控件：重置 hit 区域到默认
        if (region.control?.name === "hit") {
            this._cui.resetHitZone();
            this.hitMaxRadius = this._cui.hitMaxRadius;
        }
    }

    public refresh(control: any): void {
        const region = this.mpmd.get(control);
        if (!region) return;

        this.region.del(region);

        const rect = this._getControlRect(control);
        region.x = rect.x;
        region.y = rect.y;
        region.width = rect.width;
        region.height = rect.height;

        this.region.add(region);

        // hit 控件刷新：同步更新 hit 区域
        if (control?.name === "hit") {
            this._cui.setHitZone(rect.x, rect.y, rect.width, rect.height);
            this.hitMaxRadius = this._cui.hitMaxRadius;
        }
    }

    public refreshRegion(control?: any): void {
        if (control) {
            this.refresh(control);
            return;
        }
        for (const c of this.mpmd.keys()) this.refresh(c);
    }

    public contains(region: any, x: number, y: number): boolean {
        if (region.radius !== undefined) {
            const cx = region.x + region.width * 0.5;
            const cy = region.y + region.height * 0.5;
            const dx = x - cx;
            const dy = y - cy;
            return dx * dx + dy * dy <= region.radius * region.radius;
        }
        return x >= region.x &&
            x <= region.x + region.width &&
            y >= region.y &&
            y <= region.y + region.height;
    }

    public hit(x: number, y: number): any {
        const candidates = this.region.get([x, y, x + 1, y + 1]) as Set<any>;

        let result: any = null;
        for (const r of candidates) {
            if (this.contains(r, x, y)) result = r;
        }
        return result;
    }

    public emit(region: any, ...args: any[]): boolean {
        if (this.events.has(region.id)) {
            this.events.emit(region.id, ...args);
            return true;
        }

        const control: any = region.control;
        if (!control) return false;

        const eventBus = control.event;
        if (eventBus?.emit) {
            eventBus.emit(region.event, region.callback, ...args);
            return true;
        }
        if (typeof control.emit === "function") {
            control.emit(region.event, region.callback, ...args);
            return true;
        }
        if (eventBus && typeof eventBus[region.event] === "function") {
            eventBus[region.event](region.callback, ...args);
            return true;
        }
        if (typeof control.event === "function") {
            control.event(region.event, region.callback, ...args);
            return true;
        }
        return false;
    }

    // ============================================================
    // 输入事件绑定
    // ============================================================

    /**
     * 每帧刷新。
     * 单手模式下 hit 的 angH 依赖按住时长，必须每帧重算并上抛。
     */
    public update(): void {
        if (this.sin && this._hitActive) {
            const prev = this._hitAngle;
            this._refreshSingleHandAngH();

            // angH 有明显变化时重算一次（结算按「时间 × 方向」）
            if (Math.abs(this._hitAngle - prev) > 0.5 &&
                this._hitLastDistance >= this.hitMinDistance) {
                const params = this._calcHitParams(
                    this._hitLastVx, this._hitLastVy, this._hitLastDistance);
                if (params) this.onHit?.(params, new Laya.Vector3(0, 0, 0));
            }
        }
    }

    private _bindInpEvents(): void {
        this._inp.on("start", (flag, x, y, finger, id) => {
            // DOBTOUCH：连点第二击按下(用户规格: 连续点击并按住 = 进入特殊击球)。
            // 只有 finger 0 会带 DOBTOUCH 位(Inp 已完成双击判定, 此处不再双重判定——
            // 旧 control 侧 _lastTapTime/_lastTapPos 自算与 Inp 失同步是误触源之一)
            if (flag & InpFlag.DOBTOUCH) {
                // 连点第二击在 hit 区域: 进入特殊击球视觉模式(用户规格: hit 基础操作不变,
                // 只是绘制的箭头样式变了)——第二击同时作为正常击球按下(_startHit 全链照常:
                // 滑动蓄力/松手结算击球, mag 侧按 receiveAction 姿态出手)
                if (this.enableHit && this._isPointInHitRegion(x, y)) {
                    // 清第一击残留摇杆(防双通道并发, 不触发击球)
                    this._cancelHit();
                    // 视觉模式 + 姿态通知(onSpecialHit(true) → mag 进 diving/jumphit),
                    // 绘制切换为特殊叠加三角样式
                    this.setSpecialHit(true);
                    // 第二击 = 正常击球开始(基础操作链不变)
                    this._startHit(x, y, id);
                    return;
                }

                // 普通 hit
                if (this.enableHit && this._isPointInHitRegion(x, y)) {
                    this._startHit(x, y, id);
                    return;
                }

                if (this.enableMove && !this._moveActive) this._startMove(x, y, id);
                return;
            }

            // TOUCH=finger0, TOUCH2=finger1: 双指都要走区域判定
            // (先按移动摇杆再按 hit 区时, hit 是第二根手指, 只判 TOUCH 会漏掉)
            if (flag & (InpFlag.TOUCH | InpFlag.TOUCH2)) {
                if (this.enableHit && !this._hitActive && this._isPointInHitRegion(x, y)) {
                    this._startHit(x, y, id);
                    return;
                }
                if (this.enableMove && !this._moveActive) this._startMove(x, y, id);
            }
        });

        this._inp.on("move", (flag, x, y, dx, dy, finger, id) => {
            if (flag & InpFlag.MOV) {
                // ★ 严格按触摸点 id 路由：移动手指只走 _updateMove，击球手指只走 _updateHit
                //   (每根手指各发一次 MOV 事件, 不按 id 过滤会互相污染坐标)
                if (this._moveActive && id === this._moveId) this._updateMove(x, y);
                if (this._hitActive && id === this._hitId) this._updateHit(x, y);
            }
        });

        this._inp.on("end", (flag, finger, id) => {
            // 全部手指抬起: 双摇杆一起收(兜底)
            if (flag & InpFlag.UPALL) {
                if (this._moveActive) this._stopMove();
                if (this._hitActive) this._releaseHit();
                return;
            }

            // 按触摸点 id 精确收: 抬哪根手指停哪个摇杆, 不误伤另一根
            if (id === this._hitId && this._hitActive) this._releaseHit();
            if (id === this._moveId && this._moveActive) this._stopMove();
        });

        this._inp.on("keymov", (flag, angle, power) => {
            if (power <= 0) {
                this.onMove?.(0, -1);
                this.onStop?.();
                return;
            }
            if (this.enableMove) {
                this._lastMoveAngle = angle;
                this._currentMovePower = power;
                this.onMove?.(angle, power);
            }
        });

        this._inp.on("key", (flag, key, pressed) => { });
    }

    // ============================================================
    // 区域判断
    // ============================================================

    private _isPointInHitRegion(x: number, y: number): boolean {
        let hasHitRegion = false;
        for (const r of this.mpm.values()) {
            if (r.event === "hit") {
                hasHitRegion = true;
                if (this.contains(r, x, y)) return true;
            }
        }
        if (hasHitRegion) return false;
        if (this.fixedHitRegion) return this._cui.isInHitZone(x, y);
        return x >= this._stage.width * 0.45;
    }

    // ============================================================
    // 特殊接球模式（双击 hit 触发 / 游戏逻辑结束时关闭）
    // ============================================================

    /**
     * 进入 / 退出特殊接球（鱼跃/跳杀）模式。
     * 只切换游戏逻辑标志与移动摇杆的渲染形态，不改变移动操作逻辑：
     *   - 移动摇杆不可见时，只记录 _boomerangMode，下次 showJoystick 才生效；
     *   - 移动摇杆可见时，立即切换白点 / 回旋镖。
     * 可由双击 hit 调用，也可由游戏逻辑（Mag）在动作结束时调用。
     */
    public setSpecialHit(active: boolean): void {
        if (this._specialHitActive === active) return;
        this._specialHitActive = active;

        // 切换移动摇杆白点 → 回旋镖 / 回旋镖 → 白点
        this._cui.setBoomerangMode(active);

        // hit 箭头绘制效果完全沿用(用户规格): 激活时箭头由 _updateHit 照常画(仅换图标色),
        // 退出时收掉箭头(_releaseHit 也会 hide, 幂等)
        if (!active) {
            this._cui.hideHitArrow();
        }

        this.onSpecialHit?.(active, this._lastMoveAngle, this._currentMovePower);
    }

    /** 只读：是否处于特殊接球模式 */
    public get isSpecialHit(): boolean { return this._specialHitActive; }

    // ============================================================
    // 移动逻辑
    // ============================================================

    private _startMove(x: number, y: number, id: number = -1): void {
        this._moveActive = true;
        this._moveId = id;
        this._moveStart.setValue(x, y);
        this._lastMove.setValue(x, y);
        this._currentMovePower = 0;
        // CUI 内部按 _boomerangMode 自动决定画白点还是回旋镖
        this._cui.showJoystick(x, y);
    }

    /**
     * 移动摇杆：
     * 直接用「按下起点（_moveStart）」到「当前点（x, y）」的偏移量
     * 计算方向与力度，不做任何增量累加。
     */
    private _updateMove(x: number, y: number): void {
        if (!this.enableMove || !this._moveActive) return;

        this._lastMove.setValue(x, y);

        const totalX = x - this._moveStart.x;
        const totalY = y - this._moveStart.y;
        const distance = Math.hypot(totalX, totalY);

        // 回到起点：视为力度为 0
        if (distance <= 0.001) {
            this._currentMovePower = 0;
            this._cui.updateDot(0, 0, this._lastMoveAngle);
            this.onMove?.(this._lastMoveAngle, 0);
            return;
        }

        const limited = Math.min(distance, this._cui.maxRadius);
        const cos = totalX / distance;
        const sin = totalY / distance;

        const dotX = cos * limited;
        const dotY = sin * limited;

        const power = limited / this._cui.maxRadius;
        this._currentMovePower = power;

        // 屏幕 y 向下为正，输出角度转为数学坐标（y 向上）
        const outAngle = (Math.atan2(-totalY, totalX) * 180 / Math.PI + 360) % 360;
        this._lastMoveAngle = outAngle;

        // 更新摇杆点（回旋镖模式下同时更新回旋镖朝向）
        this._cui.updateDot(dotX, dotY, outAngle);

        // ★ 移动始终走 onMove，与特殊接球无关
        // (特殊模式期间严禁在此重绘 hit 箭头——移动方向会覆盖击球滑动箭头 = 绘制错乱根因)
        this.onMove?.(outAngle, power);
    }

    private _stopMove(): void {
        if (!this._moveActive) return;
        this._moveActive = false;
        this._moveId = -1;
        this._currentMovePower = 0;

        // ★ 只松移动，不去动 _specialHitActive / onSpecialHit
        this._cui.hideJoystick();
        this.onMove?.(0, -1);
        this.onStop?.();
    }

    // ============================================================
    // 击球逻辑
    // ============================================================

    private _startHit(x: number, y: number, id: number = -1): void {

        this._hitActive = true;
        this._hitId = id;
        // 操作原点 = 手指按下位置（滑动向量从按下点起算）
        this._hitStart.setValue(x, y);
        this._hitStartTime = Timer.now();
        this._hitAngle = 0;
        this._hitDirSign = 1;
        this._hitLastVx = 0;
        this._hitLastVy = 0;
        this._hitLastDistance = 0;
        this._angVFrozen = false;  // 新击球重置冻结(特殊击球滑动后停 angV 累计)

        this.hitMaxRadius = this._cui.hitMaxRadius;
        Timer.start("hitHold");

        this._cui.showHitJoystick(this._hitStart.x, this._hitStart.y);

        // 单手模式下立刻刷新一次红箭头（初始为 0）
        if (this.sin) {
            this._cui.drawHitAngleArrow(this._hitAngle, 0);
        }
    }

    /**
     * 用绝对坐标 (x, y) 更新击球。
     * 最大刚好绘制到底圈边缘，不超框。
     * 特殊击球模式绘制效果完全沿用(用户规格): 同一支箭头(起点=按下点/尖端=手指位/
     * 长度=滑动距离), 仅图标颜色切换为橙色标识模式。
     */
    private _updateHit(x: number, y: number): void {
        if (!this._hitActive || !this.enableHit) return;

        let vx = x - this._hitStart.x;
        let vy = y - this._hitStart.y;
        let distance = Math.hypot(vx, vy);

        const maxDist = this.hitMaxRadius;
        if (distance > maxDist) {
            const s = maxDist / distance;
            vx *= s;
            vy *= s;
            distance = maxDist;
        }

        this._hitLastVx = vx;
        this._hitLastVy = vy;
        this._hitLastDistance = distance;

        // 特殊击球滑动冻结(用户规格: 产生滑动后立即停止 angV 累计, 单手模式):
        // 跳跃击球高度随跳跃高度变化(cha.jumpY), 鱼跃低姿——蓄力渐进不再适用,
        // 有效滑动(hitMinDistance)达成即冻结 _hitAngle, 保留此刻值直至本次击球结束
        if (this._specialHitActive && !this._angVFrozen && distance >= this.hitMinDistance) {
            this._angVFrozen = true;
        }

        // 绘制完全沿用, 特殊模式仅换图标色(橙色)
        this._cui.drawHitArrow(vx, vy, distance, this._specialHitActive);

        // 单手模式：更新方向符号 + 刷新蓄力角
        if (this.sin) {
            if (Math.abs(vy) > 5) {
                this._hitDirSign = vy < 0 ? 1 : -1;
            }
            this._refreshSingleHandAngH();
        }

        if (distance < this.hitMinDistance) return;

        const params = this._calcHitParams(vx, vy, distance);
        this.onHit?.(params, new Laya.Vector3(0, 0, 0));
    }

    /**
     * 单手模式：根据按住时长和滑动方向刷新 angH。
     *   angH = sign × (min(elapsed, 1000) / 1000) × 90
     *   上滑 sign = +1，下滑 sign = -1
     * 中途改变方向只改变 sign，不重置计时。
     * 特殊击球(跳跃/鱼跃)产生滑动后冻结(用户规格): 击球高度由姿态决定(jumpY 跳跃高度/
     * 鱼跃低姿), 按住蓄力渐进(angV 累计)不再适用——滑动一产生即停止累计, 保留冻结时刻值。
     */
    private _refreshSingleHandAngH(): void {
        if (this._specialHitActive && this._angVFrozen) return;
        const elapsed = Timer.now() - this._hitStartTime;
        const t = Math.min(Math.max(elapsed, 0), this.maxHoldTime) / this.maxHoldTime;
        this._hitAngle = this._hitDirSign * t * 90;

        // 红箭头长度随时间增长，视觉反馈
        const len = 30 + 60 * t;
        this._cui.drawHitAngleArrow(this._hitAngle, len);
    }

    /**
     * 击球参数计算：
     *   power 由 hit 滑动距离决定（两种模式一致）。
     *   单手模式：angH 由 hit 滑动方向映射水平全向角（_getSlideAngH，往哪滑往哪打）；
     *             angV 由按住时长×上下滑动符号决定（_hitAngle，上滑区按住渐进挑高/下滑区压球）。
     *   双手模式：angH 由移动摇杆方向映射水平全向角；angV 由 hit 滑动竖直分量决定（上滑高球/下滑压球）。
     */
    private _calcHitParams(dx: number, dy: number, distance: number) {
    if (distance < this.hitMinDistance) return null;

    const power = Math.min(distance / this.hitMaxRadius, 1) * 100;

    let angH: number;
    let angV: number;

    if (this.sin) {
        angH = this._getSlideAngH(dx, dy);
        angV = this._hitAngle;
    } else {
        let raw = this._currentMovePower > 0
            ? (180 - (Math.atan2(-Math.sin(this._lastMoveAngle * Math.PI / 180),
                                   Math.cos(this._lastMoveAngle * Math.PI / 180)) * 180 / Math.PI))
            : 90;
        raw = ((raw % 360) + 360) % 360;
        if (raw > 180) raw = 360 - raw;
        angH = raw;

        const vRatio = Math.max(-1, Math.min(1, -dy / this.hitMaxRadius));
        angV = 90 * vRatio;
    }

    return {
        power: power > 0 ? power : this.defaultHitPower * 100,
        angH,
        angV,
    };
}

/**
 * hit 滑动方向 → angH（[0, 180]）。
 * dx/dy 为屏幕滑动向量（y 向下为正）。
 * 坐标系：左=0, 上=90, 右=180, 下=270。
 * 180-360 映射到 180-0（后方半球翻到前方，左右不变）。
 */
private _getSlideAngH(dx: number, dy: number): number {
    const mathAngle = Math.atan2(-dy, dx) * 180 / Math.PI; // 标准数学极角
    let angH = 180 - mathAngle;
    angH = ((angH % 360) + 360) % 360;  // 归一化 [0, 360)
    if (angH > 180) angH = 360 - angH;  // 180-360 → 180-0
    console.log(angH)
    return angH;
}

    /** 无击球取消普通击球摇杆(连点进特殊击球时清第一击残留; 不触发 onHit) */
    private _cancelHit(): void {
        if (!this._hitActive) return;
        this._hitActive = false;
        this._hitId = -1;
        this._angVFrozen = false;
        this._cui.hideHitArrow();
        this._cui.hideHitAngleArrow();
        this._cui.resetHitJoystick();
        Timer.clear("hitHold");
    }

    private _releaseHit(): void {
        if (!this._hitActive) return;
        this._hitActive = false;
        this._hitId = -1;
        this._angVFrozen = false;

        // 松手 = 立即出手: 先带参结算最终参数(刷新 WINDUP 中 stroke), 再空参触发立即击球
        // (特殊击球同链——receiveAction 姿态由 mag 侧出手时生效, 基础操作不变)
        if (this._hitLastDistance >= this.hitMinDistance) {
            const params = this._calcHitParams(
                this._hitLastVx, this._hitLastVy, this._hitLastDistance);
            if (params) this.onHit?.(params, new Laya.Vector3(0, 0, 0));
        }
        this.onHit?.();

        this._cui.hideHitArrow();
        this._cui.hideHitAngleArrow();
        this._cui.resetHitJoystick();
        Timer.clear("hitHold");

        // 特殊击球视觉模式退出(基础击球链已走完; onSpecialHit(false) → mag 收尾姿态兜底)
        if (this._specialHitActive) this.setSpecialHit(false);
    }

    // ============================================================
    // 工具
    // ============================================================

    setMaxRadius(radius: number): void {
        this._cui.setMaxRadius(radius);
    }

    private _getControlRect(control: any): { x: number; y: number; width: number; height: number } {
        if (control?.getBounds) {
            const b = control.getBounds();
            // 触摸判定在舞台坐标系: 控件 x/y/width/height 是本地值,
            // 场景根按屏幕适配缩放后本地≠舞台(判定区与显示区错位)——
            // localToGlobal 两点法取舞台系外接矩形(含父链缩放/旋转)
            try {
                const w0 = Number(control.width) || 0;
                const h0 = Number(control.height) || 0;
                const p1 = control.localToGlobal(new Laya.Point(0, 0));
                const p2 = control.localToGlobal(new Laya.Point(w0, h0));
                const x = Math.min(p1.x, p2.x);
                const y = Math.min(p1.y, p2.y);
                const w = Math.abs(p2.x - p1.x);
                const h = Math.abs(p2.y - p1.y);
                if (w > 0 && h > 0) {
                    return { x, y, width: w, height: h };
                }
            } catch { }
            return {
                x: Number(control.x ?? b.x ?? 0),
                y: Number(control.y ?? b.y ?? 0),
                width: Number(control.width ?? b.width ?? 0),
                height: Number(control.height ?? b.height ?? 0),
            };
        }

        if (control?.width !== undefined || control?.height !== undefined) {
            return {
                x: Number(control.x ?? control.pos?.x ?? 0),
                y: Number(control.y ?? control.pos?.y ?? 0),
                width: Number(control.width ?? 0),
                height: Number(control.height ?? 0),
            };
        }

        const t = control?.transform;
        const p = t?.position;
        const b = control?.boundBox || control?._boundBox;
        if (b) {
            const min = b.min || b.minValue;
            const max = b.max || b.maxValue;
            if (min && max) {
                return {
                    x: Number(p?.x ?? 0) + Number(min.x ?? 0),
                    y: Number(p?.y ?? 0) + Number(min.y ?? 0),
                    width: Number(max.x ?? 0) - Number(min.x ?? 0),
                    height: Number(max.z ?? 0) - Number(min.z ?? 0),
                };
            }
        }

        return { x: Number(p?.x ?? 0), y: Number(p?.z ?? 0), width: 1, height: 1 };
    }

    destroy(): void {
        this._inp.destroy();
        this._cui.destroy();
        this.region.clear();
        this.events.unon();
        this.mpm.clear();
        this.mpmd.clear();
    }
}