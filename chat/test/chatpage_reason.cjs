'use strict';
// chatpage_reason.cjs — 思考块: 默认收起, 点击展开(有文本), 再点收起, 时长真实
const cp=require('child_process'),path=require('path');
const {getJson,Page,sleep}=require('../../local/cdpkit.cjs');
const port=9269,prof=path.join(__dirname,'edge-rs-'+Date.now());
const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PEER='ide:01a1e104-2412-7060-8f8e-dd72c6540f08';
(async()=>{
  const child=cp.spawn(edge,['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port='+port,'--user-data-dir='+prof,'--window-size=1400,900','about:blank'],{windowsHide:true,stdio:'ignore'});
  let tabs=null;for(let i=0;i<30;i++){await sleep(400);try{tabs=await getJson('http://127.0.0.1:'+port+'/json/list');if(tabs&&tabs.length)break}catch(e){}}
  const pg=tabs.find(x=>x.type==='page');
  const p=await new Page(pg.webSocketDebuggerUrl).open();
  await p.send('Page.navigate',{url:'https://normalgame.cn/chat?token=cx-9&cb='+Date.now()});
  await sleep(6000);
  await p.ev("(()=>{const b=document.getElementById('tokenLater');if(b)b.click();return true})()");
  await sleep(2000);
  await p.ev(`(()=>{const e=[...document.querySelectorAll('.conv')].find(x=>x.dataset.id==='${PEER}');if(e)e.click();return !!e})()`);
  await sleep(4500);
  // 找一个"有文本"的思考块
  const pick=JSON.parse(await p.ev(`(()=>{
    const rs=[...document.querySelectorAll('.blk.reason')];
    const withBody=rs.find(r=>r.querySelector('.blk-body'));
    return JSON.stringify({reasonBlocks:rs.length,withBodyIdx:withBody?rs.indexOf(withBody):-1,head:withBody?(withBody.querySelector('.blk-title')||{}).textContent:''});
  })()`));
  console.log('reason blocks:',JSON.stringify(pick));
  if(pick.withBodyIdx<0){console.log('FAIL no reasoning with body');process.exit(1)}
  const idx=pick.withBodyIdx;
  const state=i=>p.ev(`(()=>{
    const rs=[...document.querySelectorAll('.blk.reason')];const r=rs[${idx}];if(!r)return 'gone';
    const b=r.querySelector('.blk-body');
    return JSON.stringify({open:b?b.style.display!=='none':null,bodyLen:b?b.textContent.length:0,chev:(r.querySelector('.chev')||{}).textContent,head:(r.querySelector('.blk-title')||{}).textContent});
  })()`);
  const s0=JSON.parse(await state(0));
  console.log('initial:',JSON.stringify(s0));
  const defaultCollapsed=s0.open===false;
  // 点击展开
  await p.ev(`(()=>{const rs=[...document.querySelectorAll('.blk.reason')];const h=rs[${idx}].querySelector('.blk-head');if(h)h.click();return true})()`);
  await sleep(300);
  const s1=JSON.parse(await state(0));
  console.log('after click 1:',JSON.stringify(s1));
  const expands=s1.open===true&&s1.bodyLen>50;
  // 再点收起
  await p.ev(`(()=>{const rs=[...document.querySelectorAll('.blk.reason')];const h=rs[${idx}].querySelector('.blk-head');if(h)h.click();return true})()`);
  await sleep(300);
  const s2=JSON.parse(await state(0));
  console.log('after click 2:',JSON.stringify(s2));
  const collapses=s2.open===false;
  // 6s 轮询重渲后: 手动展开状态保持
  await p.ev(`(()=>{const rs=[...document.querySelectorAll('.blk.reason')];const h=rs[${idx}].querySelector('.blk-head');if(h)h.click();return true})()`);
  await sleep(200);
  await sleep(6000);
  const s3=JSON.parse(await state(0));
  console.log('after 6s poll (kept open):',JSON.stringify(s3));
  const kept=s3.open===true;
  // 时长: head 包含 · Ns 且 N>1
  const durOk=/思考\s*·\s*(\d+)s/.test(s0.head||'')&&parseInt((s0.head||'').match(/思考\s*·\s*(\d+)s/)[1])>=1;
  const pass=defaultCollapsed&&expands&&collapses&&kept&&durOk;
  console.log('defaultCollapsed='+defaultCollapsed+' expands='+expands+' collapses='+collapses+' kept='+kept+' durOk='+durOk);
  console.log(pass?'PASS':'FAIL');
  try{child.kill()}catch(e){}
  process.exit(pass?0:1);
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
