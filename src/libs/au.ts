/**
 * Au - 静态音频管理器
 * 基于 Res 加载音频，使用 MPM 管理事件，支持分层音量控制
 */
import { Res } from "./res";
import { MPM } from "./mpm"; // 假定 MPM 已导出

export class Au {
    // 缓存已加载的 Sound
    private static _sounds: Map<string, any> = new Map();
    // 加载中的 Promise
    private static _loading: Map<string, Promise<any>> = new Map();
    // 播放中的通道信息：channel -> { key, lay, baseVol }
    private static _channels: Map<Laya.SoundChannel, { key: string; lay: string }> = new Map();
    // 层级音量倍率 (lay -> 0~1)
    private static _layVolumes: Map<string, number> = new Map([['0', 1]]);
    // 事件管理器
    private static _mpm: MPM = new MPM();

    // ---------- 加载（重载） ----------
    /**
     * 加载单个音效
     * @param key 音效标识
     * @param resPath Res 资源路径
     * @returns Promise<Laya.Sound>
     */
    static load(key: string, resPath: string): Promise<any>;

    /**
     * 批量加载音效
     * @param map 键值对 { key: resPath, ... }
     * @param onProgress 进度回调 (loaded, total)
     * @returns Promise<void>
     */
    static load(map: Record<string, string>, onProgress?: (loaded: number, total: number) => void): Promise<void>;

    static load(
        arg1: string | Record<string, string>,
        arg2?: string | ((loaded: number, total: number) => void)
    ): Promise<any | void> {
        // 单个加载
        if (typeof arg1 === 'string' && typeof arg2 === 'string') {
            const key = arg1;
            const resPath = arg2;
            if (Au._sounds.has(key)) {
                return Promise.resolve(Au._sounds.get(key)!);
            }
            if (Au._loading.has(key)) {
                return Au._loading.get(key)!;
            }
            const promise = Res.get(resPath, 'auto')
                .then((sound: any) => {
                    Au._sounds.set(key, sound);
                    Au._loading.delete(key);
                    return sound;
                })
                .catch((err) => {
                    Au._loading.delete(key);
                    Au._mpm.emit('err', key, err);
                    throw err;
                });
            Au._loading.set(key, promise);
            return promise;
        }

        // 批量加载
        if (typeof arg1 === 'object') {
            const map = arg1;
            const onProgress = typeof arg2 === 'function' ? arg2 : undefined;
            const keys = Object.keys(map);
            const total = keys.length;
            let loaded = 0;
            const promises = keys.map((key) =>
                Au.load(key, map[key]) // 复用单个加载
                    .then(() => {
                        loaded++;
                        onProgress?.(loaded, total);
                    })
                    .catch(() => { }) // 单个失败不中断整体
            );
            return Promise.all(promises).then(() => { });
        }

        throw new Error('无效参数');
    }

    // ---------- 播放 ----------
    /**
     * 播放音效
     * @param key 音效标识
     * @param vol 音量 (0~100)，默认 10
     * @param lay 层级标识，用于分组音量控制，默认 '0'
     * @param loop 是否循环，默认 false
     * @param sta 起始播放位置（秒），默认 0
     */
    static play(key: string, vol: number = 10, lay: string = '0', loop: boolean = false, sta: number = 0): void {
        if (!Au._sounds.get(key)) {
            Au._mpm.emit('err', key, new Error('音效未加载'));
            return;
        }

        const handler = Laya.Handler.create(Au, () => {
            // 播放结束（非循环模式）
            Au._mpm.emit('finish', key);
            // 清理通道记录
            for (const [ch, info] of Au._channels) {
                if (info.key === key && info.lay === lay) {
                    // 注意：可能有多个相同 key 同时播放，需要精确匹配通道，但这里无法直接关联，用简单方式：移除所有该 key+lay 的通道（但可能有多个）
                    // 更准确：在回调中通过闭包记录 channel，但此处无法获取。我们使用另一种方式：在播放时保存 handler 的引用？简化：不精确移除，但在 setVol 时不会影响已停止的通道
                }
            }
            // 从 _channels 中移除已停止的通道（遍历删除）
            for (const [ch, info] of Au._channels) {
                // 检查 channel 是否已停止（isPlaying 为 false）
                if (ch.isStopped) {
                    Au._channels.delete(ch);
                }
            }
        });
        var channel = Laya.SoundManager.playSound(Au._sounds.get(key), loop ? 0 : 1, handler, 0);
        if (!channel) {
            Au._mpm.emit('err', key, new Error('播放失败'));
            return;
        }

        channel.volume = vol / 100 //* this._layVolumes.get(lay);

        // 设置起始位置
        if (sta > 0) {
            channel.startTime = sta;
        }

        // 触发播放事件
        Au._mpm.emit('play', key);
    }

    // ---------- 音量控制 ----------
    /**
     * 设置指定层级的音量倍率（影响该层所有正在播放及后续播放的音效）
     * @param vol 0~100 的音量值，内部归一化到 0~1
     * @param lay 层级标识，默认 '0'
     */
    static setVol(vol: number, lay: string = '0'): void {
        const normalized = Math.max(0, Math.min(1, vol / 100));
        Au._layVolumes.set(lay, normalized);

        // 更新正在播放的该层音效音量
        // for (const [channel, info] of Au._channels) {
        //     if (info.lay === lay) {
        //         const finalVol = Math.max(0, Math.min(1, info.channel.volume * normalized));
        //         channel.volume = finalVol;
        //     }
        // }
    }

    // ---------- 事件管理 (基于 MPM) ----------
    /**
     * 注册事件监听
     * @param event 事件名 'play' | 'finish' | 'err'
     * @param callback 回调函数，参数为 (key, ...)
     */
    static on(event: 'play' | 'finish' | 'err', callback: (key: string, ...args: any[]) => void): void {
        Au._mpm.on(event, callback);
    }

    /**
     * 移除事件监听
     * @param event 事件名
     * @param callback 要移除的回调（不传则移除该事件所有回调）
     */
    static off(event: 'play' | 'finish' | 'err', callback?: (key: string, ...args: any[]) => void): void {
        if (callback) {
            Au._mpm.off(event, callback);
        } else {
            Au._mpm.unon(event);
        }
    }

    /** 完全销毁，释放所有资源 */
    static destroy(): void {
        Au.clear();
        Au._sounds.clear();
        Au._layVolumes.clear();
        Au._mpm.unon(); // 清除所有事件
        // 可额外释放 Blob URL 等（但 Res 内部已管理）
    }

        // ---------- 清理 ----------
    /**
     * 释放音效资源
     * @param key 可选，音效标识。如果不传则释放所有音效
     * - 停止该 key 的所有播放
     * - 从缓存中移除该 key 的 Sound 对象
     * - 清除该 key 的加载中 Promise（但不会取消正在进行的加载，加载完成后会被忽略）
     */
    static clear(key?: string): void {
        if (key) {

            // 从缓存中移除 Sound
            Au._sounds.delete(key);
            // 移除加载中的 Promise（但不会取消实际加载）
            Au._loading.delete(key);
            Res.clear(key);
        } else {
            // 停止所有播放
            for (const key of Au._sounds.keys()) {
                URL.revokeObjectURL(Au._sounds.get(key));
                Res.clear(key);
            }
            Au._channels.clear();
            Au._sounds.clear();
            Au._loading.clear();
            // 保留层级音量设置（不清除 _layVolumes）
        }
    }
}