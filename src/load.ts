import { Gnet } from "./libs/GNet";
import { RoomItem } from "./roomItem";
const { regClass, property } = Laya;

@regClass()
export class load extends Laya.Script {
    // UI元素引用
    @property(Laya.List)
    public roomList: Laya.List;
    
    @property(Laya.Button)
    public createRoomBtn: Laya.Button;
    
    @property(Laya.Button)
    public refreshBtn: Laya.Button;
    
    @property(Laya.Text)
    public statusText: Laya.Text;
    
    // 分页相关UI
    @property(Laya.Button)
    public prevPageBtn: Laya.Button;
    
    @property(Laya.Button)
    public nextPageBtn: Laya.Button;
    
    @property(Laya.Text)
    public pageInfoText: Laya.Text;
    
    // ID加入房间相关UI
    @property(Laya.TextInput)
    public roomIdInput: Laya.TextInput;
    
    @property(Laya.Button)
    public joinByIdBtn: Laya.Button;
    
    // 一键匹配按钮
    @property(Laya.Button)
    public quickMatchBtn: Laya.Button;
    
    private openId: string = "";
    private roomListData: any[] = [];
    
    // 分页相关数据
    private currentPage: number = 1;
    private pageSize: number = 5;
    private totalPages: number = 1;
    
    // 服务器分页信息
    private totalRooms: number = 0;
    private offset: string | number = "";
    private hasNext: 0 | 1 = 0;
    
    // 显示的房间列表
    private displayRoomList: any[] = [];

    //组件被激活后执行，此时所有节点和组件均已创建完毕，此方法只执行一次
    onAwake(): void {
        // 获取UI元素引用
        const roomPanel = this.owner.getChildByName("roomPanel");
        this.roomList = roomPanel.getChildByName("roomList") as Laya.List;
        this.createRoomBtn = roomPanel.getChildByName("createRoomBtn") as Laya.Button;
        this.refreshBtn = roomPanel.getChildByName("refreshBtn") as Laya.Button;
        this.statusText = roomPanel.getChildByName("statusText") as Laya.Text;
        
        // 获取分页相关UI元素
        const pagePanel = roomPanel.getChildByName("pagePanel");
        this.prevPageBtn = pagePanel.getChildByName("prevPageBtn") as Laya.Button;
        this.nextPageBtn = pagePanel.getChildByName("nextPageBtn") as Laya.Button;
        this.pageInfoText = pagePanel.getChildByName("pageInfoText") as Laya.Text;
        
        // 获取ID加入房间相关UI元素
        const joinByIdPanel = roomPanel.getChildByName("joinByIdPanel");
        this.roomIdInput = joinByIdPanel.getChildByName("roomIdInput") as Laya.TextInput;
        this.joinByIdBtn = joinByIdPanel.getChildByName("joinByIdBtn") as Laya.Button;
        
        // 获取一键匹配按钮
        this.quickMatchBtn = roomPanel.getChildByName("quickMatchBtn") as Laya.Button;

        // 设置房间列表的项渲染器
        this.roomList.vScrollBarSkin = "";
       //this.roomList.itemRender = Laya.loader.getRes("roomItem.ui");
        this.roomList.renderHandler = new Laya.Handler(this, this.onRoomItemRender);

        //   this.roomList.renderHandler = new Laya.Handler(this, this.onListRender);
        // //绑定list选项改变的切换
        // this.roomList.selectHandler = new Laya.Handler(this, this.onListSelect);
        // //绑定单元格的鼠标事件
        // this.roomList.mouseHandler = new Laya.Handler(this, this.onListMouse);

        //不使用皮肤，但有滚动条效果
        this.roomList.vScrollBarSkin = "";


         //绑定list选项改变的切换
        this.roomList.selectHandler = new Laya.Handler(this, (index: number) => {
            this.roomList.refresh();
        });

        console.log("this.roomList", this.roomList);
        
        // 绑定按钮事件
        this.createRoomBtn.on(Laya.Event.CLICK, this, this.onCreateRoomClick);
        this.refreshBtn.on(Laya.Event.CLICK, this, this.onRefreshClick);
        this.prevPageBtn.on(Laya.Event.CLICK, this, this.onPrevPageClick);
        this.nextPageBtn.on(Laya.Event.CLICK, this, this.onNextPageClick);
        this.joinByIdBtn.on(Laya.Event.CLICK, this, this.onJoinByIdClick);
        this.quickMatchBtn.on(Laya.Event.CLICK, this, this.onQuickMatchClick);
        
        // 生成openId
        this.openId = Date.now().toString();
        
        // 初始化Gnet
        this.initGnet();
    }

    /**
     * 初始化Gnet联机服务
     */
    private initGnet(): void {
        this.statusText.text = "正在连接服务器...";
        
        Gnet.init({
            clientId: '1263859182919011264',
            clientSecret: '8D99CCC71D57DD3DFF0F1C4EB5A800E527AB122C9580D781E6BEB18C917AE277',
            openId: this.openId,
            appId: '172249065902748389',
        }, (err: Error | null, client: any) => {
            if (err) {
                console.error("初始化失败: " + err.message);
                this.statusText.text = "连接服务器失败: " + err.message;
                return;
            }
            
            console.log("初始化成功", client);
            this.statusText.text = "服务器连接成功";
            
            // 绑定房间相关事件
            this.bindRoomEvents();
            
            // 刷新房间列表
            this.refreshRoomList();
        });
    }
    
