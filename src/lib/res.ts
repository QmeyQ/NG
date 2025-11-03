/**res.ts 全局static
 * - init(): 初始化IDBStorage和Net实例
 * - url(url: string, force: boolean = false): 加载资源配置文件，url为res.json地址，force为是否强制重新下载
 * - down(key: string, force: boolean = false): 下载单个资源组，key为资源标识，force为是否强制重新下载
 * - downRes(): 下载所有包含url属性的资源组
 * - get(name: string, subkey?:string, index?: number): 获取已加载资源，name为资源组名，index为可选资源索引
 * - getList(): 获取资源配置信息
 * - setNet(netInstance: Net): 设置网络实例
 * - getProcess(): 获取下载进度信息，返回{process: number, err: number, count: number}
 * - load(key, subkey, suc(AtlasResource), err?(msg)): 加载atlas资源
 * - loadTexture(key, suc(Texture), err?(msg)): 加载texture资源
 * - 支持复杂JSON结构，自动识别包含url属性的资源组进行下载
 * - onUrl(list): 配置文件加载完成事件
 * - onDownComplete(key, success): 单个资源下载完成事件
 * - onDownResComplete(successCount, errorCount, totalCount): 所有资源下载完成事件
 * - onProcessUpdate(process, err, count): 下载进度更新事件
 * - onLoadComplete(key, resource): 资源加载完成事件
 * - onLoadError(key, msg): 资源加载失败事件
*/
import { IDBStorage } from "./IDBStorage";
import { Net } from "./net";
const { AtlasResource, Texture, Loader } = Laya;

export class Res {
    static storage?: IDBStorage;
    private static _net?: Net;
    private static _list: any | null = null;
    private static _img: { [key: string]: any } = {};
    private static _process: number = 0;
    private static _atlasCache: { [key: string]: Laya.AtlasResource } = {};
    private static _textureCache: { [key: string]: Laya.Texture } = {};
    private static _err: number = 0;
    private static _count: number = 0;
    private static _loadingKeys: Set<string> = new Set();
    private static _isInitialized: boolean = false;

    // ==================== 事件回调函数 ====================
    
    static onUrl(list: any): void {
        console.log('res.json加载完成', list);
    }
    
    static onUrlError(error: string): void {
        console.error('res.json加载失败:', error);
    }
    
    static onDownComplete(key: string, success: boolean): void {
        console.log(`资源[${key}]下载${success ? '成功' : '失败'}`);
    }
    
    static onDownResComplete(successCount: number, errorCount: number, totalCount: number): void {
        console.log(`所有资源下载完成: 成功${successCount}个, 失败${errorCount}个, 总计${totalCount}个`);
    }
    
    static onProcessUpdate(process: number, err: number, count: number): void {
        const progress = count > 0 ? (process / count * 100).toFixed(2) : '0.00';
        console.log(`下载进度: ${process}/${count} (${progress}%), 错误: ${err}`);
    }
    
    static onLoadComplete(key: string, resource: any): void {
        console.log(`资源[${key}]加载完成`, resource);
    }
    
    static onLoadError(key: string, error: string): void {
        console.error(`资源[${key}]加载失败:`, error);
    }

    // ==================== 核心方法 ====================

    static init() {
        if(Res.storage) return;
        Res.storage = new IDBStorage();
        Res._net = new Net();
        Res._isInitialized = true;
    }

