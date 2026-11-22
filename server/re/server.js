'use strict';
// server.js - AI 远程中转 relay: 让远端 AI 经服务器 /apim 全权处理本机项目(文件/终端/LayaAir IDE MCP)。
// 监听 config.port(默认21119), 由独立 frpc(re/frpc.toml)穿透到服务器, 服务器 /apim 反代到此。
// 不触碰既有远程控制 FRPC(21118->5000)。鉴权 token; 参数缺失/错误直接返回帮助文档。
const http = require('http'); const fs = require('fs'); const path = require('path');
const cp = require('child_process'); const crypto = require('crypto');
const { LayaMcp } = require('./mcp.js');
const { CodexBridge } = require('./codex.js');
const { AppServerClient } = require('./appserver.js');
const codex = new CodexBridge({ log: (...a) => log('CODEX', ...a) });
const appserver = new AppServerClient({ log: (...a) => log('APPSERVER', ...a) });
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const PORT = CFG.port || 21119; const TOKEN = CFG.token; const PROJ = CFG.projectDir || process.cwd();
const MAX_BODY = (CFG.maxBodyMb || 64) * 1024 * 1024;
const laya = new LayaMcp(CFG.layaBase || 'http://127.0.0.1:18090');
const LOG = path.join(__dirname, CFG.logFile || 'relay.log');
function log(...a) { const line = '[' + new Date().toISOString() + '] ' + a.join(' '); try { fs.appendFileSync(LOG, line + '\n'); } catch (e) { } console.log(line); }

