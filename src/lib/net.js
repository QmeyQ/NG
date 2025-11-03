/**
net.js
依赖：IDBStorage.js
构造：new Net (url, pingInterval=30000)
connect (callback)：连接服务器，回调 (isSuc, errorMES)
disconnect (code=1000, reason='')：断开连接
isConnected ()：检查连接状态
send (type, data)：发送消息
sendP2P (targetId, data)：点对点消息
join (roomId)：加入房间
leave ()：离开房间
zoneUpdate (rect, layout)：更新区域（rect 为 [x,y, 宽，高]）
zoneRemove (rect)：移除区域
zoneQuery (rect)：查询区域
getId ()：获取客户端 ID
getRoom ()：获取房间 ID
on/off (event, callback)：事件监听
download (url, options)：下载文件（options 含 key、force 及进度 / 完成 / 错误回调）
cacheGet (key, callback)：获取缓存（回调 blob）
cacheClear (callback)：清空缓存（回调 success）
cacheRemove (key, callback)：删除缓存（回调 success）
cacheInfo (callback)：缓存信息（回调 {used, quota, percentage}）
pauseDownload (key)：暂停任务
resumeDownload (key)：恢复任务
pauseAllDownloads ()：暂停所有
resumeAllDownloads ()：恢复所有
clearDownloadQueue ()：清空队列
事件
WebSocket：connect、message、close、error、reconnect、zoneUpdate、zoneRemove、zoneResult
下载：downloadProgress、downloadComplete、downloadError
 */

class Net {
  constructor(url, pingInterval = 30000) {
    this.storage = new IDBStorage('NetCache', 1); // 使用IndexedDB替代文件存储
    this.url = url;
    this.pingInterval = pingInterval;
    this.ws = null;
    this.connected = false;
    this.clientId = null;
    this.roomId = null;
    this.events = {};
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 60000;
    this.maxReconnectAttempts = 5;
    this.autoReconnect = true;
    
    this.downloadQueue = [];
    this.downloadTaskMap = new Map();
    this.concurrentDownloads = new Set();
    this.pausedTasks = new Map();
    this.maxConcurrent = 3;
    this.downloadTimeout = 30000;
    this.maxRetries = 2;
  }

  /* ======================== WebSocket 核心功能 ======================== */
  
  connect(callback) {
    this._cleanupConnection();
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        this.connected = true;
        this._resetReconnect();
        this.autoReconnect = true;
        this._startHeartbeat();
        this._emit('connect');
        callback(true);
      };
      
