"""web 产物发布到 AGC 云存储: 进目录 -> 上传 -> 回读每个文件的共享令牌 -> 改写 index.html 链接。

前提: 浏览器(9227)里已登录 AGC, 且有一个云存储页 tab(桶 sgf-rhq1y)。

跑法(用 web-api+tool 的 venv, 它装了 DrissionPage):
  cd E:/LayaProject && P=web-api+tool/venv/Scripts/python.exe
  $P tool/webpub/publish.py status
  $P tool/webpub/publish.py upload js   dist/web-1105/js/bundle.js dist/web-1105/js/index.js dist/web-1105/js/GOBE.js
  $P tool/webpub/publish.py tokens js
  $P tool/webpub/publish.py html

实测踩过的坑(都写进代码里了):
  - 云存储 UI 在 iframe(cslp) 内, 且 hash 恒为 #/file —— 切目录只改内部状态,
    用同 URL 导航 / 点侧栏"文件" / 点面包屑 span.click-action 都不能回根;
    只有 tab 级 CDP Page.reload 会真重载(重载后 frame 对象要重新取)。
  - DOM 里有两个 "sgf-rhq1y": div.bucket-name 是实例切换器, span.click-action 是面包屑,
    按文本点会命中前者。
  - iframe 里的 JS .click() 打不中 SPA 路由, 必须用 DrissionPage 的真实点击。
  - 上传控件是隐藏的 input[type=file][multiple], 用 element.input(路径列表) 塞文件。
"""
import json
import os
import re
import shutil
import sys
import time
from DrissionPage import ChromiumPage

ADDR = '127.0.0.1:9227'
TAB_KEY = '9249519184596115422'      # 云存储 tab 的 url 特征
BUCKET = 'sgf-rhq1y'
GW = 'https://agc-storage-drcn.platform.dbankcloud.cn/v0/' + BUCKET + '/'
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
BUILD = os.path.join(ROOT, 'dist', os.environ.get('WEBBUILD', 'web-1107'))
# 发布产物固定落这里: IDE 每次构建都会重写 dist/<build>/index.html, 直链版必须放在 IDE 碰不到的目录
RELEASE = os.path.join(ROOT, 'release', 'web')
TOKENS_FILE = os.path.join(HERE, 'tokens.json')


def log(*a):
    print(*a, flush=True)


