import { Timer } from "./time";
import { Dialog } from "../ui/DIalog";
import { Res } from "./res";
import { wxEnv } from "./wx";

/**
 * SceneNav - 场景历史栈 + 返回键(浏览器/安卓)导航
 *
 * 原理: 启动 pushState 垫一个本页历史项; 返回键触发 popstate 时:
 *   - 栈深 > 1: 再补一个 pushState 抵消本次后退(截断), 回退到上一场景
 *   - 根场景(栈深 1): 不补偿, 放行浏览器默认行为(离开页面)
 *
 * 接入约定: 场景跳转一律走 SceneNav.open/reset, 禁止散落 Scene.open
 * 场景链: load.ls(根,index.ts) → menu(预制体,slecet.ts) → match.ls(load.ts) → 游戏场景(SCENE_URL)
 *
 * 【预制体场景 loader(2026-10-21, menu.ls 不上传只入 ui.br 包)】
 * menu.ls 后期不作为独立场景文件部署(Scene.open 的 url 路径加载不到), 只打进 ui.br
 * 资源包经 Res.get 预制体加载——open(url, data, loader) 传自定义加载器即预制体条目:
 *   - 条目 url 即 Res 缓存键(如 "ui/menu.ls"), reset 销毁时同步 Res.clear(url) 防尸体缓存
 *   - 预制体实例**永不销毁只摘除**(Scene.open 的 closeAll 会 removeSelf 非 Scene 节点,
 *     实例留在栈条目里)——back 重建直接挂回复用, 不重跑 onAwake, 界面状态原样保留;
 *     Res.get 缓存单例语义(get 二次返回同一实例)与该策略天然配套
 *   - 引擎场景条目(无 loader)维持销毁重建: Scene 实例 destroy 触发 onDestroy 清理
 *   - match.ls 同模式(2026-10-21): 打进 nor 包 main/ 下, Res.get("nor/main/match.ls")
 *
 * 【sceneShow 复用激活事件(2026-10-21, match 预制体)】
 * 预制体挂 root(首次 open mount / back 复用挂回)后向节点派发 "sceneShow" 事件——
 * 复用不重跑 onAwake, 需要重置流程状态的页面(match: 重新匹配)在脚本 onAwake 注册
 * owner.on("sceneShow") 接管"进入页面"逻辑; 不监听的页面(menu)无感知无副作用。
 *
 * 【场景实例引用 scene(2026-10-21 修复"back 图形卡界面")】
 * Scene.close(url) 内部 r.url===e 严格比较, 而场景实例 url 是 URL.formatURL 后的
 * 绝对地址(相对路径 join basePath)——传相对 url 永远匹配不上, close 静默失败返回 false。
 * 故销毁引擎场景一律持 Scene.open 返回的实例直接 destroy; 实例未就绪(异步加载中/
 * 根场景未登记)才兜底 static close + formatURL。
 */
/** 栈条目: alive=当前是否存活 / scene=场景实例引用 / loader=预制体自定义加载器 */
interface NavEntry {
    url: string;
    alive: boolean;
    scene: Laya.Node | null;
    loader?: ((done: (node: Laya.Node) => void) => void) | null;
}

export class SceneNav {
    /** 场景 url 历史栈, 栈底 = 根场景 */
    private static _stack: NavEntry[] = [];
    /** init 是否已执行(整个页面生命周期一次) */
    private static _inited: boolean = false;
    /** 回退防抖(场景异步加载中连按返回键) */
    private static _busy: boolean = false;

    /**
     * 启动调用(根场景 onAwake): 登记根场景 + 垫历史项 + 绑返回键
     * @param rootUrl 根场景 url(如 "game/load.ls")
     */
    static init(rootUrl: string): void {
        if (SceneNav._inited) return;
        SceneNav._inited = true;
        SceneNav._stack = [{ url: rootUrl, alive: true, scene: null }];
        // 微信小游戏无 window.history(weapp-adapter 未 polyfill): 跳过历史垫项与返回键绑定
        if (wxEnv) return;
        try { history.pushState({ sn: 1 }, "", location.href); } catch (e) { }
        window.addEventListener("popstate", () => {
            if (SceneNav._stack.length > 1) {
                // 截断返回: 补历史项抵消本次后退, 回上一场景
                try { history.pushState({ sn: 1 }, "", location.href); } catch (e) { }
                SceneNav.back();
            }
            // 根场景: 不补 pushState, 历史指针已退到进入前, 再按返回即离开页面(不截断)
        });
    }

    /**
     * 销毁 root 下旧场景 UI 容器 Scene2D(可多个, 全清)
     * 【Scene2D 是 root 直接子节点(非 Scene 实例子树)——scene.destroy()/static close 都清不到,
     * 残留叠加在新界面上; 引擎 Scene.open 会自建新 Scene2D, 销毁旧的无风险】
     */
    private static _killScene2D(): void {
        const root = Laya.stage.getChildByName("root");
        if (!root) return;
        // 活预制体条目节点集合(预制体根 name 也是 "Scene2D"——match/menu 被引擎 closeAll
        // 摘下挂 root 保留, 裸按 name 销毁会误杀它们, back 复用链断 → 走 loader 重建 → 尸体失败)
        const alive = new Set<any>();
        for (const e of SceneNav._stack) {
            if (e.loader && e.scene && !e.scene.destroyed) alive.add(e.scene);
        }
        for (let i = root.numChildren - 1; i >= 0; i--) {
            const c = root.getChildAt(i);
            if (c && (c as any).name === "Scene2D" && !alive.has(c)) c.destroy();
        }
    }

