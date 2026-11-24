'use strict';
// codex.js - Codex CLI 远程会话桥: 在指定工作目录以指定模型执行 codex exec, 支持按 peer 续聊。
// 被 re/server.js (codex.* actions) 与 chat/bridge.cjs 共用; 无第三方依赖。
const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');
const crypto = require('crypto');
const readline = require('readline');

const DEFAULT_MODELS = ['auto', 'qwen4-max-preview', 'qwen3.8-max', 'qwen3.8-flash', 'qwen3.7-max', 'qwen3.7-plus', 'glm-5.3', 'deepseek-v4-pro'];

// 模型映射：上游(微信桥/IDE)选的公共模型名 → 本中转实际可用的模型。
// 关键在图片：catalog 里 glm-5.3 等公共名是纯文本模型，codex 会在客户端
// 直接拒发 view_image（"you do not support image inputs"），图片根本到不了
// 中转（2026-11-23 微信实测）。映射到 aigc.midea.com 系（catalog 已声明
// text+image）后 view_image 才能带图。c.modelMap 可覆盖/关闭（置 {} 则不映射）。
const DEFAULT_MODEL_MAP = {
    'auto': 'aigc.midea.com',
    'glm-5.3': 'aigc.midea.com/GLM-5',
    'glm-5.2': 'aigc.midea.com/GLM-5',
    'glm-5': 'aigc.midea.com/GLM-5',
    'deepseek-v4-pro': 'aigc.midea.com/DeepSeek',
    'deepseek-v4-pro-0813': 'aigc.midea.com/DeepSeek',
    'deepseek-v4.1-flash': 'aigc.midea.com/DeepSeek',
    'deepseek-v4.1-flash-1017': 'aigc.midea.com/DeepSeek',
    'deepseek-v4-flash-0731': 'aigc.midea.com/DeepSeek',
    'qwen4-max-preview': 'aigc.midea.com/Qwen3.5-122B',
    'qwen3.8-max': 'aigc.midea.com/Qwen3.5-122B',
    'qwen3.8-flash': 'aigc.midea.com/Qwen3.5-122B',
    'qwen3.7-max': 'aigc.midea.com/Qwen3.5-122B',
    'qwen3.7-plus': 'aigc.midea.com/Qwen3.5-122B',
    'qwen3.6-flash': 'aigc.midea.com/Qwen3.5-122B'
};
function fileUrlToLocalPath(u) {
    let p = String(u || '');
    if (!p.startsWith('file://')) return p;
    try { p = decodeURIComponent(p.slice('file://'.length)); } catch (e) { p = p.slice('file://'.length); }
    return p.replace(/\//g, '\\');
}
function localPathToFileUrl(p) {
    const norm = String(p || '').replace(/\\/g, '/');
    return 'file:///' + encodeURI(norm).replace(/#/g, '%23');
}
// 模型主动回传图片的输出协议标记：[attach]完整路径[/attach]。
// 这是模型语义决策后的**结构化输出**（不是对用户消息做关键词拦截）：
// 用户要图时模型自己决定在结论末尾加标记，网关解析后把图发给用户。
const ATTACH_TAG_RE = /\[attach\]\s*([^\r\n\[\]]+?)\s*\[\/attach\]/g;
const RETURN_IMAGE_EXTS = /\.(png|jpe?g|gif|webp|bmp)$/i;
const RETURN_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const RETURN_IMAGE_MAX_COUNT = 4;
function collectImagePaths(stdoutText) {
    // 只收 codex 事件流里的 ImageView 项（view_image 真实看过的图）。
    // [attach] 标记由 attachPaths 单独处理（模型语义决策）。
    // 注意：不要从回复正文里正则捞路径——模型会提及旧截图路径，
    // 正文提及≠要附图（实测"截图没找到还附了旧图"就是这个）。
    const out = [];
    const seen = new Set();
    const push = (p) => {
        if (!p) return;
        const n = String(p);
        const key = n.toLowerCase();
        if (seen.has(key)) return;
        try { if (!fs.statSync(n).isFile()) return; } catch (e) { return; }
        seen.add(key); out.push(n);
    };
    for (const line of String(stdoutText || '').split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t[0] !== '{') continue;
        let ev; try { ev = JSON.parse(t); } catch (e) { continue; }
        const it = ev && ev.item;
        if (ev && ev.type === 'item.completed' && it && it.type === 'ImageView' && it.path) {
            push(fileUrlToLocalPath(it.path));
        }
    }
    return out.slice(0, RETURN_IMAGE_MAX_COUNT);
}
function mapModel(model, cfg) {
    const m = String(model || '').trim();
    if (!m) return m;
    if (m.startsWith('aigc.midea.com')) return m;
    const map = (cfg && cfg.modelMap !== undefined) ? cfg.modelMap : DEFAULT_MODEL_MAP;
    const hit = map && map[m];
    return hit || m;
}

function readJson(file, fallback) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}
function writeJson(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}
function tail(list, n) { return list.length > n ? list.slice(-n) : list; }

// 入站图片统一落盘：local 模式传本机路径，relay 模式传 {name,b64}。
// 落盘后交给 codex exec -i，并把路径写进 user 消息历史供 chat 页回显。
function materializeInboundImages(list) {
    const out = [];
    const dir = path.join(__dirname, 'inbound-images');
    for (const it of (Array.isArray(list) ? list : [])) {
        try {
            if (it && typeof it === 'object' && it.b64) {
                const name = String(it.name || 'image.png').replace(/[^\w.\-]/g, '_');
                fs.mkdirSync(dir, { recursive: true });
                const fp = path.join(dir, Date.now() + '-' + crypto.randomBytes(3).toString('hex') + '-' + name);
                fs.writeFileSync(fp, Buffer.from(String(it.b64), 'base64'));
                out.push(fp);
            } else if (it) {
                const q = String(it);
                if (fs.statSync(q).isFile()) out.push(q);
            }
        } catch (e) { }
        if (out.length >= 8) break;
    }
    return out;
}