    /**
     * 绑定房间相关事件
     */
    private bindRoomEvents(): void {
        Gnet.onClient((info: any) => {
            console.log("收到客户端消息:", info);
        });
        
        Gnet.onServer((info: any) => {
            console.log("收到服务器消息:", info);
            // 处理服务器广播的房间列表更新
            if (info.type === 'roomListUpdate') {
                this.roomListData = info.roomList || [];
                this.updateRoomListUI();
            }
            // 处理房间解散事件
            else if (info.type === 'roomDismissed') {
                console.log("房间已解散:", info.roomId);
                this.statusText.text = "房间已解散，返回房间列表";
                // 可以在这里处理返回房间列表的逻辑
                this.refreshRoomList();
            }
        });
        
        Gnet.onJoin((player: any) => {
            console.log("玩家加入:", player);
            this.statusText.text = `玩家 ${player.playerId} 加入房间`;
        });
        
        Gnet.onLeave((player: any) => {
            console.log("玩家离开:", player);
            this.statusText.text = `玩家 ${player.playerId} 离开房间`;
        });
        
        Gnet.onMatch((resp: any) => {
            console.log("匹配结果:", resp);
            if (resp && resp.room) {
                this.statusText.text = "匹配成功，正在进入房间...";
                this.handleRoomJoined(resp.room);
            }
        });
        
        // 添加房间解散事件监听
        Gnet.onDismiss((roomId: string) => {
            console.log("房间解散:", roomId);
            this.statusText.text = "房间已解散";
            // 刷新房间列表
            this.refreshRoomList();
        });
    }
    
    /**
     * 创建房间按钮点击事件
     */
    private onCreateRoomClick(): void {
        const roomName = "房间" + this.openId.substring(8);
        this.statusText.text = "正在创建房间...";
        
        Gnet.createRoom(roomName, 4, (err: Error | null, room: any) => {
            if (err) {
                console.error("创建房间失败: " + err.message);
                this.statusText.text = "创建房间失败: " + err.message;
                return;
            }
            
            console.log("创建房间成功", room);
            this.statusText.text = "房间创建成功，等待玩家加入...";
            
            // 可以在这里处理进入房间后的逻辑
            this.handleRoomJoined(room);
        });
    }
    
    /**
     * 一键匹配按钮点击事件
     */
    private onQuickMatchClick(): void {
        this.statusText.text = "正在匹配房间...";
        
        // 使用GNet的匹配策略，默认匹配码为"normal"
        Gnet.matchRoom("normal", (err: Error | null, room: any) => {
            if (err) {
                console.error("匹配失败: " + err.message);
                this.statusText.text = "匹配失败: " + err.message;
                return;
            }
            
            console.log("匹配成功", room);
            this.statusText.text = "匹配成功，正在进入房间...";
            this.handleRoomJoined(room);
        });
    }
    
    /**
     * 刷新列表按钮点击事件
     */
    private onRefreshClick(): void {
        this.refreshRoomList();
    }
    
    /**
     * 刷新房间列表
     */
    private refreshRoomList(): void {
        this.statusText.text = "正在刷新房间列表...";
        
        // 重置偏移量，获取第一页数据
        this.offset = "";
        
        // 使用Gnet的真实接口获取可匹配房间列表
        Gnet.getAvailableRooms((err: Error | null, info?: any) => {
            if (err) {
                console.error("获取房间列表失败: " + err.message);
                this.statusText.text = "获取房间列表失败: " + err.message;
                return;
            }
            console.log("获取房间列表成功", info);
            
            // 根据AvailableRoomsInfo接口处理数据
            if (info) {
                // 保存服务器分页信息
                this.totalRooms = info.count || 0;
                this.offset = info.offset || "";
                this.hasNext = info.hasNext || 0;
                
                // 处理获取到的房间列表
                if (info.rooms) {
                    // 将获取到的房间数据转换为我们需要的格式
                    this.roomListData = info.rooms.map((room: any) => ({
                        roomName: room.roomName || `房间${room.roomId}`,
                        roomId: room.roomId,
                        playerCount: room.players ? room.players.length : 0,
                        maxPlayers: room.maxPlayers || 2,
                        roomType: room.roomType || "normal",
                    }));
                } else {
                    this.roomListData = [];
                }
            } else {
                this.roomListData = [];
                this.totalRooms = 0;
                this.offset = "";
                this.hasNext = 0;
            }
            console.log("结算的房间", this.roomListData);
            // 重置当前页为第一页
            this.currentPage = 1;
            
            // 计算总页数（基于当前获取到的数据）
            this.calculateTotalPages();
            
            this.updateRoomListUI();
            this.statusText.text = `找到 ${this.totalRooms} 个房间（当前显示 ${this.roomListData.length} 个）`;
        }, {});
    }
    
