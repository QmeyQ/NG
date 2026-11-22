'use strict';
// chatpage_shot.cjs — 打开 IDE 会话截图 + 点击消息气泡验证收展
const cp=require('child_process'),path=require('path'),fs=require('fs');
const {getJson,Page,sleep}=require('../../local/cdpkit.cjs');
const port=9258,prof=path.join(__dirname,'edge-shot-'+Date.now());
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
  // 1) 初始状态: 采集 proc 可见性
  const st1=await p.ev(`(()=>{const ag=[...document.querySelectorAll('.agentmsg')].pop();const proc=ag.querySelector('.ta-proc');return JSON.stringify({procVisible:proc?proc.style.display!=='none':null,hint:ag.querySelector('.ta-hint')?ag.querySelector('.ta-hint').textContent:''})})()`);
  console.log('initial:',st1);
  // 2) 点击消息气泡 .b 边框 -> 收展切换
  const pos=await p.ev(`(()=>{const ag=[...document.querySelectorAll('.agentmsg')].pop();const b=ag.querySelector('.b');const r=b.getBoundingClientRect();return JSON.stringify({x:r.x+r.width-8,y:r.y+4})})()`);
  const c=JSON.parse(pos);
  await p.send('Input.dispatchMouseEvent',{type:'mousePressed',x:c.x,y:c.y,button:'left',clickCount:1});
  await p.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:c.x,y:c.y,button:'left',clickCount:1});
  await sleep(400);
  const st2=await p.ev(`(()=>{const ag=[...document.querySelectorAll('.agentmsg')].pop();const proc=ag.querySelector('.ta-proc');return JSON.stringify({procVisible:proc?proc.style.display!=='none':null,hint:ag.querySelector('.ta-hint')?ag.querySelector('.ta-hint').textContent:''})})()`);
  console.log('after-click-1:',st2);
  // 3) 再点一次 -> 恢复
  await p.send('Input.dispatchMouseEvent',{type:'mousePressed',x:c.x,y:c.y,button:'left',clickCount:1});
  await p.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:c.x,y:c.y,button:'left',clickCount:1});
  await sleep(400);
  const st3=await p.ev(`(()=>{const ag=[...document.querySelectorAll('.agentmsg')].pop();const proc=ag.querySelector('.ta-proc');return JSON.stringify({procVisible:proc?proc.style.display!=='none':null})})()`);
  console.log('after-click-2:',st3);
  // 4) 截图(展开态) + 截图(收起态)
  await p.shot('chat/test/turn_open.png');
  await p.send('Input.dispatchMouseEvent',{type:'mousePressed',x:c.x,y:c.y,button:'left',clickCount:1});
  await p.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:c.x,y:c.y,button:'left',clickCount:1});
  await sleep(300);
  await p.shot('chat/test/turn_closed.png');
  console.log('shots saved');
  try{child.kill()}catch(e){}
  process.exit(0);
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
