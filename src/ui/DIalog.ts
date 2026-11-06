/**
 * PublicUI - 全局公共 UI（静态类）
 *
 * 使用前需要先调用一次 Dialog.init(stage)。
 *
 * Dialog.toast(text, duration?, background?, font?)
 * Dialog.showD(text, boxType?, cancelText?, confirmText?, callback?)
 *
 * showD 文本支持颜色标记：
 *   [00ff00]绿色文字[000000]黑色文字
 *   【00ff00】绿色文字[000000]黑色文字
 *
 * showD callback：
 *   0 = 取消
 *   1 = 确认
 *   3 = 点击 lh 面板根节点其它区域（业务自定义）
 *
 * showD 样式：
 *   - 不传 / 字符串 → 使用 STYLES[0]（默认 lh）
 *   - 传数字 n      → 使用 STYLES[n]
 *   数字通过 cancelText 参数传入（不新增参数位）。
 *   cancelText 传数字时，取消按钮默认显示 "取消"。
 *
 * lh 面板约定（全部可选，name 大小写敏感，深度优先查找）：
 *   - txt    → 正文
 *   - label  → 提示框类型
 *   - btn    → 取消按钮，点击 → callback(0)
 *   - img_1  → 确认按钮，点击 → callback(1)
 *   - head   → 拖动把手
 *   - 根节点其它区域点击 → callback(3)
 *
 * 拖动支持：
 *   - 程序化面板：标题栏为把手
 *   - 样式面板：若存在子节点 "head"，则以 head 为把手
 */

import { Timer } from "../libs/time";
import { Res } from "../libs/res";
import { UI } from "./ui";
import { Au } from "../libs/au";
import { Sys } from "../libs/sys";

/**
 * 对话框回调
 * - 0 = 取消（btn）
 * - 1 = 确认（img_1）
 * - 3 = 点击 lh 面板根节点其它区域
 */
export type DialogCallback = (index: 0 | 1 | 3) => void;

export interface ToastFontOptions {
    family?: string;
    size?: number;
    color?: string;
    bold?: boolean;
}

/** showD 扩展选项 */
export interface DialogShowOptions {
    /** 强制程序化默认面板(忽略 lh 样式, cancelText 仍作按钮文案) */
    forceDefault?: boolean;
    /** 程序化面板高度占屏高比例(如 2/3), 不传走默认 0.42 封顶 360 */
    panelHRatio?: number;
}

export class Dialog {

    private static _toastLayer: Laya.GBox;
    private static _dialogLayer: Laya.GBox;
    private static _toastTimer: any = null;
    /** toast 隐藏定时器 id(Timer) */
    private static _toastTid: string | null = null;
    /** 当前弹窗 root(遮罩+事件拦截, resize 时重设尺寸) */
    private static _curRoot: Laya.GBox | null = null;
    /** 当前 lh 样式面板重适配上下文(pw/ph=视觉框尺寸, cx/cy=视觉框中心本地坐标, ax/ay=锚点本地坐标) */
    private static _styledCtx: { panel: Laya.Sprite; pw: number; ph: number; cx: number; cy: number; ax: number; ay: number; fixed: number } | null = null;
    /** 当前弹窗的 lh 样式缓存键(关闭时 Res.clear 清尸体, 下次 get 重新加载预制体重建) */
    private static _curStyleKey: string | null = null;


    /**
     * 样式数组：index 越大优先级越低（只作为查找表）。
     * 通过 cancelText 传数字下标访问。
     *   STYLES[0]  默认 lh 面板(字符串按钮文案的调用也走此样式)
     *   STYLES[1..] 业务可自行追加
     *
     * 显式传 cancelText 为 "" 或 null 时强制使用程序化面板（不依赖任何 lh）。
     */
    private static readonly STYLES: (string | null)[] = [
        "ui/dialog/dialog.lh",   //0
    ];

    private constructor() { }

    /**
     * 初始化。整个应用生命周期只需调用一次。
     */
    public static init(): void {
        if (Dialog._toastLayer) return;
        Dialog._toastLayer = new Laya.GBox();
        Dialog._toastLayer.mouseEnabled = false;
        Dialog._toastLayer.mouseThrough = true;
        Dialog._toastLayer.zIndex = 200;
        Laya.stage.addChild(Dialog._toastLayer);

        Dialog._dialogLayer = new Laya.GBox();
        Dialog._dialogLayer.zIndex = 100;
        Dialog._dialogLayer.mouseEnabled = true;
        Laya.stage.addChild(Dialog._dialogLayer);
        Dialog._dialogLayer.visible = false;

        Dialog._resize();
        Laya.stage.on(Laya.Event.RESIZE, Dialog, Dialog._resize);
    }

