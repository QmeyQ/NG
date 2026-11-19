const { regClass, property } = Laya;
import { TimeManager, Timer } from "../libs/time";
import { Cha } from "./cha";
import { GameManager } from "./GameManager";
import { EnemyCollisionSpeedBoostEffect } from "./EffectManager";
import { Res } from "./res";
import { RoomSession } from "./roomSession";
import { Gnet } from "../libs/gobe/net";
import { BattleControl } from "./battleControl";
import { SceneNav } from "../libs/nav";
import { G2Online } from "./online";
import { Res as PRes } from "../libs/res/res";

@regClass()
export class Main extends Laya.Script {
    private gameManager: GameManager;
    private timer: TimeManager;
    private res : Res;
    private remoteChars: Map<string, Cha> = new Map();
    private netStats: any = null;
    private netSendTimer: boolean = false;
    private masterCha: Cha;
    private battleArea2D: Laya.Sprite = null;
    private offlineArea: Laya.Sprite = null;
    private getBattleArea(): any { if (typeof window!=="undefined" && (window as any).__g2Offline && this.offlineArea) return this.offlineArea; return this.owner.getChildByName("Area2D"); }
    private localId: string = "";
    private remoteIdList: string[] = [];
    private isHost: boolean = false;
    private lastWinnerId: string | null = null;
    private _lastFire: Record<string, number> = {};
    private _joinSeen: boolean = false;
    private resultShown: boolean = false;
    private frameHandler: any = null;
    private restarting: boolean = false;
    private rematchRequested: boolean = false;
    private reconnecting: boolean = false;
    private reconnectCooldownMs: number = 5000;
    private lastReconnectAt: number = 0;

    onStart() {
    if (typeof window !== "undefined") (window as any).__ng2Battle = this;
    if (typeof window !== "undefined") (window as any).__ng2BattleSeq = ((window as any).__ng2BattleSeq || 0) + 1; // 探针区分新旧局
    // 预制体场景 back 只摘除不销毁 → onDestroy 不跑; 用 removed 事件兜底清理
    this.owner.on(Laya.Event.REMOVED, this, this.onSceneDetached);
    // 重进对战必须重置状态: __ng2BattleStarted 残留=true 会让 createGameCharacters 直接 return(无角色)
    if (typeof window !== "undefined") {
        (window as any).__ng2BattleStarted = false;
        (window as any).__ng2Result = null;
        if ((window as any).__g2Offline) RoomSession.clear(); // 单机不带旧联机房间
    }
    // stage 级节点不随场景销毁: 清理上一局残留
    ["g2OfflineArea", "resultLabel", "roomBanner", "g2BackBtn", "netNotice"].forEach((n) => {
        const old = Laya.stage.getChildByName(n);
        if (old) { old.removeSelf(); old.destroy(); }
    });
    const battleRoom = RoomSession.get();
    if (battleRoom) {
        if (typeof window !== "undefined") {
            (window as any).__ng2BattleRoom = battleRoom;
            (window as any).__ng2BattleScene = "game/trace.ls";
            (window as any).__ng2Battle = this;
            (window as any).__ng2Result = null;
            (window as any).__ng2BattleStarted = false;
            (window as any).__ng2NetNotice = null;
        }
        this.showRoomBanner(battleRoom);
    }
    Res.init();
    if (typeof window!=="undefined" && (window as any).__g2Offline) {
        this.offlineArea = new Laya.Sprite(); this.offlineArea.name="g2OfflineArea";
        const AW = Laya.stage.width, AH = Laya.stage.height;
        this.offlineArea.size(AW, AH);
        // 可见场地: 边框 + 中线(单机无物理墙, 边界反弹在 Cha.manualPhysics)
        this.offlineArea.graphics.drawRect(6, 6, AW - 12, AH - 12, "#787878", "#5a7fbf", 4);
        this.offlineArea.graphics.drawLine(AW / 2, 6, AW / 2, AH - 6, "#5a7fbf", 2);
        Laya.stage.addChild(this.offlineArea);
        // 单机退出按钮(回到模式选择页)
        const back = new Laya.GBox();
        back.name = "g2BackBtn";
        back.size(130, 64); back.pos(AW - 150, 20);
        back.background = Laya.DrawRectCmd.create(0, 0, 130, 64, "#2f4f8f", "#5a7fbf", 2);
        const bl = new Laya.GTextField();
        bl.text = "返回"; bl.fontSize = 32; bl.color = "#ffffff";
        bl.width = 130; bl.height = 64; bl.align = "center"; bl.valign = "middle";
        back.addChild(bl);
        back.on(Laya.Event.CLICK, this, () => { SceneNav.back(); });
        Laya.stage.addChild(back);
    }
    

        this.timer = new TimeManager();
        
        // 初始化游戏管理器
        this.initializeGameManager();
        
        // 加载游戏资源
        this.loadGameResources();
    }



