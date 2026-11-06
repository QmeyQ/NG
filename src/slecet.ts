const { regClass, property } = Laya;

import { Res } from "./libs/res";
import { UI } from "./ui/ui"
import { Dialog } from "./ui/DIalog";
import { Cloud, CloudUser } from "./libs/cloud";
import * as NetBoot from "./libs/netboot";
import { Au } from "./libs/au";
import { SceneNav } from "./libs/nav";
import { Timer } from "./libs/time";
import { MT, ProgModel } from "./libs/MT";
import { QA } from "./libs/gobe/qa";

@regClass()
export class slecet extends Laya.Script {

    public camera: Laya.Camera2D;
    public pageCtrl: Laya.Controller;
    public gameNode: Laya.GList;
    /** 游戏列表数据源(自管, GList 无 array) */
    private _gameImgs: string[] = [];
    /** 当前选中游戏索引 */
    private _selIdx: number = 0;
    public oldBox: Laya.GBox;
    public oldImg: Laya.GImage;
    private oldS: number;
    /** 选中图标设中心轴心前的原始状态(pivot/x/y), 还原时一并恢复 */
    private _anc: { img: any; px: number; py: number; x: number; y: number } | null = null;
    /** 页面容器 item0~item4(手动 visible 切页, Controller 断链兜底) */
    private _pages: (Laya.GBox | null)[] = [];


    // —— 用户系统 ——
    private nameInp: Laya.GTextInput;
    private flagInp: Laya.GTextInput;
    private headImg: Laya.GImage;
    private bagList: Laya.GList;    // item3 背包列表
    private shopList: Laya.GList;   // item1 商品列表
    private _bagArr: string[] = [];   // 背包数据源(GList numItems 驱动)
    private _shopArr: string[] = [];  // 商品数据源
    private _shopSel: number = -1;    // 商品自管理选中索引
    private _dlgHeads: string[] = []; // 头像弹窗数据源
    /** 头像弹窗中选中项的 item 节点(还原描边用) */
    private _selHeadItem: any = null;
    /** nor 包版本检查中(防连点: 从点击到弹框关闭) */
    private _norChecking = false;
    /** nor 包下载中 */
    private _norDling = false;
    /** 用户在 vers 回调前取消确认框(探测结果作废不跳转) */
    private _norCancel = false;
    /** 游戏 item(index 0)进度条: 呼吸(探测中)/百分比(下载)/红(失败) */
    private _gameBar: any = null;
    private shopLoaded: boolean = false;
    private bagLoaded: boolean = false;
    private selHead: string | null = null;      // 头像弹窗中选中的头像
    private heads: string[] | null = null;      // ui@head 头像集缓存(未变化不重载)
    private synced: { name: string, flag: string } = { name: "", flag: "" };  // 已同步基线
    private syncing: { name?: string, flag?: string } = {};                  // 同步中字段值(防 blur/切页双发)
    /** 设置页音乐开关(item4/au, Check 模式: selected=开) */
    private auBtn: any = null;
    /** 设置页音效开关(item4/aue, Check 模式: selected=开) */
    private aueBtn: any = null;
    /** 设置页击球操作区辅助开关(item4/show, Check 模式: selected=开), 持久化 localStorage 供 badm 场景读取 */
    private showBtn: any = null;
    private doubleBtn: any = null;

