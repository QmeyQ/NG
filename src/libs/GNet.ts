/**
 * Gnet.js
 * 华为联机服务（Game Open Boost Engine）简化工具类，提供房间管理、匹配、帧同步等核心功能的封装。
 * 
 * 主要方法：
 * init(config: GnetConfig, callback: InitCallback) - 初始化华为联机服务客户端，需提供clientId、clientSecret等必要参数。
 * checkInitialized(): boolean - 检查客户端初始化状态，返回true表示已初始化可用。
 * getRoom(): any - 获取当前房间实例，未加入房间时返回null。
 * getRoomOwnerId(): string - 获取当前房间的房主ID。
 * isRoomOwner(): boolean - 检查当前玩家是否是房主。
 * isPlayerRoomOwner(playerId: string): boolean - 检查指定玩家是否是房主。
 * getCurrentPlayerId(): string - 获取当前玩家ID。
 * getPlayers(): any[] - 获取房间内所有玩家列表。
 * getPlayerById(playerId: string): any - 根据玩家ID获取玩家信息。
 * getRoomStatus(): RoomStatus - 获取当前房间状态。
 * getRoomCustomProperties(): any - 获取房间自定义属性。
 * getPlayerCustomProperties(playerId?: string): any - 获取玩家自定义属性。
 * createRoom(roomName: string, maxPlayers: number, callback: RoomCallback, options?: RoomOptions) - 创建新房间，可设置房间类型、是否私密等属性。
 * joinRoom(roomId: string, callback: RoomCallback, options?: PlayerOptions) - 加入指定ID的房间，可配置玩家属性和状态。
 * leaveRoom(callback: InitCallback) - 离开当前房间，返回客户端实例。
 * dismissRoom(callback: InitCallback) - 解散当前房间（仅房主可用）。
 * matchRoom(matchCode: string | MatchConfig, callback: RoomCallback, options?: PlayerOptions) - 匹配加入房间，支持匹配码或完整匹配配置。
 * matchPlayer(matchCode: string, callback: MatchCallback, options?: PlayerOptions) - 匹配其他玩家（玩家匹配模式）。
 * getAvailableRooms(callback: BaseCallback, config?: any) - 获取可加入的房间列表。
 * cancelMatch(callback: BaseCallback) - 取消当前的匹配操作。
 * startFrameSync(callback: VoidCallback) - 开始帧同步（房主调用）。
 * stopFrameSync(callback: VoidCallback) - 停止帧同步（房主调用）。
 * sendFrame(data: string | string[]) - 发送帧同步数据到房间内所有玩家。
 * requestFrame(beginFrameId: number, size: number) - 请求指定范围的帧数据（用于断线重连）。
 * updateRoom(roomName?: string, customProperties?: string) - 更新房间名称或自定义属性（房主调用）。
 * sendToServer(msg: string) - 发送消息到服务器（自定义消息处理）。
 * sendToClient(type: number, msg: string, recvPlayerIdList?: string[]) - 发送消息给房间内指定玩家。
 * sendToRoomOwner(type: number, msg: string): boolean - 发送消息给房主，返回是否发送成功。
 * sendSystemMessage(msg: string) - 发送系统消息给所有玩家。
 * sendChatMessage(msg: string, toPlayerId?: string) - 发送聊天消息，可指定接收玩家或广播。
 * broadcastFromOwner(type: number, msg: string): boolean - 房主广播消息给所有玩家，返回是否发送成功。
 * destroy(callback: VoidCallback) - 销毁客户端实例，清理所有资源。
 * updatePlayerProperties(options: PlayerOptions, callback: BaseCallback) - 更新当前玩家属性（如状态、队伍等）。
 * transferRoomOwnership(newOwnerId: string, callback: BaseCallback) - 转移房主权限给其他玩家（仅房主可用）。
 * startGame(callback: VoidCallback) - 开始游戏（仅房主调用）。
 * endGame(result: any, callback: VoidCallback) - 结束游戏（仅房主调用）。
 * kickPlayer(playerId: string, reason: string, callback: BaseCallback) - 踢出玩家（仅房主可用）。
 * setRoomStatus(status: RoomStatus, callback: BaseCallback) - 设置房间状态（仅房主调用）。
 * getAvailableRoomsPaged(pageNumber: number, pageSize: number, callback: PagedRoomsCallback, options?: any) - 分页获取房间列表，支持服务器偏移量查询。
 * onMessage(type: number, callback: MessageCallback) - 注册消息处理器。
 * offMessage(type: number, callback?: MessageCallback) - 移除消息处理器。
 * onRoomChange(callback: (room: any) => void) - 监听房间变化事件。
 * offRoomChange(callback: (room: any) => void) - 移除房间变化监听。
 * onInit(cb: (code: number) => any) - 监听客户端初始化结果事件。
 * onMatch(cb: (resp: any) => any) - 监听匹配结果事件。
 * onKick(cb: () => any) - 监听被服务器踢出事件。
 * onFrame(cb: (msg: any) => any) - 监听接收到的帧同步数据。
 * onServer(cb: (info: any) => any) - 监听来自服务器的消息。
 * onClient(cb: (info: any) => any) - 监听来自其他客户端的消息。
 * onConnect(cb: (player: any) => any) - 监听玩家连接房间事件。
 * onJoin(cb: (player: any) => any) - 监听新玩家加入房间事件。
 * onLeave(cb: (player: any) => any) - 监听玩家离开房间事件。
 * onDismiss(cb: (roomId: string) => any) - 监听房间解散事件。
 * 
 * 接口和类型：
 * GnetConfig: 客户端配置接口，包含clientId、clientSecret、openId、appId等必填参数。
 * RoomOptions: 房间创建选项，包含roomType、isPrivate、customProperties等字段。
 * PlayerOptions: 玩家配置选项，包含playerId、customPlayerStatus、customPlayerProperties、teamId、playerName等字段。
 * MatchConfig: 匹配配置接口，包含matchParams匹配参数和maxPlayers、roomType等设置。
 * InitCallback: 初始化回调函数类型，参数为错误对象和客户端实例。
 * RoomCallback: 房间操作回调函数类型，参数为错误对象和房间实例。
 * MatchCallback: 匹配操作回调函数类型，参数为错误对象和匹配响应。
 * BaseCallback: 基础回调函数类型，参数为错误对象和响应数据。
 * VoidCallback: 无返回值回调函数类型，仅参数为错误对象。
 * PagedRoomsCallback: 分页房间列表回调，参数为错误、房间数组、是否有下一页、服务器总数等。
 * MessageCallback: 消息回调函数类型，参数为发送者ID、消息内容、消息类型。
 * RoomStatus: 房间状态枚举，包含WAITING、READY、GAMING、ENDED等状态。
 * MessageType: 消息类型枚举，包含SYSTEM、PLAYER_JOIN、PLAYER_LEAVE、CHAT、GAME_START、GAME_END等类型。
 */

