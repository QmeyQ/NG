/**
 * Phy — 球的状态与时间内核(唯一写入者)
 *
 * 写入纪律(联机一致性的前提, 违反任何一条都会让"同一参数+同一时刻=同一状态"失效):
 * - 起一段弹道只走 `strike(stroke, at, entry)`;
 * - 静止/钉住只走 `attachAt(pos, at)`;
 * - 外部(网络)灌状态只走 `restore(快照)`;
 * - 其余一切地方只读: `sampleAt/sampleRange/flying/resting/poseOut`。
 * 表现(Ball/节点)由 `poseOut()` 单向取用, 内核永不被表现层回写。
 */
import { Timer } from "../../libs/time";
import { MPMD } from "../../libs/mpm";
import { PhyCfg, State, V3, Fx, Params, NetConfig, BallRegionConfig, NetCollisionParams, NetHitInfo } from "./phyCfg";

/** 击球入参(与 Ball/StrokeParams 同形, 这里不 import 以免内核反向依赖表现层) */
export interface StrokeIn {
    power: number;
    angH: number;
    angV: number;
    spi?: Laya.Vector3 | null;
}

/** 起点位姿(构造时从表现层取一次, 之后不再回读) */
export interface PoseIn {
    pos: { x: number, y: number, z: number };
    rot: { x: number, y: number, z: number, w: number };
}

/** 状态快照: 定点整数字段 + 时刻, 与线上格式同构(编码/解码在 libs/pvpProto) */
export interface StateSnapshot {
    px: number, py: number, pz: number,
    vx: number, vy: number, vz: number,
    sx: number, sy: number, sz: number,
    sai: number,
    qx: number, qy: number, qz: number, qw: number,
    time: number
}

/** 表现层落点: 只要求能被写入 position/rotation, 不 import LayaAir 类型链 */
export interface PoseSink {
    root: { transform: { position: Laya.Vector3, rotation: Laya.Quaternion } };
}

export class Phy extends PhyCfg {
    private vEff = new Laya.Vector3();
    private algQ = new Laya.Quaternion(); // 球头稳定对齐目标旋转
    private _predMode = false; // 影子预测中: 屏蔽碰撞命中记录副作用

    constructor(pose: PoseIn, params: Partial<Params> = {}) {
        super();
        this.p = { ...this.DFLT, ...params };
        this.state = new State();

        // 边界入(Laya 浮点坐标) → Q10 整数: 球心 = 球位置 + cmOff 旋转偏移
        const cmW = new Laya.Vector3();
        Laya.Vector3.transformQuat(this.p.cmOff,
            new Laya.Quaternion(pose.rot.x, pose.rot.y, pose.rot.z, pose.rot.w), cmW);
        this.state.px = Fx.f2i(pose.pos.x + cmW.x);
        this.state.py = Fx.f2i(pose.pos.y + cmW.y);
        this.state.pz = Fx.f2i(pose.pos.z + cmW.z);
        this.state.qx = Fx.f2i(pose.rot.x); this.state.qy = Fx.f2i(pose.rot.y);
        this.state.qz = Fx.f2i(pose.rot.z); this.state.qw = Fx.f2i(pose.rot.w);
        this.state.iSync();
        this.state.time = Timer.now();
        this.startT = this.state.time;

        this.setNet({});
        this.setGround({ y: 0 });

        this.map = new MPMD(this.GRID);
        this.map.addByTime(this.state.time, this.state.clone());
    }

    // ==================== 唯一写入面(见文件头写入纪律) ====================

    /**
     * 起一段弹道: 把状态回退到 at 时刻(at 在过去时用内核历史, 历史缺则用 entryPos),
     * 再施加击球参数, 最后补算到现在。这就是"时间驱动同步"的全部动作, 外部不需要(也不许)
     * 自己翻 map、改 state、清命中记录。
     * @param at 击球时刻; 省略=现在(本地击球)
     */
    public strike(stroke: StrokeIn, at?: number, entryPos?: { x: number, y: number, z: number }): void {
        // 入口时刻【不许】跑到本机现在之后: 两端 Timer.now() 差一点(不同设备时钟不可能严格对齐)时,
        // 一个"未来的"入口会让 state.time 走在墙钟前面, 于是之后每一次 advanceTo(now) 都是空转
        // ——球就冻在原地不动了。宁可少算那几十毫秒(球位差 = 时钟差 × 球速, 由下一次击球重锚修正),
        // 也不能让弹道停摆。
        const wallNow = Timer.now();
        const t = Math.min(at != null ? at : wallNow, wallNow);
        if (t < this.state.time) {
            const hist = this._rollbackTarget(t);
            if (hist) this.state.copyFrom(hist);
            else if (entryPos) this._placeCentroidAt(entryPos);
            this.isSleeping = false;
            this.lastGndHit = null;
            this.lastNetHit = null;
        }
        this.hit(stroke.power, stroke.angH, stroke.angV, stroke.spi || null, t);
        // 迟到事件只补 CATCHUP_MAX_MS(见 pvpProto), 超出部分【真的丢掉】并把时钟顶到补算终点
        if (t < Timer.now()) this.advanceTo(this.catchUpDeadline(t));
    }

    /**
     * 附件(不是弹道): 球静止在 pos(钉在持球者手上/停在落点), 零速度, 时钟=at。
     * 双端各自本地调用, 只要 at/pos 一致结果就一致——这是"发球前球在谁手上"的正确做法。
     */
    public attachAt(pos: { x: number, y: number, z: number }, at?: number): void {
        const t = at != null ? at : Timer.now();
        this._placeCentroidAt(pos);
        this.state.vx = 0; this.state.vy = 0; this.state.vz = 0;
        this.state.sx = 0; this.state.sy = 0; this.state.sz = 0; this.state.sai = 0;
        this.state.time = t;
        this.startT = t;
        this.t = t;
        this.isCalc = false;
        this.isSleeping = true;
        this.lastGndHit = null;
        this.lastNetHit = null;
        this.map.clear();
        this.map.addByTime(t, this.state.clone());
    }

    /** 网络灌状态的唯一通道: 直接落一份定点整数快照(量纲与内核一致, 不再让外面写散落字段) */
    public restore(s: StateSnapshot): boolean {
        if (!s) return false;
        const nums = [s.px, s.py, s.pz, s.vx, s.vy, s.vz];
        if (!nums.every((n: any) => typeof n === 'number' && Number.isFinite(n))) return false;
        this.state.px = s.px | 0; this.state.py = s.py | 0; this.state.pz = s.pz | 0;
        this.state.vx = s.vx | 0; this.state.vy = s.vy | 0; this.state.vz = s.vz | 0;
        this.state.sx = (s.sx || 0) | 0; this.state.sy = (s.sy || 0) | 0; this.state.sz = (s.sz || 0) | 0;
        this.state.sai = (s.sai || 0) | 0;
        this.state.qx = (s.qx || 0) | 0; this.state.qy = (s.qy || 0) | 0;
        this.state.qz = (s.qz || 0) | 0; this.state.qw = (s.qw != null ? s.qw : 1024) | 0;
        // 同 strike: 权威快照的时刻若走在本机墙钟之前没事, 之后就要压回现在, 否则弹道会冻住不算
        this.state.time = Math.min(Number.isFinite(s.time) ? s.time : Timer.now(), Timer.now());
        this.state.iSync();
        this.startT = this.state.time;
        this.t = this.state.time;
        this.isSleeping = false;
        return true;
    }

