'use strict';
// chatpage_unread.cjs — 红点修复验证: 打开会话后不回弹; 非活跃会话未读数不随重复广播膨胀
const cp=require('child_process'),path=require('path');
const {getJson,Page,sleep}=require('../../local/cdpkit.cjs');
const port=9268,prof=path.join(__dirname,'edge-ur-'+Date.now());
const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
(async()=>{
  const child=cp.spawn(edge,['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port='+port,'--user-data-dir='+prof,'--window-size=1400,900','about:blank'],{windowsHide:true,stdio:'ignore'});
  let tabs=null;for(let i=0;i<30;i++){await sleep(400);try{tabs=await getJson('http://127.0.0.1:'+port+'/json/list');if(tabs&&tabs.length)break}catch(e){}}
  const pg=tabs.find(x=>x.type==='page');
  const p=await new Page(pg.webSocketDebuggerUrl).open();
  await p.send('Page.navigate',{url:'https://normalgame.cn/chat?token=cx-9&cb='+Date.now()});
  await sleep(6000);
  await p.ev("(()=>{const b=document.getElementById('tokenLater');if(b)b.click();return true})()");
  await sleep(2000);
  const badge=peer=>p.ev(`(()=>{const e=[...document.querySelectorAll('.conv')].find(x=>x.dataset.id==='${peer}');const b=e&&e.querySelector('.badge');return b?b.textContent:'none'})()`);
  const click=peer=>p.ev(`(()=>{const e=[...document.querySelectorAll('.conv')].find(x=>x.dataset.id==='${peer}');if(e)e.click();return !!e})()`);
  const list=await p.ev("(()=>{return [...document.querySelectorAll('.conv')].map(x=>x.dataset.id)})()");
  const A='ide:01a1e104-2412-7060-8f8e-dd72c6540f08'; // 活跃线程(每秒有 history 广播)
  const B=list.find(x=>x!==A)||A;
  // 场景1: 停留在 B, A 持续被广播(当前 AI 会话在跑) —— A 的未读数必须稳定(不每秒膨胀)
  await click(B);await sleep(3000);
  const b1=await badge(A);await sleep(5000);
  const b2=await badge(A);
  console.log('A badge while watching B: t0='+b1+' t+5s='+b2);
  const stable=(b1==='none'&&b2==='none')||b1===b2;
  // 场景2: 打开 A -> 红点清除且不回弹(旧bug: 1秒内回弹)
  await click(A);await sleep(1500);
  const b3=await badge(A);
  await sleep(6000);
  const b4=await badge(A);
  console.log('A badge after open: now='+b3+' t+6s='+b4);
  const noReappear=(b3==='none'||!b3)&&(b4==='none'||!b4);
  const pass=stable&&noReappear;
  console.log('stable='+stable+' noReappear='+noReappear);
  console.log(pass?'PASS':'FAIL');
  try{child.kill()}catch(e){}
  process.exit(pass?0:1);
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
