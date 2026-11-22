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
let lastIdeSyncAt = 0;
let ideSyncTimer = null;
function broadcast(type, data) {
    const msg = 'event: ' + type + '\ndata: ' + JSON.stringify(data || {}) + '\n\n';
    for (const res of sseClients) { try { res.write(msg); } catch (e) { sseClients.delete(res); } }
}
function relayCall(action, params) {
    const relay = CONFIG.relay || {};
    const body = Object.assign({ token: relay.token || '', action }, params || {});
    const url = relay.url || 'https://normalgame.cn/apim';
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(Number(relay.timeoutMs || 660000)) })
        .then(async r => { const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { throw new Error('relay 非 JSON: ' + t.slice(0, 200)); } if (!r.ok || j.ok === false) throw new Error(j.error || ('relay HTTP ' + r.status)); return j; });
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
        return relayCall('codex.chat', { peer: opts.peer, text: opts.text, cwd: opts.cwd || (CONFIG.codex || {}).cwd, model: opts.model || (CONFIG.codex || {}).model, sandbox: opts.sandbox || (CONFIG.codex || {}).sandbox, timeoutMs: (CONFIG.codex || {}).timeoutMs });
    }
    return codex.chat({ peer: opts.peer, text: opts.text, cwd: opts.cwd || (CONFIG.codex || {}).cwd, model: opts.model || (CONFIG.codex || {}).model, sandbox: opts.sandbox || (CONFIG.codex || {}).sandbox, timeoutMs: (CONFIG.codex || {}).timeoutMs, via: opts.via || 'web' });
}
function localSessions() { try { return codex.sessions(); } catch (e) { return []; } }
function localHistory(peer) { try { return codex.history(peer, 200); } catch (e) { return { peer, messages: [] }; } }
async function listConversations() {
    let sessions = [];
    if ((CONFIG.mode || 'local') === 'relay') {
        try { const r = await relayCall('codex.sessions', {}); sessions = r.sessions || []; } catch (e) { log('relay sessions failed', String(e.message)); }
    } else sessions = localSessions();
    let ide = [];
    try {
        if ((CONFIG.mode || 'local') === 'relay') { const r = await relayCall('codex.ideThreads', { limit: 50 }); ide = r.threads || []; }
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
            kind: s.id.startsWith('wechat:group:') ? 'group' : (s.id.startsWith('wechat:') ? 'wechat' : 'codex')
        };
    }).concat(ideConvs).sort((a, b) => b.updatedAt - a.updatedAt);
}
async function history(peer, since) {
    if (String(peer).startsWith('ide:')) {
        activeIdePeer = String(peer);
        const threadId = String(peer).slice(4);
        if ((CONFIG.mode || 'local') === 'relay') {
            try { return await relayCall('codex.ideHistory', { threadId, limit: 200, since }); } catch (e) { return { peer, messages: [], error: String(e.message) }; }
        }
        try { return await codex.ideHistory(threadId, 200, since); } catch (e) { return { peer, messages: [], error: String(e.message) }; }
    }
    if ((CONFIG.mode || 'local') === 'relay') {
        try { return await relayCall('codex.history', { peer, limit: 200 }); } catch (e) { return { peer, messages: [], error: String(e.message) }; }
    }
    return localHistory(peer, 200, since);
}

// ---------------- WeChat ----------------
async function handleIncoming(m) {
    const peer = m.peer, to = m.to, text = m.text;
    log('wechat inbound', to, String(text).slice(0, 80));
    broadcast('message', { peer, role: 'user', text, via: 'wechat' });
    try {
        const r = await chat({ peer, text, via: 'wechat' });
        await wechat.sendText(to, r.text || '(空回复)', m.contextToken);
        broadcast('message', { peer, role: 'assistant', text: r.text, via: 'wechat' });
        broadcast('conversations', { at: Date.now() });
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
        onMessage: (m) => handleIncoming({ peer: 'wechat:' + m.from, to: m.from, text: m.text, contextToken: m.contextToken })
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
                if ((CONFIG.mode || 'local') === 'relay') { try { items = await relayCall('codex.ideItemsLive', { threadId: activeIdePeer.slice(4), limit: 50 }); } catch (e) { items = await relayCall('codex.ideItems', { threadId: activeIdePeer.slice(4), limit: 50 }); } }
                else items = await appserver.itemsList(activeIdePeer.slice(4), 50);
                const entries = (items && items.data) || [];
                const sig = JSON.stringify(entries.map(e => [(e.item || {}).id, (e.item || {}).text || '', (e.item || {}).aggregatedOutput || '', (e.item || {}).status || '', e.completedAtMs || 0]));
                if (sig !== lastItemsSig) { lastItemsSig = sig; broadcast('items', { peer: activeIdePeer, items: entries }); }
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
                if ((CONFIG.mode || 'local') === 'relay') { try { st = await relayCall('codex.status', {}); } catch (e) { st = { ok: false, error: String(e.message) }; } }
                else st = codex.status();
                return sendJson(res, 200, { ok: true, mode: CONFIG.mode || 'local', relay: CONFIG.relay || {}, codex: st, wechat: wechat.status(), port: CONFIG.port || 21121 });
            }
            if (req.method === 'GET' && p === '/api/models') {
                let models;
                if ((CONFIG.mode || 'local') === 'relay') { const r = await relayCall('codex.models', {}); models = r.models || []; }
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
            if (req.method === 'POST' && p === '/api/chat') {
                if (!body.text) return sendJson(res, 400, { ok: false, error: 'text 必填', help: HELP });
                const peer = body.peer || ('web:' + Date.now());
                broadcast('message', { peer, role: 'user', text: body.text, via: 'web' });
                const r = await chat({ peer, text: body.text, cwd: body.cwd, model: body.model, sandbox: body.sandbox, via: 'web' });
                broadcast('message', { peer, role: 'assistant', text: r.text, via: 'web' });
                broadcast('conversations', { at: Date.now() });
                return sendJson(res, 200, Object.assign({ ok: true }, r));
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
                    const r = await relayCall('codex.ideManage', { threadId: body.threadId, op: body.op, name: body.name });
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
                    const r = await relayCall('codex.convDelete', { peer: body.peer });
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
                    try { const r = await relayCall('codex.ideQueueList', { threadId }); return sendJson(res, 200, { ok: true, queue: r }); } catch (e) { return sendJson(res, 500, { ok: false, error: String(e.message) }); }
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
                    let r; let live = true;
                    try { r = await relayCall('codex.ideItemsLive', { threadId, limit: 50 }); } catch (e) { live = false; try { r = await relayCall('codex.ideItems', { threadId, limit: 50 }); } catch (e2) { return sendJson(res, 500, { ok: false, error: String(e2.message) }); } }
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

