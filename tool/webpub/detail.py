"""真实点击云存储列表里的"详情", 把弹窗里的文本/输入框值全部吐出来。

用法: PYTHONIOENCODING=utf-8 ../web-api+tool/venv/Scripts/python.exe detail.py [文件名]
"""
import sys
import time
from DrissionPage import ChromiumPage

ADDR = '127.0.0.1:9227'
TAB_KEY = '9249519184596115422'


def main():
    name = sys.argv[1] if len(sys.argv) > 1 else 'nor.br'
    page = ChromiumPage(ADDR)
    tab = None
    for tid in page.tab_ids:
        t = page.get_tab(tid)
        if TAB_KEY in (t.url or ''):
            tab = t
            break
    if tab is None:
        print('no tab'); return
    tab.set.activate()
    frame = None
    for f in tab.get_frames():
        if 'cslp' in (f.url or ''):
            frame = f
            break
    if frame is None:
        print('no frame'); return

    row = frame.ele(f'tr::{name}')
    if not row:
        print('找不到行:', name)
        return
    btn = row.ele('text=详情')
    if not btn:
        print('该行没有详情按钮'); return
    btn.click()
    time.sleep(3)

    txt = frame.run_js("return document.body.innerText.replace(/\\n{2,}/g,'\\n')")
    print('--- BODY(尾部 2200 字) ---')
    print((txt or '')[-2200:])
    print('--- INPUT/TEXTAREA 值 ---')
    vals = frame.run_js(
        "return JSON.stringify([...document.querySelectorAll('input,textarea')]"
        ".map(x=>({t:x.type||x.tagName, v:(x.value||'').slice(0,300)})).filter(x=>x.v))")
    print(vals)
    print('--- 含 dbankcloud/agc-storage 的元素 ---')
    links = frame.run_js(
        "return JSON.stringify([...document.querySelectorAll('*')]"
        ".filter(x=>x.children.length===0 && /agc-storage|dbankcloud|myhuaweicloud|token=/.test(x.textContent||''))"
        ".map(x=>x.textContent.trim().slice(0,300)).slice(0,12))")
    print(links)


if __name__ == '__main__':
    main()
