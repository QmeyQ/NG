import { Gnet } from "./libs/GNet";
import { Res } from "./libs/res";
import { Timer } from "./libs/time";
const { regClass, property } = Laya;

@regClass()
export class load extends Laya.Script {

    private roomList: Laya.List;
    private createRoomBtn: Laya.Button;
    private refreshBtn: Laya.Button;
    private statusText: Laya.Text;
    private prevPageBtn: Laya.Button;
    private nextPageBtn: Laya.Button;
    private pageInfoText: Laya.Text;
    private roomIdInput: Laya.TextInput;
    private joinByIdBtn: Laya.Button;
    private quickMatchBtn: Laya.Button;
    private list: Laya.List
    private pvp: Laya.Text;
    private pve: Laya.Text;
    private pve1: Laya.Button;
    private pve2: Laya.Button;

    private openId: string = "";
    private roomListData: any[] = [];

    // 分页相关数据
    private currentPage: number = 1;
    private pageSize: number = 10;
    private totalPages: number = 1;

    // 服务器分页信息
    private totalRooms: number = 0;
    private offset: string | number = "";
    private hasNext: 0 | 1 = 0;

    private serverOffset: string | number | null = null; // 服务器偏移量
    private offsetHistory: (string | number | null)[] = [null]; // offset 历史栈，支持上一页

    // 显示的房间列表
    private displayRoomList: any[] = [];
    private allRoomListData: any[] = []; // 所有从服务器获取的房间数据

    private nextServerOffset: string | null = null; // 服务器下次请求的offset


    // 匹配状态
    private isMatching: boolean = false;
    private matchMaxPlayers: number = 4;
    private _gameStarted: boolean = false;
    private _isProcessing: boolean = false;

    // 角色分配协商
    private _collectedAssignments: Map<string, { playerId: string, roleId: number }[]> = new Map();
    private _finalAssignment: { playerId: string, roleId: number }[] | null = null;
    private _assignmentResolved: boolean = false;
    private _resolveTimer: string | null = null;
    private _confirmedPlayers: Set<string> = new Set();
    private static readonly ASSIGN_SEND_SCOPE: number = 1;

    // 游戏场景 UUID
    private static readonly SCENE_URL: string = "res://41c736bc-9e4d-455c-8140-6edae3cdd251";

    private isLoading: boolean = false;

    // 当前显示的房间列表
    private currentRoomList: any[] = [];

    private _initSceneNodes(): void {
        const root = Laya.stage.getChildByName("root") as Laya.Sprite;
        if (!root) return;
        const scene2d = root.getChildByName("Scene2D") as Laya.Scene;
        if (!scene2d) return;
        this.roomList = this._findNode(scene2d, "List") as Laya.List;
        this.createRoomBtn = this._findNode(scene2d, "createRoomBtn") as Laya.Button;
        this.refreshBtn = this._findNode(scene2d, "refreshBtn") as Laya.Button;
        this.statusText = this._findNode(scene2d, "statusText") as Laya.Text;
        this.prevPageBtn = this._findNode(scene2d, "prevPageBtn") as Laya.Button;
        this.nextPageBtn = this._findNode(scene2d, "nextPageBtn") as Laya.Button;
        this.pageInfoText = this._findNode(scene2d, "pageInfoText") as Laya.Text;
        this.roomIdInput = this._findNode(scene2d, "roomIdInput") as Laya.TextInput;
        this.joinByIdBtn = this._findNode(scene2d, "joinByIdBtn") as Laya.Button;
        this.quickMatchBtn = this._findNode(scene2d, "quickMatchBtn") as Laya.Button;
        this.list = this._findNode(scene2d, "list") as Laya.List;
        this.pvp = this._findNode(scene2d, "pvp") as Laya.Text;
        this.pve = this._findNode(scene2d, "pve") as Laya.Text;
        this.pve1 = this._findNode(scene2d, "pve1") as Laya.Button;
        this.pve2 = this._findNode(scene2d, "pve2") as Laya.Button;
    }

    private _findNode(root: Laya.Node, name: string): Laya.Node | null {
        if (root.name === name) return root;
        for (let i = 0; i < root.numChildren; i++) {
            const found = this._findNode(root.getChildAt(i), name);
            if (found) return found;
        }
        return null;
    }

    /**
     * 判断是否为正常房间（有 roomId 且非匹配房间）
     */
    private isNormalRoom(room: any): boolean {
        if (!room || !room.roomId) return false;
        return true;
    }

    /**
     * 仅展示当前房间（匹配模式下）
     */
    private showCurrentRoomOnly(room: any): void {
        const roomData = {
            ...room,
            playerCount: room.players ? room.players.length : 0,
        };
        this.currentRoomList = [roomData];
        this.totalRooms = 1;
        this.totalPages = 1;
        this.currentPage = 1;
        this.hasNext = 0;
        this.updateRoomListUI();
        this.updatePageInfo();
    }

    /**
     * 退出匹配模式
     */
    private exitMatch(onDone?: () => void): void {
        const wasMatching = this.isMatching;
        this.isMatching = false;

        const finish = () => {
            this._isProcessing = false;
            this.statusText.text = "已退出匹配";
            this.refreshRoomList();
            onDone?.();
        };

        if (wasMatching) {
            Gnet.cancelMatch((cancelErr: Error | null) => {
                if (cancelErr) console.warn("取消匹配失败:", cancelErr.message);
                const room = Gnet.getRoom();
                if (room) {
                    Gnet.leaveRoom((leaveErr: Error | null) => {
                        if (leaveErr) console.warn("离开房间失败:", leaveErr.message);
                        Timer.setTimeout(500, finish);
                    });
                } else {
                    Timer.setTimeout(500, finish);
                }
            });
        } else {
            const room = Gnet.getRoom();
            if (room) {
                Gnet.leaveRoom((leaveErr: Error | null) => {
                    if (leaveErr) console.warn("离开房间失败:", leaveErr.message);
                    Timer.setTimeout(500, finish);
                });
            } else {
                finish();
            }
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
            this._buildAndSendPlayerInfo(players);
        }
    }