    static url(url: string, forceOrsuc: boolean | Function = false, force2: boolean = false): void {
        if (!Res._isInitialized) {
            console.error('Res未初始化，请先调用Res.init()');
            return;
        }
        Res.storage.get('resJson', (cachedData: any) => {
            if (cachedData === null || forceOrsuc || force2) {
                console.log('加载res.json（远程）');
                Res._net.download(url, {
                    key: 'resJson',
                    force: typeof forceOrsuc == "boolean" ? forceOrsuc : force2,
                    onComplete: (blob: Blob) => {
                        if (blob) {
                            const reader = new Laya.Browser.window.FileReader();
                            reader.onload = () => {
                                try {
                                    Res._list = JSON.parse(reader.result as string);
                                    Res.storage.set('resJson', JSON.stringify(Res._list), () => { });
                                    Res.onUrl(Res._list);
                                    if (typeof forceOrsuc == 'function') forceOrsuc(Res._list);
                                } catch (e) {
                                    console.error('解析res.json失败:', e);
                                    Res.storage.delete('resJson', () => { });
                                    Res.onUrlError(`解析res.json失败: ${e}`);
                                    if (typeof forceOrsuc == 'function') forceOrsuc(undefined);
                                }
                            };
                            reader.readAsText(blob);
                        } else {
                            Res.storage.delete('resJson', () => { });
                            Res.onUrlError('下载的res.json为空');
                            if (typeof forceOrsuc == 'function') forceOrsuc(undefined);
                        }
                    },
                    onError: (mes: any) => {
                        console.log('下载json文件失败: ' + mes);
                        Res.storage.delete('resJson', () => { });
                        Res.onUrlError(`下载res.json失败: ${mes}`);
                        if (typeof forceOrsuc == 'function') forceOrsuc(undefined);
                    }
                });
            } else {
                try {
                    Res._list = JSON.parse(cachedData);
                    Res.onUrl(Res._list);
                } catch (e) {
                    console.error('解析缓存的res.json失败:', e);
                    Res.storage.delete('resJson', () => {
                        this.url(url, true);
                    });
                }
            }
        });
    }

    /**
     * 下载单个资源组
     */
    static down(key: string, force?: boolean, callback?: (success: boolean) => void): void {
        if (!this._list) {
            console.error('请先通过url()加载res.json');
            callback?.(false);
            Res.onDownComplete(key, false);
            return;
        }

        if (this._loadingKeys.has(key)) {
            console.log(`资源[${key}]正在加载中，已忽略重复请求`);
            return;
        }

        const resourceGroup = this._list[key];
        this._count = this._getResourceCount(resourceGroup);
        if (!resourceGroup) {
            console.error(`资源键${key}不存在于res.json中`);
            callback?.(false);
            Res.onDownComplete(key, false);
            return;
        }

        // 判断资源组类型并下载
        if (this._isDownloadableResourceGroup(resourceGroup)) {
            this._downResourceGroup(key, resourceGroup, force?force:false, callback);
        } else {
            console.log(`资源组[${key}]不包含可下载资源，跳过下载`);
            callback?.(true);
            Res.onDownComplete(key, true);
        }
    }

    /**
     * 下载所有包含url属性的资源组
     */
    static downRes(): void {
        if (!Res._list) {
            console.error('请先通过url()加载res.json');
            return;
        }

        Res._err = 0;
        Res._process = 0;
        Res._img = {};
        Res._count = 0;

        // 获取所有可下载的资源组
        const downloadableGroups = this._getDownloadableResourceGroups();
        
        if (downloadableGroups.length === 0) {
            console.log('没有找到可下载的资源组');
            Res.onDownResComplete(0, 0, 0);
            return;
        }

        // 计算总资源数量
        downloadableGroups.forEach(({ key, group }) => {
            Res._count += this._getResourceCount(group);
        });

        console.log(`开始下载 ${downloadableGroups.length} 个资源组，共 ${Res._count} 个资源`);

        let completedGroups = 0;
        const totalGroups = downloadableGroups.length;
        let totalSuccessCount = 0;
        let totalErrorCount = 0;

        downloadableGroups.forEach(({ key, group }) => {
            this._downResourceGroup(key, group, false, (success: boolean) => {
                completedGroups++;
                
                // 统计成功和失败数量
                const groupResourceCount = this._getResourceCount(group);
                if (success) {
                    totalSuccessCount += groupResourceCount;
                } else {
                    totalErrorCount += groupResourceCount;
                }

                // 所有组完成
                if (completedGroups === totalGroups) {
                    Res.onDownResComplete(totalSuccessCount, totalErrorCount, Res._count);
                }
            });
        });
    }

    /**
     * 判断是否为可下载的资源组
     */
    private static _isDownloadableResourceGroup(group: any): boolean {
        // 包含url属性且不是版本信息的对象
        return group && typeof group === 'object' && 
               group.url && typeof group.url === 'string'
    }

    /**
     * 获取所有可下载的资源组
     */
    private static _getDownloadableResourceGroups(): Array<{key: string, group: any}> {
        const groups: Array<{key: string, group: any}> = [];
        
        for (const key in this._list) {
            const group = this._list[key];
            if (this._isDownloadableResourceGroup(group)) {
                groups.push({ key, group });
            }
        }
        
        return groups;
    }

