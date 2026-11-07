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
import { Net } from "./net";
import { Code, PackInfo } from "./code";
import {MPM} from "./mpm"
import { mkBlob, blobAb, ab2str, wxEnv, wxSweepJunk } from "./wx"

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

// ==================== UI 组件库 prefab 桥 ====================
/**
 * 场景 `_$prefab` 引用的引擎内置组件库(internal/UI)在 .br 包通道下的运行时桥。
 * 引擎链: 依赖收集 uuid → res://uuid → URL.formatURL 查 uuidMap(空) → 加载失败 → 节点整棵丢失。
 * 桥做法: formatURL hook 把 res://uuid 映射到预载 blobURL(prefab 文本已灌引擎缓存 loadedMap);
 * 组件库散图经 _uiFrames 图集帧表贴回(_ensureUiFrames);
 * 场景 create 后 _applyNodeTextures 遍历树从 _uiFrames(comp.atlas+comp.png 构造)贴回。
 */
const UI_PREFABS: Record<string, string> = {
    'b0c7f4b6-9a33-4cd8-897e-4888efe760fe': 'internal/UI/Button.lh',
    'c008a142-015d-42f3-abf0-bca3b44b3c12': 'internal/UI/CheckBox.lh'
};
const UI_ATLAS_PNG = 'internal/UI/comp.png';
const UI_ATLAS_JSON = 'internal/UI/comp.atlas';
/** 图集帧表键前缀(对外统一键形态: 第一段=包名, 与场景 src 引用一致) */
const UI_ATLAS_PREFIX = 'ui/internal/UI/';
/** 组件库散图帧表('ui/internal/UI/images/xxx.png' → SubTexture, 键形态统一第一段=包名) */
let _uiFrames: Record<string, any> = {};

