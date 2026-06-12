import { Timer } from "../libs/time";
import { Inp, InpFlag, InpKey } from "../libs/inp";

export class Control {
    private _stage: Laya.Stage;
    private _inp: Inp;

    // UI 组件
    private _joystickContainer: Laya.Sprite;
    private _bg: Laya.Sprite;
    private _dot: Laya.Sprite;
    private _arrowGraphic: Laya.Sprite;
    private _maxRadius: number = 100;

    // 模式与状态
    private _mode: 'idle' | 'move' | 'hit' = 'idle';
    private _moveStartPos: Laya.Vector2 = new Laya.Vector2();
    private _hitStartPos: Laya.Vector2 = new Laya.Vector2();
    private _isDragging: boolean = false;
    private _keyboardMoving: boolean = false;   // 键盘移动中

    // 击球参数动态计算相关
    private _hitTouchId: number = -1;

    // 配置
    public maxHoldTime: number = 700;
    public doubleTapInterval: number = 600;
    public tapMaxDistance: number = 20;
    public hitMinDistance: number = 20;
    public defaultHitPower: number = 0.5;
    public defaultAngH: number = 90;
    public defaultAngV: number = 90;

    // 回调
    public onMove: ((angle: number, power: number) => void) | null = null;
    public onHit: ((params?: any, spi?:Laya.Vector3) => void) | null = null;
    public onStop: (() => void) | null = null;

    public enableMove: boolean = true;
    public enableHit: boolean = true;

    constructor(stage: Laya.Stage) {
        this._stage = stage;
        this._inp = new Inp(stage);
        this._createUI();
        this._bindInpEvents();
    }

    private _createUI(): void {
        this._joystickContainer = new Laya.Sprite();
        this._joystickContainer.visible = false;
        this._stage.addChild(this._joystickContainer);

        this._bg = new Laya.Sprite();
        this._bg.graphics.drawCircle(0, 0, this._maxRadius, "#000000", "#333333", 2);
        this._bg.alpha = 0.6;
        this._joystickContainer.addChild(this._bg);

        this._dot = new Laya.Sprite();
        this._dot.graphics.drawCircle(0, 0, this._maxRadius * 0.25, "#ffffff", "#cccccc", 2);
        this._dot.alpha = 0.9;
        this._joystickContainer.addChild(this._dot);

        this._arrowGraphic = new Laya.Sprite();
        this._arrowGraphic.visible = false;
        this._stage.addChild(this._arrowGraphic);
    }

    private _bindInpEvents(): void {
        // 触摸开始
        this._inp.on('start', (flag, x, y) => {
            // 第二指按下：中断当前操作，进入击球模式
            if (flag & InpFlag.TOUCH2) {
                this._switchToHit(x, y);
                return;
            }

            // 双击按下：仅记录，不改变模式（等待后续滑动）
            if (flag & InpFlag.DOBTOUCH) {
                this._switchToHit(x, y);
                return;
            }

            // 第一指按下
            if (flag & InpFlag.TOUCH) {
                // 如果键盘移动中，中断键盘并进入击球模式
                if (this._keyboardMoving) {
                    this._switchToHit(x, y);
                    return;
                }

                // 空闲状态下进入移动模式
                if (this._mode === 'idle') {
                    this._startMove(x, y);
                }
            }
        });

        // 触摸移动
        this._inp.on('move', (flag, x, y, dx, dy) => {
            // 处理双击滑动：优先级最高，一旦识别立即切换到击球模式
            if (flag & InpFlag.DOBMOV) {
                // 如果还在移动模式，切换为击球模式（使用当前触摸位置作为起点）
                if (this._mode === 'move') {
                    this._switchToHit(x, y);
                }
                // 如果已经是击球模式，继续更新
                if (this._mode === 'hit') {
                    this._updateHit(dx, dy);

                }
                return; // 不再执行后续 MOV 逻辑
            }

            // 处理普通单指拖拽
            if (flag & InpFlag.MOV) {
                if (this._mode === 'move') {
                    this._updateMove(x, y, dx, dy);
                } else if (this._mode === 'hit') {
                    this._updateHit(dx, dy);
                }
                return;
            }

            // 处理第二指拖拽
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
            // 所有触摸结束，重置状态（Inp 提供方法获取活跃计数）
            if (flag & InpFlag.UPALL) {
                this._reset();
            }
        });

        // 键盘移动
        this._inp.on('keymov', (flag, angle, power) => {
            this._keyboardMoving = (power !== -1);
            if (power <= 0) {
                if (this.onMove) {
                    this.onMove(0, -1);
                    this._keyboardMoving = false;
                    return;
                }
                if (this.onStop) this.onStop();
            } else {
                this._keyboardMoving = true;
                if (this.onMove) this.onMove(angle, power);
            }
        });

        this._inp.on('key', (flag, key, pressed) => {
            // 可处理按键音效等
        });
    }

    // ========== 移动模式 ==========
    private _startMove(x: number, y: number): void {
        this._mode = 'move';
        this._isDragging = false;
        this._moveStartPos.setValue(x, y);
        this._joystickContainer.visible = true;
        this._joystickContainer.pos(x, y);
        this._dot.pos(0, 0);
    }