    /**
     * 加载下一页房间数据
     */
    private loadNextPage(): void {
        if (this.hasNext === 0) {
            this.statusText.text = "没有更多房间了";
            return;
        }
        
        this.statusText.text = "正在加载下一页...";
        
        // 使用偏移量获取下一页数据
        Gnet.getAvailableRooms((err: Error | null, info?: any) => {
            if (err) {
                console.error("获取下一页房间列表失败: " + err.message);
                this.statusText.text = "获取下一页失败: " + err.message;
                return;
            }
            
            if (info && info.rooms) {
                // 更新服务器分页信息
                this.totalRooms = info.count || this.totalRooms;
                this.offset = info.offset || "";
                this.hasNext = info.hasNext || 0;
                
                // 将新获取的房间数据添加到现有列表
                const newRooms = info.rooms.map((room: any) => ({
                    roomName: room.roomName || `房间${room.roomId}`,
                    roomId: room.roomId,
                    playerCount: room.players ? room.players.length : 0,
                    maxPlayers: room.maxPlayers || 2,
                    roomType: room.roomType || "normal",
                }));
                
                this.roomListData = this.roomListData.concat(newRooms);
                
                // 重新计算总页数
                this.calculateTotalPages();
                
                this.updateRoomListUI();
                this.statusText.text = `已加载 ${this.roomListData.length}/${this.totalRooms} 个房间`;
            } else {
                this.statusText.text = "没有更多房间了";
            }
        }, { offset: this.offset });
    }

    /**
     * 计算总页数
     */
    private calculateTotalPages(): void {
        // 基于当前已加载的数据计算分页
        this.totalPages = Math.ceil(this.roomListData.length / this.pageSize);
        if (this.totalPages < 1) {
            this.totalPages = 1;
        }
        // 确保当前页不超过总页数
        if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
        }
    }
    
    /**
     * 更新显示的房间列表
     */
    private updateDisplayRoomList(): void {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.displayRoomList = this.roomListData.slice(startIndex, endIndex);
    }
    
    /**
     * 更新分页信息显示
     */
    private updatePageInfo(): void {
        if (this.pageInfoText) {
            this.pageInfoText.text = `第 ${this.currentPage}/${this.totalPages} 页 (共 ${this.totalRooms} 个房间)`;
        }
        
        // 更新分页按钮状态
        if (this.prevPageBtn) {
            this.prevPageBtn.disabled = this.currentPage <= 1;
        }
        if (this.nextPageBtn) {
            // 下一页按钮状态：如果当前页是最后一页且有更多数据可加载，则启用
            const hasMoreData = this.hasNext === 0 || this.currentPage < this.totalPages;
            this.nextPageBtn.disabled = !hasMoreData;
        }
    }
    
    
    /**
     * 房间列表项渲染处理函数
     */
    private onRoomItemRender(cell: Laya.Box, index: number): void {
        if (cell && this.displayRoomList[index]) {
             console.log("this.displayRoomList[index]", this.displayRoomList);
            const name = cell.getChild("name") as Laya.Text;
            const num = cell.getChild("num") as Laya.Text;
            const game = cell.getChild("game") as Laya.Text;
            const img = cell.getChild("img") as Laya.Image;
            if (name) {
                name.text = this.displayRoomList[index].roomName;
                num.text = `${this.displayRoomList[index].playerCount}/${this.displayRoomList[index].maxPlayers}`;
                game.text = this.displayRoomList[index].roomType;
                //img.skin = this.displayRoomList[index].gameType === "chess" ? "chess.png" : "poker.png";
                }
        }
    }

    /**
     * 更新房间列表UI
     */
    private updateRoomListUI(): void {
        this.updateDisplayRoomList();
        this.roomList.array = this.displayRoomList;
        
        // 更新分页信息
        this.updatePageInfo();
    }
    
    /**
     * 加入房间
     */
    private joinRoom(roomId: string): void {
        this.statusText.text = "正在加入房间...";
        
        // 使用Gnet的真实joinRoom接口
        Gnet.joinRoom(roomId, (err: Error | null, room: any) => {
            if (err) {
                console.error("加入房间失败: " + err.message);
                this.statusText.text = "加入房间失败: " + err.message;
                return;
            }
            
            console.log("加入房间成功", room);
            this.statusText.text = "加入房间成功";
            this.handleRoomJoined(room);
        });
    }
    
    /**
     * 处理成功加入房间
     */
    private handleRoomJoined(room: any): void {
        // 这里可以跳转到游戏场景或房间详情页面
        console.log("进入房间:", room.id);
        this.statusText.text = "已进入房间，准备游戏...";
        
        // 示例：3秒后自动跳转
        Laya.timer.once(3000, this, () => {
            // 这里可以添加跳转逻辑
            console.log("跳转到游戏场景");
        });
    }
    
    /**
     * 上一页按钮点击事件
     */
    private onPrevPageClick(): void {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updateRoomListUI();
        }
    }
    
    /**
     * 下一页按钮点击事件
     */
    private onNextPageClick(): void {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updateRoomListUI();
        } else if (this.hasNext === 0) {
            // 当前页是最后一页且有更多数据可加载
            this.loadNextPage();
        }
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