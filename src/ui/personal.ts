/**
 * PersonalPage - 个人页(item3): 左竖向 tab(背包/战绩/设置/隐私) + 右 panel
 * 背包=3x5 表格(仅头像+数量); 战绩=单列 list(本地 LocalMatch), 点项切对局详情(仅本地);
 * 设置=垂直滚动列表(音乐/音效/击球辅助/双手, 节点自 item4 移入, 绑定仍在 slecet);
 * 隐私=身价设置(自己的身价, 0-500 默认1, 不转移金币)+屏蔽ID(hideId, 绑定在 slecet)。
 * tab 选中态由预制体 GButton(Radio)+button 控制器+GearDisplay 呈现, 代码只赋值 selected。
 */
import { Res } from "../libs/res/res";
import { UI } from "./ui";
import { Dialog } from "./DIalog";
import { Au } from "../libs/au";
import { Cloud } from "../libs/server/cloud";
import { Social } from "../libs/server/social";
import { LocalMatch, MatchDetail } from "../libs/server/localMatch";
import { Timer } from "../libs/time";

export class PersonalPage {
    private host: Laya.GBox;
    private bound = false;
    private tab = 0;
    private view = "list";
    private tabs: (Laya.GBox | null)[] = [];
    private pBag: Laya.GBox | null = null;
    private pRec: Laya.GBox | null = null;
    private pDetail: Laya.GBox | null = null;
    private pSet: Laya.GBox | null = null;
    private pPrivacy: Laya.GBox | null = null;
    private bagTable: Laya.GList | null = null;
    private recList: Laya.GList | null = null;
    private recEmpty: Laya.GTextField | null = null;
    private dTitle: Laya.GTextField | null = null;
    private dScore: Laya.GTextField | null = null;
    private dPlayers: Laya.GList | null = null;
    private priceInp: Laya.GTextInput | null = null;
    private bagArr: string[] = [];
    private matches: MatchDetail[] = [];
    private cur: MatchDetail | null = null;

    constructor(host: Laya.GBox) { this.host = host; }

    open(): void {
        if (!this.bound || !this.tabs[0]) this.bind();
        LocalMatch.load((list) => { this.matches = list; this.render(); });
        Cloud.loadBag(() => { this.bagArr = Object.keys(Cloud.getUser()?.bag || {}).filter(k => (Cloud.getUser()!.bag[k] || 0) > 0); this.render(); });
        if (this.priceInp) this.priceInp.text = String(Social.price);
        this.setView(this.view);
        this.render();
        Timer.setTimeout(0, () => { if (!this.tabs[0]) { this.bind(); this.setView(this.view); this.render(); } });
    }
    close(): void { }
    setTab(i: number): void { this.onTabClick(i); }

    private node<T extends Laya.Node>(n: string): T | null { return UI.findNode(this.host, n) as T | null; }
    private on(n: string, fn: () => void): void { const x = this.node<Laya.Node>(n); if (x) x.on(Laya.Event.CLICK, this, () => { Au.tap(); fn(); }); }

    private bind(): void {
        this.bound = true;
        this.tabs = [this.node<Laya.GBox>("tabBag"), this.node<Laya.GBox>("tabRec"), this.node<Laya.GBox>("tabSet"), this.node<Laya.GBox>("tabPrivacy")];
        this.pBag = this.node<Laya.GBox>("pBag");
        this.pRec = this.node<Laya.GBox>("pRec");
        this.pDetail = this.node<Laya.GBox>("pDetail");
        this.pSet = this.node<Laya.GBox>("pSet");
        this.pPrivacy = this.node<Laya.GBox>("pPrivacy");
        this.bagTable = this.node<Laya.GList>("bagTable");
        this.recList = this.node<Laya.GList>("recList");
        this.recEmpty = this.node<Laya.GTextField>("recEmpty");
        this.dTitle = this.node<Laya.GTextField>("dTitle");
        this.dScore = this.node<Laya.GTextField>("dScore");
        this.dPlayers = this.node<Laya.GList>("dPlayers");
        this.priceInp = this.node<Laya.GTextInput>("priceInp");
        if (this.bagTable) this.bagTable.itemRenderer = (i, it) => this.renderBag(i, it);
        if (this.recList) this.recList.itemRenderer = (i, it) => this.renderRec(i, it);
        if (this.dPlayers) this.dPlayers.itemRenderer = (i, it) => this.renderPlayer(i, it);
        this.on("dBack", () => this.setView("list"));
        this.on("tabBag", () => this.onTabClick(0));
        this.on("tabRec", () => this.onTabClick(1));
        this.on("tabSet", () => this.onTabClick(2));
        this.on("tabPrivacy", () => this.onTabClick(3));
        this.on("priceSave", () => this.savePrice());
    }

