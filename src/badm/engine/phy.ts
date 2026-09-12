/**
 * Phy - 羽毛球物理模拟引擎，继承 PhyCfg
 * 处理击球发力、空气阻力、网碰撞、地面反弹、睡眠唤醒等物理计算，使用 MapManager 进行空间索引
 */
import { Timer } from "../../libs/time";
import { MPMD } from "../../libs/mpm";
import { PhyCfg, State, V3, Params, NetConfig, BallRegionConfig, NetCollisionParams, NetHitInfo } from "./phyCfg";
import { Ball } from "../obj/ball";
import { Obj } from "../obj/obj";

export class Phy extends PhyCfg {
    private vEff = new Laya.Vector3();

    constructor(ball: Ball, params: Partial<Params> = {}) {
        super();
        this.p = { ...this.DFLT, ...params };
        this.state = new State();

        const cmW = new Laya.Vector3();
        Laya.Vector3.transformQuat(this.p.cmOff, ball.rot, cmW);
        V3.add(ball.pos, cmW, this.state.pos);

        this.state.vel.setValue(0, 0, 0);
        this.state.sn.setValue(0, 0, 0);
        this.state.sa = 0;
        this.state.rot = ball.rot;
        this.state.time = Timer.now();
        this.startT = this.state.time;

        this.setNet({});
        this.setGround({ y: 0 });

        this.map = new MPMD(this.GRID);
        this.map.addByTime(this.state.time, this.state.clone());
    }

    public hit(power: number, angH: number, angV: number, spin?: Laya.Vector3 | null) {
        this.isSleeping = false; // 击球唤醒
        const np = power / 100;
        const v = this.p.vmax * Math.pow(np, 1.5);
        const rh = angH * Math.PI / 180;
        const rv = angV * Math.PI / 180;
        const cv = Math.cos(rv); const sv = Math.sin(rv);
        this.isCalc = true;

        const ns = new State();
        V3.copy(this.state.pos, ns.pos);
        ns.vel.setValue(Math.sin(rh) * cv * v, sv * v, Math.cos(rh) * cv * v);

        if (spin && V3.len(spin) > 0.01) V3.copy(spin, ns.sn);
        else ns.sn.setValue(0, 0, 0);

        if (v > 0.01) this.alx(ns.vel, ns.rot);
        else this.alx(V3.UP, ns.rot);

        const now = Timer.now();
        ns.time = now;
        this.state = ns;
        this.startT = now;
        this.map.clear();
        this.map.addByTime(now, this.state.clone());
        this.resetDbg();
        this.lastNetHit = null;
        this.lastGndHit = null;
    }

    sync(node: Obj) { this.state.pos = node.pos; this.state.rot = node.rot; }

    public applyToNode(node: Obj) {
        const off = new Laya.Vector3();
        Laya.Vector3.transformQuat(this.p.cmOff, this.state.rot, off);
        node.root.transform.position = new Laya.Vector3(
            this.state.pos.x - off.x, this.state.pos.y - off.y, this.state.pos.z - off.z
        );
        node.root.transform.rotation = this.state.rot.clone();
    }

    public get(t?: number): State {
        if (!this.isCalc || this.isSleeping) return this.state.clone();
        const tt = t === undefined ? Timer.now() : t;
        this.state.copyFrom(this.simTo(tt));
        return this.state;
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

        Laya.Vector3.transformQuat(V3.RIGHT, s.rot, this.cLx);
        this.cOw.x = s.sn.x + this.cLx.x * s.sa;
        this.cOw.y = s.sn.y + this.cLx.y * s.sa;
        this.cOw.z = s.sn.z + this.cLx.z * s.sa;

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

        const dSa = V3.dot(this.cDo, this.cLx);
        s.sa += dSa;
        s.sn.x += this.cDo.x - this.cLx.x * dSa;
        s.sn.y += this.cDo.y - this.cLx.y * dSa;
        s.sn.z += this.cDo.z - this.cLx.z * dSa;
        this.clampSt(s);
        return true;
    }

