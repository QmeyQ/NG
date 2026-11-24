'use strict';
// appserver.js - Codex app-server JSON-RPC(stdio) client.
// 用途: 直接操作 Codex IDE/Desktop 线程(resume/turn/start/queue), 并接收通知。
const cp = require('child_process');
const path = require('path');
const fs = require('fs');

class AppServerClient {
    constructor(opts) {
        opts = opts || {};
        this.log = opts.log || (() => {});
        this.bin = opts.bin || '';
        this.child = null;
        this.buf = '';
        this.id = 0;
        this.pending = new Map();
        this.notificationHandlers = [];
        this.started = false;
        this.starting = null;
    }

    isRunning() { return !!this.child && !this.child.killed; }

    async start() {
        if (this.isRunning()) return true;
        if (this.starting) return this.starting;
        this.starting = (async () => {
            // 每次启动都重新解析 bin: WindowsApps 的 codex.exe 会随版本更新失效(EFTYPE), 不能缓存旧路径
            const bin = this.resolveBin();
            if (!bin) throw new Error('未找到 codex CLI');
            this.child = cp.spawn(bin, ['app-server', '--stdio'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
            this.child.on('error', e => { this.log('appserver spawn error ' + (e && e.code) + ' ' + (e && e.message)); this.child = null; this.started = false; });
            this.child.stdout.on('data', d => this.onStdout(d));
            this.child.stderr.on('data', d => { const s = d.toString(); if (s.trim()) this.log('appserver stderr: ' + s.slice(0, 300)); });
            this.child.on('close', code => { this.log('appserver exited code=' + code); this.child = null; this.started = false; });
            const init = await this.request('initialize', { clientInfo: { name: 'chat-bridge', version: '1.0' }, capabilities: { experimentalApi: true } }, 20000);
            this.started = true;
            return init;
        })();
        try { return await this.starting; } finally { this.starting = null; }
    }

    resolveBin(force) {
        if (!force && this._binCache && Date.now() - (this._binAt || 0) < 60000) return this._binCache;
        const bin = this._resolveBinUncached();
        this._binCache = bin; this._binAt = Date.now();
        return bin;
    }
    _resolveBinUncached() {
        const cands = [];
        if (process.env.CODEX_CLI_PATH) cands.push(process.env.CODEX_CLI_PATH);
        try { const out = cp.execFileSync('where', ['codex'], { encoding: 'utf8', windowsHide: true }); out.split(/\r?\n/).filter(Boolean).forEach(x => cands.push(x.trim())); } catch (e) { }
        const base = 'C:\\Program Files\\WindowsApps';
        try { fs.readdirSync(base).filter(n => /^OpenAI\.Codex_/.test(n)).forEach(n => cands.push(path.join(base, n, 'app', 'resources', 'codex.exe'))); } catch (e) { }
        for (const x of cands) { if (x && /\.exe$/i.test(x) && fs.existsSync(x)) return x; }
        for (const x of cands) { if (x && fs.existsSync(x) && fs.statSync(x).isFile()) return x; }
        return '';
    }

    onStdout(d) {
        this.buf += d.toString('utf8');
        const lines = this.buf.split(/\r?\n/);
        this.buf = lines.pop();
        for (const line of lines) {
            const s = line.trim();
            if (!s) continue;
            let m; try { m = JSON.parse(s); } catch (e) { continue; }
            if (m.id && this.pending.has(m.id)) { const p = this.pending.get(m.id); this.pending.delete(m.id); p.resolve(m); }
            else if (m.method) { for (const h of this.notificationHandlers) { try { h(m); } catch (e) { this.log('notification handler error: ' + e.message); } } }
        }
    }

    onNotification(fn) { if (typeof fn === 'function') this.notificationHandlers.push(fn); }

    request(method, params, timeoutMs) {
        if (!this.isRunning()) { const e = new Error('app-server 未运行(可能 codex 版本已更新, 将自动重连)'); e.code = 'EAPPDEAD'; throw e; }
        const id = ++this.id;
        const msg = { jsonrpc: '2.0', id, method, params: params || {} };
        this.child.stdin.write(JSON.stringify(msg) + '\n');
        return new Promise((resolve, reject) => {
            const to = setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('timeout ' + method)); } }, timeoutMs || 60000);
            this.pending.set(id, { resolve: (m) => { clearTimeout(to); if (m.error) { const e = new Error(m.error.message || ('app-server error ' + m.error.code)); e.code = m.error.code; reject(e); } else resolve(m.result); } });
        });
    }

    async listThreads(limit) { await this.start(); return this.request('thread/list', { limit: Number(limit) || 20 }, 30000); }
    async resumeThread(threadId, excludeTurns) { await this.start(); return this.request('thread/resume', { threadId, excludeTurns: excludeTurns !== false }, 30000); }
    async startTurn(threadId, text) { await this.start(); return this.request('turn/start', { threadId, input: [{ type: 'text', text: String(text || '') }] }, 600000); }
    async queueAdd(threadId, text) { await this.start(); return this.request('thread/queue/add', { threadId, clientUserMessageId: 'chat-' + Date.now(), input: [{ type: 'text', text: String(text || '') }] }, 30000); }
    async queueStart(threadId) { await this.start(); return this.request('thread/queue/start', { threadId }, 30000); }
    async readThread(threadId) { await this.start(); return this.request('thread/read', { threadId, includeTurns: false }, 30000); }
    async turnsList(threadId, limit) { await this.start(); return this.request('thread/turns/list', { threadId, limit: Number(limit) || 20, sortDirection: 'desc' }, 30000); }
    async archive(threadId) { await this.start(); return this.request('thread/archive', { threadId }, 30000); }
    async unarchive(threadId) { await this.start(); return this.request('thread/unarchive', { threadId }, 30000); }
    async delete(threadId) { await this.start(); return this.request('thread/delete', { threadId }, 30000); }
    async setName(threadId, name) { await this.start(); return this.request('thread/name/set', { threadId, name: String(name || '') }, 30000); }
    async queueList(threadId) { await this.start(); return this.request('thread/queue/list', { threadId }, 30000); }
    async queueDelete(threadId, queuedSubmissionId) { await this.start(); return this.request('thread/queue/delete', { threadId, queuedSubmissionId }, 30000); }
    async unsubscribe(threadId) { await this.start(); return this.request('thread/unsubscribe', { threadId }, 30000); }
    async itemsList(threadId, limit) { await this.start(); return this.request('thread/items/list', { threadId, limit: Number(limit) || 50, sortDirection: 'desc' }, 30000); }
    async itemsRead(threadId) { await this.start(); return this.request('thread/items/read', { threadId }, 30000); }
    close() { if (this.child) { try { this.child.kill(); } catch (e) { } this.child = null; } }
}

module.exports = { AppServerClient };