    /**
     * 重置角色分配协商状态，允许重新满人计算
     */
    private _resetAssignmentState(): void {
        if (this._resolveTimer) {
            Timer.clear(this._resolveTimer);
            this._resolveTimer = null;
        }
        this._collectedAssignments.clear();
        this._finalAssignment = null;
        this._assignmentResolved = false;
        this._confirmedPlayers.clear();
        this._roomEventsBound = false;
        console.log("[load] 角色分配状态已重置");
    }

    /**
     * 构建随机角色分配并发送 first 消息给房间所有玩家
     */
    private _buildAndSendPlayerInfo(players: any[]): void {
        if (this._assignmentResolved) return;
        const myId = Gnet.getCurrentPlayerId();
        if (this._collectedAssignments.has(myId)) return;

        const playerIds = players.map((p: any) => p.playerId);
        const roleIds = Array.from({ length: players.length }, (_, i) => i);
        for (let i = roleIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [roleIds[i], roleIds[j]] = [roleIds[j], roleIds[i]];
        }

        const assignments = playerIds.map((pid: string, i: number) => ({ playerId: pid, roleId: roleIds[i] }));
        this._collectedAssignments.set(myId, assignments);

        const msg = JSON.stringify({ kind: "first", assignments, senderId: myId });
        Gnet.sendToClient(load.ASSIGN_SEND_SCOPE, msg);
        console.log(`%c[load] 发送角色分配(first): ${JSON.stringify(msg)}`, "color: #00FFFF;");

        const isOwner = Gnet.getRoomOwnerId() === myId;
        this.statusText.text += `\n[发送first] ${myId} | 房主:${isOwner ? '是' : '否'}(${Gnet.getRoomOwnerId()})`;

        if (isOwner) {
            if (this._resolveTimer) Timer.clear(this._resolveTimer);
            this._resolveTimer = Timer.setTimeout(2000, () => {
                this._resolveAssignmentAsOwner();
            });
        } else {
            if (this._resolveTimer) Timer.clear(this._resolveTimer);
            this._resolveTimer = Timer.setTimeout(5000, () => {
                if (!this._assignmentResolved) {
                    console.warn("[load] 等待 final 超时，本地自行解决");
                    this._resolveAssignmentLocally();
                }
            });
        }
    }

    /**
     * 房主解决冲突：按玩家加入顺序选择第一个有分配列表的玩家，发送 final
     */
    private _resolveAssignmentAsOwner(): void {
        if (this._finalAssignment) return;
        const players = Gnet.getPlayers();
        let chosen: { playerId: string, roleId: number }[] | null = null;
        for (const p of players) {
            const assign = this._collectedAssignments.get(p.playerId);
            if (assign && assign.length > 0) {
                chosen = assign;
                console.log(`[load] 房主选择玩家 ${p.playerId} 的分配列表`);
                break;
            }
        }
        if (!chosen) return;

        this._finalAssignment = chosen;
        this._confirmedPlayers.add(Gnet.getCurrentPlayerId());

        const msg = JSON.stringify({ kind: "final", assignments: chosen });
        Gnet.sendToClient(load.ASSIGN_SEND_SCOPE, msg);
        console.log(`%c[load] 房主发送 final 确认: ${JSON.stringify(chosen)}`, "color: #00FF00; font-weight:bold");
        this.statusText.text += `\n[发送final] ${Gnet.getCurrentPlayerId()}`;

        this._checkAllConfirmedAndBroadcast(players);
    }

    /**
     * 超时兜底：选最优分配，手动填充所有玩家 okplay，发 final 后跳转
     */
    private _resolveAssignmentLocally(): void {
        let chosen = this._finalAssignment;
        if (!chosen) {
            const players = Gnet.getPlayers();
            for (const p of players) {
                const assign = this._collectedAssignments.get(p.playerId);
                if (assign && assign.length > 0) {
                    chosen = assign;
                    console.warn(`[load] 超时兜底使用玩家 ${p.playerId} 的分配列表`);
                    break;
                }
            }
        }
        if (!chosen) return;

        const players = Gnet.getPlayers();
        const okplay = players.map((p: any) => p.playerId);
        const msg = JSON.stringify({ kind: "final", assignments: chosen, okplay });
        Gnet.sendToClient(load.ASSIGN_SEND_SCOPE, msg);
        console.log(`%c[load] 超时兜底发送 final(全员ok) okplay=${JSON.stringify(okplay)}`, "color: #FF0000; font-weight:bold");
        this.statusText.text += `\n[超时兜底final] ${Gnet.getCurrentPlayerId()}`;
        this._applyAssignmentAndStart(chosen);
    }

