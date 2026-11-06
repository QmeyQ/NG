/**
 * CUI - Control 专用 UI
 *
 * 职责：
 * - 移动摇杆：背景圆 + 白点 + 回旋镖
 * - hit 摇杆：动态箭头（+ 单手模式红箭头），不绘制底圈，
 *   箭头起点 = hit 控件中心，最大长度 = 屏幕最短边一半，形状随屏幕尺寸缩放。
 *
 * 与 UI.ts 的场景 HUD（比分/倒计时等）分离，只服务 Control 的触摸交互。
 *
 * 关于回旋镖：
 * - 回旋镖是「移动摇杆白点的渲染替代形态」，由 _boomerangMode 布尔控制。
 * - 只影响渲染，不影响任何移动操作逻辑（原点、方向、力度都由 Control 决定）。
 * - 移动摇杆不可见时，setBoomerangMode 只记录标志，下次 showJoystick 才生效。
 *
 * 关于两个箭头的形状：
 * - hit 滑动箭头 与 单手模式 angH 红箭头 共用 _drawArrowShape 同一套绘制逻辑。
 * - hit 箭头：长度 = 滑动距离（上限 hitMaxRadius），颜色淡绿。
 * - angH 红箭头：固定最大长度（= _hitMaxRadius），只按 angH 旋转，颜色红。
 *   方向做左右镜像：angleDeg=0 指向左，+90 指向上，-90 指向下。
 */
export class CUI {
    // ============================================================
    // 移动摇杆
    // ============================================================

    /** 移动摇杆容器（背景圆 + 白点 + 回旋镖） */
    private _joystickContainer: Laya.Sprite;

    /** 场景 move 控件底座(可选, anchor 0.5 中心); null = 程序化底圈 */
    private _moveBase: any = null;
    /** 移动摇杆背景圆 */
    private _bg: Laya.Sprite;
    /** 移动摇杆白点 */
    private _dot: Laya.Sprite;
    /** 移动摇杆最大半径（像素） */
    private _maxRadius: number = 100;
    /** 回旋镖（双击 hit 时替换白点显示） */
    private _boomerang: Laya.Sprite;
    /** 回旋镖模式：特殊接球期间为 true，移动摇杆用回旋镖替代白点 */
    private _boomerangMode: boolean = false;

    // ============================================================
    // hit 摇杆（箭头）
    // ============================================================

    /** hit 动态箭头（滑动方向/力度） */
    private _hitArrow: Laya.Sprite;
    /** hit 单手模式 angH 红箭头 */
    private _hitAngleArrow: Laya.Sprite;

    /** hit 底圈半径（= 最大操作区域半径） */
    private _hitMaxRadius: number = 110;
    /** hit 常驻位置（右下角） */
    private _hitRestX: number = 0;
    private _hitRestY: number = 0;
    /** hit 判定矩形区域 */
    private _hitZoneX: number = 0;
    private _hitZoneY: number = 0;
    private _hitZoneW: number = 0;
    private _hitZoneH: number = 0;

    constructor() {
        this._createUI();
        this.resetHitZone();
    }

    // ============================================================
    // 创建 UI 元素
    // ============================================================

    private _createUI(): void {
        // ---------- 移动摇杆 ----------
        this._joystickContainer = new Laya.Sprite();
        this._joystickContainer.visible = false;
        Laya.stage.addChild(this._joystickContainer);

        this._bg = new Laya.Sprite();
        this._bg.graphics.drawCircle(0, 0, this._maxRadius, "#000000", "#333333", 2);
        this._bg.alpha = 0.6;
        this._joystickContainer.addChild(this._bg);

        this._dot = new Laya.Sprite();
        this._dot.graphics.drawCircle(0, 0, this._maxRadius * 0.25, "#ffffff", "#cccccc", 2);
        this._dot.alpha = 0.9;
        this._joystickContainer.addChild(this._dot);

        this._boomerang = new Laya.Sprite();
        this._boomerang.visible = false;
        this._joystickContainer.addChild(this._boomerang);


        // ---------- hit 动态箭头（滑动方向/力度） ----------
        this._hitArrow = new Laya.Sprite();
        this._hitArrow.visible = false;
        Laya.stage.addChild(this._hitArrow);

        // ---------- hit 单手模式 angH 红箭头 ----------
        this._hitAngleArrow = new Laya.Sprite();
        this._hitAngleArrow.visible = false;
        Laya.stage.addChild(this._hitAngleArrow);
    }

