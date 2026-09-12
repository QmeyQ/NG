/**
 * Net - 网络通信类，负责资源包的下载、缓存、断点续传
 * 使用 MPM 管理事件分发，IDBStorage 做本地持久化，Timer 做定时控制
 */
import { IDBStorage } from "./IDBStorage";
import { Timer } from "./time";
import { MPM } from "./mpm";

// ======================== 常量与类型 ========================

/** 下载状态枚举 */
const DST = {
    PENDING: 'p',
    DOWNLOADING: 'd',
    PAUSED: '=',
    COMPLETED: 'f',
    ERROR: 'e',
    CANCELLED: 'x'
} as const;

/** 下载任务接口（内联分片状态） */
interface DTask {
    /** 下载 URL */
    url: string;
    /** 缓存键 */
    key: string;
    /** 当前状态 */
    st: typeof DST[keyof typeof DST];
    /** 已下载字节数 */
    ld: number;
    /** 总字节数 */
    tot: number;
    /** 是否可断点续传 */
    rs: boolean;
    /** 开始时间戳 */
    stT: number;
    /** 重试次数 */
    rt: number;
    /** AbortController */
    ctrl: AbortController | null;
    /** 进度回调 (百分比, 速度, 已下载, 总量) */
    onP?: (percent: number, speed: number, loaded: number, total: number) => void;
    /** 完成回调 (Blob, 是否来自缓存) */
    onC?: (blob: Blob, fromCache: boolean) => void;
    /** 错误回调 */
    onE?: (err: string) => void;
    /** 状态变更回调 */
    onSC?: (st: string) => void;
    /** 上次进度更新时间 */
    lPU: number;
    /** 上次已下载量 */
    lL: number;
    /** 是否缓存 */
    c?: boolean;
    /** 分片大小（字节） */
    cSize: number;
    /** 分片完成标记数组 */
    chunks: boolean[];
    /** 分片失败次数数组 */
    failCnt: number[];
    /** 是否有任意分片成功过 */
    anyS: boolean;
}

/** 计算分片起始字节偏移 */
function ckStart(i: number, cSize: number): number { return i * cSize; }

/** 计算分片结束字节偏移（含） */
function ckEnd(i: number, cSize: number, tot: number): number { return Math.min(ckStart(i, cSize) + cSize - 1, tot - 1); }

/** 计算分片期望大小 */
function ckSize(i: number, cSize: number, tot: number): number { return ckEnd(i, cSize, tot) - ckStart(i, cSize) + 1; }

/** 生成分片缓存键 */
function ckKey(key: string, i: number): string { return `${key}_chunk_${i}`; }

export class Net {
    /** IDB 存储实例 */
    public storage: IDBStorage;
    /** 事件管理器（MPM 事件分发） */
    private _mpm: MPM = new MPM();

    /** 下载任务表（key → DTask） */
    private tasks: Map<string, DTask> = new Map();
    /** 活跃下载集合 */
    private active: Set<string> = new Set();
    /** 最大并发下载数 */
    public maxC: number = 3;
    /** 下载超时时间（ms） */
    public DTO: number = 120000;
    /** 最大重试次数 */
    public maxR: number = 3;
    /** 下载等待队列 */
    private queue: string[] = [];

    /** 默认分片大小（64KB） */
    public cSize: number = 64 * 1024;
    /** 最大分片并发数 */
    public maxCC: number = 20;
    /** 基础分片重试次数 */
    public baseCR: number = 3;
    /** 提升后分片重试次数 */
    public boostCR: number = 10;

    /** 构造函数：初始化 IDB 存储 */
    constructor() {
        this.storage = new IDBStorage();
    }

    // ======================== 事件系统（MPM） ========================

    /** 注册事件监听 */
    on(event: 'downloadComplete' | 'downloadError' | 'downloadProgress' | 'downloadPaused', cb: Function): void {
        this._mpm.on(event, cb);
    }

    /** 移除事件监听（无参时清掉所有事件） */
    off(event?: string, cb?: Function): void {
        this._mpm.off(event, cb);
    }

    // ======================== 下载入口 ========================

