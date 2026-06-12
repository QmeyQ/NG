import { Timer } from "../libs/time";

export const InpFlag = {
    NONE: 0,
    CLICK: 1 << 0,
    TOUCH: 1 << 1,
    DOBCLICK: 1 << 2,
    DOBTOUCH: 1 << 3,
    MOV: 1 << 4,
    DOBMOV: 1 << 5,
    CLICK2: 1 << 6,
    TOUCH2: 1 << 7,
    MOV2: 1 << 8,
    UP: 1 << 9,
    UP2: 1 << 10,
    KEYMOV: 1 << 11,
    KEY: 1 << 12,
    UPALL: 1 << 13,
} as const;

export type InpFlag = typeof InpFlag[keyof typeof InpFlag];
export type InpKey = 'w' | 'a' | 's' | 'd';

export class Inp {
    private _stage: Laya.Stage;

    // 触摸点ID → 手指序号 (0,1,2...)
    private _fingerMap: Map<number, number> = new Map();
    private _startPos: Map<number, Laya.Vector2> = new Map();
    private _currentPos: Map<number, Laya.Vector2> = new Map();
    private _isDragging: Map<number, boolean> = new Map();

    private _lastTapPos: Laya.Vector2 = new Laya.Vector2();
    private _lastTapTime: number = 0;
    private _doubleTapTimer: string | null = null;
    private _isDoubleTapDrag: boolean = false;
    private _dragThreshold: number = 5;

    // 键盘状态：Map<按键, 按下顺序>
    private _keyMap: Map<InpKey, number> = new Map();
    private _keyOrderCounter: number = 0;
    private _keyMovePower: number = 1.0;

    public doubleTapInterval: number = 600;
    public tapMaxDistance: number = 20;

    private _startCallbacks: Array<(flag: InpFlag, x: number, y: number, finger: number) => void> = [];
    private _moveCallbacks: Array<(flag: InpFlag, x: number, y: number, dx: number, dy: number, finger: number) => void> = [];
    private _endCallbacks: Array<(flag: InpFlag, finger: number) => void> = [];
    private _keyMovCallbacks: Array<(flag: InpFlag, angle: number, power: number) => void> = [];
    private _keyCallbacks: Array<(flag: InpFlag, key: InpKey, pressed: boolean) => void> = [];

    constructor(stage: Laya.Stage) {
        this._stage = stage;
        this._bindEvents();
    }

    private _bindEvents(): void {
        this._stage.on(Laya.Event.MOUSE_DOWN, this, this._onTouchStart);
        this._stage.on(Laya.Event.MOUSE_MOVE, this, this._onTouchMove);
        this._stage.on(Laya.Event.MOUSE_UP, this, this._onTouchEnd);
        this._stage.on(Laya.Event.MOUSE_OUT, this, this._onTouchEnd);
        // 键盘事件直接监听 stage
        Laya.stage.on(Laya.Event.KEY_DOWN, this, this._onKeyDown);
        Laya.stage.on(Laya.Event.KEY_UP, this, this._onKeyUp);
    }

    public clear(): void {
        this._fingerMap.clear();
        this._startPos.clear();
        this._currentPos.clear();
        this._isDragging.clear();
        this._isDoubleTapDrag = false;
        this._lastTapTime = 0;
        if (this._doubleTapTimer) {
            Timer.clear(this._doubleTapTimer);
            this._doubleTapTimer = null;
        }
        this._keyMap.clear();
        this._keyOrderCounter = 0;
    }

    public destroy(): void {
        this._stage.offAllCaller(this);
        Laya.stage.offAllCaller(this);
        this.clear();
        this._startCallbacks = [];
        this._moveCallbacks = [];
        this._endCallbacks = [];
        this._keyMovCallbacks = [];
        this._keyCallbacks = [];
    }