    // ============================================================
    // 移动摇杆方法
    // ============================================================

    /**
     * 显示移动摇杆。
     * 回旋镖模式开启时画回旋镖，否则画白点。
     * 底座: 注入场景 move 控件(anchor 0.5 中心)时用控件(移到按下位置+visible), 程序化底圈隐藏;
     * 未注入时退回程序化 _bg 底圈。
     */
    showJoystick(x: number, y: number): void {
        this._joystickContainer.visible = true;
        this._joystickContainer.pos(x, y);
        this._dot.pos(0, 0);

        if (this._moveBase) {
            this._moveBase.visible = true;
            // anchor 0.5 → pos 即视觉中心, 直接放按下位置
            this._moveBase.pos(x, y);
            this._bg.visible = false;
        } else {
            this._bg.visible = true;
        }

        if (this._boomerangMode) {
            this._drawBoomerangShape(0);
            this._boomerang.pos(0, 0);
            this._boomerang.visible = true;
            this._dot.visible = false;
        } else {
            this._dot.visible = true;
            this._boomerang.visible = false;
            this._boomerang.graphics.clear();
        }
    }

    /**
     * 隐藏移动摇杆。
     * 不重置 _boomerangMode，下次 showJoystick 会按模式重画。
     */
    hideJoystick(): void {
        this._joystickContainer.visible = false;
        if (this._moveBase) this._moveBase.visible = false;
    }

    /**
     * 注入场景 move 控件作移动摇杆底座(anchor 0.5 中心, 显示/位置由 showJoystick/hideJoystick 控)。
     * null = 撤销注入退回程序化底圈。
     * 【用户规格: move 控件大小 = 摇杆范围】注入时同步取控件舞台系短边一半为 maxRadius
     * (localToGlobal 两点法含父链缩放; anchor 0.5 → 本地(0,0) 即中心; 下限 40 防未布局 0);
     * 白点半径同比例重画。无底座时保持程序化默认半径。
     */
    setMoveBase(node: any): void {
        this._moveBase = node || null;
        if (this._moveBase) {
            try {
                const w = Number(this._moveBase.width) || 0;
                const h = Number(this._moveBase.height) || 0;
                const p0 = this._moveBase.localToGlobal(new Laya.Point(0, 0));
                const pw = this._moveBase.localToGlobal(new Laya.Point(w, 0));
                const ph = this._moveBase.localToGlobal(new Laya.Point(0, h));
                const vw = Math.abs(pw.x - p0.x);
                const vh = Math.abs(ph.y - p0.y);
                const r = Math.max(Math.min(vw, vh) * 0.5, 40);
                this._maxRadius = r;
                // 白点跟随新半径重画
                this._dot.graphics.clear();
                this._dot.graphics.drawCircle(0, 0, r * 0.25, "#ffffff", "#cccccc", 2);
            } catch (e) {
                console.warn('[CUI] move 控件半径测量失败, 保持默认', e);
            }
        }
        // 摇杆显示中切换: 立即应用新底座形态
        if (this._joystickContainer.visible) {
            if (this._moveBase) {
                this._moveBase.visible = true;
                this._moveBase.pos(this._joystickContainer.x, this._joystickContainer.y);
                this._bg.visible = false;
            } else {
                this._bg.visible = true;
            }
        } else if (this._moveBase) {
            this._moveBase.visible = false;
        }
    }

