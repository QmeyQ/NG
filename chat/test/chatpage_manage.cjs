'use strict';
const cp=require('child_process'),path=require('path');const {getJson,Page,sleep}=require('../../local/cdpkit.cjs');
const port=9247,prof=path.join(__dirname,'edge-mg-'+Date.now());const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
(async()=>{const child=cp.spawn(edge,['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port='+port,'--user-data-dir='+prof,'--window-size=1400,900','about:blank'],{windowsHide:true,stdio:'ignore'});let tabs=null;for(let i=0;i<30;i++){await sleep(400);try{tabs=await getJson('http://127.0.0.1:'+port+'/json/list');if(tabs&&tabs.length)break}catch(e){}}const pg=tabs.find(x=>x.type==='page');const p=await new Page(pg.webSocketDebuggerUrl).open();await p.send('Page.navigate',{url:'https://normalgame.cn/chat'});await sleep(6000);
await p.ev(`(()=>{const b=document.getElementById('tokenLater');if(b)b.click();return true})()`);await sleep(2000);
const r=await p.ev(`(()=>{const e=[...document.querySelectorAll('.conv')].find(x=>x.dataset.id&&x.dataset.id.startsWith('ide:'));if(!e)return 'NO_IDE';e.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true}));return e.dataset.id})()`);
console.log('dbl',r);await sleep(1000);
const st=await p.ev(`(()=>({show:document.getElementById('manageDlg').classList.contains('show'),title:document.getElementById('mTitle').textContent,id:document.getElementById('mId').textContent,kind:document.getElementById('mKind').textContent}))()`);
console.log(JSON.stringify(st));const pass=st.show&&String(st.id).startsWith('ide:');console.log(pass?'PASS':'FAIL');try{child.kill()}catch(e){}process.exit(pass?0:1)})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