    /**
     * 应用最终角色分配并跳转游戏场景
     */
    private _applyAssignmentAndStart(assignment: { playerId: string, roleId: number }[]): void {
        if (this._assignmentResolved) return;
        this._assignmentResolved = true;
        if (this._resolveTimer) {
            Timer.clear(this._resolveTimer);
            this._resolveTimer = null;
        }

        const playerCount = assignment.length;
        (window as any).gamePlayerCount = playerCount;
        (window as any).gameMode = "pvp";
        (window as any).gamePlayerAssignments = assignment;

        this._gameStarted = true;
        this._stopAutoRefresh();
        this.statusText.text = `角色分配已确认（${playerCount}人），正在进入游戏...`;
        console.log(`%c[load] 最终角色分配: ${JSON.stringify(assignment)}`, "color: #FF00FF; font-weight:bold");

        Laya.Scene.open(load.SCENE_URL, true, { playerCount });
    }

    /**
     * 处理收到的角色分配消息
     */
    private _onReceiveAssignmentMsg(data: any, sendPlayerId: string): void {
        const myId = Gnet.getCurrentPlayerId();
        if (data.kind === "first") {
            const assignments = data.assignments || [];
            if (assignments.length > 0) {
                this._collectedAssignments.set(sendPlayerId, assignments);
                console.log(`%c[load] 收到 ${sendPlayerId} 的 first 分配`, "color: #FFA500;");
                this.statusText.text += `\n[收到first] ${myId}`;
            }
        } else if (data.kind === "final") {
            const assignments = data.assignments || [];
            if (assignments.length === 0) return;

            if (data.okplay) {
                this._finalAssignment = assignments;
                const okplay: string[] = data.okplay;
                const players = Gnet.getPlayers();
                const allConfirmed = players.every((p: any) => okplay.indexOf(p.playerId) !== -1);
                if (allConfirmed) {
                    console.log(`%c[load] 收到 final(全员确认) okplay=${JSON.stringify(okplay)}`, "color: #00FF00; font-weight:bold");
                    this.statusText.text += `\n[全员确认] ${myId}`;
                    this._applyAssignmentAndStart(assignments);
                }
                return;
            }

            const ownerId = Gnet.getRoomOwnerId();
            const isFromOwner = sendPlayerId === ownerId;
            console.log(`%c[load] 收到 final 确认(from ${sendPlayerId}, 房主:${isFromOwner}): ${JSON.stringify(assignments)}`, "color: #00FF00; font-weight:bold");
            this.statusText.text += `\n[收到final] ${myId} | from:${sendPlayerId} 房主:${isFromOwner ? '是' : '否'}`;

            if (!isFromOwner) {
                console.log(`[load] final 来自非房主，忽略，继续等待房主 final`);
                return;
            }

            this._finalAssignment = assignments;
            const okMsg = JSON.stringify({ kind: "okplay", playid: myId });
            Gnet.sendToClient(load.ASSIGN_SEND_SCOPE, okMsg, [ownerId]);
            console.log(`%c[load] 回复 okplay 给房主 ${ownerId}`, "color: #FFA500;");
            this.statusText.text += `\n[发送okplay] ${myId}`;
        } else if (data.kind === "okplay") {
            const playid: string = data.playid;
            if (!playid) return;
            this._confirmedPlayers.add(playid);
            console.log(`%c[load] 收到 ${playid} 的 okplay 确认 (${this._confirmedPlayers.size}人)`, "color: #FFA500;");
            this.statusText.text += `\n[收到okplay:${playid}] ${myId}`;
            const players = Gnet.getPlayers();
            this._checkAllConfirmedAndBroadcast(players);
        }
    }

    /**
     * 房主检查是否全员确认，是则广播带 okplay 的 final
     */
    private _checkAllConfirmedAndBroadcast(players: any[]): void {
        if (this._assignmentResolved) return;
        if (!this._finalAssignment) return;

        const allConfirmed = players.every((p: any) => this._confirmedPlayers.has(p.playerId));
        if (!allConfirmed) return;

        const okplay = Array.from(this._confirmedPlayers);
        const msg = JSON.stringify({ kind: "final", assignments: this._finalAssignment, okplay });
        Gnet.sendToClient(load.ASSIGN_SEND_SCOPE, msg);
        console.log(`%c[load] 房主广播 final(全员确认) okplay=${JSON.stringify(okplay)}`, "color: #00FF00; font-weight:bold");
        this.statusText.text += `\n[广播全员确认] ${Gnet.getCurrentPlayerId()}`;
        this._applyAssignmentAndStart(this._finalAssignment);
    }

    /**
     * 跳转到游戏场景
     */
    private startGameScene(playerCount: number): void {
        if (this._gameStarted) return;
        this._gameStarted = true;
        this._stopAutoRefresh();
        this.statusText.text = `人数已满（${playerCount}人），正在进入游戏...`;
        console.log(`[load] 跳转游戏场景，玩家数: ${playerCount}`);

        (window as any).gamePlayerCount = playerCount;
        (window as any).gameMode = "pvp";

        Laya.Scene.open(load.SCENE_URL, true, { playerCount });
    }


