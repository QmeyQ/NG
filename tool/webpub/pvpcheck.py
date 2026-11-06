"""PVP 两端一致性体检: 比分文本对比 + 球位偏差统计 + 权威端翻转计数。

用法: PYTHONIOENCODING=utf-8 python tool/webpub/pvpcheck.py [采样秒数=20]
"""
import bisect
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gclient import tab_of  # noqa: E402

# 控制台捕获: CDP 注入在页面重载后失效, 每次体检开始前先手工补装一次
WRAP = """
window.__logs = window.__logs || [];
if (!window.__wrapped) {
  window.__wrapped = true;
  ['log','warn','error','info'].forEach(function(k){
    var o = console[k].bind(console);
    console[k] = function(){
      var s = [].slice.call(arguments).map(function(x){
        if (typeof x === 'object') { try { return JSON.stringify(x).slice(0,200); } catch(e){ return String(x); } }
        return String(x).slice(0,200);
      }).join(' ');
      window.__logs.push(k+': '+s);
      if (window.__logs.length > 900) window.__logs.splice(0, 400);
      o.apply(null, arguments);
    };
  });
}
return 'wrapped ' + window.__logs.length;
"""


def as_list(v):
    return json.loads(v) if isinstance(v, str) else (v or [])

TEXTS = """
var out=[];
function w(n,d){ if(!n||d>25) return;
  var t = (n.text!==undefined && n.text!==null && String(n.text)!=='') ? String(n.text) :
          (n.title!==undefined && n.title!==null && String(n.title)!=='') ? String(n.title) : null;
  if (t && t.length<40) out.push((n.name||'-')+'='+t.replace(/\\s+/g,'/'));
  var c=n.numChildren||0; for(var i=0;i<c;i++) w(n.getChildAt(i),d+1);
}
w(Laya.stage,0);
return JSON.stringify(out);
"""

BALL = """
var byName=function(root,name){ if(!root) return null; if(root.name===name) return root;
  var c=root.numChildren||0; for(var i=0;i<c;i++){ var r=byName(root.getChildAt(i),name); if(r) return r; } return null; };
window.__ball=[];
if (!window.__ballTimer) window.__ballTimer = setInterval(function(){
  var n=byName(Laya.stage,'Shuttlecock.001');
  if (n && n.transform && n.transform.position){ var p=n.transform.position;
    window.__ball.push([Date.now(), Math.round(p.x*1000)/1000, Math.round(p.y*1000)/1000, Math.round(p.z*1000)/1000]); }
}, 100);
return 'reset+on';
"""

PULL = "return JSON.stringify(window.__ball||[]);"

WATCH = """
var byName=function(root,name){ if(!root) return null; if(root.name===name) return root;
  var c=root.numChildren||0; for(var i=0;i<c;i++){ var r=byName(root.getChildAt(i),name); if(r) return r; } return null; };
var gs=byName(Laya.stage,'gameShow');
var sh=byName(Laya.stage,'Shuttlecock.001');
var p = sh && sh.transform ? sh.transform.position : null;
return JSON.stringify({t:Date.now(), hud: gs?String(gs.text||'').replace(/<[^>]*>/g,''):'', ball: p?[Math.round(p.x*100)/100,Math.round(p.y*100)/100,Math.round(p.z*100)/100]:null});
"""

LOGS = """
var L=window.__logs||[];
var cnt={};
L.forEach(function(x){
  ['已成为权威端','本地降级为非权威端','权威端失联','收到','提案确认超时','全员确认','丢弃击球事件','恢复快照','离开房间','进入房间']
  .forEach(function(k){ if(x.indexOf(k)>=0) cnt[k]=(cnt[k]||0)+1; });
});
var authTail=L.filter(function(x){return /权威|auth_declare|降级|失联/.test(x)}).slice(-6);
var reject=L.filter(function(x){return /丢弃击球|Sync\\]/.test(x)}).slice(-6);
return JSON.stringify({counts:cnt, total:L.length, authTail:authTail, syncTail:reject});
"""


def main():
    secs = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    A = tab_of('A')
    B = tab_of('B')

    for t in (A, B):
        t.run_js(WRAP)

    # 实时对比: 每 4s 取一次两端 HUD + 球位(能直接看出是"卡在同一状态"还是"数值在漂")
    print('--- 每 4s 对比 HUD 与球位 (%ds) ---' % secs)
    for _ in range(max(1, secs // 4)):
        time.sleep(4)
        wa = json.loads(A.run_js(WATCH))
        wb = json.loads(B.run_js(WATCH))
        d = None
        if wa['ball'] and wb['ball']:
            d = round(sum((x - y) ** 2 for x, y in zip(wa['ball'], wb['ball'])) ** 0.5, 2)
        print('  A %-22s ball=%s | B %-22s ball=%s | 偏差=%s'
              % (wa['hud'][:22], wa['ball'], wb['hud'][:22], wb['ball'], d))

    ta = json.loads(A.run_js(TEXTS) or '[]')
    tb = json.loads(B.run_js(TEXTS) or '[]')
    print('--- A 界面文本 ---')
    print(json.dumps(ta[:24], ensure_ascii=False))
    print('--- B 界面文本 ---')
    print(json.dumps(tb[:24], ensure_ascii=False))

    print('--- 权威/同步计数 ---')
    for tag, t in (('A', A), ('B', B)):
        print(tag, (t.run_js(LOGS) or '')[:1300])

    A.run_js(BALL)
    B.run_js(BALL)
    print('--- 球位采样 %ds ---' % secs)
    time.sleep(secs)
    sa = as_list(A.run_js(PULL))
    sb = as_list(B.run_js(PULL))
    print('样本 A=%d B=%d' % (len(sa), len(sb)))
    if not sa or not sb:
        print('至少一端没采到球位(可能不在对局场景)')
        return
    tb_ts = [x[0] for x in sb]
    errs = []
    pairs = []
    for s in sa:
        i = bisect.bisect_left(tb_ts, s[0])
        cands = [sb[j] for j in (i - 1, i) if 0 <= j < len(sb)]
        if not cands:
            continue
        b = min(cands, key=lambda x: abs(x[0] - s[0]))
        if abs(b[0] - s[0]) > 120:
            continue
        d = ((s[1] - b[1]) ** 2 + (s[2] - b[2]) ** 2 + (s[3] - b[3]) ** 2) ** 0.5
        errs.append(d)
        pairs.append((s[0], round(d, 2), [s[1], s[2], s[3]], [b[1], b[2], b[3]]))
    errs.sort()
    if errs:
        print('偏差 m: min=%.3f median=%.3f p90=%.3f max=%.3f n=%d'
              % (errs[0], errs[len(errs) // 2], errs[int(len(errs) * 0.9)], errs[-1], len(errs)))
        print('>1m 样本占比: %.0f%%' % (100.0 * len([e for e in errs if e > 1]) / len(errs)))
        pairs.sort(key=lambda p: -p[1])
        print('最差 5 组 (t, 偏差, A坐标, B坐标):')
        for p in pairs[:5]:
            print('  ', p)


if __name__ == '__main__':
    main()
