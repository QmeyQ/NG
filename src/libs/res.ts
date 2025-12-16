// Res.ts
import { IDBStorage } from "./IDBStorage";
import { Net } from "./net";
import { Code, PackInfo, DecompressResult } from "./code";
import { fileManager } from "./file";

interface LoadProgress {
    process: number;
    err: number;
    count: number;
}

export class Res {
    private static _storage: IDBStorage;
    private static _net: Net;
    private static _initialized: boolean = false;
    
    private static _packInfo: PackInfo | null = null;
    private static _packBlob: Blob | null = null;
    private static _packUrl: string = '';
    private static _files: any = null; // 存储原始文件结构
    
    // 缓存
    private static _blobCache: Map<string, Blob> = new Map();
    private static _textureCache: Map<string, Laya.Texture> = new Map();
    private static _atlasCache: Map<string, Laya.AtlasResource> = new Map();
    private static _spineCache: Map<string, Laya.SpineTemplet> = new Map();
    
    // 进度
    private static _process: number = 0;
    private static _err: number = 0;
    private static _count: number = 0;
    
    // Promise 支持
    private static _urlPromise: Promise<any> | null = null;
    private static _urlResolve: ((packInfo: any) => void) | null = null;
    private static _urlReject: ((error: string) => void) | null = null;

    /**
     * 初始化
     */
    static init(): void {
        if (Res._initialized) return;
        
        Res._storage = new IDBStorage();
        Res._net = new Net();
        Res._initialized = true;
    }

    /**
     * 加载.res文件
     */
    static url(url: string, forceOrCallback?: boolean | ((packInfo: any) => void), callback?: (packInfo: any) => void): void {
        Res.init();
        
        // 解析参数
        let force = false;
        let onComplete: ((packInfo: any) => void) | undefined;
        
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
        console.log(`加载.res文件: ${url}`);
        
        // 创建 Promise 用于 .then 支持
        Res._urlPromise = new Promise((resolve, reject) => {
            Res._urlResolve = resolve;
            Res._urlReject = reject;
        });
        
        // 检查缓存
        if (!force) {
            Res._storage.get(`res_pack_${url}`, (cached: string) => {
                if (cached) {
                    try {
                        const config = JSON.parse(cached);
                        if (config.url === url && Date.now() - config.timestamp < 24 * 60 * 60 * 1000) {
                            console.log('使用缓存的包信息');
                            Res._packInfo = config.packInfo;
                            Res._files = config.files;
                            
                            // 回调
                            if (onComplete) onComplete(config);
                            if (Res._urlResolve) Res._urlResolve(config);
                            return;
                        }
                    } catch (error) {
                        console.warn('解析缓存配置失败:', error);
                    }
                }
                Res._downloadAndParse(url, onComplete);
            });
        } else {
            Res._downloadAndParse(url, onComplete);
        }
    }

    /**
     * 支持 Promise 风格的链式调用
     */
    static then(onFulfilled: (packInfo: any) => void, onRejected?: (error: string) => void): void {
        if (Res._urlPromise) {
            Res._urlPromise.then(onFulfilled).catch(onRejected || (() => {}));
        } else {
            console.warn('请先调用 Res.url() 方法');
        }
    }

    /**
     * 获取原始文件（同步版本）
     * 注意：此方法同步返回，但如果文件未缓存会返回null，实际文件会异步加载
     */
    static get(group: string, subKey?: string, index: number = 0): Blob | null {
        // 如果没有subKey，返回组内第一个文件
        if (subKey === undefined) {
            const filePath = Res._findFirstFileInGroup(group);
            if (!filePath) return null;
            return Res._blobCache.get(filePath) || null;
        }
        
        // 根据组、子键和索引构建可能的文件名模式
        const fileName = Res._buildFileName(group, subKey, index);
        if (!fileName) return null;
        
        // 查找匹配的文件
        const filePath = Res._findMatchingFile(fileName);
        if (!filePath) return null;
        
        return Res._blobCache.get(filePath) || null;
    }

