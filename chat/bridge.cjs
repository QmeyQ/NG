'use strict';
// bridge.cjs - Codex 远程同步聊天桥: 微信通道(龙虾同款协议) + Codex CLI 会话 + Web 聊天/配置页。
// 运行: node chat/bridge.cjs   (默认 127.0.0.1:21121)
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const { CodexBridge } = require('../server/re/codex.js');
const { WeChatChannel } = require('./plugin/wechat.cjs');

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
    }).sort((a, b) => b.updatedAt - a.updatedAt);
}
async function history(peer) {
    if ((CONFIG.mode || 'local') === 'relay') {
        try { return await relayCall('codex.history', { peer, limit: 200 }); } catch (e) { return { peer, messages: [], error: String(e.message) }; }
    }
    return localHistory(peer);
}

// ---------------- WeChat ----------------
const wechat = new WeChatChannel(CONFIG.wechat || {}, {
    log,
    onMessage: async (msg) => {
        const peer = msg.group ? ('wechat:group:' + msg.group.id) : ('wechat:' + msg.sender.id);
        const who = msg.group ? ('群 ' + msg.group.id + ' / ' + msg.sender.id) : msg.sender.id;
        log('wechat inbound', who, msg.content.slice(0, 80));
        broadcast('message', { peer, role: 'user', text: msg.content, via: 'wechat' });
        try {
            const r = await chat({ peer, text: msg.content, via: 'wechat' });
            const to = msg.group ? msg.group.id : msg.sender.id;
            await wechat.sendText(to, r.text || '(空回复)');
            broadcast('message', { peer, role: 'assistant', text: r.text, via: 'wechat' });
        } catch (e) {
            log('wechat chat failed', String(e.message));
            try { await wechat.sendText(msg.group ? msg.group.id : msg.sender.id, '[Codex 错误] ' + e.message); } catch (e2) { }
        }
    }
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
function staticFile(res, name) {
    const f = path.join(PUBLIC, name);
    fs.readFile(f, (e, buf) => {
        if (e) { res.writeHead(404).end('Not Found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(buf);
    });
}

const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') { sendJson(res, 204, {}); return; }
    let u; try { u = new URL(req.url, 'http://x'); } catch (e) { res.writeHead(400).end(); return; }
    const p = u.pathname;
    if (req.method === 'GET' && (p === '/' || p === '/index.html')) return staticFile(res, 'chat.html');
    if (req.method === 'GET' && p === '/codex.html') return staticFile(res, 'codex.html');
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
        try { await wechat.onPayload(body); } catch (e) { log('webhook failed', String(e.message)); }
        res.writeHead(200, { 'Content-Type': 'text/plain' }).end('OK');
        return;
    }
    if (p.startsWith('/api/')) {
        const body = req.method === 'POST' ? await readBody(req).catch(e => ({ __error: e.message })) : {};
        if (body && body.__error) return sendJson(res, 400, { ok: false, error: body.__error, help: HELP });
        if (!auth(req, body)) return sendJson(res, 401, { ok: false, error: 'token 缺失/错误 (X-Cx-Token)', help: HELP });
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
            if (req.method === 'GET' && p === '/api/history') return sendJson(res, 200, { ok: true, history: await history(u.searchParams.get('peer') || 'default') });
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
});
process.on('uncaughtException', e => log('UNCAUGHT', String(e.stack || e)));
process.on('unhandledRejection', e => log('UNHANDLED', String(e && e.stack || e)));
module.exports = { server, wechat, codex };

