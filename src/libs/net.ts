/**net.ts
 * Net(url: string=null, pingInterval: number = 30000) - 初始化网络连接，url为WebSocket服务器地址，pingInterval为心跳间隔时间(毫秒)，默认30000。
 * connect(callback: (isSuc: boolean, errorMES: string) => void, url = undefined) - 建立WebSocket连接，isSuc返回连接是否成功，errorMES返回错误信息(连接失败时)。
 * disconnect(code: number = 1000, reason: string = '') - 断开WebSocket连接，code为断开状态码(默认1000正常关闭)，reason为断开原因描述。
 * send(type: any, data: any): boolean - 发送消息到服务器，type为消息类型(使用MSG_TYPE常量)，data为消息数据，返回发送是否成功。
 * on(event: string, callback: Function) - 注册事件监听器，event为事件名称('connect', 'message', 'error'等)，callback为事件回调函数。
 * off(event: string, callback: Function) - 移除事件监听器，event为事件名称，callback为要移除的回调函数。
 * download(url: string, options: any = {}) - 下载文件，url为文件下载地址，options为下载选项{key: 文件标识(默认使用url), force: 是否强制重新下载(忽略缓存), onProgress: 进度回调函数(percent: number), onComplete: 完成回调函数(blob: Blob, fromCache: boolean), onError: 错误回调函数(error: string)}。
 * pauseDownload(key: string) - 暂停下载任务，key为下载任务标识。
 * resumeDownload(key: string) - 恢复下载任务，key为下载任务标识。
 * cacheGet(key: string, callback: (blob: any) => void) - 从缓存获取文件，key为文件标识，callback回调函数参数为文件数据(Blob)。
 * cacheClear(callback: (success: boolean) => void) - 清空所有缓存，callback回调函数参数为操作是否成功。
 * cacheInfo(callback: (info: { used: number, quota: number, percentage: number }) => void) - 获取缓存信息，callback回调函数参数包含used: 已使用字节数, quota: 总配额字节数, percentage: 使用百分比。
 * destroy() - 销毁实例，清理所有连接和定时器。
 * 消息类型常量MSG_TYPE: CONNECTED:0(连接成功), JOIN_ROOM:1(加入房间), LEAVE_ROOM:2(离开房间), MESSAGE:3(普通消息), ZONE_UPDATE:4(区域更新), ZONE_REMOVE:5(区域移除), ZONE_QUERY:6(区域查询), ZONE_RESULT:7(区域查询结果), PING:8(心跳请求), PONG:9(心跳响应), ERROR:10(错误消息)。
 */

import { IDBStorage } from "./IDBStorage";
import { TimeManager } from "./time";

export class Net {
  private storage: IDBStorage;
  private url: string;
  private pingInterval: number = 30000;
  private ws: any = null;
  private connected: boolean = false;
  private clientId: string | null = null;
  private roomId: string | null = null;
  private events: { [key: string]: Function[] } = {};
  private reconnectAttempts: number = 0;
  private reconnectDelay: number = 1000;
  private maxReconnectDelay: number = 60000;
  private maxReconnectAttempts: number = 5;
  private autoReconnect: boolean = true;

  private downloadQueue: any[] = [];
  private downloadTaskMap: Map<string, any> = new Map();
  private concurrentDownloads: Set<string> = new Set();
  private pausedTasks: Map<string, any> = new Map();
  private maxConcurrent: number = 3;
  private downloadTimeout: number = 30000;
  private maxRetries: number = 2;

  private pingTimer: string = "";
  private reconnectTimer: string = "";
  private timeManager: TimeManager;

  constructor(url: string = null, pingInterval: number = 30000) {
    this.storage = new IDBStorage();
    this.url = url;
    this.pingInterval = pingInterval;
    this.timeManager = new TimeManager();
  }

  /* ======================== WebSocket 核心功能 ======================== */

