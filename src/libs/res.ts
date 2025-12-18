/**Res.ts
 * Res - 资源管理类，负责.res格式资源包的加载、解析、缓存和资源获取，支持纹理、图集(Atlas)、Spine骨骼动画等资源类型。
 * init() - 初始化资源管理器，创建IDBStorage和Net实例，确保仅初始化一次。
 * url(url: string, forceOrCallback?: boolean | ((info: PackInfo) => void), callback?: (info: PackInfo) => void) - 加载远程.res格式资源包，url为资源包地址；forceOrCallback为boolean时表示是否强制重新下载(忽略缓存)，为function时作为加载完成回调；callback为加载完成回调函数，返回PackInfo资源包信息(失败时返回null)。
 * then(onFulfilled: (info: PackInfo) => void, onRejected?: (error: string) => void) - Promise链式调用支持，onFulfilled为加载成功回调，onRejected为加载失败回调。
 * get(path: string, callback: (resources: any[]) => void) - 获取指定路径的资源，path支持"group"(资源组)、"group/subgroup"(二级组)、"group/filename"(具体文件)格式；callback返回资源数组(失败时返回空数组)。
 * down(group: string, force: boolean = false, callback?: (success: boolean) => void) - 下载指定资源组的所有文件，group为资源组名；force是否强制重新下载；callback返回下载是否成功(全部文件下载完成且无错误则为true)。
 * downRes(callback?: (successCount: number, errorCount: number, totalCount: number) => void) - 下载所有资源，callback返回成功数、错误数、总数。
 * getList(): any - 获取已加载的资源包配置信息(PackInfo)。
 * getProcess(): { process: number; err: number; count: number } - 获取加载进度信息，process为处理数，err为错误数，count为总数。
 * clearCache(callback?: () => void) - 清空所有资源缓存(内存缓存+本地存储)，callback为操作完成回调。
 * setNet(net: Net) - 设置自定义的Net网络实例，用于资源下载。
 * 内部数据结构说明：
 *   - ResourceEntry: 资源缓存条目，包含blob(原始二进制)、texture(纹理)、atlas(图集)、spine(骨骼动画)、loading(加载状态)、callbacks(等待回调)。
 *   - CacheEntry: 本地存储缓存条目，包含blob(base64编码)、mimeType(文件类型)、timestamp(缓存时间戳)。
 *   - PackInfo: 资源包配置信息，包含文件目录结构和元数据。
 *   - DecompressResult: 文件解压结果，包含blob(解压后的二进制)、mimeType(文件类型)。
 */

// Res.ts
import { Net } from "./net";
import { Code, PackInfo, DecompressResult } from "./code";

interface ResourceEntry {
    blob?: Blob;
    texture?: Laya.Texture;
    atlas?: Laya.AtlasResource;
    spine?: Laya.SpineTemplet;
    loading: boolean;
    callbacks: Array<{
        resolve: (resource: any) => void;
        reject: (error: string) => void;
    }>;
}

export class Res {
    private static _net: Net;
    private static _initialized: boolean = false;
    
    private static _packInfo: PackInfo | null = null;
    private static _packBlob: Blob | null = null;
    private static _packUrl: string = '';
    
    // 资源缓存（内存）
    private static _cache: Map<string, any> = new Map();
    
    // 资源分组信息
    // key: filePath, value: groupBaseName
    private static _fileToGroup: Map<string, string> = new Map();
    // key: groupBaseName, value: GroupInfo
    private static _groupInfo: Map<string, { type: 'spine' | 'atlas', files: string[] }> = new Map();
    // 正在加载的组
    private static _loading: Map<string, Array<(success: boolean) => void>> = new Map();

    // 进度信息
    private static _process: number = 0;
    private static _err: number = 0;
    private static _total: number = 0;
    
    // Promise 支持
    private static _urlPromise: Promise<PackInfo> | null = null;
    private static _urlResolve: ((info: PackInfo) => void) | null = null;
    private static _urlReject: ((error: string) => void) | null = null;

    /**
     * 初始化
     */
    static init(): void {
        if (Res._initialized) return;
        
        Res._net = new Net();
        Res._initialized = true;
    }

    /**
     * 加载.res文件
     */
    static url(url: string, forceOrCallback?: boolean | ((info: PackInfo) => void), callback?: (info: PackInfo) => void): void {
        Res.init();
        
        let onComplete: ((info: PackInfo) => void) | undefined;
        let force = false;
        
        if (typeof forceOrCallback === 'boolean') {
            force = forceOrCallback;
            onComplete = callback;
        } else if (typeof forceOrCallback === 'function') {
            onComplete = forceOrCallback;
        }
        
        if (!url.endsWith('.res')) {
            console.warn('仅支持.res格式文件');
            if (onComplete) onComplete(null as any);
            return;
        }
        
        Res._packUrl = url;
        
        // 创建 Promise
        Res._urlPromise = new Promise((resolve, reject) => {
            Res._urlResolve = resolve;
            Res._urlReject = reject;
        });
        
        // 下载并解析，使用持久化存储缓存
        Res._downloadAndParse(url, force, onComplete);
    }