    /** 联机房间信息横幅 */
    private showRoomBanner(room: any): void {
        if (!Laya.stage || typeof (Laya.stage as any).addChild !== "function") return;
        const label = new Laya.GTextField();
        label.name = "roomBanner";
        label.text = `房间 ${room.roomName || room.roomId} · ${room.playerCount || 1}人`;
        label.fontSize = 36;
        label.color = "#FFFFFF";
        label.stroke = 3;
        label.strokeColor = "#000000";
        label.width = Laya.stage.width;
        label.align = "center";
        label.pos(0, 20);
        Laya.stage.addChild(label);
    }

    /** 胜负 UI：全屏结果文本（headless stub 无渲染能力时跳过） */
    private showResultLabel(text: string): void {
        if (this.resultShown) return;
        this.resultShown = true;
        if (Laya.stage && typeof (Laya.stage as any).addChild === "function") {
            const label = new Laya.GTextField();
            label.name = "resultLabel";
            label.text = text;
            label.fontSize = 160;
            label.color = text === '胜利' ? "#FFD700" : "#FF3030";
            label.stroke = 6;
            label.strokeColor = "#000000";
            label.align = "center";
            label.valign = "middle";
            label.width = Laya.stage.width;
            label.height = 240;
            label.pos(0, Laya.stage.height / 2 - 120);
            const oldLabel = Laya.stage.getChildByName("resultLabel");
            if (oldLabel) oldLabel.removeSelf();
            Laya.stage.addChild(label);
            if (typeof window !== "undefined") (window as any).__ng2Result = label.text;
        } else if (typeof window !== "undefined") {
            (window as any).__ng2Result = text;
        }
    }

    /** 初始化游戏管理器 */
    private initializeGameManager(): void {
        // 创建游戏管理器实例
        // 回复速率必须低于伤害输出, 否则护盾/回血形成死局(实测联机150s/单机60s打不死);
        // 阻尼加快(0.25)后碰撞窗口变短, 单机也需低回复
        this.gameManager = new GameManager(this.owner as Laya.Sprite, {
            prepTime: 30,
            baseDmg: 1,
            shieldRecoverRate: 0.02,
            critChance: 0.1,
            critMultiplier: 2,
            stillCheckInterval: 500,
            healRate: 0.02
        });

        // 设置游戏事件回调
        this.setupGameCallbacks();

        // 初始化游戏场景
        this.initializeGameScene();
    }

    /** 设置游戏回调 */
    private setupGameCallbacks(): void {
        this.gameManager.setCallbacks({
            onRoundChange: (round: any) => {
                console.log(`回合变更: ${round}`);
            },
            onTimeUpdate: (time: any) => {
                console.log(`剩余时间: ${time}`);
            },
            onDamage: (attacker: any, target: any, damage: any, isCritical: any) => {
                console.log(`${attacker.isEnemy ? '敌方' : '我方'}对${target.isEnemy ? '敌方' : '我方'}造成${damage}点伤害${isCritical ? '(暴击!)' : ''}`);
            },
            onGameOver: (winner: any) => {
                console.log(`游戏结束，${winner === 'player' ? '玩家' : '敌方'}胜利!`);
                const winnerId = this.localId ? (winner === 'player' ? this.localId : (this.remoteIdList[0] || "")) : null;
                this.lastWinnerId = winnerId;
                const text = this.localId ? (winnerId === this.localId ? '胜利' : '失败') : (winner === 'player' ? '胜利' : '失败');
                this.showResultLabel(text);
            },
            onResourceLoaded: () => {
                console.log("资源加载完成，创建游戏角色");
                this.createGameCharacters();
            },
            onTouchStart: (pos: any) => {
                console.log(`触摸开始: (${pos.x}, ${pos.y})`);
            },
            onTouchEnd: (pos: any, isClick: any) => {
                console.log(`触摸结束: (${pos.x}, ${pos.y}), 是否单击: ${isClick}`);
            }
        });
    }

