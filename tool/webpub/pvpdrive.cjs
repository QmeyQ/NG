// Node/CDP port of tool/webpub/pvpdrive.py (DrissionPage/Python unavailable in this env).
// Drives two isolated origins (127.0.0.1 vs localhost) through the in-page __qa API.
// Usage: node tool/webpub/pvpdrive.cjs [seconds=45] [attempts=6]
const CDP = 'http://127.0.0.1:9227';
// 两个端口 = 两个 origin(存储天然隔离), 但 host 都是 127.0.0.1。
// localhost 源向 Worker /token 的 POST 预检会被挂起(实测 12s 无响应), 注册永远不返回, 不能用。
const URLS = {
    A: 'http://127.0.0.1:8125/index.html?qa=1',
    B: 'http://127.0.0.1:8124/index.html?qa=1'
};
const ORIGIN = { A: '127.0.0.1:8125', B: '127.0.0.1:8124' };
const SERVE_PHASES = new Set(['1', '2']);
const EAGLE_PHASES = new Set(['6', '7']);
const LIM_MEDIAN = 0.10, LIM_P90 = 0.30, LIM_OVER = 1.0, COURT_X = 8.0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Page {
    constructor(tag, wsUrl) {
        this.tag = tag;
        this.wsUrl = wsUrl;
        this.id = 0;
        this.pending = new Map();
        this.logs = [];
    }
    async open() {
        this.ws = new WebSocket(this.wsUrl);
        await new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error(this.tag + ' ws timeout')), 10000);
            this.ws.addEventListener('open', () => { clearTimeout(t); resolve(); });
            this.ws.addEventListener('error', (e) => { clearTimeout(t); reject(new Error(this.tag + ' ws error')); });
        });
        this.ws.addEventListener('message', (ev) => {
            let msg;
            try { msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ''); } catch (e) { return; }
            const p = this.pending.get(msg.id);
            if (msg.method === 'Runtime.consoleAPICalled') {
                const args = (msg.params.args || []).map((a) => a.value !== undefined ? String(a.value) : (a.description || a.type)).join(' ');
                this.logs.push(msg.params.type + ': ' + args.slice(0, 200));
                if (this.logs.length > 500) this.logs.splice(0, 100);
                return;
            }
            if (msg.method === 'Runtime.exceptionThrown') {
                const d = msg.params.exceptionDetails || {};
                this.logs.push('exception: ' + String((d.exception && d.exception.description) || d.text || '').slice(0, 300));
                return;
            }
            if (!p) return;
            this.pending.delete(msg.id);
            if (msg.error) p.reject(new Error(this.tag + ' ' + msg.error.message));
            else p.resolve(msg.result);
        });
        await this.send('Runtime.enable');
        await this.send('Page.enable');
        return this;
    }
    send(method, params = {}, timeout = 15000) {
        const id = ++this.id;
        return new Promise((resolve, reject) => {
            const t = setTimeout(() => { this.pending.delete(id); reject(new Error(this.tag + ' ' + method + ' timeout')); }, timeout);
            this.pending.set(id, {
                resolve: (v) => { clearTimeout(t); resolve(v); },
                reject: (e) => { clearTimeout(t); reject(e); }
            });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }
    async eval(expr, timeout = 15000) {
        const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, timeout);
        if (r.exceptionDetails) {
            const d = r.exceptionDetails;
            throw new Error((d.exception && d.exception.description) || d.text || 'eval error');
        }
        return r.result ? r.result.value : undefined;
    }
    async navigate(url) {
        await this.send('Page.navigate', { url }, 20000);
    }
    close() { try { this.ws.close(); } catch (e) { } }
}

async function listTargets() {
    const r = await fetch(CDP + '/json/list');
    return await r.json();
}

/** 浏览器级 CDP 连接: 建新窗口必须走 Target.createTarget(newWindow), /json/new 只能开标签页。
 *  同一窗口里的第二个标签页 document.visibilityState=hidden → Laya 主循环(rAF)冻结,
 *  启动页的 Res.vers / 游戏 Timer 全停(实测 A 端卡"正在检查资源"180s+)。两个独立窗口都保持 visible。 */
let _browser = null;
async function browserSend(method, params = {}) {
    if (!_browser) {
        const v = await (await fetch(CDP + '/json/version')).json();
        const ws = new WebSocket(v.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
            ws.addEventListener('open', resolve);
            ws.addEventListener('error', () => reject(new Error('browser ws error')));
        });
        const pending = new Map();
        let id = 0;
        ws.addEventListener('message', (ev) => {
            let msg;
            try { msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ''); } catch (e) { return; }
            const p = pending.get(msg.id);
            if (!p) return;
            pending.delete(msg.id);
            if (msg.error) p.reject(new Error(method + ' ' + msg.error.message));
            else p.resolve(msg.result);
        });
        _browser = {
            send: (m, prm = {}) => new Promise((resolve, reject) => {
                const i = ++id;
                pending.set(i, { resolve, reject });
                ws.send(JSON.stringify({ id: i, method: m, params: prm }));
            })
        };
    }
    return await _browser.send(method, params);
}

async function newTab(url, newWindow = false) {
    if (newWindow) {
        const r = await browserSend('Target.createTarget', { url, newWindow: true });
        const list = await listTargets();
        const t = list.find((x) => x.id === r.targetId) || list.find((x) => (x.url || '') === url);
        if (!t) throw new Error('created target not found in /json/list');
        return t;
    }
    const r = await fetch(CDP + '/json/new?' + encodeURIComponent(url), { method: 'PUT' });
    if (!r.ok) throw new Error('create target failed ' + r.status);
    return await r.json();
}

async function closeTarget(id) {
    try { await fetch(CDP + '/json/close/' + encodeURIComponent(id)); } catch (e) { }
}

