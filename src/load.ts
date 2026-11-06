import { Gnet } from "./libs/gobe/net";
import { Timer } from "./libs/time";
import { Au } from "./libs/au";
import { Cloud } from "./libs/cloud";
import { Dialog } from "./ui/DIalog";
import { SceneNav } from "./libs/nav";
import * as NetBoot from "./libs/netboot";
import { QA } from "./libs/gobe/qa";
import * as Msg from "./libs/gobe/msg";
import * as Proto from "./libs/pvpProto";
const { regClass } = Laya;

/**
 * load - 匹配页(match.ls)
 *
 * 流程(服务逻辑已切换为 Cloud 用户体系):
 *   1) 进入即取 Cloud 用户(slecet.ts 同源 userid)作 Gnet openId
 *      联机会话已由选局页随登录/注册初始化好, 这里只在连接失败/accesstoken 到期时单独重取再连
 *   2) Gnet 就绪后直接开始随机匹配(单人 2 人 / 双人 4 人随机)
 *   3) 满员 → 角色分配协商(first/final/okplay) → 跳游戏场景
 *   4) 中心"匹配中"按钮: 匹配中点击=取消, 空闲点击=重新匹配
 *      - 两态: 匹配中(白圆+橙字+粒子发散+大幅呼吸) / 未匹配(over 橙圆+白字+小呼吸)
 *      - 呼吸 = up 背景圆描边 lineWidth 正弦波动(不动按钮 scale/位置, 防 Relation 布局联动)
 *      - 粒子色跟按钮当前态: hover(over 橙圆)=橙系 / 常态(up 白圆)=白系
 */
@regClass()
export class load extends Laya.Script {

    /** match.ls 中心"匹配中"按钮 */
    private matchBtn: any = null;

    /** match.ls 左上角"返回"按钮(取消匹配并返回上一场景) */
    private backBtn: any = null;

    /** pve(单打训练 1v1人机) / pve2(双打训练 2v2人机) 按钮 */
    private pveBtn: any = null;
    private pve2Btn: any = null;

    /** 玩家标识(遵循 slecet.ts 的 Cloud 用户体系, Gnet openId = Cloud userid) */
    private openId: string = "";

    // 匹配状态
    private isMatching: boolean = false;
    /** 已成功进入匹配房间，但仍可能等待房间满员开始对局。 */
    private _matchSucceeded: boolean = false;
    private matchMaxPlayers: number = 2;
    private _gameStarted: boolean = false;
    private _isProcessing: boolean = false;
    /** 匹配请求序号：取消/重试后，迟到的旧请求回调不得再把界面切回成功态。 */
    private _matchAttemptSeq: number = 0;

    // 角色分配协商
    private _collectedAssignments: Map<string, { playerId: string, roleId: number }[]> = new Map();
    private _finalAssignment: { playerId: string, roleId: number }[] | null = null;
    private _assignmentResolved: boolean = false;
    private _resolveTimer: string | null = null;

    // 游戏场景(game 分包内相对路径: uuid 通道断链——fileconfig 空, uuidMap 无映射, res://uuid 加载静默失败)
    private static readonly SCENE_URL: string = "game/badm.ls";

    // —— 按钮视觉效果 ——
    /** 粒子容器(挂按钮父级, 定位按钮中心, 不动按钮子树) */
    private _fxLayer: any = null;
    /** 帧循环 id */
    private _fxTimer: any = null;
    /** 动画帧计数 */
    private _fxT: number = 0;
    /** 匹配中动态点计数 1~6 ("匹配中" → "匹配中." → ... "匹配中......") */
    private _dots: number = 0;

    /** 匹配文案前缀: 按人数区分单/双打 */
    private _matchPrefix(): string {
        return this.matchMaxPlayers === 2 ? "单打匹配中" : "双打匹配中";
    }
    /** up 态背景节点(按钮子树内 lineWidth 最大的 DrawCircleCmd 背景, 新版四态均 lineWidth=100, 严格大于比较命中首个即 up) */
    private _btnBg: any = null;
    /** 呼吸描边宽度基线 */
    private _bgBase: number = 100;
    /** 鼠标是否悬停按钮(over 态切橙圆, 粒子跟随变色) */
    private _btnHover: boolean = false;
    /** 主动取消标志(吞掉离开房间触发的解散事件, 防"取消后又自动重匹配") */
    private _userCancel: boolean = false;
    /** 返回按钮防重(退出匹配异步期间连点只触发一次) */
    private _backing: boolean = false;
    /** 下一次连接作废手上的 accesstoken 单独重取(连接失败置位, 用一次即清; 防重入由 netboot 队列负责) */
    private _forceToken: boolean = false;
    /** 当前 client 已绑定匹配回调的实例，避免场景复用/重连后重复绑定 */
    private _boundMatchClient: any = null;
    /** 断线重连定时器与状态 */
    private _reconnectTimer: string | null = null;
    private _reconnectAttempts: number = 0;
    private _reconnecting: boolean = false;
    /** 页面进入时主动尝试恢复既有 GOBE 会话；不等同于自动开始新匹配。 */
    private _autoReconnectOnEnter: boolean = false;
    /** 服务端报 101106/104101 时，说明旧房间仍占用玩家身份，必须先恢复旧房间，禁止新匹配。 */
    private _roomRecoveryRequired: boolean = false;
    private _networkListenersBound: boolean = false;
    /** 匹配进房后的"等满员"看门狗: 只有自己的房不会自己长人, 到点要退房重新排队 */
    private _matchWaitTid: string | null = null;
    private _matchWaitRetries: number = 0;
    private _disconnectRoom: any = null;
    private _rcvDisconnect: ((player: any, event?: any) => void) | null = null;
    private _onBrowserOnline = (): void => {
        if (!this._gameStarted && (this._matchSucceeded || Gnet.getRoom() || this.isMatching)) {
            this._roomRecoveryRequired = true;
            this._autoReconnectOnEnter = true;
        }
        this._scheduleReconnect(250);
    };
    private _onBrowserOffline = (): void => {
        if (this._gameStarted) return;
        console.warn("[load] 网络断开，等待恢复后重连");
        Dialog.toast("网络已断开，正在等待重连", 1500);
    };
    /** 活跃粒子 */
    private _parts: { node: any; ang: number; dist: number; spd: number; life: number; max: number; base: number }[] = [];
    /** 粒子颜色-灰白系(匹配中 up 态圆: fill #e4e4e4 / line #cbcbcb) */
    private static readonly FX_COLORS_W: string[] = ["#e4e4e4", "#d2d2d2", "#cbcbcb"];
    /** 粒子颜色-橙系(hover/未匹配 over 态橙圆: fill #ff8a00 / line #d16300) */
    private static readonly FX_COLORS_O: string[] = ["#ff8a00", "#ffb200", "#d16300"];

    // 预制体根即 owner(match.ls 根 name="Scene2D", 脚本挂根上)——挂载前后都能直接找子节点,
    // 不依赖 root.getChildByName("Scene2D")(预制体 onAwake 早于 nav 挂 root, 那时查不到)
    private _initSceneNodes(): void {
        const root = this.owner as any;
        if (!root) return;
        this.matchBtn = this._findNode(root, "Button");
        this.backBtn = this._findNode(root, "bButton");
        this.pveBtn = this._findNode(root, "pve");
        this.pve2Btn = this._findNode(root, "pve2");
    }

    private _findNode(root: Laya.Node, name: string): Laya.Node | null {
        if (!root) return null;
        if ((root as any).name === name) return root;
        for (let i = 0; i < root.numChildren; i++) {
            const f = this._findNode(root.getChildAt(i), name);
            if (f) return f;
        }
        return null;
    }

