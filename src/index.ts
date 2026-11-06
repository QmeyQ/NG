/**
 * index - 启动页
 *
 * 流程：
 *   1) 通过 Res.vers 对比本地 / 服务端版本
 *   2) Dialog.showD 询问是否下载初始资源
 *   3) 点“下载” → 监听 Res 的 DP 事件刷新 ProgressBar
 *   4) 下载 + 解压 + 存盘完成后 → 场景跳转到 game/menu
 *   5) 点“取消” → 退出
 */
import { Res } from "./libs/res";
import { Dialog } from "./ui/DIalog";
import { Timer } from "./libs/time";
import { UI } from "./ui/ui";
import { Au } from "./libs/au";
import { SceneNav } from "./libs/nav";
import { Sys } from "./libs/sys";

const { regClass, property } = Laya;

/** 隐私协议同意状态本地存储 key */
const PRIVACY_KEY = "privacyAgreed";
/** 本游戏隐私政策(部署于 normalgame.cn) */
const PRIVACY_URL = "https://normalgame.cn/privacy.html";

/** 隐私协议弹窗正文(以 <html> 前缀走原始 HTML 直通, <a> 可点击触发 LINK) */
const PRIVACY_HTML = `<html>感谢您使用本游戏！开始前，请您仔细阅读并充分理解<a href="${PRIVACY_URL}">《隐私政策》</a>：<br/><br/>` +
    `为向您提供游戏服务，我们将收集以下信息：<br/><br/>` +
    `<font color="#4db2ff">【账号信息】</font>游戏为您自动生成的用户编号与登录密匙，用于标识和保护您的账号。<br/><br/>` +
    `<font color="#4db2ff">【个人资料】</font>您设置的昵称、个性签名与头像，用于游戏内展示。<br/><br/>` +
    `<font color="#4db2ff">【游戏数据】</font>金币、背包内头像、联机对战成绩，用于保存游戏进度与战绩统计。<br/><br/>` +
    `<font color="#4db2ff">【网络信息】</font>您访问服务器时的IP地址，仅用于拦截高频恶意请求。<br/><br/>` +
    `上述信息存储于华为云数据库（中国大陆），经华为云函数与Cloudflare处理，保存期限、第三方服务、您的权利与账号注销方式详见<a href="${PRIVACY_URL}">《隐私政策》</a>。<br/><br/>` +
    `点击“同意”表示您已阅读并同意。选择“拒绝”，我们将不收集上述信息，您也无法进入游戏；您可随时在游戏内“设置→清除数据”注销账号并删除已提供的信息。`;

@regClass()
export class index extends Laya.Script {
    @property(String)
    public text: string = "";

    /** 健康游戏忠告最少停留时长(ms)，策划可调，默认 3 秒 */
    @property(Number)
    public minSplashMs: number = 3000;

    private _progressBar: any = null;
    private _progressText: any = null;
    private _downloading = false;

    /** 隐私协议 CheckBox(GButton Check 模式) */
    private _checkBox: any = null;
    /** 最近一次 title 链接点击时间戳(LINK 派发早于 CLICK 冒泡到 GButton, 用于区分链接点击) */
    private _linkAt: number = 0;
    /** 资源已就绪但因未同意隐私协议被拦截, 同意后自动继续跳转 */
    private _resReady: boolean = false;
    /** 下载确认提示文案(取消后点击页面重弹用) */
    private _dlTip: string = "";
    /** vers 已判定需要下载并询问过 */
    private _asked: boolean = false;
    /** 资源已就绪(本地恢复或下载完成, 进入跳转出口) */
    private _resOk: boolean = false;
    /** 资源检查已发起(同意隐私协议后才查, 防重复发起) */
    private _resChecked: boolean = false;

    /** 启动页进入时间 */
    private _enterTime: number = 0;
    /** 是否已经触发过跳转（防重复） */
    private _jumped: boolean = false;
    /** 等待最小停留时长的定时器 id */
    private _waitTimerId: any = null;