async function cleanupTabs() {
    const list = await listTargets();
    for (const t of list) {
        if (/:(8123|8124|8125)\//.test(t.url || '')) await closeTarget(t.id);
    }
}

async function openPair() {
    await cleanupTabs();
    await sleep(500);
    const pages = {};
    for (const tag of ['A', 'B']) {
        const info = await newTab(URLS[tag] + '&v=' + Date.now(), true);
        const p = new Page(tag, info.webSocketDebuggerUrl);
        await p.open();
        pages[tag] = p;
        // fresh profile blocks on the canvas privacy checkbox; same flags the old browser profile had
        try { await p.eval("localStorage.setItem('qa','1');localStorage.setItem('privacyAgreed','1');'ok'"); } catch (e) { }
        await p.navigate(URLS[tag] + '&v=' + Date.now());
        try { console.log(`  ${tag} visibility=${await p.eval('document.visibilityState')}`); } catch (e) { }
    }
    return pages;
}

async function booted(page) {
    try { return (await page.eval('typeof __qa')) === 'object'; } catch (e) { return false; }
}

async function ensureBoot(page, tries = 4) {
    for (let i = 0; i < tries; i++) {
        if (await booted(page)) return true;
        console.log(`  ${page.tag} 第${i + 1}次未装载 __qa → 重载`);
        try { await page.navigate(URLS[page.tag] + '&v=' + Date.now()); } catch (e) { }
        await sleep(6000);
    }
    return await booted(page);
}

async function js(page, expr) {
    try { return await page.eval(expr); } catch (e) { return 'ERR ' + String(e.message || e).slice(0, 100); }
}

async function qa(page, call) {
    return String(await js(page, 'String(__qa.' + call + ')'));
}

async function state(page) {
    try {
        const s = await page.eval('JSON.stringify(__qa.state())');
        return JSON.parse(s);
    } catch (e) {
        console.log(`    ${page.tag} state() 异常: ${String(e.message || e).slice(0, 90)}`);
        return {};
    }
}

async function pairStates(pages) {
    const [a, b] = await Promise.all([state(pages.A), state(pages.B)]);
    return { A: a || {}, B: b || {} };
}

async function waitFor(tag, page, pred, timeout, label, step = 1000) {
    const end = Date.now() + timeout * 1000;
    while (Date.now() < end) {
        try {
            const v = await pred();
            if (v) return v;
        } catch (e) {
            console.log(`    ${tag} ${label} 探测异常: ${String(e.message || e).slice(0, 80)}`);
        }
        await sleep(step);
    }
    console.log(`    !! ${tag} 等待 ${label} 超时 ${timeout}s`);
    return false;
}

function brief(st) {
    return { net: (st && st.net) || {}, page: (st && st.page) || {}, roles: (st && st.roles) || {} };
}

async function settled(page) {
    const st = await state(page);
    const { net, page: pg, roles } = brief(st);
    return !net.roomId && !pg.isMatching && !roles.game;
}

async function unstuck(page) {
    const st = await state(page);
    const { net, page: pg, roles } = brief(st);
    if (roles.game || (pg.started && !net.roomId)) {
        console.log(`  ${page.tag} 卡在游戏场景 → back()=${await qa(page, 'back()')}`);
        return true;
    }
    return false;
}

async function leaveAll(pages) {
    for (const tag of ['A', 'B']) {
        const page = pages[tag];
        for (let i = 0; i < 10; i++) {
            if (await settled(page)) break;
            if (!(await unstuck(page))) await qa(page, 'cancel()');
            await sleep(1500);
        }
        console.log(`  ${tag} 清场=${await settled(page)}`);
    }
}

async function clickAt(page, fx, fy) {
    try {
        const m = await page.send('Page.getLayoutMetrics');
        const vp = m.cssLayoutViewport || m.layoutViewport;
        const x = Math.round(vp.clientWidth * fx), y = Math.round(vp.clientHeight * fy);
        await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    } catch (e) { }
}

/** 资源下载确认弹窗的"确定"在画布正中偏下(实测 1259x805 截图 x≈47%, y≈87%)。
 *  早期盲点 (71%,67%) 是 ui 包弹窗的位置, nor 包弹窗完全不同 → 点不中就一直卡在菜单。 */
async function clickDownload(page) {
    await clickAt(page, 0.47, 0.865);
    await new Promise((r) => setTimeout(r, 250));
    await clickAt(page, 0.71, 0.67);
}

/** 首次运行: 隐私弹窗早已同意, 但 ui/nor 资源要从 CDN 下载。下载按钮在画布上(无 DOM), 只能按坐标点。 */
async function waitRole(page, want, timeoutSec, label) {
    const tag = page.tag;
    const end = Date.now() + timeoutSec * 1000;
    let lastClick = 0;
    while (Date.now() < end) {
        const r = ((await state(page)).roles) || {};
        if (r[want]) return true;
        if (Date.now() - lastClick > 4000) { await clickDownload(page); lastClick = Date.now(); }
        await sleep(1000);
    }
    console.log(`    !! ${tag} 等待 ${label} 超时 ${timeoutSec}s (roles=${JSON.stringify(((await state(page)).roles) || {})})`);
    return false;
}

async function prepare(pages) {
    await leaveAll(pages);
    for (const tag of ['A', 'B']) {
        await pages[tag].navigate(URLS[tag] + '&v=' + Date.now());
        await sleep(3000);
        if (!(await ensureBoot(pages[tag]))) throw new Error(`${tag} 装载不出 __qa`);
    }
    await leaveAll(pages);
    for (const tag of ['A', 'B']) {
        const page = pages[tag];
        await waitRole(page, 'menuPage', 180, '菜单实例注册(含首次资源下载)');
        const end = Date.now() + 60000;
        while (Date.now() < end) {
            if ((((await state(page)).net) || {}).inited) break;
            await sleep(3000);
        }
        console.log(`  ${tag} net.init=${!!(((await state(page)).net) || {}).inited}`);
        for (let i = 0; i < 4; i++) {
            const r = await qa(page, 'toMatch()');
            if (r === 'JUMPING' || r === 'ALREADY_ON_MATCH_PAGE') { console.log(`  ${tag} toMatch=${r}`); break; }
            await sleep(3000);
        }
    }
    for (const tag of ['A', 'B']) {
        const page = pages[tag];
        await waitRole(page, 'matchPage', 120, '匹配页实例(含 nor 资源下载)');
    }
}

async function startedInGame(st) {
    const { net, page: pg, roles } = brief(st);
    return !!(pg.started && net.roomId && roles.game);
}

async function framesFlowing(pages) {
    let ok = true;
    for (const tag of ['A', 'B']) {
        let f = {};
        try { f = JSON.parse(await pages[tag].eval('JSON.stringify(__qa.frames())')); } catch (e) { }
        const n = f.n || 0;
        if (!n || !(f.selfEntry || f.otherEntry)) ok = false;
        console.log(`  ${tag} 原始帧 n=${n} withInfo=${f.withInfo} self=${f.selfEntry} other=${f.otherEntry}`);
    }
    return ok;
}

async function boundOk(pages) {
    const { A, B } = await pairStates(pages);
    const ga = A.game || {}, gb = B.game || {};
    const na = A.net || {}, nb = B.net || {};
    const ok = !!(ga.party && gb.party && ga.party >= 2 && gb.party >= 2 && na.authId && na.authId === nb.authId);
    if (ok) console.log(`  A party=${ga.party} authId=${na.authId} | B party=${gb.party} authId=${nb.authId}`);
    return ok;
}

async function pairOnce(pages) {
    await leaveAll(pages);
    console.log('  A:', await qa(pages.A, 'match()'));
    const gotRoom = await waitFor('A', pages.A, async () => {
        const st = await state(pages.A);
        return (st.net || {}).roomId || false;
    }, 60, 'A 落房');
    if (!gotRoom) {
        const st = await state(pages.A);
        console.log('  A 现场:', JSON.stringify(brief(st)));
        try { console.log('  A 日志尾:', JSON.stringify((await qa(pages.A, 'tail(24)')) || [])); } catch (e) { }
        try { console.log('  A 控制台尾:', JSON.stringify(pages.A.logs.slice(-16))); } catch (e) { }
        await qa(pages.A, 'cancel()');
        return false;
    }
    const rid = (await state(pages.A)).net.roomId;
    console.log(`  A 房=${rid} → B 按房号加入`);
    console.log('  B:', await qa(pages.B, 'join(' + JSON.stringify(String(rid)) + ')'));
    let joined = await waitFor('B', pages.B, async () => {
        const st = await state(pages.B);
        return String((st.net || {}).roomId || '') === String(rid);
    }, 35, 'B 进 A 的房');
    if (!joined) {
        console.log('  按号进房没成 → 退回两端各自匹配');
        console.log('  B:', await qa(pages.B, 'match()'));
        joined = await waitFor('B', pages.B, async () => !!((await state(pages.B)).net || {}).roomId, 30, 'B 落房');
        if (!joined) {
            await qa(pages.A, 'cancel()');
            await qa(pages.B, 'cancel()');
            return false;
        }
    }
    const ok = await waitFor('A', pages.A, async () => startedInGame(await state(pages.A)), 45, 'A 开赛')
        && await waitFor('B', pages.B, async () => startedInGame(await state(pages.B)), 45, 'B 开赛');
    if (!ok) {
        console.log(`  没开成赛: A 房=${((await state(pages.A)).net || {}).roomId} B 房=${((await state(pages.B)).net || {}).roomId}`);
        for (const tag of ['A', 'B']) {
            try { console.log(`  ${tag} 日志尾:`, JSON.stringify((await qa(pages[tag], 'tail(24)')) || [])); } catch (e) { }
            try { console.log(`  ${tag} 控制台尾:`, JSON.stringify(pages[tag].logs.slice(-16))); } catch (e) { }
        }
        await qa(pages.A, 'cancel()');
        await qa(pages.B, 'cancel()');
        return false;
    }
    const sa = await state(pages.A), sb = await state(pages.B);
    const ra = (sa.net || {}).roomId, rb = (sb.net || {}).roomId;
    if (!ra || String(ra) !== String(rb)) {
        console.log(`  各进各的房: A=${ra} B=${rb}`);
        return false;
    }
    console.log(`  同房=${ra}`);
    const maps = {};
    for (const tag of ['A', 'B']) {
        // 地图行在游戏场景加载完成后才打印, 开赛瞬间可能还没到 → 轮询最多 20s
        let line = '';
        const end = Date.now() + 20000;
        while (Date.now() < end) {
            line = pages[tag].logs.filter((x) => x.indexOf('角色模型映射') >= 0).slice(-1)[0] || '';
            if (line) break;
            await sleep(500);
        }
        maps[tag] = line ? line.replace(/^[^:]+:\s*/, '') : '(未捕获)';
        console.log(`  ${tag} ${maps[tag]}`);
    }
    console.log(`  角色映射双端一致=${maps.A === maps.B && maps.A !== '(未捕获)'}`);
    return true;
}

function pick(st) {
    const n = st.net || {}, g = st.game || {};
    return {
        me: String(n.me || ''), auth: !!n.amAuth, term: n.authTerm,
        authId: String(n.authId || ''), phase: String(g.phase),
        cd: g.cd == null ? null : g.cd, ball: g.ball || null, scores: g.scores || null,
        remain: g.remainMs, holder: g.holderId == null ? null : g.holderId, reason: g.lastScoreReason,
        server: g.serverId == null ? null : g.serverId, assigned: g.isBallAssigned, isP: g.localIsP,
        chaId: g.localChaId, playersP: g.playersP, serveTeam: g.servingTeam,
        party: g.party, calc: !!g.ballCalc, sleep: !!g.ballSleeping, tx: n.txAuthFrames, rx: n.rxAuthFrames, rxSeq: n.rxAuthSeq,
        t: st.at, vel: g.ballVel || null, eagle: !!g.eaglePlaying,
        track: g.trackPts, localCha: g.localCha || null,
        hitSeq: n.hitSeq, applied: n.appliedHitSeq
    };
}

function inStall(t, splitT) {
    return splitT != null && (splitT - 500) <= t && t <= (splitT + 4500 + 2000);
}

function alignMid(a, b) {
    const ta = a.t, tb = b.t, va = a.vel, vb = b.vel;
    if (!ta || !tb || !va || !vb || !a.ball || !b.ball) return [a.ball, b.ball];
    const dt = (tb - ta) / 1000;
    if (Math.abs(dt) > 0.5) return [a.ball, b.ball];
    const half = dt / 2;
    const pa = a.ball.map((x, i) => x + va[i] * half);
    const pb = b.ball.map((x, i) => x - vb[i] * half);
    return [pa, pb];
}

function longestStreak(flags) {
    let best = 0, cur = 0;
    for (const f of flags) { cur = f ? cur + 1 : 0; best = Math.max(best, cur); }
    return best;
}

function dist3(a, b) { return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2); }