    /**
     * 切换回旋镖形态。
     * 只影响「移动摇杆上的点如何渲染」，不影响任何移动操作逻辑。
     * 若摇杆当前可见，立即切换；不可见则只记录，下次 showJoystick 时生效。
     */
    setBoomerangMode(on: boolean): void {
        if (this._boomerangMode === on) return;
        this._boomerangMode = on;

        // 摇杆不可见：只记标志
        if (!this._joystickContainer.visible) return;

        // 摇杆可见：立即切换
        if (on) {
            this._drawBoomerangShape(0);
            this._boomerang.pos(this._dot.x, this._dot.y);
            this._boomerang.visible = true;
            this._dot.visible = false;
        } else {
            this._boomerang.visible = false;
            this._boomerang.graphics.clear();
            this._dot.visible = true;
        }
    }

    /** 当前是否处于回旋镖形态 */
    get boomerangMode(): boolean { return this._boomerangMode; }

    /**
     * 更新移动摇杆拖拽点位置。
     * 若回旋镖正在显示，回旋镖跟随移动并根据 angle 重绘朝向。
     */
    updateDot(dx: number, dy: number, angle?: number): void {
        this._dot.pos(dx, dy);
        if (this._boomerang.visible) {
            this._boomerang.pos(dx, dy);
            if (angle !== undefined) {
                this._drawBoomerangShape(angle);
            }
        }
    }

    get maxRadius(): number { return this._maxRadius; }

    setMaxRadius(radius: number): void {
        this._maxRadius = radius;
        this._bg.graphics.clear();
        this._bg.graphics.drawCircle(0, 0, radius, "#000000", "#333333", 2);
    }

    // ============================================================
    // hit 区域
    // ============================================================

    /** 重置 hit 区域到默认右下角 */
    resetHitZone(): void {
        const W = Laya.stage.width;
        const H = Laya.stage.height;
        // 最大滑动距离 = 屏幕最短边一半（竖屏即 width 一半）
        const R = Math.min(W, H) * 0.5;

        this._hitMaxRadius = R;
        this._hitZoneW = R * 2;
        this._hitZoneH = R * 2;
        this._hitRestX = W - R - 30;
        this._hitRestY = H - R - 30;
        this._hitZoneX = this._hitRestX - R;
        this._hitZoneY = this._hitRestY - R;

        this.resetHitJoystick();
    }

    /** 自定义 hit 区域 */
    setHitZone(x: number, y: number, width: number, height: number): void {
        this._hitZoneX = x;
        this._hitZoneY = y;
        this._hitZoneW = width;
        this._hitZoneH = height;
        // 最大滑动距离 = 屏幕最短边一半（与控件大小无关）
        this._hitMaxRadius = Math.min(Laya.stage.width, Laya.stage.height) * 0.5;
        this._hitRestX = x + width * 0.5;
        this._hitRestY = y + height * 0.5;

        this.resetHitJoystick();
    }

    /** 点是否落在 hit 区域 */
    isInHitZone(x: number, y: number): boolean {
        if (this._hitZoneW <= 0 || this._hitZoneH <= 0) return false;
        return x >= this._hitZoneX && x <= this._hitZoneX + this._hitZoneW
            && y >= this._hitZoneY && y <= this._hitZoneY + this._hitZoneH;
    }

    get hitMaxRadius(): number { return this._hitMaxRadius; }
    get hitRestX(): number { return this._hitRestX; }
    get hitRestY(): number { return this._hitRestY; }

    /**
     * hit 摇杆回到常驻状态：
     * - 箭头隐藏清空
     * - 单手模式红箭头隐藏清空
     */
    resetHitJoystick(): void {
        this._hitArrow.visible = false;
        this._hitArrow.graphics.clear();
        this._hitAngleArrow.visible = false;
        this._hitAngleArrow.graphics.clear();
    }

    // ============================================================
    // hit 动态箭头
    // ============================================================

    /**
     * hit 激活：箭头起点定位到操作原点（手指按下位置）。
     */
    showHitJoystick(x: number, y: number): void {
        this._hitArrow.pos(x, y);
        this._hitArrow.graphics.clear();
        this._hitArrow.visible = true;

        this._hitAngleArrow.pos(x, y);
        this._hitAngleArrow.graphics.clear();
        this._hitAngleArrow.visible = false;
    }

