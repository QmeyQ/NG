import { IDBStorage } from "./IDBStorage";
import { Timer } from "./time";

// ======================== 调试工具 ========================
const DEBUG_ENABLED = true;

function debugLog(prefix: string, ...args: any[]): void {
    if (!DEBUG_ENABLED) return;
    const timestamp = new Date().toISOString().slice(11, 23);
    console.log(`[Net-DEBUG][${timestamp}] ${prefix}`, ...args);
}

function padZero(num: number, len: number): string {
    let str = num.toString(16);
    while (str.length < len) str = '0' + str;
    return str;
}

function hexDump(data: any, maxBytes: number = 64): string {
    if (!data) return '[null]';
    try {
        let bytes: Uint8Array;
        if (data instanceof ArrayBuffer) {
            bytes = new Uint8Array(data);
        } else if (data instanceof Blob) {
            return `[Blob size=${data.size}]`;
        } else if (typeof data === 'string') {
            if (data.startsWith('data:')) return `[DataURL length=${data.length}]`;
            try {
                const binary = atob(data);
                bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            } catch {
                bytes = new TextEncoder().encode(data);
            }
        } else {
            return `[Unknown type: ${typeof data}]`;
        }
        const len = Math.min(bytes.length, maxBytes);
        const hexParts: string[] = [];
        for (let i = 0; i < len; i++) hexParts.push(padZero(bytes[i], 2).toUpperCase());
        return hexParts.join(' ') + (bytes.length > maxBytes ? '...' : '');
    } catch (e) {
        return `[Error: ${e}]`;
    }
}

function logBlobHex(prefix: string, blob: Blob, maxBytes: number = 64): void {
    if (!DEBUG_ENABLED) return;
    const reader = new FileReader();
    reader.onload = () => {
        const hex = hexDump(reader.result, maxBytes);
        debugLog(prefix, `Blob size=${blob.size}, hex=[${hex}]`);
    };
    reader.onerror = () => debugLog(prefix, `Blob读取失败`);
    reader.readAsArrayBuffer(blob.slice(0, maxBytes));
}

// ======================== 常量与类型 ========================

const DOWNLOAD_STATE = {
    PENDING: 'pending',
    DOWNLOADING: 'downloading',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    ERROR: 'error',
    CANCELLED: 'cancelled'
} as const;

interface ChunkInfo {
    index: number;
    start: number;
    end: number;
    loaded: boolean;
    blobKey?: string;
    failCount: number;
}

interface ChunkedDownloadState {
    taskKey: string;
    url: string;
    totalSize: number;
    chunkSize: number;
    chunks: ChunkInfo[];
    anySuccess: boolean;
    mimeType?: string;
    etag?: string;
    lastModified?: number;
}

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
    controller: AbortController | null;
    onProgress?: (percent: number, speed: number, loaded: number, total: number) => void;
    onComplete?: (blob: Blob, fromCache: boolean) => void;
    onError?: (error: string) => void;
    onStateChange?: (state: string) => void;
    lastProgressUpdate: number;
    lastLoaded: number;
    cache?: boolean;

    // [FIX] 添加字段用于传递已读取的 chunkState，避免二次读取不一致
    _chunkState?: ChunkedDownloadState;
}

export class Net {
    public storage: IDBStorage;
    private events: { [key: string]: Function[] } = {};

    private downloadTasks: Map<string, DownloadTask> = new Map();
    private activeDownloads: Set<string> = new Set();
    private maxConcurrent: number = 3;
    private downloadTimeout: number = 120000;
    private maxRetries: number = 3;
    private downloadQueue: string[] = [];

    private chunkSize: number = 64 * 1024;
    private maxChunkConcurrent: number = 3;
    private baseChunkRetries: number = 3;
    private boostedChunkRetries: number = 10;

    constructor() {
        this.storage = new IDBStorage();
    }

    // ======================== 事件系统 ========================
    private _emit(event: string, ...args: any[]): void {
        const listeners = this.events[event];
        if (!listeners) return;
        listeners.forEach(cb => { try { cb(...args); } catch (e) { console.error(e); } });
    }

    on(event: string, callback: Function): void {
        if (typeof callback === 'function') (this.events[event] || (this.events[event] = [])).push(callback);
    }

    off(event: string, callback: Function): void {
        const listeners = this.events[event];
        if (listeners) this.events[event] = listeners.filter(cb => cb !== callback);
    }

