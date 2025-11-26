// IDBStorage.ts
// IndexedDB存储封装类，适用于LayaAir项目

export class IDBStorage {
    private dbName: string;
    private dbVersion: number;
    private storeName: string = 'mainStore';
    private fileStoreName: string = 'fileStore';
    private db: any = null;
    private isInitialized: boolean = false;
    private initCallbacks: Array<(db: any, err?: any) => void> = [];

    /**
     * 初始化IndexedDB存储管理器
     * @param dbName 数据库名称，默认为'IDBStorage'
     * @param dbVersion 数据库版本，默认为1
     */
    constructor(dbName: string = 'IDBStorage', dbVersion: number = 1) {
        this.dbName = dbName;
        this.dbVersion = dbVersion;
    }

    /**
     * 初始化数据库连接
     * @param callback 初始化完成回调
     */
    private init(callback: (db: any, err?: any) => void): void {
        if (this.isInitialized) {
            callback(this.db);
            return;
        }

        // 将回调加入队列
        this.initCallbacks.push(callback);

        // 如果已经在初始化，直接返回
        if (this.initCallbacks.length > 1) return;

        const request = (window as any).indexedDB.open(this.dbName, this.dbVersion);

        // 版本升级/首次创建
        request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            // 创建普通数据存储区
            if (!db.objectStoreNames.contains(this.storeName)) {
                db.createObjectStore(this.storeName, { keyPath: 'key' });
            }
            // 创建文件存储区
            if (!db.objectStoreNames.contains(this.fileStoreName)) {
                db.createObjectStore(this.fileStoreName, { keyPath: 'key' });
            }
        };

        request.onsuccess = (event: any) => {
            this.db = event.target.result;
            this.isInitialized = true;

            // 执行所有等待的回调
            this.initCallbacks.forEach(cb => cb(this.db));
            this.initCallbacks = [];
        };