    /**
     * 获取原始文件（异步版本）
     */
    static getAsync(filePath: string, onComplete?: (blob: Blob) => void, onError?: (error: string) => void): void {
        // 检查缓存
        if (Res._blobCache.has(filePath)) {
            onComplete?.(Res._blobCache.get(filePath)!);
            return;
        }
        
        // 从包中解压
        Code.decompressFileByName(
            Res._packBlob!,
            Res._packInfo!,
            filePath,
            (result: DecompressResult) => {
                // 缓存
                Res._blobCache.set(filePath, result.blob);
                
                // 保存到文件管理器
                fileManager.writeFile(filePath, result.blob, result.mimeType);
                
                onComplete?.(result.blob);
            },
            (error: string) => {
                onError?.(error);
            }
        );
    }

    /**
     * 加载图集资源
     * 自动查找组内的图片和atlas文件
     */
    static load(
        group: string,
        atlasName: string,
        onComplete: (resource: Laya.AtlasResource | Laya.SpineTemplet) => void,
        onError?: (error: string) => void
    ): void {
        // 查找组内所有文件
        const files = Res._findFilesByPattern(group, atlasName);
        
        // 判断是Atlas还是Spine
        const hasSkel = files.some(f => f.endsWith('.skel') || f.endsWith('.sk'));
        
        if (hasSkel) {
            Res._loadSpineByFiles(files, onComplete, onError);
        } else {
            Res._loadAtlasByFiles(files, onComplete, onError);
        }
    }

    /**
     * 加载纹理资源
     */
    static loadTexture(
        group: string,
        textureName: string,
        onComplete?: (texture: Laya.Texture) => void,
        onError?: (error: string) => void
    ): void {
        // 查找匹配的图片文件
        const imageFiles = Res._findFilesByPattern(group, textureName, ['.png', '.jpg', '.jpeg']);
        
        if (imageFiles.length === 0) {
            onError?.(`未找到匹配的图片文件: ${group}/${textureName}`);
            return;
        }
        
        // 加载第一个匹配的图片
        Res.getAsync(imageFiles[0], (blob: Blob) => {
            const url = URL.createObjectURL(blob);
            
            Laya.loader.load({
                url,
                type: Laya.Loader.IMAGE
            }).then((texture: Laya.Texture) => {
                URL.revokeObjectURL(url);
                onComplete?.(texture);
            }).catch((error: any) => {
                URL.revokeObjectURL(url);
                onError?.(`加载纹理失败: ${error}`);
            });
        }, onError);
    }

    /**
     * 下载资源组
     */
    static down(
        group: string,
        force?: boolean,
        onComplete?: (success: boolean) => void
    ): void {
        // 查找组内所有文件
        const filePaths = Res._getAllFilesInGroup(group);
        
        Res._process = 0;
        Res._err = 0;
        Res._count = filePaths.length;
        
        console.log(`下载资源组 ${group}, 文件数: ${filePaths.length}`);
        
        Code.decompressFiles(
            Res._packBlob!,
            Res._packInfo!,
            filePaths,
            (loaded: number, total: number) => {
                Res._process = loaded;
            },
            (results: { [path: string]: DecompressResult }) => {
                // 缓存所有文件
                for (const filePath in results) {
                    const result = results[filePath];
                    Res._blobCache.set(filePath, result.blob);
                    fileManager.writeFile(filePath, result.blob, result.mimeType);
                }
                
                onComplete?.(true);
            },
            (errors: { [path: string]: string }) => {
                Res._err = Object.keys(errors).length;
                console.error(`下载资源组 ${group} 失败:`, errors);
                onComplete?.(false);
            }
        );
    }

