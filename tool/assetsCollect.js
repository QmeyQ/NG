/**
 * assetsCollect.js — 收集脚本（纯镜像版, 2026-10-23 用户终版规格）
 *
 * 用法: node tool/assetsCollect.js [源目录] [--dry] [--dst 输出目录]
 *   源目录: 裸位置参数, 缺省 = <项目根>/release/web
 *   输出目录: --dst 指定(用该目录名新建); 缺省 = 当前执行目录/web
 *
 * 【用户规格】
 *   1. 原样镜像: 源是什么结构, 输出就是什么结构——完整复制全部文件(排除清单外), 顶层目录原样生成
 *   2. 存在的直接覆盖
 *   3. 文本文件(.ls/.lh/.json/.atlas/.txt)唯一改写: "../internal/" 与 "internal/" → "ui/internal/"
 *      (internal 归 ui 包, 之前拍板的统一形态)
 *   4. 无分流/无剥前缀/无重命名/无去重——除第 3 条外零改动
 *   5. 源目录严格只读; 源与输出目录重叠直接报错退出
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

let ARG_SRC = path.join(ROOT, 'release/web');
let ARG_DST = path.join(process.cwd(), 'web');
let ARG_DRY = false;
for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--dry') ARG_DRY = true;
    else if (a === '--src') ARG_SRC = path.resolve(process.argv[++i]);
    else if (a === '--dst') ARG_DST = path.resolve(process.argv[++i]);
    else if (!a.startsWith('--') && ARG_SRC === path.join(ROOT, 'release/web')) {
        // 裸位置参数 = 源目录
        ARG_SRC = path.resolve(a);
    }
}

/** 排除清单(顶层目录 + 任意层级文件名): 引擎库/脚本/入口非资源 */
const EXCLUDE = [
    'fileconfig.json',
    'game.js',
    'index.html',
    'js',
    'libs',
    'sub',
    'Configs',
];
const isExcluded = (rel) => {
    const top = rel.split('/')[0];
    const base = rel.substring(rel.lastIndexOf('/') + 1);
    return EXCLUDE.includes(top) || EXCLUDE.includes(base);
};

/** 源目标重叠守卫: 输出 = 源或其祖先/后代都致命(防收集写回源) */
const overlap = (a, b) => a === b || a.startsWith(b + path.sep) || b.startsWith(a + path.sep);
if (overlap(path.resolve(ARG_SRC), path.resolve(ARG_DST))) {
    console.error(`[abort] 输出目录(${ARG_DST}) 与源目录(${ARG_SRC}) 重叠——收集脚本严禁写源`);
    process.exit(1);
}

if (!fs.existsSync(ARG_SRC)) {
    console.error('[abort] 源目录不存在: ' + ARG_SRC);
    process.exit(1);
}

/** internal 引用统一改写(唯一规则): 多级 ../ 上溯与引号根相对 → ui/ 前缀(幂等) */
function rewriteInternal(text) {
    let n = 0;
    let out = text;
    out = out.replace(/(\.\.\/)+internal\//g, () => { n++; return 'ui/internal/'; });
    out = out.replace(/"internal\//g, () => { n++; return '"ui/internal/'; });
    return { out, n };
}

const TEXT_EXT = /\.(ls|lh|json|atlas|txt)$/i;

let copied = 0, rewrote = 0, total = 0;
(function walk(dir, rel) {
    for (const f of fs.readdirSync(dir)) {
        const r = rel ? `${rel}/${f}` : f;
        if (isExcluded(r)) continue;
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) { walk(full, r); continue; }
        total++;

        const dst = path.join(ARG_DST, r); // 原样镜像: 产物相对路径 = 源相对路径

        if (ARG_DRY) {
            console.log(`  ${r} → ${path.relative(process.cwd(), dst)}`);
            continue;
        }

        fs.mkdirSync(path.dirname(dst), { recursive: true });
        if (TEXT_EXT.test(f)) {
            const raw = fs.readFileSync(full, 'utf8');
            const { out, n } = rewriteInternal(raw);
            fs.writeFileSync(dst, out); // 覆盖
            if (n > 0) { rewrote++; console.log(`  ~ internal 改写 ${n} 处: ${r}`); }
        } else {
            fs.copyFileSync(full, dst); // 覆盖
        }
        copied++;
    }
})(ARG_SRC, '');

console.log(`[assetsCollect] src=${ARG_SRC} dst=${ARG_DST}${ARG_DRY ? ' (dry)' : ''}`);
console.log(`[assetsCollect] 完成: 共 ${total} 文件, 复制 ${copied}, internal 改写 ${rewrote} 文件(源零写入)`);