        request.onerror = (event: any) => {
            console.error('IDB初始化失败:', event.target.error);

            // 执行所有等待的回调
            this.initCallbacks.forEach(cb => cb(null, event.target.error));
            this.initCallbacks = [];
        };
    }

    /**
     * 确保数据库已初始化
     * @param callback 初始化完成回调
     */
    private _ensureInitialized(callback: (db: any, err?: any) => void): void {
        if (this.isInitialized) {
            callback(this.db);
        } else {
            this.init(callback);
        }
    }

    /**
     * 获取指定存储区的事务
     * @param storeName 存储区名称
     * @param mode 事务模式('readonly'|'readwrite')
     * @param callback 回调函数
     */
    private _getStoreWithTx(storeName: string, mode: IDBTransactionMode, 
                           callback: (store: IDBObjectStore, transaction: IDBTransaction, err?: any) => void): void {
        this._ensureInitialized((db, err) => {
            if (err) {
                callback(null, null, err);
                return;
            }

            const transaction = db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            callback(store, transaction);
        });
    }

    /**
     * 存储数据
     * @param key 键名
     * @param value 存储值
     * @param callback 操作结果回调 (success)
     */
    set(key: string, value: any, callback?: (success: boolean) => void): void {
        this._getStoreWithTx(this.storeName, 'readwrite', (store, transaction, err) => {
            if (err) {
                if (callback) callback(false);
                return;
            }

            // 处理特殊类型序列化
            let dataValue: any = value;
            let type: string = typeof value;
            let extra: any = {};

            if (value === null) {
                type = 'null';
            } else if (value instanceof Date) {
                type = 'date';
                dataValue = value.toISOString();
            } else if (typeof value === 'object') {
                type = 'object';
                dataValue = JSON.stringify(value);
            }

            const request = store.put({
                key,
                value: dataValue,
                type,
                ...extra,
                timestamp: Date.now()
            });

            if (callback) {
                transaction.oncomplete = () => callback(true);
                transaction.onerror = () => callback(false);
            }
        });
    }

    /**
     * 获取数据
     * @param key 键名
     * @param callback 结果回调 (value)
     */
    get(key: string, callback: (value: any) => void): void {
        this._getStoreWithTx(this.storeName, 'readonly', (store, transaction, err) => {
            if (err) {
                callback(null);
                return;
            }

            const request = store.get(key);
            request.onsuccess = () => {
                const data = request.result;
                if (!data) {
                    callback(null);
                    return;
                }

                // 还原数据类型
                let result: any;
                switch (data.type) {
                    case 'null':
                        result = null;
                        break;
                    case 'date':
                        result = new Date(data.value);
                        break;
                    case 'object':
                        try {
                            result = JSON.parse(data.value);
                        } catch (e) {
                            console.warn(`解析对象失败 [${key}]:`, e);
                            result = data.value;
                        }
                        break;
                    default:
                        result = data.value;
                }
                callback(result);
            };

            request.onerror = () => callback(null);
        });
    }

    /**
     * 删除数据
     * @param key 键名
     * @param callback 操作结果回调 (success)
     */
    delete(key: string, callback?: (success: boolean) => void): void {
        this._getStoreWithTx(this.storeName, 'readwrite', (store, transaction, err) => {
            if (err) {
                if (callback) callback(false);
                return;
            }

            store.delete(key);
            if (callback) {
                transaction.oncomplete = () => callback(true);
                transaction.onerror = () => callback(false);
            }
        });
    }

    /**
     * 清空所有数据
     * @param callback 操作结果回调 (success)
     */
    clear(callback?: (success: boolean) => void): void {
        // 清空普通数据
        this._getStoreWithTx(this.storeName, 'readwrite', (store, mainTx, err) => {
            if (err) {
                if (callback) callback(false);
                return;
            }

            store.clear();

            mainTx.oncomplete = () => {
                // 清空文件数据
                this._getStoreWithTx(this.fileStoreName, 'readwrite', (fileStore, fileTx, err) => {
                    if (err) {
                        if (callback) callback(false);
                        return;
                    }

                    fileStore.clear();
                    if (callback) {
                        fileTx.oncomplete = () => callback(true);
                        fileTx.onerror = () => callback(false);
                    }
                });
            };

            if (callback) {
                mainTx.onerror = () => callback(false);
            }
        });
    }

    /**
     * 将文件转换为Base64字符串
     * @param file 要转换的文件
     * @param callback 结果回调 (base64String)
     */
    private _fileToBase64(file: Blob | File, callback: (base64String: string | null, error?: any) => void): void {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // 提取Base64数据部分（去除前缀）
            if (typeof reader.result === 'string') {
                const base64String = reader.result.split(',')[1];
                callback(base64String);
            } else {
                callback(null, new Error('文件转换失败'));
            }
        };
        reader.onerror = (error) => callback(null, error);
    }

    /**
     * 将Base64字符串转换为Blob对象
     * @param base64 Base64字符串
     * @param mimeType MIME类型
     * @returns 转换后的Blob对象
     */
    private _base64ToBlob(base64: string, mimeType: string): Blob {
        const byteCharacters = atob(base64);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);

            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            byteArrays.push(new Uint8Array(byteNumbers));
        }

        return new Blob(byteArrays, { type: mimeType });
    }

    /**
     * 存储文件
     * @param key 键名
     * @param file 要存储的文件
     * @param callback 操作结果回调 (success)
     */
    setFile(key: string, file: Blob | File, callback?: (success: boolean) => void): void {
        // 1. 先将文件转换为Base64（在事务外完成异步操作）
        this._fileToBase64(file, (base64Data, err) => {
            if (err) {
                console.error(`文件转换失败 [${key}]:`, err);
                if (callback) callback(false);
                return;
            }

            // 2. 再开启事务存储Base64数据
            this._getStoreWithTx(this.fileStoreName, 'readwrite', (store, transaction, err) => {
                if (err) {
                    if (callback) callback(false);
                    return;
                }

                const request = store.put({
                    key,
                    data: base64Data,       // 存储Base64字符串
                    type: file.type,        // 保存MIME类型
                    size: file.size,        // 保存文件大小
                    name: key, // 保存文件名
                    timestamp: Date.now()
                });

                if (callback) {
                    transaction.oncomplete = () => callback(true);
                    transaction.onerror = () => callback(false);
                }
            });
        });
    }

    /**
     * 获取文件
     * @param key 键名
     * @param callback 结果回调 (blob)
     */
    getFile(key: string, callback: (blob: Blob | null) => void): void {
        this._getStoreWithTx(this.fileStoreName, 'readonly', (store, transaction, err) => {
            if (err) {
                callback(null);
                return;
            }

            const request = store.get(key);
            request.onsuccess = () => {
                const fileData = request.result;
                if (!fileData || !fileData.data) {
                    callback(null);
                    return;
                }

                // 将Base64转换回Blob对象
                const blob = this._base64ToBlob(fileData.data, fileData.type || 'application/octet-stream');
                callback(blob);
            };

            request.onerror = () => callback(null);
        });
    }

    /**
     * 删除文件
     * @param key 键名
     * @param callback 操作结果回调 (success)
     */
    deleteFile(key: string, callback?: (success: boolean) => void): void {
        this._getStoreWithTx(this.fileStoreName, 'readwrite', (store, transaction, err) => {
            if (err) {
                if (callback) callback(false);
                return;
            }

            store.delete(key);
            if (callback) {
                transaction.oncomplete = () => callback(true);
                transaction.onerror = () => callback(false);
            }
        });
    }

    /**
     * 批量存储数据
     * @param items 键值对数组
     * @param callback 操作结果回调 (success)
     */
    batchSet(items: Array<{key: string, value: any}>, callback?: (success: boolean) => void): void {
        if (!Array.isArray(items) || items.length === 0) {
            if (callback) callback(false);
            return;
        }

        this._getStoreWithTx(this.storeName, 'readwrite', (store, transaction, err) => {
            if (err) {
                if (callback) callback(false);
                return;
            }

            items.forEach(item => {
                if (!item.key) return;

                let dataValue = item.value;
                let type = typeof item.value;

                if (item.value === null) {
                    type = 'undefined';
                } else if (item.value instanceof Date) {
                    type = 'number';
                    dataValue = item.value.toISOString();
                } else if (typeof item.value === 'object') {
                    type = 'object';
                    dataValue = JSON.stringify(item.value);
                }

                store.put({
                    key: item.key,
                    value: dataValue,
                    type,
                    timestamp: Date.now()
                });
            });

            if (callback) {
                transaction.oncomplete = () => callback(true);
                transaction.onerror = () => callback(false);
            }
        });
    }

    /**
     * 批量获取数据
     * @param keys 键名数组
     * @param callback 结果回调 (results)
     */
    batchGet(keys: string[], callback: (results: any[]) => void): void {
        if (!Array.isArray(keys) || keys.length === 0) {
            callback([]);
            return;
        }

        this._getStoreWithTx(this.storeName, 'readonly', (store, transaction, err) => {
            if (err) {
                callback([]);
                return;
            }

            const request = store.getAll(keys);
            request.onsuccess = () => {
                const results = request.result.map((data: any) => {
                    if (!data) return null;

                    switch (data.type) {
                        case 'null':
                            return null;
                        case 'date':
                            return new Date(data.value);
                        case 'object':
                            try {
                                return JSON.parse(data.value);
                            } catch (e) {
                                return data.value;
                            }
                        default:
                            return data.value;
                    }
                });
                callback(results);
            };

            request.onerror = () => callback([]);
        });
    }

    /**
     * 获取所有键名
     * @param callback 结果回调 ({dataKeys, fileKeys})
     */
    getKeys(callback: (keys: {dataKeys: any[], fileKeys: any[]}) => void): void {
        // 获取普通数据键名
        this._getStoreWithTx(this.storeName, 'readonly', (store, transaction, err) => {
            if (err) {
                callback({ dataKeys: [], fileKeys: [] });
                return;
            }

            const dataKeys: any[] = [];
            const cursorRequest = store.openCursor();

            cursorRequest.onsuccess = (e: any) => {
                const cursor = e.target.result;
                if (cursor) {
                    dataKeys.push(cursor.key);
                    cursor.continue();
                } else {
                    // 获取文件键名
                    this._getStoreWithTx(this.fileStoreName, 'readonly', (fileStore, fileTx, err) => {
                        if (err) {
                            callback({ dataKeys, fileKeys: [] });
                            return;
                        }

                        const fileKeys: any[] = [];
                        const fileCursorRequest = fileStore.openCursor();

                        fileCursorRequest.onsuccess = (e: any) => {
                            const cursor = e.target.result;
                            if (cursor) {
                                fileKeys.push(cursor.key);
                                cursor.continue();
                            } else {
                                callback({ dataKeys, fileKeys });
                            }
                        };

                        fileCursorRequest.onerror = () => callback({ dataKeys, fileKeys: [] });
                    });
                }
            };

            cursorRequest.onerror = () => callback({ dataKeys: [], fileKeys: [] });
        });
    }

    /**
     * 获取存储使用情况
     * @param callback 结果回调 ({used, quota, percentage})
     */
    getUsage(callback: (usage: {used: number, quota: number, percentage: number}) => void): void {
        if ('storage' in navigator && 'estimate' in (navigator as any).storage) {
            (navigator as any).storage.estimate().then((estimate: any) => {
                callback({
                    used: estimate.usage || 0,
                    quota: estimate.quota || 0,
                    percentage: estimate.quota
                        ? Math.round((estimate.usage / estimate.quota) * 100)
                        : 0
                });
            }).catch((error: any) => {
                console.error('获取存储使用情况失败:', error);
                callback({ used: 0, quota: 0, percentage: 0 });
            });
        } else {
            callback({ used: 0, quota: 0, percentage: 0 });
        }
    }
}