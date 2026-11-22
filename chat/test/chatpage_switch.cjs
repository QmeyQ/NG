'use strict';
// chatpage_switch.cjs — 会话切换: 标题换内容必须跟着换(A->B->A + 遍历)
const cp=require('child_process'),path=require('path');
const {getJson,Page,sleep}=require('../../local/cdpkit.cjs');
const port=9266,prof=path.join(__dirname,'edge-sw-'+Date.now());
const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
(async()=>{
  const child=cp.spawn(edge,['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port='+port,'--user-data-dir='+prof,'--window-size=1400,900','about:blank'],{windowsHide:true,stdio:'ignore'});
  let tabs=null;for(let i=0;i<30;i++){await sleep(400);try{tabs=await getJson('http://127.0.0.1:'+port+'/json/list');if(tabs&&tabs.length)break}catch(e){}}
  const pg=tabs.find(x=>x.type==='page');
  const p=await new Page(pg.webSocketDebuggerUrl).open();
  await p.send('Page.navigate',{url:'https://normalgame.cn/chat?token=cx-9&cb='+Date.now()});
  await sleep(6000);
  await p.ev("(()=>{const b=document.getElementById('tokenLater');if(b)b.click();return true})()");
  await sleep(2500);
  const list=await p.ev("(()=>{return [...document.querySelectorAll('.conv')].map(x=>({id:x.dataset.id,title:(x.querySelector('.conv-title')||{}).textContent||''}))})()");
  console.log('convs:',JSON.stringify(list).slice(0,400));
  const content=()=>p.ev(`(()=>{const t=document.querySelector('#chatTitle').textContent;const turn=document.querySelector('.turn');const msg=document.querySelector('#msgs .msg .b');const ag=document.querySelector('.agentmsg .b');return JSON.stringify({title:t,kind:turn?'turn':(msg?'msg':'empty'),first:(ag?ag.textContent:(msg?msg.textContent:'')).slice(0,30)})})()`);
  const click=id=>p.ev(`(()=>{const e=[...document.querySelectorAll('.conv')].find(x=>x.dataset.id==='${id}');if(e)e.click();return !!e})()`);
  if(list.length<2){console.log('NEED 2+ convs');process.exit(2)}
  const A=list[0].id,B=list[1].id;
  await click(A);await sleep(4000);
  const cA=JSON.parse(await content());console.log('A:',JSON.stringify(cA));
  await click(B);await sleep(4000);
  const cB=JSON.parse(await content());console.log('B:',JSON.stringify(cB));
  await click(A);await sleep(4000);
  const cA2=JSON.parse(await content());console.log('A2:',JSON.stringify(cA2));
  const switched=cA.title!==cB.title&&(cA.first!==cB.first||cA.kind!==cB.kind);
  const restored=cA2.title===cA.title&&cA2.first===cA.first&&cA2.kind===cA.kind;
  console.log('switched='+switched+' restored='+restored);
  // 遍历全部会话: 每个都必须渲染(标题匹配, 内容非空态除外), 不卡住
  let allOk=true;
  for(const c of list){
    await click(c.id);await sleep(2500);
    const r=JSON.parse(await content());
    const ok=r.title===(c.title||'').slice(0,40).trim()||r.title.includes((c.title||'').slice(0,12));
    console.log('visit',c.id.slice(0,20),'title=',r.title.slice(0,20),'kind=',r.kind,'ok=',ok);
    if(!ok)allOk=false;
  }
  const pass=switched&&restored&&allOk;
  console.log(pass?'PASS':'FAIL');
  try{child.kill()}catch(e){}
  process.exit(pass?0:1);
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
