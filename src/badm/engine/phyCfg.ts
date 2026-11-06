/**
 * PhyCfg - 物理配置与向量数学工具类
 * 提供 V3 静态向量运算、物理参数默认值（Params）、状态结构（State）、网碰撞参数、球区域配置等定义
 */
import { Timer } from "../../libs/time";
import { MPMD } from "../../libs/mpm";

// ===================== 向量数学（避免临时对象） =====================
export class V3 {
    static readonly ZERO = new Laya.Vector3(0, 0, 0);
    static readonly UP = new Laya.Vector3(0, 1, 0);
    static readonly RIGHT = new Laya.Vector3(1, 0, 0);
    static readonly FORWARD = new Laya.Vector3(0, 0, 1);

    static copy(a: Laya.Vector3, out: Laya.Vector3): Laya.Vector3 {
        out.x = a.x; out.y = a.y; out.z = a.z; return out;
    }
    static add(a: Laya.Vector3, b: Laya.Vector3, out: Laya.Vector3): Laya.Vector3 {
        out.x = a.x + b.x; out.y = a.y + b.y; out.z = a.z + b.z; return out;
    }
    static addScaled(a: Laya.Vector3, b: Laya.Vector3, s: number, out: Laya.Vector3): Laya.Vector3 {
        out.x = a.x + b.x * s; out.y = a.y + b.y * s; out.z = a.z + b.z * s; return out;
    }
    static sub(a: Laya.Vector3, b: Laya.Vector3, out: Laya.Vector3): Laya.Vector3 {
        out.x = a.x - b.x; out.y = a.y - b.y; out.z = a.z - b.z; return out;
    }
    static scale(a: Laya.Vector3, s: number, out: Laya.Vector3): Laya.Vector3 {
        out.x = a.x * s; out.y = a.y * s; out.z = a.z * s; return out;
    }
    static dot(a: Laya.Vector3, b: Laya.Vector3): number {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }
    static cross(a: Laya.Vector3, b: Laya.Vector3, out: Laya.Vector3): Laya.Vector3 {
        const ax = a.x, ay = a.y, az = a.z;
        const bx = b.x, by = b.y, bz = b.z;
        out.x = ay * bz - az * by; out.y = az * bx - ax * bz; out.z = ax * by - ay * bx;
        return out;
    }
    static lenSq(v: Laya.Vector3): number {
        return v.x * v.x + v.y * v.y + v.z * v.z;
    }
    static len(v: Laya.Vector3): number {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }
    static norm(v: Laya.Vector3, out: Laya.Vector3): Laya.Vector3 {
        const lsq = v.x * v.x + v.y * v.y + v.z * v.z;
        if (lsq < 1e-20) { out.x = 0; out.y = 0; out.z = 0; }
        else { const inv = 1 / Math.sqrt(lsq); out.x = v.x * inv; out.y = v.y * inv; out.z = v.z * inv; }
        return out;
    }
    static projPlane(v: Laya.Vector3, normal: Laya.Vector3, out: Laya.Vector3): Laya.Vector3 {
        const nsq = normal.x * normal.x + normal.y * normal.y + normal.z * normal.z;
        if (nsq < 1e-20) return V3.copy(v, out);
        const d = V3.dot(v, normal); const f = d / nsq;
        out.x = v.x - normal.x * f; out.y = v.y - normal.y * f; out.z = v.z - normal.z * f;
        return out;
    }
    static clamp(v: number, min: number, max: number): number {
        return v < min ? min : (v > max ? max : v);
    }
    static lerp(a: Laya.Vector3, b: Laya.Vector3, t: number, out: Laya.Vector3): Laya.Vector3 {
        const s = 1 - t;
        out.x = a.x * s + b.x * t; out.y = a.y * s + b.y * t; out.z = a.z * s + b.z * t;
        return out;
    }
}

// ===================== 定点数工具(Q10: ×1024) =====================
/**
 * Fx — 定点整数换算(用户架构: 原生数据放大 1024, 对接 Laya 时 /1024)。
 * 1024=2^10: i2f 除 2 的幂在 IEEE 双精度下【精确无舍入】; f2i 用 Math.round(ECMAScript 规定
 * 半值向上, 全平台一致)。状态量(位置/速度/角速度/四元数)存 Q10 整数——状态序列跨平台严格
 * 一致(PVP 同步/鹰眼回放/轨迹的确定性载体); 物理参数(m/Ia 等 ~1e-5 量级, Q10 会量化成 0)
 * 保持浮点常量(IEEE 字面量解析全平台同值); 力计算内部浮点、出口 f2i 量化(平台 ulp 差异
 * 被 1/1024 网格吸收)。
 */
