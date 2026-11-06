const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const LIBRARY_DIR = path.join(PROJECT_ROOT, 'library');
const INFO_FILE = path.join(LIBRARY_DIR, 'asset-db.info');
const OUTPUT_DIR = __dirname;

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const MAIN_RES_RE = new RegExp(`([\\w./~\\-]+)\\$\\x00(${UUID_PATTERN})`, 'g');
const SUB_DEF_RE = /[\x00-\x1f]((?:lani|lmat|lm|lh|atlas|img)\d+|0)[\x00-\x1f]+([^\x00-\x1f]+)/g;
const RES_REF_RE = new RegExp('res://(' + UUID_PATTERN + ')', 'g');
const UUID_OBJ_RE = new RegExp(
    '"([^"]+)"\\s*:\\s*\\{\\s*"\\_\\$uuid"\\s*:\\s*"(' + UUID_PATTERN + ')"\\s*,\\s*"\\_\\$type"\\s*:\\s*"([^"]+)"\\s*\\}',
    'g'
);


function readInfoText(infoFile) {
    const buffer = fs.readFileSync(infoFile);
    return buffer.toString('latin1');
}

function parseMainResources(text) {
    const mains = [];
    let m;
    MAIN_RES_RE.lastIndex = 0;
    while ((m = MAIN_RES_RE.exec(text)) !== null) {
        mains.push({
            path: m[1],
            uuid: m[2],
            index: m.index,
            subs: []
        });
    }
    return mains;
}

function parseSubResources(text, mains) {
    for (let i = 0; i < mains.length; i++) {
        const start = mains[i].index;
        const end = i + 1 < mains.length ? mains[i + 1].index : text.length;
        const segment = text.slice(start, end);
        const seen = new Set();
        SUB_DEF_RE.lastIndex = 0;
        let sm;
        while ((sm = SUB_DEF_RE.exec(segment)) !== null) {
            const id = sm[1];
            const name = sm[2];
            const key = id + '|' + name;
            if (seen.has(key)) continue;
            seen.add(key);
            mains[i].subs.push({ id, name });
        }
    }
}

function resolveDestDir(mainPath) {
    let rel = mainPath;
    if (rel.startsWith('~/')) rel = rel.slice(2);
    return path.join(OUTPUT_DIR, rel);
}

function copySubResources(mains) {
    const stats = { dirs: 0, copied: 0, skippedNoSub: 0, skippedMissing: 0 };
    const manifest = [];
    for (const main of mains) {
        const prefix = main.uuid.slice(0, 2);
        const libSubDir = path.join(LIBRARY_DIR, prefix);
        if (!fs.existsSync(libSubDir)) {
            stats.skippedMissing++;
            continue;
        }
        const files = fs.readdirSync(libSubDir).filter(f => f.startsWith(main.uuid + '@'));
        if (files.length === 0) {
            stats.skippedNoSub++;
            continue;
        }
        const destDir = resolveDestDir(main.path);
        if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
        fs.mkdirSync(destDir, { recursive: true });
        stats.dirs++;
        const idToName = {};
        for (const sub of main.subs) idToName[sub.id] = sub.name;
        const copiedFiles = [];
        for (const file of files) {
            const srcFile = path.join(libSubDir, file);
            if (!fs.statSync(srcFile).isFile()) continue;
            const atIdx = file.indexOf('@');
            const subPart = file.slice(atIdx + 1);
            const dotIdx = subPart.lastIndexOf('.');
            const subId = dotIdx > 0 ? subPart.slice(0, dotIdx) : subPart;
            const ext = dotIdx > 0 ? subPart.slice(dotIdx) : '';
            const extKey = ext.replace(/^\./, '') || 'noext';
            const readableName = idToName[subId] || subPart;
            const subDir = path.join(destDir, extKey);
            fs.mkdirSync(subDir, { recursive: true });
            const destFile = path.join(subDir, readableName);
            fs.copyFileSync(srcFile, destFile);
            copiedFiles.push({ id: subId, ext: extKey, file: path.join(extKey, readableName), size: fs.statSync(destFile).size });
            stats.copied++;
        }
        manifest.push({
            main: main.path,
            uuid: main.uuid,
            subCount: copiedFiles.length,
            files: copiedFiles
        });
    }
    return { stats, manifest };
}

// ==================== .lh res:// 路径替换模式 ====================
// 用法(单文件): node assets.js <input.lh> <prefix>
// 用法(目录)  : node assets.js <dir> <prefix>
// 示例: node assets.js menu.lh ui@    /    node assets.js assets/game ui@
// 将 lh/ls 中 res://uuid 替换为 prefix + 包内路径
// 单文件模式在运行路径下生成替换后文件; 目录模式递归处理全部 ls/lh 并按目录结构输出到 tool/<目录名>/

