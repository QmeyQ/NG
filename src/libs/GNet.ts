/**
 * Gnet.js
 * 华为联机服务简化工具类
 * 
 * 主要改进：
 * 1. 使用统一的配置对象管理固定参数
 * 2. 添加了完整的类型定义和注释
 * 3. 优化了错误处理
 * 4. 增强了代码的可读性和可维护性
 */

declare const GOBE: any;

// 配置对象接口
interface GnetConfig {
  clientId: string;
  clientSecret: string;
  openId: string;
  appId: string;
  platform?: number;
  matchRules?: {
    maxPlayers?: number;
    roomType?: string;
    // 可以添加其他匹配规则配置
  };
}

// 回调函数类型
type InitCallback = (err: Error | null, client?: any) => void;
type RoomCallback = (err: Error | null, room?: any) => void;
type MatchCallback = (err: Error | null, response?: any) => void;
type BaseCallback = (err: Error | null, response?: any) => void;
type VoidCallback = (err: Error | null) => void;

// 房间配置选项
interface RoomOptions {
  roomType?: string;
  isPrivate?: boolean;
  customProperties?: string;
}

// 玩家配置选项
interface PlayerOptions {
  playerId?: string;
  customPlayerStatus?: number;
  customPlayerProperties?: string;
  teamId?: string;
}

// 匹配配置
interface MatchConfig {
  matchParams: {
    code: string;
  };
  maxPlayers?: number;
  roomType?: string;
}

export class Gnet {
  private static client: any = null;
  private static config: GnetConfig | null = null;
  private static isInitialized: boolean = false;

  /**
   * 初始化客户端
   * @param config 配置对象
   * @param callback 初始化结果回调
   */
  static init(config: GnetConfig, callback: InitCallback): void {
    try {
      // 验证必要配置参数
      if (!config.clientId || !config.clientSecret || !config.openId || !config.appId) {
        callback(new Error("Missing required configuration parameters"));
        return;
      }

      this.config = config;
      
      const gobeConfig = {
        clientId: config.clientId,
        openId: config.openId,
        appId: config.appId,
        clientSecret: config.clientSecret,
        platform: config.platform || (GOBE?.PlatformType?.WEB || 0)
      };
      
      this.client = new GOBE.Client(gobeConfig);
      
      this.client.init()
        .then((client: any) => {
          this.isInitialized = true;
          callback(null, client);
        })
        .catch((err: Error) => {
          this.isInitialized = false;
          callback(err);
        });
    } catch (err) {
      this.isInitialized = false;
      callback(err as Error);
    }
  }

  /**
   * 检查客户端是否已初始化
   * @returns 初始化状态
   */
  static checkInitialized(): boolean {
    return this.isInitialized && this.client !== null;
  }

  /**
   * 获取房间实例
   * @returns 房间实例或null
   */
  static getRoom(): any {
    return this.client?.room || null;
  }

  /**
   * 创建房间
   * @param roomName 房间名称
   * @param maxPlayers 最大玩家数
   * @param callback 创建结果回调
   * @param options 房间配置选项
   */
  static createRoom(roomName: string, maxPlayers: number, callback: RoomCallback, options: RoomOptions = {}): void {
    if (!this.checkInitialized()) {
      callback(new Error("Client not initialized"));
      return;
    }
    
    const roomConfig = {
      roomName,
      maxPlayers,
      roomType: options.roomType || this.config?.matchRules?.roomType,
      isPrivate: options.isPrivate ? 1 : 0,
      customRoomProperties: options.customProperties
    };
    
    this.client.createRoom(roomConfig)
      .then((room: any) => callback(null, room))
      .catch((err: Error) => callback(err));
  }

  /**
   * 加入房间
   * @param roomId 房间ID
   * @param callback 加入结果回调
   * @param options 玩家配置选项
   */
  static joinRoom(roomId: string, callback: RoomCallback, options: PlayerOptions = {}): void {
    if (!this.checkInitialized()) {
      callback(new Error("Client not initialized"));
      return;
    }
    
    const playerConfig = options.playerId ? {
      playerId: options.playerId,
      customPlayerStatus: options.customPlayerStatus,
      customPlayerProperties: options.customPlayerProperties,
      teamId: options.teamId
    } : undefined;
    
    this.client.joinRoom(roomId, playerConfig)
      .then((room: any) => callback(null, room))
      .catch((err: Error) => callback(err));
  }