    //组件被激活后执行，此时所有节点和组件均已创建完毕，此方法只执行一次
    onAwake(): void {

        this._initSceneNodes();
        QA.installMatch(this);

        // 匹配按钮控制: 匹配中点击=取消, 空闲点击=重新匹配
        // 禁点击翻转 selected(Check 模式 selected=true 时引擎改显 selectedTitle, 干扰两态文案)
        // CLICK 绑定移 sceneShow(预制体复用重入统一重绑)
        if (this.matchBtn) (this.matchBtn as any).changeStateOnClick = false;

        // 返回按钮: 取消匹配并回上一场景(同防 selected 翻转, 否则会显 selectedTitle"购买")
        if (this.backBtn) (this.backBtn as any).changeStateOnClick = false;
        this.backBtn?.on(Laya.Event.CLICK, this, this.onBackBtnClick);

        // 人机入口: pve=1v1 单打训练 / pve2=2v2 双打训练(取消匹配后直跳 PVE 场景)
        if (this.pveBtn) (this.pveBtn as any).changeStateOnClick = false;
        if (this.pve2Btn) (this.pve2Btn as any).changeStateOnClick = false;
        this.pveBtn?.on(Laya.Event.CLICK, this, () => this._jumpPve(2));
        this.pve2Btn?.on(Laya.Event.CLICK, this, () => this._jumpPve(4));

             // 进入即播电子乐 A/B 版对比循环(Tone.js 动态加载, AudioContext 待首次点击解锁后自动续播)
        // A=旧版字符谱(t=1 停顿模式) / B=原生音符序列(t=0 连奏), 各约 8.4s/8.5s, 9s 切换
        this._playMusic();

        // match 为预制体条目(永不销毁只摘除, back 复用不重跑 onAwake):
        // nav 挂 root(首次挂载/back 复用挂回)后派发 sceneShow；这里只初始化网络，不自动匹配
        (this.owner as any).on("sceneShow", this, this.onSceneShow);
        
            this._setBtnMatching(false)
    }

    /**
     * 复用激活(nav sceneShow 事件): 重置上局流程状态、重绑按钮与网络事件，不自动匹配
     * - 首次挂载触发一次(替代 onAwake 直调 _initUserAndNet, 单点入口防双跑)
     * - 游戏场景 back 回 match 复用挂回再触发(上局 _gameStarted/协商残留全清)
     */
    onSceneShow(): void {
        const hadClient = !!(Gnet as any).client;
        const hadRoom = !!Gnet.getRoom();
        const wasAlreadyPlaying = this._gameStarted;

        // openId 要在任何匹配/重连之前就位: 会话通常在选局页就初始化好了(登录时顺带下发 accesstoken),
        // 那种情况下不会走 _initUserAndNet, 不补这一步 customPlayerProperties.userid 会是空串
        const cu = Cloud.getUser();
        if (cu && cu.userid) this.openId = cu.userid;

        this._gameStarted = false;
        // 页面显示时不自动发起新匹配，但必须优先尝试恢复已存在的 GOBE 会话/房间。
        this.isMatching = false;
        this._matchSucceeded = false;
        this._isProcessing = false;
        this._backing = false;
        this._userCancel = false;
        // 指派状态整体归零(含 seq): 不归零则第二局再也发不出 role_assign
        this._resetAssignmentState();
        if (this._resolveTimer) {
            Timer.clear(this._resolveTimer);
            this._resolveTimer = null;
        }

        const btn: any = this.matchBtn;
        if (btn && !btn.destroyed) {
            btn.offAllCaller(this);
            btn.on(Laya.Event.CLICK, this, this.onMatchBtnClick);
        }
        this._playMusic();
        this._startFx();
        this._bindNetworkListeners();
        // 页面一进入就检查持久化的旧房间 ID；即使 Room 对象已丢失也应尝试恢复。
        if (this._getSavedRoomId()) this._roomRecoveryRequired = true;

        if (Gnet.checkInitialized()) {
            // 在菜单/游戏里挂久了 accesstoken 会过期, 过期后 GOBE 会话必断。
            // 不在房间里才重取并重连(在房间里的恢复交给下面的 reconnect, 别把会话身份覆盖掉)。
            if (!NetBoot.tokenValid() && !Gnet.getRoom()) {
                this._forceToken = true;
                this._initUserAndNet();
                return;
            }
            this._bindMatchListener();
            this._bindDisconnectListener();
            // 如果这是从游戏内返回匹配页，不自动重新进入已结束对局；否则进入页面即恢复已有会话。
            if (!wasAlreadyPlaying && (hadRoom || hadClient || this._getSavedRoomId())) {
                this._autoReconnectOnEnter = true;
                // 本地 Room 丢失但 Client 仍存在时，允许从 SDK lastRoomId 取回旧房间身份。
                if (!hadRoom && hadClient) this._roomRecoveryRequired = true;
                this._scheduleReconnect(0);
            }
        } else if (hadClient) {
            // client 已存在但初始化/重连尚未完成时，不能再次 Gnet.init() 覆盖旧 client 与 lastRoomId。
            this._autoReconnectOnEnter = !wasAlreadyPlaying;
            this._scheduleReconnect(500);
        } else {
            this._initUserAndNet();
        }
    }

    /** 播匹配场景多轨背景乐(piano 主奏+bass 八度跳+organ 和弦+完整鼓组, 明快推进) */
    private _playMusic(): void {
        Au.bgmPlayRich("match");
    }

    /** 绑定浏览器网络事件。online 后尝试恢复连接，但不会擅自开始新的匹配。 */
    private _bindNetworkListeners(): void {
        if (this._networkListenersBound) return;
        this._networkListenersBound = true;
        try {
            window.addEventListener("online", this._onBrowserOnline);
            window.addEventListener("offline", this._onBrowserOffline);
        } catch (e) { }
    }

    private _unbindNetworkListeners(): void {
        if (!this._networkListenersBound) return;
        this._networkListenersBound = false;
        try {
            window.removeEventListener("online", this._onBrowserOnline);
            window.removeEventListener("offline", this._onBrowserOffline);
        } catch (e) { }
    }

    /** Gnet 的 onMatch 没有在包装层暴露 off；同一 client 只安装一个监听器，并把事件转发给当前页面实例。 */
    private _bindMatchListener(): void {
        const client: any = (Gnet as any).client;
        if (!client) return;
        this._boundMatchClient = client;
        client.__activeLoadMatchController = this;
        if (client.__loadMatchListenerInstalled) return;
        client.__loadMatchListenerInstalled = true;
        Gnet.onMatch((resp: any) => {
            const active: any = client.__activeLoadMatchController;
            if (active) active._handleMatchEvent(resp);
        });
    }

    private _handleMatchEvent(resp: any): void {
        // onMatch 事件可能晚于 cancelMatch；而且某些 SDK 错误路径会发 success 事件但没有设置 client.room。
        // 只有仍在匹配且 client.room 已真实存在时才接纳；实际进入房间由 matchRoom Promise 负责。
        if (this._gameStarted || this._userCancel || !this.isMatching) {
            const staleRoom = resp && resp.room;
            if (staleRoom && Gnet.getRoom() === staleRoom && !this._gameStarted) {
                Gnet.leaveRoom((e: Error | null) => { if (e) console.warn("[load] 清理取消后迟到的匹配房间失败:", e.message); });
            }
            return;
        }
        const currentRoom = Gnet.getRoom();
        if (!currentRoom) {
            console.warn("[load] 收到 onMatch 事件，但本地 client.room 为空；等待 matchRoom 回调/SDK 恢复，不提前显示匹配成功", resp);
            return;
        }
        console.log("[load] 匹配结果事件确认本地房间:", currentRoom);
        this.handleRoomJoined(currentRoom, true);
    }

    /** 监听房间断线事件；只对本玩家断线触发重连。 */
    private _bindDisconnectListener(): void {
        const room: any = Gnet.getRoom();
        if (!room || !room.onDisconnect || this._disconnectRoom === room) return;
        this._unbindDisconnectListener();
        this._disconnectRoom = room;
        this._rcvDisconnect = (player: any) => {
            const myId = Gnet.getCurrentPlayerId();
            const disconnectedId = player && (player.playerId || player.id);
            if (disconnectedId && myId && String(disconnectedId) !== String(myId)) return;
            if (!this._gameStarted) {
                this._roomRecoveryRequired = true;
                this._autoReconnectOnEnter = true;
                this._scheduleReconnect(500);
            }
        };
        try { room.onDisconnect(this._rcvDisconnect); } catch (e) {
            this._disconnectRoom = null;
            this._rcvDisconnect = null;
        }
    }

    private _unbindDisconnectListener(): void {
        if (this._disconnectRoom && this._rcvDisconnect) {
            try { this._disconnectRoom.onDisconnect?.off?.(this._rcvDisconnect); } catch (e) { }
        }
        this._disconnectRoom = null;
        this._rcvDisconnect = null;
    }

    /** 指数退避重连。只恢复原连接/原匹配意图，不会把普通进页变成自动匹配。 */
    private _scheduleReconnect(delayMs: number = 1000): void {
        if (this._gameStarted || this._backing || this._userCancel || this._reconnectTimer) return;
        this._reconnectTimer = Timer.setTimeout(delayMs, () => {
            this._reconnectTimer = null;
            this._tryReconnect();
        });
    }

