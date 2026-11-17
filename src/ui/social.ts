/**
 * SocialPage - 社交页控制器(预制体绑定, 不代码绘制 UI)
 * item2 嵌套 Panel: socHome(微信式对话列表+右上"+") / socChat / socAdd(含身价) / socGroup(建群) / socPlusMenu(+菜单)
 * 消息: 服务端只转交; 本地收件缓存 Social.mes; 屏蔽词 w=1 渲染红色。
 */
import { Res } from "../libs/res/res";
import { UI } from "./ui";
import { Dialog } from "./DIalog";
import { Au } from "../libs/au";
import { Cloud } from "../libs/server/cloud";
import { Social, FriendProfile, Message } from "../libs/server/social";
import * as Lobby from "../libs/server/lobby";
import { Invite, MatchInvite } from "../libs/server/invite";
import { Gnet } from "../libs/gobe/net";
import { Timer } from "../libs/time";

interface Conv { key: string; gid?: string; peer?: string; last: Message; unread: number; }

export class SocialPage {
    private host: Laya.GBox;
    private bound = false;
    private panel = "home";
    private home: Laya.GBox | null = null;
    private chat: Laya.GBox | null = null;
    private add: Laya.GBox | null = null;
    private grp: Laya.GBox | null = null;
    private plusMenu: Laya.GBox | null = null;
    private convList: Laya.GList | null = null;
    private convEmpty: Laya.GTextField | null = null;
    private msgList: Laya.GList | null = null;
    private msgEmpty: Laya.GTextField | null = null;
    private chatTitle: Laya.GTextField | null = null;
    private chatInp: Laya.GTextInput | null = null;
    private addInp: Laya.GTextInput | null = null;
    private addResult: Laya.GBox | null = null;
    private reqList: Laya.GList | null = null;
    private reqEmpty: Laya.GTextField | null = null;
    private badgePlus: Laya.GTextField | null = null;
    private chatMenuPanel: Laya.GBox | null = null;
    private memList: Laya.GList | null = null;
    private grpInfo: Laya.GTextField | null = null;
    private newchat: Laya.GBox | null = null;
    private ncList: Laya.GList | null = null;
    private funcPanel: Laya.GBox | null = null;
    private funcList: Laya.GList | null = null;
    private fwdPanel: Laya.GBox | null = null;
    private fwdList: Laya.GList | null = null;
    private fwdMsg: Message | null = null;
    private _lpTid: string | null = null;
    private gName: Laya.GTextInput | null = null;
    private gMemList: Laya.GList | null = null;
    private convs: Conv[] = [];
    private chatKey = "";
    private chatGid = "";
    private chatPeer = "";
    private foundId = "";
    private gSel: string[] = [];

    constructor(host: Laya.GBox) { this.host = host; }

    open(): void {
        if (!this.bound) this.bind();
        this.showPanel("home");
        Social.onChange = (): void => this.render();
        Social.init(() => {
            Social.sync((ok: boolean) => { this.render(); if (ok) Social.tryInviteFriend(); Lobby.ensure(() => this.render()); });
            Social.startPolling();
            this.render();
        });
    }
    close(): void { Social.stopPolling(); Social.onChange = null; Social.suppressNotify = false; }

    private node<T extends Laya.Node>(name: string): T | null { return UI.findNode(this.host, name) as T | null; }
    private on(name: string, fn: () => void): void { const n = this.node<Laya.Node>(name); if (n) n.on(Laya.Event.CLICK, this, () => { Au.tap(); fn(); }); }

