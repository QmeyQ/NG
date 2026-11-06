/**
 * wx - 微信小游戏环境适配层
 *
 * 平台探测 / fetch 兼容(wx.request 封装 Response-like) / AbortController shim /
 * Blob shim(新基础库原生 Blob 可用时优先用) / 本地存储降级(wx storage KV + fs 文件)。
 * Web 环境全部直通原生实现, 调用方无感。
 */
const g: any = globalThis as any;

/** 是否微信小游戏环境 */
export const wxEnv: boolean = !!g.wx && !!g.wx.request;

export interface PfResponse {
    ok: boolean;
    status: number;
    headers: { get(k: string): string | null };
    arrayBuffer(): Promise<ArrayBuffer>;
    text(): Promise<string>;
    body?: { cancel(): void };
}

export interface PfInit {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: any;
    cache?: string;
    /** 微信专属: 头到手即 abort 断流并 resolve(探测头信息用, 免全量下载); Web 端忽略 */
    headerOnly?: boolean;
}

/** ArrayBuffer/Uint8Array -> UTF-8 字符串(TextDecoder 缺失时手解兜底) */
export function ab2str(ab: ArrayBuffer | Uint8Array): string {
    const u8 = ab instanceof Uint8Array ? ab : new Uint8Array(ab);
    try { return new TextDecoder().decode(u8); } catch { }
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    try { return decodeURIComponent(escape(s)); } catch { return s; }
}

/** 平台 fetch: Web 走原生, 微信走 wx.request 封装 Response-like */
export function pFetch(url: string, init?: PfInit): Promise<PfResponse> {
    if (!wxEnv) return fetch(url, init as any) as any;
    return new Promise((resolve, reject) => {
        const w = g.wx;
        let task: any = null;
        let settled = false;
        task = w.request({
            url,
            method: init?.method || 'GET',
            header: init?.headers || {},
            data: init?.body,
            responseType: 'arraybuffer',
            timeout: 15000,
            onHeadersReceived: (hr: any) => {
                // headerOnly: wx.request 无 body.cancel 断流能力, 头到手即 abort, 探测头信息不再全量下载
                if (settled || !init?.headerOnly) return;
                settled = true;
                const h: Record<string, string> = {};
                const rh = hr?.header || {};
                for (const k in rh) {
                    const v = rh[k];
                    h[String(k).toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v);
                }
                try { task?.abort?.(); } catch { }
                const st = hr?.statusCode || 200;
                resolve({
                    ok: st >= 200 && st < 300,
                    status: st,
                    headers: { get: (k: string) => { const v = h[k.toLowerCase()]; return v === undefined ? null : v; } },
                    arrayBuffer: async () => new ArrayBuffer(0),
                    text: async () => '',
                    body: { cancel: () => { } },
                });
            },
            success: (r: any) => {
                settled = true;
                const h: Record<string, string> = {};
                const rh = r.header || {};
                for (const k in rh) {
                    const v = rh[k];
                    h[String(k).toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v);
                }
                
                // 🚨 核心修复：使用鸭子类型判定
                let dataAb: ArrayBuffer;
                if (r.data instanceof ArrayBuffer) {
                    dataAb = r.data;
                } else if (r.data && typeof r.data.byteLength === 'number') {
                    dataAb = new Uint8Array(r.data).buffer as ArrayBuffer;
                } else {
                    dataAb = new ArrayBuffer(0); // 兜底
                }

                resolve({
                    ok: r.statusCode >= 200 && r.statusCode < 300,
                    status: r.statusCode,
                    headers: { get: (k: string) => { const v = h[k.toLowerCase()]; return v === undefined ? null : v; } },
                    arrayBuffer: async () => dataAb,
                    text: async () => ab2str(dataAb),
                    body: { cancel: () => { } },
                });
            },
            fail: (e: any) => {
                if (settled) return;
                settled = true;
                reject(new Error(e?.errMsg || 'wx.request fail'));
            },
        });
        const sig = init?.signal;
        if (sig) {
            const onAbort = () => { try { task?.abort?.(); } catch { } };
            if (sig.aborted) onAbort();
            else sig.addEventListener?.('abort', onAbort);
        }
    });
}

/** 平台 AbortController: 原生缺失时最小 shim(仅覆盖本项目 signal.abort 用法) */
export function pAbortCtrl(): any {
    if (typeof AbortController === 'function') return new AbortController();
    const listeners: Array<() => void> = [];
    return {
        signal: { aborted: false, addEventListener: (_: string, fn: () => void) => { listeners.push(fn); } },
        abort: () => { },
    };
}

