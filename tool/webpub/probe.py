"""抓 AGC 云存储控制台的真实请求: 刷新页面触发一批后端调用, 用网络监听记录协议。

跑法: PYTHONIOENCODING=utf-8 ../web-api+tool/venv/Scripts/python.exe probe.py
"""
import json
import time
from DrissionPage import ChromiumPage

ADDR = '127.0.0.1:9227'
TAB_KEY = '9249519184596115422'


def to_s(v, n=1000):
    if v is None:
        return ''
    if isinstance(v, str):
        return v[:n]
    try:
        return json.dumps(v, ensure_ascii=False)[:n]
    except Exception:
        return str(v)[:n]


def main():
    page = ChromiumPage(ADDR)
    tab = None
    for tid in page.tab_ids:
        t = page.get_tab(tid)
        if TAB_KEY in (t.url or ''):
            tab = t
            break
    if tab is None:
        print('找不到云存储 tab'); return
    tab.set.activate()

    frame = None
    for f in tab.get_frames():
        if 'cslp' in (f.url or ''):
            frame = f
            break
    if frame is None:
        print('没有 cslp iframe'); return

    tab.listen.start('agc-drcn.developer.huawei.com')

    # 刷新 iframe -> 触发 initData / queryBucketIds / listFiles
    frame.get(frame.url)
    time.sleep(6)

    got, deadline = [], time.time() + 20
    while time.time() < deadline and len(got) < 15:
        packet = tab.listen.wait(timeout=3)
        if not packet:
            continue
        try:
            got.append({
                'url': packet.request.url,
                'method': packet.request.method,
                'post': to_s(packet.request.postData, 700),
                'resp': to_s(packet.response.body, 1400),
            })
        except Exception as e:
            print('packet 解析失败:', e)

    # 再点进 js/ 目录, 看 listFiles 带前缀的形态
    try:
        cell = frame.ele('text=js/')
        if cell:
            cell.click()
            time.sleep(3)
            while True:
                packet = tab.listen.wait(timeout=3)
                if not packet:
                    break
                got.append({
                    'url': packet.request.url,
                    'method': packet.request.method,
                    'post': to_s(packet.request.postData, 700),
                    'resp': to_s(packet.response.body, 1400),
                })
    except Exception as e:
        print('进入 js/ 失败:', e)

    tab.listen.stop()
    print('captured:', len(got))
    for g in got:
        print('=' * 72)
        print(g['method'], g['url'])
        if g['post']:
            print('  post:', g['post'])
        print('  resp:', g['resp'])


if __name__ == '__main__':
    main()
