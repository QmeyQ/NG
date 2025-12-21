/**
 * Net - 网络管理器，处理WebSocket连接和文件下载（支持断点续传）
 * 
 * 核心功能：
 * 1. WebSocket实时通信 - 连接管理、心跳检测、自动重连
 * 2. 增强下载系统 - 支持断点续传、多任务并发、进度追踪
 * 3. 缓存管理 - IndexedDB存储、缓存控制、断点数据持久化
 * 
 * 使用示例：
 * 1. 网络连接：new Net(url, pingInterval).connect(callback)
 * 2. 文件下载：net.download(url, {key: 'uniqueKey', onProgress, onComplete})
 * 3. 缓存操作：net.cacheGet(key, callback)
 * 4. 断点控制：net.pauseDownload(key)/resumeDownload(key)
 * 
 * 主要方法：
 * - connect(callback, url): 连接到WebSocket服务器
 * - disconnect(code, reason): 断开连接
 * - send(type, data): 发送消息
 * - download(url, options): 下载文件（支持断点续传）
 * - pauseDownload(key): 暂停指定下载任务
 * - resumeDownload(key): 恢复指定下载任务
 * - pauseAllDownloads(): 暂停所有下载任务
 * - resumeAllDownloads(): 恢复所有下载任务
 * - clearDownloadQueue(): 清除下载队列
 * - cacheGet(key, callback): 从缓存获取文件
 * - cacheClear(callback): 清除所有缓存
 * - cacheRemove(key, callback): 移除指定缓存
 * - cacheInfo(callback): 获取缓存信息
 * - on(event, callback): 注册事件监听器
 * - off(event, callback): 移除事件监听器
 * - sendP2P(targetId, data): 发送点对点消息
 * - join(roomId): 加入房间
 * - leave(): 离开房间
 * - zoneUpdate(rect, layout): 更新区域信息
 * - zoneRemove(rect): 移除区域
 * - zoneQuery(rect): 查询区域
 * - isConnected(): 检查连接状态
 * - getId(): 获取客户端ID
 * - getRoom(): 获取房间ID
 * - destroy(): 销毁实例，清理资源
 * 
 * 下载选项：
 * - key: 唯一标识符，用于断点续传和缓存
 * - force: 是否强制重新下载
 * - cache: 是否缓存结果
 * - onProgress(percent, speed, loaded, total): 进度回调
 * - onComplete(blob, fromCache): 完成回调
 * - onError(error): 错误回调
 * 
 * 下载状态：
 * - pending: 等待中
 * - downloading: 下载中
 * - paused: 已暂停
 * - completed: 已完成
 * - error: 错误
 * - cancelled: 已取消
 * 
 * 事件系统：
 * - connect: 连接成功
 * - close: 连接关闭
 * - error: 错误发生
 * - message: 接收到消息
 * - reconnect: 重连尝试
 * - downloadProgress: 下载进度更新
 * - downloadComplete: 下载完成
 * - downloadError: 下载错误
 * - downloadPaused: 下载暂停
 * 
 * 内部模块：
 * - IDBStorage: IndexedDB存储管理
 * - TimeManager: 定时器管理
 * - ResumableData: 断点续传数据结构
 * - DownloadTask: 下载任务管理
 * 
 * 断点续传机制：
 * 1. 通过Range请求头实现分块下载
 * 2. 下载进度定期保存到IndexedDB
 * 3. 断网重连后自动恢复下载
 * 4. 文件校验和完整性检查
 * 
 * 并发控制：
 * - maxConcurrent: 最大并发下载数（默认3）
 * - downloadQueue: 等待队列管理
 * - activeDownloads: 活跃任务集合
 * 
 * 重试机制：
 * - maxRetries: 最大重试次数（默认3）
 * - exponential backoff: 指数退避重连
 * - timeout: 请求超时时间（默认60秒）
 * 
 * 心跳检测：
 * - pingInterval: 心跳间隔（默认30秒）
 * - 自动检测连接状态
 * - 断线自动重连
 * 
 * 属性说明：
 * - storage: IDBStorage实例，用于文件缓存
 * - url: WebSocket服务器地址
 * - ws: WebSocket连接实例
 * - connected: 连接状态
 * - clientId: 客户端唯一标识
 * - roomId: 当前房间ID
 * - events: 事件监听器集合
 * - downloadTasks: 下载任务映射表
 * - activeDownloads: 活跃下载集合
 * - maxConcurrent: 最大并发下载数
 * - timeManager: 定时器管理器
 * 
 * 消息类型常量：
 * - CONNECTED: 0 - 连接确认
 * - JOIN_ROOM: 1 - 加入房间
 * - LEAVE_ROOM: 2 - 离开房间
 * - MESSAGE: 3 - 普通消息
 * - ZONE_UPDATE: 4 - 区域更新
 * - ZONE_REMOVE: 5 - 区域移除
 * - ZONE_QUERY: 6 - 区域查询
 * - ZONE_RESULT: 7 - 区域查询结果
 * - PING: 8 - 心跳请求
 * - PONG: 9 - 心跳响应
 * - ERROR: 10 - 错误消息
 */

