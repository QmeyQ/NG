// @ts-nocheck
// traceSel - g2 入口/选择页(新版 G* UI, 代码构建, 不依赖旧 Box/List 预制体节点)。
// 平台体系: 用平台 Res/SceneNav/Dialog/Au; 进入后选"匹配/其他"模式 → 对战(trace.ls)。
const { regClass, property } = Laya;
import { Res } from "./res";
import { Res as PRes } from "../libs/res/res";
import { SceneNav } from "../libs/nav";
import { Dialog } from "../ui/DIalog";
import { Au } from "../libs/au";
import { UI } from "../ui/ui";
import { RoomSession } from "./roomSession";

@regClass()
export class traceSel extends Laya.Script {
    @property(String) public text: string = "";
    private _root: any = null;

    onStart() {
        const owner: any = this.owner;
        // 新版 UI 根容器(GBox), 铺满
        const root = new Laya.GBox();
        root.name = "g2SelectRoot";
        root.left = 0; root.right = 0; root.top = 0; root.bottom = 0;
        owner.addChild(root);
        this._root = root;
        const W = Laya.stage.width, H = Laya.stage.height;

        const title = new Laya.GTextField();
        title.text = "NG2 对战";
        title.fontSize = 64; title.color = "#ffffff"; title.bold = true;
        title.width = W; title.align = "center"; title.y = 120;
        root.addChild(title);


        const modes = [
            { label: "单机模式 · 人机", go: () => this._openBattle(true) },
            { label: "轨迹对战 · 匹配", go: () => this._openBattle(false) },
            { label: "创建房间", go: () => this._openBattle() },
            { label: "返回", go: () => SceneNav.back() },
        ];
        modes.forEach((m, i) => {
            const b = new Laya.GBox();
            b.name = "g2Mode" + i;
            b.width = 420; b.height = 96;
            b.x = (W - 420) / 2; b.y = 320 + i * 140;
            b.background = Laya.DrawRectCmd.create(0, 0, 420, 96, "#2f4f8f", "#5a7fbf", 2);
            const lb = new Laya.GTextField();
            lb.text = m.label; lb.fontSize = 38; lb.color = "#ffffff";
            lb.width = 420; lb.height = 96; lb.align = "center"; lb.valign = "middle";
            b.addChild(lb);
            b.on(Laya.Event.CLICK, this, () => { Au.tap(); m.go(); });
            root.addChild(b);
        });
    }

    private _openBattle(offline: boolean = false): void {
        try { (window as any).__g2Offline = offline; } catch (e) {}
        if (offline) RoomSession.clear(); // 单机清掉旧联机房间, 防止走联机分支
        // 对战场景在 nor 包(g2/game/trace.ls); 用平台 Res(Promise) 加载, g2 Res.get 是同步会返回 null
        // 对战是无状态场景: 每次进入清缓存重建(Res.get 会缓存预制体实例, 复用会带回已清理的旧局)
        try { PRes.clear("g2/game/trace.ls"); } catch (e) { }
        SceneNav.open("g2/game/trace.ls", undefined, (done) => {
            PRes.get("g2/game/trace.ls").then((n: any) => done(n || null)).catch(() => done(null));
        });
    }

    onDestroy() { if (this._root && !this._root.destroyed) this._root.destroy(); }
}