    /**
     * Promise 链式调用支持
     */
    static then(onFulfilled: (info: PackInfo) => void, onRejected?: (error: string) => void): void {
        if (Res._urlPromise) {
            Res._urlPromise.then(onFulfilled).catch(onRejected || (() => {}));
        }
    }

    /**
     * 获取资源（双模式：带回调为异步，不带回调为同步）
     * @param path 资源路径
     * @param callback 可选回调函数，如果提供则为异步模式
     * @param type 可选，指定返回类型 ('blob' | 'auto')
     * @returns 同步模式下返回资源或资源集合
     */
    static get(path: string, type?: 'blob' | 'auto'): any;
    static get(path: string, callback: (resource: any) => void, type?: 'blob' | 'auto'): void;
    static get(path: string, arg2?: any, arg3?: any): any | void {
        let callback: ((resource: any) => void) | undefined;
        let type: 'blob' | 'auto' = 'auto';
        let typeProvided = false;

        if (typeof arg2 === 'function') {
            callback = arg2;
            if (typeof arg3 === 'string') {
                type = arg3 as any;
                typeProvided = true;
            }
        } else if (typeof arg2 === 'string') {
            type = arg2 as any;
            typeProvided = true;
        }

        // 如果未指定类型且路径包含后缀，默认为blob
        if (!typeProvided) {
            const fileName = path.split('/').pop();
            if (fileName && fileName.indexOf('.') !== -1) {
                type = 'blob';
            }
        }

        if (!Res._packInfo || !Res._packBlob) {
            if (callback) {
                callback(null);
                return;
            }
            return null;
        }
        
        // 优先检查是否直接请求资源组
        if (Res._groupInfo.has(path)) {
             if (callback) {
                 Res._getResourceAsync(path, callback, (err) => callback(null));
                 return;
             } else {
                 return Res._getResourceSync(path);
             }
        }
        
        const paths = Res._parsePath(path);
        const suffix = type === 'blob' ? '|blob' : '';
        
        if (callback) {
            // 异步模式
            if (paths.length === 0) {
                callback(null);
                return;
            }
            
            // 检查是否所有文件属于同一个组（例如请求的是目录，且目录下是Spine/Atlas组）
            if (paths.length > 1) {
                const firstGroup = Res._fileToGroup.get(paths[0]);
                if (firstGroup && paths.every(p => Res._fileToGroup.get(p) === firstGroup)) {
                    Res._getResourceAsync(firstGroup, callback, (err) => callback(null));
                    return;
                }
            }
            
            // 如果只有一个文件，直接返回该资源
            if (paths.length === 1) {
                Res._getResourceAsync(paths[0], (resource: any) => {
                    const finalRes = type === 'blob' ? Res._cache.get(paths[0] + suffix) : resource;
                    callback(finalRes);
                }, (error: string) => {
                    console.error(`加载资源失败 ${paths[0]}:`, error);
                    callback(null);
                });
                return;
            }

            // 如果有多个文件，返回对象字典
            const resources: { [key: string]: any } = {};
            let completed = 0;
            const total = paths.length;
            
            paths.forEach((filePath: string) => {
                Res._getResourceAsync(filePath, (resource: any) => {
                    // 使用文件名作为key
                    const fileName = filePath.split('/').pop() || filePath;
                    resources[fileName] = type === 'blob' ? Res._cache.get(filePath + suffix) : resource;
                    completed++;
                    if (completed === total) {
                        callback(resources);
                    }
                }, (error: string) => {
                    console.error(`加载资源失败 ${filePath}:`, error);
                    completed++;
                    if (completed === total) {
                        callback(resources);
                    }
                });
            });
        } else {
            // 同步模式：直接从缓存中获取
            if (paths.length === 0) return null;

            // 检查是否所有文件属于同一个组
            if (paths.length > 1) {
                const firstGroup = Res._fileToGroup.get(paths[0]);
                if (firstGroup && paths.every(p => Res._fileToGroup.get(p) === firstGroup)) {
                    return Res._getResourceSync(firstGroup);
                }
            }

            if (paths.length === 1) {
                const resource = Res._getResourceSync(paths[0]);
                if (resource && type === 'blob') {
                    return Res._cache.get(paths[0] + suffix);
                }
                return resource;
            }

            const resources: { [key: string]: any } = {};
            paths.forEach((filePath: string) => {
                const resource = Res._getResourceSync(filePath);
                if (resource) {
                    const fileName = filePath.split('/').pop() || filePath;
                    resources[fileName] = type === 'blob' ? Res._cache.get(filePath + suffix) : resource;
                }
            });
            return resources;
        }
    }