    private bind(): void {
        this.bound = true;
        this.home = this.node<Laya.GBox>("socHome");
        this.chat = this.node<Laya.GBox>("socChat");
        this.add = this.node<Laya.GBox>("socAdd");
        this.grp = this.node<Laya.GBox>("socGroup");
        this.plusMenu = this.node<Laya.GBox>("socPlusMenu");
        this.convList = this.node<Laya.GList>("convList");
        this.convEmpty = this.node<Laya.GTextField>("convEmpty");
        this.msgList = this.node<Laya.GList>("msgList");
        this.msgEmpty = this.node<Laya.GTextField>("msgEmpty");
        this.chatTitle = this.node<Laya.GTextField>("chatTitle");
        this.chatInp = this.node<Laya.GTextInput>("chatInp");
        this.addInp = this.node<Laya.GTextInput>("addInp");
        this.addResult = this.node<Laya.GBox>("addResult");
        this.reqList = this.node<Laya.GList>("reqList");
        this.reqEmpty = this.node<Laya.GTextField>("reqEmpty");
        this.badgePlus = this.node<Laya.GTextField>("badgePlus");
        this.chatMenuPanel = this.node<Laya.GBox>("chatMenuPanel");
        this.memList = this.node<Laya.GList>("memList");
        this.grpInfo = this.node<Laya.GTextField>("grpInfo");
        this.newchat = this.node<Laya.GBox>("socNewChat");
        this.ncList = this.node<Laya.GList>("ncList");
        this.funcPanel = this.node<Laya.GBox>("chatFuncPanel");
        this.funcList = this.node<Laya.GList>("funcList");
        this.fwdPanel = this.node<Laya.GBox>("fwdPanel");
        this.fwdList = this.node<Laya.GList>("fwdList");
        this.gName = this.node<Laya.GTextInput>("gName");
        this.gMemList = this.node<Laya.GList>("gMemList");
        this.on("socAddBtn", () => { if (this.plusMenu) this.plusMenu.visible = !this.plusMenu.visible; });
        this.on("pmAddFriend", () => { this.foundId = ""; this.showPanel("add"); });
        this.on("pmCreateGroup", () => { this.gSel = []; if (this.gName) this.gName.text = ""; this.showPanel("group"); });
        this.on("pmNewChat", () => { this.showPanel("newchat"); });
        this.on("ncBack", () => this.showPanel("home"));
        this.on("chatFuncBtn", () => { if (this.funcPanel) this.funcPanel.visible = !this.funcPanel.visible; });
        this.on("fwdBack", () => { if (this.fwdPanel) this.fwdPanel.visible = false; });
        this.on("chatMenuBtn", () => { if (this.chatMenuPanel) { this.chatMenuPanel.visible = !this.chatMenuPanel.visible; this.renderMenu(); } });
        this.on("btnLeaveGroup", () => this.onLeaveGroup());
        this.on("chatBack", () => this.showPanel("home"));
        this.on("addBack", () => this.showPanel("home"));
        this.on("gBack", () => this.showPanel("home"));
        this.on("addSearch", () => this.onSearch());
        this.on("rReq", () => this.onRequest());
        this.on("chatSend", () => this.onSend());
        this.on("gCreate", () => this.onCreateGroup());
        if (this.convList) this.convList.itemRenderer = (i, it) => this.renderConv(i, it);
        if (this.msgList) this.msgList.itemRenderer = (i, it) => this.renderMsg(i, it);
        if (this.reqList) this.reqList.itemRenderer = (i, it) => this.renderReq(i, it);
        if (this.memList) this.memList.itemRenderer = (i, it) => this.renderMem(i, it);
        if (this.ncList) this.ncList.itemRenderer = (i, it) => this.renderNc(i, it);
        if (this.funcList) { this.funcList.itemRenderer = (i, it) => this.renderFunc(i, it); this.funcList.numItems = 8; }
        if (this.fwdList) this.fwdList.itemRenderer = (i, it) => this.renderFwd(i, it);
        if (this.gMemList) this.gMemList.itemRenderer = (i, it) => this.renderGMem(i, it);
    }

    private showPanel(p: string): void {
        this.panel = p;
        Social.suppressNotify = p === "chat"; // 正在看聊天时不弹新消息提醒
        if (this.home) this.home.visible = p === "home";
        if (this.chat) this.chat.visible = p === "chat";
        if (this.add) this.add.visible = p === "add";
        if (this.grp) this.grp.visible = p === "group";
        if (this.newchat) this.newchat.visible = p === "newchat";
        if (this.plusMenu) this.plusMenu.visible = false;
        if (p === "chat") Social.markRead();
        this.render();
    }