    on(type: 'start', callback: (flag: InpFlag, x: number, y: number, finger: number) => void): void;
    on(type: 'move', callback: (flag: InpFlag, x: number, y: number, dx: number, dy: number, finger: number) => void): void;
    on(type: 'end', callback: (flag: InpFlag, finger: number) => void): void;
    on(type: 'keymov', callback: (flag: InpFlag, angle: number, power: number) => void): void;
    on(type: 'key', callback: (flag: InpFlag, key: InpKey, pressed: boolean) => void): void;
    on(type: string, callback: any): void {
        switch (type) {
            case 'start': this._startCallbacks.push(callback); break;
            case 'move': this._moveCallbacks.push(callback); break;
            case 'end': this._endCallbacks.push(callback); break;
            case 'keymov': this._keyMovCallbacks.push(callback); break;
            case 'key': this._keyCallbacks.push(callback); break;
        }
    }

    // ==================== 触摸事件处理（保持不变） ====================
    private _getSortedTouches(e: Laya.Event): { id: number; x: number; y: number }[] {
        const touches = e.touches || [];
        const list = touches.map((t: any) => ({
            id: t.touchId ?? 0,
            x: t.pos.x,
            y: t.pos.y
        }));
        list.sort((a, b) => a.id - b.id);
        return list;
    }

    private _onTouchStart(e: Laya.Event): void {
        const touches = this._getSortedTouches(e);
        if (touches.length === 0) return;

        for (const t of touches) {
            if (!this._fingerMap.has(t.id)) {
                const finger = this._fingerMap.size;
                this._fingerMap.set(t.id, finger);
                this._startPos.set(t.id, new Laya.Vector2(t.x, t.y));
                this._currentPos.set(t.id, new Laya.Vector2(t.x, t.y));
                this._isDragging.set(t.id, false);

                let flag: InpFlag = InpFlag.TOUCH;
                if (finger === 0) {
                    const now = Timer.now();
                    const elapsed = Timer.invoke("dob");
                    const dx = t.x - this._lastTapPos.x;
                    const dy = t.y - this._lastTapPos.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const isDouble = (elapsed > 0 && elapsed < this.doubleTapInterval && distance < this.tapMaxDistance * 2);

                    if (isDouble) {
                        this._isDoubleTapDrag = true;
                        Timer.start("dob");
                        if (this._doubleTapTimer) {
                            Timer.clear(this._doubleTapTimer);
                            this._doubleTapTimer = null;
                        }
                        this._lastTapTime = 0;
                        flag |= InpFlag.DOBCLICK | InpFlag.DOBTOUCH;
                    } else {
                        this._lastTapPos.setValue(t.x, t.y);
                        this._lastTapTime = now;
                        this._isDoubleTapDrag = false;
                        Timer.start("dob");
                        if (this._doubleTapTimer) Timer.clear(this._doubleTapTimer);
                        this._doubleTapTimer = Timer.setTimeout(this.doubleTapInterval, () => {
                            this._doubleTapTimer = null;
                        });
                        flag |= InpFlag.CLICK;
                    }
                } else if (finger === 1) {
                    flag |= InpFlag.TOUCH2 | InpFlag.CLICK2;
                }
                this._emitStart(flag, t.x, t.y, finger);
            }
        }
    }

    private _onTouchMove(e: Laya.Event): void {
        const touches = this._getSortedTouches(e);
        if (touches.length === 0) return;

        for (const t of touches) {
            this._currentPos.set(t.id, new Laya.Vector2(t.x, t.y));
        }

        for (const [id, finger] of this._fingerMap) {
            const start = this._startPos.get(id);
            const cur = this._currentPos.get(id);
            if (!start || !cur) continue;

            const dx = cur.x - start.x;
            const dy = cur.y - start.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let isDragging = this._isDragging.get(id) || false;
            if (!isDragging && dist > this._dragThreshold) {
                isDragging = true;
                this._isDragging.set(id, true);
            }

            if (isDragging) {
                let flag: InpFlag = InpFlag.MOV;
                if (finger === 0 && this._isDoubleTapDrag) {
                    flag |= InpFlag.DOBMOV;
                } else if (finger === 1) {
                    flag |= InpFlag.MOV2;
                }
                this._emitMove(flag, cur.x, cur.y, dx, dy, finger);
            }
        }
    }