    onAwake(): void {

        console.log(Laya.stage.width + "//////////" + Laya.stage.height);
        QA.installMenu(this);
        Res.setAct("ui");

        // —— 设置页 音乐/音效 复选框(au/aue, Check 模式 selected=开):
        // 引擎点击翻转 selected 并自动切显 title(已关闭)/selectedTitle(开启), 代码只同步 Au 总开关。
        // localStorage 持久化(musicOn/sfxOn, 未配置=开): 重启读回——Au 总开关是内存态, 不存则重启自动播
        this.auBtn = UI.findNode(this.owner, "au");
        this.aueBtn = UI.findNode(this.owner, "aue");
        const savedM = Laya.LocalStorage.getItem("musicOn");
        const savedS = Laya.LocalStorage.getItem("sfxOn");
        if (this.auBtn && savedM !== null && savedM !== "") this.auBtn.selected = savedM === "1";
        if (this.aueBtn && savedS !== null && savedS !== "") this.aueBtn.selected = savedS === "1";
        if (this.auBtn) Au.setMusic(!!this.auBtn.selected);
        if (this.aueBtn) Au.setSfx(!!this.aueBtn.selected);
        this.auBtn?.on(Laya.Event.CLICK, this, () => {
            Au.tap();
            Au.setMusic(!!this.auBtn.selected);
            Laya.LocalStorage.setItem("musicOn", this.auBtn.selected ? "1" : "0");
        });
        this.aueBtn?.on(Laya.Event.CLICK, this, () => {
            Au.tap();
            Au.setSfx(!!this.aueBtn.selected);
            Laya.LocalStorage.setItem("sfxOn", this.aueBtn.selected ? "1" : "0");
        });

        // —— 设置页 击球操作区辅助开关(show, Check 模式 selected=开):
        // 跨场景 UI 配置, localStorage 持久化; badm 场景读 hitShow 控制 hit 控件显隐(未配置=显示) ——
        this.showBtn = UI.findNode(this.owner, "show");
        if (this.showBtn) {
            const saved = Laya.LocalStorage.getItem("hitShow");
            if (saved !== null && saved !== "") this.showBtn.selected = saved === "1";
        }
        this.showBtn?.on(Laya.Event.CLICK, this, () => {
            Au.tap();
            Laya.LocalStorage.setItem("hitShow", this.showBtn.selected ? "1" : "0");
        });

        // —— 设置页 双手模式开关(double, Check 模式 selected=开):
        // 跨场景 UI 配置, localStorage 持久化; badm 场景读 double 切换击球操作模式(未配置=单手) ——
        this.doubleBtn = UI.findNode(this.owner, "double");
        if (this.doubleBtn) {
            const savedD = Laya.LocalStorage.getItem("double");
            if (savedD !== null && savedD !== "") this.doubleBtn.selected = savedD === "1";
        }
        this.doubleBtn?.on(Laya.Event.CLICK, this, () => {
            Au.tap();
            Laya.LocalStorage.setItem("double", this.doubleBtn.selected ? "1" : "0");
        });

        // menu 预制体复用激活(挂回 root)时切回主菜单音乐(match back → menu 场景音乐对齐)
        // 同 kind 3s 防抖: 首次 onAwake(启动链 index→menu)紧跟 sceneShow 不重复换曲
        (this.owner as any).on("sceneShow", this, () => {
            Au.bgmPlayRich("main");
            // 从对局回到菜单: 会话已断(含 accesstoken 到期)就在这里重新拉起, 不等玩家点匹配
            if (!NetBoot.ready()) this.initGobe();
        });

        // —— 数据源：Res 索引中 main/game 下的图片集 ——
        const files = Res.getList("ui")?.files || {};
        const gameImgs: string[] = [];
        for (const p in files) {
            if (p.indexOf("main/game/") === 0 && /\.(png|jpe?g|webp|bmp)$/i.test(p))
                gameImgs.push(p);
        }
        gameImgs.sort();

        // 新 UI: GPanel "list" + Controller c0 + item0~4 GearDisplay 切页
        const listPanel = UI.findNode(this.owner, "list") as Laya.GPanel;
        this.pageCtrl = listPanel ? listPanel.getController("c0") : null;
        if (this.pageCtrl) this.pageCtrl.selectedIndex = 0;

        // Controller 走 Record 序列化(引擎无该类型注册)可能断链 → 手动 visible 切页兜底
        for (let i = 0; i < 5; i++) {
            this._pages.push(UI.findNode(this.owner, `item${i}`) as Laya.GBox);
        }
        this._setPage(0);

        const gameNode = UI.findNode(this.owner, "gList") as Laya.GList;
        if (!gameNode) {
            console.warn("[slecet] 未找到 Area2D/game 节点");
            return;
        }
        this.gameNode = gameNode;

        // —— GList 初始化: 场景已配 itemTemplate/layout/scroller(含滚动条显隐), 代码不覆盖 UI 配置 ——
        this._gameImgs = gameImgs;
        this._selIdx = 0;
        gameNode.itemRenderer = (index: number, item: any) => this.onListRender(item, index);
        gameNode.numItems = gameImgs.length;

        // —— box点击：选中,恢复旧项目,切换页面 ——
        for (let i = 0; i < 5; i++) {
            const box = UI.findNode(this.owner, `${i}`) as Laya.GBox;

            if (!box) {
                console.warn(`[slecet] 未找到box page${i}`);
                continue;
            }

            box.on(Laya.Event.CLICK, this, () => {
                Au.tap();
                console.log("xx")
                if (this.oldImg) {
                    // 先还原缩放(绕中心缩回), 再还原轴心与位置(一并还原)
                    this.oldImg.scaleX = this.oldImg.scaleY = this.oldS;
                    // 注意: 不能设 autoSize=true(旧 Image API), GImage 上会触发 ResizeToFit
                    // 按纹理原尺寸重设宽高 → 图标错位变大盖住相邻图标可点区
                    this._resetPivot(this.oldImg);
                    if (this.oldImg.zIndex != 5)
                        this.oldBox.getChild("Box").alpha = 0.32;
                }
                box.getChild("Box").alpha = 1;
                const u = UI.findNode(box, "img") as Laya.GImage;
                if (u) {
                    this.oldS = u.scaleX;
                    // 轴心先移中心再缩放: 绕中心缩放不跑偏(原左上轴心放大向右下扩张)
                    this._centerPivot(u);
                    u.scaleX += u.scaleX > 0.7 ? 0 : 0.4;
                    u.scaleY += u.scaleY > 0.7 ? 0 : 0.4;
                    // 张力位移: 放大后整体平移增强画面张力
                    // (还原时 _resetPivot 恢复记录的原始 y, 此位移自动归位)
                    u.y += u.zIndex > 3 ? 40 : -80;
                    this.oldImg = u;
                    this.oldBox = box;

                }
                const idx = parseInt(box.name);
                if (this.pageCtrl) this.pageCtrl.selectedIndex = idx;
                this._setPage(idx);
                this.onPageChange(idx);
            });
        }


        // —— game 点击：按选中索引跳场景(item 点击更新 _selIdx 后冒泡到这里) ——
        gameNode.on(Laya.Event.CLICK, this, () => {
            Au.tap();
            if (this._selIdx > 0) {
                Dialog.toast("暂未开放，敬请期待");
                return;
            }
            this._checkNorAndJump();
        });

        this.initUserPage();
        

        // 界面期后台检查本地 nor 包(用户流程 v3): 本地存在 → 静默 vers 检查更新, needUpdate 才弹框;
        // 点击游戏列表只测本地存在性(存在直接进, 不存在才走更新流程)
        this._bgCheckNor();
        

        // 读 idb 用户记录(本地优先), 无记录后台自动注册; 本地读的初始验证一次云端
        // 联机会话(GOBE)就在登录/注册这一步初始化: 服务端随响应一起下发 accesstoken,
        // 玩家点匹配时直接能匹配, 不必再等一次换 token 的往返
        Cloud.init((u, from) => {
            if (u) this.fillUser(u);
            if (from === "local") this.verifyUser();
            else this.initGobe();
        });
    }

    /**
     * 轴心移到图片中心并补偿位移(视觉位置不变)。
     * pivot 从左上变中心后 x/y 语义由"视觉左上"变"视觉中心",
     * 按当前 scale 补偿 (新pivot-旧pivot)*s 的位移量, 之后缩放绕中心进行不跑偏。
     */
    private _centerPivot(u: any): void {
        this._anc = { img: u, px: u.pivotX, py: u.pivotY, x: u.x, y: u.y };
        u.x += (u.width * 0.5 - u.pivotX) * u.scaleX;
        u.y += (u.height * 0.5 - u.pivotY) * u.scaleY;
        u.pivotX = u.width * 0.5;
        u.pivotY = u.height * 0.5;
    }

    /** 还原轴心与位置(与 _centerPivot 配对, 记录值恢复视觉必回初始态) */
    private _resetPivot(o: any): void {
        const a = this._anc;
        this._anc = null;
        if (!a || a.img !== o) return;
        o.pivotX = a.px;
        o.pivotY = a.py;
        o.x = a.x;
        o.y = a.y;
    }

    // ============================================================
    // 游戏入口: nor 资源包检查 / 下载 / 跳场景
    // ============================================================

