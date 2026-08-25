/**
 * Control - 输入控制器，处理触摸/键盘输入
 * 管理移动和击球两种交互模式（摇杆拖拽、双击、长按），提供 onMove/onHit/onStop 回调
 */
import { Timer } from "../libs/time";
import { Inp, InpFlag, InpKey } from "../libs/inp";
import { UI } from "./ui";

export class Control {
    /** 舞台引用 */
    private _stage: Laya.Stage;
    /** 输入事件管理器 */
    private _inp: Inp;
    /** UI 管理器 */
    private _ui: UI;

    /** 当前交互模式：idle / move / hit */
    private _mode: 'idle' | 'move' | 'hit' = 'idle';
    /** 移动模式起始触摸位置 */
    private _moveStartPos: Laya.Vector2 = new Laya.Vector2();
    /** 击球模式起始触摸位置 */
    private _hitStartPos: Laya.Vector2 = new Laya.Vector2();
    /** 是否正在拖拽 */
    private _isDragging: boolean = false;
    /** 键盘移动是否激活 */
    private _keyboardMoving: boolean = false;

    /** 击球触摸点 ID */
    private _hitTouchId: number = -1;

    /** 最大蓄力保持时间（ms） */
    public maxHoldTime: number = 700;
    /** 双击间隔阈值（ms） */
    public doubleTapInterval: number = 600;
    /** 点击最大位移阈值（像素），超过视为拖拽 */
    public tapMaxDistance: number = 20;
    /** 击球最小拖拽距离（像素） */
    public hitMinDistance: number = 20;
    /** 默认击球力度 */
    public defaultHitPower: number = 0.5;
    /** 默认水平角度 */
    public defaultAngH: number = 90;
    /** 默认垂直角度 */
    public defaultAngV: number = 90;

    /** 移动回调：(角度, 力度) */
    public onMove: ((angle: number, power: number) => void) | null = null;
    /** 击球回调：(击球参数, 旋转) */
    public onHit: ((params?: any, spi?:Laya.Vector3) => void) | null = null;
    /** 停止移动回调 */
    public onStop: (() => void) | null = null;

    /** 是否启用移动 */
    public enableMove: boolean = true;
    /** 是否启用击球 */
    public enableHit: boolean = true;

    /** 构造函数：初始化舞台、输入、UI 并绑定事件 */
    constructor(stage: Laya.Stage) {
        this._stage = stage;
        this._inp = new Inp(stage);
        this._ui = new UI();
        this._bindInpEvents();
    }

    /** 每帧更新：击球拖拽中时更新击球参数 */
    update(): void {
        if (this._mode === 'hit' && this._isDragging) {
            this._updateHit();
        }
    }

    /** 绑定输入事件：触摸开始/移动/结束、键盘移动 */
    private _bindInpEvents(): void {
        // 触摸开始
        this._inp.on('start', (flag, x, y) => {
            if (flag & InpFlag.TOUCH2) {
                this._switchToHit(x, y);
                return;
            }
            if (flag & InpFlag.DOBTOUCH) {
                this._switchToHit(x, y);
                return;
            }
            if (flag & InpFlag.TOUCH) {
                if (this._keyboardMoving) {
                    this._switchToHit(x, y);
                    return;
                }
                if (this._mode === 'idle') {
                    this._startMove(x, y);
                }
            }
        });

        // 触摸移动
        this._inp.on('move', (flag, x, y, dx, dy) => {
            if (this._mode === 'move') {
                if (flag & InpFlag.MOV || flag & InpFlag.DOBMOV) {
                    this._updateMove(x, y, dx, dy);
                    return;
                }
            }
            if (flag & InpFlag.DOBMOV) {
                if (this._mode === 'hit') {
                    this._updateHit(dx, dy);
                }
                return; 
            }
            if (flag & InpFlag.MOV) {
                if (this._mode === 'hit') {
                    this._updateHit(dx, dy);
                }
                return;
            }
            if (flag & InpFlag.MOV2) {
                if (this._mode === 'hit') {
                    this._updateHit(dx, dy);
                }
                return;
            }
        });

        // 触摸结束
        this._inp.on('end', (flag) => {
            if (flag & InpFlag.UP) {
                if (this._mode === 'move') {
                    this._stopMove();
                }
            }
            if (flag & InpFlag.UP2) {
                if (this._mode === 'hit') {
                    this._reset();
                }
            }
            if (flag & InpFlag.UPALL) {
                if (this._mode !== 'idle') {
                    this._reset();
                }
            }
        });

        // 键盘移动
        this._inp.on('keymov', (flag, angle, power) => {
            if (power <= 0) {
                if (this.onMove) this.onMove(0, -1);
                if (this.onStop) this.onStop();
                this._keyboardMoving = false;
            } else {
                this._keyboardMoving = true;
                if (this.onMove) this.onMove(angle, power);
            }
        });

        this._inp.on('key', (flag, key, pressed) => {
        });
    }

