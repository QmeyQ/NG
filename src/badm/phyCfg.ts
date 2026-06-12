import { Timer } from "../libs/time";
import { MapManager } from "../libs/mpm";

// ===================== 向量数学（避免临时对象） =====================
/**
 * 静态向量运算库，所有输出通过 out 参数避免 GC 分配。
 * 提供向量加减、缩放、点/叉积、归一化、投影等基本运算。
 */
export class V3 {
    static readonly ZERO = new Laya.Vector3(0, 0, 0);
    static readonly UP = new Laya.Vector3(0, 1, 0);
    static readonly RIGHT = new Laya.Vector3(1, 0, 0);
    static readonly FORWARD = new Laya.Vector3(0, 0, 1);

    /** 复制向量 */
    static copy(a: Laya.Vector3, out: Laya.Vector3): Laya.Vector3 {
        out.x = a.x; out.y = a.y; out.z = a.z;
        return out;
    }

    /** 向量加法 out = a + b */
    static add(a: Laya.Vector3, b: Laya.Vector3, out: Laya.Vector3): Laya.Vector3 {
        out.x = a.x + b.x; out.y = a.y + b.y; out.z = a.z + b.z;
        return out;
    }

    /** 缩放加法 out = a + b * s */
    static addScaled(a: Laya.Vector3, b: Laya.Vector3, s: number, out: Laya.Vector3): Laya.Vector3 {
        out.x = a.x + b.x * s;
        out.y = a.y + b.y * s;
        out.z = a.z + b.z * s;
        return out;
    }

    /** 向量减法 out = a - b */
    static sub(a: Laya.Vector3, b: Laya.Vector3, out: Laya.Vector3): Laya.Vector3 {
        out.x = a.x - b.x; out.y = a.y - b.y; out.z = a.z - b.z;
        return out;
    }

    /** 向量缩放 out = a * s */
    static scale(a: Laya.Vector3, s: number, out: Laya.Vector3): Laya.Vector3 {
        out.x = a.x * s; out.y = a.y * s; out.z = a.z * s;
        return out;
    }

    /** 点积 a·b */
    static dot(a: Laya.Vector3, b: Laya.Vector3): number {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    /** 叉积 out = a × b */
    static cross(a: Laya.Vector3, b: Laya.Vector3, out: Laya.Vector3): Laya.Vector3 {
        const ax = a.x, ay = a.y, az = a.z;
        const bx = b.x, by = b.y, bz = b.z;
        out.x = ay * bz - az * by;
        out.y = az * bx - ax * bz;
        out.z = ax * by - ay * bx;
        return out;
    }

    /** 长度平方 */
    static lenSq(v: Laya.Vector3): number {
        return v.x * v.x + v.y * v.y + v.z * v.z;
    }

    /** 长度 */
    static len(v: Laya.Vector3): number {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }

    /** 归一化，零向量则输出零 */
    static norm(v: Laya.Vector3, out: Laya.Vector3): Laya.Vector3 {
        const lsq = v.x * v.x + v.y * v.y + v.z * v.z;
        if (lsq < 1e-20) {
            out.x = 0; out.y = 0; out.z = 0;
        } else {
            const inv = 1 / Math.sqrt(lsq);
            out.x = v.x * inv;
            out.y = v.y * inv;
            out.z = v.z * inv;
        }
        return out;
    }

    /**
     * 将向量 v 投影到法向量为 normal 的平面上（normal 无需单位化）。
     *   out = v - (v·n / n²) * n
     */
    static projPlane(v: Laya.Vector3, normal: Laya.Vector3, out: Laya.Vector3): Laya.Vector3 {
        const nsq = normal.x * normal.x + normal.y * normal.y + normal.z * normal.z;
        if (nsq < 1e-20) {
            return V3.copy(v, out);
        }
        const d = V3.dot(v, normal);
        const f = d / nsq;
        out.x = v.x - normal.x * f;
        out.y = v.y - normal.y * f;
        out.z = v.z - normal.z * f;
        return out;
    }

    /** 数值钳位 */
    static clamp(v: number, min: number, max: number): number {
        return v < min ? min : (v > max ? max : v);
    }

    /** 线性插值 out = a + (b-a)*t */
    static lerp(a: Laya.Vector3, b: Laya.Vector3, t: number, out: Laya.Vector3): Laya.Vector3 {
        const s = 1 - t;
        out.x = a.x * s + b.x * t;
        out.y = a.y * s + b.y * t;
        out.z = a.z * s + b.z * t;
        return out;
    }
}

// ===================== 状态定义 =====================
/**
 * 仿真状态快照
 * 质心位置 pos、速度 vel、非轴向自旋 sn、轴向自旋 sa、朝向 rot
 */
// ===================== 状态定义 =====================
/**
 * 仿真状态快照
 * 质心位置 pos、速度 vel、非轴向自旋 sn、轴向自旋 sa、朝向 rot
 */
export class State {
    omega: Laya.Vector3; // 直接用三维向量表示角速度
    /** 质心位置（世界系） */
    pos = new Laya.Vector3();
    /** 速度（世界系） */
    vel = new Laya.Vector3();
    /** 非轴向角速度（世界系） */
    sn = new Laya.Vector3();
    /** 轴向角速度（绕 local X 轴） */
    sa = 0;
    /** 朝向四元数 */
    rot = new Laya.Quaternion();
    /** 时间戳（毫秒） */
    time = 0;

