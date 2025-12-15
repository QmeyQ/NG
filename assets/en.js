#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

class OptimalCompressor {
  constructor() {
    // 最大参数定义
    this.MAX_SEQ_LEN = 0xDF;      // 最大重复序列长度
    this.MAX_STRIDE = 0x12;        // 最大间隔步长
    this.MAX_RUN = 255;           // 最大重复次数
  }

  // 1. 动态规划寻找最优压缩方案
  compressWithDP(bytes) {
    const n = bytes.length;
    
    // dp[i] = 压缩前i个字节的最小长度
    // prev[i] = 到达i的最佳路径
    const dp = new Array(n + 1).fill(Infinity);
    const prev = new Array(n + 1).fill(null);
    dp[0] = 0;
    
    // 预计算所有可能的压缩块
    console.log('正在预计算所有可能的压缩块...');
    const allBlocks = [];
    
    // 遍历所有起始位置
    for (let start = 0; start < n; start++) {
      // 1. 单字节重复块
      const singleByte = this.findSingleByteRepeat(bytes, start);
      if (singleByte) {
        allBlocks.push(singleByte);
      }
      
      // 2. 多字节重复块（考虑所有长度）
      for (let seqLen = 2; seqLen <= Math.min(this.MAX_SEQ_LEN, n - start); seqLen++) {
        const multiByte = this.findMultiByteRepeat(bytes, start, seqLen);
        if (multiByte) {
          allBlocks.push(multiByte);
        }
      }
      
      // 3. 间隔重复块（考虑所有步长）
      for (let stride = 1; stride <= Math.min(this.MAX_STRIDE, n - start); stride++) {
        const interval = this.findIntervalRepeat(bytes, start, stride);
        if (interval) {
          allBlocks.push(interval);
        }
      }
      
      // 4. 原始块（1-0xFFFF字节）
      for (let len = 1; len <= Math.min(0xFFFF, n - start); len++) {
        allBlocks.push({
          type: 'RAW',
          start: start,
          end: start + len,
          size: 3 + len, // 0x00 + 2字节长度 + 原始数据
          consumed: len
        });
      }
    }
    
    console.log(`计算了 ${allBlocks.length} 个压缩块，开始动态规划...`);
    
    // 按起始位置排序，方便查找
    allBlocks.sort((a, b) => a.start - b.start || a.end - b.end);
    
    // 按起始位置分组
    const blocksByStart = new Array(n + 1).fill().map(() => []);
    for (const block of allBlocks) {
      blocksByStart[block.start].push(block);
    }
    
    // 动态规划主循环
    for (let i = 0; i < n; i++) {
      if (dp[i] === Infinity) continue;
      
      const blocks = blocksByStart[i];
      for (const block of blocks) {
        const next = i + block.consumed;
        if (next > n) continue;
        
        const newCost = dp[i] + block.size;
        if (newCost < dp[next]) {
          dp[next] = newCost;
          prev[next] = {
            block: block,
            from: i
          };
        }
      }
    }
    
    console.log(`动态规划完成，最优压缩大小: ${dp[n]} 字节`);
    
    // 重建最优路径
    const compressedBlocks = [];
    let pos = n;
    while (pos > 0) {
      const step = prev[pos];
      if (!step) {
        // 回退到使用原始块
        const rawSize = Math.min(0xFFFF, pos);
        const start = pos - rawSize;
        compressedBlocks.unshift({
          type: 'RAW',
          start: start,
          end: pos,
          size: 3 + rawSize,
          data: bytes.slice(start, pos)
        });
        pos = start;
      } else {
        compressedBlocks.unshift(step.block);
        pos = step.from;
      }
    }
    
    return this.assembleBlocks(bytes, compressedBlocks);
  }
  
