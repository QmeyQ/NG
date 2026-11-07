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
        // 内核从"当前位姿"起步; 之后表现层只能读内核(poseOut), 不再回写(旧 pos setter 会 sync 回内核,
        // 等于任何一次挪节点都在偷改物理状态——联机两端各改各的, 这正是不同步的温床)
        this.phy = new Phy({ pos: { x: this.x, y: this.y, z: this.z }, rot: this.rotQ() });
        // 鹰眼记录是球自己的事: 落地定格轨迹、正式回合内击球作废重记, 都在这里挂钩。
        // "这次落地/击球算不算正式回合"球不认识(那是比赛阶段), 由外面注入 trackGate 判定。
        this.on('groundHit', () => this._captureTrack());
        this.on('hit', () => { if (this._track && this.trackGate && this.trackGate()) this.clearTrack(); });
        let sc = new Laya.Script();
        sc.onUpdate = this.onUpdate.bind(this);
        this.root.addComponentInstance(sc);
    }

    private rotQ(): { x: number, y: number, z: number, w: number } {
        const r = this.root.transform.rotation;
        return { x: r.x, y: r.y, z: r.z, w: r.w };
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

    /** 表现层位置: 只写节点。想让球"真的在那里", 必须走 attachTo/restoreSnap/hitAt(内核写入面) */
    get pos(): Laya.Vector3 { return this.root.transform.position; }
    set pos(v: Laya.Vector3) {
        this.root.transform.position = v;
    }

    get rot(): Laya.Quaternion {
        return this.root.transform.rotation;
    }

    set rot(r: Laya.Quaternion) {
        this.root.transform.rotation = r;
    }

    /** 内核位姿 → 节点(唯一的表现写入通道) */
    public applyPose(): void {
        const p = this.phy.poseOut();
        this.root.transform.position = p.pos;
        this.root.transform.rotation = p.rot;
    }

    /**
     * 附件(钉在持球者手上/停在落点): 走内核 attachAt, 于是速度/时钟/命中记录一起归位。
     * 旧代码用 `ball.pos = ...` 挪节点再靠 setter 回写内核, 结果把"正在飞的球"接上零速也办不到,
     * 双端各自钉法不一致 → 发球阶段两端球在不同的人手上。
     */
    public attachTo(pos: { x: number, y: number, z: number }, at?: number): void {
        this.phy.attachAt(pos, at);
        this.applyPose();
    }

    /** 网络快照的唯一落地球(定点整数快照, 见 pvpProto.encodeBall) */
    public restoreSnap(snap: any): boolean {
        if (!snap || !this.phy.restore(snap)) return false;
        this.applyPose();
        return true;
    }

    /** 当前内核快照(权威端给对端入口/停止点用) */
    public snapshot(): any { return this.phy.snapshot(); }

    /** 有没有弹道在飞(取代外部读 phy.isCalc/isSleeping) */
    public flying(): boolean { return this.phy.flying(); }
    public resting(): boolean { return this.phy.resting(); }

    /** 内核还在不给这颗球花算力吗(附件/熄火=false)。联机帧用它表达"这颗球该不该继续积分" */
    public simulating(): boolean { return !!(this.phy as any).isCalc; }

    /** 这颗球在 t 时刻的状态(历史回退由内核自己做; t 在未来=按弹道前推) */
    public stateAt(t: number): any { return this.phy.stateUpTo(t) || this.phy.get(); }

    /** 熄火: 停止积分但保留位姿与内核历史(判罚窗口/回合重置用, 鹰眼还要读历史) */
    public halt(): void { this.phy.halt(); }

    /** 区间轨迹采样(鹰眼记录/回放的唯一取数口) */
    public sampleTrack(from: number, to: number): any[] {
        const r = this.phy.sampleRange(from, to);
        return Array.isArray(r) ? r : [];
    }

    /** 把内核推进到某时刻(补算/追赶都走这里, 不再让外面调 simTo) */
    public advanceTo(t: number): void {
        this.phy.advanceTo(t);
        this.applyPose();
    }

    /** 迟到入口的追赶: 只补到"击球时刻+CATCHUP上限", 超出部分丢掉(由 ball_stop 兜底对齐) */
    public catchUpFrom(hitTime: number): void {
        this.advanceTo(this.phy.catchUpDeadline(hitTime));
    }

    /** 清掉轨迹渲染缓存(鹰眼回放结束后恢复正常画线) */
    public resetTrail(): void { this.phy.resetTrk(); }

    // ============================================================
    // 鹰眼: 轨迹记录 + 回放
    // 记录 = 落地瞬间从内核历史里取出的一段状态(不重演、不 predict, 时长由记录本身决定);
    // 回放 = 把这段记录插值喂回自己的节点。两件事都只依赖球的历史与位姿, 所以放在 Ball 里,
    // 以前它住在 badm 场景类、数据寄存在 mag(网络管理类)——于是规则、联机、场景三方都在改同一份字段。
    // ============================================================

    /** 落地前后各取多少毫秒 */
    public static readonly TRACK_HALF_MS = 2000;
    /** 采样密度(内核历史本身就是这个步长), 播放时长按点数×步长估 */
    public static readonly TRACK_STEP_MS = 40;
    /** 回放时长上下限(记录太短不短于下限, 太长压到上限) */
    public static readonly PLAY_MIN_MS = 2000;
    public static readonly PLAY_MAX_MS = 5000;

    /** 已记录的轨迹(本机落地采集, 或对端确认时传来的) */
    private _track: any[] | null = null;
    /** 采集时刻(落地那一刻), <=0 表示本回合还没记过 */
    private _trackT0 = -1;
    /** 回放起始时刻/时长/进入前的节点位置(结束还原) */
    private _pbT0 = 0;
    private _pbDur = 0;
    private _pbOrig: Laya.Vector3 | null = null;
    /** 回放姿态插值缓存(每帧用, 不 new) */
    private _pbQ = new Laya.Quaternion();

    /** 回放进行中: 球位由记录插值接管, 正常模拟驱动挂起 */
    public playing = false;
    /** "此刻的落地/击球是否属于正式回合"——场景按比赛阶段注入(死球期球乱飞不记录、不清记录) */
    public trackGate: (() => boolean) | null = null;
    /** 回放每帧球位回调(badm 用它转鹰眼相机; 相机是场景的事, 球不知道相机) */
    public onPlaybackPose: ((x: number, y: number, z: number) => void) | null = null;

    public get trackPts(): any[] | null { return this._track; }

    /** 有没有可播的记录(开窗/进回放的唯一前置) */
    public hasTrack(): boolean { return !!this._track && this._track.length >= 2; }

    /** 落地定格: 已有记录不覆盖(用户规格: 记录到发球阶段才清), 死球期落地不记 */
    private _captureTrack(): void {
        if (this._trackT0 > 0) return;
        if (this.trackGate && !this.trackGate()) return;
        const t0 = Timer.now();
        const pts = this.sampleTrack(t0 - Ball.TRACK_HALF_MS, t0 + Ball.TRACK_HALF_MS);
        if (pts.length < 2) return;   // 几乎没有飞行历史(发球未击出等)不记
        this._track = pts;
        this._trackT0 = t0;
    }

    /** 清记录(新回合发球阶段/正式回合内再次击球: 旧落地的判罚已被作废) */
    public clearTrack(): void {
        this._track = null;
        this._trackT0 = -1;
    }

    /** 装填外部轨迹(对端记录兜底: 双端必须看同一段画面, 不能因谁没采到就掉队) */
    public setTrack(pts: any[]): void {
        if (!pts || pts.length < 2) return;
        this._track = pts;
        this._trackT0 = Timer.now();
    }

    /**
     * 开始回放: 挂起正常模拟、把记录画成黄色轨迹线、按时长均摊插值。
     * 没记录直接 false(调用方据此决定文案/阶段怎么走), 时长在这里一次定死, 不随帧率漂。
     */
    public startPlayback(): boolean {
        if (this.playing || !this.hasTrack()) return false;
        const pts = this._track as any[];
        this.suspend = true;
        this.playing = true;
        this._pbOrig = new Laya.Vector3(this.x, this.y, this.z);
        this._pbDur = Math.max(Ball.PLAY_MIN_MS, Math.min(pts.length * Ball.TRACK_STEP_MS, Ball.PLAY_MAX_MS));
        this._pbT0 = Timer.now();
        this._drawPath(pts);
        return true;
    }

    /** 结束回放: 恢复正常驱动、还原进入前位置、清鹰眼轨迹线; 幂等 */
    public stopPlayback(): void {
        if (!this.playing) return;
        this.playing = false;
        this._pbT0 = 0;
        this.suspend = false;
        if (this._pbOrig) this.pos = this._pbOrig;
        this._pbOrig = null;
        this.resetTrail();
    }

    /** 用记录点覆盖轨迹渲染(黄色线段): 轨迹渲染器住在内核里, 这里只是把记录交给它。
     *  记录点可能是对端传来的普通对象(线上只带位置), 所以统一换成 Vector3 再交给渲染器 */
    private _drawPath(pts: any[]): void {
        const phy: any = this.phy;
        phy.drawTrack();
        if (!phy.trkLines) return;
        phy.trkLines.clear();
        const c = new Laya.Color(1, 1, 0, 1);
        const v = (p: any) => new Laya.Vector3(p.x, p.y, p.z);
        for (let i = 0; i < pts.length - 1; i++)
            phy.trkLines.addLine(v(pts[i].pos), v(pts[i + 1].pos), c, c);
    }

    /** 回放一帧: 位置线性插值 + 姿态 slerp, 播满发 playbackEnd 并自行收尾 */
    private _tickPlayback(): void {
        const pts = this._track;
        if (!this.playing || !pts || pts.length < 2 || this._pbT0 <= 0) return;
        const el = Timer.now() - this._pbT0;
        const f = Math.min(el / this._pbDur, 1) * (pts.length - 1);
        const i = Math.min(Math.floor(f), pts.length - 2);
        if (i < 0) return;
        const t = Math.min(f - i, 1);
        const p1 = pts[i].pos, p2 = pts[i + 1].pos;
        const px = p1.x + (p2.x - p1.x) * t;
        const py = p1.y + (p2.y - p1.y) * t;
        const pz = p1.z + (p2.z - p1.z) * t;
        this.x = px; this.y = py; this.z = pz;
        // 姿态: 本机记录带 rot(内核 State), 对端传来的记录线上只有位置——没有姿态就别硬插值,
        // 拿 undefined 去 slerp 会在这条回放链上抛异常
        const r1 = pts[i].rot, r2 = pts[i + 1].rot;
        if (r1 && r2) {
            Laya.Quaternion.slerp(r1, r2, t, this._pbQ);
            this.rot = this._pbQ;
        }
        this.onPlaybackPose?.(px, py, pz);
        if (el >= this._pbDur) {
            this.stopPlayback();
            this.emit('playbackEnd');
        }
    }

    // 【修改】击球时记录信息并触发事件(本地击球: t=现在)
    hit(power: number, angH: number, angV: number, spi: Laya.Vector3, hitterId?: number): void {
        this.hitAt(power, angH, angV, spi, hitterId);
    }

    /**
     * 时间驱动击球的【唯一】落点: 参数 + 击球时刻 + (可选)入口球位兜底, 全部交给内核 strike。
     * 回退历史、清命中记录、补算封顶这些动作原来散在这里和 pvp 两处, 现在只在内核里有一份实现。
     */
    hitAt(power: number, angH: number, angV: number, spi: Laya.Vector3, hitterId?: number,
        t?: number, ballPos?: { x: number, y: number, z: number }): void {
        const stroke = { power, angH, angV, spi };
        // strike 内部含"回退→施加参数→按补算上限推进到现在", 这里只负责把结果落到节点并发事件
        this.phy.strike(stroke, t, ballPos);
        this.applyPose();
        this.lastHitInfo = { hitterId: hitterId ?? -1, stroke, time: t ?? this.phy.snapshot().time };
        this.emit('hit', this.lastHitInfo);
    }

    /**
     * 权威入口重锚(联机专用): 只把内核按【权威入口 + 同参数 + 同击球时刻】重起一次并落节点。
     * 与 hitAt 的差别是不发 'hit' 事件——本机这一拍的判罚与音效在本地出手时已经走过一遍,
     * 重锚只是把弹道对齐到权威入口, 再发一次事件等于双份击球声 + 一次多余的判罚入口。
     */
    public restrike(stroke: { power: number, angH: number, angV: number, spi?: Laya.Vector3 }, at?: number): void {
        this.phy.strike(stroke, at);
        this.applyPose();
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

    /** 正常模拟驱动挂起(回放接管球位时置位) */
    public suspend = false;

    onUpdate(): void {
        // 回放优先: 这一段球位来自记录插值, 内核不参与(suspend 也是 true, 所以必须排在它前面)
        if (this.playing) { this._tickPlayback(); return; }
        if (this.suspend) return;
        if (!this.phy.flying()) return;
        // 时间驱动: 内核自己知道该算到哪(现在), 算完单向推给节点
        this.phy.advanceTo(Timer.now());
        this.applyPose();
        this.phy.drawTrack();

        if (!(this as any).xx) {
            (this as any).xx = true;
            this.phy.debugDrawNet();
        }

        // 碰网/落地事件: 命中记录由内核产生, 这里取走并清(表现与规则都只读这份)
        const hit = this.phy.getLastNetHit();
        if (hit) {
            this.emit('netHit', hit);
            this.phy.clearNetHit();
        }
        const gHit = this.phy.getLastGroundHit();
        if (gHit) {
            this.emit('groundHit', { x: this.x, y: this.y, z: this.z });
            this.phy.clearGroundHit();
        }
        Timer.start('Time');
    }
}