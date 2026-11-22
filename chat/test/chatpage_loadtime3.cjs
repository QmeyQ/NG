'use strict';
// chatpage_loadtime3.cjs — 进页性能: 读产品内 __boot 标记(列表/首内容渲染耗时)
const cp=require('child_process'),path=require('path');
const {getJson,Page,sleep}=require('../../local/cdpkit.cjs');
const port=9279,prof=path.join(__dirname,'edge-lt4-'+Date.now());
const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
(async()=>{
  const child=cp.spawn(edge,['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port='+port,'--user-data-dir='+prof,'--window-size=1400,900','about:blank'],{windowsHide:true,stdio:'ignore'});
  let tabs=null;for(let i=0;i<30;i++){await sleep(400);try{tabs=await getJson('http://127.0.0.1:'+port+'/json/list');if(tabs&&tabs.length)break}catch(e){}}
  const pg=tabs.find(x=>x.type==='page');
  const p=await new Page(pg.webSocketDebuggerUrl).open();
  const run=async label=>{
    await p.send('Page.navigate',{url:'https://normalgame.cn/chat?token=cx-9&cb='+Date.now()});
    for(let i=0;i<60;i++){await sleep(200);const ok=await p.ev('(()=>!!(window.__boot&&window.__boot.firstContent!==null))()').catch(()=>false);if(ok)break}
    const m=await p.ev('(()=>JSON.stringify({convs:(window.__boot&&window.__boot.convs!==null)?Math.round(window.__boot.convs-window.__boot.start):-1,content:(window.__boot&&window.__boot.firstContent!==null)?Math.round(window.__boot.firstContent-window.__boot.start):-1,blocks:document.querySelectorAll(".blk").length}))()');
    const r=JSON.parse(m);
    console.log(label+': 列表='+(r.convs<0?'未记录':r.convs+'ms')+' 首内容='+(r.content<0?'TIMEOUT':r.content+'ms')+' blocks='+r.blocks);
    return r;
  };
  const cold=await run('冷(新profile)');
  await sleep(1500);
  const warm=await run('热(同profile+localStorage)');
  const pass=!(warm.content<0)&&warm.content<2500&&!(cold.content<0);
  console.log(pass?'PASS':'FAIL');
  try{child.kill()}catch(e){}
  process.exit(pass?0:1);
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