    /**
     * 跳场景前检查 nor 包版本: 点击立即弹确认框(大小未知), vers 探测并行跑——
     * needUpdate=true 动态补包大小进弹窗; needUpdate=false 关框注册包直跳;
     * 探测期间用户点下载直接开始(不依赖探测结果), 点取消则探测结果作废。
     */
    private _checkNorAndJump(): void {
        if (this._norChecking) return;
        if (this._norDling) { Dialog.toast("资源更新中，请稍候"); return; }
        // 点击只检测本地包是否存在(版本检查已挪界面期 _bgCheckNor):
        // - 存在 → 直接 url 注册恢复(会话已验证跳过服务器比对) + 解压进度预测 → 跳
        // - 不存在 → 走完整更新流程(呼吸 → vers → 弹框下载 → 跳)
        Res.net.cGet(Res.ResList.nor, (cached: any) => {
            if (this._norDling) return; // 竞态: 界面期后台更新刚启动
            if (cached && (cached as Blob).size > 0) {
                this._norChecking = true;
                this._startProgTrack();
                Res.url(Res.ResList.nor, (info) => {
                    this._norChecking = false;
                    this._stopProgTrack();
                    if (!info) {
                        this._setBarPct(this._gameBar, 1, true);
                        Dialog.toast("资源加载失败，请重试");
                        return;
                    }
                    this._setBarPct(this._gameBar, 1);
                    this._jumpGame();
                });
                return;
            }
            // 本地不存在 → 更新流程
            this._norChecking = true;
            this._norCancel = false;
            this._startBarBreath();
            Res.vers(Res.ResList.nor, (r) => {
                if (this._norDling) { this._norChecking = false; this._stopBarBreath(); return; }
                if (this._norCancel) { this._norCancel = false; this._norChecking = false; this._stopBarBreath(); return; }
                this._stopBarBreath();
                Res.markVerified('nor');
                if (r && r.needUpdate) {
                    this._norChecking = false;
                    this._askNorDl(r.size);
                    return;
                }
                if (!r) {
                    // 探测失败: bar 红色提示
                    this._norChecking = false;
                    this._setBarPct(this._gameBar, 1, true);
                    Dialog.toast("资源检查失败，请重试");
                    return;
                }
                // 无更新也必须走 url(): 本会话 _packMap 注册 nor 包索引, 否则 match 预制体 get 报"资源包不存在"。
                // 本地恢复 = cGet .br + 内存解压提取(存储 v2, 数百 ms 无确定进度)——
                // bar 挂 MT.ProgModel 微积分预测(dp/dt=k(1-p) 渐近, 初快后慢不到 1), 'XP' 解压真进度事件锚入
                this._startProgTrack();
                Res.url(Res.ResList.nor, (info) => {
                    this._norChecking = false;
                    this._stopProgTrack();
                    if (!info) {
                        this._setBarPct(this._gameBar, 1, true);
                        Dialog.toast("资源加载失败，请重试");
                        return;
                    }
                    this._setBarPct(this._gameBar, 1);
                    this._jumpGame();
                });
            });
        });
    }

    /** nor 包下载确认 + bar 进度(确认后 bar 显示下载百分比; 关闭弹窗下载继续后台跑) */
    private _askNorDl(size: number): void {
        const mb = size > 0 ? (size / 1000000).toFixed(2) + "Mb" : "约 12.5Mb";
        Dialog.showD(`需要下载游戏资源：${mb}`, "游戏资源", "取消", "下载", (k) => {
            if (k !== 1) {
                this._norCancel = true;
                this._setBarPct(this._gameBar, 0);
                return;
            }
            this._norDling = true;
            Dialog.showD("正在下载游戏资源 0%", "下载中", 0, "隐藏", (k2) => {
                if (k2 === 1) Dialog.toast("下载将在后台继续");
            });
            Res.on('DP', this._onNorDp);
            Res.url(Res.ResList.nor, true, (info) => {
                Res.off('DP', this._onNorDp);
                this._norDling = false;
                Dialog.closeD();
                if (!info) {
                    this._setBarPct(this._gameBar, 1, true);
                    Dialog.toast("资源下载失败，请重试");
                    return;
                }
                // 刚下载的包必然最新: 会话登记已验证(后续点击恢复跳过服务器比对)
                Res.markVerified('nor');
                this._setBarPct(this._gameBar, 1);
                this._jumpGame();
            });
        });
    }

    /** nor 包下载进度 → 弹窗正文 + bar 百分比 */
    private _onNorDp = (url: string, percent: number, _speed: number, loaded: number, total: number): void => {
        if (!this._norDling) return;
        this._setBarPct(this._gameBar, percent / 100);
        Dialog.updateBody(`正在下载游戏资源 ${percent}%\n${(loaded / 1000000).toFixed(2)}/${(total / 1000000).toFixed(2)}Mb`);
    };

    /**
     * 界面期后台检查(用户流程 v3): 本地 nor 包存在时静默 vers 检查更新——
     * needUpdate → 弹"立即更新/暂不更新"; 暂不更新 = 会话已验证(拍板用本地版, 点击直接进);
     * 无更新/探测失败 → 静默(markVerified 后点击恢复跳过服务器比对)。
     * 本地不存在: 静默等点击走下载流程(新用户首点弹下载框)。
     */
    private _bgCheckNor(): void {
        Res.net.cGet(Res.ResList.nor, (cached: any) => {
            if (!cached || (cached as Blob).size <= 0) return;
            if (Res.hasVerified('nor')) return; // 本会话已验证过(下载完成/此前比对过), 不再打扰
            Res.vers(Res.ResList.nor, (r) => {
                Res.markVerified('nor');
                if (!r || !r.needUpdate) return; // 无更新/探测失败(放行语义): 静默
                const mb = r.size > 0 ? (r.size / 1000000).toFixed(2) + "Mb" : "约 10Mb";
                Dialog.showD(`发现游戏资源新版本：${mb}`, "游戏资源", "暂不更新", "立即更新", (k) => {
                    if (k === 1) this._bgUpdateNor();
                    // 暂不更新: markVerified 已置, 点击列表直接用本地版进入
                });
            });
        });
    }

    /** 界面期后台更新(确认后): bar 显示下载进度, 完成提示(不跳转, 用户仍在菜单界面) */
    private _bgUpdateNor(): void {
        this._norDling = true;
        Dialog.showD("正在更新游戏资源 0%", "更新中", 0, "隐藏", (k2) => {
            if (k2 === 1) Dialog.toast("更新将在后台继续");
        });
        Res.on('DP', this._onNorDp);
        Res.url(Res.ResList.nor, true, (info) => {
            Res.off('DP', this._onNorDp);
            this._norDling = false;
            Dialog.closeD();
            if (!info) {
                this._setBarPct(this._gameBar, 1, true);
                Dialog.toast("资源更新失败，请稍后重试");
                return;
            }
            Res.markVerified('nor');
            this._setBarPct(this._gameBar, 1);
            Dialog.toast("游戏资源已更新");
        });
    }