    clone(): State {
        const s = new State();
        V3.copy(this.pos, s.pos);
        V3.copy(this.vel, s.vel);
        V3.copy(this.sn, s.sn);
        s.sa = this.sa;
        s.rot = this.rot.clone();
        s.time = this.time;
        return s;
    }

    copyFrom(other: State): void {
        V3.copy(other.pos, this.pos);
        V3.copy(other.vel, this.vel);
        V3.copy(other.sn, this.sn);
        this.sa = other.sa;
        this.rot = other.rot.clone();
        this.time = other.time;
    }
}

// ===================== 物理参数 =====================
/** 羽毛球物理参数接口 */
export interface Params {
    /** 质量 */
    m: number;
    /** 半径 */
    r: number;
    /** 轴向阻力系数 (球头正对气流) */
    cdA: number;
    /** 横向阻力系数 (侧对气流) */
    cdB: number;
    /** 马格努斯力系数 */
    cm: number;
    /** 重力加速度 */
    g: number;
    /** 空气密度 */
    rho: number;
    /** 最大速度限制 */
    vmax: number;
    /** 轴向自旋耦合系数 */
    kc: number;
    /** 轴向自旋阻尼系数 */
    kdamp: number;
    /** 轴向转动惯量 */
    Ia: number;
    /** 质心偏移（模型空间） */
    cmOff: Laya.Vector3;
    /** 气动中心偏移 */
    acOff: Laya.Vector3;
    /** 马格努斯有效截面积因子（πr² * maArea） */
    maArea: number;
    /** 非轴向角速度空气阻尼系数 */
    naDamp: number;
}

// ===================== 球网碰撞配置 =====================
/** 网盒（轴对齐长方体）配置 */
export interface NetConfig {
    /** 中心 X */
    cx: number;
    /** 中心 Y */
    cy: number;
    /** 中心 Z */
    cz: number;
    /** 半宽（沿 X 轴） */
    hw: number;
    /** 半高（沿 Y 轴） */
    hh: number;
    /** 半深（沿 Z 轴） */
    hd: number;
}

/** 球体区域定义（用于双球碰撞检测） */
export interface BallRegionConfig {
    /** 球头等效半径 */
    headR: number;
    /** 球裙等效半径 */
    featherR: number;
    /** 球头相对质心的前距离 */
    headDist: number;
    /** 球裙相对质心的后距离 */
    featherDist: number;
}

/** 碰撞响应参数 */
export interface NetCollisionParams {
    /** 球头恢复系数 */
    restHead: number;
    /** 球裙恢复系数 */
    restFeather: number;
    /** 库仑摩擦系数 */
    friction: number;
    /** 滚动门限（法向速度低于此值恢复系数归零） */
    rollThresh: number;
    /** 球裙额外摩擦（模拟羽毛抓网） */
    featherGrip: number;
    /** 挂网增强（球头穿网而球裙被拦时施加额外旋转） */
    catchBoost: number;
}

/** 碰撞事件信息 */
export class NetHitInfo {
    /** 事件时间戳（毫秒） */
    time = 0;
    /** 球头是否发生碰撞 */
    headHit = false;
    /** 球裙是否发生碰撞 */
    featherHit = false;
    /** 球头是否已越过碰撞体 */
    headPastNet = false;
    /** 碰撞法向量 */
    normal = new Laya.Vector3();
    /** 冲量大小 */
    impulseMag = 0;
    /** 是否为地面碰撞事件 */
    isGround = false;
}
// ===================== 物理引擎配置 =====================
/**
 * 羽毛球物理引擎的所有可配置参数与运行时缓存。
 * 将默认值、临时向量、碰撞体配置集中管理，便于重用和调整。
 */
export class PhyCfg {

