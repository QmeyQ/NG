/**
 * MT — 数学计算库(平台自适应 + 微积分)
 *
 * 职责:
 * 1. 平台自适应基础运算: 特性检测一次性选定最优实现(hypot/expm1/cbrt/fma),
 *    老引擎(低端 JavaScriptCore / 旧基础库)自动降级手写实现, 新平台用原生(防溢出/精度更优)。
 * 2. 微积分工具: MT.integ(Simpson 数值积分) / MT.deriv(中心差分数值微分) /
 *    MT.osc(呼吸振荡) / ProgModel(基于微分方程解析解的进度预测模型)。
 * 3. 项目内任何需要"微积分/平滑预测/振荡动画"的地方一律调本库, 不得散落手写
 *    (已知调用方: slecet 呼吸与加载预测进度)。物理引擎 phy.rk4 是专用积分器
 *    (性能关键路径, 内联状态), 不迁移仅共享本库的平台自适应运算。
 *
 * 平台差异说明(特性检测, 不 import 环境层——web/微信同规则):
 * - Math.hypot: ES2015+, 多参数防溢出路径; 缺失时降级 sqrt(x*x+y*y) 双参形态
 * - Math.expm1: 小值域 e^x-1 精度; 缺失时降级 Math.exp(x)-1
 * - Math.cbrt: 立方根含负数语义; 缺失时降级 Math.pow(x,1/3) 修负数
 * - fma(融合乘加): JS 无原生, 统一 a*b+c(未来平台若暴露 SIMD 可单点替换此处)
 */

type NumFn = (x: number) => number;

export class MT {

    // ==================== 平台自适应(一次性特性检测) ====================

    private static _picked = false;
    private static _hypot: (...v: number[]) => number;
    private static _expm1: (x: number) => number;
    private static _cbrt: (x: number) => number;

    private static _pick(): void {
        if (MT._picked) return;
        MT._picked = true;
        const M: any = Math;
        MT._hypot = typeof M.hypot === 'function' ? M.hypot : ((...v: number[]) => {
            let s = 0;
            for (const x of v) s += x * x;
            return Math.sqrt(s);
        });
        MT._expm1 = typeof M.expm1 === 'function' ? M.expm1 : ((x: number) => Math.exp(x) - 1);
        MT._cbrt = typeof M.cbrt === 'function' ? M.cbrt : ((x: number) => x < 0 ? -Math.pow(-x, 1 / 3) : Math.pow(x, 1 / 3));
    }

    /** 欧氏范数(多参, 平台原生防溢出优先) */
    static hypot(...v: number[]): number {
        MT._pick();
        return MT._hypot.apply(null, v);
    }

    /** e^x - 1(小值精度优先) */
    static expm1(x: number): number {
        MT._pick();
        return MT._expm1(x);
    }

    /** 立方根(负数语义正确) */
    static cbrt(x: number): number {
        MT._pick();
        return MT._cbrt(x);
    }

    /** 融合乘加 a*b+c(JS 无原生 fma, 单点收口供未来平台替换) */
    static fma(a: number, b: number, c: number): number {
        return a * b + c;
    }

    // ==================== 微积分 ====================

    /**
     * 数值积分(Simpson 1/3 复合公式): ∫[a,b] f(x) dx。
     * n 为偶数子区间数(自动校正奇数+1), 精度 O(h^4)。
     */
    static integ(f: NumFn, a: number, b: number, n = 64): number {
        if (n < 2) n = 2;
        if (n & 1) n++;
        const h = (b - a) / n;
        let s = f(a) + f(b);
        for (let i = 1; i < n; i++) {
            s += f(a + i * h) * (i & 1 ? 4 : 2);
        }
        return s * h / 3;
    }

    /**
     * 数值微分(中心差分): f'(x) ≈ (f(x+h) - f(x-h)) / 2h, 精度 O(h^2)。
     */
    static deriv(f: NumFn, x: number, h = 1e-4): number {
        return (f(x + h) - f(x - h)) / (2 * h);
    }

    /**
     * 呼吸振荡: 值域 [lo, hi] 内以 period(ms) 周期往复(不对称修正 sin 天然对称,
     * 起点在 lo)。不确定进度的标准视觉(探测/校验等待)。
     */
    static osc(t: number, period: number, lo = 0, hi = 1): number {
        if (period <= 0) return lo;
        const s = (Math.sin(t / period * Math.PI * 2) + 1) * 0.5;
        return lo + (hi - lo) * s;
    }