    /** 游戏 item 进度条呼吸(加载中不确定进度): 宽度 0~0.04 往复(MT.osc 微积分库振荡) */
    private _breathFn = (): void => {
        this._setBarPct(this._gameBar, MT.osc(Timer.now(), 450, 0, 0.04));
    };

    // ============ 预测进度跟踪(本地恢复/解压: MT.ProgModel 微积分渐近 + XP 真值锚) ============

    private _progModel: ProgModel | null = null;
    private _progTid: string | null = null;
    private _progLastT = 0;

    /** 解压真进度(res.ts 'XP' 事件, 5% 粒度) → 锚入预测模型(真值只升不降) */
    private _onXp = (_pack: string, frac: number): void => {
        if (this._progModel) this._progModel.anchor(frac);
    };

    /** 启动预测进度: bar 以 ProgModel 渐近推进(初快后慢), XP 真进度锚入, 完成 finish 跳 1 */
    private _startProgTrack(): void {
        this._stopProgTrack();
        this._progModel = new ProgModel(0.004);
        this._progLastT = Timer.now();
        Res.on('XP', this._onXp);
        this._progTid = Timer.frameLoop(() => {
            if (!this._progModel) return;
            const now = Timer.now();
            this._progModel.tick(Math.min(now - this._progLastT, 100));
            this._progLastT = now;
            this._setBarPct(this._gameBar, this._progModel.value);
        });
    }

    private _stopProgTrack(): void {
        if (this._progTid != null) { Timer.clear(this._progTid); this._progTid = null; }
        Res.off('XP', this._onXp);
        this._progModel = null;
    }

    /** 呼吸帧循环 id(Timer.frameLoop, onDestroy/停呼吸时 clear) */
    private _breathTid: string | null = null;

    private _startBarBreath(): void {
        this._stopBarBreath();
        this._breathTid = Timer.frameLoop(this._breathFn);
    }

    private _stopBarBreath(): void {
        if (this._breathTid != null) {
            Timer.clear(this._breathTid);
            this._breathTid = null;
        }
    }

    /**
     * match 预制体加载器: match.ls 不作独立场景部署(打进 nor 包 main/ 下),
     * Res.get 加载后挂 root(同 menu 预制体条目); 条目 url = Res 缓存键 "nor/match/match.ls"
     * 协议: 失败也回调 null(nav 清缓存自愈重试), promise reject 必须转 done(null)
     */
    private _matchLoader = (done: (node: Laya.Node) => void): void => {
        // UI 组件库桥先就绪(match.ls 的 GButton _$prefab uuid 引用解析依赖它), 失败不阻断
        const go = () => {
            Res.get("nor/match/match.ls").then((node: any) => {
                done(node || null);
            }).catch(() => { done(null); });
        };
        go();
    };

    /** 跳匹配页(match 预制体条目, back 复用原样界面; nor 包就绪由 _checkNorAndJump 保证) */
    private _jumpGame(): void {
        SceneNav.open("nor/match/match.ls", undefined, this._matchLoader);
    }

    /** 云端验证: 用户不存在/已封禁 → 弹提示, 确认后重新注册 */
    private verifyUser(): void {
        Cloud.verify((r, u, msg) => {
            if (r === "ok") {
                // 顺带同步云端数据(可能被管理端修改过)
                if (u) this.fillUser(u);
                // 这一次验证服务端已把联机 accesstoken 一起带回, 直接用它在菜单期建会话
                this.initGobe();
                return;
            }
            if (r === "gone") {
                Dialog.showD("用户不存在或已封禁", "提示", "取消", "确认", (k) => {
                    if (k !== 1) return;
                    this.reregister();
                });
                return;
            }
            // 限流: 服务端已判定该 IP/该用户过频, 静默会让玩家以为按钮坏了而连点(封禁越拉越长)
            if (r === "limited") {
                Dialog.toast(msg || "请求过于频繁，请稍后重试", 2500);
                return;
            }
            // "err" 网络异常: 静默, 保持本地数据
        });
    }

    /** 重新注册并刷新全部用户 UI 状态 */
    private reregister(): void {
        this.shopLoaded = false;
        this.bagLoaded = false;
        this.heads = null;
        this.selHead = null;
        Cloud.reg((u) => {
            if (!u) {
                Dialog.toast(Cloud.lastMsg || "注册失败，请检查网络");
                return;
            }
            this.fillUser(u);
            this.initGobe();
        });
    }

    /**
     * 登录/注册即初始化联机对战(GOBE)服务。
     * accesstoken 随登录/注册响应一起下发(见 Cloud.verify 的 gt 与 agcCore 缓存),
     * 这里只是拿它建 client, 不发单独的取 token 请求; 只有缓存过期时 ensure 内部才会重取。
     * 失败只在菜单页留日志不打扰玩家——点匹配时匹配页会提示并按失败重连。
     */
    private initGobe(): void {
        NetBoot.ensure(false, (ok: boolean, msg?: string) => {
            if (ok) console.log("[menu] 联机服务就绪, openId=" + NetBoot.openId());
            else console.warn("[menu] 联机服务初始化失败:", msg);
        });
    }

    // ============================================================
    // 用户系统
    // ============================================================