export class Fx {
    static readonly SC = 1024;
    /** 浮点 → Q10 整数 */
    static f2i(x: number): number { return Math.round(x * 1024); }
    /** Q10 整数 → 浮点(精确) */
    static i2f(i: number): number { return i / 1024; }
    /** 定点乘法: (a*b)>>10(Q10×Q10=Q20, 右移 10 回 Q10; 算术移位跨平台一致) */
    static mul(a: number, b: number): number { return (a * b) >> 10; }
}

// ===================== 状态定义 =====================
export class State {
    // ===== 定点整数字段(Q10)——确定性内核 =====
    px = 0; py = 0; pz = 0;         // 位置(m)
    vx = 0; vy = 0; vz = 0;         // 速度(m/s)
    sx = 0; sy = 0; sz = 0;         // 非轴向角速度(rad/s)
    sai = 0;                        // 轴向角速度(rad/s)
    qx = 0; qy = 0; qz = 0; qw = 1024; // 四元数(单位四元数 w=1 → Q10=1024)

    // ===== 浮点影子(对外兼容: applyToNode/mag/track/res 等浮点消费)——由 iSync 重建 =====
    pos = new Laya.Vector3();
    vel = new Laya.Vector3();
    sn = new Laya.Vector3();
    rot = new Laya.Quaternion();
    time = 0;

    /** 整数 → 浮点影子(唯一出口: 任何整数字段变更后调用) */
    iSync(): void {
        this.pos.setValue(this.px / 1024, this.py / 1024, this.pz / 1024);
        this.vel.setValue(this.vx / 1024, this.vy / 1024, this.vz / 1024);
        this.sn.setValue(this.sx / 1024, this.sy / 1024, this.sz / 1024);
        this.rot.setValue(this.qx / 1024, this.qy / 1024, this.qz / 1024, this.qw / 1024);
    }
    /** 浮点 → 整数(浮点写路径(procCol/imp/rstep 等力计算出口)对齐到 1/1024 网格) */
    fToI(): void {
        this.px = Fx.f2i(this.pos.x); this.py = Fx.f2i(this.pos.y); this.pz = Fx.f2i(this.pos.z);
        this.vx = Fx.f2i(this.vel.x); this.vy = Fx.f2i(this.vel.y); this.vz = Fx.f2i(this.vel.z);
        this.sx = Fx.f2i(this.sn.x); this.sy = Fx.f2i(this.sn.y); this.sz = Fx.f2i(this.sn.z);
        this.sai = Fx.f2i(this.sa);
        this.qx = Fx.f2i(this.rot.x); this.qy = Fx.f2i(this.rot.y);
        this.qz = Fx.f2i(this.rot.z); this.qw = Fx.f2i(this.rot.w);
    }
    /** 量化: 浮点→整数→浮点回写(消平台 ulp 差异, 状态序列严格网格一致) */
    quant(): void {
        this.fToI();
        this.iSync();
    }

    /** 兼容旧浮点字段 sa(读写代理 sai) */
    get sa(): number { return this.sai / 1024; }
    set sa(v: number) { this.sai = Fx.f2i(v); }

    clone(): State {
        const s = new State();
        s.px = this.px; s.py = this.py; s.pz = this.pz;
        s.vx = this.vx; s.vy = this.vy; s.vz = this.vz;
        s.sx = this.sx; s.sy = this.sy; s.sz = this.sz;
        s.sai = this.sai;
        s.qx = this.qx; s.qy = this.qy; s.qz = this.qz; s.qw = this.qw;
        s.time = this.time;
        s.iSync();
        return s;
    }
    copyFrom(other: State): void {
        this.px = other.px; this.py = other.py; this.pz = other.pz;
        this.vx = other.vx; this.vy = other.vy; this.vz = other.vz;
        this.sx = other.sx; this.sy = other.sy; this.sz = other.sz;
        this.sai = other.sai;
        this.qx = other.qx; this.qy = other.qy; this.qz = other.qz; this.qw = other.qw;
        this.time = other.time;
        this.iSync();
    }
}