    /** 读出定点整数快照(权威端发入口/停止点时给对端的就是这一份) */
    public snapshot(): StateSnapshot {
        const st = this.state;
        return {
            px: st.px, py: st.py, pz: st.pz,
            vx: st.vx, vy: st.vy, vz: st.vz,
            sx: st.sx, sy: st.sy, sz: st.sz, sai: st.sai,
            qx: st.qx, qy: st.qy, qz: st.qz, qw: st.qw,
            time: st.time
        };
    }

    /**
     * 把内核推进到时刻 t(允许过去→用历史, 未来→积分)。
     * 补算上限由 strike() 用 catchUpDeadline 表达; 这里保持"给多少算多少"以便 recovery 复用。
     */
    public advanceTo(t: number): void {
        if (!Number.isFinite(t)) return;
        // 只推进, 不回抄: simTo 内部已经把【格点】状态提交进权威 state 与历史,
        // 它返回的是含"不足一格的尾巴"的显示态——抄回来就等于让权威状态离开格点, 两端又开始分叉
        this.simTo(t);
    }

    /** 迟到击球的补算终点: now 与 (击球时刻+CATCHUP_MAX_MS) 取小 */
    public catchUpDeadline(hitTime: number): number {
        const cap = hitTime + Phy.CATCHUP_MAX_MS;
        return Timer.now() > cap ? cap : Timer.now();
    }

    /** 单次只读采样(不推进内核) */
    public sampleAt(t: number): State { return this.get(t) as State; }

    /** 区间只读采样(鹰眼记录/回放轨迹的唯一取数口) */
    public sampleRange(from: number, to: number): State[] { return this.get(from, to) as State[]; }

    /** 有没有弹道在飞(外部再也不该读 isCalc/isSleeping) */
    public flying(): boolean { return this.isCalc && !this.isSleeping; }
    public resting(): boolean { return !this.isCalc || this.isSleeping; }

    /**
     * 停算但【不改位姿、不清历史】: 判罚后/回合重置的窗口期用。
     * 历史要留着给鹰眼记录与回退, 所以这里只熄火, 不碰别的。
     */
    public halt(): void {
        this.isCalc = false;
        this.isSleeping = false;
        this.lastNetHit = null;
        this.lastGndHit = null;
    }

    /** ≤t 的最近内核状态(只读口, 供需要"那一刻在哪"的外部使用; 别自己翻 map) */
    public stateUpTo(t: number): State | null { return this._rollbackTarget(t); }

    /** 状态 → 表现(单向): 返回球节点应有的位姿, 由 Ball 写入节点。
     *  表现层读 disp(含不足一格的尾巴), 权威状态仍停在格点上 */
    public poseOut(): { pos: Laya.Vector3, rot: Laya.Quaternion } {
        const st = (this.disp && this.disp.time > this.state.time) ? this.disp : this.state;
        const off = new Laya.Vector3();
        Laya.Vector3.transformQuat(this.p.cmOff, st.rot, off);
        return {
            pos: new Laya.Vector3(st.pos.x - off.x, st.pos.y - off.y, st.pos.z - off.z),
            rot: st.rot.clone()
        };
    }

    /** @deprecated 用 poseOut()+由 Ball 落节点; 保留是为了不破坏旧调用点, 只是不再被内核依赖 */
    public applyToNode(node: PoseSink): void {
        const p = this.poseOut();
        node.root.transform.position = p.pos;
        node.root.transform.rotation = p.rot;
    }

    /** 内核历史的回退目标: ≤t 的最近一条(取不到返回 null, 由调用方走 entryPos) */
    private _rollbackTarget(t: number): State | null {
        if (!this.map) return null;
        const layout = this.map.timeTo(t);
        const lookback = this.MAX_LOOKBACK || 10;
        let best: State | null = null;
        for (let i = 0; i <= lookback; i++) {
            const set = this.map.get(layout - i);
            if (!set || !set.size) continue;
            for (const s of set) {
                if (s.time <= t && (!best || s.time > best.time)) best = s;
            }
        }
        return best ? best.clone() as State : null;
    }

    /** 把"节点位置"换算成"球心定点整数"放好(球心=位置+cmOff 旋转偏移, 与构造时同一套边界换算) */
    private _placeCentroidAt(pos: { x: number, y: number, z: number }): void {
        const cmW = new Laya.Vector3();
        Laya.Vector3.transformQuat(this.p.cmOff, this.state.rot, cmW);
        this.state.px = Fx.f2i(pos.x + cmW.x);
        this.state.py = Fx.f2i(pos.y + cmW.y);
        this.state.pz = Fx.f2i(pos.z + cmW.z);
        this.state.iSync();
    }

    /** 补算时长上限(ms): 一条迟到的击球按"现在-击球时刻"整段积分能把球打出几十米 */
    public static readonly CATCHUP_MAX_MS = 600;

    /**
     * 击球重置轨迹。
     * @param hitTime 击球时刻(时间驱动同步, 用户规格): 省略=现在(本地击球);
     *  PVP 远端重放传消息内击球时刻——轨迹从过去时刻起算, 双端从同一 (t, 参数) 出发
     *  各自 simTo(现在) 必收敛(时间驱动模拟引擎的意义)。调用方需先把球状态回退到该时刻
     *  (ball.hit 已内置: 从 map 取 ≤t 最近历史 state 作击球起点)。
     */
    public hit(power: number, angH: number, angV: number, spin?: Laya.Vector3 | null, hitTime?: number) {
        this.isSleeping = false; // 击球唤醒
        const np = power / 100;
        const v = this.p.vmax * Math.pow(np, 1.5);
        const rh = angH * Math.PI / 180;
        const rv = angV * Math.PI / 180;
        const cv = Math.cos(rv); const sv = Math.sin(rv);
        this.isCalc = true;

        const ns = new State();
        ns.px = this.state.px; ns.py = this.state.py; ns.pz = this.state.pz;
        // 边界入(浮点三角函数构造) → Q10 整数
        ns.vy = Fx.f2i(sv * v);
        ns.vx = Fx.f2i(Math.cos(rh) * cv * v);  // 0→-v(左), 90→0, 180→+v(右)
        ns.vz = Fx.f2i(-Math.sin(rh) * cv * v);   // 0→0,   90→+v, 180→0
        if (spin && V3.len(spin) > 0.01) {
            ns.sx = Fx.f2i(spin.x); ns.sy = Fx.f2i(spin.y); ns.sz = Fx.f2i(spin.z);
        }
        ns.iSync();

        if (v > 0.01) this.alx(ns.vel, ns.rot);
        else this.alx(V3.UP, ns.rot);

// 如果传了 spin，用它作为初始自转；否则按力度给
// if (spin && V3.len(spin) > 0.01) {
//     ns.sai = Fx.f2i(spin.z);   // spin.z 直接映射到 sa（绕球头 +Z）
// } else {
    ns.sai = Fx.f2i(30 + np * 8);
// }

// ★ 横向冲击：拍面击球不完美产生的横向力矩 → 球头绕速度轴摆动（进动）
const latAmp = np * 120;
ns.sx = Fx.f2i(latAmp * Math.cos(rh));
ns.sy = Fx.f2i(latAmp * Math.sin(rh));


        // alx 走引擎四元数(浮点) → 量化回整数网格
        ns.fToI(); ns.iSync();

        const now = hitTime != null ? hitTime : Timer.now();
        ns.time = now;
        this.state = ns;
        this.startT = now;
        this.t = now;
        this.map.clear();
        this.map.addByTime(now, this.state.clone());
        this.resetTrk();
        this.lastNetHit = null;
        this.lastGndHit = null;
    }