export class Res {
    
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
            Res._parseBlobToEngineObject(packName, filePath, memBlob, (obj) => {
                if (obj) _cache.set(cacheKey, obj);
                else console.warn(`[Res] 解析失败: ${filePath}`);
                callback(obj);
            });
            return;
        }

        Res.net.storage.getFile(cacheKey, (blob: Blob | null) => {
            if (!blob) { console.error(`[Res] 文件不存在: ${cacheKey}`); callback(null); return; }

            if (type === 'blob') { callback(blob); return; }

            Res._parseBlobToEngineObject(packName, filePath, blob, (obj) => {
                if (obj) _cache.set(cacheKey, obj);
                else console.warn(`[Res] 解析失败: ${filePath}`);
                callback(obj);
            });
        });
    }

    // ==================== 扩展名 -> 引擎对象 ====================
    /**
     * 引擎加载统一通道: 微信端先把数据预注 Laya.loader.preLoadedMap 再 load。
     * laya.adapter-weixin 的 fetch 分流对非 http(s) URL 一律走 fs.readFile,
     * blobwx:// 必报 readFile:fail —— preLoadedMap 命中时引擎 download 直取
     * 数据不走文件通道(web 端 blob: URL 原生 XHR 可加载, 不注入)。
     * @param req string url 或 {url, type} 对象(图片用对象形态)
     * @param type Loader 类型常量(对象形态时传 undefined)
     * @param data 预注数据: 文本类塞 string / 二进制塞 ArrayBuffer
     */
    private static _engineLoad(req: any, type: any, data: string | ArrayBuffer): Promise<any> {
        if (wxEnv) {
            // ★ preLoadedMap 是 Loader 类的 static 属性, 实例(Laya.loader)上取是 undefined —— 必须从类取
            const preMap: any = (Laya as any).Loader?.preLoadedMap || (Laya.loader as any)?.constructor?.preLoadedMap;
            const url: string = typeof req === 'string' ? req : req.url;
            if (preMap) {
                // json 类 contentType 的 XHR 产物是已 parse 的对象, 预注数据对齐此形态(失败保留原文)
                let d: any = data;
                if (typeof data === 'string') {
                    try { d = JSON.parse(data); } catch { }
                }
                preMap[url] = d;
                let fmt = '';
                try { fmt = Laya.URL.formatURL(url); preMap[fmt] = d; } catch { }
                console.log(`[Res][diag] 预注 preLoadedMap: url=${url} fmt=${fmt || 'ERR'} keys=${Object.keys(preMap).length}`);
            } else {
                console.warn('[Res] preLoadedMap 不可达, 微信端 blobwx:// 加载将走文件通道');
            }
        }
        return Laya.loader.load(req, type) as any;
    }

    /** 微信端写 USER_DATA_PATH 临时文件返回路径(音频 src 等只认本地路径的场景); 失败返回 null
     *  文件名由 id 派生(djb2): 同一资源重载覆盖复用, 不再随机名累积 */
    private static _writeTempFile(ab: ArrayBuffer, ext: string, id: string): string | null {
        try {
            const w: any = (globalThis as any).wx;
            const fs = w?.getFileSystemManager?.();
            if (!fs) return null;
            let h = 5381;
            for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) >>> 0;
            const p = w.env.USER_DATA_PATH + '/resr_' + h.toString(16) + '.' + ext;
            fs.writeFileSync(p, ab);
            return p;
        } catch (e) {
            console.error('[Res] 临时文件写入失败', e);
            return null;
        }
    }

    private static _wxImgPatched = false;

    /**
     * 微信 devtools 下 weapp-adapter 遇全局原生属性(configurable:false)会跳过注入,
     * window.Image 可能是 devtools 原生构造器而非 adapter 包装 → 引擎 new window.Image
     * 加载 wxfile:// 报 Illegal invocation。此 patch 拦截 downloader.image 的 wxfile://
     * 前缀直接 wx.createImage() 原生加载(真机/devtools 均支持本地路径), 其余转发原方法。
     */
    private static _ensureWxImagePatch(): void {
        if (Res._wxImgPatched || !wxEnv) return;
        const dl: any = (Laya as any).Loader?.downloader;
        if (!dl || typeof dl.image !== 'function') return;
        Res._wxImgPatched = true;
        const orig = dl.image;
        const w: any = (globalThis as any).wx;
        dl.image = function (e: any, s: any, i: any, r: any, a: any) {
            if (typeof s === 'string' && s.indexOf('wxfile://') === 0 && w?.createImage) {
                try {
                    const img = w.createImage();
                    e.$ref = img;
                    img.onload = () => { img.onload = null; img.onerror = null; a(img); };
                    img.onerror = () => { img.onload = null; img.onerror = null; console.warn('[Res] wxfile image 加载失败:', s); a(null, ''); };
                    img.src = s;
                } catch (err) { a(null, err); }
                return;
            }
            return orig.call(dl, e, s, i, r, a);
        };
        const d = Object.getOwnPropertyDescriptor(globalThis, 'Image');
        console.log(`[Res] wxfile image patch 就绪, window.Image=${String((globalThis as any).Image).slice(0, 60)} configurable=${d ? d.configurable : 'N/A'}`);
    }

    private static _parseBlobToEngineObject(packName: string, filePath: string, blob: Blob, callback: (obj: any) => void): void {
        const dotIdx = filePath.lastIndexOf('.');
        const ext = dotIdx >= 0 ? filePath.substring(dotIdx + 1).toLowerCase() : '';
        const url = URL.createObjectURL(blob);

        const finish = (obj: any) => {
            if (url !== obj) URL.revokeObjectURL(url);
            callback(obj);
        };

        if (ext === 'mp3' || ext === 'wav' || ext === 'ogg' || ext === 'm4a' || ext === 'aac') {
            // 微信: 引擎 sound / InnerAudioContext 均不认 blobwx:// → 落盘返回本地路径
            if (wxEnv) {
                blobAb(blob).then((ab) => finish(Res._writeTempFile(ab, ext, packName + '@' + filePath))).catch(() => finish(null));
            } else {
                finish(url);
            }
            return;
        }

        if (ext === 'lh' || ext == 'ls') {
            Res._loadHierarchy(blob, url, packName, filePath, finish);
            return;
        }

        if (ext === 'controller') {
            // 动画状态机(自解析, 照 _buildMaterial 模板): blob 通道下引擎 mcc loader 的
            // clip join 必断——JSON 解析 controllerLayers → 装配 AnimatorControllerLayer/AnimatorState,
            // clip 走 _relKey 相对目录解析 Res.get(lani ArrayBuffer 通道), 循环/速度按 controller 字段
            blobAb(blob).then((ab) => Res._buildController(packName, filePath, ab2str(ab))
                .then((ctrl) => finish(ctrl))
                .catch(() => { console.error('[Res] controller 构造失败: ' + filePath); finish(null); }));
            return;
        }

        if (ext === 'lmat') {
            blobAb(blob).then((ab) => Res._buildMaterial(packName, filePath, ab2str(ab))
                .then((mat) => finish(mat))
                .catch(() => { console.error('[Res] 材质构造失败: ' + filePath); finish(null); }));
            return;
        }

        let engineType: any = null;
        let kind = '';
        if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp' || ext === 'bmp') { engineType = Laya.Loader.IMAGE; kind = '纹理'; }
        else if (ext === 'lm') { engineType = Laya.Loader.MESH; kind = '网格'; }
        else if (ext === 'lani') { engineType = Laya.Loader.ANIMATIONCLIP; kind = '动画片段'; }

        if (engineType == null) {
            console.log(`[Res] 未知类型，返回 Blob: ${filePath}`);
            finish(blob);
            return;
        }

        if (engineType === Laya.Loader.IMAGE) {
            if (wxEnv) {
                Res._ensureWxImagePatch();
                // 微信: preLoadedMap 图片通道终会走 imageWithBlob→createObjectURL→blobwx:// →
                // 引擎 Y.window.Image 是 adapter 的 Image 类(不受 polyfill globalThis.Image 覆盖影响)
                // → wx.createImage 把 blobwx:// 当网络 URL 下载, downloadFile:ok 但解码失败。
                // 正解: 落盘 USER_DATA_PATH 用本地路径直载(wx.createImage 原生支持)
                blobAb(blob).then((ab) => {
                    const p = Res._writeTempFile(ab, ext, packName + '@' + filePath);
                    if (!p) { console.error(`[Res] 纹理落盘失败: ${filePath}`); finish(null); return; }
                    Laya.loader.load({ url: p, type: Laya.Loader.IMAGE })
                        .then((tex: any) => finish(tex))
                        .catch((e: any) => { console.error(`[Res] 纹理加载失败: ${filePath}`, e); finish(null); });
                }).catch(() => { console.error(`[Res] 纹理数据提取失败: ${filePath}`); finish(null); });
            } else {
                Laya.loader.load({ url, type: Laya.Loader.IMAGE })
                    .then((tex: any) => finish(tex))
                    .catch((e: any) => { console.error(`[Res] 纹理加载失败: ${filePath}`, e); finish(null); });
            }
            return;
        }

        blobAb(blob).then((ab) => {
            // lm/lani 是二进制必须塞 ArrayBuffer
            // (lani 走 ab2str 会被微信 TextDecoder 在 \u0000 处截断成 1 字符, 引擎 Byte 读 magic 越界)
            const data = ab;
            Res._engineLoad(url, engineType, data)
                .then((res: any) => finish(res))
                .catch((e: any) => {
                    console.error(`[Res] ${kind}加载失败: ${filePath}`, e);
                    finish(null);
                });
        }).catch(() => {
            console.error(`[Res] ${kind}数据提取失败: ${filePath}`);
            finish(null);
        });
    }

    /** 路径归一化: 消解 ./ 与 ../ 段(court/ + ../net.png → net.png) */
    private static _normPath(p: string): string {
        const parts = p.split('/');
        const out: string[] = [];
        for (const s of parts) {
            if (!s || s === '.') continue;
            if (s === '..') out.pop();
            else out.push(s);
        }
        return out.join('/');
    }

    /**
     * lmat 纯代码构造(用户方案: 纹理替换出来, 代码里挂上去)——不走引擎 lmat loader:
     * collectLinks 的 join 在 blob base 上解析相对纹理路径必产 blob:http://net.png 不可加载 URL。
     * 解析 lmat JSON → 纹理按相对路径从包内提出(微信落盘/web blob URL, TEXTURE2D 预载) →
     * new Material + 按序列化名挂属性(albedoTexture/albedoColor/s_Cull→cull 等) → 返回实例。
     */
    /**
     * 动画状态机自解析(照 _buildMaterial 模板): controller JSON → layers 数组。
     * controllerLayers[].states[] —— 有 clip 的真状态装配(无 clip 的"进入"/"任何状态"伪节点跳过):
     *   new AnimatorState + name/speed + clip = Res.get(_relKey(包, controller目录, clip._$uuid))
     *   + clip.islooping = !!state._isLooping + layer.addState。
     * 返回 { layers } 供消费方挂 Animator(挂前清 lh 序列化层——引擎 onAfterDeserialize 同款)。
     * clip 相对引用按 controller 所在包内目录消解(包根 controller: boy/diving.lani → nor/boy/diving.lani)。
     */
    private static async _buildController(packName: string, filePath: string, text: string): Promise<any> {
        let j: any;
        try { j = JSON.parse(text); } catch (e) { throw new Error('controller JSON 解析失败: ' + filePath); }
        const dir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/') + 1) : '';
        const layers: any[] = [];
        for (const ly of (j.controllerLayers || [])) {
            if (!ly || !Array.isArray(ly.states)) continue;
            const layer: any = new Laya.AnimatorControllerLayer(ly.name || 'Base');
            if (ly.blendingMode !== undefined) layer.blendingMode = ly.blendingMode;
            if (ly.defaultWeight !== undefined) layer.defaultWeight = ly.defaultWeight;
            layer.playOnWake = !!ly.playOnWake;
            for (const st of ly.states) {
                if (!st || !st.name || !st.clip || !st.clip._$uuid) continue; // 伪状态节点(进入/任何状态)无 clip
                const clipKey = Res._relKey(packName, dir, String(st.clip._$uuid));
                const clip: any = await Res.get(clipKey).catch((): any => null);
                if (!clip) { console.warn('[Res] controller clip 缺失: ' + clipKey); continue; }
                // 循环语义: obj.setDress 先例——循环设在 clip 上(_isLooping 0=单次/1/2 循环)
                clip.islooping = (st._isLooping || 0) > 0;
                const state: any = new Laya.AnimatorState();
                state.name = st.name;
                if (typeof st.speed === 'number') state.speed = st.speed;
                state.clip = clip;
                layer.addState(state);
            }
            layers.push(layer);
        }
        return { layers };
    }

    private static async _buildMaterial(packName: string, filePath: string, text: string): Promise<any> {
        let j: any;
        try { j = JSON.parse(text); } catch (e) { throw new Error('lmat JSON 解析失败: ' + filePath); }
        const props = j.props || {};
        // 构造(对齐引擎 parseLegacy 的 getClass 反射): type="Laya.PBRStandardMaterial" →
        // ClassUtils 查(带/不带 Laya. 前缀双形态); 查不到 fallback PBRStandardMaterial
        const typeStr: string = props.type || 'Laya.PBRStandardMaterial';
        let mat: any;
        try {
            // 天空系 type 短名别名(引擎 lmat type 值无 Material 后缀, ClassUtils 注册名对不上):
            // SkyPanoramic → SkyPanoramicMaterial / SkyBox → SkyBoxMaterial
            const ALIAS: Record<string, string> = {
                'SkyPanoramic': 'SkyPanoramicMaterial',
                'SkyBox': 'SkyBoxMaterial',
            };
            const cu = (Laya as any).ClassUtils;
            let cls = cu && typeof cu.getClass === 'function' ? cu.getClass(typeStr) : null;
            if (!cls && typeStr.startsWith('Laya.')) cls = cu ? cu.getClass(typeStr.substring(5)) : null;
            if (!cls && ALIAS[typeStr]) {
                const alias = ALIAS[typeStr];
                cls = (Laya as any)[alias] || (cu ? cu.getClass(alias) : null);
            }
            mat = cls ? new cls() : new Laya.PBRStandardMaterial();
        } catch { mat = new Laya.PBRStandardMaterial(); }

        // 天空全景纹理属性名映射: u_Texture → panoramicTexture(SkyPanoramicMaterial 的
        // setter 名不是驼峰 texture——通用 u_ 前缀转换产 texture 挂不上)
        const texNameMap: Record<string, string> = {
            'SkyPanoramic': 'panoramicTexture',
        };
        const mapTexName = (n: string): string => {
            const m = texNameMap[props.type];
            return (m && n === 'u_Texture') ? m : n;
        };

        // 纹理: 相对路径 → 包内提取 → 预载得 Texture2D → 按构造名挂属性
        const texs: any[] = props.textures || [];
        const dir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/') + 1) : '';
        for (const t of texs) {
            if (!t || typeof t.path !== 'string' || !t.path) continue;
            // 纹理创建参数透传(引擎 loader 原生通道): constructParams=[w,h,format,mipmap,canRead,sRGB]
            // —— cp[5]=sRGB 必须透传, albedo(girlcolor cp[5]=true)被当 linear 采样 = 伽马 2.2 颜色偏差
            // ("默认加载颜色差那么大"根因); propertyParams(filterMode/wrapModeU/V/anisoLevel)同链应用
            const texOpts: any = { type: Laya.Loader.TEXTURE2D };
            if (Array.isArray(t.constructParams)) texOpts.constructParams = t.constructParams;
            if (t.propertyParams) texOpts.propertyParams = t.propertyParams;
            let tex: any = null;
            if (t.path.indexOf(':') >= 0 || t.path.startsWith('/')) {
                // 绝对 URL: 直接引擎加载(极少形态)
                tex = await Laya.loader.load({ url: t.path, ...texOpts }).catch((): any => null);
            } else {
                // 统一引用解析(用户规格): 先查是否包名起头 → 跨包直取(如 lmat 引用 ui 包纹理);
                // 否则按 lmat 所在包内目录解析 _normPath(dir+path)——d3/net.lmat 引用 net.png → d3/net.png
                const slash0 = t.path.indexOf('/');
                const hasPack = slash0 > 0 && _packMap.has(t.path.substring(0, slash0));
                if (hasPack) {
                    const pk = t.path.substring(0, slash0);
                    const fp = t.path.substring(slash0 + 1);
                    const tb2 = await new Promise<Blob | null>((r) => Res._loadFile(pk, fp, 'blob', r));
                    if (tb2) {
                        let tex2: any = null;
                        if (wxEnv) {
                            const ab2 = await blobAb(tb2);
                            const fp2 = Res._writeTempFile(ab2, Res._extOf(fp), pk + '@' + fp);
                            if (fp2) tex2 = await Laya.loader.load({ url: fp2, ...texOpts }).catch((): any => null);
                        } else {
                            const bu2 = URL.createObjectURL(tb2);
                            tex2 = await Laya.loader.load({ url: bu2, ...texOpts }).catch((): any => null);
                        }
                        if (tex2 && t.name) Res._setMatTex(mat, mapTexName(t.name), tex2);
                        continue;
                    }
                    console.warn('[Res] 跨包材质纹理缺失: ' + t.path);
                    continue;
                }
                const rel = Res._normPath(dir + t.path);
                const tb = await new Promise<Blob | null>((r) => Res._loadFile(packName, rel, 'blob', r));
                if (!tb) { console.warn('[Res] 材质纹理缺失: ' + packName + '/' + rel); continue; }
                if (wxEnv) {
                    const ab = await blobAb(tb);
                    const fp = Res._writeTempFile(ab, Res._extOf(rel), packName + '@' + rel);
                    if (!fp) continue;
                    tex = await Laya.loader.load({ url: fp, ...texOpts }).catch((): any => null);
                } else {
                    const bu = URL.createObjectURL(tb);
                    tex = await Laya.loader.load({ url: bu, ...texOpts }).catch((): any => null);
                }
            }
            if (tex && t.name) Res._setMatTex(mat, mapTexName(t.name), tex);
        }

        // 颜色向量: albedoColor 等——【对齐引擎 parseLegacy 的类型分派】先读属性当前值,
        // instanceof Color → new Color(r,g,b,a)(Color 通道按 r/g/b/a 读, 传 Vector4(x/y/z/w)
        // 会读 undefined → 纯色材质全黑——net 有纹理走 DIFFUSEMAP 变体幸存的回归根因);
        // 否则 length 3 → Vector3 / length ≥4 → Vector4
        for (const v of (props.vectors || [])) {
            if (!v || !v.name || !Array.isArray(v.value)) continue;
            try {
                const n: any = v.value;
                const cur = (mat as any)[v.name];
                if (n.length === 3) {
                    (mat as any)[v.name] = (cur instanceof Laya.Color)
                        ? new Laya.Color(n[0], n[1], n[2], 1)
                        : new Laya.Vector3(n[0], n[1], n[2]);
                } else if (n.length >= 4) {
                    (mat as any)[v.name] = (cur instanceof Laya.Color)
                        ? new Laya.Color(n[0], n[1], n[2], n[3])
                        : new Laya.Vector4(n[0], n[1], n[2], n[3]);
                } else if (n.length === 2) {
                    (mat as any)[v.name] = new Laya.Vector2(n[0], n[1]);
                }
            } catch { }
        }

        // 浮点标量(tilingOffset 之外的 shininess/albedoIntensity 等, 走同名 setter)
        for (const f of (props.floats || [])) {
            if (f && f.name && typeof f.value === 'number') {
                try { (mat as any)[f.name] = f.value; } catch { }
            }
        }

        // 顶层 u_ 散属性(sky 系 lmat 平铺形态: u_TintColor 数组 / u_Exposure·u_Rotation 标量
        // 直接挂 props 下而非 vectors/floats 数组): u_ 前缀转驼峰属性名走 setter;
        // 数组按属性当前值类型分派 Color/Vector(同 vectors 段规则), number 直赋
        for (const key of Object.keys(props)) {
            if (!key.startsWith('u_') || key.length <= 2) continue;
            const camel = key.charAt(2).toLowerCase() + key.substring(3);
            // SkyPanoramic 的 u_Texture 已由纹理段处理(panoramicTexture 映射), 跳过防覆盖
            if (key === 'u_Texture' && texNameMap[props.type]) continue;
            const val = (props as any)[key];
            if (typeof val === 'number') {
                try { (mat as any)[camel] = val; } catch { }
            } else if (Array.isArray(val) && val.length >= 3) {
                try {
                    const cur = (mat as any)[camel];
                    (mat as any)[camel] = (cur instanceof Laya.Color)
                        ? new Laya.Color(val[0], val[1], val[2], val[3] ?? 1)
                        : (val.length === 3
                            ? new Laya.Vector3(val[0], val[1], val[2])
                            : new Laya.Vector4(val[0], val[1], val[2], val[3]));
                } catch { }
            }
        }

        // 渲染状态(对齐 parseLegacy 的 setter 映射; net 双面/透明等, badm._setNetTransparent 运行时兜底同值幂等)
        try {
            const st: any = mat;
            if (props.s_Cull !== undefined) st.cull = props.s_Cull;
            if (props.s_Blend !== undefined) st.blend = props.s_Blend;
            if (props.s_BlendSrc !== undefined) st.blendSrc = props.s_BlendSrc;
            if (props.s_BlendDst !== undefined) st.blendDst = props.s_BlendDst;
            if (props.s_DepthTest !== undefined) st.depthTest = props.s_DepthTest;
            if (props.s_DepthWrite !== undefined) st.depthWrite = !!props.s_DepthWrite;
            if (props.renderQueue !== undefined) st.renderQueue = props.renderQueue;
            if (props.materialRenderMode !== undefined) st.materialRenderMode = props.materialRenderMode;
            if (props.alphaTest !== undefined) st.alphaTest = props.alphaTest;
        } catch { }

        return mat;
    }

    /**
     * 材质纹理挂载: lmat 的 textures[].name 是 shader uniform 名(u_AlbedoTexture)——
     * 直接 mat[name]=tex 挂的是无人消费的自定义字段(shader uniform 从未上传 = 纹理不显示,
     * girl1 角色纹理全丢根因)。正解: uniform 名转驼峰 JS 属性名(u_AlbedoTexture →
     * albedoTexture)判原型链 setter 存在走 setter(触发引擎隐藏副作用如 addDefine
     * DIFFUSEMAP 变体切换); 无 setter 兜底 shaderData.setTexture(propertyNameToID)。
     */
    private static _setMatTex(mat: any, name: string, tex: any): void {
        try {
            if (name.startsWith('u_') && name.length > 2) {
                const prop = name.charAt(2).toLowerCase() + name.substring(3);
                let proto = Object.getPrototypeOf(mat);
                while (proto && proto !== Object.prototype) {
                    if (Object.getOwnPropertyDescriptor(proto, prop)?.set) {
                        mat[prop] = tex;
                        return;
                    }
                    proto = Object.getPrototypeOf(proto);
                }
            }
            const sd = mat.shaderData;
            const sid = (Laya.Shader3D as any).propertyNameToID(name);
            if (sd && sid != null) sd.setTexture(sid, tex);
        } catch { }
    }

    private static _extOf(p: string): string {
        const d = p.lastIndexOf('.');
        return d >= 0 ? p.substring(d + 1).toLowerCase() : 'png';
    }

    private static _b64u = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

    /** UUID(36位) → base64url 短ID(22位), LayaAir 发布构建同款编码算法, 双向确定可逆(手写base64, 微信无btoa) */
    private static _uuidToShort(u: string): string {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u)) return '';
        const hex = u.replace(/-/g, '').toLowerCase();
        const b = new Uint8Array(16);
        for (let i = 0; i < 16; i++) b[i] = parseInt(hex.substr(i * 2, 2), 16);
        let s = '';
        for (let i = 0; i < 15; i += 3)
            s += Res._b64u[b[i] >> 2] + Res._b64u[((b[i] & 3) << 4) | (b[i + 1] >> 4)] + Res._b64u[((b[i + 1] & 15) << 2) | (b[i + 2] >> 6)] + Res._b64u[b[i + 2] & 63];
        s += Res._b64u[b[15] >> 2] + Res._b64u[(b[15] & 3) << 4];
        return s;
    }

    /** base64url 短ID(22位) → UUID(36位), 手写解码(微信无atob) */
    private static _shortToUuid(s: string): string {
        if (!/^[A-Za-z0-9_-]{22}$/.test(s)) return '';
        let bits = 0, acc = 0, hex = '';
        for (let i = 0; i < 22; i++) {
            const v = Res._b64u.indexOf(s[i]);
            if (v < 0) return '';
            acc = (acc << 6) | v; bits += 6;
            if (bits >= 8) { bits -= 8; const h = ((acc >> bits) & 0xff).toString(16); hex += h.length < 2 ? '0' + h : h; }
        }
        if (hex.length !== 32) return '';
        return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
    }

    /** 组件ID是否已在引擎类注册表(ClassUtils)注册 */
    private static _clsReg(id: string): boolean {
        if (!id) return false;
        const cu = (Laya as any).ClassUtils;
        return !!(cu && typeof cu.getClass === 'function' && cu.getClass(id));
    }

    // ============================================================
    // 场景 prefab 引用数据层合并(替代旧 formatURL 桥):
    // 加载前把 " _$prefab" 节点与目标 prefab JSON 合并成完整节点 JSON → 引擎全语义原生 decode
    // (GButton 类型/titleWidget/GearDisplay 状态机/Relation/override 替换位全引擎原生处理)。
    // ============================================================

    /** prefab 文本缓存: "ui/internal/UI/Button.lh" → 文本 */
    private static _prefabTxtCache: Map<string, string> = new Map();
    /** 图集帧表懒加载 Promise */
    private static _uiFramesP: Promise<void> | null = null;

    /** 组件库图集帧表懒加载(comp.png+comp.atlas → _uiFrames, _applyNodeTextures 贴回用) */
    private static _ensureUiFrames(): Promise<void> {
        if (Res._uiFramesP) return Res._uiFramesP;
        Res._uiFramesP = (async (): Promise<void> => {
            const tex: any = await Res.get('ui/' + UI_ATLAS_PNG).catch((): any => null);
            // comp.atlas 必须走 _loadFile(内存表优先): 存储 v2 散文件不落盘, storage 直读必 miss → 帧表空 → 皮肤帧全断
            const atlasBlob = await new Promise<Blob | null>((res) => {
                Res._loadFile('ui', UI_ATLAS_JSON, 'blob', (b: Blob | null) => res(b));
            });
            if (!tex || !atlasBlob) {
                console.warn('[Res] 组件库图集缺文件, GButton 默认皮肤帧不可用');
                return;
            }
            try {
                const atlasJson = JSON.parse(ab2str(await blobAb(atlasBlob)));
                tex.scaleRate = parseFloat(atlasJson.meta?.scale || '1');
                for (const frameName in atlasJson.frames) {
                    const fd = atlasJson.frames[frameName];
                    const fr = fd.frame;
                    _uiFrames[UI_ATLAS_PREFIX + frameName] = Laya.Texture.create(tex, fr.x, fr.y, fr.w, fr.h,
                        fd.spriteSourceSize?.x || 0, fd.spriteSourceSize?.y || 0,
                        fd.sourceSize?.w || fr.w, fd.sourceSize?.h || fr.h);
                }
                console.log(`[Res] 组件库帧表就绪: ${Object.keys(_uiFrames).length} 帧`);
            } catch (e) {
                console.error('[Res] 组件库图集解析失败', e);
            }
        })().catch((e: any) => {
            console.error('[Res] 帧表构造失败', e);
            Res._uiFramesP = null;
        });
        return Res._uiFramesP;
    }

    /** 取包内 prefab 文本(带缓存): ref 归一化为 包名/包内路径 */
    private static _prefabTxt(ref: string, packName: string, lhDir: string): Promise<string | null> {
        // 统一引用解析(用户规格): 先查是否包名起头 → 原样; 否则按引用文件(场景)所在包内目录
        // 解析 _normPath(lhDir+ref) → 包名/包内路径(废除旧"无包前缀默认归 ui").
        // uuid → UI_PREFABS 反查(旧包兼容); internal 特判 = 收集统一形态(ui/ 包名起头, 天然走原样分支)
        let path = ref;
        if (UI_PREFABS[ref]) {
            path = 'ui/' + UI_PREFABS[ref];
        } else {
            const slash0 = path.indexOf('/');
            const hasPack = slash0 > 0 && _packMap.has(path.substring(0, slash0));
            if (!hasPack && !path.startsWith('../')) {
                // 无斜杠裸文件名或包内相对: 拼引用文件所在目录
                if (path.indexOf(':') < 0 && !path.startsWith('/')) {
                    const inPack = lhDir ? Res._normPath(lhDir + path) : path;
                    path = packName + '/' + inPack;
                }
            } else if (path.startsWith('../')) {
                const inPack = Res._normPath(lhDir + path);
                // 上溯出包根(如包根文件的 ../xxx): 退回 internal 特判/原样(旧包兼容)
                if (inPack.startsWith('../')) {
                    const i = path.indexOf('internal/');
                    if (i >= 0) path = 'ui/' + path.substring(i);
                } else {
                    path = packName + '/' + inPack;
                }
            }
            // 包名起头(含收集统一的 ui/internal/) → 原样
        }
        const cached = Res._prefabTxtCache.get(path);
        if (cached !== undefined) return Promise.resolve(cached);
        const slash = path.indexOf('/');
        const pk = path.substring(0, slash);
        const fp = path.substring(slash + 1);
        return new Promise((resolve) => {
            Res._loadFile(pk, fp, 'blob', (blob: Blob | null) => {
                if (!blob) { console.warn(`[Res] prefab 引用目标缺失: ${ref} → ${path}`); resolve(null); return; }
                blobAb(blob).then((ab) => {
                    const txt = ab2str(ab);
                    Res._prefabTxtCache.set(path, txt);
                    resolve(txt);
                }).catch(() => resolve(null));
            });
        });
    }

    /**
     * 场景数据树展开: " _$prefab" 节点 → 加载目标 prefab JSON → 数据层合并(标量覆盖+override child 属性级合并)
     * → 全树统一 id 重写 + src 数据层剥除(占位符化) → 引擎原生 decode。
     */
    /** prefab 实例序号(每实例唯一 id 前缀, 防同 prefab 多实例的内部 id 冲突) */
    private static _prefabSeq = 0;

    private static async _expandPrefabs(node: any, packName: string, lhDir: string): Promise<any> {
        if (!node || typeof node !== 'object') return node;

        // 全局映射: 场景 prefab 节点 id → 该实例新根 id。键=场景节点 id 天然唯一, 供场景侧引用
        // (override/append child 的 gears controller ref、relations target)重定向到实例根。
        // 【严禁把 prefab 内部 id 映射混进全局】——同 prefab 多实例内部 id 同组, 全局累积互相覆盖,
        // 多实例的 titleWidget ref 全解析到最后一个实例(文字跑飞/点击串台 v5 根因)。实例内部
        // 引用一律走各实例的局部 idMap(merge 后立刻 localRewrite)。
        const gIdMap: Record<string, string> = {};

        const localRewrite = (n: any, idMap: Record<string, string>): void => {
            if (!n || typeof n !== 'object') return;
            if (n.titleWidget && n.titleWidget['_$ref'] && idMap[n.titleWidget['_$ref']]) {
                n.titleWidget['_$ref'] = idMap[n.titleWidget['_$ref']];
            }
            if (n.iconWidget && n.iconWidget['_$ref'] && idMap[n.iconWidget['_$ref']]) {
                n.iconWidget['_$ref'] = idMap[n.iconWidget['_$ref']];
            }
            for (const g of (n.gears || [])) {
                if (g.controller && g.controller['_$ref'] && idMap[g.controller['_$ref']]) {
                    g.controller['_$ref'] = idMap[g.controller['_$ref']];
                }
            }
            for (const r of (n.relations || [])) {
                if (r.target && r.target['_$ref'] && idMap[r.target['_$ref']]) {
                    r.target['_$ref'] = idMap[r.target['_$ref']];
                }
            }
            for (const c of (n['_$child'] || [])) localRewrite(c, idMap);
        };

        const walkMerge = async (n: any): Promise<any> => {
            if (n && n['_$prefab']) {
                const txt = await Res._prefabTxt(String(n['_$prefab']), packName, lhDir);
                if (!txt) return n; // 目标缺失保底原样(引擎空节点)
                let pf: any;
                try { pf = JSON.parse(txt); } catch (e) { console.warn('[Res] prefab JSON 解析失败:', n['_$prefab']); return n; }
                const clone = JSON.parse(JSON.stringify(pf));

                // ★ 唯一 id 命名空间: 同 prefab 多实例的内部 id 必然同组重复——引擎 il.parse 的
                // c[id] 字典是【全局】的, 同 id 后者覆盖前者 → ref 解析到别的实例(点击串台根因)。
                // collect 时直接改 clone 树 id(仅收集映射不改 id 的话, 场景 override 映射成新 id
                // 后 findIndex 按新 id 找替换位必 miss → override 全变追加, 基础皮肤与 override 并存
                // = 矢量背景没画 + 默认皮肤图冒出的双重根因)
                const seq = ++Res._prefabSeq;
                const idMap: Record<string, string> = {};
                (function collect(c2: any) {
                    if (c2['_$id']) {
                        const nid = `pf${seq}_${c2['_$id']}`;
                        idMap[c2['_$id']] = nid;
                        c2['_$id'] = nid;
                    }
                    for (const c of (c2['_$child'] || [])) collect(c);
                })(clone);
                // 场景 prefab 节点自身 id → 新根 id(collect 后 clone 根 id 已带 pf 前缀)
                if (n['_$id']) gIdMap[n['_$id']] = clone['_$id'] || n['_$id'];

                // 场景侧 override/parent 引用先映射到新 id(merge 前改, merge 按新 id 找替换位)
                for (const c of (n['_$child'] || [])) {
                    if (c && typeof c['_$override'] === 'string' && idMap[c['_$override']]) {
                        c['_$override'] = idMap[c['_$override']];
                    }
                    if (c && Array.isArray(c['_$parent'])) {
                        c['_$parent'] = c['_$parent'].map((id: any) => idMap[id] || id);
                    }
                }

                const merged = Res._mergePrefabData(n, clone);
                // 实例内部 ref 重定向(局部 idMap): clone 树内 titleWidget/gears/relations 还持旧 id
                localRewrite(merged, idMap);
                // 数据层静态折算 W/H 跟随关系(用户方案): 子节点 Relation [1,0,2,0](Width+Height 跟随根,
                // Button/CheckBox 的皮肤与 title 全挂此关系)——引擎原生 prefab 通道由 create 内 size(w,h)
                // 成对 setter→布局联动把子节点拉满; 数据层合并绕过 setter 链, Relation 运行时应用
                // 未验证 → 初值即终值最稳(relations 保留供屏幕适配引擎重算, 折算幂等)
                Res._applySizeRelations(merged);
                if (Array.isArray(merged['_$child'])) {
                    merged['_$child'] = await Promise.all(merged['_$child'].map((c2: any) => walkMerge(c2)));
                }
                return merged;
            }
            if (n && Array.isArray(n['_$child'])) {
                n['_$child'] = await Promise.all(n['_$child'].map((c2: any) => walkMerge(c2)));
            }
            return n;
        };

        const out = await walkMerge(node);

        // pass2: 场景侧引用重定向(gIdMap, 键=场景节点 id)。
        // 实例内部 ref 已是 pf 前缀(不匹配场景 id 键)天然不重复映射; 实例内指向场景节点 id 的
        // ref(如场景 append/override child 的 gears controller)在此命中重定向到实例根。
        // 【src 不在此剥】——2D decode 对自定义属性 __res_src_key__ 的保留未验证(v4 曾因此
        // CheckBox 皮肤/贴图全断); src 剥除唯一通道是 _prepareLhData(decode 后直设实例, v3 验证可用)
        (function rewrite(n: any) {
            if (!n || typeof n !== 'object') return;
            if (n.titleWidget && n.titleWidget['_$ref'] && gIdMap[n.titleWidget['_$ref']]) {
                n.titleWidget['_$ref'] = gIdMap[n.titleWidget['_$ref']];
            }
            if (n.iconWidget && n.iconWidget['_$ref'] && gIdMap[n.iconWidget['_$ref']]) {
                n.iconWidget['_$ref'] = gIdMap[n.iconWidget['_$ref']];
            }
            for (const g of (n.gears || [])) {
                if (g.controller && g.controller['_$ref'] && gIdMap[g.controller['_$ref']]) {
                    g.controller['_$ref'] = gIdMap[g.controller['_$ref']];
                }
            }
            for (const r of (n.relations || [])) {
                if (r.target && r.target['_$ref'] && gIdMap[r.target['_$ref']]) {
                    r.target['_$ref'] = gIdMap[r.target['_$ref']];
                }
            }
            if (Array.isArray(n['_$child'])) {
                for (const c of n['_$child']) rewrite(c);
            }
        })(out);

        return out;
    }


    /**
     * 数据层静态折算 W/H 跟随关系(RelationType: Width=1/Height=2):
     * prefab 子节点(皮肤/title)挂 [1,p,2,p] 绑根——引擎原生通道由 create 内 size() setter 联动拉满,
     * 数据层合并绕过 setter 链, 此处直接按根的 width/height 写子节点终值(param 0 等跟随;
     * 非 0 param 语义未逆向, 跳过留给引擎运行时)。relations 保留(屏幕适配重算幂等)。
     */
    private static _applySizeRelations(root: any): void {
        const rw = Number(root.width) || 0;
        const rh = Number(root.height) || 0;
        if (!rw && !rh) return;
        const rootId = root['_$id'];
        (function walk(n: any) {
            if (!n || typeof n !== 'object') return;
            for (const r of (n.relations || [])) {
                const ref = r && r.target && r.target['_$ref'];
                if (ref !== rootId || !Array.isArray(r.data)) continue;
                for (let i = 0; i + 1 < r.data.length; i += 2) {
                    const t = r.data[i], p = r.data[i + 1];
                    if (t === 1 && p === 0 && rw) n.width = rw;      // Width 跟随根
                    else if (t === 2 && p === 0 && rh) n.height = rh; // Height 跟随根
                }
            }
            for (const c of (n['_$child'] || [])) walk(c);
        })(root);
    }

    /**
     * 场景节点数据与 prefab 根数据合并(对齐引擎 _$override 语义):
     * - 标量字段: 场景值覆盖(跳过 _$prefab/_$child; _$id 保留 prefab 根的——titleWidget/controllers 的 _$ref 依赖)
     * - child 带 "_$override":"<目标 _$id>" → 属性级合并到 prefab 内同 id 节点(目标为基底, 场景字段覆盖,
     *   保留目标 width/height/gears/relations 等基础配置; 继承目标 _$id);
     *   无 _$override → append(prefab child 尾)
     */
    private static _mergePrefabData(scene: any, pf: any): any {
        for (const k in scene) {
            if (k === '_$prefab' || k === '_$child' || k === '_$id' || k === '_$override') continue;
            pf[k] = scene[k];
        }
        const sc = scene['_$child'];
        if (Array.isArray(sc) && sc.length > 0) {
            const pChild: any[] = Array.isArray(pf['_$child']) ? pf['_$child'] : (pf['_$child'] = []);
            for (const c of sc) {
                const ovr = c && c['_$override'];
                if (typeof ovr === 'string') {
                    const idx = pChild.findIndex((t: any) => t && t['_$id'] === ovr);
                    if (idx >= 0) {
                        // 属性级合并(引擎 T+应用语义): prefab 目标节点为基底, 场景 override 字段覆盖其上。
                        // 严禁整体替换——场景 override child 只带少量字段(src/color/background),
                        // 整替会丢目标节点 width/height/gears(GearDisplay)/relations → 皮肤塌零/按钮
                        // 状态机失效/文字样式丢失(menu.ls "button 配置全丢"回归实锤)
                        const base = pChild[idx];
                        const merged = Object.assign({}, base, c);
                        delete merged['_$override'];
                        merged['_$id'] = base['_$id']; // 继承目标 id(prefab 内 _$ref/GearDisplay 引用链)
                        pChild[idx] = merged;
                    } else {
                        const merged = Object.assign({}, c);
                        delete merged['_$override'];
                        pChild.push(merged);
                    }
                } else {
                    pChild.push(c);
                }
            }
        }
        return pf;
    }

    /**
     * 预制体加载(组件ID形态自适应重试):
     * .br 包内场景的组件引用与 bundle 注册形态可能不一致(全UUID vs base64url短ID) → missing component type。
     * 重试链: ①智能改写(_$type 的ID未注册而另一形态已注册→改写为注册形态)加载;
     * ②失败→判定①实际加载文本的主体ID形态(长/短), 把所有组件ID全量翻转为另一形态(长↔短)重载;
     * ③再失败→finish(null)。原始 url 的 revoke 由外层 finish 负责, 改写新URL由本方法自管。
     */
    private static _loadHierarchy(blob: Blob, url: string, packName: string, filePath: string, finish: (obj: any) => void): void {
        // lh/ls 包内目录前缀(所有内部引用的相对解析基): d3/court@0.lh → "d3/"
        const lhDir = filePath.includes("/") ? filePath.substring(0, filePath.lastIndexOf("/") + 1) : "";
        const ID_RE = /"_\$type"\s*:\s*"([^"]+)"/g;
        const isLongId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const isShortId = (id: string) => /^[A-Za-z0-9_-]{22}$/.test(id);

        let baseTxt = '';      // 首次加载的文本(智能改写后), 重试的翻转基准
        let triedLong = false; // 上次试错文本的主体组件ID形态(true=长UUID)

        const loadText = (text: string | null, attempt: number) => {
            const u = text == null ? url : URL.createObjectURL(mkBlob([text], 'application/json'));
            // 微信端 text 也预注 preLoadedMap(text==null 首载防御分支无数据可注, blobwx:// 会 readFile fail)
            const p = text == null
                ? Laya.loader.load(u, Laya.Loader.HIERARCHY) as any
                : Res._engineLoad(u, Laya.Loader.HIERARCHY, text);
            console.log(`[menu] loadText(attempt=${attempt}, ${text == null ? 'text=null' : 'len=' + text.length}) url=${u}`);
            p
                .then(async (prefab: Laya.PrefabImpl) => {
                    console.log('[menu] HIERARCHY resolve, prefab=', prefab == null ? String(prefab) : (prefab.constructor as any)?.name);
                    Res._prepareLhData(prefab);
                    const node = prefab.create() as Laya.Sprite;
                    console.log('[menu] prefab.create →', node ? 'node' : String(node));
                    // lh 包内目录前缀(相对引用解析基): d3/court@0.lh → d3/
                    await Res._applyNodeTextures(node, packName, lhDir);
                    await Res._applyNode3DRes(node, packName, lhDir);
                    console.log('[menu] 纹理应用完成');
                    if (text != null) URL.revokeObjectURL(u);
                    finish(node);
                })
                .catch((e: any) => {
                    if (text != null) URL.revokeObjectURL(u);
                    if (attempt > 0) {
                        console.error(`[menu] HIERARCHY reject(attempt=${attempt}) url=${u}:`, e);
                        finish(null);
                        return;
                    }
                    console.warn(`[menu] HIERARCHY reject(attempt=0, url=${u}) 上次试错主体形态=${triedLong ? '长ID' : '短ID'}, 全量翻转重试:`, e);
                    let flipped = 0;
                    const out = baseTxt.replace(ID_RE, (full: string, id: string) => {
                        const isL = isLongId(id);
                        if (!isL && !isShortId(id)) return full;
                        const alt = isL ? Res._uuidToShort(id) : Res._shortToUuid(id);
                        if (!alt) return full;
                        flipped++;
                        return full.replace(id, alt);
                    });
                    if (!flipped) {
                        console.error('[Res] 组件ID无可翻转形态, 放弃重试');
                        finish(null);
                        return;
                    }
                    console.log(`[Res] 预制体重试: ${flipped} 处组件ID翻转为${triedLong ? '短ID' : '长ID'}`);
                    loadText(out, 1);
                });
        };

        blobAb(blob).then((ab) => ab2str(ab)).then(async (txt: string) => {
            txt = Res._lhPlaceholders(txt);
            // prefab 引用数据层合并(" _$prefab" 节点 → 目标 prefab JSON 合并, 引擎原生 decode 全语义)
            try {
                const data = await Res._expandPrefabs(JSON.parse(txt), packName, lhDir);
                txt = JSON.stringify(data);
            } catch (e) {
                console.warn('[Res] prefab 合并失败, 原样加载:', e);
            }
            let changed = 0;
            const out = txt.replace(ID_RE, (full: string, id: string) => {
                const isL = isLongId(id);
                if (!isL && !isShortId(id)) return full;
                if (Res._clsReg(id)) return full;
                const alt = isL ? Res._uuidToShort(id) : Res._shortToUuid(id);
                if (!alt || !Res._clsReg(alt)) return full;
                changed++;
                return full.replace(id, alt);
            });
            let longN = 0, shortN = 0;
            out.replace(ID_RE, (_f: string, id: string) => {
                if (isLongId(id)) longN++;
                else if (isShortId(id)) shortN++;
                return _f;
            });
            baseTxt = out;
            triedLong = longN >= shortN;
            if (changed > 0) console.log(`[Res] 预制体ID兼容: ${changed} 处组件ID改写为注册形态`);
            // 首载即带文本: 微信端需预注数据绕过 fs readFile 分流; changed=0 也传原文(out===改写基准)
            loadText(out, 0);
        }).catch(() => loadText(null, 0));
    }

    /**
     * lh 文本 3D 引用占位符化: "sharedMesh":{"_$uuid":"a/b.lm"} → "__mesh":"a/b.lm";
     * sharedMaterials 数组 → "__mats":[...]. 仅路径形态(含/)转换, 长 UUID 引用(girl 等)保持原样走引擎依赖加载.
     * 占位符是自定义属性: decode 直挂组件实例, 不触发 setter(_addReference 崩)也不进依赖收集, create 后 _applyNode3DRes 补齐.
     */
    private static _lhPlaceholders(txt: string): string {
        let n = 0;
        // 路径判据 = 以 .lm/.lmat 结尾(兼容根级无斜杠引用如 d3/court@0.lh 引 net.lmat——旧判据强制含
        // 斜杠致其漏网走引擎 lmat loader, join(blob:base) 产 blob:http://net.lmat 必失败);
        // uuid 形态(c4d8...@lm0/纯 uuid 无扩展名)不吞——留引擎依赖加载失败由 setDress 代码通道接管
        const isResPath = (v: string) => /\.(lm|lmat)$/i.test(v);
        txt = txt.replace(/"sharedMaterials"\s*:\s*\[((?:\s*\{\s*"_\$uuid"\s*:\s*"[^"]*"\s*\}\s*,?)*)\]/g, (full: string, body: string) => {
            const paths: string[] = [];
            let allRes = true;
            body.replace(/"_\$uuid"\s*:\s*"([^"]+)"/g, (_f: string, v: string) => {
                if (isResPath(v)) paths.push(v); else allRes = false;
                return _f;
            });
            if (!paths.length || !allRes) return full; // 混合形态(uuid+路径)不转防位序错位
            n += paths.length;
            return '"__mats":' + JSON.stringify(paths);
        });
        txt = txt.replace(/"sharedMesh"\s*:\s*\{\s*"_\$uuid"\s*:\s*"([^"]*)"\s*\}/g, (full: string, v: string) => {
            if (!isResPath(v)) return full;
            n++;
            return '"__mesh":' + JSON.stringify(v);
        });
        if (n > 0) console.log(`[Res] lh 3D 引用占位符化: ${n} 处`);
        return txt;
    }

    /**
     * lh/ls 内相对引用 → Res 键(用户规格: 根据预制体所在位置解析)。
     * 引用首段已是挂载包名(如 ui/internal/...) → 原样(自带包前缀);
     * 否则(如 court/floor.lm 相对 d3/court@0.lh) → 包名 + lh所在包内目录 + 引用
     * (= nor/d3/court/floor.lm)。根级 lh(court.lh) lhDir='' 时退化为旧形态 nor/court/floor.lm。
     */
    private static _relKey(packName: string, lhDir: string, key: string): string {
        const slash = key.indexOf('/');
        if (slash > 0 && _packMap.has(key.substring(0, slash))) return key;
        if (key.indexOf('@') >= 0) return key;
        // 相对引用统一走 _normPath 按 lh 所在目录消解: girl/lmat/ 的 lh 引 ../boycolor.png
        // → girl/boycolor.png(裸拼接产出 girl/lmat/../boycolor.png 带相对段, 索引必 miss);
        // 顶层 .. 上溯出包根被 normPath 吞, 退化为包根级(合理降级); lhDir='' 根级退化旧形态
        return packName + '/' + Res._normPath(lhDir + key);
    }

    /** 遍历节点树补 3D mesh/材质(占位符 __mesh/__mats → 包内 Res.get 赋回), 全部就绪才 resolve 保证上层时序 */
    private static async _applyNode3DRes(node: any, packName: string, lhDir: string = ''): Promise<void> {
        if (!node) return;
        const getComp = (cls: any): any => {
            try { return typeof node.getComponent === 'function' ? node.getComponent(cls) : null; } catch { return null; }
        };
        const mf = getComp(Laya.MeshFilter);
        if (mf && typeof mf.__mesh === 'string') {
            const key = mf.__mesh as string;
            delete mf.__mesh;
            const mesh = await Res.get(Res._relKey(packName, lhDir, key)).catch((): any => null);
            if (mesh) mf.sharedMesh = mesh;
            else console.warn(`[Res] 3D mesh 获取为空: ${key}`);
        }
        const mr = getComp(Laya.MeshRenderer);
        if (mr && Array.isArray(mr.__mats)) {
            const keys = mr.__mats as string[];
            delete mr.__mats;
            const mats = await Promise.all(keys.map((k) => Res.get(Res._relKey(packName, lhDir, k)).catch((): any => null)));
            const arr = mats.map((m) => m || null);
            if (arr.some((m) => m)) (mr as any).materials = arr;
            else console.warn(`[Res] 3D 材质全部获取为空: ${keys.join(',')}`);
        }
        const count = node.numChildren;
        if (count > 0) {
            const tasks = new Array<Promise<void>>(count);
            for (let i = 0; i < count; i++) tasks[i] = Res._applyNode3DRes(node.getChildAt(i), packName, lhDir);
            await Promise.all(tasks);
        }
    }

    private static _prepareLhData(raw: any): any {
        if (!raw) return raw;
        const walk = (node: any) => {
            if (!node) return;
            const s = node.src? node.src : node.skin;
            if (typeof s === 'string' && s.length > 0) {
                node.__res_src_key__ = s;
                delete node.src;
                delete node.skin;
            }
            const children = node._$child || node._$children;
            if (children instanceof Array) {
                for (let i = 0; i < children.length; i++) walk(children[i]);
            }
        };
        walk(raw.data);
    }

    private static async _applyNodeTextures(node: any, packName: string, lhDir: string = ''): Promise<void> {
        if (!node) return;
        // 组件库图集帧表懒加载(prefab 合并产物含默认皮肤 src 引用 ui/internal/UI/images/*, 散图不在包文件列表)
        await Res._ensureUiFrames();
        let key = node.__res_src_key__;
        if (key) {
            // 空文件名脏数据守卫(.ls 残留 "ui@.png" 之类): 剥目录后为空或以 . 开头跳过本节点纹理(不影响子节点递归)
            const seg = key.indexOf('@') >= 0 ? key.substring(key.indexOf('@') + 1) : key;
            const file = seg.slice(seg.lastIndexOf('/') + 1);
            if (file && !file.startsWith('.')) {
                try {
                    // 组件库帧(_uiFrames)直取; 其余走包内文件(散图/图集组)。
                    // key 第一段已是挂载包名(路径算法 v2: 场景 src 引用 "ui/main/bg.jpg" 自带包前缀)时不再补,
                    // 否则按 lh 所在包内目录解析(相对引用, 同 _relKey; lhDir='' 根级退化为旧形态)
                    const res = _uiFrames[key] !== undefined ? _uiFrames[key]
                        : await Res.get(Res._relKey(packName, lhDir, key));
                    if (res) {
                        // GImage 渲染走 comp(FrameAnimation) 的 atlas 通道, node.texture 赋值无效
                        const comp = node.comp;
                        if (comp && typeof comp.setAtlas === "function") {
                            const atlas = new Laya.AtlasResource(key, [res], [res]);
                            comp.setAtlas(atlas);
                        } else {
                            node.texture = res;
                        }
                    } else console.warn(`[Res] lh 节点纹理获取为空: ${key}`);
                } catch (e) {
                    console.warn(`[Res] lh 节点纹理替换失败: ${key}`, e);
                }
            }
        }
        const count = node.numChildren;
        if (count > 0) {
            const tasks = new Array<Promise<void>>(count);
            for (let i = 0; i < count; i++) tasks[i] = Res._applyNodeTextures(node.getChildAt(i), packName, lhDir);
            await Promise.all(tasks);
        }
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
                    Res._createSpine(blobs.get(pngFile)!, blobs.get(atlasFile)!, blobs.get(skFile)!, cacheKey, (spine) => {
                        if (spine) { _cache.set(cacheKey, spine); callback(true, spine); }
                        else callback(false, null);
                    });
                } else callback(false, null);
            } else {
                if (pngFile && atlasFile) {
                    Res._createAtlas(blobs.get(pngFile)!, blobs.get(atlasFile)!, cacheKey, (atlas) => {
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
                } finally { URL.revokeObjectURL(imageUrl); }
            };
            reader.onerror = () => { URL.revokeObjectURL(imageUrl); callback(null); };
        }).catch(() => { URL.revokeObjectURL(imageUrl); callback(null); });
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
                if (!rawAsText || !skData) { URL.revokeObjectURL(imageUrl); callback(null); return; }

                const atlasPages: Laya.ILoadURL[] = [];
                const templet = new Laya.SpineTemplet();
                // @ts-ignore
                const atlas = new spine.TextureAtlas(rawAsText, () => {
                    atlasPages.push({ url: imageUrl, type: Laya.Loader.TEXTURE2D, propertyParams: { premultiplyAlpha: false } });
                    return new Laya.SpineTexture(null);
                });

                Laya.loader.load(atlasPages).then((res: Laya.Texture2D[]) => {
                    const textures: Record<string, Laya.Texture2D> = {};
                    const n = res.length;
                    const pages = atlas.pages;
                    for (let i = 0; i < n; i++) {
                        const tex = res[i];
                        if (tex) tex._addReference();
                        const page = pages[i];
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
                    for (let i = 0; i < regions.length; i++) {
                        const region = regions[i];
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
                    } finally { URL.revokeObjectURL(imageUrl); }
                }).catch(() => { URL.revokeObjectURL(imageUrl); callback(null); });
            };
            asReader.onerror = () => { URL.revokeObjectURL(imageUrl); callback(null); };
        };
        skReader.onerror = () => { URL.revokeObjectURL(imageUrl); callback(null); };
    }

    private static _createSubTextures(atlasJson: any, texture: Laya.Texture): Laya.Texture[] {
        const subTextures: Laya.Texture[] = [];
        const scaleRate = parseFloat(atlasJson.meta?.scale || "1");
        texture.scaleRate = scaleRate;
        const frames = atlasJson.frames;
        for (const frameName in frames) {
            const frameData = frames[frameName];
            const frame = frameData.frame;
            const subTexture = Laya.Texture.create(texture, frame.x, frame.y, frame.w, frame.h,
                frameData.spriteSourceSize?.x || 0, frameData.spriteSourceSize?.y || 0,
                frameData.sourceSize?.w || frame.w, frameData.sourceSize?.h || frame.h);
            subTexture.url = `${texture.url}_${frameName}`;
            Laya.loader.cacheRes(subTexture.url, subTexture);
            subTextures.push(subTexture);
        }
        return subTextures;
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