    private static _resize(): void {
        if (!Laya.stage) return;
        Dialog._toastLayer.size(Laya.stage.width, Laya.stage.height);
        Dialog._dialogLayer.size(Laya.stage.width, Laya.stage.height);
        // 弹窗打开期间窗口变化: root 遮罩重设尺寸 + lh 样式面板重算自适应缩放
        const root = Dialog._curRoot;
        if (root && !root.destroyed) {
            root.size(Laya.stage.width, Laya.stage.height);
            root.background = Laya.DrawRectCmd.create(0, 0, Laya.stage.width, Laya.stage.height, "rgba(0,0,0,0.58)", null, 0);
        }
        if (Dialog._styledCtx) Dialog._fitStyledPanel();
    }

    /** lh 样式面板按窗口自适应等比缩放并居中(fixed>0 时用固定倍数)
     *  基准为视觉框(img 背景图框)尺寸; 居中按视觉框中心对齐屏幕中心(兼容面板锚点) */
    private static _fitStyledPanel(): void {
        const ctx = Dialog._styledCtx;
        if (!ctx || !ctx.panel || ctx.panel.destroyed) return;
        let sc = ctx.fixed;
        if (!sc || sc <= 0) {
            sc = Math.min(Laya.stage.width * 0.84 / ctx.pw, Laya.stage.height * 0.7 / ctx.ph);
            sc = Math.max(0.1, Math.min(3, sc));
        }
        if (sc !== 1) ctx.panel.scaleX = ctx.panel.scaleY = sc;
        // 锚点(缩放中心)本地坐标为(ax,ay), 视觉框中心本地坐标为(cx,cy):
        // 面板.x 为锚点世界位置, 使视觉框中心落到屏幕中心
        ctx.panel.x = Laya.stage.width * 0.5 - (ctx.cx - ctx.ax) * sc;
        ctx.panel.y = Laya.stage.height * 0.5 - (ctx.cy - ctx.ay) * sc;
    }

    private static _fontSize(size?: number): number {
        return size ?? Math.max(20, Math.round(Math.min(Laya.stage.width, Laya.stage.height) * 0.045));
    }

    /** 面板拖动(通用实现在 UI.makeDraggable; bounds 支持静态对象或动态 getter) */
    private static _makeDraggable(
        panel: Laya.Sprite,
        handle: Laya.Sprite,
        bounds?: { minX: number; minY: number; maxX: number; maxY: number } | (() => { minX: number; minY: number; maxX: number; maxY: number })
    ): void {
        UI.makeDraggable(panel, handle, bounds);
    }

    // ============================================================
    // 富文本
    // ============================================================

    /**
     * 把带颜色标记的文本转成 HTML。
     * 生成 <span style="color:#xxxxxx">，供 GTextField(html:true) 渲染。
     */
    private static _parseRichText(text: string): string {
        const s = text.replace(/【([0-9a-fA-F]{6})】/g, "[$1]");
        const tokens = /(\[[0-9a-fA-F]{6}\])/g;
        const parts = s.split(tokens);

        let html = "";
        let hasColor = false;

        for (const part of parts) {
            const m = /^\[([0-9a-fA-F]{6})\]$/.exec(part);
            if (m) {
                if (hasColor) html += "</span>";
                html += `<span style="color:#${m[1]}">`;
                hasColor = true;
            } else {
                html += Dialog._escapeHtml(part).replace(/\n/g, "<br/>");
            }
        }

        if (hasColor) html += "</span>";
        return html;
    }

