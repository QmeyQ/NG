const {CodexBridge}=require('../../server/re/codex.js');
const c=new CodexBridge({log:()=>{}});
(async()=>{
  const r=await c.ideItemsLive('01a1e104-2412-7060-8f8e-dd72c6540f08',80);
  const d=r.data||[];
  const hits=d.filter(e=>String(e.item.command||'').includes('UNIQ-MARK-7742'));
  console.log('hits:',hits.length);
  hits.forEach(e=>console.log(' id:',e.item.id,'status:',e.item.status,'exit:',e.item.exitCode,'completedAtMs:',e.completedAtMs,'turn:',e.turnId));
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