const HELP = {
    service: 're-relay (AI 远程中转)', version: '1.1',
    description: '远端 AI 通过服务器 /apim 调用本接口, 全权处理本机 LayaAir 项目: 文件读写/终端命令/LayaAir IDE MCP 接管。',
    endpoint: 'POST http://<服务器>/apim  (Content-Type: application/json)',
    auth: '每次请求必须带 token: 放在 JSON body 的 token 字段, 或请求头 X-Re-Token, 或 Authorization: Bearer <token>。token 见 re/config.json。',
    requestFormat: { token: '<必填>', action: '<必填, 见 actions>', '...params': '各 action 的参数' },
    responseFormat: '成功 {ok:true, ...结果}; 失败 {ok:false, error, help}。GET 任意路径或 action=help 返回本帮助。',
    notes: ['path 相对路径基于项目根 ' + PROJ + ', 也接受绝对路径(全权)。', 'exec 为高危操作, 默认 shell 执行, 超时 ' + (CFG.execTimeoutMs || 120000) + 'ms。', '文件默认 utf8; 二进制用 encoding=base64。'],
    actions: {
        help: { desc: '返回本帮助文档', params: {}, example: { action: 'help' } },
        ping: { desc: '健康检查', params: {}, example: { action: 'ping' } },
        info: { desc: '本机/项目环境信息', params: {}, example: { action: 'info' } },
        'fs.read': { desc: '读文件', params: { path: '必填, 文件路径', encoding: '可选 utf8(默认)|base64' }, example: { action: 'fs.read', path: 'src/index.ts' } },
        'fs.write': { desc: '写文件(覆盖)', params: { path: '必填', content: '必填, 内容', encoding: '可选 utf8(默认)|base64', mkdir: '可选 true 自动建父目录' }, example: { action: 'fs.write', path: 'tmp/a.txt', content: 'hello', mkdir: true } },
        'fs.append': { desc: '追加文件', params: { path: '必填', content: '必填', encoding: '可选' }, example: { action: 'fs.append', path: 'tmp/a.txt', content: '\nmore' } },
        'fs.list': { desc: '列目录', params: { path: '必填, 目录路径', recursive: '可选 true 递归(限深)' }, example: { action: 'fs.list', path: 'src' } },
        'fs.stat': { desc: '文件/目录元信息', params: { path: '必填' }, example: { action: 'fs.stat', path: 'src/index.ts' } },
        'fs.delete': { desc: '删除文件/目录', params: { path: '必填', recursive: '可选 true 递归删目录' }, example: { action: 'fs.delete', path: 'tmp/a.txt' } },
        'fs.move': { desc: '移动/重命名', params: { from: '必填', to: '必填' }, example: { action: 'fs.move', from: 'tmp/a.txt', to: 'tmp/b.txt' } },
        'fs.copy': { desc: '复制文件/目录', params: { from: '必填', to: '必填', recursive: '可选' }, example: { action: 'fs.copy', from: 'tmp/a.txt', to: 'tmp/c.txt' } },
        'fs.mkdir': { desc: '建目录(递归)', params: { path: '必填' }, example: { action: 'fs.mkdir', path: 'tmp/sub/dir' } },
        exec: { desc: '执行终端命令(高危)', params: { cmd: '必填, 命令字符串', cwd: '可选, 工作目录(默认项目根)', timeout: '可选 ms' }, example: { action: 'exec', cmd: 'node -v', cwd: 'F:/LayaProject' } },
        'laya.list': { desc: '列 LayaAir IDE MCP 工具', params: {}, example: { action: 'laya.list' } },
        'laya.call': { desc: '调任意 MCP 工具', params: { tool: '必填, 工具名', args: '可选, 参数对象' }, example: { action: 'laya.call', tool: 'ide-state', args: {} } },
        'laya.state': { desc: 'IDE 当前状态(场景/节点/构建目标)', params: {}, example: { action: 'laya.state' } },
        'laya.build': { desc: '触发 IDE 构建/发布', params: { platform: '可选, 如 web' }, example: { action: 'laya.build', platform: 'web' } },
        'laya.find': { desc: '按关键字查资源', params: { keyword: '必填' }, example: { action: 'laya.find', keyword: 'menu' } },
        'laya.open': { desc: '打开场景/预制体', params: { id: '必填, 资源id或路径' }, example: { action: 'laya.open', id: 'assets/ui/menu.ls' } },
        'laya.eval': { desc: 'IDE UI 进程执行 JS', params: { code: '必填, 自带返回值的表达式' }, example: { action: 'laya.eval', code: '1+1' } },
        'codex.status': { desc: 'Codex CLI 状态/模型/会话', params: {}, example: { action: 'codex.status' } },
        'codex.models': { desc: '可用模型列表', params: {}, example: { action: 'codex.models' } },
        'codex.config.get': { desc: '读取 Codex 桥配置', params: {}, example: { action: 'codex.config.get' } },
        'codex.config.set': { desc: '修改 Codex 桥配置(bin/cwd/model/sandbox/timeoutMs)', params: { patch: '必填, 对象' }, example: { action: 'codex.config.set', patch: { model: 'qwen3.8-max', cwd: 'F:/LayaProject' } } },
        'codex.chat': { desc: '以 peer 为会话键执行一次 Codex 对话(自动续聊)', params: { text: '必填', peer: '可选, 默认 default', cwd: '可选', model: '可选', sandbox: '可选', timeoutMs: '可选' }, example: { action: 'codex.chat', peer: 'wechat:wxid_x', text: '检查项目状态' } },
        'codex.history': { desc: '读取某个 peer 的对话历史', params: { peer: '必填', limit: '可选' }, example: { action: 'codex.history', peer: 'default' } },
        'codex.sessions': { desc: '列出所有 Codex 会话', params: {}, example: { action: 'codex.sessions' } },
        'codex.cancel': { desc: '取消当前 Codex 子进程', params: { peer: '可选' }, example: { action: 'codex.cancel' } },
        'codex.bundle': { desc: '返回 chat 桥源码包(base64 文件清单), 供 ECS 一键部署', params: {}, example: { action: 'codex.bundle' } },
        'codex.ideThreads': { desc: '列出 Codex IDE/Desktop 会话(state_5.sqlite source=vscode)', params: { limit: '可选' }, example: { action: 'codex.ideThreads', limit: 50 } },
        'codex.ideHistory': { desc: '读取某个 Codex IDE 会话历史', params: { threadId: '必填', limit: '可选' }, example: { action: 'codex.ideHistory', threadId: '01a1...', limit: 200 } },
        'codex.ideChat': { desc: '继续 Codex IDE 会话(codex exec resume)', params: { threadId: '必填', text: '必填', sandbox: '可选', timeoutMs: '可选' }, example: { action: 'codex.ideChat', threadId: '01a1...', text: '继续' } },
        'codex.appStatus': { desc: 'Codex app-server 状态', params: {}, example: { action: 'codex.appStatus' } },
        'codex.appThreads': { desc: 'app-server thread/list', params: { limit: '可选' }, example: { action: 'codex.appThreads', limit: 20 } },
        'codex.ideSend': { desc: 'app-server resume + turn/start(实时操作 IDE 线程)', params: { threadId: '必填', text: '必填' }, example: { action: 'codex.ideSend', threadId: '01a1...', text: '继续' } },
        'codex.ideQueue': { desc: 'app-server queue/add(active writer 时排队)', params: { threadId: '必填', text: '必填' }, example: { action: 'codex.ideQueue', threadId: '01a1...', text: '排队' } },
        'codex.ideSnapshot': { desc: '返回 IDE 线程快照(threads+activePeer 消息)', params: { activePeer: '可选' }, example: { action: 'codex.ideSnapshot', activePeer: 'ide:01a1...' } },
        'codex.ideManage': { desc: 'IDE 会话管理(archive/unarchive/delete/rename)', params: { threadId: '必填', op: '必填 archive|unarchive|delete|rename', name: 'rename 时必填' }, example: { action: 'codex.ideManage', threadId: '01a1...', op: 'rename', name: '新标题' } },
        'codex.convDelete': { desc: '删除 chat 会话(含 Codex 端线程)', params: { peer: '必填' }, example: { action: 'codex.convDelete', peer: 'ide:01a1...' } }
    }
};