    private static _escapeHtml(value: string): string {
        return value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    /**
     * 创建富文本控件(新 UI GTextField, html 渲染)。
     * 颜色标记已由 _parseRichText 转为 <span> HTML。
     */
    private static _createRichText(
        richHtml: string,
        opts: {
            fontSize: number;
            color: string;
            family?: string;
            bold: boolean;
            align?: string;
            valign?: string;
        }
    ): Laya.GTextField {
        const tf = new Laya.GTextField();
        tf.html = true;
        tf.font = opts.family || "Arial";
        tf.fontSize = opts.fontSize;
        tf.color = opts.color;
        tf.bold = opts.bold;
        tf.align = opts.align || "center";
        tf.valign = opts.valign || "middle";
        tf.wordWrap = true;
        tf.leading = 4;
        tf.text = richHtml;
        return tf;
    }

    // ============================================================
    // toast
    // ============================================================

    /**
     * toast
     * @param text 文本
     * @param duration 显示时间，默认 1500ms
     * @param background 图片 key 或颜色；颜色支持 ff00ff / #ff00ff，默认黑色
     * @param font 字体参数，不传则动态计算字号
     */
    /** 更新当前弹窗正文文本(下载进度等动态文案)。无弹窗或找不到正文节点时静默忽略 */
    public static updateBody(text: string): void {
        const root = Dialog._curRoot;
        if (!root) return;
        const node = Dialog._findByName(root, "txt") || Dialog._findByName(root, "body");
        if (node) (node as any).text = text;
    }

    public static toast(
        text: string,
        duration: number = 1500,
        background: string = "#000000",
        font?: ToastFontOptions
    ): Laya.Node {
        // 清掉待执行的隐藏定时器
        if (Dialog._toastTid != null) { Timer.clear(Dialog._toastTid); Dialog._toastTid = null; }
        Dialog._toastTimer = null;

        // 销毁所有残留 toast(旧实现只清 timer 不销毁 box, 会导致旧 toast 一直卡在屏幕上)
        while (Dialog._toastLayer.numChildren > 0) {
            (Dialog._toastLayer.getChildAt(0) as Laya.Node).destroy();
        }

        // 场景切换后 toast 层可能被新场景盖住, 重新提到 stage 最顶层
        if (Dialog._toastLayer.parent) Laya.stage.addChild(Dialog._toastLayer);

        const box = new Laya.GBox();
        box.mouseEnabled = false;
        box.mouseThrough = true;

        // toast 箱高按窗口高度自适应(屏高 4%, 旧版 16% 的 1/4)
        const boxH = Laya.stage.height * 0.04;

        const label = Dialog._createRichText(
            Dialog._parseRichText(text),
            {
                // 字号随窗口自适应, 且受箱高约束防溢出(约为箱高 70%)
                fontSize: Math.min(Dialog._fontSize(font?.size), Math.max(12, Math.round(boxH * 0.7))),
                color: font?.color || "#ffffff",
                family: font?.family,
                bold: font?.bold ?? false,
                align: "center",
                valign: "middle",
            }
        );

        label.width = Math.min(Laya.stage.width * 0.82, 1000);
        label.height = boxH;

        box.addChild(label);
        Dialog._toastLayer.addChild(box);

        box.width = label.width;
        box.height = label.height;

        box.x = (Laya.stage.width - box.width) * 0.5;
        box.y = Laya.stage.height * 0.70 - box.height * 0.5;

        Dialog._applyBackground(box, background);

        Dialog._toastTimer = box;
        Dialog._toastTid = Timer.setTimeout(Math.max(0, duration), Dialog._hideToast);

        return box;
    }

    private static _applyBackground(node: Laya.GBox, background: string): void {
        if (!background) background = "#000000";

        const normalized = background.startsWith("#")
            ? background
            : `#${background}`;

        if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
            node.background = Laya.DrawRectCmd.create(0, 0, node.width, node.height, normalized, null, 0);
            return;
        }

        // 不是颜色，则当作图片 key。
        Laya.loader.load(background, Laya.Handler.create(Dialog, (tex: any) => {
            if (!tex || node.destroyed) return;

            const bg = new Laya.GImage();
            // GImage 渲染走 comp(FrameAnimation) 的 atlas 通道
            const atlas = new Laya.AtlasResource(background, [tex], [tex]);
            (bg as any).comp.setAtlas(atlas);
            bg.size(node.width, node.height);
            bg.mouseEnabled = false;
            node.addChildAt(bg, 0);
        }));
    }

    private static _hideToast(): void {
        if (!Dialog._toastTimer) return;
        const node = Dialog._toastTimer as Laya.Node;
        Dialog._toastTimer = null;
        if (!node.destroyed) node.destroy();
    }

    // ============================================================
    // showD
    // ============================================================

    /** text 以此前缀开头时按原始 HTML 处理(不转义, 支持 <a href>/LINK 事件) */
    private static readonly HTML_PREFIX: string = "<html>";

