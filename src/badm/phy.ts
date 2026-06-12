import { Timer } from "../libs/time";
import { MapManager } from "../libs/mpm";
import { PhyCfg, State, V3, Params, NetConfig, BallRegionConfig, NetCollisionParams, NetHitInfo } from "./phyCfg";
import { Ball } from "./ball";
import { Obj } from "./obj";

// ===================== 物理引擎 =====================
export class Phy extends PhyCfg {


    /**
     * 有效速度向量，用于半隐式欧拉中间步骤的速度校正。
     * 存储当前时间步长中点处的速度估值，供马格努斯力等计算使用。
     */
    private vEff = new Laya.Vector3();

    /**
     * 构造函数：初始化羽毛球物理状态。
     * @param ball Laya的3D精灵节点，用于获取初始位置和朝向
     * @param params 可覆盖的物理参数
     */
    constructor(ball: Ball, params: Partial<Params> = {}) {
        super();
        // 合并默认参数与用户提供的参数
        this.p = { ...this.DFLT, ...params };
        this.state = new State();

        // 取节点的世界位置和旋转

        // 计算质心偏移在世界空间中的位置
        const cmW = new Laya.Vector3();
        // cmOff：质心相对于节点原点的局部偏移；通过节点旋转转换为世界空间偏移 cmW
        Laya.Vector3.transformQuat(this.p.cmOff, ball.rot, cmW);
        // 球的物理位置 (pos) = 节点位置 + 世界空间质心偏移
        V3.add(ball.pos, cmW, this.state.pos);

        // 初始线速度为零
        this.state.vel.setValue(0, 0, 0);
        // 初始非轴向自旋向量（世界系）为零
        this.state.sn.setValue(0, 0, 0);
        // 初始轴向自旋速率（绕球对称轴的角速度大小，rad/s）
        this.state.sa = 0;
        // 保存初始旋转（四元数）
        this.state.rot = ball.rot;
        // 记录当前时间戳（毫秒）
        this.state.time = Timer.now();
        this.startT = this.state.time;

        // 初始化球网和地面碰撞体
        this.setNet({});
        this.setGround({ y: 0 });

        // 新建一个基于时间索引的状态管理器（用于回溯仿真）
        this.map = new MapManager(this.GRID);
        this.map.addByTime(this.state.time, this.state.clone());
    }

    

    /**
     * 击球：根据力度、水平角、垂直角和可选的自旋，重置球的运动状态。
     * @param power 力度百分比 0-100
     * @param angH 水平角（度），0 指向正 Z，90 指向正 X
     * @param angV 垂直角（度），0 为水平，正值为向上
     * @param spin 可选世界系初始自旋向量
     */
    public hit(power: number, angH: number, angV: number, spin?: Laya.Vector3 | null) {
        // 力度归一化至 0~1
        const np = power / 100;
        // 速度大小：vmax * (力度)^1.5，模拟非线性手感
        const v = this.p.vmax * Math.pow(np, 1.5);

        // 角度转弧度
        const rh = angH * Math.PI / 180;
        const rv = angV * Math.PI / 180;
        const cv = Math.cos(rv);
        const sv = Math.sin(rv);

        const ns = new State();
        V3.copy(this.state.pos, ns.pos);
        // 设置速度向量：水平分量沿 (sin(rh), 0, cos(rh))，垂直分量 sv
        ns.vel.setValue(
            Math.sin(rh) * cv * v,   // X分量
            sv * v,                  // Y分量（垂直）
            Math.cos(rh) * cv * v    // Z分量
        );

        // 设置自旋
        if (spin && V3.len(spin) > 0.01) {
            V3.copy(spin, ns.sn);      // 非轴向自旋向量
        } else {
            ns.sn.setValue(0, 0, 0);
        }

        // 根据速度方向或默认向上方向对齐球的方向
        if (v > 0.01) {
            this.alx(ns.vel, ns.rot);
        } else {
            this.alx(V3.UP, ns.rot);
        }
        this.isCalc = true;
        const now = Timer.now();
        ns.time = now;
        this.state = ns;
        this.startT = now;
        this.map.clearAll();
        this.map.addByTime(now, this.state.clone());
        this.resetDbg();
        this.lastNetHit = null;
        this.lastGndHit = null;

    }

    sync(node : Obj){
        this.state.pos = node.pos;
        this.state.rot = node.rot;
    }

    /**
     * 将物理状态应用到3D节点上（更新节点的世界变换）。
     * @param node 要更新的精灵节点
     */
    public applyToNode(node: Obj) {
        const off = new Laya.Vector3();
        // 将局部质心偏移通过当前旋转转换到世界空间
        Laya.Vector3.transformQuat(this.p.cmOff, this.state.rot, off);
        // 节点位置 = 物理位置 - 世界空间质心偏移，因为节点代表模型原点，pos 是质心位置
        node.root.transform.position = new Laya.Vector3(
            this.state.pos.x - off.x,
            this.state.pos.y - off.y,
            this.state.pos.z - off.z
        );
        // 节点的旋转 = 物理旋转
        node.root.transform.rotation = this.state.rot.clone();
    }

    /**
     * 获取当前或指定时间的物理状态。
     * @param t 可选的时间戳（毫秒），若不提供则取当前时间。
     * @returns 状态的克隆
     */
    public get(t?: number): State {
        if(!this.isCalc){
            return this.state.clone();
        }
        const tt = t === undefined ? Timer.now() : t;
        // 如果请求的时间早于或等于当前记录时间，直接返回当前状态的克隆
        //if (tt <= this.state.time) return this.state.clone();
        // 如果没有指定 t，则更新为当前仿真结果
        this.state.copyFrom(this.simTo(tt));
        return this.state;
    }