    /** 打开场景并异步登记实例(back 直接销毁/复用用)
     *  loader 协议: 成功 done(node), 失败 done(null)——nav 收 null 清 Res 缓存重试一次
     *  (旧流程销毁过实例而缓存未清时, Res.get 返回已 destroy 尸体, clear 后重取新实例) */
    private static _openScene(url: string, closeOther: boolean, data: any, entry: NavEntry): void {
        if (entry.loader) {
            const mount = (node: Laya.Node): void => {
                if (!node || node.destroyed) return;
                entry.scene = node;
                // 预制体不走 Scene.open(closeAll 不跑): 先销毁旧场景 UI 容器再挂, menu 挂 root(不进 Scene2D)
                SceneNav._killScene2D();
                const root = Laya.stage.getChildByName("root");
                if (root && !node.parent) root.addChild(node);
                // 复用激活: 首次挂载也派发(脚本 onAwake 已跑完, 由此口接管"进入页面"逻辑)
                node.event("sceneShow");
            };
            entry.loader((node) => {
                if (node && !node.destroyed) { mount(node); return; }
                // 缓存尸体/加载失败: 清 Res 缓存(键=条目 url)重试一次
                Res.clear(url);
                entry.loader!((n2) => {
                    if (!n2 || n2.destroyed) {
                        console.warn("[SceneNav] 预制体加载失败:", url);
                        try { Dialog.toast("界面加载失败，请重试"); } catch (e) { }
                        return;
                    }
                    mount(n2);
                });
            });
            return;
        }
        Laya.Scene.open(url, closeOther, data).then((s: Laya.Scene) => {
            if (s && !s.destroyed) entry.scene = s;
            else console.warn("[SceneNav] 场景打开失败(引擎通道):", url);
        });
    }

    /** 摘除并按需销毁一个条目的实例(loader 条目保留实例供 back 复用) */
    private static _closeEntry(e: NavEntry, destroyLoader: boolean): void {
        if (!e.scene || e.scene.destroyed) {
            // 实例引用缺失(根场景未登记/异步加载中) → 静态 close 兜底摘除
            if (!e.loader) {
                try { Laya.Scene.close(Laya.URL.formatURL(e.url)); } catch (err) { }
                SceneNav._killScene2D();
            }
            return;
        }
        if (e.loader) {
            if (e.scene.parent) e.scene.removeSelf();
            if (destroyLoader) {
                e.scene.destroy();
                Res.clear(e.url);
                e.scene = null;
            }
        } else {
            e.scene.destroy();
            e.scene = null;
            // Scene2D 是 root 直接子节点, scene.destroy 不连带 → 显式清防残留
            SceneNav._killScene2D();
        }
    }

    /**
     * 打开新场景(入栈, 关下层)
     * @param url 场景 url(预制体条目 = Res 缓存键如 "ui/menu.ls")
     * @param data 传给新场景的数据(如游戏场景 playerCount)
     * @param loader 预制体自定义加载器(Res.get 通道), 不传则走 Scene.open 引擎场景
     */
    static open(url: string, data?: any, loader?: (done: (node: Laya.Node) => void) => void): void {
        const top = SceneNav._stack[SceneNav._stack.length - 1];
        if (top && top.url === url) {
            // 同场景重复打开(重开重建): 不入栈防堆积, 复活自身
            top.alive = true;
            SceneNav._openScene(url, true, data, top);
            return;
        }
        // 下层: 引擎场景条目销毁(实例 destroy); 预制体条目只摘不销毁(back 复用原样界面)
        for (const s of SceneNav._stack) {

            SceneNav._closeEntry(s, false);
            s.alive = false;
        }
        const entry: NavEntry = { url, alive: true, scene: null, loader: loader || null };
        SceneNav._stack.push(entry);
        SceneNav._openScene(url, true, data, entry);
    }

    /**
     * 回退上一场景(返回键触发 / 代码调用)
     * 弹窗先关; 当前条目摘除(引擎场景销毁/预制体保留);
     * prev 重建: 预制体实例还在 → 直接挂回复用(不重跑初始化); 否则重新加载
     */
    static back(): void {
        if (SceneNav._stack.length <= 1 || SceneNav._busy) return;
        SceneNav._busy = true;
        const cur = SceneNav._stack.pop()!;
        const prev = SceneNav._stack[SceneNav._stack.length - 1];
        try { Dialog.closeD(); } catch (e) { }
        SceneNav._closeEntry(cur, false);
        prev.alive = true;
        if (prev.scene && !prev.scene.destroyed) {
            // 实例在(预制体被 closeAll 摘下未销毁) → 挂回复用 + 派发复用激活事件
            const root = Laya.stage.getChildByName("root");
            if (root && !prev.scene.parent) root.addChild(prev.scene);
            prev.scene.event("sceneShow");
        } else {
            prev.scene = null;
            SceneNav._openScene(prev.url, true, undefined, prev);
        }
        // 场景异步加载完成前防抖(粗暴 500ms 窗口)
        Timer.setTimeout(500, () => { SceneNav._busy = false; });
    }

    /**
     * 重置回根场景(清除数据用): 栈清空重立, 返回键语义归零
     * 预制体条目销毁后必须 Res.clear(url) 清缓存, 否则下次 Res.get 返回已销毁实例
     */
    static reset(url: string): void {
        for (const e of SceneNav._stack) {
            SceneNav._closeEntry(e, true);
        }
        const entry: NavEntry = { url, alive: true, scene: null };
        SceneNav._stack = [entry];
        SceneNav._openScene(url, true, undefined, entry);
    }

    /** 当前栈深(调试用) */
    static get depth(): number {
        return SceneNav._stack.length;
    }
}