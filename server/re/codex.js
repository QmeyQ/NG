'use strict';
// codex.js - Codex CLI 远程会话桥: 在指定工作目录以指定模型执行 codex exec, 支持按 peer 续聊。
// 被 re/server.js (codex.* actions) 与 chat/bridge.cjs 共用; 无第三方依赖。
const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');
const readline = require('readline');

const DEFAULT_MODELS = ['auto', 'qwen4-max-preview', 'qwen3.8-max', 'qwen3.8-flash', 'qwen3.7-max', 'qwen3.7-plus', 'glm-5.3', 'deepseek-v4-pro'];

function readJson(file, fallback) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}
function writeJson(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}
function tail(list, n) { return list.length > n ? list.slice(-n) : list; }

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

    models() {
        const out = [];
        const seen = new Set();
        const add = (slug, label, desc) => {
            if (!slug || seen.has(slug)) return;
            seen.add(slug); out.push({ slug, label: label || slug, desc: desc || '' });
        };
        const cat = readJson(path.join(os.homedir(), '.codex', 'model-catalog.local.json'), null);
        if (cat && Array.isArray(cat.models)) {
            cat.models.slice().sort((a, b) => (a.priority || 999) - (b.priority || 999))
                .forEach(m => add(m.slug, m.display_name, m.description));
        }
        DEFAULT_MODELS.forEach(m => add(m));
        return out;
    }

    status() {
        const c = this.cfg();
        let version = '';
        try { version = cp.execFileSync(this.resolveBin(), ['--version'], { encoding: 'utf8', windowsHide: true, timeout: 8000 }).trim(); } catch (e) { }
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

    history(peer, limit) {
        const s = readJson(this.sessionsPath, { peers: {} });
        const v = (s.peers || {})[peer];
        return { peer, threadId: v && v.threadId || '', cwd: v && v.cwd || '', model: v && v.model || '', messages: tail((v && v.messages) || [], limit || 200) };
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
            const model = opts.model || c.model;
            const sandbox = opts.sandbox || c.sandbox || 'workspace-write';
            const timeoutMs = Number(opts.timeoutMs || c.timeoutMs || 600000);
            const session = readJson(this.sessionsPath, { peers: {} }).peers?.[peer] || {};
            const useResume = opts.resume !== false && !!session.threadId && (!session.cwd || session.cwd === cwd);

            this.append(peer, 'user', text, { via: opts.via || 'api' });

            if (process.env.CODEX_MOCK === '1') {
                const reply = '[mock] ' + text;
                this.append(peer, 'assistant', reply, { model, mock: true });
                return { ok: true, peer, cwd, model, threadId: session.threadId || 'mock-thread', text: reply, events: 0, ms: 0, mock: true };
            }

            const bin = this.resolveBin();
            if (!bin) throw new Error('未找到 codex CLI。请安装 Codex 或在配置中填写 bin 路径。');
            fs.mkdirSync(cwd, { recursive: true });
            const args = ['exec', '--json', '--skip-git-repo-check', '-s', sandbox, '-m', model];
            if (useResume) { args.push('resume', session.threadId, text); }
            else { args.push(text); }

            const started = Date.now();
            const res = await new Promise((resolve) => {
                const child = cp.spawn(bin, args, { cwd, windowsHide: true, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
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
            const outText = (res.text || '').trim() || (res.error ? ('[codex error] ' + res.error + (res.stderr ? '\n' + res.stderr.slice(-800) : '')) : '');
            const threadId = res.threadId || session.threadId || '';
            this.store(peer, {
                threadId, cwd, model,
                updatedAt: Date.now(),
                messages: ((readJson(this.sessionsPath, { peers: {} }).peers?.[peer] || {}).messages) || []
            });
            this.append(peer, 'assistant', outText, { model, ms, threadId, code: res.code });
            this.log('codex.chat', peer, 'code=' + res.code, 'ms=' + ms, 'thread=' + threadId, 'chars=' + outText.length);
            return { ok: res.code === 0, peer, cwd, model, threadId, text: outText, events: res.events, usage: res.usage, ms, code: res.code, error: res.error || '' };
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

    async ideHistory(threadId, limit) {
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
        return { peer: 'ide:' + meta.id, threadId: meta.id, title: meta.title, cwd: meta.cwd, model: meta.model, modelProvider: meta.modelProvider, project: meta.project, messages: msgs.slice(-(Number(limit) || 200)) };
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