    /**
     * 预加载资源组（异步）
     * @param group 资源组名
     * @param force 是否强制重新下载
     * @param callback 完成回调
     */
    static down(group: string, force: boolean = false, callback?: (success: boolean) => void): void {
        const files = Res._getGroupFiles(group);
        if (files.length === 0) {
            callback?.(false);
            return;
        }
        
        let completed = 0;
        let hasError = false;
        
        files.forEach((filePath: string) => {
            // 检查缓存
            if (!force && Res._cache.has(filePath)) {
                completed++;
                if (completed === files.length) {
                    callback?.(!hasError);
                }
                return;
            }
            
            // 异步加载资源到缓存
            Res._loadResourceToCache(filePath, (success: boolean) => {
                if (!success) hasError = true;
                completed++;
                if (completed === files.length) {
                    callback?.(!hasError);
                }
            });
        });
    }

    /**
     * 预加载所有资源（异步）
     * @param callback 完成回调
     */
    static downRes(callback?: (successCount: number, errorCount: number, totalCount: number) => void): void {
        const allFiles = Res._getAllFiles();
        let successCount = 0;
        let errorCount = 0;
        let completed = 0;
        
        allFiles.forEach((filePath: string) => {
            Res._loadResourceToCache(filePath, (success: boolean) => {
                if (success) {
                    successCount++;
                } else {
                    errorCount++;
                }
                completed++;
                if (completed === allFiles.length) {
                    callback?.(successCount, errorCount, allFiles.length);
                }
            });
        });
    }

    /**
     * 获取资源配置
     */
    static getList(): any {
        return Res._packInfo;
    }

    /**
     * 获取加载进度
     */
    static getProcess(): { process: number; err: number; count: number } {
        return {
            process: Res._process,
            err: Res._err,
            count: Res._total
        };
    }

    /**
     * 清除缓存
     */
    static clearCache(callback?: () => void): void {
        Res._cache.clear();
        callback?.();
    }

    /**
     * 设置网络实例
     */
    static setNet(net: Net): void {
        Res._net = net;
    }

    static onProcessUpdate(process: number, err: number, count: number): void {
        const progress = count > 0 ? (process / count * 100).toFixed(2) : '0.00';
        console.log(`下载进度: ${process}/${count} (${progress}%), 错误: ${err}`);
    }

    static onDownloadProgress(url: string, percent: number, speed: number, loaded: number, total: number): void {
        const loadedStr = (loaded / 1024).toFixed(2);
        const totalStr = (total / 1024).toFixed(2);
        const speedStr = (speed / 1024).toFixed(2);
        console.log(`[下载] ${url}: ${percent}% | ${loadedStr}/${totalStr}KB | ${speedStr}KB/s`);
    }

    static onLoadComplete(key: string, resource: any): void {
    }

    // ==================== 私有方法 ====================

    /**
     * 分析资源，建立分组信息
     */
    private static _analyzeResources(): void {
        Res._fileToGroup.clear();
        Res._groupInfo.clear();
        
        const allFiles = Res._getAllFiles();
        const potentialGroups: Map<string, string[]> = new Map();

        // 1. 按目录+文件名(无后缀)分组
        allFiles.forEach(file => {
            const lastDot = file.lastIndexOf('.');
            if (lastDot === -1) return;
            const baseName = file.substring(0, lastDot);
            
            if (!potentialGroups.has(baseName)) {
                potentialGroups.set(baseName, []);
            }
            potentialGroups.get(baseName)!.push(file);
        });

        // 2. 识别 Spine 和 Atlas
        potentialGroups.forEach((files, baseName) => {
            const hasPng = files.some(f => f.endsWith('.png') || f.endsWith('.jpg'));
            const hasAtlas = files.some(f => f.endsWith('.atlas'));
            const hasSkel = files.some(f => f.endsWith('.skel') || f.endsWith('.sk') || f.endsWith('.json'));

            if (hasPng && hasAtlas) {
                let type: 'spine' | 'atlas' = 'atlas';
                if (hasSkel) {
                    type = 'spine';
                }
                
                Res._groupInfo.set(baseName, { type, files });
                
                files.forEach(f => {
                    Res._fileToGroup.set(f, baseName);
                });
            }
        });
        
        console.log(`[Res] 资源分析完成: 发现 ${Res._groupInfo.size} 个资源组`);
    }