    private _updateMove(x: number, y: number, dx: number, dy: number): void {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (!this._isDragging && distance > 5) {
            this._isDragging = true;
        }
        if (this._isDragging && this.enableMove) {
            const limitedDist = Math.min(distance, this._maxRadius);
            const angle = Math.atan2(dy, dx);
            this._dot.pos(Math.cos(angle) * limitedDist, Math.sin(angle) * limitedDist);
            const power = limitedDist / this._maxRadius;
            const outAngle = (Math.atan2(-dy, dx) * 180 / Math.PI + 360) % 360;
            if (this.onMove) this.onMove(outAngle, power);
        }
    }

    private _stopMove(): void {
        if (this._isDragging) {
            if (this.onMove) this.onMove(0, -1);
            if (this.onStop) this.onStop();
        }
        this._reset();
    }

    private _switchToHit(x: number, y: number): void {
        if (this._mode === 'move') {
            this._stopMove();
        }
        this._mode = 'hit';
        Timer.setTimeout(2000, () => {
            if (this._mode === 'hit') {
                this._reset();
            }
        });
        this._isDragging = true;
        this._hitStartPos.setValue(x, y);
        this._joystickContainer.visible = false;
        this._arrowGraphic.visible = true;
        this._arrowGraphic.pos(x, y);
        Timer.start("hitHold");
    }

    dx: number;
    dy: number;
    // ========== 击球模式 ==========
    private _updateHit(dx?: number, dy?: number): void {
        if (dx !== undefined && dy !== undefined) {
            this.dx = dx;
            this.dy = dy;
        }else{
            dx = this.dx;
            dy = this.dy;
        }
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (!this._isDragging && distance > 5) {
            this._isDragging = true;
        }
        if (this._isDragging) {
            this._drawArrowWithTrail(dx, dy, distance);
            const params = this._calcHitParams(dx, dy, distance);
            if (params && this.enableHit) {
                this.onHit({power: params.power, angH: params.angH, angV: params.angV}, new Laya.Vector3(0, 0, 0));
            }
        }
    }


    private _calcHitParams(dx: number, dy: number, distance: number): { power: number; angH: number; angV: number } | null {
        if (distance <= this.hitMinDistance) {

        }
        const holdTime = Math.max(0, Timer.invoke("hitHold") - 200);
        const holdRatio = Math.min(holdTime / this.maxHoldTime, 1.0);
        let angV: number;
        if (dy < 0) {
            angV = 90 * holdRatio;          // 0 ~ 90
        } else {
            angV = -90 * holdRatio;         // 0 ~ -90
        }
        const rawAngle = Math.atan2(-dy, dx) * 180 / Math.PI;
        let angH = (rawAngle + 360) % 360;
        if (angH > 180) angH = 360 - angH;
        //angH = Math.max(0, Math.min(180, angH));
        const power = Math.min(distance / 10, this._maxRadius);
        return { power, angH, angV };
    }

    private _reset(): void {
        this._updateHit();
           if(this._mode == 'hit'){
                this.onHit();
           }
        this._mode = 'idle';
        this._isDragging = false;
        this._joystickContainer.visible = false;
        this._arrowGraphic.visible = false;
        this._arrowGraphic.graphics.clear();
    }

    private _drawArrowWithTrail(dx: number, dy: number, distance: number): void {
        const angle = Math.atan2(dy, dx);
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const totalLen = Math.min(distance, this._maxRadius * 2);
        const maxWidth = totalLen * 0.25;
        const startWidth = maxWidth * 0.1;
        const segments = Math.max(3, Math.floor(totalLen / 12));
        const g = this._arrowGraphic.graphics;
        g.clear();
        for (let i = 0; i < segments; i++) {
            const t1 = i / segments;
            const t2 = (i + 1) / segments;
            const x1 = dx * t1;
            const y1 = dy * t1;
            const x2 = dx * t2;
            const y2 = dy * t2;
            const w1 = (startWidth + (maxWidth - startWidth) * t1) * 0.5;
            const w2 = (startWidth + (maxWidth - startWidth) * t2) * 0.5;
            const perpX = -sinA;
            const perpY = cosA;
            const p1x = x1 + perpX * w1;
            const p1y = y1 + perpY * w1;
            const p2x = x1 - perpX * w1;
            const p2y = y1 - perpY * w1;
            const p3x = x2 - perpX * w2;
            const p3y = y2 - perpY * w2;
            const p4x = x2 + perpX * w2;
            const p4y = y2 + perpY * w2;
            const alphaValue = Math.floor(0x05 + (0xa0 - 0x05) * t2);
            const alphaHex = (alphaValue < 16 ? '0' : '') + alphaValue.toString(16);
            const color = `#afbd98${alphaHex}`;
            g.drawPoly(0, 0, [p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y], color, null, 0);
        }
        const headSize = maxWidth * 1.2;
        const headX = dx;
        const headY = dy;
        const headP1x = headX + cosA * headSize;
        const headP1y = headY + sinA * headSize;
        const headP2x = headX - sinA * headSize * 0.6;
        const headP2y = headY + cosA * headSize * 0.6;
        const headP3x = headX + sinA * headSize * 0.6;
        const headP3y = headY - cosA * headSize * 0.6;
        g.drawPoly(0, 0, [headP1x, headP1y, headP2x, headP2y, headP3x, headP3y], "#afbd98a0", null, 0);
    }

    setMaxRadius(radius: number): void {
        this._maxRadius = radius;
        this._bg.graphics.clear();
        this._bg.graphics.drawCircle(0, 0, radius, "#000000", "#333333", 2);
    }

    destroy(): void {
        this._inp.destroy();
        this._joystickContainer.removeSelf();
        this._arrowGraphic.removeSelf();
    }
}