class CodexBridge {
    constructor(opts) {
        opts = opts || {};
        this.root = opts.root || path.resolve(__dirname, '..', '..');
        this.cfgPath = opts.cfgPath || path.join(__dirname, 'codex-config.json');
        this.sessionsPath = opts.sessionsPath || path.join(__dirname, 'codex-sessions.json');
        this.log = opts.log || (() => {});
        this.mem = new Map();
        this.locks = new Map();
        this.procs = new Set();
    }

    cfg() {
        const c = readJson(this.cfgPath, {});
        return Object.assign({
            bin: '',
            cwd: this.root,
            model: 'qwen4-max-preview',
            sandbox: 'workspace-write',
            timeoutMs: 600000,
            maxConcurrent: 2
        }, c);
    }

    save(patch) {
        const next = Object.assign(this.cfg(), patch || {});
        writeJson(this.cfgPath, next);
        return next;
    }

    resolveBin() {
        if (this._binCache && Date.now() - (this._binAt || 0) < 600000) return this._binCache;
        const bin = this._resolveBinUncached();
        this._binCache = bin; this._binAt = Date.now();
        return bin;
    }
    _resolveBinUncached() {
        const c = this.cfg();
        const cands = [];
        if (c.bin) cands.push(c.bin);
        if (process.env.CODEX_CLI_PATH) cands.push(process.env.CODEX_CLI_PATH);
        if (process.platform === 'win32') {
            try {
                const out = cp.execFileSync('where', ['codex'], { encoding: 'utf8', windowsHide: true });
                out.split(/\r?\n/).filter(Boolean).forEach(x => cands.push(x.trim()));
            } catch (e) { }
            const base = 'C:\\Program Files\\WindowsApps';
            try {
                fs.readdirSync(base).filter(n => /^OpenAI\.Codex_/.test(n)).forEach(n => {
                    cands.push(path.join(base, n, 'app', 'resources', 'codex.exe'));
                });
            } catch (e) { }
        } else {
            cands.push('codex', '/usr/local/bin/codex', '/usr/bin/codex');
        }
        for (const x of cands) {
            if (!x) continue;
            if (/[\\/]codex\.js$/i.test(x)) continue;
            try {
                const v = cp.execFileSync(x, ['--version'], { encoding: 'utf8', windowsHide: true, timeout: 8000 }).trim();
                if (/codex-cli/i.test(v)) return x;
            } catch (e) { }
        }
        return '';
    }

    _codexHome() {
        // 服务账户(LNSSM LocalSystem)的 homedir 是 systemprofile，且对
        // C:/Users/mien/.codex **目录**的 existsSync 会因 ACL 返回 false、
        // 对目录里**文件**的 exists 却是 true（2026-11-23 实测日志）。
        // 所以逐个候选探测 config.toml / model-catalog 文件本身。
        const c = this.cfg();
        const candidates = [
            c.codexHome,
            process.env.CODEX_HOME,
            path.join(os.homedir(), '.codex'),
            'C:/Users/mien/.codex'
        ];
        for (const h of candidates) {
            if (!h) continue;
            try {
                if (fs.existsSync(path.join(h, 'config.toml'))
                    || fs.existsSync(path.join(h, 'model-catalog.local.json'))) return h;
            } catch (e) { }
        }
        return null;
    }
    models() {
        const out = [];
        const seen = new Set();
        const add = (slug, label, desc) => {
            if (!slug || seen.has(slug)) return;
            seen.add(slug); out.push({ slug, label: label || slug, desc: desc || '' });
        };
        // NSSM 服务账户的 os.homedir() 不是用户目录（LocalSystem→System32），
        // 必须用 chat() 同款 CODEX_HOME 回退，否则模型列表永远只有
        // DEFAULT_MODELS 兜底，页面下拉看不到真实可选模型（2026-11-23）。
        const home = this._codexHome() || os.homedir();
        const catPath = path.join(home, 'model-catalog.local.json');
        try { this.log('codex models catalog=' + catPath + ' exists=' + fs.existsSync(catPath)); } catch (e) { }
        let cat = readJson(catPath, null);
        if (!cat || !Array.isArray(cat.models)) {
            for (const h of ['C:/Users/mien/.codex', path.join(os.homedir(), '.codex')]) {
                try {
                    const p2 = path.join(h, 'model-catalog.local.json');
                    if (fs.existsSync(p2)) { cat = readJson(p2, null); this.log('codex models catalog fallback=' + p2); break; }
                } catch (e) { }
            }
        }
        if (cat && Array.isArray(cat.models)) {
            cat.models.slice().sort((a, b) => (a.priority || 999) - (b.priority || 999))
                .forEach(m => add(m.slug, m.display_name, m.description));
        }
        DEFAULT_MODELS.forEach(m => add(m));
        return out;
    }