  /**
   * 离开房间
   * @param callback 离开结果回调
   */
  static leaveRoom(callback: InitCallback): void {
    if (!this.checkInitialized()) {
      callback(new Error("Client not initialized"));
      return;
    }
    
    this.client.leaveRoom()
      .then((client: any) => callback(null, client))
      .catch((err: Error) => callback(err));
  }

  /**
   * 解散房间
   * @param callback 解散结果回调
   */
  static dismissRoom(callback: InitCallback): void {
    if (!this.checkInitialized()) {
      callback(new Error("Client not initialized"));
      return;
    }
    
    this.client.dismissRoom()
      .then((client: any) => callback(null, client))
      .catch((err: Error) => callback(err));
  }

  /**
   * 匹配房间
   * @param matchCode 匹配码或匹配配置
   * @param callback 匹配结果回调
   * @param options 玩家配置选项
   */
  static matchRoom(matchCode: string | MatchConfig, callback: RoomCallback, options: PlayerOptions = {}): void {
    if (!this.checkInitialized()) {
      callback(new Error("Client not initialized"));
      return;
    }

    // 构建匹配配置
    const matchRoomConfig: MatchConfig = typeof matchCode === 'string'
      ? { 
          matchParams: { code: matchCode }, 
          maxPlayers: this.config?.matchRules?.maxPlayers || 2 
        }
      : matchCode;

    const playerConfig: any = {
      customPlayerStatus: options.customPlayerStatus,
      customPlayerProperties: options.customPlayerProperties
    };

    this.client.matchRoom(matchRoomConfig, playerConfig)
      .then((room: any) => callback(null, room))
      .catch((err: Error) => callback(err));
  }

  /**
   * 匹配玩家
   * @param matchCode 匹配码
   * @param callback 匹配结果回调
   * @param options 玩家配置选项
   */
  static matchPlayer(matchCode: string, callback: MatchCallback, options: PlayerOptions = {}): void {
    if (!this.checkInitialized()) {
      callback(new Error("Client not initialized"));
      return;
    }
    
    const matchPlayerConfig = { matchCode };
    const playerConfig = options.playerId ? {
      playerId: options.playerId,
      customPlayerStatus: options.customPlayerStatus,
      customPlayerProperties: options.customPlayerProperties,
      teamId: options.teamId
    } : undefined;
    
    this.client.matchPlayer(matchPlayerConfig, playerConfig)
      .then((response: any) => callback(null, response))
      .catch((err: Error) => callback(err));
  }

  /**
   * 查询可匹配房间列表
   * @param config 查询配置
   * @param callback 查询结果回调
   */
  static getAvailableRooms(config: any, callback: (err: Error | null, info?: any) => void): void {
    if (!this.checkInitialized()) {
      callback(new Error("Client not initialized"));
      return;
    }
    
    this.client.getAvailableRooms(config)
      .then((info: any) => callback(null, info))
      .catch((err: Error) => callback(err));
  }

  /**
   * 取消匹配
   * @param callback 取消结果回调
   */
  static cancelMatch(callback: BaseCallback): void {
    if (!this.checkInitialized()) {
      callback(new Error("Client not initialized"));
      return;
    }
    
    this.client.cancelMatch()
      .then((response: any) => callback(null, response))
      .catch((err: Error) => callback(err));
  }

  /**
   * 开始帧同步
   * @param callback 开始结果回调
   */
  static startFrameSync(callback: VoidCallback): void {
    if (!this.client?.room) {
      callback(new Error("Room not available"));
      return;
    }
    
    this.client.room.startFrameSync()
      .then(() => callback(null))
      .catch((err: Error) => callback(err));
  }

  /**
   * 停止帧同步
   * @param callback 停止结果回调
   */
  static stopFrameSync(callback: VoidCallback): void {
    if (!this.client?.room) {
      callback(new Error("Room not available"));
      return;
    }
    
    this.client.room.stopFrameSync()
      .then(() => callback(null))
      .catch((err: Error) => callback(err));
  }