function checkBall(rows, splitT) {
    const ds = [], worst = [], stall = [], outside = [], eagle = [], phaseDiff = [];
    let mirrored = 0, phase1 = 0, phase1Max = 0, phase1Sample = null;
    for (const r of rows) {
        const a = r.A.ball, b = r.B.ball;
        if (!a || !b) continue;
        const [pa, pb] = alignMid(r.A, r.B);
        const d = dist3(pa, pb);
        // 镜像判定: |Az + Bz| 很小而两端 z 差很大 → 不是漂移, 是球被放到了球网另一侧
        if (Math.abs(a[2] + b[2]) < 1.0 && Math.abs(a[2] - b[2]) > 1.0) mirrored++;
        if (r.A.phase === '1' || r.B.phase === '1') {
            phase1++;
            if (d > phase1Max) { phase1Max = d; phase1Sample = r; }
        }
        const w = { d, t: r.t, a, b, phase: r.A.phase, auth: r.A.auth, holderA: r.A.holder, holderB: r.B.holder, calcA: r.A.calc, calcB: r.B.calc, sleepA: r.A.sleep, sleepB: r.B.sleep, r };        if (inStall(r.t, splitT)) stall.push(d);
        else if (EAGLE_PHASES.has(r.A.phase) || EAGLE_PHASES.has(r.B.phase) || r.A.eagle || r.B.eagle) eagle.push(w);
        // 阶段不同时球不可比: 分球/换回合会让球瞬移(落点 → 发球员手), 状态帧送达前
        // 对端还在上一阶段是设计内的传输时延(时钟检查允许 <=2 个样本)。
        else if (r.A.phase !== r.B.phase) phaseDiff.push(w);
        else if (Math.abs(a[0]) > COURT_X || Math.abs(b[0]) > COURT_X) outside.push(w);
        else { ds.push(d); worst.push(w); }
    }
    console.log(`      镜像样本(|Az+Bz|<1 且 |Az-Bz|>1) ${mirrored} 个; phase=1 样本 ${phase1} 最大差 ${phase1Max.toFixed(2)}m`);
    if (phase1Sample) console.log(`      phase=1 最差: A=${phase1Sample.A.ball} B=${phase1Sample.B.ball} holder=${phase1Sample.A.holder}/${phase1Sample.B.holder} cd=${phase1Sample.A.cd}/${phase1Sample.B.cd} auth=${phase1Sample.A.auth}/${phase1Sample.B.auth}`);
    if (stall.length) console.log(`      (故障段 ${stall.length} 样本, 最大 ${Math.max(...stall).toFixed(2)}m, 不计入验收)`);
    if (eagle.length) console.log(`      鹰眼回放段 ${eagle.length} 样本, 最大 ${Math.max(...eagle.map((w) => w.d)).toFixed(2)}m`);
    if (phaseDiff.length) console.log(`      阶段不同 ${phaseDiff.length} 样本, 最大 ${Math.max(...phaseDiff.map((w) => w.d)).toFixed(2)}m, 不计入验收`);
    if (outside.length) console.log(`      场地外样本 ${outside.length} 个, 最大 ${Math.max(...outside.map((w) => w.d)).toFixed(2)}m`);
    if (!ds.length) { console.log('  [3] 球位: 没有稳态成对样本'); return false; }
    const s = ds.slice().sort((x, y) => x - y);
    const med = s[Math.floor(s.length / 2)];
    const p90 = s[Math.min(s.length - 1, Math.floor(s.length * 0.9))];
    const over = worst.filter((w) => w.d > LIM_OVER);
    const overRun = longestStreak(worst.map((w) => w.d > LIM_OVER));
    const fly = over.filter((w) => w.calcA && w.calcB);
    console.log(`  [3] 球位偏差 m(稳态, 已按球速对齐): median=${med.toFixed(3)} p90=${p90.toFixed(3)} max=${s[s.length - 1].toFixed(3)} (n=${s.length})`);
    console.log(`      >1m 单样本 ${over.length} 个(最长连续 ${overRun}, 需 <=1), 其中两端都在积分 ${fly.length} 个`);
    for (const w of worst.slice().sort((x, y) => y.d - x.d).slice(0, 3)) {
        console.log(`      最差 d=${w.d.toFixed(2)}m @${w.t}ms A=${w.a.map((v) => v.toFixed(2))} B=${w.b.map((v) => v.toFixed(2))} phase=${w.r.A.phase}/${w.r.B.phase} authA=${w.auth} holder=${w.holderA}/${w.holderB} assigned=${w.r.A.assigned}/${w.r.B.assigned} server=${w.r.A.server}/${w.r.B.server} isP=${w.r.A.isP}/${w.r.B.isP} cha=${w.r.A.chaId}/${w.r.B.chaId} serveTeam=${w.r.A.serveTeam}/${w.r.B.serveTeam} calc=${w.calcA}/${w.calcB} sleep=${w.sleepA}/${w.sleepB}`);
        console.log(`      A players=${JSON.stringify(w.r.A.playersP)}`);
        console.log(`      B players=${JSON.stringify(w.r.B.playersP)}`);
    }
    return med < LIM_MEDIAN && p90 < LIM_P90 && overRun <= 1;
}