    private initUserPage(): void {
        const item3 = UI.findNode(this.owner, "item3");
        if (item3) {
            // name/flag 为 GTextInput(可编辑): BLUR 失焦 / ENTER 回车触发服务端同步
            // head 为 GImage, 背包为 GList
            this.nameInp = UI.findNode(item3, "name") as Laya.GTextInput;
            this.flagInp = UI.findNode(item3, "flag") as Laya.GTextInput;
            this.headImg = UI.findNode(item3, "head") as Laya.GImage;
            this.bagList = UI.findNode(item3, "gList") as Laya.GList;

            this.nameInp?.on(Laya.Event.BLUR, this, () => this.onFieldBlur("name"));
            this.nameInp?.on(Laya.Event.ENTER, this, () => {
                this.onFieldBlur("name");
                this.nameInp.textIns.focus = false;
            });
            this.flagInp?.on(Laya.Event.BLUR, this, () => this.onFieldBlur("flag"));
            this.flagInp?.on(Laya.Event.ENTER, this, () => {
                this.onFieldBlur("flag");
                this.flagInp.textIns.focus = false;
            });

            // 点击头像 → 弹出头像选择
            if (this.headImg) this.headImg.on(Laya.Event.CLICK, this, this.openHeadDlg);
        }

        // item1 商品页: sList/sButton 均从 owner 全树查找(不依赖 item1 层级)
        const item1 = UI.findNode(this.owner, "item1");
        if (item1) {
            this.shopList = UI.findNode(this.owner, "sList") as Laya.GList;
            const sBtn = UI.findNode(this.owner, "sButton");
            if (sBtn) sBtn.on(Laya.Event.CLICK, this, this.onBuy);
        }

        // item4 设置页: 清除数据按钮(Text "setting", 旧名 "1" 已废弃)
        const item4 = UI.findNode(this.owner, "item4");
        if (item4) {
            const clearBtn = UI.findNode(item4, "setting");
            if (clearBtn) clearBtn.on(Laya.Event.CLICK, this, this.onClearData);
        }
    }

    /** 用户信息填充到 UI */
    private fillUser(u: CloudUser): void {
        if (this.nameInp) this.nameInp.text = u.name;
        if (this.flagInp) this.flagInp.text = u.flag;
        this.synced = { name: u.name, flag: u.flag };
        this.setHeadImg(u.head);
        this.refreshSettingTop(u);
        this.refreshTab3(u);
    }

    /**
     * 头像归一: 云端记录里的头像路径可能不在当前 ui 包内(旧账号默认头像写的是已弃用的
     * head/0101.png), 直接取会空白并刷 "[Res] 路径未匹配任何文件" → 回落到头像集第一张。
     * 包索引还没就绪时不动(避免把合法路径误判成不存在)。
     */
    private headKey(head: string): string {
        const files = Res.getList("ui")?.files || {};
        if (!head || files[head]) return head;
        const hs = this.getHeads();
        return hs.length ? hs[0] : head;
    }

    private setHeadImg(head: string): void {
        if (!head || !this.headImg) return;
        const key = this.headKey(head);
        Res.get("ui/" + key, (tex: Laya.Texture) => {
            if (tex && this.headImg && !this.headImg.destroyed) UI.setTex(this.headImg, tex);
        });
    }

    /** item4 top 区显示用户信息 */
    private refreshSettingTop(u: CloudUser): void {
        const item4 = UI.findNode(this.owner, "item4");
        if (!item4) return;
        const top = UI.findNode(item4, "top");
        if (!top) return;
        const nameT = UI.findNode(top, "name") as any;
        const idT = UI.findNode(top, "id") as any;
        const flagT = UI.findNode(top, "flag") as any;
        if (nameT && typeof nameT.text === "string") nameT.text = u.name;
        if (idT && typeof idT.text === "string") idT.text = u.userid;
        if (flagT && typeof flagT.text === "string") flagT.text = u.flag;
    }

    /** 底部标签卡 Box"3"(用户卡, 未选中也要同步): 头像 Image + name/id/flag/dollar */
    private refreshTab3(u: CloudUser): void {
        const box3 = UI.findNode(this.owner, "3") as Laya.Box;
        if (!box3) return;

        // 头像 GImage "img"(旧名 Image 已废弃)
        const img = UI.findNode(box3, "img") as Laya.GImage;
        if (img) {
            const key = this.headKey(u.head);
            Res.get("ui/" + key, (tex: Laya.Texture) => {
                if (tex && img && !img.destroyed) UI.setTex(img, tex);
            });
        }

        // 文本区 Tex: name/id/flag (dollar 与 Tex 平级, 在 Tex 子树内找不到)
        const tex = UI.findNode(box3, "Tex");
        if (tex) {
            const nameT = UI.findNode(tex, "name") as any;
            const idT = UI.findNode(tex, "id") as any;
            const flagT = UI.findNode(tex, "flag") as any;
            if (nameT && typeof nameT.text === "string") nameT.text = u.name;
            if (idT && typeof idT.text === "string") idT.text = "ID:" + u.userid;
            if (flagT && typeof flagT.text === "string") flagT.text = u.flag;
        }

        // 金币数 Text"dollar" 是 Box"3" 直接后代, 从 box3 查找
        const dollarT = UI.findNode(box3, "dollar") as any;
        if (dollarT && typeof dollarT.text === "string") dollarT.text = String(u.dollar);
    }

    /** name/flag 失焦: 值有变化才触发云函数同步 */
    private onFieldBlur(f: "name" | "flag"): void {
        const inp = f === "name" ? this.nameInp : this.flagInp;
        if (!inp) return;
        const cur = inp.text;
        if (cur === this.synced[f]) return;
        if (this.syncing[f] === cur) return;   // 同值已在同步中, 不重复发
        const fields: any = {};
        fields[f] = cur;
        this.syncing[f] = cur;
        Cloud.update(fields, (res: any) => {
            delete this.syncing[f];
            if (res && res.code === 0) {
                this.synced[f] = cur;
                Dialog.toast(f === "name" ? "昵称已保存(消耗1金币)" : "签名已保存");
                const u = Cloud.getUser();
                if (u) { this.refreshSettingTop(u); this.refreshTab3(u); }
            } else {
                this.rollbackField(f, res);
                const u = Cloud.getUser();
                if (u) { this.refreshSettingTop(u); this.refreshTab3(u); }
            }
        });
        // Cloud.update 已先写入本地乐观状态；先刷新 UI，不等待网络往返。
        const optimisticUser = Cloud.getUser();
        if (optimisticUser) { this.refreshSettingTop(optimisticUser); this.refreshTab3(optimisticUser); }
    }

    private rollbackField(f: "name" | "flag", res: any): void {
        const inp = f === "name" ? this.nameInp : this.flagInp;
        if (inp) inp.text = this.synced[f];
        if (res && res.code === 4) Dialog.toast("金币不足，改名需要 1 金币");
        else if (res && res.code === 2) Dialog.toast("登录已失效，请重试");
        else Dialog.toast("保存失败");
    }

    /** 手动切页(item0~4 visible), Controller/Record 断链时的可靠兜底 */
    private _setPage(idx: number): void {
        for (let i = 0; i < this._pages.length; i++) {
            const p = this._pages[i];
            if (p) p.visible = (i === idx);
        }
    }