    private _onTouchEnd(e: Laya.Event): void {
        const touches = this._getSortedTouches(e);
        const remainingIds = touches.map(t => t.id);

        const endedIds: number[] = [];
        for (const id of this._fingerMap.keys()) {
            if (remainingIds.indexOf(id) === -1) {
                endedIds.push(id);
            }
        }
        if (endedIds.length === 0) return;

        for (const id of endedIds) {
            const finger = this._fingerMap.get(id)!;

            this._startPos.delete(id);
            this._currentPos.delete(id);
            this._isDragging.delete(id);
            this._fingerMap.delete(id);

            let flag: InpFlag = InpFlag.NONE;
            if (finger === 0) {
                flag |= InpFlag.UP;
            } else if (finger === 1) {
                flag |= InpFlag.UP2;
            }

            this._emitEnd(flag, finger);
        }

        if (this._fingerMap.size === 0) {
            this._emitEnd(InpFlag.UPALL, -1);
            this._isDoubleTapDrag = false;
        }
    }

    // ==================== 键盘事件处理（简化版） ====================
    private _onKeyDown(e: Laya.Event): void {
        const keyCode = e.keyCode;
        let key: InpKey | null = null;
        if (keyCode === 87) key = 'w';
        else if (keyCode === 65) key = 'a';
        else if (keyCode === 83) key = 's';
        else if (keyCode === 68) key = 'd';
        if (key) {
            if (!this._keyMap.has(key)) {
                this._keyMap.set(key, this._keyOrderCounter++);
                this._emitKey(InpFlag.KEY, key, true);
                this._updateKeyboard();
            }
        }
    }

    private _onKeyUp(e: Laya.Event): void {
        const keyCode = e.keyCode;
        let key: InpKey | null = null;
        if (keyCode === 87) key = 'w';
        else if (keyCode === 65) key = 'a';
        else if (keyCode === 83) key = 's';
        else if (keyCode === 68) key = 'd';
        if (key) {
            if (this._keyMap.has(key)) {
                this._keyMap.delete(key);
                this._emitKey(InpFlag.KEY, key, false);
                this._updateKeyboard();
                // 当所有按键都抬起时，重置计数器（可选）
                if (this._keyMap.size === 0) {
                    this._keyOrderCounter = 0;
                }
            }
        }
    }

    private _updateKeyboard(): void {
        let dx = 0, dy = 0;
        // 遍历所有按下的键，计算合成方向
        for (const key of this._keyMap.keys()) {
            switch (key) {
                case 'w': dy -= 1; break;
                case 's': dy += 1; break;
                case 'a': dx -= 1; break;
                case 'd': dx += 1; break;
            }
        }
        const moving = dx !== 0 || dy !== 0;
        if (moving) {
            const angle = (Math.atan2(-dy, dx) * 180 / Math.PI + 360) % 360;
            for (const cb of this._keyMovCallbacks) {
                cb(InpFlag.KEYMOV, Math.round(angle), this._keyMovePower);
            }
        } else {
            for (const cb of this._keyMovCallbacks) {
                cb(InpFlag.KEYMOV, 0, -1);
            }
        }
    }

    // ==================== 事件派发 ====================
    private _emitStart(flag: InpFlag, x: number, y: number, finger: number): void {
        for (const cb of this._startCallbacks) cb(flag, x, y, finger);
    }
    private _emitMove(flag: InpFlag, x: number, y: number, dx: number, dy: number, finger: number): void {
        for (const cb of this._moveCallbacks) cb(flag, x, y, dx, dy, finger);
    }
    private _emitEnd(flag: InpFlag, finger: number): void {
        for (const cb of this._endCallbacks) cb(flag, finger);
    }
    private _emitKey(flag: InpFlag, key: InpKey, pressed: boolean): void {
        for (const cb of this._keyCallbacks) cb(flag, key, pressed);
    }
}