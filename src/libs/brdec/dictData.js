import { decompress } from './decode.js';
import dictionaryData from './dictBin.js';

/**
 * 浏览器/微信变体的字典初始化: dictBin.js 是 base64 编码的 brotli 压缩字典,
 * 首次加载时用解码器自身解压还原(替代 756KB 的 dictionary-data.js 明文字典)。
 * 手写 base64 解码(微信小游戏无 atob, 不引入 base64-js 依赖)。
 */
const B64 = new Uint8Array(128);
(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    for (let i = 0; i < chars.length; i++) B64[chars.charCodeAt(i)] = i;
})();

function b64ToU8(s) {
    let len = s.length, pad = 0;
    if (len > 0 && s[len - 1] === '=') {
        pad++;
        if (len > 1 && s[len - 2] === '=') pad++;
    }
    const outLen = Math.floor(len / 4) * 3 - pad;
    const out = new Uint8Array(outLen);
    let j = 0, acc = 0, cnt = 0;
    const body = len - pad;
    for (let i = 0; i < body; i++) {
        acc = (acc << 6) | B64[s.charCodeAt(i)];
        cnt++;
        if (cnt === 4) {
            out[j++] = (acc >> 16) & 255;
            out[j++] = (acc >> 8) & 255;
            out[j++] = acc & 255;
            acc = 0; cnt = 0;
        }
    }
    if (cnt === 2) out[j++] = (acc >> 4) & 255;
    else if (cnt === 3) { out[j++] = (acc >> 10) & 255; out[j++] = (acc >> 2) & 255; }
    return out;
}

export function initData() {
    var compressed = b64ToU8(dictionaryData);
    return decompress(compressed);
}