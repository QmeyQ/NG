// Code.ts
import { fileManager } from "./file";

export interface PackInfo {
    magic: string;
    version: string;
    fileCount: number;
    files: { [key: string]: [number, number] };
    bodyOffset: number;
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
                
                // 读取头部长度 (Magic(4) + Length(4) + JSON数据)
                const headerTotalSize = view.getUint32(4, false); // Big Endian
                
                // 计算body偏移量 = 总头部长度
                const bodyOffset = headerTotalSize;
                
                // 读取头部JSON (从第8字节开始，到bodyOffset结束)
                const headerStart = 8; // 跳过 Magic(4) + Length(4)
                const headerLength = bodyOffset - headerStart;
                
                if (headerLength <= 0) {
                    throw new Error(`头部长度无效: ${headerLength}`);
                }
                
                const headerBytes = new Uint8Array(buffer.slice(headerStart, bodyOffset));
                const decoder = new TextDecoder('utf-8');
                let headerText = decoder.decode(headerBytes);
                
                // 移除可能存在的BOM或空白字符
                headerText = headerText.trim();
                // 移除末尾可能的null字符
                headerText = headerText.replace(/\0/g, '');
                
                console.log(`[Code] 头部总大小: ${headerTotalSize}, JSON长度: ${headerText.length}, Body偏移: ${bodyOffset}`);
                
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
        
        reader.readAsArrayBuffer(blob.slice(0, 1024 * 1024));
    }

    /**
     * 从包中解压文件
     */
    static decompressFile(
        packBlob: Blob,
        packInfo: PackInfo,
        offset: number,
        length: number,
        filePath: string,
        onComplete: (result: DecompressResult) => void,
        onError: (error: string) => void
    ): void {
        // 计算实际文件数据在包中的偏移量（加上body偏移量）
        const actualOffset = packInfo.bodyOffset + offset;
        const actualEnd = actualOffset + length;
        
        // 检查偏移量是否有效
        if (actualEnd > packBlob.size) {
            onError(`文件数据越界: 偏移 ${actualOffset}, 长度 ${length}, 包大小 ${packBlob.size}`);
            return;
        }
        
        // 读取压缩数据
        const compressedBlob = packBlob.slice(actualOffset, actualEnd);
        const reader = new FileReader();
        
        reader.onload = () => {
            try {
                const compressedData = new Uint8Array(reader.result as ArrayBuffer);
                const decompressed = this._decompress(compressedData);
                const mimeType = this._getMimeType(filePath);
                
                console.log(`[Code] 解压文件: ${filePath}, 压缩后: ${compressedData.length}字节, 解压后: ${decompressed.length}字节`);
                
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
        this.decompressFile(packBlob, packInfo, offset, length, filePath, onComplete, onError);
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
                if (Object.keys(errors).length > 0) {
                    onError(errors);
                } else {
                    onComplete(results);
                }
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

    private static _findFileInPack(filePath: string, files: any): [number, number] | null {
        // 根据编码代码，files对象是嵌套的，需要递归查找
        const findNested = (obj: any, parts: string[]): any => {
            if (!obj || parts.length === 0) return null;
            
            const part = parts[0];
            const value = obj[part];
            
            if (parts.length === 1) {
                // 找到目标文件
                if (Array.isArray(value) && value.length === 2) {
                    return value;
                }
                return null;
            } else {
                // 继续递归查找
                return findNested(value, parts.slice(1));
            }
        };

        const parts = filePath.split('/');
        return findNested(files, parts);
    }

    private static _decompress(data: Uint8Array): Uint8Array {
        const outputChunks: Uint8Array[] = [];
        let totalOutputSize = 0;
        let pos = 0;

        while (pos < data.length) {
            const opcode = data[pos++];

            if (opcode === 0x00) {
                // RAW块
                if (pos + 1 >= data.length) {
                    throw new Error(`RAW块数据不足 at ${pos}`);
                }
                
                // 读取长度 (Big-Endian)
                const len = (data[pos] << 8) | data[pos + 1];
                pos += 2;
                
                if (pos + len > data.length) {
                    throw new Error(`RAW块数据越界 at ${pos}, len=${len}`);
                }
                
                const chunk = data.slice(pos, pos + len);
                outputChunks.push(chunk);
                totalOutputSize += len;
                pos += len;
                
            } else if (opcode === 0x01) {
                // 单字节重复
                if (pos + 1 >= data.length) {
                    throw new Error(`单字节重复块数据不足 at ${pos}`);
                }
                
                const count = data[pos++];
                const byte = data[pos++];
                
                const chunk = new Uint8Array(count);
                chunk.fill(byte);
                outputChunks.push(chunk);
                totalOutputSize += count;
                
            } else if (opcode >= 0x02 && opcode <= 0xE0) {
                // 多字节重复 (opcode = 序列长度)
                const seqLen = opcode;
                if (pos >= data.length) {
                    throw new Error(`多字节重复块数据不足 at ${pos}`);
                }
                
                const repeatCount = data[pos++];
                
                if (pos + seqLen > data.length) {
                    throw new Error(`多字节重复块序列数据不足 at ${pos}`);
                }
                
                const sequence = data.slice(pos, pos + seqLen);
                pos += seqLen;
                
                // 创建重复数据
                const totalLen = seqLen * repeatCount;
                const chunk = new Uint8Array(totalLen);
                
                for (let i = 0; i < repeatCount; i++) {
                    chunk.set(sequence, i * seqLen);
                }
                
                outputChunks.push(chunk);
                totalOutputSize += totalLen;
                
            } else if (opcode >= 0xE1 && opcode <= 0xF2) {
                // 间隔重复 (opcode - 0xE0 = 步长)
                const stride = opcode - 0xE0;
                
                if (pos + 1 >= data.length) {
                    throw new Error(`间隔重复块数据不足 at ${pos}`);
                }
                
                const repeatByte = data[pos++];
                const repeatCount = data[pos++]; // 注意：这是额外重复次数
                
                const tailLen = stride - 1;
                if (tailLen > 0) {
                    if (pos + tailLen > data.length) {
                        throw new Error(`间隔重复块尾部数据不足 at ${pos}`);
                    }
                }
                
                const tail = tailLen > 0 ? data.slice(pos, pos + tailLen) : new Uint8Array(0);
                pos += tailLen;
                
                // 总组数 = repeatCount + 1
                const totalGroups = repeatCount + 1;
                const totalLen = stride * totalGroups;
                const chunk = new Uint8Array(totalLen);
                
                for (let i = 0; i < totalGroups; i++) {
                    const offset = i * stride;
                    chunk[offset] = repeatByte;
                    if (tailLen > 0) {
                        chunk.set(tail, offset + 1);
                    }
                }
                
                outputChunks.push(chunk);
                totalOutputSize += totalLen;
                
            } else {
                throw new Error(`未知的opcode: 0x${opcode.toString(16)} at ${pos-1}`);
            }
        }

        // 合并所有chunk
        const result = new Uint8Array(totalOutputSize);
        let offset = 0;
        for (const chunk of outputChunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        
        return result;
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
            'atlas': 'application/json', // 通常也是JSON格式
            'skel': 'application/octet-stream',
            'sk': 'application/octet-stream',
            'meta': 'application/json',
            'txt': 'text/plain',
            'xml': 'text/xml',
            'html': 'text/html',
            'htm': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript'
        };
        
        return mimeMap[ext] || 'application/octet-stream';
    }
}