    // ======================== 下载入口 ========================
    download(url: string, options: any = {}): void {
        const { key = url, force = false, cache = true, onProgress, onComplete, onError } = options;
        debugLog(`[download] 开始 key=${key}, force=${force}, cache=${cache}`);

        const existingTask = this.downloadTasks.get(key);
        if (existingTask) {
            if (existingTask.state === DOWNLOAD_STATE.DOWNLOADING) {
                this._emit('downloadError', key, '任务已在进行中');
                onError?.('任务已在进行中');
                return;
            }
            if (existingTask.state === DOWNLOAD_STATE.PAUSED) {
                this.resumeDownload(key);
                return;
            }
        }

        if (!force) {
            this.cacheGet(key, (cached: any) => {
                if (cached) {
                    debugLog(`[download] 缓存命中 key=${key}`);
                    logBlobHex(`[download] 缓存数据 key=${key}`, cached);
                    this._emit('downloadComplete', key, cached, true);
                    onComplete?.(cached, true);
                    return;
                }
                this._resumeFromChunkState(key, (task) => {
                    if (task) {
                        task.onProgress = onProgress;
                        task.onComplete = onComplete;
                        task.onError = onError;
                        task.cache = cache;
                        this._startDownload(task);
                    } else {
                        const newTask: DownloadTask = {
                            id: key, url, key, state: DOWNLOAD_STATE.PENDING,
                            loaded: 0, total: 0, resumable: true,
                            startTime: Timer.now(),
                            retries: 0, controller: null,
                            onProgress, onComplete, onError,
                            lastProgressUpdate: 0, lastLoaded: 0, cache
                        };
                        this.downloadTasks.set(key, newTask);
                        this._startChunkedDownload(newTask);
                    }
                });
            });
        } else {
            const newTask: DownloadTask = {
                id: key, url, key, state: DOWNLOAD_STATE.PENDING,
                loaded: 0, total: 0, resumable: true,
                startTime: Timer.now(),
                retries: 0, controller: null,
                onProgress, onComplete, onError,
                lastProgressUpdate: 0, lastLoaded: 0, cache
            };
            this.downloadTasks.set(key, newTask);
            this._startNormalDownload(newTask);
        }
    }

