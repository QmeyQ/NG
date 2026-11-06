import json, sys
sys.path.insert(0, r'E:\LayaProject\tool\webpub')
from DrissionPage import ChromiumPage
KEYS={'A':'127.0.0.1:8123','B':'localhost:8123'}
p=ChromiumPage('127.0.0.1:9227'); pg={}
for tid in p.tab_ids:
    t=p.get_tab(tid); u=t.url or ''
    for tag,k in KEYS.items():
        if k in u: pg[tag]=t
import re
pat = sys.argv[1] if len(sys.argv)>1 else 'PVP'
CODE = "return JSON.stringify(window.__qaStore.logs.filter(function(x){return /%s/.test(x);}).slice(-25));" % pat
for tag in ('A','B'):
    print('=====',tag,'=====')
    for x in json.loads(pg[tag].run_js(CODE)): print(' ', x[:190])