    /** 初始化游戏场景 */
    private initializeGameScene(): void {
        const area2D = this.getBattleArea();
        if (!area2D) {
            console.error("未找到名为'Area2D'的节点");
            return;
        }

        // 创建主角色
        this.createMasterCharacter(area2D);
    }

    /** 创建主角色 */
    private createMasterCharacter(area2D: Laya.Sprite): void {
        let masterSprite = area2D.getChildByName("master") as Laya.Sprite;
        if (!masterSprite) {
            masterSprite = new Laya.Sprite();
            masterSprite.name = "master";
            masterSprite.size(200, 200);
            area2D.addChild(masterSprite);
        }

        const masterCha = new Cha(masterSprite, false);
        masterCha.bodyPid = (RoomSession.get() && RoomSession.get().playerId) || 'me'; // 注册键=世界 pid, 先于 addCha
        masterCha.attack = 20;
        masterCha.defense = 10;
        masterCha.setPosition(Laya.stage.width*0.3, Laya.stage.height*0.65); // 单机/联机同场地布局
        masterCha.setSize(200, 200);
        masterCha.setHealth(100);
        masterCha.setMaxHealth(100);

        // 设置为主角并添加被动效果
        this.gameManager.setActiveChar(masterCha);
        this.gameManager.addCha(masterCha, false);
        this.masterCha = masterCha;

        // 添加"撞敌速度翻倍"被动效果
        const speedBoostEffect = new EnemyCollisionSpeedBoostEffect(3000);
        masterCha.passiveEffects.push(speedBoostEffect);
    }

    /** 加载游戏资源: g2 资源已在 g2.br 分包(平台 Res 通道), 无需旧 res.res(DPR1 旧格式必失败);
     *  角色立即创建, sprite 纹理由 Cha  ctor 经 PRes.get 异步取 */
    private loadGameResources(): void {
        try { this.createGameCharacters(); } catch (e) { console.error("[g2] start fail:", e && (e as any).stack || e); }
    }

