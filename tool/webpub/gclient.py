"""双开游戏客户端做联机实测: 注入 console 捕获 -> 驱动 Laya UI 点击 -> 回读日志。

两个 tab 用不同 origin(127.0.0.1 / localhost)→ IndexedDB 与 localStorage 天然隔离,
各自注册独立账号(GOBE openId 不同), 才能真正匹配到一起。

用法:
  PYTHONIOENCODING=utf-8 python tool/webpub/gclient.py start A http://127.0.0.1:8123/index.html
  PYTHONIOENCODING=utf-8 python tool/webpub/gclient.py start B http://localhost:8123/index.html
  PYTHONIOENCODING=utf-8 python tool/webpub/gclient.py logs A
  PYTHONIOENCODING=utf-8 python tool/webpub/gclient.py tree A [深度]
  PYTHONIOENCODING=utf-8 python tool/webpub/gclient.py click A gList
  PYTHONIOENCODING=utf-8 python tool/webpub/gclient.py eval A '<js>'
"""
import json
import sys
import time
from DrissionPage import ChromiumPage

ADDR = '127.0.0.1:9227'
# tag -> url 特征串(不同 origin, 存储互相隔离)
ORIGIN = {'A': '127.0.0.1:8123', 'B': 'localhost:8123'}

CAPTURE = """
window.__logs = [];
(function(){
  function rec(kind, a){
    try{
      var s = [].slice.call(a).map(function(x){
        if (x instanceof Error) return x.message;
        if (typeof x === 'object') { try { return JSON.stringify(x).slice(0,300); } catch(e){ return String(x); } }
        return String(x).slice(0,300);
      }).join(' ');
      window.__logs.push(kind + ': ' + s);
      if (window.__logs.length > 600) window.__logs.splice(0, window.__logs.length - 600);
    }catch(e){}
  }
  ['log','warn','error','info'].forEach(function(k){
    var o = console[k].bind(console);
    console[k] = function(){ rec(k, arguments); o.apply(null, arguments); };
  });
  window.addEventListener('error', function(e){ rec('pageerror', [e.message]); });
  window.addEventListener('unhandledrejection', function(e){ rec('reject', [e.reason && e.reason.message || e.reason]); });
})();
"""

FIND = """
function findByName(root, name, depth){
  if (!root || depth > 14) return null;
  if (root.name === name && !root.destroyed) return root;
  var n = root.numChildren || 0;
  for (var i = 0; i < n; i++){
    var r = findByName(root.getChildAt(i), name, depth + 1);
    if (r) return r;
  }
  return null;
}
function findByLabel(root, label, depth){
  if (!root || depth > 16) return null;
  var s = String(root.title === undefined ? '' : root.title) + '|' + String(root.text === undefined ? '' : root.text);
  if (s.indexOf('|') >= 0 && (String(root.title||'') === label || String(root.text||'') === label)) return root;
  var n = root.numChildren || 0;
  for (var i = 0; i < n; i++){
    var r = findByLabel(root.getChildAt(i), label, depth + 1);
    if (r) return r;
  }
  return null;
}
// 事件真正绑在按钮上(GTextField 只是标题): 自己没监听就沿父链找第一个有 click 监听的祖先
function fireClick(n){
  if (!n) return 'NULL';
  var c = n, hops = 0;
  while (c && hops < 6){
    if (c.hasListener && c.hasListener('click')) break;
    c = c.parent; hops++;
  }
  var target = c || n;
  var ev = {type:'click', target:target, currentTarget:target, srcEvent:null, stopPropagation:function(){}, touchId:0};
  target.event('click', ev);
  return 'fired name=' + (target.name||'-') + ' cls=' + (target.constructor && target.constructor.name) + ' hops=' + hops;
}
"""


def tab_of(tag):
    p = ChromiumPage(ADDR)
    key = ORIGIN.get(tag, tag)
    for tid in p.tab_ids:
        t = p.get_tab(tid)
        if key in (t.url or ''):
            return t
    raise SystemExit('找不到 tab(tag=%s, 特征=%s)' % (tag, key))


def js_logs(sep):
    return """
var n = window.__seen || 0;
var L = window.__logs || [];
window.__seen = L.length;
return JSON.stringify(L.slice(n).join('\\n%s'));
""" % sep


