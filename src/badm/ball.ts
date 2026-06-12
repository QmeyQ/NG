// Cha.ts
import { Timer } from "../libs/time";
import { Phy } from "./phy";
import { Ani } from "./ani";
import { Obj, dressCfg } from "./obj";

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
        x: 0,
        y: 0,
        z: 0,
        spd: 2,
        hitRange: 20,
        state: ChaState.IDLE
    };

    // 移动相关
    private _moveDir: Laya.Vector3 = new Laya.Vector3();
    private _movePower: number = 0;
    private _moveStartPos: Laya.Vector3 = new Laya.Vector3();
    private _isMoving: boolean = false;


    private _pendingBall: Obj | null = null;
    public isP = false;   // 球权标记
    public phy: Phy ;

    private _moveIntervalId: string | null = null;

    constructor(root: Laya.Sprite3D) {
        super(root);
        this._moveStartPos.setValue(this.x, this.y, this.z);
        this.phy = new Phy(this);
        let sc = new Laya.Script();
        sc.onUpdate = this.onUpdate.bind(this);
        this.root.addComponentInstance(sc);
    }

    get pos(): Laya.Vector3 {
        return this.root.transform.position;
    }
    set pos(v: Laya.Vector3) {
        this.root.transform.position = v;
        this.phy.sync(this);
    }

    hit(power: number, angH: number, angV: number, spi: Laya.Vector3): void {
        this.phy.hit(power, angH, angV, spi);
    }



    // 设置球权
    ball(ball: Obj): void {
        this._pendingBall = ball;
        this.isP = true;
    }

    move(pos: { x: number; y: number; z: number }): void;
    move(angle: number, power: number): void;
    move(arg1: any, arg2?: number): void {
    }

    // ---------- 属性访问（角色特有） ----------
    get id(): number { return this._attr.id; }
    get side(): 'left' | 'right' { return this._attr.side; }
    get spd(): number { return this._attr.spd; }
    set spd(v: number) { this._attr.spd = v; }
    get hitRange(): number { return this._attr.hitRange; }
    set hitRange(v: number) { this._attr.hitRange = v; }
    get state(): ChaState { return this._attr.state; }

    // 序列化
    get(): ChaAttr {
        return { ...this._attr };
    }

    set(data: Partial<ChaAttr>): void {
        Object.assign(this._attr, data);
        this._syncAttrToNodePos();
        this._moveStartPos.setValue(this._attr.x, this._attr.y, this._attr.z);
    }

    // 将 _attr 中的位置同步到父类节点
    private _syncAttrToNodePos(): void {
        this.x = this._attr.x;
        this.y = this._attr.y;
        this.z = this._attr.z;
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
            if (!this._isMoving) {
                this._clearMoveInterval();
                return;
            }
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
        if (this._moveIntervalId) {
            Timer.clear(this._moveIntervalId);
            this._moveIntervalId = null;
        }
    }

    // 销毁时会自动调用父类 destroy（清理节点）
    destroy(): void {
        this._clearMoveInterval();
        super.destroy();
        this._ani = undefined;
    }

        onUpdate(): void {
        if(Timer.invoke('Time') >= 16){
        //时间放慢两倍
        //if(Timer.invoke('x')  > 100){
            //console.log("inx:", this.inx);
            // const state = this.phy.get(Timer.now() - 100 * this.inx);
                // this.ball.transform.position = state.pos;
                // const rot = state.rot;
                // this.ball.transform.rotation = rot;
                //  this.camera.transform.position  = new Laya.Vector3(state.pos.x,
                //      state.pos.y, this.camera.transform.position.z);
                this.phy.get(Timer.now());
                this.phy.applyToNode(this);
                this.phy.debug();

                //如果没有绘制网区域，则绘制
                if (!xx && this.phy.isCalc) {
                    var xx = true;
                    this.phy.debugDrawNet();
                }
            
                            // 查询是否碰网
            const hit = this.phy.getLastNetHit();
            if (hit && hit.featherHit && hit.headPastNet) {
                console.log("球裙勾网！球头已过网，尾部上扬翻转");
                // 播放勾网音效/特效
                this.phy.clearNetHit();
            } else if (hit && hit.headHit) {
                console.log("球头触网回弹");
                this.phy.clearNetHit();
            }
            //    this.camera.transform.localRotation = new Laya.Quaternion(0 , 0, 0, 1);
                Timer.start('Time');
            }
        }

}