    /**
     * 加载资源组
     */
    private static _loadGroup(groupName: string, callback: (success: boolean) => void): void {
        // 检查是否正在加载
        if (Res._loading.has(groupName)) {
            Res._loading.get(groupName)!.push(callback);
            return;
        }

        const info = Res._groupInfo.get(groupName);
        if (!info) {
            callback(false);
            return;
        }

        Res._loading.set(groupName, [callback]);

        const notify = (success: boolean) => {
            const callbacks = Res._loading.get(groupName);
            Res._loading.delete(groupName);
            if (callbacks) {
                callbacks.forEach(cb => cb(success));
            }
        };

        // 加载组内所有文件
        let completed = 0;
        let hasError = false;
        const blobs: Map<string, Blob> = new Map();

        const checkComplete = () => {
            if (completed < info.files.length) return;

            if (hasError) {
                notify(false);
                return;
            }

            // 所有文件加载完成，创建资源
            const lastSlash = groupName.lastIndexOf('/');
            const dirPath = lastSlash !== -1 ? groupName.substring(0, lastSlash) : '';
            const baseName = groupName.substring(lastSlash + 1);

            if (info.type === 'spine') {
                const pngFile = info.files.find(f => f.endsWith('.png') || f.endsWith('.jpg'));
                const atlasFile = info.files.find(f => f.endsWith('.atlas'));
                const skFile = info.files.find(f => f.endsWith('.skel') || f.endsWith('.sk') || f.endsWith('.json'));

                if (pngFile && atlasFile && skFile) {
                    Res._createSpineAndCache(
                        blobs.get(pngFile)!,
                        blobs.get(atlasFile)!,
                        blobs.get(skFile)!,
                        dirPath,
                        baseName,
                        notify
                    );
                } else {
                    notify(false);
                }
            } else {
                // Atlas
                const pngFile = info.files.find(f => f.endsWith('.png') || f.endsWith('.jpg'));
                const atlasFile = info.files.find(f => f.endsWith('.atlas'));
                
                if (pngFile && atlasFile) {
                    Res._createAtlasAndCache(
                        blobs.get(pngFile)!,
                        blobs.get(atlasFile)!,
                        dirPath,
                        baseName,
                        notify
                    );
                } else {
                    notify(false);
                }
            }
        };

        info.files.forEach(file => {
             Res._getFileBlob(file, (blob) => {
                 blobs.set(file, blob);
                 completed++;
                 checkComplete();
             }, () => {
                 hasError = true;
                 completed++;
                 checkComplete();
             });
        });
    }

    private static _downloadAndParse(url: string, force: boolean, onComplete?: (info: PackInfo) => void): void {
        Res._executeDownload(url, force, onComplete);
    }

    private static _executeDownload(url: string, force: boolean, onComplete?: (info: PackInfo) => void): void {
        Res._net.download(url, {
            key: `res_file_${url}`,
            force: force,
            cache: true,
            onProgress: (percent: number, speed: number, loaded: number, total: number) => {
                Res.onDownloadProgress(url, percent, speed, loaded, total);
            },
            onComplete: (blob: Blob) => {
                if (!blob) {
                    const error = '下载的包为空';
                    console.error(error);
                    if (onComplete) onComplete(null as any);
                    if (Res._urlReject) Res._urlReject(error);
                    return;
                }
                
                Res._packBlob = blob;
                
                // 解析头部
                Code.parsePack(
                    blob,
                    (packInfo: PackInfo) => {
                        Res._packInfo = packInfo;
                        Res._analyzeResources();
                        
                        console.log('包信息已解析');
                        if (onComplete) onComplete(packInfo);
                        if (Res._urlResolve) Res._urlResolve(packInfo);
                    },
                    (error: string) => {
                        console.error('解析包失败:', error);
                        if (onComplete) onComplete(null as any);
                        if (Res._urlReject) Res._urlReject(error);
                    }
                );
            },
            onError: (msg: string) => {
                console.error('下载失败:', msg);
                if (onComplete) onComplete(null as any);
                if (Res._urlReject) Res._urlReject(`下载失败: ${msg}`);
            }
        });
    }