LOCATE = FIND + """
var sel = arguments_sel;
var kind = sel.indexOf('label:') === 0 ? 'label' : 'name';
var val = kind === 'label' ? sel.slice(6) : sel.replace(/^name:/, '');
var roots = [Laya.stage, (Laya.GRoot && Laya.GRoot.inst) || null];
var n = null;
for (var i = 0; i < roots.length && !n; i++) {
  n = kind === 'name' ? findByName(roots[i], val, 0) : findByLabel(roots[i], val, 0);
}
if (!n) return JSON.stringify({err: 'NOTFOUND ' + sel});
// Laya3 的 localToGlobal 在运行时返回 0(不可用), 自己沿父链累加 x/y 与缩放算全局坐标
var anc = [], c = n;
while (c && c !== Laya.stage) { anc.push(c); c = c.parent; }
var x = 0, y = 0, s = 1;
for (var i = anc.length - 1; i >= 0; i--) {
  var a = anc[i];
  x += (a.x || 0) * s;
  y += (a.y || 0) * s;
  s *= (a.scaleX || 1);
}
var cv = document.querySelector('canvas');
var r = cv.getBoundingClientRect();
var sx = r.width / Laya.stage.width, sy = r.height / Laya.stage.height;
var cx = x + ((n.width || 0) * arguments_frac - (n.pivotX || 0)) * s;
var cy = y + ((n.height || 0) / 2 - (n.pivotY || 0)) * s;
return JSON.stringify({
  name: n.name || '-', cls: (n.constructor && n.constructor.name) || '?',
  x: Math.round((r.left + cx * sx) * 10) / 10, y: Math.round((r.top + cy * sy) * 10) / 10,
  vis: n.visible !== false, alpha: n.alpha, w: n.width, h: n.height, scale: Math.round(s * 100) / 100
});
"""


def locate(t, sel, frac=0.5):
    return json.loads(t.run_js(LOCATE.replace('arguments_sel', json.dumps(sel))
                               .replace('arguments_frac', str(float(frac)))))


def real_click(t, sel, frac=0.5):
    """按节点名/标题算出屏幕坐标, 用 CDP 真鼠标点击(合成 event 不会翻转 Check 按钮, 也过不了引擎的点击链)
    frac: 命中节点宽度的百分比位置(默认中心; 带富文本链接的按钮可点左侧避免打在链接上)"""
    info = locate(t, sel, frac)
    if info.get('err'):
        print(info['err'])
        return None
    x, y = info['x'], info['y']
    t.run_cdp('Input.dispatchMouseEvent', type='mousePressed', x=x, y=y, button='left', buttons=1, clickCount=1)
    t.run_cdp('Input.dispatchMouseEvent', type='mouseReleased', x=x, y=y, button='left', buttons=0, clickCount=1)
    print('click %s @%s,%s' % (sel, x, y))
    return info


def click_any(t, sels, wait=2.0):
    """依次试选择器, 点中第一个存在的即返回(弹窗按钮在不同界面可能只存在其中一个)"""
    for s in sels:
        try:
            if real_click(t, s):
                time.sleep(wait)
                return s
        except Exception:
            continue
    return None


# 一路从启动页点到匹配: 隐私勾选 → 同意 → (需要时)下载 → 选游戏 → 点匹配
DRIVE = [
    ('name:CheckBox', 0.08, 3),
    ('label:同意', 0.5, 6),
    ('label:下载', 0.5, 25),
    ('name:gList', 0.5, 12),
    ('label:下载', 0.5, 30),
    ('label:确认', 0.5, 6),
    ('name:Button', 0.5, 0),
]