    /**
     * 下载所有资源
     */
    static downRes(onComplete?: (successCount: number, errorCount: number, totalCount: number) => void): void {
        if (!Res._packInfo) {
            console.error('请先通过url()加载资源配置');
            onComplete?.(0, 0, 0);
            return;
        }
        
        const allFilePaths = Res._getAllFiles();
        Res._process = 0;
        Res._err = 0;
        Res._count = allFilePaths.length;
        
        console.log(`下载所有资源, 文件数: ${allFilePaths.length}`);
        
        Code.decompressFiles(
            Res._packBlob!,
            Res._packInfo!,
            allFilePaths,
            (loaded: number, total: number) => {
                Res._process = loaded;
            },
            (results: { [path: string]: DecompressResult }) => {
                // 缓存所有文件
                for (const filePath in results) {
                    const result = results[filePath];
                    Res._blobCache.set(filePath, result.blob);
                    fileManager.writeFile(filePath, result.blob, result.mimeType);
                }
                
                onComplete?.(allFilePaths.length, 0, allFilePaths.length);
            },
            (errors: { [path: string]: string }) => {
                Res._err = Object.keys(errors).length;
                const successCount = allFilePaths.length - Object.keys(errors).length;
                onComplete?.(successCount, Object.keys(errors).length, allFilePaths.length);
            }
        );
    }

    /**
     * 获取包信息
     */
    static getList(): any {
        return {
            packInfo: Res._packInfo,
            files: Res._files
        };
    }

    /**
     * 获取加载进度
     */
    static getProcess(): LoadProgress {
        return {
            process: Res._process,
            err: Res._err,
            count: Res._count
        };
    }

    /**
     * 清除缓存
     */
    static clearCache(onComplete?: () => void): void {
        Res._blobCache.clear();
        Res._textureCache.clear();
        Res._atlasCache.clear();
        Res._spineCache.clear();
        
        Res._storage.clear(() => {
            fileManager.clearCache(() => {
                onComplete?.();
            });
        });
    }

    /**
     * 设置网络实例
     */
    static setNet(net: Net): void {
        Res._net = net;
    }

    /**
     * 兼容原有的 lo 方法（直接加载资源）
     */
    static lo(
        imageBlob: Blob,
        atlasBlob: Blob,
        skBlob: Blob,
        onComplete: (resource: Laya.AtlasResource | Laya.SpineTemplet) => void,
        onError?: (error: string) => void
    ): void {
        const imageUrl = URL.createObjectURL(imageBlob);
        
        if (skBlob && skBlob.size > 0) {
            // 加载 Spine 资源
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
                    
                    if (!rawAsText) {
                        URL.revokeObjectURL(imageUrl);
                        URL.revokeObjectURL(skUrl);
                        onError?.("Spine atlas内容为空");
                        return;
                    }

                    if (!rawSkText) {
                        URL.revokeObjectURL(imageUrl);
                        URL.revokeObjectURL(skUrl);
                        onError?.("Spine骨架内容为空");
                        return;
                    }
                    
                    const atlasPages: Array<Laya.ILoadURL> = [];
                    let templet = new Laya.SpineTemplet();
                    
                    // @ts-ignore
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

                        for (var i = 0; i < res.length; i++) {
                            let tex = res[i];
                            if (tex) tex._addReference();
                            let pages = atlas.pages;
                            let page = pages[i];
                            premultipliedAlpha = page.pma || (tex && tex._premultiplyAlpha && premultipliedAlpha);

                            // @ts-ignore
                            page.texture.realTexture = tex;
                            page.texture.setFilters(page.minFilter, page.magFilter);
                            page.texture.setWraps(page.uWrap, page.vWrap);
                            page.width = page.texture.getImage().width;
                            page.height = page.texture.getImage().height;
                            textures[page.name] = tex;
                        }

                        let regions = atlas.regions;
                        for (const region of regions) {
                            let page = region.page;
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

                        // @ts-ignore
                        templet._parse(rawSkText, atlas, textures, premultipliedAlpha);
                        
                        URL.revokeObjectURL(imageUrl);
                        URL.revokeObjectURL(skUrl);
                        onComplete(templet);
                    }).catch((error: any) => {
                        URL.revokeObjectURL(imageUrl);
                        URL.revokeObjectURL(skUrl);
                        onError?.(`加载纹理失败: ${error}`);
                    });
                };
                
