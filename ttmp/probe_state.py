import json, sys
sys.path.insert(0, r'E:\LayaProject\tool\webpub')
from DrissionPage import ChromiumPage
KEYS={'A':'127.0.0.1:8123','B':'localhost:8123'}
p=ChromiumPage('127.0.0.1:9227'); pg={}
for tid in p.tab_ids:
    t=p.get_tab(tid); u=t.url or ''
    for tag,k in KEYS.items():
        if k in u: pg[tag]=t
CODE=r"""
var s = window.__qa ? __qa.state() : null;
return JSON.stringify({hasQa: typeof __qa, roles: s?s.roles:null, net: s?{roomId:s.net.roomId, me:s.net.me, players:(s.net.players||[]).length}:null, page: s?s.page:null, url: location.href.slice(0,60)});
"""
for tag in ('A','B'):
    print(tag, pg[tag].run_js(CODE) if tag in pg else 'NO TAB')