    /**
     * 动态绘制 hit 箭头（滑动方向/力度）。
     * - 起点 (0, 0) = 跟手底圈圆心 = 滑动起点
     * - 头部尖端严格在 (dx, dy)
     * - 长度由 Control 侧按滑动距离裁剪，不超底圈
     * - special: 特殊击球模式仅换图标颜色(橙色), 绘制效果(起点/尖端/长度)完全沿用
     */
    drawHitArrow(dx: number, dy: number, distance: number, special: boolean = false): void {
        const g = this._hitArrow.graphics;
        g.clear();

        if (distance < 1) return;

        this._drawArrowShape(g, dx, dy, distance, special ? "255,140,0" : "175,189,152");
    }

    /**
     * 单手模式 angH 红箭头。
     * - 长度固定 = _hitMaxRadius（屏幕最短边一半），不随时间缩放。
     * - 只按 angleDeg 旋转。
     * - 方向做左右镜像（与 hit 滑动箭头左右对称）：
     *     angleDeg =   0 → 指向左
     *     angleDeg = +90 → 指向上
     *     angleDeg = -90 → 指向下
     * - 与 hit 滑动箭头共用 _drawArrowShape，保证形状一致。
     */
    drawHitAngleArrow(angleDeg: number, _length?: number): void {
        const g = this._hitAngleArrow.graphics;
        g.clear();
        this._hitAngleArrow.visible = true;

        const R = this._hitMaxRadius;
        const rad = angleDeg * Math.PI / 180;
        // ★ 左右镜像：x 分量取反，0° 时指向左而非右
        const dx = -Math.cos(rad) * R;
        // 屏幕 y 向下，取负让 +90° 指向上方
        const dy = -Math.sin(rad) * R;

        this._drawArrowShape(g, dx, dy, R, "255,51,51");
    }

    /** 隐藏 hit 箭头（底圈状态不变） */
    hideHitArrow(): void {
        this._hitArrow.visible = false;
        this._hitArrow.graphics.clear();
    }

    /** 隐藏单手模式红箭头 */
    hideHitAngleArrow(): void {
        this._hitAngleArrow.visible = false;
        this._hitAngleArrow.graphics.clear();
    }

    // ============================================================
    // 箭头形状公共绘制
    // ============================================================

