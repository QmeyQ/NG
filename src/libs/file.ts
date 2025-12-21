// FileManager.ts
import { IDBStorage } from "./IDBStorage";

export interface FileEntry {
    key: string;
    blob: Blob;
    mimeType: string;
    size: number;
    timestamp: number;
}

export interface CacheStats {
    totalSize: number;
    fileCount: number;
    hitRate: number;
    missRate: number;
}

export class FileManager {
    private _storage: IDBStorage;
    private _memoryCache: Map<string, FileEntry> = new Map();
    private _maxMemoryCacheSize: number = 50 * 1024 * 1024; // 50MB
    private _currentMemoryCacheSize: number = 0;
    private _cacheHits: number = 0;
    private _cacheMisses: number = 0;
    private _pendingOperations: Map<string, Function[]> = new Map();

    constructor(storage?: IDBStorage) {
        this._storage = storage || new IDBStorage();
    }

    /**
     * 设置最大内存缓存大小
     */
    setMaxMemoryCacheSize(sizeMB: number): void {
        this._maxMemoryCacheSize = sizeMB * 1024 * 1024;
        this._evictIfNeeded();
    }

    /**
     * 写入文件
     */
    writeFile(key: string, blob: Blob, mimeType?: string, onComplete?: (success: boolean) => void): void {
        const entry: FileEntry = {
            key,
            blob,
            mimeType: mimeType || this._getMimeTypeFromBlob(blob),
            size: blob.size,
            timestamp: Date.now()
        };

        // 写入内存缓存
        this._addToMemoryCache(key, entry);

        // 写入持久化存储
        this._storage.setFile(key, blob, (success: boolean) => {
            onComplete?.(success);
        });
    }

    /**
     * 读取文件
     */
    readFile(key: string, onComplete: (entry: FileEntry | null) => void): void {
        // 检查是否正在加载中
        if (this._pendingOperations.has(key)) {
            this._pendingOperations.get(key)!.push(onComplete);
            return;
        }

        // 初始化待处理队列
        this._pendingOperations.set(key, [onComplete]);

        // 检查内存缓存
        if (this._memoryCache.has(key)) {
            this._cacheHits++;
            this._resolvePending(key, this._memoryCache.get(key)!);
            return;
        }

        this._cacheMisses++;

        // 从持久化存储读取
        this._storage.getFile(key, (blob: Blob | null) => {
            if (blob) {
                const entry: FileEntry = {
                    key,
                    blob,
                    mimeType: this._getMimeTypeFromBlob(blob),
                    size: blob.size,
                    timestamp: Date.now()
                };
                this._addToMemoryCache(key, entry);
                this._resolvePending(key, entry);
            } else {
                this._resolvePending(key, null);
            }
        });
    }

    /**
     * 批量读取文件
     */
    readFiles(keys: string[], onProgress: (loaded: number, total: number) => void, onComplete: (entries: FileEntry[]) => void): void {
        const entries: FileEntry[] = [];
        let loaded = 0;
        const total = keys.length;

        if (total === 0) {
            onComplete([]);
            return;
        }

        const onFileLoaded = (entry: FileEntry | null) => {
            if (entry) {
                entries.push(entry);
            }
            loaded++;
            onProgress(loaded, total);
            
            if (loaded === total) {
                onComplete(entries);
            }
        };

        keys.forEach(key => {
            this.readFile(key, onFileLoaded);
        });
    }

    /**
     * 检查文件是否存在
     */
    hasFile(key: string, onComplete: (exists: boolean) => void): void {
        // 检查内存缓存
        if (this._memoryCache.has(key)) {
            onComplete(true);
            return;
        }

        // 检查持久化存储
        this._storage.get(key, onComplete);
    }

    /**
     * 删除文件
     */
    deleteFile(key: string, onComplete?: (success: boolean) => void): void {
        // 从内存缓存删除
        if (this._memoryCache.has(key)) {
            const entry = this._memoryCache.get(key)!;
            this._currentMemoryCacheSize -= entry.size;
            this._memoryCache.delete(key);
        }

        // 从持久化存储删除
        this._storage.delete(key, (success: boolean) => {
            onComplete?.(success);
        });
    }

