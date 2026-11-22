'use strict';
// chatpage_turn_realtime.cjs — 验证 IDE 会话单条消息收展 + 实时更新（无需点击刷新）
const cp=require('child_process'),path=require('path'),fs=require('fs');
const {getJson,Page,sleep}=require('../../local/cdpkit.cjs');
const port=9252,prof=path.join(__dirname,'edge-rt-'+Date.now());
const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PEER='ide:01a1e104-2412-7060-8f8e-dd72c6540f08';
const errors=[];
(async()=>{
  const child=cp.spawn(edge,['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port='+port,'--user-data-dir='+prof,'--window-size=1400,900','about:blank'],{windowsHide:true,stdio:'ignore'});
  let tabs=null;for(let i=0;i<30;i++){await sleep(400);try{tabs=await getJson('http://127.0.0.1:'+port+'/json/list');if(tabs&&tabs.length)break}catch(e){}}
  const pg=tabs.find(x=>x.type==='page');
  const p=await new Page(pg.webSocketDebuggerUrl).open();
  await p.send('Runtime.enable').catch(()=>{});
  p.onEvent&&p.onEvent(ev=>{}); // ignore
  await p.send('Page.navigate',{url:'https://normalgame.cn/chat?token=cx-9&rt=1'});
  await sleep(6000);
  await p.ev("(()=>{const b=document.getElementById('tokenLater');if(b)b.click();return true})()");
  await sleep(2500);
  // open the IDE conversation
  await p.ev(`(()=>{const e=[...document.querySelectorAll('.conv')].find(x=>x.dataset.id==='${PEER}');if(e)e.click();return !!e})()`);
  await sleep(4500);
  const snap=async(tag)=>{
    const txt=await p.ev(`(()=>{const t=[...document.querySelectorAll('.turn')];return JSON.stringify({tag:'${tag}',turns:t.length,details:document.querySelectorAll('.turn-details').length,items:document.querySelectorAll('.turn-items .item').length,open:[...document.querySelectorAll('.turn-details')].map(d=>!!d.open),running:[...document.querySelectorAll('.turn.running')].length,statuses:[...document.querySelectorAll('.turn .item-status')].slice(0,3).map(x=>x.textContent),lastTurnItems:(t[t.length-1]?t[t.length-1].querySelectorAll('.item').length:0),msgs:document.querySelectorAll('.msg').length})})()`);
    return JSON.parse(txt);
  };
  const a=await snap('initial');
  console.log(JSON.stringify(a));
  // keep page open; this session keeps running commands -> items should stream in via SSE
  await sleep(9000);
  const b=await snap('after9s');
  console.log(JSON.stringify(b));
  // realtime: DOM updated without any click?
  const realtimeUp=(b.items>a.items)||(b.turns>a.turns)||(JSON.stringify(b.statuses)!==JSON.stringify(a.statuses));
  // toggle collapse on latest turn details
  const toggled=await p.ev("(()=>{const d=[...document.querySelectorAll('.turn-details')].pop();if(!d)return false;d.open=!d.open;return d.open})()");
  await sleep(300);
  await sleep(8000); // let SSE re-render at least ~8 cycles (1s poll)
  const c=await snap('afterToggle8s');
  console.log(JSON.stringify(c));
  const preserved=c.open.length&&c.open[c.open.length-1]===toggled;
  // single-message-per-turn invariant: turns count == distinct turn groups rendered
  const singleOk=c.turns>=1&&c.turns<=c.items+1;
  const pass=realtimeUp&&preserved&&singleOk&&c.msgs===0;
  console.log('realtimeUp='+realtimeUp+' preserved='+preserved+' singleOk='+singleOk+' msgs='+c.msgs);
  console.log(pass?'PASS':'FAIL');
  try{child.kill()}catch(e){}
  process.exit(pass?0:1);
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
