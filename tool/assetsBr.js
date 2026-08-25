const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const MAGIC = 'BRP1';
const VERSION = '1.0';

function buildNestedTable(flat) {
    const root = {};
    for (const [p, val] of Object.entries(flat)) {
        const parts = p.split('/');
        let cur = root;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!cur[parts[i]]) cur[parts[i]] = {};
            cur = cur[parts[i]];
        }
        cur[parts[parts.length - 1]] = val;
    }
    return root;
}

function collectFiles(rootDir, base = '') {
    const result = [];
    for (const name of fs.readdirSync(rootDir)) {
        const full = path.join(rootDir, name);
        const rel = base ? `${base}/${name}` : name;
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            result.push(...collectFiles(full, rel));
        } else {
            result.push({ path: rel, data: fs.readFileSync(full) });
        }
    }
    return result;
}

function buildContainer(files) {
    const flatTable = {};
    const bodyChunks = [];
    let bodyOffset = 0;
    for (const f of files) {
        flatTable[f.path] = [bodyOffset, f.data.length];
        bodyChunks.push(f.data);
        bodyOffset += f.data.length;
    }
    const header = {
        version: VERSION,
        fileCount: files.length,
        files: buildNestedTable(flatTable)
    };
    const headerBytes = Buffer.from(JSON.stringify(header), 'utf-8');
    const headerTotalLen = 8 + headerBytes.length;
    const bodyBuf = bodyChunks.length ? Buffer.concat(bodyChunks) : Buffer.alloc(0);
    const container = Buffer.alloc(headerTotalLen + bodyBuf.length);
    container.write(MAGIC, 0, 4, 'ascii');
    container.writeUInt32BE(headerTotalLen, 4);
    headerBytes.copy(container, 8);
    bodyBuf.copy(container, headerTotalLen);
    return container;
}

function compressToBr(containerBuffer, quality = 11) {
    return zlib.brotliCompressSync(containerBuffer, {
        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: quality }
    });
}

function packDirectory(srcDir, outFile, quality) {
    if (!fs.existsSync(srcDir)) {
        console.error('源目录不存在: ' + srcDir);
        process.exit(1);
    }
    console.log('[assetsBr] 收集文件: ' + srcDir);
    const files = collectFiles(srcDir);
    console.log('[assetsBr] 文件数: ' + files.length);
    if (files.length === 0) {
        console.error('无文件可打包');
        process.exit(1);
    }
    const totalRaw = files.reduce((s, f) => s + f.data.length, 0);
    console.log('[assetsBr] 原始总大小: ' + totalRaw + ' bytes');

    const container = buildContainer(files);
    console.log('[assetsBr] 容器大小: ' + container.length + ' bytes');

    const brBuffer = compressToBr(container, quality);
    console.log('[assetsBr] .br 大小: ' + brBuffer.length + ' bytes (' +
        (brBuffer.length / container.length * 100).toFixed(1) + '%)');

    fs.writeFileSync(outFile, brBuffer);
    console.log('[assetsBr] 已写入: ' + outFile);

    const manifest = {
        out: outFile,
        magic: MAGIC,
        version: VERSION,
        fileCount: files.length,
        rawSize: totalRaw,
        containerSize: container.length,
        brSize: brBuffer.length,
        ratio: +(brBuffer.length / container.length).toFixed(4),
        files: files.map(f => ({ path: f.path, size: f.data.length }))
    };
    const manifestPath = outFile.replace(/\.br$/, '.manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('[assetsBr] 清单已写入: ' + manifestPath);
}

function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log('用法: node assetsBr.js <源目录> [输出.br] [quality 0-11]');
        console.log('示例: node assetsBr.js tool/cha.fbx cha.fbx.br 11');
        process.exit(0);
    }
    const src = args[0];
    const quality = parseInt(args[2] || '11', 10);
    let out = args[1] || (path.basename(src) + '.br');
    packDirectory(src, out, quality);
}

main();
