'use strict';
// minimal npm installer: resolve + download tarballs (no npm needed)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const ROOT = process.argv[2];
const NM = path.join(ROOT, 'node_modules');
const seen = new Map();
async function install(name, range) {
  const key = name;
  if (seen.has(key)) return;
  seen.set(key, true);
  const meta = await (await fetch('https://registry.npmjs.org/' + name.replace('/', '%2F'))).json();
  const tags = meta['dist-tags'] || {};
  let ver = tags.latest;
  if (range && meta.versions[range]) ver = range;
  else if (range) {
    // 简化 semver: ^X / ~X / >=X 取同 major 最高版
    const m = String(range).match(/[~^>=]*\s*v?(\d+)(?:\.(\d+))?/);
    if (m) {
      const major = parseInt(m[1], 10);
      const sameMajor = Object.keys(meta.versions).filter(v => parseInt(v.split('.')[0], 10) === major && !/-/.test(v));
      if (sameMajor.length) {
        sameMajor.sort((a, b) => { const pa = a.split('.').map(Number), pb = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i]; return 0; });
        ver = sameMajor[sameMajor.length - 1];
      }
    }
  }
  const v = meta.versions[ver];
  const tgz = v.dist.tarball;
  const dst = path.join(NM, name);
  fs.mkdirSync(dst, { recursive: true });
  const tmp = path.join(ROOT, '.tmp-' + name.replace(/[\/@]/g, '_') + '.tgz');
  const buf = Buffer.from(await (await fetch(tgz)).arrayBuffer());
  fs.writeFileSync(tmp, buf);
  execSync('tar -xzf "' + tmp + '" -C "' + dst + '" --strip-components=1');
  fs.unlinkSync(tmp);
  console.log('installed', name, ver);
  const deps = Object.assign({}, v.dependencies || {});
  for (const d of Object.keys(deps)) { if (/^(peer|optional)/.test(d)) continue; await install(d, deps[d]); }
}
(async () => {
  await install('@hw-agconnect/cloudstorage', '');
  await install('@hw-agconnect/instance', '');
  await install('@hw-agconnect/api', '');
  await install('@hw-agconnect/auth', '');
  await install('@hw-agconnect/util', '');
  await install('@hw-agconnect/core', '');
  await install('@agconnect/common-server', '');
  console.log('DONE');
})().catch(e => { console.log('INSTALL ERR ' + e.message); process.exit(1); });
