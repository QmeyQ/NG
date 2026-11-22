'use strict';
const cp=require('child_process'),path=require('path');
const {getJson,Page,sleep}=require('../../local/cdpkit.cjs');
const port=9270,prof=path.join(__dirname,'edge-tt-'+Date.now());
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
  const r1=JSON.parse(await p.ev(`(()=>{
    const t=document.getElementById('chatTitle');
    const head=document.querySelector('.chat-head');
    const sub=document.getElementById('chatSub');
    const cs=getComputedStyle(t);
    return JSON.stringify({titleLen:t.textContent.length,scrollW:t.scrollWidth,clientW:t.clientWidth,scrollable:t.scrollWidth>t.clientWidth,
      singleLine:t.offsetHeight<=36,headH:head.offsetHeight,overflowX:cs.overflowX,whiteSpace:cs.whiteSpace,
      subEllipsis:getComputedStyle(sub).textOverflow,subSingle:sub.offsetHeight<=18});
  })()`));
  console.log('layout:',JSON.stringify(r1));
  // 模拟拖拽: mousedown -> mousemove 左移 -> scrollLeft 增加
  const pos=JSON.parse(await p.ev(`(()=>{const t=document.getElementById('chatTitle');const r=t.getBoundingClientRect();return JSON.stringify({x:r.x+100,y:r.y+r.height/2,sl:t.scrollLeft})})()`));
  await p.send('Input.dispatchMouseEvent',{type:'mousePressed',x:pos.x,y:pos.y,button:'left',clickCount:1});
  await p.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:pos.x-200,y:pos.y,button:'left'});
  await p.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:pos.x-200,y:pos.y,button:'left',clickCount:1});
  await sleep(300);
  const sl2=await p.ev(`(()=>{return document.getElementById('chatTitle').scrollLeft})()`);
  console.log('drag: before='+pos.sl+' after='+sl2);
  const pass=r1.scrollable&&r1.singleLine&&r1.headH<=62&&sl2>pos.sl+50;
  console.log(pass?'PASS':'FAIL');
  await p.shot('chat/test/title_scroll.png');
  try{child.kill()}catch(e){}
  process.exit(pass?0:1);
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