    /** 页面切换: 未同步字段后台自动同步 + 各页懒加载 */
    private onPageChange(idx: number): void {
        this.syncDirty();
        if (idx === 1) this.loadShop();
        else if (idx === 3) this.loadBagPage();
    }

    /** 昵称/签名有变化未同步 → 后台自动触发云函数同步 */
    private syncDirty(): void {
        if (!Cloud.getUser()) return;
        const fields: any = {};
        if (this.nameInp && this.nameInp.text !== this.synced.name && this.syncing.name !== this.nameInp.text) fields.name = this.nameInp.text;
        if (this.flagInp && this.flagInp.text !== this.synced.flag && this.syncing.flag !== this.flagInp.text) fields.flag = this.flagInp.text;
        if (fields.name === undefined && fields.flag === undefined) return;
        if (fields.name !== undefined) this.syncing.name = fields.name;
        if (fields.flag !== undefined) this.syncing.flag = fields.flag;
        Cloud.update(fields, (res: any) => {
            if (fields.name !== undefined) delete this.syncing.name;
            if (fields.flag !== undefined) delete this.syncing.flag;
            if (res && res.code === 0) {
                if (fields.name !== undefined) this.synced.name = fields.name;
                if (fields.flag !== undefined) this.synced.flag = fields.flag;
                const u = Cloud.getUser();
                if (u) this.refreshSettingTop(u);
            } else {
                if (fields.name !== undefined && this.nameInp) this.nameInp.text = this.synced.name;
                if (fields.flag !== undefined && this.flagInp) this.flagInp.text = this.synced.flag;
                const u = Cloud.getUser();
                if (u) { this.refreshSettingTop(u); this.refreshTab3(u); }
            }
        });
        // 先显示本地乐观状态，云端回包后 Cloud.applyUser 再覆盖为权威状态。
        const optimisticUser = Cloud.getUser();
        if (optimisticUser) { this.refreshSettingTop(optimisticUser); this.refreshTab3(optimisticUser); }
    }

    // ============================================================
    // 头像集(缓存, 未变化不重载)
    // ============================================================

    private getHeads(): string[] {
        // 空数组不缓存(包未就绪/旧索引时允许下次重取)
        if (this.heads && this.heads.length) return this.heads;
        const files = Res.getList("ui")?.files || {};
        const arr: string[] = [];
        for (const p in files) {
            if (p.indexOf("head/") === 0 && /\.(png|jpe?g|webp|bmp)$/i.test(p))
                arr.push(p);
        }
        arr.sort();
        if (arr.length) this.heads = arr;
        return arr;
    }

    /** 头像弹窗单元渲染: Sprite 贴头像, t 显示背包数量; 未拥有 alpha=0.5 */
    private onHeadItemRender(item: any, index: number, heads: string[]): void {
        const p: string = heads[index];
        if (!p) return;

        const u = Cloud.getUser();
        const n = u && u.bag ? (u.bag[p] || 0) : 0;

        const sp: any = item.getChildByName("Sprite");
        if (sp) {
            // 贴图守卫: key 变了重贴; 纹理丢失(缓存复用半瘫/通道断链)也重贴兜底
            // (旧守卫只比 __img——池节点残留同 key 但纹理已丢时永久黑图 = "第二次头像消失"次因)
            const texLost = !sp.comp ? !sp.texture : !(sp.comp.frames && sp.comp.frames.length);
            if (sp.__img !== p || texLost) {
                sp.__img = p;
                sp.blendMode = Laya.BlendMode.sourceAlpha
                sp.texture = null;
                Res.get("ui/" + p, (tex: Laya.Texture) => {
                    if (sp.__img === p && tex) UI.setTex(sp, tex);
                });
            }
            // 未拥有半透明, 拥有的正常
            sp.alpha = n > 0 ? 1 : 0.5;
        }

        const t: any = item.getChildByName("t");
        if (t && typeof t.text === "string")
            t.text = n > 0 ? "x" + n : "";

        // 描边: 选中项浅红, 其余黑(池化复用/滚动回收后重画保持正确)
        this._setHeadStroke(item, p === this.selHead);
        // 默认选中项节点登记(点击换选时增量还原描边用)
        if (p === this.selHead) this._selHeadItem = item;
    }

    /** item 框描边: 先清除 graphics 再重绘 drawRect(浅红选中/黑还原)。
     *  指令数组原地清空不走 cmds setter(规避 .lh 反序列化旧指令形态差异的 recover 风险);
     *  percent=true 归一化坐标画满节点(同 .lh 原指令语义), lineWidth=8 不变 */
    private _setHeadStroke(item: any, sel: boolean): void {
        const sp: any = item && item.getChildByName && item.getChildByName("Sprite");
        if (!sp || !sp.graphics) return;
        const g = sp.graphics;
        g.clear();
        const arr: any[] = g.cmds;
        if (Array.isArray(arr)) arr.length = 0;
        g.drawRect(0, 0, 1, 1, null, sel ? "#ff8080" : "#000000", 1, true);
        sp.repaint();
    }

    // ============================================================
    // 头像选择弹窗
    // ============================================================

    private openHeadDlg(): void {
        Au.tap();
        // 默认选中当前头像(与现有头像一致 → 确认时短路不触发设置)
        const cu = Cloud.getUser();
        this.selHead = cu && cu.head ? cu.head : null;
        this._selHeadItem = null;
        Dialog.showD("", "选择头像", 0, "确认", (k) => {
            if (k === 1 && this.selHead) this.setHead(this.selHead);
        }, (panel) => {
            if (!panel || panel.destroyed) return;

            // 设置 txt 不显示, gList 显示
            const txt = UI.findNode(panel, "txt") as Laya.Sprite;
            if (txt) txt.visible = false;
            const gList = UI.findNode(panel, "gList") as Laya.GList;
            if (!gList) return;
            gList.visible = true;

            // 列表点击不冒泡到面板根节点(根节点点击会关闭弹窗, 导致选完头像弹窗秒关)
            gList.on(Laya.Event.CLICK, this, (e: Laya.Event) => { e.stopPropagation(); });

            const heads = this.getHeads();
            this._dlgHeads = heads;

            // 背包数据: 本地优先, 未同步过才拉取
            Cloud.loadBag(() => {
                if (gList.destroyed) return;
                // gList 已配 itemTemplate(池可用): numItems 标准通道
                gList.itemRenderer = (index: number, item: any) => {
                    this.onHeadItemRender(item, index, heads);
                    // 池化复用先 off 防重复绑定; 点击选择(GList 无 selectHandler)
                    item.off(Laya.Event.CLICK, this, this.onHeadDlgItemClick);
                    item.on(Laya.Event.CLICK, this, this.onHeadDlgItemClick, [index, item]);
                };
                gList.numItems = heads.length;
            });
        });
    }

