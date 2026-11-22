'use strict';
const cp=require('child_process'),path=require('path');
const {getJson,Page,sleep}=require('../../local/cdpkit.cjs');
const port=9265,prof=path.join(__dirname,'edge-a-'+Date.now());
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
  const audit=await p.ev(`(()=>{
    const turn=document.querySelector('.turn');
    const ub=document.querySelector('.turn .msg.me .b');
    const ag=document.querySelector('.agentmsg .b');
    const meta=document.querySelector('.agentmsg .meta');
    const proc=document.querySelector('.ta-proc');
    const ubEl=document.querySelector('.turn .msg.me');
    const cs=el=>el?getComputedStyle(el):null;
    const ucs=cs(ub),acs=cs(ag),mcs=cs(ubEl);
    return JSON.stringify({
      turns:document.querySelectorAll('.turn').length,
      userBubble:{exists:!!ub,text:(ub?ub.textContent:'').slice(0,40),bg:ucs&&ucs.backgroundColor,align:mcs&&mcs.alignSelf,color:ucs&&ucs.borderColor},
      agentBubble:{exists:!!ag,cursor:acs&&acs.cursor,bg:acs&&acs.backgroundColor,border:acs&&acs.borderColor,firstText:(ag?ag.textContent:'').slice(0,40)},
      meta:{text:meta?meta.textContent.slice(0,80):''},
      proc:{exists:!!proc,items:proc?proc.querySelectorAll('.item').length:0,firstItemTitle:proc&&proc.querySelector('.item-head')?proc.querySelector('.item-head').textContent:''},
      oldDetails:document.querySelectorAll('.turn-details').length,
      oldTurnHead:document.querySelectorAll('.turn-head').length,
      msgs:document.querySelectorAll('#msgs > .msg').length
    });
  })()`);
  console.log(audit);
  try{child.kill()}catch(e){}
  process.exit(0);
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
