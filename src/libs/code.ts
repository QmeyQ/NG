/**
 * Code - 编解码工具类
 * 定义 PackInfo 资源包信息接口，提供十六进制补零、数据 dump 等静态工具方法
 */
// Code.ts

import { wxEnv, mkBlob, blobAb, ab2str } from './wx';
import { decompress as brDecompress } from './brdec/decode';

export interface PackInfo {
    magic: string;
    version: string;
    fileCount: number;
    files: { [key: string]: [number, number] };
    bodyOffset: number;
}

/**
 * brotli 资源根定位(跨服务器部署)：
 * JS 与页面分服务器时，跨域脚本内动态 import() 的相对路径以 about:blank 为 base 解析必失败，
 * 必须拼绝对 URL。取值优先级：window.BR_BASE 显式配置 > 入口脚本 origin(currentScript) > 页面 origin。
 * BR_BASE 指向含 /js/ 目录的服务器根，如 window.BR_BASE = 'https://js.example.com'
 */
const _brBase: string = (() => {
    const cfg = (window as any).BR_BASE;
    if (typeof cfg === 'string' && cfg) return cfg.replace(/\/+$/, '');
    try {
        const cs = document.currentScript as any;
        if (cs && cs.src) return new URL(cs.src).origin;
    } catch { }
    return '';
})();

export class Code {

    static padZero(num: number, len: number): string {
        let str = num.toString(16);
        while (str.length < len) str = '0' + str;
        return str;
    }

    static hexDump(data: any, maxBytes: number = 64): string {
        if (!data) return '[null]';
        try {
            let bytes: Uint8Array;
            if (data instanceof ArrayBuffer) {
                bytes = new Uint8Array(data);
            } else if (data instanceof Blob) {
                return `[Blob size=${data.size}]`;
            } else if (typeof data === 'string') {
                if (data.startsWith('data:')) return `[DataURL length=${data.length}]`;
                try {
                    const binary = atob(data);
                    bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                } catch {
                    bytes = new TextEncoder().encode(data);
                }
            } else {
                return `[Unknown type: ${typeof data}]`;
            }
            const len = Math.min(bytes.length, maxBytes);
            const hexParts: string[] = [];
            for (let i = 0; i < len; i++) hexParts.push(this.padZero(bytes[i], 2).toUpperCase());
            return hexParts.join(' ') + (bytes.length > maxBytes ? '...' : '');
        } catch (e) {
            return `[Error: ${e}]`;
        }
    }

    private static _brotliReady: Promise<any> | null = null;

    /** brotli js/wasm 路径 → 绝对 URL(绕开跨域脚本 about:blank base 解析失败) */
    private static _brUrl(path: string): string {
        return _brBase ? _brBase + path : new URL(path, document.baseURI).href;
    }

    private static _brotliModule(): Promise<any> {
        if (Code._brotliReady) return Code._brotliReady;
        if (wxEnv) {
            // 微信: 纯 JS brotli 解码(vendor 自 src/libs/brdec/, 随 bundle 打包)——
            // 不 require 独立 cjs、不 fs 读包内 wasm、不依赖 WebAssembly(PC 微信逻辑层缺异步 instantiate)
            Code._brotliReady = Promise.resolve({ decompress: (input: Uint8Array) => brDecompress(input) });
            return Code._brotliReady;
        }
        // 浏览器: brotli-wasm 按 URL 动态加载(性能优先), import() 用 new Function 包装绕开打包器静态解析
        // wasm 加载失败(发布 excludeFilesRule 排除/跨域缺失)时降级纯 JS 解码——与微信分支同源 brdec
        const dynamicImport = new Function('u', 'return import(u)') as (u: string) => Promise<any>;
        const jsUrl = Code._brUrl('/js/brotli_wasm.js');
        const wasmUrl = Code._brUrl('/js/brotli_wasm_bg.wasm');
        Code._brotliReady = (async () => {
            try {
                const mod: any = await dynamicImport(jsUrl);
                await mod.default(await fetch(wasmUrl));
                return mod;
            } catch {
                return { decompress: (input: Uint8Array) => brDecompress(input) };
            }
        })();
        return Code._brotliReady;
    }

    /**
     * Brotli 解压 .br 文件，返回容器格式的 ArrayBuffer（微信: 纯 JS 解码器 / 浏览器: brotli-wasm）
     */
    static decompressBr(blob: Blob, onComplete: (containerBuffer: ArrayBuffer) => void, onError: (error: string) => void): void {
        (async () => {
            try {
                const brotli = await Code._brotliModule();
                const ab = await blobAb(blob);
                const input = new Uint8Array(ab);
                const output: Uint8Array = brotli.decompress(input);
                const copy = new Uint8Array(output.length);
                copy.set(output);
                onComplete(copy.buffer);
            } catch (e: any) {
                onError('Brotli 解压失败: ' + (e?.message || e));
            }
        })();
    }