    /** 当前用户对应的本地房间缓存键；仅保存房间 ID，不保存任何认证密钥。 */
    private _roomCacheKey(): string {
        const user = Cloud.getUser();
        const uid = this.openId || Gnet.getOpenId() || (user && user.userid) || "";
        return uid ? `laya_gobe_last_room_${uid}` : "";
    }

    private _getSavedRoomId(): string {
        const key = this._roomCacheKey();
        if (key) {
            try {
                const cached = window.localStorage.getItem(key);
                if (cached) return String(cached);
            } catch (e) { }
        }
        // SDK 的 lastRoomId 可能在主动离房后仍保留；仅在明确遇到断线/101106 恢复任务时才采用。
        if (this._roomRecoveryRequired || this._matchSucceeded) {
            const client: any = (Gnet as any).client;
            const sdkRoomId = client && client.lastRoomId;
            if (sdkRoomId) return String(sdkRoomId);
        }
        return "";
    }

    private _saveRoomId(room: any): void {
        const roomId = room && (room.id || room.roomId || room.roomID);
        const key = this._roomCacheKey();
        if (!roomId || !key) return;
        try { window.localStorage.setItem(key, String(roomId)); } catch (e) { }
    }

    private _clearSavedRoomId(room?: any): void {
        const key = this._roomCacheKey();
        if (!key) return;
        const current = this._getSavedRoomId();
        const roomId = room && (room.id || room.roomId || room.roomID);
        if (roomId && current && String(roomId) !== String(current)) return;
        try { window.localStorage.removeItem(key); } catch (e) { }
    }

    /**
     * 调试/自动化用: 直接建一房两人房(不经过匹配池)。
     * 与 joinRoomById 配套。为什么需要: 随机匹配依赖华为侧池子, 而池子里会长时间挂着"只剩一个
     * 已离线玩家"的鬼房(实测挂 16 分钟), 期间 matchRoom 可能迟迟不给结果 —— 那与被测协议无关。
     * 建房 + 按号进房得到的房间结构同房后匹配出来的完全一样(role_assign 仍然由房主单源发)。
     */
    public createRoomForTest(): void {
        if (this._gameStarted || this._isProcessing) return;
        // 作废上一次取消的迟到收尾(它只对它那一代的房间负责)
        this._matchAttemptSeq++;
        const cu = Cloud.getUser();
        this._isProcessing = true;
        this.isMatching = true;
        this._setBtnMatching(true);
        Gnet.createRoom('qa-' + this.openId + '-' + Date.now(), 2, (err: Error | null, room: any) => {
            this._isProcessing = false;
            if (err || !room) {
                console.warn('[load] 建房失败:', err && err.message ? err.message : '无房间返回');
                this.isMatching = false;
                this._setBtnFail();
                return;
            }
            console.log('[load] 已建房:', room.id || room.roomId);
            this._saveRoomId(room);
            this._matchSucceeded = true;
            this._setBtnMatched();
            this.handleRoomJoined(room, false);
        }, { roomType: 'demo', enableFrameSync: true });
    }

    /**
     * 按房间号直接加入(调试接口用, 走的正是产品里已有的"按 id 恢复房间"这条路)。
     * 为什么要它: 华为匹配池会把只残留 1 人的房一直挂着(实测 16 分钟前的房还在列表里,
     * 里面那个玩家早就退房了), 于是随机匹配每次都各开一个新房, 两个客户端永远配不上对。
     * 真机联机不受影响(玩家本来就是各自随机匹配), 这里只是让自动化能确定性地凑齐一房两人。
     */
    public joinRoomById(roomId: string): void {
        if (!roomId || this._gameStarted || this._isProcessing) return;
        // 同 createRoomForTest: 本次进房属于新的一代, 迟到的取消收尾不得再清状态
        this._matchAttemptSeq++;
        this._isProcessing = true;
        this.isMatching = true;
        this._setBtnMatching(true);
        const cu = Cloud.getUser();
        Gnet.joinRoom(roomId, (err: Error | null, room: any) => {
            this._isProcessing = false;
            if (err || !room) {
                console.warn('[load] 按房间号加入失败:', err && err.message ? err.message : '无房间返回');
                this.isMatching = false;
                this._setBtnFail();
                return;
            }
            this._saveRoomId(room);
            this._matchSucceeded = true;
            this._setBtnMatched();
            this.handleRoomJoined(room, false);
        }, {
            // Gnet.joinRoom 自己按 playerName/teamId 组 customPlayerProperties, 这里给它身份字段
            playerName: (cu && cu.name) || this.openId
        });
    }

    /** 旧 Client 仍在但 room 为空时，GOBE 的 Client 类型没有 reconnect()；应按 lastRoomId 重新 join 原房间。 */
    private _joinPreviousRoom(roomId: string, playerConfig: any): void {
        if (!roomId || this._reconnecting || this._gameStarted || this._backing || this._userCancel) return;
        this._reconnecting = true;
        console.warn(`[load] 本地 Room 为空，尝试通过旧房间 ID 恢复: ${roomId}`);
        Gnet.joinRoom(roomId, (err: Error | null, restoredRoom: any) => {
            this._reconnecting = false;
            if (!err && restoredRoom) {
                this._reconnectAttempts = 0;
                this._roomRecoveryRequired = false;
                this._autoReconnectOnEnter = false;
                this._saveRoomId(restoredRoom);
                this._bindMatchListener();
                this._bindDisconnectListener();
                this.isMatching = true;
                this._matchSucceeded = true;
                this._setBtnMatched();
                console.log("[load] 通过旧房间 ID 恢复成功");
                this.handleRoomJoined(restoredRoom, true);
                return;
            }

            this._reconnectAttempts++;
            console.warn("[load] 按旧房间 ID 恢复失败:", err && err.message ? err.message : err);
            // 限制恢复次数，避免永远卡在“匹配成功”且按钮不可用。失败后回到可操作态。
            if (this._reconnectAttempts >= 3) {
                this._roomRecoveryRequired = false;
                this._autoReconnectOnEnter = false;
                this._matchSucceeded = false;
                this.isMatching = false;
                this._isProcessing = false;
                this._setBtnFail();
                Dialog.toast("恢复旧房间失败，请点击按钮重新匹配", 2500);
                console.error("[load] 旧房间恢复连续失败，已解除恢复锁，不再无限重试");
                return;
            }
            this._scheduleReconnect(Math.min(6000, 1000 * this._reconnectAttempts));
        });
    }

    private _tryReconnect(): void {
        if (this._gameStarted || this._backing || this._userCancel || this._reconnecting) return;
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
            this._scheduleReconnect(2500);
            return;
        }

        const client: any = (Gnet as any).client;
        const room: any = Gnet.getRoom();
        const cu = Cloud.getUser();
        const playerConfig = {
            customPlayerStatus: 0,
            customPlayerProperties: JSON.stringify({
                playerName: (cu && cu.name) || this.openId || Gnet.getOpenId(),
                head: (cu && cu.head) || "",
                flag: (cu && cu.flag) || "",
                userid: this.openId || Gnet.getOpenId(),
                joinTime: Date.now()
            })
        };

        // 优先让当前 Room 自身恢复，保留 SDK 内部的房间身份与玩家会话。
        if (room && typeof room.reconnect === "function") {
            this._reconnecting = true;
            Promise.resolve(room.reconnect(playerConfig)).then(() => {
                this._reconnecting = false;
                this._reconnectAttempts = 0;
                this._roomRecoveryRequired = false;
                this._autoReconnectOnEnter = false;
                this._saveRoomId(Gnet.getRoom() || room);
                this._bindDisconnectListener();
                console.log("[load] 原房间重连成功");
                if (!this._gameStarted) {
                    this.isMatching = true;
                    this._matchSucceeded = true;
                    this._setBtnMatched();
                    this.handleRoomJoined(Gnet.getRoom() || room, true);
                }
            }).catch((err: any) => {
                this._reconnecting = false;
                this._reconnectAttempts++;
                console.warn("[load] 原房间重连失败:", err && err.message ? err.message : err);
                this._scheduleReconnect(Math.min(10000, 1000 * Math.pow(2, Math.min(this._reconnectAttempts, 3))));
            });
            return;
        }

        // client 存在但 init 还未完成时，等待现有 client 完成初始化，不能重建 client 丢掉 lastRoomId。
        if (client && !Gnet.checkInitialized()) {
            if (this._autoReconnectOnEnter || this._roomRecoveryRequired || this._matchSucceeded) {
                this._scheduleReconnect(1000);
            }
            return;
        }