    //组件被激活后执行，此时所有节点和组件均已创建完毕，此方法只执行一次
    onAwake(): void {

        this._initSceneNodes();

        // 初始化分页数据
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 1;
        this.serverOffset = null;
        this.offsetHistory = [null];
        this.allRoomListData = [];

        // 设置房间列表的项渲染器
        this.roomList.vScrollBarSkin = "";
        // 确保正确设置项渲染器
        // this.roomList.itemRender = Laya.loader.getRes("roomItem.ui"); // 如果使用预制件
        this.roomList.renderHandler = new Laya.Handler(this, this.onRoomItemRender);
        this.roomList.selectEnable = true;
        this.roomList.mouseHandler = new Laya.Handler(this, this.onRoomListMouse);

        // 绑定list选项改变的切换
        this.roomList.selectHandler = new Laya.Handler(this, (index: number) => {
            if (index >= 0 && this.currentRoomList[index]) {
                console.log("选中房间:", this.currentRoomList[index]);
                // 可以在这里处理房间选择逻辑
            }
        });

        // 绑定按钮事件
        this.createRoomBtn.on(Laya.Event.CLICK, this, this.onCreateRoomClick);
        this.prevPageBtn.on(Laya.Event.CLICK, this, this.onPrevPageClick);
        this.nextPageBtn.on(Laya.Event.CLICK, this, this.onNextPageClick);
        this.joinByIdBtn.on(Laya.Event.CLICK, this, this.onJoinByIdClick);
        this.quickMatchBtn.on(Laya.Event.CLICK, this, this.onQuickMatchClick);
        this.pvp.on(Laya.Event.CLICK, this, this.pvpLab);
        this.pve.on(Laya.Event.CLICK, this, this.pveLab);
        if (this.pve1) this.pve1.on(Laya.Event.CLICK, this, this.onPve1Click);
        if (this.pve2) this.pve2.on(Laya.Event.CLICK, this, this.onPve2Click);
        if (this.pageInfoText) {
            this.pageInfoText.on(Laya.Event.CLICK, this, () => {
                this.createTestRooms(25);
            });
        }

        // 生成openId
        this.openId = Date.now().toString();

        // 初始化Gnet
        this.initGnet();
    }

    /**
     * 初始化Gnet联机服务
     */
    private _autoRefreshTimer: any = null;

    private initGnet(): void {
        //window.GOBE.Logger.level = window.GOBE.LogLevel.INFO;
        this.statusText.text = "正在连接服务器...";
        this.setButtonsEnabled(false);

        let initTimeout = Timer.setTimeout(5000, () => {
            initTimeout = null;
            this.statusText.text = "连接服务器超时，点击刷新重试";
            this.setButtonsEnabled(true);
        });

        Gnet.init({
            clientId: '1263859182919011264',
            clientSecret: '8D99CCC71D57DD3DFF0F1C4EB5A800E527AB122C9580D781E6BEB18C917AE277',
            openId: this.openId,
            appId: '172249065902748389',
        }, (err: Error | null) => {
            if (initTimeout) { Timer.clear(initTimeout); initTimeout = null; }

            if (err) {
                console.error("初始化失败: " + err.message);
                this.statusText.text = "连接服务器失败，点击刷新重试";
                this.setButtonsEnabled(true);
                return;
            }

            console.log("初始化成功", Gnet.client, Gnet.getCurrentPlayerId());
            this.statusText.text = `服务器连接成功\n我的ID: ${Gnet.getCurrentPlayerId()}`;
            this.setButtonsEnabled(true);

            // 只绑定 client 级别事件（onMatch 在 client 上）
            Gnet.onMatch((resp: any) => {
                console.log("匹配结果:", resp);
                if (resp && resp.room) {
                    this.statusText.text = "匹配成功，正在进入房间...";
                    this.handleRoomJoined(resp.room, true);
                }
            });

            this.refreshRoomList();
            this._autoRefreshTimer = Timer.setInterval(5000, () => {
                if (!Gnet.getRoom() && !this.isLoading) this.refreshRoomList(true);
            });
        });
    }

    private setButtonsEnabled(enabled: boolean): void {
        if (this.createRoomBtn) this.createRoomBtn.disabled = !enabled;
        if (this.refreshBtn) this.refreshBtn.disabled = !enabled;
        if (this.quickMatchBtn) this.quickMatchBtn.disabled = !enabled;
        if (this.joinByIdBtn) this.joinByIdBtn.disabled = !enabled;
    }

    private _stopAutoRefresh(): void {
        if (this._autoRefreshTimer) {
            Timer.clear(this._autoRefreshTimer);
            this._autoRefreshTimer = null;
        }
    }


    private _roomEventsBound: boolean = false;

    /**
     * 绑定房间相关事件
     */
    private bindRoomEvents(): void {
        if (this._roomEventsBound) return;
        this._roomEventsBound = true;
        Gnet.onClient((info: any) => {
            try {
                const data = JSON.parse(info.msg);
                if (data && (data.kind === "first" || data.kind === "final" || data.kind === "okplay")) {
                    this._onReceiveAssignmentMsg(data, info.sendPlayerId);
                    return;
                }
            } catch (e) {
                console.error("[load] onClient 解析异常:", e);
            }
            console.log("收到客户端消息:", info);
        });

    Gnet.onServer((info: any) => {
        try {
            const data = typeof info.msg === 'string' ? JSON.parse(info.msg) : info.msg;
            
            // ✅ 过滤掉高频的 RoomAndPlayerInfo 消息，避免刷屏
            if (data && data.type !== 'RoomAndPlayerInfo') {
                console.log("收到服务器消息:", info);
            }

            if (data && data.type === 'roomListUpdate') {
                this.refreshRoomList(true);
            } else if (data && data.type === 'roomDismissed') {
                console.log("房间已解散:", data.roomId);
                this.statusText.text = "房间已解散，返回房间列表";
                this.refreshRoomList();
            }
        } catch (e) {
            // 非 JSON 消息，忽略
        }
    });

        Gnet.onJoin((player: any) => {
            console.log("玩家加入:", player);
            const players = Gnet.getPlayers();
            console.log(players)
            this.statusText.text = `玩家 ${player.playerId} 加入房间 (${players.length}人)\n玩家id：${Gnet.getCurrentPlayerId()}\n房主id：${Gnet.getRoomOwnerId()}
            \n玩家列表：${JSON.stringify(players)}`;

            // 匹配模式下更新当前房间展示
            if (this.isMatching) {
                const room = Gnet.getRoom();
                if (room) this.showCurrentRoomOnly(room);
            }

            // 检查是否满员，满员则跳转游戏场景
            this.checkAndStartGame();
        });

        Gnet.onLeave((player: any) => {
            console.log("玩家离开:", player);
            const players = Gnet.getPlayers();
            this.statusText.text = `玩家 ${player.playerId} 离开房间 (${players.length}人)`;

            if (!this._gameStarted) {
                this._resetAssignmentState();
            }

            // 匹配模式下更新当前房间展示
            if (this.isMatching) {
                const room = Gnet.getRoom();
                if (room) this.showCurrentRoomOnly(room);
            }
        });


        // 添加房间解散事件监听
        Gnet.onDismiss((roomId: string) => {
            console.log("房间解散:", roomId);
            this.statusText.text = "房间已解散";
            this.isMatching = false;
            this._gameStarted = false;
            // 刷新房间列表
            this.refreshRoomList();
        });
    }