/** 平台 Blob 构造: Web/新基础库用原生, 否则自制 shim(仅实现本项目用到的 size/type/arrayBuffer/text) */
export function mkBlob(parts: Array<ArrayBuffer | Uint8Array | string | any>, type?: string): any {
    const blobCtor: any = g.Blob;
    if (typeof blobCtor === 'function') {
        try {
            // 同步归一化: 跨环境丢失原型的 TypedArray-like 先转回标准形态, 避免原生 Blob 构造抛错
            const norm = parts.map(p => {
                if (p instanceof ArrayBuffer || p instanceof Uint8Array || typeof p === 'string') return p;
                if (p && typeof p === 'object' && typeof p.byteLength === 'number') {
                    try { return new Uint8Array(p); } catch { }
                }
                return p;
            });
            return new blobCtor(norm, { type });
        } catch { }
    }
    const ab = partsAb(parts);
    return {
        size: ab.byteLength,
        type: type || '',
        arrayBuffer: async () => ab,
        text: async () => ab2str(ab),
    };
}

/** 任意 blob/arraybuffer -> Promise<ArrayBuffer>(Blob shim 与原生 Blob 通吃) */
export function blobAb(b: any): Promise<ArrayBuffer> {
    if (b instanceof ArrayBuffer) return Promise.resolve(b);
    if (b instanceof Uint8Array) return Promise.resolve(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
    if (b && typeof b.byteLength === 'number' && typeof b !== 'string') {
        try { return Promise.resolve(new Uint8Array(b).buffer as ArrayBuffer); } catch { }
    }
    if (b && typeof b.arrayBuffer === 'function') return b.arrayBuffer();
    // 不再静默返回空 buffer: 静默空数据会把坏文件写进缓存(如 [object Object] 伪文件), 宁可让上层走错误分支
    return Promise.reject(new Error('blobAb: 无法提取二进制数据 ' + Object.prototype.toString.call(b)));
}

function partsAb(parts: Array<any>): ArrayBuffer {
    let total = 0;
    const u8Parts: Uint8Array[] = [];

    // 辅助函数：把任何类似数组的东西强制转成 Uint8Array
    const forceToU8 = (p: any): Uint8Array => {
        if (p instanceof ArrayBuffer) return new Uint8Array(p);
        if (p instanceof Uint8Array) return p;
        // 🌟 核心修复：处理因为微信跨线程导致丢失原型的 ArrayBuffer/TypeArray
        if (typeof p === 'object' && p !== null) {
            if (typeof p.byteLength === 'number') return new Uint8Array(p);
            if (typeof p.length === 'number') return new Uint8Array(p);
        }
        return new Uint8Array(str2ab(String(p)));
    };

    for (const p of parts) {
        const u8 = forceToU8(p);
        u8Parts.push(u8);
        total += u8.length;
    }

    const out = new Uint8Array(total);
    let off = 0;
    for (const u8 of u8Parts) {
        out.set(u8, off);
        off += u8.length;
    }
    return out.buffer as ArrayBuffer;
}

function str2ab(s: string): ArrayBuffer {
    try { return new TextEncoder().encode(s).buffer as ArrayBuffer; } catch { }
    const u8 = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i) & 0xff;
    return u8.buffer as ArrayBuffer;
}

// ==================== 微信本地存储降级(IDBStorage 无 indexedDB 时使用) ====================
// KV 走 wx storage(带前缀隔离), 文件走用户目录 fs(ArrayBuffer)

const KV_PREFIX = 'idbx:';
const KV_FILE_PREFIX = 'idbf:';

function wxf(): any | null {
    if (!wxEnv) return null;
    return g.wx.getFileSystemManager ? g.wx.getFileSystemManager() : null;
}

