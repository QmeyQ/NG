/**
 * Code - 编解码工具类
 * 定义 PackInfo 资源包信息接口，提供十六进制补零、数据 dump 等静态工具方法
 */
// Code.ts


export interface PackInfo {
    magic: string;
    version: string;
    fileCount: number;
    files: { [key: string]: [number, number] };
    bodyOffset: number;
}

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
    private static _brotliModule(): Promise<any> {
        if (Code._brotliReady) return Code._brotliReady;
        const dynamicImport = new Function('u', 'return import(u)') as (u: string) => Promise<any>;
        const jsUrl = '/js/brotli_wasm.js';
        const wasmUrl = '/js/brotli_wasm_bg.wasm';
        Code._brotliReady = (async () => {
            const mod: any = await dynamicImport(jsUrl);
            await mod.default(await fetch(wasmUrl));
            return mod;
        })();
        return Code._brotliReady;
    }

    /**
     * Brotli 解压 .br 文件，返回容器格式的 ArrayBuffer（使用 brotli-wasm）
     */
    static decompressBr(blob: Blob, onComplete: (containerBuffer: ArrayBuffer) => void, onError: (error: string) => void): void {
        (async () => {
            try {
                const brotli = await Code._brotliModule();
                const ab = await blob.arrayBuffer();
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
        const reader = new FileReader();

        reader.onload = () => {
            try {
                const buffer = reader.result as ArrayBuffer;
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
                const decoder = new TextDecoder('utf-8');
                let headerText = decoder.decode(headerBytes);
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
        };

        reader.onerror = () => {
            onError('读取包数据失败');
        };

        reader.readAsArrayBuffer(blob);
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
        return new Blob([container.slice(start, end)], { type: mimeType });
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