function checkClock(rows, splitT) {
    const seq = rows.filter((r) => SERVE_PHASES.has(r.A.phase) && r.A.ball && r.B.ball && !inStall(r.t, splitT));
    if (!seq.length) { console.log('  [2] 时钟: 无发球/准备阶段样本'); return false; }
    const exact = seq.map((r) => r.A.cd === r.B.cd);
    const phaseRun = longestStreak(seq.map((r) => r.A.phase !== r.B.phase));
    const bad = seq.filter((r) => r.A.phase === r.B.phase && (r.A.cd == null || r.B.cd == null || Math.abs(r.A.cd - r.B.cd) > 1));
    const streak = longestStreak(exact);
    console.log(`  [2] 时钟: 样本 ${seq.length}, 精确一致 ${exact.filter(Boolean).length}, 最长连续 ${streak} (需>=10), 差>1秒 ${bad.length} (需0), 阶段不同最长 ${phaseRun} (需<=2)`);
    if (bad.length) console.log('      超差前 6:', bad.slice(0, 6).map((r) => [r.A.cd, r.B.cd, r.A.phase, r.B.phase]));
    return streak >= 10 && !bad.length && phaseRun <= 2;
}

function checkScores(rows) {
    const valid = rows.filter((r) => r.A.scores || r.B.scores);
    const flags = valid.map((r) => r.A.scores && r.B.scores && r.A.scores.left === r.B.scores.left && r.A.scores.right === r.B.scores.right);
    const diff = flags.filter((f) => !f).length;
    const run = longestStreak(flags.map((f) => !f));
    const last = rows.length ? rows[rows.length - 1] : null;
    const la = last ? last.A.scores : null, lb = last ? last.B.scores : null;
    console.log(`  [4] 比分: 收尾 A=${JSON.stringify(la)} B=${JSON.stringify(lb)}; 不一致 ${diff}/${flags.length}, 最长连续 ${run} (需<=3)`);
    return !!la && !!lb && la.left === lb.left && la.right === lb.right && run <= 3;
}

