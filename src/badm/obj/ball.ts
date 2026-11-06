/**
 * Ball - 羽毛球类，继承 Obj
 * 管理球的状态、移动方向与力度、击球参数，引用物理（Phy）和动画（Ani）系统
 */
// Ball.ts
import { Timer } from "../../libs/time";
import { Phy } from "../engine/phy";
import { Ani } from "./ani";
import { Obj, dressCfg } from "./obj";
import { StrokeParams, ChaState } from "./cha"; // 确保路径正确
import { Au } from "../../libs/au";
import * as Proto from "../../libs/pvpProto";

export interface ChaAttr {
    id: number;
    side: 'left' | 'right';
    x: number;
    y: number;
    z: number;
    spd: number;
    hitRange: number;
    state: ChaState;
}

export class Ball extends Obj {
    private _ani: Ani;
    private _attr = {
        id: 0,
        side: 'right' as 'left' | 'right',
        x: 0, y: 0, z: 0,
        spd: 2, hitRange: 20,
        state: ChaState.IDLE
    };

    private _moveDir: Laya.Vector3 = new Laya.Vector3();
    private _movePower: number = 0;
    private _moveStartPos: Laya.Vector3 = new Laya.Vector3();
    private _isMoving: boolean = false;

    public phy: Phy;
    private _moveIntervalId: string | null = null;

    // 【新增】事件系统与击球记录
    private _events: { [key: string]: ((...args: any[]) => void)[] } = {};
    public lastHitInfo: { hitterId: number, stroke: StrokeParams, time?: number } | null = null;

    constructor(root: Laya.Sprite3D) {
        super(root);
        this._moveStartPos.setValue(this.x, this.y, this.z);
        this.phy = new Phy(this);
        //this.phy.debugDrawNet(new Laya.Color(255, 0, 0, 255))
        //this._createHeadArrow(); //绘制球朝向
        let sc = new Laya.Script();
        sc.onUpdate = this.onUpdate.bind(this);
        this.root.addComponentInstance(sc);
    }


    /**
 * 球头朝向指示箭头: 挂球节点本地 +Z（球头轴；`phy.alx` 用 `rotationLookAt` 直接让本地 +Z
 * 指向速度方向，无需额外轴变换）。作为子节点自动跟随 rot 旋转，无需每帧对齐。
 * 替代已删的角色方向调试箭头。
 */
private _createHeadArrow(): void {
    const arrow = new Laya.Sprite3D("headArrow");
    const mat = new Laya.BlinnPhongMaterial();
    mat.albedoColor = new Laya.Color(0, 1, 0.8, 1);

    const box = new Laya.MeshSprite3D(Laya.PrimitiveMesh.createBox(0.05, 0.05, 0.35));
    box.transform.localPosition = new Laya.Vector3(0, 0, 0.18);
    box.meshRenderer.material = mat;
    arrow.addChild(box);

    const cone = new Laya.MeshSprite3D(Laya.PrimitiveMesh.createCone(0.08, 0.2));
    cone.transform.localPosition = new Laya.Vector3(0, 0, 0.45);
    // 圆锥默认 +Y 朝上，绕 X 转 +90° 让顶端指向 +Z
    cone.transform.localRotationEuler = new Laya.Vector3(90, 0, 0);
    cone.meshRenderer.material = mat;
    arrow.addChild(cone);

    this.root.addChild(arrow);
}

    // 【新增】事件监听与触发
    public on(eventName: string, callback: (...args: any[]) => void): void {
        if (!this._events[eventName]) this._events[eventName] = [];
        this._events[eventName].push(callback);
    }

    public emit(eventName: string, ...args: any[]): void {
        const callbacks = this._events[eventName];
        if (callbacks) callbacks.forEach(cb => cb(...args));
    }

    get pos(): Laya.Vector3 { return this.root.transform.position; }
    set pos(v: Laya.Vector3) {
        this.root.transform.position = v;
        this.phy.sync(this);
    }
    
    get rot(): Laya.Quaternion{
        return this.root.transform.rotation; 
    }

    set rot(r: Laya.Quaternion){
        this.root.transform.rotation = r;
        this.phy.sync(this);
    }

    // 【修改】击球时记录信息并触发事件(本地击球: t=现在)
    hit(power: number, angH: number, angV: number, spi: Laya.Vector3, hitterId?: number): void {
        this.hitAt(power, angH, angV, spi, hitterId);
    }

