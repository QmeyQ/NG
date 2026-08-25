const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const LIBRARY_DIR = path.join(PROJECT_ROOT, 'library');
const INFO_FILE = path.join(LIBRARY_DIR, 'asset-db.info');
const OUTPUT_DIR = __dirname;

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const MAIN_RES_RE = new RegExp(`([\\w./~\\-]+)\\$\\x00(${UUID_PATTERN})`, 'g');
const SUB_DEF_RE = /[\x00-\x1f]((?:lani|lmat|lm|lh|atlas|img)\d+|0)[\x00-\x1f]+([^\x00-\x1f]+)/g;


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

function main() {
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