    onStart(): void {
        Dialog.init();
        Res.init();
        // 根场景登记 + 绑返回键(popstate): 返回回退场景, 根场景放行浏览器默认
        SceneNav.init("game/load.ls");

        // 进入启动页即播多轨丰富背景乐(主奏+bass+琶音+鼓组, 全局循环跨场景共用)。
        // 音乐开关持久化读回: 关闭则先关 Au 总开关(bgmPlayRich 内部拦并记 _bgmKind 不启流,
        // 设置页开回时按 kind 恢复); sfxOn 同步读回(tap 等播放入口拦截)
        const savedM = Laya.LocalStorage.getItem("musicOn");
        const savedS = Laya.LocalStorage.getItem("sfxOn");
        if (savedM === "0") Au.setMusic(false);
        if (savedS === "0") Au.setSfx(false);
        Au.bgmPlayRich("main");

        // 记录进入时间，用于后面判断是否到最小停留时长
        this._enterTime = Timer.now();

        console.log(this.owner)
        // 缓存进度条节点
        this._progressBar = UI.findNode(this.owner, "Sprite");
        this._progressText = UI.findNode(this.owner, "show");
        if (this._progressBar) {
            this._progressBar.width = 0;
        } else {
            console.warn('[index] 未找到名为 ProgressBar 的节点');
        }

        Res.on('DP', this._onProgress);

        // —— 隐私协议 CheckBox ——
        this._initPrivacyCheckBox();

        // —— 资源未就绪时点击中央背景板(Sprite_1) → 重弹下载确认 ——
        // 只绑 Sprite_1, 不监听场景根(不截断/不争抢其他控件事件)
        const bg = UI.findNode(this.owner, "Sprite_1");
        bg?.on(Laya.Event.CLICK, this, this._onBgClick);

        // —— 资源检查入口: 已同意隐私协议直接查; 未同意等隐私弹窗确认后再查 ——
        if (this._agreed()) this._checkRes();
        else if (this._progressText) this._progressText.text = "请同意用户隐私协议";
    }

    /**
     * 资源检查(隐私协议同意后发起):
     * vers 对比本地/服务端版本 → 需更新弹下载确认 / 无更新本地恢复后跳转
     */
    private _checkRes(): void {
        if (this._resChecked) return;
        this._resChecked = true;
        // vers 网络探测期间给界面反馈(可能数秒, 无提示体感"卡住无反应")
        if (this._progressText) this._progressText.text = "正在检查资源...";
        Res.vers(Res.ResList.ui, (result) => {
            console.log(result)
            if (result.needUpdate) {
                this._dlTip = `需要下载初始资源${result.size > 0 ? `：[0000ff]${(result.size / 1000000).toFixed(2)}Mb` : `：[0000ff]约 12Mb`}`;
                this._asked = true;
                this._askDownload(this._dlTip);
            } else {
                // 无更新：从本地缓存恢复包信息(Res.url 缓存路径, 缺文件会自动重下), 完成后再跳
                if (this._progressText) this._progressText.text = "正在加载资源...";
                this._downloading = true;
                Res.url(Res.ResList.ui, (list) => {
                    console.log('[index] 本地资源就绪', list);
                    Res.off('DP', this._onProgress);
                    this._downloading = false;
                    if (!list) {
                        Dialog.toast("资源加载失败，请点击屏幕重试");
                        if (this._progressText) this._progressText.text = "加载失败";
                        return;
                    }
                    if (this._progressBar) this._progressBar.width = 860;
                    if (this._progressText) this._progressText.text = "加载完成";
                    this._gotoMenuWithMinDuration();
                });
            }
        });
    }

    // ============================================================
    // 隐私协议
    // ============================================================