  /**
   * 发送帧数据
   * @param data 帧数据（字符串或字符串数组）
   */
  static sendFrame(data: string | string[]): void {
    if (!this.client?.room) {
      console.warn("Room not available, cannot send frame data");
      return;
    }
    
    this.client.room.sendFrame(data);
  }

  /**
   * 请求帧数据
   * @param beginFrameId 起始帧ID
   * @param size 请求帧数量
   */
  static requestFrame(beginFrameId: number, size: number): void {
    if (!this.client?.room) {
      console.warn("Room not available, cannot request frame data");
      return;
    }
    
    this.client.room.requestFrame(beginFrameId, size);
  }

  /**
   * 更新房间属性
   * @param roomName 房间名称（可选）
   * @param customProperties 自定义属性（可选）
   */
  static updateRoom(roomName?: string, customProperties?: string): void {
    if (!this.client?.room) {
      console.warn("Room not available, cannot update room properties");
      return;
    }
    
    const updateRoomInfo: any = {};
    if (roomName) updateRoomInfo.roomName = roomName;
    if (customProperties) updateRoomInfo.customRoomProperties = customProperties;
    
    this.client.room.updateRoomProperties(updateRoomInfo);
  }

  /**
   * 发送消息到服务器
   * @param msg 消息内容
   */
  static sendToServer(msg: string): void {
    if (!this.client?.room) {
      console.warn("Room not available, cannot send message to server");
      return;
    }
    
    this.client.room.sendToServer(msg);
  }

  /**
   * 广播消息到房间内玩家
   * @param info 消息信息
   */
  static sendToClient(type: number, msg: string, recvPlayerIdList?: string[] ): void {
    if (!this.client?.room) {
      console.warn("Room not available, cannot send message to client");
      return;
    }
    
    this.client.room.sendToClient({ type, msg, recvPlayerIdList });
  }

  /**
   * 销毁客户端
   * @param callback 销毁结果回调
   */
  static destroy(callback: VoidCallback): void {
    if (!this.client) {
      callback(null);
      return;
    }
    
    this.client.destroy()
      .then(() => {
        this.client = null;
        this.config = null;
        this.isInitialized = false;
        callback(null);
      })
      .catch((err: Error) => callback(err));
  }

  // ========== 事件监听方法 ==========

  /**
   * 监听初始化结果
   * @param cb 回调函数
   */
  static onInit(cb: (code: number) => any): void {
    this.client?.onInitResult(cb);
  }

  /**
   * 监听匹配结果
   * @param cb 回调函数
   */
  static onMatch(cb: (resp: any) => any): void {
    this.client?.onMatch(cb);
  }

  /**
   * 监听被踢出事件
   * @param cb 回调函数
   */
  static onKick(cb: () => any): void {
    this.client?.onKickOff(cb);
  }

  /**
   * 监听帧数据接收
   * @param cb 回调函数
   */
  static onFrame(cb: (msg: any) => any): void {
    this.client?.room?.onRecvFrame(cb);
  }

  /**
   * 监听服务器消息
   * @param cb 回调函数
   */
  static onServer(cb: (info: any) => any): void {
    this.client?.room?.onRecvFromServer(cb);
  }

  /**
   * 监听客户端消息
   * @param cb 回调函数
   */
  static onClient(cb: (info: any) => any): void {
    this.client?.room?.onRecvFromClient(cb);
  }

  /**
   * 监听玩家连接事件
   * @param cb 回调函数
   */
  static onConnect(cb: (player: any) => any): void {
    this.client?.room?.onConnect(cb);
  }

  /**
   * 监听玩家加入事件
   * @param cb 回调函数
   */
  static onJoin(cb: (player: any) => any): void {
    this.client?.room?.onJoin(cb);
  }

  /**
   * 监听玩家离开事件
   * @param cb 回调函数
   */
  static onLeave(cb: (player: any) => any): void {
    this.client?.room?.onLeave(cb);
  }

  /**
   * 监听房间解散事件
   * @param cb 回调函数
   */
  static onDismiss(cb: () => any): void {
    this.client?.room?.onDismiss(cb);
  }
}