function buildUuidMap(text) {
    const map = {};
    let m;
    MAIN_RES_RE.lastIndex = 0;
    while ((m = MAIN_RES_RE.exec(text)) !== null) {
        if (!map[m[2]]) map[m[2]] = m[1];
    }
    return map;
}

/** asset-db 路径 -> Res 包内路径: 首段目录等于包名时去掉首段 */
function toPackPath(assetPath, packName) {
    let rel = assetPath;
    if (rel.startsWith('~/')) rel = rel.slice(2);
    const slash = rel.indexOf('/');
    if (slash > 0 && rel.slice(0, slash) === packName) rel = rel.slice(slash + 1);
    return rel;
}

/** 定位输入文件: 优先原路径, 其次 assets/ 下递归查找同名文件 */
function findInputFile(input) {
    if (fs.existsSync(input)) return path.resolve(input);
    const name = path.basename(input);
    const queue = [path.join(PROJECT_ROOT, 'assets')];
    while (queue.length > 0) {
        const dir = queue.shift();
        if (!fs.existsSync(dir)) continue;
        for (const f of fs.readdirSync(dir)) {
            const full = path.join(dir, f);
            const st = fs.statSync(full);
            if (st.isDirectory()) queue.push(full);
            else if (f === name) return full;
        }
    }
    return null;
}

/** 核心: 替换文本中的 res://uuid 引用与 Texture 对象为 prefix+包内路径 */
function replaceText(text, prefix, packName, uuidMap) {
    const stats = { res: 0, obj: 0, missing: new Set(), notInPack: new Set() };
    const resolveRef = (uuid) => {
        const assetPath = uuidMap[uuid];
        if (!assetPath) { stats.missing.add(uuid); return null; }
        const packPath = toPackPath(assetPath, packName);
        const packFile = path.join(OUTPUT_DIR, packName, ...packPath.split('/'));
        if (!fs.existsSync(packFile)) stats.notInPack.add(packPath);
        return prefix + packPath;
    };

    let out = text.replace(RES_REF_RE, (whole, uuid) => {
        const ref = resolveRef(uuid);
        if (ref === null) return whole;
        stats.res++;
        return ref;
    });

    out = out.replace(UUID_OBJ_RE, (whole, key, uuid, type) => {
        if (!/^Texture/.test(type)) return whole;
        const ref = resolveRef(uuid);
        if (ref === null) return whole;
        stats.obj++;
        return '"src": "' + ref + '"';
    });
    return { out, stats };
}

function loadUuidMap() {
    if (!fs.existsSync(INFO_FILE)) {
        console.error('未找到 asset-db.info: ' + INFO_FILE);
        process.exit(1);
    }
    return buildUuidMap(readInfoText(INFO_FILE));
}

function printStats(stats) {
    if (stats.missing.size > 0) {
        console.warn('未找到映射保留原样的 uuid: ' + stats.missing.size + ' 个');
        for (const u of stats.missing) console.warn('  ' + u);
    }
    if (stats.notInPack.size > 0) {
        console.warn('以下引用不在包目录中, 运行时将加载失败:');
        for (const p of stats.notInPack) console.warn('  ' + p);
    }
}

function processLhFile(lhPath, rawPrefix) {
    const prefix = rawPrefix.endsWith('@') ? rawPrefix : rawPrefix + '@';
    const packName = prefix.slice(0, -1);

    const uuidMap = loadUuidMap();

    const srcFile = findInputFile(lhPath);
    if (!srcFile) {
        console.error('未找到输入 lh 文件: ' + lhPath);
        process.exit(1);
    }
    const text = fs.readFileSync(srcFile, 'utf8');

    const { out, stats } = replaceText(text, prefix, packName, uuidMap);

    let outFile = path.join(process.cwd(), path.basename(srcFile));
    const outReal = path.resolve(outFile).toLowerCase();
    const srcReal = path.resolve(srcFile).toLowerCase();
    const assetsRoot = (path.join(PROJECT_ROOT, 'assets') + path.sep).toLowerCase();
    if (outReal === srcReal || (outReal + path.sep).indexOf(assetsRoot) === 0) {
        // 防污染: 输出与输入同一文件或落在 assets/ 源目录下时, 强制改写到 tool/
        outFile = path.join(OUTPUT_DIR, path.basename(srcFile));
        console.warn('输出会覆盖源文件或落入 assets/ 源目录, 已强制改写到: ' + outFile);
    }
    fs.writeFileSync(outFile, out, 'utf8');
    console.log('输入: ' + srcFile);
    console.log('输出: ' + outFile);
    console.log('res:// 替换: ' + stats.res + ', texture 对象替换: ' + stats.obj);
    printStats(stats);
}

