"""两端 Timer.now() 与墙钟的偏差: 后台页 rAF 被节流会让 Timer 永久落后(Date.now 差值被 5s 跳变上限吃掉)。"""
import json, sys
sys.path.insert(0, r'E:\LayaProject\tool\webpub')
from DrissionPage import ChromiumPage
ADDR='127.0.0.1:9227'; KEYS={'A':'127.0.0.1:8123','B':'localhost:8123'}
p=ChromiumPage(ADDR); pages={}
for tid in p.tab_ids:
    t=p.get_tab(tid); u=t.url or ''
    for tag,k in KEYS.items():
        if k in u: pages[tag]=t
CODE=r"""
var g=window.__qaStore.game, mag=g.mag;
return JSON.stringify({
  wall: Date.now(),
  statusAt: mag._cachedGlobalStatusAt,
  lastLocalHitAt: mag._lastLocalHitAt,
  ballStateTime: mag.ball.phy.state.time,
  visible: document.visibilityState, hidden: document.hidden,
  scores: mag.scores, phase: mag.phase
});
"""
for tag in ('A','B'):
    print(tag, pages[tag].run_js(CODE))