    private nameOf(id: string): string { const p = Social.profile(id); return (p && p.name) || ("玩家" + String(id).slice(-4)); }
    private headOf(id: string): string { const p = Social.profile(id); return (p && p.head) || ""; }
    private setHead(img: any, head: string): void {
        if (!img) return; const key = head || "";
        if (img.__head === key) return; img.__head = key; UI.setTex(img, null);
        if (key) { const path = key.indexOf("head/") === 0 ? "ui/" + key : key; Res.get(path, (tex: Laya.Texture) => { if (tex && !img.destroyed && img.__head === key) UI.setTex(img, tex); }); }
    }
    private fmtTime(ts: number): string {
        if (!ts) return ""; const d = new Date(ts); const now = new Date(); const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
        if (d.toDateString() === now.toDateString()) return pad(d.getHours()) + ":" + pad(d.getMinutes());
        return (d.getMonth() + 1) + "-" + pad(d.getDate());
    }

    private buildConvs(): void {
        const map = new Map<string, Conv>();
        const me = Cloud.getUser(); const myId = me ? me.userid : "";
        // 先放对话条目(新聊天/群, 即使没发过消息也显示)
        for (const c of Social.convs) {
            if (c.peer) map.set(c.key, { key: c.key, peer: c.peer, last: { id: "", from: "", text: "", ts: c.ts || 0 }, unread: 0 });
            else if (c.gid) map.set(c.key, { key: c.key, gid: c.gid, last: { id: "", from: "", text: (Social.group(c.gid) || {}).name || "群聊", ts: c.ts || 0 }, unread: 0 });
        }
        const all: Message[] = Social.mes.concat(Social.sentMsg);
        for (const m of all) {
            const gid = m.gid ? String(m.gid) : "";
            let key: string; let peer = "";
            if (gid) key = "g:" + gid;
            else { peer = String(m.from) === myId ? String(m.to || "") : String(m.from); if (!peer || peer === myId) continue; key = "p:" + peer; }
            const un = (!gid && Number(m.ts) > Social.readTs && String(m.from) !== myId) ? 1 : 0;
            const cur = map.get(key);
            if (!cur) map.set(key, { key, gid: gid || undefined, peer: peer || undefined, last: m, unread: un });
            else { if (Number(m.ts) > Number(cur.last.ts)) cur.last = m; cur.unread += un; }
        }
        // 确保已有群即使无消息也显示
        for (const gid of Social.state.g) { const k = "g:" + gid; if (!map.has(k)) { const g = Social.group(gid); map.set(k, { key: k, gid, last: { id: "", from: "", text: g ? g.name : "群聊", ts: 0 }, unread: 0 }); } }
        this.convs = Array.from(map.values()).sort((a, b) => Number(b.last.ts) - Number(a.last.ts));
    }

    private render(): void {
        if (!this.bound || !this.home) this.bind();
        if (!this.bound) return;
        if (this.badgePlus) { const b = Social.badge; this.badgePlus.visible = b > 0; this.badgePlus.text = b > 99 ? "99+" : String(b); }
        this.buildConvs();
        if (this.panel === "home") {
            if (this.convList) this.convList.numItems = this.convs.length;
            if (this.convEmpty) this.convEmpty.visible = this.convs.length === 0;
        } else if (this.panel === "chat") {
            const msgs = this.chatMessages();
            if (this.msgList) this.msgList.numItems = msgs.length;
            if (this.msgEmpty) this.msgEmpty.visible = msgs.length === 0;
            if (msgs.length) Timer.setTimeout(60, () => { if (this.msgList && this.panel === "chat") (this.msgList as any).scroller.scrollBottom(false); });
        } else if (this.panel === "add") {
            const reqs = Social.state.req;
            if (this.reqList) this.reqList.numItems = reqs.length;
            if (this.reqEmpty) this.reqEmpty.visible = reqs.length === 0;
            this.renderResult();
        } else if (this.panel === "group") {
            if (this.gMemList) this.gMemList.numItems = Social.state.f.length;
        } else if (this.panel === "newchat") {
            if (this.ncList) this.ncList.numItems = Social.state.f.length;
        }
    }