    /** 初始化隐私协议 CheckBox: 修正标题链接(heref 拼写/未闭合标签)、绑定 LINK 与勾选逻辑 */
    private _initPrivacyCheckBox(): void {
        this._checkBox = UI.findNode(this.owner, "CheckBox");
        if (!this._checkBox) {
            console.warn('[index] 未找到隐私协议 CheckBox');
            return;
        }
    
        // title 走 GButton.title(同步 _titleStr, selected 翻转后文案不回退)
        // 运行时修正 UI 里的 heref 拼写错误与未闭合的 <a/>
        const tw = UI.findNode(this.owner, "title") as Laya.GTextField;//(this._checkBox as any).titleWidget;
        console.log(tw)
        if (tw) {
            // 场景 CheckBox 未配 html → <a href> 按纯文本渲染无链接区, 必须先开启富文本
            tw.html = true;
            this._checkBox.title = `同意<a href="${PRIVACY_URL}">用户隐私协议</a>`;
            // GTextField 构造内置 textIns LINK 转发, 参数为 href
            tw.on(Laya.Event.LINK, index, (href: string) => {
                if(Timer.invoke("link") < 0 || Timer.invoke("link") > 500)
                    Sys.openLink(href);
                // 记录时间戳: 该次点击的 CLICK 会继续冒泡到 GButton(翻转 selected 并弹窗),
                // _onCheckBoxClick 凭此识别链接点击, 撤销翻转避免"链接页+隐私弹窗"双开
                this._linkAt = Timer.now();
            });
        }

        // Check 模式: CLICK 时 selected 已翻转(GButton._click 先翻转再派发)
        this._checkBox.on(Laya.Event.CLICK, this, this._onCheckBoxClick);

        // 已同意过: 启动直接勾选
        if (this._agreed()) this._checkBox.selected = true;
        else
            this._checkBox.selected = false;
    }

    private _onCheckBoxClick(): void {
        // 必点处手势解锁 AudioContext(网页自动播放策略防静音)
        Au.unlock();
        // 链接点击(LINK 已打开协议页): 撤销 GButton._click 的 selected 翻转, 不弹窗
        if (this._linkAt && Timer.now() - this._linkAt < 500) {
            this._linkAt = 0;
            if (this._checkBox) this._checkBox.selected = !this._checkBox.selected;
            return;
        }
        Au.tap();
        const cb = this._checkBox;
        if (!cb) return;
        if (this._agreed()) {
            // 已同意: 勾上时仍弹隐私窗(随时可重看协议); 弹窗"同意"是资源就绪后停滞的兜底跳转出口, 防卡死
            if (cb.selected && !Dialog.isOpen()) this._showPrivacyDlg();
            // 取消勾选 = 撤回进入许可, 同步用户记录为取消 + 同步提示文本
            if (!cb.selected) {
                this._saveRefused();
                this._syncGateText();
            }
            return;
        }
        if (!cb.selected) return;
        // 首次勾选 → 弹隐私协议全文
        this._showPrivacyDlg();
    }

    /** 弹出隐私协议弹窗(可滚动): 同意=记录并保持勾选; 拒绝=首次流程退出游戏 / 已同意用户仅撤回勾选 */
    private _showPrivacyDlg(): void {
        const first = !this._agreed();
        Dialog.showD(
            PRIVACY_HTML,
            "用户隐私协议",
            "拒绝",
            "同意",
            (key) => {
                if (key === 1) {
                    this._saveAgreed();
                    if (this._checkBox) this._checkBox.selected = true;
                    // _resReady: 未同意被拦截待续跳; _resOk: 资源已就绪但因故未跳(已同意用户的兜底出口)
                    if (this._resReady || this._resOk) this._gotoMenuWithMinDuration();
                    else {
                        // 首次同意且资源未查过 → 此时再检查资源(下载确认由此触发)
                        if (this._progressText) this._progressText.text = "正在检查资源...";
                        this._checkRes();
                    }
                } else {
                    if (this._checkBox) this._checkBox.selected = false;
                    if (first) {
                        // 首次流程拒绝 = 不收集信息无法进入游戏(合规语义): 平台分支退出
                        if (this._progressText) this._progressText.text = "已拒绝用户隐私协议";
                        Sys.back("您已拒绝用户隐私协议，无法进入游戏");
                    } else {
                        // 已同意用户重看协议拒绝 = 撤回进入许可(同步记录为取消), 重新勾选同意后可继续
                        this._saveRefused();
                        this._syncGateText();
                        Dialog.toast("已取消勾选，重新勾选同意后进入游戏");
                    }
                }
            },
            null,
            2,
            { forceDefault: true, panelHRatio: 2 / 3 }
        );
    }

