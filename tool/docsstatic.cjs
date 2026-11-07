// 把 docs 项目首页渲染成静态 HTML 片段写进 README.md（GitHub 会过滤 style/script，只用白名单标签）。
// 用法: node tool/docsstatic.cjs [--base https://qmeyq.github.io/NG/] [--check]
// 片段里每个链接都指向 Pages 上的交互文档；链接文字保留原始相对路径（nodes/xxx.js）。
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const README = path.join(ROOT, 'README.md');
const BEGIN = '<!-- DOCS-HOME:BEGIN 由 node tool/docsstatic.cjs 生成，勿手改 -->';
const END = '<!-- DOCS-HOME:END -->';

const argv = process.argv.slice(2);
const baseArg = argv.indexOf('--base');
const BASE = (baseArg >= 0 ? argv[baseArg + 1] : 'https://qmeyq.github.io/NG/').replace(/\/?$/, '/');
const CHECK = argv.includes('--check');

const PAGE = BASE + 'node-workflow.html';
const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = s => esc(s).replace(/\r?\n/g, '<br>');
const link = (href, text, title) => `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}>${text}</a>`;
const deep = segs => PAGE + '#' + segs.map(encodeURIComponent).join('/');
const dataUrl = rel => BASE + String(rel).replace(/^\.\//, '');

// 数据 JS 在隔离作用域里执行，取回注册的文档对象（与页面 evalDataScript 同一口径）
function evalData(file) {
    const w = { __DOC_FILES: {} };
    new Function('window', 'self', fs.readFileSync(file, 'utf8')).call(w, w, w);
    return w.__LAST_DOC || Object.values(w.__DOC_FILES)[0] || null;
}

const files = {};
function collect(dir, prefix) {
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const rel = prefix ? prefix + '/' + name : name;
        if (fs.statSync(full).isDirectory()) { collect(full, rel); continue; }
        if (!/\.(js|json)$/i.test(name)) continue;
        const obj = /\.js$/i.test(name) ? evalData(full) : JSON.parse(fs.readFileSync(full, 'utf8'));
        if (obj && typeof obj === 'object') files[rel] = obj;
    }
}
collect(DOCS, '');

const mainKey = Object.keys(files).find(k => /^index\.js$/i.test(k))
    || Object.keys(files).find(k => /^index\.json$/i.test(k));
if (!mainKey) throw new Error('docs 下没有 index.js / index.json');
const doc = JSON.parse(JSON.stringify(files[mainKey]));

