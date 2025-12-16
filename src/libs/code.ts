// Code.ts
import { fileManager } from "./file";

export interface PackInfo {
    magic: string;
    version: string;
    fileCount: number;
    files: { [key: string]: [number, number] };
}

export interface DecompressResult {
    blob: Blob;
    mimeType: string;
    size: number;
}

export class Code {
    /**
     * 解析.res文件头部
     */
    static parsePack(blob: Blob, onComplete: (packInfo: PackInfo) => void, onError: (error: string) => void): void {
        const reader = new FileReader();
        
        reader.onload = () => {
            try {
                const buffer = reader.result as ArrayBuffer;
                const view = new DataView(buffer);
                
                // 读取magic
                const magicBytes = new Uint8Array(buffer.slice(0, 4));
                const magic = String.fromCharCode(...magicBytes);
                
                if (magic !== 'DPR1') {
                    throw new Error(`无效的包格式: ${magic}`);
                }
                
                // 读取头部长度
                const headerLength = view.getUint32(4, true);
                
                // 读取头部JSON
                const headerBytes = new Uint8Array(buffer.slice(8, 8 + headerLength));
                const headerText = new TextDecoder('utf-8').decode(headerBytes);
                const header = JSON.parse(headerText);
                
                const packInfo: PackInfo = {
                    magic,
                    version: header.version,
                    fileCount: header.fileCount,
                    files: header.files
                };
                
                onComplete(packInfo);
            } catch (error: any) {
                onError(`解析包失败: ${error.message}`);
            }
        };
        
        reader.onerror = () => {
            onError('读取包数据失败');
        };
        
        reader.readAsArrayBuffer(blob.slice(0, 1024 * 1024)); // 只读取前1MB，头部应该在这里
    }

    /**
     * 从包中解压文件
     */
    static decompressFile(
        packBlob: Blob,
        offset: number,
        length: number,
        filePath: string,
        onComplete: (result: DecompressResult) => void,
        onError: (error: string) => void
    ): void {
        // 读取压缩数据
        const compressedBlob = packBlob.slice(offset, offset + length);
        const reader = new FileReader();
        
        reader.onload = () => {
            try {
                const compressedData = new Uint8Array(reader.result as ArrayBuffer);
                const decompressed = this._decompress(compressedData);
                const mimeType = this._getMimeType(filePath);
                
                const result: DecompressResult = {
                    blob: new Blob([decompressed], { type: mimeType }),
                    mimeType,
                    size: decompressed.length
                };
                
                onComplete(result);
            } catch (error: any) {
                onError(`解压失败: ${error.message}`);
            }
        };
        
        reader.onerror = () => {
            onError('读取压缩数据失败');
        };
        
        reader.readAsArrayBuffer(compressedBlob);
    }

    /**
     * 从包中解压文件（使用文件路径）
     */
    static decompressFileByName(
        packBlob: Blob,
        packInfo: PackInfo,
        filePath: string,
        onComplete: (result: DecompressResult) => void,
        onError: (error: string) => void
    ): void {
        // 查找文件位置
        const fileInfo = this._findFileInPack(filePath, packInfo.files);
        if (!fileInfo) {
            onError(`文件未找到: ${filePath}`);
            return;
        }
        
        const [offset, length] = fileInfo;
        this.decompressFile(packBlob, offset, length, filePath, onComplete, onError);
    }

    /**
     * 批量解压文件
     */
    static decompressFiles(
        packBlob: Blob,
        packInfo: PackInfo,
        filePaths: string[],
        onProgress: (loaded: number, total: number) => void,
        onComplete: (results: { [path: string]: DecompressResult }) => void,
        onError: (errors: { [path: string]: string }) => void
    ): void {
        const results: { [path: string]: DecompressResult } = {};
        const errors: { [path: string]: string } = {};
        let loaded = 0;
        const total = filePaths.length;

        if (total === 0) {
            onComplete({});
            return;
        }

        const processNext = (index: number) => {
            if (index >= total) {
                onComplete(results);
                return;
            }

            const filePath = filePaths[index];
            this.decompressFileByName(
                packBlob,
                packInfo,
                filePath,
                (result: DecompressResult) => {
                    results[filePath] = result;
                    loaded++;
                    onProgress(loaded, total);
                    processNext(index + 1);
                },
                (error: string) => {
                    errors[filePath] = error;
                    loaded++;
                    onProgress(loaded, total);
                    processNext(index + 1);
                }
            );
        };

        processNext(0);
    }

    // ==================== 私有方法 ====================

    private static _findFileInPack(filePath: string, files: any): number[] | null {
        const parts = filePath.split('/');
        let current = files;
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            current = current[part];
            if (!current) return null;
            
            if (i === parts.length - 1) {
                return Array.isArray(current) && current.length === 2 ? current : null;
            }
        }
        
        return null;
    }

    private static _decompress(data: Uint8Array): Uint8Array {
        const output: number[] = [];
        let pos = 0;
        
        while (pos < data.length) {
            const opcode = data[pos++];
            
            if (opcode === 0x00) {
                // RAW块
                const len = data[pos] | (data[pos + 1] << 8);
                pos += 2;
                for (let i = 0; i < len; i++) {
                    output.push(data[pos++]);
                }
            } else if (opcode === 0x01) {
                // 单字节重复
                const count = data[pos++];
                const byte = data[pos++];
                for (let i = 0; i < count; i++) {
                    output.push(byte);
                }
            } else if (opcode >= 0x02 && opcode <= 0xDF) {
                // 多字节重复
                const seqLen = opcode;
                const repeatCount = data[pos++];
                const sequence = data.slice(pos, pos + seqLen);
                pos += seqLen;
                for (let i = 0; i < repeatCount; i++) {
                    output.push(...sequence);
                }
            } else if (opcode >= 0xE0 && opcode <= 0xF2) {
                // 间隔重复
                const stride = opcode - 0xE0;
                const repeatByte = data[pos++];
                const repeatCount = data[pos++];
                const tail = data.slice(pos, pos + stride - 1);
                pos += stride - 1;
                
                for (let i = 0; i <= repeatCount; i++) {
                    output.push(repeatByte);
                    if (i < repeatCount) {
                        output.push(...tail);
                    }
                }
            }
        }
        
        return new Uint8Array(output);
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
            'atlas': 'text/plain',
            'skel': 'application/octet-stream',
            'sk': 'application/octet-stream',
            'meta': 'text/plain',
            'txt': 'text/plain',
            'xml': 'text/xml'
        };
        
        return mimeMap[ext] || 'application/octet-stream';
    }
}