    /**
     * 下载资源
     * @param url 资源 URL
     * @param opts 选项 { key, force, cache, onProgress, onComplete, onError }
     */
    download(url: string, opts: any = {}): void {
        if(opts.cache == undefined){
            opts.cache = true;
        }
        if (this.tasks.get(url)) {
            if (this.tasks.get(url).st === DST.DOWNLOADING) {
                this._mpm.emit('downloadError', url, '任务已在进行中');
                opts.onError?.('任务已在进行中');
                return;
            }
            if (this.tasks.get(url).st === DST.PAUSED) { this.resume(url); return; }
        }

        if (!opts.force) {
            this.cGet(url, (cached: any) => {
                if (cached) {
                    this._mpm.emit('downloadComplete', url, cached, true);
                    opts.onComplete?.(cached, true);
                    return;
                }
                this._resume(url, (task) => {
                    if (task) {
                        task.onP = opts.onProgress; task.onC = opts.onComplete; task.onE = opts.onError; task.c = opts.cache;
                        this._start(task);
                        return;
                    }
                });
            });
            return;
        }
        var t:DTask = {
            url, key:url, st: DST.PENDING,
            ld: 0, tot: 0, rs: true, stT: Timer.now(),
            rt: 0, ctrl: null, onP:opts.onProgress, onC:opts.onComplete , onE:opts.onError,
            lPU: 0, lL: 0, c: opts.cache,
            cSize: this.cSize, chunks: [], failCnt: [], anyS: false
        };
        this.tasks.set(url, t);
        if (!opts.full) this._startChunked(t); else this._startNormal(t);
    }

    /** 暂停下载（无参时暂停所有） */
    pause(key?: string): void {
        if (!key) { this.tasks.forEach((t, k) => { if (t.st === DST.DOWNLOADING) this.pause(k); }); return; }
        const t = this.tasks.get(key);
        if (!t || t.st !== DST.DOWNLOADING) return;
        if (t.ctrl) { t.ctrl.abort(); t.ctrl = null; }
        t.st = DST.PAUSED;
        this.active.delete(key);
        this._mpm.emit('downloadPaused', key, t.ld, t.tot);
        t.onSC?.(DST.PAUSED);
        this._processQ();
    }

    /** 恢复下载（无参时恢复所有） */
    resume(key?: string): void {
        if (!key) { this.tasks.forEach((t, k) => { if (t.st === DST.PAUSED) this.resume(k); }); return; }
        const t = this.tasks.get(key);
        if (!t || t.st !== DST.PAUSED) return;
        t.st = DST.PENDING; t.rt = 0;
        this._start(t);
    }

    /** 清空下载队列 */
    clear(): void {
        this.pause();
        this.tasks.clear();
        this.active.clear();
        this.queue = [];
    }

    /** 从持久化状态恢复断点续传任务 */
    private _resume(key: string, cb: (task: DTask | null) => void): void {
        const sk = `${key}_chunks_state`;
        this.storage.get(sk, (str: string | null) => {
            if (!str) { cb(null); return; }
            try {
                const s = JSON.parse(str);
                if (!s.url) { cb(null); return; }
                const t: DTask = {
                    url: s.url, key, st: DST.PENDING,
                    ld: s.chunks.filter((c: boolean) => c).reduce((acc: number, _: any, i: number) => acc + ckSize(i, s.cSize, s.tot), 0),
                    tot: s.tot, rs: true, stT: Timer.now(), rt: 0, ctrl: null,
                    c: true, lPU: 0, lL: 0,
                    cSize: s.cSize, chunks: s.chunks, failCnt: new Array(s.chunks.length).fill(0), anyS: s.anyS
                };
                this.tasks.set(key, t);
                cb(t);
            } catch { cb(null); }
        });
    }

    /** 强制切换到整包下载 */
    forceNormal(key: string): void {
        const t = this.tasks.get(key);
        if (!t) return;
        this.pause(key);
        this._cleanup(key, () => {
            this.storage.delete(`${key}_chunks_state`, () => {});
            t.st = DST.PENDING; t.ld = 0; t.tot = 0; t.rt = 0;
            if (t.ctrl) { t.ctrl.abort(); t.ctrl = null; }
            t.chunks = []; t.failCnt = []; t.anyS = false;
            this._startNormal(t);
        });
    }