class Console:
    def __init__(self):
        self.page = ChromiumPage(ADDR)
        self.tab = None
        for tid in self.page.tab_ids:
            t = self.page.get_tab(tid)
            if TAB_KEY in (t.url or ''):
                self.tab = t
                break
        if self.tab is None:
            raise SystemExit('没找到云存储 tab, 请先在浏览器打开 AGC 云存储页面')
        self.tab.set.activate()
        self.frame = self._frame()
        if self.frame is None:
            raise SystemExit('没找到 cslp iframe, 页面可能没加载完')

    def _frame(self):
        for f in self.tab.get_frames():
            if 'cslp' in (f.url or ''):
                return f
        return None

    # ---------- 读列表 ----------
    def rows(self):
        txt = self.frame.run_js(
            "return JSON.stringify([...document.querySelectorAll('tr')]"
            ".map(x=>x.innerText.replace(/\\s+/g,' ').trim()).filter(Boolean))")
        try:
            return json.loads(txt or '[]')
        except Exception:
            return []

    def at_root(self):
        return any('文件夹' in r for r in self.rows())

    # ---------- 回桶根(唯一有效手段: CDP 整页重载) ----------
    def go_root(self, tries=3):
        if self.at_root():
            return True
        self.tab.run_cdp('Page.reload', ignoreCache=False)
        time.sleep(9)
        for _ in range(tries):
            f = self._frame()
            if f:
                self.frame = f
            if self.at_root():
                return True
            time.sleep(4)
        return self.at_root()

    def enter_dir(self, name):
        if not self.go_root():
            log('回根目录失败')
            return False
        for sel in (f"x://a[text()='{name}/']", f"x://a[contains(text(),'{name}')]"):
            e = self.frame.ele(sel)
            if e:
                try:
                    e.click()
                    time.sleep(3)
                    return True
                except Exception:
                    pass
        for e in self.frame.eles(f'text={name}/'):
            try:
                if not e.rect:
                    continue
                e.click()
                time.sleep(3)
                return True
            except Exception:
                continue
        log(f'找不到或点不进目录 {name}/')
        return False

    def close_dialog(self):
        self.frame.run_js(
            "var d=[...document.querySelectorAll('[role=dialog],.el-dialog,.el-drawer,.hw-dialog')]"
            ".filter(x=>x.offsetParent!==null);"
            "d.forEach(x=>{var c=x.querySelector('.el-dialog__headerbtn,[aria-label=关闭],.hw-close,i[class*=close]');"
            "if(c)c.click();}); return d.length")
        time.sleep(1)

    # ---------- 上传 ----------
    def upload(self, files):
        names = [os.path.basename(f) for f in files]
        rs = ' | '.join(self.rows())
        # PUB_FORCE=1: 同名文件已在目录里也要重传(发新版就是覆盖, 不是跳过)
        if os.environ.get('PUB_FORCE') == '1':
            pass
        elif all(n in rs for n in names):
            log('文件都已在目录里, 跳过上传')
            return True
        btn = None
        for e in self.frame.eles('text=上传文件'):
            try:
                if e.rect:
                    btn = e
                    break
            except Exception:
                continue
        if btn is None:
            log('找不到可点的 上传文件'); return False
        btn.click()
        time.sleep(2)
        inp = self.frame.ele('css:input[type=file]')
        if not inp:
            log('点完没有出现 input[type=file]'); return False
        inp.input([os.path.abspath(f) for f in files])
        for _ in range(80):
            time.sleep(3)
            rs = ' | '.join(self.rows())
            if all(n in rs for n in names):
                log('上传完成: ' + ', '.join(names))
                return True
        log('等待上传超时, 当前列表: ' + json.dumps(self.rows(), ensure_ascii=False)[:800])
        return False

    # ---------- 令牌 ----------
    # "详情"是普通 @click 处理器(不是路由), 实测 JS 直接 .click() 有效,
    # 而坐标点击在末尾几行会失效 —— 所以整段用 JS 驱动。
    JS_COUNT = ("return [...document.querySelectorAll('span')]"
                ".filter(x=>(x.innerText||'').trim()==='详情').length;")
    JS_OPEN = ("var d=[...document.querySelectorAll('span')]"
               ".filter(x=>(x.innerText||'').trim()==='详情');"
               "if(!d[%d]) return 'NOUTEM'; d[%d].click(); return 'ok';")
    JS_TEXT = ("var d=[...document.querySelectorAll('.el-dialog,[role=dialog],.hw-dialog')]"
               ".filter(x=>x.offsetParent!==null); return d.length?d[d.length-1].innerText:'';")
    JS_CREATE = ("var d=[...document.querySelectorAll('.el-dialog,[role=dialog],.hw-dialog')]"
                 ".filter(x=>x.offsetParent!==null); if(!d.length) return 'NODIALOG';"
                 "var b=[...d[d.length-1].querySelectorAll('span,button,a')]"
                 ".find(x=>/^创建令牌/.test((x.innerText||'').trim())); if(!b) return 'NOBTN';"
                 "b.click(); return 'created';")
    JS_CLOSE = ("var d=[...document.querySelectorAll('.el-dialog,[role=dialog],.hw-dialog')]"
                ".filter(x=>x.offsetParent!==null); d.forEach(x=>{"
                "var b=[...x.querySelectorAll('span,button')].find(y=>(y.innerText||'').trim()==='取消');"
                "if(b) b.click(); else { var c=x.querySelector('.el-dialog__headerbtn'); if(c) c.click(); } });"
                "return d.length;")

    def read_tokens(self):
        """逐行点开详情抓共享令牌; 没有令牌就点创建令牌再读"""
        out = {}
        total = int(self.frame.run_js(self.JS_COUNT) or 0)
        for i in range(total):
            if self.frame.run_js(self.JS_OPEN % (i, i)) != 'ok':
                log('  第', i, '个详情打不开')
                continue
            time.sleep(2)
            txt = self.frame.run_js(self.JS_TEXT) or ''
            m_path = re.search(r'文件路径\s*\n\s*([^\n]+)', txt)
            m_tok = re.search(r'共享令牌[：:]\s*\n?\s*([0-9a-fA-F-]{20,})', txt)
            if not m_tok:
                self.frame.run_js(self.JS_CREATE)
                time.sleep(2)
                txt = self.frame.run_js(self.JS_TEXT) or ''
                m_tok = re.search(r'共享令牌[：:]\s*\n?\s*([0-9a-fA-F-]{20,})', txt)
            if m_path and m_tok:
                p = m_path.group(1).strip()
                out[p] = GW + p + '?token=' + m_tok.group(1).strip()
                log('  ' + p + ' -> ' + out[p])
            else:
                log('  第 %d 行没解析到: %s' % (i, txt[:180].replace('\n', ' | ')))
            self.frame.run_js(self.JS_CLOSE)
            time.sleep(1)
        return out

    # ---------- 改写 index.html ----------
    def rewrite_html(self):
        if not os.path.exists(TOKENS_FILE):
            raise SystemExit('还没有 tokens.json, 先跑 tokens')
        with open(TOKENS_FILE, encoding='utf-8') as fp:
            tok = json.load(fp)

        def lookup(rel):
            if rel in tok:
                return tok[rel]
            for k, v in tok.items():
                if k.endswith('/' + rel) or rel.endswith(k):
                    return v
            return None

        src = os.path.join(BUILD, 'index.html')
        if not os.path.isdir(src[:src.rindex(os.sep)]) or not os.path.exists(src):
            raise SystemExit('构建产物不存在: ' + src + ' (先用 IDE/MCP 出 web 包, 或设 WEBBUILD 环境变量)')
        html = open(src, encoding='utf-8').read()

        # 1) 镜像构建产物到 release/web(不碰 js/ libs/: 它们的引用已换成云存储直链)
        if not os.path.isdir(RELEASE):
            os.makedirs(RELEASE)
        copied = 0
        for root, dirs, files in os.walk(BUILD):
            rel_dir = os.path.relpath(root, BUILD).replace('\\', '/')
            top = rel_dir.split('/')[0]
            if top in ('js', 'libs', '.'):
                dirs[:] = [d for d in dirs if d not in ('js', 'libs')]
                if rel_dir == '.':
                    files = [f for f in files if f != 'index.html']
            if top in ('js', 'libs'):
                continue
            dst_dir = os.path.join(RELEASE, rel_dir)
            if not os.path.isdir(dst_dir):
                os.makedirs(dst_dir)
            for f in files:
                shutil.copyfile(os.path.join(root, f), os.path.join(dst_dir, f))
                copied += 1

        # 2) IDE 原始版留一份在发布目录(这份不会被 IDE 构建覆盖, 用来对拍/回退)
        with open(os.path.join(RELEASE, 'index.ide.html'), 'w', encoding='utf-8') as fp:
            fp.write(html)

        # 3) 换直链, 写 release/web/index.html
        missing = []
        done = 0
        for rel in re.findall(r'src="([^"]+\.js)"', html):
            if rel.startswith('http'):
                continue
            url = lookup(rel)
            if url is None:
                missing.append(rel)
                continue
            html = html.replace('src="' + rel + '"', 'src="' + url + '"')
            done += 1
        out = os.path.join(RELEASE, 'index.html')
        with open(out, 'w', encoding='utf-8') as fp:
            fp.write(html)
        log('已替换 %d 个脚本引用; 缺链接的: %s' % (done, missing or '无'))
        log('发布产物: %s (镜像 %d 个文件; js/libs 走云存储直链)' % (out, copied))


