'use strict';
// sync-codex-html.cjs - 把 chat/public/{codex,chat}.html 同步到 normalgame Worker 静态资源与 release。
// 用法: node chat/deploy/sync-codex-html.cjs [--deploy]
const fs=require('fs'),path=require('path'),cp=require('child_process');
const ROOT=path.resolve(__dirname,'..','..');
const src=path.join(ROOT,'chat','public');
const targets=[path.join(ROOT,'server','cloud','public'),path.join(ROOT,'release','web'),path.join(ROOT,'web')];
for(const t of targets){
  if(!fs.existsSync(t))continue;
  for(const f of ['codex.html','chat.html']){
    fs.copyFileSync(path.join(src,f),path.join(t,f));
    console.log('copied '+f+' -> '+path.relative(ROOT,t));
  }
}
if(process.argv.includes('--deploy')){
  if(!fs.existsSync('F:/ENV/aisdk/node_modules/wrangler')){} // noop
  const cwd=path.join(ROOT,'server','cloud');
  const env=Object.assign({},process.env,{NODE_OPTIONS:'--dns-result-order=ipv4first'});
  const r=cp.spawnSync(process.execPath,[path.join(cwd,'node_modules','wrangler','bin','wrangler.js'),'deploy'],{cwd,env,encoding:'utf8'});
  process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');
  process.exit(r.status||0);
}