    /** 获取缓存文件 */
    cGet(key: string, cb: (blob: any) => void): void { this.storage.getFile(key, cb); }

    /** 清空所有缓存 */
    cClear(cb: (ok: boolean) => void): void {
        this.storage.getKeys((keys) => {
            keys.dataKeys.forEach(k => { if (k.endsWith('_resume')) this.storage.deleteFile(k, () => {}); });
        });
        this.storage.clear(cb);
    }

    /** 移除指定缓存 */
    cRemove(key: string, cb: (ok: boolean) => void): void {
        this.storage.deleteFile(`${key}_resume`, () => {});
        this.storage.deleteFile(key, cb);
    }

    /**
     * 查询任务和缓存信息
     * - 无 url：返回所有任务列表及状态和缓存用量
     * - 有 url：返回该 url 对应任务详情和缓存状态
     */
    info(cb: (info: any) => void): void;
    info(url: string, cb: (info: any) => void): void;
    info(arg1: any, arg2?: any): void {
        if (typeof arg1 === 'function') {
            const cb = arg1;
            const tasks = Array.from(this.tasks.values()).map(t => ({
                url: t.url, key: t.key,
                state: t.st, loaded: t.ld, total: t.tot,
                progress: t.tot > 0 ? Math.round((t.ld / t.tot) * 100) : 0,
                cached: t.c, retries: t.rt,
                chunks: t.chunks.length, doneChunks: t.chunks.filter(c => c).length
            }));
            this.storage.getUsage((usage) => cb({ tasks, usage }));
        } else {
            const url = arg1, cb = arg2;
            const tasks = Array.from(this.tasks.values()).filter(t => t.url === url).map(t => ({
                url: t.url, key: t.key,
                state: t.st, loaded: t.ld, total: t.tot,
                progress: t.tot > 0 ? Math.round((t.ld / t.tot) * 100) : 0,
                cached: t.c, retries: t.rt,
                chunks: t.chunks, doneChunks: t.chunks.filter(c => c).length
            }));
            this.cGet(url, (blob: any) => {
                cb({ tasks, cached: !!blob, cacheSize: blob?.size || 0 });
            });
        }
    }

    // ======================== 核心下载调度 ========================

    /** 启动下载（受并发数限制） */
    private _start(t: DTask): void {
        if (this.active.size >= this.maxC) {
            if (this.queue.indexOf(t.key) === -1) this.queue.push(t.key);
            return;
        }
        this.active.add(t.key);
        t.st = DST.DOWNLOADING; t.stT = Timer.now();
        t.onSC?.(DST.DOWNLOADING);
        this._startChunked(t);
    }

    /** 处理下载队列 */
    private _processQ(): void {
        while (this.active.size < this.maxC && this.queue.length > 0) {
            const id = this.queue.shift()!;
            const t = this.tasks.get(id);
            if (t && t.st === DST.PENDING) this._start(t);
        }
    }

    // ======================== 智能分片下载 ========================

    /** 启动分片下载 */
    private _startChunked(t: DTask): void {
        this._fetchSize(t).then(tot => {
            if (tot <= 0) { this._startNormal(t); return; }
            t.tot = tot;
            this._execChunked(t, Math.ceil(tot / t.cSize));
        }).catch(() => { this._startNormal(t); });
    }

    /** 通过 HEAD 请求获取文件大小 */
    private _fetchSize(t: DTask): Promise<number> {
        return new Promise((resolve, reject) => {
            const ctrl = new AbortController();
            const tid = setTimeout(() => { ctrl.abort(); reject(new Error('timeout')); }, 10000);
            fetch(t.url, { method: 'HEAD', signal: ctrl.signal })
                .then(res => {
                    clearTimeout(tid);
                    const len = res.headers.get('Content-Length');
                    if (len) resolve(parseInt(len, 10));
                    else this._fetchRange(t).then(resolve).catch(reject);
                })
                .catch(() => { clearTimeout(tid); this._fetchRange(t).then(resolve).catch(reject); });
        });
    }

