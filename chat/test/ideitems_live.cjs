const {CodexBridge}=require('../../server/re/codex.js');
const c=new CodexBridge({log:()=>{}});
(async()=>{
  const r=await c.ideItemsLive('01a1e104-2412-7060-8f8e-dd72c6540f08',50);
  const d=r.data||[];
  console.log('live total',r.total,'returned',d.length);
  // find running command
  const run=d.filter(e=>e.item.type==='commandExecution'&&e.item.status==='running');
  console.log('running items:',run.length);
  run.slice(0,2).forEach(e=>{console.log('RUN:',e.item.id,e.item.command.slice(0,80),'turn',e.turnId)});
  // find LOCAL-LIVE-15 specifically
  const live=d.find(e=>String(e.item.command||'').includes('LOCAL-LIVE-15'));
  console.log('LOCAL-LIVE-15 present:',!!live,'status:',live&&live.item.status);
  // type distribution + first 6 newest
  const cnt={};d.forEach(e=>cnt[e.item.type]=(cnt[e.item.type]||0)+1);
  console.log('types:',JSON.stringify(cnt));
  d.slice(0,6).forEach(e=>console.log(' -',e.item.type,'|',(e.item.command||e.item.text||'').toString().slice(0,60),'|',e.item.status||''));
  // sanity: check turn groups
  const turns={};d.forEach(e=>turns[e.turnId]=(turns[e.turnId]||0)+1);
  console.log('turn groups:',Object.keys(turns).length);
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});