    private pvpLab() {
        this.list.selectedIndex = 0;
        this.pvp.stroke = 20;
        this.pve.stroke = 0;
        this.pve.borderColor = null;
        this.pvp.borderColor = "ffffff"
    }

    private pveLab() {
        this.list.selectedIndex = 1;
        this.pve.stroke = 20;
        this.pvp.stroke = 0;
        this.pvp.borderColor = null;
        this.pve.borderColor = "ffffff"
    }

    /**
     * PVE单打人机：2人模式直接进入游戏场景
     */
    private onPve1Click(): void {
        console.log("[load] PVE 单打人机");
        this.statusText.text = "正在进入单打人机模式...";
        this._stopAutoRefresh();
        (window as any).gamePlayerCount = 2;
        (window as any).gameMode = "pve";
        Laya.Scene.open(load.SCENE_URL, true, { playerCount: 2 });
    }

    /**
     * PVE双打人机：4人模式直接进入游戏场景
     */
    private onPve2Click(): void {
        console.log("[load] PVE 双打人机");
        this.statusText.text = "正在进入双打人机模式...";
        this._stopAutoRefresh();
        (window as any).gamePlayerCount = 4;
        (window as any).gameMode = "pve";
        Laya.Scene.open(load.SCENE_URL, true, { playerCount: 4 });
    }


    /**
     * 创建房间按钮点击事件
     */
    private onCreateRoomClick(): void {
        if (this._isProcessing) {
            console.log("操作进行中，请稍候...");
            return;
        }
        console.log("this.createRoomBtn", this.createRoomBtn);

        const doCreate = () => {
            this._isProcessing = true;
            const roomName = "房间" + this.openId.substring(8);
            this.statusText.text = "正在创建房间...";

            Gnet.createRoom(roomName, 4, (err: Error | null, room: any) => {
                this._isProcessing = false;
                if (err) {
                    console.error("创建房间失败: " + err.message);
                    this.statusText.text = "创建房间失败: " + err.message;
                    return;
                }

                console.log("创建房间成功", room);
                this.statusText.text = "房间创建成功，等待玩家加入...";
                this.handleRoomJoined(room);
            });
        };

        if (this.isMatching || Gnet.getRoom()) {
            this._isProcessing = true;
            this.statusText.text = "正在退出匹配房间...";
            this.exitMatch(doCreate);
        } else {
            doCreate();
        }
    }

    /**
     * 一键匹配按钮点击事件（随机匹配2人或4人房间）
     */
    private onQuickMatchClick(): void {
        if (this._isProcessing) {
            console.log("操作进行中，请稍候...");
            return;
        }

        const doMatch = () => {
            this._isProcessing = true;
            const maxPlayers = 2//Math.random() < 0.5 ? 2 : 4;
            this.matchMaxPlayers = maxPlayers;
            this.isMatching = true;
            this.statusText.text = `正在匹配${maxPlayers}人房间（${maxPlayers === 2 ? '单打' : '双打'}）...`;

            const level = this.roomIdInput && this.roomIdInput.text.trim() ? this.roomIdInput.text.trim() : "1";
            Gnet.matchRoom({ matchParams: { level }, maxPlayers: maxPlayers, roomType: "demo" }, (err: Error | null, room: any) => {
                this._isProcessing = false;
                if (err) {
                    console.error("匹配失败: " + err.message);
                    this.statusText.text = "匹配失败: " + err.message;
                    this.isMatching = false;
                    this.refreshRoomList();
                    return;
                }

                console.log("匹配成功", room);
                this.statusText.text = "匹配成功，正在进入房间...";
                this.handleRoomJoined(room, true);
            });
        };

        if (this.isMatching || Gnet.getRoom()) {
            this._isProcessing = true;
            this.statusText.text = "正在退出当前匹配/房间...";
            this.exitMatch(doMatch);
        } else {
            doMatch();
        }
    }


    /**
    * 刷新房间列表（基于实际服务器响应重写）
    */
    private refreshRoomList(silent: boolean = false): void {
        if (silent) {
            this.currentPage = 1;
            this.serverOffset = "0";
            this.hasNext = 0;
            this.totalRooms = 0;
            this.offsetHistory = [null];
            this.loadRoomsFromServer(true, true);
            return;
        }

        if (this.isLoading) {
            console.log("正在加载中，请稍候...");
            return;
        }

        this.statusText.text = "正在刷新房间列表...";
        this.currentPage = 1;
        this.serverOffset = "0";
        this.hasNext = 0;
        this.totalRooms = 0;
        this.currentRoomList = [];
        this.offsetHistory = [null];

        this.loadRoomsFromServer(true, false);
    }