/** 目录模式: 递归处理目录下全部 .ls/.lh, 按(相对)目录结构输出到 tool/<目录名>/ */
function processDir(dirInput, rawPrefix) {
    const prefix = rawPrefix.endsWith('@') ? rawPrefix : rawPrefix + '@';
    const packName = prefix.slice(0, -1);

    const dirAbs = path.resolve(dirInput);
    if (!fs.existsSync(dirAbs) || !fs.statSync(dirAbs).isDirectory()) {
        console.error('未找到输入目录: ' + dirInput);
        process.exit(1);
    }

    const uuidMap = loadUuidMap();

    const files = [];
    (function walk(dir) {
        for (const f of fs.readdirSync(dir)) {
            const full = path.join(dir, f);
            const st = fs.statSync(full);
            if (st.isDirectory()) walk(full);
            else if (/\.(ls|lh)$/i.test(f)) files.push(full);
        }
    })(dirAbs);
    if (files.length === 0) {
        console.warn('目录中未找到 .ls/.lh 文件: ' + dirAbs);
        return;
    }

    // 输出根: tool/<输入目录名>/; 与输入目录同路径时加 _out 防覆盖
    let outRoot = path.join(OUTPUT_DIR, path.basename(dirAbs));
    if (path.resolve(outRoot).toLowerCase() === dirAbs.toLowerCase()) {
        outRoot = path.join(OUTPUT_DIR, path.basename(dirAbs) + '_out');
        console.warn('输出根与输入目录相同, 改写到: ' + outRoot);
    }
    fs.mkdirSync(outRoot, { recursive: true });

    // 撞名预检: 输出文件路径撞上既有子资源目录(主流程按 asset-db 路径建的 <主资源名>/ 目录)时, 输出根迁移加 _ls 后缀
    for (const f of files) {
        const t = path.join(outRoot, path.relative(dirAbs, f));
        if (fs.existsSync(t) && fs.statSync(t).isDirectory()) {
            outRoot = path.join(OUTPUT_DIR, path.basename(dirAbs) + '_ls');
            console.warn('输出路径撞既有子资源目录(' + t + '), 输出根改写到: ' + outRoot);
            fs.mkdirSync(outRoot, { recursive: true });
            break;
        }
    }

    console.log('输入目录: ' + dirAbs);
    console.log('输出根: ' + outRoot);
    console.log('待处理 ls/lh 文件: ' + files.length + ' 个');

    const total = { files: 0, res: 0, obj: 0, missing: new Set(), notInPack: new Set() };
    for (const srcFile of files) {
        const rel = path.relative(dirAbs, srcFile);
        const text = fs.readFileSync(srcFile, 'utf8');
        const { out, stats } = replaceText(text, prefix, packName, uuidMap);
        const outFile = path.join(outRoot, rel);
        fs.mkdirSync(path.dirname(outFile), { recursive: true });
        fs.writeFileSync(outFile, out, 'utf8');
        total.files++;
        total.res += stats.res;
        total.obj += stats.obj;
        for (const u of stats.missing) total.missing.add(u);
        for (const p of stats.notInPack) total.notInPack.add(p);
        console.log('  ' + rel + ' -> ' + path.join(path.basename(outRoot), rel) + ' (res:' + stats.res + ', obj:' + stats.obj + ')');
    }

    console.log('完成: ' + total.files + ' 个文件, res:// 替换 ' + total.res + ', texture 对象替换 ' + total.obj);
    printStats(total);
}

function main() {
    const args = process.argv.slice(2);

    // 目录模式: 递归处理目录下全部 ls/lh, 按目录结构输出
    if (args.length >= 2 && fs.existsSync(args[0]) && fs.statSync(args[0]).isDirectory()) {
        const dir = args[0];
        const prefix = args[1];
        console.log('处理目录: ' + dir);
        console.log('路径前缀: ' + prefix);
        processDir(dir, prefix);
        return;
    }

    // 处理 .lh/.ls 文件替换命令
    if (args.length >= 2 && /\.(lh|ls)$/i.test(args[0])) {
        const lhFile = args[0];
        const prefix = args[1];
        console.log('处理文件: ' + lhFile);
        console.log('路径前缀: ' + prefix);
        processLhFile(lhFile, prefix);
        return;
    }

    if (!fs.existsSync(INFO_FILE)) {
        console.error('未找到 asset-db.info: ' + INFO_FILE);
        process.exit(1);
    }
    const text = readInfoText(INFO_FILE);
    const mains = parseMainResources(text);
    parseSubResources(text, mains);
    console.log('发现主资源: ' + mains.length);
    const { stats, manifest } = copySubResources(mains);
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'assets-manifest.json'),
        JSON.stringify(manifest, null, 2),
        'utf8'
    );
    console.log('创建目录: ' + stats.dirs);
    console.log('复制文件: ' + stats.copied);
    console.log('无子资源跳过: ' + stats.skippedNoSub);
    console.log('库目录缺失跳过: ' + stats.skippedMissing);
    console.log('清单已写入: ' + path.join(OUTPUT_DIR, 'assets-manifest.json'));
}

main();