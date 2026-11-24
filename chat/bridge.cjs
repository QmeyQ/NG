'use strict';
// bridge.cjs - Codex 远程同步聊天桥: 微信通道(龙虾同款协议) + Codex CLI 会话 + Web 聊天/配置页。
// 运行: node chat/bridge.cjs   (默认 127.0.0.1:21121)
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const { CodexBridge } = require('../server/re/codex.js');
const { AppServerClient } = require('../server/re/appserver.js');
const appserver = new AppServerClient({ log });
const { WeChatChannel } = require('./plugin/wechat.cjs');
const { WeixinChannel } = require('./plugin/weixin.cjs');

const ROOT = path.resolve(__dirname, '..');
const HERE = __dirname;
const CFG_PATH = process.env.CX_CONFIG || path.join(HERE, 'config.json');
const EXAMPLE = path.join(HERE, 'config.example.json');
const PUBLIC = path.join(HERE, 'public');

function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; } }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8'); }
function rid(prefix) { return prefix + crypto.randomBytes(12).toString('hex'); }

if (!fs.existsSync(CFG_PATH)) {
    const base = readJson(EXAMPLE, {});
    base.token = base.token || rid('cx-');
    writeJson(CFG_PATH, base);
}
let CONFIG = readJson(CFG_PATH, {});

const LOG_PATH = path.join(HERE, 'bridge.log');
function log(...a) {
    const line = '[' + new Date().toISOString() + '] ' + a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ');
    try { fs.appendFileSync(LOG_PATH, line + '\n'); } catch (e) { }
    console.log(line);
}

