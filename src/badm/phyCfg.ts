/**
 * PhyCfg - 物理配置与向量数学工具类
 * 提供 V3 静态向量运算、物理参数默认值（Params）、状态结构（State）、网碰撞参数、球区域配置等定义
 */
import { Timer } from "../libs/time";
import { MapManager } from "../libs/mpm";

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

// ===================== 状态定义 =====================
export class State {
    pos = new Laya.Vector3();
    vel = new Laya.Vector3();
    sn = new Laya.Vector3(); // 非轴向角速度 (世界系)
    sa = 0;                  // 轴向角速度 (绕局部 X)
    rot = new Laya.Quaternion();
    time = 0;

    clone(): State {
        const s = new State();
        V3.copy(this.pos, s.pos); V3.copy(this.vel, s.vel); V3.copy(this.sn, s.sn);
        s.sa = this.sa; s.rot = this.rot.clone(); s.time = this.time;
        return s;
    }
    copyFrom(other: State): void {
        V3.copy(other.pos, this.pos); V3.copy(other.vel, this.vel); V3.copy(other.sn, this.sn);
        this.sa = other.sa; this.rot = other.rot.clone(); this.time = other.time;
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
        kc: 3.0, kdamp: 0.5,
        Ia: 0.000008,     // 轴向转动惯量极小
        I_perp: 0.00002,  // 非轴向转动惯量较大 (修正各向异性)
        cmOff: new Laya.Vector3(0.015, 0, 0),
        acOff: new Laya.Vector3(-0.025, 0, 0),
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

    p: Params; state: State; startT: number = 0;
    map: MapManager; readonly GRID = 10; readonly MAX_LOOKBACK = 10; maxCache = 200000;

    dbgNode: Laya.Sprite3D | null = null; dbgLines: Laya.PixelLineRenderer | null = null;
    dbgI: number = 0; dbgCnt: number = 0; readonly MAX_DBG = 100000;
    readonly DBG_COLOR = new Laya.Color(255, 255, 255, 255);

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
    ar = new Laya.Quaternion(); rt = new Laya.Vector3(); ra = new Laya.Vector3(); rd = new Laya.Quaternion();

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
        this.axes(this.state.rot, lx, ly, lz); return V3.copy(lx, out);
    }

    simTo(t: number) { }; // 占位，由子类实现

    public dbgFlag = 0;
    public debug() {
        if (!Laya.stage) return;
        if (this.dbgFlag === 0) {
            this.dbgFlag = 1;
            Timer.setTimeout(0, () => { this.simTo(Timer.now()/* + 2000*/); this.dbgFlag = 0; });
        }
        if (!this.dbgNode) { this.dbgNode = new Laya.Sprite3D("phy_dbg"); Laya.stage.getChildByName("Scene3D").addChild(this.dbgNode); }
        if (!this.dbgLines) {
            this.dbgLines = new Laya.PixelLineRenderer(); this.dbgLines.maxLineCount = this.MAX_DBG;
            this.dbgNode.addComponentInstance(this.dbgLines);
        }
        this.dbgLines.clear(); this.dbgCnt = 0;
        const states = this.map.get(); if (states.size < 5) return;
        const arr = Array.from(states);
        for (let i = 0; i < arr.length - 5; i += 5) {
            if (this.dbgCnt >= this.MAX_DBG) break;
            this.dbgLines.addLine(arr[i].pos, arr[i + 5].pos, this.DBG_COLOR, this.DBG_COLOR);
            this.dbgCnt++;
        }
    }
    public debugDrawNet(color?: Laya.Color) {
        if (!this.dbgNode) { this.dbgNode = new Laya.Sprite3D("phy_dbg"); Laya.stage.getChildByName("Scene3D").addChild(this.dbgNode); }
        if (!this.dbgLines) { this.dbgLines = new Laya.PixelLineRenderer(); this.dbgLines.maxLineCount = this.MAX_DBG; this.dbgLines.clear(); this.dbgNode.addComponentInstance(this.dbgLines); this.dbgCnt = 0; this.dbgI = 0; }
        if (!this.net || !this.dbgNode || !this.dbgLines) return;
        const net = this.net; const c = color || new Laya.Color(255, 0, 0, 255);
        const x0 = net.cx - net.hw, x1 = net.cx + net.hw; const y0 = net.cy - net.hh, y1 = net.cy + net.hh;
        const z0 = net.cz - net.hd, z1 = net.cz + net.hd;
        const corners = [new Laya.Vector3(x0, y0, z0), new Laya.Vector3(x1, y0, z0), new Laya.Vector3(x1, y1, z0), new Laya.Vector3(x0, y1, z0),
        new Laya.Vector3(x0, y0, z1), new Laya.Vector3(x1, y0, z1), new Laya.Vector3(x1, y1, z1), new Laya.Vector3(x0, y1, z1)];
        const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
        for (const [a, b] of edges) this.dbgLines.addLine(corners[a], corners[b], c, c);
    }
    public clearCache() { this.map.clearAll(); this.map.addByTime(this.state.time, this.state.clone()); this.resetDbg(); }
    public resetDbg() {
        // ✅ 修复：只清除画线数据，不销毁对象，防止 Laya 渲染管线空引用崩溃
        if (this.dbgLines) {
            this.dbgLines.clear();
        }
        this.dbgI = 0;
        this.dbgCnt = 0;
    }
    inv(s: State): boolean {
        if (isNaN(s.pos.x) || isNaN(s.pos.y) || isNaN(s.pos.z)) return true;
        if (V3.len(s.vel) > this.p.vmax * 2) return true;
        return false;
    }
    flightTime(): number { return (this.state.time - this.startT) / 1000; }
}