  // 2. 查找单字节重复块
  findSingleByteRepeat(bytes, start) {
    if (start >= bytes.length) return null;
    
    const b = bytes[start];
    let run = 1;
    const maxRun = Math.min(this.MAX_RUN, bytes.length - start);
    
    while (run < maxRun && bytes[start + run] === b) {
      run++;
    }
    
    // 单字节重复需要至少4个字节才有收益
    if (run >= 4) {
      return {
        type: 'SINGLE_BYTE',
        start: start,
        end: start + run,
        size: 3, // 0x01 + run + byte
        consumed: run,
        run: run,
        byte: b
      };
    }
    
    return null;
  }
  
  // 3. 查找多字节重复块
  findMultiByteRepeat(bytes, start, seqLen) {
    const remaining = bytes.length - start;
    if (seqLen > remaining) return null;
    
    const seq = bytes.slice(start, start + seqLen);
    let run = 1;
    const maxRun = Math.min(this.MAX_RUN, Math.floor(remaining / seqLen));
    
    // 检查重复
    for (let i = 1; i < maxRun; i++) {
      const nextStart = start + i * seqLen;
      if (nextStart + seqLen > bytes.length) break;
      
      let match = true;
      for (let j = 0; j < seqLen; j++) {
        if (bytes[nextStart + j] !== seq[j]) {
          match = false;
          break;
        }
      }
      
      if (match) {
        run++;
      } else {
        break;
      }
    }
    
    // 需要至少重复2次才有收益
    if (run >= 2) {
      const rawSize = run * seqLen;
      const compressedSize = 2 + seqLen; // seqLen + run + sequence
      
      // 只有确实有节省才考虑
      if (compressedSize < rawSize) {
        return {
          type: 'MULTI_BYTE',
          start: start,
          end: start + rawSize,
          size: compressedSize,
          consumed: rawSize,
          seqLen: seqLen,
          run: run,
          sequence: seq
        };
      }
    }
    
    return null;
  }
  
  // 4. 查找间隔重复块
  findIntervalRepeat(bytes, start, stride) {
    const remaining = bytes.length - start;
    if (stride > remaining) return null;
    
    const repeatByte = bytes[start];
    let groups = 1;
    const maxGroups = Math.min(this.MAX_RUN, Math.floor(remaining / stride));
    
    // 检查后续组
    for (let g = 1; g < maxGroups; g++) {
      const bytePos = start + g * stride;
      if (bytePos >= bytes.length || bytes[bytePos] !== repeatByte) {
        break;
      }
      groups++;
    }
    
    // 需要至少4组才有收益
    if (groups >= 4) {
      const rawSize = stride * groups;
      const tailSize = (stride - 1) * groups;
      const compressedSize = 3 + tailSize; // opcode + byte + count + tail
      
      if (compressedSize < rawSize) {
        return {
          type: 'INTERVAL',
          start: start,
          end: start + rawSize,
          size: compressedSize,
          consumed: rawSize,
          stride: stride,
          repeatByte: repeatByte,
          repeatCount: groups - 1
        };
      }
    }
    
    return null;
  }
  
  // 5. 组装压缩块为最终字节流
  assembleBlocks(bytes, blocks) {
    const chunks = [];
    
    for (const block of blocks) {
      switch (block.type) {
        case 'SINGLE_BYTE':
          chunks.push(Buffer.from([0x01, block.run, block.byte]));
          break;
          
        case 'MULTI_BYTE':
          chunks.push(
            Buffer.from([block.seqLen, block.run]),
            Buffer.from(block.sequence)
          );
          break;
          
        case 'INTERVAL':
          const opcode = 0xE0 + block.stride;
          // 构建尾数据
          const tail = Buffer.alloc(block.stride - 1);
          for (let g = 0; g < block.repeatCount + 1; g++) {
            const base = block.start + g * block.stride + 1;
            bytes.copy(tail, 0, base, base + (block.stride - 1));
          }
          chunks.push(
            Buffer.from([opcode, block.repeatByte, block.repeatCount]),
            tail
          );
          break;
          
        case 'RAW':
          const data = bytes.slice(block.start, block.end);
          const len = data.length;
          const header = Buffer.alloc(3);
          header[0] = 0x00;
          header.writeUInt16LE(len, 1);
          chunks.push(header, data);
          break;
      }
    }
    
    return Buffer.concat(chunks);
  }
  