  connect(callback: (isSuc: boolean, errorMES: string) => void, url:string = undefined): void {
    if(url){
        this.url = url;
    }
    this._cleanupConnection();

    try {
      this.ws = new Laya.Socket();
      this.ws.connect(this.url);

      this.ws.on(Laya.Event.OPEN, this, () => {
        this.connected = true;
        this._resetReconnect();
        this.autoReconnect = true;
        this._startHeartbeat();
        this._emit('connect');
        callback(true, '');
      });

      this.ws.on(Laya.Event.MESSAGE, this, (data: any) => this._handleMessage(data));
      this.ws.on(Laya.Event.CLOSE, this, (e: any) => this._handleClose(e));
      this.ws.on(Laya.Event.ERROR, this, (e: any) => {
        this._handleError(e);
        callback(false, '连接失败');
      });
    } catch (e) {
      this._handleError(e);
      callback(false, (e as Error).message);
    }
  }

  disconnect(code: number = 1000, reason: string = ''): void {
    this._stopReconnect();
    if (this.ws) {
      this.ws.close(code, reason);
    }
    this.connected = false;
  }

  send(type: any, data: any): boolean {
    if (!this.isConnected()) {
      this._emit('error', new Error('连接未就绪'));
      return false;
    }

    try {
      const msg = JSON.stringify({ type, data });
      this.ws.send(msg);
      return true;
    } catch (e) {
      this._emit('error', new Error(`发送失败: ${(e as Error).message}`));
      return false;
    }
  }

  /* ======================== 简化消息接口 ======================== */
  sendP2P(targetId: string, data: any): boolean {
    return this.send(MSG_TYPE.MESSAGE, { target: targetId, data });
  }

  join(roomId: string): boolean {
    const success = this.send(MSG_TYPE.JOIN_ROOM, { roomId });
    if (success) {
      this.roomId = roomId;
    }
    return success;
  }

  leave(): boolean {
    const success = this.send(MSG_TYPE.LEAVE_ROOM, {});
    if (success) {
      this.roomId = null;
    }
    return success;
  }

  zoneUpdate(rect: number[], layout: any): boolean {
    return this.send(MSG_TYPE.ZONE_UPDATE, { rect, layout });
  }

  zoneRemove(rect: number[]): boolean {
    return this.send(MSG_TYPE.ZONE_REMOVE, { rect });
  }

  zoneQuery(rect: number[]): boolean {
    return this.send(MSG_TYPE.ZONE_QUERY, { rect });
  }

  /* ======================== 状态获取 ======================== */
  isConnected(): boolean {
    return this.connected && this.ws && Laya.Socket.prototype.connected;
  }

  getId(): string | null {
    return this.clientId;
  }

  getRoom(): string | null {
    return this.roomId;
  }

  /* ======================== 事件管理 ======================== */
  on(event: string, callback: Function): void {
    if (typeof callback === 'function') {
      (this.events[event] || (this.events[event] = [])).push(callback);
    }
  }

  off(event: string, callback: Function): void {
    const listeners = this.events[event];
    if (listeners) {
      this.events[event] = listeners.filter(cb => cb !== callback);
    }
  }

  /* ======================== 下载管理 ======================== */
  download(url: string, options: any = {}): void {
    const {
      key = url,
      force = false,
      onProgress,
      onComplete,
      onError
    } = options;

    if (this.downloadQueue.some(t => t.key === key) ||
      this.concurrentDownloads.has(key) ||
      this.pausedTasks.has(key)) {
      this._emit('downloadError', key, '任务已存在');
      onError?.('任务已存在');
      return;
    }

    const task = {
      url,
      key,
      retries: 0,
      onProgress,
      onComplete,
      onError,
      lastProgress: 0,
      progressTime: 0,
      xhr: new XMLHttpRequest()
    };

    if (!force) {
      this.cacheGet(key, (cached: any) => {
        if (cached) {
          this._emit('downloadComplete', key, cached, true);
          onComplete?.(cached, true);
        } else {
          this._addDownloadTask(task);
        }
      });
    } else {
      this._addDownloadTask(task);
    }
  }

  pauseDownload(key: string): void {
    if (this.concurrentDownloads.has(key)) {
      const task = this.downloadTaskMap.get(key);
      if (task?.xhr) {
        task.xhr.abort();
        this.concurrentDownloads.delete(key);
        this.pausedTasks.set(key, task);
        this.downloadTaskMap.delete(key);
        this._emit('downloadError', key, '已暂停');
      }
    }
  }

