import { Gnet } from "./libs/GNet";
import { Res } from "./libs/res";
const { regClass, property } = Laya;

@regClass()
export class load extends Laya.Script {
    //
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
    private pageSize: number = 10;
    private totalPages: number = 1;
    
    // 服务器分页信息
    private totalRooms: number = 0;
    private offset: string | number = "";
    private hasNext: 0 | 1 = 0;
    
    private serverOffset: string | number | null = null; // 服务器偏移量

    // 显示的房间列表
    private displayRoomList: any[] = [];
    private allRoomListData: any[] = []; // 所有从服务器获取的房间数据
    
    private nextServerOffset: string | null = null; // 服务器下次请求的offset

    
    private isLoading: boolean = false;

    // 当前显示的房间列表
    private currentRoomList: any[] = [];


    //组件被激活后执行，此时所有节点和组件均已创建完毕，此方法只执行一次
    onAwake(): void {



        Res.url("http://normalgame.cn/res.res", (res:any)=>{
            console.log(res)
        Res.load(res);
        Laya.Scene.open("game/select.ls");
        })
        return;

          // 初始化分页数据
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 1;
        this.serverOffset = null;
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
            if (index >= 0 && this.displayRoomList[index]) {
                console.log("选中房间:", this.displayRoomList[index]);
                // 可以在这里处理房间选择逻辑
            }
        });
        
        console.log("this.roomList", this.roomList);
        // 绑定按钮事件
        this.createRoomBtn.on(Laya.Event.CLICK, this, this.onCreateRoomClick);
        this.refreshBtn.on(Laya.Event.CLICK, this, this.onRefreshClick);
        this.prevPageBtn.on(Laya.Event.CLICK, this, this.onPrevPageClick);
        this.nextPageBtn.on(Laya.Event.CLICK, this, this.onNextPageClick);
        this.joinByIdBtn.on(Laya.Event.CLICK, this, this.onJoinByIdClick);
        this.quickMatchBtn.on(Laya.Event.CLICK, this, this.onQuickMatchClick);
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
            
            this.refreshRoomList();
            Laya.timer.loop(5000, this, () => {
                if (!Gnet.getRoom()) this.refreshRoomList();
            });
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
        console.log("this.createRoomBtn", this.createRoomBtn);
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
        const level = this.roomIdInput && this.roomIdInput.text.trim() ? this.roomIdInput.text.trim() : "1";
        Gnet.matchRoom({ matchParams: { level }, maxPlayers: 4, roomType: "demo" }, (err: Error | null, room: any) => {
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
     * 刷新房间列表（基于实际服务器响应重写）
     */
    private refreshRoomList(): void {
        if (this.isLoading) {
            console.log("正在加载中，请稍候...");
            return;
        }

        this.statusText.text = "正在刷新房间列表...";
        this.currentPage = 1;
        this.serverOffset = "0"; // 重置为初始偏移量
        this.hasNext = 0;
        this.totalRooms = 0;
        this.currentRoomList = [];
        
        this.loadRoomsFromServer(true);
    }

    /**
     * 从服务器加载房间数据
     * @param isRefresh 是否是刷新操作
     */
    private loadRoomsFromServer(isRefresh: boolean = false): void {
        if (this.isLoading) {
            console.log("正在加载中，请稍候...");
            return;
        }

        this.isLoading = true;
        const loadingText = isRefresh ? "正在刷新房间列表..." : "正在加载下一页...";
        this.statusText.text = loadingText;
        
        console.log(`加载房间: 页码${this.currentPage}, 偏移量${this.serverOffset}, 每页${this.pageSize}`);

        Gnet.getAvailableRoomsPaged(
            this.currentPage,
            this.pageSize,
            (err: Error | null, rooms: any[], hasNext: 0 | 1, serverTotalCount: number, extra?: any) => {
                this.isLoading = false;
                
                if (err) {
                    console.error("获取房间列表失败: " + err.message);
                    this.statusText.text = "获取房间列表失败: " + err.message;
                    this.currentRoomList = [];
                    this.updateRoomListUI();
                    this.updatePageInfo();
                    return;
                }

                console.log(`获取房间成功: ${rooms.length}个房间, 是否有下一页: ${hasNext}, 服务器总数: ${serverTotalCount}`);

                // 更新服务器状态
                this.hasNext = hasNext;
                this.totalRooms = serverTotalCount;
                
                // 更新服务器偏移量
                if (extra && extra.nextServerOffset) {
                    this.serverOffset = extra.nextServerOffset;
                    console.log(`更新服务器偏移量为: ${this.serverOffset}`);
                }

                // 更新当前显示的房间列表
                if (isRefresh || this.currentPage === 1) {
                    this.currentRoomList = rooms;
                } else {
                    // 如果是加载下一页，追加到现有列表
                    this.currentRoomList = this.currentRoomList.concat(rooms);
                }

                // 计算总页数（基于服务器返回的总数）
                this.calculateTotalPages();
                
                // 更新UI
                this.updateRoomListUI();
                this.updatePageInfo();
                
                // 更新状态文本
                this.updateStatusText();
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
        
        console.log(`计算总页数: 总数${this.totalRooms}, 每页${this.pageSize}, 总页数${this.totalPages}, 当前页${this.currentPage}`);
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
                this.statusText.text = `第 ${this.currentPage}/${this.totalPages} 页，共 ${this.totalRooms} 个房间，显示 ${displayCount} 个`;
            } else {
                this.statusText.text = `第 ${this.currentPage} 页，显示 ${displayCount} 个房间`;
            }
        }
    }

     /**
     * 更新房间列表UI
     */
    private updateRoomListUI(): void {
        // 使用下一帧更新，确保数据已经准备好
        Laya.timer.frameOnce(1, this, () => {
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
     * 上一页按钮点击事件（基于实际分页逻辑重写）
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
        
        // 由于使用服务器偏移量，我们需要重新计算偏移量
        // 简化处理：如果有缓存数据且数量足够，直接显示前一页
        // 否则重新从服务器加载
        
        const startIndex = (this.currentPage - 1) * this.pageSize;
        if (startIndex < this.currentRoomList.length) {
            // 有缓存数据，直接显示
            this.updatePageInfo();
            this.updateStatusText();
        } else {
            // 没有缓存数据，需要从服务器重新加载
            this.statusText.text = "重新加载数据...";
            this.refreshRoomList();
        }
    }

    /**
     * 下一页按钮点击事件（基于实际分页逻辑重写）
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

        // 如果没有更多数据，禁用下一页
        if (this.hasNext === 0) {
            this.statusText.text = "已经是最后一页";
            return;
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
            console.log(`渲染项${index}无效:`, {cell: !!cell, list: !!this.currentRoomList, length: this.currentRoomList?.length});
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
            nameLabel.text = roomData.roomName || `房间${roomData.roomCode || roomData.roomId.substring(0, 8)}`;
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
        if (!this.displayRoomList || index < 0 || index >= this.displayRoomList.length) return;
        const roomId = this.displayRoomList[index].roomId;
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

        this.statusText.text = "正在加入房间...";
        // 使用Gnet的真实joinRoom接口
        Gnet.joinRoom(roomId, (err: Error | null, room: any) => {
            if (err) {
                console.error("加入房间失败: " + err.message);
                this.statusText.text = "加入房间失败: " + err.message;
                
                // 如果是房间已满或其他原因，刷新列表
                if (err.message.includes("满") || err.message.includes("不存在")) {
                    Laya.timer.once(1000, this, this.refreshRoomList);
                }
                return;
            }
            
            console.log("加入房间成功", room);
            this.statusText.text = "加入房间成功";
            this.handleRoomJoined(room);
        });
    }
    
      /**
     * 处理成功加入房间（增强版）
     */
    private handleRoomJoined(room: any): void {
        console.log("进入房间:", room);
        this.statusText.text = `已进入房间: ${room.roomName || room.roomId}`;
        
        // 显示房间信息
        if (room.players) {
            this.statusText.text += `, 玩家: ${room.players.length}/${room.maxPlayers}`;
        }
        
        // 绑定键盘事件
        this.bindRoomKeyboardEvents();
        
        // 示例：可以在这里跳转到游戏场景
        Laya.timer.once(3000, this, () => {
            console.log("准备跳转到游戏场景...");
            // 实际跳转逻辑
            // Laya.Scene.open("game.scene");
        });
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
                Gnet.leaveRoom((err) => {
                    if (!err) {
                        this.statusText.text = "已离开房间";
                        this.refreshRoomList();
                    }
                });
            } else if (code === 68) { // D键 - 解散房间
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
        const failedCount = 0;
        const maxRetry = 2;
        
        const createNext = () => {
            if (createdCount >= count) {
                this.statusText.text = `创建完成: 成功${createdCount}个, 失败${failedCount}个`;
                this.refreshRoomList();
                return;
            }
            
            const roomName = "测试房间" + (createdCount + 1);
            const roomType = (createdCount % 3 + 1).toString(); // 1,2,3循环
            
            Gnet.createRoom(roomName, 4, (err: Error | null, room: any) => {
                if (err) {
                    console.error(`创建房间${createdCount + 1}失败:`, err.message);
                } else {
                    console.log(`创建房间${createdCount + 1}成功`);
                    createdCount++;
                    
                    // 创建成功后立即离开，以便创建下一个房间
                    Gnet.leaveRoom((leaveErr: Error | null) => {
                        if (leaveErr) {
                            console.error(`离开房间失败:`, leaveErr.message);
                            // 如果离开失败，尝试解散房间
                            Gnet.dismissRoom(() => {
                                Laya.timer.once(200, this, createNext);
                            });
                        } else {
                            Laya.timer.once(200, this, createNext);
                        }
                    });
                    return;
                }
                
                // 继续创建下一个
                Laya.timer.once(200, this, createNext);
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