// ===================== 物理参数 =====================
export interface Params {
    m: number; r: number;
    cdA: number; cdB: number; cm: number;
    g: number; rho: number; vmax: number;
    kc: number; kdamp: number;
    Ia: number;       // 轴向转动惯量
    I_perp: number;   // 非轴向转动惯量 (新增)
    cmOff: Laya.Vector3; acOff: Laya.Vector3;
    maArea: number; naDamp: number;
}

export interface NetConfig { cx: number; cy: number; cz: number; hw: number; hh: number; hd: number; }
export interface BallRegionConfig { headR: number; featherR: number; headDist: number; featherDist: number; }
export interface NetCollisionParams {
    restHead: number; restFeather: number; friction: number;
    rollThresh: number; featherGrip: number; catchBoost: number;
}

// ===================== 轨迹可视化配置 =====================
/** 预测段配置(其他颜色 + 独立透明度) */
export interface TrackPredCfg {
    show: boolean;         // 预测段显示开关
    dur: number;           // 预测时长(ms)
    alpha: number;         // 预测段透明度 0~1
    interval: number;      // 预测重算间隔(ms, 0=每帧重算; 结果缓存帧间复用)
    color: Laya.Color;     // 预测段颜色(与轨迹段区分)
}
/** 轨迹配置: mode='fade' 沿轨迹逐渐加深(不透明度渐变) / 'solid' 单色 */
export interface TrackCfg {
    show: boolean;         // 轨迹段(历史)显示开关
    mode: 'solid' | 'fade';
    color: Laya.Color;     // 轨迹基色
    alphaMin: number;      // fade 模式起点透明度(终点为 color 原色)
    step: number;          // 采样步长(map 内 state 索引间隔, 控制线密度)
    pred: TrackPredCfg;
}
export class NetHitInfo {
    time = 0; headHit = false; featherHit = false;
    headPastNet = false; featherPastNet = false;
    normal = new Laya.Vector3();
    impulseMag = 0; isGround = false;
}

// ===================== 物理引擎配置 =====================
export class PhyCfg {
    DFLT: Params = {
        m: 0.0052, r: 0.034,
        cdA: 0.35, cdB: 0.65, cm: 0.02,
        g: 9.8, rho: 1.225, vmax: 100,
        kc: 20, kdamp: 0.5,
        Ia: 0.000008,
        I_perp: 0.00002,
        cmOff: new Laya.Vector3(0, 0, 0.015),   // ← 质心沿 +Z（球头方向）
        acOff: new Laya.Vector3(0, 0, -0.025),   // ← 压心沿 -Z（球尾方向）
        maArea: 0.3, naDamp: 0.15,
    };
    DFLT_NET: NetConfig = { cx: 0, cy: 1.17, cz: 0, hw: 0.008, hh: 0.38, hd: 3.05 };
    DFLT_REGION: BallRegionConfig = { headR: 0.015, featherR: 0.033, headDist: 0.020, featherDist: 0.046 };
    DFLT_NETCOL: NetCollisionParams = { restHead: 0.3, restFeather: 0.2, friction: 0.05, rollThresh: 0.5, featherGrip: 0.35, catchBoost: 0.2 };

    isCalc = false;
    isSleeping = false; // 休眠标志

    bonus = new Laya.Vector3(); cN1 = new Laya.Vector3(); cN2 = new Laya.Vector3();
    cCl1 = new Laya.Vector3(); cCl2 = new Laya.Vector3(); cLx = new Laya.Vector3();
    cLy = new Laya.Vector3(); cLz = new Laya.Vector3(); cHp = new Laya.Vector3();
    cFp = new Laya.Vector3(); cCl = new Laya.Vector3(); cN = new Laya.Vector3();
    cR = new Laya.Vector3(); cVc = new Laya.Vector3(); cRxN = new Laya.Vector3();
    cRxT = new Laya.Vector3(); cOw = new Laya.Vector3(); cDo = new Laya.Vector3();
    cT = new Laya.Vector3(); cT1 = new Laya.Vector3(); cT2 = new Laya.Vector3();

    // 压心气动恢复力矩 / 横向进动阻尼用的临时向量
    lever = new Laya.Vector3();   // 质心→压心的世界杠杆臂
    aeroTq = new Laya.Vector3();   // 气动恢复力矩
    tauPerp = new Laya.Vector3();   // 力矩横向分量(projPlane 结果)
    dampTq = new Laya.Vector3();   // 横向进动阻尼力矩

    p: Params; state: State; startT: number = 0;
    map: MPMD; readonly GRID = 10; readonly MAX_LOOKBACK = 10; maxCache = 200000;