    /**
     * 解析路径，返回文件路径数组
     */
    private static _parsePath(path: string): string[] {
        if (!Res._packInfo?.files) return [];
        
        const parts = path.split('/');
        let current: any = Res._packInfo.files;
        
        // 尝试精确匹配目录或文件
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            if (current[part]) {
                current = current[part];
                
                if (i === parts.length - 1) {
                    if (Array.isArray(current) && current.length === 2) {
                        // 精确匹配到文件
                        return [path];
                    } else if (typeof current === 'object') {
                        // 精确匹配到目录，收集目录下所有文件
                        return Res._collectFilesFromNode(current, path);
                    }
                }
            } else {
                // 路径中断，可能是需要不带后缀匹配
                // 只有在最后一部分才尝试不带后缀匹配
                if (i === parts.length - 1) {
                    // 尝试在 current 中查找以 part 开头的文件
                    const matches: string[] = [];
                    const prefix = part + '.';
                    const currentPath = parts.slice(0, i).join('/');
                    const basePath = currentPath ? currentPath + '/' : '';

                    for (const key in current) {
                        if (key.startsWith(prefix)) {
                            const val = current[key];
                            if (Array.isArray(val) && val.length === 2) {
                                matches.push(basePath + key);
                            }
                        }
                    }
                    return matches;
                }
                
                return [];
            }
        }
        