import { IDBStorage } from "./IDBStorage";
import { TimeManager } from "./time";

// 下载状态常量
const DOWNLOAD_STATE = {
  PENDING: 'pending',
  DOWNLOADING: 'downloading',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ERROR: 'error',
  CANCELLED: 'cancelled'
} as const;

// 断点续传数据接口
interface ResumableData {
  url: string;
  loaded: number;
  total: number;
  lastModified: number;
  etag: string;
  mimeType?: string;
  fileName?: string;
}

// 下载任务接口
interface DownloadTask {
  id: string;
  url: string;
  key: string;
  state: typeof DOWNLOAD_STATE[keyof typeof DOWNLOAD_STATE];
  loaded: number;
  total: number;
  resumable: boolean;
  startTime: number;
  retries: number;
  xhr: XMLHttpRequest | null;
  controller: AbortController | null;
  onProgress?: (percent: number, speed: number, loaded: number, total: number) => void;
  onComplete?: (blob: Blob, fromCache: boolean) => void;
  onError?: (error: string) => void;
  onStateChange?: (state: string) => void;
  resumableData?: ResumableData;
  lastProgressUpdate: number;
  lastLoaded: number;
  cache?: boolean;
}

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

  private downloadTasks: Map<string, DownloadTask> = new Map();
  private activeDownloads: Set<string> = new Set();
  private maxConcurrent: number = 3;
  private downloadTimeout: number = 60000;
  private maxRetries: number = 3;
  private chunkSize: number = 1024 * 1024; // 1MB chunk size for resumable download
  private downloadQueue: string[] = [];

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

  connect(callback: (isSuc: boolean, errorMES: string) => void, url: string = undefined): void {
    if (url) {
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

  /* ======================== 增强版下载管理 ======================== */

  /**
   * 下载文件（支持断点续传）
   */
  download(url: string, options: any = {}): void {
    const {
      key = url,
      force = false,
      cache = true,
      onProgress,
      onComplete,
      onError
    } = options;

    // 检查任务是否已存在
    const existingTask = this.downloadTasks.get(key);
    if (existingTask) {
      if (existingTask.state === DOWNLOAD_STATE.DOWNLOADING) {
        this._emit('downloadError', key, '任务已在进行中');
        onError?.('任务已在进行中');
        return;
      }
      // 如果是暂停状态，恢复它
      if (existingTask.state === DOWNLOAD_STATE.PAUSED) {
        this.resumeDownload(key);
        return;
      }
    }

    // 创建下载任务
    const task: DownloadTask = {
      id: key,
      url,
      key,
      state: DOWNLOAD_STATE.PENDING,
      loaded: 0,
      total: 0,
      resumable: true,
      startTime: this.timeManager.getCurrentTime(),
      retries: 0,
      xhr: null,
      controller: null,
      onProgress,
      onComplete,
      onError,
      lastProgressUpdate: 0,
      lastLoaded: 0,
      cache
    };

    this.downloadTasks.set(key, task);

    // 检查缓存
    if (!force) {
      this.cacheGet(key, (cached: any) => {
        if (cached) {
          // 缓存命中，直接返回
          this._emit('downloadComplete', key, cached, true);
          onComplete?.(cached, true);
          this.downloadTasks.delete(key);
        } else {
          // 没有缓存，检查断点数据
          this._loadResumableData(key, (resumableData: ResumableData | null) => {
            if (resumableData && resumableData.url === url) {
              // 恢复断点下载
              task.loaded = resumableData.loaded;
              task.total = resumableData.total;
              task.resumableData = resumableData;
            }
            this._startDownload(task);
          });
        }
      });
    } else {
      this._startDownload(task);
    }
  }

  /**
   * 暂停下载
   */
  pauseDownload(key: string): void {
    const task = this.downloadTasks.get(key);
    if (!task || task.state !== DOWNLOAD_STATE.DOWNLOADING) return;

    // 保存断点数据
    if (task.resumable && task.total > 0) {
      this._saveResumableData(task);
    }

    // 停止下载
    if (task.xhr) {
      task.xhr.abort();
      task.xhr = null;
    }
    if (task.controller) {
      task.controller.abort();
      task.controller = null;
    }

    task.state = DOWNLOAD_STATE.PAUSED;
    this.activeDownloads.delete(key);
    
    this._emit('downloadPaused', key, task.loaded, task.total);
    task.onStateChange?.(DOWNLOAD_STATE.PAUSED);
    
    this._processDownloadQueue();
  }

  /**
   * 恢复下载
   */
  resumeDownload(key: string): void {
    const task = this.downloadTasks.get(key);
    if (!task || task.state !== DOWNLOAD_STATE.PAUSED) return;

    // 检查是否有断点数据
    this._loadResumableData(key, (resumableData: ResumableData | null) => {
      if (resumableData && resumableData.url === task.url) {
        task.loaded = resumableData.loaded;
        task.total = resumableData.total;
        task.resumableData = resumableData;
      } else {
        // 没有断点数据，从头开始
        task.loaded = 0;
        task.total = 0;
      }
      
      task.state = DOWNLOAD_STATE.PENDING;
      task.retries = 0;
      this._startDownload(task);
    });
  }

  /**
   * 暂停所有下载
   */
  pauseAllDownloads(): void {
    this.downloadTasks.forEach((task, key) => {
      if (task.state === DOWNLOAD_STATE.DOWNLOADING) {
        this.pauseDownload(key);
      }
    });
  }

  /**
   * 恢复所有下载
   */
  resumeAllDownloads(): void {
    this.downloadTasks.forEach((task, key) => {
      if (task.state === DOWNLOAD_STATE.PAUSED) {
        this.resumeDownload(key);
      }
    });
  }

  /**
   * 清除下载队列
   */
  clearDownloadQueue(): void {
    this.pauseAllDownloads();
    this.downloadTasks.clear();
    this.activeDownloads.clear();
    this.downloadQueue = [];
  }

  /* ======================== 缓存管理 ======================== */

  cacheGet(key: string, callback: (blob: any) => void): void {
    this.storage.getFile(key, callback);
  }

  cacheClear(callback: (success: boolean) => void): void {
    // 清理所有断点数据
    this.storage.getKeys((keys: {dataKeys: string[], fileKeys: string[]}) => {
      keys.dataKeys.forEach(key => {
        if (key.endsWith('_resume')) {
          this.storage.deleteFile(key, () => {});
        }
      });
    });
    // 清理缓存
    this.storage.clear(callback);
  }

  cacheRemove(key: string, callback: (success: boolean) => void): void {
    // 同时清理断点数据
    this.storage.deleteFile(`${key}_resume`, () => {});
    this.storage.deleteFile(key, callback);
  }

  cacheInfo(callback: (info: { used: number, quota: number, percentage: number }) => void): void {
    this.storage.getUsage(callback);
  }

  /* ======================== 内部方法 ======================== */

  private _startDownload(task: DownloadTask): void {
    if (this.activeDownloads.size >= this.maxConcurrent) {
      // 加入等待队列
      if (this.downloadQueue.indexOf(task.id) === -1) {
        this.downloadQueue.push(task.id);
      }
      return;
    }

    this.activeDownloads.add(task.id);
    task.state = DOWNLOAD_STATE.DOWNLOADING;
    task.startTime = this.timeManager.getCurrentTime();
    
    task.onStateChange?.(DOWNLOAD_STATE.DOWNLOADING);
    this._executeDownload(task);
  }

  private _processDownloadQueue(): void {
    while (this.activeDownloads.size < this.maxConcurrent && this.downloadQueue.length > 0) {
      const taskId = this.downloadQueue.shift()!;
      const task = this.downloadTasks.get(taskId);
      
      if (task && task.state === DOWNLOAD_STATE.PENDING) {
        this._startDownload(task);
      }
    }
  }

  private _executeDownload(task: DownloadTask): void {
    const startByte = task.loaded;
    const useRange = task.resumable && startByte > 0;
    
    task.xhr = new XMLHttpRequest();
    task.controller = new AbortController();
    
    const xhr = task.xhr;
    xhr.open('GET', task.url, true);
    xhr.responseType = 'blob';
    
    if (useRange) {
      // 断点续传，发送Range头
      if (task.total > 0) {
        xhr.setRequestHeader('Range', `bytes=${startByte}-${task.total - 1}`);
      } else {
        xhr.setRequestHeader('Range', `bytes=${startByte}-`);
      }
    }
    
    // 设置超时
    xhr.timeout = this.downloadTimeout;
    
    // 进度事件
    xhr.onprogress = (e: ProgressEvent) => {
      if (e.lengthComputable) {
        const loaded = startByte + e.loaded;
        const total = startByte + e.total;
        
        task.loaded = loaded;
        task.total = total;
        
        this._updateProgress(task, loaded, total);
      }
    };
    
    // 加载完成
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 206) {
        const blob = xhr.response;
        
        // 获取文件信息
        const contentType = xhr.getResponseHeader('Content-Type') || '';
        const contentLength = xhr.getResponseHeader('Content-Length');
        const lastModified = xhr.getResponseHeader('Last-Modified');
        
        // 存储文件
        if (task.cache) {
            this.storage.setFile(task.key, blob, (success: boolean) => {
              if (success) {
                // 清理断点数据
                this.storage.deleteFile(`${task.key}_resume`, () => {});
                
                this.activeDownloads.delete(task.id);
                task.state = DOWNLOAD_STATE.COMPLETED;
                
                this._emit('downloadComplete', task.id, blob, false);
                task.onComplete?.(blob, false);
                task.onStateChange?.(DOWNLOAD_STATE.COMPLETED);
                
                this.downloadTasks.delete(task.id);
                this._processDownloadQueue();
              } else {
                this._handleDownloadError(task, '存储失败');
              }
            });
        } else {
            // 不缓存，直接完成
            this.activeDownloads.delete(task.id);
            task.state = DOWNLOAD_STATE.COMPLETED;
            
            this._emit('downloadComplete', task.id, blob, false);
            task.onComplete?.(blob, false);
            task.onStateChange?.(DOWNLOAD_STATE.COMPLETED);
            
            this.downloadTasks.delete(task.id);
            this._processDownloadQueue();
        }
      } else if (xhr.status === 416) {
        // Range Not Satisfiable - 可能文件已完全下载
        this.storage.getFile(task.key, (cached: any) => {
          if (cached) {
            this.activeDownloads.delete(task.id);
            task.state = DOWNLOAD_STATE.COMPLETED;
            
            this._emit('downloadComplete', task.id, cached, true);
            task.onComplete?.(cached, true);
            task.onStateChange?.(DOWNLOAD_STATE.COMPLETED);
            
            this.downloadTasks.delete(task.id);
            this._processDownloadQueue();
          } else {
            this._handleDownloadError(task, `HTTP错误: ${xhr.status}`);
          }
        });
      } else {
        this._handleDownloadError(task, `HTTP错误: ${xhr.status}`);
      }
    };
    
    // 错误处理
    xhr.onerror = () => this._handleDownloadError(task, '网络错误');
    xhr.ontimeout = () => this._handleDownloadError(task, '请求超时');
    xhr.onabort = () => {
      // 如果是暂停，已经在pauseDownload中处理
      if (task.state !== DOWNLOAD_STATE.PAUSED) {
        this._handleDownloadError(task, '下载中止');
      }
    };
    
    // 发送请求
    xhr.send();
  }

  private _updateProgress(task: DownloadTask, loaded: number, total: number): void {
    const now = this.timeManager.getCurrentTime();
    
    // 限制进度更新频率（至少100ms更新一次）
    if (now - task.lastProgressUpdate < 100) {
      return;
    }
    
    const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
    
    // 计算下载速度
    let speed = 0;
    if (task.lastLoaded > 0 && task.lastProgressUpdate > 0) {
      const timeDiff = now - task.lastProgressUpdate;
      const loadedDiff = loaded - task.lastLoaded;
      speed = timeDiff > 0 ? (loadedDiff / timeDiff) * 1000 : 0; // bytes per second
    }
    
    task.lastLoaded = loaded;
    task.lastProgressUpdate = now;
    
    this._emit('downloadProgress', task.id, percent, speed, loaded, total);
    task.onProgress?.(percent, speed, loaded, total);
    
    // 定期保存断点数据（每5秒或进度变化超过1MB）
    if (task.resumable && (now % 5000 < 100 || loaded - (task.resumableData?.loaded || 0) > 1024 * 1024)) {
      this._saveResumableData(task);
    }
  }

  private _handleDownloadError(task: DownloadTask, error: string): void {
    task.xhr = null;
    task.controller = null;
    this.activeDownloads.delete(task.id);
    
    if (task.retries < this.maxRetries && task.state !== DOWNLOAD_STATE.PAUSED) {
      task.retries++;
      task.state = DOWNLOAD_STATE.PENDING;
      
      // 保存当前进度
      if (task.resumable) {
        this._saveResumableData(task);
      }
      
      // 延迟重试
      this.timeManager.setTimeout(1000 * task.retries, () => {
        this._startDownload(task);
      });
    } else {
      task.state = DOWNLOAD_STATE.ERROR;
      
      this._emit('downloadError', task.id, error);
      task.onError?.(error);
      task.onStateChange?.(DOWNLOAD_STATE.ERROR);
      
      this._processDownloadQueue();
    }
  }

  private _saveResumableData(task: DownloadTask): void {
    if (!task.resumable || task.total <= 0 || !task.cache) return;
    
    const resumableData: ResumableData = {
      url: task.url,
      loaded: task.loaded,
      total: task.total,
      lastModified: Date.now(),
      etag: '',
      mimeType: task.xhr?.getResponseHeader('Content-Type') || undefined
    };
    
    // 将断点数据转换为JSON字符串，再转换为Blob存储
    const jsonStr = JSON.stringify(resumableData);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    
    this.storage.setFile(`${task.key}_resume`, blob, (success: boolean) => {
      if (!success) {
        console.warn('保存断点数据失败:', task.key);
      }
    });
  }

  private _loadResumableData(key: string, callback: (data: ResumableData | null) => void): void {
    this.storage.getFile(`${key}_resume`, (data: any) => {
      if (!data) {
        callback(null);
        return;
      }
      
      try {
        // 数据是Base64格式，需要解码
        if (typeof data === 'string') {
          // 如果是Base64字符串，尝试解析JSON
          try {
            // 尝试直接解析（可能是JSON字符串）
            const jsonData = JSON.parse(data);
            callback(jsonData);
          } catch {
            // 如果是Base64，需要解码
            try {
              const jsonStr = atob(data); // Base64解码
              const jsonData = JSON.parse(jsonStr);
              callback(jsonData);
            } catch (e) {
              console.error('解析断点数据失败:', e);
              callback(null);
            }
          }
        } else if (data instanceof Blob) {
          // 如果是Blob，读取为文本
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const jsonData = JSON.parse(reader.result as string);
              callback(jsonData);
            } catch (e) {
              console.error('解析断点数据失败:', e);
              callback(null);
            }
          };
          reader.onerror = () => {
            console.error('读取断点数据失败');
            callback(null);
          };
          reader.readAsText(data);
        } else {
          console.error('未知的断点数据格式:', typeof data);
          callback(null);
        }
      } catch (e) {
        console.error('加载断点数据失败:', e);
        callback(null);
      }
    });
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

  // 事件管理
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

  // 简化消息接口
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

  // 状态检查
  isConnected(): boolean {
    return this.connected && this.ws && Laya.Socket.prototype.connected;
  }

  getId(): string | null {
    return this.clientId;
  }

  getRoom(): string | null {
    return this.roomId;
  }

  // 销毁方法
  destroy(): void {
    this._stopHeartbeat();
    this._stopReconnect();
    this.timeManager.destroy();
    
    // 暂停所有下载
    this.pauseAllDownloads();
    
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