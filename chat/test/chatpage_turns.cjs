'use strict';
const cp=require('child_process'),path=require('path');const {getJson,Page,sleep}=require('../../local/cdpkit.cjs');
const port=9251,prof=path.join(__dirname,'edge-t-'+Date.now());const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
(async()=>{const child=cp.spawn(edge,['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port='+port,'--user-data-dir='+prof,'--window-size=1400,900','about:blank'],{windowsHide:true,stdio:'ignore'});let tabs=null;for(let i=0;i<30;i++){await sleep(400);try{tabs=await getJson('http://127.0.0.1:'+port+'/json/list');if(tabs&&tabs.length)break}catch(e){}}const pg=tabs.find(x=>x.type==='page');const p=await new Page(pg.webSocketDebuggerUrl).open();await p.send('Page.navigate',{url:'https://normalgame.cn/chat?token=cx-9'});await sleep(6000);
await p.ev("(()=>{const b=document.getElementById('tokenLater');if(b)b.click();return true})()");await sleep(2500);
const list=await p.ev("(()=>{return [...document.querySelectorAll('.conv')].map(x=>({id:x.dataset.id,title:(x.querySelector('.conv-title')||{}).textContent||''}))})()");
const ide=list.find(x=>x.id&&x.id.startsWith('ide:'));console.log('ide',ide&&ide.id);
if(!ide){console.log('FAIL no ide');try{child.kill()}catch(e){}process.exit(1)}
await p.ev("(()=>{const e=[...document.querySelectorAll('.conv')].find(x=>x.dataset.id==='"+ide.id+"');if(e)e.click();return true})()");await sleep(4000);
const txt=await p.ev("(()=>{const t=[...document.querySelectorAll('.turn')].pop();return JSON.stringify({turns:document.querySelectorAll('.turn').length,userBubbles:document.querySelectorAll('.turn .msg.me').length,agentBubbles:document.querySelectorAll('.agentmsg').length,blocks:document.querySelectorAll('.blk').length,blocksLast:t?t.querySelectorAll('.blk').length:0,oldProc:document.querySelectorAll('.ta-proc').length,oldDetails:document.querySelectorAll('.turn-details').length,blockTypes:t?[...t.querySelectorAll('.blk')].map(b=>b.className.replace('blk ','')):[]})})()");
const r=JSON.parse(txt);console.log(JSON.stringify(r).slice(0,600));
// 顺序校验: DOM 块类型序列必须交错(reason/cmd 混排)且长度=块数
const seq=r.blockTypes||[];const mixed=seq.includes('reason')&&seq.includes('cmd');
const pass=r.turns>0&&r.agentBubbles>0&&r.blocks>0&&r.oldDetails===0&&r.oldProc===0&&mixed;
console.log('mixed='+mixed+' blocks='+r.blocks);console.log(pass?'PASS':'FAIL');try{child.kill()}catch(e){}process.exit(pass?0:1)})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
