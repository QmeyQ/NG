'use strict';
const cp=require('child_process'),path=require('path');const {getJson,Page,sleep}=require('../../local/cdpkit.cjs');
const port=9248,prof=path.join(__dirname,'edge-q-'+Date.now());const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
(async()=>{const child=cp.spawn(edge,['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port='+port,'--user-data-dir='+prof,'--window-size=1400,900','about:blank'],{windowsHide:true,stdio:'ignore'});let tabs=null;for(let i=0;i<30;i++){await sleep(400);try{tabs=await getJson('http://127.0.0.1:'+port+'/json/list');if(tabs&&tabs.length)break}catch(e){}}const pg=tabs.find(x=>x.type==='page');const p=await new Page(pg.webSocketDebuggerUrl).open();await p.send('Page.navigate',{url:'https://normalgame.cn/chat?token=cx-9'});await sleep(6000);
await p.ev("(()=>{const b=document.getElementById('tokenLater');if(b)b.click();return true})()");await sleep(2500);
const list=await p.ev("(()=>{return [...document.querySelectorAll('.conv')].map(x=>({id:x.dataset.id,title:(x.querySelector('.conv-title')||{}).textContent||''}))})()");
const ide=list.find(x=>x.id&&x.id.startsWith('ide:'));console.log('ide',ide&&ide.id);
if(!ide){console.log('FAIL no ide');try{child.kill()}catch(e){}process.exit(1)}
await p.ev("(()=>{const e=[...document.querySelectorAll('.conv')].find(x=>x.dataset.id==='"+ide.id+"');if(e)e.click();return true})()");await sleep(2000);
await p.ev("(()=>{document.getElementById('input').value='QUEUEUITEST';document.getElementById('send').click();return true})()");await sleep(5000);
const qtxt=await p.ev("(()=>{return JSON.stringify({show:document.getElementById('queueBar').classList.contains('show'),count:document.getElementById('qCount').textContent,preview:document.getElementById('qPreview').textContent,items:[...document.querySelectorAll('.qitem')].map(x=>({id:x.dataset.id,text:(x.querySelector('.qtext')||{}).textContent||''}))})})()");
const q=JSON.parse(qtxt);console.log('queue',JSON.stringify(q));
const pass=q.show&&q.items.length>0;console.log(pass?'PASS':'FAIL');
if(q.items&&q.items[0]){try{const cid=q.items[0].id;const expr="fetch('/codex-api/api/ide/queue/delete',{method:'POST',headers:{'Content-Type':'application/json','X-Cx-Token':'cx-9'},body:JSON.stringify({peer:'"+ide.id+"',queuedSubmissionId:'"+cid+"'})}).then(x=>x.json()).then(j=>console.log('cleanup',JSON.stringify(j)))";await p.ev(expr)}catch(e){console.log('cleanup ERR',e.message)}}
try{child.kill()}catch(e){}process.exit(pass?0:1)})().catch(e=>{console.log('ERR',e.message);process.exit(1)});