    /** 头像弹窗点击选择: 未拥有 → toast 回退; 拥有 → 记录待切换头像 + 描边选中态 */
    private onHeadDlgItemClick(index: number, item: any): void {
        Au.tap();
        const p = this._dlgHeads[index];
        if (!p) return;
        const u = Cloud.getUser();
        const n = u && u.bag ? (u.bag[p] || 0) : 0;
        if (n <= 0) {
            Dialog.toast("未拥有", 1000);
            return;
        }
        if (p === this.selHead) return;
        // 还原上一个选中项描边(节点若已被池回收复用, renderer 已重画为黑, 再改黑无副作用)
        if (this._selHeadItem && this._selHeadItem !== item)
            this._setHeadStroke(this._selHeadItem, false);
        this.selHead = p;
        this._selHeadItem = item;
        this._setHeadStroke(item, true);
    }

    /** 设置头像: 服务器校验背包数量并消耗 1。
     *  与当前头像一致时短路(不调云函数不消耗数量) */
    private setHead(head: string): void {
        const cu = Cloud.getUser();
        if (cu && cu.head === head) return;
        Cloud.setHead(head, (res: any) => {
            if (res && res.code === 0) {
                this.setHeadImg(head);
                this.bagLoaded = false; // 背包已变, 下次进入重载
                const u = Cloud.getUser();
                if (u) this.refreshTab3(u);
                Dialog.toast("头像已更换");
            } else if (res && res.code === 3) {
                const u = Cloud.getUser();
                if (u) { this.setHeadImg(u.head); this.refreshTab3(u); }
                Dialog.toast("该头像数量不足");
            } else if (res && res.code === 2) {
                const u = Cloud.getUser();
                if (u) { this.setHeadImg(u.head); this.refreshTab3(u); }
                Dialog.toast("登录已失效，请重试");
            } else {
                const u = Cloud.getUser();
                if (u) { this.setHeadImg(u.head); this.refreshTab3(u); }
                Dialog.toast("设置失败");
            }
        });
        // 如果本地预检通过，Cloud.setHead 已立即乐观切换头像和背包数量。
        const optimisticUser = Cloud.getUser();
        if (optimisticUser && optimisticUser.head === head) {
            this.setHeadImg(head);
            this.bagLoaded = false;
            this.refreshTab3(optimisticUser);
        }
    }

    // ============================================================
    // 背包页(item3 gList) / 商品页(item1 sList)
    // ============================================================

    /** 点入用户页才加载背包列表, 已加载不重载(除非背包变化) */
    private loadBagPage(): void {
        if (this.bagLoaded || !this.bagList) return;
        Cloud.loadBag(() => {
            const u = Cloud.getUser();
            if (!u || !u.bag || !this.bagList) return;
            const owned = Object.keys(u.bag).filter((k) => (u.bag[k] || 0) > 0);
            this._bagArr = owned;
            // GList: 先绑 itemRenderer 再设 numItems(赋值立即触发渲染)
            this.bagList.itemRenderer = (index: number, item: any) => this.onBagItemRender(index, item);
            this.bagList.numItems = owned.length;
            this.bagLoaded = true;
        });
    }

    /** 背包单元渲染: img 贴头像(GImage texture), n 数量文本(模板默认 x1 需清空) */
    private onBagItemRender(index: number, item: any): void {
        const p = this._bagArr[index];
        if (!p) return;

        const u = Cloud.getUser();
        const n = u && u.bag ? (u.bag[p] || 0) : 0;

        const img: any = item.getChildByName("img");
        if (img) {
            if (img.__img !== p) {
                img.__img = p;
                UI.setTex(img, null);
                Res.get("ui/" + p, (tex: Laya.Texture) => {
                    if (img.__img === p && tex) UI.setTex(img, tex);
                });
            }
            img.alpha = n > 0 ? 1 : 0.5;
        }

        const t: any = item.getChildByName("n");
        if (t && typeof t.text === "string")
            t.text = "";
    }

    /** 点入商品页才加载商品列表: head 下全部头像 + main/shop/dollar.png, 未变化不重新加载 */
    private loadShop(): void {
        if (this.shopLoaded || !this.shopList) return;

        const arr: string[] = this.getHeads().slice();
        const files = Res.getList("ui")?.files || {};
        for (const p in files) {
            if (p.indexOf("main/shop/") === 0 && /\.(png|jpe?g|webp|bmp)$/i.test(p))
                arr.push(p);
        }
        arr.sort();

        if (!arr.length) {
            // 数据未就绪(旧索引/包未加载): 不置 loaded, 离开再进重试
            const mName = UI.findNode(this.owner, "mName") as any;
            if (mName && typeof mName.text === "string") mName.text = "暂无商品";
            return;
        }
        this.shopLoaded = true;
        this._shopArr = arr;
        this._shopSel = -1;

        // GList: 先绑 itemRenderer 再设 numItems(赋值立即触发渲染)
        this.shopList.itemRenderer = (index: number, item: any) => this.onShopItemRender(index, item);
        this.shopList.numItems = arr.length;

        const mName = UI.findNode(this.owner, "mName") as any;
        if (mName && typeof mName.text === "string")
            mName.text = "金币:" + (Cloud.getUser()?.dollar ?? 0);
    }

    /** 商品完整路径(head 下需加 ui@ 前缀, main 包直读) */
    private shopResPath(p: string): string {
        return p.indexOf("head/") === 0 ? "ui/" + p : p;
    }

    /** 选中商品: mName 显示类型(头像/货币), show 显示商品图 */
    private onShopSelect(index: number): void {
        const p: string = this._shopArr[index];
        if (!p) return;

        const mName = UI.findNode(this.owner, "mName") as any;
        if (mName && typeof mName.text === "string")
            mName.text = this.isDollarItem(p) ? "货币" : "头像";

        const show = UI.findNode(this.owner, "show") as Laya.GImage;
        if (show) {
            Res.get(this.shopResPath(p), (tex: Laya.Texture) => {
                if (tex && show && !show.destroyed && this._shopArr[this._shopSel] === p)
                    UI.setTex(show, tex);
            });
        }
    }

    /** 金币商品判定 */
    private isDollarItem(p: string): boolean {
        return /(^|\/)dollar\.png$/i.test(p);
    }