  // 6. 简化版压缩（如果DP太慢，使用这个）
  compressGreedy(bytes) {
    const chunks = [];
    let pos = 0;
    
    while (pos < bytes.length) {
      // 查找从这个位置开始的所有可能的压缩块
      const candidates = [];
      
      // 1. 单字节重复
      const single = this.findSingleByteRepeat(bytes, pos);
      if (single) candidates.push(single);
      
      // 2. 多字节重复（检查所有可能长度）
      const maxSeqLen = Math.min(this.MAX_SEQ_LEN, bytes.length - pos);
      for (let seqLen = maxSeqLen; seqLen >= 2; seqLen--) {
        const multi = this.findMultiByteRepeat(bytes, pos, seqLen);
        if (multi) {
          candidates.push(multi);
          // 如果找到一个长的，可能不需要检查所有短的
          if (multi.consumed > seqLen * 10) break;
        }
      }
      
      // 3. 间隔重复（检查所有步长）
      const maxStride = Math.min(this.MAX_STRIDE, bytes.length - pos);
      for (let stride = maxStride; stride >= 1; stride--) {
        const interval = this.findIntervalRepeat(bytes, pos, stride);
        if (interval) {
          candidates.push(interval);
          // 如果找到一个长的，可能不需要检查所有短的
          if (interval.consumed > stride * 10) break;
        }
      }
      
      // 4. 原始块（从1字节到最大）
      const maxRaw = Math.min(0xFFFF, bytes.length - pos);
      for (let rawLen = maxRaw; rawLen >= 1; rawLen--) {
        // 仅添加最大原始块
        if (rawLen === maxRaw) {
          candidates.push({
            type: 'RAW',
            start: pos,
            end: pos + rawLen,
            size: 3 + rawLen,
            consumed: rawLen
          });
          break;
        }
      }
      
      // 选择最节省的块（最小size，如果size相同则选择consumed最大的）
      let best = null;
      for (const cand of candidates) {
        if (!best || 
            cand.size < best.size ||
            (cand.size === best.size && cand.consumed > best.consumed)) {
          best = cand;
        }
      }
      
      // 应用最佳块
      if (best.type === 'SINGLE_BYTE') {
        chunks.push(Buffer.from([0x01, best.run, best.byte]));
      } else if (best.type === 'MULTI_BYTE') {
        chunks.push(
          Buffer.from([best.seqLen, best.run]),
          Buffer.from(best.sequence)
        );
      } else if (best.type === 'INTERVAL') {
        const opcode = 0xE0 + best.stride;
        const tail = Buffer.alloc(best.stride - 1);
        for (let g = 0; g < best.repeatCount + 1; g++) {
          const base = best.start + g * best.stride + 1;
          bytes.copy(tail, 0, base, base + (best.stride - 1));
        }
        chunks.push(
          Buffer.from([opcode, best.repeatByte, best.repeatCount]),
          tail
        );
      } else if (best.type === 'RAW') {
        const data = bytes.slice(best.start, best.end);
        const header = Buffer.alloc(3);
        header[0] = 0x00;
        header.writeUInt16LE(data.length, 1);
        chunks.push(header, data);
      }
      
      pos += best.consumed;
    }
    
    return Buffer.concat(chunks);
  }
  