    /** 创建角色 + 建立确定性世界 + 操作/快照通道 */
    private createGameCharacters(): void {
        if (typeof window !== "undefined" && (window as any).__ng2BattleStarted) return;
        const area2D = this.getBattleArea();
        if (!area2D) return;
        const room = RoomSession.get();
        this.battleArea2D = area2D;
        const playerIds = (room && room.players) ? room.players : [];
        const localId = (room && room.playerId) || "me";
        const remoteIds = playerIds.filter((id: string) => id !== localId);
        this.localId = localId;
        this.gameManager.myPid = localId;
        if (this.masterCha) this.masterCha.bodyPid = localId;
        const W = Laya.stage.width, H = Laya.stage.height;
        const posOf = (side: number) => side === 0 ? { x: W * 0.3, y: H * 0.65 } : { x: W * 0.7, y: H * 0.35 };

        if (room && remoteIds.length > 0) {
            // 联机: side 由 pid 字典序决定(各端一致), 位置由 side 决定(世界坐标共享)
            const sorted = playerIds.slice().sort();
            const sideOf = (pid: string) => sorted.indexOf(pid) === 0 ? 0 : 1;
            this.isHost = sideOf(localId) === 0;
            const gm = this.gameManager;
            gm.pidSide = {}; playerIds.forEach(pid => { gm.pidSide[pid] = sideOf(pid); });
            const myPos = posOf(sideOf(localId));
            if (this.masterCha) this.masterCha.setPosition(myPos.x, myPos.y);
            remoteIds.forEach((id: string) => {
                const p2 = posOf(sideOf(id));
                const cha = gm.createPlayerAvatar(id, p2, area2D, true);
                this.remoteChars.set(id, cha);
            });
            this.setupBattleNet();
            if (this.isHost) {
                const bodies = playerIds.map(pid => ({ pid, x: posOf(sideOf(pid)).x, y: posOf(sideOf(pid)).y, hp: 100, sh: 50, side: sideOf(pid) }));
                const seed = this.hashSeed((room.roomId || '') + ':' + RoomSession.getSeq());
                gm.beginWorld(bodies, seed, Timer.now() + 400, true, true);
                this.sendNet({ k: 'g2start', snap: gm.kernel.snapshot() });
            }
            // 非房主: 等 g2start/g2snap 建立世界(applyNetSnap bootstrap)
        } else {
            // 单机: 同一内核, AI 操作本地生成
            const gm = this.gameManager;
            gm.createEnemy({ x: W * 0.7, y: H * 0.35 }, area2D);
            gm.createAlly({ x: W * 0.3, y: H * 0.35 }, area2D);
            gm.pidSide = { [localId]: 0, ai_e: 1, ai_a: 0 };
            const bodies = [
                { pid: localId, x: W * 0.3, y: H * 0.65, hp: 100, sh: 50, side: 0 },
                { pid: 'ai_e', x: W * 0.7, y: H * 0.35, hp: 80, sh: 50, side: 1 },
                { pid: 'ai_a', x: W * 0.3, y: H * 0.35, hp: 70, sh: 50, side: 0 },
            ];
            gm.beginWorld(bodies, (Date.now() & 0x7fffffff) || 1, Timer.now() + 300, false, false);
        }
        Laya.timer.frameLoop(1, this, this.battleTick);
        if (typeof window !== "undefined") (window as any).__ng2BattleStarted = true;
    }

    private hashSeed(str: string): number {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
        return h || 1;
    }

    private battleTick(): void { if (this.gameManager) this.gameManager.tick(); this.flushNet(); }