declare const GOBE: any;

import { PlayerInfo } from "./GOBE";
import { MPM } from "./mpm";

// 配置对象接口
interface GnetConfig {
  clientId: string;
  clientSecret: string;
  openId: string;
  appId: string;
  platform?: number;
  appVersion?: string;
}

// 回调函数类型
type InitCallback = (err: Error | null, client?: any) => void;
type RoomCallback = (err: Error | null, room?: any) => void;
type MatchCallback = (err: Error | null, response?: any) => void;
type BaseCallback = (err: Error | null, response?: any) => void;
type VoidCallback = (err: Error | null) => void;
type MessageCallback = (senderId: string, message: string, type: number) => void;

// 房间配置选项
interface RoomOptions {
  roomType?: string;
  isPrivate?: boolean;
  customProperties?: string;
  enableFrameSync?: boolean;
}

// 玩家配置选项
interface PlayerOptions {
  playerId?: string;
  customPlayerStatus?: number;
  customPlayerProperties?: string;
  teamId?: string;
  playerName?: string;
}

// 匹配配置
interface MatchConfig {
  matchParams: {
    level: string;
  };
  maxPlayers?: number;
  roomType?: string;
}

// 消息类型枚举
export enum MessageType {
  SYSTEM = 0,      // 系统消息
  PLAYER_JOIN = 1, // 玩家加入
  PLAYER_LEAVE = 2, // 玩家离开
  CHAT = 3,        // 聊天消息
  GAME_START = 4,  // 游戏开始
  GAME_END = 5,    // 游戏结束
  CUSTOM = 100     // 自定义消息起点
}

// 房间状态枚举
export enum RoomStatus {
  WAITING = 0,     // 等待中
  READY = 1,       // 准备开始
  GAMING = 2,      // 游戏中
  ENDED = 3        // 游戏结束
}

export class Gnet {
  public static client: any = null;
  private static config: GnetConfig | null = null;
  private static isInitialized: boolean = false;
  private static currentPlayerId: string = '';
  private static messageHandlers: Map<number, MessageCallback[]> = new Map();
  private static roomChangeCallbacks: Array<(room: any) => void> = [];
  private static isRoomOwnerCache: boolean = false;
  private static _mpm: MPM = new MPM();

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
      this.currentPlayerId = config.openId;