    private onTabClick(i: number): void {
        Au.tap();
        this.tab = i;
        this.tabs.forEach((t, k) => { if (t) (t as any).selected = k === i; });
        this.setView("list");
        this.render();
    }
    private setView(v: string): void {
        this.view = v;
        if (this.pBag) this.pBag.visible = this.tab === 0 && v === "list";
        if (this.pRec) this.pRec.visible = this.tab === 1 && v === "list";
        if (this.pDetail) this.pDetail.visible = v === "detail";
        if (this.pSet) this.pSet.visible = this.tab === 2;
        if (this.pPrivacy) this.pPrivacy.visible = this.tab === 3;
    }
    private savePrice(): void {
        const p = Math.trunc(Number(this.priceInp ? this.priceInp.text : 1));
        Social.setPrice(p, (ok) => { Dialog.toast(ok ? "身价已保存: " + Social.price : (Social.lastMsg || "保存失败")); if (ok && this.priceInp) this.priceInp.text = String(Social.price); });
    }
    private render(): void {
        if (!this.bound || !this.tabs[0]) this.bind();
        if (!this.bound) return;
        if (this.tab === 0 && this.bagTable) this.bagTable.numItems = this.bagArr.length;
        if (this.tab === 1) {
            if (this.recList) this.recList.numItems = this.matches.length;
            if (this.recEmpty) this.recEmpty.visible = this.matches.length === 0;
        }
        if (this.view === "detail" && this.cur) {
            if (this.dTitle) this.dTitle.text = (this.cur.mode === "pvp" ? "联机" : "人机") + " · " + (this.cur.win ? "胜" : "负");
            if (this.dScore) this.dScore.text = "比分 " + this.cur.score[0] + " : " + this.cur.score[1] + "  ·  " + new Date(this.cur.ts).toLocaleString();
            if (this.dPlayers) this.dPlayers.numItems = this.cur.players.length;
        }
    }
    /** 背包 3x5 网格: 仅头像+数量 */
    private renderBag(i: number, item: any): void {
        const p = this.bagArr[i]; if (!p) return;
        const u = Cloud.getUser(); const n = u && u.bag ? (u.bag[p] || 0) : 0;
        const img = item.getChildByName("img");
        if (img) { if (img.__img !== p) { img.__img = p; UI.setTex(img, null); Res.get("ui/" + p, (tex: Laya.Texture) => { if (img.__img === p && tex) UI.setTex(img, tex); }); } }
        const ct = item.getChildByName("count"); if (ct) ct.text = "x" + n;
    }
    private renderRec(i: number, item: any): void {
        const m = this.matches[i]; if (!m || !item) return;
        const md = item.getChildByName("rMode"); if (md) md.text = m.mode === "pvp" ? "联机" : "人机";
        const wn = item.getChildByName("rWin"); if (wn) { wn.text = m.win ? "胜" : "负"; wn.color = m.win ? "#07c160" : "#fa5151"; }
        const sc = item.getChildByName("rScore"); if (sc) sc.text = m.score[0] + ":" + m.score[1];
        const tm = item.getChildByName("rTime"); if (tm) tm.text = new Date(m.ts).toLocaleDateString();
        item.off(Laya.Event.CLICK, this, this.onRecClick); item.on(Laya.Event.CLICK, this, this.onRecClick, [m.id]);
    }
    private onRecClick(id: string): void { Au.tap(); this.cur = LocalMatch.get(id); if (this.cur) { this.setView("detail"); this.render(); } }
    private renderPlayer(i: number, item: any): void {
        const p = this.cur && this.cur.players[i]; if (!p || !item) return;
        const img = item.getChildByName("pHead");
        if (img) { const key = p.head || ""; if (img.__h !== key) { img.__h = key; UI.setTex(img, null); if (key) Res.get("ui/" + key, (tex: Laya.Texture) => { if (img.__h === key && tex) UI.setTex(img, tex); }); } }
        const nm = item.getChildByName("pName"); if (nm) nm.text = p.name + (p.self ? " (我)" : "");
        const sd = item.getChildByName("pSide"); if (sd) sd.text = p.side === 0 ? "红" : "蓝";
        const add = item.getChildByName("pAdd");
        if (add) {
            const me = Cloud.getUser();
            const canAdd = !!p.userid && !p.self && me && p.userid !== me.userid && Social.state.f.indexOf(p.userid) < 0;
            add.visible = canAdd;
            if (canAdd) { add.off(Laya.Event.CLICK, this, this.onAddPlayer); add.on(Laya.Event.CLICK, this, this.onAddPlayer, [p.userid]); }
        }
    }
    private onAddPlayer(uid: string): void {
        Au.tap();
        Social.request(uid, (ok) => { Dialog.toast(ok ? "好友申请已发送" : (Social.lastMsg || "申请失败")); this.render(); });
    }
}
