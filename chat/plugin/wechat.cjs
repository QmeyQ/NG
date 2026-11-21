'use strict';
// wechat.cjs - 从 OpenClaw 插件 @canghe/openclaw-wechat 提取的微信通道(独立版)。
// 保留龙虾(OpenClaw)同款协议: 苍何 Proxy API + 60001/80001 webhook 负载 + 同一套登录/发送接口。
// 去掉了 openclaw/plugin-sdk 依赖, 供 Codex 远程同步桥使用。
const http = require('http');

class ProxyClient {
    constructor(config) {
        config = config || {};
        this.apiKey = config.apiKey || '';
        this.accountId = config.accountId || 'default';
        if (!config.baseUrl) throw new Error('proxyUrl is required (OpenClaw 微信代理服务地址)');
        this.baseUrl = String(config.baseUrl).replace(/\/+$/, '');
    }

    async request(endpoint, data) {
        const url = this.baseUrl + endpoint;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey,
                'X-Account-ID': this.accountId
            },
            body: data ? JSON.stringify(data) : undefined,
            signal: AbortSignal.timeout(30000)
        });
        const text = await res.text();
        let result; try { result = JSON.parse(text); } catch (e) { result = { error: 'HTTP ' + res.status + ': ' + text.slice(0, 200) }; }
        if (!res.ok) throw new Error(result.error || result.message || ('Request failed: ' + res.status));
        if (result.code === '1000' || result.code === '1001' || result.code === '1002') return result.data || result;
        if (result.code && result.code !== '1000') throw new Error(result.message || ('Error: ' + result.code));
        return result;
    }

    async getStatus() {
        const r = await this.request('/v1/account/status');
        return {
            valid: r.valid !== false,
            wcId: r.wcId,
            isLoggedIn: r.isLoggedIn === true,
            nickName: r.nickName,
            tier: r.tier,
            quota: r.quota,
            error: r.error
        };
    }

    async getQRCode(deviceType, proxy) {
        const r = await this.request('/v1/iPadLogin', { deviceType: deviceType || 'ipad', proxy: proxy || '2' });
        return { wId: r.wId, qrCodeUrl: r.qrCodeUrl };
    }

    async checkLogin(wId) {
        const r = await this.request('/v1/getIPadLoginInfo', { wId });
        if (r.status === 'logged_in') return { status: 'logged_in', wcId: r.wcId, nickName: r.nickName, headUrl: r.headUrl };
        if (r.status === 'need_verify') return { status: 'need_verify', verifyUrl: r.verifyUrl };
        return { status: 'waiting' };
    }

    async sendText(wcId, content) {
        const r = await this.request('/v1/sendText', { wcId, content });
        return { msgId: r.msgId, newMsgId: r.newMsgId, createTime: r.createTime };
    }

    async sendImage(wcId, imageUrl) {
        const r = await this.request('/v1/sendImage2', { wcId, imageUrl });
        return { msgId: r.msgId, newMsgId: r.newMsgId, createTime: r.createTime };
    }

    async getContacts(wcId) {
        const r = await this.request('/v1/getAddressList', { wcId });
        return { friends: r.friends || [], chatrooms: r.chatrooms || [] };
    }

    async registerWebhook(webhookUrl, wcId) {
        await this.request('/v1/webhook/register', { webhookUrl, wcId });
    }
}

const TYPE_MAP = {
    '60001': 'text', '80001': 'text',
    '60002': 'image', '80002': 'image',
    '60003': 'video', '80003': 'video',
    '60004': 'voice', '80004': 'voice',
    '60008': 'file', '80008': 'file'
};

function normalizePayload(payload) {
    const messageType = String(payload.messageType || '');
    const wcId = payload.wcId || '';
    const flat = !!payload.fromUser;
    const data = flat ? payload : (payload.data || {});
    return {
        messageType,
        wcId,
        fromUser: data.fromUser || '',
        toUser: data.toUser || '',
        fromGroup: data.fromGroup || '',
        content: data.content != null ? String(data.content) : '',
        newMsgId: data.newMsgId != null ? data.newMsgId : payload.newMsgId,
        timestamp: Number(data.timestamp || payload.timestamp || Date.now()),
        contentType: data.contentType,
        raw: payload
    };
}

