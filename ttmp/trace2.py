"""现场取证 3: 只在"球在手上/大偏差"窗口取证, 打印 err>1m 的判定链。"""
import json, sys, time
sys.path.insert(0, r'E:\LayaProject\tool\webpub')
from DrissionPage import ChromiumPage
KEYS={'A':'127.0.0.1:8123','B':'localhost:8123'}
p=ChromiumPage('127.0.0.1:9227'); pages={}
for tid in p.tab_ids:
    t=p.get_tab(tid); u=t.url or ''
    for tag,k in KEYS.items():
        if k in u: pages[tag]=t

# 重新装补丁(把窗口放大到 2000 条并清历史)
PATCH = open(r'E:\LayaProject\ttmp\patch.js', encoding='utf-8').read()
print('patch A:', pages['A'].run_js(PATCH))

def qa(tag, call): return pages[tag].run_js('return String(__qa.'+call+');')
t0=time.time(); i=0
while time.time()-t0 < 25:
    i+=1
    for tag in ('A','B'):
        try:
            if i%6==1: qa(tag,'serve()')
            elif i%3==0: qa(tag,'hit()')
            else: qa(tag,'moveTo(%d,%d)'%((i*37)%360-180,60))
        except Exception as e: print('cmd err',e)
    time.sleep(0.4)

DUMP = r"""
var g=window.__qaStore.game, mag=g.mag;
var tr=(window.__tr||[]);
var bad=tr.filter(function(e){return e.k==='cb'&&e.err>1;});
return JSON.stringify({
  total: tr.length, cb: tr.filter(function(e){return e.k==='cb';}).length,
  bad: bad.length, maxErr: bad.length?Math.max.apply(null,bad.map(function(e){return e.err;})):0,
  hitAt: tr.filter(function(e){return e.k==='hitAt';}).slice(0,8),
  myHit: tr.filter(function(e){return e.k==='myHit';}).length,
  firstBad: bad.slice(0,6), lastBad: bad.slice(-3),
  now:{ball:[Math.round(g.ballO.pos.x*100)/100,Math.round(g.ballO.pos.y*100)/100,Math.round(g.ballO.pos.z*100)/100],
       holder:mag.authBallHolderId, calc:mag.ball.phy.isCalc, phase:mag.phase}
});
"""
print('A:', pages['A'].run_js(DUMP))
print('B:', pages['B'].run_js(DUMP.replace('window.__tr||[]','[]')))