        // GOBE.d.ts 中 Client 没有 reconnect()；Room 才有 reconnect()。
        // Room 丢失时必须使用 SDK 保留的 lastRoomId 或本地持久化 ID 调 joinRoom，不能调用不存在的 client.reconnect。
        if (client && Gnet.checkInitialized() && (this._autoReconnectOnEnter || this._roomRecoveryRequired || this._matchSucceeded)) {
            const oldRoomId = this._getSavedRoomId();
            if (oldRoomId) {
                this._joinPreviousRoom(oldRoomId, playerConfig);
                return;
            }
            // 没有旧房间 ID 就无法通过客户端 API 精确恢复原房间；有限重试后解锁，避免永远卡死。
            this._reconnectAttempts++;
            if (this._reconnectAttempts >= 3) {
                this._roomRecoveryRequired = false;
                this._autoReconnectOnEnter = false;
                this._matchSucceeded = false;
                this.isMatching = false;
                this._isProcessing = false;
                this._setBtnFail();
                Dialog.toast("未找到旧房间信息，请点击按钮重新匹配", 2500);
                console.error("[load] 当前 Client 无 Room 且没有 lastRoomId；停止无限重试并恢复按钮操作");
            } else {
                this._scheduleReconnect(1000 * this._reconnectAttempts);
            }
            return;
        }

        // 没有 Client 才初始化；已有 Client 但 SDK 未初始化时，等待 init 回调，避免无意义地覆盖旧 client。
        if (!client || !Gnet.checkInitialized()) {
            if (!client) this._initUserAndNet();
            else if (this._autoReconnectOnEnter || this._roomRecoveryRequired || this._matchSucceeded) this._scheduleReconnect(1500);
            return;
        }

