/**
 * Phy - 羽毛球物理模拟引擎，继承 PhyCfg
 * 处理击球发力、空气阻力、网碰撞、地面反弹、睡眠唤醒等物理计算，使用 MapManager 进行空间索引
 */
import { Timer } from "../../libs/time";
import { MPMD } from "../../libs/mpm";
import { PhyCfg, State, V3, Fx, Params, NetConfig, BallRegionConfig, NetCollisionParams, NetHitInfo } from "./phyCfg";
import { Ball } from "../obj/ball";
import { Obj } from "../obj/obj";

export class Phy extends PhyCfg {
    private vEff = new Laya.Vector3();
    private algQ = new Laya.Quaternion(); // 球头稳定对齐目标旋转
    private _predMode = false; // 影子预测中: 屏蔽碰撞命中记录副作用

    constructor(ball: Ball, params: Partial<Params> = {}) {
        super();
        this.p = { ...this.DFLT, ...params };
        this.state = new State();

        // 边界入(Laya 浮点坐标) → Q10 整数: 球心 = 球位置 + cmOff 旋转偏移
        const cmW = new Laya.Vector3();
        Laya.Vector3.transformQuat(this.p.cmOff, ball.rot, cmW);
        const cmx = ball.pos.x + cmW.x; const cmy = ball.pos.y + cmW.y; const cmz = ball.pos.z + cmW.z;
        this.state.px = Fx.f2i(cmx); this.state.py = Fx.f2i(cmy); this.state.pz = Fx.f2i(cmz);
        this.state.qx = Fx.f2i(ball.rot.x); this.state.qy = Fx.f2i(ball.rot.y);
        this.state.qz = Fx.f2i(ball.rot.z); this.state.qw = Fx.f2i(ball.rot.w);
        this.state.iSync();
        this.state.time = Timer.now();
        this.startT = this.state.time;

        this.setNet({});
        this.setGround({ y: 0 });

        this.map = new MPMD(this.GRID);
        this.map.addByTime(this.state.time, this.state.clone());
    }

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

    /** 外部节点浮点位姿 → 内部 Q10 整数(边界入) */
    sync(node: Obj) {
        this.state.px = Fx.f2i(node.pos.x); this.state.py = Fx.f2i(node.pos.y); this.state.pz = Fx.f2i(node.pos.z);
        this.state.qx = Fx.f2i(node.rot.x); this.state.qy = Fx.f2i(node.rot.y);
        this.state.qz = Fx.f2i(node.rot.z); this.state.qw = Fx.f2i(node.rot.w);
        this.state.iSync();
        this.state.rot = node.rot;
        this.state.fToI(); this.state.iSync();
    }