    /**
     * 按时间查询球状态(用户规格: 允许输入两个参数 st/et):
     * - get() / get(t): 单时刻模式, 返回该时间(省略=当前时刻)的单个 State
     * - get(st, et): 区间模式, 返回 [st, et] 时间段内按采样步长(40ms)的状态数组
     *   (内部逐档 simTo 推进, 已算档位走缓存不重复积分; st>et 自动交换)
     */
    public get(t?: number, et?: number): State | State[] {
        if (t === undefined || et === undefined) {
            if (!this.isCalc || this.isSleeping) return this.state.clone();
            const tt = t === undefined ? Timer.now() : t;
            // 返回 target 时刻的状态(尾巴只进 disp); 不回抄进 this.state——那会让权威状态离开格点
            return this.simTo(tt);
        }
        // 区间模式(用户规格 [st, et]):
        // - 历史段(≤state.time)从 map 缓存提取——物理停算(isCalc=false, 结算后回持球)时
        //   simTo 短路返回同一点, map 是唯一数据源("鹰眼回放球不动"根因);
        // - 未来段(>state.time 且活球)在【影子状态】上积分: 权威 state、历史 map、判罚事件
        //   一个都不动(旧写法直接拿 simTo 往前推再把 state 抄回来, 可 map 里那些"未来态"留下来了;
        //   而两端取记录的时刻不同 → 后来 simTo 的缓存起点两头不一致 = 同参数算出两条球路);
        // - st>et 自动交换; 全空兜底当前 state
        let st = t, end = et;
        if (st > end) { const tmp = st; st = end; end = tmp; }
        const out: State[] = [];
        const nowT = this.state.time;
        const histEnd = Math.min(end, nowT);
        if (this.map && histEnd >= st) {
            const states: any[] = Array.from(this.map.get() as any)
                .sort((a: any, b: any) => a.time - b.time)
                .filter((s: any) => s.time >= st && s.time <= histEnd);
            for (const s of states) out.push(s.clone() as State);
        }
        if (this.isCalc && !this.isSleeping && end > nowT) {
            const savedT = this.t, savedSleep = this.isSleeping, pred = this._predMode;
            this._predMode = true;
            try {
                const shadow = this.state.clone();
                let tFrom = nowT;
                for (let g = 0; tFrom < end && g < 400; g++) {
                    const tTo = Math.min(tFrom + 40, end);
                    this._simSeg(shadow, tFrom, tTo);
                    tFrom = this.t;
                    shadow.time = tTo;
                    out.push(shadow.clone());
                    // 休眠/发散: _simSeg 停在断点, 再往前推没有意义
                    if (this.isSleeping || tFrom < tTo) break;
                }
            } finally {
                this._predMode = pred;
                this.isSleeping = savedSleep;
                this.t = savedT;
            }
        }
        if (out.length === 0) out.push(this.state.clone());
        return out;
    }

    private sphBox(sx: number, sy: number, sz: number, sr: number, net: NetConfig, outClosest: Laya.Vector3, outNormal: Laya.Vector3): number {
        outClosest.x = V3.clamp(sx, net.cx - net.hw, net.cx + net.hw);
        outClosest.y = V3.clamp(sy, net.cy - net.hh, net.cy + net.hh);
        outClosest.z = V3.clamp(sz, net.cz - net.hd, net.cz + net.hd);

        const dx = sx - outClosest.x; const dy = sy - outClosest.y; const dz = sz - outClosest.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq >= sr * sr) return 0;

        const dist = Math.sqrt(distSq);
        if (dist < 1e-8) return -1; // 返回 -1 表示球心完全陷入盒内，需特殊处理

