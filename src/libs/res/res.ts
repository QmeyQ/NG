/**
 * Res - 资源管理器，负责多包资源加载、包索引解析、内存缓存
 * 支持 Spine/Atlas 资源组识别，提供下载进度/错误/完成回调与 Promise 接口
 *
 * 调用约定(2026-10-21 优化):
 * - 包地址统一从 Res.ResList 取(勿散落硬编码 URL, 否则同名包索引互踢反复重下)
 * - 活动包只由 setAct 显式控制, url() 加载新包不再隐式抢占
 * - getList(packName?) 显式取指定包索引
 * - 服务器信息探测(_fetchServerInfo)同 URL 60s 内复用, vers+url 连续调用只发一次网络请求
 */
// Res.ts
import { Net } from "../net";
import { Code, PackInfo } from "../code";
import {MPM} from "../mpm"
import { mkBlob, blobAb } from "../wx"
import {ResLoader} from './resLoader'

// ==================== 索引结构 ====================
interface PackIndex {
    v: string;
    url: string;
    etag?: string;
    lm?: string;
    size?: number;
    files: Record<string, number>;
}

// ==================== MPM：轻量事件总线 ====================
/**
 * MPM — 事件多播管理
 * - 相对原版：off 语义修正、emit 预取 size、空集快速返回
 * - 事件名 -> Set<callback>
 */

// ==================== 模块级全局状态 ====================
let _initialized = false;
const _packMap: Map<string, { index: PackIndex; url: string }> = new Map();
/** 跨包重定向表: "nor/path" → "ui/path" (标记文件扫描 + setRedirect 手动注册, 第一段=包名) */
const _xRedirect: Map<string, string> = new Map();
let _activePackName = '';
const _cache: Map<string, any> = new Map();
const _groupInfo: Map<string, { type: 'spine' | 'atlas', files: string[] }> = new Map();
/**
 * 包内存文件表: packName → (filePath → Blob)。
 * 架构(2026-10-23): .br 整包落盘(net 层 url 为 key), 解包散文件不落盘——每次运行从 .br
 * 重新解压提取进内存使用(单包 nor 纯 JS 解压 278ms 实测可接受), 存储占用从 整包+解包双份
 * 降到仅整包; _loadFile 先查此表, miss 走 storage 兼容旧散文件缓存。
 */
const _packMem: Map<string, Map<string, Blob>> = new Map();

/**
 * 会话级"已验证"包集合: vers 比对完成/刚下载的包登记于此。
 * url 本地恢复(restoreFromPackBlob)查此集合跳过服务器比对——界面期 vers 是唯一比对点,
 * 用户拒绝更新 = 拍板本会话用本地版(点击时不得强制重下); 下载完成 = 必然最新。
 */
const _verifiedPacks: Set<string> = new Set();

/** _fetchServerInfo 成功结果短缓存(同 URL 60s 复用, vers+url 连续调用省一次网络探测) */
const _infoCache: Map<string, { t: number; info: { etag: string | null; lm: string | null; size: number } }> = new Map();
const _INFO_TTL = 60000;

/** 全局事件总线（Res.on / off / emit 全部转发到这里） */
const _emitter = new MPM();

export class Res {
    private static _loader = new ResLoader({
        get: path => Res.get(path),
        loadFile: (packName, filePath, type, callback) => Res._loadFile(packName, filePath, type, callback),
        hasPack: packName => _packMap.has(packName)
    });
    
    static net: Net;
    static ResList = {
        ui:"https://agc-storage-drcn.platform.dbankcloud.cn/v0/sgf-rhq1y/ui.br?token=35201a45-55f5-4e83-b2b0-a6ee8e2b2c5d",
        nor:"https://agc-storage-drcn.platform.dbankcloud.cn/v0/sgf-rhq1y/nor.br?token=aa436607-134d-4722-b4fb-6e43539d3c66"
    }

    // ==================== 初始化 ====================
    static init(): void {
        if (_initialized) return;
        Res.net = new Net();
        _initialized = true;
    }

    // ==================== 事件桥(下载进度 'DP' 等) ====================
    static on(event: string, cb: Function): void {
        _emitter.on(event, cb);
    }

    static off(event?: string, cb?: Function): void {
        _emitter.off(event, cb);
    }

    // ==================== 加载 .res/.br 包(含本地索引复用) ====================
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

        const clean = Res._cleanUrl(url);
        if (!clean.endsWith('.res') && !clean.endsWith('.br')) {
            console.warn('[Res] 仅支持 .res / .br 格式文件');
            onComplete?.(null as any);
            return;
        }

        const packName = Res._extractPackName(url);
        const indexKey = `res_idx::${packName}`;