    /** 操作同步 + 补充状态同步通道(不逐帧覆盖坐标) */
    private setupBattleNet(): void {
        this.gameManager.setNetSend((obj: any) => this.sendNet(obj));
        // 快通道: 帧同步通道承载操作/快照(低延迟); sendToClient 作冗余慢通道(去重)
        const frameHandler = (raw: any) => {
            try {
                let msg: any = raw;
                if (typeof msg === 'string') msg = JSON.parse(msg);
                if (msg && msg.frameInfo) return; // 引擎帧结构忽略
                this.handleNetMsg(msg);
            } catch (e) { }
        };
        Gnet.onFrame(frameHandler);
        this._frameHandler = frameHandler;
        try { Gnet.startFrameSync(() => { }); } catch (e) { }
        const handler = (info: any) => {
            try {
                let msg: any = info && (info.msg !== undefined ? info.msg : info.data);
                if (typeof msg === 'string') msg = JSON.parse(msg);
                this.handleNetMsg(msg);
            } catch (e) { /*  malformed */ }
        };
        Gnet.onClient(handler);
        this._netHandler = handler;
        BattleControl.setCurrent(this);
        BattleControl.hook();
    }
    private _netHandler: any = null;
    private _frameHandler: any = null;
    private handleNetMsg(msg: any): void {
        if (!msg || !msg.k) return;
        try { const rx = (window as any).__g2rx || ((window as any).__g2rx = {}); rx[msg.k] = (rx[msg.k] || 0) + 1; (window as any).__g2rxLast = JSON.stringify(msg).slice(0, 160); } catch (e) { }
        if (msg.seq !== undefined && msg.seq !== RoomSession.getSeq()) { try { (window as any).__g2rxSeqDrop = ((window as any).__g2rxSeqDrop || 0) + 1; } catch (e) { } return; } // 旧局消息忽略
        if (msg.k === 'g2ops') { for (const o of (msg.ops || [])) this.handleNetMsg(o); return; }
        if (msg.k === 'g2ack') { for (const key of (msg.keys || [])) this._unacked.delete(key); return; }
        if (msg.k === 'fire' || msg.k === 'g2fire' || msg.k === 'hit') {
            if (this.gameManager.applyNetOp(msg)) this._pendingAck.push(this.opKey(msg));
        }
        else if (msg.k === 'g2start' || msg.k === 'g2snap') this.gameManager.applyNetSnap(msg.snap);
    }
    private _outbox: any[] = [];
    private _pendingAck: string[] = [];
    private _unacked: Map<string, { op: any; ts: number; tries: number }> = new Map();
    private opKey(o: any): string { return o.k === 'fire' ? ('fire:' + (o.pid || '') + ':' + (o.round !== undefined ? o.round : -1)) : (o.k + ':' + (o.pid || '') + ':' + o.at + ':' + (o.from || '')); }
    private sendNet(obj: any): void {
        // 入箱: 每 tick 合批一条发送(SDK 同 tick 多次 sendFrame 会丢包, 实测 hit 操作丢失)
        const m = Object.assign({ seq: RoomSession.getSeq() }, obj);
        this._outbox.push(m);
        if (m.k === 'fire' || m.k === 'hit') this._unacked.set(this.opKey(m), { op: m, ts: Timer.now(), tries: 0 });
    }
    private flushNet(): void {
        // 可靠投递: 400ms 未 ack 的操作重传(接收端去重), 最多 6 次
        const now = Timer.now();
        this._unacked.forEach((u, key) => {
            if (now - u.ts > 400 && u.tries < 6) { u.ts = now; u.tries++; this._outbox.push(u.op); }
            else if (u.tries >= 6) this._unacked.delete(key);
        });
        if (this._pendingAck.length) { this._outbox.push({ k: 'g2ack', keys: this._pendingAck.splice(0, this._pendingAck.length) }); }
        if (!this._outbox.length) return;
        const batch = this._outbox.splice(0, this._outbox.length);
        const payload = JSON.stringify({ k: 'g2ops', seq: RoomSession.getSeq(), ops: batch });
        try {
            const tx = (window as any).__g2tx || ((window as any).__g2tx = {}); tx['g2ops'] = (tx['g2ops'] || 0) + 1;
            Gnet.sendFrame(payload); // 快通道
            Gnet.sendToClient(Gnet.ROUTE_OTHERS, payload); // 冗余慢通道(接收端去重)
        } catch (e) { try { (window as any).__g2txErr = String(e && (e.message || e)); } catch (e2) { } }
    }

    /** 再来一局：通知对端并重开对战场景 */
    public requestRematch(): void {
        if (this.rematchRequested) return;
        this.rematchRequested = true;
        const nextSeq = RoomSession.getSeq() + 1;
        RoomSession.setSeq(nextSeq);
        RoomSession.setControl({ op: "rematch", seq: nextSeq, until: Date.now() + 8000 });
        try { BattleControl.send("rematch", nextSeq); } catch (e) {}
        setTimeout(() => this.restartBattle(), 1200);
    }

    /** 返回房间列表：通知对端并回到 load.ls */
    public returnToLobby(): void {
        RoomSession.setControl({ op: "toLobby", until: Date.now() + 8000 });
        try { BattleControl.send("toLobby"); } catch (e) {}
        setTimeout(() => this.goLobby(), 2000);
    }

    public onRemoteControl(op: string, msg?: any): void {
        if (op === "rematch") {
            if (msg && msg.seq) RoomSession.setSeq(msg.seq);
            this.restartBattle();
        }
        else if (op === "toLobby") this.goLobby();
    }