                asReader.onerror = () => {
                    URL.revokeObjectURL(imageUrl);
                    URL.revokeObjectURL(skUrl);
                    onError?.('读取atlas文件失败');
                };
            };
            
            skReader.onerror = () => {
                URL.revokeObjectURL(imageUrl);
                URL.revokeObjectURL(skUrl);
                onError?.('读取骨骼文件失败');
            };
        } else {
            // 加载 Atlas 资源
            Laya.loader.load({
                url: imageUrl,
                type: Laya.Loader.IMAGE
            }).then((texture: Laya.Texture) => {
                // 读取atlas文件
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const atlasText = reader.result as string;
                        const atlasJson = JSON.parse(atlasText);
                        
                        // 创建子纹理
                        const subTextures = Res._createSubTextures(atlasJson, texture);
                        
                        // 创建AtlasResource
                        const atlasResource = new Laya.AtlasResource(
                            'direct_atlas',
                            [texture],
                            subTextures
                        );
                        
                        if (atlasJson.animation) {
                            atlasResource.animation = atlasJson.animation;
                        }
                        
                        URL.revokeObjectURL(imageUrl);
                        onComplete(atlasResource);
                    } catch (error: any) {
                        URL.revokeObjectURL(imageUrl);
                        onError?.(`创建图集失败: ${error.message}`);
                    }
                };
                
                reader.onerror = () => {
                    URL.revokeObjectURL(imageUrl);
                    onError?.('读取atlas文件失败');
                };
                
                reader.readAsText(atlasBlob);
            }).catch((error: any) => {
                URL.revokeObjectURL(imageUrl);
                onError?.(`加载图像失败: ${error}`);
            });
        }
    }

    // ==================== 私有方法 ====================

    private static _downloadAndParse(url: string, onComplete?: (packInfo: any) => void): void {
        Res._net.download(url, {
            key: url,
            force: true,
            onComplete: (blob: Blob) => {
                if (!blob) {
                    const error = '下载的包为空';
                    console.error(error);
                    if (onComplete) onComplete(null as any);
                    if (Res._urlReject) Res._urlReject(error);
                    return;
                }
                
                Res._packBlob = blob;
                
                // 解析包头部
                Code.parsePack(
                    blob,
                    (packInfo: PackInfo) => {
                        Res._packInfo = packInfo;
                        Res._files = packInfo.files;
                        
                        console.log('包信息:', packInfo);
                        console.log('文件结构:', packInfo.files);
                        
                        // 保存配置
                        const config = {
                            url: url,
                            packInfo: packInfo,
                            files: packInfo.files,
                            timestamp: Date.now()
                        };
                        Res._storage.set(`res_pack_${url}`, JSON.stringify(config), () => {
                            console.log('包信息已保存');
                        });
                        
                        // 回调
                        if (onComplete) onComplete(config);
                        if (Res._urlResolve) Res._urlResolve(config);
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
     * 在组内查找第一个文件
     */
    private static _findFirstFileInGroup(group: string): string | null {
        if (!Res._files || !Res._files[group]) return null;
        
        // 递归查找第一个文件
        const findFirstFile = (obj: any, path: string = ''): string | null => {
            for (const key in obj) {
                const value = obj[key];
                
                if (Array.isArray(value) && value.length === 2) {
                    // 找到文件
                    return path ? `${path}/${key}` : key;
                } else if (typeof value === 'object') {
                    // 继续递归
                    const result = findFirstFile(value, path ? `${path}/${key}` : key);
                    if (result) return result;
                }
            }
            return null;
        };
        
        return findFirstFile(Res._files[group], group);
    }

    /**
     * 构建可能的文件名
     */
    private static _buildFileName(group: string, subKey: string, index: number): string {
        // 简单的实现：假设子键是基础文件名，例如 "archer.png"
        return `${group}/${subKey}`;
    }

    /**
     * 查找匹配的文件
     */
    private static _findMatchingFile(fileName: string): string | null {
        if (!Res._files) return null;
        
        // 将文件名拆分为路径部分
        const parts = fileName.split('/');
        
        // 递归查找
        const findFile = (obj: any, pathParts: string[]): string | null => {
            if (pathParts.length === 0) return null;
            
            const currentKey = pathParts[0];
            
            if (pathParts.length === 1) {
                // 查找直接匹配的文件
                if (obj[currentKey] && Array.isArray(obj[currentKey]) && obj[currentKey].length === 2) {
                    // 构建完整路径
                    let fullPath = currentKey;
                    let parent = obj;
                    while (parent !== Res._files) {
                        for (const key in parent) {
                            if (parent[key] === obj) {
                                fullPath = `${key}/${fullPath}`;
                                parent = Res._files;
                                // 继续向上查找
                                let temp = Res._files;
                                for (const k in temp) {
                                    if (temp[k] === parent) {
                                        fullPath = `${k}/${fullPath}`;
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                    }
                    return fullPath;
                }
                return null;
            }
            
            // 继续向下查找
            if (obj[currentKey] && typeof obj[currentKey] === 'object') {
                return findFile(obj[currentKey], pathParts.slice(1));
            }
            
            return null;
        };
        
        return findFile(Res._files, parts);
    }

    /**
     * 按模式查找文件
     */
    private static _findFilesByPattern(group: string, pattern: string, extensions?: string[]): string[] {
        const result: string[] = [];
        
        if (!Res._files || !Res._files[group]) return result;
        
        // 递归查找所有文件
        const findAllFiles = (obj: any, basePath: string = ''): void => {
            for (const key in obj) {
                const value = obj[key];
                
                if (Array.isArray(value) && value.length === 2) {
                    // 这是一个文件
                    const fullPath = basePath ? `${basePath}/${key}` : key;
                    
                    // 检查是否匹配模式和扩展名
                    let match = true;
                    
                    // 检查模式匹配（简单包含匹配）
                    if (pattern && !key.includes(pattern)) {
                        match = false;
                    }
                    
                    // 检查扩展名
                    if (extensions && extensions.length > 0) {
                        const ext = this._getFileExtension(key);
                        if (!extensions.find((e) => e === ext)) {
                            match = false;
                        }
                    }
                    
                    if (match) {
                        result.push(`${group}/${fullPath}`);
                    }
                } else if (typeof value === 'object') {
                    // 继续递归
                    findAllFiles(value, basePath ? `${basePath}/${key}` : key);
                }
            }
        };
        
        findAllFiles(Res._files[group]);
        return result;
    }

    /**
     * 获取组内所有文件
     */
    private static _getAllFilesInGroup(group: string): string[] {
        const result: string[] = [];
        
        if (!Res._files || !Res._files[group]) return result;
        
        // 递归收集所有文件
        const collectAllFiles = (obj: any, basePath: string = ''): void => {
            for (const key in obj) {
                const value = obj[key];
                
                if (Array.isArray(value) && value.length === 2) {
                    // 这是一个文件
                    const fullPath = basePath ? `${basePath}/${key}` : key;
                    result.push(`${group}/${fullPath}`);
                } else if (typeof value === 'object') {
                    // 继续递归
                    collectAllFiles(value, basePath ? `${basePath}/${key}` : key);
                }
            }
        };
        
        collectAllFiles(Res._files[group]);
        return result;
    }

    /**
     * 获取所有文件
     */
    private static _getAllFiles(): string[] {
        const result: string[] = [];
        
        if (!Res._files) return result;
        
        // 递归收集所有文件
        const collectAllFiles = (obj: any, basePath: string = ''): void => {
            for (const key in obj) {
                const value = obj[key];
                
                if (Array.isArray(value) && value.length === 2) {
                    // 这是一个文件
                    const fullPath = basePath ? `${basePath}/${key}` : key;
                    result.push(fullPath);
                } else if (typeof value === 'object') {
                    // 继续递归
                    collectAllFiles(value, basePath ? `${basePath}/${key}` : key);
                }
            }
        };
        
        collectAllFiles(Res._files);
        return result;
    }

    private static _getFileExtension(fileName: string): string {
        const parts = fileName.split('.');
        if (parts.length <= 1) return '';
        return '.' + parts[parts.length - 1].toLowerCase();
    }

    /**
     * 根据文件列表加载Atlas
     */
    private static _loadAtlasByFiles(
        files: string[],
        onComplete: (atlas: Laya.AtlasResource) => void,
        onError?: (error: string) => void
    ): void {
        // 筛选出图片和atlas文件
        const imageFiles = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
        const atlasFiles = files.filter(f => f.endsWith('.atlas') || f.endsWith('.json'));
        
        if (imageFiles.length === 0 || atlasFiles.length === 0) {
            onError?.('缺少图集所需的图片或atlas文件');
            return;
        }
        
        // 加载第一个图片和第一个atlas文件
        let imageBlob: Blob | null = null;
        let atlasBlob: Blob | null = null;
        let completed = 0;
        
        const checkComplete = () => {
            if (completed === 2 && imageBlob && atlasBlob) {
                Res._createAtlas(imageBlob, atlasBlob, 'atlas', onComplete, onError);
            }
        };
        
        // 加载图片
        Res.getAsync(imageFiles[0], (blob: Blob) => {
            imageBlob = blob;
            completed++;
            checkComplete();
        }, (error: string) => {
            onError?.(`加载图片失败: ${error}`);
        });
        
        // 加载atlas文件
        Res.getAsync(atlasFiles[0], (blob: Blob) => {
            atlasBlob = blob;
            completed++;
            checkComplete();
        }, (error: string) => {
            onError?.(`加载atlas文件失败: ${error}`);
        });
    }

    /**
     * 根据文件列表加载Spine
     */
    private static _loadSpineByFiles(
        files: string[],
        onComplete: (spine: Laya.SpineTemplet) => void,
        onError?: (error: string) => void
    ): void {
        // 筛选出图片、atlas和骨骼文件
        const imageFiles = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
        const atlasFiles = files.filter(f => f.endsWith('.atlas') || f.endsWith('.json'));
        const skelFiles = files.filter(f => f.endsWith('.skel') || f.endsWith('.sk'));
        
        if (imageFiles.length === 0 || atlasFiles.length === 0 || skelFiles.length === 0) {
            onError?.('缺少Spine所需的图片、atlas或骨骼文件');
            return;
        }
        
        // 加载所有必需文件
        let imageBlob: Blob | null = null;
        let atlasBlob: Blob | null = null;
        let skelBlob: Blob | null = null;
        let completed = 0;
        
        const checkComplete = () => {
            if (completed === 3 && imageBlob && atlasBlob && skelBlob) {
                Res._createSpine(imageBlob, atlasBlob, skelBlob, 'spine', onComplete, onError);
            }
        };
        
        // 加载图片
        Res.getAsync(imageFiles[0], (blob: Blob) => {
            imageBlob = blob;
            completed++;
            checkComplete();
        }, (error: string) => {
            onError?.(`加载图片失败: ${error}`);
        });
        
        // 加载atlas文件
        Res.getAsync(atlasFiles[0], (blob: Blob) => {
            atlasBlob = blob;
            completed++;
            checkComplete();
        }, (error: string) => {
            onError?.(`加载atlas文件失败: ${error}`);
        });
        
        // 加载骨骼文件
        Res.getAsync(skelFiles[0], (blob: Blob) => {
            skelBlob = blob;
            completed++;
            checkComplete();
        }, (error: string) => {
            onError?.(`加载骨骼文件失败: ${error}`);
        });
    }

    private static _createAtlas(
        imageBlob: Blob,
        atlasBlob: Blob,
        cacheKey: string,
        onComplete: (atlas: Laya.AtlasResource) => void,
        onError?: Function
    ): void {
        const imageUrl = URL.createObjectURL(imageBlob);
        
        Laya.loader.load({
            url: imageUrl,
            type: Laya.Loader.IMAGE
        }).then((texture: Laya.Texture) => {
            // 读取atlas文件
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const atlasText = reader.result as string;
                    const atlasJson = JSON.parse(atlasText);
                    
                    // 创建子纹理
                    const subTextures = Res._createSubTextures(atlasJson, texture);
                    
                    // 创建AtlasResource
                    const atlasResource = new Laya.AtlasResource(
                        `${cacheKey}_atlas`,
                        [texture],
                        subTextures
                    );
                    
                    if (atlasJson.animation) {
                        atlasResource.animation = atlasJson.animation;
                    }
                    
                    Res._atlasCache.set(cacheKey, atlasResource);
                    Laya.loader.cacheRes(`${cacheKey}_atlas`, atlasResource, Laya.Loader.ATLAS);
                    
                    URL.revokeObjectURL(imageUrl);
                    onComplete(atlasResource);
                } catch (error: any) {
                    URL.revokeObjectURL(imageUrl);
                    onError?.(`创建图集失败: ${error.message}`);
                }
            };
            
            reader.onerror = () => {
                URL.revokeObjectURL(imageUrl);
                onError?.('读取atlas文件失败');
            };
            
            reader.readAsText(atlasBlob);
        }).catch((error: any) => {
            URL.revokeObjectURL(imageUrl);
            onError?.(`加载图像失败: ${error}`);
        });
    }

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

    /**
     * 创建Spine资源（保持原有的逻辑）
     */
    private static _createSpine(
        imageBlob: Blob,
        atlasBlob: Blob,
        skelBlob: Blob,
        cacheKey: string,
        onComplete: (spine: Laya.SpineTemplet) => void,
        onError?: Function
    ): void {
        const imageUrl = URL.createObjectURL(imageBlob);
        const skelUrl = URL.createObjectURL(skelBlob);
        
        // 读取skel文件
        const skReader = new FileReader();
        skReader.readAsText(skelBlob, "utf-8");
        
        skReader.onload = () => {
            const rawSkText = skReader.result as string;
            
            // 读取atlas文件内容
            const asReader = new FileReader();
            asReader.readAsText(atlasBlob, "utf-8");
            
            asReader.onload = () => {
                const rawAsText = asReader.result as string;
                
                if (!rawAsText) {
                    URL.revokeObjectURL(imageUrl);
                    URL.revokeObjectURL(skelUrl);
                    onError?.("Spine atlas内容为空");
                    return;
                }

                if (!rawSkText) {
                    URL.revokeObjectURL(imageUrl);
                    URL.revokeObjectURL(skelUrl);
                    onError?.("Spine骨架内容为空");
                    return;
                }
                
                const atlasPages: Array<Laya.ILoadURL> = [];
                let templet = new Laya.SpineTemplet();
                
                // @ts-ignore
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

                    for (var i = 0; i < res.length; i++) {
                        let tex = res[i];
                        if (tex) tex._addReference();
                        let pages = atlas.pages;
                        let page = pages[i];
                        premultipliedAlpha = page.pma || (tex && tex._premultiplyAlpha && premultipliedAlpha);

                        // @ts-ignore
                        page.texture.realTexture = tex;
                        page.texture.setFilters(page.minFilter, page.magFilter);
                        page.texture.setWraps(page.uWrap, page.vWrap);
                        page.width = page.texture.getImage().width;
                        page.height = page.texture.getImage().height;
                        textures[page.name] = tex;
                    }

                    let regions = atlas.regions;
                    for (const region of regions) {
                        let page = region.page;
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

                    // @ts-ignore
                    templet._parse(rawSkText, atlas, textures, premultipliedAlpha);
                    
                    // 缓存
                    Res._spineCache.set(cacheKey, templet);
                    
                    URL.revokeObjectURL(imageUrl);
                    URL.revokeObjectURL(skelUrl);
                    onComplete(templet);
                }).catch((error: any) => {
                    URL.revokeObjectURL(imageUrl);
                    URL.revokeObjectURL(skelUrl);
                    onError?.(`加载纹理失败: ${error}`);
                });
            };
            
            asReader.onerror = () => {
                URL.revokeObjectURL(imageUrl);
                URL.revokeObjectURL(skelUrl);
                onError?.('读取atlas文件失败');
            };
        };
        
        skReader.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            URL.revokeObjectURL(skelUrl);
            onError?.('读取骨骼文件失败');
        };
    }
}