        return [];
    }

    /**
     * 从节点收集所有文件路径
     */
    private static _collectFilesFromNode(node: any, basePath: string): string[] {
        const files: string[] = [];
        
        const collect = (obj: any, path: string) => {
            for (const key in obj) {
                const value = obj[key];
                const currentPath = path ? `${path}/${key}` : key;
                
                if (Array.isArray(value) && value.length === 2) {
                    files.push(currentPath);
                } else if (typeof value === 'object') {
                    collect(value, currentPath);
                }
            }
        };
        
        collect(node, basePath);
        return files;
    }

    /**
     * 同步获取资源（从缓存）
     */
    private static _getResourceSync(filePath: string): any {
        // 直接从缓存中获取
        return Res._cache.get(filePath) || null;
    }

    /**
     * 异步获取资源
     */
    private static _getResourceAsync(filePath: string, onSuccess: (resource: any) => void, onError: (error: string) => void): void {
        // 检查缓存
        const cached = Res._cache.get(filePath);
        if (cached) {
            onSuccess(cached);
            return;
        }
        
        // 加载资源到缓存
        Res._loadResourceToCache(filePath, (success: boolean) => {
            if (success) {
                const res = Res._cache.get(filePath);
                if (res) {
                    onSuccess(res);
                } else {
                    onError(`资源加载成功但未找到: ${filePath}`);
                }
            } else {
                onError(`加载资源失败: ${filePath}`);
            }
        });
    }

    /**
     * 加载资源到缓存（核心方法）
     */
    private static _loadResourceToCache(filePath: string, callback: (success: boolean) => void): void {
        // 1. Check if it's a group key
        if (Res._groupInfo.has(filePath)) {
            Res._loadGroup(filePath, callback);
            return;
        }

        // 2. Check if it's a file in a group
        const groupName = Res._fileToGroup.get(filePath);
        if (groupName) {
            Res._loadGroup(groupName, callback);
            return;
        }

        // 3. Normal file load
        // 直接从包中解压，不使用持久化存储
        Code.decompressFileByName(
            Res._packBlob!,
            Res._packInfo!,
            filePath,
            (result: DecompressResult) => {
                // 处理资源并缓存
                Res._processAndCacheResource(filePath, result.blob, callback);
            },
            (error: string) => {
                console.error(`解压文件失败 ${filePath}:`, error);
                callback(false);
            }
        );
    }

    /**
     * 处理资源并缓存
     */
    private static _processAndCacheResource(filePath: string, blob: Blob, callback: (success: boolean) => void): void {
        // Cache the raw blob for 'blob' type requests
        Res._cache.set(filePath + '|blob', blob);
        
        const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
        const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
        const baseName = fileName.substring(0, fileName.lastIndexOf('.'));
        
        // 获取目录下所有文件
        const dirFiles = Res._getFilesInDirectory(parentDir);
        
        // 检查资源类型
        if (dirFiles.indexOf(`${parentDir}/${baseName}.png`) !== -1 &&
            dirFiles.indexOf(`${parentDir}/${baseName}.atlas`) !== -1) {
            
            // 检查是否是Spine资源
            const hasSk = dirFiles.some(f => f.endsWith('.skel') || f.endsWith('.sk') || f.endsWith('.json'));
            
            if (hasSk) {
                // Spine资源
                Res._loadSpineToCache(parentDir, baseName, callback);
            } else {
                // Atlas资源
                Res._loadAtlasToCache(parentDir, baseName, callback);
            }
        } else if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
            // 图片资源
            Res._loadTextureToCache(blob, filePath, callback);
        } else {
            // 其他二进制资源
            Res._cache.set(filePath, blob);
            callback(true);
        }
    }

    /**
     * 加载纹理到缓存
     */
    private static _loadTextureToCache(blob: Blob, filePath: string, callback: (success: boolean) => void): void {
        const url = URL.createObjectURL(blob);
        
        Laya.loader.load({
            url,
            type: Laya.Loader.IMAGE
        }).then((texture: Laya.Texture) => {
            URL.revokeObjectURL(url);
            
            Res._cache.set(filePath, texture);
            callback(true);
        }).catch((error: any) => {
            URL.revokeObjectURL(url);
            console.error(`加载纹理失败 ${filePath}:`, error);
            callback(false);
        });
    }

    /**
     * 加载Atlas到缓存
     */
    private static _loadAtlasToCache(dirPath: string, baseName: string, callback: (success: boolean) => void): void {
        const pngPath = `${dirPath}/${baseName}.png`;
        const atlasPath = `${dirPath}/${baseName}.atlas`;
        
        let pngBlob: Blob | null = null;
        let atlasBlob: Blob | null = null;
        let completed = 0;
        
        const checkComplete = () => {
            if (completed === 2 && pngBlob && atlasBlob) {
                Res._createAtlasAndCache(pngBlob, atlasBlob, dirPath, baseName, callback);
            }
        };
        
        // 加载图片
        Res._getFileBlob(pngPath, (blob: Blob) => {
            pngBlob = blob;
            completed++;
            checkComplete();
        }, () => {
            completed++;
            checkComplete();
        });
        
        // 加载atlas
        Res._getFileBlob(atlasPath, (blob: Blob) => {
            atlasBlob = blob;
            completed++;
            checkComplete();
        }, () => {
            completed++;
            checkComplete();
        });
    }

    /**
     * 加载Spine到缓存
     */
    private static _loadSpineToCache(dirPath: string, baseName: string, callback: (success: boolean) => void): void {
        const dirFiles = Res._getFilesInDirectory(dirPath);
        
        const pngFile = dirFiles.find(f => f.endsWith('.png'));
        const atlasFile = dirFiles.find(f => f.endsWith('.atlas'));
        const skFile = dirFiles.find(f => f.endsWith('.skel') || f.endsWith('.sk') || f.endsWith('.json'));
        
        if (!pngFile || !atlasFile || !skFile) {
            callback(false);
            return;
        }
        
        let pngBlob: Blob | null = null;
        let atlasBlob: Blob | null = null;
        let skBlob: Blob | null = null;
        let completed = 0;
        
        const checkComplete = () => {
            if (completed === 3 && pngBlob && atlasBlob && skBlob) {
                Res._createSpineAndCache(pngBlob, atlasBlob, skBlob, dirPath, baseName, callback);
            }
        };
        
        // 并行加载三个文件
        Res._getFileBlob(pngFile, (blob: Blob) => {
            pngBlob = blob;
            completed++;
            checkComplete();
        });
        
        Res._getFileBlob(atlasFile, (blob: Blob) => {
            atlasBlob = blob;
            completed++;
            checkComplete();
        });
        
        Res._getFileBlob(skFile, (blob: Blob) => {
            skBlob = blob;
            completed++;
            checkComplete();
        });
    }

    /**
     * 创建Atlas并缓存
     */
    private static _createAtlasAndCache(pngBlob: Blob, atlasBlob: Blob, dirPath: string, baseName: string, callback: (success: boolean) => void): void {
        const imageUrl = URL.createObjectURL(pngBlob);
        
        Laya.loader.load({
            url: imageUrl,
            type: Laya.Loader.IMAGE
        }).then((texture: Laya.Texture) => {
            // 读取atlas文件
            const reader = new FileReader();
            reader.readAsText(atlasBlob, "utf-8");
            
            reader.onload = () => {
                try {
                    const atlasText = reader.result as string;
                    const atlasJson = JSON.parse(atlasText);
                    
                    // 创建子纹理
                    const subTextures = Res._createSubTextures(atlasJson, texture);
                    
                    // 创建AtlasResource
                    const atlasResource = new Laya.AtlasResource(
                        `${dirPath}/${baseName}_atlas`,
                        [texture],
                        subTextures
                    );
                    
                    if (atlasJson.animation) {
                        atlasResource.animation = atlasJson.animation;
                    }
                    
                    // 缓存整个资源组
                    Res._cache.set(`${dirPath}/${baseName}.png`, texture);
                    Res._cache.set(`${dirPath}/${baseName}.png|blob`, pngBlob);
                    Res._cache.set(`${dirPath}/${baseName}.atlas`, atlasBlob);
                    Res._cache.set(`${dirPath}/${baseName}.atlas|blob`, atlasBlob);
                    Res._cache.set(`${dirPath}/${baseName}`, atlasResource);
                    
                    callback(true);
                    URL.revokeObjectURL(imageUrl);
                } catch (error: any) {
                    URL.revokeObjectURL(imageUrl);
                    console.error(`创建图集失败 ${dirPath}/${baseName}:`, error);
                    callback(false);
                }
            };
            
            reader.onerror = () => {
                URL.revokeObjectURL(imageUrl);
                callback(false);
            };
        }).catch((error: any) => {
            URL.revokeObjectURL(imageUrl);
            console.error(`加载图像失败 ${dirPath}/${baseName}:`, error);
            callback(false);
        });
    }

    /**
 * 创建Spine并缓存
 */
