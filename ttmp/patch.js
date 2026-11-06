var g=window.__qaStore.game, mag=g.mag;
window.__tr=[];
var P=Object.getPrototypeOf(mag);
if (!mag.__origCb) mag.__origCb=P._correctBall;
mag._correctBall=function(raw,bt,bc){
  var st=mag.ball.phy.state;
  var pos=[st.pos.x,st.pos.y,st.pos.z].map(function(v){return Math.round(v*100)/100;});
  var snapPos=raw?[Math.round(raw[0]/1024*100)/100,Math.round(raw[1]/1024*100)/100,Math.round(raw[2]/1024*100)/100]:null;
  var d=snapPos?Math.round(Math.sqrt(Math.pow(pos[0]-snapPos[0],2)+Math.pow(pos[1]-snapPos[1],2)+Math.pow(pos[2]-snapPos[2],2))*100)/100:-1;
  window.__tr.push({k:'cb',t:Date.now()%100000,err:d,holder:mag.authBallHolderId,bc:bc,
    grace:Date.now()-mag._lastLocalHitAt<500?1:0,mine:pos,auth:snapPos,calc:mag.ball.phy.isCalc});
  if (window.__tr.length>3000) window.__tr.splice(0,1500);
  return mag.__origCb.call(mag,raw,bt,bc);
};
var oa=P._applyHitEvents;
mag._applyHitEvents=function(ev,s){ var e=window.__tr[window.__tr.length-1]; if(e&&e.k==='cb')e.he=ev?ev.length:-1; return oa.call(mag,ev,s); };
var oSync=P.syncAction;
mag.syncAction=function(o){ if(o&&o.type==='hit') window.__tr.push({k:'myHit',t:Date.now()%100000,auth:mag._amAuth}); return oSync.call(mag,o); };
var ohit=mag.ball.hitAt.bind(mag.ball);
mag.ball.hitAt=function(p,aH,aV,spi,id,t,bp){
  var st=mag.ball.phy.state;
  window.__tr.push({k:'hitAt',t:Date.now()%100000,stTime:Math.round(st.time-Date.now()+ (window.__t0||0)),lag:Math.round(Date.now()-st.time),
    pos:[Math.round(st.pos.x*100)/100,Math.round(st.pos.y*100)/100,Math.round(st.pos.z*100)/100],
    t:t?Math.round(Date.now()-t):-1, power:p, angH:aH, angV:aV});
  return ohit(p,aH,aV,spi,id,t,bp);
};
'PATCHED2'