    // ========== 默认物理参数 ==========
    /** 默认物理参数 */
    DFLT: Params = {
        m: 0.0052,                // 质量 (kg)，标准羽毛球约 5.2g
        r: 0.034,                 // 半径 (m)，等效球体半径
        cdA: 0.35,                // 轴向阻力系数（球头正对气流）
        cdB: 0.65,                // 横向阻力系数（球侧对气流）
        cm: 0.02,                 // 马格努斯力系数
        g: 9.8,                   // 重力加速度 (m/s²)
        rho: 1.225,               // 空气密度 (kg/m³)，标准海平面值
        vmax: 100,                // 最大速度限制 (m/s)，防止数值溢出
        kc: 3.0,                  // 轴向自旋耦合系数（陀螺效应强度）
        kdamp: 0.5,               // 轴向自旋阻尼系数
        Ia: 0.0008,               // 轴向转动惯量 (kg·m²)
        cmOff: new Laya.Vector3(0.015, 0, 0),   // 质心偏移（模型坐标），相对视觉原点
        acOff: new Laya.Vector3(-0.025, 0, 0),  // 气动中心偏移（模型坐标）
        maArea: 0.3,              // 马格努斯有效截面积因子，实际面积 = πr² * maArea
        naDamp: 0.15,             // 非轴向角速度空气阻尼系数
    };

    // ========== 网盒默认配置 ==========
    /** 网盒默认配置 */
    DFLT_NET: NetConfig = {
        cx: 0, cy: 1.17, cz: 0,  // 网盒中心位置 (标准网高 1.17m)
        hw: 0.008,                // 半宽 (网线直径约 0.016m)
        hh: 0.38,                 // 半高 (网高约 0.76m)
        hd: 3.05                  // 半深 (网宽约 6.1m)
    };

    // ========== 球体区域默认配置 ==========
    /** 球体区域默认配置（用于双球碰撞检测） */
    DFLT_REGION: BallRegionConfig = {
        headR: 0.015,             // 球头等效碰撞半径
        featherR: 0.033,          // 球裙等效碰撞半径
        headDist: 0.020,          // 球头相对质心的向前距离
        featherDist: 0.046,       // 球裙相对质心的向后距离
    };

    // ========== 碰撞响应默认参数 ==========
    /** 碰撞响应默认参数（用于网碰撞） */
    DFLT_NETCOL: NetCollisionParams = {
        restHead: 0.3,           // 球头恢复系数 (弹性)
        restFeather: 0.2,        // 球裙恢复系数 (羽毛吸能)
        friction: 0.05,           // 库仑摩擦系数
        rollThresh: 0.5,          // 滚动门限：法向速度低于此值时恢复系数降为0（避免微弹）
        featherGrip: 0.35,        // 球裙额外摩擦（模拟羽毛抓网/地面效应）
        catchBoost: 0.0,          // 挂网增强系数（球头过网而裙被拦时施加的额外旋转力矩）
    };