    /**
     * 箭头形状公共绘制：楔形箭杆 + 三角头部。
     * - 起点固定 (0, 0)，尖端严格在 (dx, dy)。
     * - 头部长度：占 30%，上限按屏幕最短边 3% 缩放。
     * - 楔形宽度：随 t 从 startWidth 线性增至 maxWidth，宽度基准按屏幕最短边缩放。
     * - 颜色通过 rgb 字符串（"r,g,b"）传入，箭杆按 t 变化 alpha，头部固定 0.7。
     * hit 滑动箭头 与 单手模式 angH 红箭头 都调用本方法，保证形状一致。
     */
    private _drawArrowShape(
        g: Laya.Graphics,
        dx: number,
        dy: number,
        distance: number,
        rgb: string
    ): void {
        if (distance < 1) return;

        // 屏幕尺寸缩放基准（最短边，竖屏即 width）
        const minLen = Math.min(Laya.stage.width, Laya.stage.height);

        const angle = Math.atan2(dy, dx);
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const perpX = -sinA;
        const perpY = cosA;

        const totalLen = distance;
        // 头部长度：占 30%，上限随屏幕最短边缩放（约 3%，750 基准 ≈ 22.5px）
        const headLen = Math.min(totalLen * 0.3, minLen * 0.03);
        // 楔形长度 = 总长 - 头部长
        const shaftLen = Math.max(0, totalLen - headLen);

        // 楔形宽度（基准随屏幕最短边缩放）
        const maxWidth = Math.max(minLen * 0.008, totalLen * 0.2);
        const startWidth = Math.max(minLen * 0.003, maxWidth * 0.1);

        const shaftRatio = totalLen > 0 ? shaftLen / totalLen : 0;
        const shaftDx = dx * shaftRatio;
        const shaftDy = dy * shaftRatio;

        // ---------- 楔形部分：从 (0,0) 到 (shaftDx, shaftDy) ----------
        const segments = Math.max(3, Math.floor(shaftLen / 8));
        for (let i = 0; i < segments; i++) {
            const t1 = i / segments;
            const t2 = (i + 1) / segments;
            const x1 = shaftDx * t1;
            const y1 = shaftDy * t1;
            const x2 = shaftDx * t2;
            const y2 = shaftDy * t2;
            const w1 = (startWidth + (maxWidth - startWidth) * t1) * 0.5;
            const w2 = (startWidth + (maxWidth - startWidth) * t2) * 0.5;

            const p1x = x1 + perpX * w1;
            const p1y = y1 + perpY * w1;
            const p2x = x1 - perpX * w1;
            const p2y = y1 - perpY * w1;
            const p3x = x2 - perpX * w2;
            const p3y = y2 - perpY * w2;
            const p4x = x2 + perpX * w2;
            const p4y = y2 + perpY * w2;

            const alpha = 0.1 + 0.55 * t2;
            g.drawPoly(0, 0, [p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y],
                `rgba(${rgb},${alpha})`, null, 0);
        }

        // ---------- 头部：尖端严格在 (dx, dy) ----------
        const headHalfW = maxWidth * 0.5;
        const headP1x = dx;
        const headP1y = dy;
        const headP2x = shaftDx + perpX * headHalfW;
        const headP2y = shaftDy + perpY * headHalfW;
        const headP3x = shaftDx - perpX * headHalfW;
        const headP3y = shaftDy - perpY * headHalfW;
        g.drawPoly(0, 0, [headP1x, headP1y, headP2x, headP2y, headP3x, headP3y],
            `rgba(${rgb},0.7)`, null, 0);
    }

    // ============================================================

    // 回旋镖绘制（双击 hit 时替换白点）
    // ============================================================

    /**
     * 绘制回旋镖形状。
     * 两个镜像的钝角三角形，共用边 tip-notch，关于该边对称。
     *   tip   = ( R,       0)
     *   wing1 = ( 0,       R)
     *   notch = ( R*0.45,  0)
     *   wing2 = ( 0,      -R)
     */
    private _drawBoomerangShape(angle: number): void {
        const R = this._maxRadius * 0.25;
        const g = this._boomerang.graphics;
        g.clear();

        const rad = angle * Math.PI / 180;
        const cosA = Math.cos(rad);
        const sinA = Math.sin(rad);

        const rot = (px: number, py: number): [number, number] => [
            px * cosA + py * sinA,
            -px * sinA + py * cosA,
        ];

        const tip = rot(R, 0);
        const w1 = rot(0, R);
        const notch = rot(R * 0.45, 0);
        const w2 = rot(0, -R);

        // 下翼
        g.drawPoly(0, 0, [
            tip[0], tip[1],
            w1[0], w1[1],
            notch[0], notch[1],
        ], "#ffcc33", "#aa8800", 1);

        // 上翼
        g.drawPoly(0, 0, [
            tip[0], tip[1],
            notch[0], notch[1],
            w2[0], w2[1],
        ], "#e6b800", "#aa8800", 1);
    }

    /** 隐藏回旋镖，恢复移动摇杆白点（同时退出回旋镖模式） */
    hideBoomerang(): void {
        this._boomerang.visible = false;
        this._boomerang.graphics.clear();
        this._dot.visible = true;
        this._boomerangMode = false;
    }

    // ============================================================
    // 生命周期
    // ============================================================

    destroy(): void {
        this._joystickContainer.removeSelf();

        this._hitArrow.removeSelf();
        this._hitAngleArrow.removeSelf();
        this._boomerangMode = false;
    }
}