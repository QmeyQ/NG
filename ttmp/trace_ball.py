"""现场取证 2: 在非权威端 A 打补丁记录 _correctBall 的每一条判定, 驱动 10s 后回读。"""
import json, sys, time
sys.path.insert(0, r'E:\LayaProject\tool\webpub')
from DrissionPage import ChromiumPage
ADDR='127.0.0.1:8123'; KEYS={'A':'127.0.0.1:8123','B':'localhost:8123'}
p=ChromiumPage('127.0.0.1:9227'); pages={}
for tid in p.tab_ids:
    t=p.get_tab(tid); u=t.url or ''
    for tag,k in KEYS.items():
        if k in u: pages[tag]=t

PATCH = r"""
var g=window.__qaStore.game, mag=g.mag;
if (mag.__tr) return 'ALREADY';
window.__tr=[]; mag.__tr=window.__tr;
var P=Object.getPrototypeOf(mag);
var oc=P._correctBall;
mag._correctBall=function(raw,bt,bc){
  var Proto=window.__pvpProto;
  var st=mag.ball.phy.state;
  var pos=[st.pos.x,st.pos.y,st.pos.z].map(function(v){return Math.round(v*100)/100;});
  var snapPos=raw?[Math.round(raw[0]/1024*100)/100,Math.round(raw[1]/1024*100)/100,Math.round(raw[2]/1024*100)/100]:null;
  var d=snapPos?Math.round(Math.sqrt(Math.pow(pos[0]-snapPos[0],2)+Math.pow(pos[1]-snapPos[1],2)+Math.pow(pos[2]-snapPos[2],2))*100)/100:-1;
  window.__tr.push({k:'cb',t:Date.now()%100000,err:d,holder:mag.authBallHolderId,bc:bc,
    grace:Date.now()-mag._lastLocalHitAt<500?1:0,mine:pos,auth:snapPos,calc:mag.ball.phy.isCalc});
  if (window.__tr.length>400) window.__tr.splice(0,200);
  return oc.call(mag,raw,bt,bc);
};
var oa=P._applyHitEvents;
mag._applyHitEvents=function(ev,s){ window.__tr.push({k:'he',t:Date.now()%100000,n:ev?ev.length:-1}); return oa.call(mag,ev,s); };
var os=g.ctrl?null:null;
var oSync=P.syncAction;
mag.syncAction=function(o){ if(o&&o.type==='hit') window.__tr.push({k:'myHit',t:Date.now()%100000,auth:mag._amAuth}); return oSync.call(mag,o); };
var ohit=mag.ball.hitAt.bind(mag.ball);
mag.ball.hitAt=function(){ var st=mag.ball.phy.state; window.__tr.push({k:'hitAt',t:Date.now()%100000,stTime:Math.round(st.time),now:Date.now(),pos:[Math.round(st.pos.x*100)/100,Math.round(st.pos.y*100)/100,Math.round(st.pos.z*100)/100]}); return ohit.apply(null,arguments); };
return 'PATCHED';
"""
print('patch A:', pages['A'].run_js(PATCH))

def qa(tag, call): return pages[tag].run_js('return String(__qa.'+call+');')
t0=time.time()
i=0
while time.time()-t0 < 10:
    i+=1
    for tag in ('A','B'):
        try:
            if i%6==1: qa(tag,'serve()')
            elif i%3==0: qa(tag,'hit()')
            else: qa(tag,'moveTo(%d,%d)'%((i*37)%360-180,60))
        except Exception as e: print('cmd err',e)
    time.sleep(0.4)

TR = r"""
var g=window.__qaStore.game, mag=g.mag, st=mag.ball.phy.state;
var a={ball:[Math.round(g.ballO.pos.x*100)/100,Math.round(g.ballO.pos.y*100)/100,Math.round(g.ballO.pos.z*100)/100],
     calc:mag.ball.phy.isCalc, holder:mag.authBallHolderId, phase:mag.phase, amAuth:mag._amAuth,
     tr:(window.__tr||[]).slice(-120)};
return JSON.stringify(a);
"""
A=json.loads(pages['A'].run_js(TR))
B=json.loads(pages['B'].run_js(TR.replace('window.__tr||[]','[]')))
print('A ball',A['ball'],'calc',A['calc'],'holder',A['holder'],'phase',A['phase'])
print('B ball',B['ball'],'calc',B['calc'],'holder',B['holder'],'phase',B['phase'])
for e in A['tr']:
    print(json.dumps(e,ensure_ascii=False))
