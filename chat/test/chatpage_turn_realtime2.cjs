'use strict';
// chatpage_turn_realtime2.cjs — 端到端实时验证: 页面就绪后外部会话执行带 MARKER 的 10s 命令,
// 页面应先显示"执行中"(1-2s内) 再翻转为"完成"(~10s), 全程无任何手动刷新。
const cp=require('child_process'),path=require('path');
const {getJson,Page,sleep}=require('../../local/cdpkit.cjs');
const MARKER=(process.argv[2]||('RT-'+Date.now()))+'-SLEEP';
const port=9257,prof=path.join(__dirname,'edge-rt2-'+Date.now());
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
  const clicked=await p.ev(`(()=>{const e=[...document.querySelectorAll('.conv')].find(x=>x.dataset.id==='${PEER}');if(e)e.click();return !!e})()`);
  if(!clicked){console.log('NO_CONV');process.exit(2)}
  await sleep(4000);
  console.log('READY '+MARKER);
  let sawRunning=false,sawDone=false,sawAppear=false,t0=Date.now();
  while(Date.now()-t0<40000){
    const r=await p.ev(`(()=>{
      const blocks=[...document.querySelectorAll('.blk')];
      const m=blocks.find(x=>((x.querySelector('.cmdline')||{}).textContent||'').includes('${MARKER}'));
      const turn=document.querySelector('.turn');
      return JSON.stringify({blocks:blocks.length,turnRunning:turn?turn.className.includes('running'):false,
        marker:m?{status:(m.querySelector('.item-status')||{}).textContent||'',body:(((m.querySelector('.cmdline')||m.querySelector('.blk-body'))||{}).textContent||'').slice(0,40)}:null});
    })()`).catch(()=>null);
    if(r){
      const j=JSON.parse(r);
      if(j.marker){
        sawAppear=true;
        const st=String(j.marker.status||'');
        if(st.includes('执行中'))sawRunning=true;
        if(st.includes('完成')||st.includes('失败'))sawDone=true;
        console.log('t+'+((Date.now()-t0)/1000).toFixed(1)+'s marker='+JSON.stringify(j.marker));
      }else{
        console.log('t+'+((Date.now()-t0)/1000).toFixed(1)+'s no-marker blocks='+j.blocks+' turnRunning='+j.turnRunning);
      }
    }
    if(sawRunning&&sawDone)break;
    await sleep(1500);
  }
  console.log('RESULT appear='+sawAppear+' running='+sawRunning+' done='+sawDone);
  console.log((sawAppear&&sawRunning&&sawDone)?'PASS':'FAIL');
  try{child.kill()}catch(e){}
  process.exit((sawAppear&&sawRunning&&sawDone)?0:1);
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});