    // ===== 轨迹可视化(track) =====
    DFLT_TRACK: TrackCfg = {
        show: true,
        mode: 'fade',
        color: new Laya.Color(255, 255, 255, 255),
        alphaMin: 0.15,
        step: 5,
        pred: {
            show: true,    // 预测段(球飞行前方的橙色 2s 预测线)默认开启; 曾在移除角色方向箭头时被误关, 已恢复
            dur: 2000,
            alpha: 0.5,
            interval: 100,
            color: new Laya.Color(255, 140, 0, 255),
        },
    };
    track: TrackCfg = {
        show: this.DFLT_TRACK.show,
        mode: this.DFLT_TRACK.mode,
        color: this.DFLT_TRACK.color.clone(),
        alphaMin: this.DFLT_TRACK.alphaMin,
        step: this.DFLT_TRACK.step,
        pred: {
            show: this.DFLT_TRACK.pred.show,
            dur: this.DFLT_TRACK.pred.dur,
            alpha: this.DFLT_TRACK.pred.alpha,
            interval: this.DFLT_TRACK.pred.interval,
            color: this.DFLT_TRACK.pred.color.clone(),
        },
    };

    trkNode: Laya.Sprite3D | null = null; trkLines: Laya.PixelLineRenderer | null = null;
    trkCnt: number = 0; readonly MAX_TRK = 2048;
    private _trkArr: State[] | null = null;      // 历史轨迹数组缓存(size 变化才重建, 避免每帧 Array.from)
    private _predPts: Laya.Vector3[] = [];       // 预测点缓存(interval 间隔重算, 帧间复用)
    private _predAt: number = 0;                 // 上次预测重算时刻(ms)
    private _trkC = new Laya.Color();            // 复用色对象(避免每帧 new)

    net: NetConfig | null = null;
    region: BallRegionConfig = { ...this.DFLT_REGION };
    ncol: NetCollisionParams = { ...this.DFLT_NETCOL };
    lastNetHit: NetHitInfo | null = null;

    gndNet: NetConfig | null = null;
    gndNcol: NetCollisionParams = { ...this.DFLT_NETCOL };
    lastGndHit: NetHitInfo | null = null;

    lx = new Laya.Vector3(); ly = new Laya.Vector3(); lz = new Laya.Vector3();
    df = new Laya.Vector3(); gf = new Laya.Vector3(); mf = new Laya.Vector3();
    gt = new Laya.Vector3(); nd = new Laya.Vector3(); gn = new Laya.Vector3();
    tf = new Laya.Vector3(); dv = new Laya.Vector3(); mc = new Laya.Vector3();
    gv = new Laya.Vector3(); gr = new Laya.Vector3(); ad = new Laya.Vector3();
    // ar = new Laya.Quaternion();
    rt = new Laya.Vector3(); ra = new Laya.Vector3(); rd = new Laya.Quaternion();

    // 预分配 RK4 缓存与导数状态
    derD = new State(); // 消除 der 中的 new State()
    k1 = { s: new State(), aa: 0 }; k2 = { s: new State(), aa: 0 };
    k3 = { s: new State(), aa: 0 }; k4 = { s: new State(), aa: 0 };
    s2 = new State(); s3 = new State(); s4 = new State();
    klx = new Laya.Vector3(); kly = new Laya.Vector3(); klz = new Laya.Vector3();
    kav = new Laya.Vector3(); ka = new Laya.Vector3(); kb = new Laya.Vector3();
    mlx = new Laya.Vector3(); mly = new Laya.Vector3(); mlz = new Laya.Vector3();
    mow = new Laya.Vector3(); msw = new Laya.Vector3();

    // ===== 过网跟踪 =====
    _netSide: number = 0;          // 0=左, 1=右, 记录球当前在网哪一侧（初始由初始位置决定）
    _netCrossCallback?: (direction: number) => void; // 过网回调，direction: 1=左->右, -1=右->左
    _netTopY: number = 0;          // 网顶高度（自动从net配置计算）

    public setNet(cfg: Partial<NetConfig>): void {
        this.net = { ...this.DFLT_NET, ...cfg };
        this._netTopY = this.net.cy + this.net.hh;
        // 根据当前球位置初始化侧别
        this._netSide = this.state.pos.x >= 0 ? 1 : 0;
    }
    public removeNet(): void { this.net = null; }
    public setBallRegion(cfg: Partial<BallRegionConfig>): void { this.region = { ...this.region, ...cfg }; }
    public setNetCollisionParams(cfg: Partial<NetCollisionParams>): void { this.ncol = { ...this.ncol, ...cfg }; }
    public getLastNetHit(): NetHitInfo | null { return this.lastNetHit; }
    public clearNetHit(): void { this.lastNetHit = null; }