    // ========== 移动模式 ==========
    /** 开始移动模式：记录起点并显示摇杆 */
    private _startMove(x: number, y: number): void {
        this._mode = 'move';
        this._isDragging = false;
        this._moveStartPos.setValue(x, y);
        this._ui.showJoystick(x, y);
    }

    /** 更新移动：计算角度和力度，更新摇杆点和回调 */
    private _updateMove(x: number, y: number, dx: number, dy: number): void {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (!this._isDragging && distance > 5) {
            this._isDragging = true;
        }
        if (this._isDragging && this.enableMove) {
            const limitedDist = Math.min(distance, this._ui.maxRadius);
            const angle = Math.atan2(dy, dx);
            this._ui.updateDot(Math.cos(angle) * limitedDist, Math.sin(angle) * limitedDist);
            const power = limitedDist / this._ui.maxRadius;
            const outAngle = (Math.atan2(-dy, dx) * 180 / Math.PI + 360) % 360;
            if (this.onMove) this.onMove(outAngle, power);
        }
    }

    /** 停止移动：触发停止回调并重置状态 */
    private _stopMove(): void {
        if (this._isDragging) {
            if (this.onMove) this.onMove(0, -1);
            if (this.onStop) this.onStop();
        }
        this._reset();
    }

    /** 切换到击球模式：隐藏摇杆，显示箭头，2秒后自动重置 */
    private _switchToHit(x: number, y: number): void {
        if (this._mode === 'move') {
            if (this._isDragging) {
                if (this.onMove) this.onMove(0, -1);
                if (this.onStop) this.onStop();
                this._isDragging = false;
            }
            this._ui.hideJoystick();
        }

        this._mode = 'hit';
        Timer.setTimeout(2000, () => {
            if (this._mode === 'hit') {
                this._reset();
            }
        });
        this._isDragging = true;
        this._hitStartPos.setValue(x, y);
        this._ui.showArrow(x, y);
        Timer.start("hitHold");
    }

    /** 击球拖拽 X 位移 */
    dx: number = 0;
    /** 击球拖拽 Y 位移 */
    dy: number = 0;
    // ========== 击球模式 ==========
    /** 更新击球：绘制箭头并计算击球参数回调 */
    private _updateHit(dx?: number, dy?: number): void {
        if (dx !== undefined && dy !== undefined) {
            this.dx = dx;
            this.dy = dy;
        } else {
            dx = this.dx;
            dy = this.dy;
        }
        
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (!this._isDragging && distance > 5) {
            this._isDragging = true;
        }
        if (this._isDragging) {
            this._ui.drawArrow(dx, dy, distance);
            const params = this._calcHitParams(dx, dy, distance);
            if (params && this.enableHit) {
                this.onHit({power: params.power, angH: params.angH, angV: params.angV}, new Laya.Vector3(0, 0, 0));
            }
        }
    }

    /** 计算击球参数：力度由距离决定，水平角度由方向决定，垂直角度由蓄力时间和方向决定 */
    private _calcHitParams(dx: number, dy: number, distance: number): { power: number; angH: number; angV: number } | null {
        if (distance <= this.hitMinDistance) {
            return null;
        }
        const holdTime = Math.max(0, Timer.invoke("hitHold") - 200);
        const holdRatio = Math.min(holdTime / this.maxHoldTime, 1.0);
        let angV: number;
        if (dy < 0) {
            angV = 90 * holdRatio;
        } else {
            angV = -90 * holdRatio;
        }
        const rawAngle = Math.atan2(-dy, dx) * 180 / Math.PI;
        let angH = (rawAngle + 360) % 360;

        const power = Math.min(distance / 10, this._ui.maxRadius);
        return { power, angH, angV };
    }

    /** 重置到 idle 模式：击球模式下触发 onHit()，隐藏摇杆和箭头 */
    private _reset(): void {
        if (this._mode === 'hit') {
            this.onHit();
        }
        
        this._mode = 'idle';
        this._isDragging = false;
        this.dx = 0;
        this.dy = 0;
        this._ui.hideJoystick();
        this._ui.hideArrow();
    }

    /** 设置摇杆最大半径 */
    setMaxRadius(radius: number): void {
        this._ui.setMaxRadius(radius);
    }

    /** 销毁输入和 UI */
    destroy(): void {
        this._inp.destroy();
        this._ui.destroy();
    }
}