    /**
     * showD
     * @param text         支持 [00ff00]xx[000000]xx 或 【00ff00】xx[000000]xx;
     *                     以 "<html>" 开头则视为原始 HTML 串(内嵌 <a href> 等, 不做转义)
     * @param boxType      对话框标题/类型，默认“提示框”
     * @param cancelText   取消按钮文案；传数字时作为 STYLES 下标选样式(按钮显示“取消”)；
     *                     传字符串时按钮显示该文案, 样式走 STYLES[0];
     *                     显式传 ""/null 时强制程序化面板
     * @param confirmText  确认按钮文本；不传时只有一个居中的取消按钮
     * @param callback     0=取消 / 1=确认 / 3=点击面板其它区域
     * @param onPanel      lh 样式面板就绪后的回调(传入面板根节点, 程序化面板/失败传 null),
     *                     供调用方定制面板内容(如头像列表)
     * @param panelScale   lh 样式面板整体缩放: 默认 0=按窗口大小自适应等比缩放; 传正值用固定倍数
     * @param opts         扩展选项: forceDefault 强制程序化面板; panelHRatio 程序化面板高度占屏比
     */
    public static showD(
        text: string,
        boxType: string = "提示框",
        cancelText: string | number = "取消",
        confirmText?: string,
        callback?: DialogCallback,
        onPanel?: (panel: Laya.Sprite | null) => void,
        panelScale: number = 0,
        opts?: DialogShowOptions
    ): Laya.GBox {
        Dialog._closeDialog();

        // —— "<html>" 前缀: 原始 HTML 直通(不转义) ——
        let isRawHtml = false;
        let bodyText = text;
        if (typeof text === "string" && text.startsWith(Dialog.HTML_PREFIX)) {
            isRawHtml = true;
            bodyText = text.slice(Dialog.HTML_PREFIX.length);
        }

        // —— 解析 cancelText ——
        // 数字   → STYLES[n] 样式, 按钮文案固定"取消"
        // 字符串 → 按钮文案, 样式默认 STYLES[0](存在 style 弹窗则不用默认程序化面板)
        // ""/null → 强制程序化面板(不依赖任何 lh)
        let styleKey: string | null = null;
        let realCancelText: string = "取消";

        if (typeof cancelText === "number" && Number.isInteger(cancelText)) {
            styleKey = (Dialog.STYLES[cancelText] as string) ?? null;
            realCancelText = "取消";
        } else {
            realCancelText = (cancelText as string) || "取消";
            // 显式传 ""/null 强制程序化面板; 否则默认取 STYLES[0]
            if (cancelText !== "" && cancelText !== null && cancelText !== undefined) {
                styleKey = (Dialog.STYLES[0] as string) ?? null;
            }
        }

        // 1) 全屏 root（事件拦截 + 遮罩一体）
        // 注意: 禁止半透明子容器(alpha<1 触发引擎离屏合成, 进程不稳定)
        // 遮罩视觉走 root 自身绘制指令级 rgba(canvas fillStyle 直传, 无离屏合成)
        const root = new Laya.GBox();
        root.size(Laya.stage.width, Laya.stage.height);
        root.mouseEnabled = true;
        root.background = Laya.DrawRectCmd.create(0, 0, Laya.stage.width, Laya.stage.height, "rgba(0,0,0,0.58)", null, 0);

        Dialog._dialogLayer.addChild(root);
        Dialog._dialogLayer.visible = true;
        Dialog._curRoot = root;

        // 2) 无 style 或强制程序化 → 程序化面板
        if (!styleKey || opts?.forceDefault) {
            Dialog._curStyleKey = null;
            Dialog._buildDefaultPanel(root, bodyText, boxType, realCancelText, confirmText, callback, isRawHtml, opts?.panelHRatio);
            if (onPanel) onPanel(null);
            return root;
        }

        // 3) 有 style → 通过 Res 异步加载 lh 面板
        // (用户规格: 关闭弹窗时销毁整个弹窗对象, _closeDialog 会 destroy root(含 panel)并
        //  Res.clear(styleKey) 清缓存尸体——下次 get 重新加载预制体重新构建全新实例)
        Dialog._curStyleKey = styleKey;
        Res.get(styleKey).then((panelNode: Laya.Sprite) => {
            if (!panelNode || root.destroyed) {
                // 弹窗已关(异步竞态): 悬空的新建 panelNode 一并销毁防泄漏; 缓存键由 _closeDialog 已清
                if (panelNode && !panelNode.destroyed) panelNode.destroy();
                if (!root.destroyed) {
                    Dialog._buildDefaultPanel(root, bodyText, boxType, realCancelText, confirmText, callback, isRawHtml);
                }
                if (onPanel) onPanel(null);
                return;
            }
            Dialog._buildStyledPanel(root, panelNode, bodyText, boxType, realCancelText, confirmText, callback, panelScale, isRawHtml);
            if (onPanel) onPanel(panelNode);
        }).catch((err: any) => {
            console.warn(`[Dialog] 加载样式 "${styleKey}" 失败，回退到默认面板:`, err);
            if (root.destroyed) return;
            Dialog._buildDefaultPanel(root, bodyText, boxType, realCancelText, confirmText, callback, isRawHtml, opts?.panelHRatio);
            if (onPanel) onPanel(null);
        });

        return root;
    }

