/**
 * ideMcp - 把 LayaAir IDE 的能力注册成 MCP 工具，供 Agent 直接驱动编辑器
 *
 * 生效范围: 仅 IDE 场景进程。发布进 bundle.js 时整段被 IN_IDE 守卫跳过，
 * 不导出任何符号，游戏侧零副作用。
 *
 * 注册机制(见 library/packages/com.layabox.mcp/LayaAir-mcp-plugin/SceneScript.ts):
 * 装饰器在模块求值时把 handler 推进 server.handlers.scene，插件的
 * onUserScriptsLoad 再 server.reload() 生效——改完本文件等 IDE 热重载即可。
 *
 * 关键约束(mcp-server.js toolCallback): 入参按 params 的 key 声明顺序**位置传参**，
 * 不是传对象；所以形参顺序必须与 params 顺序严格一致，缺省值要自己兜。
 * 返回值用字符串(MCP 侧对非字符串会做 String() 兜底)，统一 JSON.stringify。
 */

/** 是否跑在 IDE 场景进程里(游戏运行时这两个全局不存在) */
const IN_IDE = typeof IEditorEnv !== "undefined" && typeof EditorEnv !== "undefined";

export { };

if (IN_IDE) {

    /** BuildTaskStatus 是数值枚举, 回读时转成名字 */
    const statusName = (s: number): string =>
        s === IEditorEnv.BuildTaskStatus.Success ? "Success"
            : s === IEditorEnv.BuildTaskStatus.Failed ? "Failed"
                : s === IEditorEnv.BuildTaskStatus.Running ? "Running" : "Unknown(" + s + ")";

    class IdeMcpTools {

        @IEditorEnv.mcp.tool("ide-state", "读取 IDE 当前状态: 活动场景、节点数、选中节点、可用构建目标")
        static async ideState(): Promise<string> {
            const scene = EditorEnv.scene;
            const out: any = {
                sceneAsset: (scene && scene.asset && (scene.asset.name || scene.asset.file)) || null,
                nodeCount: scene ? scene.allNodes.size : 0,
                selection: ((scene && scene.selection) || []).map((n: any) => n && n.name),
                productVersion: (globalThis as any).layaairVersion || null,
                buildTargets: ["web", "wxgame", "ttgame", "qqgame", "android", "ios", "hap", "oppogame", "vivogame"]
                    .filter((p: string) => {
                        try { return !!EditorEnv.buildManager.getTargetInfo(p); } catch { return false; }
                    })
            };
            return JSON.stringify(out, null, 2);
        }

        @IEditorEnv.mcp.tool("ide-build", "触发一次构建/发布并等它跑完, 返回状态与产物目录", {
            platform: '构建平台, 默认 web',
            destPath: '产物目录的绝对路径; 留空则用 IDE 构建设置里的输出路径',
            scriptsOnly: '"true"或"1"=只编译脚本不导出资源(快, 改完 ts 验证用), 其它值=完整构建'
        })
        static async build(platform: string, destPath: string, scriptsOnly: string): Promise<string> {
            const p = platform || "web";
            const t0 = Date.now();
            const task = destPath
                ? IEditorEnv.BuildTask.start(p, destPath)
                : IEditorEnv.BuildTask.start(p);
            if (scriptsOnly === "true" || scriptsOnly === "1")
                task.setRecompileMode();

            const status = await task.waitForCompletion();
            const target = EditorEnv.buildManager.getTargetInfo(p);
            return JSON.stringify({
                platform: p,
                status: statusName(status),
                seconds: Math.round((Date.now() - t0) / 100) / 10,
                recompileMode: task.recompileMode,
                output: (target && (target as any).outputPath) || destPath || null
            }, null, 2);
        }

        @IEditorEnv.mcp.tool("ide-find-assets", "按关键字查资源 id 与路径, 用于定位场景/预制体/贴图", {
            keyword: "关键字, 如 match.ls 或 ball",
            limit: "最多返回多少条, 默认 40"
        })
        static async findAssets(keyword: string, limit: string): Promise<string> {
            const n = Number(limit) > 0 ? Number(limit) : 40;
            const list = EditorEnv.assetMgr.findAssets(keyword || "", undefined, false, undefined, n) || [];
            return JSON.stringify(list.map((a: any) => ({
                id: a.id,
                name: a.name,
                file: a.file,
                type: a.type,
                subType: a.subType || undefined
            })), null, 2);
        }

        @IEditorEnv.mcp.tool("ide-open-scene", "在 IDE 里打开指定场景/预制体(传 ide-find-assets 得到的 id 或资源路径)", {
            idOrPath: "资源 id 或 assets 下的路径, 如 assets/game/Scene.ls"
        })
        static async openScene(idOrPath: string): Promise<string> {
            const asset = EditorEnv.assetMgr.getAsset(idOrPath, true);
            if (!asset) return JSON.stringify({ ok: false, msg: "找不到资源: " + idOrPath });
            // openScene 属 UI 进程能力, 场景进程经 runUIScript 跨进程调用
            await EditorEnv.runUIScript("window.eval",
                "Editor.sceneManager.openScene(" + JSON.stringify(asset.id) + ", null)");
            return JSON.stringify({ ok: true, id: asset.id, file: asset.file, name: asset.name });
        }

        @IEditorEnv.mcp.tool("ide-ui-eval", "在 IDE 的 UI 进程里执行一段 JS 并回传结果(接管面板/播放控制等仅 UI 进程有的能力); 表达式需自带返回值, 结果可 JSON 序列化", {
            code: "要在 UI 进程执行的表达式字符串, 例如 Editor.playControls ? 'has-playcontrols' : 'no'"
        })
        static async uiEval(code: string): Promise<string> {
            const r = await EditorEnv.runUIScript("window.eval", code);
            try {
                return JSON.stringify({ ok: true, result: JSON.parse(JSON.stringify(r === undefined ? null : r)) }, null, 2);
            } catch {
                return JSON.stringify({ ok: true, result: String(r) }, null, 2);
            }
        }
    }

    // 装饰器只把 handler 推进注册表, 类本身不被引用 —— 显式留个引用防止打包时被当无用代码剔除
    void IdeMcpTools;
}