    public setGround(cfg: Partial<{ y: number }>): void {
        const y = cfg.y !== undefined ? cfg.y : 0;
        const eps = 0.001; const inf = 15;
        this.gndNet = { cx: 0, cy: y + eps, cz: 0, hw: inf, hh: eps, hd: inf };
        this.gndNcol = { restHead: 0.5, restFeather: 0.02, friction: 0.6, rollThresh: 0.3, featherGrip: 0.3, catchBoost: 0.0 };
    }
    public setGroundCollisionParams(cfg: Partial<NetCollisionParams>): void { this.gndNcol = { ...this.gndNcol, ...cfg }; }
    public getLastGroundHit(): NetHitInfo | null { return this.lastGndHit; }
    public clearGroundHit(): void { this.lastGndHit = null; }

    public isGround(threshold = 0): boolean { return this.state.pos.y <= threshold; }
    public speed(): number { return V3.len(this.state.vel); }
    public saRPS(): number { return this.state.sa / (2 * Math.PI); }

    public axes(rot: Laya.Quaternion, lx: Laya.Vector3, ly: Laya.Vector3, lz: Laya.Vector3) {
        Laya.Vector3.transformQuat(V3.RIGHT, rot, lx);
        Laya.Vector3.transformQuat(V3.UP, rot, ly);
        Laya.Vector3.transformQuat(V3.FORWARD, rot, lz);
    }
    public headDir(out: Laya.Vector3): Laya.Vector3 {
        const lx = new Laya.Vector3(); const ly = new Laya.Vector3(); const lz = new Laya.Vector3();
        this.axes(this.state.rot, lx, ly, lz);
        return V3.copy(lz, out);   // ← lx 改 lz
    }

    simTo(t: number) { }; // 占位，由子类实现

    /** 影子预测: 从当前 state 模拟未来 dur 毫秒轨迹, 采样点追加进 out; 基类占位, 由子类实现 */
    predict(dur: number, out: Laya.Vector3[]): boolean { return false; }

    /** 轨迹配置合并(pred 深合并) */
    public setTrack(cfg: Partial<TrackCfg>): void {
        if (cfg.show !== undefined) this.track.show = cfg.show;
        if (cfg.mode) this.track.mode = cfg.mode;
        if (cfg.color) this.track.color = cfg.color.clone();
        if (cfg.alphaMin !== undefined) this.track.alphaMin = cfg.alphaMin;
        if (cfg.step !== undefined) this.track.step = Math.max(1, cfg.step | 0);
        if (cfg.pred) {
            const p = cfg.pred; const t = this.track.pred;
            if (p.show !== undefined) t.show = p.show;
            if (p.dur !== undefined) t.dur = Math.max(0, p.dur);
            if (p.alpha !== undefined) t.alpha = V3.clamp(p.alpha, 0, 1);
            if (p.interval !== undefined) t.interval = Math.max(0, p.interval);
            if (p.color) t.color = p.color.clone();
        }
    }

    /** 懒建轨迹渲染器 */
    private _ensureTrk(): void {
        if (!this.trkNode) {
            this.trkNode = new Laya.Sprite3D("phy_trk");
            // Scene3D 是 root 的直接子节点(非 stage 直接子级)——非递归 getChildByName 查 stage 必 null
            // → null.addChild 每帧 TypeError → 轨迹静默丢失(本 bug 根因)
            const scene3d: any = (Laya.stage.getChildByName("root") as any)?.getChildByName("Scene3D") || (Laya.stage as any)._scene3Ds?.[0];
            if (!scene3d) { console.warn('[Res] 未找到 Scene3D, 轨迹渲染器未挂载'); return; }
            scene3d.addChild(this.trkNode);
        }
        if (!this.trkLines) {
            this.trkLines = new Laya.PixelLineRenderer(); this.trkLines.maxLineCount = this.MAX_TRK;
            this.trkNode.addComponentInstance(this.trkLines);
        }
    }