        // 1. 检查本地索引
        Res.net.storage.get(indexKey, (cached: string | null) => {
            if (cached && !force) {
                try {
                    const idx: PackIndex = JSON.parse(cached);
                    if (!idx.url || idx.url !== url) {
                        idx.url = url;
                        Res.net.storage.set(indexKey, JSON.stringify(idx), () => {});
                    }
                    // 2. 本地 .br 整包恢复: 服务器比对(大小一致才认为正确) → 内存解包散文件
                    Res._restoreFromPackBlob(url, packName, idx, onComplete);
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

    /**
     * 本地 .br 整包恢复(v2 架构): 散文件不再持久化, 每次运行从 .br 重新解压进内存。
     * 服务器比对(缓存未经比对不得使用): etag/lm 优先, 大小兜底——本地 blob.size 与服务器
     * size 不一致 = 缓存损坏/旧版 → 清缓存重下; 探测拿不到头(全空)时 blob 存在即用(兼容 AGC 无头)。
     */
    private static _restoreFromPackBlob(url: string, packName: string, idx: PackIndex, onComplete?: (info: PackInfo) => void): void {
        Res.net.cGet(url, (cached: any) => {
            const blob: Blob | null = (cached && (cached as Blob).size > 0) ? cached as Blob : null;
            if (!blob) {
                console.warn(`[Res] 本地 .br 缓存缺失, 重新下载: ${packName}`);
                Res._purgePackCache(url, packName);
                Res._downloadAndExtract(url, false, packName, onComplete);
                return;
            }

            // 会话已验证(界面期 vers 比对过/刚下载): 跳过服务器比对直接内存解包——
            // 用户拒绝更新后点击进入 = 拍板用本地版, 不得强制重下
            if (_verifiedPacks.has(packName)) {
                console.log(`[Res] 会话已验证, 直接内存解包: ${packName}(${blob.size} bytes)`);
                Res._processDownloadedBlob(blob, url, packName, onComplete);
                return;
            }

            Res._fetchServerInfo(url, (info) => {
                const purge = (why: string) => {
                    console.warn(`[Res] 本地缓存${why}, 清除重下: ${packName}(本地 ${blob.size} bytes)`);
                    Res._purgePackCache(url, packName);
                    Res._downloadAndExtract(url, false, packName, onComplete);
                };

                if (info.etag && idx.etag && info.etag !== idx.etag) { purge('etag 不一致'); return; }
                if (!info.etag && info.lm && idx.lm && info.lm !== idx.lm) { purge('lm 不一致'); return; }
                if ((info.size || 0) !== 0 && blob.size !== info.size) { purge('大小与服务器不一致'); return; }

                // 探测拿不到头(etag/lm/size 全空) → 无法比对, blob 存在即用(最大化兼容)
                console.log(`[Res] 本地 .br 校验通过(${blob.size} bytes${(info.size || 0) > 0 ? ', 与服务器一致' : ', 服务器头不可用'}), 内存解包: ${packName}`);
                Res._processDownloadedBlob(blob, url, packName, onComplete);
            }, true);
        });
    }

    /** 清包缓存: .br 整包 + res_idx + pmeta(散文件旧缓存与内存表由重下覆盖) */
    private static _purgePackCache(url: string, packName: string): void {
        Res.net.cRemove(url, () => { });
        Res.net.storage.delete(`res_idx::${packName}`, () => { });
        Res.net.storage.delete(`res_pmeta::${packName}`, () => { });
        const mem = _packMem.get(packName);
        if (mem) mem.clear();
    }

    private static _extractPackName(url: string): string {
        const clean = Res._cleanUrl(url);
        const fileName = clean.substring(clean.lastIndexOf('/') + 1);
        return fileName.replace(/\.(res|br)$/, '');
    }

    private static _cleanUrl(url: string): string {
        const q = url.indexOf('?');
        return q >= 0 ? url.substring(0, q) : url;
    }
    private static _buildFileTree(index: PackIndex): any {
        const tree: any = {};
        const files = index.files;
        for (const filePath in files) {
            const parts = filePath.split('/');
            const last = parts.length - 1;
            let current = tree;
            for (let i = 0; i < last; i++) {
                const part = parts[i];
                if (!current[part]) current[part] = {};
                current = current[part];
            }
            current[parts[last]] = [0, files[filePath]];
        }
        return tree;
    }

    // ==================== 下载并提取 ====================
    private static _downloadAndExtract(
        url: string,
        force: boolean,
        packName: string,
        onComplete?: (info: PackInfo) => void
    ): void {
        // force 重下前先试整包缓存恢复: 上次网络下载成功但解压/提取/存档中断(如 Brotli 失败),
        // net 层整包 Blob 以 url 为 key 留存, 版本与服务器一致则直接复用不走网络
        if (force) {
            Res._tryPackCache(url, packName, (hit) => {
                if (hit) {
                    console.log(`[Res] 整包缓存版本一致(${hit.size} bytes)，直接恢复`);
                    Res._processDownloadedBlob(hit, url, packName, onComplete);
                    return;
                }
                Res._netDownload(url, force, packName, onComplete);
            });
            return;
        }
        Res._netDownload(url, force, packName, onComplete);
    }

    private static _netDownload(
        url: string,
        force: boolean,
        packName: string,
        onComplete?: (info: PackInfo) => void
    ): void {
        Res.net.download(url, {
            key: `res_file_${Res._cleanUrl(url)}`,
            force,
            cache: true,
            onProgress: (percent: number, s: number, l: number, t: number) => {
                _emitter.emit('DP', url, percent, s, l, t)
            },
            onComplete: (blob: Blob) => {
                if (!blob) {
                    const err = '下载的包为空';
                    console.error('[Res]', err);
                    onComplete?.(null as any);

                    _emitter.emit('PE', url, err);
                    return;
                }
                console.log(`[Res] 下载完成，大小: ${blob.size} bytes`);
                Res._processDownloadedBlob(blob, url, packName, onComplete);
            },
            onError: (msg: string) => {
                console.error('[Res] 下载失败:', msg);
                onComplete?.(null as any);
                _emitter.emit('PE', url, msg);
            }
        });
    }

    /** 整包缓存版本检查: net 层缓存 Blob + 下载成功时落盘的 pmeta 元数据 vs 服务器最新头, 一致返回 Blob 否则清缓存返 null */
    private static _tryPackCache(url: string, packName: string, cb: (blob: Blob | null) => void): void {
        Res.net.cGet(url, (cached: any) => {
            const blob: Blob | null = (cached && (cached as Blob).size > 0) ? cached as Blob : null;
            if (!blob) { cb(null); return; }
            Res._fetchServerInfo(url, (info) => {
                // 探测失败拿不到服务器版本, 无法判定, 走网络下载
                if (!info.etag && !info.lm && !info.size) { cb(null); return; }
                Res.net.storage.get(`res_pmeta::${packName}`, (str: string | null) => {
                    let meta: any = null;
                    if (str) { try { meta = JSON.parse(str); } catch { } }
                    const same = meta ? (
                        (info.etag && meta.etag && info.etag === meta.etag) ||
                        (!info.etag && info.lm && meta.lm && info.lm === meta.lm) ||
                        ((info.size || 0) !== 0 && (meta.size || 0) !== 0 && info.size === meta.size)
                    ) : ((info.size || 0) !== 0 && blob.size === info.size);  // 无 meta 时 blob 尺寸兜底
                    if (same) { cb(blob); return; }
                    Res.net.cRemove(url, () => { });  // 旧版本整包, 清理后重下
                    cb(null);
                });
            }, true);
        });
    }

    /** 已拿到整包 Blob 后统一处理: Brotli 解压(.br) → 解析容器 → 提取文件落盘 → 存索引 */
    private static _processDownloadedBlob(
        blob: Blob,
        url: string,
        packName: string,
        onComplete?: (info: PackInfo) => void
    ): void {
        const isBr = Res._cleanUrl(url).endsWith('.br');

        const proceed = (containerBlob: Blob, containerBuffer?: ArrayBuffer) => {
            Code.parsePack(containerBlob,
                (packInfo: PackInfo) => {
                    // 内联 _getAllFilesFromPackInfo
                    const allFiles: string[] = [];
                    (function collect(obj: any, path: string) {
                        for (const key in obj) {
                            const val = obj[key];
                            const curPath = path ? path + '/' + key : key;
                            if (val instanceof Array && val.length === 2) {
                                allFiles.push(curPath);
                            } else if (typeof val === 'object') {
                                collect(val, curPath);
                            }
                        }
                    })(packInfo.files, '');

                    const index: PackIndex = {
                        v: packInfo.version || '1.0',
                        url,
                        files: {}
                    };

                    const container = containerBuffer!;
                    // 散文件提取进内存表(不落盘): 存储只留 .br 整包, 运行时解压复用
                    let memFiles = _packMem.get(packName);
                    if (!memFiles) { memFiles = new Map<string, Blob>(); _packMem.set(packName, memFiles); }
                    else memFiles.clear();
                    // 提取(解压)进度事件 'XP': 同步循环内按 ~5% 粒度 emit(slecet 预测进度条锚定真值)
                    const xpStep = Math.max(1, Math.floor(allFiles.length / 20));
                    for (let i = 0; i < allFiles.length; i++) {
                        const filePath = allFiles[i];
                        const fileBlob = Code.extractFile(container, packInfo, filePath);
                        if (!fileBlob) {
                            console.error(`[Res] 提取失败: ${packName}/${filePath}`);
                            continue;
                        }
                        memFiles.set(filePath, fileBlob);
                        index.files[filePath] = fileBlob.size;
                        if (i % xpStep === 0 || i === allFiles.length - 1) {
                            _emitter.emit('XP', packName, (i + 1) / allFiles.length);
                        }
                    }

                    {
                        _packMap.set(packName, { index, url });
                        const idxKey = `res_idx::${packName}`;
                        const saveIndex = () => {
                            Res.net.storage.set(idxKey, JSON.stringify(index), (ok: boolean) => {
                                console.log(`[Res] 索引写入${ok ? '成功' : '失败!! 检查 wx storage 容量/单key 1MB 上限'}: ${idxKey} files=${Object.keys(index.files).length} size=${index.size || '无'}`);
                                // v2 架构: 索引正确记录后清扫该包旧落盘散文件(已内存化, 死数据占配额)
                                if (ok) {
                                    for (const filePath in index.files) {
                                        Res.net.storage.deleteFile(packName + '@' + filePath, () => { });
                                    }
                                }
                                Res._analyzeGroupsFromIndex(packName);
                                const fakePackInfo = { files: Res._buildFileTree(index) } as PackInfo;
                                onComplete?.(fakePackInfo);
                                _emitter.emit('PL', packName, fakePackInfo);
                            });
                        };
                        Res._fetchServerInfo(url, (info) => {
                            if (info.etag) index.etag = info.etag;
                            if (info.lm) index.lm = info.lm;
                            // 头拿不到时用整包字节数兜底: 否则 res_idx 无版本字段,
                            // 重进 vers 判 hasLocal=false → needUpdate=true 每次全量重下
                            index.size = info.size || blob.size;
                            console.log(`[Res] 索引版本头写入: etag=${index.etag || '无'} lm=${index.lm || '无'} size=${index.size}(info.size=${info.size || 0}, 兜底=${!info.size ? blob.size : 0})`);
                            const meta = { etag: info.etag || null, lm: info.lm || null, size: info.size || blob.size };
                            Res.net.storage.set(`res_pmeta::${packName}`, JSON.stringify(meta), () => { });
                            saveIndex();
                        });
                    }
                },
                (error) => {
                    console.error('[Res] 解析包失败:', error);
                    onComplete?.(null as any);
                    _emitter.emit('PE', url, error);
                }
            );
        };

        if (isBr) {
            // 核心修改：先读取前4个字节判断是否已被网关自动解压
            blobAb(blob).then((ab) => {
                // 如果 blob 非常小，说明是错误包，直接走解压报错流程
                if (ab.byteLength < 4) {
                    proceed(blob, ab);
                    return;
                }

                const headBytes = new Uint8Array(ab.slice(0, 4));
                const magic = String.fromCharCode(...headBytes);

                if (magic === 'BRP1') {
                    console.log('[Res] 检测到数据已是 BRP1 格式 (已被网关自动解压)，跳过 Brotli 解压');
                    proceed(blob, ab);
                } else {
                    console.log('[Res] 检测到未解压的 .br 数据，开始 Brotli 解压');
                    Code.decompressBr(blob, (containerBuffer: ArrayBuffer) => {
                        proceed(mkBlob([containerBuffer]), containerBuffer);
                    }, (err: string) => {
                        // 兜底：如果 Brotli 解压器还是报错，把原数据塞给 parsePack 去报具体的格式错误，避免黑屏卡死
                        console.warn(`[Res] Brotli 解压失败，尝试透传原数据。原错误: ${err}`);
                        proceed(blob, ab);
                    });
                }
            }).catch(() => {
                onComplete?.(null as any);
                _emitter.emit('PE', url, '读取容器失败');
            });
        } else {
            const reader = new FileReader();
            reader.onload = () => proceed(blob, reader.result as ArrayBuffer);
            reader.onerror = () => {
                onComplete?.(null as any);
                _emitter.emit('PE', url, '读取容器失败');
            };
            reader.readAsArrayBuffer(blob);
        }
    }

    // ==================== 资源组识别 ====================
    private static _analyzeGroupsFromIndex(packName: string): void {
        // group key 带包前缀(packName@baseName), 重析时只清本包, 不影响其他包
        const gPrefix = packName + '@';
        for (const key of Array.from(_groupInfo.keys())) {
            if (key.indexOf(gPrefix) === 0) _groupInfo.delete(key);
        }
        // 跨包标记文件扫描(建重定向表) + 标记文件不参与分组(空文件无内容意义)
        Res._scanXRedirect(packName);
        const packData = _packMap.get(packName);
        if (!packData) return;
        const files = packData.index.files;

        const potentialGroups: Map<string, string[]> = new Map();
        for (const filePath in files) {
            if (Res._isXMark(filePath)) continue;
            const lastDot = filePath.lastIndexOf('.');
            if (lastDot === -1) continue;
            const baseName = filePath.substring(0, lastDot);
            let arr = potentialGroups.get(baseName);
            if (!arr) { arr = []; potentialGroups.set(baseName, arr); }
            arr.push(filePath);
        }

        potentialGroups.forEach((groupFiles, baseName) => {
            let hasPng = false, hasAtlas = false, hasSkel = false;
            const n = groupFiles.length;
            for (let i = 0; i < n; i++) {
                const f = groupFiles[i];
                if (!hasPng && (f.endsWith('.png') || f.endsWith('.jpg'))) hasPng = true;
                else if (!hasAtlas && f.endsWith('.atlas')) hasAtlas = true;
                else if (!hasSkel && (f.endsWith('.skel') || f.endsWith('.sk') || f.endsWith('.json'))) hasSkel = true;
            }
            if (hasPng && hasAtlas) {
                _groupInfo.set(gPrefix + baseName, { type: hasSkel ? 'spine' : 'atlas', files: groupFiles });
            }
        });
    }

    // ==================== 完整性校验 ====================
    static check(
        externalIndex?: PackIndex,
        packName?: string
    ): Promise<{ valid: boolean; missing: string[]; sizeMismatch: string[] }> {
        return new Promise((resolve) => {
            let targetIndex = externalIndex;
            let targetPackName = packName;
            if (!targetIndex) {
                if (_activePackName) {
                    targetPackName = _activePackName;
                    targetIndex = _packMap.get(targetPackName)?.index;
                } else {
                    const first = _packMap.entries().next().value;
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

            const storage = Res.net.storage;
            const idxFiles = targetIndex.files;
            const pn = targetPackName;

            // v2 架构: 内存表优先校验(.br 运行时解压产物); miss 走 storage 散文件(旧缓存兼容)
            const mem = _packMem.get(pn);
            if (mem && mem.size > 0) {
                for (let i = 0; i < files.length; i++) {
                    const filePath = files[i];
                    const b = mem.get(filePath);
                    if (!b) missing.push(filePath);
                    else if (b.size !== idxFiles[filePath]) sizeMismatch.push(filePath);
                }
                resolve({
                    valid: missing.length === 0 && sizeMismatch.length === 0,
                    missing, sizeMismatch
                });
                return;
            }

            for (let i = 0; i < files.length; i++) {
                const filePath = files[i];
                const fileKey = pn + '@' + filePath;
                const expectedSize = idxFiles[filePath];
                storage.getFile(fileKey, (blob: Blob | null) => {
                    if (!blob) {
                        console.warn(`[Res] 缺失文件: ${fileKey}`);
                        missing.push(filePath);
                    } else if (blob.size !== expectedSize) {
                        console.warn(`[Res] 大小不匹配: ${fileKey} (期望 ${expectedSize}, 实际 ${blob.size})`);
                        sizeMismatch.push(filePath);
                    }
                    if (--pending === 0) {
                        resolve({
                            valid: missing.length === 0 && sizeMismatch.length === 0,
                            missing, sizeMismatch
                        });
                    }
                });
            }
        });
    }

    // ==================== 版本对比 ====================
    static vers(
        url: string,
        cb: (result: { packName: string; url: string; localEtag: string | null; serverEtag: string | null; localLm: string | null; serverLm: string | null; localSize: number; serverSize: number; needUpdate: boolean, size: number }) => void
    ): void;
    static vers(cb: (results: {
        packName: string; url: string;
        localEtag: string | null; serverEtag: string | null;
        localLm: string | null; serverLm: string | null;
        serverSize: number; localSize: number; needUpdate: boolean;
    }[]) => void): void;
    static vers(arg1: any, arg2?: any): void {
        Res.init();
        if (typeof arg1 === 'function') {
            const cb = arg1 as (results: any[]) => void;
            Res.net.storage.getKeys((keys:any) => {
                const allKeys: string[] = keys.dataKeys;
                const idxKeys: string[] = [];
                for (let i = 0; i < allKeys.length; i++) {
                    const k = allKeys[i];
                    if (k.startsWith('res_idx::')) idxKeys.push(k);
                }
                if (idxKeys.length === 0) { cb([]); return; }
                const results: any[] = [];
                let pending = idxKeys.length;
                const done = () => { if (--pending === 0) cb(results); };
                for (let i = 0; i < idxKeys.length; i++) {
                    const ik = idxKeys[i];
                    Res.net.storage.get(ik, (str: string | null) => {
                        if (!str) { done(); return; }
                        try {
                            const idx: PackIndex = JSON.parse(str);
                            // 兼容旧版被 token 污染的索引 key, 剥离 query 还原真实包名
                            const packName = ik.substring(10).split('?')[0];
                            const serverUrl = idx.url || '';
                            if (!serverUrl) { done(); return; }
                            Res._fetchServerInfo(serverUrl, (info) => {
                                const needUpdate = (info.etag && idx.etag && info.etag !== idx.etag) ||
                                    (!info.etag && info.lm && idx.lm && info.lm !== idx.lm) ||
                                    (!info.etag && info.size && idx.size && info.size !== idx.size);
                                results.push({
                                    packName, url: serverUrl,
                                    localEtag: idx.etag || null, serverEtag: info.etag || null,
                                    localLm: idx.lm || null, serverLm: info.lm || null,
                                    serverSize: info.size, localSize: idx.size || 0,
                                    needUpdate, size: info.size
                                });
                                done();
                            }, true);
                        } catch { done(); }
                    });
                }
            });
        } else {
            const url = arg1 as string;
            const cb = arg2 as (result: any) => void;
            const cleanUrl = Res._cleanUrl(url);
            const slashIdx = cleanUrl.lastIndexOf('/');
            const packName = cleanUrl.substring(slashIdx + 1).replace(/\.(res|br)$/, '');
            const indexKey = `res_idx::${packName}`;
            Res.net.storage.get(indexKey, (str: string | null) => {
                let localEtag: string | null = null, localLm: string | null = null, localSize: number = 0;
                if (str) {
                    try {
                        const idx = JSON.parse(str) as PackIndex;
                        localEtag = idx.etag || null; localLm = idx.lm || null; localSize = idx.size || 0;
                        console.log(`[Res] vers 本地索引: ${indexKey} len=${str.length} files=${Object.keys(idx.files || {}).length} etag=${localEtag || '无'} lm=${localLm || '无'} size=${localSize}`);
                    } catch (e) { console.warn(`[Res] vers 本地索引解析失败: ${indexKey}`, e); }
                } else {
                    console.log(`[Res] vers 无本地索引: ${indexKey}(首次/清缓存/上次写入失败)`);
                }
                Res._fetchServerInfo(url, (info) => {
                    // 本地无索引(首次/清数据)必下载; 服务器信息拿不到(网络失败)且本地有索引才放行(离线兜底)
                    const hasLocal = !!(localEtag || localLm || localSize);
                    const needUpdate = !hasLocal ||
                        (info.etag && localEtag && info.etag !== localEtag) ||
                        (!info.etag && info.lm && localLm && info.lm !== localLm) ||
                        (!info.etag && info.size && localSize && info.size !== localSize);
                    cb({
                        packName, url,
                        localEtag, serverEtag: info.etag || null,
                        localLm, serverLm: info.lm || null,
                        localSize, serverSize: info.size,
                        needUpdate, size: info.size
                    });
                }, true);
            });
        }
    }
    /**
     * 服务器头信息探测(etag/lm/size)
     * @param force true=绕过 TTL 缓存强制真实探测(vers 版本检查必传, 保证用户主动点击时必发网络请求且即时感知新版本)
     * 探测成功仍刷新缓存时间戳, 紧随的 url() 注册复用结果省第二次请求
     */
    private static _fetchServerInfo(
        url: string,
        cb: (info: { etag: string | null; lm: string | null; size: number }) => void,
        force = false
    ): void {
        if (!_initialized) Res.init();
        const hit = _infoCache.get(url);
        if (!force && hit && Date.now() - hit.t < _INFO_TTL) { cb(hit.info); return; }
        Res.net.fetchInfo(url)
            .then((info: any) => {
                const r = { etag: info.etag, lm: info.lm, size: info.size };
                if (r.etag || r.lm || r.size) _infoCache.set(url, { t: Date.now(), info: r });
                cb(r);
            })
            .catch(() => cb({ etag: null, lm: null, size: 0 }));
    }

    // ==================== 异步获取资源 ====================
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
            Res._getInternal(path, type, (resource) => {
                if (resource !== null) resolve(resource);
                else reject(`资源加载失败: ${path}`);
            });
        });

        if (callback) {
            promise.then(res => callback!(res)).catch(err => { console.error(err); callback!(null); });
            return;
        }
        return promise;
    }

    private static _getInternal(path: string, type: 'blob' | 'auto', callback: (resource: any) => void): void {
        Res._getInternal2(path, type, callback, 0);
    }

    /** depth = 跨包重定向跳数(防 A→B→A 循环, 最多 4 跳) */
    private static _getInternal2(path: string, type: 'blob' | 'auto', callback: (resource: any) => void, depth: number): void {
        if (!path) { console.error('[Res] 路径不能为空'); callback(null); return; }
        if (_packMap.size === 0) { console.error('[Res] 没有已加载的资源包'); callback(null); return; }

        // 路径归一化: 旧 "包名@路径" → "包名/路径"(渐进兼容存量调用方)
        let p = path;
        const atIdx = p.indexOf('@');
        if (atIdx > 0 && _packMap.has(p.substring(0, atIdx))) {
            p = p.substring(0, atIdx) + '/' + p.substring(atIdx + 1);
        }

        let packName: string;
        let filePath: string;
        // 新路径算法: 第一段根目录 = 包名(如 "nor/girl/lani/stand.lani" → nor 包内 girl/lani/stand.lani)
        const slashIdx = p.indexOf('/');
        if (slashIdx > 0 && _packMap.has(p.substring(0, slashIdx))) {
            packName = p.substring(0, slashIdx);
            filePath = p.substring(slashIdx + 1);
        } else {
            // 无包前缀: 遍历挂载包匹配路径
            const found = Res._findPackForPath(p);
            if (!found) {
                console.warn(`[Res] 路径未匹配任何文件: ${path}`);
                callback(null);
                return;
            }
            packName = found.packName;
            filePath = found.filePath;
        }

        // 跨包重定向: 标记文件(包内 "path@目标包" 空文件)或 setRedirect 注册的映射, O(1) 查表
        if (depth < 4) {
            const rd = _xRedirect.get(packName + '/' + filePath);
            if (rd) {
                console.log(`[Res] 跨包调度: ${packName}/${filePath} → ${rd}`);
                Res._getInternal2(rd, type, callback, depth + 1);
                return;
            }
        }

        const groupKey = packName + '@' + filePath;
        if (_groupInfo.has(groupKey)) {
            Res._loadGroup(packName, groupKey, (success, resource) => {
                callback(success ? resource : null);
            });
            return;
        }

        const paths = Res._parsePathForPack(packName, filePath);
        const count = paths.length;

        if (count === 0) {
            // 跨包重定向: .ls 内引用写死包前缀但资源实际打进另一包(编辑器 ui@ 前缀 vs 资源在 nor 包 ui/ 子目录)
            const fb = Res._resolveFallback(packName, filePath);
            if (fb) {
                console.warn(`[Res] 跨包重定向: ${path} → ${fb.packName}/${fb.filePath}`);
                Res._getInternal2(fb.packName + '/' + fb.filePath, type, callback, depth + 1);
                return;
            }
            console.warn(`[Res] 路径未匹配任何文件: ${path}`);
            callback(null);
            return;
        }

        if (count === 1) {
            const singlePath = paths[0];
            Res._loadFile(packName, singlePath, type, (resource) => {
                callback(resource);
                // 文件级事件
                _emitter.emit('FL', packName, singlePath, resource);
            });
            return;
        }

        const resources: Record<string, any> = {};
        let completed = 0;
        let hasError = false;
        for (let i = 0; i < count; i++) {
            const p = paths[i];
            Res._loadFile(packName, p, type, (res) => {
                const slash = p.lastIndexOf('/');
                const fileName = slash >= 0 ? p.substring(slash + 1) : p;
                if (res !== null) resources[fileName] = res;
                else hasError = true;
                if (++completed === count) {
                    callback(hasError && Object.keys(resources).length === 0 ? null : resources);
                }
            });
        }
    }

    private static _findPackForPath(path: string): { packName: string; filePath: string } | null {
        if (_activePackName) {
            const index = _packMap.get(_activePackName)?.index;
            if (index && index.files.hasOwnProperty(path)) {
                return { packName: _activePackName, filePath: path };
            }
            if (_groupInfo.has(_activePackName + '@' + path)) {
                return { packName: _activePackName, filePath: path };
            }
        }
        for (const [name, data] of _packMap) {
            if (data.index.files.hasOwnProperty(path)) {
                return { packName: name, filePath: path };
            }
            if (_groupInfo.has(name + '@' + path)) {
                return { packName: name, filePath: path };
            }
        }
        return null;
    }

    /**
     * 跨包重定向: 显式前缀包未命中时, 在其他已加载包中按两种形式查找——
     * 原路径(main/pve1.png) / 包名拼进路径(ui/main/pve1.png)。
     * 场景: .ls 编辑器把纹理引用前缀写死 ui@, 资源却打进 nor 包 ui/ 子目录。
     */
    private static _resolveFallback(packName: string, filePath: string): { packName: string; filePath: string } | null {
        const alt = packName + '/' + filePath;
        for (const [name, data] of _packMap) {
            if (name === packName) continue;
            if (data.index.files.hasOwnProperty(filePath)) return { packName: name, filePath };
            if (data.index.files.hasOwnProperty(alt)) return { packName: name, filePath: alt };
        }
        return null;
    }

    /** 路径是否为跨包标记文件(文件名末段 "@目标包名", 如 internal/UI/comp.atlas@ui) */
    private static _isXMark(filePath: string): boolean {
        const name = filePath.substring(filePath.lastIndexOf('/') + 1);
        const at = name.indexOf('@');
        return at > 0 && at < name.length - 1;
    }

    /**
     * 扫描包内跨包标记文件建重定向表(索引就绪时调用一次, get 时 O(1) 查表):
     * 包内存在 "path@目标包名" 空标记 → get("本包@path") 重定向到 "目标包名@path"。
     * 同路径文件本包未命中时另有 _resolveFallback 隐式跨包兜底(无需标记)。
     */
    private static _scanXRedirect(packName: string): void {
        const gPrefix = packName + '@';
        for (const k of Array.from(_xRedirect.keys())) {
            if (k.indexOf(gPrefix) === 0) _xRedirect.delete(k);
        }
        const files = _packMap.get(packName)?.index.files;
        if (!files) return;
        for (const filePath in files) {
            if (!Res._isXMark(filePath)) continue;
            const name = filePath.substring(filePath.lastIndexOf('/') + 1);
            const src = filePath.substring(0, filePath.length - name.length) + name.substring(0, name.indexOf('@'));
            const target = name.substring(name.indexOf('@') + 1);
            _xRedirect.set(packName + '/' + src, target + '/' + src);
        }
    }

    /** 手动注册跨包重定向(优先级同标记文件, 适合纯代码配置): from/to 形如 "nor/internal/UI/comp.atlas"(第一段=包名) */
    static setRedirect(from: string, to: string): void {
        _xRedirect.set(from, to);
    }

    /** 登记包为"会话已验证"(vers 比对完成/下载完成): url 本地恢复跳过服务器比对 */
    static markVerified(packName: string): void {
        _verifiedPacks.add(packName);
    }

    /** 包是否本会话已验证(vers 比对过或刚下载) */
    static hasVerified(packName: string): boolean {
        return _verifiedPacks.has(packName);
    }

    private static _parsePathForPack(packName: string, path: string): string[] {
        const index = _packMap.get(packName)?.index;
        if (!index) return [];
        if (index.files.hasOwnProperty(path)) return [path];
        const prefix = path.endsWith('/') ? path : path + '/';
        const matches: string[] = [];
        for (const f in index.files) {
            if (f.startsWith(prefix)) matches.push(f);
        }
        return matches;
    }

    private static _loadFile(
        packName: string,
        filePath: string,
        type: 'blob' | 'auto',
        callback: (resource: any) => void
    ): void {
        const cacheKey = packName + '@' + filePath;
        if (type === 'auto') {
            const cached = _cache.get(cacheKey);
            if (cached !== undefined) { callback(cached); return; }
        }

        // 内存表优先(v2 架构: .br 运行时解压产物); miss 走 storage 兼容旧散文件缓存
        const memBlob = _packMem.get(packName)?.get(filePath);
        if (memBlob) {
            if (type === 'blob') { callback(memBlob); return; }
            Res._loader.parseBlobToEngineObject(packName, filePath, memBlob, (obj) => {
                if (obj) _cache.set(cacheKey, obj);
                else console.warn(`[Res] 解析失败: ${filePath}`);
                callback(obj);
            });
            return;
        }

        Res.net.storage.getFile(cacheKey, (blob: Blob | null) => {
            if (!blob) { console.error(`[Res] 文件不存在: ${cacheKey}`); callback(null); return; }

            if (type === 'blob') { callback(blob); return; }

            Res._loader.parseBlobToEngineObject(packName, filePath, blob, (obj) => {
                if (obj) _cache.set(cacheKey, obj);
                else console.warn(`[Res] 解析失败: ${filePath}`);
                callback(obj);
            });
        });
    }

    // ==================== 资源组加载 ====================
    private static _loadGroup(
        packName: string,
        groupName: string,
        callback: (success: boolean, resource: any) => void
    ): void {
        // groupName 已带包前缀(packName@baseName), 直接作为缓存键
        const cacheKey = groupName;
        const cached = _cache.get(cacheKey);
        if (cached) { callback(true, cached); return; }

        const info = _groupInfo.get(groupName);
        if (!info) { console.error(`[Res] 资源组不存在: ${groupName}`); callback(false, null); return; }

        const files = info.files;
        const total = files.length;
        const blobs: Map<string, Blob> = new Map();
        let completed = 0;
        let hasError = false;

        const checkComplete = () => {
            if (completed < total) return;
            if (hasError) { callback(false, null); return; }

            let pngFile: string | undefined;
            let atlasFile: string | undefined;
            let skFile: string | undefined;
            for (let i = 0; i < total; i++) {
                const f = files[i];
                if (!pngFile && (f.endsWith('.png') || f.endsWith('.jpg'))) pngFile = f;
                else if (!atlasFile && f.endsWith('.atlas')) atlasFile = f;
                else if (!skFile && (f.endsWith('.skel') || f.endsWith('.sk') || f.endsWith('.json'))) skFile = f;
            }

            if (info.type === 'spine') {
                if (pngFile && atlasFile && skFile) {
                    Res._loader.createSpine(blobs.get(pngFile)!, blobs.get(atlasFile)!, blobs.get(skFile)!, cacheKey, (spine) => {
                        if (spine) { _cache.set(cacheKey, spine); callback(true, spine); }
                        else callback(false, null);
                    });
                } else callback(false, null);
            } else {
                if (pngFile && atlasFile) {
                    Res._loader.createAtlas(blobs.get(pngFile)!, blobs.get(atlasFile)!, cacheKey, (atlas) => {
                        if (atlas) { _cache.set(cacheKey, atlas); callback(true, atlas); }
                        else callback(false, null);
                    });
                } else callback(false, null);
            }
        };

        for (let i = 0; i < total; i++) {
            const filePath = files[i];
            // 走 _loadFile(内存表优先——存储 v2 散文件不落盘, storage 直读必 miss)
            Res._loadFile(packName, filePath, 'blob', (blob: Blob | null) => {
                if (blob) blobs.set(filePath, blob);
                else { console.error(`[Res] 资源组文件缺失: ${packName}/${filePath}`); hasError = true; }
                completed++;
                checkComplete();
            });
        }
    }

    // ==================== 公共 API ====================

    /** 取包索引: 显式传 packName 优先, 其次活动包(setAct), 兜底第一个已加载包 */
    static getList(packName?: string): any {
        const pn = packName || _activePackName;
        if (pn) return _packMap.get(pn)?.index || null;
        const first = _packMap.values().next().value;
        return first ? first.index : null;
    }

    /**
     * 头像键归一(唯一口径): 云端存的 head 可能是当前包里根本不存在的旧路径
     * (弃用的 0101 那套 30 张头像)或空串——直接 Res.get 会静默空白, 玩家看到的就是"头像没显示"。
     * 这里统一回落到包里真实存在的第一张; 包索引还没就绪时原样返回(别把合法路径误判成不存在)。
     */
    static headKey(head?: string): string {
        const files = Res.getList("ui")?.files || {};
        if (head && files[head]) return head;
        const hs = Object.keys(files)
            .filter(p => p.indexOf("head/") === 0 && /\.(png|jpe?g|webp|bmp)$/i.test(p))
            .sort();
        return hs.length ? hs[0] : (head || "");
    }

    /**
     * 头像 → 角色模型(0=girl1, 1=boy): 当前包 head/0.png(女巫)、3.png(天使) 为女，
     * head/2.png(棕发)、4.png(白发) 为男——序号奇偶与性别无关，必须逐张登记。
     * 旧 30 头像包(head/0101..0404 女、head/1111..1414 男)按编号段定性别。
     * 不能再按排序序号奇偶：排序既会把 0102(女)判成 boy，也会把 head/3(女)判成 boy，
     * 场上就出现「头像都是 girl、模型却是 boy」。
     */
    private static readonly HEAD_MODEL: Record<string, number> = {
        "head/0.png": 0, "head/3.png": 0,
        "head/2.png": 1, "head/4.png": 1
    };

    static headModel(head?: string): number {
        const key = Res.headKey(head);
        const m = Res.HEAD_MODEL[key];
        if (m != null) return m;
        // 旧包头像名是 4 位编号: 01xx..04xx 女 → girl1, 11xx..14xx 男 → boy。
        const base = key.replace(/^.*\//, "").replace(/\.[a-z0-9]+$/i, "");
        if (/^0\d{3}$/.test(base)) return 0;
        if (/^1\d{3}$/.test(base)) return 1;
        const files = Res.getList("ui")?.files || {};
        const hs = Object.keys(files)
            .filter(p => p.indexOf("head/") === 0 && /\.(png|jpe?g|webp|bmp)$/i.test(p))
            .sort();
        const i = hs.indexOf(key);
        return i >= 0 ? (i % 2) : 0;
    }

    /**
     * 反查:当前包里第一个映射到指定模型(0=girl1, 1=boy)的真实头像路径。
     * 程序指定角色(如人机)的展示头像时用它,不能硬编码 head/1.png——当前包是
     * head/0、2、3、4,旧 30 头像包是 head/0101..,都没有这个键;headKey 会回落首张
     * 头像,导致头像与模型又不一致。
     */
    static headForModel(model: number): string {
        const files = Res.getList("ui")?.files || {};
        const hs = Object.keys(files)
            .filter(p => p.indexOf("head/") === 0 && /\.(png|jpe?g|webp|bmp)$/i.test(p))
            .sort();
        for (const h of hs) if (Res.headModel(h) === model) return h;
        return "";
    }

    static getTab(): Record<string, { v: string; fileCount: number; sampleFiles: string[] }> {
        const tab: any = {};
        for (const [name, data] of _packMap) {
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
        if (_packMap.has(packName)) {
            _activePackName = packName;
            console.log(`[Res] 切换活动包: ${packName}`);
            return true;
        }
        console.warn(`[Res] 包不存在: ${packName}`);
        return false;
    }

    static clear(key: string): void {
        if (key) {
            _cache.delete(key);
            // 键形态归一化: 外部传 v2 路径键("nor/match/match.ls")而内部缓存键是 @ 形态
            // ("nor@match/match.ls")——第一段是挂载包名时双清, 防尸体缓存清不掉(nav 重试必失败根因)
            const slash = key.indexOf('/');
            if (slash > 0 && _packMap.has(key.substring(0, slash))) {
                _cache.delete(key.substring(0, slash) + '@' + key.substring(slash + 1));
            }
            return;
        }
        _cache.clear();
        _packMem.clear();
        console.log('[Res] 内存缓存已清空(含包文件内存表)');
    }

    static async preload(paths?: string | string[]): Promise<boolean | { success: number; error: number; total: number }> {
        if (_packMap.size === 0) {
            console.error('[Res] 没有已加载的资源包');
            return paths ? false : { success: 0, error: 0, total: 0 };
        }

        let targetPaths: string[];
        if (!paths) {
            targetPaths = [];
            for (const [name, data] of _packMap) {
                const files = Object.keys(data.index.files);
                for (let i = 0; i < files.length; i++) targetPaths.push(name + '@' + files[i]);
            }
        } else {
            targetPaths = Array.isArray(paths) ? paths : [paths];
        }

        const total = targetPaths.length;
        if (total === 0) return paths ? false : { success: 0, error: 0, total: 0 };

        const results = await Promise.all(targetPaths.map(p =>
            Res.get(p).then(v => ({ status: 'fulfilled' as const, value: v }))
                .catch(e => ({ status: 'rejected' as const, reason: e }))
        ));
        let success = 0;
        for (let i = 0; i < results.length; i++) if (results[i].status === 'fulfilled') success++;
        const error = results.length - success;

        return paths ? error === 0 : { success, error, total };
    }

    static val(path: string): any {
        if (_packMap.size === 0) {
            console.warn('[Res] val: 没有已加载的资源包');
            return null;
        }

        let packName: string;
        let filePath: string;
        const atIdx = path.indexOf('@');
        if (atIdx >= 0) {
            packName = path.substring(0, atIdx);
            filePath = path.substring(atIdx + 1);
            if (!_packMap.has(packName)) { console.warn(`[Res] val: 包不存在 ${packName}`); return null; }
        } else {
            const found = Res._findPackForPath(path);
            if (!found) { console.warn(`[Res] val: 路径无效 ${path}`); return null; }
            packName = found.packName;
            filePath = found.filePath;
        }

        if (_groupInfo.has(packName + '@' + filePath)) return _cache.get(packName + '@' + filePath) || null;

        const paths = Res._parsePathForPack(packName, filePath);
        const count = paths.length;
        if (count === 0) { console.warn(`[Res] val: 路径无效 ${path}`); return null; }
        if (count === 1) return _cache.get(packName + '@' + paths[0]) || null;

        const result: Record<string, any> = {};
        let found = false;
        for (let i = 0; i < count; i++) {
            const p = paths[i];
            const obj = _cache.get(packName + '@' + p);
            if (obj !== undefined) {
                found = true;
                const slash = p.lastIndexOf('/');
                result[slash >= 0 ? p.substring(slash + 1) : p] = obj;
            }
        }
        return found ? result : null;
    }

    static getProcess(): { process: number; err: number; count: number } {
        return { process: 0, err: 0, count: 0 };
    }
}