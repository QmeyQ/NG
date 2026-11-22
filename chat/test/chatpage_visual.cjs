'use strict';
const cp=require('child_process'),path=require('path');
const {getJson,Page,sleep}=require('../../local/cdpkit.cjs');
const port=9264,prof=path.join(__dirname,'edge-v-'+Date.now());
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
  await sleep(5000);
  // 展开最新 turn 的过程
  await p.ev(`(()=>{const ag=[...document.querySelectorAll('.agentmsg')].pop();const proc=ag.querySelector('.ta-proc');if(proc&&proc.style.display==='none'){proc.style.display='';}const box=document.getElementById('msgs');box.scrollTop=box.scrollHeight;return true})()`);
  await sleep(600);
  await p.shot('chat/test/final_open.png');
  console.log('open shot');
  // 收起
  await p.ev(`(()=>{const ag=[...document.querySelectorAll('.agentmsg')].pop();const proc=ag.querySelector('.ta-proc');if(proc)proc.style.display='none';const box=document.getElementById('msgs');box.scrollTop=box.scrollHeight;return true})()`);
  await sleep(400);
  await p.shot('chat/test/final_closed.png');
  console.log('closed shot');
  // 也截一张顶部(用户气泡区域)
  await p.ev(`(()=>{document.getElementById('msgs').scrollTop=0;return true})()`);
  await sleep(400);
  await p.shot('chat/test/final_top.png');
  console.log('top shot');
  try{child.kill()}catch(e){}
  process.exit(0);
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