    /**
     * 平滑渐近映射: x∈[0,1] → 0→1 且斜率单调衰减(二阶平滑, 两端速度为 0)。
     * 优于线性(无跳变感)与 easeOut(起点速度最大)。
     */
    static smooth(x: number): number {
        const c = Math.max(0, Math.min(1, x));
        return c * c * (3 - 2 * c);
    }
}

/**
 * PID 误差反馈控制器(微积分驱动, MT 库收口):
 *   out = Kp·e + Ki·∫e·dt + Kd·de/dt
 * - 积分项: 梯形法 ∫ ≈ Σ (e_k + e_{k-1})/2 · Δt —— 消系统性偏差(力度长期打短)
 * - 微分项: 差分 de/Δt —— 抑制超调震荡(修正过头时反向刹车)
 * - anti-windup: 积分限幅; 输出限幅
 * 采样极慢的场景(如 AI 每回合一次落点反馈)同样适用——dt 任意、无漂移。
 */
export class PIDCtrl {
    private _kp: number;
    private _ki: number;
    private _kd: number;
    private _outMax: number;
    private _iMax: number;

    private _integ = 0;          // ∫e dt(梯形累加)
    private _lastErr: number | null = null;  // null = 首次无微分
    private _lastOut = 0;

    constructor(kp: number, ki: number, kd: number, outMax: number, iMax: number) {
        this._kp = kp; this._ki = ki; this._kd = kd;
        this._outMax = outMax; this._iMax = iMax;
    }

    /** 喂入一次误差样本(误差语义: 正=输出该增大), dt 秒; 返回当前总修正输出 */
    feed(err: number, dt: number): number {
        if (dt <= 0) dt = 1e-3;
        // 积分(梯形: 与上次误差取均值乘 dt)
        this._integ += (err + (this._lastErr ?? err)) * 0.5 * dt;
        if (this._iMax > 0) {
            const lim = this._iMax / (this._ki || 1);
            if (this._integ > lim) this._integ = lim;
            if (this._integ < -lim) this._integ = -lim;
        }
        // 微分(后向差分; 首次样本无微分)
        const d = this._lastErr === null ? 0 : (err - this._lastErr) / dt;
        this._lastErr = err;

        const out = this._kp * err + this._ki * this._integ + this._kd * d;
        this._lastOut = Math.max(-this._outMax, Math.min(this._outMax, out));
        return this._lastOut;
    }

    /** 最近一次修正输出(未再采样时沿用) */
    get out(): number { return this._lastOut; }

    reset(): void {
        this._integ = 0;
        this._lastErr = null;
        this._lastOut = 0;
    }
}

/**
 * 进度预测模型(微积分驱动的"合理假进度"):
 *
 * 数学模型 —— 一阶渐近微分方程:
 *   dp/dt = k·(1-p),  p(0) = p0
 * 分离变量积分(∫ dp/(1-p) = ∫ k dt → -ln(1-p) = k·t + C):
 *   p(t) = 1 - (1-p0)·e^(-k·t)
 * 性质: 速度 ∝ 剩余距离——初期快、后期慢、永不到 1(渐近), 是"未知总时长任务"
 * 的最优预测形态(越接近完成越不敢冒进, 完成时 finish() 精确跳 1 无回退)。
 *
 * tick 用解析解逐步推进(每步以当前 p 为初值重积分, 累积无漂移);
 * MT.integ 数值积分通道保留给任意 v(t) 场景(本模型解析解更稳不走数值)。
 */
export class ProgModel {
    /** 渐近速率(1/ms): 越大越快到高位。经验值 0.003 ≈ 1s 到 95% */
    public k: number;
    private _p = 0;
    /** 真实进度锚(外部已知确切值时设入, 预测只在真值之上渐近) */
    private _real = -1;

    constructor(k = 0.003) {
        this.k = k;
    }

    /** 推进 dt 毫秒(解析解逐步积分, 任意 dt 无漂移) */
    tick(dt: number): void {
        if (dt <= 0 || this._p >= 1) return;
        this._p = 1 - (1 - this._p) * Math.exp(-this.k * dt);
    }

    /** 外部真进度(0~1): 预测值与真值取大, 真值只升不降 */
    anchor(real: number): void {
        if (real >= 0 && real > this._real) this._real = Math.min(real, 1);
    }

    /** 当前预测进度(真值锚优先) */
    get value(): number {
        return this._real >= 0 ? Math.max(this._real, this._p * 0.98) : this._p;
    }

    /** 完成: 精确置 1 */
    finish(): void {
        this._p = 1;
        this._real = 1;
    }
}