"""现场取证: 直接读两端页面的球/物理/角色状态(不重开对局)。"""
import json
import sys
sys.path.insert(0, r'E:\LayaProject\tool\webpub')
from DrissionPage import ChromiumPage

ADDR = '127.0.0.1:9227'
KEYS = {'A': '127.0.0.1:8123', 'B': 'localhost:8123'}

CODE = r"""
var g = window.__qaStore && window.__qaStore.game;
if (!g) return 'NO_GAME';
var mag = g.mag, ball = mag.ball, phy = ball.phy, st = phy.state;
var out = {
  me: String(GNETID), amAuth: mag._amAuth, authId: mag._currentAuthId,
  phase: mag.phase, isPvpMode: mag.isPvpMode, isAuthoritative: mag.isAuthoritative,
  ballNode: [ball.x, ball.y, ball.z].map(function(v){return Math.round(v*1000)/1000;}),
  phyState: {px: st.px, py: st.py, pz: st.pz, vx: st.vx, vy: st.vy, vz: st.vz, time: st.time},
  pos: st.pos ? [st.pos.x, st.pos.y, st.pos.z].map(function(v){return Math.round(v*1000)/1000;}) : null,
  vel: st.vel ? [st.vel.x, st.vel.y, st.vel.vel ? st.vel.z : st.vel.z].map(function(v){return Math.round(v*1000)/1000;}) : null,
  isCalc: phy.isCalc, isSleeping: phy.isSleeping,
  lastLocalHitAt: mag._lastLocalHitAt, now: mag.rule ? 0 : 0,
  authBallHolderId: mag.authBallHolderId,
  players: mag.players.map(function(p){ return {id:p.id, isP:!!p.isP, x:Math.round(p.x*100)/100, z:Math.round(p.z*100)/100, side:p.side}; }),
  currentServerId: mag.currentServer ? mag.currentServer.id : -1,
  holderNodePos: (function(){ for (var i=0;i<mag.players.length;i++){ var p=mag.players[i]; if (p.isP && p.ballHolderNode) { var w=p.ballHolderNode.transform.worldMatrix; return [w.elements[12],w.elements[13],w.elements[14]].map(function(v){return Math.round(v*1000)/1000;}); } } return null; })(),
  cached: (function(){ var s = mag._cachedGlobalStatus; if (!s) return null; return {phase:s.phase, serveRemain:s.serveRemainMs, cdRemain:s.cdRemainMs, holder:s.ballHolderChaId, assigned:s.isBallAssigned, t:s.time, at: mag._cachedGlobalStatusAt}; })(),
  cd: g.ui ? g.ui._cd : null
};
return JSON.stringify(out);
"""

p = ChromiumPage(ADDR)
pages = {}
for tid in p.tab_ids:
    t = p.get_tab(tid)
    u = t.url or ''
    for tag, k in KEYS.items():
        if k in u:
            pages[tag] = t
for tag in ('A', 'B'):
    if tag not in pages:
        print(tag, 'NO TAB')
        continue
    gid = pages[tag].run_js('return String(window.__qaStore && 1);')
    js = "var GNETID=(window.__qaStateMe||'x');" + CODE
    r = pages[tag].run_js(js)
    print('=====', tag, '=====')
    try:
        print(json.dumps(json.loads(r), indent=1, ensure_ascii=False))
    except Exception:
        print(str(r)[:2000])