  // 7. 压缩单个文件
  compressFile(filePath) {
    const data = fs.readFileSync(filePath);
    console.log(`\n压缩文件: ${filePath} (${data.length} 字节)`);
    
    const startTime = Date.now();
    
    // 尝试两种压缩方法，选择更好的
    console.log('尝试贪心算法压缩...');
    const greedyResult = this.compressGreedy(data);
    
    console.log(`贪心压缩结果: ${greedyResult.length} 字节`);
    
    // 如果文件不是特别大，尝试DP算法
    let finalResult = greedyResult;
    
    if (data.length <= 10000) { // 只对小文件使用DP
      console.log('尝试动态规划算法压缩...');
      try {
        const dpResult = this.compressWithDP(data);
        console.log(`动态规划结果: ${dpResult.length} 字节`);
        
        if (dpResult.length < finalResult.length) {
          console.log(`选择动态规划结果，节省 ${finalResult.length - dpResult.length} 字节`);
          finalResult = dpResult;
        } else {
          console.log(`选择贪心算法结果`);
        }
      } catch (error) {
        console.log(`动态规划失败，使用贪心算法: ${error.message}`);
      }
    }
    
    const endTime = Date.now();
    console.log(`压缩完成，耗时: ${endTime - startTime}ms`);
    console.log(`压缩比: ${(finalResult.length / data.length * 100).toFixed(2)}%`);
    
    return finalResult;
  }
  
  // 8. 打包目录
  packDirectory(inputDir, outputFile) {
    console.log(`\n开始打包目录: ${inputDir}`);
    
    // 收集所有文件
    const files = this.collectAllFiles(inputDir);
    console.log(`找到 ${files.length} 个文件`);
    
    const fileEntries = [];
    const bodyChunks = [];
    let offset = 0;
    
    // 压缩每个文件
    for (const file of files) {
      const compressed = this.compressFile(file.abs);
      
      fileEntries.push({
        name: file.rel,
        offset: offset,
        size: compressed.length,
        originalSize: fs.statSync(file.abs).size
      });
      
      bodyChunks.push(compressed);
      offset += compressed.length;
      
      console.log(`文件: ${file.rel}`);
      console.log(`  原始: ${fileEntries[fileEntries.length-1].originalSize} 字节`);
      console.log(`  压缩: ${compressed.length} 字节`);
      console.log(`  压缩比: ${(compressed.length / fileEntries[fileEntries.length-1].originalSize * 100).toFixed(2)}%`);
    }
    
    // 构建头部
    const header = {
      version: 'DP-OPTIMAL',
      fileCount: files.length,
      files: fileEntries
    };
    
    const headerJson = JSON.stringify(header);
    const headerBuffer = Buffer.from(headerJson, 'utf-8');
    
    // 写入文件
    const magic = Buffer.from('DPR1'); // DP压缩标识
    const headerLen = Buffer.alloc(4);
    headerLen.writeUInt32LE(headerBuffer.length, 0);
    
    const body = Buffer.concat(bodyChunks);
    const result = Buffer.concat([magic, headerLen, headerBuffer, body]);
    
    fs.writeFileSync(outputFile, result);
    
    console.log(`\n打包完成: ${outputFile}`);
    console.log(`总大小: ${result.length} 字节`);
    
    return result;
  }
  
  // 9. 收集所有文件
  collectAllFiles(dir, base = dir) {
    const files = [];
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...this.collectAllFiles(fullPath, base));
      } else if (entry.isFile()) {
        const relativePath = path.relative(base, fullPath).replace(/\\/g, '/');
        files.push({
          abs: fullPath,
          rel: relativePath
        });
      }
    }
    
    return files;
  }
}

// 10. 命令行接口
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('超强压缩工具 - 不记代价追求最小压缩大小');
    console.log('');
    console.log('使用方法:');
    console.log('  node compressor.js <输入目录> [输出文件]');
    console.log('');
    console.log('示例:');
    console.log('  node compressor.js ./assets ./compressed.res');
    console.log('  node compressor.js ./data'); // 默认输出到 ./data.res
    console.log('');
    console.log('注意: 此工具会尝试所有可能的压缩方式，可能非常耗时！');
    return;
  }
  
  const inputDir = args[0];
  const outputFile = args[1] || inputDir + '.res';
  
  if (!fs.existsSync(inputDir)) {
    console.error(`错误: 输入目录不存在: ${inputDir}`);
    process.exit(1);
  }
  
  const compressor = new OptimalCompressor();
  compressor.packDirectory(inputDir, outputFile);
}

if (require.main === module) {
  main();
}

module.exports = OptimalCompressor;