    private _agreed(): boolean {
        try {
            return localStorage.getItem(PRIVACY_KEY) === "1";
        } catch (e) {
            return false;
        }
    }

    private _saveAgreed(): void {
        try {
            localStorage.setItem(PRIVACY_KEY, "1");
        } catch (e) {
            console.warn('[index] 隐私协议状态存储失败', e);
        }
    }

    /** 取消勾选/弹窗拒绝 = 同步用户记录为"已取消隐私政策"("0"; _agreed 判 ==="1" 不受影响) */
    private _saveRefused(): void {
        try {
            localStorage.setItem(PRIVACY_KEY, "0");
        } catch (e) {
            console.warn('[index] 隐私协议状态存储失败', e);
        }
    }

    // ============================================================
    // 资源下载
    // ============================================================

    /** 资源未就绪时点击中央背景板: 重新弹出下载确认框 */
    private _onBgClick(): void {
        Au.unlock();
        Au.tap();
        if (!this._asked || this._resOk || this._downloading) return;
        // 有弹窗(下载框/隐私框)正开着时不叠弹
        if (Dialog.isOpen()) return;
        this._askDownload(this._dlTip);
    }

    /** 下载确认弹窗(未同意隐私协议时拦截并提示, 重新询问) */
    private _askDownload(tip: string): void {
        Dialog.showD(
            tip,
            "资源下载",
            "取消",
            "下载",
            (key) => {
                if (key === 1) {
                    // -------- 点“下载” --------
                    if (!this._gateOk()) {
                        Dialog.toast("请先勾选“同意用户隐私协议”");
                        if (this._checkBox) this._checkBox.selected = false;
                        this._askDownload(tip);
                        return;
                    }
                    Dialog.closeD();
                    this._downloading = true;
                    if (this._progressBar) {
                        this._progressBar.width = 0;
                        this._progressText.text = "下载资源...";
                    }
                    Res.url(Res.ResList.ui, true, (list) => {
                        console.log('[index] 初始资源加载完成', list);
                        Res.off('DP', this._onProgress);
                        this._downloading = false;
                        if (!list) {
                            // 失败不跳转: 复位下载态, 点背景板可重弹下载框
                            Dialog.toast("下载失败，请点击屏幕重试");
                            if (this._progressText) this._progressText.text = "下载失败";
                            if (this._progressBar) this._progressBar.width = 0;
                            return;
                        }

                        if (this._progressBar) this._progressBar.width = 860;
                        if (this._progressText) {
                            this._progressText.text = "加载完成";
                        }

                        // 关键：走统一出口，保证最小停留
                        this._gotoMenuWithMinDuration();
                    });
                } else if (key === 0) {
                    // 取消下载 = 离开游戏(平台分支收口 sys): web 回上一页; 微信退出小游戏
                    if (this._progressText) this._progressText.text = "已取消下载，点击屏幕可重新下载";
                    Sys.back("已取消下载，点击屏幕可重新下载");
                }
            }
        );
    }

    /**
     * menu 预制体加载器: menu.ls 不作独立场景部署(只入 ui.br 包), Res.get 加载后挂 root
     * 条目 url 即 Res 缓存键 "ui/menu.ls"(reset 销毁时同步清缓存)
     * 协议: 失败也回调 null(nav 清缓存自愈重试), promise reject 必须转 done(null)
     */
    private _menuLoader = (done: (node: Laya.Node) => void): void => {
        // done 幂等: 挂载期 onAwake 同步异常会沿 done(node) 上抛触发 catch,
        // 防二次 done(null) 把 nav 推入失败重试协议(状态错乱/recursive set active)
        let doneOnce = false;
        const d = (n: Laya.Node | null) => { if (doneOnce) return; doneOnce = true; done(n); };
        // UI 组件库桥先就绪(场景 _$prefab uuid 引用解析依赖它), 失败不阻断场景加载
        const go = () => {
            Res.get("ui/menu.ls").then((node: any) => {
                console.log('[menu] Res.get resolve:', node ? 'node' : String(node));
                d(node || null);
            }).catch((e: any) => { console.error('[menu] Res.get reject:', e); d(null); });
        };
        go();
    };