    // ============================================================
    // 面板构建
    // ============================================================

    /**
     * 用 lh 面板渲染对话框
     * - 定位到屏幕正中央
     * - 子控件 "txt"   → showD 的正文
     * - 子控件 "label" → showD 的 boxType
     * - 子控件 "btn"   → 取消 → callback(0)
     * - 子控件 "img_1" → 确认 → callback(1)
     * - 子控件 "head"（可选）→ 拖动把手
     * - 根节点其它区域点击 → callback(3)
     *
     * 冒泡约定：
     *   btn / img_1 的点击都会 stopPropagation()，避免再次冒泡到根节点触发 callback(3)。
     */
    private static _buildStyledPanel(
        root: Laya.GBox,
        panel: Laya.Sprite,
        text: string,
        boxType: string,
        cancelText: string,
        confirmText: string | undefined,
        callback?: DialogCallback,
        panelScale?: number,
        isRawHtml: boolean = false
    ): void {
        root.addChild(panel);

        // —— 面板缓存单例状态归一化: 还原 .lh 默认态 ——
        // (txt 显示 / gList·inp 隐藏; 上一个弹窗(如头像框)的 onPanel 改过 visible 会残留,
        //  后续弹窗复用同一面板就会"弹出头像框"。onPanel 在本函数之后回调, 仍可自行覆盖)
        const gListNode = Dialog._findByName(panel, "gList") as Laya.Sprite;
        if (gListNode) gListNode.visible = false;
        const inpNode = Dialog._findByName(panel, "inp") as Laya.Sprite;
        if (inpNode) inpNode.visible = false;
        const txtReset = Dialog._findByName(panel, "txt") as Laya.Sprite;
        if (txtReset) txtReset.visible = true;

        // —— 缩放基准: 先取 img 背景图框实际尺寸(视觉框), 缺失回退面板尺寸/bounds ——
        // lh 面板 Root 只是逻辑占位(如 dialog.lh 400x400), 实际视觉框是 img(1420x862)
        const p: any = panel;
        const ax = p.width * (p.anchorX || 0);
        const ay = p.height * (p.anchorY || 0);
        let pw = p.width || 0;
        let ph = p.height || 0;
        let cx = pw * 0.5;
        let cy = ph * 0.5;
        const imgNode: any = Dialog._findByName(panel, "img");
        if (imgNode && imgNode.width > 0 && imgNode.height > 0) {
            // img 自身带缩放时取显示尺寸
            const iw = imgNode.width * (imgNode.scaleX || 1);
            const ih = imgNode.height * (imgNode.scaleY || 1);
            pw = iw;
            ph = ih;
            cx = imgNode.x + iw * 0.5;
            cy = imgNode.y + ih * 0.5;
        } else if (!pw || !ph) {
            const b = panel.getBounds();
            pw = b.width;
            ph = b.height;
            cx = pw * 0.5;
            cy = ph * 0.5;
        }

        // —— 整体缩放 + 居中: 自适应(默认)或固定倍数 ——
        // 自适应: 视觉框(img)适配到舞台(宽 84% / 高 70% 取小), 等比缩放封顶 0.1~3
        // 窗口 resize 时由 _resize 按上下文重算(仅自适应模式)
        const fixed = (panelScale && panelScale > 0) ? panelScale : 0;
        Dialog._styledCtx = { panel, pw, ph, cx, cy, ax, ay, fixed };
        Dialog._fitStyledPanel();

        // —— 根节点点击 → callback(3) ——
        // Res.get 返回缓存实例, 重复弹窗会叠加监听器, 绑定前先清掉本类旧监听
        panel.mouseEnabled = true;
        panel.offAllCaller(Dialog);
        panel.on(Laya.Event.CLICK, Dialog, (e: Laya.Event) => {
            Au.tap();
            e.stopPropagation();
            callback?.(3);
            Dialog._closeDialog();
        });

        // —— txt → 正文 ——
        const txtNode = Dialog._findByName(panel, "txt");
        if (txtNode) {
            if (isRawHtml) {
                // 原始 HTML 直通(不转义, 保留 <a href> 供 LINK 事件)
                Dialog._setRichText(txtNode, text);
            } else if (Dialog._isRichTextNode(txtNode)) {
                Dialog._setRichText(txtNode, Dialog._parseRichText(text));
            } else {
                Dialog._setLabelText(txtNode, text);
            }
        }

        // —— label → 提示框类型 ——
        const typeNode = Dialog._findByName(panel, "label");
        if (typeNode) {
            Dialog._setLabelText(typeNode, boxType || "提示框");
        }

        // —— btn → 取消 → callback(0) ——
        const btnCancel = Dialog._findByName(panel, "btn");
        if (btnCancel) {
            Dialog._setLabelText(btnCancel, cancelText);
            btnCancel.offAllCaller(Dialog);
            btnCancel.on(Laya.Event.CLICK, Dialog, (e: Laya.Event) => {
                Au.tap();
                e.stopPropagation();
                callback?.(0);
                Dialog._closeDialog();
            });
        }

        // —— ok(Image_1/img_1) → 确认按钮 ——
        // 新 UI dialog.lh 确认按钮为 GImage "ok"(旧名 Image_1/img_1 兼容)
        // 有 confirmText → callback(1); 单按钮场景也绑定(取消语义 callback(0)), 保证按钮始终可点
        const imgConfirm = Dialog._findByName(panel, "Image_1") || Dialog._findByName(panel, "img_1") || Dialog._findByName(panel, "ok");
        if (imgConfirm) {
            imgConfirm.offAllCaller(Dialog);
            if (confirmText !== undefined) {
                Dialog._setLabelText(imgConfirm, confirmText);
                imgConfirm.on(Laya.Event.CLICK, Dialog, (e: Laya.Event) => {
                    Au.tap();
                    e.stopPropagation();
                    callback?.(1);
                    Dialog._closeDialog();
                });
            } else {
                imgConfirm.on(Laya.Event.CLICK, Dialog, (e: Laya.Event) => {
                    Au.tap();
                    e.stopPropagation();
                    callback?.(0);
                    Dialog._closeDialog();
                });
            }
        }

        // —— 拖动把手: img(背景图) / head 旧名兼容 ——
        // 【严禁模糊匹配 "Sprite"/"Image"】: gList item 里有 name="Sprite" 的黑框节点,
        // 深度优先会命中隐藏 gList 内的错误节点 → 真把手拖不动 + 点 gList 区域触发错误拖动
        // (bounds 把锚点坐标当视觉框左上角 clamp, 首次 move 即跳左)
        const head = Dialog._findByName(panel, "img") || Dialog._findByName(panel, "head");
        if (head && head instanceof Laya.Sprite) {
            head.offAllCaller(head);
            const h: any = head;
            // 边界动态求值: panel.x 语义=锚点位置, 视觉框(把手)相对锚点有偏移;
            // 缩放 resize 后会变, 实时取 panel.scaleX(静态快照会过期)——视觉框贴屏边界
            Dialog._makeDraggable(panel, head, () => {
                const sc = panel.scaleX || 1;
                const offL = (h.x - ax) * sc;
                const offT = (h.y - ay) * sc;
                const offR = (h.x + h.width * (h.scaleX || 1) - ax) * sc;
                const offB = (h.y + h.height * (h.scaleY || 1) - ay) * sc;
                return {
                    minX: -offL,
                    minY: -offT,
                    maxX: Math.max(-offL, Laya.stage.width - offR),
                    maxY: Math.max(-offT, Laya.stage.height - offB),
                };
            });
        }
    }