    // ─────────────────────────────────────────────────
    // 以下为运行时状态变量与临时缓存，按功能分组注解
    // ─────────────────────────────────────────────────

    isCalc = false;

    // ========== 碰撞响应专用临时向量 ==========
    /** 挂网增强时计算额外角速度用 */
    bonus = new Laya.Vector3();
    /** 球头碰撞法线（临时） */
    cN1 = new Laya.Vector3();
    /** 球裙碰撞法线（临时） */
    cN2 = new Laya.Vector3();
    /** 球头碰撞最近点（临时） */
    cCl1 = new Laya.Vector3();
    /** 球裙碰撞最近点（临时） */
    cCl2 = new Laya.Vector3();

    // ========== 核心状态对象 ==========
    /** 当前使用的物理参数（允许运行时覆盖） */
    p: Params;
    /** 当前模拟状态（位置、速度、角速度、朝向） */
    state: State;
    /** 击球时刻的时间戳（毫秒） */
    startT: number = 0;
    /** 状态缓存管理器，用于时间回溯和调试绘制 */
    map: MapManager;
    /** 缓存网格划分粒度 */
    readonly GRID = 10;
    /** 最大回溯步数 */
    readonly MAX_LOOKBACK = 10;
    /** 缓存最大条目数 */
    maxCache = 200000;

    // ========== 调试绘制相关 ==========
    /** 调试用根节点 */
    dbgNode: Laya.Sprite3D | null = null;
    /** 调试用线段渲染器 */
    dbgLines: Laya.PixelLineRenderer | null = null;
    /** 当前绘制的轨迹索引起点 */
    dbgI: number = 0;
    /** 已绘制的线段计数 */
    dbgCnt: number = 0;
    /** 最大调试线段数 */
    readonly MAX_DBG = 100000;
    /** 调试线颜色 */
    readonly DBG_COLOR = new Laya.Color(255, 255, 255, 255);

    // ========== 碰撞体配置（可动态修改） ==========
    /** 当前使用的网盒配置，null 为无网 */
    net: NetConfig | null = null;
    /** 当前球的碰撞区域 */
    region: BallRegionConfig = { ...this.DFLT_REGION };
    /** 当前网碰撞响应参数 */
    ncol: NetCollisionParams = { ...this.DFLT_NETCOL };
    /** 最近一次网碰撞事件记录 */
    lastNetHit: NetHitInfo | null = null;

    /** 地面网盒（半高极小，无限宽深） */
    gndNet: NetConfig | null = null;
    /** 地面碰撞参数（恢复系数更低，摩擦更高） */
    gndNcol: NetCollisionParams = { ...this.DFLT_NETCOL };
    /** 最近一次地面碰撞事件记录 */
    lastGndHit: NetHitInfo | null = null;

    // ========== 碰撞检测与响应临时变量（预分配，避免GC） ==========
    /** 局部坐标系的 X 轴（球头方向） */
    cLx = new Laya.Vector3();
    /** 局部坐标系的 Y 轴（上方向） */
    cLy = new Laya.Vector3();
    /** 局部坐标系的 Z 轴（前方向） */
    cLz = new Laya.Vector3();
    /** 球头世界位置 */
    cHp = new Laya.Vector3();
    /** 球裙世界位置 */
    cFp = new Laya.Vector3();
    /** 最近点（球体与盒碰撞）通用临时 */
    cCl = new Laya.Vector3();
    /** 碰撞法线（通用） */
    cN = new Laya.Vector3();
    /** 力臂向量（质心到接触点） */
    cR = new Laya.Vector3();
    /** 接触点相对速度 */
    cVc = new Laya.Vector3();
    /** r × normal 临时变量 */
    cRxN = new Laya.Vector3();
    /** r × tangent 临时变量 */
    cRxT = new Laya.Vector3();
    /** 世界系总角速度 */
    cOw = new Laya.Vector3();
    /** 角速度增量（累积法向+切向） */
    cDo = new Laya.Vector3();
    /** 切向方向单位向量 */
    cT = new Laya.Vector3();
    /** 临时向量1（如新角速度） */
    cT1 = new Laya.Vector3();
    /** 临时向量2（如 r × tangent） */
    cT2 = new Laya.Vector3();