    /**
     * 设置地面碰撞体（视为一个薄的水平长方体盒子）。
     * @param cfg 可覆盖的地面 y 坐标等
     */
    public setGround(cfg: Partial<{ y: number }>): void {
        const y = cfg.y !== undefined ? cfg.y : 0;
        const eps = 0.001;   // 微小的厚度，防止数值穿透
        const inf = 15;      // 非常大的半宽/半深，模拟无限大平面
        this.gndNet = {
            cx: 0, cy: y + eps, cz: 0,
            hw: inf, hh: eps, hd: inf,
        };
        // 默认地面碰撞参数
        this.gndNcol = {
            restHead: 0.5,        // 头部反弹系数
            restFeather: 0.02,    // 羽毛弹性（几乎不弹）
            friction: 0.6,        // 摩擦系数
            rollThresh: 0.3,
            featherGrip: 0.3,     // 羽毛抓地力
            catchBoost: 0.0,      // 地面无网兜效应
        };
    }

    /**
     * 动态修改地面碰撞参数
     */
    public setGroundCollisionParams(cfg: Partial<NetCollisionParams>): void {
        this.gndNcol = { ...this.gndNcol, ...cfg };
    }

    /**
     * 获取最后一次地面碰撞信息
     */
    public getLastGroundHit(): NetHitInfo | null {
        return this.lastGndHit;
    }

    /**
     * 清除地面碰撞记录
     */
    public clearGroundHit(): void {
        this.lastGndHit = null;
    }

    // ------------------------------------------------------------
    // 碰撞检测：球体与 AABB 盒体的最近点、穿透深度及法线
    // ------------------------------------------------------------

    /**
     * 计算球体与轴对齐盒（AABB）的相交检测。
     * @param sx, sy, sz 球心世界坐标
     * @param sr 球半径
     * @param net 盒体配置（中心 cx,cy,cz 和半尺寸 hw,hh,hd）
     * @param outClosest 输出盒体上距离球心最近的点
     * @param outNormal 输出碰撞法线（从盒指向球外）
     * @returns 穿透深度；若没有穿透则返回 0，若球心完全在盒体内则返回 -1
     *
     * 公式：
     *   closest = clamp(球心, 盒体min, 盒体max)
     *   dist = |球心 - closest|
     *   穿透深度 pen = sr - dist  (dist < sr 时)
     *   法线 = (球心 - closest) / dist
     */
    private sphBox(
        sx: number, sy: number, sz: number, sr: number,
        net: NetConfig,
        outClosest: Laya.Vector3,
        outNormal: Laya.Vector3
    ): number {
        // 球心坐标被钳制到盒体的范围，得到最近点
        outClosest.x = V3.clamp(sx, net.cx - net.hw, net.cx + net.hw);
        outClosest.y = V3.clamp(sy, net.cy - net.hh, net.cy + net.hh);
        outClosest.z = V3.clamp(sz, net.cz - net.hd, net.cz + net.hd);

        const dx = sx - outClosest.x;
        const dy = sy - outClosest.y;
        const dz = sz - outClosest.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        // 没有穿透
        if (distSq >= sr * sr) return 0;

        const dist = Math.sqrt(distSq);
        // 球心恰好在盒体内，无法确定法向
        if (dist < 1e-8) return -1;

        const pen = sr - dist;          // 穿透深度
        const inv = 1 / dist;
        // 法线：从最近点指向球心
        outNormal.x = dx * inv;
        outNormal.y = dy * inv;
        outNormal.z = dz * inv;
        return pen;
    }

    /**
     * 钳制状态量，避免速度、角速度超过物理允许范围。
     */
    private clampSt(s: State) {
        const v = V3.len(s.vel);
        // 最大线速度限制
        if (v > this.p.vmax) {
            const sc = this.p.vmax / v;
            s.vel.x *= sc; s.vel.y *= sc; s.vel.z *= sc;
        }
        const maxSpin = 300 * Math.PI;   // 最大角速度 (rad/s)，约150 rps
        s.sa = V3.clamp(s.sa, -maxSpin, maxSpin);
        const snMag = V3.len(s.sn);
        if (snMag > maxSpin) {
            const sc = maxSpin / snMag;
            s.sn.x *= sc; s.sn.y *= sc; s.sn.z *= sc;
        }
    }