    private loadRoomsFromServer(isRefresh: boolean = false, silent: boolean = false): void {
        if (!silent && this.isLoading) {
            console.log("正在加载中，请稍候...");
            return;
        }

        if (!silent) this.isLoading = true;

        console.log(`加载房间: 页码${this.currentPage}, 偏移量${this.serverOffset}, 每页${this.pageSize} silent=${silent}`);

        let loadTimeout: string | null = Timer.setTimeout(10000, () => {
            loadTimeout = null;
            if (!silent) {
                this.isLoading = false;
                this.statusText.text = "加载房间超时，点击刷新重试";
                this._stopAutoRefresh();
            }
        });

        Gnet.getAvailableRoomsPaged(
            this.currentPage,
            this.pageSize,
            (err: Error | null, rooms: any[], hasNext: 0 | 1, serverTotalCount: number, extra?: any) => {
                if (loadTimeout) { Timer.clear(loadTimeout); loadTimeout = null; }
                if (!silent) this.isLoading = false;

                if (err) {
                    console.error("获取房间列表失败: " + err.message);
                    if (!silent) {
                        this.statusText.text = "获取房间列表失败，点击刷新重试";
                        this.currentRoomList = [];
                        this.updateRoomListUI();
                        this.updatePageInfo();
                        this._stopAutoRefresh();
                    }
                    return;
                }

                this.hasNext = hasNext;
                this.totalRooms = serverTotalCount;

                if (extra && extra.nextServerOffset) {
                    this.serverOffset = extra.nextServerOffset;
                }

                // 非匹配模式下仅展示正常房间（roomId 为数字且长度不超过8位）
                let displayRooms = rooms;
                if (!this.isMatching) {
                    displayRooms = rooms.filter((r: any) => this.isNormalRoom(r));
                }

                const oldCount = this.currentRoomList.length;
                const oldIds = this.currentRoomList.map(r => r.roomId).join(',');
                const newIds = displayRooms.map(r => r.roomId).join(',');

                // 始终替换为当前页数据（分页显示，不累积）
                this.currentRoomList = displayRooms;

                this.calculateTotalPages();

                if (silent) {
                    if (oldCount !== displayRooms.length || oldIds !== newIds) {
                        this.updateRoomListUI();
                        this.updatePageInfo();
                        this.updateStatusText();
                    }
                } else {
                    this.updateRoomListUI();
                    this.updatePageInfo();
                    this.updateStatusText();
                }

            },
            {
                serverOffset: this.serverOffset
            }
        );
    }

    /**
 * 计算总页数（基于实际服务器数据修复）
 */
    private calculateTotalPages(): void {
        if (this.totalRooms <= 0) {
            this.totalPages = 1;
        } else {
            this.totalPages = Math.max(1, Math.ceil(this.totalRooms / this.pageSize));
        }

        // 确保当前页不超过总页数
        if (this.currentPage > this.totalPages) {
            this.currentPage = Math.max(1, this.totalPages);
        }

        //console.log(`计算总页数: 总数${this.totalRooms}, 每页${this.pageSize}, 总页数${this.totalPages}, 当前页${this.currentPage}`);
    }

    /**
     * 更新状态文本
     */
    private updateStatusText(): void {
        if (this.currentRoomList.length === 0 && this.currentPage === 1) {
            this.statusText.text = "暂无房间，点击创建房间开始游戏";
        } else {
            const displayCount = this.currentRoomList.length;
            if (this.totalRooms > 0) {
                this.statusText.text = `第 ${this.currentPage}/${this.totalPages} 页，共 ${this.totalRooms} 个房间，显示 \n玩家id：${displayCount} 个${Gnet.getCurrentPlayerId()}`;
            } else {
                this.statusText.text = `第 ${this.currentPage} 页，显示 ${displayCount} 个房间\n玩家id：${Gnet.getCurrentPlayerId()}\n房主id：${Gnet.getRoomOwnerId()}`;
            }
        }
    }

    /**
    * 更新房间列表UI
    */
    private updateRoomListUI(): void {
        // 使用下一帧更新，确保数据已经准备好
        Timer.setTimeout(16, () => {
            this.roomList.array = this.currentRoomList;
            this.roomList.refresh();

            console.log(`更新UI: 显示${this.currentRoomList.length}个房间`);
        });
    }

    /**
     * 更新分页信息显示（基于实际服务器响应重写）
     */
    private updatePageInfo(): void {
        // 确保总页数至少为1
        const displayTotalPages = Math.max(1, this.totalPages);
        const displayCurrentPage = Math.min(this.currentPage, displayTotalPages);

        // 更新页码显示
        if (this.pageInfoText) {
            this.pageInfoText.text = `第 ${displayCurrentPage}/${displayTotalPages} 页`;
        }

        // 更新分页按钮状态
        if (this.prevPageBtn) {
            this.prevPageBtn.disabled = (this.currentPage <= 1);
        }

        if (this.nextPageBtn) {
            // 下一页按钮状态：有下一页数据 且 不是正在加载
            this.nextPageBtn.disabled = (this.hasNext === 0) || this.isLoading;
        }

        console.log(`分页状态: 当前页${this.currentPage}, 总页数${this.totalPages}, 是否有下一页: ${this.hasNext}, 总房间数: ${this.totalRooms}`);
    }