    /**
     * 时间驱动击球(用户规格 2026-10-28): 支持根据时间/球的位置设置击球——
     * 收到权威端过去时刻的击球操作(现在实际球可能已落地/飞远)时, 对球进行【过去操作】的应用:
     * 1) 回退: 从 phy.map 取 ≤t 最近历史 state 作为击球起点(消息时序在过去);
     *    map 无该时刻历史 → ballPos 兜底(ball.pos setter 走 sync 全量化);
     *    t ≥ 当前 state.time(本地现在/极近) → 不回退(本地击球常态)
     * 2) 击球: phy.hit(..., t) —— 轨迹从过去时刻 t 起算(map 清重建)
     * 3) 同步: phy.simTo(现在) 把球推进到"现在应有的位置"——双端从同一 (t, 击球参数)
     *    出发各自积分, 位置必收敛(时间驱动模拟引擎的意义, "各打各的"根治)
     * lastHitInfo.time = t(rule 延时结算窗口判定"击球早于落地才可救起")
     */
    hitAt(power: number, angH: number, angV: number, spi: Laya.Vector3, hitterId?: number,
        t?: number, ballPos?: { x: number, y: number, z: number }): void {
        const phy: any = this.phy;
        if (t != null && t < phy.state.time) {
            // 回退球状态到击球时刻: map 历史(完整 位置+速度+旋转)优先, ballPos 兜底
            let hist: any = null;
            if (phy.map) {
                const layout = phy.map.timeTo(t);
                const lookback = phy.MAX_LOOKBACK || 10;
                for (let i = 0; i <= lookback && !hist; i++) {
                    const set = phy.map.get(layout - i);
                    if (!set || !set.size) continue;
                    for (const s of set) {
                        if (s.time <= t && (!hist || s.time > hist.time)) hist = s;
                    }
                }
            }
            if (hist) {
                phy.state = hist.clone();
            } else if (ballPos) {
                this.pos = new Laya.Vector3(ballPos.x, ballPos.y, ballPos.z);
            }
            phy.isSleeping = false;
            phy.lastGndHit = null;
            phy.lastNetHit = null;
        }
        phy.hit(power, angH, angV, spi, t);
        // 时间驱动同步: 击球时刻在过去 → 立即把球推到现在应有的位置。
        // 补算时长必须封顶(pvpProto.CATCHUP_MAX_MS)且【超出部分不再回补】: 一条迟到的击球
        // 按"现在-击球时刻"整段积分能把球打出几十米——那才是"无限远击球"。
        if (t != null && t < Timer.now()) Proto.catchUpBall(phy, t, Timer.now());
        const stroke: StrokeParams = { power, angH, angV, spi };
        this.lastHitInfo = { hitterId: hitterId ?? -1, stroke, time: t ?? this.phy.state.time };
        this.emit('hit', this.lastHitInfo);
    }

    move(pos: { x: number; y: number; z: number }): void;
    move(angle: number, power: number): void;
    move(arg1: any, arg2?: number): void {}

    get id(): number { return this._attr.id; }
    get side(): 'left' | 'right' { return this._attr.side; }
    get spd(): number { return this._attr.spd; }
    set spd(v: number) { this._attr.spd = v; }
    get hitRange(): number { return this._attr.hitRange; }
    set hitRange(v: number) { this._attr.hitRange = v; }
    get state(): ChaState { return this._attr.state; }

    get(): ChaAttr { return { ...this._attr }; }
    set(data: Partial<ChaAttr>): void {
        Object.assign(this._attr, data);
        this._syncAttrToNodePos();
        this._moveStartPos.setValue(this._attr.x, this._attr.y, this._attr.z);
    }

    private _syncAttrToNodePos(): void {
        this.x = this._attr.x; this.y = this._attr.y; this.z = this._attr.z;
    }

    private _stopMove(): void {
        if (!this._isMoving) return;
        this._movePower = 0;
        this._isMoving = false;
        this._clearMoveInterval();
        if (this._attr.state === ChaState.MOVE) {
            this._attr.state = ChaState.IDLE;
            this._ani.crossFade('idle', 0.1);
        }
    }

    private _startMoveInterval(): void {
        if (this._moveIntervalId) return;
        this._moveIntervalId = Timer.setInterval(16, () => {
            if (!this._isMoving) { this._clearMoveInterval(); return; }
            const elapsedMs = Timer.invoke("move");
            Timer.start("move");
            const totalDist = this.spd * this._movePower * elapsedMs / 10000;
            if (totalDist > 0) {
                this.x = this.x + this._moveDir.x * totalDist;
                this.z = this.z + this._moveDir.z * totalDist;
            }
        });
    }

    private _clearMoveInterval(): void {
        if (this._moveIntervalId) { Timer.clear(this._moveIntervalId); this._moveIntervalId = null; }
    }

    destroy(): void {
        this._clearMoveInterval();
        super.destroy();
        this._ani = undefined;
    }

    /** 鹰眼回放中: 球位置由回放通道接管, 暂停正常模拟驱动 */
    public suspend = false;

    onUpdate(): void {
        if (this.suspend) return;
        //console.log(Timer.invoke('Time'))
        //if (Timer.invoke('Time') >= 16) {
            if (this.phy.isCalc) {
                this.phy.get(Timer.now());
                this.phy.applyToNode(this);
                this.phy.drawTrack();

                if (!(this as any).xx && this.phy.isCalc) {
                    (this as any).xx = true;
                    this.phy.debugDrawNet();
                }

                // 【修改】抛出碰网事件
                const hit = this.phy.getLastNetHit();
                if (hit) {
                    this.emit('netHit', hit);
                    this.phy.clearNetHit();
                }

                // 【新增】抛出落地事件
                const gHit = this.phy.getLastGroundHit();
                if (gHit) {
                    this.emit('groundHit', { x: this.x, y: this.y, z: this.z });
                    this.phy.clearGroundHit();
                }
            }
            Timer.start('Time');
       // }
    }
}