    /**
     * 程序化构建默认面板（不依赖任何 lh 资源，全部新 UI 控件）。
     * 白底黑字；标题栏可拖动、单按钮居中 / 双按钮左右布局；
     * 正文区 GPanel+Scroller(滚动条仅滚动时可见), 溢出内容裁剪可滚动。
     */
    private static _buildDefaultPanel(
        root: Laya.GBox,
        text: string,
        boxType: string,
        cancelText: string,
        confirmText: string | undefined,
        callback?: DialogCallback,
        isRawHtml: boolean = false,
        panelHRatio?: number
    ): void {
        const panelW = Math.min(Laya.stage.width * 0.84, 760);
        // 自定义比例: 按屏高取比例; 默认: 0.42 且封顶 360
        const panelH = (panelHRatio && panelHRatio > 0 && panelHRatio <= 1)
            ? Math.round(Laya.stage.height * panelHRatio)
            : Math.min(Laya.stage.height * 0.42, 360);

        const panel = new Laya.GBox();
        panel.size(panelW, panelH);
        panel.pos((Laya.stage.width - panelW) * 0.5, (Laya.stage.height - panelH) * 0.5);
        panel.background = Laya.DrawRectCmd.create(0, 0, panelW, panelH, "#ffffff", "#c0c0c0", 2);
        root.addChild(panel);

        const title = new Laya.GTextField();
        title.text = boxType || "提示框";
        title.fontSize = Dialog._fontSize() * 1.05;
        title.color = "#000000";
        title.bold = true;
        title.align = "center";
        title.valign = "middle";
        title.size(panelW - 40, 60);
        title.pos(20, 16);
        panel.addChild(title);

        // —— 正文容器: GPanel + Scroller(仅滚动时可见滚动条), 内容溢出时裁剪可滚动 ——
        const buttonH = 56;
        // 按钮贴底(底距 14), 与正文区拉开 20 间隙, 不挤内容框
        const buttonY = panelH - buttonH - 14;
        const contentW = panelW - 64;
        const maxContentH = buttonY - 82 - 20;

        const contentPanel = new Laya.GPanel();
        contentPanel.size(contentW, maxContentH);
        contentPanel.pos(32, 82);
        panel.addChild(contentPanel);

        // GPanel 自带 scroller 属性配置 scroller 实例(setter 自动绑 owner 并创建滚动条)
        const sc = new Laya.Scroller();
        sc.direction = Laya.ScrollDirection.Vertical;
        sc.barDisplay = Laya.ScrollBarDisplay.OnScroll;
        contentPanel.scroller = sc;

        // 正文 GTextField: width → text → fitContent=Height 撑高(驱动 GPanel 内容尺寸)
        const content = new Laya.GTextField();
        content.name = "body";
        content.html = true;
        content.font = "Arial";
        content.fontSize = Dialog._fontSize() * 0.95;
        content.color = "#000000";
        content.align = "left";
        content.valign = "top";
        content.wordWrap = true;
        content.leading = 4;
        content.width = contentW - 14;
        content.text = isRawHtml ? text : Dialog._parseRichText(text);
        content.fitContent = Laya.TextFitContent.Height;
        contentPanel.addChild(content);

        // 通用 LINK 跳转(平台分支收口 sys: web 新窗口 / 微信复制剪贴板)
        content.on(Laya.Event.LINK, Dialog, (href: string) => {
            Sys.openLink(href);
        });

        // —— 按钮: 双按钮对称分居两侧(按面板宽度取边距), 单按钮居中 ——
        // 窄屏自适应: 边距 24~60, 按钮宽按剩余空间封顶 150
        const btnMargin = Math.max(24, Math.min(60, panelW * 0.08));
        const buttonW = Math.min(150, (panelW - btnMargin * 2 - 24) / 2);

        if (confirmText !== undefined) {
            const btnCancel = Dialog._makeButton(cancelText, buttonW, buttonH);
            btnCancel.pos(btnMargin, buttonY);
            btnCancel.on(Laya.Event.CLICK, Dialog, (e: Laya.Event) => {
                Au.tap();
                e.stopPropagation();
                callback?.(0);
                Dialog._closeDialog();
            });
            panel.addChild(btnCancel);

            const btnConfirm = Dialog._makeButton(confirmText, buttonW, buttonH);
            btnConfirm.pos(panelW - btnMargin - buttonW, buttonY);
            btnConfirm.on(Laya.Event.CLICK, Dialog, (e: Laya.Event) => {
                Au.tap();
                e.stopPropagation();
                callback?.(1);
                Dialog._closeDialog();
            });
            panel.addChild(btnConfirm);
        } else {
            const btnSingle = Dialog._makeButton(cancelText, buttonW, buttonH);
            btnSingle.pos((panelW - buttonW) * 0.5, buttonY);
            btnSingle.on(Laya.Event.CLICK, Dialog, (e: Laya.Event) => {
                Au.tap();
                e.stopPropagation();
                callback?.(0);
                Dialog._closeDialog();
            });
            panel.addChild(btnSingle);
        }


        // —— 拖动把手: 标题栏 ——
        Dialog._makeDraggable(panel, title as any, {
            minX: 0,
            minY: 0,
            maxX: Math.max(0, Laya.stage.width - panelW),
            maxY: Math.max(0, Laya.stage.height - panelH),
        });
    }

