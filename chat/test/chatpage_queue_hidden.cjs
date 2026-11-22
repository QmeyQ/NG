'use strict';
const cp=require('child_process'),path=require('path');
const {getJson,Page,sleep}=require('../../local/cdpkit.cjs');
const port=9249,prof=path.join(__dirname,'edge-nq-'+Date.now());
const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
(async()=>{
  const child=cp.spawn(edge,['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port='+port,'--user-data-dir='+prof,'--window-size=1400,900','about:blank'],{windowsHide:true,stdio:'ignore'});
  let tabs=null;
  for(let i=0;i<30;i++){await sleep(400);try{tabs=await getJson('http://127.0.0.1:'+port+'/json/list');if(tabs&&tabs.length)break}catch(e){}}
  const pg=tabs.find(x=>x.type==='page');
  const p=await new Page(pg.webSocketDebuggerUrl).open();
  await p.send('Page.navigate',{url:'https://normalgame.cn/chat?token=cx-9'});
  await sleep(6000);
  await p.ev("(()=>{const b=document.getElementById('tokenLater');if(b)b.click();return true})()");
  await sleep(3000);
  const txt=await p.ev("(()=>{const bar=document.getElementById('queueBar');return JSON.stringify({display:getComputedStyle(bar).display,show:bar.classList.contains('show'),items:document.querySelectorAll('.qitem').length})})()");
  const r=JSON.parse(txt);
  console.log(JSON.stringify(r));
  const pass=r.display==='none'&&!r.show&&r.items===0;
  console.log(pass?'PASS':'FAIL');
  try{child.kill()}catch(e){}
  process.exit(pass?0:1);
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