    /**
     * 碰撞冲量响应（修正版）：严格区分碰撞反弹力（带扭矩）和穿透补偿/支撑力（纯线冲量）。
     * 处理球体与静态平面/网子的单点接触。
     *
     * @param s 当前状态
     * @param spherePos 碰撞球心位置（头或羽毛端点）
     * @param sphereR 球半径
     * @param normal 碰撞法线（指向球外）
     * @param pen 穿透深度
     * @param isHead 是否为头部碰撞
     * @param rest 恢复系数
     * @param friction 摩擦系数
     * @param extraFriction 额外摩擦系数（如羽毛抓地）
     * @param dt 时间步长
     * @returns 是否发生了有效碰撞
     *
     * 关键步骤与公式：
     * 1. 计算接触点 r = spherePos - normal*R - 质心位置 (碰撞力臂)
     * 2. 位置修正：质心沿法线移出穿透量 pen
     * 3. 世界角速度 ω = sn + lx * sa  (sn为非轴向自旋，lx为局部x轴，sa为轴向自旋)
     *    其中 lx 由 s.rot 计算得到
     * 4. 接触点速度 v_c = v + ω × r
     * 5. 法向碰撞冲量（仅碰撞反弹部分）：
     *       v_n = v_c · normal
     *       invM_n = 1/m + (r x n)^2 / I_na
     *       JnBounce = -(1+rest) * v_n / invM_n  (当 v_n < 0)
     * 6. 穿透补偿（偏置）冲量（线性，不产生扭矩）：
     *       biasMag = max(0, pen - slop) / dt * percent
     *       JnBias = biasMag / invM_n    (仅用于线速度补偿)
     * 7. 质心最小反弹线冲量保底：
     *       desiredVelN = -rest * velN
     *       JnLinMin = m * (desiredVelN - velN)
     * 8. 总线冲量 JnTotalLin = JnBounce + JnBias，保证至少为 JnLinMin 且非负
     * 9. 线速度更新：v += (JnTotalLin/m) * normal
     * 10. 角冲量仅由真实碰撞 JnBounce 产生（支撑力不过力臂，防止原地旋转）
     *       ω += (r x normal) * JnBounce / I_na
     * 11. 更新接触点速度 v_c'，计算切向相对速度 vt
     * 12. 切向摩擦力冲量 Jt，受摩擦系数 μ * JnTotalLin 钳制
     *       Jt = min(|vt| / invM_t, μ * JnTotalLin)
     *       线速度更新：v += (-Jt/m) * tangent
     *       角速度更新：ω += (-Jt/I_na) * (r x tangent)
     * 13. 将角速度变化分解回 sa 和 sn
     */
    private imp(
        s: State,
        spherePos: Laya.Vector3,
        sphereR: number,
        normal: Laya.Vector3,
        pen: number,
        isHead: boolean,
        rest: number,
        friction: number,
        extraFriction: number = 0,
        dt: number = 0.001
    ): boolean {
        // 计算接触点相对于质心的位置（力臂 r = spherePos - normal*R - pos）
        this.cR.x = spherePos.x - normal.x * sphereR - s.pos.x;
        this.cR.y = spherePos.y - normal.y * sphereR - s.pos.y;
        this.cR.z = spherePos.z - normal.z * sphereR - s.pos.z;

        // 位置修正：将质心沿法线外移穿透量，解除穿透
        s.pos.x += normal.x * pen;
        s.pos.y += normal.y * pen;
        s.pos.z += normal.z * pen;

        // 将局部 X 轴（球对称轴）转到世界系，用于计算世界角速度
        Laya.Vector3.transformQuat(V3.RIGHT, s.rot, this.cLx);
        const worldOmega = this.cOw;
        // ω = sn + lx * sa
        worldOmega.x = s.sn.x + this.cLx.x * s.sa;
        worldOmega.y = s.sn.y + this.cLx.y * s.sa;
        worldOmega.z = s.sn.z + this.cLx.z * s.sa;

        // 接触点线速度 = v + ω × r
        V3.cross(worldOmega, this.cR, this.cVc);
        V3.add(s.vel, this.cVc, this.cVc);

        // 法向相对速度 v_n = v_c · normal
        const vn = V3.dot(this.cVc, normal);

        // 偏置速度：用于穿透补偿，保证分离
        const slop = 0.002;     // 允许的微小穿透
        const percent = 0.4;    // 每步修正比例
        const biasMag = Math.max(0, pen - slop) / dt * percent;

        // 如果正在分离且无需偏置补偿，则无碰撞
        if (vn >= 0 && biasMag <= 0) return true;

        const m = this.p.m;
        // 非轴向转动惯量：实心球体 I_na = 2/5 * m * R^2 (即 0.4 m R^2)
        const I_na = 0.4 * m * this.p.r * this.p.r;

        // 计算 (r × n) 用于求逆质量
        V3.cross(this.cR, normal, this.cRxN);
        const rxnSq = V3.lenSq(this.cRxN);
        // 有效法向逆质量：1/m + |r x n|^2 / I_na
        const invM_n = 1.0 / m + rxnSq / I_na;

        // --- 1. 碰撞反弹冲量 ---
        let JnBounce = 0;
        if (vn < 0) {
            // J = -(1+e) * v_n / invM_n
            JnBounce = -(1 + rest) * vn / invM_n;
        }

        // --- 2. 穿透补偿冲量（线性，无扭矩） ---
        const JnBias = biasMag / invM_n;

        // --- 3. 质心反弹保底 ---
        const velN = V3.dot(s.vel, normal);          // 当前质心法向速度
        const desiredVelN = -rest * velN;            // 期望的质心法向反弹速度
        const deltaVelN = desiredVelN - velN;        // 需要改变的速度量
        const JnLinMin = m * deltaVelN;              // 相应的最小线冲量

        // --- 4. 总线冲量 ---
        let JnTotalLin = JnBounce + JnBias;
        if (JnTotalLin < JnLinMin) {
            JnTotalLin = JnLinMin;                   // 确保质心法向至少弹起
        }
        if (JnTotalLin < 0) JnTotalLin = 0;

        // 应用线冲量：Δv = JnTotalLin / m * n
        const jnLin = JnTotalLin / m;
        s.vel.x += normal.x * jnLin;
        s.vel.y += normal.y * jnLin;
        s.vel.z += normal.z * jnLin;

        // --- 角冲量：仅来自真实碰撞 JnBounce （支撑力不过力臂） ---
        if (JnBounce > 0) {
            // Δω = (r × n) * JnBounce / I_na
            V3.cross(this.cR, normal, this.cDo);
            const jnAng = JnBounce / I_na;
            this.cDo.x *= jnAng;
            this.cDo.y *= jnAng;
            this.cDo.z *= jnAng;
        } else {
            this.cDo.setValue(0, 0, 0);
        }

        // 更新后的世界角速度估值（用于计算切向速度）
        const newOmega = this.cT1;
        newOmega.x = worldOmega.x + this.cDo.x;
        newOmega.y = worldOmega.y + this.cDo.y;
        newOmega.z = worldOmega.z + this.cDo.z;
        V3.cross(newOmega, this.cR, this.cVc);
        V3.add(s.vel, this.cVc, this.cVc);  // 更新后接触点速度

        // --- 5. 切向摩擦力 ---
        const vn2 = V3.dot(this.cVc, normal);
        // 切向速度 = 接触点速度 - 法向分量 * n
        this.cT.x = this.cVc.x - normal.x * vn2;
        this.cT.y = this.cVc.y - normal.y * vn2;
        this.cT.z = this.cVc.z - normal.z * vn2;
        const vtMag = V3.len(this.cT);

        if (vtMag > 0.01) {
            const invVt = 1 / vtMag;
            this.cT.x *= invVt; this.cT.y *= invVt; this.cT.z *= invVt;  // 单位切向量

            V3.cross(this.cR, this.cT, this.cRxT);
            const rxtSq = V3.lenSq(this.cRxT);
            // 切向有效逆质量
            const invM_t = 1.0 / m + rxtSq / I_na;

            let Jt = vtMag / invM_t;            // 使切向停止的冲量大小
            const mu = friction + extraFriction;
            // 摩擦力上限受法向总冲量约束：Jt_max = μ * JnTotalLin
            const maxJt = mu * JnTotalLin;
            if (Jt > maxJt) Jt = maxJt;

            // 施加摩擦力冲量：Δv -= Jt/m * tangent
            const jtLin = -Jt / m;
            s.vel.x += this.cT.x * jtLin;
            s.vel.y += this.cT.y * jtLin;
            s.vel.z += this.cT.z * jtLin;

            // 摩擦角冲量：Δω -= Jt/I_na * (r × tangent)
            V3.cross(this.cR, this.cT, this.cT2);
            const jtAng = -Jt / I_na;
            this.cDo.x += this.cT2.x * jtAng;
            this.cDo.y += this.cT2.y * jtAng;
            this.cDo.z += this.cT2.z * jtAng;
        }

        // 将角速度变化量分解为轴向 sa 和非轴向 sn
        // sa 变化 = Δω · lx
        const dSa = V3.dot(this.cDo, this.cLx);
        s.sa += dSa;
        // sn 变化 = Δω - lx * dSa
        s.sn.x += this.cDo.x - this.cLx.x * dSa;
        s.sn.y += this.cDo.y - this.cLx.y * dSa;
        s.sn.z += this.cDo.z - this.cLx.z * dSa;
        this.clampSt(s);
        return true;
    }