    /**
    * 上一页按钮点击事件（使用 offset 历史栈）
    */
    private onPrevPageClick(): void {
        if (this.isLoading) {
            this.statusText.text = "正在加载中，请稍候...";
            return;
        }

        if (this.currentPage <= 1) {
            this.statusText.text = "已经是第一页";
            return;
        }

        this.currentPage--;
        // 从历史栈中取出上一页的 offset
        if (this.offsetHistory.length > this.currentPage - 1) {
            this.serverOffset = this.offsetHistory[this.currentPage - 1];
        } else {
            this.serverOffset = null;
        }

        this.statusText.text = "加载上一页...";
        this.loadRoomsFromServer(true, false);
    }

    /**
     * 下一页按钮点击事件（保存当前 offset 到历史栈）
     */
    private onNextPageClick(): void {
        if (this.isLoading) {
            this.statusText.text = "正在加载中，请稍候...";
            return;
        }

        console.log("下一页点击，当前状态:", {
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            hasNext: this.hasNext,
            serverOffset: this.serverOffset,
            totalRooms: this.totalRooms
        });

        if (this.hasNext === 0) {
            this.statusText.text = "已经是最后一页";
            return;
        }

        // 保存当前页的 offset 到历史栈
        while (this.offsetHistory.length <= this.currentPage) {
            this.offsetHistory.push(this.serverOffset);
        }

        this.currentPage++;
        this.loadRoomsFromServer(false);
    }

    /**
     * 跳转到指定页
     */
    private goToPage(pageNumber: number): void {
        if (pageNumber < 1 || pageNumber > this.totalPages) {
            this.statusText.text = `页码 ${pageNumber} 无效`;
            return;
        }

        this.currentPage = pageNumber;

        // 跳转页面不需要从服务器加载，直接从缓存中取数据
        if (this.roomListData && this.roomListData.length > 0) {
            this.totalPages = Math.ceil(this.roomListData.length / this.pageSize);
            if (this.totalPages < 1) {
                this.totalPages = 1;
            }

            // 更新UI
            this.updateRoomListUI();
            // 更新状态文本
            this.statusText.text = `第 ${this.currentPage}/${this.totalPages} 页，共 ${this.roomListData.length} 个房间`;
        } else {
            // 如果没有缓存数据，从服务器重新加载
            this.refreshRoomList();
        }
    }

    /**
    * 房间列表项渲染处理函数（基于实际数据结构修复）
    */
    private onRoomItemRender(cell: Laya.Box, index: number): void {
        if (!cell || !this.currentRoomList || index < 0 || index >= this.currentRoomList.length) {
            console.log(`渲染项${index}无效:`, { cell: !!cell, list: !!this.currentRoomList, length: this.currentRoomList?.length });
            return;
        }

        const roomData = this.currentRoomList[index];
        if (!roomData) {
            console.log(`房间数据${index}为空`);
            return;
        }

        // 使用getChildByName获取组件
        const nameLabel = cell.getChildByName("name") as Laya.Label;
        const numLabel = cell.getChildByName("num") as Laya.Label;
        const gameLabel = cell.getChildByName("game") as Laya.Label;
        const img = cell.getChildByName("img") as Laya.Image;

        // 设置房间名称
        if (nameLabel) {
            const fallback = roomData.roomCode || (roomData.roomId ? roomData.roomId.substring(0, 8) : "未知");
            nameLabel.text = roomData.roomName || `房间${fallback}`;
        }

        // 设置玩家数量
        if (numLabel) {
            numLabel.text = `${roomData.playerCount || 0}/${roomData.maxPlayers || 4}`;
        }

        // 设置房间类型
        if (gameLabel) {
            // 根据roomType显示不同的文本
            let typeText = "普通房间";
            if (roomData.roomType === "1") typeText = "竞技场";
            else if (roomData.roomType === "2") typeText = "练习场";
            else if (roomData.roomType === "3") typeText = "高手区";

            gameLabel.text = typeText;
        }

        // 设置房间图标状态
        if (img) {
            // 根据房间状态设置颜色
            if (roomData.playerCount >= roomData.maxPlayers) {
                img.color = "#ff6b6b"; // 红色表示满员
            } else if (roomData.isLock) {
                img.color = "#ffa726"; // 橙色表示锁定
            } else if (roomData.isPrivate) {
                img.color = "#ab47bc"; // 紫色表示私有
            } else {
                img.color = "#66bb6a"; // 绿色表示可加入
            }
        }
    }

    private onRoomListMouse(e: Laya.Event, index: number): void {
        if (e.type !== Laya.Event.CLICK) return;
        if (!this.currentRoomList || index < 0 || index >= this.currentRoomList.length) return;
        const roomId = this.currentRoomList[index].roomId;
        this.joinRoom(roomId);
    }


    /**
      * 加入房间（增强版）
      */
    private joinRoom(roomId: string): void {
        if (!roomId) {
            this.statusText.text = "房间ID不能为空";
            return;
        }

        const doJoin = () => {
            this.statusText.text = "正在加入房间...";
            Gnet.joinRoom(roomId, (err: Error | null, room: any) => {
                if (err) {
                    console.error("加入房间失败: " + err.message);
                    this.statusText.text = "加入房间失败: " + err.message;

                    if (err.message.includes("满") || err.message.includes("不存在")) {
                        Timer.setTimeout(1000, () => this.refreshRoomList());
                    }
                    return;
                }

                console.log("加入房间成功", room);
                this.statusText.text = "加入房间成功";
                this.handleRoomJoined(room);
            });
        };

        const currentRoom = Gnet.getRoom();
        if (currentRoom) {
            if (currentRoom.roomId === roomId) {
                this.statusText.text = "已在此房间中";
                return;
            }
            this.statusText.text = "正在退出当前房间...";
            Gnet.leaveRoom((err: Error | null) => {
                if (err) console.warn("离开房间失败:", err.message);
                doJoin();
            });
        } else {
            doJoin();
        }
    }