    /**
     * 解析容器头部（BRP1 magic + 头部长度 + 头部JSON）
     */
    static parsePack(blob: Blob, onComplete: (packInfo: PackInfo) => void, onError: (error: string) => void): void {
        // FileReader.readAsArrayBuffer → blobAb(平台通吃, 微信 FileReader polyfill 缺失风险)
        blobAb(blob).then((buffer) => {
            try {
                const view = new DataView(buffer);

                const magicBytes = new Uint8Array(buffer.slice(0, 4));
                const magic = String.fromCharCode(...magicBytes);

                if (magic !== 'BRP1') {
                    console.log(new Uint8Array(buffer.slice(0, 80)));
                    throw new Error(`无效的包格式: ${magic}`);
                }

                const headerTotalSize = view.getUint32(4, false);
                const bodyOffset = headerTotalSize;

                const headerStart = 8;
                const headerLength = bodyOffset - headerStart;

                if (headerLength <= 0) {
                    throw new Error(`头部长度无效: ${headerLength}`);
                }

                const headerBytes = new Uint8Array(buffer.slice(headerStart, bodyOffset));
                let headerText: string;
                try { headerText = new TextDecoder('utf-8').decode(headerBytes); }
                catch { headerText = ab2str(headerBytes); }
                headerText = headerText.trim().replace(/\0/g, '');

                const header = JSON.parse(headerText);

                const packInfo: PackInfo = {
                    magic,
                    version: header.version,
                    fileCount: header.fileCount,
                    files: header.files,
                    bodyOffset
                };

                onComplete(packInfo);
            } catch (error: any) {
                onError(`解析包失败: ${error.message}`);
            }
        }).catch(() => onError('读取包数据失败'));
    }

    /**
     * 从容器中按文件路径切片提取原始文件数据（无解压，直接切片）
     */
    static extractFile(container: ArrayBuffer, packInfo: PackInfo, filePath: string): Blob | null {
        const fileInfo = this._findFileInPack(filePath, packInfo.files);
        if (!fileInfo) return null;
        const [offset, length] = fileInfo;
        const start = packInfo.bodyOffset + offset;
        const end = start + length;
        if (end > container.byteLength) {
            console.error(`[Code] 文件数据越界: ${filePath} 偏移 ${start} 长度 ${length} 容器 ${container.byteLength}`);
            return null;
        }
        const mimeType = this._getMimeType(filePath);
        return mkBlob([container.slice(start, end)], mimeType);
    }

    /**
     * 批量提取文件
     */
    static extractFiles(
        container: ArrayBuffer,
        packInfo: PackInfo,
        filePaths: string[],
        onProgress: (loaded: number, total: number) => void,
        onComplete: (results: { [path: string]: Blob }) => void,
        onError: (errors: { [path: string]: string }) => void
    ): void {
        const results: { [path: string]: Blob } = {};
        const errors: { [path: string]: string } = {};
        let loaded = 0;
        const total = filePaths.length;

        if (total === 0) {
            onComplete({});
            return;
        }

        filePaths.forEach(filePath => {
            const blob = this.extractFile(container, packInfo, filePath);
            if (blob) {
                results[filePath] = blob;
            } else {
                errors[filePath] = `文件未找到或越界: ${filePath}`;
            }
            loaded++;
            onProgress(loaded, total);
        });

        if (Object.keys(errors).length > 0) {
            onError(errors);
        } else {
            onComplete(results);
        }
    }

    // ==================== 私有方法 ====================

    private static _findFileInPack(filePath: string, files: any): [number, number] | null {
        const findNested = (obj: any, parts: string[]): any => {
            if (!obj || parts.length === 0) return null;
            const part = parts[0];
            const value = obj[part];
            if (parts.length === 1) {
                if (Array.isArray(value) && value.length === 2) {
                    return value;
                }
                return null;
            } else {
                return findNested(value, parts.slice(1));
            }
        };
        const parts = filePath.split('/');
        return findNested(files, parts);
    }

    private static _getMimeType(filePath: string): string {
        const ext = filePath.split('.').pop()?.toLowerCase() || '';
        const mimeMap: { [key: string]: string } = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'json': 'application/json',
            'atlas': 'application/json',
            'skel': 'application/octet-stream',
            'sk': 'application/octet-stream',
            'meta': 'application/json',
            'txt': 'text/plain',
            'xml': 'text/xml',
            'html': 'text/html',
            'htm': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'lani': 'application/octet-stream',
            'lmat': 'application/octet-stream',
            'lm': 'application/octet-stream',
            'lh': 'application/octet-stream',
            'ls': 'application/octet-stream'
        };
        return mimeMap[ext] || 'application/octet-stream';
    }
}
