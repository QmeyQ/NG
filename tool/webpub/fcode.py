"""上传 te 代码包到 AGC 云函数(函数代码 tab 的 .zip 输入)。

用法:
  PYTHONIOENCODING=utf-8 python tool/webpub/fcode.py pick    # 只看当前 tab/文件框状态
  PYTHONIOENCODING=utf-8 python tool/webpub/fcode.py up E:/LayaProject/dist/te-1106.zip
"""
import json
import os
import sys
import time
from DrissionPage import ChromiumPage

ADDR = '127.0.0.1:9227'
TAB_KEY = '9249519184595931747'


def frame_of():
    p = ChromiumPage(ADDR)
    for tid in p.tab_ids:
        t = p.get_tab(tid)
        if TAB_KEY in (t.url or ''):
            t.set.activate()
            for f in t.get_frames():
                if 'cslp' in (f.url or ''):
                    return t, f
    raise SystemExit('没找到 AGC 云函数 tab/iframe')


def state(f):
    return json.loads(f.run_js("""
var box=[...document.querySelectorAll('*')].find(x=>x.children.length===0 && /点击或拖拽文件到虚线框内/.test((x.innerText||'').trim()));
var wrap=box; for(var i=0;i<6 && wrap;i++){ if(wrap.querySelector('input[type=file]')) break; wrap=wrap.parentElement; }
return JSON.stringify({
  codeTab: !!box,
  hasDropWrap: !!wrap,
  dropText: box ? (box.parentElement ? box.parentElement.innerText.replace(/\\s+/g,' ').trim().slice(0,160) : '') : null,
  files: [...document.querySelectorAll('input[type=file]')].map(i=>({acc:i.accept, multi:i.multiple, vis:i.offsetParent!==null, n:i.files?i.files.length:-1, name:(i.files&&i.files[0])?i.files[0].name:''})),
  btns: [...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(Boolean).slice(0,24),
  toast: (document.querySelector('.el-message,.el-message__content,[class*=message]')||{}).innerText||null
});
"""))


def to_code_tab(f):
    st = state(f)
    if st['codeTab']:
        return True
    ok = f.run_js("""
var n=[...document.querySelectorAll('*')].find(x=>x.children.length===0 && (x.innerText||'').trim()==='函数代码');
if(!n) return 'NOBTN'; n.click(); return 'clicked';
""")
    print('切到函数代码 tab:', ok)
    for _ in range(10):
        time.sleep(1)
        if state(f)['codeTab']:
            return True
    return False


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'pick'
    tab, f = frame_of()

    if not to_code_tab(f):
        raise SystemExit('进不到"函数代码"tab')
    st = state(f)
    print('初始:', json.dumps(st, ensure_ascii=False)[:600])

    if cmd == 'pick':
        return

    path = os.path.abspath(sys.argv[2])
    if not os.path.isfile(path):
        raise SystemExit('文件不存在: ' + path)

    # 先真点虚线框(和存储上传同款): 点完组件才把 input[type=file] 挂上事件,
    # 直接对页面上那个常驻的隐藏 input 塞文件是不认的(实测 files.length 恒 0)
    zone = None
    for e in f.eles('text=点击或拖拽文件到虚线框内'):
        try:
            if e.rect:
                zone = e
                break
        except Exception:
            continue
    if zone is None:
        raise SystemExit('找不到可点的拖拽框')
    zone.click()
    print('已点拖拽框, 等 input 就位')
    time.sleep(2)

    inp = f.ele('css:input[type=file]', timeout=10)
    if not inp:
        raise SystemExit('点完没有出现 input[type=file]')
    inp.input([path])
    print('已选择文件:', os.path.basename(path))

    # 等页面把文件名渲染出来(提交前必须确认它认到了这个包)
    name = os.path.basename(path)
    got = None
    for _ in range(30):
        time.sleep(1)
        st = state(f)
        if any(name in (x.get('name') or '') for x in st['files']) or name in (st['dropText'] or ''):
            got = st
            break
    if not got:
        raise SystemExit('页面没认到这个文件: ' + json.dumps(st, ensure_ascii=False)[:400])
    print('页面已收到:', json.dumps(got, ensure_ascii=False)[:400])

    r = f.run_js("""
var b=[...document.querySelectorAll('button')].find(x=>(x.innerText||'').trim()==='提交' && x.offsetParent!==null);
if(!b) return 'NOBTN'; b.click(); return 'submitted';
""")
    print('提交:', r)
    for i in range(10):
        time.sleep(3)
        after = f.run_js("""
return JSON.stringify({
  txt: document.body.innerText.replace(/\\s+/g,' ').slice(0,300),
  msg: [...document.querySelectorAll('.el-message,.el-message__content,.el-notification,[class*=toast]')].map(x=>x.innerText.trim()).filter(Boolean).slice(0,5)
});
""")
        print('  等待中(%d):' % i, (after or '')[:300])
        if '"msg":[]' not in after or i > 6:
            time.sleep(2)
            break


if __name__ == '__main__':
    main()