    /**
     * 处理与网或地面的碰撞检测和响应。
     * @param s 当前状态
     * @param net 网/地面盒体配置
     * @param ncol 碰撞参数（弹性、摩擦等）
     * @param isGround 是否为地面碰撞
     * @param dt 时间步长
     */
    private procCol(s: State, net: NetConfig, ncol: NetCollisionParams, isGround: boolean, dt: number): void {
        const reg = this.region;  // BallRegionConfig: 头/尾距离与半径

        // 粗略剔除：球整体包围盒半径 ext
        const ext = Math.max(reg.headDist + reg.headR, reg.featherDist + reg.featherR);
        if (s.pos.x < net.cx - net.hw - ext || s.pos.x > net.cx + net.hw + ext) return;
        if (s.pos.y < net.cy - net.hh - ext || s.pos.y > net.cy + net.hh + ext) return;
        if (s.pos.z < net.cz - net.hd - ext || s.pos.z > net.cz + net.hd + ext) return;

        // 计算世界空间的局部轴：lx = 球对称轴（从尾指向头），ly，lz
        this.axes(s.rot, this.cLx, this.cLy, this.cLz);

        // 头部球心位置：质心 + lx * headDist
        this.cHp.x = s.pos.x + this.cLx.x * reg.headDist;
        this.cHp.y = s.pos.y + this.cLx.y * reg.headDist;
        this.cHp.z = s.pos.z + this.cLx.z * reg.headDist;

        // 尾部球心位置：质心 - lx * featherDist
        this.cFp.x = s.pos.x - this.cLx.x * reg.featherDist;
        this.cFp.y = s.pos.y - this.cLx.y * reg.featherDist;
        this.cFp.z = s.pos.z - this.cLx.z * reg.featherDist;

        // 检测头部球体与盒体碰撞
        const penH = this.sphBox(this.cHp.x, this.cHp.y, this.cHp.z, reg.headR, net, this.cCl1, this.cN1);
        // 检测尾部球体与盒体碰撞
        const penF = this.sphBox(this.cFp.x, this.cFp.y, this.cFp.z, reg.featherR, net, this.cCl2, this.cN2);

        let hitHead = false;
        let hitFeather = false;

        // 取穿透更深的那个球体进行响应
        if (penH > 1e-8 && penH >= penF) {
            V3.copy(this.cN1, this.cN);
            V3.copy(this.cCl1, this.cCl);
            hitHead = this.imp(s, this.cHp, reg.headR, this.cN1, penH, true, ncol.restHead, ncol.friction, 0, dt);
        } else if (penF > 1e-8) {
            V3.copy(this.cN2, this.cN);
            V3.copy(this.cCl2, this.cCl);
            hitFeather = this.imp(s, this.cFp, reg.featherR, this.cN2, penF, false, ncol.restFeather, ncol.friction, ncol.featherGrip, dt);
        }

        // 非地面 && 仅尾部碰撞 && 开启了 catchBoost (网兜效应) 且头部已过网
        if (!isGround && !hitHead && hitFeather && ncol.catchBoost > 0) {
            this.axes(s.rot, this.cLx, this.cLy, this.cLz);

            // 判断头部是否已经越过接触点（沿法线方向）
            const hdx = this.cHp.x - this.cCl.x;
            const hdy = this.cHp.y - this.cCl.y;
            const hdz = this.cHp.z - this.cCl.z;
            const headPast = (hdx * this.cN.x + hdy * this.cN.y + hdz * this.cN.z) > 0;

            if (headPast) {
                // 通过叉积计算一个使球旋转向网的力矩
                V3.cross(s.vel, this.cLx, this.bonus);
                const bonusLen = V3.len(this.bonus);
                if (bonusLen > 1e-6) {
                    V3.norm(this.bonus, this.bonus);
                    const vMag = V3.len(s.vel);
                    const I_na = 0.4 * this.p.m * this.p.r * this.p.r;
                    // 力矩大小与速度成正比
                    const torqueMag = ncol.catchBoost * vMag * this.p.m * 0.5 / I_na;

                    // 分解为轴向和非轴向
                    const bSa = V3.dot(this.bonus, this.cLx);
                    // 非轴向部分
                    this.bonus.x -= this.cLx.x * bSa;
                    this.bonus.y -= this.cLx.y * bSa;
                    this.bonus.z -= this.cLx.z * bSa;
                    const bSnLen = V3.len(this.bonus);
                    if (bSnLen > 1e-6) {
                        this.bonus.x *= torqueMag / bSnLen;
                        this.bonus.y *= torqueMag / bSnLen;
                        this.bonus.z *= torqueMag / bSnLen;
                        s.sn.x += this.bonus.x;
                        s.sn.y += this.bonus.y;
                        s.sn.z += this.bonus.z;
                    }
                }
                if (!isGround) this.recordHit(s, false, true, true);
            }
        } else if (hitHead || hitFeather) {
            if (!isGround) this.recordHit(s, hitHead, hitFeather, false);
            else this.recordGndHit(s, hitHead, hitFeather);
        }
    }