function toMessageContext(payload) {
    const type = String(payload.messageType || '');
    if (type === '30000') return { type: 'offline', wcId: payload.wcId, content: payload.content || (payload.data && payload.data.content) || '' };
    if (!TYPE_MAP[type]) return null;
    const n = normalizePayload(payload);
    if (!n.fromUser) return null;
    const isGroup = type.startsWith('8');
    const msg = {
        id: String(n.newMsgId || n.timestamp || Date.now()),
        type: TYPE_MAP[type],
        sender: { id: n.fromUser, name: n.fromUser },
        recipient: { id: n.wcId },
        content: n.content,
        timestamp: n.timestamp,
        threadId: isGroup ? (n.fromGroup || n.fromUser) : n.fromUser,
        raw: n.raw
    };
    if (isGroup && n.fromGroup) msg.group = { id: n.fromGroup, name: '' };
    return msg;
}

function createDedupe(maxSize, windowMs) {
    const seen = new Map();
    const max = maxSize || 2000;
    const win = windowMs || 30 * 60 * 1000;
    return function seenBefore(id) {
        const now = Date.now();
        for (const [k, t] of seen) if (now - t > win) seen.delete(k);
        if (seen.has(id)) return true;
        if (seen.size >= max) { const first = seen.keys().next().value; if (first) seen.delete(first); }
        seen.set(id, now);
        return false;
    };
}

function chunkText(text, limit) {
    const max = limit || 2000;
    const s = String(text || '');
    if (s.length <= max) return [s];
    const out = [];
    for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max));
    return out;
}

function startWebhookServer(opts) {
    const port = Number(opts.port || 18790);
    const route = opts.path || '/webhook/wechat';
    const server = http.createServer((req, res) => {
        const url = (req.url || '').split('?')[0];
        if (url !== route || req.method !== 'POST') { res.writeHead(404).end('Not Found'); return; }
        let body = '';
        req.on('data', d => { body += d; if (body.length > 2e6) req.destroy(); });
        req.on('end', () => {
            let payload; try { payload = JSON.parse(body || '{}'); } catch (e) { res.writeHead(400).end('Bad Request'); return; }
            try { opts.onPayload(payload); } catch (e) { opts.log && opts.log('webhook handler error', String(e)); }
            res.writeHead(200, { 'Content-Type': 'text/plain' }).end('OK');
        });
    });
    return new Promise((resolve, reject) => {
        server.on('error', reject);
        server.listen(port, '0.0.0.0', () => {
            opts.log && opts.log('wechat webhook listening on 0.0.0.0:' + port + route);
            resolve({ port, server, stop: () => server.close() });
        });
    });
}

class WeChatChannel {
    constructor(config, handlers) {
        this.cfg = Object.assign({ enabled: false, deviceType: 'ipad', proxy: '2', webhookPort: 18790, webhookPath: '/webhook/wechat', accountId: 'default' }, config || {});
        this.handlers = handlers || {};
        this.client = null;
        this.login = { status: 'idle', qrCodeUrl: '', wId: '', wcId: '', nickName: '', error: '' };
        this.webhook = null;
        this.dedupe = createDedupe();
        this.log = this.handlers.log || (() => { });
        if (this.cfg.proxyUrl && this.cfg.apiKey) this.client = new ProxyClient({ apiKey: this.cfg.apiKey, accountId: this.cfg.accountId, baseUrl: this.cfg.proxyUrl });
    }

    status() {
        return {
            enabled: !!this.cfg.enabled,
            configured: !!(this.cfg.proxyUrl && this.cfg.apiKey),
            proxyUrl: this.cfg.proxyUrl || '',
            accountId: this.cfg.accountId,
            webhookPort: this.cfg.webhookPort,
            webhookPath: this.cfg.webhookPath,
            webhookHost: this.cfg.webhookHost || '',
            loggedIn: this.login.status === 'logged_in',
            login: Object.assign({}, this.login)
        };
    }

