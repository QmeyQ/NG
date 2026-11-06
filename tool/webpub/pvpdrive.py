"""PVP 端到端自动验证: 拉起两端 → 进匹配 → 同房 → 开赛 → 打真回合 → 量两端球位/权威端一致性。

用法:
  PYTHONIOENCODING=utf-8 python -u tool/webpub/pvpdrive.py [回合秒数=45]

依赖: 9227 Chrome 在跑; 本地静态服务 dist/web-1107 (默认 127.0.0.1:8123 与 localhost:8123 两个 origin,
      这样两端 IndexedDB/localStorage 天然隔离, 各自独立账号)。
所有操作都走页面里的 __qa 指令接口(gobe/qa.ts), 不模拟画布点击。

验收口径(阈值写死; 不达标就打印现场数值, 不放宽。三段窗口分开算, 免得互相冒充):
  1) 同房 + finalAssignment 一致
  2) 时钟(稳态样本): HUD 秒数最长连续精确一致 >=10、没有任何"差>1 秒"、阶段不同最多连续 2 样本
     (权威帧 10Hz, 对端状态天然落后 1~2 个样本; 差 1 秒只会出现在整秒边界)
     且没有"请发球10"冻结
  3) 球位偏差(稳态、场内 |x|<=8m、非鹰眼段, 已按球速把两端样本对齐到同一时刻):
     median < 0.10m、p90 < 0.30m, 且"连续 >=2 个样本 >1m"(玩家持续看着球在错的地方)出现 0 次;
     单样本超差(状态切换那一拍的固有现象)照样打印数量与现场; 场地外与鹰眼回放段各自单独计数,
     既不混进合格率, 也不藏起来
  4) 比分收尾一致, 且最长连续不一致 <=3 样本
  5) 运行期间本端身份不来回翻转(amAuth 翻转 <=1 次; tail 权威变更 <=2 条)
  6) 交接: 收尾只能有一个权威且两端认定相同; 停发结束后 <=8 个样本内球位差回到 0.30m 内并稳住 3 个样本;
     只有真饿到了对端(结束后仍有 >=3 个 >1m 样本)才硬要求对端接手(任期上升)

两个测量口径上的坑, 都是踩过之后写进代码的:
  - 两端是先后两次读页, 间隔实测 100~400ms; 30m/s 的球在这段时间自己就走 3~12m。不对齐就是在用
    harness 的抖动验收游戏(曾把 median 1.5cm 的正常同步量成 median 7m), 所以先按各自球速对齐到同刻。
  - 注入的"权威端停发 4.5s + 收敛 2s"是【故意制造的故障】, 那段唯一模拟器停摆、球位差必然拉大,
    拿它判稳态合格率是自相矛盾的; 它由 [6] 单独验收, 稳态段才看 [2][3]。
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from DrissionPage import ChromiumPage  # noqa: E402

ADDR = '127.0.0.1:9227'
ORIGIN = {'A': '127.0.0.1:8123', 'B': 'localhost:8123'}
URL = {'A': 'http://127.0.0.1:8123/index.html', 'B': 'http://localhost:8123/index.html'}

# MatchPhase: COUNTDOWN=1 SERVING=2 RALLYING=3 EAGLE_CONFIRM=6 EAGLE_CHALLENGE=7
SERVE_PHASES = {'1', '2'}
# 鹰眼确认/挑战(6/7): 这一段球由【本地记录的轨迹】回放驱动, 权威端本来就不在模拟这颗球,
# 拿它算同步偏差没有意义(run23 实测唯一的"连续 3 样本 8.94m"全部落在 phase=6)。
# 与场地外样本一样: 不计入合格率, 但必须单独打印数量和现场。
EAGLE_PHASES = {'6', '7'}
LIM_MEDIAN, LIM_P90, LIM_OVER = 0.10, 0.30, 1.0
# 场地外沿(米): 单打 x 方向约 ±6.7。超出即"球已经飞出场地"——盲打脚本在死球期(设计允许出手)
# 能把球打到 90m 外, 那时两端任何 100ms 的时刻差都会放大成十几米的"偏差", 用它判同步合不合格
# 等于让物理调参问题冒充网络问题。所以场上/场外分开统计, 场外数量必须打印出来, 不藏。
COURT_X = 8.0

pages = {}


def open_tabs():
    p = ChromiumPage(ADDR)
    live = {}
    for tid in p.tab_ids:
        t = p.get_tab(tid)
        u = t.url or ''
        for tag, key in ORIGIN.items():
            if key in u:
                live[tag] = t
    for tag in ('A', 'B'):
        url = URL[tag] + '?qa=1&v=' + str(int(time.time()))
        if tag in live:
            # 复用 tab 必须重新导航: 页面里跑的是上一次构建的 bundle, 不重载就等于在测旧代码
            pages[tag] = live[tag]
            print(f'  复用 tab {tag} → 重载')
            try:
                live[tag].get(url)
            except Exception as e:
                print(f'    {tag} 重载失败: {str(e)[:70]}')
            continue
        t = p.new_tab(url)
        pages[tag] = t
        print(f'  新开 tab {tag}')
    for tag, t in pages.items():
        try:
            t.run_js("localStorage.setItem('qa','1')")
        except Exception:
            pass


def js(tag, code):
    return pages[tag].run_js(code)


def qa(tag, call):
    return js(tag, 'return String(__qa.' + call + ');')


def state(tag):
    try:
        r = js(tag, 'var s=__qa.state();return JSON.stringify({roles:s.roles,net:s.net,page:s.page,game:s.game});')
    except Exception as e:
        print(f'    {tag} state() 异常: {str(e)[:70]}')
        return {}
    try:
        return json.loads(r) if isinstance(r, str) else (r or {})
    except Exception:
        return {}


def wait_for(tag, pred, timeout, label, every=2.0):
    """轮询等待(替代固定 sleep: 菜单/场景加载耗时不稳定, 固定等待必然踩空)"""
    end = time.time() + timeout
    while time.time() < end:
        try:
            if pred(tag):
                return True
        except Exception as e:
            print(f'    {tag} {label} 探测异常: {str(e)[:70]}')
        time.sleep(every)
    print(f'    !! {tag} 等待 {label} 超时 {timeout}s')
    return False


def brief(tag):
    st = state(tag)
    return (st.get('net') or {}), (st.get('page') or {}), (st.get('roles') or {})


def settled(tag):
    n, p, r = brief(tag)
    return not n.get('roomId') and not p.get('isMatching') and not r.get('game')


def unstuck(tag):
    """卡在游戏场景里就按 __qa.back() 回到匹配页(等价玩家点游戏内返回键)。
    实测: 某一次带着空玩家表进了游戏(_gameStarted 置位但没有房间), 之后每一轮 match() 都被
    _startMatch 的 `if (this._gameStarted) return` 吃掉 → 连续 5 次"等待开赛超时"。
    匹配页是预制体、不被销毁, 只有 sceneShow 会把 _gameStarted/指派状态整体归零;
    history.back() 不行——页面重载过之后应用的场景栈和浏览器历史早就对不上了。"""
    st = state(tag)
    n, p = (st.get('net') or {}), (st.get('page') or {})
    r = st.get('roles') or {}
    if r.get('game') or (p.get('started') and not n.get('roomId')):
        try:
            print(f'  {tag} 卡在游戏场景 → back()={qa(tag, "back()")}')
            return True
        except Exception as e:
            print(f'  {tag} 后退失败: {str(e)[:60]}')
    return False


def leave_all():
    """开局必须两端都回到"无房间/未匹配/不在游戏": 上一局残留的房间会让 match() 走 RESTARTING
    (异步 exitMatch→_startMatch), 双端同时重启必然配不上对(实测 B 单人在房)。"""
    for tag in ('A', 'B'):
        for _ in range(10):
            if settled(tag):
                break
            if not unstuck(tag):
                try:
                    qa(tag, 'cancel()')
                except Exception:
                    pass
            time.sleep(2)
        print(f'  {tag} 清场={settled(tag)}')


def started_in_game(tag):
    """started 标志跨局不清零(实测上一局留下 started=true 骗过等待), 必须同时有房 + 场景实例"""
    n, p, r = brief(tag)
    return bool(p.get('started') and n.get('roomId') and r.get('game'))


def pick(st):
    """从 state() 抽出验收字段: 一条样本 = 同一时刻两端各一份"""
    n, g = (st.get('net') or {}), (st.get('game') or {})
    return {
        'me': str(n.get('me') or ''), 'auth': bool(n.get('amAuth')), 'term': n.get('authTerm'),
        'authId': str(n.get('authId') or ''), 'phase': str(g.get('phase')),
        'cd': g.get('cd'), 'ball': g.get('ball'), 'scores': g.get('scores'),
        'remain': g.get('remainMs'), 'holder': g.get('holderId'), 'reason': g.get('lastScoreReason'),
        'party': g.get('party'),
        # 同步线程存活: 权威端 tx 在涨而对端 rx 不涨 = 帧根本没送到(而不是"送到了但被拒")
        'tx': n.get('txAuthFrames'), 'rx': n.get('rxAuthFrames'), 'rxSeq': n.get('rxAuthSeq'),
        # 页面内 Date.now() + 球速: 两端是先后两次读页(实测差 100~400ms), 球速 30m/s 时
        # 这个采样误差本身就有 3~12m, 不对齐就等于在用 harness 的抖动验收游戏
        't': st.get('at'), 'vel': g.get('ballVel'),
    }


def longest_streak(flags):
    best = cur = 0
    for f in flags:
        cur = cur + 1 if f else 0
        best = max(best, cur)
    return best


def check_clock(rows, split_t=None):
    """验收 2: 发球/准备阶段两端 HUD 秒数一致 + 权威交接后的"请发球10"冻结。

    容差 ±1 秒且必须【多数样本精确相等】: 非权威端的时钟是按权威帧给的剩余毫秒重基的,
    帧本身带着 100~200ms 的产生延时, 所以在整秒边界上两端会短暂差 1 —— 玩家各自只看自己
    屏幕, 这不是缺陷。真正的缺陷是差 >=2 秒、秒数不走(冻结)、或阶段本身不一致。
    split_t = 注入权威交接的时刻, 用于单独看交接后那一段。"""
    seq = [(r['t'], r['A'], r['B']) for r in rows
           if r['A']['phase'] in SERVE_PHASES and r['A']['ball'] and r['B']['ball']
           and not in_stall(r['t'], split_t)]
    if not seq:
        print('  [2] 时钟: 稳态窗口里没有发球/准备阶段成对样本 —— 无法判定')
        return False

    def score(rows2):
        exact = [a['cd'] == b['cd'] for _, a, b in rows2]
        # 阶段不同: 权威帧 10Hz, 对端落后最多 1~2 个样本是设计内的; 连续 >2 个才是各跑各的状态机
        phase_run = longest_streak([a['phase'] != b['phase'] for _, a, b in rows2])
        # 秒数只在【同阶段】比: 阶段一换, HUD 数字的含义就变了(准备 5 → 发球 10),
        # 跨阶段比出来的"差>1 秒"是两套倒计时互比, 不是同步错误(实测 3 处全是这种)
        bad = [(a['cd'], b['cd'], a['phase'], b['phase']) for _, a, b in rows2
               if a['phase'] == b['phase'] and (a['cd'] is None or b['cd'] is None
                                                or abs(a['cd'] - b['cd']) > 1)]
        streak = longest_streak(exact)
        return streak, bad, phase_run

    streak, bad, phase_run = score(seq)
    ok = streak >= 10 and not bad and phase_run <= 2
    print('  [2] 时钟(稳态, 不含注入的停发段): 成对样本 %d, HUD 精确一致 %d, 最长连续精确一致 %d (需 >=10), 差>1秒 %d 处 (需 0), 阶段不同最长连续 %d (需 <=2)'
          % (len(seq), sum(1 for _, a, b in seq if a['cd'] == b['cd']), streak, len(bad), phase_run))
    if bad:
        print('      超差(cdA/cdB/phaseA/phaseB) 前 6: %s' % (bad[:6],))
    mism = [(a['cd'], b['cd'], a['remain'], b['remain'], a['phase']) for _, a, b in seq if a['cd'] != b['cd']]
    if mism:
        print('      非精确一致(1 秒边界内) 前 4: %s' % (mism[:4],))
    # "请发球10"冻结: SERVING 且 cd==10 连续 >=5 样本(约 2s 秒数不走)
    freeze, run = [], []
    for _, a, b in seq:
        who = [e for e in (a, b) if e['phase'] == '2' and e['cd'] == 10]
        run = run + [1] if who else []
        if len(run) >= 5:
            freeze.append((a['cd'], b['cd'], a['remain'], b['remain']))
    if freeze:
        print('      !! 发球 10 秒冻结现场(cdA/cdB/remainA/remainB): %s' % (freeze[:3],))
    else:
        print('      无"请发球10"冻结')
    return ok and not freeze


MUTE_MS, SETTLE_MS = 4500, 2000


def in_stall(t, split_t):
    """注入的"权威端停发 4.5s"那一段(含升格与接管后的收敛期)。
    这段时间里球位差大是设计内的: 唯一模拟器停摆了, 对端要等满 3s 才会接手——
    用它来判"同步不合格"是自相矛盾的, 所以稳态与故障段分开算, 故障段单独验收(见 [6])。"""
    return split_t is not None and (split_t - 500) <= t <= (split_t + MUTE_MS + SETTLE_MS)


def align_mid(a, b):
    """把两端样本按各自球速推进/回退到【同一时刻】再比。
    两端是先后两次读页(实测差 100~400ms), 30m/s 的球在这段时间里自己就走 3~12m ——
    不对齐就等于在用 harness 的采样抖动验收游戏。对齐不了(没速度/间隔>0.5s)就退回原值。"""
    ta, tb, va, vb = a.get('t'), b.get('t'), a.get('vel'), b.get('vel')
    if not (ta and tb and va and vb):
        return a['ball'], b['ball']
    dt = (tb - ta) / 1000.0
    if abs(dt) > 0.5:
        return a['ball'], b['ball']
    half = dt / 2.0
    pa = [a['ball'][i] + va[i] * half for i in range(3)]
    pb = [b['ball'][i] - vb[i] * half for i in range(3)]
    return pa, pb


def check_ball(rows, split_t=None):
    """验收 3: 球位偏差 median/p90/max 与 >1m 计数(两端样本先按球速对齐到同一时刻)。
    注入的权威停发段不计入(那段没有模拟器在算球, 见 in_stall), 但单独打印出来供核对。"""
    ds, worst, stall_d, outside, eagle = [], [], [], [], []
    for r in rows:
        a, b = r['A']['ball'], r['B']['ball']
        if not a or not b:
            continue
        pa, pb = align_mid(r['A'], r['B'])
        d = sum((x - y) ** 2 for x, y in zip(pa, pb)) ** 0.5
        skew = ((r['A'].get('t') or 0) - (r['B'].get('t') or 0))
        w = (d, r['t'], a, b, r['A']['phase'], r['A']['auth'], r['A']['holder'], r['B']['holder'], skew)
        if in_stall(r['t'], split_t):
            stall_d.append(d)
        elif r['A']['phase'] in EAGLE_PHASES or r['B']['phase'] in EAGLE_PHASES:
            eagle.append(w)          # 鹰眼回放段: 本地记录驱动, 不是权威模拟
        elif abs(a[0]) > COURT_X or abs(b[0]) > COURT_X:
            outside.append(w)          # 球已在场地外: 记数不记入同步合格率
        else:
            ds.append(d)
            worst.append(w)
    if stall_d:
        print('      (故障段内 %d 样本, 最大 %.2fm —— 这段不计入验收, 由 [6] 单独判)'
              % (len(stall_d), max(stall_d)))
    if eagle:
        print('      鹰眼回放段样本 %d 个, 最大球位差 %.2fm —— 该段球由本地记录轨迹回放驱动, 权威端不模拟这颗球'
              % (len(eagle), max(e[0] for e in eagle)))
    if outside:
        print('      场地外(|x|>%.0fm)样本 %d 个, 最大球位差 %.2fm, 最远球 x=%.1fm —— 这是"死球期被盲打飞出场"的物理表现问题, 单独列出'
              % (COURT_X, len(outside), max(o[0] for o in outside),
                 max(max(abs(o[2][0]), abs(o[3][0])) for o in outside)))
    if not ds:
        print('  [3] 球位: 稳态窗口里没有成对样本 —— 大概率有一端没进场景或球未激活')
        return False
    s = sorted(ds)
    med, p90, mx = s[len(s) // 2], s[min(len(s) - 1, int(len(s) * 0.9))], s[-1]
    over = [w for w in worst if w[0] > LIM_OVER]
    # 合格线: median/p90 卡死 + 不允许"持续"超差(连续 >=2 个样本 >1m ≈ 玩家至少 0.8s 看着
    # 球在错的地方)。单样本的超差是状态切换那一拍的固有现象(球被重新钉回手上/权威帧 10Hz+RTT),
    # 它照样要打印数量和最严重现场, 但不代表两端在各算各的局——那种情况一定是连续的。
    over_run = longest_streak([w[0] > LIM_OVER for w in worst])
    print('  [3] 球位偏差 m(稳态, 已按球速对齐到同刻): median=%.3f(<%.2f) p90=%.3f(<%.2f) max=%.3f (n=%d)'
          % (med, LIM_MEDIAN, p90, LIM_P90, mx, len(s)))
    print('      >%.0fm 单样本 %d 个(最长连续 %d, 需 <=1) 明细: %s'
          % (LIM_OVER, len(over), over_run, [(round(o[0], 2), o[1], o[4]) for o in over[:6]]))
    for w in sorted(worst, key=lambda x: -x[0])[:3]:
        print('      最差 d=%.2fm @%dms A=%s B=%s phase=%s authA=%s holderA/B=%s/%s 采样差=%dms'
              % (w[0], w[1], w[2], w[3], w[4], w[5], w[6], w[7], w[8]))
    return med < LIM_MEDIAN and p90 < LIM_P90 and over_run <= 1


def check_scores(rows):
    """验收 4: 比分收尾一致 + 不出现"持续分歧"。
    两端比分靠权威帧对齐(≤100ms), 而采样本身有 100~400ms 抖动, 所以单样本的短暂不一致是
    测量抖动; 连续多样本不一致才是真的各算各的。"""
    flags = [(r['A']['scores'] is not None and r['A']['scores'] == r['B']['scores'])
             for r in rows if r['A']['scores'] or r['B']['scores']]
    diff = sum(1 for f in flags if not f)
    worst_run = longest_streak([not f for f in flags])
    last = rows[-1] if rows else None
    la = last['A']['scores'] if last else None
    lb = last['B']['scores'] if last else None
    print('  [4] 比分: 收尾 A=%s B=%s ; 不一致 %d/%d 样本, 最长连续不一致 %d (需 收尾一致且 <=3 样本)'
          % (la, lb, diff, len(flags), worst_run))
    bad = [(r['A']['scores'], r['B']['scores']) for r in rows
           if r['A']['scores'] and r['B']['scores'] and r['A']['scores'] != r['B']['scores']]
    if bad:
        print('      不一致(前 3): %s' % (bad[:3],))
    return la is not None and la == lb and worst_run <= 3


def check_handover(rows, split_t, muted, terms):
    """验收 6: 注入的"权威端停发 4.5s"必须被当作一次真实的权威交接来处理。
      a) 停发的权威端【不是】新权威端 —— 对端在帧静默 3s 后接手(不接手就等于让全场干等网络);
      b) 交接后不能双权威: 两端收尾的 authId 必须相同, 且只有它一端 amAuth=true;
      c) 收敛: 停发结束后 8 个样本(≈3.2s)内球位差必须回到 0.30m 以内并稳住 3 个样本。"""
    if split_t is None or not rows:
        print('  [6] 交接: 没有注入样本 —— 无法判定')
        return False
    end = rows[-1]
    ia, ib = end['A'], end['B']
    same_auth = bool(ia['authId']) and ia['authId'] == ib['authId']
    exactly_one = (1 if ia['auth'] else 0) + (1 if ib['auth'] else 0) == 1
    promoted = next((t for t in ('A', 'B') if t != muted), None)
    promoted_is_auth = (ia['auth'] if promoted == 'A' else ib['auth'])
    print('  [6] 交接: 静默端=%s 期望接手=%s(实际 amAuth=%s) ; 收尾 authId A=%s B=%s 同一权威=%s 恰好一个权威=%s'
          % (muted, promoted, promoted_is_auth, ia['authId'], ib['authId'], same_auth, exactly_one))
    print('      任期轨迹: %s' % (terms,))
    post = [r for r in rows if r['t'] > split_t + MUTE_MS]
    ds = []
    for r in post:
        if not r['A']['ball'] or not r['B']['ball']:
            continue
        pa, pb = align_mid(r['A'], r['B'])
        ds.append(sum((x - y) ** 2 for x, y in zip(pa, pb)) ** 0.5)
    ok_conv = longest_streak([d < LIM_P90 for d in ds]) >= 3
    within = next((i for i in range(len(ds) - 2)
                   if all(x < LIM_P90 for x in ds[i:i + 3])), None)
    print('      停发结束后: 样本 %d, 首次连续 3 样本 <%.2fm 出现在第 %s 个(需 <=8), 实测 %s'
          % (len(ds), LIM_P90, within if within is not None else '未出现',
             ['%.2f' % x for x in ds[:8]]))
    # 升格与否取决于"停发是否真的超过了升格门槛": 权威端在 3s 内恢复发帧就不该有人接手(那是防误判的设计)。
    # 因此接手只在"停发后仍然拉开差距"时才是硬要求; 无论如何双权威/各算各的都判不合格。
    starved = len([d for d in ds[:10] if d > LIM_OVER]) >= 3
    ok_takeover = promoted_is_auth or not starved
    if not promoted_is_auth and not starved:
        print('      任期没变(权威端在升格门槛前就恢复了发帧) —— 不判失败, 但记下: %s' % (muted,))
    ok = same_auth and exactly_one and ok_conv and ok_takeover
    if not ds:
        print('      (停发结束后两端没有采到成对球位: 只要权威归属正确就放行)')
    return ok


def check_auth(rows, tails):
    """验收 5: 运行期间本端身份不来回翻转 + tail 无权威交接反复。"""
    ok = True
    for tag in ('A', 'B'):
        seq = [r[tag]['auth'] for r in rows]
        flips = sum(1 for i in range(1, len(seq)) if seq[i] != seq[i - 1])
        terms = [r[tag]['term'] for r in rows if r[tag]['term'] is not None]
        print('  [5] %s: amAuth 翻转 %d 次, authTerm %s→%s, 收尾 authId=%s'
              % (tag, flips, terms[0] if terms else '?', terms[-1] if terms else '?',
                 rows[-1][tag]['authId']))
        if flips > 1:
            ok = False
        lines = [x for x in tails[tag]
                 if ('已成为权威端' in x) or ('本地降级' in x) or ('升格候选' in x)]
        print('      tail 权威变更 %d 条: %s' % (len(lines), [x[:70] for x in lines[-4:]]))
        if len(lines) > 2:
            ok = False
    return ok


def pair_once():
    """确定性配对: A 直接建房 → 读出房号 → B 按房号加入(建房不行再退回随机匹配)。

    为什么不再依赖两端各自随机匹配: 华为匹配池会把"只剩一个已离线玩家"的房挂在池子里十几分钟
    (实测读到过 createTime 差 16 分钟、players 里那个 id 早已不在房间), 于是 matchRoom 要么各开
    各的新房, 要么干脆迟迟不返回(连续 6 轮一人房 + 后来连 A 都落不了房) —— 那测的是池子不是协议。
    建房+按号进房得到的房间结构与随机匹配一致: 满员后仍然由房主单源发 role_assign。"""
    leave_all()
    print('  A:', qa('A', 'create()'))
    if not wait_for('A', lambda t: bool(brief(t)[0].get('roomId')), 45, 'A 建房'):
        print('  A 建房没成 → 退回随机匹配')
        print('  A:', qa('A', 'match()'))
        if not wait_for('A', lambda t: bool(brief(t)[0].get('roomId')), 60, 'A 落房'):
            return False
    rid = brief('A')[0].get('roomId')
    print('  A 房间=%s → B 按房号加入' % rid)
    print('  B:', qa('B', 'join(%s)' % json.dumps(str(rid))))
    if not wait_for('B', lambda t: brief(t)[0].get('roomId') == rid and bool(rid), 40, 'B 进同一房'):
        return False
    return bool(wait_for('A', started_in_game, 60, 'A 开赛')
                and wait_for('B', started_in_game, 60, 'B 开赛'))


def bound_ok():
    """绑网体检: 房间玩家表在 bindNetwork 时刻是否已经齐。
    match_start 可能早于本机收到房间同步, 玩家表半张时双端会各认各的权威/各开各的局。
    要等: 场景刚挂起来时 mag 还不存在(party/authId 都是 null), 一次读就判失败会把好局丢掉。"""
    pa, pb = pick(state('A')), pick(state('B'))
    ok = bool(pa['party'] and pb['party'] and pa['party'] >= 2 and pb['party'] >= 2
              and pa['authId'] and pa['authId'] == pb['authId'])
    if ok:
        print('  A party=%s authId=%s | B party=%s authId=%s' % (pa['party'], pa['authId'], pb['party'], pb['authId']))
    return ok


def freeze_authority():
    """注入一次真实权威交接: 让当前权威端的同步线程闭嘴 4.5s(只停发送) → 对端按 3s 静默升格。
    旧做法是阻塞主线程 5s, 但那会被 GOBE 判掉线并把该端【移出房间】——测的就不是"权威端卡住",
    而是"对手退赛"(实测: 冻结端 roomId 变空、另一端在空房间里继续打完全局)。
    返回 (被静默端, 期望升格端)。"""
    a, b = pick(state('A')), pick(state('B'))
    tag = 'A' if a['auth'] else ('B' if b['auth'] else None)
    if not tag:
        print('  !! 权威交接注入跳过: 没有一端是自认权威端')
        return None
    other = 'B' if tag == 'A' else 'A'
    print(f'  !! 注入权威交接: 静默权威端 {tag} 4.5s, 期望 {other} 升格')
    print('    ', qa(tag, 'mute(4500)'))
    return tag, other


def prepare():
    """把两端拉起到"匹配页待命"。每一轮配对尝试前都要重跑(含页面重载):
    同一页面里上一次尝试留下的游戏场景/旧 PVP 实例还活着(心跳线程继续往现在的房间里发权威帧),
    下一轮就会同时存在 2~3 个权威声明来源, 开局任期已经跳到 3 —— 那不是被测代码的问题, 是尸体在说话。

    但【先退房再重载】, 顺序不能反: 直接重载等于把房间里的连接一扔了之, 服务端要等超时才清,
    连打几轮之后匹配池里全是"满员的鬼房", 新人只能各开各的房(实测连续 6 轮全员 1 人房, 一次都配不上)。"""
    if pages:
        leave_all()   # 手上还连着房就先退掉(重载前退, 别留鬼房)
    open_tabs()
    for tag in ('A', 'B'):
        wait_for(tag, lambda t: 'object' in str(js(t, 'return typeof __qa;')), 60, '__qa 挂载')
    leave_all()
    for tag in ('A', 'B'):
        ok = wait_for(tag, lambda t: brief(t)[2].get('menuPage'), 90, '菜单实例注册')
        if not ok:
            continue
        for _ in range(4):
            r = qa(tag, 'toMatch()')
            if r in ('JUMPING', 'ALREADY_ON_MATCH_PAGE'):
                print(f'  {tag} toMatch={r}')
                break
            time.sleep(4)
    for tag in ('A', 'B'):
        wait_for(tag, lambda t: brief(t)[2].get('matchPage'), 60, '匹配页实例')


def main():
    secs = int(sys.argv[1]) if sys.argv[1:2] and sys.argv[1].isdigit() else 45
    same_room = same_assign = False
    print('== 1) 拉起两端 → 匹配页 ==')
    prepare()

    print('== 2) 配对开赛(匹配在华为侧, 各进各房的概率不低 → 最多重试 6 次, 每轮重载页面) ==')
    paired = False
    for attempt in range(1, 7):
        print(f'-- 第 {attempt} 次 --')
        if attempt > 1:
            prepare()
        if pair_once() and wait_for('A', lambda _t: bound_ok(), 20, '两端绑网完整'):
            paired = True
            break
    if not paired:
        print('  !! 6 次都没能"同房 + 绑网完整", 本次无法测量(停在配对阶段)')
        return

    sa, sb = state('A'), state('B')
    ra, rb = (sa.get('net') or {}), (sb.get('net') or {})
    fa = (sa.get('page') or {}).get('finalAssignment')
    fb = (sb.get('page') or {}).get('finalAssignment')
    same_room = str(ra.get('roomId')) == str(rb.get('roomId')) and bool(ra.get('roomId'))
    same_assign = json.dumps(fa, sort_keys=True) == json.dumps(fb, sort_keys=True)
    print('  房间: A=%s B=%s   玩家: A=%d B=%d' % (ra.get('roomId'), rb.get('roomId'),
          len(ra.get('players') or []), len(rb.get('players') or [])))
    print('  [1] 同房=%s 分配表一致=%s' % (same_room, same_assign))
    print('      A 分配表=%s' % (json.dumps(fa),))
    print('      B 分配表=%s' % (json.dumps(fb),))

    print(f'== 4) 打 {secs}s 真回合(交替发球/击球/移动 + 中途注入一次权威交接) ==')
    rows = []
    terms = {'A': [], 'B': []}
    split_t = None
    muted = None
    injected = False
    t0 = time.time()
    i = 0
    while time.time() - t0 < secs:
        i += 1
        if not injected and time.time() - t0 > secs * 0.5:
            injected = True
            split_t = int((time.time() - t0) * 1000)
            res = freeze_authority()
            muted = res[0] if res else None
        for tag in ('A', 'B'):
            try:
                if i % 6 == 1:
                    qa(tag, 'serve()')
                elif i % 3 == 0:
                    qa(tag, 'hit()')
                else:
                    qa(tag, 'moveTo(%d,%d)' % ((i * 37) % 360 - 180, 60))
            except Exception:
                pass
        a, b = pick(state('A')), pick(state('B'))
        if a['ball'] and b['ball']:
            rows.append({'t': int((time.time() - t0) * 1000), 'A': a, 'B': b})
        for tag, s in (('A', a), ('B', b)):
            if s['term'] is not None and (not terms[tag] or terms[tag][-1][1] != s['term']):
                terms[tag].append((int((time.time() - t0) * 1000), s['term']))
        if i % 20 == 0:
            print('    @%ds A auth=%s term=%s tx=%s rx=%s/%s cd=%s ball=%s | B auth=%s term=%s tx=%s rx=%s/%s cd=%s ball=%s'
                  % (int(time.time() - t0), a['auth'], a['term'], a['tx'], a['rx'], a['rxSeq'], a['cd'], a['ball'],
                     b['auth'], b['term'], b['tx'], b['rx'], b['rxSeq'], b['cd'], b['ball']))
        time.sleep(0.4)

    print('  成对样本: %d' % len(rows))
    tails = {}
    for tag in ('A', 'B'):
        r = js(tag, 'return JSON.stringify(__qa.tail(1200));')
        try:
            tails[tag] = json.loads(r) if isinstance(r, str) else []
        except Exception:
            tails[tag] = []

    print('== 5) 验收 ==')
    ok_ball = check_ball(rows, split_t if injected else None) if rows else False
    ok_clock = check_clock(rows, split_t if injected else None) if rows else False
    ok_scores = check_scores(rows) if rows else False
    ok_auth = check_auth(rows, tails) if rows else False
    ok_hand = check_handover(rows, split_t, muted, terms) if (rows and injected and muted) else False

    print('== 8) 收尾快照 ==')
    for tag in ('A', 'B'):
        st = state(tag)
        n, g = st.get('net') or {}, st.get('game') or {}
        print('  %s amAuth=%s authId=%s term=%s hitSeq=%s applied=%s tx=%s rx=%s rxSeq=%s phase=%s cd=%s scores=%s ball=%s holder=%s' % (
            tag, n.get('amAuth'), n.get('authId'), n.get('authTerm'), n.get('hitSeq'),
            n.get('appliedHitSeq'), n.get('txAuthFrames'), n.get('rxAuthFrames'), n.get('rxAuthSeq'),
            g.get('phase'), g.get('cd'), g.get('scores'), g.get('ball'),
            g.get('holderId')))
        logs = js(tag, 'return JSON.stringify(__qa.tail(600).filter(function(x){return /已成为权威|降级|升格|无响应|指派|match_start|校验失败|丢弃击球|缺口|发球超时/.test(x)}).slice(-6));')
        print('    ', str(logs)[:700])
        fp = js(tag, 'return JSON.stringify(__qa.frames());')
        print('    帧通道原始: %s' % str(fp)[:1200])
        dj = js(tag, 'return JSON.stringify({ticks:__qa.state().net.rxFrameTicks,drops:__qa.state().net.authFrameDrops,'
                     'dropFrom:__qa.state().net.authFrameDropFrom,rx:__qa.state().net.rxAuthFrames});')
        print('    权威帧落地: %s' % str(dj)[:600])

    print('== 结果 ==')
    checks = [
        ('[1] 同房+分配表', same_room and same_assign),
        ('[2] 时钟一致    ', ok_clock),
        ('[3] 球位偏差(稳态)', ok_ball),
        ('[4] 比分一致    ', ok_scores),
        ('[5] 权威不翻转  ', ok_auth),
        ('[6] 交接正确    ', ok_hand),
    ]
    for name, ok in checks:
        print('  %s : %s' % (name, 'PASS' if ok else 'FAIL'))
    print('  == %s ==' % ('全部通过' if all(ok for _, ok in checks) else '有不合格项'))


if __name__ == '__main__':
    main()