const codex = new CodexBridge({ root: ROOT, log, cfgPath: path.join(HERE, 'data', 'codex-config.json'), sessionsPath: (CONFIG.codex || {}).sessionsPath || path.join(HERE, 'data', 'sessions.json') });
const TOKEN = () => CONFIG.token || '';
const sseClients = new Set();
let activeIdePeer = null;
let lastIdeSignature = '';
let lastActiveIdeKey = '';
let lastItemsSig = '';
let statusCache = { at: 0, data: null };     // /api/status 中继结果缓存 30s
let modelsCache = { at: 0, data: null };     // /api/models 中继结果缓存 60s
let ideItemsCache = { peer: '', at: 0, data: null }; // ideSyncTick items 缓存, /api/ide/items 命中即免中继往返
let lastIdeSyncAt = 0;
let ideSyncTimer = null;
function broadcast(type, data) {
    const msg = 'event: ' + type + '\ndata: ' + JSON.stringify(data || {}) + '\n\n';
    for (const res of sseClients) { try { res.write(msg); } catch (e) { sseClients.delete(res); } }
}
function relayCall(action, params, timeoutMs) {
    const relay = CONFIG.relay || {};
    const body = Object.assign({ token: relay.token || '', action }, params || {});
    const url = relay.url || 'https://normalgame.cn/apim';
    // timeoutMs：同步类接口（状态/历史/会话列表/IDE 轮询）传 15-20s，
    // 不传则用 chat 的长超时——同步接口挂 10 分钟会让前端雪崩式堆积。
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(Number(timeoutMs || relay.timeoutMs || 660000)) })
        .then(async r => { const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { const plain = String(t).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120); const hint = /504/.test(t) ? '504 网关超时（上游任务超过 600s，已中止）' : ('HTTP ' + r.status + ' 非 JSON：' + plain); throw new Error('relay ' + hint); } if (!r.ok || j.ok === false) throw new Error(j.error || ('relay HTTP ' + r.status)); return j; });
}
async function chatStream(opts, onProgress) {
    // 流式执行：每个 codex 事件实时回调 onProgress(ev)。
    // 用途：微信端逐轮回传工具结果——模型反复试错 9 分钟时用户
    // 能看到每一步，而不是干等最终超时才回一次。
    if ((CONFIG.mode || 'local') === 'relay') {
        const relay = CONFIG.relay || {};
        const body = Object.assign({ token: relay.token || '', action: 'codex.chatStream' }, opts);
        const url = relay.url || 'https://normalgame.cn/apim';
        const res = await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(Number(relay.timeoutMs || 890000))
        });
        if (!res.ok) throw new Error('relay HTTP ' + res.status);
        if (!res.body) return chat(opts); // 环境不支持流式读：退回一次性
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '', final = null;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            let idx;
            while ((idx = buf.indexOf('\n')) >= 0) {
                const line = buf.slice(0, idx).trim();
                buf = buf.slice(idx + 1);
                if (!line) continue;
                let j; try { j = JSON.parse(line); } catch (e) { continue; }
                if (j.type === 'event' && onProgress) { try { onProgress(j.event); } catch (e) { } }
                if (j.type === 'final') final = j.result;
            }
        }
        if (!final) throw new Error('relay 流式响应缺少 final');
        return final;
    }
    return codex.chat(Object.assign({}, opts, { onEvent: onProgress }));
}
async function chat(opts) {
    if (opts.peer && String(opts.peer).startsWith('ide:')) {
        const threadId = String(opts.peer).slice(4);
        if ((CONFIG.mode || 'local') === 'relay') {
            const r = await relayCall('codex.ideSend', { threadId, text: opts.text });
            return { ok: true, peer: 'ide:' + threadId, threadId, mode: r.mode || 'turn', text: r.mode === 'queued' ? '消息已排队：该 IDE 会话正在 Codex 中运行，稍后会自动处理' : '已提交到 IDE 会话，回复将实时同步', result: r };
        }
        try {
            await appserver.resumeThread(threadId, true);
            const t = await appserver.startTurn(threadId, opts.text);
            return { ok: true, peer: 'ide:' + threadId, threadId, mode: 'turn', text: '已提交到 IDE 会话，回复将实时同步', result: t };
        } catch (e) {
            if (/active writer/i.test(String(e.message))) {
                const q = await appserver.queueAdd(threadId, opts.text);
                return { ok: true, peer: 'ide:' + threadId, threadId, mode: 'queued', text: '消息已排队：该 IDE 会话正在 Codex 中运行，稍后会自动处理', result: q };
            }
            throw e;
        }
    }
    if ((CONFIG.mode || 'local') === 'relay') {
        // relay 模式下 Codex 跑在另一台机器，路径互不可见：把本机图片读成
        // base64 一起送过去，由对端落盘后再交给 codex exec -i。
        const relayImages = (Array.isArray(opts.images) ? opts.images : []).map(x => {
            if (x && typeof x === 'object' && x.b64) return x;
            try {
                const ip = String(x);
                return { name: path.basename(ip), b64: fs.readFileSync(ip).toString('base64') };
            } catch (e) { log('relay image read failed', String(x), String(e.message)); return null; }
        }).filter(Boolean);
        return relayCall('codex.chat', { peer: opts.peer, text: opts.text, images: relayImages, cwd: opts.cwd || (CONFIG.codex || {}).cwd, model: opts.model || (CONFIG.codex || {}).model, sandbox: opts.sandbox || (CONFIG.codex || {}).sandbox, timeoutMs: (CONFIG.codex || {}).timeoutMs });
    }
    // 注：relay 返回值自带 imagePaths(本机路径,给local用) 与 images[{name,b64}]
    // （≤8MB/张、≤4 张）——桥侧落盘后交给微信 sendImage 回传。
    return codex.chat({ peer: opts.peer, text: opts.text, images: opts.images || [], cwd: opts.cwd || (CONFIG.codex || {}).cwd, model: opts.model || (CONFIG.codex || {}).model, sandbox: opts.sandbox || (CONFIG.codex || {}).sandbox, timeoutMs: (CONFIG.codex || {}).timeoutMs, via: opts.via || 'web' });
}
function localSessions() { try { return codex.sessions(); } catch (e) { return []; } }
function localHistory(peer) { try { return codex.history(peer, 200); } catch (e) { return { peer, messages: [] }; } }
async function listConversations() {
    let sessions = [];
    if ((CONFIG.mode || 'local') === 'relay') {
        try { const r = await relayCall('codex.sessions', {}, 20000); sessions = r.sessions || []; } catch (e) { log('relay sessions failed', String(e.message)); }
    } else sessions = localSessions();
    let ide = [];
    try {
        if ((CONFIG.mode || 'local') === 'relay') { const r = await relayCall('codex.ideThreads', { limit: 50 }, 20000); ide = r.threads || []; }
        else ide = codex.ideThreads(50);
    } catch (e) { log('ide threads failed', String(e.message)); }
    const ideConvs = (ide || []).map(t => ({
        id: 'ide:' + t.id,
        title: 'IDE · ' + (t.title || t.id),
        last: t.last || '',
        lastRole: '',
        updatedAt: t.updatedAt || 0,
        count: 0,
        kind: 'ide',
        status: t.status || null,
        cwd: t.cwd || '',
        project: t.project || ''
    }));
    return sessions.map(s => {
        const h = ((CONFIG.mode || 'local') !== 'relay') ? localHistory(s.id) : { messages: [] };
        const msgs = h.messages || [];
        const last = msgs.length ? msgs[msgs.length - 1] : null;
        return {
            id: s.id,
            title: s.id.replace(/^wechat:group:/, '群 ').replace(/^wechat:/, '微信 '),
            last: last ? String(last.text || '').slice(0, 80) : '',
            lastRole: last ? last.role : '',
            updatedAt: s.updatedAt || 0,
            count: msgs.length || s.count || 0,
            cwd: s.cwd || '',
            model: s.model || '',
            kind: s.id.startsWith('wechat:group:') ? 'group' : (s.id.startsWith('wechat:') ? 'wechat' : 'codex')
        };
    }).concat(ideConvs).sort((a, b) => b.updatedAt - a.updatedAt);
}
async function history(peer, since) {
    if (String(peer).startsWith('ide:')) {
        activeIdePeer = String(peer);
        const threadId = String(peer).slice(4);
        if ((CONFIG.mode || 'local') === 'relay') {
            try { return await relayCall('codex.ideHistory', { threadId, limit: 200, since }, 20000); } catch (e) { return { peer, messages: [], error: String(e.message) }; }
        }
        try { return await codex.ideHistory(threadId, 200, since); } catch (e) { return { peer, messages: [], error: String(e.message) }; }
    }
    if ((CONFIG.mode || 'local') === 'relay') {
        try { return await relayCall('codex.history', { peer, limit: 200, since }, 20000); } catch (e) { return { peer, messages: [], error: String(e.message) }; }
    }
    return localHistory(peer, 200, since);
}