    /**
     * 记录网碰撞事件（用于计分等）
     */
    private recordHit(s: State, head: boolean, feather: boolean, past: boolean) {
        if (!this.lastNetHit || s.time - this.lastNetHit.time > 50) {   // 50ms 去抖
            const info = new NetHitInfo();
            info.time = s.time;
            info.headHit = head;
            info.featherHit = feather;
            info.headPastNet = past;
            V3.copy(this.cN, info.normal);
            info.isGround = false;
            this.lastNetHit = info;
        }
    }

    /**
     * 记录地面碰撞事件
     */
    private recordGndHit(s: State, head: boolean, feather: boolean) {
        if (!this.lastGndHit || s.time - this.lastGndHit.time > 50) {
            const info = new NetHitInfo();
            info.time = s.time;
            info.headHit = head;
            info.featherHit = feather;
            info.headPastNet = false;
            V3.copy(this.cN, info.normal);
            info.isGround = true;
            this.lastGndHit = info;
        }
    }

    /**
     * 根据方向向量计算球体的朝向四元数。
     * 球的局部 X 轴（对称轴）对齐到给定方向。
     * @param dir 目标方向，通常为速度方向
     * @param out 输出的旋转四元数
     */
    private alx(dir: Laya.Vector3, out: Laya.Quaternion) {
        V3.norm(dir, this.ad);
        if (V3.lenSq(this.ad) < 1e-10) {
            out.identity();
            return;
        }
        // 先用 lookAt 使 Z 轴对齐到 dir
        Laya.Quaternion.rotationLookAt(this.ad, V3.UP, out);
        // 再绕 UP 旋转 -90°，使 X 轴对齐到 dir
        Laya.Quaternion.createFromAxisAngle(V3.UP, -Math.PI / 2, this.ar);
        Laya.Quaternion.multiply(out, this.ar, out);
    }

    /**
     * 陀螺进动与轴向自旋阻尼模型。
     *
     * 羽毛球的轴向自旋 (sa) 受到空气动力矩作用：
     *  - 对齐力矩：试图将对称轴 (lx) 与速度方向对齐
     *  - 阻尼：高速旋转时的空气阻力
     *
     * @param lx 世界系中的球对称轴方向
     * @param vel 当前速度向量
     * @param v 速度大小
     * @param sa 当前轴向自旋角速度 (rad/s)
     * @param dt 时间步长
     * @param outT 输出作用于球体的扭矩向量（世界系）
     * @returns { aa: 轴向角加速度 (d sa/dt), nsa: 输出未用 }
     *
     * 公式：
     *   目标轴向自旋速率 target = v * kc * cos(theta)  (theta 为 lx 与速度夹角)
     *   耦合系数 coup = 3.0 + v * 0.1
     *   阻尼项 damp = -sa * kdamp * (1.0 + v * 0.05)
     *   轴向角加速度 aa = (target - sa) * coup + damp
     *
     *   陀螺进动扭矩 τ_gyro = 0.5 * ρ * v^2 * A * R * sin(theta) * 0.5 * (1 + 0.03*|sa|) * 旋转轴
     *   旋转轴 = (lx × vel_dir) 归一化
     */
    private gyr(lx: Laya.Vector3, vel: Laya.Vector3, v: number, sa: number, dt: number, outT: Laya.Vector3)
        : { aa: number; nsa: number } {
        const res = { aa: 0, nsa: sa };
        if (v < 0.8) {
            // 极低速时，快速衰减轴向自旋
            outT.setValue(0, 0, 0);
            res.aa = -sa * 100.0;
            return res;
        }
        // 速度方向
        V3.norm(vel, this.gv);
        const cosT = V3.clamp(V3.dot(lx, this.gv), -1, 1);
        const theta = Math.acos(cosT);          // lx 与速度的夹角
        const sinT = Math.sin(theta);
        const effCos = Math.max(cosT, 0.2);     // 避免对齐力矩过小
        // 目标自旋速率：与速度成正比，且轴越对齐越大
        const target = v * this.p.kc * effCos;
        const coup = 3.0 + v * 0.1;             // 耦合强度（速度相关）
        const damp = -sa * this.p.kdamp * (1.0 + v * 0.05);  // 速度相关阻尼
        res.aa = (target - sa) * coup + damp;   // 轴向角加速度

        if (theta < 0.001) {
            outT.setValue(0, 0, 0);
            return res;
        }
        // 陀螺进动轴 = lx × vel_dir
        V3.cross(lx, this.gv, this.gr);
        const axLenSq = V3.lenSq(this.gr);
        if (axLenSq < 1e-12) {
            outT.setValue(0, 0, 0);
            return res;
        }
        const axLen = Math.sqrt(axLenSq);
        this.gr.x /= axLen; this.gr.y /= axLen; this.gr.z /= axLen; // 单位进动轴

        // 气动力矩幅值：基于动压、横截面积、半径和攻角
        const A = Math.PI * this.p.r * this.p.r;             // 球截面积 πR^2
        const q = 0.5 * this.p.rho * v * v;                 // 动压 0.5ρv^2
        const base = q * A * this.p.r * sinT * 0.5;         // 基础力矩
        const gyroEnh = 1.0 + Math.abs(sa) * 0.03;          // 旋转增强效应
        const mag = base * gyroEnh;                         // 扭矩大小
        outT.x = this.gr.x * mag;
        outT.y = this.gr.y * mag;
        outT.z = this.gr.z * mag;
        return res;
    }