    pauseDownload(key: string): void {
        const task = this.downloadTasks.get(key);
        if (!task || task.state !== DOWNLOAD_STATE.DOWNLOADING) return;
        debugLog(`[pause] key=${key}`);
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

    resumeDownload(key: string): void {
        const task = this.downloadTasks.get(key);
        if (!task || task.state !== DOWNLOAD_STATE.PAUSED) return;
        debugLog(`[resume] key=${key}`);
        task.state = DOWNLOAD_STATE.PENDING;
        task.retries = 0;
        this._startDownload(task);
    }

    pauseAllDownloads(): void {
        this.downloadTasks.forEach((task, key) => {
            if (task.state === DOWNLOAD_STATE.DOWNLOADING) this.pauseDownload(key);
        });
    }

    resumeAllDownloads(): void {
        this.downloadTasks.forEach((task, key) => {
            if (task.state === DOWNLOAD_STATE.PAUSED) this.resumeDownload(key);
        });
    }

    clearDownloadQueue(): void {
        this.pauseAllDownloads();
        this.downloadTasks.clear();
        this.activeDownloads.clear();
        this.downloadQueue = [];
    }

    // [FIX] 修改 _resumeFromChunkState，同时将解析出的 chunkState 挂到 task 上
    private _resumeFromChunkState(key: string, callback: (task: DownloadTask | null) => void): void {
        const stateKey = `${key}_chunks_state`;
        this.storage.get(stateKey, (chunkStateStr: string | null) => {
            if (!chunkStateStr) {
                callback(null);
                return;
            }
            let chunkState: ChunkedDownloadState;
            try {
                chunkState = JSON.parse(chunkStateStr);
            } catch (e) {
                callback(null);
                return;
            }
            const url = chunkState.url;
            if (!url) {
                callback(null);
                return;
            }
            const totalSize = chunkState.totalSize;

            const task: DownloadTask = {
                id: key,
                url: url,
                key: key,
                state: DOWNLOAD_STATE.PENDING,
                loaded: chunkState.chunks.filter(c => c.loaded).reduce((acc, c) => acc + (c.end - c.start + 1), 0),
                total: totalSize,
                resumable: true,
                startTime: Timer.now(),
                retries: 0,
                controller: null,
                cache: true,
                lastProgressUpdate: 0,
                lastLoaded: 0,
                // [FIX] 将解析出的 chunkState 挂载到 task 上，供后续直接使用
                _chunkState: chunkState
            };
            this.downloadTasks.set(key, task);
            debugLog(`[resume] 从持久状态恢复任务 ${key}，已下载 ${task.loaded}/${task.total} 字节`);
            callback(task);
        });
    }

    forceNormalDownload(key: string): void {
        const task = this.downloadTasks.get(key);
        if (!task) return;
        this.pauseDownload(key);
        this._cleanupChunkTempFiles(key, () => {
            this.storage.delete(`${key}_chunks_state`, () => {});
            task.state = DOWNLOAD_STATE.PENDING;
            task.loaded = 0;
            task.total = 0;
            task.retries = 0;
            if (task.controller) {
                task.controller.abort();
                task.controller = null;
            }
            // [FIX] 清除挂载的 chunkState
            task._chunkState = undefined;
            debugLog(`[forceNormal] 切换到整包下载 key=${key}`);
            this._startNormalDownload(task);
        });
    }

    cacheGet(key: string, callback: (blob: any) => void): void {
        this.storage.getFile(key, callback);
    }

    cacheClear(callback: (success: boolean) => void): void {
        this.storage.getKeys((keys) => {
            keys.dataKeys.forEach(k => { if (k.endsWith('_resume')) this.storage.deleteFile(k, () => {}); });
        });
        this.storage.clear(callback);
    }

    cacheRemove(key: string, callback: (success: boolean) => void): void {
        this.storage.deleteFile(`${key}_resume`, () => {});
        this.storage.deleteFile(key, callback);
    }

    cacheInfo(callback: (info: { used: number, quota: number, percentage: number }) => void): void {
        this.storage.getUsage(callback);
    }

    // ======================== 核心下载调度 ========================
    private _startDownload(task: DownloadTask): void {
        if (this.activeDownloads.size >= this.maxConcurrent) {
            if (this.downloadQueue.indexOf(task.id) === -1) this.downloadQueue.push(task.id);
            return;
        }
        this.activeDownloads.add(task.id);
        task.state = DOWNLOAD_STATE.DOWNLOADING;
        task.startTime = Timer.now();
        debugLog(`[_start] key=${task.id}`);
        task.onStateChange?.(DOWNLOAD_STATE.DOWNLOADING);
        // [FIX] 传递 task 以便内部使用挂载的 chunkState
        this._startChunkedDownload(task);
    }

    private _processDownloadQueue(): void {
        while (this.activeDownloads.size < this.maxConcurrent && this.downloadQueue.length > 0) {
            const taskId = this.downloadQueue.shift()!;
            const task = this.downloadTasks.get(taskId);
            if (task && task.state === DOWNLOAD_STATE.PENDING) this._startDownload(task);
        }
    }

    // ======================== 智能分片下载 ========================
    // [FIX] _startChunkedDownload 保持不变，但内部 _executeChunkedDownload 会使用 task._chunkState
    private _startChunkedDownload(task: DownloadTask): void {
        this._fetchFileSize(task).then(totalSize => {
            if (totalSize <= 0) {
                debugLog(`[chunked] 无法获取文件大小，降级普通下载`);
                this._startNormalDownload(task);
                return;
            }
            task.total = totalSize;
            const chunkCount = Math.ceil(totalSize / this.chunkSize);
            debugLog(`[chunked] 总分片数: ${chunkCount}, 每片 ${this.chunkSize} 字节`);
            this._executeChunkedDownload(task, chunkCount);
        }).catch(() => {
            debugLog(`[chunked] 获取文件大小失败，降级普通下载`);
            this._startNormalDownload(task);
        });
    }

    private _fetchFileSize(task: DownloadTask): Promise<number> {
        return new Promise((resolve, reject) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                reject(new Error('timeout'));
            }, 10000);

            fetch(task.url, { method: 'HEAD', signal: controller.signal })
                .then(response => {
                    clearTimeout(timeoutId);
                    const length = response.headers.get('Content-Length');
                    if (length) {
                        resolve(parseInt(length, 10));
                    } else {
                        this._fetchSizeViaRange(task).then(resolve).catch(reject);
                    }
                })
                .catch(err => {
                    clearTimeout(timeoutId);
                    this._fetchSizeViaRange(task).then(resolve).catch(reject);
                });
        });
    }

    private _fetchSizeViaRange(task: DownloadTask): Promise<number> {
        return fetch(task.url, { headers: { Range: 'bytes=0-0' } })
            .then(response => {
                const range = response.headers.get('Content-Range');
                if (range) {
                    const match = range.match(/\/(\d+)/);
                    if (match) return parseInt(match[1], 10);
                }
                return response.headers.get('Content-Length') ? parseInt(response.headers.get('Content-Length')!, 10) : 0;
            });
    }

    // [FIX] 核心修改：优先使用 task._chunkState，避免 IDB 重复读取导致状态被重置
    private _executeChunkedDownload(task: DownloadTask, totalChunks: number): void {
        const chunkStateKey = `${task.key}_chunks_state`;
        const controller = new AbortController();
        task.controller = controller;

        // [FIX] 如果 task 上已有从 resume 传递过来的 _chunkState，直接使用，不再读 IDB
        const useCachedState = task._chunkState;
        const processWithState = (cachedState: ChunkedDownloadState | null, useDirect: boolean) => {
            let chunks: ChunkInfo[];
            let anySuccess = false;
            let completedCount = 0;
            let totalDownloaded = 0;

            const initChunks = (): ChunkInfo[] => {
                const arr: ChunkInfo[] = [];
                for (let i = 0; i < totalChunks; i++) {
                    const start = i * this.chunkSize;
                    const end = Math.min(start + this.chunkSize - 1, task.total - 1);
                    arr.push({
                        index: i,
                        start,
                        end,
                        loaded: false,
                        blobKey: `${task.key}_chunk_${i}`,
                        failCount: 0
                    });
                }
                return arr;
            };

            // [FIX] 优先使用直接传入的 chunkState（来自 resume），否则使用 IDB 读取的状态
            const effectiveState = useDirect ? cachedState : cachedState;
            if (effectiveState && effectiveState.totalSize === task.total && effectiveState.chunkSize === this.chunkSize) {
                chunks = effectiveState.chunks;
                anySuccess = effectiveState.anySuccess || false;
                debugLog(`[chunked] 恢复断点续传状态，已下载 ${chunks.filter(c => c.loaded).length}/${totalChunks} 分片, anySuccess=${anySuccess}`);
            } else {
                chunks = initChunks();
            }

            completedCount = chunks.filter(c => c.loaded).length;
            totalDownloaded = completedCount * this.chunkSize;
            task.loaded = Math.min(totalDownloaded, task.total);

            const updateProgress = () => {
                task.loaded = totalDownloaded;
                const now = Timer.now();
                if (now - task.lastProgressUpdate >= 100) {
                    this._updateProgress(task, task.loaded, task.total);
                    task.lastProgressUpdate = now;
                }
            };

            const saveChunkState = () => {
                const state: ChunkedDownloadState = {
                    taskKey: task.key,
                    url: task.url,
                    totalSize: task.total,
                    chunkSize: this.chunkSize,
                    chunks: chunks,
                    anySuccess: anySuccess
                };
                this.storage.set(chunkStateKey, JSON.stringify(state), () => {});
            };

            const downloadChunk = async (chunk: ChunkInfo, retryCount = 0): Promise<boolean> => {
                if (chunk.loaded) {
                    return new Promise(resolve => {
                        this.storage.getFile(chunk.blobKey!, (blob: Blob | null) => {
                            const expectedSize = chunk.end - chunk.start + 1;
                            if (blob && blob.size === expectedSize) {
                                totalDownloaded += expectedSize;
                                debugLog(`[chunked] 分片 ${chunk.index} 已存在且有效，大小 ${blob.size}`);
                                resolve(true);
                            } else {
                                chunk.loaded = false;
                                chunk.failCount = 0;
                                completedCount--;
                                debugLog(`[chunked] 分片 ${chunk.index} 缓存无效，重新下载 (期望${expectedSize}, 实际${blob?.size || 0})`);
                                resolve(false);
                            }
                        });
                    });
                }

                const expectedSize = chunk.end - chunk.start + 1;
                const headers: Record<string, string> = { 'Range': `bytes=${chunk.start}-${chunk.end}` };
                let timeoutId: any = null;

                try {
                    const fetchController = new AbortController();
                    timeoutId = setTimeout(() => fetchController.abort(), 30000);

                    const response = await fetch(task.url, {
                        headers,
                        signal: fetchController.signal
                    });
                    clearTimeout(timeoutId);

                    if (!response.ok && response.status !== 206) {
                        if (response.status === 200) {
                            debugLog(`[chunked] 服务器不支持Range (返回200)，建议手动切换整包下载`);
                            throw new Error('服务器不支持Range');
                        }
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const arrayBuffer = await response.arrayBuffer();
                    const chunkData = new Uint8Array(arrayBuffer);

                    if (chunkData.length !== expectedSize) {
                        const isLastChunk = chunk.end === task.total - 1;
                        const maxAcceptableSize = isLastChunk ? task.total - chunk.start : expectedSize;

                        if (chunkData.length === 0) {
                            throw new Error(`分片 ${chunk.index} 返回空数据 (期望 ${expectedSize} 字节)`);
                        }

                        if (!isLastChunk || chunkData.length !== maxAcceptableSize) {
                            throw new Error(
                                `分片 ${chunk.index} 大小不匹配: 期望 ${expectedSize}, 实际 ${chunkData.length}`
                            );
                        }

                        debugLog(`[chunked] 最后分片 ${chunk.index} 大小 ${chunkData.length} (期望 ${expectedSize})`);
                    }

                    const blob = new Blob([chunkData]);

                    await new Promise<void>((resolve, reject) => {
                        this.storage.setFile(chunk.blobKey!, blob, (success) => {
                            if (success) {
                                this.storage.getFile(chunk.blobKey!, (savedBlob: Blob | null) => {
                                    if (savedBlob && savedBlob.size === chunkData.length) {
                                        resolve();
                                    } else {
                                        reject(new Error(`存储验证失败: 期望 ${chunkData.length}, 实际 ${savedBlob?.size || 0}`));
                                    }
                                });
                            } else {
                                reject(new Error('存储分片失败'));
                            }
                        });
                    });

                    chunk.loaded = true;
                    chunk.failCount = 0;
                    completedCount++;
                    totalDownloaded += chunkData.length;
                    if (!anySuccess) {
                        anySuccess = true;
                        debugLog(`[chunked] 首次分片成功，所有分片重试次数提升至 ${this.boostedChunkRetries}`);
                    }
                    saveChunkState();
                    updateProgress();
                    debugLog(`[chunked] 分片 ${chunk.index} 完成并保存，大小 ${chunkData.length}/${expectedSize}`);
                    return true;

                } catch (error: any) {
                    if (timeoutId) clearTimeout(timeoutId);

                    if (error.name === 'AbortError') {
                        debugLog(`[chunked] 分片 ${chunk.index} 请求超时或取消`);
                        return false;
                    }

                    chunk.failCount++;
                    const maxRetries = anySuccess ? this.boostedChunkRetries : this.baseChunkRetries;

                    debugLog(`[chunked] 分片 ${chunk.index} 失败 (连续失败 ${chunk.failCount}/${maxRetries}): ${error.message}`);

                    if (chunk.failCount >= maxRetries) {
                        debugLog(`[chunked] 分片 ${chunk.index} 达到最大失败次数，任务失败`);
                        task.state = DOWNLOAD_STATE.ERROR;
                        this._emit('downloadError', task.key, `分片 ${chunk.index} 下载失败`);
                        task.onError?.(`分片 ${chunk.index} 下载失败`);
                        controller.abort();
                        return false;
                    }

                    const waitTime = 200 * (retryCount + 1);
                    await new Promise(r => setTimeout(r, waitTime));
                    return downloadChunk(chunk, retryCount + 1);
                }
            };

            const run = async () => {
                const pendingChunks = chunks.filter(c => !c.loaded);
                debugLog(`[chunked] 待下载分片: ${pendingChunks.length}`);

                const queue = [...pendingChunks];
                const workers = Array(this.maxChunkConcurrent).fill(null).map(async () => {
                    while (queue.length > 0 && !controller.signal.aborted) {
                        const chunk = queue.shift()!;
                        await downloadChunk(chunk);
                    }
                });
                await Promise.all(workers);

                if (controller.signal.aborted) return;

                const allLoaded = chunks.every(c => c.loaded);
                if (!allLoaded) {
                    debugLog(`[chunked] 存在未完成分片，任务失败`);
                    task.state = DOWNLOAD_STATE.ERROR;
                    this._emit('downloadError', task.key, '部分分片下载失败');
                    task.onError?.('部分分片下载失败');
                    return;
                }

                this._mergeChunksToFinalBlob(task, chunks, chunkStateKey);
            };

            run().catch(err => {
                if (!controller.signal.aborted) {
                    debugLog(`[chunked] 异常: ${err}`);
                    task.state = DOWNLOAD_STATE.ERROR;
                    this._emit('downloadError', task.key, err.message);
                    task.onError?.(err.message);
                }
            });
        };

        // [FIX] 使用挂载的 chunkState 或从 IDB 读取
        if (useCachedState) {
            processWithState(useCachedState, true);
        } else {
            this.storage.get(chunkStateKey, (cachedState: ChunkedDownloadState | null) => {
                processWithState(cachedState, false);
            });
        }
    }

    private _mergeChunksToFinalBlob(task: DownloadTask, chunks: ChunkInfo[], stateKey: string): void {
        const blobKeys = chunks.map(c => c.blobKey!);

        let expectedTotalSize = 0;
        const sizeMap = new Map<number, number>();
        chunks.forEach(chunk => {
            const size = chunk.end - chunk.start + 1;
            expectedTotalSize += size;
            sizeMap.set(chunk.index, size);
        });

        setTimeout(() => {
            console.log(`[merge] 开始合并，期望总大小: ${expectedTotalSize}`);

            const readPromises = blobKeys.map((key, index) => {
                return new Promise<{ index: number; blob: Blob | null }>((resolve) => {
                    this.storage.getFile(key, (blob: Blob | null) => {
                        console.log(`[merge] 读取分片 ${index}, 键: ${key}, blob: ${blob ? `size=${blob.size}` : 'null'}`);
                        resolve({ index, blob });
                    });
                });
            });

            Promise.all(readPromises).then(results => {
                const validBlobs: (Blob | null)[] = new Array(chunks.length).fill(null);
                let missing = false;
                let actualTotalSize = 0;

                for (const { index, blob } of results) {
                    const expectedSize = sizeMap.get(index)!;
                    if (blob && blob.size === expectedSize) {
                        validBlobs[index] = blob;
                        actualTotalSize += blob.size;
                    } else {
                        missing = true;
                        console.warn(`[merge] 分片 ${index} 无效: 期望 ${expectedSize}, 实际 ${blob?.size || 0}`);
                        chunks[index].loaded = false;
                    }
                }

                if (missing) {
                    console.error(`[merge] 发现无效分片，重新下载缺失分片`);
                    this.storage.set(stateKey, JSON.stringify({ chunks }), () => {
                        this._executeChunkedDownload(task, chunks.length);
                    });
                    return;
                }

                if (actualTotalSize !== task.total) {
                    console.error(`[merge] 总大小不匹配: 期望 ${task.total}, 实际 ${actualTotalSize}`);
                    task.state = DOWNLOAD_STATE.ERROR;
                    this._emit('downloadError', task.key, '文件大小不匹配');
                    task.onError?.('文件大小不匹配');
                    return;
                }

                const finalBlob = new Blob(validBlobs.filter(b => b !== null) as Blob[]);
                debugLog(`[merge] 合并完成，总大小 ${finalBlob.size} (期望 ${task.total})`);
                logBlobHex(`[merge] 最终数据`, finalBlob, 128);

                this.storage.setFile(task.key, finalBlob, (success) => {
                    if (success) {
                        const deleteKeys = [...blobKeys, stateKey, `${task.key}_resume`];
                        let deleted = 0;
                        deleteKeys.forEach(key => {
                            this.storage.delete(key.includes('_chunk_') ? key : key, () => {
                                if (++deleted === deleteKeys.length) {
                                    debugLog(`[merge] 清理临时文件完成`);
                                }
                            });
                        });
                        this._finalizeDownload(task, finalBlob, false);
                    } else {
                        this._handleDownloadError(task, '保存最终文件失败');
                    }
                });
            }).catch(err => {
                console.error(`[merge] 读取分片异常:`, err);
                this._handleDownloadError(task, '合并分片时发生异常');
            });
        }, 100);
    }

    // ======================== 普通完整下载 ========================
    private _startNormalDownload(task: DownloadTask): void {
        debugLog(`[normal] 开始普通下载 key=${task.id}`);
        const controller = new AbortController();
        task.controller = controller;
        task.loaded = 0;
        task.total = 0;

        const timeoutPromise = new Promise<never>((_, reject) => {
            const timer = setTimeout(() => reject(new Error('timeout')), this.downloadTimeout);
            controller.signal.addEventListener('abort', () => clearTimeout(timer));
        });

        Promise.race([
            fetch(task.url, { signal: controller.signal }),
            timeoutPromise
        ])
            .then(async response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const contentLength = response.headers.get('Content-Length');
                if (contentLength) task.total = parseInt(contentLength, 10);

                const reader = response.body?.getReader();
                if (!reader) throw new Error('无响应流');

                const chunks: Uint8Array[] = [];
                let received = 0;
                let lastUpdate = Timer.now();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                    received += value.length;
                    task.loaded = received;

                    const now = Timer.now();
                    if (now - lastUpdate >= 100) {
                        this._updateProgress(task, task.loaded, task.total);
                        lastUpdate = now;
                    }
                }

                const blob = new Blob(chunks);
                debugLog(`[normal] 下载完成，大小 ${blob.size}`);
                logBlobHex(`[normal] 数据内容`, blob);
                return blob;
            })
            .then(blob => {
                this.storage.setFile(task.key, blob, success => {
                    if (success) {
                        this._cleanupChunkTempFiles(task.key, () => {
                            this.storage.deleteFile(`${task.key}_resume`, () => {});
                            this._finalizeDownload(task, blob, false);
                        });
                    } else {
                        this._handleDownloadError(task, '存储失败');
                    }
                });
            })
            .catch(error => {
                if (error.name === 'AbortError') return;
                debugLog(`[normal] 下载失败: ${error.message}`);
                this._handleDownloadError(task, `下载失败: ${error.message}`);
            });
    }

    private _cleanupChunkTempFiles(baseKey: string, callback: () => void): void {
        this.storage.getKeys((keys) => {
            const chunkKeys = keys.fileKeys.filter((k: string) => k.startsWith(`${baseKey}_chunk_`));
            if (chunkKeys.length === 0) {
                this.storage.delete(`${baseKey}_chunks_state`, () => callback());
                return;
            }

            let pending = chunkKeys.length;
            chunkKeys.forEach((key: string) => {
                this.storage.deleteFile(key, () => {
                    if (--pending === 0) {
                        this.storage.delete(`${baseKey}_chunks_state`, () => callback());
                    }
                });
            });
        });
    }

    private _finalizeDownload(task: DownloadTask, blob: Blob, fromCache: boolean): void {
        this.activeDownloads.delete(task.id);
        task.state = DOWNLOAD_STATE.COMPLETED;
        this._emit('downloadComplete', task.id, blob, fromCache);
        task.onComplete?.(blob, fromCache);
        task.onStateChange?.(DOWNLOAD_STATE.COMPLETED);
        this.downloadTasks.delete(task.id);
        this._processDownloadQueue();
    }

    private _updateProgress(task: DownloadTask, loaded: number, total: number): void {
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        let speed = 0;
        const now = Timer.now();
        if (task.lastLoaded > 0) {
            const timeDiff = now - task.lastProgressUpdate;
            const loadedDiff = loaded - task.lastLoaded;
            speed = timeDiff > 0 ? (loadedDiff / timeDiff) * 1000 : 0;
        }
        task.lastLoaded = loaded;
        task.lastProgressUpdate = now;
        this._emit('downloadProgress', task.id, percent, speed, loaded, total);
        task.onProgress?.(percent, speed, loaded, total);
    }

    private _handleDownloadError(task: DownloadTask, error: string): void {
        task.controller = null;
        this.activeDownloads.delete(task.id);
        if (task.retries < this.maxRetries) {
            task.retries++;
            task.state = DOWNLOAD_STATE.PENDING;
            const delay = 1000 * task.retries;
            debugLog(`[_error] 重试 ${task.retries}/${this.maxRetries}, 延迟${delay}ms`);
            Timer.setTimeout(delay, () => this._startDownload(task));
        } else {
            task.state = DOWNLOAD_STATE.ERROR;
            this._emit('downloadError', task.id, error);
            task.onError?.(error);
            task.onStateChange?.(DOWNLOAD_STATE.ERROR);
            this._processDownloadQueue();
        }
    }

    destroy(): void {
        this.pauseAllDownloads();
        Timer.destroy();
    }
}