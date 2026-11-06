/**
 * fixWxgame.js — 微信包 wasm 残留清理(发布后处理, 兜底脚本)
 *
 * 用法: node tool/fixWxgame.js  (可选, 幂等)
 *
 * 正解(2026-10-21 已配置): settings/BuildSettings.json 顶层 excludeFilesRule
 * 已加 ["js/brotli_wasm.js","js/brotli_wasm_bg.wasm"] —— LayaAir 发布器
 * copyExternalFiles 拷贝 bin 时按此清单忽略(逆向 game.js 实锤: config.excludeFilesRule
 * → ignoreFilesInBin → copyFiles ignore), 新发布不再拷贝这两个文件。
 * 本脚本仅兜底清理 excludeFilesRule 配置前的历史发布残留(含旧 cjs)。
 *
 * code.ts 浏览器分支已有纯 JS brdec 降级(wasm 加载失败自动 fallback),
 * 故 excludeFilesRule 全局生效(web 发布也不拷 wasm)无副作用。
 */
const fs = require('fs');
const path = require('path');

const binJs = path.join(__dirname, '..', 'bin', 'js');
const relJs = path.join(__dirname, '..', 'release', 'wxgame', 'js');

const WX_STALE = ['brotli_wasm.js', 'brotli_wasm_bg.wasm', 'brotli_wasm.cjs.js'];
const BIN_STALE = ['brotli_wasm.cjs.js'];

function remove(dir, files, label) {
    let n = 0;
    for (const f of files) {
        const p = path.join(dir, f);
        if (fs.existsSync(p)) {
            fs.unlinkSync(p);
            n++;
            console.log('[fixWxgame] [' + label + '] 删除 ' + f);
        }
    }
    return n;
}

const nBin = remove(binJs, BIN_STALE, 'bin');
const nRel = fs.existsSync(relJs) ? remove(relJs, WX_STALE, 'release') : 0;
console.log('[fixWxgame] 完成: bin 清理 ' + nBin + ' 个, release 清理 ' + nRel + ' 个');