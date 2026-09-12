/**
 * Res - 资源管理器，负责多包资源加载、包索引解析、内存缓存
 * 支持 Spine/Atlas 资源组识别，提供下载进度/错误/完成回调与 Promise 接口
 */
// Res.ts
import { Net } from "./net";
import { Code, PackInfo } from "./code";

// ========== 简化的索引结构 ==========
interface PackIndex {
    v: string;                     // 包的包头版本
    url: string;                   // 服务器地址
    etag?: string;                 // 服务器 ETag
    lm?: string;                   // 服务器 Last-Modified
    files: Record<string, number>; // 文件路径 -> 大小 (bytes)
}

export class Res {
    public static _net: Net;
    private static _initialized: boolean = false;

    // 多包管理
    private static _packMap: Map<string, { index: PackIndex; url: string }> = new Map();
    private static _activePackName: string = '';

    // 内存缓存：文件路径（格式：包名@文件路径）-> 解析后的引擎对象
    private static _cache: Map<string, any> = new Map();

    // 资源组识别（Spine/Atlas），key 为组名（不包含包名前缀）
    private static _groupInfo: Map<string, { type: 'spine' | 'atlas', files: string[] }> = new Map();
    private static _fileToGroup: Map<string, string> = new Map();

    // Promise 支持（最近一次 url 调用）
    private static _urlPromise: Promise<PackInfo> | null = null;
    private static _urlResolve: ((info: PackInfo) => void) | null = null;
    private static _urlReject: ((error: string) => void) | null = null;

    // 回调钩子（外部可覆盖）
    static onDownloadProgress?: (url: string, percent: number, speed: number, loaded: number, total: number) => void;

    // ==================== 初始化 ====================
    static init(): void {
        if (Res._initialized) return;
        Res._net = new Net();
        Res._initialized = true;
        // console.log('[Res] 初始化完成');
    }

    // ==================== 加载 .res 包（含自动修复） ====================
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

        if (!url.endsWith('.res') && !url.endsWith('.br')) {
            console.warn('[Res] 仅支持 .res / .br 格式文件');
            onComplete?.(null as any);
            return;
        }

        const packName = Res._extractPackName(url);
        // console.log(`[Res] 加载资源包: ${url}, 包名: ${packName}`);

        Res._urlPromise = new Promise((resolve, reject) => {
            Res._urlResolve = resolve;
            Res._urlReject = reject;
        });

        const indexKey = `res_idx::${packName}`;