function send(res, code, obj) { const b = JSON.stringify(obj); res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,X-Re-Token,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }); res.end(b); }
function fail(res, code, error, action) { send(res, code, { ok: false, error, help: (action && HELP.actions[action]) ? { action, ...HELP.actions[action] } : HELP }); }
function ok(res, data) { send(res, 200, { ok: true, ...data }); }
function resolvePath(p) { if (!p || typeof p !== 'string') throw new Error('path 必填且为字符串'); return path.isAbsolute(p) ? path.normalize(p) : path.resolve(PROJ, p); }
function need(params, keys, action) { for (const k of keys) if (params[k] === undefined || params[k] === null || params[k] === '') { const e = new Error('缺少必填参数: ' + k); e.action = action; e.help = true; throw e; } }

const handlers = {
    help: () => ({ help: HELP }),
    ping: () => ({ pong: true, time: Date.now(), version: HELP.version }),
    info: () => ({ platform: process.platform, node: process.version, projectDir: PROJ, cwd: process.cwd(), pid: process.pid, layaBase: CFG.layaBase, uptime: process.uptime() }),
    'fs.read': (p) => { need(p, ['path'], 'fs.read'); const f = resolvePath(p.path); const enc = p.encoding === 'base64' ? 'base64' : 'utf8'; const buf = fs.readFileSync(f); return { path: f, encoding: enc, size: buf.length, content: buf.toString(enc) }; },
    'fs.write': (p) => { need(p, ['path', 'content'], 'fs.write'); const f = resolvePath(p.path); if (p.mkdir) fs.mkdirSync(path.dirname(f), { recursive: true }); const enc = p.encoding === 'base64' ? 'base64' : 'utf8'; const buf = Buffer.from(String(p.content), enc); fs.writeFileSync(f, buf); return { path: f, bytesWritten: buf.length }; },
    'fs.append': (p) => { need(p, ['path', 'content'], 'fs.append'); const f = resolvePath(p.path); const enc = p.encoding === 'base64' ? 'base64' : 'utf8'; const buf = Buffer.from(String(p.content), enc); fs.appendFileSync(f, buf); return { path: f, bytesAppended: buf.length }; },
    'fs.list': (p) => { need(p, ['path'], 'fs.list'); const dir = resolvePath(p.path); const out = []; const walk = (d, depth) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const fp = path.join(d, e.name); const st = e.isDirectory() ? null : fs.statSync(fp); out.push({ name: e.name, path: fp, type: e.isDirectory() ? 'dir' : 'file', size: st ? st.size : undefined }); if (p.recursive && e.isDirectory() && depth < 6) walk(fp, depth + 1); } }; walk(dir, 0); return { path: dir, count: out.length, entries: out }; },
    'fs.stat': (p) => { need(p, ['path'], 'fs.stat'); const f = resolvePath(p.path); const st = fs.statSync(f); return { path: f, type: st.isDirectory() ? 'dir' : 'file', size: st.size, mtime: st.mtimeMs, ctime: st.ctimeMs }; },
    'fs.delete': (p) => { need(p, ['path'], 'fs.delete'); const f = resolvePath(p.path); fs.rmSync(f, { recursive: !!p.recursive, force: true }); return { path: f, deleted: true }; },
    'fs.move': (p) => { need(p, ['from', 'to'], 'fs.move'); const a = resolvePath(p.from), b = resolvePath(p.to); fs.mkdirSync(path.dirname(b), { recursive: true }); fs.renameSync(a, b); return { from: a, to: b, moved: true }; },
    'fs.copy': (p) => { need(p, ['from', 'to'], 'fs.copy'); const a = resolvePath(p.from), b = resolvePath(p.to); fs.mkdirSync(path.dirname(b), { recursive: true }); fs.cpSync(a, b, { recursive: !!p.recursive }); return { from: a, to: b, copied: true }; },
    'fs.mkdir': (p) => { need(p, ['path'], 'fs.mkdir'); const f = resolvePath(p.path); fs.mkdirSync(f, { recursive: true }); return { path: f, created: true }; },
    exec: (p) => { need(p, ['cmd'], 'exec'); return new Promise((resolve) => { const cwd = p.cwd ? resolvePath(p.cwd) : PROJ; const timeout = Number(p.timeout) || CFG.execTimeoutMs || 120000; const child = cp.spawn(p.cmd, { cwd, shell: true, windowsHide: true, env: process.env }); let out = '', err = '', timedOut = false; const to = setTimeout(() => { timedOut = true; try { child.kill('SIGKILL'); } catch (e) { } }, timeout); child.stdout.on('data', d => { out += d; if (out.length > 4e6) out = out.slice(-4e6); }); child.stderr.on('data', d => { err += d; if (err.length > 4e6) err = err.slice(-4e6); }); child.on('error', e => { clearTimeout(to); resolve({ cmd: p.cmd, cwd, code: -1, error: String(e.message), stdout: out, stderr: err }); }); child.on('close', code => { clearTimeout(to); resolve({ cmd: p.cmd, cwd, code, timedOut, stdout: out, stderr: err }); }); }); },
    'laya.list': async () => ({ tools: await laya.listTools() }),
    'laya.call': async (p) => { need(p, ['tool'], 'laya.call'); return { tool: p.tool, result: await laya.callTool(p.tool, p.args || {}) }; },
    'laya.state': async () => ({ result: await laya.callTool('ide-state', {}) }),
    'laya.build': async (p) => ({ result: await laya.callTool('ide-build', { platform: p.platform || 'web' }) }),
    'laya.find': async (p) => { need(p, ['keyword'], 'laya.find'); return { result: await laya.callTool('ide-find-assets', { keyword: p.keyword }) }; },
    'laya.open': async (p) => { need(p, ['id'], 'laya.open'); return { result: await laya.callTool('ide-open-scene', { id: p.id }) }; },
    'laya.eval': async (p) => { need(p, ['code'], 'laya.eval'); return { result: await laya.callTool('ide-ui-eval', { code: p.code }) }; },
    'codex.status': () => codex.status(),
    'codex.models': () => ({ models: codex.models() }),
    'codex.config.get': () => ({ config: codex.cfg() }),
    'codex.config.set': (p) => { need(p, ['patch'], 'codex.config.set'); return { config: codex.save(p.patch) }; },
    'codex.chat': (p) => { need(p, ['text'], 'codex.chat'); return codex.chat({ peer: p.peer || 'default', text: p.text, cwd: p.cwd, model: p.model, sandbox: p.sandbox, timeoutMs: p.timeoutMs, via: 'relay' }); },
    'codex.history': (p) => { need(p, ['peer'], 'codex.history'); return codex.history(p.peer, p.limit, p.since); },
    'codex.sessions': () => ({ sessions: codex.sessions() }),
    'codex.cancel': (p) => codex.cancel(p.peer),
    'codex.ideThreads': (p) => ({ threads: codex.ideThreads(p.limit) }),
    'codex.ideHistory': (p) => { need(p, ['threadId'], 'codex.ideHistory'); return codex.ideHistory(p.threadId, p.limit, p.since); },
    'codex.ideChat': (p) => { need(p, ['threadId', 'text'], 'codex.ideChat'); return codex.ideChat(p.threadId, p.text, { sandbox: p.sandbox, timeoutMs: p.timeoutMs }); },
    'codex.appStatus': async () => ({ running: appserver.isRunning(), started: appserver.started }),
    'codex.appThreads': async (p) => ({ result: await appserver.listThreads(p.limit) }),
    'codex.ideSend': async (p) => { need(p, ['threadId', 'text'], 'codex.ideSend'); try { const r = await appserver.resumeThread(p.threadId, true); const t = await appserver.startTurn(p.threadId, p.text); return { ok: true, mode: 'turn', resume: r, turn: t }; } catch (e) { if (/active writer/i.test(String(e.message))) { const q = await appserver.queueAdd(p.threadId, p.text); return { ok: true, mode: 'queued', queued: q, note: '线程正在 Codex 中运行，消息已排队，稍后会处理' }; } throw e; } },
    'codex.ideQueue': async (p) => { need(p, ['threadId', 'text'], 'codex.ideQueue'); const q = await appserver.queueAdd(p.threadId, p.text); return { ok: true, queued: q }; },
    'codex.convDelete': async (p) => { need(p, ['peer'], 'codex.convDelete'); const peer = String(p.peer); let threadId = ''; if (peer.startsWith('ide:')) threadId = peer.slice(4); else { const st = JSON.parse(fs.readFileSync(path.join(__dirname, 'codex-sessions.json'), 'utf8')).peers || {}; threadId = (st[peer] || {}).threadId || ''; } if (threadId) { try { await appserver.delete(threadId); } catch (e) { if (!/not found/i.test(String(e.message))) log('APPSERVER delete failed ' + e.message); } } const r = codex.deleteConversation(peer); return Object.assign({ ok: true, threadId }, r); },
    'codex.ideManage': async (p) => { need(p, ['threadId', 'op'], 'codex.ideManage'); const t = String(p.threadId); if (p.op === 'archive') return appserver.archive(t); if (p.op === 'unarchive') return appserver.unarchive(t); if (p.op === 'delete') return appserver.delete(t); if (p.op === 'rename') { need(p, ['name'], 'codex.ideManage'); return appserver.setName(t, p.name); } throw new Error('未知 op: ' + p.op); },
    'codex.ideSnapshot': async (p) => { const threads = codex.ideThreads(Number(p.limit) || 50); const since = Number(p.since) || 0; const changed = threads.filter(t => (t.updatedAt || 0) > since); const histories = []; for (const t of changed) { try { const h = await codex.ideHistory(t.id, 20); histories.push(h); } catch (e) { } } let active = null; if (p.activePeer && String(p.activePeer).startsWith('ide:')) { try { active = await codex.ideHistory(String(p.activePeer).slice(4), 20); } catch (e) { active = { error: String(e.message) }; } } return { threads, histories, active }; },
    'codex.bundle': () => { const files = ['chat/bridge.cjs','chat/plugin/weixin.cjs','chat/plugin/wechat.cjs','chat/public/chat.html','chat/public/qrcode.js','chat/public/codex.html','chat/config.example.json','chat/deploy/install-ecs.sh','chat/deploy/ecs-install-remote.sh','chat/deploy/nginx-codex.conf','chat/README.md','server/re/codex.js','server/re/appserver.js']; return { files: files.map(f => ({ path: f, b64: fs.readFileSync(path.resolve(PROJ, f)).toString('base64') })) }; }
};