// ---------------- 附件回传 ----------------
// codex.chat 返回 imagePaths(执行机本机路径) + images[{name,b64}]。
// 本机路径存在就直接用；否则把 b64 落盘到 chat/data/media/return-*。
async function materializeReturnImages(r) {
    const out = [];
    if (!r) return out;
    const fsx = fs; const pathx = path;
    for (const p of (r.imagePaths || [])) {
        try { if (fsx.statSync(String(p)).isFile()) { out.push({ path: String(p), name: pathx.basename(String(p)) }); } } catch (e) { }
    }
    for (const im of (r.images || [])) {
        if (!im || !im.b64 || !im.name) continue;
        if (out.some(x => x.name === im.name)) continue;
        try {
            const dir = pathx.join(HERE, 'data', 'media');
            fsx.mkdirSync(dir, { recursive: true });
            const fp = pathx.join(dir, 'return-' + Date.now() + '-' + im.name.replace(/[^\w\-.]/g, '_'));
            fsx.writeFileSync(fp, Buffer.from(im.b64, 'base64'));
            out.push({ path: fp, name: im.name });
        } catch (e) { log('return image write failed', String(e.message)); }
    }
    return out.slice(0, 4);
}

// ---------------- WeChat ----------------
async function handleIncoming(m) {
    const peer = m.peer, to = m.to;
    const images = Array.isArray(m.images) ? m.images.filter(Boolean) : [];
    const text = String(m.text || '').trim() || (images.length ? '请看图片内容并回答。' : '');
    log('wechat inbound', to, String(text).slice(0, 80), images.length ? ('images=' + images.length) : '');
    broadcast('message', { peer, role: 'user', text, images, via: 'wechat' });
    try {
        // 流式进度：模型每完成一轮（命令/看图/中间结论）就先回一条微信，
        // 长任务不再拖到超时才回（用户要求：每次写了的都先回应客户端）。
        const r = await chatStream({ peer, text, images, via: 'wechat' }, (ev) => {
            if (!ev || ev.type !== 'item.completed') return;
            const it = ev.item || {};
            const ty = it.type;
            try {
                // 进度消息不带 context_token：iLink 会把同 context 的
                // 消息攒到"轮"结束才投递（实测全部堆到最后一次发）；
                // 去掉 context 让每条独立即时送达。
                if (ty === 'CommandExecution') {
                    const cmdRaw = Array.isArray(it.command)
                        ? (it.command[it.command.length - 1] || '') : String(it.command || '');
                    const cmd = String(cmdRaw).replace(/\s+/g, ' ').slice(0, 90);
                    const exit = (it.exitCode === null || it.exitCode === undefined) ? '?' : it.exitCode;
                    const out = String(it.aggregatedOutput || '').replace(/\s+/g, ' ').slice(0, 160);
                    wechat.sendText(to, '🔧 ' + cmd + '\n→ exit ' + exit + (out ? ('\n' + out) : ''))
                        .catch(e => log('wechat progress failed', String(e.message)));
                } else if (ty === 'ImageView') {
                    wechat.sendText(to, '🖼 已查看 ' + String(it.path || '')).catch(() => { });
                } else if (ty === 'agentMessage') {
                    const txt = String(it.text || '').trim();
                    if (txt.length > 30)
                        wechat.sendText(to, '💭 ' + txt.slice(0, 150)).catch(() => { });
                }
            } catch (e) { }
        });
        await wechat.sendText(to, r.text || '(空回复)', m.contextToken);
        broadcast('message', { peer, role: 'assistant', text: r.text, images: (r.imagePaths || []), via: 'wechat' });
        broadcast('conversations', { at: Date.now() });
        // 附件回传：分析中真实看过的图片(view_image)发回微信。
        // relay 模式下本机没有那些文件，先用返回的 base64 落盘。
        const back = await materializeReturnImages(r);
        for (const im of back) {
            try { await wechat.sendImage(to, im.path, m.contextToken); }
            catch (e2) { log('wechat sendImage failed', im.path, String(e2.message)); }
        }
    } catch (e) {
        log('wechat chat failed', String(e.message));
        try { await wechat.sendText(to, '[Codex 错误] ' + e.message, m.contextToken); } catch (e2) { }
    }
}
const WX_PROVIDER = ((CONFIG.wechat || {}).provider || 'ilink');
const wechat = WX_PROVIDER === 'canghe'
  ? new WeChatChannel(CONFIG.wechat || {}, {
        log,
        onMessage: (msg) => handleIncoming({
            peer: msg.group ? ('wechat:group:' + msg.group.id) : ('wechat:' + msg.sender.id),
            to: msg.group ? msg.group.id : msg.sender.id,
            text: msg.content
        })
    })
  : new WeixinChannel(CONFIG.wechat || {}, {
        log,
        onMessage: (m) => handleIncoming({ peer: 'wechat:' + m.from, to: m.from, text: m.text, images: m.images, contextToken: m.contextToken })
    });