    /**
     * 轨迹绘制: 历史段(map 缓存)按 mode 渐变 + 预测段(影子模拟缓存)独立颜色。
     * 优化: 历史数组缓存复用(仅 size 变化重建) / 预测按 interval 重算帧间复用 / 色对象复用。
     */
    public drawTrack(): void {
        if (!Laya.stage) return;
        const cfg = this.track;
        if (!cfg.show && !cfg.pred.show) { this.resetTrk(); return; }
        this._ensureTrk();
        if (!this.trkLines) return;
        this.trkLines.clear(); this.trkCnt = 0;

        // ---- 历史轨迹段 ----
        if (cfg.show) {
            const states = this.map.get();
            const n = states.size;
            if (n > cfg.step) {
                if (!this._trkArr || this._trkArr.length !== n) this._trkArr = Array.from(states) as State[];
                const arr = this._trkArr;
                const c = this._trkC;
                c.r = cfg.color.r; c.g = cfg.color.g; c.b = cfg.color.b;
                const last = Math.floor((n - 1 - cfg.step) / cfg.step) * cfg.step; // 最后一个满足 i+step<=n-1 的采样起点
                const segs = last / cfg.step + 1;
                const base = cfg.color.a;
                const aMin = Math.round(base * V3.clamp(cfg.alphaMin, 0, 1));
                for (let i = 0, s = 0; i <= last; i += cfg.step, s++) {
                    if (this.trkCnt >= this.MAX_TRK) break;
                    // fade: 沿轨迹不透明度从 alphaMin 渐深到基色; solid: 单色
                    c.a = cfg.mode === 'fade' && segs > 1
                        ? aMin + Math.round((base - aMin) * s / (segs - 1))
                        : base;
                    this.trkLines.addLine(arr[i].pos, arr[i + cfg.step].pos, c, c);
                    this.trkCnt++;
                }
            }
        }

        // ---- 预测段(其他颜色, 结果缓存 interval 复用) ----
        const pc = cfg.pred;
        if (pc.show && pc.dur > 0) {
            const now = Timer.now();
            if (this._predAt === 0 || now - this._predAt >= pc.interval) {
                this._predAt = now;
                this._predPts.length = 0;
                this.predict(pc.dur, this._predPts);
            }
            const pts = this._predPts;
            if (pts.length >= 2) {
                const c = this._trkC;
                c.r = pc.color.r; c.g = pc.color.g; c.b = pc.color.b;
                c.a = Math.round(pc.color.a * V3.clamp(pc.alpha, 0, 1));
                for (let i = 0; i < pts.length - 1; i++) {
                    if (this.trkCnt >= this.MAX_TRK) break;
                    this.trkLines.addLine(pts[i], pts[i + 1], c, c);
                    this.trkCnt++;
                }
            }
        }
    }

    public debugDrawNet(color?: Laya.Color) {
        this._ensureTrk();
        if (!this.net || !this.trkNode || !this.trkLines) return;
        const net = this.net; const c = color || new Laya.Color(255, 0, 0, 255);
        const x0 = net.cx - net.hw, x1 = net.cx + net.hw; const y0 = net.cy - net.hh, y1 = net.cy + net.hh;
        const z0 = net.cz - net.hd, z1 = net.cz + net.hd;
        const corners = [new Laya.Vector3(x0, y0, z0), new Laya.Vector3(x1, y0, z0), new Laya.Vector3(x1, y1, z0), new Laya.Vector3(x0, y1, z0),
        new Laya.Vector3(x0, y0, z1), new Laya.Vector3(x1, y0, z1), new Laya.Vector3(x1, y1, z1), new Laya.Vector3(x0, y1, z1)];
        const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
        for (const [a, b] of edges) this.trkLines.addLine(corners[a], corners[b], c, c);
    }
    public clearCache() { this.map.clear(); this.map.addByTime(this.state.time, this.state.clone()); this.resetTrk(); }
    public resetTrk() {
        // ✅ 只清画线数据不销毁对象(防渲染管线空引用); 同时失效轨迹/预测缓存(击球 clearCache 后强制重算)
        if (this.trkLines) {
            this.trkLines.clear();
        }
        this.trkCnt = 0;
        this._trkArr = null;
        this._predPts.length = 0;
        this._predAt = 0;
    }
    /** @deprecated 旧名兼容, 等价 resetTrk */
    public resetDbg() { this.resetTrk(); }
    inv(s: State): boolean {
        if (isNaN(s.pos.x) || isNaN(s.pos.y) || isNaN(s.pos.z)) return true;
        if (V3.len(s.vel) > this.p.vmax * 2) return true;
        return false;
    }
    flightTime(): number { return (this.state.time - this.startT) / 1000; }
}