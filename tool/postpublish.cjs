#!/usr/bin/env node
/**
 * postpublish.cjs — 发布后处理：把已打进 .br 包的资源从"站内相对挂靠"改为"包内挂靠"
 *
 * 背景：IDE/构建产物 release/web/js/index.js 的 config.UI 默认项
 *   horizontalScrollBar/verticalScrollBar/popupMenu/tooltipsWidget
 * 默认写成 internal/UI/*.lh，运行时会向站点服务器发起请求；
 * 而这些文件已经包含在 ui.br 包里（见 ui.manifest.json）。
 *
 * 做法：把这些默认项改成包内路径 ui/internal/UI/*.lh（第一段=包名），
 * 由 Res/resLoader 桥从 ui 包读取；同时输出"站内仍被引用的资源清单"。
 *
 * 用法：
 *   node tool/postpublish.cjs                 # 预演，只打印
 *   node tool/postpublish.cjs --apply         # 实际改写 release/web/js/index.js
 *   node tool/postpublish.cjs --apply --root release/web
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const rootIdx = args.indexOf('--root');
const ROOT = path.resolve(__dirname, '..');
const WEB = path.resolve(ROOT, rootIdx >= 0 ? args[rootIdx + 1] : 'release/web');

const UI_MAP = {
  horizontalScrollBar: 'ui/internal/UI/ScrollBarH.lh',
  verticalScrollBar: 'ui/internal/UI/ScrollBarV.lh',
  popupMenu: 'ui/internal/UI/PopupMenu.lh',
  tooltipsWidget: 'ui/internal/UI/Tooltips.lh',
};

function loadJson(p, d) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return d; } }

const uiManifest = loadJson(path.join(ROOT, 'ui.manifest.json'), {});
const norManifest = loadJson(path.join(ROOT, 'nor.manifest.json'), {});
const packed = new Set([
  ...(uiManifest.files || []).map(f => 'ui/' + (f.path || f.name || '')),
  ...(norManifest.files || []).map(f => 'nor/' + (f.path || f.name || '')),
]);

const indexPath = path.join(WEB, 'js', 'index.js');
if (!fs.existsSync(indexPath)) { console.error('缺少 ' + indexPath); process.exit(1); }
let src = fs.readFileSync(indexPath, 'utf8');

const report = [];
for (const [key, target] of Object.entries(UI_MAP)) {
  const re = new RegExp('"' + key + '"\\s*:\\s*"([^"]*)"');
  const m = src.match(re);
  if (!m) { report.push({ key, from: null, to: target, note: '未找到键' }); continue; }
  const from = m[1];
  const inPack = packed.has(target);
  report.push({ key, from, to: target, inPack });
  if (APPLY && from !== target) src = src.replace(re, '"' + key + '":"' + target + '"');
}

console.log(JSON.stringify({ web: WEB, apply: APPLY, report }, null, 1));

if (APPLY) {
  fs.writeFileSync(indexPath, src, 'utf8');
  console.log('written ' + indexPath);
}