    private procCol(s: State, net: NetConfig, ncol: NetCollisionParams, isGround: boolean, dt: number): void {
        const reg = this.region;
        const ext = Math.max(reg.headDist + reg.headR, reg.featherDist + reg.featherR);
        if (s.pos.x < net.cx - net.hw - ext || s.pos.x > net.cx + net.hw + ext) return;
        if (s.pos.y < net.cy - net.hh - ext || s.pos.y > net.cy + net.hh + ext) return;
        if (s.pos.z < net.cz - net.hd - ext || s.pos.z > net.cz + net.hd + ext) return;

        this.axes(s.rot, this.cLx, this.cLy, this.cLz);
        this.cHp.x = s.pos.x + this.cLx.x * reg.headDist; this.cHp.y = s.pos.y + this.cLx.y * reg.headDist; this.cHp.z = s.pos.z + this.cLx.z * reg.headDist;
        this.cFp.x = s.pos.x - this.cLx.x * reg.featherDist; this.cFp.y = s.pos.y - this.cLx.y * reg.featherDist; this.cFp.z = s.pos.z - this.cLx.z * reg.featherDist;

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
                V3.cross(s.vel, this.cLx, this.bonus);
                const bonusLen = V3.len(this.bonus);
                if (bonusLen > 1e-6) {
                    V3.norm(this.bonus, this.bonus);
                    const vMag = V3.len(s.vel);
                    const torqueMag = ncol.catchBoost * vMag * this.p.m * 0.5 / this.p.I_perp;
                    const bSa = V3.dot(this.bonus, this.cLx);
                    this.bonus.x -= this.cLx.x * bSa; this.bonus.y -= this.cLx.y * bSa; this.bonus.z -= this.cLx.z * bSa;
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
        if (!this.lastNetHit || s.time - this.lastNetHit.time > 50) {
            const info = new NetHitInfo(); info.time = s.time;
            info.headHit = head; info.featherHit = feather; info.headPastNet = past;
            V3.copy(this.cN, info.normal); info.isGround = false;
            this.lastNetHit = info;
        }
    }

    private recordGndHit(s: State, head: boolean, feather: boolean) {
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
        Laya.Quaternion.createFromAxisAngle(V3.UP, -Math.PI / 2, this.ar);
        Laya.Quaternion.multiply(out, this.ar, out);
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
        V3.copy(s.vel, d.pos);

        const vRaw = V3.len(s.vel);
        this.axes(s.rot, this.lx, this.ly, this.lz);

        this.drg(this.lx, s.vel, vRaw, this.df);
        this.gf.setValue(0, -this.p.m * this.p.g, 0);
        V3.add(this.df, this.gf, this.tf);

        const halfDt = dt * 0.5;
        const aDragX = this.tf.x / this.p.m; const aDragY = this.tf.y / this.p.m; const aDragZ = this.tf.z / this.p.m;
        this.vEff.x = s.vel.x + aDragX * halfDt; this.vEff.y = s.vel.y + aDragY * halfDt; this.vEff.z = s.vel.z + aDragZ * halfDt;
        const vEff = V3.len(this.vEff);

        // 【修改点】屏蔽马格努斯力计算，排查角度异常问题
        // this.mag(s.rot, s.sn, s.sa, this.vEff, vEff, this.mf);
        // V3.add(this.tf, this.mf, this.tf);

        d.vel.x = this.tf.x / this.p.m; d.vel.y = this.tf.y / this.p.m; d.vel.z = this.tf.z / this.p.m;

        const I_na = this.p.I_perp;
        let gy = this.gyr(this.lx, this.vEff, vEff, s.sa, halfDt, this.gt);

        if (vEff < 1.0) {
            const dampRate = 10.0 * Math.max(0, 1.0 - vEff);
            this.nd.x = -s.sn.x * dampRate * I_na; this.nd.y = -s.sn.y * dampRate * I_na; this.nd.z = -s.sn.z * dampRate * I_na;
        } else {
            this.nax(vEff, s.sn, this.nd);
        }

        V3.projPlane(this.gt, this.lx, this.gn);
        d.sn.x = (this.gn.x + this.nd.x) / I_na; d.sn.y = (this.gn.y + this.nd.y) / I_na; d.sn.z = (this.gn.z + this.nd.z) / I_na;

        return { s: d, aa: gy.aa };
    }

    eul(s: State, d: State, aa: number, dt: number) {
        V3.addScaled(s.pos, d.pos, dt, s.pos);
        V3.addScaled(s.vel, d.vel, dt, s.vel);
        V3.addScaled(s.sn, d.sn, dt, s.sn);
        s.sa += aa * dt;
        s.sa = V3.clamp(s.sa, -200 * Math.PI, 200 * Math.PI);
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
        V3.copy(r1.s.pos, this.k1.s.pos); V3.copy(r1.s.vel, this.k1.s.vel); V3.copy(r1.s.sn, this.k1.s.sn); this.k1.aa = r1.aa;

        this.s2.copyFrom(s);
        this.eul(this.s2, this.k1.s, this.k1.aa, dt * 0.5);
        this.axes(s.rot, this.klx, this.kly, this.klz);
        this.rstep(this.s2.rot, s.sn, s.sa, this.klx, dt * 0.5);

        const r2 = this.der(this.s2, dt);
        V3.copy(r2.s.pos, this.k2.s.pos); V3.copy(r2.s.vel, this.k2.s.vel); V3.copy(r2.s.sn, this.k2.s.sn); this.k2.aa = r2.aa;

        this.s3.copyFrom(s);
        this.eul(this.s3, this.k2.s, this.k2.aa, dt * 0.5);
        this.axes(this.s2.rot, this.klx, this.kly, this.klz);
        this.rstep(this.s3.rot, this.s2.sn, this.s2.sa, this.klx, dt * 0.5);

        const r3 = this.der(this.s3, dt);
        V3.copy(r3.s.pos, this.k3.s.pos); V3.copy(r3.s.vel, this.k3.s.vel); V3.copy(r3.s.sn, this.k3.s.sn); this.k3.aa = r3.aa;

        this.s4.copyFrom(s);
        this.eul(this.s4, this.k3.s, this.k3.aa, dt);
        this.axes(this.s3.rot, this.klx, this.kly, this.klz);
        this.rstep(this.s4.rot, this.s3.sn, this.s3.sa, this.klx, dt);

        const r4 = this.der(this.s4, dt);
        V3.copy(r4.s.pos, this.k4.s.pos); V3.copy(r4.s.vel, this.k4.s.vel); V3.copy(r4.s.sn, this.k4.s.sn); this.k4.aa = r4.aa;

        this.comb(s.pos, this.k1.s.pos, this.k2.s.pos, this.k3.s.pos, this.k4.s.pos, dt);
        this.comb(s.vel, this.k1.s.vel, this.k2.s.vel, this.k3.s.vel, this.k4.s.vel, dt);
        this.comb(s.sn, this.k1.s.sn, this.k2.s.sn, this.k3.s.sn, this.k4.s.sn, dt);

        const aaAvg = (this.k1.aa + 2 * this.k2.aa + 2 * this.k3.aa + this.k4.aa) / 6;
        s.sa += aaAvg * dt;

        this.axes(this.s4.rot, this.klx, this.kly, this.klz);
        this.rstep(s.rot, s.sn, s.sa, this.klx, dt);
    }

    private comb(out: Laya.Vector3, k1: Laya.Vector3, k2: Laya.Vector3, k3: Laya.Vector3, k4: Laya.Vector3, dt: number) {
        V3.scale(k1, 1 / 6, this.ka);
        V3.scale(k2, 2 / 6, this.kb); V3.add(this.ka, this.kb, this.ka);
        V3.scale(k3, 2 / 6, this.kb); V3.add(this.ka, this.kb, this.ka);
        V3.scale(k4, 1 / 6, this.kb); V3.add(this.ka, this.kb, this.ka);
        V3.scale(this.ka, dt, this.ka);
        V3.add(out, this.ka, out);
    }

    t:number;
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
}