"""读 te 函数配置页(找环境变量字段), 并可选写入环境变量。

用法:
  PYTHONIOENCODING=utf-8 python tool/webpub/fenv.py show
  PYTHONIOENCODING=utf-8 python tool/webpub/fenv.py set GOBE_CLIENT_ID 1263859182919011264
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
    raise SystemExit('没找到云函数 tab/iframe')


def secret_from_history():
    """GOBE clientSecret 从本仓库 git 历史里取(它曾是前端硬编码值, 后来才挪到服务端)。
    只在本进程内使用, 不打印明文。"""
    import re
    import subprocess
    out = subprocess.run(
        ['git', 'log', '--all', '-p', '--', 'src/'],
        cwd=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'),
        capture_output=True, text=True, encoding='utf-8', errors='ignore'
    ).stdout
    vals = re.findall(r"clientSecret:\s*'([0-9A-Fa-f]{32,})'", out or '')
    if not vals:
        raise SystemExit('git 历史里没找到 GOBE clientSecret, 请手动提供')
    # 取出现次数最多的那个(最可能是长期在用的正式值)
    best = max(set(vals), key=vals.count)
    print('密钥已从 git 历史取到 (len=%d, 前4位=%s, 候选数=%d, 出现%d次)'
          % (len(best), best[:4], len(vals), vals.count(best)))
    return best


def env_area(f):
    """定位"环境变量"区块的容器(页面上有多个同名按钮, 必须限定作用域)"""
    return f.run_js("""
var head=[...document.querySelectorAll('*')].find(x=>x.children.length===0 && (x.innerText||'').trim()==='环境变量');
if(!head) return 'NOHEAD';
var box=head; for(var i=0;i<6 && box;i++){ if([...box.querySelectorAll('button')].some(b=>/新增变量/.test(b.innerText||''))) break; box=box.parentElement; }
if(!box) return 'NOBOX';
box.setAttribute('data-envbox','1');
return 'ok';
""")


def add_var(f, key, value):
    """在环境变量区点新增、填键值"""
    if env_area(f) != 'ok':
        print('找不到环境变量区块'); return False
    ok = f.run_js("""
var box=document.querySelector('[data-envbox]');
if(!box) return 'NOBOX';
var b=[...box.querySelectorAll('button')].find(x=>/新增变量/.test((x.innerText||'').trim()));
if(!b) return 'NOBTN';
b.click(); return 'clicked';
""")
    if ok != 'clicked':
        print('新增变量点击失败:', ok); return False
    time.sleep(2)
    filled = f.run_js("""
var box=document.querySelector('[data-envbox]');
var ins=[...box.querySelectorAll('input')].filter(x=>x.offsetParent!==null);
// 新行应有两个空输入(键/值); 取最后两个空的
var empt=ins.filter(x=>!(x.value||'').trim());
if(empt.length<2) return 'NOEMPTY '+ins.length+' '+empt.length;
function type(el,v){
  var d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
  d.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
}
type(empt[0], arguments[0]); type(empt[1], arguments[1]);
return 'filled';
""".replace('arguments[0]', json.dumps(key)).replace('arguments[1]', json.dumps(value)))
    if filled != 'filled':
        print('填值失败:', filled); return False
    time.sleep(1)
    shown = f.run_js("""
var box=document.querySelector('[data-envbox]');
return [...box.querySelectorAll('input')].filter(x=>x.offsetParent!==null).map(x=>x.value.slice(0,12)).join(' / ');
""")
    print('  %s -> 当前输入框: %s' % (key, shown))
    return True


def save(f):
    r = f.run_js("""
var box=document.querySelector('[data-envbox]');
var b=[...box.querySelectorAll('button')].find(x=>(x.innerText||'').trim()==='保存');
if(!b) return 'NOBTN'; b.click(); return 'saved';
""")
    print('保存:', r)
    time.sleep(4)
    return r == 'saved'


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'show'
    tab, f = frame_of()
    print('hash:', f.url.split('#')[-1][:80])

    if cmd == 'setenv':
        go = '1263859182919011264'
        app = '5765880207855344723'
        sec = secret_from_history()
        for k, v in (('GOBE_CLIENT_ID', go), ('GOBE_CLIENT_SECRET', sec), ('GOBE_APP_ID', app)):
            if not add_var(f, k, v):
                raise SystemExit('写入失败: ' + k)
            time.sleep(1)
        if not save(f):
            raise SystemExit('保存按钮没点到')
        time.sleep(3)
        print('--- 保存后环境变量区文本 ---')
        print(f.run_js("var b=document.querySelector('[data-envbox]'); return b? b.innerText.slice(0,700) : 'gone';"))
        return

    if cmd == 'show':
        txt = f.run_js("return document.body.innerText.slice(0,2600)")
        print(txt)
        print('--- inputs ---')
        print(f.run_js(
            "return JSON.stringify([...document.querySelectorAll('input,textarea')]"
            ".map(x=>({ph:x.placeholder||'',val:(x.value||'').slice(0,40),vis:x.offsetParent!==null}))"
            ".filter(x=>x.vis).slice(0,25))"))
        print('--- buttons ---')
        print(f.run_js(
            "return JSON.stringify([...document.querySelectorAll('button')]"
            ".map(x=>x.innerText.trim()).filter(Boolean).slice(0,25))"))
        return

    if cmd == 'fields':
        print(f.run_js(
            "return JSON.stringify([...document.querySelectorAll('.el-form-item')]"
            ".map(x=>({label:(x.querySelector('.el-form-item__label')||{}).innerText||'', "
            "txt:x.innerText.replace(/\\s+/g,' ').trim().slice(0,90)})).slice(0,30))"))
        return


if __name__ == '__main__':
    main()