    /** 通过 Range 请求获取文件大小 */
    private _fetchRange(t: DTask): Promise<number> {
        return fetch(t.url, { headers: { Range: 'bytes=0-0' } })
            .then(res => {
                const range = res.headers.get('Content-Range');
                if (range) { const m = range.match(/\/(\d+)/); if (m) return parseInt(m[1], 10); }
                return res.headers.get('Content-Length') ? parseInt(res.headers.get('Content-Length')!, 10) : 0;
            });
    }

    /** 执行分片下载核心逻辑 */
    private _execChunked(t: DTask, totalChunks: number): void {
        const sk = `${t.key}_chunks_state`;
        const ctrl = new AbortController();
        t.ctrl = ctrl;

        if (t.chunks.length === 0) {
            t.chunks = new Array(totalChunks).fill(false);
            t.failCnt = new Array(totalChunks).fill(0);
        }

        if (t.chunks.length !== totalChunks) {
            const old = t.chunks;
            t.chunks = new Array(totalChunks).fill(false);
            for (let i = 0; i < Math.min(old.length, totalChunks); i++) t.chunks[i] = old[i];
            t.failCnt = new Array(totalChunks).fill(0);
        }

        let completedCount = t.chunks.filter(c => c).length;
        let totalDownloaded = completedCount * t.cSize;
        t.ld = Math.min(totalDownloaded, t.tot);

        const updateProgress = () => {
            t.ld = totalDownloaded;
            const now = Timer.now();
            if (now - t.lPU >= 100) {
                this._progress(t, t.ld, t.tot);
                t.lPU = now;
            }
        };

        const saveChunkState = () => {
            this.storage.set(sk, JSON.stringify({
                url: t.url, tot: t.tot, cSize: t.cSize,
                chunks: t.chunks, anyS: t.anyS
            }), () => {});
        };

        const downloadChunk = async (i: number, retryCount = 0): Promise<boolean> => {
            if (t.chunks[i]) {
                return new Promise(resolve => {
                    const bk = ckKey(t.key, i);
                    this.storage.getFile(bk, (blob: Blob | null) => {
                        const exp = ckSize(i, t.cSize, t.tot);
                        if (blob && blob.size === exp) {
                            totalDownloaded += exp;
                            resolve(true);
                        } else {
                            t.chunks[i] = false;
                            t.failCnt[i] = 0;
                            completedCount--;
                            resolve(false);
                        }
                    });
                });
            }

            const exp = ckSize(i, t.cSize, t.tot);
            const headers: Record<string, string> = { 'Range': `bytes=${ckStart(i, t.cSize)}-${ckEnd(i, t.cSize, t.tot)}` };
            let tid: any = null;

            try {
                const fc = new AbortController();
                tid = setTimeout(() => fc.abort(), 30000);

                const res = await fetch(t.url, { headers, signal: fc.signal });
                clearTimeout(tid);

                if (!res.ok && res.status !== 206) {
                    if (res.status === 200) throw new Error('服务器不支持Range');
                    throw new Error(`HTTP ${res.status}`);
                }

                const ab = await res.arrayBuffer();
                const cd = new Uint8Array(ab);

                if (cd.length !== exp) {
                    const isLast = ckEnd(i, t.cSize, t.tot) === t.tot - 1;
                    const maxAccept = isLast ? t.tot - ckStart(i, t.cSize) : exp;
                    if (cd.length === 0) throw new Error(`分片 ${i} 返回空数据`);
                    if (!isLast || cd.length !== maxAccept) throw new Error(`分片 ${i} 大小不匹配`);
                }

                const blob = new Blob([cd]);
                const bk = ckKey(t.key, i);

                await new Promise<void>((resolve, reject) => {
                    this.storage.setFile(bk, blob, (ok) => {
                        if (ok) {
                            this.storage.getFile(bk, (sb: Blob | null) => {
                                if (sb && sb.size === cd.length) resolve();
                                else reject(new Error('保存验证失败'));
                            });
                        } else { reject(new Error('保存分片失败')); }
                    });
                });

                t.chunks[i] = true;
                t.failCnt[i] = 0;
                completedCount++;
                totalDownloaded += cd.length;
                if (!t.anyS) t.anyS = true;
                saveChunkState();
                updateProgress();
                return true;

            } catch (error: any) {
                if (tid) clearTimeout(tid);
                if (error.name === 'AbortError') return false;

                t.failCnt[i]++;
                const maxRet = t.anyS ? this.boostCR : this.baseCR;

                if (t.failCnt[i] >= maxRet) {
                    t.st = DST.ERROR;
                    this._mpm.emit('downloadError', t.key, `分片 ${i} 下载失败`);
                    t.onE?.(`分片 ${i} 下载失败`);
                    ctrl.abort();
                    return false;
                }

                const wait = 200 * (retryCount + 1);
                await new Promise(r => setTimeout(r, wait));
                return downloadChunk(i, retryCount + 1);
            }
        };

        const run = async () => {
            const pending: number[] = [];
            for (let i = 0; i < t.chunks.length; i++) if (!t.chunks[i]) pending.push(i);

            const q = [...pending];
            const workers = Array(this.maxCC).fill(null).map(async () => {
                while (q.length > 0 && !ctrl.signal.aborted) {
                    const i = q.shift()!;
                    await downloadChunk(i);
                }
            });
            await Promise.all(workers);

            if (ctrl.signal.aborted) return;

            if (!t.chunks.every(c => c)) {
                t.st = DST.ERROR;
                this._mpm.emit('downloadError', t.key, '部分分片下载失败');
                t.onE?.('部分分片下载失败');
                return;
            }

            this._mergeChunks(t, sk);
        };

        run().catch(err => {
            if (!ctrl.signal.aborted) {
                t.st = DST.ERROR;
                this._mpm.emit('downloadError', t.key, err.message);
                t.onE?.(err.message);
            }
        });
    }