  resumeDownload(key: string): void {
    const task = this.pausedTasks.get(key);
    if (task) {
      this.pausedTasks.delete(key);
      this.downloadQueue.push(task);
      this.downloadTaskMap.set(key, task);
      this._processDownloadQueue();
    }
  }

  pauseAllDownloads(): void {
    this.concurrentDownloads.forEach(key => this.pauseDownload(key));
  }

  resumeAllDownloads(): void {
    this.pausedTasks.forEach((_, key) => this.resumeDownload(key));
  }

  clearDownloadQueue(): void {
    this.pauseAllDownloads();
    this.downloadQueue = [];
    this.downloadTaskMap.clear();
    this.pausedTasks.clear();
  }

  cacheGet(key: string, callback: (blob: any) => void): void {
    this.storage.getFile(key, callback);
  }

  cacheClear(callback: (success: boolean) => void): void {
    this.storage.clear(callback);
  }

  cacheRemove(key: string, callback: (success: boolean) => void): void {
    this.storage.deleteFile(key, callback);
  }

  cacheInfo(callback: (info: { used: number, quota: number, percentage: number }) => void): void {
    this.storage.getUsage(callback);
  }

  /* ======================== 内部方法 ======================== */
  private _addDownloadTask(task: any): void {
    this.downloadQueue.push(task);
    this.downloadTaskMap.set(task.key, task);
    this._processDownloadQueue();
  }

  private _processDownloadQueue(): void {
    while (this.concurrentDownloads.size < this.maxConcurrent && this.downloadQueue.length > 0) {
      const task = this.downloadQueue.shift();
      const key = task.key;

      this.concurrentDownloads.add(key);
      this._executeDownload(task, (error: string | null, blob: any) => {
        this.concurrentDownloads.delete(key);

        if (error) {
          if (task.retries < this.maxRetries) {
            task.retries++;
            this.downloadQueue.push(task);
          } else {
            this._emit('downloadError', key, error);
            task.onError?.(error);
            this.downloadTaskMap.delete(key);
          }
        } else {
          this.storage.setFile(key, blob, () => {
            this._emit('downloadComplete', key, blob, false);
            task.onComplete?.(blob, false);
            this.downloadTaskMap.delete(key);
          });
        }
        this._processDownloadQueue();
      });
    }
  }

    private _executeDownload(task: any, done: (error: string | null, blob: any) => void): void {
        let timedOut = false;
        let hasCompleted = false;

        const timer = setTimeout(() => {
            if (hasCompleted) return;
            timedOut = true;
            
            if (task.xhr) {
                task.xhr.abort();
            }
            
            done('下载超时', null);
        }, this.downloadTimeout);

        // 创建原生XHR对象
        task.xhr = new XMLHttpRequest();
        task.xhr.responseType = 'blob';
        
        // 进度事件处理
        task.xhr.addEventListener('progress', (e: ProgressEvent) => {
            if (timedOut) return;
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                this._updateProgress(task, percent);
            }
        });

        // 加载完成事件处理
        task.xhr.addEventListener('load', () => {
            hasCompleted = true;
            clearTimeout(timer);
            if (timedOut) return;

            if (task.xhr && task.xhr.status >= 200 && task.xhr.status < 300) {
                try {
                    const blob = task.xhr.response;
                    done(null, blob);
                } catch (e) {
                    done(`Blob创建失败: ${(e as Error).message}`, null);
                }
            } else {
                done(`HTTP错误: ${task.xhr?.status}`, null);
            }
        });

        // 错误事件处理
        task.xhr.addEventListener('error', () => {
            hasCompleted = true;
            clearTimeout(timer);
            if (!timedOut) done('网络错误', null);
        });

        // 中止事件处理
        task.xhr.addEventListener('abort', () => {
            hasCompleted = true;
            clearTimeout(timer);
            if (!timedOut) done('下载中止', null);
        });

