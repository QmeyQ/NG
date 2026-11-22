'use strict';
// chatpage_blocks.cjs — 每块独立收展: 点击块头切换, 状态保持, 完成后自动收起
const cp=require('child_process'),path=require('path');
const {getJson,Page,sleep}=require('../../local/cdpkit.cjs');
const port=9267,prof=path.join(__dirname,'edge-blk-'+Date.now());
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
  await sleep(4000);
  const snap=()=>p.ev(`(()=>{const t=[...document.querySelectorAll('.turn')].pop();const blks=[...t.querySelectorAll('.blk')];return JSON.stringify({blocks:blks.length,openBodies:blks.filter(b=>{const bb=b.querySelector('.blk-body');return bb&&bb.style.display!=='none'}).length,firstReasonOpen:(()=>{const r=t.querySelector('.blk.reason');const bb=r&&r.querySelector('.blk-body');return bb?bb.style.display!=='none':null})(),chevs:blks.slice(0,3).map(b=>{const c=b.querySelector('.chev');return c?c.textContent:''})})})()`);
  console.log('initial:',await snap());
  // 点击第一个思考块头 -> 展开
  const r1=await p.ev(`(()=>{const t=[...document.querySelectorAll('.turn')].pop();const r=t.querySelector('.blk.reason .blk-head');if(r)r.click();return !!r})()`);
  await sleep(250);
  console.log('after reason click:',await snap());
  // 再点 -> 收起
  await p.ev(`(()=>{const t=[...document.querySelectorAll('.turn')].pop();const r=t.querySelector('.blk.reason .blk-head');if(r)r.click();return true})()`);
  await sleep(250);
  console.log('after reason click 2:',await snap());
  // 点击一个命令块 -> 展开(输出可见)
  const r2=await p.ev(`(()=>{const t=[...document.querySelectorAll('.turn')].pop();const c=t.querySelector('.blk.cmd .blk-head');if(c)c.click();return !!c})()`);
  await sleep(250);
  const cmdSnap=await p.ev(`(()=>{const t=[...document.querySelectorAll('.turn')].pop();const c=t.querySelector('.blk.cmd');const bb=c&&c.querySelector('.blk-body');return JSON.stringify({cmdOpen:bb?bb.style.display!=='none':null,cmdHasOut:bb?bb.textContent.length>10:null,head:(c&&c.querySelector('.cmdline')||{}).textContent||''})})()`);
  console.log('after cmd click:',cmdSnap);
  // 6s 后轮询重渲(若数据变了): 展开状态保持
  await sleep(6000);
  const after=JSON.parse(await p.ev(`(()=>{const t=[...document.querySelectorAll('.turn')].pop();const c=t.querySelector('.blk.cmd');const bb=c&&c.querySelector('.blk-body');return JSON.stringify({cmdOpen:bb?bb.style.display!=='none':null})})()`));
  console.log('after 6s poll, cmd open kept:',JSON.stringify(after));
  const pass=after.cmdOpen===true;
  console.log(pass?'PASS':'FAIL');
  try{child.kill()}catch(e){}
  process.exit(pass?0:1);
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