      this.ws.onmessage = (e) => this._handleMessage(e.data);
      this.ws.onclose = (e) => this._handleClose(e);
      this.ws.onerror = (e) => {
        this._handleError(e);
        callback(false, '连接失败');
      };
    } catch (e) {
      this._handleError(e);
      callback(false, e.message);
    }
  }
  
  disconnect(code = 1000, reason = '') {
    this._stopReconnect();
    if (this.ws) this.ws.close(code, reason);
    this.connected = false;
  }
  
  send(type, data) {
    if (!this.isConnected()) {
      this._emit('error', new Error('连接未就绪'));
      return false;
    }
    
    try {
      this.ws.send(JSON.stringify({ type, data }));
      return true;
    } catch (e) {
      this._emit('error', new Error(`发送失败: ${e.message}`));
      return false;
    }
  }
  
  /* ======================== 简化消息接口 ======================== */
  sendP2P(targetId, data) { return this.send(MSG_TYPE.MESSAGE, { target: targetId, data }); }
  join(roomId) {
    const success = this.send(MSG_TYPE.JOIN_ROOM, { roomId });
    if (success) this.roomId = roomId;
    return success;
  }
  leave() {
    const success = this.send(MSG_TYPE.LEAVE_ROOM);
    if (success) this.roomId = null;
    return success;
  }
  zoneUpdate(rect, layout) { return this.send(MSG_TYPE.ZONE_UPDATE, { rect, layout }); }
  zoneRemove(rect) { return this.send(MSG_TYPE.ZONE_REMOVE, { rect }); }
  zoneQuery(rect) { return this.send(MSG_TYPE.ZONE_QUERY, { rect }); }
  
  /* ======================== 状态获取 ======================== */
  isConnected() { return this.connected && this.ws?.readyState === WebSocket.OPEN; }
  getId() { return this.clientId; }
  getRoom() { return this.roomId; }
  
  /* ======================== 事件管理 ======================== */
  on(event, callback) {
    if (typeof callback === 'function') {
      (this.events[event] || (this.events[event] = [])).push(callback);
    }
  }
  
  off(event, callback) {
    const listeners = this.events[event];
    if (listeners) {
      this.events[event] = listeners.filter(cb => cb !== callback);
    }
  }
  
  /* ======================== 下载管理 (使用IndexedDB存储) ======================== */
  download(url, options = {}) {
    const {
      key = url,
      force = false,
      onProgress,
      onComplete,
      onError
    } = options;
    
    // 检查重复任务
    if (this.downloadQueue.some(t => t.key === key) || 
        this.concurrentDownloads.has(key) || 
        this.pausedTasks.has(key)) {
      this._emit('downloadError', key, '任务已存在');
      onError?.('任务已存在');
      return;
    }
    
    // 创建任务
    const task = {
      url,
      key,
      retries: 0,
      onProgress,
      onComplete,
      onError,
      lastProgress: 0,
      progressTime: 0,
      xhr: null
    };
    
    // 先检查缓存
    if (!force) {
      this.cacheGet(key, (cached) => {
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
  
  pauseDownload(key) {
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
  
  resumeDownload(key) {
    const task = this.pausedTasks.get(key);
    if (task) {
      this.pausedTasks.delete(key);
      this.downloadQueue.push(task);
      this.downloadTaskMap.set(key, task);
      this._processDownloadQueue();
    }
  }
  
  pauseAllDownloads() {
    this.concurrentDownloads.forEach(key => this.pauseDownload(key));
  }
  
  resumeAllDownloads() {
    this.pausedTasks.forEach((_, key) => this.resumeDownload(key));
  }
  
  clearDownloadQueue() {
    this.pauseAllDownloads();
    this.downloadQueue = [];
    this.downloadTaskMap.clear();
    this.pausedTasks.clear();
  }
  
  cacheGet(key, callback) {
    this.storage.getFile(key, callback);
  }
  
  cacheClear(callback) {
    this.storage.clear(callback);
  }
  
  cacheRemove(key, callback) {
    this.storage.deleteFile(key, callback);
  }
  
  cacheInfo(callback) {
    this.storage.getUsage(callback);
  }
  
  /* ======================== 内部方法 ======================== */
  _addDownloadTask(task) {
    this.downloadQueue.push(task);
    this.downloadTaskMap.set(task.key, task);
    this._processDownloadQueue();
  }
  
  _processDownloadQueue() {
    while (this.concurrentDownloads.size < this.maxConcurrent && this.downloadQueue.length > 0) {
      const task = this.downloadQueue.shift();
      const key = task.key;
      
      this.concurrentDownloads.add(key);
      this._executeDownload(task, (error, blob) => {
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
          // 使用IndexedDB存储文件
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
  
  _executeDownload(task, done) {
    const xhr = new XMLHttpRequest();
    task.xhr = xhr;
    
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      xhr.abort();
      done('下载超时');
    }, this.downloadTimeout);
    
    xhr.open('GET', task.url);
    xhr.responseType = 'blob';
    
    xhr.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        this._updateProgress(task, percent);
      }
    };
    
    xhr.onload = () => {
      clearTimeout(timer);
      if (timedOut) return;
      
      if (xhr.status >= 200 && xhr.status < 300) {
        done(null, xhr.response);
      } else {
        done(`HTTP错误: ${xhr.status}`);
      }
    };
    
    xhr.onerror = () => {
      clearTimeout(timer);
      if (!timedOut) done('网络错误');
    };
    
    xhr.onabort = () => {
      clearTimeout(timer);
      if (!timedOut) done('下载中止');
    };
    
    xhr.send();
  }
  
  _updateProgress(task, percent) {
    const now = Date.now();
    if (now - task.progressTime > 100 || Math.abs(percent - task.lastProgress) > 5) {
      task.lastProgress = percent;
      task.progressTime = now;
      this._emit('downloadProgress', task.key, percent);
      task.onProgress?.(percent);
    }
  }
  
  /* ======================== WebSocket 消息处理 ======================== */
  _handleMessage(data) {
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
          this.send(MSG_TYPE.PONG); 
          break;
        case MSG_TYPE.ERROR: 
          this._emit('error', new Error(payload)); 
          break;
        default: 
          this._emit('message', type, payload);
      }
    } catch (e) {
      this._emit('error', new Error(`消息解析失败: ${e.message}`));
    }
  }
  
  _handleClose(event) {
    this.connected = false;
    this._stopHeartbeat();
    this._emit('close', event.code, event.reason);
    
    if ([1000, 1001].includes(event.code)) return;
    this._scheduleReconnect();
  }
  
  _handleError(error) {
    this._emit('error', new Error(`连接错误: ${error.message}`));
    if (!this.connected && this.autoReconnect) this._scheduleReconnect();
  }
  
  /* ======================== 连接管理工具 ======================== */
  _startHeartbeat() {
    this._stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.isConnected()) this.send(MSG_TYPE.PING, Date.now());
    }, this.pingInterval);
  }
  
  _stopHeartbeat() { clearInterval(this.pingTimer); }
  
  _cleanupConnection() {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
    this._stopHeartbeat();
  }
  
  _resetReconnect() {
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    clearTimeout(this.reconnectTimer);
  }
  
  _stopReconnect() {
    clearTimeout(this.reconnectTimer);
    this.autoReconnect = false;
  }
  
  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this._emit('error', new Error(`达到最大重连次数`));
      this._stopReconnect();
      return;
    }
    
    clearTimeout(this.reconnectTimer);
    this.reconnectAttempts++;
    
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );
    
    this.reconnectTimer = setTimeout(() => {
      this._emit('reconnect', this.reconnectAttempts, delay);
      this.connect((success) => {
        if (!success) this._scheduleReconnect();
      });
    }, delay);
  }
  
  _emit(event, ...args) {
    const listeners = this.events[event];
    if (!listeners) return;
    
    [...listeners].forEach(cb => {
      try { cb(...args); } 
      catch (e) { console.error(`事件处理错误 [${event}]:`, e); }
    });
  }
}

// 消息类型常量
const MSG_TYPE = {
  CONNECTED: 0, JOIN_ROOM: 1, LEAVE_ROOM: 2, MESSAGE: 3,
  ZONE_UPDATE: 4, ZONE_REMOVE: 5, ZONE_QUERY: 6, ZONE_RESULT: 7,
  PING: 8, PONG: 9, ERROR: 10
};