    /**
   * 处理成功加入房间（增强版）
   */
    private handleRoomJoined(room: any, fromMatch: boolean = false): void {
        console.log("进入房间:", room);
        this.statusText.text = `已进入房间: ${room.roomName || room.roomId}`;

        // 显示房间信息
        if (room.players) {
            this.statusText.text += `, 玩家: ${room.players.length}/${room.maxPlayers}`;
        }
        console.log("房间玩家列表")
        console.log(Gnet.getPlayers())

        // 匹配模式下仅展示当前房间
        if (this.isMatching || fromMatch) {
            this.isMatching = true;
            this.showCurrentRoomOnly(room);
        }

        // 绑定 room 级别事件（加入房间后 client.room 才有值）
        this.bindRoomEvents();

        // 绑定键盘事件
        this.bindRoomKeyboardEvents();

        // 检查是否满员，满员则跳转游戏场景
        this.checkAndStartGame();
    }

    /**
     * 绑定房间键盘事件
     */
    private bindRoomKeyboardEvents(): void {
        // 移除之前的监听器，避免重复绑定
        Laya.stage.offAll(Laya.Event.KEY_DOWN);

        Laya.stage.on(Laya.Event.KEY_DOWN, this, (evt: any) => {
            const code = evt.keyCode;
            console.log("按键:", code);

            if (code === 76) { // L键 - 离开房间
                this.isMatching = false;
                this._gameStarted = false;
                Gnet.leaveRoom((err) => {
                    if (!err) {
                        this.statusText.text = "已离开房间";
                        this.refreshRoomList();
                    }
                });
            } else if (code === 68) { // D键 - 解散房间
                this.isMatching = false;
                this._gameStarted = false;
                Gnet.dismissRoom((err) => {
                    if (!err) {
                        this.statusText.text = "房间已解散";
                        this.refreshRoomList();
                    }
                });
            } else if (code === 70) { // F键 - 开始帧同步
                Gnet.startFrameSync((err) => {
                    this.statusText.text = err ? "开始帧同步失败" : "帧同步已开始";
                });
            } else if (code === 83) { // S键 - 停止帧同步
                Gnet.stopFrameSync((err) => {
                    this.statusText.text = err ? "停止帧同步失败" : "帧同步已停止";
                });
            }
        });
    }

    /**
     * 根据ID加入房间按钮点击事件
     */
    private onJoinByIdClick(): void {
        if (!this.roomIdInput) {
            this.statusText.text = "房间ID输入框未找到";
            return;
        }

        const roomId = this.roomIdInput.text.trim();
        if (!roomId) {
            this.statusText.text = "请输入房间ID";
            return;
        }

        this.joinRoom(roomId);
    }

    /**
 * 创建测试房间（修复版）
 */
    private createTestRooms(count: number): void {
        this.statusText.text = `正在创建${count}个测试房间...`;

        let createdCount = 0;
        let failedCount = 0;

        const createNext = () => {
            if (createdCount + failedCount >= count) {
                this.statusText.text = `创建完成: 成功${createdCount}个, 失败${failedCount}个`;
                this.refreshRoomList();
                return;
            }

            const roomName = "测试房间" + (createdCount + failedCount + 1);
            const roomType = ((createdCount + failedCount) % 3 + 1).toString(); // 1,2,3循环

            Gnet.createRoom(roomName, 4, (err: Error | null, room: any) => {
                if (err) {
                    console.error(`创建房间${createdCount + failedCount + 1}失败:`, err.message);
                    failedCount++;
                    Timer.setTimeout(200, createNext);
                } else {
                    console.log(`创建房间${createdCount + 1}成功`);
                    createdCount++;

                    // 创建成功后立即离开，以便创建下一个房间
                    Gnet.leaveRoom((leaveErr: Error | null) => {
                        if (leaveErr) {
                            console.error(`离开房间失败:`, leaveErr.message);
                            // 如果离开失败，尝试解散房间
                            Gnet.dismissRoom(() => {
                                Timer.setTimeout(200, createNext);
                            });
                        } else {
                            Timer.setTimeout(200, createNext);
                        }
                    });
                }
            }, {
                roomType: roomType,
            });
        };

        createNext();
    }

    //组件被启用后执行，例如节点被添加到舞台后
    //onEnable(): void {}

    //组件被禁用时执行，例如从节点从舞台移除后
    //onDisable(): void {}

    //第一次执行update之前执行，只会执行一次
    //onStart(): void {}

    //手动调用节点销毁时执行
    //onDestroy(): void {}

    //每帧更新时执行，尽量不要在这里写大循环逻辑或者使用getComponent方法
    //onUpdate(): void {}

    //每帧更新时执行，在update之后执行，尽量不要在这里写大循环逻辑或者使用getComponent方法
    //onLateUpdate(): void {}

    //鼠标点击后执行。与交互相关的还有onMouseDown等十多个函数，具体请参阅文档。
    //onMouseClick(): void {}
}