        // 有明确的旧房间恢复义务时绝不创建新房间，避免 101106 循环。
        if (this._roomRecoveryRequired || this._matchSucceeded) {
            this._reconnectAttempts++;
            this._scheduleReconnect(Math.min(10000, 1000 * Math.pow(2, Math.min(this._reconnectAttempts, 3))));
        } else {
            this._autoReconnectOnEnter = false;
        }
    }

    /** 取 Cloud 用户 id 作 Gnet openId, 就绪后初始化联机服务 */
    private _initUserAndNet(): void {
        const u = Cloud.getUser();
        if (u && u.userid && u.key) {
            this.openId = u.userid;
            this.initGnet();
            return;
        }
        // 没有本地有效身份时，Cloud.init 只会请求 Worker 唯一注册接口 /token {reg:true}。
        Cloud.init((usr) => {
            if (!usr || !usr.userid || !usr.key) {
                // 注册/IP 风控失败时绝不伪造 openId，也不继续请求 GOBE。
                this.openId = "";
                this.isMatching = false;
                this._isProcessing = false;
                this._setBtnFail();
                // Worker 才知道失败原因(注册配额用尽/被 IP 限流/上游异常), 有则照实说
                Dialog.toast(Cloud.lastMsg || "用户注册失败，请稍后点击匹配重试", 2500);
                return;
            }
            this.openId = usr.userid;
            this.initGnet();
        });
    }


    /**
     * 连接联机服务(身份 = Cloud userid)。
     * accesstoken 正常随登录/注册下发、并在选局页就初始化好了会话，这里多数是直接复用；
     * 只有连接失败(_forceToken 置位)或 token 到期才作废缓存、单独重取一张再重建 client。
     */
    private initGnet(): void {
        const force = this._forceToken;
        this._forceToken = false;   // 一次性: 仍失败时由 _onGnetInitFailed 重新置位

        NetBoot.ensure(force, (ok: boolean, msg?: string) => {
            if (!ok) {
                this._onGnetInitFailed(new Error(msg || "连接服务器失败"));
                return;
            }

            console.log("[load] 服务器连接成功, 用户id:", Gnet.getCurrentPlayerId());

            this._bindMatchListener();
            this._bindDisconnectListener();

            this._startFx();
            if (this._roomRecoveryRequired || this._matchSucceeded || this._getSavedRoomId()) {
                this._roomRecoveryRequired = true;
                this._autoReconnectOnEnter = true;
                this._scheduleReconnect(0);
            } else if (this.isMatching && !this._gameStarted && !Gnet.getRoom()) {
                this._startMatch();
            }
        });
    }

    /** Gnet 连接失败统一处理(提示 + 重连/失败态) */
    private _onGnetInitFailed(err: Error): void {
        console.error("[load] 连接服务器失败: " + err.message);
        // 下一次重试作废手上这张 token: 被服务端拒绝或已过期的 token 重发也没用
        this._forceToken = true;
        Dialog.toast("连接服务器失败，正在尝试重连");
        if (this.isMatching && !this._gameStarted) {
            this._setBtnMatching(true);
            this._scheduleReconnect(2000);
        } else {
            this._setBtnFail();
        }
    }

    /**
     * 开始随机匹配: 随机单人(2人) / 双人(4人)房间
     * @param retry 已退房重试过(残留房间退不掉/重试仍失败时终止防死循环)
     */
    private _startMatch(retry: boolean = false): void {
        if (this._isProcessing || this._gameStarted) return;
        // 只有显式开始新一轮匹配时才解除上一次取消抑制；迟到的 room-dismiss 事件不能自动重启匹配。
        if (!this.isMatching) this._userCancel = false;
        // 用户显式开启全新匹配前，不允许残留的旧恢复任务覆盖本次请求。
        if (!this._matchSucceeded && !this._roomRecoveryRequired) this._autoReconnectOnEnter = false;

        // Gnet 未就绪(如 init 失败后点重试): 先重连, 成功回调自动续 _startMatch
        if (!Gnet.checkInitialized()) {
            console.warn("[load] Gnet 未初始化, 重新连接后匹配");
            this.isMatching = true; // 记录用户明确发起的匹配意图，重连成功后续上
            this._setBtnMatching(true);
            this._initUserAndNet();
            return;
        }

        // 匹配前先查房间: 在房间先退出再匹配(防 101106 already in one room)
        if (Gnet.getRoom()) {
            if (retry) {
                console.error("[load] 退房后仍在房间, 匹配失败");
                this.isMatching = false;
                Dialog.toast("匹配失败，点击按钮重试");
                this._setBtnFail();
                return;
            }
            console.log("[load] 匹配前退出残留房间");
            this._setBtnMatching(true);
            this._isProcessing = true;
            Gnet.leaveRoom((leaveErr: Error | null) => {
                if (leaveErr) console.warn("[load] 退房失败:", leaveErr.message);
                this._isProcessing = false;
                this._startMatch(true);
            });
            return;
        }

        this._isProcessing = true;
        // 暂时只开单打(2 人房): 先跑通 1v1 联机, 双打 4 人房的角色协商/权威仲裁待实测
        const maxPlayers = 2;
        this.matchMaxPlayers = maxPlayers;
        this.isMatching = true;
        this._matchSucceeded = false;
        // 玩家显式发起的新一轮匹配: 看门狗的重试额度重新给满
        this._matchWaitRetries = 0;
        this._setBtnMatching(true);
        const attemptId = ++this._matchAttemptSeq;

        console.log(`[load] 开始匹配${maxPlayers}人房间（${maxPlayers === 2 ? '单打' : '双打'}）`);

        // 进房时把昵称/头像/签名/用户id写入 customPlayerProperties, GOBE 自动同步给房间所有玩家
        // (GOBE PlayerConfig 无 playerId 字段——服务器分配的 playerId(11207..)与数据库 userid 是两体系,
        //  用户id经 props 透传供显示/业务身份用, 通讯路由一律用服务器 playerId)
        const cu = Cloud.getUser();
        const props = JSON.stringify({
            playerName: (cu && cu.name) || this.openId,
            head: (cu && cu.head) || "",
            flag: (cu && cu.flag) || "",
            userid: this.openId,
            joinTime: Date.now()
        });

        Gnet.matchRoom({ matchParams: { level: "1" }, maxPlayers: maxPlayers, roomType: "demo" }, (err: Error | null, room: any) => {
            // 用户取消或新匹配已经开始：忽略旧请求回调，避免迟到 success 覆盖“匹配”按钮。
            if (attemptId !== this._matchAttemptSeq || this._userCancel || !this.isMatching) {
                const staleRoom = room || Gnet.getRoom();
                if (staleRoom && Gnet.getRoom() === staleRoom && !this._gameStarted) {
                    Gnet.leaveRoom((leaveErr: Error | null) => { if (leaveErr) console.warn("[load] 清理迟到房间失败:", leaveErr.message); });
                }
                return;
            }
            this._isProcessing = false;
            if (err) {
                // SDK 可能先发 onMatch(success) 并设置了 client.room，随后 Promise 又以 101106 拒绝。
                // 本地已经有房间就接纳现有房间，绝不能再次 leave + match 造成重复匹配。
                const currentRoom = Gnet.getRoom();
                if (currentRoom) {
                    console.warn("[load] matchRoom 返回错误但 SDK 已加入房间，接纳现有房间:", err.message);
                    this.handleRoomJoined(currentRoom, true);
                    return;
                }
                // 101106/104101 且本地 room=null 时，leaveRoom 必然报 Not in a room。
                // 不再盲目退房重试；等待 SDK 自动恢复一次，恢复不到就明确失败，允许用户手动重试。
                if (/101106|104101/.test(String(err.message || err))) {
                    console.warn("[load] 服务器仍保留旧房间身份，立即尝试恢复原客户端/房间，禁止再次 matchRoom:", err.message);
                    this._roomRecoveryRequired = true;
                    this._autoReconnectOnEnter = true;
                    this.isMatching = true;
                    this._matchSucceeded = false;
                    this._reconnectAttempts = 0;
                    this._setBtnMatching(true);
                    this._scheduleReconnect(0);
                    return;
                }
                console.error("[load] 匹配失败: " + err.message);
                this.isMatching = false;
                this._matchSucceeded = false;
                Dialog.toast("匹配失败，点击按钮重试");
                this._setBtnFail();
                return;
            }

            console.log("[load] 匹配成功", room);
            this.handleRoomJoined(room, true);
        }, { customPlayerProperties: props });
    }

    /**
     * 按钮两态切换: 匹配中(白圆+橙字"单/双打匹配中"+动态点) / 未匹配(橙底白字"匹配")
     * 背景圆颜色由呼吸帧按 isMatching 持续重画, 此处只管文案与字色
     * 文字不变根因: GButton Check 模式点击翻转 selected 后显示 selectedTitle, 须与 title 同步设置
     */
    private _setBtnMatching(on: boolean): void {
        const btn: any = this.matchBtn;
        if (!btn || btn.destroyed) return;
        this._matchSucceeded = false;
        const txt = on ? this.matchMaxPlayers === 2 ? "单打匹配中" : "双打匹配中" : "匹配";
        btn.title = txt;
        btn.selectedTitle = txt;
        btn.titleColor = on ? "#ff8600" : "#ffffff";
        // GButton 点击后可能保留 selected；统一还原成未点击态。
        btn.selected = false;
        if (!on) this._dots = 0;
    }

    /** 匹配成功态：按钮显示成功文案并清除 selected，但保留 isMatching 以便用户仍可取消等待中的房间。 */
    private _setBtnMatched(): void {
        const btn: any = this.matchBtn;
        if (!btn || btn.destroyed) return;
        this._matchSucceeded = true;
        this._dots = 0;
        btn.title = "匹配成功";
        btn.selectedTitle = "匹配成功";
        btn.titleColor = "#ffffff";
        btn.selected = false;
    }


    /**
     * 按钮失败态: "匹配失败"红字(连接失败/匹配失败共用)
     * 背景仍走呼吸帧的未匹配态(橙圆), 点击按钮即重新匹配恢复
     */
    private _setBtnFail(): void {
        const btn: any = this.matchBtn;
        if (!btn || btn.destroyed) return;
        btn.title = "匹配失败";
        btn.selectedTitle = "匹配失败";
        btn.titleColor = "#ff0000";
        btn.selected = false;
        this._dots = 0;
    }

    /**
     * 匹配按钮点击: 匹配中 → 取消; 空闲 → 重新匹配
     */
    private onMatchBtnClick(): void {
        Au.tap();
        // 匹配请求进行中也必须允许再次点击取消；_isProcessing 只阻止空闲态重复发起请求。
        if (this._gameStarted || (this._isProcessing && !this.isMatching && !Gnet.getRoom())) return;
        if (this.isMatching || Gnet.getRoom()) {
            // 主动取消: 标记吞掉随后离开房间触发的解散事件(防自动重匹配体感"没停止")
            this._userCancel = true;
            this._isProcessing = true;
            console.log("[load] 取消匹配");
            this.exitMatch(() => {
                this._setBtnMatching(false);
            });
        } else {
            this._startMatch();
        }
    }

    /**
     * 跳 PVE 人机场景: 匹配中先取消(清房), 空闲直跳
     * @param pc 玩家数(含人机): pve=2(1v1) / pve2=4(2v2)
     */
    private _jumpPve(pc: number): void {
        Au.tap();
        if (this._gameStarted || this._isProcessing) return;
        const go = () => {
            // 模式全局变量(游戏场景 badm.ts 读): 非 pvp 即走 PVE;
            // assignments 上局 pvp 残留必清, gameMode 显式覆盖防误判
            (window as any).gamePlayerCount = pc;
            (window as any).gameMode = "pve";
            (window as any).gamePlayerAssignments = null;
            this._gameStarted = true;
            this._stopFx();
            console.log(`[load] 跳 PVE 人机场景(${pc}人)`);
            SceneNav.open(load.SCENE_URL, { playerCount: pc });
        };
        if (this.isMatching || Gnet.getRoom()) {
            this._userCancel = true;
            this._isProcessing = true;
            console.log("[load] pve: 退出匹配");
            this.exitMatch(go);
        } else {
            go();
        }
    }

    /**
     * 返回按钮(bButton)点击: 取消匹配并返回上一场景(menu.ls)
     * 匹配中 → exitMatch 清房间后回退; 空闲 → 直接回退
     */
    private onBackBtnClick(): void {
        Au.tap();
        if (this._gameStarted || this._backing) return;
        this._backing = true;
        const go = () => {
            const d = SceneNav.depth;
            SceneNav.back();
            // back 被防抖吞掉(栈深未变)时复位, 允许重试; 成功则场景即将销毁, 保持锁死防连点
            if (SceneNav.depth === d) this._backing = false;
        };
        if (this.isMatching || Gnet.getRoom()) {
            this._userCancel = true;
            this._isProcessing = true;
            console.log("[load] 返回: 退出匹配");
            this.exitMatch(go);
        } else {
            go();
        }
    }

    /**
     * 退出匹配模式
     */
    private exitMatch(onDone?: () => void): void {
        const wasMatching = this.isMatching;
        // 立即使正在途中的 matchRoom/onMatch 回调失效；迟到 success 不得复活已取消的匹配。
        this._matchAttemptSeq++;
        // 本次取消自己的代数: 下面每一段异步(GOBE 回调 + 500ms 补偿)都必须仍是同一代才继续。
        // 不守这一条会出实测事故: 取消→重新匹配→已进新房并拿到 role_assign, 上一次取消的
        // leaveRoom 迟到执行, 把【刚进的这个房】退掉(权威端因此整帧线程停摆, 另一端再也收不到)。
        const seq = this._matchAttemptSeq;
        const roomAtCancel = Gnet.getRoom();
        // 新一轮匹配已经开始(_isProcessing/已进房)时, 旧的收尾不得再清指派状态
        const superseded = () => seq !== this._matchAttemptSeq;
        this._matchSucceeded = false;
        this._roomRecoveryRequired = false;
        this._autoReconnectOnEnter = false;
        this._reconnectAttempts = 0;
        if (this._reconnectTimer) {
            Timer.clear(this._reconnectTimer);
            this._reconnectTimer = null;
        }
        this._dots = 0;
        this.isMatching = false;

        const finish = () => {
            if (superseded()) {
                console.warn("[load] 本次取消已被新一轮匹配取代, 迟到收尾不再清理房间与指派");
                return;
            }
            // 上一次取消的 500ms 收尾可能迟到落在"已经进房并已采纳指派"之后:
            // 实测因此把 _finalAssignment 清成 null, 而游戏场景已经按那张表开起来了 ——
            // 两端从这一刻起一张表一份, 权威帧与击球事件全数错配(表现就是开局几秒后整体卡死)。
            if (this._gameStarted || this._assignmentResolved) {
                console.warn("[load] 本局已进房/已定指派, 迟到取消收尾不再清理状态");
                return;
            }
            this._isProcessing = false;
            // 离开房间即作废本次指派, 下一局重新走 role_assign
            this._resetAssignmentState();
            // 保留取消标记，直到用户显式开始下一轮匹配；避免超过 2 秒的迟到 room-dismiss 事件自动重匹配。
            console.log("[load] 已退出匹配");
            onDone?.();
        };

        // 只退"取消那一刻所在的那个房": 期间如果进了新房(GOBE 匹配到了), 这个回调就什么都不是
        const leaveIfSameRoom = (done: () => void) => {
            const now = Gnet.getRoom();
            if (!now) { done(); return; }
            // 取消那一刻本就没有房间 → 这次取消不拥有任何房间。GOBE 的 cancelMatch 回调可以
            // 晚到好几秒, 期间新一轮匹配已经进房; 这时再 leaveRoom 就是把【正在打的那个房】退掉
            // (实测: 权威端因此在开局 10s 后被移出房间, 另一端抱着 42m 的球位差再打 3 分钟)。
            if (!roomAtCancel || now !== roomAtCancel) {
                console.warn("[load] 取消期间房间已更换/当时无房, 放弃退房");
                done();
                return;
            }
            Gnet.leaveRoom((leaveErr: Error | null) => {
                if (leaveErr) console.warn("[load] 离开房间失败:", leaveErr.message);
                else this._clearSavedRoomId(now);
                done();
            });
        };

        if (wasMatching) {
            Gnet.cancelMatch((cancelErr: Error | null) => {
                if (cancelErr) console.warn("[load] 取消匹配失败:", cancelErr.message);
                if (superseded()) {
                    console.warn("[load] 取消匹配的回调已过期, 不做退房");
                    return;
                }
                leaveIfSameRoom(() => Timer.setTimeout(500, finish));
            });
        } else {
            leaveIfSameRoom(() => Timer.setTimeout(500, finish));
        }
    }

    /**
     * 检查房间是否满员，满员则开始角色分配协商
     */
    private checkAndStartGame(): void {
        if (this._gameStarted) return;
        if (this._assignmentResolved) return;
        const room = Gnet.getRoom();
        if (!room) return;
        const players = Gnet.getPlayers();
        const maxPlayers = room.maxPlayers || this.matchMaxPlayers;
        if (players.length >= maxPlayers) {
            this._assignRoles(players);
        }
    }

    /**
     * 重置角色分配协商状态，允许重新满人计算
     */
    // ============ 角色指派(单一权威源; 时序定义见 libs/pvpProto) ============
    // 旧实现: 满员后每端各算一份表广播 first, 房主挑"第一个有表的"发 final, 再靠 okplay 互认。
    // 实测后果: 后进那端的 players 列表还没刷新就自认房主、给自己发 final, 两端拿到不同的表
    //           (A 停在 1/2 只看得到自己, B 与遗留玩家配成 2/2 各自开场)。
    // 现在: 满员只由房主判定并出唯一一份 role_assign; 其他端只认房主的表,
    //       回 ack 后等 match_start —— 只有收到开赛令的一方才跳场景。

    /** 房主生成的指派序号(用生成时刻, 全员按它幂等) */
    private _assignSeq: number = 0;
    /** 本机已应用过的指派序号 */
    private _appliedAssignSeq: number = 0;
    /** 房主已收到的 ack */
    private _assignAcks: Set<string> = new Set();
    /** 已采纳但还没等到 match_start 的分配表 */
    private _pendingAssign: any[] | null = null;

    /** 匹配页消息上下文: 身份取房间 playerId; 这一阶段还没有权威端, 任期恒 0 */
    private _msgCtx: Msg.SpaceCtx = {
        selfId: () => this._myRoomPid(),
        authId: () => null,
        authTerm: () => 0
    };
    /** 指派三件套的处理器; 走 msg 层统一信封/过期/校验, 本处只管业务 */
    private _msgSubs: Record<string, (data: any, senderId: string) => void> = {
        [Proto.Kind.RoleAssign]: (d, s) => this._onRoleAssign(d, s),
        [Proto.Kind.RoleAck]: (d, s) => this._onRoleAck(d, s),
        [Proto.Kind.MatchStart]: (d, s) => this._onMatchStart(d, s)
    };

    /** 本机在房间体系里的 id(GOBE 分配的 playerId) */
    private _myRoomPid(): string {
        return String(Gnet.getCurrentPlayerId() || this.openId || '');
    }

    /** 本房间房主(GOBE 建房者); 拿不到就退回当前权威端/自己 */
    private _matchOwnerId(): string {
        const room: any = Gnet.getRoom();
        return String(Gnet.getRoomOwnerId() || (room && room.ownerId) || this._myRoomPid());
    }

    /** 换房/退房/重匹配/回菜单: 指派状态整体归零 */
    private _resetAssignmentState(): void {
        this._assignSeq = 0;
        this._appliedAssignSeq = 0;
        this._assignAcks = new Set<string>();
        this._pendingAssign = null;
        this._finalAssignment = null;
        this._assignmentResolved = false;
        if (this._resolveTimer) {
            Timer.clear(this._resolveTimer);
            this._resolveTimer = null;
        }
    }

    /** 满员入口: 只有房主出表, 其他端安静等 role_assign */
    private _assignRoles(players: any[]): void {
        if (this._assignmentResolved || this._assignSeq > 0) return;
        const ownerId = this._matchOwnerId();
        if (ownerId !== this._myRoomPid()) {
            console.log(`[load] 满员 ${players.length} 人, 本机非房主(房主=${ownerId}), 等待 role_assign`);
            return;
        }
        const roleIds = players.map((_p: any, i: number) => i);
        for (let i = roleIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = roleIds[i]; roleIds[i] = roleIds[j]; roleIds[j] = t;
        }
        const assignments = players.map((p: any, i: number) => ({
            playerId: String(p.playerId),
            roleId: roleIds[i],
            teamId: Proto.teamOfRoleId(roleIds[i], players.length)
        }));
        const room: any = Gnet.getRoom();
        this._assignSeq = Timer.now();
        this._finalAssignment = assignments;
        this._assignAcks = new Set<string>([this._myRoomPid()]);
        this._sendAssign(Proto.Kind.RoleAssign, this._assignSeq, assignments, String((room && (room.id || room.roomId)) || ''));
        console.log(`[load] 房主指派角色 seq=${this._assignSeq}: ${JSON.stringify(assignments)}`);
        // 房主自己先生效; 其他端必须等 match_start
        this._applyAssignmentAndStart(assignments);
        this._resolveTimer = Timer.setTimeout(Proto.ASSIGN_ACK_WAIT_MS, () => this._broadcastStart());
    }

    private _sendAssign(kind: string, assignSeq: number, assignments: any[], roomId?: string): void {
        const payload: any = { assignSeq: assignSeq, assignments: assignments };
        if (roomId !== undefined) payload.roomId = roomId;
        Msg.send(kind, payload);
    }

    /** 收齐 ack 或超时 → 广播开赛令(同一 assignSeq, 端上幂等) */
    private _broadcastStart(): void {
        if (!this._finalAssignment) return;
        this._resolveTimer = null;
        this._sendAssign(Proto.Kind.MatchStart, this._assignSeq, this._finalAssignment);
        console.log(`[load] 广播 match_start seq=${this._assignSeq} (已 ack ${this._assignAcks.size} 端)`);
    }

    /** 只认房主的表: 任何端自己算出来的分配都不作数(msg 层已做过 assignSeq 过期与结构校验) */
    private _onRoleAssign(data: any, sendPlayerId: string): void {
        const ownerId = this._matchOwnerId();
        if (String(sendPlayerId) !== ownerId) {
            console.warn(`[load] 丢弃非房主 role_assign from=${sendPlayerId} 房主=${ownerId}`);
            return;
        }
        if (Number(data.assignSeq) <= this._appliedAssignSeq) return;
        this._appliedAssignSeq = Number(data.assignSeq);
        this._assignSeq = Number(data.assignSeq);
        this._pendingAssign = data.assignments;
        this._finalAssignment = data.assignments;
        console.log(`[load] 采纳房主指派 seq=${data.assignSeq}: ${JSON.stringify(data.assignments)}`);
        this._sendAssign(Proto.Kind.RoleAck, data.assignSeq, data.assignments);
    }

    /** ack 只给房主处理; assignSeq 必须是本次指派 */
    private _onRoleAck(data: any, sendPlayerId: string): void {
        if (this._myRoomPid() !== this._matchOwnerId()) return;
        if (Number(data.assignSeq) !== this._assignSeq || !this._finalAssignment) return;
        this._assignAcks.add(String(sendPlayerId));
        if (this._assignAcks.size >= this._finalAssignment.length && this._resolveTimer) {
            Timer.clear(this._resolveTimer);
            this._broadcastStart();
        }
    }

    private _onMatchStart(data: any, sendPlayerId: string): void {
        if (String(sendPlayerId) !== this._matchOwnerId()) return;
        const list = this._pendingAssign || data.assignments;
        this._pendingAssign = null;
        this._appliedAssignSeq = Math.max(this._appliedAssignSeq, Number(data.assignSeq));
        console.log(`[load] 收到 match_start seq=${data.assignSeq}, 开赛`);
        this._applyAssignmentAndStart(list);
    }

    /** 应用最终分配并跳游戏场景 */
    private _applyAssignmentAndStart(assignment: any[]): void {
        if (this._assignmentResolved) return;
        this._assignmentResolved = true;
        if (this._resolveTimer) {
            Timer.clear(this._resolveTimer);
            this._resolveTimer = null;
        }
        const myId = this._myRoomPid();
        let mine: any = null;
        for (const a of assignment || []) if (String(a.playerId) === myId) mine = a;
        if (!mine) {
            console.error(`[load] 分配表里没有本机 pid=${myId}: ${JSON.stringify(assignment)}`);
            return;
        }
        const playerCount = assignment.length;
        (window as any).gamePlayerCount = playerCount;
        (window as any).gameMode = "pvp";
        (window as any).gamePlayerAssignments = assignment;
        this._gameStarted = true;
        console.log(`%c[load] 最终角色分配: ${JSON.stringify(assignment)} 本机 roleId=${mine.roleId}`, "color: #FF00FF; font-weight:bold");
        this._stopFx();
        SceneNav.open(load.SCENE_URL, { playerCount });
    }

    private _roomEventsBound: boolean = false;
    private _rcvClient: ((info: any) => void) | null = null;
    private _rcvServer: ((info: any) => void) | null = null;
    private _rcvJoin: ((player: any) => void) | null = null;
    private _rcvLeave: ((player: any) => void) | null = null;
    private _rcvDismiss: ((roomId: string) => void) | null = null;

    /**
     * 绑定房间相关事件（回调存字段, onDestroy 精确 off, 防跨场景残留导致新实例双回调/状态错乱）
     */
    private bindRoomEvents(): void {
        if (this._roomEventsBound) return;
        this._roomEventsBound = true;

        Msg.bind('match', this._msgCtx, this._msgSubs);

        this._rcvClient = (info: any) => {
            if (Msg.dispatchInfo(info)) return;
            try {
                // msg 层已登记但被规则丢弃的协议消息也走到这里(msg 自己 warn 过原因)
                const data = JSON.parse(info.msg);
                console.log("[load] 收到未处理的客户端消息 kind=" + (data && data.kind));
            } catch (e) {
                // 系统文本消息(如 "1014 离开了房间")非 JSON 属正常流量, 降级 log 勿按 error 打印
                console.log("[load] 收到非 JSON 客户端消息:", info.msg);
            }
        };

        this._rcvServer = (info: any) => {
            try {
                const data = typeof info.msg === 'string' ? JSON.parse(info.msg) : info.msg;

                if (data && data.type !== 'RoomAndPlayerInfo') {
                    console.log("[load] 收到服务器消息:", info);
                }

                if (data && data.type === 'roomDismissed') {
                    console.log("[load] 房间已解散:", data.roomId);
                    this._onRoomDismissed();
                }
            } catch (e) {
                // 非 JSON 消息，忽略
            }
        };

        this._rcvJoin = (player: any) => {
            console.log("[load] 玩家加入:", player, Gnet.getPlayers());
            // 检查是否满员，满员则跳转游戏场景
            this.checkAndStartGame();
            this._armMatchWait();
            // 兜底: onJoin 派发可能早于本地 players 列表更新, 延时复查满员
            Timer.setTimeout(300, () => {
                if (!this._gameStarted && !this._assignmentResolved) this.checkAndStartGame();
            });
        };

        this._rcvLeave = (player: any) => {
            console.log("[load] 玩家离开:", player, Gnet.getPlayers());
            this._armMatchWait();
            if (!this._gameStarted) {
                this._resetAssignmentState();
                // 满员协商中途有人离开: 重新检查满员状态
                this.checkAndStartGame();
            }
        };

        this._rcvDismiss = (roomId: string) => {
            console.log("[load] 房间解散:", roomId);
            this._onRoomDismissed();
        };

        Gnet.onClient(this._rcvClient);
        Gnet.onServer(this._rcvServer);
        Gnet.onJoin(this._rcvJoin);
        Gnet.onLeave(this._rcvLeave);
        Gnet.onDismiss(this._rcvDismiss);
        this._bindDisconnectListener();
    }

    /** 房间解散: 主动取消触发的吞掉; 被动解散重置状态并自动重新匹配 */
    private _onRoomDismissed(): void {
        this._clearSavedRoomId();
        if (this._gameStarted) return;
        if (this._userCancel) {
            console.log("[load] 主动取消的房间事件, 跳过自动重匹配");
            return;
        }
        this.isMatching = false;
        this._setBtnMatching(false);
        this._resetAssignmentState();
        Dialog.toast("房间已解散，重新匹配", 1500);
        Timer.setTimeout(1500, () => {
            if (!this._gameStarted && !this.isMatching && !Gnet.getRoom()) {
                this._startMatch();
            }
        });
    }

    /**
    * 处理成功加入房间（增强版）
    */
    private handleRoomJoined(room: any, fromMatch: boolean = false): void {
        if (!room) return;
        // 取消后迟到的 room event 不得重新把按钮切成“匹配成功”。
        if (this._userCancel || (!this.isMatching && fromMatch)) {
            if (Gnet.getRoom() === room && !this._gameStarted) {
                Gnet.leaveRoom((e: Error | null) => { if (e) console.warn("[load] 清理取消后的房间失败:", e.message); });
            }
            return;
        }
        console.log("[load] 进入房间:", room, `玩家: ${room.players ? room.players.length : 0}/${room.maxPlayers}`);
        this._saveRoomId(room);

        // 匹配进入: 维持匹配态等待满员
        if (this.isMatching || fromMatch) this.isMatching = true;
        if (fromMatch) this._setBtnMatched();

        // 绑定 room 级别事件（加入房间后 client.room 才有值）
        this.bindRoomEvents();

        // 检查是否满员，满员则跳转游戏场景
        this.checkAndStartGame();
        // 不满员的房不会自己长人: 挂看门狗(实测两人各进各的房后双双无限等待, 匹配页一直停在"匹配中")
        this._armMatchWait();
    }

    /**
     * 匹配看门狗: 进房后若仍未满员, 到点就退房重新排队(玩家侧的"匹配超时"体验也顺带修好)。
     * 抖动按本机 playerId 取(不是随机): 两端永远不同时重排队, 后动的那一端才可能匹配进
     * 先动那一端刚开的房——同时退房再同时匹配, 结果还是两个各 1 人的房。
     */
    private _armMatchWait(): void {
        this._clearMatchWait();
        if (this._gameStarted || !this.isMatching) return;
        const room: any = Gnet.getRoom();
        if (!room) return;
        const max = room.maxPlayers || this.matchMaxPlayers;
        if ((Gnet.getPlayers() || []).length >= max) return;
        let h = 0;
        const me = this._myRoomPid();
        for (let i = 0; i < me.length; i++) h = (h * 31 + me.charCodeAt(i)) | 0;
        const wait = 12000 + (Math.abs(h) % 4000);
        console.log(`[load] 房内 ${Gnet.getPlayers().length}/${max}, ${wait}ms 后仍不满员则重新排队`);
        this._matchWaitTid = Timer.setTimeout(wait, () => {
            this._matchWaitTid = null;
            const r: any = Gnet.getRoom();
            if (this._gameStarted || !this.isMatching || !r) return;
            if ((Gnet.getPlayers() || []).length >= (r.maxPlayers || this.matchMaxPlayers)) return;
            if (this._matchWaitRetries++ >= 2) {
                this._matchWaitRetries = 0;
                this.isMatching = false;
                this._setBtnFail();
                Dialog.toast("匹配超时，请稍后再试", 2000);
                console.warn("[load] 匹配连续 3 轮都没凑满人, 停止等待");
                return;
            }
            console.warn("[load] 匹配进房后长时间不满员, 退房重新排队");
            this.exitMatch(() => {
                this._userCancel = false;
                this._startMatch();
            });
        });
    }

    private _clearMatchWait(): void {
        if (this._matchWaitTid) {
            Timer.clear(this._matchWaitTid);
            this._matchWaitTid = null;
        }
    }

    // ============================================================
    // 按钮视觉效果: 描边呼吸(lineWidth) + 粒子发散
    // ============================================================

    /** 找按钮子树内 lineWidth 最大的 DrawCircleCmd 背景节点(prefab up 态白圆 lineWidth=100) */
    private _findBigBg(root: any): any {
        let best: any = null;
        let lw = 0;
        const walk = (n: any) => {
            if (!n || n.destroyed) return;
            const bg = n.background;
            if (bg && typeof bg.lineWidth === "number" && bg.lineWidth > lw) {
                best = n;
                lw = bg.lineWidth;
            }
            const num = n.numChildren || 0;
            for (let i = 0; i < num; i++) walk(n.getChildAt(i));
        };
        walk(root);
        return best;
    }

    /**
     * 启动按钮动效:
     * - 呼吸 = up 背景圆描边 lineWidth 正弦波动(不碰按钮 scale/位置/子树结构)
     * - 粒子层挂按钮父级(按钮中心对齐), 匹配中才发散
     */
    private _startFx(): void {
        const btn: any = this.matchBtn;
        if (!btn || this._fxTimer) return;

        this._btnBg = this._findBigBg(btn);
        this._bgBase = (this._btnBg && this._btnBg.background && this._btnBg.background.lineWidth) || 100;

        const layer = new Laya.GBox();
        layer.name = "fxPtc";
        layer.size(1, 1);
        layer.mouseEnabled = false;
        layer.mouseThrough = true;
        if (btn.parent) btn.parent.addChild(layer);
        this._fxLayer = layer;

        // hover 跟踪: 引擎切 over 橙圆时粒子同步换橙系
        btn.on(Laya.Event.MOUSE_OVER, this, () => { this._btnHover = true; });
        btn.on(Laya.Event.MOUSE_OUT, this, () => { this._btnHover = false; });

        this._fxT = 0;
        this._fxTimer = Timer.frameLoop(this._onFxTick.bind(this));
    }

    /** 动效帧: 描边呼吸(匹配中大幅/未匹配小幅) + 粒子波次发射与更新 */
    private _onFxTick(): void {
        const btn: any = this.matchBtn;
        if (!btn || btn.destroyed) { this._stopFx(); return; }
        this._fxT++;

        // —— 呼吸: up 背景圆描边 lineWidth 波动(radius 恒 0.5) ——
        // 引擎语义: drawRadius = radius×min - lw/2 → 描边外沿 = radius×min = 恒定(min/2), 按钮外形永不变
        // lw 只改描边环内外分配(环宽 lw, fill 主体半径 min/2-lw), 即纯 lineWidth 呼吸
        // 【严禁 radius>0.5】: percent 模式 DrawCircleCmd.getBounds = [0.5-r,0.5-r,2r,2r]×(W,H) 超出节点矩形,
        // Sprite 尺寸语义取内容 bounds → 节点被撑大; 若再按当前尺寸算 rNorm 会自反馈迭代放大(711×612→1294×1177 约 7 帧)
        if (this._btnBg && !this._btnBg.destroyed) {
            const amp = this.isMatching ? 34 : 10;
            const lw = Math.max(2, this._bgBase + amp * Math.sin(this._fxT * 0.05));
            const fill = this.isMatching ? "#e4e4e4" : "#ff8a00";
            const line = this.isMatching ? "#cbcbcb" : "#d16300";
            this._btnBg.background = Laya.DrawCircleCmd.create(0.5, 0.5, 0.5, fill, line, lw, true);
        }

        // —— 粒子层跟随按钮中心(Relation 布局重算时保持对齐) ——
        const layer: any = this._fxLayer;
        if (!layer || layer.destroyed) return;
        layer.pos(btn.x, btn.y);

        // —— 匹配中动态点: 每 0.5s "单/双打匹配中"+1~6 个点循环(title 与 selectedTitle 同步, 防 selected 态显示旧文案) ——
        if (this.isMatching && !this._matchSucceeded && this._fxT % 30 === 0) {
            this._dots = (this._dots % 6) + 1;
            const txt = this._matchPrefix() + ".".repeat(this._dots);
            btn.title = txt;
            btn.selectedTitle = txt;
        }

        // —— 粒子: 匹配中每 ~0.6s 一波从按钮边缘向四方发散 ——
        if (this.isMatching && !this._matchSucceeded && this._fxT % 36 === 0) this._emitParts();

        // —— 粒子更新: 位置外扩 + 由大变小 ——
        for (let i = this._parts.length - 1; i >= 0; i--) {
            const p = this._parts[i];
            p.dist += p.spd;
            p.life++;
            const k = p.life / p.max;
            if (k >= 1 || !p.node || p.node.destroyed) {
                if (p.node) p.node.removeSelf();
                this._parts.splice(i, 1);
                continue;
            }
            p.node.pos(Math.cos(p.ang) * p.dist, Math.sin(p.ang) * p.dist);
            const sc = p.base * (1 - k);
            p.node.scaleX = p.node.scaleY = sc;
        }
    }

    /** 发射一波粒子: 从按钮边缘冒出飞远, fill 与 line 颜色同系不同档(跟按钮当前态色) */
    private _emitParts(): void {
        const layer: any = this._fxLayer;
        if (!layer || layer.destroyed) return;
        // 粒子色跟按钮当前视觉: hover=over 橙圆系 / 常态=up 白圆系
        const colors = this._btnHover ? load.FX_COLORS_O : load.FX_COLORS_W;
        const n = 10;
        for (let i = 0; i < n; i++) {
            const node = new Laya.GBox();
            node.size(40, 40);
            node.mouseEnabled = false;
            node.mouseThrough = true;
            const fill = colors[(Math.random() * colors.length) | 0];
            let line = colors[(Math.random() * colors.length) | 0];
            if (line === fill) line = colors[(colors.indexOf(fill) + 1) % colors.length];
            node.background = Laya.DrawCircleCmd.create(0.5, 0.5, 0.48, fill, line, 3, true);
            layer.addChild(node);

            const spd = 5 + Math.random() * 4;
            const startDist = 280 + Math.random() * 60;
            const maxDist = 500 + Math.random() * 220;
            const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.5;
            this._parts.push({
                node,
                ang,
                dist: startDist,
                spd,
                life: 0,
                max: Math.ceil((maxDist - startDist) / spd),
                base: 0.9 + Math.random() * 0.4,
            });
            node.pos(Math.cos(ang) * startDist, Math.sin(ang) * startDist);
            node.scaleX = node.scaleY = 0;
        }
    }

    /** 停止并清理动效(进游戏/销毁时): up 背景圆复位 prefab 原版(灰白圆 lw=100), 防残留呼吸末相位 */
    private _stopFx(): void {
        if (this._fxTimer) {
            Timer.clear(this._fxTimer);
            this._fxTimer = null;
        }
        if (this._btnBg && !this._btnBg.destroyed) {
            this._btnBg.background = Laya.DrawCircleCmd.create(0.5, 0.5, 0.5, "#e4e4e4", "#cbcbcb", this._bgBase, true);
        }
        for (const p of this._parts) {
            if (p.node && !p.node.destroyed) p.node.removeSelf();
        }
        this._parts.length = 0;
        if (this._fxLayer && !this._fxLayer.destroyed) this._fxLayer.removeSelf();
        this._fxLayer = null;
        if (this.matchBtn && !this.matchBtn.destroyed) {
            this.matchBtn.offAllCaller(this);
            this._btnHover = false;
        }
        this._btnBg = null;
    }

    //手动调用节点销毁时执行
    onDestroy(): void {
        this._stopFx();
        this._unbindNetworkListeners();
        this._unbindDisconnectListener();
        if (this._reconnectTimer) {
            Timer.clear(this._reconnectTimer);
            this._reconnectTimer = null;
        }
        if (this._resolveTimer) {
            Timer.clear(this._resolveTimer);
            this._resolveTimer = null;
        }
        this._clearMatchWait();

        if (this._rcvClient) { Gnet.off("client", this._rcvClient); this._rcvClient = null; }
        if (this._rcvServer) { Gnet.off("server", this._rcvServer); this._rcvServer = null; }
        if (this._rcvJoin) { Gnet.off("join", this._rcvJoin); this._rcvJoin = null; }
        if (this._rcvLeave) { Gnet.off("leave", this._rcvLeave); this._rcvLeave = null; }
        if (this._rcvDismiss) { Gnet.off("dismiss", this._rcvDismiss); this._rcvDismiss = null; }
        Msg.unbind('match', this._msgCtx, this._msgSubs);
        this._roomEventsBound = false;
    }
}