        // 发送请求
        task.xhr.open('GET', task.url, true);
        task.xhr.send();
    }

  private _updateProgress(task: any, percent: number): void {
    const now = this.timeManager.getCurrentTime();
    if (now - task.progressTime > 100 || Math.abs(percent - task.lastProgress) > 5) {
      task.lastProgress = percent;
      task.progressTime = now;
      this._emit('downloadProgress', task.key, percent);
      task.onProgress?.(percent);
    }
  }

  /* ======================== WebSocket 消息处理 ======================== */
  private _handleMessage(data: any): void {
    try {
      const { type, data: payload } = JSON.parse(data);

      switch (type) {
        case MSG_TYPE.CONNECTED:
          this.clientId = payload.clientId;
          break;
        case MSG_TYPE.ZONE_RESULT:
          this._emit('zoneResult', payload);
          break;
        case MSG_TYPE.PING:
          this.send(MSG_TYPE.PONG, this.timeManager.getCurrentTime());
          break;
        case MSG_TYPE.ERROR:
          this._emit('error', new Error(payload));
          break;
        default:
          this._emit('message', type, payload);
      }
    } catch (e) {
      this._emit('error', new Error(`消息解析失败: ${(e as Error).message}`));
    }
  }

  private _handleClose(event: any): void {
    this.connected = false;
    this._stopHeartbeat();
    this._emit('close', event.code, event.reason);

    if (event.code == 1000 || event.code == 1001) return;
    this._scheduleReconnect();
  }

  private _handleError(error: any): void {
    this._emit('error', new Error(`连接错误: ${(error as Error).message}`));
    if (!this.connected && this.autoReconnect) this._scheduleReconnect();
  }

  /* ======================== 连接管理工具 ======================== */
  private _startHeartbeat(): void {
    this._stopHeartbeat();
    this.pingTimer = this.timeManager.setInterval(this.pingInterval, () => {
      if (this.isConnected()) {
        this.send(MSG_TYPE.PING, this.timeManager.getCurrentTime());
      }
    });
  }

  private _stopHeartbeat(): void {
    if (this.pingTimer) {
      this.timeManager.clear(this.pingTimer);
      this.pingTimer = "";
    }
  }

  private _cleanupConnection(): void {
    if (this.ws) {
      this.ws.off(Laya.Event.OPEN);
      this.ws.off(Laya.Event.MESSAGE);
      this.ws.off(Laya.Event.CLOSE);
      this.ws.off(Laya.Event.ERROR);
      this.ws.close();
      this.ws = null;
    }
    this._stopHeartbeat();
  }

  private _resetReconnect(): void {
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    if (this.reconnectTimer) {
      this.timeManager.clear(this.reconnectTimer);
      this.reconnectTimer = "";
    }
  }

  private _stopReconnect(): void {
    if (this.reconnectTimer) {
      this.timeManager.clear(this.reconnectTimer);
      this.reconnectTimer = "";
    }
    this.autoReconnect = false;
  }

  private _scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this._emit('error', new Error(`达到最大重连次数`));
      this._stopReconnect();
      return;
    }

    if (this.reconnectTimer) {
      this.timeManager.clear(this.reconnectTimer);
    }
    this.reconnectAttempts++;

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    this.reconnectTimer = this.timeManager.setTimeout(delay, () => {
      this._emit('reconnect', this.reconnectAttempts, delay);
      this.connect((success: boolean) => {
        if (!success) this._scheduleReconnect();
      });
    });
  }

  private _emit(event: string, ...args: any[]): void {
    const listeners = this.events[event];
    if (!listeners) return;

    listeners.forEach(cb => {
      try {
        cb(...args);
      } catch (e) {
        console.error(`事件处理错误 [${event}]:`, e);
      }
    });
  }

  // 销毁方法
  destroy(): void {
    this._stopHeartbeat();
    this._stopReconnect();
    this.timeManager.destroy();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// 消息类型常量
const MSG_TYPE = {
  CONNECTED: 0, JOIN_ROOM: 1, LEAVE_ROOM: 2, MESSAGE: 3,
  ZONE_UPDATE: 4, ZONE_REMOVE: 5, ZONE_QUERY: 6, ZONE_RESULT: 7,
  PING: 8, PONG: 9, ERROR: 10
};
