"""AGC 控制台驱动: 连到已登录的 9227 Chrome, 复用 web-api+tool 的 DrissionPage。

用法(用 web-api+tool/venv 的 python 跑):
  drive.py tabs                       列出所有 tab
  drive.py open <url> [tab关键字]      在 tab(默认按 huawei 匹配)里打开 url 并等加载
  drive.py dump [tab关键字]            打印 tab 的可见文本与链接(找入口用)
  drive.py eval <js> [tab关键字]        在页面里执行 JS 并打印结果
  drive.py frames [tab关键字]           列出 iframe
  drive.py feval <js> [tab关键字] [序号]  在指定 iframe 里执行 JS(默认第 0 个)
  drive.py newtab <url>                新开 tab
"""
import json
import sys
from DrissionPage import ChromiumPage

ADDR = '127.0.0.1:9227'
DEFAULT_MATCH = 'huawei'


def browser():
    # DrissionPage 4.x: 直接传地址即接管已存在的浏览器(不会另起实例)
    return ChromiumPage(ADDR)


def pick(page, key):
    """按 url 子串找 tab; key 为 None 时用默认关键字"""
    k = key or DEFAULT_MATCH
    for tid in page.tab_ids:
        t = page.get_tab(tid)
        if k in (t.url or ''):
            return t
    return None


def main():
    cmd = sys.argv[1]
    page = browser()

    if cmd == 'tabs':
        for tid in page.tab_ids:
            t = page.get_tab(tid)
            print(f'{tid} | {(t.title or "")[:40]} | {t.url}')
        return

    if cmd == 'newtab':
        t = page.new_tab(sys.argv[2])
        t.set.activate()
        print('tab', t.tab_id, t.url)
        return

    if cmd == 'open':
        t = pick(page, sys.argv[3] if len(sys.argv) > 3 else None)
        if t is None:
            print('没有匹配的 tab, 用 newtab 先开一个'); return
        t.get(sys.argv[2])
        t.ele('body', timeout=20)
        print('now:', t.url, '|', t.title)
        return

    if cmd == 'dump':
        t = pick(page, sys.argv[2] if len(sys.argv) > 2 else None)
        if t is None:
            print('no tab'); return
        links = t.run_js(
            "return JSON.stringify([...document.querySelectorAll('a')]"
            ".map(a=>({t:(a.innerText||'').trim().slice(0,30),h:a.getAttribute('href'),c:a.className.slice(0,40)}))"
            ".filter(x=>x.t||x.h))")
        arr = json.loads(links or '[]')
        print('URL:', t.url, '| TITLE:', t.title)
        print('links:', len(arr))
        for x in arr[:80]:
            print('  -', x.get('t'), '=>', (x.get('h') or '')[:90])
        return

    if cmd == 'eval':
        t = pick(page, sys.argv[3] if len(sys.argv) > 3 else None)
        if t is None:
            print('no tab'); return
        r = t.run_js(sys.argv[2])
        print(r if isinstance(r, str) else json.dumps(r, ensure_ascii=False)[:4000])
        return

    if cmd == 'feval':
        """在 iframe 里执行 JS(AGC 的服务页都嵌在 cslp iframe 内)"""
        t = pick(page, sys.argv[3] if len(sys.argv) > 3 else None)
        if t is None:
            print('no tab'); return
        frames = t.get_frames()
        if not frames:
            print('该页面没有 iframe'); return
        idx = int(sys.argv[4]) if len(sys.argv) > 4 else 0
        f = frames[idx]
        print(f'[frame {idx}] {f.url}')
        r = f.run_js(sys.argv[2])
        print(r if isinstance(r, str) else json.dumps(r, ensure_ascii=False)[:6000])
        return

    if cmd == 'frames':
        t = pick(page, sys.argv[2] if len(sys.argv) > 2 else None)
        if t is None:
            print('no tab'); return
        for i, f in enumerate(t.get_frames()):
            print(f'{i} | {f.url}')
        return

    if cmd == 'click':
        """真实点击(iframe 里的 JS .click() 打不中 SPA 路由, 必须用真点击)"""
        t = pick(page, sys.argv[3] if len(sys.argv) > 3 else None)
        if t is None:
            print('no tab'); return
        fr = None
        for f in t.get_frames():
            if 'cslp' in (f.url or ''):
                fr = f
                break
        target = fr or t
        ele = target.ele(sys.argv[2])
        if not ele:
            print('元素不存在:', sys.argv[2]); return
        ele.click()
        print('clicked:', sys.argv[2])
        return

    print('未知命令', cmd)


if __name__ == '__main__':
    main()
