const { regClass, property } = Laya;
import { TimeManager } from "../libs/time";
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
            shieldRecoverRate: 0.03,
            critChance: 0.1,
            critMultiplier: 2,
            stillCheckInterval: 500,
            healRate: 0.03
        });

        // 设置游戏事件回调
        this.setupGameCallbacks();

        // 初始化游戏场景
        this.initializeGameScene();
    }

    /** 设置游戏回调 */
    private setupGameCallbacks(): void {
        this.gameManager.setCallbacks({
            onRoundChange: (round) => {
                console.log(`回合变更: ${round}`);
            },
            onTimeUpdate: (time) => {
                console.log(`剩余时间: ${time}`);
            },
            onDamage: (attacker, target, damage, isCritical) => {
                console.log(`${attacker.isEnemy ? '敌方' : '我方'}对${target.isEnemy ? '敌方' : '我方'}造成${damage}点伤害${isCritical ? '(暴击!)' : ''}`);
            },
            onGameOver: (winner) => {
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
            onTouchStart: (pos) => {
                console.log(`触摸开始: (${pos.x}, ${pos.y})`);
            },
            onTouchEnd: (pos, isClick) => {
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

    /** 创建游戏角色（资源加载完成后调用；联机时远程玩家替换本地 AI 敌人） */
    private createGameCharacters(): void {
        if (typeof window !== "undefined" && (window as any).__ng2BattleStarted) return;
        const area2D = this.getBattleArea();
        if (!area2D) return;

        const room = RoomSession.get();
        this.battleArea2D = area2D;
        const playerIds = (room && room.players) ? room.players : [];
        const localId = (room && room.playerId) || "";
        const remoteIds = playerIds.filter((id: string) => id !== localId);

        if (room && remoteIds.length > 0) {
            // 双端对战：世界坐标共享, 房主左下/非房主右上, 避免双方 master 同点出生互撞
            const W = Laya.stage.width, H = Laya.stage.height;
            const sorted = playerIds.slice().sort();
            const hostLocal = localId === sorted[0];
            if (this.masterCha) this.masterCha.setPosition(hostLocal ? W*0.3 : W*0.7, hostLocal ? H*0.65 : H*0.35);
            remoteIds.forEach((id: string, i: number) => {
                const cha = this.gameManager.createPlayerAvatar(id, { x: hostLocal ? W*0.7 : W*0.3, y: (hostLocal ? H*0.35 : H*0.65) + i * 200 }, area2D, true);
                this.remoteChars.set(id, cha);
            });
            this.startBattleNet(room, localId, remoteIds);
        } else {
            // 单机回退：本地 AI 敌人 + 友方
            const W=Laya.stage.width,H=Laya.stage.height;
            const off=(typeof window!=="undefined" && (window as any).__g2Offline);
            this.gameManager.createEnemy({x:W*0.7,y:H*0.35}, area2D);
            this.gameManager.createAlly({x:W*0.3,y:H*0.35}, area2D);
        }

        // 开始游戏
        this.gameManager.startGame();
        if (typeof window !== "undefined") (window as any).__ng2BattleStarted = true;
    }

    /** 联机角色血量快照（本地玩家 + 远程玩家） */
    private buildNetChars(): any[] {
        const out: any[] = [];
        if (this.masterCha) out.push({ id: this.localId, hp: this.masterCha.health, sh: this.masterCha.shield });
        this.remoteChars.forEach((cha, id) => out.push({ id: id, hp: cha.health, sh: cha.shield }));
        return out;
    }

    /** 双端帧同步：发送本地玩家状态并应用远端玩家状态 */
    private startBattleNet(room: any, localId: string, remoteIds: string[]): void {
        this.localId = localId;
        this.remoteIdList = remoteIds;
        const sortedPlayers = ((room.players && room.players.length) ? room.players : [localId]).slice().sort();
        this.isHost = localId === sortedPlayers[0];
        this.gameManager.authority = this.isHost; // 房主权威: 碰撞/伤害/回合推进

        const stats: any = {
            roomId: room.roomId,
            localId: localId,
            players: room.players || [],
            remoteIds: remoteIds,
            remoteChars: this.remoteChars.size,
            frameSyncStarted: false,
            frameSyncError: null,
            framesSent: 0,
            framesReceived: 0,
            frameEvents: 0,
            rawFrameSample: null,
            rawFrameSamples: [],
            rawKeys: null,
            frameInfoSeen: 0,
            lastRemote: null,
            isHost: this.isHost,
            remoteRound: null,
            appliedRound: null,
            remoteForce: 0,
            maxRemoteForce: 0,
            remoteWinner: null,
            lastWinnerId: null,
            remoteHealth: {},
            remoteLeft: false,
            remoteLeftPlayer: null,
            localRound: null,
            reconnecting: false,
            reconnected: false,
            reconnectAttempts: 0,
            reconnectError: null,
            disconnectSignals: 0,
            remoteJoined: false,
            seqAdopted: false,
            reconnectFailed: false,
            reconnectText: null,
            suppressedSignals: 0,
            battleId: Date.now()
        };
        this.netStats = stats;
        if (typeof window !== "undefined") {
            (window as any).__ng2Net = stats;
            (window as any).__ng2SimulateDisconnect = () => this.onDisconnectSignal({ playerId: this.localId });
            (window as any).__ng2Rematch = () => this.requestRematch();
            (window as any).__ng2ReturnRooms = () => this.returnToLobby();
        }
        BattleControl.setCurrent(this);
        BattleControl.hook();

        const applyState = (state: any) => {
            const cha = this.remoteChars.get(state.p);
            if (!cha) return;
            (cha.Sprite as any).pos(state.x, state.y);
            if (typeof state.a === "number") cha.angle = state.a;
            if (typeof state.f === "number") {
                cha.setForce(state.f);
                stats.remoteForce = state.f;
                if (state.f > (stats.maxRemoteForce || 0)) stats.maxRemoteForce = state.f;
            }
            if (typeof state.r === "number" && state.host) {
                stats.remoteRound = state.r;
                // 回合方按本机视角映射: 房主的 player=房主自己回合 → 非房主视角为 enemy(等待)
                const rd = this.isHost ? (state.rd || "player") : ((state.rd || "player") === "player" ? "enemy" : "player");
                const ph = state.ph || "pre_turn";
                if (state.r !== this.gameManager.getRoundNum() || rd !== this.gameManager.getCurrRound() || ph !== this.gameManager.getCurrPhase()) {
                    this.gameManager.syncRound(state.r, rd, ph);
                    stats.appliedRound = state.r;
                }
            }
            if (typeof state.fire === "number" && state.fire > (this._lastFire[state.p] || 0)) {
                this._lastFire[state.p] = state.fire;
                this.gameManager.remoteFire(state.p, state.a, state.f);
            }
            if (Array.isArray(state.chars)) {
                // 房主帧里消失的角色=已死亡: 本机同步置 0(否则远端尸体一直显示旧血)
                const seen: Record<string, boolean> = {};
                for (const cs of state.chars) if (cs && cs.id) seen[cs.id] = true;
                this.remoteChars.forEach((rc, id) => {
                    if (!seen[id] && rc.health > 0) { rc.health = 0; rc.shield = 0; rc.drawUI(); }
                });
                for (const cs of state.chars) {
                    if (!cs || !cs.id || cs.id === this.localId) continue;
                    const rc = this.remoteChars.get(cs.id);
                    if (!rc) continue;
                    rc.health = cs.hp;
                    rc.shield = cs.sh;
                    rc.drawUI();
                    stats.remoteHealth[cs.id] = { hp: cs.hp, sh: cs.sh };
                }
            }
            if (state.over && state.winner && !this.resultShown) {
                stats.remoteWinner = state.winner;
                this.lastWinnerId = state.winner;
                this.showResultLabel(state.winner === this.localId ? "胜利" : "失败");
            }
            stats.lastWinnerId = this.lastWinnerId;
            stats.lastRemote = { p: state.p, x: state.x, y: state.y, a: state.a, f: state.f, r: state.r };
        };
        const parseFrame = (raw: any) => {
            stats.frameEvents++;
            if (!stats.rawFrameSample) { try { stats.rawFrameSample = JSON.stringify(raw).slice(0, 300); } catch (e) { stats.rawFrameSample = String(raw); } }
            if (stats.frameEvents % 40 === 0 && stats.rawFrameSamples.length < 6) { try { stats.rawFrameSamples.push(JSON.stringify(raw).slice(0, 800)); } catch (e) { stats.rawFrameSamples.push(String(raw)); } }
            if (!stats.rawKeys && raw && typeof raw === "object" && !Array.isArray(raw)) stats.rawKeys = Object.keys(raw);
            if (raw && typeof raw === "object" && (raw as any).frameInfo) stats.frameInfoSeen = (stats.frameInfoSeen || 0) + 1;

            const payloads: any[] = [];
            const collect = (v: any) => {
                if (v == null) return;
                if (Array.isArray(v)) { v.forEach(collect); return; }
                if (typeof v === "string") { payloads.push(v); return; }
                if (typeof v === "object") {
                    if (typeof v.x === "number") { payloads.push(v); return; }
                    if (v.data !== undefined) collect(v.data);
                    if (v.frameInfo !== undefined) collect(v.frameInfo);
                }
            };
            collect(raw);
            for (const p of payloads) {
                let data: any = p;
                if (typeof p === "string") { try { data = JSON.parse(p); } catch (e) { continue; } }
                if (!data) continue;
                if (data.ctrl && data.ctrl.op) {
                    const key = data.ctrl.op + ":" + (data.ctrl.seq || 0);
                    if (RoomSession.markControlApplied(key)) {
                        if (data.ctrl.seq) RoomSession.setSeq(data.ctrl.seq);
                        if (data.ctrl.op === "rematch") this.restartBattle();
                        else if (data.ctrl.op === "toLobby") this.goLobby();
                    }
                }
                if (typeof data.x !== "number") continue;
                if (data.b) {
                    if (!stats.seqAdopted) { RoomSession.setSeq(data.b); stats.seqAdopted = true; }
                    if (data.b !== RoomSession.getSeq()) continue;
                }
                stats.framesReceived++;
                applyState(data);
            }
        };
        this.frameHandler = parseFrame;
        Gnet.onFrame(parseFrame);

        const beginSend = () => {
            if (this.netSendTimer) return;
            this.netSendTimer = true;
            Laya.timer.loop(200, this, () => {
                const local = this.masterCha;
                if (!local) return;
                try {
                    Gnet.sendFrame(JSON.stringify({
                        p: localId,
                        b: RoomSession.getSeq(),
                        ctrl: RoomSession.getControl(),
                        x: local.Sprite.x,
                        y: local.Sprite.y,
                        a: local.angle,
                        f: local.force,
                        r: this.gameManager.getRoundNum(),
                        rd: this.gameManager.getCurrRound(),
                        ph: this.gameManager.getCurrPhase(),
                        host: this.isHost,
                        chars: this.buildNetChars(),
                        fire: this.gameManager.fireSeq,
                        over: this.gameManager.isFinished(),
                        winner: this.lastWinnerId
                    }));
                    stats.framesSent++;
                    stats.localRound = this.gameManager.getRoundNum();
                } catch (e) { /* frame sync not ready */ }
            });
        };

        // 房主启动帧同步；非房主收到 already-start 也视为可用
        Gnet.startFrameSync((err: any) => {
            stats.frameSyncStarted = !err;
            stats.frameSyncError = err ? String(err.message || err) : null;
            beginSend();
        });
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