    /**
     * 获取资源组中的资源数量
     */
    private static _getResourceCount(group: any): number {
        let count = 0;
        for (const subKey in group) {
            if (subKey !== 'url' && subKey !== 'v' && Array.isArray(group[subKey])) {
                count += group[subKey].length;
            }
        }
        return count;
    }

    /**
     * 下载资源组
     */
    private static _downResourceGroup(
        groupKey: string, 
        resourceGroup: any, 
        force: boolean = false, 
        callback?: (success: boolean) => void
    ): void {
        const baseUrl = resourceGroup.url;
        if (!baseUrl) {
            console.error(`资源组[${groupKey}]缺少baseUrl`);
            callback?.(false);
            return;
        }

        this._loadingKeys.add(groupKey);
        
        // 初始化存储对象
        if (!this._img[groupKey] || force) {
            this._img[groupKey] = {};
        }

        let completedCount = 0;
        let successCount = 0;
        let errorCount = 0;
        const totalResources = this._getResourceCount(resourceGroup);

        if (totalResources === 0) {
            console.log(`资源组[${groupKey}]没有可下载资源`);
            this._loadingKeys.delete(groupKey);
            callback?.(true);
            return;
        }

        const checkCompletion = () => {
            if (completedCount === totalResources) {
                this._loadingKeys.delete(groupKey);
                const overallSuccess = errorCount === 0;
                callback?.(overallSuccess);
                Res.onDownComplete(groupKey, overallSuccess);
                console.log(`资源组[${groupKey}]下载完成: 成功${successCount}个, 失败${errorCount}个, 总计${totalResources}个`);
            }
        };

        // 遍历资源组中的所有子资源
        for (const subKey in resourceGroup) {
            if (subKey !== 'url' && subKey !== 'v' && Array.isArray(resourceGroup[subKey])) {
                const fileList = resourceGroup[subKey];
                
                if (!this._img[groupKey][subKey]) {
                    this._img[groupKey][subKey] = [];
                }

                // 下载子资源组中的每个文件
                fileList.forEach((filePath: string, index: number) => {
                    const fullUrl = `${baseUrl}${filePath}`;
                    const storageKey = `${groupKey}_${subKey}_${index}`;

                    this.storage.getFile(storageKey, (cachedBlob: Blob | null) => {
                        if (cachedBlob && !force) {
                            this._img[groupKey][subKey][index] = cachedBlob;
                            successCount++;
                            completedCount++;
                            Res._process++;
                            Res.onProcessUpdate(Res._process, Res._err, Res._count);
                            checkCompletion();
                            return;
                        }

                        // 从远程下载
                        this._net.download(fullUrl, {
                            key: storageKey,
                            force,
                            onComplete: (blob: Blob) => {
                                if (blob) {
                                    this.storage.setFile(storageKey, blob, (success: boolean) => {
                                        if (success) {
                                            this._img[groupKey][subKey][index] = blob;
                                            successCount++;
                                        } else {
                                            errorCount++;
                                            Res._err++;
                                        }
                                        completedCount++;
                                        Res._process++;
                                        Res.onProcessUpdate(Res._process, Res._err, Res._count);
                                        checkCompletion();
                                    });
                                } else {
                                    errorCount++;
                                    Res._err++;
                                    completedCount++;
                                    Res._process++;
                                    Res.onProcessUpdate(Res._process, Res._err, Res._count);
                                    checkCompletion();
                                }
                            },
                            onError: (message: string) => {
                                console.error(`资源[${storageKey}]下载失败: ${message}`);
                                errorCount++;
                                Res._err++;
                                completedCount++;
                                Res._process++;
                                Res.onProcessUpdate(Res._process, Res._err, Res._count);
                                checkCompletion();
                            }
                        });
                    });
                });
            }
        }
    }

    // ==================== 资源获取和方法 ====================

    static get(name: string, subKey?: string, index: number = 0): any {
        // 优先返回缓存资源
        if (Res._atlasCache[`${name}_${subKey}_${index}`]) return Res._atlasCache[`${name}_${subKey}_${index}`];
        if (Res._textureCache[`${name}_${subKey}_${index}`]) return Res._textureCache[`${name}_${subKey}_${index}`];

        if (!Res._img[name]) return null;
        
        if (subKey !== undefined) {
            const subGroup = Res._img[name][subKey];
            if (!subGroup) return null;
            return index !== undefined ? subGroup[index] : subGroup;
        }
        
        return Res._img[name];
    }