// 装配 node_tree_file 引用，并记下每棵树真正来自哪个文件（静态片段的「原始链接」列）
let missing = 0;
(function hydrate(tree, file, depth) {
    if (!tree || typeof tree !== 'object' || depth > 64) return;
    tree._file = file;
    for (const k of Object.keys(tree.nodes || {})) {
        const n = tree.nodes[k];
        if (!n || typeof n !== 'object') continue;
        if (n.node_tree) { hydrate(n.node_tree, n.node_tree_file || file, depth + 1); continue; }
        if (!n.node_tree_file) continue;
        const ref = String(n.node_tree_file).replace(/^\.\//, '');
        const hit = files[ref] ? ref : Object.keys(files).find(x => x.endsWith('/' + ref) || ref.endsWith('/' + x));
        const sub = hit ? (files[hit].node_tree || (files[hit].nodes ? files[hit] : null)) : null;
        if (!sub) { missing++; continue; }
        n.node_tree = JSON.parse(JSON.stringify(sub));
        hydrate(n.node_tree, hit, depth + 1);
    }
})(doc, mainKey, 0);

const isMirror = k => k === '__group_in__' || k === '__group_out__';
const entries = tree => Object.keys(tree.nodes || {}).filter(k => !isMirror(k) && tree.nodes[k])
    .map(k => ({ key: k, n: tree.nodes[k] }));
function deepCount(tree) {
    let nodes = 0, groups = 0;
    (function walk(t) {
        for (const { key, n } of entries(t)) {
            nodes++;
            if (n.node_tree) { groups++; walk(n.node_tree); }
        }
    })(tree);
    return { nodes, groups };
}

const roots = entries(doc);
const label = e => e.n.label || e.n.name || e.key;
const byKey = Object.fromEntries(roots.map(e => [e.key, e]));

// 主干：从 pstart（或第一个分组）沿第一条未走过的出边走到底
const out = {};
for (const l of doc.links || []) (out[l.from_node] = out[l.from_node] || []).push(l);
const chain = [];
const seen = new Set();
let cur = byKey.pstart ? 'pstart' : (roots[0] && roots[0].key);
while (cur && !seen.has(cur)) {
    seen.add(cur); chain.push(cur);
    const next = (out[cur] || []).find(l => byKey[l.to_node] && !seen.has(l.to_node));
    cur = next ? next.to_node : null;
}

const L = [];
L.push(BEGIN);
L.push('<div align="center">');
L.push(`  <b>${esc(doc.name || '项目规划')} · 首页静态快照</b><br>`);
const total = deepCount(doc);
L.push(`  <sub>${roots.length} 个分组 · ${total.nodes} 个节点 · ${Object.keys(files).length} 个数据文件 · 生成于 ${new Date().toISOString().slice(0, 10)}</sub><br>`);
L.push(`  <sub>交互版 ${link(PAGE, 'node-workflow.html', '原链接：docs/node-workflow.html')} · 数据源 ${link(dataUrl(mainKey), esc(mainKey), '原链接：docs/' + mainKey)} · 双击分组可继续下钻</sub>`);
L.push('</div>');
L.push('');
L.push(`<p><b>主干</b>：${chain.map(k => link(deep([k]), esc(label(byKey[k])))).join(' → ')}</p>`);
L.push('');
L.push('<table>');
L.push('  <thead><tr><th align="left">分组</th><th align="left">内容</th><th>节点</th><th align="left">原始链接</th></tr></thead>');
L.push('  <tbody>');
for (const e of roots) {
    const c = deepCount(e.n.node_tree || { nodes: {} });
    const file = e.n.node_tree_file || (e.n.node_tree && e.n.node_tree._file) || mainKey;
    L.push('    <tr>');
    L.push(`      <td>${link(deep([e.key]), '<b>' + esc(label(e)) + '</b>', '进入分组 ' + e.key)}<br><sub><code>${esc(e.key)}</code></sub></td>`);
    L.push(`      <td>${inline(e.n.desc || '')}</td>`);
    L.push(`      <td align="center">${link(deep([e.key]), String(c.nodes))}<br><sub>${c.groups} 组</sub></td>`);
    L.push(`      <td>${link(dataUrl(file), '<code>' + esc(file) + '</code>', '原链接：docs/' + file)}</td>`);
    L.push('    </tr>');
}
L.push('  </tbody>');
L.push('</table>');
L.push('');

// 每个分组的一级子节点：折叠起来，链接直接落到该节点（普通节点会选中并居中）
for (const e of roots) {
    const tree = e.n.node_tree;
    if (!tree) continue;
    const kids = entries(tree);
    if (!kids.length) continue;
    L.push('<details>');
    L.push(`<summary><b>${esc(label(e))}</b> · ${kids.length} 个节点 · ${link(deep([e.key]), '在交互版中打开', '进入分组 ' + e.key)}</summary>`);
    L.push('');
    L.push('<table>');
    L.push('  <thead><tr><th align="left">节点</th><th>类型</th><th align="left">说明</th><th align="left">原始链接</th></tr></thead>');
    L.push('  <tbody>');
    for (const k of kids) {
        const file = k.n.node_tree_file || tree._file || mainKey;
        const segs = [e.key, k.key];
        L.push('    <tr>');
        L.push(`      <td>${link(deep(segs), esc(label(k)))}<br><sub><code>${esc(k.key)}</code>${k.n.node_tree ? ' · 分组' : ''}</sub></td>`);
        L.push(`      <td align="center"><sub>${esc(k.n.type || '')}</sub></td>`);
        L.push(`      <td>${inline(k.n.desc || '')}</td>`);
        L.push(`      <td>${link(dataUrl(file), '<code>' + esc(file) + '</code>', '原链接：docs/' + file)}</td>`);
        L.push('    </tr>');
    }
    L.push('  </tbody>');
    L.push('</table>');
    L.push('');
    L.push('</details>');
    L.push('');
}

// 首页上的分组间连线（端口名保留），全部指向 Pages
const edges = (doc.links || []).filter(l => byKey[l.from_node] && byKey[l.to_node]);
if (edges.length) {
    L.push('<details>');
    L.push(`<summary><b>分组间连线</b> · ${edges.length} 条</summary>`);
    L.push('');
    L.push('<table>');
    L.push('  <thead><tr><th align="left">从</th><th align="left">端口</th><th align="left">到</th><th align="left">端口</th></tr></thead>');
    L.push('  <tbody>');
    for (const l of edges) {
        L.push(`    <tr><td>${link(deep([l.from_node]), esc(label(byKey[l.from_node])))}</td><td><sub>${esc(l.from_socket || '')}</sub></td>`
            + `<td>${link(deep([l.to_node]), esc(label(byKey[l.to_node])))}</td><td><sub>${esc(l.to_socket || '')}</sub></td></tr>`);
    }
    L.push('  </tbody>');
    L.push('</table>');
    L.push('');
    L.push('</details>');
    L.push('');
}
if (missing) L.push(`<p><sub>注意：有 ${missing} 个子组数据文件缺失。</sub></p>`);
L.push(END);

const block = L.join('\n');
const md = fs.readFileSync(README, 'utf8');
const bi = md.indexOf(BEGIN), ei = md.indexOf(END);
let next;
if (bi >= 0 && ei > bi) next = md.slice(0, bi) + block + md.slice(ei + END.length);
else next = md.replace(/\n## 文档结构/, '\n' + block + '\n\n## 文档结构');
// 生成日期每天会变，比对时抹掉，--check 才能长期用在 CI/pre-commit 上
const stable = s => s.replace(/生成于 \d{4}-\d{2}-\d{2}/g, '生成于 DATE');
if (stable(next) === stable(md)) {
    if (bi < 0) throw new Error('README 里找不到插入点（缺少 ## 文档结构 或 BEGIN 标记）');
    console.log('README 已是最新，无改动');
} else if (CHECK) {
    console.error('README 静态片段与 docs 数据不一致，请运行 node tool/docsstatic.cjs');
    process.exit(1);
} else {
    fs.writeFileSync(README, next);
    console.log(`已写入 README：${roots.length} 组 / ${total.nodes} 节点 / ${block.length} 字节`);
}
if (CHECK) console.log('README 静态片段与 docs 数据一致');