const HELP = {
    service: 'codex-chat-bridge',
    version: '1.0',
    description: 'Codex 远程同步聊天桥: 微信(OpenClaw/龙虾同款通道) <-> Codex CLI <-> Web 对话列表。',
    auth: '写接口需请求头 X-Cx-Token 或 body.token; 初始 token 见 chat/config.json。',
    endpoints: {
        'GET /': '微信式聊天 UI',
        'GET /codex.html': '配置页(工作目录/模型/微信/阿里云)',
        'GET /api/help': '本帮助',
        'GET /api/status': '服务/Codex/微信状态',
        'GET /api/models': '模型列表',
        'GET /api/dirs?path=': '列目录(新建聊天的目录选择器)',
        'GET /api/media?path=': '按路径读图片(聊天回显; relay模式经 apim fs.read)',
        'GET /api/conversations': '会话列表',
        'GET /api/history?peer=': '对话历史',
        'POST /api/chat': '{peer,text,cwd?,model?,sandbox?}',
        'POST /api/config': '{patch} 修改配置',
        'POST /api/wechat/login': '获取二维码并开始轮询',
        'GET /api/wechat/status': '微信登录状态',
        'POST /api/wechat/send': '{to,text}',
        'POST /webhook/wechat': '微信回调(OpenClaw 同款负载)',
        'GET /api/events': 'SSE 消息流',
        'GET /api/ecs/terminal': '阿里云 Workbench 终端 URL'
    },
    notes: ['消息/会话只存本机 chat/data 与 Codex 会话; 不经云数据库。', '微信通道协议来自 openclaw-wechat: 60001/80001 文本、/v1/iPadLogin 等。']
};