function fileNameEncode(name: string): string {
    return encodeURIComponent(name).replace(/[!*'()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

export function wxKvGet(k: string): any {
    if (!wxEnv) return null;
    try {
        const v = g.wx.getStorageSync(KV_PREFIX + k);
        return v === '' ? null : v;
    } catch { return null; }
}

export function wxKvSet(k: string, v: any): boolean {
    if (!wxEnv) return false;
    try { g.wx.setStorageSync(KV_PREFIX + k, v); return true; }
    catch (e) { console.error('[wx] setStorageSync fail:', k, v && String(v).length, e); return false; }
}

export function wxKvDel(k: string): boolean {
    if (!wxEnv) return false;
    try { g.wx.removeStorageSync(KV_PREFIX + k); return true; } catch { return false; }
}

/** wx storage 全部键(去掉本项目前缀后的键名) */
export function wxKvKeys(): string[] {
    if (!wxEnv) return [];
    try {
        const info = g.wx.getStorageInfoSync();
        return (info.keys || []).filter((k: string) => k.indexOf(KV_PREFIX) === 0).map((k: string) => k.slice(KV_PREFIX.length));
    } catch { return []; }
}

export function wxFileWrite(name: string, data: ArrayBuffer | any): boolean {
    const fs = wxf();
    if (!fs || wxEnv === false) return false;
    
    try {
        // 🚨 使用安全转换，彻底避免 ab.buffer 未定义的问题
        const ab = toSafeArrayBuffer(data);
        if (!ab || ab.byteLength === 0) {
            // 如果长度为0，在微信里写空文件没问题，但如果是对象拦截下来
            if (!ab) {
                console.error("[wx.ts] 致命错误：无法转换为 ArrayBuffer，拦截写入！", data);
                return false;
            }
        }

        // 注意：微信写入 ArrayBuffer 时不需要 'binary' 参数！
        fs.writeFileSync(g.wx.env.USER_DATA_PATH + '/' + KV_FILE_PREFIX + fileNameEncode(name), ab);
        return true;
    } catch (e) {
        console.error("[wx.ts] 写入文件异常:", e);
        return false; 
    }
}

/**
 * 万能安全转换：将任意可迭代/类数组/字符串 强制转为纯正的 ArrayBuffer
 * 专治微信小游戏中丢失 .buffer 属性、跨环境 instanceof 失效的问题
 */
function toSafeArrayBuffer(data: any): ArrayBuffer | null {
    if (!data) return null;
    if (data instanceof ArrayBuffer) return data;

    // 🌟 核心修复：跨线程丢失原型时的兜底
    if (typeof data === 'object' && data !== null) {
        if (typeof data.byteLength === 'number') {
            return new Uint8Array(data).buffer;
        }
        if (typeof data.length === 'number') {
            const u8 = new Uint8Array(data.length);
            for (let i = 0; i < data.length; i++) u8[i] = data[i];
            return u8.buffer;
        }
    }

    if (typeof data === 'string') {
        return str2ab(data);
    }
    return null;
}

export function wxFileRead(name: string): ArrayBuffer | null {
    const fs = wxf();
    if (!fs) return null;
    try {
        const r = fs.readFileSync(g.wx.env.USER_DATA_PATH + '/' + KV_FILE_PREFIX + fileNameEncode(name));
        return r instanceof ArrayBuffer ? r : (r && r.data instanceof ArrayBuffer ? r.data : null);
    } catch { return null; }
}

export function wxFileDelete(name: string): boolean {
    const fs = wxf();
    if (!fs) return false;
    try { fs.unlinkSync(g.wx.env.USER_DATA_PATH + '/' + KV_FILE_PREFIX + fileNameEncode(name)); return true; } catch { return false; }
}

export function wxFileKeys(): string[] {
    const fs = wxf();
    if (!fs) return [];
    try {
        const names: string[] = fs.readdirSync(g.wx.env.USER_DATA_PATH) || [];
        return names.filter((n: string) => n.indexOf(KV_FILE_PREFIX) === 0)
            .map((n: string) => decodeURIComponent(n.slice(KV_FILE_PREFIX.length)));
    } catch { return []; }
}

/** 存储占用(KB): wx storage currentSize + 用户目录文件无法统计记 0 */
export function wxStorageUsageKb(): number {
    if (!wxEnv) return 0;
    try { return g.wx.getStorageInfoSync().currentSize || 0; } catch { return 0; }
}
/**
 * 启动清扫 USER_DATA_PATH 存量垃圾(一次性, 治历史残留):
 * - res_<ts>_<rand>.<ext> 旧随机名临时文件(现改 resr_ 确定性命名, 不再累积)
 * - pk_/pkex_ zip 解压残留现场
 * - 孤儿分片: idbf: 文件名匹配 *_chunk_N 且无对应 <base>_chunks_state KV(断点还在的保留)
 */
export function wxSweepJunk(): void {
    const fs = wxf();
    if (!fs) return;
    const root = g.wx.env.USER_DATA_PATH;
    const chunkBases = new Set<string>();
    for (const k of wxKvKeys()) {
        const m = k.match(/^(.*)_chunks_state$/);
        if (m) chunkBases.add(m[1]);
    }
    let names: string[] = [];
    try { names = fs.readdirSync(root) || []; } catch { return; }
    let swept = 0;
    for (const n of names) {
        try {
            if (n.indexOf('res_') === 0 && /^res_\d+_\d+\.\w+$/.test(n)) {
                fs.unlinkSync(root + '/' + n); swept++;
            } else if (n.indexOf('pk_') === 0) {
                fs.unlinkSync(root + '/' + n); swept++;
            } else if (n.indexOf('pkex_') === 0) {
                fs.rmdirSync(root + '/' + n, true); swept++;
            } else if (n.indexOf(KV_FILE_PREFIX) === 0) {
                const m = n.slice(KV_FILE_PREFIX.length).match(/^(.*)_chunk_\d+$/);
                if (m) {
                    let base = m[1];
                    try { base = decodeURIComponent(base); } catch { }
                    if (!chunkBases.has(base)) { fs.unlinkSync(root + '/' + n); swept++; }
                }
            }
        } catch { }
    }
    if (swept > 0) console.log(`[wx] 启动清扫存量垃圾 ${swept} 项`);
}