    public onRemoteJoin(player: any): void {
        // 重连后服务端 playerId 可能变化：按当前房间玩家重建远端映射
        try {
            const me = this.localId || (Gnet.getCurrentPlayerId ? Gnet.getCurrentPlayerId() : "");
            const players = (Gnet.getPlayers ? Gnet.getPlayers() : []) || [];
            const ids = players.map((pl: any) => pl && (pl.playerId || pl.openId || pl.id)).filter((id: any) => !!id);
            const others = ids.filter((id: any) => id !== me);
            if (others.length > 0) {
                others.forEach((id: string, i: number) => {
                    if (!this.remoteChars.has(id)) {
                        const cha = this.gameManager.createPlayerAvatar(id, { x: Laya.stage.width*0.7, y: Laya.stage.height*0.35 + i * 200 }, this.battleArea2D, true);
                        this.remoteChars.set(id, cha);
                    }
                });
                Array.from(this.remoteChars.keys()).forEach((id: string) => {
                    if (others.indexOf(id) < 0) {
                        const cha = this.remoteChars.get(id);
                        if (cha) { try { (this.gameManager as any).removeChar(cha); } catch (e) {} }
                        this.remoteChars.delete(id);
                    }
                });
                const info = RoomSession.get();
                if (info) { info.players = ids; info.playerCount = ids.length; RoomSession.set(info); }
                if (this.netStats) {
                    this.netStats.remoteIds = others;
                    this.netStats.remoteChars = this.remoteChars.size;
                }
            }
        } catch (e) {}
        if (this.netStats) {
            this.netStats.remoteJoined = true;
            this.netStats.remoteLeft = false;
            this.netStats.remoteJoinedPlayer = player && player.playerId ? player.playerId : null;
        }
        this.showNetNotice(this._joinSeen ? "对手已重连" : "对手已加入");
        this._joinSeen = true;
    }

    public onDisconnectSignal(info: any): void {
        const pid = info && info.playerId;
        if (this.netStats) this.netStats.disconnectSignals = (this.netStats.disconnectSignals || 0) + 1;
        if (pid && pid !== this.localId) return;
        if (this.reconnecting) {
            if (this.netStats) this.netStats.suppressedSignals = (this.netStats.suppressedSignals || 0) + 1;
            return;
        }
        if (this.lastReconnectAt && Date.now() - this.lastReconnectAt < this.reconnectCooldownMs) {
            if (this.netStats) this.netStats.suppressedSignals = (this.netStats.suppressedSignals || 0) + 1;
            return;
        }
        this.lastReconnectAt = Date.now();
        this.tryReconnect(1);
    }

    private showReconnectOverlay(text: string, ok: boolean = false): void {
        if (this.netStats) this.netStats.reconnectText = text;
        if (!Laya.stage || typeof (Laya.stage as any).addChild !== "function") return;
        let label = Laya.stage.getChildByName("reconnectOverlay") as any;
        if (!label) {
            label = new Laya.GTextField();
            label.name = "reconnectOverlay";
            label.fontSize = 44;
            label.stroke = 3;
            label.strokeColor = "#000000";
            label.width = Laya.stage.width;
            label.align = "center";
            label.pos(0, Laya.stage.height / 2 - 220);
            Laya.stage.addChild(label);
        }
        label.text = text;
        label.color = ok ? "#66FF88" : "#FFDD55";
    }

    private hideReconnectOverlay(): void {
        if (!Laya.stage || typeof (Laya.stage as any).getChildByName !== "function") return;
        const label = Laya.stage.getChildByName("reconnectOverlay");
        if (label) label.removeSelf();
    }