    status() {
        const c = this.cfg();
        let version = this._verCache || '';
        if (!version || Date.now() - (this._verAt || 0) > 600000) {
            try { version = cp.execFileSync(this.resolveBin(), ['--version'], { encoding: 'utf8', windowsHide: true, timeout: 8000 }).trim(); this._verCache = version; this._verAt = Date.now(); } catch (e) { }
        }
        const s = readJson(this.sessionsPath, { peers: {} });
        return {
            ok: true,
            bin: this.resolveBin(),
            version,
            cwd: c.cwd,
            model: c.model,
            sandbox: c.sandbox,
            timeoutMs: c.timeoutMs,
            models: this.models(),
            peers: Object.keys(s.peers || {}).length,
            sessions: Object.entries(s.peers || {}).map(([id, v]) => ({
                id, threadId: v.threadId || '', cwd: v.cwd || '', model: v.model || '',
                updatedAt: v.updatedAt || 0, count: (v.messages || []).length
            })).sort((a, b) => b.updatedAt - a.updatedAt)
        };
    }

    sessions() { return this.status().sessions; }

    history(peer, limit, since) {
        const s = readJson(this.sessionsPath, { peers: {} });
        const v = (s.peers || {})[peer];
        const sinceTs = Number(since) || 0;
        // 历史里过去存下的错误占位（[codex error] ...）一律不回给前端：
        // 网络瞬断不该出现在会话流里（同 chat() 不再写入错误回复）。
        const clean = ((v && v.messages) || []).filter(m =>
            !(m.role === 'assistant' && String(m.text || '').startsWith('[codex error]')));
        const msgs = sinceTs ? clean.filter(m => (m.ts || 0) > sinceTs) : clean;
        return { peer, threadId: v && v.threadId || '', cwd: v && v.cwd || '', model: v && v.model || '', messages: tail(msgs, limit || 200), total: ((v && v.messages) || []).length };
    }

    store(peer, patch) {
        const s = readJson(this.sessionsPath, { peers: {} });
        s.peers = s.peers || {};
        const cur = s.peers[peer] || { messages: [] };
        const next = Object.assign(cur, patch || {});
        next.messages = tail(next.messages || [], 300);
        s.peers[peer] = next;
        writeJson(this.sessionsPath, s);
        return next;
    }

    append(peer, role, text, extra) {
        const s = readJson(this.sessionsPath, { peers: {} });
        s.peers = s.peers || {};
        const cur = s.peers[peer] || { messages: [] };
        cur.messages = tail((cur.messages || []).concat([Object.assign({ role, text, ts: Date.now() }, extra || {})]), 300);
        cur.updatedAt = Date.now();
        s.peers[peer] = cur;
        writeJson(this.sessionsPath, s);
        return cur;
    }

    queue(peer, fn) {
        const key = String(peer || 'default');
        const prev = this.locks.get(key) || Promise.resolve();
        const p = prev.then(fn, fn);
        this.locks.set(key, p.catch(() => { }));
        return p;
    }

