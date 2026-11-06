/**
 * testBrdec.mjs — 纯 JS brotli 解码器(vendor) round-trip 验证
 * 用法: node tool/testBrdec.mjs
 */
import { decompress } from '../src/libs/brdec/decode.js';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

let fail = 0;

// 1) 合成数据 round-trip: 结构化(高压缩比) + 随机(不可压)
for (const [name, raw] of [
    ['structured', Buffer.alloc(512 * 1024)],
    ['random', crypto.randomBytes(64 * 1024)],
]) {
    if (name === 'structured') {
        for (let i = 0; i < raw.length; i++) raw[i] = (Math.sin(i * 0.01) * 127 + 128) & 255;
    }
    for (const q of [1, 5, 11]) {
        const cmp = zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: q } });
        const out = decompress(new Uint8Array(cmp));
        const same = out.length === raw.length && Buffer.from(out).equals(raw);
        console.log(`[${name} q${q}] cmp=${cmp.length} raw=${raw.length} out=${out.length} ${same ? 'OK' : 'MISMATCH'}`);
        if (!same) fail++;
    }
}

// 2) 真实 .br 资源包(项目根 nor.br) → BRP1 容器
const brPath = new URL('../nor.br', import.meta.url).pathname.replace(/^\//, '').replace(/\//g, path.sep);
if (fs.existsSync(brPath)) {
    const br = fs.readFileSync(brPath);
    const t0 = Date.now();
    const out = decompress(new Uint8Array(br));
    const ms = Date.now() - t0;
    const magic = String.fromCharCode(out[0], out[1], out[2], out[3]);
    console.log(`[nor.br] br=${br.length} out=${out.length} (${ms}ms) magic=${magic} ${magic === 'BRP1' ? 'OK' : 'BAD MAGIC'}`);
    if (magic !== 'BRP1') fail++;
} else {
    console.log('[nor.br] 跳过: 文件不存在');
}

if (fail) { console.error(`FAILED: ${fail}`); process.exit(1); }
console.log('testBrdec: 全部通过');