    // ========== 物理积分与空气动力临时变量 ==========
    /** 局部 X 轴（球头方向）通用 */
    lx = new Laya.Vector3();
    /** 局部 Y 轴（上方向） */
    ly = new Laya.Vector3();
    /** 局部 Z 轴（前方向） */
    lz = new Laya.Vector3();
    /** 空气阻力计算输出 */
    df = new Laya.Vector3();
    /** 重力向量（0, -mg, 0） */
    gf = new Laya.Vector3();
    /** 马格努斯力计算输出 */
    mf = new Laya.Vector3();
    /** 陀螺力矩向量 */
    gt = new Laya.Vector3();
    /** 非轴向阻尼力矩向量 */
    nd = new Laya.Vector3();
    /** 陀螺力矩在非轴向平面上的投影 */
    gn = new Laya.Vector3();
    /** 总力（阻力+重力+马格努斯力） */
    tf = new Laya.Vector3();
    /** 速度单位向量（用于阻力计算） */
    dv = new Laya.Vector3();
    /** ω × v 叉积结果（马格努斯力方向） */
    mc = new Laya.Vector3();
    /** 速度单位向量（陀螺计算用） */
    gv = new Laya.Vector3();
    /** 陀螺力矩旋转轴（lx × vel） */
    gr = new Laya.Vector3();
    /** 用于 alx() 中方向单位化 */
    ad = new Laya.Vector3();
    /** 旋转四元数（辅助，如 LookAt 旋转） */
    ar = new Laya.Quaternion();
    /** 总角速度临时（sn + lx*sa） */
    rt = new Laya.Vector3();
    /** 旋转轴单位向量 */
    ra = new Laya.Vector3();
    /** 子步旋转四元数（角速度积分增量） */
    rd = new Laya.Quaternion();

    // ========== 四阶龙格-库塔积分所需临时状态与系数 ==========
    /** 第1斜率：状态导数 + 轴向角加速度 */
    k1 = { s: new State(), aa: 0 };
    /** 第2斜率：状态导数 + 轴向角加速度 */
    k2 = { s: new State(), aa: 0 };
    /** 第3斜率：状态导数 + 轴向角加速度 */
    k3 = { s: new State(), aa: 0 };
    /** 第4斜率：状态导数 + 轴向角加速度 */
    k4 = { s: new State(), aa: 0 };
    /** 第2子步中间状态 */
    s2 = new State();
    /** 第3子步中间状态 */
    s3 = new State();
    /** 第4子步中间状态 */
    s4 = new State();
    /** 子步中的局部 X 轴 */
    klx = new Laya.Vector3();
    /** 子步中的局部 Y 轴 */
    kly = new Laya.Vector3();
    /** 子步中的局部 Z 轴 */
    klz = new Laya.Vector3();
    /** 平均角速度（sn 加权平均） */
    kav = new Laya.Vector3();
    /** 合并加权累加器 */
    ka = new Laya.Vector3();
    /** 合并临时缩放向量 */
    kb = new Laya.Vector3();