    private convTitle(c: Conv): string {
        if (c.gid) { const g = Social.group(c.gid); return (g && g.name) || "群聊"; }
        return this.nameOf(c.peer || "");
    }
    private renderConv(i: number, item: any): void {
        const c = this.convs[i]; if (!c || !item) return;
        this.setHead(item.getChildByName("head"), c.gid ? "" : this.headOf(c.peer || ""));
        const nm = item.getChildByName("name"); if (nm) nm.text = this.convTitle(c) + (c.gid ? " [群]" : "");
        const last = item.getChildByName("last");
        const me = Cloud.getUser(); const mine = me && String(c.last.from) === me.userid;
        if (last) { const t = String(c.last.text || ""); last.text = (mine ? "我: " : "") + (t.length > 24 ? t.slice(0, 24) + "…" : t); last.color = c.last.w ? "#fa5151" : "#999999"; }
        const time = item.getChildByName("time"); if (time) time.text = this.fmtTime(Number(c.last.ts));
        const badge = item.getChildByName("badge"); if (badge) { badge.visible = c.unread > 0; badge.text = c.unread > 99 ? "99+" : String(c.unread); }
        item.off(Laya.Event.CLICK, this, this.onConvClick); item.on(Laya.Event.CLICK, this, this.onConvClick, [c.key]);
    }
    private onConvClick(key: string): void { Au.tap(); const c = this.convs.find(x => x.key === key); if (!c) return; this.openChat(c); }

