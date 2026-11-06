/**
 * UI - 场景 HUD 管理类
 *
 * 只负责场景内的 HUD 元素：
 * - gameShow 富文本(状态/比分/倒计时统一显示)
 * - 击球指示器
 * - 进度条 + 加载文本
 * - 比分显示
 * - 玩家信息
 *
 * 触摸交互相关的摇杆 / hit 箭头 / 回旋镖 / hit 区域已全部迁移到 CUI。
 */
export class UI {
    // ============================================================
    // 场景 HUD
    // ============================================================

    private _hitIndicator: Laya.ProgressBar | null = null;
    private _progressBar: Laya.GBox | null = null;
    private _progress: Laya.GImage | null = null
    private _loadingText: Laya.Text | null = null;
    private _scoreText: Laya.Text | null = null;
    private _playerText: Laya.Text | null = null;
    /** box 下红/蓝队比分(场景 html 富文本节点, 无则退化为 gameShow 统一展示) */
    private _redText: any = null;
    private _blueText: any = null;

    /** gameShow 富文本当前倒计时(0 = 无) */
    private _cd = 0;
    /** 倒计时转红秒数阈值(准备 3/发球 5, 默认 5) */
    private _cdRedAt = 5;

    /** 场景根节点 */
    root: Laya.Area2D;

    /** 构造函数 */
    constructor() {
        this._initSceneNodes();
    }

    /** 从场景树中查找并缓存各 UI 节点引用 */
    private _initSceneNodes(): void {
        this.root = Laya.stage.getChildByPath("root");
        this._hitIndicator = UI.findNode(this.root, "Sprite") as Laya.ProgressBar;
        this._progressBar = UI.findNode(this.root, "ProgressBar") as Laya.GBox;
        this._progress =  UI.findNode(this._progressBar, "img") as Laya.GImage;

        this._loadingText = UI.findNode(this.root, "show") as Laya.Text;
        this._scoreText = UI.findNode(this.root, "gameShow") as Laya.Text;
        this._playerText = UI.findNode(this.root, "player") as Laya.Text;
        this._redText = UI.findNode(this.root, "red");
        this._blueText = UI.findNode(this.root, "blue");
    }

    // ============================================================
    // 场景 HUD 方法
    // ============================================================

    /** gameShow(html 富文本)统一渲染: 所有游戏消息(状态/比分/倒计时)都显示在这里。
     * redAt = 转红秒数阈值(准备阶段 3 / 发球阶段 5, 默认 5) */
    setCountdown(count: number, redAt: number = 5): void {
        this._cdRedAt = redAt;
        this._cd = count > 0 ? count : 0;
        this._renderGameShow();
    }

    setScore(left?: number, right?: number, status?: string, reason?: string): void {
        // 比分数字分写 box/red、box/blue(场景 html 富文本节点, 模板对齐编辑器配色红FF0044/蓝00D2FF+粗斜体);
        // gameShow 只保留状态/倒计时职能(无 red/blue 节点的场景退化为旧统一展示)
        if (this._redText && this._blueText) {
            this._redText.text = `<font color="#FF0044"><b><i>${left ?? 0}</i></b></font>`;
            this._blueText.text = `<font color="#00D2FF"><b><i>${right ?? 0}</i></b></font>`;
        }

        let scoreText: string;
        if (left === undefined || left === null) {
            scoreText = '比赛开始';
        } else if (this._redText && this._blueText) {
            // 比分已由 red/blue 分展, gameShow 只写状态行
            if (status === 'ready') {
                scoreText = reason ? reason : '准备中';
            } else if (status === 'serving') {
                scoreText = '请发球';
            } else {
                scoreText = '';
            }
        } else {
            scoreText = `L ${left}分 : R ${right ?? 0}分`;
            if (status === 'ready') {
                const prefix = reason ? reason : '准备中';
                scoreText = `${prefix}<br/>${scoreText}`;
            } else if (status === 'serving') {
                scoreText = `请发球<br/>${scoreText}`;
            }
        }
        this._scoreCache = scoreText;
        this._renderGameShow();
    }

    /** 比分/状态富文本缓存 */
    private _scoreCache = '比赛开始';

    /** 鹰眼挑战提示行(null=无): 窗口期"双击进入鹰眼挑战 N" / 回放期"鹰眼挑战 N" */
    private _eagleTip: string | null = null;

    /** 鹰眼挑战提示(独立行橙色): null 清除; 与比分/倒计时共存互不覆盖 */
    setEagleTip(text: string | null): void {
        this._eagleTip = text;
        this._renderGameShow();
    }

    /** 拼装 gameShow 富文本: 状态+比分 在前, 倒计时独立一行, ≤5s 红色; 鹰眼提示独立一行橙色 */
    private _renderGameShow(): void {
        if (!this._scoreText) return;
        let html = this._scoreCache;
        if (this._cd > 0) {
            const num = this._cd <= this._cdRedAt
                ? `<font color='#ff3333'>${this._cd}</font>`
                : `${this._cd}`;
            html += `<br/>${num}`;
        }
        if (this._eagleTip) {
            html += `<br/><font color='#ffaa00' size='34'><b>${this._eagleTip}</b></font>`;
        }
        this._scoreText.text = html;
    }

    setPlayerInfo(playerId: string, roomPlayerIds: string): void {
        if (!this._playerText) return;
        this._playerText.text = `玩家: ${playerId}\n房间: ${roomPlayerIds}`;
    }