    static getList(): any {
        return Res._list;
    }

    static setNet(netInstance: Net): void {
        Res._net = netInstance;
    }

    static getProcess(): { process: number, err: number, count: number } {
        return { process: Res._process, err: Res._err, count: Res._count };
    }

    /**
     * 加载Atlas资源
     */
    static load(
        key: string,
        subKey: string,
        success: (atlas: Laya.AtlasResource) => void,
        error?: (errMsg: string) => void
    ): void {
        if (Res._atlasCache[`${key}_${subKey}`]) {
            console.log(`资源[${key}_${subKey}]使用缓存的Atlas`);
            success(Res._atlasCache[`${key}_${subKey}`]);
            Res.onLoadComplete(`${key}_${subKey}`, Res._atlasCache[`${key}_${subKey}`]);
            return;
        }

        const imageBlob = this.get(key, subKey, 0) as Blob;
        const atlasBlob = this.get(key, subKey, 1) as Blob;
        
        if (!imageBlob || !atlasBlob) {
            const errMsg = `资源[${key}_${subKey}]缺失：图像Blob=${!!imageBlob}，Atlas Blob=${!!atlasBlob}`;
            console.warn(errMsg);
            Res.onLoadError(`${key}_${subKey}`, errMsg);
            error?.(errMsg);
            return;
        }

        const imageUrl = URL.createObjectURL(imageBlob);
        let texture: Laya.Texture | null = null;

        Laya.loader.load({
            url: imageUrl,
            type: Loader.IMAGE,
            name: `${key}_${subKey}_image`
        }).then((loadedTexture: Laya.Texture) => {
            texture = loadedTexture;
            this._readAtlasBlob(key, subKey, atlasBlob, imageUrl, texture, success, error);
        }).catch((err) => {
            const errMsg = `加载图像失败：${err.message}`;
            if (imageUrl) URL.revokeObjectURL(imageUrl);
            Res.onLoadError(`${key}_${subKey}`, errMsg);
            error?.(errMsg);
        });
    }

    /**
     * 加载Texture资源
     * 当不传入subkey时，会自动列举list下主key的所有子key并加载对应的texture
     */
    static loadTexture(
        key: string,
        subKey?: string,
        index: number = 0,
        success?: (texture: Laya.Texture, subKey?: string, index?: number) => void,
        error?: (errMsg: string, subKey?: string, index?: number) => void
    ): void {
        // 如果没有传入subKey，则列举list下主key的所有子key并加载
        if (subKey === undefined) {
            // 确保资源列表已加载
            if (!Res._list || !Res._list[key]) {
                const errMsg = `资源键${key}不存在于res.json中`;
                console.warn(errMsg);
                Res.onLoadError(key, errMsg);
                error?.(errMsg);
                return;
            }

            const resourceGroup = Res._list[key];
            const subKeys: string[] = [];

            // 收集所有非url和非v属性的子key
            for (const sk in resourceGroup) {
                if (sk !== 'url' && sk !== 'v' && Array.isArray(resourceGroup[sk])) {
                    subKeys.push(sk);
                }
            }

            if (subKeys.length === 0) {
                const errMsg = `资源键${key}下没有找到可加载的子资源`;
                console.warn(errMsg);
                Res.onLoadError(key, errMsg);
                error?.(errMsg);
                return;
            }

            console.log(`自动加载资源[${key}]下的${subKeys.length}个子资源：${subKeys.join(', ')}`);

            // 为每个子key加载texture
            subKeys.forEach((sk) => {
                // 获取该子key下的资源数量
                const resourceCount = resourceGroup[sk].length;
                
                // 加载该子key下的每个资源（默认加载索引为0的资源，如果需要加载所有索引可扩展）
                for (let i = 0; i < resourceCount; i++) {
                    Res.loadTexture(key, sk, i, success, error);
                }
            });
            
            return;
        }

        // 原有逻辑：加载指定的subKey和index的texture
        const cacheKey = `${key}_${subKey}_${index}`;
        
        if (Res._textureCache[cacheKey]) {
            console.log(`资源[${cacheKey}]使用缓存的Texture`);
            success?.(Res._textureCache[cacheKey], subKey, index);
            Res.onLoadComplete(cacheKey, Res._textureCache[cacheKey]);
            return;
        }

        const textureBlob = this.get(key, subKey, index) as Blob;
        if (!textureBlob) {
            const errMsg = `资源[${cacheKey}]缺失：Texture Blob不存在`;
            console.warn(errMsg);
            Res.onLoadError(cacheKey, errMsg);
            error?.(errMsg, subKey, index);
            return;
        }

        const textureUrl = URL.createObjectURL(textureBlob);

        Laya.loader.load({
            url: textureUrl,
            type: Loader.IMAGE,
            name: cacheKey
        }).then((loadedTexture: Laya.Texture) => {
            Res._textureCache[cacheKey] = loadedTexture;
            Laya.loader.cacheRes(cacheKey, loadedTexture);
            success?.(loadedTexture, subKey, index);
            Res.onLoadComplete(cacheKey, loadedTexture);
            URL.revokeObjectURL(textureUrl);
        }).catch((err) => {
            const errMsg = `加载Texture失败：${err.message}`;
            URL.revokeObjectURL(textureUrl);
            Res.onLoadError(cacheKey, errMsg);
            error?.(errMsg, subKey, index);
        });
    }