def main():
    cmd = sys.argv[1]
    tag = sys.argv[2] if len(sys.argv) > 2 else 'A'

    if cmd == 'start':
        p = ChromiumPage(ADDR)
        url = sys.argv[3]
        t = p.new_tab()
        t.run_cdp('Page.enable')
        t.run_cdp('Page.addScriptToEvaluateOnNewDocument', source=CAPTURE)
        t.get(url)
        t.ele('body', timeout=30)
        print('opened', t.tab_id, t.url)
        return

    t = tab_of(tag)

    if cmd == 'logs':
        out = t.run_js(js_logs(' ||| '))
        print(json.loads(out or '""').replace(' ||| ', '\n'))
        return

    if cmd == 'tail':
        out = t.run_js("return JSON.stringify((window.__logs||[]).slice(-%d))" % int(sys.argv[3] if len(sys.argv) > 3 else 25))
        print('\n'.join(json.loads(out or '[]')))
        return

    if cmd == 'tree':
        depth = int(sys.argv[3]) if len(sys.argv) > 3 else 5
        r = t.run_js("""
var out = [];
function walk(n, d){
  if (!n || d > %d) return;
  var cls = (n.constructor && n.constructor.name) || '?';
  var vis = n.visible === false ? ' HIDDEN' : '';
  var lb = n.title !== undefined && n.title !== null && n.title !== '' ? ' title=' + n.title : '';
  var tx = n.text !== undefined && n.text !== null && n.text !== '' ? ' text=' + String(n.text).slice(0, 22) : '';
  out.push('  '.repeat(d) + (n.name || '-') + ' [' + cls + ']' + vis + lb + tx);
  var c = n.numChildren || 0;
  for (var i = 0; i < c; i++) walk(n.getChildAt(i), d + 1);
}
walk(Laya.stage, 0);
return JSON.stringify(out.join('\\n'));
""" % depth)
        print(json.loads(r or '""'))
        return

    if cmd == 'drive':
        for sel, frac, wait in DRIVE:
            real_click(t, sel, frac)
            if wait:
                time.sleep(wait)
        print('drive 完成')
        return

    if cmd == 'state':
        print(t.run_js("""
var byName=function(root,name){ if(!root) return null; if(root.name===name) return root;
  var c=root.numChildren||0; for(var i=0;i<c;i++){ var r=byName(root.getChildAt(i),name); if(r) return r; } return null; };
var btn=byName(Laya.stage,'Button');
var sh=byName(Laya.stage,'Shuttlecock.001');
var pos=null;
if (sh && sh.transform && sh.transform.position) { var p=sh.transform.position; pos=[p.x,p.y,p.z]; }
var L=window.__logs||[];
var last=L.filter(function(x){return /\\[load\\]|\\[PVP|Sync|Match/.test(x);}).slice(-5);
return JSON.stringify({btn: btn?String(btn.title||''):null, shuttle:!!sh, pos:pos, samples:(window.__ball||[]).length, last:last});
"""))
        return

    if cmd == 'ball':
        print(t.run_js("""
window.__ball = window.__ball || [];
if (!window.__ballTimer) {
  window.__ballTimer = setInterval(function(){
    var n = null;
    (function find(r, d){ if (n || !r || d > 18) return;
      if (String(r.name||'').indexOf('Shuttlecock') === 0) { n = r; return; }
      var c = r.numChildren || 0; for (var i = 0; i < c; i++) find(r.getChildAt(i), d + 1);
    })(Laya.stage, 0);
    if (n && n.transform && n.transform.position) {
      var p = n.transform.position;
      window.__ball.push([Date.now(), Math.round(p.x*1000)/1000, Math.round(p.y*1000)/1000, Math.round(p.z*1000)/1000]);
      if (window.__ball.length > 2000) window.__ball.splice(0, 400);
    }
  }, 100);
}
return 'sampling ' + (window.__ball||[]).length;
"""))
        return

    if cmd == 'balls':
        print(t.run_js("return JSON.stringify(window.__ball||[]);"))
        return

    if cmd == 'roomclear':
        print(t.run_js("""
var k = Object.keys(localStorage).filter(function(x){ return x.indexOf('laya_gobe_last_room') === 0; });
k.forEach(function(x){ localStorage.removeItem(x); });
return JSON.stringify(k);
"""))
        return

    if cmd == 'rclick':
        real_click(t, sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else 0.5)
        return

    if cmd == 'find':
        print(t.run_js(LOCATE.replace('arguments_sel', json.dumps(sys.argv[3]))))
        return

    if cmd == 'click':
        name = sys.argv[3]
        # toggle: 引擎真实点击会先翻转 Check 模式按钮的 selected, 合成事件不会, 需要手动补
        toggle = len(sys.argv) > 4 and sys.argv[4] == 'toggle'
        r = t.run_js(FIND + """
var n = findByName(Laya.stage, arguments_name, 0);
if (!n) return 'NOTFOUND '.concat(arguments_name);
if (arguments_toggle && 'selected' in n) n.selected = !n.selected;
return fireClick(n);
""".replace('arguments_name', json.dumps(name)).replace('arguments_toggle', 'true' if toggle else 'false'))
        print(r)
        return

    if cmd == 'clicklabel':
        label = sys.argv[3]
        r = t.run_js(FIND + """
var roots = [Laya.stage, (window.Laya && Laya.stage._GRoot) || null, (window.Laya && Laya.GRoot && Laya.GRoot.inst) || null];
var n = null;
for (var i = 0; i < roots.length && !n; i++){ if (roots[i]) n = findByLabel(roots[i], arguments_label, 0); }
if (!n) return 'NOLABEL '.concat(arguments_label);
return fireClick(n);
""".replace('arguments_label', json.dumps(label)))
        print(r)
        return

    if cmd == 'eval':
        r = t.run_js(sys.argv[3])
        print(r if isinstance(r, str) else json.dumps(r, ensure_ascii=False)[:3000])
        return

    print('未知命令', cmd)


if __name__ == '__main__':
    main()
