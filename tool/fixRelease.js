/**
 * fixRelease.js — 发布产物 UUID 还原工具
 *
 * 背景：LayaAir 发布构建把管线内场景/bundle 的组件注册 ID 从 36 位 UUID 短化为
 * 22 位 base64url（如 3cf4b5f7-...-21903ef67e9d ↔ PPS19zVSQ8ufGCGQPvZ-nQ）。
 * .br 资源包内场景仍是全 UUID → 短 ID bundle 加载必报 missing component type。
 *
 * 原理：短 ID = UUID 去-后 16 字节的 base64url 编码，确定性双向可逆。
 * 本脚本把产物中所有"解码后命中项目已知 UUID 集合"的短 ID 还原为全 UUID，
 * 使发布目录与 .br 包 / bin bundle 全 UUID 世界自洽。
 *
 * 用法：
 *   node tool/fixRelease.js              处理默认 release/web
 *   node tool/fixRelease.js <目录>       处理指定目录(递归遍历子目录)
 *   传入目录时对目录下所有 js/ls/lh/json 文件做短 ID → 全 UUID 替换
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REL = path.join(ROOT, 'release', 'web');

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
const SHORT_RE = /"([A-Za-z0-9_-]{22})"/g;

/** 已知合法 UUID 全集（组件注册 ID + prefab/资源引用） */
function buildKnownSet() {
    const known = new Set();
    const add = (s) => { for (const m of s.match(UUID_RE) || []) known.add(m.toLowerCase()); };
    const walk = (dir, exts) => {
        if (!fs.existsSync(dir)) return;
        for (const name of fs.readdirSync(dir)) {
            const p = path.join(dir, name);
            const st = fs.statSync(p);
            if (st.isDirectory()) walk(p, exts);
            else if (exts.some((e) => name.endsWith(e))) {
                try { add(fs.readFileSync(p, 'utf8')); } catch { }
            }
        }
    };
    walk(path.join(ROOT, 'assets'), ['.ls', '.lh', '.json', '.meta']);
    walk(path.join(ROOT, 'bin', 'js', 'bundles'), ['.js']);
    return known;
}

function shortToUuid(short, known) {
    try {
        const buf = Buffer.from(short, 'base64url');
        if (buf.length !== 16) return null;
        const hex = buf.toString('hex');
        const u = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        return known.has(u) ? u : null;
    } catch { return null; }
}

/** 对目标目录(含子目录)所有 .js/.ls/.lh/.json 文件做短 ID → 全 UUID 替换(原地改写) */
function fixDir(target, known) {
    let fixedFiles = 0, fixedCount = 0;
    const targets = [];
    (function walk(dir) {
        for (const name of fs.readdirSync(dir)) {
            const p = path.join(dir, name);
            const st = fs.statSync(p);
            if (st.isDirectory()) walk(p);
            else if (/\.(js|ls|lh|json)$/.test(name)) targets.push(p);
        }
    })(target);

    for (const p of targets) {
        let src;
        try { src = fs.readFileSync(p, 'utf8'); } catch { continue; }
        let count = 0;
        const out = src.replace(SHORT_RE, (full, id) => {
            const u = shortToUuid(id, known);
            if (!u) return full;
            count++;
            return `"${u}"`;
        });
        if (count > 0) {
            fs.writeFileSync(p, out);
            fixedFiles++; fixedCount += count;
            console.log(`  ${path.relative(ROOT, p)}: ${count} 处`);
        }
    }
    console.log(`完成: ${fixedFiles} 个文件, ${fixedCount} 处短 ID 已还原为全 UUID`);
}

function main() {
    const arg = process.argv[2];
    const target = arg ? path.resolve(arg) : REL;
    if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
        console.error('目标目录不存在或不是目录: ' + target);
        process.exit(1);
    }
    const known = buildKnownSet();
    console.log(`目标目录: ${target}`);
    console.log(`已知 UUID 集合: ${known.size} 个`);
    fixDir(target, known);
}

main();