        // 1. 检查本地索引
        Res._net.storage.get(indexKey, (cached: string | null) => {
            if (cached && !force) {
                try {
                    const idx: PackIndex = JSON.parse(cached);
                    if (!idx.url || idx.url !== url) {
                        idx.url = url;
                        Res._net.storage.set(indexKey, JSON.stringify(idx), () => {});
                    }
                    Res._packMap.set(packName, { index: idx, url });
                    Res._activePackName ? packName : undefined;
                    // console.log(`[Res] 找到本地索引 [${packName}]，文件数: ${Object.keys(idx.files).length}, 版本: ${idx.v}`);

                    // 2. 校验本地文件完整性
                    Res.check(idx, packName).then(result => {
                        if (result.valid) {
                            console.log('[Res] 本地文件完整，直接使用索引');
                            Res._analyzeGroupsFromIndex(packName);
                            const fakePackInfo = { files: Res._buildFileTree(idx) } as PackInfo;
                            onComplete?.(fakePackInfo);
                            Res._urlResolve?.(fakePackInfo);
                        } else {
                            console.warn('[Res] 本地文件缺失或不匹配，强制重新下载', result);
                            Res._downloadAndExtract(url, false, packName, onComplete);
                        }
                    });
                } catch (e) {
                    console.warn('[Res] 索引解析失败，重新下载', e);
                    Res._downloadAndExtract(url, true, packName, onComplete);
                }
                return;
            }

            console.log(`[Res] 无本地索引或强制刷新，开始下载`);
            Res._downloadAndExtract(url, force, packName, onComplete);
        });
    }

    static then(onFulfilled: (info: PackInfo) => void, onRejected?: (error: string) => void): void {
        if (Res._urlPromise) {
            Res._urlPromise.then(onFulfilled).catch(onRejected || (() => { }));
        }
    }

    private static _extractPackName(url: string): string {
        const fileName = url.substring(url.lastIndexOf('/') + 1);
        return fileName.replace(/\.(res|br)$/, '');
    }

    private static _buildFileTree(index: PackIndex): any {
        const tree: any = {};
        for (const filePath in index.files) {
            const parts = filePath.split('/');
            let current = tree;
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current[part]) current[part] = {};
                current = current[part];
            }
            const fileName = parts[parts.length - 1];
            current[fileName] = [0, index.files[filePath]];
        }
        return tree;
    }

    // ==================== 下载并提取所有文件 ====================
    private static _downloadAndExtract(url: string, force: boolean, packName: string, onComplete?: (info: PackInfo) => void): void {
        Res._net.download(url, {
            key: `res_file_${url}`,
            force,
            cache: true,
            onProgress: (percent: number, s: number, l: number, t: number) => {
                console.log(url, percent, s, l, t)
                Res.onDownloadProgress?.(url, percent, s, l, t);
            },
            onComplete: (blob: Blob) => {
                if (!blob) {
                    const err = '下载的包为空';
                    console.error('[Res]', err);
                    onComplete?.(null as any);
                    Res._urlReject?.(err);
                    return;
                }
                console.log(`[Res] 下载完成，大小: ${blob.size} bytes`);

                const isBr = url.endsWith('.br');
                const proceed = (containerBlob: Blob, containerBuffer?: ArrayBuffer) => {
                    Code.parsePack(containerBlob,
                        (packInfo: PackInfo) => {
                            // console.log(`[Res] 包头解析成功，版本: ${packInfo.version}`);
                            const allFiles = Res._getAllFilesFromPackInfo(packInfo);
                            // console.log(`[Res] 包内文件总数: ${allFiles.length}`);

                            const index: PackIndex = {
                                v: packInfo.version || '1.0',
                                url,
                                files: {}
                            };

                            const container = containerBuffer!;
                            const extractPromises = allFiles.map(filePath => {
                                return new Promise<void>((resolve) => {
                                    const fileKey = `${packName}@${filePath}`;
                                    const fileBlob = Code.extractFile(container, packInfo, filePath);
                                    if (!fileBlob) {
                                        console.error(`[Res] 提取失败: ${fileKey}`);
                                        resolve();
                                        return;
                                    }
                                    Res._net.storage.setFile(fileKey, fileBlob, (success: boolean) => {
                                        if (success) {
                                            index.files[filePath] = fileBlob.size;
                                            // console.log(`[Res] 文件已存储: ${fileKey} (${fileBlob.size} bytes)`);
                                        } else {
                                            console.error(`[Res] 存储失败: ${fileKey}`);
                                        }
                                        resolve();
                                    });
                                });
                            });

                            Promise.all(extractPromises).then(() => {
                                // console.log(`[Res] 所有文件提取完成，成功 ${Object.keys(index.files).length} 个`);
                                Res._packMap.set(packName, { index, url });
                                Res._activePackName = packName;
                                const indexKey = `res_idx::${packName}`;
                                const saveIndex = () => {
                                    Res._net.storage.set(indexKey, JSON.stringify(index), () => {
                                        // console.log('[Res] 索引已保存');
                                        Res._net.cRemove(`res_file_${url}`, () => {
                                            console.log('[Res] 整包 Blob 已删除');
                                        });
                                        Res._analyzeGroupsFromIndex(packName);
                                        const fakePackInfo = { files: Res._buildFileTree(index) } as PackInfo;
                                        onComplete?.(fakePackInfo);
                                        Res._urlResolve?.(fakePackInfo);
                                    });
                                };
                                Res._fetchServerInfo(url, (info) => {
                                    if (info.etag) index.etag = info.etag;
                                    if (info.lm) index.lm = info.lm;
                                    saveIndex();
                                });
                            });
                        },
                        (error) => {
                            console.error('[Res] 解析包失败:', error);
                            onComplete?.(null as any);
                            Res._urlReject?.(error);
                        }
                    );
                };

                if (isBr) {
                    console.log('[Res] 检测到 .br，开始 Brotli 解压');
                    Code.decompressBr(blob, (containerBuffer: ArrayBuffer) => {
                        console.log(`[Res] Brotli 解压完成，容器大小: ${containerBuffer.byteLength} bytes`);
                        proceed(new Blob([containerBuffer]), containerBuffer);
                    }, (err: string) => {
                        console.error('[Res] Brotli 解压失败:', err);
                        onComplete?.(null as any);
                        Res._urlReject?.(err);
                    });
                } else {
                    const reader = new FileReader();
                    reader.onload = () => proceed(blob, reader.result as ArrayBuffer);
                    reader.onerror = () => { onComplete?.(null as any); Res._urlReject?.('读取容器失败'); };
                    reader.readAsArrayBuffer(blob);
                }
            },
            onError: (msg: string) => {
                console.error('[Res] 下载失败:', msg);
                onComplete?.(null as any);
                Res._urlReject?.(msg);
            }
        });
    }

    private static _getAllFilesFromPackInfo(packInfo: PackInfo): string[] {
        const files: string[] = [];
        const collect = (obj: any, path: string) => {
            for (const key in obj) {
                const val = obj[key];
                const curPath = path ? `${path}/${key}` : key;
                if (Array.isArray(val) && val.length === 2) {
                    files.push(curPath);
                } else if (typeof val === 'object') {
                    collect(val, curPath);
                }
            }
        };
        collect(packInfo.files, '');
        return files;
    }

    private static _analyzeGroupsFromIndex(packName: string): void {
        Res._groupInfo.clear();
        Res._fileToGroup.clear();
        const packData = Res._packMap.get(packName);
        if (!packData) return;
        const index = packData.index;

        const potentialGroups: Map<string, string[]> = new Map();
        for (const filePath in index.files) {
            const lastDot = filePath.lastIndexOf('.');
            if (lastDot === -1) continue;
            const baseName = filePath.substring(0, lastDot);
            if (!potentialGroups.has(baseName)) potentialGroups.set(baseName, []);
            potentialGroups.get(baseName)!.push(filePath);
        }

        potentialGroups.forEach((files, baseName) => {
            const hasPng = files.some(f => f.endsWith('.png') || f.endsWith('.jpg'));
            const hasAtlas = files.some(f => f.endsWith('.atlas'));
            const hasSkel = files.some(f => f.endsWith('.skel') || f.endsWith('.sk') || f.endsWith('.json'));
            if (hasPng && hasAtlas) {
                const type: 'spine' | 'atlas' = hasSkel ? 'spine' : 'atlas';
                Res._groupInfo.set(baseName, { type, files });
                files.forEach(f => Res._fileToGroup.set(f, baseName));
            }
        });
        // console.log(`[Res] 识别到 ${Res._groupInfo.size} 个资源组 (包: ${packName})`);
    }

    // ==================== 完整性校验 ====================
    static check(externalIndex?: PackIndex, packName?: string): Promise<{ valid: boolean; missing: string[]; sizeMismatch: string[] }> {
        return new Promise((resolve) => {
            let targetIndex = externalIndex;
            let targetPackName = packName;
            if (!targetIndex) {
                if (Res._activePackName) {
                    targetPackName = Res._activePackName;
                    targetIndex = Res._packMap.get(targetPackName)?.index;
                } else {
                    const first = Res._packMap.entries().next().value;
                    if (first) {
                        targetPackName = first[0];
                        targetIndex = first[1].index;
                    }
                }
            }
            if (!targetIndex || !targetPackName) {
                resolve({ valid: false, missing: [], sizeMismatch: [] });
                return;
            }

            const missing: string[] = [];
            const sizeMismatch: string[] = [];
            const files = Object.keys(targetIndex.files);
            let pending = files.length;

            if (pending === 0) {
                resolve({ valid: true, missing: [], sizeMismatch: [] });
                return;
            }

            // console.log(`[Res] 开始校验 ${files.length} 个文件 (包: ${targetPackName})...`);

            files.forEach(filePath => {
                const fileKey = `${targetPackName}@${filePath}`;
                const expectedSize = targetIndex.files[filePath];

                Res._net.storage.getFile(fileKey, (blob: Blob | null) => {
                    if (!blob) {
                        console.warn(`[Res] 缺失文件: ${fileKey}`);
                        missing.push(filePath);
                    } else if (blob.size !== expectedSize) {
                        console.warn(`[Res] 大小不匹配: ${fileKey} (期望 ${expectedSize}, 实际 ${blob.size})`);
                        sizeMismatch.push(filePath);
                    }
                    if (--pending === 0) {
                        const valid = missing.length === 0 && sizeMismatch.length === 0;
                        // console.log(`[Res] 校验完成: ${valid ? '完整' : '不完整'} (缺失 ${missing.length}, 不匹配 ${sizeMismatch.length})`);
                        resolve({ valid, missing, sizeMismatch });
                    }
                });
            });
        });
    }

    // ==================== 版本对比 ====================

    /**
     * 对比本地包和服务器包版本（通过 HEAD 请求获取 ETag/Last-Modified，不下载文件）
     * - 无 url：对比所有本地包
     * - 有 url：对比指定包
     */
    static vers(url: string, cb: (result: { packName: string; url: string; localEtag: string | null; serverEtag: string | null; localLm: string | null; serverLm: string | null; needUpdate: boolean }) => void): void;
    static vers(cb: (results: { packName: string; url: string; localEtag: string | null; serverEtag: string | null; localLm: string | null; serverLm: string | null; needUpdate: boolean }[]) => void): void;
    static vers(arg1: any, arg2?: any): void {
        Res.init();
        if (typeof arg1 === 'function') {
            const cb = arg1 as (results: any[]) => void;
            Res._net.storage.getKeys((keys) => {
                const idxKeys = keys.dataKeys.filter((k: string) => k.startsWith('res_idx::'));
                if (idxKeys.length === 0) { cb([]); return; }
                const results: any[] = [];
                let pending = idxKeys.length;
                const done = () => { if (--pending === 0) cb(results); };
                idxKeys.forEach((ik: string) => {
                    Res._net.storage.get(ik, (str: string | null) => {
                        if (!str) { done(); return; }
                        try {
                            const idx: PackIndex = JSON.parse(str);
                            const packName = ik.substring('res_idx::'.length);
                            const serverUrl = idx.url || '';
                            if (!serverUrl) { done(); return; }
                            Res._fetchServerInfo(serverUrl, (info) => {
                                const needUpdate = (info.etag && idx.etag && info.etag !== idx.etag) ||
                                    (!info.etag && info.lm && idx.lm && info.lm !== idx.lm);
                                results.push({ packName, url: serverUrl, localEtag: idx.etag || null, serverEtag: info.etag || null, localLm: idx.lm || null, serverLm: info.lm || null, needUpdate });
                                done();
                            });
                        } catch { done(); }
                    });
                });
            });
        } else {
            const url = arg1 as string;
            const cb = arg2 as (result: any) => void;
            const packName = Res._extractPackName(url);
            const indexKey = `res_idx::${packName}`;
            Res._net.storage.get(indexKey, (str: string | null) => {
                let localEtag: string | null = null, localLm: string | null = null;
                if (str) {
                    try { const idx = JSON.parse(str) as PackIndex; localEtag = idx.etag || null; localLm = idx.lm || null; } catch {}
                }
                Res._fetchServerInfo(url, (info) => {
                    const needUpdate = (info.etag && localEtag && info.etag !== localEtag) ||
                        (!info.etag && info.lm && localLm && info.lm !== localLm);
                    cb({ packName, url, localEtag, serverEtag: info.etag || null, localLm, serverLm: info.lm || null, needUpdate });
                });
            });
        }
    }

    /** 通过 HEAD 请求获取服务器文件信息（ETag/Last-Modified，不触发下载） */
    private static _fetchServerInfo(url: string, cb: (info: { etag: string | null; lm: string | null }) => void): void {
        fetch(url, { method: 'HEAD' })
            .then(res => {
                cb({ etag: res.headers.get('ETag'), lm: res.headers.get('Last-Modified') });
            })
            .catch(() => cb({ etag: null, lm: null }));
    }


    // ==================== 异步获取资源（加载并缓存） ====================
    static get(path: string, type?: 'blob' | 'auto'): Promise<any>;
    static get(path: string, callback: (resource: any) => void, type?: 'blob' | 'auto'): void;
    static get(path: string, arg2?: any, arg3?: any): Promise<any> | void {
        let callback: ((resource: any) => void) | undefined;
        let type: 'blob' | 'auto' = 'auto';

        if (typeof arg2 === 'function') {
            callback = arg2;
            if (typeof arg3 === 'string') type = arg3 as any;
        } else if (typeof arg2 === 'string') {
            type = arg2 as any;
        }

        const promise = new Promise<any>((resolve, reject) => {
            this._getInternal(path, type, (resource) => {
                if (resource !== null) resolve(resource);
                else reject(`资源加载失败: ${path}`);
            });
        });

        if (callback) {
            promise.then(res => callback(res)).catch(err => { console.error(err); callback(null); });
            return;
        }
        return promise;
    }

    private static _getInternal(path: string, type: 'blob' | 'auto', callback: (resource: any) => void): void {
        //console.log(`[Res] get 请求: ${path} (type: ${type})`);
        if (!path) {
            console.error('[Res] 路径不能为空');
            callback(null);
            return;
        }
        if (Res._packMap.size === 0) {
            console.error('[Res] 没有已加载的资源包');
            callback(null);
            return;
        }

        // 解析包名和文件路径（支持 "包名@路径" 格式）
        let packName: string;
        let filePath: string;
        if (path.includes('@')) {
            [packName, filePath] = path.split('@');
            if (!Res._packMap.has(packName)) {
                console.error(`[Res] 资源包不存在: ${packName}`);
                callback(null);
                return;
            }
        } else {
            // 使用活动包或查找第一个包含该文件的包
            const found = Res._findPackForPath(path);
            if (!found) {
                console.warn(`[Res] 路径未匹配任何文件: ${path}`);
                callback(null);
                return;
            }
            packName = found.packName;
            filePath = found.filePath;
        }

        // 资源组处理（组名不包含包名前缀，直接使用传入的 path 查找）
        if (Res._groupInfo.has(filePath)) {
            console.log(`[Res] 检测到资源组: ${filePath}`);
            Res._loadGroup(packName, filePath, (success, resource) => {
                callback(success ? resource : null);
            });
            return;
        }

        const paths = Res._parsePathForPack(packName, filePath);

        if (paths.length === 0) {
            console.warn(`[Res] 路径未匹配任何文件: ${path}`);
            callback(null);
            return;
        }

        if (paths.length === 1) {
            const singlePath = paths[0];
            Res._loadFile(packName, singlePath, type, (resource) => {
                //console.log(`[Res] 加载完成: ${singlePath} ->`, resource ? typeof resource : 'null');
                callback(resource);
            });
            return;
        }

        // 多文件返回字典
        const resources: Record<string, any> = {};
        let completed = 0;
        const total = paths.length;
        let hasError = false;

        paths.forEach(p => {
            Res._loadFile(packName, p, type, (res) => {
                const fileName = p.split('/').pop() || p;
                if (res !== null) {
                    resources[fileName] = res;
                } else {
                    hasError = true;
                }
                if (++completed === total) {
                    callback(hasError && Object.keys(resources).length === 0 ? null : resources);
                }
            });
        });
    }

    // 在已加载的包中查找文件
    private static _findPackForPath(path: string): { packName: string; filePath: string } | null {
        // 优先活动包
        if (Res._activePackName) {
            const index = Res._packMap.get(Res._activePackName)?.index;
            if (index?.files.hasOwnProperty(path)) {
                return { packName: Res._activePackName, filePath: path };
            }
        }
        // 遍历所有包
        for (const [name, data] of Res._packMap) {
            if (data.index.files.hasOwnProperty(path)) {
                return { packName: name, filePath: path };
            }
        }
        return null;
    }

    private static _parsePathForPack(packName: string, path: string): string[] {
        const index = Res._packMap.get(packName)?.index;
        if (!index) return [];
        if (index.files.hasOwnProperty(path)) return [path];
        const prefix = path.endsWith('/') ? path : path + '/';
        const matches = Object.keys(index.files).filter(f => f.startsWith(prefix));
        return matches;
    }

    private static _loadFile(packName: string, filePath: string, type: 'blob' | 'auto', callback: (resource: any) => void): void {
        const cacheKey = `${packName}@${filePath}`;
        // 内存缓存
        if (type === 'auto' && Res._cache.has(cacheKey)) {
            //console.log(`[Res] 内存缓存命中: ${cacheKey}`);
            callback(Res._cache.get(cacheKey));
            return;
        }

        const fileKey = cacheKey; // 与 IndexedDB 存储键一致
        //console.log(`[Res] 从 IndexedDB 读取: ${fileKey}`);

        Res._net.storage.getFile(fileKey, (blob: Blob | null) => {
            if (!blob) {
                console.error(`[Res] 文件不存在: ${fileKey}`);
                callback(null);
                return;
            }

            //console.log(`[Res] Blob 读取成功: ${fileKey} (${blob.size} bytes)`);

            if (type === 'blob') {
                callback(blob);
                return;
            }

            Res._parseBlobToEngineObject(filePath, blob, (obj) => {
                if (obj) {
                    Res._cache.set(cacheKey, obj);
                    //console.log(`[Res] 解析成功并缓存: ${cacheKey}`);
                } else {
                    console.warn(`[Res] 解析失败: ${filePath}`);
                }
                callback(obj);
            });
        });
    }

    private static _parseBlobToEngineObject(filePath: string, blob: Blob, callback: (obj: any) => void): void {
        const ext = filePath.split('.').pop()?.toLowerCase();
        const url = URL.createObjectURL(blob);

        const finish = (obj: any) => {
            if(url != obj)
                URL.revokeObjectURL(url);
            callback(obj);
        };

        //console.log(`[Res] 解析文件: ${filePath} (扩展名: ${ext})`);

        if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp' || ext === 'bmp') {
            Laya.loader.load({ url, type: Laya.Loader.IMAGE }).then(tex => finish(tex)).catch(e => {
                console.error(`[Res] 纹理加载失败: ${filePath}`, e);
                finish(null);
            });
        } else if (ext === 'lm') {
            Laya.loader.load(url, Laya.Loader.MESH).then(mesh => finish(mesh)).catch(e => {
                console.error(`[Res] 网格加载失败: ${filePath}`, e);
                finish(null);
            });
        } else if (ext === 'lmat') {
            Laya.loader.load(url, Laya.Loader.MATERIAL).then(mat => finish(mat)).catch(e => {
                console.error(`[Res] 材质加载失败: ${filePath}`, e);
                finish(null);
            });
        } else if (ext === 'lani') {
            Laya.loader.load(url, Laya.Loader.ANIMATIONCLIP).then(clip => finish(clip)).catch(e => {
                console.error(`[Res] 动画片段加载失败: ${filePath}`, e);
                finish(null);
            });
        } else if (ext === 'mp3' || ext === 'wav' || ext === 'ogg' || ext === 'm4a' || ext === 'aac') {
            try{
            // Laya.loader.load( url, Blob).then(sound => {
                //console.log(sound)
                finish(url);
            }catch(err: any) {
                console.error(`[Res] 音频加载失败: ${filePath}`, err);
                finish(null);
            };
        } else {
            console.log(`[Res] 未知类型，返回 Blob: ${filePath}`);
            finish(blob);
        }
    }

    private static _loadGroup(packName: string, groupName: string, callback: (success: boolean, resource: any) => void): void {
        const cacheKey = `${packName}@${groupName}`;
        const cached = Res._cache.get(cacheKey);
        if (cached) {
            //console.log(`[Res] 资源组内存缓存命中: ${cacheKey}`);
            callback(true, cached);
            return;
        }

        const info = Res._groupInfo.get(groupName);
        if (!info) {
            console.error(`[Res] 资源组不存在: ${groupName}`);
            callback(false, null);
            return;
        }

        console.log(`[Res] 开始加载资源组: ${groupName} (${info.type})`);

        const blobs: Map<string, Blob> = new Map();
        let completed = 0;
        let hasError = false;

        const checkComplete = () => {
            if (completed < info.files.length) return;
            if (hasError) {
                console.error(`[Res] 资源组加载失败: ${groupName}`);
                callback(false, null);
                return;
            }

            const lastSlash = groupName.lastIndexOf('/');
            const dirPath = lastSlash !== -1 ? groupName.substring(0, lastSlash) : '';
            const baseName = groupName.substring(lastSlash + 1);

            if (info.type === 'spine') {
                const pngFile = info.files.find(f => f.endsWith('.png') || f.endsWith('.jpg'));
                const atlasFile = info.files.find(f => f.endsWith('.atlas'));
                const skFile = info.files.find(f => f.endsWith('.skel') || f.endsWith('.sk') || f.endsWith('.json'));
                if (pngFile && atlasFile && skFile) {
                    Res._createSpine(blobs.get(pngFile)!, blobs.get(atlasFile)!, blobs.get(skFile)!, cacheKey, (spine) => {
                        if (spine) {
                            Res._cache.set(cacheKey, spine);
                            console.log(`[Res] Spine 资源组创建成功: ${cacheKey}`);
                            callback(true, spine);
                        } else {
                            callback(false, null);
                        }
                    });
                } else {
                    callback(false, null);
                }
            } else {
                const pngFile = info.files.find(f => f.endsWith('.png') || f.endsWith('.jpg'));
                const atlasFile = info.files.find(f => f.endsWith('.atlas'));
                if (pngFile && atlasFile) {
                    Res._createAtlas(blobs.get(pngFile)!, blobs.get(atlasFile)!, cacheKey, (atlas) => {
                        if (atlas) {
                            Res._cache.set(cacheKey, atlas);
                            console.log(`[Res] Atlas 资源组创建成功: ${cacheKey}`);
                            callback(true, atlas);
                        } else {
                            callback(false, null);
                        }
                    });
                } else {
                    callback(false, null);
                }
            }
        };

        info.files.forEach(filePath => {
            const fileKey = `${packName}@${filePath}`;
            Res._net.storage.getFile(fileKey, (blob: Blob | null) => {
                if (blob) {
                    blobs.set(filePath, blob);
                } else {
                    console.error(`[Res] 资源组文件缺失: ${fileKey}`);
                    hasError = true;
                }
                completed++;
                checkComplete();
            });
        });
    }

    // 以下 _createAtlas, _createSpine, _createSubTextures 与原代码完全相同，无改动
    private static _createAtlas(pngBlob: Blob, atlasBlob: Blob, cacheKey: string, callback: (atlas: Laya.AtlasResource | null) => void): void {
        const imageUrl = URL.createObjectURL(pngBlob);
        Laya.loader.load({ url: imageUrl, type: Laya.Loader.IMAGE }).then((texture: Laya.Texture) => {
            const reader = new FileReader();
            reader.readAsText(atlasBlob, 'utf-8');
            reader.onload = () => {
                try {
                    const atlasJson = JSON.parse(reader.result as string);
                    const subTextures = Res._createSubTextures(atlasJson, texture);
                    const atlasResource = new Laya.AtlasResource(cacheKey, [texture], subTextures);
                    if (atlasJson.animation) atlasResource.animation = atlasJson.animation;
                    callback(atlasResource);
                } catch (e) {
                    console.error('[Res] 解析 Atlas 失败', e);
                    callback(null);
                } finally {
                    URL.revokeObjectURL(imageUrl);
                }
            };
            reader.onerror = () => {
                URL.revokeObjectURL(imageUrl);
                callback(null);
            };
        }).catch(() => {
            URL.revokeObjectURL(imageUrl);
            callback(null);
        });
    }

    private static _createSpine(pngBlob: Blob, atlasBlob: Blob, skBlob: Blob, cacheKey: string, callback: (spine: Laya.SpineTemplet | null) => void): void {
        const imageUrl = URL.createObjectURL(pngBlob);
        const skReader = new FileReader();
        const isBinary = cacheKey.endsWith('.skel') || cacheKey.endsWith('.sk');
        if (isBinary) skReader.readAsArrayBuffer(skBlob);
        else skReader.readAsText(skBlob, 'utf-8');

        skReader.onload = () => {
            const skData = skReader.result as (string | ArrayBuffer);
            const asReader = new FileReader();
            asReader.readAsText(atlasBlob, 'utf-8');
            asReader.onload = () => {
                const rawAsText = asReader.result as string;
                if (!rawAsText || !skData) {
                    URL.revokeObjectURL(imageUrl);
                    callback(null);
                    return;
                }

                const atlasPages: Laya.ILoadURL[] = [];
                const templet = new Laya.SpineTemplet();
                // @ts-ignore
                const atlas = new spine.TextureAtlas(rawAsText, (path: string) => {
                    atlasPages.push({ url: imageUrl, type: Laya.Loader.TEXTURE2D, propertyParams: { premultiplyAlpha: false } });
                    return new Laya.SpineTexture(null);
                });

                Laya.loader.load(atlasPages).then((res: Laya.Texture2D[]) => {
                    const textures: Record<string, Laya.Texture2D> = {};
                    for (let i = 0; i < res.length; i++) {
                        const tex = res[i];
                        if (tex) tex._addReference();
                        const page = atlas.pages[i];
                        if (tex) {
                            // @ts-ignore
                            page.texture.realTexture = tex;
                            // @ts-ignore
                            page.texture.setFilters(page.minFilter, page.magFilter);
                            // @ts-ignore
                            page.texture.setWraps(page.uWrap, page.vWrap);
                        }
                        page.width = tex?.width || 1;
                        page.height = tex?.height || 1;
                        textures[page.name] = tex;
                    }

                    const regions = atlas.regions;
                    for (const region of regions) {
                        const page = region.page;
                        const width = Math.max(page.width, 1);
                        const height = Math.max(page.height, 1);
                        region.u = region.x / width;
                        region.v = region.y / height;
                        // @ts-ignore
                        if (region.rotate) {
                            region.u2 = (region.x + region.height) / width;
                            region.v2 = (region.y + region.width) / height;
                        } else {
                            region.u2 = (region.x + region.width) / width;
                            region.v2 = (region.y + region.height) / height;
                        }
                    }

                    try {
                        // @ts-ignore
                        templet._parse(skData, atlas, textures);
                        callback(templet);
                    } catch (e) {
                        console.error('[Res] 解析 Spine 失败', e);
                        callback(null);
                    } finally {
                        URL.revokeObjectURL(imageUrl);
                    }
                }).catch(() => {
                    URL.revokeObjectURL(imageUrl);
                    callback(null);
                });
            };
            asReader.onerror = () => {
                URL.revokeObjectURL(imageUrl);
                callback(null);
            };
        };
        skReader.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            callback(null);
        };
    }

    private static _createSubTextures(atlasJson: any, texture: Laya.Texture): Laya.Texture[] {
        const subTextures: Laya.Texture[] = [];
        const scaleRate = parseFloat(atlasJson.meta?.scale || "1");
        texture.scaleRate = scaleRate;
        for (const frameName in atlasJson.frames) {
            const frameData = atlasJson.frames[frameName];
            const frame = frameData.frame;
            const subTexture = Laya.Texture.create(texture, frame.x, frame.y, frame.w, frame.h,
                frameData.spriteSourceSize?.x || 0, frameData.spriteSourceSize?.y || 0,
                frameData.sourceSize?.w || frame.w, frameData.sourceSize?.h || frame.h);
            // subTexture._sizeGrid = frameData.sizeGrid;
            // subTexture._stateNum = frameData.stateNum;
            subTexture.url = `${texture.url}_${frameName}`;
            Laya.loader.cacheRes(subTexture.url, subTexture);
            subTextures.push(subTexture);
        }
        return subTextures;
    }

    // ==================== 公共 API ====================
    static getList(): any {
        if (Res._activePackName) {
            return Res._packMap.get(Res._activePackName)?.index || null;
        }
        const first = Res._packMap.values().next().value;
        return first ? first.index : null;
    }

    static getTab(): Record<string, { v: string; fileCount: number; sampleFiles: string[] }> {
        const tab: any = {};
        for (const [name, data] of Res._packMap) {
            const files = Object.keys(data.index.files);
            tab[name] = {
                v: data.index.v,
                fileCount: files.length,
                sampleFiles: files.slice(0, 5)
            };
        }
        return tab;
    }

    static setAct(packName: string): boolean {
        if (Res._packMap.has(packName)) {
            Res._activePackName = packName;
            console.log(`[Res] 切换活动包: ${packName}`);
            return true;
        }
        console.warn(`[Res] 包不存在: ${packName}`);
        return false;
    }
    static clear(key:string): void {
        if(key){
            Res._cache.delete(key);
            return;
        }
        Res._cache.clear();
        console.log('[Res] 内存缓存已清空');
    }

    static setNet(net: Net): void { Res._net = net; }

    static async preload(paths?: string | string[]): Promise<boolean | { success: number; error: number; total: number }> {
        if (Res._packMap.size === 0) {
            console.error('[Res] 没有已加载的资源包');
            return paths ? false : { success: 0, error: 0, total: 0 };
        }

        let targetPaths: string[];
        if (!paths) {
            targetPaths = [];
            for (const [name, data] of Res._packMap) {
                const files = Object.keys(data.index.files);
                targetPaths.push(...files.map(f => `${name}@${f}`));
            }
            console.log(`[Res] preload 全部 ${targetPaths.length} 个文件`);
        } else {
            targetPaths = Array.isArray(paths) ? paths : [paths];
            console.log(`[Res] preload 指定 ${targetPaths.length} 个路径`);
        }

        if (targetPaths.length === 0) {
            return paths ? false : { success: 0, error: 0, total: 0 };
        }

        const results = await Promise.all(targetPaths.map(p => Res.get(p).then(v => ({ status: 'fulfilled' as const, value: v })).catch(e => ({ status: 'rejected' as const, reason: e }))));
        const success = results.filter(r => r.status === 'fulfilled').length;
        const error = results.length - success;

        if (!paths) {
            return { success, error, total: targetPaths.length };
        } else {
            return error === 0;
        }
    }

    static val(path: string): any {
        if (Res._packMap.size === 0) {
            console.warn('[Res] val: 没有已加载的资源包');
            return null;
        }

        // 解析包名和路径
        let packName: string;
        let filePath: string;
        if (path.includes('@')) {
            [packName, filePath] = path.split('@');
            if (!Res._packMap.has(packName)) {
                console.warn(`[Res] val: 包不存在 ${packName}`);
                return null;
            }
        } else {
            const found = Res._findPackForPath(path);
            if (!found) {
                console.warn(`[Res] val: 路径无效 ${path}`);
                return null;
            }
            packName = found.packName;
            filePath = found.filePath;
        }

        // 资源组
        if (Res._groupInfo.has(filePath)) {
            return Res._cache.get(`${packName}@${filePath}`) || null;
        }

        const paths = Res._parsePathForPack(packName, filePath);
        if (paths.length === 0) {
            console.warn(`[Res] val: 路径无效 ${path}`);
            return null;
        }

        if (paths.length === 1) {
            return Res._cache.get(`${packName}@${paths[0]}`) || null;
        }

        const result: Record<string, any> = {};
        let found = false;
        paths.forEach(p => {
            const obj = Res._cache.get(`${packName}@${p}`);
            if (obj !== undefined) {
                found = true;
                const fileName = p.split('/').pop() || p;
                result[fileName] = obj;
            }
        });
        return found ? result : null;
    }

    static getProcess(): { process: number; err: number; count: number } {
        return { process: 0, err: 0, count: 0 };
    }
}