'use strict';
// chatpage_layout.cjs — 新布局: brand状态色/点击跳配置/无上边栏/模型选择可见(含竖屏)/无会话id
const cp=require('child_process'),path=require('path');
const {getJson,Page,sleep}=require('../../local/cdpkit.cjs');
const port=9280,prof=path.join(__dirname,'edge-ly-'+Date.now());
const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PEER='ide:01a1e104-2412-7060-8f8e-dd72c6540f08';
(async()=>{
  const child=cp.spawn(edge,['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port='+port,'--user-data-dir='+prof,'--window-size=1400,900','about:blank'],{windowsHide:true,stdio:'ignore'});
  let tabs=null;for(let i=0;i<30;i++){await sleep(400);try{tabs=await getJson('http://127.0.0.1:'+port+'/json/list');if(tabs&&tabs.length)break}catch(e){}}
  const pg=tabs.find(x=>x.type==='page');
  const p=await new Page(pg.webSocketDebuggerUrl).open();
  await p.send('Page.navigate',{url:'https://normalgame.cn/chat?token=cx-9&cb='+Date.now()});
  await sleep(5000);
  await p.ev("(()=>{const b=document.getElementById('tokenLater');if(b)b.click();return true})()").catch(()=>{});
  await sleep(2000);
  await p.ev(`(()=>{const e=[...document.querySelectorAll('.conv')].find(x=>x.dataset.id==='${PEER}');if(e)e.click();return !!e})()`);
  await sleep(3500);
  const wide=JSON.parse(await p.ev(`(()=>JSON.stringify({
    topBar:!!document.querySelector('.top'),
    brand:!!document.getElementById('brandBtn'),
    brandHref:document.getElementById('brandBtn')?document.getElementById('brandBtn').getAttribute('href'):'',
    brandOk:document.getElementById('brandBtn')?document.getElementById('brandBtn').className:'',
    brandBg:document.getElementById('brandBtn')?getComputedStyle(document.getElementById('brandBtn')).backgroundColor:'',
    sub:document.getElementById('chatSub').textContent,
    modelSelVisible:(()=>{const m=document.getElementById('model');return m?m.offsetParent!==null:false})(),
    modelSelW:(()=>{const m=document.getElementById('model');return m?Math.round(m.getBoundingClientRect().width):0})(),
    hintText:document.querySelector('.composer .hint').textContent.trim(),
    newChatBtn:!!document.getElementById('newChat')
  }))()`));
  console.log('宽屏:',JSON.stringify(wide));
  // 竖屏: 420px 窗口模型选择必须可见
  await p.send('Emulation.setDeviceMetricsOverride',{width:420,height:900,deviceScaleFactor:1,mobile:false});
  await sleep(600);
  const narrow=JSON.parse(await p.ev(`(()=>JSON.stringify({
    modelSelVisible:(()=>{const m=document.getElementById('model');return m?m.offsetParent!==null:false})(),
    modelSelW:(()=>{const m=document.getElementById('model');return m?Math.round(m.getBoundingClientRect().width):0})(),
    brandVisible:(()=>{const b=document.getElementById('brandBtn');return b?b.offsetParent!==null:false})(),
    chatHeadH:document.querySelector('.chat-head').offsetHeight
  }))()`));
  console.log('竖屏420px:',JSON.stringify(narrow));
  // brand 点击跳转 /codex
  await p.send('Emulation.clearDeviceMetricsOverride');
  await sleep(300);
  await p.ev("(()=>{document.getElementById('brandBtn').click();return true})()");
  await sleep(2500);
  const nav=await p.ev("(()=>location.pathname)()");
  console.log('点击brand后路径:',nav);
  const pass=!wide.topBar&&wide.brand&&wide.brandHref==='/codex'&&wide.brandOk.includes('ok')&&!wide.sub.includes('ide:')&&!wide.hintText.includes('会话:')&&wide.modelSelVisible&&narrow.modelSelVisible&&narrow.modelSelW>60&&nav.includes('codex');
  console.log(pass?'PASS':'FAIL');
  try{child.kill()}catch(e){}
  process.exit(pass?0:1);
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