    // ========== 马格努斯力计算专用临时变量 ==========
    /** 局部 X 轴（马格努斯） */
    mlx = new Laya.Vector3();
    /** 局部 Y 轴（马格努斯） */
    mly = new Laya.Vector3();
    /** 局部 Z 轴（马格努斯） */
    mlz = new Laya.Vector3();
    /** 总角速度（世界系） */
    mow = new Laya.Vector3();
    /** 非轴向角速度在世界系中的分量 */
    msw = new Laya.Vector3()

        // ==================== 球网碰撞公开接口 ====================
    public setNet(cfg: Partial<NetConfig>): void {
        this.net = { ...this.DFLT_NET, ...cfg };
    }

    public removeNet(): void {
        this.net = null;
    }

    public setBallRegion(cfg: Partial<BallRegionConfig>): void {
        this.region = { ...this.region, ...cfg };
    }

    public setNetCollisionParams(cfg: Partial<NetCollisionParams>): void {
        this.ncol = { ...this.ncol, ...cfg };
    }

    public getLastNetHit(): NetHitInfo | null {
        return this.lastNetHit;
    }

    public clearNetHit(): void {
        this.lastNetHit = null;
    }

     // ==================== 地面碰撞公开接口（通过网盒模拟） ====================
    /**
     * 设置地面高度，内部构造一个半高极小的长方体网盒来复用碰撞检测。
     * 默认 y=0。通过设置 infiniteExtent (如 1e4) 模拟无限大平面。
     */
    public setGround(cfg: Partial<{ y: number }>): void {
        const y = cfg.y !== undefined ? cfg.y : 0;
        // 地面盒：中心位于 y + eps，半高 eps，半宽、半深极大
        const eps = 0.001;
        const inf = 15;
        this.gndNet = {
            cx: 0, cy: y + eps, cz: 0,
            hw: inf, hh: eps, hd: inf,
        };
        // 地面碰撞参数：低恢复，高摩擦，无抓网特效
        this.gndNcol = {
            restHead: 0.5,
            restFeather: 0.02,
            friction: 0.6,
            rollThresh: 0.3,
            featherGrip: 0.3,    // 无羽毛抓地
            catchBoost: 0.0,     // 地面不触发挂网增强
        };
    }

    /** 设置地面碰撞物理参数 */
    public setGroundCollisionParams(cfg: Partial<NetCollisionParams>): void {
        this.gndNcol = { ...this.gndNcol, ...cfg };
    }

    /** 获取最近一次地面碰撞信息 */
    public getLastGroundHit(): NetHitInfo | null {
        return this.lastGndHit;
    }

    /** 清除地面碰撞记录 */
    public clearGroundHit(): void {
        this.lastGndHit = null;
    }

    
    public isGround(threshold = 0): boolean {
        return this.state.pos.y <= threshold;
    }

    public speed(): number { return V3.len(this.state.vel); }
    public saRPS(): number { return this.state.sa / (2 * Math.PI); }

        /** 提取局部坐标系基向量：右、上、前 */
    public axes(rot: Laya.Quaternion, lx: Laya.Vector3, ly: Laya.Vector3, lz: Laya.Vector3) {
        Laya.Vector3.transformQuat(V3.RIGHT, rot, lx);
        Laya.Vector3.transformQuat(V3.UP, rot, ly);
        Laya.Vector3.transformQuat(V3.FORWARD, rot, lz);
    }
    public headDir(out: Laya.Vector3): Laya.Vector3 {
        const lx = new Laya.Vector3();
        const ly = new Laya.Vector3();
        const lz = new Laya.Vector3();
        this.axes(this.state.rot, lx, ly, lz);
        return V3.copy(lx, out);
    }

    simTo(t: number) {
    } ;