    // ==================== 私有辅助方法 ====================

    private static _readAtlasBlob(
        key: string,
        subKey: string,
        atlasBlob: Blob,
        imageUrl: string,
        texture: Laya.Texture,
        success: (atlas: Laya.AtlasResource) => void,
        error?: (errMsg: string) => void
    ): void {
        const cacheKey = `${key}_${subKey}`;
        const atlasReader = new FileReader();
        atlasReader.readAsText(atlasBlob, "utf-8");

        atlasReader.onload = () => {
            try {
                const rawAtlasText = atlasReader.result as string;
                if (!rawAtlasText) throw new Error("Atlas内容为空");

                const atlasJson = JSON.parse(rawAtlasText);
                this._fixAtlasFormat(atlasJson, imageUrl);

                const subTextures = this._createSubTextures(atlasJson, texture, cacheKey);
                const atlasResource = new AtlasResource(
                    `${cacheKey}_atlas`,
                    [texture],
                    subTextures
                );
                atlasResource.animation = atlasJson.animation;

                Res._atlasCache[cacheKey] = atlasResource;
                Laya.loader.cacheRes(`${cacheKey}_atlas`, atlasResource, Loader.ATLAS);
                success(atlasResource);
                Res.onLoadComplete(cacheKey, atlasResource);

                URL.revokeObjectURL(imageUrl);
            } catch (parseErr) {
                const errMsg = `解析Atlas失败：${(parseErr as Error).message}`;
                if (imageUrl) URL.revokeObjectURL(imageUrl);
                Res.onLoadError(cacheKey, errMsg);
                error?.(errMsg);
            }
        };

        atlasReader.onerror = () => {
            const errMsg = `读取Atlas Blob失败：${atlasReader.error?.message}`;
            if (imageUrl) URL.revokeObjectURL(imageUrl);
            Res.onLoadError(cacheKey, errMsg);
            error?.(errMsg);
        };
    }

    private static _fixAtlasFormat(atlasJson: any, imageUrl: string): void {
        if (!atlasJson.meta) atlasJson.meta = {};
        atlasJson.meta.image = imageUrl;
        if (!atlasJson.meta.format) atlasJson.meta.format = "png";
        if (atlasJson.meta.scale === undefined) atlasJson.meta.scale = 1;
    }

    private static _createSubTextures(atlasJson: any, texture: Laya.Texture, key: string): Laya.Texture[] {
        const subTextures: Laya.Texture[] = [];
        const scaleRate = parseFloat(atlasJson.meta.scale);
        texture.scaleRate = scaleRate;

        for (const frameName in atlasJson.frames) {
            const frameData = atlasJson.frames[frameName];
            const frame = frameData.frame;

            const subTexture = Texture.create(
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
            const subTextureKey = `${key}_frame_${frameName}`;
            subTexture.url = subTextureKey;
            Laya.loader.cacheRes(subTextureKey, subTexture);
            subTextures.push(subTexture);
        }
        return subTextures;
    }
}