function sendJson(res, code, obj) {
    const b = JSON.stringify(obj);
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,X-Cx-Token', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Cache-Control': 'no-store' });
    res.end(b);
}
function readBody(req, limit) {
    return new Promise((resolve, reject) => {
        let raw = '', size = 0;
        req.on('data', d => { size += d.length; if (size > (limit || 2e6)) { req.destroy(); reject(new Error('body too large')); } raw += d; });
        req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(new Error('JSON 解析失败: ' + e.message)); } });
    });
}
function auth(req, body) { const t = (body && body.token) || req.headers['x-cx-token'] || ''; return !!t && t === TOKEN(); }
const wxLoginHits = new Map();
function allowWxLogin(req) {
    const ip = (req.socket && req.socket.remoteAddress) || 'unknown';
    const now = Date.now();
    for (const [k, t] of wxLoginHits) if (now - t > 60000) wxLoginHits.delete(k);
    const last = wxLoginHits.get(ip) || 0;
    if (now - last < 12000) return false;
    wxLoginHits.set(ip, now);
    return true;
}
function staticFile(res, name) {
    const f = path.join(PUBLIC, name);
    fs.readFile(f, (e, buf) => {
        if (e) { res.writeHead(404).end('Not Found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(buf);
    });
}

async function ideSyncTick() {
    if (CONFIG.ideSync === false || sseClients.size === 0) return;
    try {
        let snap;
        if ((CONFIG.mode || 'local') === 'relay') snap = await relayCall('codex.ideSnapshot', { activePeer: activeIdePeer || '', since: lastIdeSyncAt });
        else {
            const threads = codex.ideThreads(50);
            const changed = threads.filter(t => (t.updatedAt || 0) > lastIdeSyncAt);
            const histories = [];
            for (const t of changed) { try { histories.push(await codex.ideHistory(t.id, 20)); } catch (e) { } }
            let active = null;
            if (activeIdePeer) { try { active = await codex.ideHistory(activeIdePeer.slice(4), 20); } catch (e) { active = null; } }
            snap = { threads, histories, active };
        }
        const sig = JSON.stringify((snap.threads || []).map(t => [t.id, t.updatedAt]));
        if (sig !== lastIdeSignature) { lastIdeSignature = sig; broadcast('conversations', { at: Date.now() }); }
        for (const h of (snap.histories || [])) {
            if (!h || !h.peer || !Array.isArray(h.messages)) continue;
            broadcast('history', { peer: h.peer, messages: h.messages });
        }
        if (activeIdePeer) {
            try {
                let items;
                if ((CONFIG.mode || 'local') === 'relay') { try { items = await relayCall('codex.ideItemsLive', { threadId: activeIdePeer.slice(4), limit: 50 }, 15000); } catch (e) { items = await relayCall('codex.ideItems', { threadId: activeIdePeer.slice(4), limit: 50 }, 15000); } }
                else items = await appserver.itemsList(activeIdePeer.slice(4), 50);
                const entries = (items && items.data) || [];
                const sig = JSON.stringify(entries.map(e => [(e.item || {}).id, (e.item || {}).text || '', (e.item || {}).aggregatedOutput || '', (e.item || {}).status || '', e.completedAtMs || 0]));
                if (sig !== lastItemsSig && entries.length) { lastItemsSig = sig; broadcast('items', { peer: activeIdePeer, items: entries }); }
                ideItemsCache = { peer: activeIdePeer, at: Date.now(), data: items };
            } catch (e) { }
        }
                if (snap.active && Array.isArray(snap.active.messages)) {
            const msgs = snap.active.messages;
            const last = msgs.length ? msgs[msgs.length - 1] : null;
            const key = String(activeIdePeer) + '|' + (last ? (last.ts || 0) + '|' + String(last.text || '').slice(0, 80) : '');
            if (key !== lastActiveIdeKey) { lastActiveIdeKey = key; broadcast('history', { peer: activeIdePeer, messages: msgs }); }
        }
        lastIdeSyncAt = Date.now();
    } catch (e) { log('ide sync failed', String(e.message)); }
}
function startIdeSync() {
    if (ideSyncTimer || CONFIG.ideSync === false) return;
    ideSyncTimer = setInterval(() => { ideSyncTick().catch(() => { }); }, Number(CONFIG.ideSyncMs || 1000));
}
const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') { sendJson(res, 204, {}); return; }
    let u; try { u = new URL(req.url, 'http://x'); } catch (e) { res.writeHead(400).end(); return; }
    const p = u.pathname;
    if (req.method === 'GET' && (p === '/' || p === '/index.html')) return staticFile(res, 'chat.html');
    if (req.method === 'GET' && p === '/codex.html') return staticFile(res, 'codex.html');
    if (req.method === 'GET' && p === '/qrcode.js') return staticFile(res, 'qrcode.js', 'application/javascript; charset=utf-8');
    if (req.method === 'GET' && p === '/api/help') return sendJson(res, 200, Object.assign({ ok: true }, HELP));
    if (req.method === 'GET' && p === '/api/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*' });
        res.write(': connected\n\n'); sseClients.add(res);
        const hb = setInterval(() => { try { res.write(': hb\n\n'); } catch (e) { } }, 15000);
        req.on('close', () => { clearInterval(hb); sseClients.delete(res); });
        return;
    }
    if (req.method === 'POST' && p === '/webhook/wechat') {
        const body = await readBody(req).catch(() => null);
        if (!body) { res.writeHead(400).end('Bad Request'); return; }
        try { if (wechat.onPayload) await wechat.onPayload(body); } catch (e) { log('webhook failed', String(e.message)); }
        res.writeHead(200, { 'Content-Type': 'text/plain' }).end('OK');
        return;
    }
    if (p.startsWith('/api/')) {
        const body = req.method === 'POST' ? await readBody(req).catch(e => ({ __error: e.message })) : {};
        if (body && body.__error) return sendJson(res, 400, { ok: false, error: body.__error, help: HELP });
        const publicWx = ((p === '/api/wechat/login' || p === '/api/wechat/connect') && req.method === 'POST') || (p === '/api/wechat/status' && req.method === 'GET');
        const publicRead = req.method === 'GET' && (p === '/api/conversations' || p === '/api/history' || p === '/api/models');
        if (!publicWx && !publicRead && !auth(req, body)) return sendJson(res, 401, { ok: false, error: 'token 缺失/错误 (X-Cx-Token)', help: HELP });
        if (req.method === 'POST' && p === '/api/wechat/login' && !allowWxLogin(req)) return sendJson(res, 429, { ok: false, error: '二维码获取过于频繁，请 12 秒后再试', help: HELP });
        try {
            if (req.method === 'GET' && p === '/api/status') {
                let st;
                if ((CONFIG.mode || 'local') === 'relay') {
                    if (statusCache.data && Date.now() - statusCache.at < 30000) st = statusCache.data;
                    else { try { st = await relayCall('codex.status', {}, 20000); statusCache = { at: Date.now(), data: st }; } catch (e) { st = statusCache.data || { ok: false, error: String(e.message) }; } }
                }
                else st = codex.status();
                return sendJson(res, 200, { ok: true, mode: CONFIG.mode || 'local', relay: CONFIG.relay || {}, codex: st, wechat: wechat.status(), port: CONFIG.port || 21121 });
            }
            if (req.method === 'GET' && p === '/api/models') {
                let models;
                if ((CONFIG.mode || 'local') === 'relay') {
                    if (modelsCache.data && Date.now() - modelsCache.at < 60000) models = modelsCache.data;
                    else { const r = await relayCall('codex.models', {}, 20000); models = r.models || []; modelsCache = { at: Date.now(), data: models }; }
                }
                else models = codex.models();
                return sendJson(res, 200, { ok: true, models });
            }
            if (req.method === 'GET' && p === '/api/config') return sendJson(res, 200, { ok: true, config: CONFIG });
            if (req.method === 'POST' && p === '/api/config') {
                const patch = body.patch || {};
                for (const k of ['mode', 'port', 'token', 'relay', 'codex', 'wechat', 'ecs']) if (patch[k] !== undefined) CONFIG[k] = patch[k];
                writeJson(CFG_PATH, CONFIG);
                if (CONFIG.codex && (CONFIG.mode || 'local') !== 'relay') codex.save(CONFIG.codex);
                broadcast('config', { at: Date.now() });
                return sendJson(res, 200, { ok: true, config: CONFIG });
            }
            if (req.method === 'GET' && p === '/api/conversations') return sendJson(res, 200, { ok: true, conversations: await listConversations() });
            if (req.method === 'GET' && p === '/api/history') return sendJson(res, 200, { ok: true, history: await history(u.searchParams.get('peer') || 'default', u.searchParams.get('since')) });
            if (req.method === 'GET' && p === '/api/media') {
                const fp = String(u.searchParams.get('path') || '');
                if (!fp || !/\.(png|jpe?g|gif|webp|bmp)$/i.test(fp))
                    return sendJson(res, 400, { ok: false, error: '仅支持图片路径(png/jpg/gif/webp/bmp)' });
                try {
                    let b64 = '';
                    if ((CONFIG.mode || 'local') === 'relay') {
                        // 微信入站图在桥本机，Codex 回传图在执行机：先试本地，再走 apim fs.read
                        try {
                            const stL = fs.statSync(fp);
                            if (stL.size > 8 * 1024 * 1024) throw new Error('图片过大(>8MB)');
                            b64 = fs.readFileSync(fp).toString('base64');
                        } catch (eLocal) {
                            const r = await relayCall('fs.read', { path: fp, encoding: 'base64' }, 30000);
                            b64 = String((r && r.content) || '');
                        }
                    } else {
                        const st = fs.statSync(fp);
                        if (st.size > 8 * 1024 * 1024) throw new Error('图片过大(>8MB)');
                        b64 = fs.readFileSync(fp).toString('base64');
                    }
                    const buf = Buffer.from(b64, 'base64');
                    if (!buf.length) throw new Error('读取为空');
                    const mime = /\.png$/i.test(fp) ? 'image/png'
                        : (/\.gif$/i.test(fp) ? 'image/gif'
                        : (/\.webp$/i.test(fp) ? 'image/webp' : 'image/jpeg'));
                    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'private, max-age=3600', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,X-Cx-Token' });
                    res.end(buf);
                } catch (e) {
                    return sendJson(res, 400, { ok: false, error: '读取图片失败: ' + e.message });
                }
                return;
            }
            if (req.method === 'GET' && p === '/api/dirs') {
                const target = u.searchParams.get('path') || '';
                try {
                    if ((CONFIG.mode || 'local') === 'relay') {
                        const r = await relayCall('fs.listDir', { path: target });
                        return sendJson(res, 200, Object.assign({ ok: true }, r));
                    }
                    const base = target ? path.resolve(target) : ((CONFIG.codex || {}).cwd || ROOT);
                    const dirs = fs.readdirSync(base, { withFileTypes: true })
                        .filter(d => d.isDirectory())
                        .map(d => ({ name: d.name, path: path.join(base, d.name) }))
                        .sort((a, b) => a.name.localeCompare(b.name));
                    return sendJson(res, 200, { ok: true, path: base, parent: path.dirname(base), dirs });
                } catch (e) {
                    return sendJson(res, 400, { ok: false, error: '列目录失败: ' + e.message });
                }
            }
            if (req.method === 'POST' && p === '/api/chat') {
                if (!body.text && !(Array.isArray(body.images) && body.images.length)) return sendJson(res, 400, { ok: false, error: 'text 必填', help: HELP });
                const peer = body.peer || ('web:' + Date.now());
                broadcast('message', { peer, role: 'user', text: body.text, images: (body.images || []), via: 'web' });
                const r = await chat({ peer, text: body.text || '请看图片内容并回答。', images: body.images || [], cwd: body.cwd, model: body.model, sandbox: body.sandbox, via: 'web' });
                broadcast('message', { peer, role: 'assistant', text: r.text, images: (r.imagePaths || r.imageUrls || []), via: 'web' });
                broadcast('conversations', { at: Date.now() });
                // 回传图片给 web UI（data URL 渲染；本机文件直接读，relay 用 b64）
                const imgs = [];
                for (const im of (r.images || [])) {
                    if (im && im.b64) imgs.push('data:image/' + (String(im.name).toLowerCase().endsWith('.png') ? 'png' : 'jpeg') + ';base64,' + im.b64);
                }
                if (!imgs.length) {
                    for (const p of (r.imagePaths || [])) {
                        try {
                            const buf = fs.readFileSync(String(p));
                            const mime = String(p).toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
                            imgs.push('data:' + mime + ';base64,' + buf.toString('base64'));
                        } catch (e) { }
                        if (imgs.length >= 4) break;
                    }
                }
                return sendJson(res, 200, Object.assign({ ok: true, imageUrls: imgs }, r));
            }
            if (req.method === 'POST' && p === '/api/wechat/connect') { const r = await wechat.start(); return sendJson(res, 200, { ok: true, wechat: r }); }
            if (req.method === 'POST' && p === '/api/wechat/login') { const st = await wechat.startLogin(); return sendJson(res, 200, { ok: true, wechat: st }); }
            if (req.method === 'GET' && p === '/api/wechat/status') return sendJson(res, 200, { ok: true, wechat: wechat.status() });
            if (req.method === 'POST' && p === '/api/wechat/send') {
                if (!body.to || !body.text) return sendJson(res, 400, { ok: false, error: 'to/text 必填', help: HELP });
                const r = await wechat.sendText(body.to, body.text);
                return sendJson(res, 200, { ok: true, result: r });
            }
            if (req.method === 'GET' && p === '/api/ecs/terminal') {
                const e = CONFIG.ecs || {};
                const url = e.workbenchUrl || ('https://ecs-workbench.aliyun.com/?instanceType=ecs&regionId=' + encodeURIComponent(e.regionId || 'cn-shenzhen') + '&instanceId=' + encodeURIComponent(e.instanceId || '') + '&workbenchType=ssh&language=zh');
                return sendJson(res, 200, { ok: true, url, regionId: e.regionId || '', instanceId: e.instanceId || '' });
            }
            if (req.method === 'POST' && p === '/api/ide/manage') {
                if (!body.threadId || !body.op) return sendJson(res, 400, { ok: false, error: 'threadId/op 必填', help: HELP });
                if ((CONFIG.mode || 'local') === 'relay') {
                    const r = await relayCall('codex.ideManage', { threadId: body.threadId, op: body.op, name: body.name }, 20000);
                    broadcast('conversations', { at: Date.now() });
                    return sendJson(res, 200, { ok: true, result: r });
                }
                if (body.op === 'archive') return sendJson(res, 200, { ok: true, result: await appserver.archive(body.threadId) });
                if (body.op === 'unarchive') return sendJson(res, 200, { ok: true, result: await appserver.unarchive(body.threadId) });
                if (body.op === 'delete') return sendJson(res, 200, { ok: true, result: await appserver.delete(body.threadId) });
                if (body.op === 'rename') { if (!body.name) return sendJson(res, 400, { ok: false, error: 'name 必填' }); return sendJson(res, 200, { ok: true, result: await appserver.setName(body.threadId, body.name) }); }
                return sendJson(res, 400, { ok: false, error: '未知 op' });
            }
                        if (req.method === 'POST' && p === '/api/conv/delete') {
                if (!body.peer) return sendJson(res, 400, { ok: false, error: 'peer 必填', help: HELP });
                if ((CONFIG.mode || 'local') === 'relay') {
                    const r = await relayCall('codex.convDelete', { peer: body.peer }, 20000);
                } else {
                    let threadId = '';
                    if (String(body.peer).startsWith('ide:')) threadId = String(body.peer).slice(4);
                    else { const st = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'server', 're', 'codex-sessions.json'), 'utf8')).peers || {}; threadId = (st[body.peer] || {}).threadId || ''; }
                    if (threadId) { try { await appserver.delete(threadId); } catch (e) { log('appserver delete failed ' + e.message); } }
                    codex.deleteConversation(body.peer);
                }
                broadcast('conversations', { at: Date.now(), deleted: body.peer });
                return sendJson(res, 200, { ok: true, deleted: body.peer });
            }
                        if (req.method === 'GET' && p === '/api/ide/queue') {
                const peer = u.searchParams.get('peer') || '';
                if (!peer.startsWith('ide:')) return sendJson(res, 400, { ok: false, error: 'peer 必须是 ide:*' });
                const threadId = peer.slice(4);
                if ((CONFIG.mode || 'local') === 'relay') {
                    try { const r = await relayCall('codex.ideQueueList', { threadId }, 15000); return sendJson(res, 200, { ok: true, queue: r }); } catch (e) { return sendJson(res, 500, { ok: false, error: String(e.message) }); }
                }
                try { const r = await appserver.queueList(threadId); return sendJson(res, 200, { ok: true, queue: r }); } catch (e) { return sendJson(res, 500, { ok: false, error: String(e.message) }); }
            }
            if (req.method === 'POST' && p === '/api/ide/queue/delete') {
                if (!body.peer || !body.queuedSubmissionId) return sendJson(res, 400, { ok: false, error: 'peer/queuedSubmissionId 必填', help: HELP });
                if (!String(body.peer).startsWith('ide:')) return sendJson(res, 400, { ok: false, error: 'peer 必须是 ide:*' });
                const threadId = String(body.peer).slice(4);
                if ((CONFIG.mode || 'local') === 'relay') {
                    try { const r = await relayCall('codex.ideQueueDelete', { threadId, queuedSubmissionId: body.queuedSubmissionId }); return sendJson(res, 200, { ok: true, result: r }); } catch (e) { return sendJson(res, 500, { ok: false, error: String(e.message) }); }
                }
                try { const r = await appserver.queueDelete(threadId, body.queuedSubmissionId); return sendJson(res, 200, { ok: true, result: r }); } catch (e) { return sendJson(res, 500, { ok: false, error: String(e.message) }); }
            }
                        if (req.method === 'GET' && p === '/api/ide/items') {
                const peer = u.searchParams.get('peer') || '';
                if (!peer.startsWith('ide:')) return sendJson(res, 400, { ok: false, error: 'peer 必须是 ide:*' });
                const threadId = peer.slice(4);
                if ((CONFIG.mode || 'local') === 'relay') {
                    // 命中 ideSyncTick(1s) 的新鲜缓存: 免中继往返, 页面重进秒开
                    if (ideItemsCache.peer === peer && ideItemsCache.data && Date.now() - ideItemsCache.at < 2500) {
                        return sendJson(res, 200, { ok: true, live: true, cached: true, items: ideItemsCache.data });
                    }
                    let r; let live = true;
                    try { r = await relayCall('codex.ideItemsLive', { threadId, limit: 50 }); } catch (e) { live = false; try { r = await relayCall('codex.ideItems', { threadId, limit: 50 }); } catch (e2) { return sendJson(res, 500, { ok: false, error: String(e2.message) }); } }
                    if (!live && !((r && r.data) || []).length) return sendJson(res, 502, { ok: false, error: 'live 解析失败且 appserver 无数据(不返回空, 防前端闪烁)' });
                    ideItemsCache = { peer, at: Date.now(), data: r };
                    return sendJson(res, 200, { ok: true, live, items: r });
                }
                try { const r = await appserver.itemsList(threadId, 50); return sendJson(res, 200, { ok: true, items: r }); } catch (e) { return sendJson(res, 500, { ok: false, error: String(e.message) }); }
            }
                        if (req.method === 'POST' && p === '/api/active') {
                if (!body.peer) return sendJson(res, 400, { ok: false, error: 'peer 必填', help: HELP });
                activeIdePeer = String(body.peer).startsWith('ide:') ? String(body.peer) : activeIdePeer;
                lastItemsSig = '';
                return sendJson(res, 200, { ok: true, active: activeIdePeer });
            }
                        return sendJson(res, 404, { ok: false, error: '未知接口: ' + p, help: HELP });
        } catch (e) {
            log('api error', p, String(e.message));
            return sendJson(res, 500, { ok: false, error: String(e.message), help: HELP });
        }
    }
    res.writeHead(404).end('Not Found');
});