function checkAuth(rows, tails) {
    let ok = true;
    for (const tag of ['A', 'B']) {
        const seq = rows.map((r) => r[tag].auth);
        let flips = 0;
        for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) flips++;
        const terms = rows.map((r) => r[tag].term).filter((x) => x != null);
        console.log(`  [5] ${tag}: amAuth 翻转 ${flips} 次, authTerm ${terms[0]}→${terms[terms.length - 1]}, 收尾 authId=${rows.length ? rows[rows.length - 1][tag].authId : '?'}`);
        if (flips > 1) ok = false;
        const lines = (tails[tag] || []).filter((x) => /已成为权威端|本地降级|升格候选/.test(x));
        console.log(`      tail 权威变更 ${lines.length} 条:`, lines.slice(-4).map((x) => x.slice(0, 80)));
        if (lines.length > 2) ok = false;
    }
    return ok;
}

function checkHandover(rows, splitT, muted, terms) {
    if (splitT == null || !muted || !rows.length) { console.log('  [6] 交接: 未注入或没有样本'); return false; }
    const end = rows[rows.length - 1];
    const sameAuth = !!end.A.authId && end.A.authId === end.B.authId;
    const oneAuth = (end.A.auth ? 1 : 0) + (end.B.auth ? 1 : 0) === 1;
    const promoted = muted === 'A' ? 'B' : 'A';
    const promotedIsAuth = end[promoted].auth;
    const post = rows.filter((r) => r.t > splitT + 4500);
    const ds = [];
    for (const r of post) {
        if (!r.A.ball || !r.B.ball) continue;
        const [pa, pb] = alignMid(r.A, r.B);
        ds.push(dist3(pa, pb));
    }
    const within = (() => {
        for (let i = 0; i + 2 < ds.length; i++) if (ds[i] < LIM_P90 && ds[i + 1] < LIM_P90 && ds[i + 2] < LIM_P90) return i;
        return null;
    })();
    const starved = ds.slice(0, 10).filter((d) => d > LIM_OVER).length >= 3;
    console.log(`  [6] 交接: 静默=${muted} 期望接手=${promoted}(实际 amAuth=${promotedIsAuth}); 收尾 authId A=${end.A.authId} B=${end.B.authId} 同一权威=${sameAuth} 恰好一个=${oneAuth}`);
    console.log(`      任期轨迹: ${JSON.stringify(terms)}`);
    console.log(`      停发后样本 ${ds.length}, 首次连续3样本<0.3m 在第 ${within == null ? '未出现' : within} 个 (需<=8), 前8=${ds.slice(0, 8).map((d) => d.toFixed(2))}`);
    return sameAuth && oneAuth && within != null && within <= 8 && (promotedIsAuth || !starved);
}

async function gather(pages) {
    const tails = {}, stats = {};
    for (const tag of ['A', 'B']) {
        try { tails[tag] = JSON.parse(await pages[tag].eval('JSON.stringify(__qa.tail(1500))')); } catch (e) { tails[tag] = []; }
        try { stats[tag] = JSON.parse(await pages[tag].eval('JSON.stringify(__qa.msgStats())')); } catch (e) { stats[tag] = {}; }
    }
    return { tails, stats };
}