    async chat(opts) {
        opts = opts || {};
        const peer = String(opts.peer || 'default');
        const text = String(opts.text || '').trim();
        if (!text) throw new Error('text 不能为空');
        return this.queue(peer, async () => {
            const c = this.cfg();
            const cwd = path.resolve(opts.cwd || c.cwd || this.root);
            const model = mapModel(opts.model || c.model, c);
            const sandbox = opts.sandbox || c.sandbox || 'workspace-write';
            const timeoutMs = Number(opts.timeoutMs || c.timeoutMs || 600000);
            const session = readJson(this.sessionsPath, { peers: {} }).peers?.[peer] || {};
            const useResume = opts.resume !== false && !!session.threadId && (!session.cwd || session.cwd === cwd);

            const inboundImages = materializeInboundImages(opts.images);
            this.append(peer, 'user', text, { via: opts.via || 'api', images: inboundImages });

            if (process.env.CODEX_MOCK === '1') {
                const reply = '[mock] ' + text;
                this.append(peer, 'assistant', reply, { model, mock: true });
                return { ok: true, peer, cwd, model, threadId: session.threadId || 'mock-thread', text: reply, events: 0, ms: 0, mock: true, userImages: inboundImages };
            }

            const bin = this.resolveBin();
            if (!bin) throw new Error('未找到 codex CLI。请安装 Codex 或在配置中填写 bin 路径。');
            fs.mkdirSync(cwd, { recursive: true });
            const args = ['exec', '--json', '--skip-git-repo-check', '-s', sandbox, '-m', model];
            // 图片附件（微信图片）：codex exec -i / exec resume -i，可多个。
            // 只保留本机存在的文件，避免把坏路径塞给 CLI 直接报错。
            const imgs = inboundImages;
            if (useResume) {
                args.push('resume');
                for (const im of imgs) args.push('-i', im);
                args.push(session.threadId, text);
            } else {
                for (const im of imgs) args.push('-i', im);
                args.push(text);
            }

            // codex exec ≥0.171 会读 stdin 直到 EOF；stdio ignore(无 EOF)会让
            // 进程在回复完成后仍不退出(实测挂死→timeout kill)。stdin 用 pipe 并
            // 立即 end() 提供干净 EOF。另显式传 CODEX_HOME(服务账户 homedir
            // 与真实用户目录不一致时 codex 读不到 config.toml)。
            const env = Object.assign({}, process.env);
            // 关键：清掉从 Codex Desktop 会话继承的 app-runtime 环境变量。
            // 子 codex 看到这些变量会以为自己在桌面 App 里，尝试经
            // app runtime provisioning 服务拉进程（pipe 在本进程不可用）
            // → 所有 exec_command 直接被拒："Failed to create unified
            // exec process: app runtime provisioning service is
            // unavailable; refusing helper fallback"（2026-11-23 实测：
            // 模型连调 11 次截图全部失败，被误判成"不执行截图"）。
            // 清掉后 codex 以独立 CLI 方式自己 spawn。
            for (const k of Object.keys(env)) {
                if (/^CODEX_(?!HOME)/.test(k) || /^BROWSER_USE_/.test(k)
                        || /^NODE_REPL_/.test(k)) delete env[k];
            }
            const codexHome = this._codexHome();
            if (codexHome) env.CODEX_HOME = codexHome;

            const started = Date.now();
            const res = await new Promise((resolve) => {
                const child = cp.spawn(bin, args, { cwd, windowsHide: true, env, stdio: ['pipe', 'pipe', 'pipe'] });
                try { child.stdin.end(); } catch (e) { }
                this.procs.add(child);
                let stdout = '', stderr = '', threadId = '', agentText = '', usage = null, events = 0;
                let done = false;
                const finish = (code, error) => {
                    if (done) return; done = true;
                    clearTimeout(to);
                    this.procs.delete(child);
                    resolve({ code, error, stdout, stderr, threadId, text: agentText, usage, events });
                };
                const to = setTimeout(() => {
                    try { if (process.platform === 'win32') cp.execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); else child.kill('SIGKILL'); } catch (e) { }
                    finish(-2, 'timeout after ' + timeoutMs + 'ms');
                }, timeoutMs);
                child.stdout.on('data', d => {
                    const chunk = d.toString('utf8');
                    stdout += chunk;
                    if (stdout.length > 8e6) stdout = stdout.slice(-8e6);
                    for (const line of chunk.split(/\r?\n/)) {
                        const s = line.trim();
                        if (!s || s[0] !== '{') continue;
                        let ev; try { ev = JSON.parse(s); } catch (e) { continue; }
                        events++;
                        // 流式进度：每个事件实时回调（微信端逐轮回传，
                        // 长任务不再等最终超时才回一次）
                        if (opts.onEvent) { try { opts.onEvent(ev); } catch (e) { } }
                        if (ev.type === 'thread.started' && ev.thread_id) threadId = ev.thread_id;
                        if (ev.type === 'item.completed' && ev.item && ev.item.type === 'agent_message' && ev.item.text) {
                            agentText = agentText ? agentText + '\n' + ev.item.text : ev.item.text;
                        }
                        if (ev.type === 'turn.completed' && ev.usage) usage = ev.usage;
                        if (ev.type === 'error' && ev.message) stderr += (stderr ? '\n' : '') + ev.message;
                    }
                });
                child.stderr.on('data', d => { stderr += d.toString('utf8'); if (stderr.length > 2e6) stderr = stderr.slice(-2e6); });
                child.on('error', e => finish(-1, String(e.message)));
                child.on('close', code => finish(code, code === 0 ? '' : 'codex exit ' + code));
            });

            const ms = Date.now() - started;
            let outText = (res.text || '').trim() || (res.error ? ('[codex error] ' + res.error + (res.stderr ? '\n' + res.stderr.slice(-800) : '')) : '');
            // 解析模型主动标记的回传图片（[attach]路径[/attach]），
            // 从正文里剥掉标记（用户不该看到），路径进回传队列。
            const attachPaths = [];
            let _am;
            ATTACH_TAG_RE.lastIndex = 0;
            while ((_am = ATTACH_TAG_RE.exec(outText)) !== null) {
                const ap = String(_am[1] || '').trim();
                try { if (ap && fs.statSync(ap).isFile()) attachPaths.push(ap); } catch (e) { }
            }
            if (attachPaths.length) {
                outText = outText.replace(ATTACH_TAG_RE, '').replace(/\n{3,}/g, '\n\n').trim();
                this.log('codex.chat attach-tags', peer, attachPaths.join(','));
            }
            // 残缺标记清理：模型偶尔输出 [attach]路径[/ 这种半截尾巴
            // （正则只吃完整闭合），用户不该看到任何协议痕迹。
            if (/\[attach\]/i.test(outText)) {
                outText = outText.replace(/\[attach\][^\r\n]{0,400}/gi, '').replace(/\n{3,}/g, '\n\n').trim();
            }
            const threadId = res.threadId || session.threadId || '';
            this.store(peer, {
                threadId, cwd, model,
                updatedAt: Date.now(),
                messages: ((readJson(this.sessionsPath, { peers: {} }).peers?.[peer] || {}).messages) || []
            });
            // 失败回复（[codex error] ...）不写入会话历史：网络/执行错误
            // 属于"同步中断"，不能永久污染会话流（2026-11-23 用户明确
            // 要求：不要在会话里报 http/网络错误）。真实内容（哪怕部分）
            // 照常入库。
            // 图片回传：view_image 看过的图 + 模型 [attach] 标记的图。
            // images 带 base64（≤8MB/张、≤4 张）——relay 模式下上游(ECS 桥)
            // 没有本机文件系统，靠 b64 落盘再发微信；imagePaths 供
            // chat UI 走 /api/media（relay 模式经 fs.read）按需拉图回显。
            const retImages = [];
            const seenImgHash = new Set();
            for (const ip of collectImagePaths(res.stdout).concat(attachPaths)) {
                try {
                    const st = fs.statSync(ip);
                    if (st.size > RETURN_IMAGE_MAX_BYTES) continue;
                    // 内容指纹去重：同内容多路径（截图复制/重放历史）只回传一张
                    const h = crypto.createHash('md5').update(fs.readFileSync(ip)).digest('hex');
                    if (seenImgHash.has(h)) continue;
                    seenImgHash.add(h);
                    retImages.push({ path: ip, name: path.basename(ip), size: st.size, b64: fs.readFileSync(ip).toString('base64') });
                } catch (e) { }
                if (retImages.length >= RETURN_IMAGE_MAX_COUNT) break;
            }
            // 本轮没新图时，带上会话历史里最近一次附过的图——
            // 模型经常不重新 view_image 而是直接引用之前看过的图，
            // 只收本轮事件会导致 chat 页"看不到附图"（图进过会话
            // 就应该一直可见，用户才能对照分析）。
            if (retImages.length === 0) {
                const prevMsgs = ((readJson(this.sessionsPath, { peers: {} }).peers?.[peer] || {}).messages) || [];
                for (let i = prevMsgs.length - 1; i >= 0; i--) {
                    const pm = prevMsgs[i];
                    if (pm.role === 'assistant' && Array.isArray(pm.images) && pm.images.length) {
                        for (const ip of pm.images) {
                            try {
                                const st = fs.statSync(ip);
                                if (st.size <= RETURN_IMAGE_MAX_BYTES) {
                                    const h = crypto.createHash('md5').update(fs.readFileSync(ip)).digest('hex');
                                    if (!seenImgHash.has(h)) {
                                        seenImgHash.add(h);
                                        retImages.push({ path: ip, name: path.basename(ip), size: st.size, b64: fs.readFileSync(ip).toString('base64') });
                                    }
                                }
                            } catch (e) { }
                        }
                        break; // 只取最近一次有图的轮次
                    }
                }
                if (retImages.length) this.log('codex.chat images(from history)', peer, retImages.map(x => x.path).join(','));
            }
            const imagePaths = retImages.map(x => x.path);
            if (res.code === 0 || !String(outText).startsWith('[codex error]')) {
                // assistant 消息带 images 路径：chat UI 历史回显（/api/media
                // 按路径拉图）用。
                this.append(peer, 'assistant', outText, { model, ms, threadId, code: res.code, images: imagePaths });
            }
            this.log('codex.chat', peer, 'code=' + res.code, 'ms=' + ms, 'thread=' + threadId, 'chars=' + outText.length);
            this.log('codex.chat images', peer, (imagePaths.length ? imagePaths.join(',') : 'none'));
            return { ok: res.code === 0, peer, cwd, model, threadId, text: outText, events: res.events, usage: res.usage, ms, code: res.code, error: res.error || '', userImages: inboundImages, imagePaths, images: retImages };
        });
    }

    // ---------------- Codex IDE / Desktop threads ----------------
    ideDbPath() { return this.cfg().ideDbPath || path.join(os.homedir(), '.codex', 'state_5.sqlite'); }
    static clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
    static stripLongPath(p) { return String(p || '').replace(/^\\\\\?\\/, ''); }

    ideThreads(limit) {
        const dbPath = this.ideDbPath();
        try {
            const { DatabaseSync } = require('node:sqlite');
            const db = new DatabaseSync(dbPath, { readOnly: true });
            const rows = db.prepare(`SELECT t.id,t.title,t.cwd,t.model_provider,t.model,t.updated_at,t.updated_at_ms,
                t.project_id,t.preview,t.first_user_message,t.rollout_path,t.source,t.originator,t.archived,
                p.name AS project_name
                FROM threads t LEFT JOIN projects p ON p.id=t.project_id
                WHERE t.archived=0 AND t.source='vscode'
                ORDER BY t.updated_at DESC LIMIT ?`).all(Number(limit) || 50);
            db.close();
            return rows.map(r => ({
                id: r.id,
                title: CodexBridge.clean(r.title).slice(0, 160) || ('IDE ' + String(r.id).slice(0, 8)),
                last: CodexBridge.clean(r.preview || r.first_user_message).slice(0, 120),
                cwd: CodexBridge.stripLongPath(r.cwd),
                model: r.model || '',
                modelProvider: r.model_provider || '',
                project: r.project_name || '',
                projectId: r.project_id || '',
                updatedAt: Number(r.updated_at_ms || (r.updated_at ? r.updated_at * 1000 : 0)) || 0,
                rolloutPath: CodexBridge.stripLongPath(r.rollout_path)
            }));
        } catch (e) {
            this.log('codex.ideThreads failed', String(e.message));
            return [];
        }
    }

    ideThread(threadId) {
        const { DatabaseSync } = require('node:sqlite');
        const db = new DatabaseSync(this.ideDbPath(), { readOnly: true });
        const r = db.prepare(`SELECT t.id,t.title,t.cwd,t.model_provider,t.model,t.updated_at,t.updated_at_ms,
            t.project_id,t.preview,t.first_user_message,t.rollout_path,t.source,p.name AS project_name
            FROM threads t LEFT JOIN projects p ON p.id=t.project_id
            WHERE t.id=? LIMIT 1`).get(String(threadId));
        db.close();
        if (!r) throw new Error('未找到 Codex IDE 会话: ' + threadId);
        return {
            id: r.id, title: CodexBridge.clean(r.title), cwd: CodexBridge.stripLongPath(r.cwd),
            model: r.model || '', modelProvider: r.model_provider || '', project: r.project_name || '',
            updatedAt: Number(r.updated_at_ms || (r.updated_at ? r.updated_at * 1000 : 0)) || 0,
            rolloutPath: CodexBridge.stripLongPath(r.rollout_path)
        };
    }

    async ideHistory(threadId, limit, since) {
        const meta = this.ideThread(threadId);
        const file = meta.rolloutPath;
        if (!file || !fs.existsSync(file)) throw new Error('IDE 会话 rollout 不存在: ' + file);
        const msgs = [];
        const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
        for await (const line of rl) {
            const s = line.trim();
            if (!s || s[0] !== '{') continue;
            let o; try { o = JSON.parse(s); } catch (e) { continue; }
            if (o.type !== 'response_item') continue;
            const pl = o.payload || {};
            if (pl.type !== 'message') continue;
            const role = pl.role;
            if (role !== 'user' && role !== 'assistant') continue;
            const content = Array.isArray(pl.content) ? pl.content : [];
            let text = content.map(c => (c && (c.text != null ? c.text : ''))).filter(Boolean).join('\n').trim();
            if (!text) continue;
            if (role === 'user') {
                if (/^<environment_context>/.test(text)) continue;
                if (/^<skills_instructions>/.test(text)) continue;
                if (/^<(turn_aborted|external_browser_tabs|codex_apps_client_time_context)/.test(text)) continue;
                const m = text.match(/<\/environment_context>\s*([\s\S]*)$/);
                if (m) text = m[1].trim();
                if (!text) continue;
                if (/^<environment_context>/.test(text)) continue;
            }
            msgs.push({ role, text, ts: o.timestamp ? Date.parse(o.timestamp) || 0 : 0 });
        }
        const sinceTs = Number(since) || 0;
        const filtered = sinceTs ? msgs.filter(m => (m.ts || 0) > sinceTs) : msgs;
        return { peer: 'ide:' + meta.id, threadId: meta.id, title: meta.title, cwd: meta.cwd, model: meta.model, modelProvider: meta.modelProvider, project: meta.project, messages: filtered.slice(-(Number(limit) || 200)), total: msgs.length };
    }

    // 实时 items: 直接解析 rollout JSONL, 执行中的命令/推理/消息立即可见(app-server items/list 只返回已完成项)。
    // 返回格式与 appserver.itemsList 一致: {data:[{turnId,item,startedAtMs,completedAtMs}...]}(最新在前)。
    static _cap(x, n) { const v = x == null ? '' : String(x); return v.length > n ? v.slice(0, n) + '\n…(' + v.length + '字符, 截断)' : v; }

    async ideItemsLive(threadId, limit) {
        let meta; for (let i = 0; ; i++) { try { meta = this.ideThread(threadId); break; } catch (e) { if (i >= 2 || !/busy|locked/i.test(String(e.message))) throw e; await new Promise(r => setTimeout(r, 60)); } }
        const file = meta.rolloutPath;
        if (!file || !fs.existsSync(file)) throw new Error('IDE 会话 rollout 不存在: ' + file);
        const st = fs.statSync(file);
        const tail = Math.min(st.size, 4 * 1024 * 1024);
        let text = '';
        const fd = fs.openSync(file, 'r');
        try {
            const buf = Buffer.alloc(tail);
            fs.readSync(fd, buf, 0, tail, Math.max(0, st.size - tail));
            text = buf.toString('utf8');
        } finally { fs.closeSync(fd); }
        if (tail < st.size) { const nl = text.indexOf('\n'); if (nl >= 0) text = text.slice(nl + 1); }
        const lines = text.split(/\r?\n/).filter(l => l.length > 1);
        const out = [];
        const byId = new Map();      // item.id -> entry (msg_*/rs_*/call_*)
        const byCall = new Map();    // call_id -> entry
        const userByTurn = new Map();// turnId -> user entry (RI 与 IC 的用户消息 id 不一致, 按轮去重)
        let curTurn = '';
        const ts = o => (o && o.timestamp) ? (Date.parse(o.timestamp) || 0) : 0;
        const turnOf = (p) => (p && p.internal_chat_message_metadata_passthrough && p.internal_chat_message_metadata_passthrough.turn_id) || curTurn;
        const push = (entry) => { out.push(entry); if (entry.item && entry.item.id) byId.set(entry.item.id, entry); return entry; };
        const grab = (arr) => (Array.isArray(arr) ? arr : []).map(x => (x == null ? '' : (typeof x === 'string' ? x : String(x.text != null ? x.text : (x.summary != null ? x.summary : ''))))).filter(Boolean);
        const setTexts = (it, p) => {
            it.summary = grab(p.summary);
            it.content = grab(p.content);
        };
        setTexts.grab = grab;
        for (const line of lines) {
            let o; try { o = JSON.parse(line); } catch (e) { continue; }
            const p = o.payload || {};
            if (o.type === 'event_msg' && (p.type === 'task_started' || p.type === 'turn_started')) {
                curTurn = p.turn_id || p.root_turn_id || curTurn; continue;
            }
            if (o.type === 'response_item') {
                const t0 = ts(o);
                if (p.type === 'message') {
                    const role = p.role;
                    if (role !== 'user' && role !== 'assistant') continue;
                    const content = Array.isArray(p.content) ? p.content : [];
                    let txt = content.map(c => (c && c.text != null ? String(c.text) : '')).filter(Boolean).join('\n').trim();
                    if (role === 'user') {
                        if (/^<(environment_context|skills_instructions|turn_aborted|external_browser_tabs|codex_apps_client_time_context)/.test(txt)) continue;
                        const m = txt.match(/<\/(?:environment_context|codex_apps_client_time_context|user_instructions)>\s*([\s\S]*)$/);
                        if (m) txt = m[1].trim();
                        if (!txt) continue;
                    }
                    const turnId = turnOf(p);
                    const id = p.id || (role + '-' + t0);
                    const existing = byId.get(id) || (role === 'user' ? userByTurn.get(turnId) : null);
                    if (existing) { existing.startedAtMs = existing.startedAtMs || t0; continue; }
                    const it = role === 'user' ? { type: 'userMessage', id, content: [{ type: 'text', text: CodexBridge._cap(txt, 6000) }] } : { type: 'agentMessage', id, text: CodexBridge._cap(txt, 6000) };
                    const e = push({ turnId, item: it, startedAtMs: t0, completedAtMs: t0 });
                    if (role === 'user') userByTurn.set(turnId, e);
                } else if (p.type === 'reasoning') {
                    const id = p.id || ('rs-' + t0);
                    if (byId.has(id)) continue;
                    const it = { type: 'reasoning', id };
                    setTexts(it, p);
                    push({ turnId: turnOf(p), item: it, startedAtMs: t0, completedAtMs: t0 });
                } else if (p.type === 'function_call') {
                    const callId = p.call_id || p.id;
                    if (byCall.has(callId) || byId.has(callId)) continue;
                    const name = String(p.name || '');
                    let args = {}; try { args = JSON.parse(p.arguments || '{}'); } catch (e) { }
                    const t0v = ts(o);
                    let it;
                    if (name === 'exec_command') {
                        it = { type: 'commandExecution', id: callId, command: CodexBridge._cap(args.cmd != null ? args.cmd : '', 2000), cwd: String(args.workdir || args.cwd || meta.cwd || ''), status: 'running' };
                    } else {
                        it = { type: 'mcpToolCall', id: callId, name, arguments: args, status: 'running' };
                    }
                    const e = push({ turnId: turnOf(p), item: it, startedAtMs: t0v, completedAtMs: 0 });
                    byCall.set(callId, e);
                } else if (p.type === 'function_call_output') {
                    const callId = p.call_id;
                    const e = byCall.get(callId) || byId.get(callId);
                    if (!e) continue;
                    const it = e.item;
                    const raw = String(p.output != null ? p.output : '');
                    const em = raw.match(/Process exited with code (-?\d+)/);
                    const exitCode = em ? Number(em[1]) : null;
                    const oi = raw.indexOf('Output:\n');
                    const body = oi >= 0 ? raw.slice(oi + 8) : raw;
                    if (it.type === 'commandExecution') { it.aggregatedOutput = CodexBridge._cap(body, 4000); it.exitCode = exitCode; it.status = (exitCode === 0 || exitCode === null) ? 'completed' : 'failed'; }
                    else { it.output = CodexBridge._cap(body, 4000); it.status = 'completed'; }
                    e.completedAtMs = ts(o);
                }
            } else if (o.type === 'event_msg' && p.type === 'item_completed') {
                const item = p.item || {};
                const turnId = p.turn_id || curTurn;
                const startedAtMs = Number(p.started_at_ms) || 0;
                const completedAtMs = Number(p.completed_at_ms) || 0;
                let e = byId.get(item.id) || byCall.get(item.id) || null;
                if (!e && item.type === 'UserMessage') e = userByTurn.get(turnId) || null;
                if (e) {
                    const it = e.item;
                    if (item.type === 'CommandExecution') {
                        // 保留 function_call 里的干净命令(args.cmd); 仅在为空时才用 item_completed 的包装版
                        if (!it.command) it.command = Array.isArray(item.command) ? item.command.join(' ') : (item.command != null ? String(item.command) : it.command);
                        if (item.cwd) it.cwd = item.cwd;
                        if (item.process_id != null) it.processId = item.process_id;
                        if (item.source) it.source = item.source;
                        it.status = item.status || 'completed';
                        if (item.exit_code != null) it.exitCode = item.exit_code;
                        if (item.aggregated_output != null) it.aggregatedOutput = String(item.aggregated_output);
                    } else if (item.type === 'AgentMessage') {
                        const t = (Array.isArray(item.content) ? item.content : []).map(c => (c && c.text != null ? String(c.text) : '')).filter(Boolean).join('\n');
                        if (t) it.text = t;
                    } else if (item.type === 'UserMessage') {
                        const t = (Array.isArray(item.content) ? item.content : []).map(c => (c && c.text != null ? String(c.text) : '')).filter(Boolean).join('\n');
                        if (t && it.content) it.content = [{ type: 'text', text: t }];
                    } else if (item.type === 'Reasoning') {
                        const sums = setTexts.grab(item.summary).concat(setTexts.grab(item.summary_text));
                        const conts = setTexts.grab(item.content).concat(setTexts.grab(item.raw_content));
                        if (sums.length || conts.length) { it.summary = sums; it.content = conts; }
                    } else if (item.type === 'McpToolCall' || item.type === 'ToolCall') {
                        it.status = item.status || 'completed';
                        if (item.aggregated_output != null) it.output = String(item.aggregated_output);
                    }
                    e.startedAtMs = e.startedAtMs || startedAtMs;
                    e.completedAtMs = completedAtMs || e.completedAtMs;
                    continue;
                }
                // 尾窗口里没有对应 response_item: 用 item_completed 直接补建
                const it = this._liveItemFromCompleted(item);
                if (it) push({ turnId, item: it, startedAtMs, completedAtMs });
            }
        }
        const lim = Math.max(1, Number(limit) || 50);
        const data = out.slice(-lim);
        // 强制保留每个出现 turn 的用户消息(不被 limit 截掉), 插到该 turn 最前
        const turnIds = new Set(data.map(e => e.turnId));
        const extras = [];
        for (let i = out.length - 1; i >= 0; i--) {
            const e = out[i];
            if ((e.item || {}).type === 'userMessage' && turnIds.has(e.turnId) && data.indexOf(e) < 0) extras.push(e);
        }
        for (const e of extras) {
            let idx = data.findIndex(x => x.turnId === e.turnId);
            if (idx < 0) idx = 0;
            data.splice(idx, 0, e);
        }
        data.reverse();
        return { data, limit: lim, total: out.length, live: true };
    }

    _liveItemFromCompleted(item) {
        const t = (item && item.type) || '';
        const texts = (arr) => (Array.isArray(arr) ? arr : []).map(c => (c && c.text != null ? String(c.text) : '')).filter(Boolean).join('\n');
        if (t === 'CommandExecution') return { type: 'commandExecution', id: item.id, command: Array.isArray(item.command) ? item.command.join(' ') : String(item.command || ''), cwd: item.cwd || '', processId: item.process_id, source: item.source, status: item.status || 'completed', exitCode: item.exit_code, aggregatedOutput: item.aggregated_output != null ? String(item.aggregated_output) : '' };
        if (t === 'AgentMessage') return { type: 'agentMessage', id: item.id, text: texts(item.content) };
        if (t === 'UserMessage') return { type: 'userMessage', id: item.id, content: (Array.isArray(item.content) ? item.content : []).map(c => ({ type: 'text', text: c && c.text != null ? String(c.text) : '' })).filter(c => c.text) };
        if (t === 'Reasoning') { const it = { type: 'reasoning', id: item.id }; const g = (a) => (Array.isArray(a) ? a : []).map(x => String(x != null && x.text != null ? x.text : x)).filter(Boolean); it.summary = g(item.summary).concat(g(item.summary_text)); it.content = g(item.content).concat(g(item.raw_content)); return it; }
        return null;
    }

    async ideChat(threadId, text, opts) {
        opts = opts || {};
        const meta = this.ideThread(threadId);
        const c = this.cfg();
        const cwd = meta.cwd || c.cwd || this.root;
        const sandbox = opts.sandbox || c.sandbox || 'workspace-write';
        const timeoutMs = Number(opts.timeoutMs || c.timeoutMs || 600000);
        const bin = this.resolveBin();
        if (!bin) throw new Error('未找到 codex CLI');
        if (!meta.modelProvider) throw new Error('IDE 会话缺少 model_provider');
        const args = ['exec', '--json', '--skip-git-repo-check', '-s', sandbox, '-c', 'model_provider=' + meta.modelProvider];
        if (meta.model) args.push('-m', meta.model);
        args.push('resume', String(threadId), String(text || ''));
        const started = Date.now();
        const res = await new Promise((resolve) => {
            const child = cp.spawn(bin, args, { cwd, windowsHide: true, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
            this.procs.add(child);
            let stdout = '', stderr = '', agentText = '', usage = null, events = 0, done = false;
            const finish = (code, error) => { if (done) return; done = true; clearTimeout(to); this.procs.delete(child); resolve({ code, error, stdout, stderr, text: agentText, usage, events }); };
            const to = setTimeout(() => { try { if (process.platform === 'win32') cp.execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); else child.kill('SIGKILL'); } catch (e) { } finish(-2, 'timeout after ' + timeoutMs + 'ms'); }, timeoutMs);
            child.stdout.on('data', d => {
                const chunk = d.toString('utf8'); stdout += chunk;
                for (const line of chunk.split(/\r?\n/)) {
                    const s = line.trim(); if (!s || s[0] !== '{') continue;
                    let ev; try { ev = JSON.parse(s); } catch (e) { continue; }
                    events++;
                    if (ev.type === 'item.completed' && ev.item && ev.item.type === 'agent_message' && ev.item.text) agentText = agentText ? agentText + '\n' + ev.item.text : ev.item.text;
                    if (ev.type === 'turn.completed' && ev.usage) usage = ev.usage;
                    if (ev.type === 'error' && ev.message) stderr += (stderr ? '\n' : '') + ev.message;
                }
            });
            child.stderr.on('data', d => { stderr += d.toString('utf8'); if (stderr.length > 2e6) stderr = stderr.slice(-2e6); });
            child.on('error', e => finish(-1, String(e.message)));
            child.on('close', code => finish(code, code === 0 ? '' : 'codex exit ' + code));
        });
        const ms = Date.now() - started;
        let err = res.error || '';
        const blob = (res.stderr || '') + '\n' + (res.stdout || '');
        if (/already has an active writer/i.test(blob)) err = '该 IDE 会话正在 Codex 中打开（active writer）。请先在 Codex 关闭/切换该对话，或在 chat 新开一个分支。';
        else if (/Cannot change this thread's model provider/i.test(blob)) err = 'IDE 会话的 model_provider 与当前配置不一致: ' + blob.match(/Cannot change[^\n]*/i)?.[0];
        const outText = (res.text || '').trim() || (err ? ('[codex error] ' + err) : '');
        this.log('codex.ideChat', threadId, 'code=' + res.code, 'ms=' + ms, 'chars=' + outText.length);
        return { ok: res.code === 0, peer: 'ide:' + threadId, threadId, cwd, model: meta.model, text: outText, events: res.events, usage: res.usage, ms, code: res.code, error: err };
    }

    deleteConversation(peer) {
        const key = String(peer || '');
        const store = readJson(this.sessionsPath, { peers: {} });
        const v = (store.peers || {})[key];
        const threadId = v && v.threadId || (key.startsWith('ide:') ? key.slice(4) : '');
        if (threadId) {
            try { cp.execFileSync(this.resolveBin(), ['exec', 'resume', threadId, ''], { stdio: 'ignore', windowsHide: true, timeout: 1000 }); } catch (e) { }
        }
        if (store.peers && store.peers[key]) delete store.peers[key];
        writeJson(this.sessionsPath, store);
        return { peer: key, threadId, deleted: true };
    }

    cancel(peer) {
        const key = String(peer || 'default');
        for (const child of this.procs) {
            try {
                if (process.platform === 'win32') cp.execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
                else child.kill('SIGKILL');
            } catch (e) { }
        }
        return { peer: key, cancelled: true };
    }
}

module.exports = { CodexBridge, DEFAULT_MODELS };