private static _createSpineAndCache(
    pngBlob: Blob, 
    atlasBlob: Blob, 
    skBlob: Blob, 
    dirPath: string, 
    baseName: string, 
    callback: (success: boolean) => void
): void {
    const imageUrl = URL.createObjectURL(pngBlob);
    const skUrl = URL.createObjectURL(skBlob);
    
    // 读取skel文件
    const skReader = new FileReader();
    skReader.readAsText(skBlob, "utf-8");
    
    skReader.onload = () => {
        const rawSkText = skReader.result as string;
        
        // 读取atlas文件内容
        const asReader = new FileReader();
        asReader.readAsText(atlasBlob, "utf-8");
        
        asReader.onload = () => {
            const rawAsText = asReader.result as string;
            console.log( `${dirPath}/${baseName}`, rawAsText);
            if (!rawAsText) {
                URL.revokeObjectURL(imageUrl);
                URL.revokeObjectURL(skUrl);
                callback(false);
                return;
            }

            if (!rawSkText) {
                URL.revokeObjectURL(imageUrl);
                URL.revokeObjectURL(skUrl);
                callback(false);
                return;
            }
            
            const atlasPages: Array<Laya.ILoadURL> = [];
            let templet = new Laya.SpineTemplet();
            
            // 创建TextureAtlas
            // @ts-ignore - spine库可能需要额外引入
            let atlas = new spine.TextureAtlas(rawAsText, (path: string) => {
                atlasPages.push({
                    url: imageUrl, 
                    type: Laya.Loader.TEXTURE2D,
                    propertyParams: {
                        premultiplyAlpha: false
                    },
                    constructParams: [0, 0, Laya.TextureFormat.R8G8B8A8, false, false, true, false]
                });
                return new Laya.SpineTexture(null);
            });

            Laya.loader.load(atlasPages, null).then((res: Array<Laya.Texture2D>) => {
                let textures: Record<string, Laya.Texture2D> = {};
                let premultipliedAlpha = true;

                // 设置纹理
                for (let i = 0; i < res.length; i++) {
                    let tex = res[i];
                    if (tex) tex._addReference();
                    let pages = atlas.pages;
                    let page = pages[i];
                    premultipliedAlpha = page.pma || (tex && tex._premultiplyAlpha && premultipliedAlpha);

                    // @ts-ignore
                    if (page.texture && page.texture.realTexture) {
                        // @ts-ignore
                        page.texture.realTexture = tex;
                        // @ts-ignore
                        page.texture.setFilters(page.minFilter, page.magFilter);
                        // @ts-ignore
                        page.texture.setWraps(page.uWrap, page.vWrap);
                    }
                    page.width = page.width || (tex ? tex.width : 0);
                    page.height = page.height || (tex ? tex.height : 0);
                    textures[page.name] = tex;
                }

                // 计算UV坐标
                let regions = atlas.regions;
                for (const region of regions) {
                    let page = region.page;
                    if (page.width > 0 && page.height > 0) {
                        region.u = region.x / page.width;
                        region.v = region.y / page.height;
                        // @ts-ignore
                        if (region.rotate) {
                            region.u2 = (region.x + region.height) / page.width;
                            region.v2 = (region.y + region.width) / page.height;
                        } else {
                            region.u2 = (region.x + region.width) / page.width;
                            region.v2 = (region.y + region.height) / page.height;
                        }
                    }
                }

                // 解析Spine数据
                try {
                    // @ts-ignore
                    templet._parse(rawSkText, atlas, textures, premultipliedAlpha);
                    
                    // 缓存资源
                    const cacheKey = `${dirPath}/${baseName}`;
                    Res._cache.set(cacheKey, templet);
                    
                    // 缓存原始数据
                    Res._cache.set(`${dirPath}/${baseName}.png|blob`, pngBlob);
                    Res._cache.set(`${dirPath}/${baseName}.atlas`, atlasBlob);
                    Res._cache.set(`${dirPath}/${baseName}.atlas|blob`, atlasBlob);
                    
                    // 根据文件类型确定缓存键
                    const skFileName = skBlob.type.includes('skel') || 
                                     (skBlob as any).name?.endsWith('.skel') ? 
                                     `${baseName}.skel` : `${baseName}.json`;
                    Res._cache.set(`${dirPath}/${skFileName}`, skBlob);
                    Res._cache.set(`${dirPath}/${skFileName}|blob`, skBlob);
                    
                    // 同时缓存纹理
                    if (res.length > 0 && res[0]) {
                        Res._cache.set(`${dirPath}/${baseName}.png`, res[0]);
                        Res._cache.set(`${dirPath}/${baseName}_texture`, res[0]);
                    }
                    
                    URL.revokeObjectURL(imageUrl);
                    URL.revokeObjectURL(skUrl);
                    callback(true);
                } catch (parseError: any) {
                    console.error(`解析Spine数据失败 ${dirPath}/${baseName}:`, parseError);
                    URL.revokeObjectURL(imageUrl);
                    URL.revokeObjectURL(skUrl);
                    callback(false);
                }
            }).catch((error: any) => {
                URL.revokeObjectURL(imageUrl);
                URL.revokeObjectURL(skUrl);
                console.error(`加载纹理失败 ${dirPath}/${baseName}:`, error);
                callback(false);
            });
        };
        
        asReader.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            URL.revokeObjectURL(skUrl);
            console.error(`读取atlas文件失败 ${dirPath}/${baseName}.atlas`);
            callback(false);
        };
    };
    
    skReader.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        URL.revokeObjectURL(skUrl);
        console.error(`读取骨骼文件失败 ${dirPath}/${baseName}`);
        callback(false);
    };
}

    /**
     * 获取文件Blob
     */
    private static _getFileBlob(filePath: string, onSuccess: (blob: Blob) => void, onError?: () => void): void {
        // 检查内存缓存
        const cached = Res._cache.get(filePath);
        if (cached instanceof Blob) {
            onSuccess(cached);
            return;
        }
        
        // 从包中解压
        Code.decompressFileByName(
            Res._packBlob!,
            Res._packInfo!,
            filePath,
            (result: DecompressResult) => {
                onSuccess(result.blob);
            },
            () => {
                onError?.();
            }
        );
    }

    /**
     * 获取目录下的所有文件
     */
    private static _getFilesInDirectory(dirPath: string): string[] {
        if (!Res._packInfo?.files) return [];
        
        const parts = dirPath.split('/');
        let current: any = Res._packInfo.files;
        
        for (const part of parts) {
            if (current[part]) {
                current = current[part];
            } else {
                return [];
            }
        }
        
        const files: string[] = [];
        const collect = (obj: any, path: string) => {
            for (const key in obj) {
                const value = obj[key];
                const currentPath = path ? `${path}/${key}` : key;
                
                if (Array.isArray(value) && value.length === 2) {
                    files.push(currentPath);
                } else if (typeof value === 'object') {
                    collect(value, currentPath);
                }
            }
        };
        
        collect(current, dirPath);
        return files;
    }

    /**
     * 获取组内的所有文件
     */
    private static _getGroupFiles(group: string): string[] {
        return Res._getFilesInDirectory(group);
    }

    /**
     * 获取所有文件
     */
    private static _getAllFiles(): string[] {
        if (!Res._packInfo?.files) return [];
        return Res._collectFilesFromNode(Res._packInfo.files, '');
    }

    /**
     * 创建子纹理
     */
    private static _createSubTextures(atlasJson: any, texture: Laya.Texture): Laya.Texture[] {
        const subTextures: Laya.Texture[] = [];
        const scaleRate = parseFloat(atlasJson.meta?.scale || "1");
        texture.scaleRate = scaleRate;

        for (const frameName in atlasJson.frames) {
            const frameData = atlasJson.frames[frameName];
            const frame = frameData.frame;

            const subTexture = Laya.Texture.create(
                texture,
                frame.x,
                frame.y,
                frame.w,
                frame.h,
                frameData.spriteSourceSize?.x || 0,
                frameData.spriteSourceSize?.y || 0,
                frameData.sourceSize?.w || frame.w,
                frameData.sourceSize?.h || frame.h
            );

            subTexture._sizeGrid = frameData.sizeGrid;
            subTexture._stateNum = frameData.stateNum;
            subTexture.url = `${texture.url}_${frameName}`;
            
            Laya.loader.cacheRes(subTexture.url, subTexture);
            subTextures.push(subTexture);
        }

        return subTextures;
    }
}