    private tryReconnect(attempt: number): void {
        if (!this.netStats) return;
        this.reconnecting = true;
        this.netStats.reconnecting = true;
        this.netStats.reconnectAttempts = attempt;
        this.netStats.reconnectFailed = false;
        this.showReconnectOverlay(`正在重连…（第 ${attempt}/5 次）`);
        Gnet.reconnect((err: any) => {
            if (!err) {
                this.reconnecting = false;
                this.netStats.reconnecting = false;
                this.netStats.reconnected = true;
                this.lastReconnectAt = Date.now();
                this.showReconnectOverlay("已重连", true);
                setTimeout(() => this.hideReconnectOverlay(), 1500);
                return;
            }
            this.netStats.reconnectError = String(err && (err.message || err));
            if (attempt < 5) {
                let remain = 2;
                this.showReconnectOverlay(`连接断开，${remain} 秒后重连…（第 ${attempt + 1}/5 次）`);
                const iv = setInterval(() => {
                    remain--;
                    if (remain > 0) this.showReconnectOverlay(`连接断开，${remain} 秒后重连…（第 ${attempt + 1}/5 次）`);
                    else clearInterval(iv);
                }, 1000);
                setTimeout(() => this.tryReconnect(attempt + 1), 2000);
            } else {
                this.reconnecting = false;
                this.netStats.reconnecting = false;
                this.netStats.reconnectFailed = true;
                this.lastReconnectAt = Date.now();
                this.showReconnectOverlay("重连失败，正在返回房间…");
                setTimeout(() => this.goLobby(), 1500);
            }
        });
    }

    public onRemoteLeave(player: any): void {
        if (this.netStats) {
            this.netStats.remoteLeft = true;
            this.netStats.remoteLeftPlayer = player && player.playerId ? player.playerId : null;
        }
        this.showNetNotice("对手已离开");
    }

    private restartBattle(): void {
        if (this.restarting) return;
        this.restarting = true;
        // 重开对战: 走平台 SceneNav + Res 预制体通道(清缓存重建), 保留 RoomSession(seq 已递增)
        try { PRes.clear("g2/game/trace.ls"); } catch (e) { }
        SceneNav.open("g2/game/trace.ls", undefined, (done) => {
            PRes.get("g2/game/trace.ls").then((n: any) => done(n || null)).catch(() => done(null));
        });
    }

    private goLobby(): void {
        if (this.restarting) return;
        this.restarting = true;
        // 通知对端一起退出(接收端 markControlApplied 去重, 不会回环)
        try { BattleControl.send("toLobby"); } catch (e) { }
        // g2 的"lobby"= 模式选择页: 离开/解散房间后 back, 不去羽毛球的 load.ls
        G2Online.leave(() => { SceneNav.back(); });
    }

    private showNetNotice(text: string): void {
        if (typeof window !== "undefined") (window as any).__ng2NetNotice = text;
        if (!Laya.stage || typeof (Laya.stage as any).addChild !== "function") return;
        const label = new Laya.GTextField();
        label.name = "netNotice";
        label.text = text;
        label.fontSize = 44;
        label.color = "#FFDD55";
        label.stroke = 3;
        label.strokeColor = "#000000";
        label.width = Laya.stage.width;
        label.align = "center";
        label.pos(0, Laya.stage.height - 180);
        const old = Laya.stage.getChildByName("netNotice");
        if (old) old.removeSelf();
        Laya.stage.addChild(label);
    }

    onDestroy(): void {
        this.cleanupBattle();
    }

    /** 场景被摘除(预制体 back 复用链)时同样要清理, 否则幽灵角色/场地残留 */
    private onSceneDetached(): void {
        this.cleanupBattle();
    }

    private _cleaned: boolean = false;
    private cleanupBattle(): void {
        if (this._cleaned) return;
        this._cleaned = true;
        Laya.timer.clearAll(this);
        if (this._netHandler) { try { Gnet.offClient(this._netHandler); } catch (e) { } this._netHandler = null; }
        if (this._frameHandler) { try { Gnet.offFrame(this._frameHandler); } catch (e) { } this._frameHandler = null; }
        this.owner.off(Laya.Event.REMOVED, this, this.onSceneDetached);
        ["g2OfflineArea", "resultLabel", "roomBanner", "g2BackBtn", "netNotice"].forEach((n) => {
            const o = Laya.stage.getChildByName(n);
            if (o) { o.removeSelf(); o.destroy(); }
        });
        if (this.frameHandler) { Gnet.offFrame(this.frameHandler); this.frameHandler = null; }
        if (BattleControl.current === this) BattleControl.setCurrent(null);
        if (this.gameManager) {
            this.gameManager.destroyGame();
        }
    }

    @property(String)
    public text: string = "";
}