    // ============================================================
    // 工具方法
    // ============================================================

    /**
     * 深度优先查找名为 name 的子节点。
     * Laya 的 getChildByName 只查直接子节点，跨版本行为不一致，
     * 这里自己实现，保证从 lh 加载后能准确命中 "txt" / "label" / "btn" / "img_1" / "head"。
     */
    private static _findByName(node: Laya.Node, name: string): Laya.Node | null {
        if (!node) return null;
        if (node.name === name) return node;
        if (node instanceof Laya.Sprite) {
            const n = node.numChildren;
            for (let i = 0; i < n; i++) {
                const found = Dialog._findByName(node.getChildAt(i), name);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * 把纯文本写入节点或它的第一个可写 text 子节点（duck typing）。
     *
     * 命中顺序：
     *   1. 节点自身带可写 text 属性（Label / Text / GTextField / RichText）
     *   2. 深度优先找到第一个带 text 属性的子节点并写入
     *
     * 不用 instanceof 的原因：
     *   - GTextField 是新 UI 组件，不继承自旧 Laya.Label
     *   - 不同版本 Laya 的 Text / Label 继承链不一致
     *   - duck typing 更稳妥，且只看 text 字段，开销极小
     */
    private static _setLabelText(node: Laya.Node, text: string): void {
        if (!node || !text) return;

        const anyNode = node as any;
        if (typeof anyNode.text === "string") {
            anyNode.text = text;
            return;
        }

        if (node instanceof Laya.Sprite) {
            const n = node.numChildren;
            for (let i = 0; i < n; i++) {
                const child = node.getChildAt(i) as any;
                if (child && typeof child.text === "string") {
                    child.text = text;
                    return;
                }
            }
        }
    }

    /**
     * 判断节点是否为“富文本类”控件（text 直接按 HTML 解析）。
     * GTextField 开启 html 后 text 即富文本通道。
     */
    private static _isRichTextNode(node: Laya.Node): boolean {
        const anyNode = node as any;
        return typeof anyNode.innerHTML === "string"
            || (anyNode.html === true && typeof anyNode.text === "string");
    }

    /**
     * 把 HTML 串写入富文本节点（带 innerHTML 或 html:true 的 GTextField）。
     */
    private static _setRichText(node: Laya.Node, html: string): void {
        const anyNode = node as any;
        if (typeof anyNode.innerHTML === "string") anyNode.innerHTML = html;
        else if (typeof anyNode.htmlText === "string") anyNode.htmlText = html;
        else if (typeof anyNode.text === "string") anyNode.text = html;
    }

    private static _makeButton(text: string, width: number, height: number): Laya.GTextField {
        const button = new Laya.GTextField();
        button.text = text || "";
        button.size(width, height);
        button.fontSize = Dialog._fontSize();
        button.color = "#000000";
        button.bold = true;
        button.align = "center";
        button.valign = "middle";
        button.background = Laya.DrawRectCmd.create(0, 0, width, height, "#e8e8e8", "#b0b0b0", 1);
        return button;
    }

    public static closeD(): void {
        Dialog._closeDialog();
    }

    /** 当前是否有弹窗正在显示(showD 打开且未关闭) */
    public static isOpen(): boolean {
        return Dialog._dialogLayer != null
            && Dialog._dialogLayer.visible
            && Dialog._dialogLayer.numChildren > 0;
    }

    private static _closeDialog(): void {
        // 用户规格: 关闭弹窗时销毁整个弹窗对象——root destroy(panel 连带销毁);
        // 再弹时 Res.get 重新加载预制体重新构建(全新实例, 池节点/__img 标记全新)。
        // 【缓存尸体坑(根治"第二次头像消失只剩框")】: panel 是 Res 缓存单例, destroy 后
        // _cache 仍持 destroyed 实例 → 二次 get 直返尸体(只判 null 不拦 destroyed) →
        // 半瘫渲染: 描边 graphics 指令残留可画(框), 纹理链已断(头像丢)——
        // destroy 后必须同步 Res.clear(styleKey) 清键(nav.ts 预制体尸体自愈同款)
        const root = Dialog._curRoot;
        const styleKey = Dialog._curStyleKey;
        Dialog._curRoot = null;
        Dialog._styledCtx = null;
        Dialog._curStyleKey = null;
        if (!Dialog._dialogLayer) return;
        Dialog._dialogLayer.visible = false;
        Dialog._dialogLayer.removeChildren();
        if (root && !root.destroyed) root.destroy();
        if (styleKey) Res.clear(styleKey);
    }
}