    /**
     * 批量删除文件
     */
    deleteFiles(keys: string[], onProgress: (deleted: number, total: number) => void, onComplete: (success: boolean) => void): void {
        let deleted = 0;
        const total = keys.length;

        if (total === 0) {
            onComplete(true);
            return;
        }

        const onFileDeleted = () => {
            deleted++;
            onProgress(deleted, total);
            
            if (deleted === total) {
                onComplete(true);
            }
        };

        keys.forEach(key => {
            this.deleteFile(key, onFileDeleted);
        });
    }

    /**
     * 清除所有缓存
     */
    clearCache(onComplete?: () => void): void {
        this._memoryCache.clear();
        this._currentMemoryCacheSize = 0;
        this._pendingOperations.clear();
        
        this._storage.clear(() => {
            onComplete?.();
        });
    }

    /**
     * 获取缓存统计信息
     */
    getCacheStats(): CacheStats {
        const total = this._cacheHits + this._cacheMisses;
        const hitRate = total > 0 ? (this._cacheHits / total) * 100 : 0;
        const missRate = total > 0 ? (this._cacheMisses / total) * 100 : 0;

        return {
            totalSize: this._currentMemoryCacheSize,
            fileCount: this._memoryCache.size,
            hitRate,
            missRate
        };
    }

    /**
     * 预加载文件（预先放入内存缓存）
     */
    preloadFile(key: string, blob: Blob, mimeType?: string): void {
        const entry: FileEntry = {
            key,
            blob,
            mimeType: mimeType || this._getMimeTypeFromBlob(blob),
            size: blob.size,
            timestamp: Date.now()
        };
        
        this._addToMemoryCache(key, entry);
    }

    /**
     * 获取Blob对应的MIME类型
     */
    getBlobMimeType(blob: Blob): string {
        return this._getMimeTypeFromBlob(blob);
    }

    /**
     * 从base64创建Blob
     */
    createBlobFromBase64(base64: string, mimeType: string): Blob {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new Blob([bytes], { type: mimeType });
    }

    /**
     * 将Blob转换为base64
     */
    blobToBase64(blob: Blob, onComplete: (base64: string) => void): void {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            onComplete(base64);
        };
        reader.readAsDataURL(blob);
    }

    // ==================== 私有方法 ====================

    private _addToMemoryCache(key: string, entry: FileEntry): void {
        // 检查是否已存在
        if (this._memoryCache.has(key)) {
            const oldEntry = this._memoryCache.get(key)!;
            this._currentMemoryCacheSize -= oldEntry.size;
        }

        // 检查缓存大小限制
        this._evictIfNeeded();

        // 添加新缓存
        this._memoryCache.set(key, entry);
        this._currentMemoryCacheSize += entry.size;
    }

    private _evictIfNeeded(): void {
        if (this._currentMemoryCacheSize <= this._maxMemoryCacheSize) {
            return;
        }

        // 使用LRU策略移除最旧的缓存
        const entries = Array.from(this._memoryCache.entries());
        
        // 按时间戳排序（旧的在前）
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        // 移除旧的缓存，直到满足大小限制
        let removedSize = 0;
        const targetSize = this._maxMemoryCacheSize * 0.7; // 移除到70%
        
        while (this._currentMemoryCacheSize - removedSize > targetSize && entries.length > 0) {
            const [key, entry] = entries.shift()!;
            this._memoryCache.delete(key);
            removedSize += entry.size;
        }
        
        this._currentMemoryCacheSize -= removedSize;
    }

    private _resolvePending(key: string, entry: FileEntry | null): void {
        const callbacks = this._pendingOperations.get(key);
        if (callbacks) {
            callbacks.forEach(callback => callback(entry));
            this._pendingOperations.delete(key);
        }
    }

    private _getMimeTypeFromBlob(blob: Blob): string {
        // 如果Blob有type，直接使用
        if (blob.type) {
            return blob.type;
        }

        // 尝试从第一个字节判断类型
        const reader = new FileReader();
        reader.readAsArrayBuffer(blob.slice(0, 8));
        
        // 这里简化处理，实际上需要读取文件头判断
        return 'application/octet-stream';
    }
}

// 导出单例实例
export const fileManager = new FileManager();