    async start() {
        if (!this.cfg.enabled) return { started: false, reason: 'wechat disabled' };
        if (!this.client) throw new Error('微信未配置: 需要 apiKey + proxyUrl');
        let loggedIn = false;
        try {
            const st = await this.client.getStatus();
            if (st.isLoggedIn && st.wcId) {
                this.login = { status: 'logged_in', qrCodeUrl: '', wId: '', wcId: st.wcId, nickName: st.nickName || '', error: '' };
                loggedIn = true;
            }
        } catch (e) { this.log('wechat status failed:', String(e.message)); }
        if (!loggedIn) {
            const qr = await this.client.getQRCode(this.cfg.deviceType, this.cfg.proxy);
            this.login = { status: 'waiting', qrCodeUrl: qr.qrCodeUrl, wId: qr.wId, wcId: '', nickName: '', error: '' };
            this.log('wechat QR login required:', qr.qrCodeUrl);
        }
        await this.ensureWebhook();
        return { started: true, login: this.status() };
    }

    async ensureWebhook() {
        if (this.webhook) return this.webhook;
        this.webhook = await startWebhookServer({
            port: this.cfg.webhookPort,
            path: this.cfg.webhookPath,
            log: this.log,
            onPayload: (payload) => this.onPayload(payload)
        });
        if (this.login.status === 'logged_in') await this.register();
        return this.webhook;
    }

    async register() {
        if (!this.client || this.login.status !== 'logged_in') return { registered: false };
        const host = this.cfg.webhookHost || '127.0.0.1';
        const base = /^https?:\/\//i.test(host) ? host.replace(/\/+$/, '') : ('http://' + host + ':' + this.cfg.webhookPort);
        const url = base + this.cfg.webhookPath;
        await this.client.registerWebhook(url, this.login.wcId);
        this.log('wechat webhook registered:', url);
        return { registered: true, url };
    }

    async startLogin() {
        if (!this.client) throw new Error('微信未配置: 需要 apiKey + proxyUrl');
        const qr = await this.client.getQRCode(this.cfg.deviceType, this.cfg.proxy);
        this.login = { status: 'waiting', qrCodeUrl: qr.qrCodeUrl, wId: qr.wId, wcId: '', nickName: '', error: '' };
        await this.ensureWebhook();
        this.pollLogin().catch(e => this.log('login poll error', String(e)));
        return this.status();
    }

    async pollLogin() {
        const wId = this.login.wId;
        for (let i = 0; i < 120; i++) {
            await new Promise(r => setTimeout(r, 3000));
            if (this.login.wId !== wId) return;
            try {
                const st = await this.client.checkLogin(wId);
                if (st.status === 'logged_in') {
                    this.login = { status: 'logged_in', qrCodeUrl: '', wId, wcId: st.wcId, nickName: st.nickName || '', error: '' };
                    await this.register();
                    return;
                }
                if (st.status === 'need_verify') {
                    this.login.status = 'need_verify';
                    this.login.verifyUrl = st.verifyUrl;
                }
            } catch (e) { this.log('checkLogin failed', String(e.message)); }
        }
        this.login.status = 'expired';
        this.login.error = 'QR code login timeout';
    }

    async onPayload(payload) {
        const msg = toMessageContext(payload);
        if (!msg) return;
        if (msg.type === 'offline') { this.log('wechat offline:', msg.content); return; }
        if (this.dedupe(msg.id)) return;
        if (msg.type !== 'text') { this.log('wechat ignore non-text:', msg.type); return; }
        if (this.handlers.onMessage) await this.handlers.onMessage(msg);
    }

    async sendText(to, text) {
        if (!this.client) throw new Error('微信未连接');
        if (!to) throw new Error('发送目标为空');
        const parts = chunkText(text, 2000);
        const out = [];
        for (const part of parts) out.push(await this.client.sendText(to, part));
        return { parts: out.length, results: out };
    }

    async sendImage(to, imageUrl) {
        if (!this.client) throw new Error('微信未连接');
        return this.client.sendImage(to, imageUrl);
    }

    async contacts() {
        if (!this.client || this.login.status !== 'logged_in') throw new Error('微信未登录');
        return this.client.getContacts(this.login.wcId);
    }

    stop() { if (this.webhook) this.webhook.stop(); this.webhook = null; }
}

module.exports = { ProxyClient, WeChatChannel, toMessageContext, normalizePayload, createDedupe, chunkText, startWebhookServer };