    /**
     * 统一跳转出口：
     * - 未同意隐私协议 / 已同意但当前取消勾选：拦截跳转，待重新勾选同意后自动继续
     * - 已经超过最小停留时长：立刻跳
     * - 还没到：用 Timer 等剩余时间，再跳
     * - 已经跳过一次：直接返回，避免重复
     */
    private _gotoMenuWithMinDuration(): void {
        if (this._jumped) return;

        // 进入统一跳转出口 = 资源已就绪(本地恢复或下载完成), 点击页面不再重弹下载框
        this._resOk = true;

        // 同意记录(localStorage)且 CheckBox 当前勾选着才放行: 取消勾选 = 撤回进入许可
        if (!this._gateOk()) {
            this._resReady = true;
            this._syncGateText();
            Dialog.toast("请先勾选“同意用户隐私协议”");
            return;
        }

        const elapsed = Timer.now() - this._enterTime;
        const remain = this.minSplashMs - elapsed;

        if (remain <= 0) {
            this._jumped = true;
            SceneNav.open("ui/menu.ls", undefined, this._menuLoader);
            return;
        }

        // 这段时间里健康游戏忠告继续显示，等时间到了再跳
        this._waitTimerId = Timer.setTimeout(remain, () => {
            if (this._jumped) return;
            // 等待期间取消勾选 = 撤回进入许可, 不跳(重新勾选同意后由 _resOk 出口续跳)
            if (!this._gateOk()) {
                this._waitTimerId = null;
                this._syncGateText();
                Dialog.toast("请先勾选“同意用户隐私协议”");
                return;
            }
            this._jumped = true;
            this._waitTimerId = null;
            SceneNav.open("ui/menu.ls", undefined, this._menuLoader);
        });
    }

    /** 进入游戏闸门: 同意记录(localStorage)存在 且 CheckBox 当前处于勾选状态 */
    private _gateOk(): boolean {
        return this._agreed() && !!this._checkBox && !!this._checkBox.selected;
    }

    /** 隐私闸门未放行时同步提示文本(进入未同意/取消勾选/拒绝) */
    private _syncGateText(): void {
        if (this._gateOk()) return;
        if (this._progressText) this._progressText.text = "请同意用户隐私协议";
    }

    /** 下载进度回调 */
    private _onProgress = (url: string, percent: number, speed: number, loaded: number, total: number): void => {
        if (!this._progressBar) return;
        if (!this._downloading) return;

        this._progressBar.width = percent * 860 / 100;
        if (this._progressText) {
            this._progressText.text = "下载资源:" + this._fmtSize(loaded) + "/" + this._fmtSize(total)
                + "  " + this._fmtSize(speed) + "/s";
        }
    };

    /** 字节数自适应格式化: B/K/M */
    private _fmtSize(n: number): string {
        if (!isFinite(n) || n < 0) n = 0;
        if (n >= 1048576) return (n / 1048576).toFixed(2) + "M";
        if (n >= 1024) return (n / 1024).toFixed(1) + "K";
        return Math.round(n) + "B";
    }

    /** 深度优先查找名为 name 的节点 */
    private _findByName(node: Laya.Node, name: string): Laya.Node | null {
        if (!node) return null;
        if (node.name === name) return node;
        if (node instanceof Laya.Sprite) {
            const n = node.numChildren;
            for (let i = 0; i < n; i++) {
                const found = this._findByName(node.getChildAt(i), name);
                if (found) return found;
            }
        }
        return null;
    }

    onDestroy(): void {
        Res.off('DP', this._onProgress);

        // 清掉等待跳转的定时器，避免切场景后回调打到已销毁对象上
        if (this._waitTimerId != null) {
            Timer.clear(this._waitTimerId);
            this._waitTimerId = null;
        }
    }
}