'use strict';
// ilink.cjs - 验证官方 iLink 扫码登录(不扫码, 只验证二维码获取/状态轮询/页面渲染)。
const fs=require('fs'),path=require('path'),cp=require('child_process');
const ROOT=path.resolve(__dirname,'..','..'); const PORT=18993, TOKEN='ilink-test';
let pass=0,fail=0; const ok=(c,n,e)=>{if(c){pass++;console.log('  PASS '+n)}else{fail++;console.log('  FAIL '+n+(e?' :: '+e:''))}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const cfg=path.join(__dirname,'ilink-config.json');
 fs.writeFileSync(cfg,JSON.stringify({port:PORT,host:'127.0.0.1',token:TOKEN,mode:'local',codex:{cwd:ROOT,model:'qwen4-max-preview',sandbox:'read-only'},wechat:{provider:'ilink',enabled:true,botType:'3',botAgent:'Codex/1.0'},ecs:{}},null,2));
 const b=cp.spawn(process.execPath,[path.join(ROOT,'chat','bridge.cjs')],{cwd:ROOT,windowsHide:true,env:Object.assign({},process.env,{CX_CONFIG:cfg,CX_PORT:String(PORT),CODEX_MOCK:'1'}),stdio:['ignore','pipe','pipe']});
 let log='';b.stdout.on('data',d=>log+=d);b.stderr.on('data',d=>log+=d);
 try{
  for(let i=0;i<30;i++){await sleep(300);try{const r=await fetch('http://127.0.0.1:'+PORT+'/api/help');if(r.ok)break}catch(e){}}
  const h={'Content-Type':'application/json','X-Cx-Token':TOKEN};
  const r=await fetch('http://127.0.0.1:'+PORT+'/api/wechat/login',{method:'POST',headers:h,body:'{}'}); const j=await r.json();
  ok(j.ok&&j.wechat.provider==='ilink','provider=ilink');
  ok(/^https:\/\/liteapp\.weixin\.qq\.com\//.test(j.wechat.login.qrcodeUrl||''),'拿到官方二维码 URL',j.wechat.login.qrcodeUrl);
  ok(j.wechat.login.status==='wait','初始状态 wait');
  await sleep(2500);
  const s=await (await fetch('http://127.0.0.1:'+PORT+'/api/wechat/status',{headers:h})).json();
  ok(['wait','scaned'].includes(s.wechat.login.status),'轮询状态 '+s.wechat.login.status);
  const page=await (await fetch('http://127.0.0.1:'+PORT+'/codex.html')).text();
  ok(page.includes('官方 iLink')&&page.includes('qrcode.js'),'配置页含 iLink + qrcode.js');
  const q=await fetch('http://127.0.0.1:'+PORT+'/qrcode.js'); ok(q.ok,'qrcode.js 可加载');
  fs.writeFileSync(path.join(__dirname,'ilink-qr.txt'),j.wechat.login.qrcodeUrl);
 }catch(e){fail++;console.log('  FAIL exception '+e.message);console.log(log.slice(-1000))}
 finally{try{b.kill()}catch(e){};await sleep(300)}
 console.log('\nRESULT '+pass+' pass / '+fail+' fail');process.exit(fail?1:0);
})();