    /**
     * 空气阻力计算（Drag Force）。
     *
     * 阻力方向与速度相反，大小依赖于动压、迎风面积和阻力系数 Cd。
     * Cd 随攻角（对称轴与速度夹角）变化：
     *   头部朝前 (cosθ > 0) 时 Cd 较小，尾部朝前时 Cd 较大。
     *
     * 公式：
     *   F_drag = -0.5 * ρ * v^2 * Cd(θ) * A * 速度单位向量
     *   其中 A = π R^2
     */
    private drg(lx: Laya.Vector3, vel: Laya.Vector3, v: number, out: Laya.Vector3) {
        if (v < 0.01) { out.setValue(0, 0, 0); return; }
        V3.norm(vel, this.dv);
        const cosT = V3.clamp(V3.dot(lx, this.dv), -1, 1);
        let cd: number;
        if (cosT > 0) {
            // 头部朝前，介于 cdA 和 cdB 之间
            cd = this.p.cdA + (this.p.cdB - this.p.cdA) * (1 - cosT) * 0.7;
        } else {
            // 尾部朝前，Cd 更大
            cd = this.p.cdB - (this.p.cdB - this.p.cdA) * cosT * 0.3;
        }
        const A = Math.PI * this.p.r * this.p.r;
        const q = 0.5 * this.p.rho * v * v;
        const mag = q * cd * A;
        // 力方向与速度相反
        out.x = -this.dv.x * mag;
        out.y = -this.dv.y * mag;
        out.z = -this.dv.z * mag;
    }

    /**
     * 马格努斯力（Magnus Force）计算。
     *
     * 旋转的球体在空气中会受到垂直于旋转轴和速度方向的侧向力。
     * 此处仅考虑非轴向角速度产生的马格努斯效应，且幅值较小。
     *
     * 公式：
     *   F_mag = K * (ω × v)
     *   其中 K = 0.5 * Cm * ρ * Aeff * R
     *   Aeff = π R^2 * maArea (有效面积因子)
     */
    private mag(rot: Laya.Quaternion, sn: Laya.Vector3, sa: number, vel: Laya.Vector3, v: number, out: Laya.Vector3) {
        out.setValue(0, 0, 0);
        if (v < 0.5) return;
        // 获取世界系局部轴
        this.axes(rot, this.mlx, this.mly, this.mlz);
        // 总角速度 ω = lx * sa + sn（世界系）
        V3.scale(this.mlx, sa, this.mow);
        Laya.Vector3.transformQuat(sn, rot, this.msw); // sn 本已是世界系，这里可能是冗余，但保持原意。
        V3.add(this.mow, this.msw, this.mow);
        const wMag = V3.len(this.mow);
        if (wMag < 0.1) return;
        // 计算 ω × v
        V3.cross(this.mow, vel, this.mc);
        const crossMag = V3.len(this.mc);
        if (crossMag < 1e-10) return;
        const r = this.p.r;
        const Aeff = Math.PI * r * r * this.p.maArea;
        const K = 0.5 * this.p.cm * this.p.rho * Aeff * r;
        // F_mag = K * (ω × v)
        V3.scale(this.mc, K, out);
    }

    /**
     * 非轴向角速度的空气阻尼力矩。
     *
     * 高速时，非轴向自旋 (sn) 受到气动阻力，其力矩方向与 sn 相反。
     *
     * 公式：
     *   τ = - (0.5 * ρ * v^2 * A * R * naDamp) * (sn / |sn|)
     *   或视为等效力偶。
     */
    private nax(v: number, sn: Laya.Vector3, out: Laya.Vector3) {
        const rate = V3.len(sn);
        // 低速时忽略，防止除以极小值
        if (rate < 0.01 || v < 1.0) { out.setValue(0, 0, 0); return; }
        
        const A = Math.PI * this.p.r * this.p.r;
        const q = 0.5 * this.p.rho * v * v;
        const mag = q * A * this.p.r * this.p.naDamp;   // 阻尼力矩幅值
        const f = -mag / rate;                           // 沿 sn 反方向的系数
        out.x = sn.x * f;
        out.y = sn.y * f;
        out.z = sn.z * f;
    }

