/**
 * Ball - 羽毛球类，继承 Obj
 * 管理球的状态、移动方向与力度、击球参数，引用物理（Phy）和动画（Ani）系统
 */
// Ball.ts
import { Timer } from "../libs/time";
import { Phy } from "./phy";
import { Ani } from "./ani";
import { Obj, dressCfg } from "./obj";
import { StrokeParams } from "./cha"; // 确保路径正确

export enum ChaState {
    IDLE = 0,
    MOVE
}

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

    private _pendingBall: Obj | null = null;
    public isP = false;   
    public phy: Phy;
    private _moveIntervalId: string | null = null;

    // 【新增】事件系统与击球记录
    private _events: { [key: string]: ((...args: any[]) => void)[] } = {};
    public lastHitInfo: { hitterId: number, stroke: StrokeParams } | null = null;

    constructor(root: Laya.Sprite3D) {
        super(root);
        this._moveStartPos.setValue(this.x, this.y, this.z);
        this.phy = new Phy(this);
        this.phy.debugDrawNet(new Laya.Color(255, 0, 0, 255))
        let sc = new Laya.Script();
        sc.onUpdate = this.onUpdate.bind(this);
        this.root.addComponentInstance(sc);
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

    // 【修改】击球时记录信息并触发事件
    hit(power: number, angH: number, angV: number, spi: Laya.Vector3, hitterId?: number): void {

        this.phy.hit(power, angH, angV, spi);
        const stroke: StrokeParams = { power, angH, angV, spi };
        this.lastHitInfo = { hitterId: hitterId ?? -1, stroke };
        this.emit('hit', this.lastHitInfo);
    }

    ball(ball: Obj): void {
        this._pendingBall = ball;
        this.isP = true;
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

    onUpdate(): void {
        //console.log(Timer.invoke('Time'))
        //if (Timer.invoke('Time') >= 16) {
            if (this.phy.isCalc) {
                this.phy.get(Timer.now());
                this.phy.applyToNode(this);
                this.phy.debug();

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