    private openChat(c: Conv): void {
        this.chatKey = c.key; this.chatGid = c.gid || ""; this.chatPeer = c.peer || "";
        if (this.chatTitle) this.chatTitle.text = this.convTitle(c);
        if (this.chatInp) this.chatInp.text = "";
        if (c.gid && !Social.group(c.gid)) Social.groupInfo(c.gid, () => this.render());
        this.showPanel("chat");
    }
    private chatMessages(): Message[] {
        const me = Cloud.getUser(); const myId = me ? me.userid : "";
        if (this.chatGid) return Social.mes.concat(Social.sentMsg).filter(m => String(m.gid || "") === this.chatGid).sort((a, b) => Number(a.ts) - Number(b.ts));
        const t = this.chatPeer;
        return Social.mes.filter(m => !m.gid && String(m.from) === t).concat(Social.sentMsg.filter(m => !m.gid && String(m.to || "") === t && String(m.from) === myId)).sort((a, b) => Number(a.ts) - Number(b.ts));
    }
    private renderMsg(i: number, item: any): void {
        const msgs = this.chatMessages(); const m = msgs[i]; if (!m || !item) return;
        const me = Cloud.getUser(); const mine = me && String(m.from) === me.userid;
        const nm = item.getChildByName("mname"); if (nm) nm.text = (mine ? "我" : this.nameOf(String(m.from))) + " · " + this.fmtTime(Number(m.ts));
        const tx = item.getChildByName("mtext");
        if (tx) { let t = String(m.text || ""); if (m.inv) t += " (点击接受)"; if (m.room) t += " (点击加入)"; tx.text = t.length > 40 ? t.slice(0, 40) + "…" : t; tx.color = m.w ? "#fa5151" : "#191919"; }
        item.background = Laya.DrawRectCmd.create(0, 0, item.width, item.height, mine ? "#fff3e0" : "#ffffff", "#e6e6e6", 1);
        item.off(Laya.Event.CLICK, this, this.onMsgClick); item.on(Laya.Event.CLICK, this, this.onMsgClick, [m]);
        item.off(Laya.Event.MOUSE_DOWN, this, this.onMsgDown); item.on(Laya.Event.MOUSE_DOWN, this, this.onMsgDown, [m]);
        item.off(Laya.Event.MOUSE_UP, this, this.onMsgUp); item.on(Laya.Event.MOUSE_UP, this, this.onMsgUp);
        item.off(Laya.Event.MOUSE_OUT, this, this.onMsgUp); item.on(Laya.Event.MOUSE_OUT, this, this.onMsgUp);
    }
    private renderReq(i: number, item: any): void {
        const r = Social.state.req[i]; if (!r || !item) return;
        this.setHead(item.getChildByName("qHead"), this.headOf(r.id));
        const nm = item.getChildByName("qName"); if (nm) nm.text = this.nameOf(r.id);
        const sub = item.getChildByName("qSub"); if (sub) sub.text = "请求加为好友";
        const ok = item.getChildByName("qOk"); if (ok) { ok.off(Laya.Event.CLICK, this, this.onReqOk); ok.on(Laya.Event.CLICK, this, this.onReqOk, [r.id]); }
        const no = item.getChildByName("qNo"); if (no) { no.off(Laya.Event.CLICK, this, this.onReqNo); no.on(Laya.Event.CLICK, this, this.onReqNo, [r.id]); }
    }
    private onReqOk(id: string): void { Au.tap(); Social.accept(id, (ok) => { Dialog.toast(ok ? "已添加好友" : (Social.lastMsg || "操作失败")); this.render(); }); }
    private onReqNo(id: string): void { Au.tap(); Social.reject(id, (ok) => { Dialog.toast(ok ? "已拒绝(身价已退还)" : (Social.lastMsg || "操作失败")); this.render(); }); }
    private renderResult(): void {
        if (!this.addResult) return; const p = this.foundId ? Social.profile(this.foundId) : null;
        this.addResult.visible = !!p; if (!p) return;
        this.setHead(this.addResult.getChildByName("rHead"), p.head);
        const nm = this.addResult.getChildByName("rName"); if (nm) nm.text = p.name;
        const sub = this.addResult.getChildByName("rSub"); if (sub) sub.text = "ID " + p.userid + " · 胜 " + p.win + " 场 " + p.play;
    }
    private renderGMem(i: number, item: any): void {
        const id = Social.state.f[i]; if (!id || !item) return;
        this.setHead(item.getChildByName("mHead"), this.headOf(id));
        const nm = item.getChildByName("mName"); if (nm) nm.text = this.nameOf(id);
        const tg = item.getChildByName("mToggle");
        if (tg) { const sel = this.gSel.indexOf(id) >= 0; tg.text = sel ? "已选" : "选"; tg.background = Laya.DrawRectCmd.create(0, 0, tg.width, tg.height, sel ? "#07c160" : "#e8e8e8", null, 1); tg.color = sel ? "#fff" : "#191919";
            tg.off(Laya.Event.CLICK, this, this.onGToggle); tg.on(Laya.Event.CLICK, this, this.onGToggle, [id]); }
    }
    private onGToggle(id: string): void { Au.tap(); const i = this.gSel.indexOf(id); if (i >= 0) this.gSel.splice(i, 1); else this.gSel.push(id); this.render(); }
    private onCreateGroup(): void {
        const name = String(this.gName ? this.gName.text : "").trim();
        if (!name) { Dialog.toast("请输入群名称"); return; }
        if (!this.gSel.length) { Dialog.toast("至少选择 1 位好友"); return; }
        Social.createGroup(name, this.gSel, (g) => {
            if (g) { Dialog.toast("群已创建"); this.openChat({ key: "g:" + g.gid, gid: g.gid, last: { id: "", from: "", text: name, ts: Date.now() }, unread: 0 }); }
            else Dialog.toast(Social.lastMsg || "建群失败");
        });
    }
    private menuMembers(): string[] {
        if (this.chatGid) { const g = Social.group(this.chatGid); if (g && g.members) return g.members; }
        const me = Cloud.getUser();
        return (Gnet.getPlayers() || []).map((p: any) => { try { const pr = typeof p.customPlayerProperties === "string" ? JSON.parse(p.customPlayerProperties) : (p.customPlayerProperties || {}); return String(pr.userid || ""); } catch (e) { return ""; } }).filter((x: string) => x && x !== (me ? me.userid : ""));
    }
    private renderMenu(): void {
        const ms = this.menuMembers();
        if (this.memList) this.memList.numItems = ms.length;
        if (this.grpInfo) { const g = this.chatGid ? Social.group(this.chatGid) : null; this.grpInfo.text = g ? (g.name + " · " + ms.length + "人") : ("大厅房 " + Lobby.currentRoom()); }
    }
    private renderMem(i: number, item: any): void {
        const ms = this.menuMembers(); const uid = ms[i]; if (!uid || !item) return;
        const nm = item.getChildByName("mName"); if (nm) nm.text = this.nameOf(uid);
        const del = item.getChildByName("mDel");
        if (del) { del.off(Laya.Event.CLICK, this, this.onDelMem); del.on(Laya.Event.CLICK, this, this.onDelMem, [uid]); }
    }
    private onDelMem(uid: string): void { Au.tap(); Social.remove(uid, (ok) => { Dialog.toast(ok ? "已删除好友" : (Social.lastMsg || "操作失败")); this.renderMenu(); this.render(); }); }
    private onLeaveGroup(): void {
        Au.tap();
        const gid = this.chatGid;
        const g = gid ? Social.group(gid) : null;
        const isLobby = !!(g && g.name && g.name.indexOf(Lobby.region() + "区") === 0);
        const done = (): void => { if (this.chatMenuPanel) this.chatMenuPanel.visible = false; if (isLobby) Lobby.rejoin(() => this.render()); this.showPanel("home"); };
        if (gid) Cloud.teWrite("group", { userid: Cloud.getUser()!.userid, key: Cloud.getUser()!.key, action: "leave", gid }, () => done());
        else done();
    }
    private renderNc(i: number, item: any): void {
        const id = Social.state.f[i]; if (!id || !item) return;
        this.setHead(item.getChildByName("ncHead"), this.headOf(id));
        const nm = item.getChildByName("ncName"); if (nm) nm.text = this.nameOf(id);
        item.off(Laya.Event.CLICK, this, this.onNcClick); item.on(Laya.Event.CLICK, this, this.onNcClick, [id]);
    }
    private onNcClick(id: string): void {
        Au.tap();
        Social.createChat(id, () => { this.openChat({ key: "p:" + id, peer: id, last: { id: "", from: "", text: "", ts: Date.now() }, unread: 0 }); });
    }
    private renderFunc(i: number, item: any): void {
        const labels = ["羽毛球单打", "羽毛球双打", "表情", "图片", "语音", "视频", "文件", "位置"];
        const lb = item.getChildByName("fLabel"); if (lb) { lb.text = labels[i] || ""; lb.color = i < 2 ? "#07c160" : "#b2b2b2"; }
        item.off(Laya.Event.CLICK, this, this.onFunc); item.on(Laya.Event.CLICK, this, this.onFunc, [i]);
    }
    private onFunc(i: number): void {
        Au.tap();
        if (i > 1) { Dialog.toast("暂未开放"); return; }
        const mode = i === 0 ? "singles" : "doubles";
        const target = this.chatGid ? "" : this.chatPeer;
        Invite.create(mode as any, (inv) => {
            if (!inv) { Dialog.toast(Invite.lastMsg || "创建邀请失败"); return; }
            const payload = JSON.stringify({ k: "invite", id: Date.now() + ":iv", from: Cloud.getUser()!.userid, gid: this.chatGid || undefined, invite: inv, ts: Date.now() });
            Social.sendPayload(target, payload, (ok) => { Dialog.toast(ok ? "对局邀请已发送" : (Social.lastMsg || "发送失败")); this.render(); }, this.chatGid || undefined);
        });
    }
    private onMsgClick(m: Message): void {
        if (m.inv) { this.acceptInvite(m.inv); return; }
        if (m.room && m.invId) { Invite.get(m.invId, (inv) => { if (inv) Invite.joinRoom(inv, (ok) => Dialog.toast(ok ? "已加入对局房" : "加入失败")); else Dialog.toast("邀请已失效"); }); return; }
    }
    private acceptInvite(inv: MatchInvite): void {
        Au.tap();
        const me = Cloud.getUser();
        Invite.accept(inv.id, (inv2, full) => {
            if (!inv2) { Dialog.toast(Invite.lastMsg || "接受失败"); return; }
            if (full && me && inv2.id === me.userid) Invite.hostCreateRoom(inv2, (room) => Dialog.toast(room ? "对局房已创建: " + room : "建房失败"));
            else Dialog.toast(full ? "已满员, 等待发起人建房" : "已接受, 等待满员");
            this.render();
        });
    }
    private onMsgDown(m: Message): void {
        this._lpTid = Timer.setTimeout(500, () => { this._lpTid = null; this.openFwd(m); });
    }
    private onMsgUp(): void { if (this._lpTid) { Timer.clear(this._lpTid); this._lpTid = null; } }
    private openFwd(m: Message): void {
        this.fwdMsg = m;
        if (this.fwdPanel) this.fwdPanel.visible = true;
        if (this.fwdList) this.fwdList.numItems = this.fwdTargets().length;
    }
    private fwdTargets(): Array<{ key: string; label: string; gid?: string; peer?: string }> {
        const out: Array<{ key: string; label: string; gid?: string; peer?: string }> = [];
        const seen = new Set<string>();
        const pushPeer = (peer: string): void => { const k = "p:" + peer; if (seen.has(k)) return; seen.add(k); out.push({ key: k, label: this.nameOf(peer), peer }); };
        const pushGid = (gid: string): void => { const k = "g:" + gid; if (seen.has(k)) return; seen.add(k); out.push({ key: k, label: (Social.group(gid) || {}).name || "群聊", gid }); };
        for (const c of Social.convs) { if (c.peer) pushPeer(c.peer); else if (c.gid) pushGid(c.gid); }
        // 覆盖所有好友/群(即使尚未建立对话), 转发不限于已有对话列表
        for (const f of Social.state.f) pushPeer(f);
        for (const gid of Social.state.g) pushGid(gid);
        return out;
    }
    private renderFwd(i: number, item: any): void {
        const t = this.fwdTargets()[i]; if (!t || !item) return;
        const nm = item.getChildByName("fwdName"); if (nm) nm.text = t.label;
        item.off(Laya.Event.CLICK, this, this.onFwd); item.on(Laya.Event.CLICK, this, this.onFwd, [t]);
    }
    private onFwd(t: { key: string; label: string; gid?: string; peer?: string }): void {
        Au.tap();
        const m = this.fwdMsg; if (!m) return;
        const me = Cloud.getUser()!;
        const payload = m.inv ? JSON.stringify({ k: "invite", id: Date.now() + ":fw", from: me.userid, gid: t.gid, invite: m.inv, ts: Date.now() })
            : m.room ? JSON.stringify({ k: "invroom", id: Date.now() + ":fw", from: me.userid, gid: t.gid, room: m.room, inviteId: m.invId, ts: Date.now() })
            : JSON.stringify({ k: "chat", id: Date.now() + ":fw", from: me.userid, gid: t.gid, text: m.text, ts: Date.now(), w: m.w });
        Social.sendPayload(t.peer || "", payload, (ok) => { Dialog.toast(ok ? "已转发到 " + t.label : (Social.lastMsg || "转发失败")); if (this.fwdPanel) this.fwdPanel.visible = false; this.render(); }, t.gid);
    }
    private onSearch(): void {
        const id = String(this.addInp ? this.addInp.text : "").trim();
        if (!id) { Dialog.toast("请输入用户ID"); return; }
        Social.find(id, (p) => { if (p) { this.foundId = p.userid; Dialog.toast("找到: " + p.name); } else { this.foundId = ""; Dialog.toast(Social.lastMsg || "未找到该用户"); } this.render(); });
    }
    private onRequest(): void {
        const id = this.foundId || String(this.addInp ? this.addInp.text : "").trim();
        if (!id) { Dialog.toast("先搜索一个用户"); return; }
        const me = Cloud.getUser(); if (me && id === me.userid) { Dialog.toast("不能加自己为好友"); return; }
        Social.request(id, (ok: boolean) => { Dialog.toast(ok ? "好友申请已发送" : (Social.lastMsg || "申请失败")); this.render(); });
    }
    private onSend(): void {
        const text = String(this.chatInp ? this.chatInp.text : "");
        const cb = (ok: boolean): void => { if (ok) { if (this.chatInp) this.chatInp.text = ""; } else Dialog.toast(Social.lastMsg || "发送失败"); this.render(); };
        if (this.chatGid) Social.send("", text, cb, this.chatGid);
        else if (this.chatPeer) Social.send(this.chatPeer, text, cb);
    }
}