        const pen = sr - dist; const inv = 1 / dist;
        outNormal.x = dx * inv; outNormal.y = dy * inv; outNormal.z = dz * inv;
        return pen;
    }

    private clampSt(s: State) {
        const v = V3.len(s.vel);
        if (v > this.p.vmax) { const sc = this.p.vmax / v; s.vel.x *= sc; s.vel.y *= sc; s.vel.z *= sc; }
        const maxSpin = 300 * Math.PI;
        s.sa = V3.clamp(s.sa, -maxSpin, maxSpin);
        const snMag = V3.len(s.sn);
        if (snMag > maxSpin) { const sc = maxSpin / snMag; s.sn.x *= sc; s.sn.y *= sc; s.sn.z *= sc; }
    }

    private imp(s: State, spherePos: Laya.Vector3, sphereR: number, normal: Laya.Vector3, pen: number, isHead: boolean, rest: number, friction: number, extraFriction: number = 0, dt: number = 0.001): boolean {
        this.cR.x = spherePos.x - normal.x * sphereR - s.pos.x;
        this.cR.y = spherePos.y - normal.y * sphereR - s.pos.y;
        this.cR.z = spherePos.z - normal.z * sphereR - s.pos.z;

        s.pos.x += normal.x * pen; s.pos.y += normal.y * pen; s.pos.z += normal.z * pen;

        Laya.Vector3.transformQuat(V3.FORWARD, s.rot, this.cLz); // ← 目标从 cLx 改 cLz
        this.cOw.x = s.sn.x + this.cLz.x * s.sa;
        this.cOw.y = s.sn.y + this.cLz.y * s.sa;
        this.cOw.z = s.sn.z + this.cLz.z * s.sa;

        V3.cross(this.cOw, this.cR, this.cVc);
        V3.add(s.vel, this.cVc, this.cVc);

        const vn = V3.dot(this.cVc, normal);
        const slop = 0.002; const percent = 0.4;
        const biasMag = Math.min(10, Math.max(0, pen - slop) / dt * percent);

        if (vn >= 0 && biasMag <= 0) return true;

        const m = this.p.m;
        const I_na = this.p.I_perp;

        V3.cross(this.cR, normal, this.cRxN);
        const rxnSq = V3.lenSq(this.cRxN);
        const invM_n = 1.0 / m + rxnSq / I_na;

        let JnBounce = 0;
        if (vn < 0) JnBounce = -(1 + rest) * vn / invM_n;

        const JnBias = biasMag / invM_n;
        const velN = V3.dot(s.vel, normal);
        const desiredVelN = -rest * velN;
        const JnLinMin = m * (desiredVelN - velN);

        let JnTotalLin = JnBounce + JnBias;
        if (JnTotalLin < JnLinMin) JnTotalLin = JnLinMin;
        if (JnTotalLin < 0) JnTotalLin = 0;

        const jnLin = JnTotalLin / m;
        s.vel.x += normal.x * jnLin; s.vel.y += normal.y * jnLin; s.vel.z += normal.z * jnLin;

        if (JnBounce > 0) {
            V3.cross(this.cR, normal, this.cDo);
            const jnAng = JnBounce / I_na;
            this.cDo.x *= jnAng; this.cDo.y *= jnAng; this.cDo.z *= jnAng;
        } else { this.cDo.setValue(0, 0, 0); }

        this.cT1.x = this.cOw.x + this.cDo.x; this.cT1.y = this.cOw.y + this.cDo.y; this.cT1.z = this.cOw.z + this.cDo.z;
        V3.cross(this.cT1, this.cR, this.cVc);
        V3.add(s.vel, this.cVc, this.cVc);

        const vn2 = V3.dot(this.cVc, normal);
        this.cT.x = this.cVc.x - normal.x * vn2;
        this.cT.y = this.cVc.y - normal.y * vn2;
        this.cT.z = this.cVc.z - normal.z * vn2;
        const vtMag = V3.len(this.cT);

        if (vtMag > 0.01) {
            const invVt = 1 / vtMag;
            this.cT.x *= invVt; this.cT.y *= invVt; this.cT.z *= invVt;

            V3.cross(this.cR, this.cT, this.cRxT);
            const rxtSq = V3.lenSq(this.cRxT);
            const invM_t = 1.0 / m + rxtSq / I_na;

            let Jt = vtMag / invM_t;
            const maxJt = (friction + extraFriction) * JnTotalLin;
            if (Jt > maxJt) Jt = maxJt;

            const jtLin = -Jt / m;
            s.vel.x += this.cT.x * jtLin; s.vel.y += this.cT.y * jtLin; s.vel.z += this.cT.z * jtLin;

            V3.cross(this.cR, this.cT, this.cT2);
            const jtAng = -Jt / I_na;
            this.cDo.x += this.cT2.x * jtAng; this.cDo.y += this.cT2.y * jtAng; this.cDo.z += this.cT2.z * jtAng;
        }

        const dSa = V3.dot(this.cDo, this.cLz);
        s.sa += dSa;
        s.sn.x += this.cDo.x - this.cLz.x * dSa;
        s.sn.y += this.cDo.y - this.cLz.y * dSa;
        s.sn.z += this.cDo.z - this.cLz.z * dSa;/////cLx -> cLZ
        this.clampSt(s);
        return true;
    }

    private procCol(s: State, net: NetConfig, ncol: NetCollisionParams, isGround: boolean, dt: number): void {
        const reg = this.region;

        // 地面判定(用户规则: y < 0 即到地, 不判 0 区间)——薄盒 hh=0.001 的穿透容错极小,
        // 球心穿到 y<0 后 clamp 把 closest 钉回盒面、dy≈|y| ≥ featherR 时 sphBox pen=0 零穿透,
        // recordGndHit 永不触发(球浮空不结算根因)。y<0 直接造法向碰撞并按弹跳衰减速度。
        if (isGround) {
            const gndY = net.cy - net.hh; // = setGround 的 y(默认 0)
            if (s.pos.y < gndY) {
                // 球心拉回地面 + 法向反弹 + 摩擦衰减(对齐 imp 地面语义)
                s.pos.y = gndY;
                if (s.vel.y < 0) {
                    s.vel.y = -s.vel.y * ncol.restFeather;
                    s.vel.x *= (1 - ncol.friction * 0.5);
                    s.vel.z *= (1 - ncol.friction * 0.5);
                }
                this.recordGndHit(s, false, true);
                return;
            }
            if (s.pos.y > gndY + 20) return; // 远离地面直接跳过(省 axes 计算)
            // 贴地滑行兜底: 球心贴地 + 垂直速度已经很小 = 这是一颗已经落地的死球。薄地面盒给不出
            // 穿透量(见上), 于是只剩气动阻力在减它的水平速度——实测能沿地面滑出十几米, 两端各自
            // 入口上的一点点差都被这段滑行放大成"完全不同的位置"。按时间常数把水平速度吃掉。
            if (s.pos.y < gndY + 0.03 && Math.abs(s.vel.y) < 1.0) {
                const k = Math.max(0, 1 - dt / 0.05);
                s.vel.x *= k;
                s.vel.z *= k;
            }
        }

        const ext = Math.max(reg.headDist + reg.headR, reg.featherDist + reg.featherR);
        if (s.pos.x < net.cx - net.hw - ext || s.pos.x > net.cx + net.hw + ext) return;
        if (s.pos.y < net.cy - net.hh - ext || s.pos.y > net.cy + net.hh + ext) return;
        if (s.pos.z < net.cz - net.hd - ext || s.pos.z > net.cz + net.hd + ext) return;

        this.axes(s.rot, this.cLx, this.cLy, this.cLz);
        // this.cHp.x = s.pos.x + this.cLx.x * reg.headDist; this.cHp.y = s.pos.y + this.cLx.y * reg.headDist; this.cHp.z = s.pos.z + this.cLx.z * reg.headDist;
        // this.cFp.x = s.pos.x - this.cLx.x * reg.featherDist; this.cFp.y = s.pos.y - this.cLx.y * reg.featherDist; this.cFp.z = s.pos.z - this.cLx.z * reg.featherDist;
        this.cHp.x = s.pos.x + this.cLz.x * reg.headDist;
        this.cHp.y = s.pos.y + this.cLz.y * reg.headDist;
        this.cHp.z = s.pos.z + this.cLz.z * reg.headDist;
        this.cFp.x = s.pos.x - this.cLz.x * reg.featherDist;
        this.cFp.y = s.pos.y - this.cLz.y * reg.featherDist;
        this.cFp.z = s.pos.z - this.cLz.z * reg.featherDist;

        let penH = this.sphBox(this.cHp.x, this.cHp.y, this.cHp.z, reg.headR, net, this.cCl1, this.cN1);
        let penF = this.sphBox(this.cFp.x, this.cFp.y, this.cFp.z, reg.featherR, net, this.cCl2, this.cN2);

        // 【核心修复】处理高速隧穿嵌入：球心在网内时，强制根据速度方向反向弹出
        if (penH === -1) {
            if (Math.abs(s.vel.x) > Math.abs(s.vel.y)) {
                this.cN1.setValue(s.vel.x > 0 ? -1 : 1, 0, 0);
            } else {
                this.cN1.setValue(0, s.vel.y > 0 ? -1 : 1, 0);
            }
            V3.copy(this.cHp, this.cCl1);
            penH = reg.headR * 1.5; // 给予较大穿透量强制推出
        }
        if (penF === -1) {
            if (Math.abs(s.vel.x) > Math.abs(s.vel.y)) {
                this.cN2.setValue(s.vel.x > 0 ? -1 : 1, 0, 0);
            } else {
                this.cN2.setValue(0, s.vel.y > 0 ? -1 : 1, 0);
            }
            V3.copy(this.cFp, this.cCl2);
            penF = reg.featherR * 1.5;
        }

        let hitHead = false; let hitFeather = false;

        if (penH > 1e-8 && penH >= penF) {
            V3.copy(this.cN1, this.cN); V3.copy(this.cCl1, this.cCl);
            hitHead = this.imp(s, this.cHp, reg.headR, this.cN1, penH, true, ncol.restHead, ncol.friction, 0, dt);
        } else if (penF > 1e-8) {
            V3.copy(this.cN2, this.cN); V3.copy(this.cCl2, this.cCl);
            hitFeather = this.imp(s, this.cFp, reg.featherR, this.cN2, penF, false, ncol.restFeather, ncol.friction, ncol.featherGrip, dt);
        }

        if (!isGround && hitFeather && ncol.catchBoost > 0 && penF > reg.featherR * 0.5) {
            const damp = 1.0 - ncol.catchBoost * 0.5;
            V3.scale(s.vel, damp, s.vel);
        }

        if (!isGround && !hitHead && hitFeather && ncol.catchBoost > 0) {
            this.axes(s.rot, this.cLx, this.cLy, this.cLz);
            const hdx = this.cHp.x - this.cCl.x; const hdy = this.cHp.y - this.cCl.y; const hdz = this.cHp.z - this.cCl.z;
            const headPast = (hdx * this.cN.x + hdy * this.cN.y + hdz * this.cN.z) > 0;
            if (headPast) {
                //V3.cross(s.vel, this.cLx, this.bonus);
                V3.cross(s.vel, this.cLz, this.bonus);       // ← cLx → cLz
                const bonusLen = V3.len(this.bonus);
                if (bonusLen > 1e-6) {
                    V3.norm(this.bonus, this.bonus);
                    const vMag = V3.len(s.vel);
                    const torqueMag = ncol.catchBoost * vMag * this.p.m * 0.5 / this.p.I_perp;
                    // const bSa = V3.dot(this.bonus, this.cLx);
                    // this.bonus.x -= this.cLx.x * bSa; this.bonus.y -= this.cLx.y * bSa; this.bonus.z -= this.cLx.z * bSa;
                    const bSa = V3.dot(this.bonus, this.cLz);    // ← cLx → cLz
                    this.bonus.x -= this.cLz.x * bSa;            // ← cLx → cLz
                    this.bonus.y -= this.cLz.y * bSa;
                    this.bonus.z -= this.cLz.z * bSa;
                    const bSnLen = V3.len(this.bonus);
                    if (bSnLen > 1e-6) {
                        this.bonus.x *= torqueMag / bSnLen; this.bonus.y *= torqueMag / bSnLen; this.bonus.z *= torqueMag / bSnLen;
                        s.sn.x += this.bonus.x; s.sn.y += this.bonus.y; s.sn.z += this.bonus.z;
                    }
                }
                this.recordHit(s, false, true, true);
            }
        } else if (hitHead || hitFeather) {
            if (!isGround) this.recordHit(s, hitHead, hitFeather, false);
            else this.recordGndHit(s, hitHead, hitFeather);
        }
    }

    private recordHit(s: State, head: boolean, feather: boolean, past: boolean) {
        if (this._predMode) return; // 影子预测不产生真实命中事件
        if (!this.lastNetHit || s.time - this.lastNetHit.time > 50) {
            const info = new NetHitInfo(); info.time = s.time;
            info.headHit = head; info.featherHit = feather; info.headPastNet = past;
            V3.copy(this.cN, info.normal); info.isGround = false;
            this.lastNetHit = info;
        }
    }

    private recordGndHit(s: State, head: boolean, feather: boolean) {
        if (this._predMode) return; // 影子预测不产生真实命中事件
        if (!this.lastGndHit || s.time - this.lastGndHit.time > 50) {
            const info = new NetHitInfo(); info.time = s.time;
            info.headHit = head; info.featherHit = feather; info.headPastNet = false;
            V3.copy(this.cN, info.normal); info.isGround = true;
            this.lastGndHit = info;
        }
    }

    private alx(dir: Laya.Vector3, out: Laya.Quaternion) {
        V3.norm(dir, this.ad);
        if (V3.lenSq(this.ad) < 1e-10) { out.identity(); return; }
        Laya.Quaternion.rotationLookAt(this.ad, V3.UP, out);
        // Laya.Quaternion.createFromAxisAngle(V3.UP, -Math.PI / 2, this.ar);
        // Laya.Quaternion.multiply(out, this.ar, out);
    }

    private gyr(lx: Laya.Vector3, vel: Laya.Vector3, v: number, sa: number, dt: number, outT: Laya.Vector3): { aa: number; nsa: number } {
        const res = { aa: 0, nsa: sa };
        if (v < 0.8) { outT.setValue(0, 0, 0); res.aa = -sa * 100.0; return res; }
        V3.norm(vel, this.gv);
        const cosT = V3.clamp(V3.dot(lx, this.gv), -1, 1);
        const theta = Math.acos(cosT); const sinT = Math.sin(theta);
        const effCos = Math.max(cosT, 0.2);
        const target = v * this.p.kc * effCos;
        const coup = 3.0 + v * 0.1;
        const damp = -sa * this.p.kdamp * (1.0 + v * 0.05);
        res.aa = (target - sa) * coup + damp;

        if (theta < 0.001) { outT.setValue(0, 0, 0); return res; }
        V3.cross(lx, this.gv, this.gr);
        const axLenSq = V3.lenSq(this.gr);
        if (axLenSq < 1e-12) { outT.setValue(0, 0, 0); return res; }
        const axLen = Math.sqrt(axLenSq);
        this.gr.x /= axLen; this.gr.y /= axLen; this.gr.z /= axLen;

        const A = Math.PI * this.p.r * this.p.r;
        const q = 0.5 * this.p.rho * v * v;
        const base = q * A * this.p.r * sinT * 0.5;
        const gyroEnh = 1.0 + Math.abs(sa) * 0.03;
        const mag = base * gyroEnh;
        outT.x = this.gr.x * mag; outT.y = this.gr.y * mag; outT.z = this.gr.z * mag;
        return res;
    }

    private drg(lx: Laya.Vector3, vel: Laya.Vector3, v: number, out: Laya.Vector3) {
        if (v < 0.01) { out.setValue(0, 0, 0); return; }
        V3.norm(vel, this.dv);
        const cosT = V3.clamp(V3.dot(lx, this.dv), -1, 1);
        let cd: number;
        if (cosT > 0) cd = this.p.cdA + (this.p.cdB - this.p.cdA) * (1 - cosT) * 0.7;
        else cd = this.p.cdB - (this.p.cdB - this.p.cdA) * cosT * 0.3;
        const A = Math.PI * this.p.r * this.p.r;
        const q = 0.5 * this.p.rho * v * v;
        const mag = q * cd * A;
        out.x = -this.dv.x * mag; out.y = -this.dv.y * mag; out.z = -this.dv.z * mag;
    }

    private mag(rot: Laya.Quaternion, sn: Laya.Vector3, sa: number, vel: Laya.Vector3, v: number, out: Laya.Vector3) {
        out.setValue(0, 0, 0);
        if (v < 0.5) return;
        this.axes(rot, this.mlx, this.mly, this.mlz);
        V3.scale(this.mlx, sa, this.mow);
        V3.add(this.mow, sn, this.mow);
        const wMag = V3.len(this.mow);
        if (wMag < 0.1) return;
        V3.cross(this.mow, vel, this.mc);
        const crossMag = V3.len(this.mc);
        if (crossMag < 1e-10) return;
        const Aeff = Math.PI * this.p.r * this.p.r * this.p.maArea;
        const K = 0.5 * this.p.cm * this.p.rho * Aeff * this.p.r;
        V3.scale(this.mc, K, out);
    }

    private nax(v: number, sn: Laya.Vector3, out: Laya.Vector3) {
        const rate = V3.len(sn);
        if (rate < 0.01 || v < 1.0) { out.setValue(0, 0, 0); return; }
        const A = Math.PI * this.p.r * this.p.r;
        const q = 0.5 * this.p.rho * v * v;
        const mag = q * A * this.p.r * this.p.naDamp;
        const f = -mag / rate;
        out.x = sn.x * f; out.y = sn.y * f; out.z = sn.z * f;
    }

    private der(s: State, dt: number): { s: State; aa: number } {
        const d = this.derD;
        // d.pos = s.vel(整数直拷——RK4 导数缓存消费整数字段)
        d.px = s.vx; d.py = s.vy; d.pz = s.vz;

        const vRaw = V3.len(s.vel);
        this.axes(s.rot, this.lx, this.ly, this.lz);

        this.drg(this.lz, s.vel, vRaw, this.df);/////
        this.gf.setValue(0, -this.p.m * this.p.g, 0);
        V3.add(this.df, this.gf, this.tf);

        const halfDt = dt * 0.5;
        const aDragX = this.tf.x / this.p.m; const aDragY = this.tf.y / this.p.m; const aDragZ = this.tf.z / this.p.m;
        this.vEff.x = s.vel.x + aDragX * halfDt; this.vEff.y = s.vel.y + aDragY * halfDt; this.vEff.z = s.vel.z + aDragZ * halfDt;
        const vEff = V3.len(this.vEff);

        // 【修改点】屏蔽马格努斯力计算，排查角度异常问题
        // this.mag(s.rot, s.sn, s.sa, this.vEff, vEff, this.mf);
        // V3.add(this.tf, this.mf, this.tf);

        // 力项出口量化(Q10): d.vel/d.sn 为导数(加速度/角加速度), 浮点内部计算后对齐网格
        d.vx = Fx.f2i(this.tf.x / this.p.m); d.vy = Fx.f2i(this.tf.y / this.p.m); d.vz = Fx.f2i(this.tf.z / this.p.m);

        const I_na = this.p.I_perp;
        let gy = this.gyr(this.lz, this.vEff, vEff, s.sa, halfDt, this.gt);///

        if (vEff < 1.0) {
            const dampRate = 10.0 * Math.max(0, 1.0 - vEff);
            this.nd.x = -s.sn.x * dampRate * I_na; this.nd.y = -s.sn.y * dampRate * I_na; this.nd.z = -s.sn.z * dampRate * I_na;
        } else {
            this.nax(vEff, s.sn, this.nd);
        }



        V3.projPlane(this.gt, this.lz, this.gn);///
        d.sx = Fx.f2i((this.gn.x + this.nd.x) / I_na);
        d.sy = Fx.f2i((this.gn.y + this.nd.y) / I_na);
        d.sz = Fx.f2i((this.gn.z + this.nd.z) / I_na);
        d.iSync();

        return { s: d, aa: gy.aa };
    }


    //     private der(s: State, dt: number): { s: State; aa: number } {
    //     const d = this.derD;
    //     // d.pos = s.vel(整数直拷——RK4 导数缓存消费整数字段)
    //     d.px = s.vx; d.py = s.vy; d.pz = s.vz;

    //     const vRaw = V3.len(s.vel);
    //     this.axes(s.rot, this.lx, this.ly, this.lz);

    //     this.drg(this.lx, s.vel, vRaw, this.df);
    //     this.gf.setValue(0, -this.p.m * this.p.g, 0);
    //     V3.add(this.df, this.gf, this.tf);

    //     const halfDt = dt * 0.5;
    //     const aDragX = this.tf.x / this.p.m; const aDragY = this.tf.y / this.p.m; const aDragZ = this.tf.z / this.p.m;
    //     this.vEff.x = s.vel.x + aDragX * halfDt; this.vEff.y = s.vel.y + aDragY * halfDt; this.vEff.z = s.vel.z + aDragZ * halfDt;
    //     const vEff = V3.len(this.vEff);

    //     // 【修改点】屏蔽马格努斯力计算，排查角度异常问题
    //     // this.mag(s.rot, s.sn, s.sa, this.vEff, vEff, this.mf);
    //     // V3.add(this.tf, this.mf, this.tf);

    //     // 力项出口量化(Q10): d.vel/d.sn 为导数(加速度/角加速度), 浮点内部计算后对齐网格
    //     d.vx = Fx.f2i(this.tf.x / this.p.m); d.vy = Fx.f2i(this.tf.y / this.p.m); d.vz = Fx.f2i(this.tf.z / this.p.m);

    //     const I_na = this.p.I_perp;
    //     let gy = this.gyr(this.lx, this.vEff, vEff, s.sa, halfDt, this.gt);

    //     if (vEff < 1.0) {
    //         const dampRate = 10.0 * Math.max(0, 1.0 - vEff);
    //         this.nd.x = -s.sn.x * dampRate * I_na; this.nd.y = -s.sn.y * dampRate * I_na; this.nd.z = -s.sn.z * dampRate * I_na;
    //     } else {
    //         this.nax(vEff, s.sn, this.nd);
    //     }

    //     // ==================== 压心气动恢复力矩 ====================
    //     // 真实羽毛球"球头朝前"的物理来源：压心在质心后方(局部 -X 方向 acOff 比 cmOff 更远)，
    //     // 阻力合力作用在压心，相对质心产生 τ = lever × F_drag，方向把球头拧回速度方向。
    //     // 之前靠 rk4 末尾 alx+slerp 硬拉姿态，现在物理化，可删掉那段 hack。
    //     //
    //     // 杠杆臂（局部）= acOff - cmOff = (-0.025 - 0.015, 0, 0) = (-0.04, 0, 0)
    //     this.lever.x = this.p.acOff.x - this.p.cmOff.x;
    //     this.lever.y = this.p.acOff.y - this.p.cmOff.y;
    //     this.lever.z = this.p.acOff.z - this.p.cmOff.z;
    //     Laya.Vector3.transformQuat(this.lever, s.rot, this.lever); // 局部 → 世界

    //     // τ_restore = lever × F_drag
    //     V3.cross(this.lever, this.df, this.aeroTq);

    //     // 分解到轴向（绕球头自转轴 lx）与横向（垂直于 lx 的平面）
    //     const tauAxial = V3.dot(this.aeroTq, this.lx);
    //     V3.projPlane(this.aeroTq, this.lx, this.tauPerp);

    //     // ==================== 横向进动阻尼 ====================
    //     // 光有恢复力矩，球头到位后会因角速度惯性过冲 → 反向恢复 → 振荡不收敛。
    //     // 物理阻尼来自裙边在空气中的横向运动，与横向角速度成正比，系数随速度增大。
    //     const snAxial = V3.dot(s.sn, this.lx);
    //     const snPerpX = s.sn.x - this.lx.x * snAxial;
    //     const snPerpY = s.sn.y - this.lx.y * snAxial;
    //     const snPerpZ = s.sn.z - this.lx.z * snAxial;
    //     const dampCoef = 0.5 * vEff;                       // 经验系数：v=10 → 5/s
    //     this.dampTq.x = -snPerpX * dampCoef * I_na;         // 力矩量纲 N·m
    //     this.dampTq.y = -snPerpY * dampCoef * I_na;
    //     this.dampTq.z = -snPerpZ * dampCoef * I_na;
    //     // ============================================================

    //     V3.projPlane(this.gt, this.lx, this.gn);

    //     // 横向角加速度 = (陀螺 + 轴向阻尼 + 恢复力矩横向 + 进动阻尼) / I_perp
    //     d.sx = Fx.f2i((this.gn.x + this.nd.x + this.tauPerp.x + this.dampTq.x) / I_na);
    //     d.sy = Fx.f2i((this.gn.y + this.nd.y + this.tauPerp.y + this.dampTq.y) / I_na);
    //     d.sz = Fx.f2i((this.gn.z + this.nd.z + this.tauPerp.z + this.dampTq.z) / I_na);
    //     d.iSync();

    //     // 轴向角加速度 = 陀螺轴向项 + 恢复力矩轴向分量 / I_axial
    //     const aaTotal = gy.aa + tauAxial / this.p.Ia;

    //     return { s: d, aa: aaTotal };
    // }

    /** 欧拉推进(纯整数运算): state += k * dt。
     * d.px 是位置导数(der: d.px = s.vx), d.vx 是速度导数(加速度)。
     * 步长 Q20(×1048576): dt=0.001s 在 Q10 下仅 1 单位(精度崩), Q20 有 1049 单位;
     * 乘积加半偏置右移 = 整数 round(负数 floor 系统偏差修正, 纯整数保持) */
    eul(s: State, d: State, aa: number, dt: number) {
        const dti = Math.round(dt * 1048576);
        if (dti <= 0) return;
        const HALF = 524288;
        s.px += (d.px * dti + HALF) >> 20; s.py += (d.py * dti + HALF) >> 20; s.pz += (d.pz * dti + HALF) >> 20;
        s.vx += (d.vx * dti + HALF) >> 20; s.vy += (d.vy * dti + HALF) >> 20; s.vz += (d.vz * dti + HALF) >> 20;
        s.sx += (d.sx * dti + HALF) >> 20; s.sy += (d.sy * dti + HALF) >> 20; s.sz += (d.sz * dti + HALF) >> 20;
        const aai = Fx.f2i(aa);
        s.sai += (aai * dti + HALF) >> 20;
        const maxSpin = Fx.f2i(200 * Math.PI);
        s.sai = V3.clamp(s.sai, -maxSpin, maxSpin);
        s.iSync();
    }

    private rstep(rot: Laya.Quaternion, sn: Laya.Vector3, sa: number, lx: Laya.Vector3, dt: number) {
        V3.copy(sn, this.rt);
        this.rt.x += lx.x * sa; this.rt.y += lx.y * sa; this.rt.z += lx.z * sa;
        const rate = V3.len(this.rt);
        if (rate < 1e-8) return;
        const angle = rate * dt;
        V3.norm(this.rt, this.ra);

        const half = angle * 0.5; const sh = Math.sin(half);
        this.rd.x = this.ra.x * sh; this.rd.y = this.ra.y * sh; this.rd.z = this.ra.z * sh; this.rd.w = Math.cos(half);
        Laya.Quaternion.multiply(this.rd, rot, rot);

        const ls = rot.x * rot.x + rot.y * rot.y + rot.z * rot.z + rot.w * rot.w;
        if (ls > 0) { const inv = 1 / Math.sqrt(ls); rot.x *= inv; rot.y *= inv; rot.z *= inv; rot.w *= inv; }
    }

    rk4(s: State, dt: number) {
        const r1 = this.der(s, dt);
        this.k1.s.copyFrom(r1.s); this.k1.aa = r1.aa;

        this.s2.copyFrom(s);
        this.eul(this.s2, this.k1.s, this.k1.aa, dt * 0.5);
        this.axes(s.rot, this.klx, this.kly, this.klz);
        this.rstep(this.s2.rot, s.sn, s.sa, this.klz, dt * 0.5); //

        const r2 = this.der(this.s2, dt);
        this.k2.s.copyFrom(r2.s); this.k2.aa = r2.aa;

        this.s3.copyFrom(s);
        this.eul(this.s3, this.k2.s, this.k2.aa, dt * 0.5);
        this.axes(this.s2.rot, this.klx, this.kly, this.klz);
        this.rstep(this.s3.rot, this.s2.sn, this.s2.sa, this.klz, dt * 0.5);//

        const r3 = this.der(this.s3, dt);
        this.k3.s.copyFrom(r3.s); this.k3.aa = r3.aa;

        this.s4.copyFrom(s);
        this.eul(this.s4, this.k3.s, this.k3.aa, dt);
        this.axes(this.s3.rot, this.klx, this.kly, this.klz);
        this.rstep(this.s4.rot, this.s3.sn, this.s3.sa, this.klz, dt);//

        const r4 = this.der(this.s4, dt);
        this.k4.s.copyFrom(r4.s); this.k4.aa = r4.aa;

        // RK4 组合(纯整数): state += (k1 + 2k2 + 2k3 + k4)/6 * dt
        this.combI(s, this.k1.s, this.k2.s, this.k3.s, this.k4.s, dt);

        const aaAvg = (this.k1.aa + 2 * this.k2.aa + 2 * this.k3.aa + this.k4.aa) / 6;
        s.sa += aaAvg * dt;

        this.axes(this.s4.rot, this.klx, this.kly, this.klz);
        this.rstep(s.rot, s.sn, s.sa, this.klz, dt);//

        // 球头稳定(羽毛球裙边气动特性): 球轴快速对齐速度方向(球头朝前)。
        // 速率随速度增大(裙边阻力矩∝v²), 低速弱对齐; 对齐后自转横向分量同步衰减。
        const vNow = V3.len(s.vel);
        if (vNow > 0.5) {
            this.alx(s.vel, this.algQ);
            const k = Math.min(1, dt * (1.5 + vNow * 0.6));
            Laya.Quaternion.slerp(s.rot, this.algQ, k, s.rot);//
            this.axes(s.rot, this.klx, this.kly, this.klz);   // ← 新增这行（damp 必须用当前 s.rot 的 Z 轴）
            const ax = this.klz;
            const axial = V3.dot(s.sn, ax);
            const damp = Math.exp(-k * 4);
            s.sn.x = (ax.x * axial) + (s.sn.x - ax.x * axial) * damp;
            s.sn.y = (ax.y * axial) + (s.sn.y - ax.y * axial) * damp;
            s.sn.z = (ax.z * axial) + (s.sn.z - ax.z * axial) * damp;
        }

        // 出口量化: rstep/球头稳定走引擎浮点(四元数乘/slerp 无法整数化),
        // rk4 边界统一对齐 1/1024 网格——每步状态严格定点, 平台 ulp 差异在此吸收
        s.quant();
    }

    /** RK4 组合(纯整数): state += (k1 + 2*k2 + 2*k3 + k4) * dt / 6。
     * k.px = 位置导数(速度), k.vx = 速度导数(加速度), k.sx = 角加速度导数 */
    private combI(s: State, k1: State, k2: State, k3: State, k4: State, dt: number) {
        // Q20 步长; (k1+2k2+2k3+k4)*dt/6 —— /6 非幂二不能纯移位(>>21 差 3 倍),
        // 整数乘积(≤6.4e12 < 2^53)后单次 Math.round 除法收口(ECMAScript round 全平台一致)
        const dti = Math.round(dt * 1048576);
        if (dti <= 0) return;
        const acc = (a: number, b: number, c: number, d: number): number =>
            Math.round((a + 2 * b + 2 * c + d) * dti / 6291456);
        s.px += acc(k1.px, k2.px, k3.px, k4.px);
        s.py += acc(k1.py, k2.py, k3.py, k4.py);
        s.pz += acc(k1.pz, k2.pz, k3.pz, k4.pz);
        s.vx += acc(k1.vx, k2.vx, k3.vx, k4.vx);
        s.vy += acc(k1.vy, k2.vy, k3.vy, k4.vy);
        s.vz += acc(k1.vz, k2.vz, k3.vz, k4.vz);
        s.sx += acc(k1.sx, k2.sx, k3.sx, k4.sx);
        s.sy += acc(k1.sy, k2.sy, k3.sy, k4.sy);
        s.sz += acc(k1.sz, k2.sz, k3.sz, k4.sz);
        s.iSync();
    }

    t: number;

    /** 表现层专用状态: 目标时刻落在两个时间格之间时, 尾巴只算到这里, 绝不写回权威 state。
     *  (权威 state 永远停在 起点+k*GRID 的格点上, 这是"两端逐位一致"的前提) */
    private disp: State | null = null;

    /** 单段积分的子步上限: 防高速时 1cm 位移上限把一段切成近乎无穷多小步 */
    private static readonly SEG_MAX_SUBSTEPS = 4000;

    /**
     * 积一段(段端点恒为时间格的整数倍)。
     * 子步长只由【当前状态 + 段端点】决定, 和调用方什么时候来问无关——这一条就是联机两端的
     * 分水岭: 旧写法把 dt 夹到"target - 现在", 于是 60fps 与 30fps 的两端用不同的步长序列
     * 积同一段弹道, RK4 + 定点舍入必然越飞越分(= 同样参数, 两端球路不一样)。
     * @returns ok=false 表示途中休眠或发散, 调用方应停止继续推进
     */
    private _simSeg(cur: State, tFrom: number, tTo: number): { ok: boolean, slept: boolean } {
        const baseDt = this.GRID / 1000;
        let t = tFrom;
        for (let step = 0; t < tTo; step++) {
            if (step > Phy.SEG_MAX_SUBSTEPS) {
                console.warn('[phy] 单段子步超限, 停在 t=', t);
                this.t = t;
                return { ok: false, slept: false };
            }
            const v = V3.len(cur.vel);
            let dt = baseDt;
            const left = (tTo - t) / 1000;
            if (dt > left) dt = left;
            // 防高速隧穿: 单个子步位移不超过 1cm(只依赖速度这个状态量, 不依赖调用时刻)
            if (this.net && v * dt > 0.01) dt = 0.01 / v;
            if (dt < 1e-7) break;

            this.rk4(cur, dt);
            if (this.net) this.procCol(cur, this.net, this.ncol, false, dt);
            if (this.gndNet) this.procCol(cur, this.gndNet, this.gndNcol, true, dt);
            // 碰撞(imp/procCol 浮点写路径)出口量化——状态对齐 1/1024 网格
            cur.quant();
            this._crossNet(cur);

            t += dt * 1000;
            cur.time = t;

            // 休眠检测
            if (V3.lenSq(cur.vel) < 0.04 && cur.pos.y <= this.gndNet!.cy + 0.01) {
                cur.vel.setValue(0, 0, 0);
                cur.sn.setValue(0, 0, 0);
                cur.sa = 0;
                cur.time = tTo;
                this.isSleeping = true;
                this.t = tTo;
                return { ok: false, slept: true };
            }
            if (this.inv(cur)) {
                console.warn("Phys diverged at t=", t);
                this.t = t;
                return { ok: false, slept: false };
            }
        }
        this.t = tTo;
        return { ok: true, slept: false };
    }

    /** 过网检测(每个子步一次): 格点固定后两端经历同一序列, 不再分"长/短仿真"两套口径。
     *  影子/尾巴积分(_predMode)不触发, 免得为表现层多算的一小段把判罚事件提前放出去 */
    private _crossNet(cur: State): void {
        if (!this.net || this._predMode) return;
        const curSide = cur.pos.x >= 0 ? 1 : 0;
        if (curSide === this._netSide) return;
        if (cur.pos.y <= this._netTopY) { this._netSide = curSide; return; }
        const direction = curSide === 1 ? 1 : -1;
        this._netSide = curSide;
        if (this._netCrossCallback) this._netCrossCallback(direction);
        if (!this.lastNetHit) this.lastNetHit = new NetHitInfo();
        this.lastNetHit.time = cur.time;
        this.lastNetHit.normal.set(0, 0, direction > 0 ? 1 : -1);
        this.lastNetHit.headPastNet = true;
        this.lastNetHit.featherPastNet = true;
    }

    /**
     * 时间查询的唯一入口: 先把权威状态沿【时间格】推到 ≤target 的最近格点并逐格提交历史,
     * 再把不足一格的尾巴算给表现层(disp, 不写权威状态、不进历史)。返回 target 时刻的球状态。
     */
    simTo(target: number): State {
        if (!this.isCalc || this.isSleeping) { this.disp = null; return this.state.clone(); }
        const GRID = this.GRID;

        // 起点: 内核历史里 ≤target 的最近一份(命中就省掉重积分), 否则用当前 state
        let start = this.state;
        for (let i = 0; i <= this.MAX_LOOKBACK; i++) {
            const c = this.map.get(this.map.timeTo(target) - i);
            if (!c || !c.size) continue;
            let best: State | null = null;
            for (const s of c) {
                if (s.time <= target && (!best || s.time > best.time)) best = s;
            }
            if (best) { start = best; break; }
        }

        const cur = start.clone();
        this.state.copyFrom(start);
        this.state.time = start.time;
        this.t = start.time;

        // 逐格推进 + 提交: 历史里的时刻全是格点, 两端天然对齐
        while (this.state.time + GRID <= target) {
            const tFrom = this.state.time;
            const r = this._simSeg(cur, tFrom, tFrom + GRID);
            this.state.copyFrom(cur);
            this.state.time = this.t;
            if (this.map.getTC() < this.maxCache) this.map.addByTime(this.t, this.state.clone());
            if (!r.ok) { this.disp = null; return this.state.clone(); }
        }

        // 尾巴(不足一格): 只给表现层看, 既不进权威状态也不进历史
        if (this.t < target) {
            const tail = this.state.clone();
            const pred = this._predMode, gridT = this.t;
            this._predMode = true;
            try { this._simSeg(tail, this.t, target); } finally { this._predMode = pred; this.t = gridT; }
            tail.time = target;
            this.disp = tail;
            return tail.clone();
        }
        this.disp = null;
        return this.state.clone();
    }

    /**
     * 影子预测: 从当前 state 克隆模拟未来 dur 毫秒, 采样点(默认 40ms 间隔)追加进 out。
     * 与 simTo 的差异(全部为防污染设计):
     * - 不写 map 缓存(未来态入库会污染历史轨迹查询)
     * - 不触发过网回调 / lastNetHit / lastGndHit(_predMode 屏蔽 recordHit/recordGndHit)
     * - 不改真实 state / isSleeping / _netSide
     * 性能: 自适应步长(低速 10ms 基步, 高速防隧穿收缩) ≈ simTo 1ms 基步的 1/10 计算量
     */
    predict(dur: number, out: Laya.Vector3[], replay = false): boolean {
        if (!this.isCalc || this.isSleeping || dur <= 0) return false;
        const cur = this.state.clone();
        const t0 = cur.time;
        const baseDt = 0.01;                  // 预测视觉精度 10ms 足够
        const maxSteps = Math.ceil(dur / baseDt) + 8;
        const sampleMs = 40;                  // 采样间隔: dur=2000 → 51 点
        let nextSample = t0 + sampleMs;
        out.push(new Laya.Vector3(cur.pos.x, cur.pos.y, cur.pos.z));

        this._predMode = true;
        try {
            for (let step = 0; step < maxSteps; step++) {
                const v = V3.len(cur.vel);
                let dt = baseDt;
                const remainMs = t0 + dur - cur.time;
                if (remainMs <= 0) break;
                if (dt * 1000 > remainMs) dt = remainMs / 1000;
                if (v * dt > 0.01) dt = 0.01 / v; // 高速防隧穿(与 simTo 同阈)
                if (dt < 1e-6) break;

                this.rk4(cur, dt);
                if (this.net) this.procCol(cur, this.net, this.ncol, false, dt);
                if (this.gndNet) this.procCol(cur, this.gndNet, this.gndNcol, true, dt);
                // 碰撞(imp/procCol 浮点写路径)出口量化
                cur.quant();

                cur.time += dt * 1000;
                if (cur.time >= nextSample) {
                    out.push(new Laya.Vector3(cur.pos.x, cur.pos.y, cur.pos.z));
                    nextSample += sampleMs;
                }
                // 预测落地静止即止(后续轨迹无意义); 鹰眼回放模式跳过——
                // 兜底结算场景(球低速悬停) hist 出发第一步即静止, break 会只产 1 点报"无回放数据";
                // replay 让球自然弹跳滚动完整重演(静止后采样点堆同位置, dur 到即止)
                if (!replay && V3.lenSq(cur.vel) < 0.04 && cur.pos.y <= this.gndNet!.cy + 0.01) break;
                if (this.inv(cur)) break;
            }
        } finally {
            this._predMode = false;
        }
        return out.length >= 2;
    }
}