def main():
    stage = sys.argv[1] if len(sys.argv) > 1 else 'status'
    cs = Console()

    if stage == 'status':
        log('URL:', cs.frame.url)
        log('at_root:', cs.at_root())
        log(json.dumps(cs.rows(), ensure_ascii=False, indent=1))
        return

    if stage == 'upload':
        target = sys.argv[2]
        files = sys.argv[3:]
        if not cs.enter_dir(target):
            raise SystemExit('进不去目录: ' + target)
        if not cs.upload(files):
            raise SystemExit('上传没成: ' + target)
        return

    if stage == 'tokens':
        target = sys.argv[2]
        if not cs.enter_dir(target):
            raise SystemExit('进不去目录: ' + target)
        got = cs.read_tokens()
        merged = {}
        if os.path.exists(TOKENS_FILE):
            with open(TOKENS_FILE, encoding='utf-8') as fp:
                merged = json.load(fp)
        merged.update(got)
        with open(TOKENS_FILE, 'w', encoding='utf-8') as fp:
            json.dump(merged, fp, ensure_ascii=False, indent=1)
        log('tokens.json 现有 %d 条' % len(merged))
        return

    if stage == 'html':
        cs.rewrite_html()
        return

    log('未知阶段: ' + stage)


if __name__ == '__main__':
    main()