    /** 合并分片为最终 Blob */
    private _mergeChunks(t: DTask, sk: string): void {
        const n = t.chunks.length;
        const keys: string[] = [];
        for (let i = 0; i < n; i++) keys.push(ckKey(t.key, i));

        let expTot = 0;
        const szMap = new Map<number, number>();
        for (let i = 0; i < n; i++) {
            const sz = ckSize(i, t.cSize, t.tot);
            expTot += sz;
            szMap.set(i, sz);
        }

        setTimeout(() => {
            const readPs = keys.map((k, idx) => {
                return new Promise<{ index: number; blob: Blob | null }>((resolve) => {
                    this.storage.getFile(k, (blob: Blob | null) => resolve({ index: idx, blob }));
                });
            });

            Promise.all(readPs).then(results => {
                const blobs: (Blob | null)[] = new Array(n).fill(null);
                let miss = false;
                let actTot = 0;

                for (const { index, blob } of results) {
                    const exp = szMap.get(index)!;
                    if (blob && blob.size === exp) { blobs[index] = blob; actTot += blob.size; }
                    else { miss = true; t.chunks[index] = false; }
                }

                if (miss) {
                    this.storage.set(sk, JSON.stringify({ chunks: t.chunks }), () => { this._execChunked(t, n); });
                    return;
                }

                if (actTot !== t.tot) {
                    t.st = DST.ERROR;
                    this._mpm.emit('downloadError', t.key, '文件大小不匹配');
                    t.onE?.('文件大小不匹配');
                    return;
                }

                const fb = new Blob(blobs.filter(b => b !== null) as Blob[]);

                this.storage.setFile(t.key, fb, (ok) => {
                    if (ok) {
                        const delKeys = [...keys, sk, `${t.key}_resume`];
                        let del = 0;
                        delKeys.forEach(k => {
                            this.storage.delete(k, () => { if (++del === delKeys.length) {} });
                        });
                        this._finish(t, fb, false);
                    } else { this._err(t, '保存最终文件失败'); }
                });
            }).catch(() => { this._err(t, '合并分片时发生异常'); });
        }, 100);
    }