    /**
     * 状态导数计算：根据当前状态 s 求出位置、速度、角速度的变化率。
     * 返回导数的状态对象和轴向自旋角加速度 aa。
     *
     * 速度导数 d(vel)/dt = (阻力 + 重力 + 马格努斯力) / m
     * 非轴向角加速度 d(sn)/dt = (陀螺扭矩(非轴向分量) + 阻尼力矩) / I_na
     *
     * 注意：低速时使用滚动摩擦力矩替代空气阻尼，确保 sn 能停下来。
     */
    private der(s: State, dt: number): { s: State; aa: number } {
        const d = new State();
        // 位置导数 = 速度
        V3.copy(s.vel, d.pos);

        const vRaw = V3.len(s.vel);
        this.axes(s.rot, this.lx, this.ly, this.lz);

        // 1. 空气阻力
        this.drg(this.lx, s.vel, vRaw, this.df);
        // 2. 重力
        this.gf.setValue(0, -this.p.m * this.p.g, 0);
        // 总外力（暂不含马格努斯）
        V3.add(this.df, this.gf, this.tf);

        // 使用半隐式速度估值（半步预测）以更好地评估马格努斯力
        const halfDt = dt * 0.5;
        const aDragX = this.tf.x / this.p.m;
        const aDragY = this.tf.y / this.p.m;
        const aDragZ = this.tf.z / this.p.m;
        this.vEff.x = s.vel.x + aDragX * halfDt;
        this.vEff.y = s.vel.y + aDragY * halfDt;
        this.vEff.z = s.vel.z + aDragZ * halfDt;
        const vEff = V3.len(this.vEff);

        // 3. 马格努斯力 (目前被屏蔽，设为0)
        this.mag(s.rot, s.sn, s.sa, this.vEff, vEff, this.mf);
        this.mf.setValue(0, 0, 0);  // 屏蔽马格努斯力以匹配预期行为
        V3.add(this.tf, this.mf, this.tf);

        // 线加速度 = 总外力 / 质量
        d.vel.x = this.tf.x / this.p.m;
        d.vel.y = this.tf.y / this.p.m;
        d.vel.z = this.tf.z / this.p.m;

        // 非轴向转动惯量 I_na = 2/5 m R^2
        const I_na = 0.4 * this.p.m * this.p.r * this.p.r;
        
        // 陀螺效应及轴向自旋加速度
        let gy = this.gyr(this.lx, this.vEff, vEff, s.sa, halfDt, this.gt);

        // 非轴向角速度的空气阻尼或低速滚动阻尼
        if (vEff < 1.0) {
            // 低速：施加一个与 I_na 成比例的强阻尼，确保 sn 停止
            const dampRate = 10.0 * Math.max(0, 1.0 - vEff);
            this.nd.x = -s.sn.x * dampRate * I_na;
            this.nd.y = -s.sn.y * dampRate * I_na;
            this.nd.z = -s.sn.z * dampRate * I_na;
        } else {
            // 正常飞行空气阻尼力矩
            this.nax(vEff, s.sn, this.nd);
        }

        // 将陀螺扭矩投影到垂直于 lx 的平面（非轴向分量）
        V3.projPlane(this.gt, this.lx, this.gn);

        // sn 的导数（角加速度）= (非轴向陀螺扭矩 + 阻尼力矩) / I_na
        d.sn.x = (this.gn.x + this.nd.x) / I_na;
        d.sn.y = (this.gn.y + this.nd.y) / I_na;
        d.sn.z = (this.gn.z + this.nd.z) / I_na;

        return { s: d, aa: gy.aa };
    }

    /**
     * 欧拉积分一步（用于 RK4 的中间步骤）。
     * 直接根据导数更新状态。
     */
    eul(s: State, d: State, aa: number, dt: number) {
        const t = new Laya.Vector3();
        // s.pos += d.pos * dt
        V3.scale(d.pos, dt, t); V3.add(s.pos, t, s.pos);
        // s.vel += d.vel * dt
        V3.scale(d.vel, dt, t); V3.add(s.vel, t, s.vel);
        // s.sn += d.sn * dt
        V3.scale(d.sn, dt, t); V3.add(s.sn, t, s.sn);
        // s.sa += aa * dt
        s.sa += aa * dt;
        const maxSpin = 200 * Math.PI;
        s.sa = V3.clamp(s.sa, -maxSpin, maxSpin);
    }

    /**
     * 旋转状态更新：根据当前角速度旋转四元数。
     * 使用小角度近似构建旋转增量四元数，并与当前旋转复合。
     * @param rot 当前旋转（输入/输出）
     * @param sn 非轴向自旋
     * @param sa 轴向自旋
     * @param lx 世界系对称轴方向
     * @param dt 时间步长
     */
    private rstep(rot: Laya.Quaternion, sn: Laya.Vector3, sa: number, lx: Laya.Vector3, dt: number) {
        // 世界角速度 = sn + lx * sa
        V3.copy(sn, this.rt);
        this.rt.x += lx.x * sa;
        this.rt.y += lx.y * sa;
        this.rt.z += lx.z * sa;

        const rate = V3.len(this.rt);   // 总角速度大小
        if (rate < 1e-8) return;

        const angle = rate * dt;        // 旋转角度 θ = ω * dt
        V3.norm(this.rt, this.ra);      // 旋转轴单位向量

        const half = angle * 0.5;
        const sh = Math.sin(half);
        // 增量四元数 Δq = (sin(θ/2)*axis, cos(θ/2))
        this.rd.x = this.ra.x * sh;
        this.rd.y = this.ra.y * sh;
        this.rd.z = this.ra.z * sh;
        this.rd.w = Math.cos(half);

        // 复合旋转：rot = Δq * rot
        Laya.Quaternion.multiply(this.rd, rot, rot);

        // 归一化四元数，防止数值漂移
        const ls = rot.x * rot.x + rot.y * rot.y + rot.z * rot.z + rot.w * rot.w;
        if (ls > 0) {
            const inv = 1 / Math.sqrt(ls);
            rot.x *= inv; rot.y *= inv; rot.z *= inv; rot.w *= inv;
        }
    }