function getToken(req, body) { return (body && body.token) || req.headers['x-re-token'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || new URL(req.url, 'http://x').searchParams.get('token') || ''; }
function timingSafeEq(a, b) { const ba = Buffer.from(String(a)), bb = Buffer.from(String(b)); if (ba.length !== bb.length) return false; return crypto.timingSafeEqual(ba, bb); }

const srv = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') { send(res, 204, {}); return; }
    if (req.method === 'GET') { send(res, 200, { ok: true, ...HELP }); return; }
    if (req.method !== 'POST') { fail(res, 405, '仅支持 GET(帮助)/POST(调用)'); return; }
    let raw = ''; let size = 0;
    req.on('data', d => { size += d.length; if (size > MAX_BODY) { req.destroy(); return; } raw += d; });
    req.on('end', async () => {
        let body = {}; try { body = raw ? JSON.parse(raw) : {}; } catch (e) { return fail(res, 400, '请求体不是合法 JSON: ' + e.message); }
        const tok = getToken(req, body);
        if (!timingSafeEq(tok, TOKEN)) { log('AUTH_FAIL', req.socket.remoteAddress, body.action); return fail(res, 401, 'token 缺失或错误(见 re/config.json), 请在 body.token 或 X-Re-Token 头携带'); }
        const action = body.action || 'help';
        const h = handlers[action];
        if (!h) { return fail(res, 400, '未知 action: ' + action, null); }
        const params = body; log('CALL', action, JSON.stringify(params).slice(0, 300));
        try { const result = await h(params); ok(res, result); }
        catch (e) { if (e.help) return fail(res, 400, e.message, e.action); log('ERR', action, String(e.message)); fail(res, 500, String(e.message || e), action); }
    });
});
srv.listen(PORT, '127.0.0.1', () => log('re-relay listening on 127.0.0.1:' + PORT + ' project=' + PROJ));
process.on('uncaughtException', e => log('UNCAUGHT', String(e && e.stack || e)));
process.on('unhandledRejection', e => log('UNHANDLED', String(e && e.stack || e)));