    // ======================== 普通完整下载 ========================

    /** 启动普通整包下载（非分片模式） */
    private _startNormal(t: DTask): void {
        const ctrl = new AbortController();
        t.ctrl = ctrl; t.ld = 0; t.tot = 0;

        const tp = new Promise<never>((_, reject) => {
            const timer = setTimeout(() => reject(new Error('timeout')), this.DTO);
            ctrl.signal.addEventListener('abort', () => clearTimeout(timer));
        });

        Promise.race([fetch(t.url, { signal: ctrl.signal }), tp])
            .then(async res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const cl = res.headers.get('Content-Length');
                if (cl) t.tot = parseInt(cl, 10);

                const reader = res.body?.getReader();
                if (!reader) throw new Error('无响应流');

                const parts: Uint8Array[] = [];
                let recv = 0;
                let lastUpd = Timer.now();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    parts.push(value);
                    recv += value.length;
                    t.ld = recv;

                    const now = Timer.now();
                    if (now - lastUpd >= 100) {
                        this._progress(t, t.ld, t.tot);
                        lastUpd = now;
                    }
                }

                const blob = new Blob(parts);
                console.log("下载" ,  blob.size)
                return blob;
            })
            .then(blob => {
                this.storage.setFile(t.key, blob, ok => {
                    if (ok) {
                        this._cleanup(t.key, () => {
                            this.storage.deleteFile(`${t.key}_resume`, () => {});
                            this._finish(t, blob, false);
                        });
                    } else { this._err(t, '保存失败'); }
                });
            })
            .catch(error => {
                if (error.name === 'AbortError') return;
                this._err(t, `下载失败: ${error.message}`);
            });
    }

    /** 清理分片临时文件 */
    private _cleanup(baseKey: string, cb: () => void): void {
        this.storage.getKeys((keys) => {
            const ck = keys.fileKeys.filter((k: string) => k.startsWith(`${baseKey}_chunk_`));
            if (ck.length === 0) {
                this.storage.delete(`${baseKey}_chunks_state`, () => cb());
                return;
            }
            let pending = ck.length;
            ck.forEach((k: string) => {
                this.storage.deleteFile(k, () => {
                    if (--pending === 0) this.storage.delete(`${baseKey}_chunks_state`, () => cb());
                });
            });
        });
    }

    /** 完成下载 */
    private _finish(t: DTask, blob: Blob, fromCache: boolean): void {
        this.active.delete(t.key);
        t.st = DST.COMPLETED;
        this._mpm.emit('downloadComplete', t.key, blob, fromCache);
        t.onC?.(blob, fromCache);
        t.onSC?.(DST.COMPLETED);
        this.tasks.delete(t.key);
        this._processQ();
    }

    /** 更新下载进度 */
    private _progress(t: DTask, ld: number, tot: number): void {
        const pct = tot > 0 ? Math.round((ld / tot) * 100) : 0;
        let spd = 0;
        const now = Timer.now();
        if (t.lL > 0) {
            const td = now - t.lPU;
            const ldDiff = ld - t.lL;
            spd = td > 0 ? (ldDiff / td) * 1000 : 0;
        }
        t.lL = ld;
        t.lPU = now;
        this._mpm.emit('downloadProgress', t.key, pct, spd, ld, tot);
        t.onP?.(pct, spd, ld, tot);
    }

    /** 处理下载错误（含重试逻辑） */
    private _err(t: DTask, err: string): void {
        t.ctrl = null;
        this.active.delete(t.key);
        if (t.rt < this.maxR) {
            t.rt++; t.st = DST.PENDING;
            Timer.setTimeout(1000 * t.rt, () => this._start(t));
        } else {
            t.st = DST.ERROR;
            this._mpm.emit('downloadError', t.key, err);
            t.onE?.(err);
            t.onSC?.(DST.ERROR);
            this._processQ();
        }
    }

    /** 销毁：暂停所有下载并清理定时器 */
    destroy(): void {
        this.pause();
        Timer.destroy();
    }
}