    /**
     * 四阶龙格-库塔法 (RK4) 积分一步。
     * 计算 4 个导数的加权平均，更新状态。
     */
    rk4(s: State, dt: number) {
        // k1
        const r1 = this.der(s, dt);
        V3.copy(r1.s.pos, this.k1.s.pos);
        V3.copy(r1.s.vel, this.k1.s.vel);
        V3.copy(r1.s.sn, this.k1.s.sn);
        this.k1.aa = r1.aa;

        // 用 k1 推进半步得到 s2，并更新旋转
        this.s2.copyFrom(s);
        this.eul(this.s2, this.k1.s, this.k1.aa, dt * 0.5);
        this.axes(s.rot, this.klx, this.kly, this.klz);
        this.rstep(this.s2.rot, s.sn, s.sa, this.klx, dt * 0.5);

        // k2
        const r2 = this.der(this.s2, dt);
        V3.copy(r2.s.pos, this.k2.s.pos);
        V3.copy(r2.s.vel, this.k2.s.vel);
        V3.copy(r2.s.sn, this.k2.s.sn);
        this.k2.aa = r2.aa;

        // 用 k2 推进半步得到 s3，并更新旋转（注意这里用了 s2.sn 和 s2.sa）
        this.s3.copyFrom(s);
        this.eul(this.s3, this.k2.s, this.k2.aa, dt * 0.5);
        this.axes(this.s2.rot, this.klx, this.kly, this.klz);
        this.rstep(this.s3.rot, this.s2.sn, this.s2.sa, this.klx, dt * 0.5);

        // k3
        const r3 = this.der(this.s3, dt);
        V3.copy(r3.s.pos, this.k3.s.pos);
        V3.copy(r3.s.vel, this.k3.s.vel);
        V3.copy(r3.s.sn, this.k3.s.sn);
        this.k3.aa = r3.aa;

        // 用 k3 推进整步得到 s4，并更新旋转
        this.s4.copyFrom(s);
        this.eul(this.s4, this.k3.s, this.k3.aa, dt);
        this.axes(this.s3.rot, this.klx, this.kly, this.klz);
        this.rstep(this.s4.rot, this.s3.sn, this.s3.sa, this.klx, dt);

        // k4
        const r4 = this.der(this.s4, dt);
        V3.copy(r4.s.pos, this.k4.s.pos);
        V3.copy(r4.s.vel, this.k4.s.vel);
        V3.copy(r4.s.sn, this.k4.s.sn);
        this.k4.aa = r4.aa;

        // 加权平均更新状态
        this.comb(s.pos, this.k1.s.pos, this.k2.s.pos, this.k3.s.pos, this.k4.s.pos, dt);
        this.comb(s.vel, this.k1.s.vel, this.k2.s.vel, this.k3.s.vel, this.k4.s.vel, dt);
        this.comb(s.sn, this.k1.s.sn, this.k2.s.sn, this.k3.s.sn, this.k4.s.sn, dt);

        // sa 使用加权平均 aa
        const aaAvg = (this.k1.aa + 2 * this.k2.aa + 2 * this.k3.aa + this.k4.aa) / 6;
        s.sa += aaAvg * dt;

        // 根据更新后的 sn 和 sa 更新旋转四元数
        this.axes(s.rot, this.klx, this.kly, this.klz);
        this.rstep(s.rot, s.sn, s.sa, this.klx, dt);
    }

    /**
     * 组合 RK4 的各阶导数增量到目标向量。
     * 公式：out += dt * (1/6*k1 + 2/6*k2 + 2/6*k3 + 1/6*k4)
     */
    private comb(out: Laya.Vector3, k1: Laya.Vector3, k2: Laya.Vector3, k3: Laya.Vector3, k4: Laya.Vector3, dt: number) {
        V3.scale(k1, 1 / 6, this.ka);
        V3.scale(k2, 2 / 6, this.kb); V3.add(this.ka, this.kb, this.ka);
        V3.scale(k3, 2 / 6, this.kb); V3.add(this.ka, this.kb, this.ka);
        V3.scale(k4, 1 / 6, this.kb); V3.add(this.ka, this.kb, this.ka);
        V3.scale(this.ka, dt, this.ka);
        V3.add(out, this.ka, out);
    }

    /**
     * 仿真主循环：从最近的历史状态推进至目标时间 target (毫秒)。
     * 采用子步（每步 dt ≈ 0.001s），并在每一步中处理碰撞。
     *
     * @param target 目标时间戳 (ms)
     * @returns 目标时间的状态
     */
    simTo(target: number): State {
        if (!this.isCalc) return this.state.clone();
        let start = this.state;
        let t0 = this.state.time;

        // 从地图中寻找不晚于 target 的最新历史状态，以减少重复计算
        const layout = this.map.timeTo(target);
        for (let i = 0; i <= this.MAX_LOOKBACK; i++) {
            const c = this.map.get(layout - i);
            if (c && c.size) {
                let best: State | null = null;
                for (const s of c) {
                    if (s.time <= target && (!best || s.time > best.time)) best = s;
                }
                if (best) { start = best; t0 = best.time; break; }
            }
        }

        let cur = start.clone();
        let t = t0;
        const baseDt = 0.001;   // 基础时间步长 1ms (0.001秒)

        // 最大迭代 10 万步，防止死循环
        for (let step = 0; step < 100000 && t < target; step++) {
            const v = V3.len(cur.vel);
            const adt = baseDt;                              // 可采用自适应步长，此处固定
            const remainSec = (target - t) / 1000;           // 剩余物理时间(秒)
            const dt = Math.min(adt, remainSec);
            if (dt < 1e-7) break;

            // 四阶龙格库塔积分一步
            this.rk4(cur, dt);

            // 处理网和地面碰撞
            if (this.net) {
                this.procCol(cur, this.net, this.ncol, false, dt);
            }
            if (this.gndNet) {
                this.procCol(cur, this.gndNet, this.gndNcol, true, dt);
            }

            // 更新时间（毫秒）
            t += dt * 1000;
            cur.time = t;

            // 检查发散（位置或速度出现 NaN/Inf）
            if (this.inv(cur)) {
                console.warn("Phys diverged at t=", t);
                return start.clone();
            }

            // 缓存状态，避免重复仿真
            if (this.map.getStats().totalObjects < this.maxCache) {
                this.map.addByTime(t, cur.clone());
            }
        }
        return cur;
    }
}