      const gobeConfig = {
        appVersion: config.appVersion || "0.0.0",
        clientId: config.clientId,
        openId: config.openId,
        appId: config.appId,
        clientSecret: config.clientSecret,
        platform: config.platform || (GOBE?.PlatformType?.WEB || 0)
      };

      this.client = new GOBE.Client(gobeConfig);

      this.client.init()
        .catch((err: Error) => {
          this.isInitialized = false;
          callback(err);
        });
        
      this.client.onInitResult((resultCode: number) => {
        if (resultCode === GOBE.ErrorCode.COMMON_OK) {
          this.isInitialized = true;
          this.setupEventListeners();
          callback(null);
        }
      });
    } catch (err) {
      this.isInitialized = false;
      callback(err as Error);
    }
  }

  /**
   * 设置事件监听器
   */
  private static setupEventListeners(): void {
    // 监听房间变化，更新房主状态
    this.client?.room?.onRoomPropertiesChange((room: any) => {
      this.updateRoomOwnerCache(room);
      this.notifyRoomChange(room);
    });

    // 监听玩家加入离开，更新房主状态
    this.client?.room?.onJoin((player: any) => {
      this.updateRoomOwnerCache();
    });

    this.client?.room?.onLeave((player: any) => {
      this.updateRoomOwnerCache();
    });
  }

  /**
   * 更新房主状态缓存
   * @param room 房间对象（可选）
   */
  private static updateRoomOwnerCache(room?: any): void {
    const currentRoom = room || this.getRoom();
    if (currentRoom && this.currentPlayerId) {
      this.isRoomOwnerCache = currentRoom.ownerId === this.currentPlayerId;
    } else {
      this.isRoomOwnerCache = false;
    }
    this._cachedRoomPlayerId = '';
  }

  /**
   * 通知房间变化
   * @param room 房间对象
   */
  private static notifyRoomChange(room: any): void {
    this.roomChangeCallbacks.forEach(callback => {
      try {
        callback(room);
      } catch (err) {
        console.error("Room change callback error:", err);
      }
    });
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
   * 玩家全局ID（openId）
   */
  static getOpenId(): string {
    return this.currentPlayerId;
  }

  private static _cachedRoomPlayerId: string = '';

  /**
   * 房间分配的玩家ID（缓存，重进房间或为空时重新获取）
   */
  static getRoomPlayerId(): string {
    const room = this.getRoom();
    if (!room) {
      this._cachedRoomPlayerId = '';
      return '';
    }
    if (this._cachedRoomPlayerId) return this._cachedRoomPlayerId;
    const players = room.players || [];
    const myOpenId = this.currentPlayerId;
    for (const p of players) {
      try {
        const props = typeof p.customPlayerProperties === 'string' ? JSON.parse(p.customPlayerProperties) : p.customPlayerProperties;
        if (props && props.playerName === myOpenId) {
          this._cachedRoomPlayerId = p.playerId;
          return p.playerId;
        }
      } catch (e) {}
    }
    return '';
  }

  /**
   * 当前玩家ID（优先房间ID，兼容旧调用）
   */
  static getCurrentPlayerId(): string {
    return this.getRoomPlayerId() || this.currentPlayerId;
  }

  /**
   * 获取房主ID
   * @returns 房主ID，如果没有房间则返回空字符串
   */
  static getRoomOwnerId(): string {
    const room = this.getRoom();
    return room?.ownerId || '';
  }

  /**
   * 检查当前玩家是否是房主,状态变更时需要updateRoomcache
   * @returns 是否是房主
   */
  static isRoomOwner(): boolean {
    return this.isRoomOwnerCache;
  }

  /**
   * 检查指定玩家是否是房主
   * @param playerId 玩家ID
   * @returns 是否是房主
   */
  static isPlayerRoomOwner(playerId: string): boolean {
    const room = this.getRoom();
    return room?.ownerId === playerId;
  }

  /**
   * 获取房间所有玩家列表
   * @returns 玩家数组
   */
  static getPlayers(): any[] {
    const room = this.getRoom();
    return room?.players || [];
  }

  /**
   * 根据玩家ID获取玩家信息
   * @param playerId 玩家ID
   * @returns 玩家信息或null
   */
  static getPlayerById(playerId: string): any {
    const players = this.getPlayers();
    return players.find((player: any) => player.playerId === playerId) || null;
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
      roomType: options.roomType || "2",
      isPrivate: options.isPrivate ? 1 : 0,
      customRoomProperties: options.customProperties || JSON.stringify({
        status: RoomStatus.WAITING,
        createTime: Date.now(),
        enableFrameSync: options.enableFrameSync || false
      })
    };

    const playerConfig = {
      customPlayerStatus: 0,
      customPlayerProperties: JSON.stringify({
        playerName: this.config?.openId || "Player",
        joinTime: Date.now()
      })
    };

    this.client.createRoom(roomConfig, playerConfig)
      .then((room: any) => {
        this.updateRoomOwnerCache(room);
        this.notifyRoomChange(room);
        
      // 发送系统消息（失败不影响主流程）
        try {
          this.sendSystemMessage(`${this.getCurrentPlayerId()} 创建了房间`);
        } catch (e) {
          console.warn("sendSystemMessage failed:", e);
        }
        
        callback(null, room);
      })
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

    const playerConfig: any = {
      customPlayerStatus: options.customPlayerStatus || 0,
      customPlayerProperties: JSON.stringify({
        playerName: options.playerName || this.config?.openId || "Player",
        joinTime: Date.now(),
        teamId: options.teamId || ""
      })
    };

    if (options.playerId) {
      playerConfig.playerId = options.playerId;
    }

    this.client.joinRoom(roomId, playerConfig)
      .then((room: any) => {
        this.updateRoomOwnerCache(room);
        this.notifyRoomChange(room);
        
        // 发送消息（失败不影响主流程）
        try {
          this.sendToRoomOwner(MessageType.PLAYER_JOIN, JSON.stringify({
            playerId: this.getCurrentPlayerId(),
            playerName: options.playerName || this.config?.openId,
            joinTime: Date.now()
          }));
          this.sendSystemMessage(`${options.playerName || this.getCurrentPlayerId()} 加入了房间`);
        } catch (e) {
          console.warn("joinRoom message send failed:", e);
        }
        
        callback(null, room);
      })
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

    const leavingPlayerId = this.getCurrentPlayerId();
    
    // 在离开房间前发送消息（离开后 room 为 null）
    try {
      if (leavingPlayerId !== this.getRoomOwnerId()) {
        this.sendToRoomOwner(MessageType.PLAYER_LEAVE, JSON.stringify({
          playerId: leavingPlayerId,
          leaveTime: Date.now()
        }));
      }
      this.sendSystemMessage(`${leavingPlayerId} 离开了房间`);
    } catch (e) {
      console.warn("leaveRoom message send failed:", e);
    }
    
    this.client.leaveRoom()
      .then((client: any) => {
        this.updateRoomOwnerCache(null);
        callback(null, client);
      })
      .catch((err: Error) => callback(err));
  }

  /**
   * 解散房间（仅房主可用）
   * @param callback 解散结果回调
   */
  static dismissRoom(callback: InitCallback): void {
    if (!this.checkInitialized()) {
      callback(new Error("Client not initialized"));
      return;
    }

    if (!this.isRoomOwner()) {
      callback(new Error("Only room owner can dismiss the room"));
      return;
    }

    this.client.dismissRoom()
      .then((client: any) => {
        this.updateRoomOwnerCache(null);
        callback(null, client);
      })
      .catch((err: Error) => callback(err));
  }

  /**
   * 发送消息给房主
   * @param type 消息类型
   * @param msg 消息内容
   * @returns 是否发送成功
   */
  static sendToRoomOwner(type: number, msg: string): boolean {
    const roomOwnerId = this.getRoomOwnerId();
    if (!roomOwnerId || roomOwnerId === this.getCurrentPlayerId()) {
      return false;
    }
    
    this.sendToClient(type, msg, [roomOwnerId]);
    return true;
  }

  /**
   * 发送系统消息给所有玩家
   * @param msg 消息内容
   */
  static sendSystemMessage(msg: string): void {
    this.sendToClient(MessageType.SYSTEM, msg);
  }

  /**
   * 发送聊天消息
   * @param msg 消息内容
   * @param toPlayerId 指定接收玩家（可选，不指定则广播）
   */
  static sendChatMessage(msg: string, toPlayerId?: string): void {
    const recvPlayerIdList = toPlayerId ? [toPlayerId] : undefined;
    this.sendToClient(MessageType.CHAT, msg, recvPlayerIdList);
  }

  /**
   * 注册消息处理器
   * @param type 消息类型
   * @param callback 回调函数
   */
  static onMessage(type: number, callback: MessageCallback): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)?.push(callback);
  }

  /**
   * 移除消息处理器
   * @param type 消息类型
   * @param callback 回调函数（可选，不指定则移除该类型所有处理器）
   */
  static offMessage(type: number, callback?: MessageCallback): void {
    if (!callback) {
      this.messageHandlers.delete(type);
    } else {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(callback);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }
  }

  /**
   * 注册房间变化监听
   * @param callback 回调函数
   */
  static onRoomChange(callback: (room: any) => void): void {
    this.roomChangeCallbacks.push(callback);
  }

  /**
   * 移除房间变化监听
   * @param callback 回调函数
   */
  static offRoomChange(callback: (room: any) => void): void {
    const index = this.roomChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.roomChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * 房主广播消息给所有玩家
   * @param type 消息类型
   * @param msg 消息内容
   * @returns 是否发送成功（只有房主才能调用）
   */
  static broadcastFromOwner(type: number, msg: string): boolean {
    if (!this.isRoomOwner()) {
      console.warn("Only room owner can broadcast messages");
      return false;
    }
    
    this.sendToClient(type, msg);
    return true;
  }

  /**
   * 房主转移（将房主权限转移给其他玩家）
   * @param newOwnerId 新的房主ID
   * @param callback 回调函数
   */
  static transferRoomOwnership(newOwnerId: string, callback: BaseCallback): void {
    if (!this.isRoomOwner()) {
      callback(new Error("Only room owner can transfer ownership"));
      return;
    }

    if (newOwnerId === this.getCurrentPlayerId()) {
      callback(new Error("Cannot transfer ownership to yourself"));
      return;
    }

    // 检查目标玩家是否存在
    const targetPlayer = this.getPlayerById(newOwnerId);
    if (!targetPlayer) {
      callback(new Error("Target player not found in room"));
      return;
    }

    // 通过更新房间自定义属性来实现房主转移
    const room = this.getRoom();
    if (!room) {
      callback(new Error("Room not available"));
      return;
    }

    try {
      const customProperties = room.customRoomProperties ? JSON.parse(room.customRoomProperties) : {};
      customProperties.newOwnerId = newOwnerId;
      customProperties.transferTime = Date.now();
      
      this.updateRoom(undefined, JSON.stringify(customProperties));
      
      // 发送系统消息
      this.sendSystemMessage(`房主已将权限转移给 ${newOwnerId}`);
      
      callback(null, { success: true, newOwnerId });
    } catch (err) {
      callback(err as Error);
    }
  }

  /**
   * 开始游戏（房主调用）
   * @param callback 回调函数
   */
  static startGame(callback: VoidCallback): void {
    if (!this.isRoomOwner()) {
      callback(new Error("Only room owner can start the game"));
      return;
    }

    try {
      // 更新房间状态
      const customProperties = this.getRoom()?.customRoomProperties ? 
        JSON.parse(this.getRoom().customRoomProperties) : {};
      customProperties.status = RoomStatus.GAMING;
      customProperties.gameStartTime = Date.now();
      
      this.updateRoom(undefined, JSON.stringify(customProperties));
      
      // 广播游戏开始消息
      this.broadcastFromOwner(MessageType.GAME_START, JSON.stringify({
        startTime: Date.now(),
        roomId: this.getRoom()?.roomId
      }));
      
      // 如果启用了帧同步，则开始帧同步
      if (customProperties.enableFrameSync) {
        this.startFrameSync(callback);
      } else {
        callback(null);
      }
    } catch (err) {
      callback(err as Error);
    }
  }

  /**
   * 结束游戏（房主调用）
   * @param result 游戏结果
   * @param callback 回调函数
   */
  static endGame(result: any, callback: VoidCallback): void {
    if (!this.isRoomOwner()) {
      callback(new Error("Only room owner can end the game"));
      return;
    }

    try {
      // 更新房间状态
      const customProperties = this.getRoom()?.customRoomProperties ? 
        JSON.parse(this.getRoom().customRoomProperties) : {};
      customProperties.status = RoomStatus.ENDED;
      customProperties.gameEndTime = Date.now();
      customProperties.gameResult = result;
      
      this.updateRoom(undefined, JSON.stringify(customProperties));
      
      // 广播游戏结束消息
      this.broadcastFromOwner(MessageType.GAME_END, JSON.stringify({
        endTime: Date.now(),
        result,
        roomId: this.getRoom()?.roomId
      }));
      
      // 如果正在帧同步，则停止
      this.stopFrameSync((err) => {
        if (err) {
          console.warn("Failed to stop frame sync:", err);
        }
        callback(null);
      });
    } catch (err) {
      callback(err as Error);
    }
  }

  /**
   * 踢出玩家（房主调用）
   * @param playerId 要踢出的玩家ID
   * @param reason 踢出原因
   * @param callback 回调函数
   */
  static kickPlayer(playerId: string, reason: string = "", callback: BaseCallback): void {
    if (!this.isRoomOwner()) {
      callback(new Error("Only room owner can kick players"));
      return;
    }

    if (playerId === this.getCurrentPlayerId()) {
      callback(new Error("Cannot kick yourself"));
      return;
    }

    if (playerId === this.getRoomOwnerId()) {
      callback(new Error("Cannot kick room owner"));
      return;
    }

    // 华为SDK没有直接踢人的API，我们可以通过发送踢人消息让玩家自己离开
    this.sendToClient(MessageType.CUSTOM + 1, JSON.stringify({
      action: "kick",
      playerId: playerId,
      reason: reason,
      timestamp: Date.now()
    }), [playerId]);
    
    // 发送系统消息
    this.sendSystemMessage(`玩家 ${playerId} 已被房主踢出${reason ? `，原因：${reason}` : ''}`);
    
    callback(null, { success: true, playerId, reason });
  }

  /**
   * 以下保持原有方法不变，仅添加必要的注释...
   */

  static matchRoom(matchCode: string | MatchConfig, callback: RoomCallback, options: PlayerOptions = {}): void {
    if (!this.checkInitialized()) {
      callback(new Error("Client not initialized"));
      return;
    }

    let matchRoomConfig: any;
    if (typeof matchCode === 'string') {
      matchRoomConfig = {
        matchParams: {},
        maxPlayers: 4,
        roomType: matchCode,
      };
    } else {
      matchRoomConfig = {
        matchParams: matchCode.matchParams || {},
        maxPlayers: matchCode.maxPlayers || 4,
        roomType: matchCode.roomType,
      };
    }

    const playerConfig: any = {
      customPlayerStatus: options.customPlayerStatus ?? 0,
      customPlayerProperties: options.customPlayerProperties || JSON.stringify({
        playerName: this.config?.openId || "Player",
        joinTime: Date.now()
      }),
    };

    this.client.matchRoom(matchRoomConfig, playerConfig)
      .then((room: any) => {
        this.updateRoomOwnerCache(room);
        this.notifyRoomChange(room);
        callback(null, room);
      })
      .catch((err: Error) => callback(err));
  }

  static matchPlayer(matchCode: string, callback: MatchCallback, options: PlayerOptions = {}): void {
    if (!this.checkInitialized()) {
      callback(new Error("Client not initialized"));
      return;
    }

    const matchPlayerConfig: any = {
      playerInfo: {
        playerId: this.getCurrentPlayerId(),
        matchParams: { level: parseInt(matchCode) || 1 }
      },
      matchCode: matchCode
    };

    const playerConfig: any = {
      customPlayerStatus: options.customPlayerStatus ?? 0,
      customPlayerProperties: options.customPlayerProperties || JSON.stringify({
        playerName: options.playerName || this.config?.openId || "Player",
        joinTime: Date.now()
      })
    };

    this.client.matchPlayer(matchPlayerConfig, playerConfig)
      .then((resp: any) => callback(null, resp))
      .catch((err: Error) => callback(err));
  }

  static getAvailableRooms(callback: (err: Error | null, info?: any) => void, config?: any): void {
    if (!this.checkInitialized()) {
      callback(new Error("Client not initialized"));
      return;
    }

    const queryConfig: any = {
      limit: config?.limit || 20,
      offset: config?.offset || 0,
      roomType: config?.roomType,
      roomTypeList: config?.roomTypeList,
      sync: config?.sync
    };

    this.client.getAvailableRooms(queryConfig)
      .then((result: any) => callback(null, result))
      .catch((err: Error) => callback(err));
  }

  static cancelMatch(callback: BaseCallback): void {
    if (!this.checkInitialized()) {
      callback(new Error("Client not initialized"));
      return;
    }

    this.client.cancelMatch()
      .then((resp: any) => callback(null, resp))
      .catch((err: Error) => callback(err));
  }

  static startFrameSync(callback: VoidCallback): void {
    const room = this.getRoom();
    if (!room) {
      callback(new Error("Not in a room"));
      return;
    }

    room.startFrameSync()
      .then(() => callback(null))
      .catch((err: any) => {
           if (err.errorCode === 101114 || (err.message && err.message.includes("already start frame sync"))) {
               console.warn("[Gnet] 房间已在帧同步中，继续执行...");
               callback(null); // 忽略已开启帧同步的错误
           } else if (err.errorCode === 101118 || (err.message && err.message.includes("invalid room status"))) {
               // 尝试先停止再开始
               console.warn("[Gnet] 房间状态无效，尝试停止后重新开始帧同步...");
               room.stopFrameSync().then(() => {
                   room.startFrameSync().then(() => callback(null)).catch((e: any) => callback(e));
               }).catch((e: any) => {
                   console.warn("[Gnet] 停止帧同步失败，忽略错误继续...", e);
                   callback(null); // 如果停止也失败，直接继续，让游戏尝试运行
               });
           } else {
               callback(err);
           }
      });
  }
  static stopFrameSync(callback: VoidCallback): void {
    const room = this.getRoom();
    if (!room) {
      callback(new Error("Not in a room"));
      return;
    }

    room.stopFrameSync()
      .then(() => callback(null))
      .catch((err: Error) => callback(err));
  }

  static sendFrame(data: string | string[]): void {
    const room = this.getRoom();
    if (!room) {
      console.error("Not in a room");
      return;
    }
    room.sendFrame(data);
  }

  static requestFrame(beginFrameId: number, size: number): void {
    const room = this.getRoom();
    if (!room) {
      console.error("Not in a room");
      return;
    }
    room.requestFrame(beginFrameId, size);
  }

  static updateRoom(roomName?: string, customProperties?: string): void {
    const room = this.getRoom();
    if (!room) {
      console.error("Not in a room");
      return;
    }
    if (!this.isRoomOwner()) {
      console.warn("Only room owner can update room properties");
      return;
    }

    const updateInfo: any = {};
    if (roomName !== undefined) updateInfo.roomName = roomName;
    if (customProperties !== undefined) updateInfo.customRoomProperties = customProperties;

    room.updateRoomProperties(updateInfo);
  }

  static sendToServer(msg: string): void {
    const room = this.getRoom();
    if (!room) {
      console.error("Not in a room");
      return;
    }
    room.sendToServer(msg);
  }

  static sendToClient(type: number, msg: string, recvPlayerIdList?: string[]): void {
    const room = this.getRoom();
    if (!room) {
      console.error("Not in a room");
      return;
    }

    const sendInfo: any = {
      type: type,
      msg: msg
    };
    if (recvPlayerIdList) {
      sendInfo.recvPlayerIdList = recvPlayerIdList;
    }
    room.sendToClient(sendInfo);
  }

  static destroy(callback: VoidCallback): void {
    try {
      this._mpm.unon();
      this.messageHandlers.clear();
      this.roomChangeCallbacks.length = 0;
      this.isInitialized = false;
      this.client = null;
      this.config = null;
      this.currentPlayerId = '';
      this.isRoomOwnerCache = false;
      callback(null);
    } catch (err) {
      callback(err as Error);
    }
  }

  static onInit(cb: (code: number) => any): void {
    this.client?.onInitResult((code: number) => cb(code));
  }

  static onMatch(cb: (resp: any) => any): void {
    this.client?.onMatch((resp: any) => cb(resp));
  }

  static onKick(cb: () => any): void {
    this.client?.onKickOff(() => cb());
  }

  /**
   * 注册帧同步数据监听（支持多播）
   */
  static onFrame(cb: (msg: any) => any): void {
    this._mpm.on("frame", cb);
    if (this._mpm.count("frame") === 1) {
      this.client?.room?.onRecvFrame((msg: any) => {
        this._mpm.emit("frame", msg);
      });
    }
  }

  /**
   * 移除帧同步数据监听
   */
  static offFrame(cb: (msg: any) => any): void {
    this._mpm.off("frame", cb);
  }

  /**
   * 注册服务器消息监听（支持多播）
   */
  static onServer(cb: (info: any) => any): void {
    this._mpm.on("server", cb);
    if (this._mpm.count("server") === 1) {
      this.client?.room?.onRecvFromServer((info: any) => {
        this._mpm.emit("server", info);
      });
    }
  }

  /**
   * 移除服务器消息监听
   */
  static offServer(cb: (info: any) => any): void {
    this._mpm.off("server", cb);
  }


  static onClient(cb: (info: any) => any): void {
    this._mpm.on("client", cb);
    if (this._mpm.count("client") === 1) {
      this.client?.room?.onRecvFromClient((info: any) => {
        const handlers = this.messageHandlers.get(info.type) || [];
        handlers.forEach(handler => {
          try {
            handler(info.sendPlayerId, info.msg, info.type);
          } catch (err) {
            console.error("Message handler error:", err);
          }
        });
        this._mpm.emit("client", info);
      });
    }
  }

  static onConnect(cb: (player: any) => any): void {
    this._mpm.on("connect", cb);
    if (this._mpm.count("connect") === 1) {
      this.client?.room?.onConnect((player: any) => this._mpm.emit("connect", player));
    }
  }

  static onJoin(cb: (player: any) => any): void {
    this._mpm.on("join", cb);
    if (this._mpm.count("join") === 1) {
      this.client?.room?.onJoin((player: any) => this._mpm.emit("join", player));
    }
  }

  static onLeave(cb: (player: any) => any): void {
    this._mpm.on("leave", cb);
    if (this._mpm.count("leave") === 1) {
      this.client?.room?.onLeave((player: any) => this._mpm.emit("leave", player));
    }
  }

  static onDismiss(cb: (roomId: string) => any): void {
    this._mpm.on("dismiss", cb);
    if (this._mpm.count("dismiss") === 1) {
      this.client?.room?.onDismiss(() => {
        const roomId = this.getRoom()?.id || '';
        this._mpm.emit("dismiss", roomId);
      });
    }
  }

  static getAvailableRoomsPaged(
    pageNumber: number,
    pageSize: number = 10,
    callback: (err: Error | null, rooms: any[], hasNext: 0 | 1, serverTotalCount: number, extra?: any) => void,
    options: any = {}
  ): void {
    if (!this.isInitialized || !this.client) {
      callback(new Error("Gnet not initialized"), [], 0, 0);
      return;
    }

    const config: any = {
      limit: pageSize,
      offset: options.serverOffset != null ? options.serverOffset : 0,
    };

    this.client.getAvailableRooms(config)
      .then((result: any) => {
        const rooms = (result.rooms || []).map((r: any) => ({
          ...r,
          playerCount: r.players ? r.players.length : 0,
        }));
        callback(null, rooms, result.hasNext || 0, result.count || 0, { nextServerOffset: result.offset });
      })
      .catch((err: Error) => {
        callback(err, [], 0, 0);
      });
  }

  static updatePlayerProperties(options: PlayerOptions, callback: BaseCallback): void {
    const room = this.getRoom();
    if (!room) {
      callback(new Error("Not in a room"));
      return;
    }

    try {
      const player = room.player;
      if (!player) {
        callback(new Error("Player not available"));
        return;
      }

      if (options.customPlayerStatus !== undefined) {
        player.updateCustomStatus(options.customPlayerStatus);
      }
      if (options.customPlayerProperties !== undefined) {
        player.updateCustomProperties(options.customPlayerProperties);
      }
      callback(null, { success: true });
    } catch (err) {
      callback(err as Error);
    }
  }

  /**
   * 获取房间状态
   * @returns 房间状态
   */
  static getRoomStatus(): RoomStatus {
    try {
      const room = this.getRoom();
      if (room?.customRoomProperties) {
        const props = JSON.parse(room.customRoomProperties);
        return props.status || RoomStatus.WAITING;
      }
    } catch (err) {
      console.error("Failed to parse room properties:", err);
    }
    return RoomStatus.WAITING;
  }

  /**
   * 设置房间状态（房主调用）
   * @param status 房间状态
   * @param callback 回调函数
   */
  static setRoomStatus(status: RoomStatus, callback: BaseCallback): void {
    if (!this.isRoomOwner()) {
      callback(new Error("Only room owner can set room status"));
      return;
    }

    try {
      const room = this.getRoom();
      const customProperties = room?.customRoomProperties ? 
        JSON.parse(room.customRoomProperties) : {};
      customProperties.status = status;
      
      this.updateRoom(undefined, JSON.stringify(customProperties));
      callback(null, { success: true, status });
    } catch (err) {
      callback(err as Error);
    }
  }

  /**
   * 获取房间自定义属性
   * @returns 自定义属性对象
   */
  static getRoomCustomProperties(): any {
    try {
      const room = this.getRoom();
      if (room?.customRoomProperties) {
        return JSON.parse(room.customRoomProperties);
      }
    } catch (err) {
      console.error("Failed to parse room custom properties:", err);
    }
    return {};
  }

  /**
   * 获取玩家自定义属性
   * @param playerId 玩家ID（可选，不指定则获取当前玩家）
   * @returns 自定义属性对象
   */
  static getPlayerCustomProperties(playerId?: string): any {
    try {
      const targetPlayerId = playerId || this.getCurrentPlayerId();
      const player = this.getPlayerById(targetPlayerId);
      if (player?.customPlayerProperties) {
        return JSON.parse(player.customPlayerProperties);
      }
    } catch (err) {
      console.error("Failed to parse player custom properties:", err);
    }
    return {};
  }
}