(async () => {
    const secs = Number(process.argv[2] || 45);
    const attempts = Number(process.argv[3] || 6);
    try {
        const pre = await Promise.all(['A', 'B'].map((tag) => fetch(URLS[tag])));
        console.log(`  两个 origin 状态: A=${pre[0].status} B=${pre[1].status}`);
        if (pre[0].status !== 200 || pre[1].status !== 200) throw new Error('静态服务不可用');
    } catch (e) {
        console.log('!! 静态服务检查失败:', e.message);
        process.exit(1);
    }

    const pages = await openPair();
    let paired = false;
    try {
        if (process.env.SMOKE === '1') {
            for (const tag of ['A', 'B']) {
                const page = pages[tag];
                await page.navigate(URLS[tag] + '&v=' + Date.now());
                const end = Date.now() + 100000;
                let last = '';
                while (Date.now() < end) {
                    const st = await state(page);
                    const r = st.roles || {};
                    if (r.menuPage) break;
                    const cur = JSON.stringify(r) + ' netInit=' + !!((st.net || {}).inited);
                    if (cur !== last) { console.log(tag, 'wait:', cur); last = cur; }
                    await sleep(3000);
                }
                console.log(tag, 'readyState=', await js(page, 'document.readyState'),
                    'body=', JSON.stringify(String(await js(page, 'document.body ? document.body.innerText.slice(0,200) : "<none>"')).slice(0, 200)));
                console.log(tag, 'bundle=', await js(page, 'typeof window.__setBundle_ + "/" + typeof window.__bundle__'),
                    'qa=', await js(page, 'typeof __qa'));
                console.log(tag, 'canvas=', await js(page, 'document.querySelectorAll("canvas").length'),
                    'scripts=', await js(page, 'document.scripts.length'));
                console.log(tag, 'badRes=', String(await js(page, 'JSON.stringify(performance.getEntriesByType("resource").filter(function(e){return e.responseStatus && e.responseStatus>=400;}).map(function(e){return [e.name.slice(-70),e.responseStatus];}).slice(-10))')).slice(0, 800));
                console.log(tag, 'qaStoreLogs=', String(await js(page, 'JSON.stringify(((window.__qaStore||{}).logs)||[]).slice(-10)')).slice(0, 900));
                try {
                    const shot = await page.send('Page.captureScreenshot', { format: 'png' });
                    require('fs').writeFileSync(`local/smoke-${tag}.png`, Buffer.from(shot.data, 'base64'));
                    console.log(tag, 'screenshot → local/smoke-' + tag + '.png');
                } catch (e) { console.log(tag, 'screenshot failed', e.message); }
                console.log(tag, 'laya=', await js(page, 'typeof Laya + "/" + (window.Laya && Laya.stage ? Laya.stage.numChildren : "?")'));
                if (process.env.DOWNLOAD === '1') {
                    const m = await page.send('Page.getLayoutMetrics');
                    const W = Math.round((m.cssLayoutViewport || m.layoutViewport).clientWidth);
                    const H = Math.round((m.cssLayoutViewport || m.layoutViewport).clientHeight);
                    console.log(tag, 'viewport=', W + 'x' + H, '→ 轮询点击下载直到菜单就绪');
                    const end2 = Date.now() + 180000;
                    while (Date.now() < end2) {
                        const r = (await state(page)).roles || {};
                        if (r.menuPage) { console.log(tag, 'menuPage 已就绪'); break; }
                        await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: Math.round(W * 0.71), y: Math.round(H * 0.67), button: 'left', clickCount: 1 });
                        await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(W * 0.71), y: Math.round(H * 0.67), button: 'left', clickCount: 1 });
                        await sleep(4000);
                    }
                    console.log(tag, 'afterDownload roles=', JSON.stringify((await state(page)).roles));
                    const end3 = Date.now() + 60000;
                    while (Date.now() < end3) {
                        const st = await state(page);
                        if ((st.net || {}).inited) break;
                        await sleep(3000);
                    }
                    console.log(tag, 'net.inited=', !!((await state(page)).net || {}).inited);
                    console.log(tag, 'recent=', JSON.stringify(page.logs.filter((x) => /联机|GOBE|menu|Res.*(完成|失败)/.test(x)).slice(-8)));
                    try {
                        const t = JSON.parse(await page.eval('JSON.stringify(__qa.tail(400))'));
                        console.log(tag, 'cloudLogs=', JSON.stringify(t.filter((x) => /Cloud|注册|限流|联机|GOBE|token|身份|match/.test(x)).slice(-14)));
                        console.log(tag, 'tailFull=', JSON.stringify(t.slice(-25)));
                    } catch (e) { console.log(tag, 'tail failed', e.message); }
                    try {
                        console.log(tag, 'idb=', await page.eval(`new Promise(function(res){try{var rq=indexedDB.open('IDBStorage');rq.onsuccess=function(e){var db=e.target.result;try{var g=db.transaction('mainStore','readonly').objectStore('mainStore').get('cloud_user');g.onsuccess=function(){res(JSON.stringify(g.result||null));};g.onerror=function(){res('GETERR');};}catch(err){res('TXERR '+err.message);}};rq.onerror=function(){res('OPENERR');};}catch(err){res('ERR '+err.message);}})`, 20000));
                    } catch (e) { console.log(tag, 'idb failed', e.message); }
                    try {
                        const shot = await page.send('Page.captureScreenshot', { format: 'png' });
                        require('fs').writeFileSync(`local/smoke-after-${tag}.png`, Buffer.from(shot.data, 'base64'));
                    } catch (e) { }
                }
                console.log(tag, 'logs=', JSON.stringify(page.logs.slice(-15)));
                console.log(tag, 'state=', JSON.stringify(await state(page)).slice(0, 600));
                console.log(tag, 'href=', await js(page, 'location.href'),
                    'qaStoreKeys=', await js(page, 'JSON.stringify(Object.keys(window.__qaStore||{}))'),
                    'menuInst=', await js(page, '!!((window.__qaStore||{}).menuPage)'),
                    'flags=', await js(page, 'localStorage.getItem("qa")+"/"+localStorage.getItem("privacyAgreed")'));
                try {
                    console.log(tag, 'worker=', await page.eval("fetch('https://www.normalgame.cn/gobe/debug').then(r=>r.text()).then(t=>t.slice(0,90)).catch(e=>'ERR '+e.message)", 20000));
                } catch (e) { console.log(tag, 'worker eval failed', e.message); }
                if (process.env.POSTTEST === '1') {
                    try {
                        console.log(tag, 'postToken=', await page.eval("fetch('https://www.normalgame.cn/token',{method:'POST',headers:{'Content-Type':'application/json'},body:'{\"reg\":true}',signal:AbortSignal.timeout(12000)}).then(r=>r.text().then(t=>r.status+' '+t.slice(0,150))).catch(e=>'ERR '+(e&&e.name)+' '+(e&&e.message))", 20000));
                    } catch (e) { console.log(tag, 'postToken eval failed', e.message); }
                    console.log(tag, 'tokenRes=', String(await js(page, 'JSON.stringify(performance.getEntriesByType("resource").filter(function(e){return /normalgame/.test(e.name);}).map(function(e){return [e.name.slice(-30),e.duration|0,e.responseStatus];}).slice(-6))')).slice(0, 500));
                }
                try {
                    console.log(tag, 'dbs=', await page.eval("indexedDB.databases ? indexedDB.databases().then(d=>JSON.stringify(d)).catch(e=>'ERR '+e.message) : 'no-api'", 15000));
                } catch (e) { console.log(tag, 'dbs failed', e.message); }
                if (process.env.REREG === '1') {
                    console.log(tag, 'proto=', await js(page, 'JSON.stringify(Object.getOwnPropertyNames(Object.getPrototypeOf((window.__qaStore||{}).menuPage||{})))').then((s) => s.slice(0, 500)));
                    console.log(tag, 'rereg=', await js(page, 'try{var m=(window.__qaStore||{}).menuPage; if(m && m.reregister){m.reregister();"called"}else{"no-method"}}catch(e){"ERR "+e.message}'));
                    await sleep(15000);
                    try {
                        const t = JSON.parse(await page.eval('JSON.stringify(__qa.tail(200))'));
                        console.log(tag, 'afterRereg=', JSON.stringify(t.filter((x) => /Cloud|注册|限流|联机|GOBE|token|身份|Agc/.test(x)).slice(-12)));
                    } catch (e) { }
                }
                try {
                    console.log(tag, 'idb=', await page.eval(`new Promise(function(res){try{var rq=indexedDB.open('IDBStorage');rq.onsuccess=function(e){var db=e.target.result;try{var g=db.transaction('mainStore','readonly').objectStore('mainStore').get('cloud_user');g.onsuccess=function(){res(JSON.stringify(g.result||null));};g.onerror=function(){res('GETERR');};}catch(err){res('TXERR '+err.message);}};rq.onerror=function(){res('OPENERR');};rq.onblocked=function(){res('BLOCKED');};}catch(err){res('ERR '+err.message);}})`, 20000));
                } catch (e) { console.log(tag, 'idb failed', e.message); }
            }
            return;
        }
        console.log('== 1) 拉起两端 → 匹配页 ==');
        await prepare(pages);
        for (let attempt = 1; attempt <= attempts && !paired; attempt++) {
            console.log(`== 2) 配对尝试 ${attempt}/${attempts} ==`);
            if (attempt > 1) { await sleep(10000); await prepare(pages); }
            if (await pairOnce(pages)
                && await waitFor('A', pages.A, async () => boundOk(pages), 25, '两端绑网完整')
                && await waitFor('A', pages.A, async () => framesFlowing(pages), 20, '帧通道有流')) {
                paired = true;
            }
            if (!paired) console.log('  本次配对不合格 → 下一轮');
        }
        if (!paired) { console.log('!! 未能同房+绑网+帧通道, 测试停在配对阶段'); return; }

        const sa = await state(pages.A), sb = await state(pages.B);
        const fa = (sa.page || {}).finalAssignment, fb = (sb.page || {}).finalAssignment;
        const sameRoom = !!sa.net.roomId && String(sa.net.roomId) === String(sb.net.roomId);
        const sameAssign = JSON.stringify(fa) === JSON.stringify(fb);
        console.log(`  房间: A=${sa.net.roomId} B=${sb.net.roomId} 玩家 A=${(sa.net.players || []).length} B=${(sb.net.players || []).length}`);
        console.log(`  [1] 同房=${sameRoom} 分配表一致=${sameAssign}`);
        console.log('      A 分配表=', JSON.stringify(fa));
        console.log('      B 分配表=', JSON.stringify(fb));

        console.log(`== 4) 打 ${secs}s 真回合(交替发球/击球/移动 + 中途注入一次权威交接) ==`);
        const rows = [];
        const terms = { A: [], B: [] };
        let splitT = null, muted = null, injected = false;
        const t0 = Date.now();
        let i = 0;
        while (Date.now() - t0 < secs * 1000) {
            i++;
            if (!injected && Date.now() - t0 > secs * 500) {
                injected = true;
                splitT = Date.now() - t0;
                const ps = await pairStates(pages);
                const authTag = ps.A.net && ps.A.net.amAuth ? 'A' : (ps.B.net && ps.B.net.amAuth ? 'B' : null);
                if (authTag) {
                    const other = authTag === 'A' ? 'B' : 'A';
                    muted = authTag;
                    console.log(`  !! 注入权威交接: 静默 ${authTag} 4.5s, 期望 ${other} 升格`);
                    console.log('    ', await qa(pages[authTag], 'mute(4500)'));
                }
            }
            for (const tag of ['A', 'B']) {
                const page = pages[tag];
                try {
                    const st = await state(page);
                    const g = st.game || {};
                    const b = g.ball, c = g.localCha;
                    let d = 99, ang = (i * 37) % 360 - 180;
                    if (b && c) {
                        const dx = b[0] - c[0], dz = b[2] - c[2];
                        d = Math.sqrt(dx * dx + dz * dz);
                        ang = Math.atan2(dz, dx) * 180 / Math.PI;
                    }
                    // power 是 0~1(cha 内部 *10 变档), 原 Python 脚本写 80 = 80 倍移速:
                    // 角色会一路跑出场外 → 发球站位违规 → 球被钉到几百米外, 是测试脚本的错不是同步的错
                    if (d < 2.0 && i % 4 === 1) await qa(page, 'serve()');
                    else if (d < 2.6) await qa(page, 'hit()');
                    else await qa(page, `moveTo(${Math.round(ang)},0.8)`);
                } catch (e) { }
            }
            if (i % 20 === 0 || i === 1) {
                const ps = await pairStates(pages);
                const a = pick(ps.A), b = pick(ps.B);
                console.log(`    @${Math.round((Date.now() - t0) / 1000)}s A auth=${a.auth} term=${a.term} tx=${a.tx} rx=${a.rx}/${a.rxSeq} cd=${a.cd} phase=${a.phase} ball=${a.ball} hold=${a.holder} srv=${a.server} isP=${a.isP} cha=${a.chaId} | B auth=${b.auth} term=${b.term} tx=${b.tx} rx=${b.rx}/${b.rxSeq} cd=${b.cd} phase=${b.phase} ball=${b.ball} hold=${b.holder} srv=${b.server} isP=${b.isP} cha=${b.chaId}`);
            }
            const ps = await pairStates(pages);
            const a = pick(ps.A), b = pick(ps.B);
            if (a.ball && b.ball) rows.push({ t: Date.now() - t0, wall: Date.now(), A: a, B: b });
            for (const tag of ['A', 'B']) {
                const s = tag === 'A' ? a : b;
                if (s.term != null && (!terms[tag].length || terms[tag][terms[tag].length - 1][1] !== s.term)) terms[tag].push([Date.now() - t0, s.term]);
            }
            await sleep(300);
        }
        console.log('  成对样本:', rows.length);
        const { tails, stats } = await gather(pages);
        const fs = require('fs');
        try {
            fs.writeFileSync('local/pvp_rows_node.jsonl', rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
            fs.writeFileSync('local/pvp_node_meta.json', JSON.stringify({ splitT, muted, terms, stats, tails }, null, 2));
        } catch (e) { console.log('  落盘失败:', e.message); }

        console.log('== 5) 验收 ==');
        const okBall = rows.length ? checkBall(rows, splitT) : false;
        const okClock = rows.length ? checkClock(rows, splitT) : false;
        const okScores = rows.length ? checkScores(rows) : false;
        const okAuth = rows.length ? checkAuth(rows, tails) : false;
        const okHand = rows.length ? checkHandover(rows, splitT, muted, terms) : false;

        console.log('== 7) 握手/恢复取证 ==');
        for (const tag of ['A', 'B']) {
            const key = (tails[tag] || []).filter((x) => /球锚点|恢复快照|已从权威端|接管|采纳房主|match_start|指派|role_assign|等 match_start|满员/.test(x));
            console.log(`  ${tag} 握手/恢复日志:`, JSON.stringify(key.slice(-16)).slice(0, 2400));
            const s = stats[tag] || {};
            const pickStats = (o) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => /role_|ball_|recover|anchor|match/.test(k)));
            console.log(`  ${tag} recv:`, JSON.stringify(pickStats(s.recv)));
            console.log(`  ${tag} reject:`, JSON.stringify(pickStats(s.reject)));
            console.log(`  ${tag} resend/giveup:`, JSON.stringify(pickStats(s.resend)), JSON.stringify(pickStats(s.giveup)));
        }

        console.log('== 8) 收尾快照 ==');
        for (const tag of ['A', 'B']) {
            const st = await state(pages[tag]);
            const n = st.net || {}, g = st.game || {};
            console.log(`  ${tag} amAuth=${n.amAuth} authId=${n.authId} term=${n.authTerm} hitSeq=${n.hitSeq} applied=${n.appliedHitSeq} tx=${n.txAuthFrames} rx=${n.rxAuthFrames}/${n.rxAuthSeq} phase=${g.phase} cd=${g.cd} scores=${JSON.stringify(g.scores)} ball=${JSON.stringify(g.ball)} holder=${g.holderId}`);
            console.log('     近期关键日志:', JSON.stringify((tails[tag] || []).filter((x) => /已成为权威|降级|升格|无响应|校验失败|丢弃击球|缺口|发球超时|恢复/.test(x)).slice(-6)).slice(0, 1200));
            try {
                const fp = await pages[tag].eval('JSON.stringify(__qa.frames())');
                console.log('     帧通道原始:', String(fp).slice(0, 800));
            } catch (e) { }
        }

        const checks = [
            ['[1] 同房+分配表', sameRoom && sameAssign],
            ['[2] 时钟一致', okClock],
            ['[3] 球位偏差(稳态)', okBall],
            ['[4] 比分一致', okScores],
            ['[5] 权威不翻转', okAuth],
            ['[6] 交接正确', okHand]
        ];
        console.log('== 结果 ==');
        for (const [name, ok] of checks) console.log(`  ${name} : ${ok ? 'PASS' : 'FAIL'}`);
        console.log('  ==', checks.every(([, ok]) => ok) ? '全部通过' : '有不合格项', '==');
    } finally {
        for (const tag of ['A', 'B']) { try { pages[tag].close(); } catch (e) { } }
        await cleanupTabs();
        try { process.exit(0); } catch (e) { }
    }
})().catch((e) => {
    console.error('!! 驱动异常:', e && (e.stack || e.message || e));
    process.exit(1);
});