    setHitIndicator(visible: boolean, value?: number): void {
        if (this._hitIndicator) {
            this._hitIndicator.visible = visible;
            if (visible && value !== undefined) {
                this._hitIndicator.value = Math.max(0, Math.min(100, value));
            }
        }
    }

    setProgress(text?: string, progress?: number): void {
        if (text === undefined && progress === undefined) {
            if (this._progressBar) this._progressBar.visible = false;
            if (this._loadingText) this._loadingText.visible = false;
            return;
        }
        if (this._progressBar) this._progressBar.visible = true;
        if (this._loadingText) this._loadingText.visible = true;
        if (text !== undefined && this._loadingText) this._loadingText.text = text;
        if (progress !== undefined && this._progressBar) this._progress.background = 
        Laya.DrawRectCmd.create(0, 0, Math.max(0, Math.min(1, progress / 100)),  
        1, 
        this._progress.color, null, 1, true)
    }

    // ============================================================
    // 生命周期
    // ============================================================

    destroy(): void {
        // 场景 HUD 节点由场景树自己管理，这里不做 removeSelf。

        this._hitIndicator = null;
        this._progressBar = null;
        this._loadingText = null;
        this._scoreText = null;
        this._playerText = null;
        this.root = null;
    }

    /** 递归查找指定名称的节点 */
    public static findNode(root: Laya.Node, name: string): Laya.Node | null {
        if (!root) return null;
        if (root.name === name) return root;
        for (let i = 0; i < root.numChildren; i++) {
            const found = this.findNode(root.getChildAt(i), name);
            if (found) return found;
        }
        return null;
    }

    /**
     * 给节点设置纹理(统一通道)：
     * - GImage 渲染走 comp(FrameAnimation) 的 atlas 通道, 直接 texture 赋值无效
     * - 其他 Sprite 节点走 texture 直赋
     */
    public static setTex(node: any, tex: Laya.Texture | null): void {
        if (!node || node.destroyed) return;
        const g = new Laya.Graphics;
        //g.drawImage(tex, 0, 0, node.width, node.height)
        (node as Laya.Sprite).texture = tex//setGraphics(new Laya.Graphics())
        // if (comp && typeof comp.setAtlas === "function") {
        //     if (tex) {
        //         const atlas = new Laya.AtlasResource(node.name || "tex", [tex], [tex]);
        //         comp.setAtlas(atlas);
        //         node.TextureAtlas = null;

        //     } else {
        //         comp.setAtlas(null);
        //     }
        // } else {
        //      const atlas = new Laya.AtlasResource(node.name || "tex", [tex], [tex]);
        //     //node.TextureAtlas = atlas;
        //     node.texture = tex;
        // }
    }

    // ============================================================
    // 通用拖动
    // ============================================================

    /**
     * 让 handle 成为 target 的拖动把手(在 stage 上监听移动, 自含状态)
     * @param target 被拖动的节点(如 dialog 面板)
     * @param handle 拖动把手节点(如边框)
     * @param bounds 可选边界 {minX,minY,maxX,maxY} 或其 getter;
     *               传 getter 时每次移动实时求值(缩放/resize 后静态快照会过期), 缺省限制在舞台内
     */
    public static makeDraggable(
        target: Laya.Sprite,
        handle: Laya.Sprite,
        bounds?: { minX: number; minY: number; maxX: number; maxY: number } | (() => { minX: number; minY: number; maxX: number; maxY: number })
    ): void {
        handle.mouseEnabled = true;

        let grabDX = 0;
        let grabDY = 0;
        let moved = false;

        const onMove = (e: Laya.Event): void => {
            if (target.destroyed) { unbind(); return; }
            if (!moved) moved = true;
            let nx = e.stageX - grabDX;
            let ny = e.stageY - grabDY;
            const b = (typeof bounds === "function") ? bounds() : bounds;
            const minX = b ? b.minX : 0;
            const minY = b ? b.minY : 0;
            const maxX = b ? b.maxX : Laya.stage.width - target.width;
            const maxY = b ? b.maxY : Laya.stage.height - target.height;
            if (nx < minX) nx = minX;
            if (ny < minY) ny = minY;
            if (nx > maxX) nx = maxX;
            if (ny > maxY) ny = maxY;
            target.x = nx;
            target.y = ny;
        };
        const unbind = (): void => {
            Laya.stage.off(Laya.Event.MOUSE_MOVE, handle, onMove);
            Laya.stage.off(Laya.Event.MOUSE_UP, handle, unbind);
            Laya.stage.off(Laya.Event.MOUSE_OUT, handle, unbind);
        };

        handle.on(Laya.Event.MOUSE_DOWN, handle, (e: Laya.Event) => {
            grabDX = e.stageX - target.x;
            grabDY = e.stageY - target.y;
            moved = false;
            Laya.stage.on(Laya.Event.MOUSE_MOVE, handle, onMove);
            Laya.stage.on(Laya.Event.MOUSE_UP, handle, unbind);
            Laya.stage.on(Laya.Event.MOUSE_OUT, handle, unbind);
            e.stopPropagation();
        });

        // 拖动后的抬起不构成 CLICK(阻止冒泡, 避免触发面板根的关闭回调)
        handle.on(Laya.Event.CLICK, handle, (e: Laya.Event) => {
            if (moved) { moved = false; e.stopPropagation(); }
        });
    }
}