    public applyToNode(node: Obj) {
        // 边界出: Q10 整数 → Laya 浮点坐标(球位置 = 质心 - cmOff 旋转偏移)
        const off = new Laya.Vector3();
        Laya.Vector3.transformQuat(this.p.cmOff, this.state.rot, off);
        node.root.transform.position = new Laya.Vector3(
            this.state.pos.x - off.x, this.state.pos.y - off.y, this.state.pos.z - off.z
        );
        node.root.transform.rotation = this.state.rot.clone();
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
            this.state.copyFrom(this.simTo(tt));
            return this.state;
        }
        // 区间模式(用户规格 [st, et]):
        // - 历史段(≤state.time)从 map 缓存提取——物理停算(isCalc=false, 结算后回持球)时
        //   simTo 短路返回同一点, map 是唯一数据源("鹰眼回放球不动"根因);
        // - 未来段(>state.time 且活球)simTo 前推预测, 快照防污染(查完恢复 state/time/t,
        //   严禁把内核推进到未来——否则下一帧 simTo(now) 负时长球冻结);
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
            const real = this.state.clone();
            const realTime = this.state.time;
            const realT = this.t;
            let cur = Math.max(st, nowT);
            out.push(this.simTo(cur).clone());
            while (cur < end) {
                cur = Math.min(cur + 40, end);
                out.push(this.simTo(cur).clone());
            }
            this.state.copyFrom(real);
            this.state.time = realTime;
            this.t = realT;
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
    simTo(target: number): State {
        if (!this.isCalc || this.isSleeping) return this.state.clone();
        let start = this.state;

        // 查找缓存最近状态
        for (let i = 0; i <= this.MAX_LOOKBACK; i++) {
            const c = this.map.get(this.map.timeTo(target) - i);
            if (c && c.size) {
                let best: State | null = null;
                for (const s of c) {
                    if (s.time <= target && (!best || s.time > best.time)) best = s;
                }
                if (best) { start = best; this.state.time = best.time; break; }
            }
        }

        let cur = start.clone();
        const baseDt = 0.001;
        const maxSteps = 2000;

        this.t = this.state.time;

        // 计算总仿真时长（毫秒）
        let totalDt = target - this.state.time;
        let isLongSim = totalDt > 100;  // 大于100ms视为预测轨迹

        // 记录起始侧别（用于短时仿真后的单次检测）
        let startSide = this._netSide;

        for (let step = 0; step < maxSteps && this.t < target; step++) {
            const v = V3.len(cur.vel);
            let remainSec = (target - this.t) / 1000;
            let dt = baseDt;
            if (dt > remainSec) dt = remainSec;

            // 防高速隧穿
            if (v * dt > 0.01 && this.net) {
                dt = 0.01 / v;
            }
            if (dt < 1e-7) break;

            // RK4 积分
            this.rk4(cur, dt);

            // 碰撞处理
            if (this.net) this.procCol(cur, this.net, this.ncol, false, dt);
            if (this.gndNet) this.procCol(cur, this.gndNet, this.gndNcol, true, dt);
            // 碰撞(imp/procCol 浮点写路径)出口量化——状态对齐 1/1024 网格
            cur.quant();

            // ---- 过网检测：长时仿真时每步检测 ----
            if (isLongSim && this.net) {
                let prevSide = this._netSide;
                let curSide = cur.pos.x >= 0 ? 1 : 0;
                if (prevSide !== curSide) {
                    if (cur.pos.y > this._netTopY) {
                        let direction = curSide === 1 ? 1 : -1;
                        this._netSide = curSide;
                        if (this._netCrossCallback) {
                            this._netCrossCallback(direction);
                        }
                        if (!this.lastNetHit) this.lastNetHit = new NetHitInfo();
                        this.lastNetHit.time = cur.time;
                        this.lastNetHit.normal.set(0, 0, direction > 0 ? 1 : -1);
                        this.lastNetHit.headPastNet = true;
                        this.lastNetHit.featherPastNet = true;
                    } else {
                        // 网下穿过，仅更新侧别
                        this._netSide = curSide;
                    }
                }
            }

            // 更新时间
            this.t += dt * 1000;
            cur.time = this.t;

            // 休眠检测
            if (V3.lenSq(cur.vel) < 0.04 && cur.pos.y <= this.gndNet!.cy + 0.01) {
                cur.vel.setValue(0, 0, 0);
                cur.sn.setValue(0, 0, 0);
                cur.sa = 0;
                this.isSleeping = true;
                break;
            }

            if (this.inv(cur)) {
                console.warn("Phys diverged at t=", this.t);
                return start.clone();
            }

            // 缓存状态
            if (this.t - this.state.time >= 16 && this.map.getTC() < this.maxCache) {
                this.map.addByTime(this.t, cur.clone());
                this.state.time = this.t
            }
        }

        // ---- 短时仿真：只在循环结束后检测一次 ----
        if (!isLongSim && this.net) {
            let curSide = cur.pos.x >= 0 ? 1 : 0;
            if (startSide !== curSide) {
                if (cur.pos.y > this._netTopY) {
                    let direction = curSide === 1 ? 1 : -1;
                    this._netSide = curSide;
                    if (this._netCrossCallback) {
                        this._netCrossCallback(direction);
                    }
                    if (!this.lastNetHit) this.lastNetHit = new NetHitInfo();
                    this.lastNetHit.time = cur.time;
                    this.lastNetHit.normal.set(0, 0, direction > 0 ? 1 : -1);
                    this.lastNetHit.headPastNet = true;
                    this.lastNetHit.featherPastNet = true;
                } else {
                    this._netSide = curSide;
                }
            }
        }

        return cur;
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