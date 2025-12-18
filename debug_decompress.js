
const fs = require('fs');
const path = require('path');

class ResDebugger {
    static run() {
        const resPath = path.join(__dirname, 'assets/res.res');
        const buffer = fs.readFileSync(resPath);
        
        console.log(`Res file size: ${buffer.length}`);
        
        // 1. Parse Header
        const magic = buffer.slice(0, 4).toString();
        const headerLen = buffer.readUInt32BE(4);
        console.log(`Magic: ${magic}`);
        console.log(`Header Total Length: ${headerLen}`);
        
        const headerJsonBytes = buffer.slice(8, headerLen);
        const headerJsonStr = headerJsonBytes.toString('utf-8').trim().replace(/\0/g, '');
        const packInfo = JSON.parse(headerJsonStr);
        
        console.log(`Header parsed. File count: ${packInfo.fileCount}`);
        
        // 2. Try to decompress a problematic file
        // res.ts:542 解压文件失败 card/archer.png: 解压失败: RAW block out of bounds at 1688756, len=57436
        // res.ts:542 解压文件失败 card/chilinger.png.meta: 解压失败: MultiByte block out of bounds at 5
        
        this.decompressFile(buffer, headerLen, packInfo.files['card']['archer.png'], 'card/archer.png');
        this.decompressFile(buffer, headerLen, packInfo.files['card']['chilinger.png.meta'], 'card/chilinger.png.meta');
    }
    
    static decompressFile(packBuffer, bodyOffset, fileInfo, fileName) {
        console.log(`\n-----------------------------------`);
        console.log(`Decompressing: ${fileName}`);
        
        if (!fileInfo) {
            console.error(`File info not found for ${fileName}`);
            return;
        }
        
        const [offset, length] = fileInfo;
        const absStart = bodyOffset + offset;
        const absEnd = absStart + length;
        
        console.log(`Offset: ${offset}, Length: ${length}`);
        console.log(`Absolute Range: ${absStart} - ${absEnd}`);
        
        if (absEnd > packBuffer.length) {
            console.error(`ERROR: File range out of bounds! File end: ${packBuffer.length}`);
            return;
        }
        
        const data = packBuffer.slice(absStart, absEnd);
        this._decompress(data);
    }
    
    static _decompress(data) {
        let pos = 0;
        let outPos = 0;
        let blockCount = 0;
        
        try {
            while (pos < data.length) {
                const opcode = data[pos++];
                blockCount++;
                
                // Log first few blocks
                if (blockCount <= 5) {
                    console.log(`Block ${blockCount}: Opcode 0x${opcode.toString(16).padStart(2, '0')} at pos ${pos-1}`);
                }

                if (opcode === 0x00) {
                    // RAW
                    if (pos + 1 >= data.length) break;
                    const len = (data[pos] << 8) | data[pos + 1];
                    pos += 2;
                    
                    if (blockCount <= 5) console.log(`  -> RAW len: ${len}`);
                    
                    if (pos + len > data.length) {
                        throw new Error(`RAW block out of bounds at ${pos}, len=${len}, dataLen=${data.length}`);
                    }
                    outPos += len;
                    pos += len;
                } else if (opcode === 0x01) {
                    // SINGLE
                    if (pos + 1 >= data.length) break;
                    const count = data[pos++];
                    const byte = data[pos++];
                    if (blockCount <= 5) console.log(`  -> SINGLE count: ${count}, byte: 0x${byte.toString(16)}`);
                    outPos += count;
                } else if (opcode >= 0x02 && opcode <= 0xE0) {
                    // MULTI
                    const seqLen = opcode;
                    if (pos >= data.length) break;
                    const repeatCount = data[pos++];
                    
                    if (blockCount <= 5) console.log(`  -> MULTI seqLen: ${seqLen}, repeat: ${repeatCount}`);

                    if (pos + seqLen > data.length) {
                        throw new Error(`MultiByte block out of bounds at ${pos}, seqLen=${seqLen}, dataLen=${data.length}`);
                    }
                    
                    outPos += seqLen * repeatCount;
                    pos += seqLen;
                } else if (opcode >= 0xE1 && opcode <= 0xF2) {
                    // INTERVAL
                    const stride = opcode - 0xE0;
                    if (pos + 1 >= data.length) break;
                    const repeatByte = data[pos++];
                    const repeatCount = data[pos++];
                    
                    const tailLen = stride - 1;
                    
                    if (blockCount <= 5) console.log(`  -> INTERVAL stride: ${stride}, repeat: ${repeatCount}`);

                    if (pos + tailLen > data.length) {
                        throw new Error(`Interval block out of bounds at ${pos}, tailLen=${tailLen}, dataLen=${data.length}`);
                    }
                    
                    outPos += stride * (repeatCount + 1);
                    pos += tailLen;
                } else {
                    console.error(`Unknown opcode: 0x${opcode.toString(16)} at ${pos-1}`);
                    // break;
                }
            }
            console.log(`Decompression successful. Output size: ${outPos}`);
        } catch (e) {
            console.error(`Decompression failed: ${e.message}`);
        }
    }
}

ResDebugger.run();