       // ---------- 调试 ----------
    public dbgFlag = 0;
    public debug() {
        if (!Laya.stage) return;
        if (this.dbgFlag === 0) {
            this.dbgFlag = 1;
            Timer.setTimeout(0, () => {
                this.simTo(Timer.now() + 2000);
                this.dbgFlag = 0;
            });
        }
        if (!this.dbgNode) {
            this.dbgNode = new Laya.Sprite3D("phy_dbg");
            Laya.stage.getChildByName("Scene3D").addChild(this.dbgNode);
        }
        if (!this.dbgLines) {
            this.dbgLines = new Laya.PixelLineRenderer();
            this.dbgLines.maxLineCount = this.MAX_DBG;
            console.log("debug", this.dbgLines, this.dbgNode);
            this.dbgLines.addLine(new Laya.Vector3(0, 0, 0), new Laya.Vector3(0, 0, 0), new Laya.Color(255, 0, 0, 255), new Laya.Color(255, 0, 0, 255));
            this.dbgNode.addComponentInstance(this.dbgLines);
            this.dbgLines.clear();
            this.dbgCnt = 0;
            this.dbgI = 0;
        }

        const states = this.map.get();
        if (states.size < 2) return;
        const arr = Array.from(states);

        for (let i = this.dbgI; i < arr.length - 1; i++) {
            if (this.dbgCnt >= this.MAX_DBG) {
                this.dbgI = arr.length - 1;
                break;
            }
            this.dbgLines!.addLine(arr[i].pos, arr[i + 1].pos, this.DBG_COLOR, this.DBG_COLOR);
            this.dbgCnt++;
            this.dbgI = i + 1;
        }
    }

    public debugDrawNet(color?: Laya.Color) {
               if (!this.dbgNode) {
            this.dbgNode = new Laya.Sprite3D("phy_dbg");
            Laya.stage.getChildByName("Scene3D").addChild(this.dbgNode);
               }
               if (!this.dbgLines) {
            this.dbgLines = new Laya.PixelLineRenderer();
            this.dbgLines.maxLineCount = this.MAX_DBG;
            this.dbgLines.clear();
            this.dbgNode.addComponentInstance(this.dbgLines);
            this.dbgCnt = 0;
            this.dbgI = 0;
        }
        if (!this.net || !this.dbgNode || !this.dbgLines) return;
        const net = this.net;
        const c = color || new Laya.Color(255, 0, 0, 255);

        const x0 = net.cx - net.hw, x1 = net.cx + net.hw;
        const y0 = net.cy - net.hh, y1 = net.cy + net.hh;
        const z0 = net.cz - net.hd, z1 = net.cz + net.hd;

        const corners = [
            new Laya.Vector3(x0, y0, z0), new Laya.Vector3(x1, y0, z0),
            new Laya.Vector3(x1, y1, z0), new Laya.Vector3(x0, y1, z0),
            new Laya.Vector3(x0, y0, z1), new Laya.Vector3(x1, y0, z1),
            new Laya.Vector3(x1, y1, z1), new Laya.Vector3(x0, y1, z1),
        ];
        const edges = [
            [0, 1], [1, 2], [2, 3], [3, 0],
            [4, 5], [5, 6], [6, 7], [7, 4],
            [0, 4], [1, 5], [2, 6], [3, 7],
        ];
        for (const [a, b] of edges) {
            this.dbgLines.addLine(corners[a], corners[b], c, c);
        }
    }

    public clearCache() {
        this.map.clearAll();
        this.map.addByTime(this.state.time, this.state.clone());
        this.resetDbg();
    }

    public resetDbg() {
        if (this.dbgLines) {
            this.dbgLines.destroy();
            this.dbgLines = null;
        }
        if (this.dbgNode) {
            this.dbgNode.destroy(true);
            this.dbgNode = null;
        }
        this.dbgI = 0;
        this.dbgCnt = 0;
    }

        /** 检查状态是否发散 */
    inv(s: State): boolean {
        if (isNaN(s.pos.x) || isNaN(s.pos.y) || isNaN(s.pos.z)) return true;
        if (V3.len(s.vel) > this.p.vmax * 2) return true;
        return false;
    }

    // ---------- 辅助查询 ----------
    flightTime(): number {
        return (this.state.time - this.startT) / 1000;
    }

}