const PORT = Number(CONFIG.port || process.env.CX_PORT || 21121);
const HOST = CONFIG.host || '127.0.0.1';
server.listen(PORT, HOST, () => {
    log('codex-chat-bridge listening on ' + HOST + ':' + PORT + ' mode=' + (CONFIG.mode || 'local'));
    if (CONFIG.wechat && CONFIG.wechat.enabled) wechat.start().catch(e => log('wechat start failed', String(e.message)));
    startIdeSync();
    if ((CONFIG.mode || 'local') !== 'relay') appserver.start().then(()=>{
        appserver.onNotification(n=>{
            try {
                const m=n.method||'';
                if(!/^item\//.test(m)&&!/^turn\//.test(m)&&!/^thread\/status/.test(m))return;
                const threadId=(n.params&&n.params.threadId)||'';
                if(!threadId)return;
                broadcast('ideEvent',{threadId,peer:'ide:'+threadId,method:m,params:n.params||{}});
            } catch(e){log('ide notification error',String(e.message))}
        });
        log('appserver started for notifications');
    }).catch(e=>log('appserver start failed',String(e.message)));
});
process.on('uncaughtException', e => log('UNCAUGHT', String(e.stack || e)));
process.on('unhandledRejection', e => log('UNHANDLED', String(e && e.stack || e)));
module.exports = { server, wechat, codex };

