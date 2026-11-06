/**
 * tmpPack.js — 纯镜像 web/ → 双包源临时组装 + assetsBr 打包
 * 包语义（路径算法 v2 第一段=包名的镜像内实现）:
 *   web/nor/*        → nor 包内(剥 nor/ 前缀)
 *   web/d3 game load.ls 等顶层散装 → nor 包内原样(d3/court@0.lh 即包内 d3/ 目录)
 *   web/ui/*         → ui 包内(剥 ui/ 前缀)
 *   web/internal/*   → ui 包内 internal/
 * 组装目录 .tmp_nor/.tmp_ui 打完即删(不污染镜像源)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(ROOT, 'web');
const TOP_EXCLUDE = ['nor', 'ui', 'internal']; // 顶层已分流目录

function copyTree(src, dst) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    if (fs.statSync(src).isDirectory()) {
        for (const f of fs.readdirSync(src)) copyTree(path.join(src, f), path.join(dst, f));
    } else {
        fs.copyFileSync(src, dst);
    }
}
function cleanTmp(d) { fs.rmSync(d, { recursive: true, force: true }); }

// ---- nor 包 ----
const T_NOR = path.join(ROOT, '.tmp_nor');
cleanTmp(T_NOR);
copyTree(path.join(WEB, 'nor'), T_NOR); // 剥 nor/ 前缀 = 包内
for (const f of fs.readdirSync(WEB)) {
    if (TOP_EXCLUDE.includes(f)) continue;
    copyTree(path.join(WEB, f), path.join(T_NOR, f)); // 顶层散装原样进包(d3/game/load.ls)
}
execSync(`node tool/assetsBr.js .tmp_nor nor.br 11`, { cwd: ROOT, stdio: 'inherit' });
cleanTmp(T_NOR);

// ---- ui 包 ----
const T_UI = path.join(ROOT, '.tmp_ui');
cleanTmp(T_UI);
copyTree(path.join(WEB, 'ui'), T_UI); // 剥 ui/ 前缀
copyTree(path.join(WEB, 'internal'), path.join(T_UI, 'internal'));
execSync(`node tool/assetsBr.js .tmp_ui ui.br 11`, { cwd: ROOT, stdio: 'inherit' });
cleanTmp(T_UI);

console.log('[tmpPack] 双包组装打包完成');