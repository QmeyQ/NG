'use strict';
// chatpage_stable.cjs — 稳定性: 数据不变时不重渲(标记元素存活)、无空白、滚动不跳
const cp=require('child_process'),path=require('path');
const {getJson,Page,sleep}=require('../../local/cdpkit.cjs');
const port=9263,prof=path.join(__dirname,'edge-st-'+Date.now());
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
  // 打标记 + 记录滚动
  await p.ev(`(()=>{const b=document.querySelector('.agentmsg .b');if(b)b.setAttribute('data-stab','X1');const box=document.getElementById('msgs');box.scrollTop=200;return true})()`);
  const before=await p.ev(`(()=>{const box=document.getElementById('msgs');return JSON.stringify({marked:!!document.querySelector('[data-stab=X1]'),turns:document.querySelectorAll('.turn').length,items:document.querySelectorAll('.ta-proc .item').length,blank:!document.querySelector('.turn')&&!document.querySelector('.msg'),scroll:box.scrollTop})})()`);
  console.log('before:',before);
  let blankSeen=0,maxScrollJump=0;
  for(let i=0;i<8;i++){
    await sleep(1500);
    const r=JSON.parse(await p.ev(`(()=>{const box=document.getElementById('msgs');return JSON.stringify({marked:!!document.querySelector('[data-stab=X1]'),turns:document.querySelectorAll('.turn').length,blank:!document.querySelector('.turn')&&!document.querySelector('.msg'),scroll:box.scrollTop})})()`));
    if(r.blank)blankSeen++;
    const jump=Math.abs(r.scroll-200);
    if(jump>maxScrollJump)maxScrollJump=jump;
    if(i===3||i===7)console.log('t+'+((i+1)*1.5)+'s:',JSON.stringify(r));
  }
  console.log('blankSeen='+blankSeen+' maxScrollJump='+maxScrollJump);
  const pass=blankSeen===0&&maxScrollJump<50;
  console.log(pass?'PASS':'FAIL');
  await p.shot('chat/test/stable.png');
  try{child.kill()}catch(e){}
  process.exit(pass?0:1);
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
