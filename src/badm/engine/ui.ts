/**
 * UI - 用户界面管理类
 * 创建并管理摇杆、倒计时文本、击球指示器、进度条、加载文本、分数显示、玩家信息等 UI 元素
 */
export class UI {
    /** 摇杆容器（背景圆 + 拖拽点） */
    private _joystickContainer: Laya.Sprite;
    /** 摇杆背景圆 */
    private _bg: Laya.Sprite;
    /** 摇杆拖拽点 */
    private _dot: Laya.Sprite;
    /** 击球方向箭头图形 */
    private _arrowGraphic: Laya.Sprite;
    /** 摇杆最大半径（像素） */
    private _maxRadius: number = 100;
    /** 倒计时文本 */
    private _countDownText: Laya.Text | null = null;
    /** 击球指示器进度条 */
    private _hitIndicator: Laya.ProgressBar | null = null;
    /** 加载进度条 */
    private _progressBar: Laya.ProgressBar | null = null;
    /** 加载文本 */
    private _loadingText: Laya.Text | null = null;
    /** 比分文本 */
    private _scoreText: Laya.Text | null = null;
    /** 玩家信息文本 */
    private _playerText: Laya.Text | null = null;

    /** 场景根节点 */
    root : Laya.Area2D;

    /** 构造函数：创建摇杆 UI 并初始化场景节点引用 */
    constructor() {
        this._createUI();
        this._initSceneNodes();
    }

    /** 从场景树中查找并缓存各 UI 节点引用 */
    private _initSceneNodes(): void {
        this.root = Laya.stage.getChildByPath("root");
            this._countDownText = this._findNode(this.root,"CountDown") as Laya.Text;
            this._hitIndicator = this._findNode(this.root,"Sprite") as Laya.ProgressBar;
            this._progressBar = this._findNode(this.root, "ProgressBar") as Laya.ProgressBar;
            this._loadingText = this._findNode(this.root, "show") as Laya.Text;
            this._scoreText = this._findNode(this.root, "gameShow") as Laya.Text;
            this._playerText = this._findNode(this.root, "player") as Laya.Text;
    }

    /** 设置倒计时显示，count <= 0 时隐藏 */
    setCountdown(count: number): void {
        if (this._countDownText) {
            this._countDownText.text = String(count);
            this._countDownText.visible = count > 0;
        }
    }

    /** 设置比分显示，支持准备中/发球中/普通三种状态 */
    setScore(left?: number, right?: number, status?: string, reason?: string): void {
        if (!this._scoreText) return;
        const scoreText = `L ${left ?? 0}分 : R ${right ?? 0}分`;
        if (left === undefined || left === null) {
            this._scoreText.text = '比赛开始';
            return;
        }
        if (status === 'ready') {
            const prefix = reason ? reason : '准备中';
            this._scoreText.text = `${prefix}\n${scoreText}`;
        } else if (status === 'serving') {
            this._scoreText.text = `请发球\n${scoreText}`;
        } else {
            this._scoreText.text = scoreText;
        }
    }

    /** 设置玩家信息显示（玩家 ID + 房间玩家列表） */
    setPlayerInfo(playerId: string, roomPlayerIds: string): void {
        if (!this._playerText) return;
        this._playerText.text = `玩家: ${playerId}\n房间: ${roomPlayerIds}`;
    }


    /** 设置击球指示器可见性和百分比值 */
    setHitIndicator(visible: boolean, value?: number): void {
        if (this._hitIndicator) {
            this._hitIndicator.visible = visible;
            if (visible && value !== undefined) {
                this._hitIndicator.value = Math.max(0, Math.min(100, value));
            }
        }
    }

    /** 设置加载进度，无参数时隐藏进度条和文本 */
    setProgress(text?: string, progress?: number): void {
        if (text === undefined && progress === undefined) {
            if (this._progressBar) this._progressBar.visible = false;
            if (this._loadingText) this._loadingText.visible = false;
            return;
        }
        if (this._progressBar) this._progressBar.visible = true;
        if (this._loadingText) this._loadingText.visible = true;
        if (text !== undefined && this._loadingText) this._loadingText.text = text;
        if (progress !== undefined && this._progressBar) this._progressBar.value = Math.max(0, Math.min(100, progress));
    }

    /** 创建摇杆和箭头 UI 元素并添加到舞台 */
    private _createUI(): void {
        this._joystickContainer = new Laya.Sprite();
        this._joystickContainer.visible = false;
        Laya.stage.addChild(this._joystickContainer);

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
        Laya.stage.addChild(this._arrowGraphic);
    }

    /** 在指定位置显示摇杆 */
    showJoystick(x: number, y: number): void {
        this._joystickContainer.visible = true;
        this._joystickContainer.pos(x, y);
        this._dot.pos(0, 0);
    }

    /** 隐藏摇杆 */
    hideJoystick(): void {
        this._joystickContainer.visible = false;
    }

    /** 更新摇杆拖拽点位置 */
    updateDot(dx: number, dy: number): void {
        this._dot.pos(dx, dy);
    }

    /** 在指定位置显示击球箭头 */
    showArrow(x: number, y: number): void {
        this._arrowGraphic.visible = true;
        this._arrowGraphic.pos(x, y);
    }

    /** 隐藏击球箭头并清空图形 */
    hideArrow(): void {
        this._arrowGraphic.visible = false;
        this._arrowGraphic.graphics.clear();
    }

    /** 绘制击球方向箭头（渐变宽度 + 箭头头部） */
    drawArrow(dx: number, dy: number, distance: number): void {
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

    /** 获取摇杆最大半径 */
    get maxRadius(): number { return this._maxRadius; }

    /** 设置摇杆最大半径并重绘背景圆 */
    setMaxRadius(radius: number): void {
        this._maxRadius = radius;
        this._bg.graphics.clear();
        this._bg.graphics.drawCircle(0, 0, radius, "#000000", "#333333", 2);
    }

    /** 销毁 UI 元素，从舞台移除摇杆和箭头 */
    destroy(): void {
        this._joystickContainer.removeSelf();
        this._arrowGraphic.removeSelf();
    }

    /** 递归查找指定名称的节点 */
    private _findNode(root: Laya.Node, name: string): Laya.Node | null {
        if(!root) return null;
        if (root.name === name) return root;
        for (let i = 0; i < root.numChildren; i++) {
            const found = this._findNode(root.getChildAt(i), name);
            if (found) return found;
        }
        return null;
    }
}