    /** 商品单元渲染: img 贴图(GImage texture, head 走 ui@ 前缀, main 直读), t 显示数量(dollar x5 / 其他 x1); 点击显式记录选中 */
    private onShopItemRender(index: number, item: any): void {
        const p: string = this._shopArr[index];
        if (!p) return;

        const sp: any = item.getChildByName("img");
        if (sp) {
            if (sp.__img !== p) {
                sp.__img = p;
                UI.setTex(sp, null);
                Res.get(this.shopResPath(p), (tex: Laya.Texture) => {
                    if (sp.__img === p && tex) UI.setTex(sp, tex);
                });
            }
        }

        const t: any = item.getChildByName("t");
        if (t && typeof t.text === "string")
            t.text = this.isDollarItem(p) ? "x5" : "x1";

        // 池化复用先 off 防重复绑定; 点击显式记录选中索引(GList 无 mouseHandler)
        item.off(Laya.Event.CLICK, this, this.onShopItemClick);
        item.on(Laya.Event.CLICK, this, this.onShopItemClick, [index]);
    }

    private onShopItemClick(index: number): void {
        Au.tap();
        this._shopSel = index;
        this.onShopSelect(index);
    }

    /** 购买选中商品: 货币商品弹测试提示框, 确认后获得金币, 取消无事; 其他直接花费金币购买 */
    private onBuy(): void {
        Au.tap();
        if (!this._shopArr.length || this._shopSel < 0) {
            Dialog.toast("选择商品", 1000);
            return;
        }
        const item = this._shopArr[this._shopSel];
        if (this.isDollarItem(item)) {
            Dialog.showD("花费 1 金币获得金币 x5\n[ff0000]仅测试使用", "购买金币", "取消", "确认", (k) => {
                if (k === 1) this.buyItem(item);
            });
            return;
        }
        this.buyItem(item);
    }

    /** 执行购买: 消耗 1 金币/个 背包 +1; dollar 商品金币 +5 */
    private buyItem(item: string): void {
        Cloud.buy(item, (res: any) => {
            if (res && res.code === 0) {
                this.bagLoaded = false;
                const u = Cloud.getUser();
                const mName = UI.findNode(this.owner, "mName") as any;
                if (mName && typeof mName.text === "string")
                    mName.text = "金币:" + (u?.dollar ?? 0);
                if (u) this.refreshTab3(u);
                Dialog.toast(this.isDollarItem(item)
                    ? "金币 +5，剩余金币 " + (u?.dollar ?? 0)
                    : "购买成功，剩余金币 " + (u?.dollar ?? 0));
            } else if (res && res.code === 4) {
                Dialog.toast("金币不足");
                const u = Cloud.getUser();
                const mName = UI.findNode(this.owner, "mName") as any;
                if (mName && typeof mName.text === "string") mName.text = "金币:" + (u?.dollar ?? 0);
                if (u) this.refreshTab3(u);
            } else {
                Dialog.toast("购买失败");
                const u = Cloud.getUser();
                const mName = UI.findNode(this.owner, "mName") as any;
                if (mName && typeof mName.text === "string") mName.text = "金币:" + (u?.dollar ?? 0);
                if (u) this.refreshTab3(u);
            }
        });
        // Cloud.buy 已先更新本地金币/背包，界面立即反映；回包后再刷新权威状态。
        const optimisticUser = Cloud.getUser();
        const mName = UI.findNode(this.owner, "mName") as any;
        if (mName && typeof mName.text === "string") mName.text = "金币:" + (optimisticUser?.dollar ?? 0);
        if (optimisticUser) this.refreshTab3(optimisticUser);
    }

    // ============================================================
    // 清除数据
    // ============================================================

    private onClearData(): void {
        Au.tap();
        Dialog.showD("确定要清除所有数据吗？\n[ff0000]包括用户信息，且不可恢复", "清除数据", "取消", "确认", (k) => {
            if (k !== 1) return;
            Cloud.del((ok) => {
                if (!ok) {
                    Dialog.toast("清除失败，请重试");
                    return;
                }
                // 清空本地存储: IDB(用户记录+资源包缓存) + localStorage(隐私同意)
                Cloud.clearLocal(() => {
                    // 回初始页重新走启动流程(不自动重新注册);
                    // reset: 场景栈清空重立, 返回键语义归零(回到"根场景不截断")
                    SceneNav.reset("game/load.ls");
                });
            });
        });
    }

    // ============================================================
    // 游戏列表(gList)
    // ============================================================

    /** gList 单元渲染：经 Res 异步取纹理贴到单元 Sprite, 并绑 item 点击更新选中索引 */
    /** item 内 img 进度条: percent∈[0,1] 按百分比设 DrawRectCmd 宽; fail=true 红色(存储不足等加载失败) */
    private _setBarPct(bar: any, percent: number, fail?: boolean): void {
        if (!bar) return;
        const w = Number(bar.width) || 0;
        const h = Number(bar.height) || 0;
        const color = fail ? "#ff0000" : "#ffffff";
        bar.background = Laya.DrawRectCmd.create(0, 0, w * Math.max(0, Math.min(1, percent)), h, color, null, 1);
    }

    private onListRender(item: any, index: number): void {
        if (!this.gameNode) return;
        if (index < 0 || index >= this._gameImgs.length) return;

        // item 点击 → 实时换算数据索引(防 item 复用时闭包 index 过期)
        item.offAllCaller(this);
        item.on(Laya.Event.CLICK, this, () => {
            Au.tap();
            this._selIdx = this.gameNode!.childIndexToItemIndex(this.gameNode!.getChildIndex(item));
        });

        const path: string = this._gameImgs[index];
        const sp: any = item.getChildByName("Sprite");
        if (!sp) return;
        const bar: any = item.getChildByName("img");
        // 游戏 item(0) 的进度条引用留存: nor 检查/下载的呼吸与百分比通道
        if (index === 0 && bar) this._gameBar = bar;

        if (sp.__img === path) return;
        sp.__img = path;
        UI.setTex(sp, null);

        Res.get(path, (tex: Laya.Texture) => {
            if (sp.__img !== path) return;
            if (tex) {
                UI.setTex(sp, tex);
            }
        });
    }

    onDestroy(): void {
        // 呼吸/预测进度帧循环与 XP 事件清理(防场景销毁后回调打到已销毁对象)
        this._stopBarBreath();
        this._stopProgTrack();
    }
}