// 无 IDE 环境下复现 LayaAir 的 web 主 bundle: esbuild + .meta UUID 注入(IDE 构建期做的事)。
// 用法: node tool/build.cjs [--min] [--out <path>]
// 校验口径: 模块顺序应与 bin/js/bundles/bundle.js(IDE 产物) 一致; 入口导出 ctrl/index/load/slecet/te1。
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const ENTRIES = ['badm', 'card', 'ctrl', 'index', 'load', 'slecet', 'te1'];
const EXPORTS = ['ctrl', 'index', 'load', 'slecet', 'te1'];

const regClassPlugin = {
    name: 'laya-regclass',
    setup(b) {
        b.onLoad({ filter: /\.ts$/ }, (args) => {
            let src = fs.readFileSync(args.path, 'utf8');
            if (src.includes('@regClass()')) {
                const metaPath = args.path + '.meta';
                const uuid = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')).uuid : '';
                // 发布管线注册短 ID(UUID 16 字节的 base64url): dist 场景与 .br 包都按短 ID 找组件
                const short = Buffer.from(uuid.replace(/-/g, ''), 'hex').toString('base64url');
                src = src.split('@regClass()').join(`@regClass("${short}")`);
            }
            return { contents: src, loader: 'ts' };
        });
    }
};

const indexSrc = ENTRIES.map(n => EXPORTS.includes(n)
    ? `import { ${n} } from "./src/${n}.ts";`
    : `import "./src/${n}.ts";`).join('\n')
    + `\nexport { ${EXPORTS.join(', ')} };\n`;

const min = process.argv.includes('--min');
const outIdx = process.argv.indexOf('--out');
const out = outIdx > -1 ? process.argv[outIdx + 1] : path.join(ROOT, 'local', 'build', 'bundle.dev.js');

esbuild.build({
    stdin: { contents: indexSrc, resolveDir: ROOT, sourcefile: 'INDEX:bundle.js', loader: 'ts' },
    bundle: true,
    format: 'iife',
    globalName: '__bundle__',
    target: 'es6',
    keepNames: true,
    minify: min,
    tsconfig: path.join(ROOT, 'tsconfig.json'),
    external: ['tone'],
    footer: { js: 'window.__setBundle_("main", __bundle__);' },
    plugins: [regClassPlugin],
    outfile: out,
    logLevel: 'warning'
}).then(() => {
    console.log('built', out, fs.statSync(out).size, 'bytes', min ? '(min)' : '(dev)');
}).catch((e) => { console.error(e.message || e); process.exit(1); });