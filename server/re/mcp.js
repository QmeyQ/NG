'use strict';
// mcp.js - LayaAir IDE MCP 客户端(SSE + JSON-RPC), 供 relay 调用以全权接管 IDE。
// 复用 local/layamcp.cjs 的协议: GET /ai/mcp 拿 endpoint, POST endpoint 发 JSON-RPC。
class LayaMcp {
    constructor(base) { this.base = base || 'http://127.0.0.1:18090'; this.endpoint = null; this.idc = 0; this.pending = new Map(); this.ctrl = null; this.ready = null; }
    async connect() {
        if (this.endpoint && this.ready) return this.ready;
        this.ready = (async () => {
            this.ctrl = new AbortController();
            const res = await fetch(this.base + '/ai/mcp', { signal: this.ctrl.signal, headers: { Accept: 'text/event-stream' } });
            if (!res.ok) throw new Error('MCP SSE ' + res.status);
            const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
            await new Promise((resolve, reject) => {
                const to = setTimeout(() => reject(new Error('MCP endpoint timeout')), 10000);
                (async () => {
                    for (;;) {
                        const { done, value } = await reader.read(); if (done) break;
                        buf += dec.decode(value, { stream: true }); let idx;
                        while ((idx = buf.indexOf('\n\n')) >= 0) {
                            const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
                            let ev = 'message', data = '';
                            for (const line of chunk.split('\n')) { if (line.startsWith('event:')) ev = line.slice(6).trim(); else if (line.startsWith('data:')) data += line.slice(5).trim(); }
                            if (ev === 'endpoint' || (data && data.includes('sessionId'))) { this.endpoint = data.startsWith('http') ? data : this.base + data; clearTimeout(to); resolve(); }
                            else if (ev === 'message' && data) { try { const m = JSON.parse(data); const p = this.pending.get(m.id); if (p) { this.pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } } catch (e) { } }
                        }
                    }
                })().catch(reject);
            });
            await this.rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 're-relay', version: '1.0' } });
            await fetch(this.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) });
        })();
        this.ready.catch(() => { this.endpoint = null; this.ready = null; });
        return this.ready;
    }
    rpc(method, params) {
        const id = ++this.idc;
        return new Promise((resolve, reject) => {
            const to = setTimeout(() => { this.pending.delete(id); reject(new Error(method + ' timeout')); }, 120000);
            this.pending.set(id, { resolve: v => { clearTimeout(to); resolve(v); }, reject: e => { clearTimeout(to); reject(e); } });
            fetch(this.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }) })
                .then(r => { if (!r.ok && r.status !== 202) throw new Error('MCP POST ' + r.status); })
                .catch(e => { clearTimeout(to); this.pending.delete(id); reject(e); });
        });
    }
    async _retry(fn) { try { await this.connect(); return await fn(); } catch (e) { this.disconnect(); await this.connect(); return await fn(); } }
    async listTools() { return this._retry(async () => { const r = await this.rpc('tools/list', {}); return r.tools || []; }); }
    async callTool(name, args) { return this._retry(() => this.rpc('tools/call', { name, arguments: args || {} })); }
    disconnect() { try { if (this.ctrl) this.ctrl.abort(); } catch (e) { } this.endpoint = null; this.ready = null; }
}
module.exports = { LayaMcp };
