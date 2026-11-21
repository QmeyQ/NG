'use strict';
// weixin.cjs - 腾讯官方 OpenClaw 微信通道(扫码直连, 无需 API Key)。
// 依据 @tencent-weixin/openclaw-weixin 2.4.10 的 iLink 协议独立实现:
//   get_bot_qrcode -> get_qrcode_status(长轮询) -> getupdates(长轮询) -> sendmessage
// 仅依赖 Node >=20 的 fetch, 不依赖 openclaw 运行时。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FIXED_BASE = 'https://ilinkai.weixin.qq.com';
const CHANNEL_VERSION = '2.4.10';
const APP_ID = 'bot';
const CLIENT_VERSION = ((2 & 255) << 16) | ((4 & 255) << 8) | 10;
const BOT_AGENT = 'Codex/1.0';
const DEFAULT_TIMEOUT = 20000;
const LONG_POLL_TIMEOUT = 35000;

function randomUin() {
    const n = crypto.randomBytes(4).readUInt32BE(0);
    return Buffer.from(String(n), 'utf8').toString('base64');
}
function headers(token) {
    const h = {
        'Content-Type': 'application/json',
        'iLink-App-Id': APP_ID,
        'iLink-App-ClientVersion': String(CLIENT_VERSION),
        'X-WECHAT-UIN': randomUin()
    };
    if (token) { h.AuthorizationType = 'ilink_bot_token'; h.Authorization = 'Bearer ' + token; }
    return h;
}
const baseInfo = () => ({ channel_version: CHANNEL_VERSION, bot_agent: BOT_AGENT });

async function request(baseUrl, endpoint, opts) {
    opts = opts || {};
    const url = baseUrl.replace(/\/+$/, '') + '/' + endpoint.replace(/^\/+/, '');
    const timeout = opts.timeoutMs || DEFAULT_TIMEOUT;
    const res = await fetch(url, {
        method: opts.method || 'GET',
        headers: headers(opts.token),
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(timeout)
    });
    const text = await res.text();
    if (!res.ok) throw new Error((opts.label || endpoint) + ' HTTP ' + res.status + ': ' + text.slice(0, 300));
    try { return JSON.parse(text); } catch (e) { throw new Error((opts.label || endpoint) + ' 非 JSON: ' + text.slice(0, 300)); }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function textOf(msg) {
    for (const it of msg.item_list || []) {
        if (it.type === 1 && it.text_item && it.text_item.text != null) return String(it.text_item.text);
        if (it.type === 3 && it.voice_item && it.voice_item.text) return String(it.voice_item.text);
    }
    return '';
}

class WeixinChannel {
    constructor(config, handlers) {
        this.cfg = Object.assign({ provider: 'ilink', botType: '3', stateFile: '', botAgent: BOT_AGENT }, config || {});
        this.handlers = handlers || {};
        this.log = this.handlers.log || (() => { });
        this.stateFile = this.cfg.stateFile || path.join(__dirname, '..', 'data', 'weixin.json');
        this.state = this.load();
        this.login = { status: this.state.token ? 'logged_in' : 'idle', qrcodeUrl: '', qrcode: '', accountId: this.state.accountId || '', userId: this.state.userId || '', error: '' };
        this.contextTokens = new Map();
        this.seen = new Map();
        this.monitorAbort = null;
        this.monitorRunning = false;
        this.loginPolling = false;
    }

    load() {
        try { return JSON.parse(fs.readFileSync(this.stateFile, 'utf8')); } catch (e) { return {}; }
    }
    save() {
        fs.mkdirSync(path.dirname(this.stateFile), { recursive: true });
        fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
    }

    status() {
        return {
            provider: 'ilink',
            configured: true,
            loggedIn: !!this.state.token && this.login.status === 'logged_in',
            accountId: this.state.accountId || '',
            userId: this.state.userId || '',
            baseUrl: this.state.baseUrl || FIXED_BASE,
            monitorRunning: this.monitorRunning,
            login: Object.assign({}, this.login)
        };
    }

    async start() {
        if (this.state.token) {
            this.login.status = 'logged_in';
            this.startMonitor();
            this.log('weixin: resumed session account=' + this.state.accountId);
            return { started: true, login: this.status() };
        }
        return { started: false, reason: 'not logged in, call /api/wechat/login' };
    }

    async startLogin() {
        const r = await request(FIXED_BASE, 'ilink/bot/get_bot_qrcode?bot_type=' + encodeURIComponent(this.cfg.botType || '3'), {
            method: 'POST', body: { local_token_list: [] }, label: 'get_bot_qrcode'
        });
        if (!r.qrcode || !r.qrcode_img_content) throw new Error('二维码响应缺少 qrcode/qrcode_img_content');
        this.login = { status: 'wait', qrcodeUrl: r.qrcode_img_content, qrcode: r.qrcode, accountId: '', userId: '', error: '' };
        this.log('weixin QR: ' + r.qrcode_img_content);
        this.pollLogin().catch(e => this.log('weixin login poll error: ' + e.message));
        return this.status();
    }

    async pollLogin() {
        if (this.loginPolling) return;
        this.loginPolling = true;
        try {
            let base = FIXED_BASE;
            let scans = 0;
            while (this.login.status === 'wait' || this.login.status === 'scaned' || this.login.status === 'need_verifycode') {
                let r;
                try {
                    r = await request(base, 'ilink/bot/get_qrcode_status?qrcode=' + encodeURIComponent(this.login.qrcode), { timeoutMs: LONG_POLL_TIMEOUT, label: 'get_qrcode_status' });
                } catch (e) {
                    if (/AbortError|timeout/i.test(e.message)) { await sleep(800); continue; }
                    this.login.status = 'error'; this.login.error = e.message; break;
                }
                const st = r.status;
                if (st === 'scaned') { this.login.status = 'scaned'; scans++; this.log('weixin QR scanned'); }
                else if (st === 'scaned_but_redirect') { if (r.redirect_host) base = 'https://' + r.redirect_host; this.login.status = 'scaned'; }
                else if (st === 'need_verifycode') { this.login.status = 'need_verifycode'; this.login.error = '需要在手机微信确认/输入验证码'; }
                else if (st === 'verify_code_blocked') { this.login.status = 'error'; this.login.error = '验证码多次错误, 请重新获取二维码'; break; }
                else if (st === 'expired') { this.login.status = 'expired'; this.login.error = '二维码已过期, 请重新获取'; break; }
                else if (st === 'binded_redirect') { this.login.status = 'error'; this.login.error = '该微信已连接过, 无需重复登录'; break; }
                else if (st === 'confirmed') {
                    if (!r.bot_token || !r.ilink_bot_id) { this.login.status = 'error'; this.login.error = '登录确认但缺少 bot_token/ilink_bot_id'; break; }
                    this.state = { token: r.bot_token, accountId: r.ilink_bot_id, userId: r.ilink_user_id || '', baseUrl: r.baseurl || base, savedAt: Date.now(), buf: '' };
                    this.save();
                    this.login = { status: 'logged_in', qrcodeUrl: '', qrcode: '', accountId: this.state.accountId, userId: this.state.userId, error: '' };
                    this.log('weixin login confirmed account=' + this.state.accountId);
                    this.startMonitor();
                    break;
                }
                await sleep(1000);
            }
        } finally { this.loginPolling = false; }
    }

    startMonitor() {
        if (this.monitorRunning || !this.state.token) return;
        this.monitorRunning = true;
        this.monitorAbort = new AbortController();
        this.monitor().catch(e => this.log('weixin monitor fatal: ' + e.message)).finally(() => { this.monitorRunning = false; });
    }

    async monitor() {
        let buf = this.state.buf || '';
        let failures = 0;
        const base = this.state.baseUrl || FIXED_BASE;
        while (!this.monitorAbort.signal.aborted) {
            try {
                const r = await request(base, 'ilink/bot/getupdates', { method: 'POST', token: this.state.token, body: { get_updates_buf: buf, base_info: baseInfo() }, timeoutMs: LONG_POLL_TIMEOUT, label: 'getupdates' });
                if ((r.ret && r.ret !== 0) || (r.errcode && r.errcode !== 0)) {
                    failures++;
                    if (r.errcode === -14 || r.ret === -14) { this.login.status = 'token_expired'; this.login.error = '登录态过期, 请重新扫码'; break; }
                    this.log('weixin getupdates ret=' + r.ret + ' errcode=' + r.errcode + ' ' + (r.errmsg || ''));
                    await sleep(failures >= 3 ? 30000 : 2000); if (failures >= 3) failures = 0;
                    continue;
                }
                failures = 0;
                if (r.get_updates_buf) { buf = r.get_updates_buf; this.state.buf = buf; this.save(); }
                for (const msg of r.msgs || []) {
                    const id = String(msg.message_id || msg.seq || Date.now());
                    if (this.seen.has(id)) continue;
                    this.seen.set(id, Date.now());
                    if (this.seen.size > 3000) { const first = this.seen.keys().next().value; this.seen.delete(first); }
                    const text = textOf(msg);
                    const from = msg.from_user_id || '';
                    if (!from || !text) continue;
                    if (msg.context_token) this.contextTokens.set(from, msg.context_token);
                    this.log('weixin inbound from=' + from + ' text=' + text.slice(0, 60));
                    if (this.handlers.onMessage) await this.handlers.onMessage({ id, from, text, contextToken: msg.context_token, raw: msg });
                }
            } catch (e) {
                if (this.monitorAbort.signal.aborted) break;
                failures++;
                this.log('weixin getupdates error: ' + e.message);
                await sleep(failures >= 3 ? 30000 : 2000); if (failures >= 3) failures = 0;
            }
        }
        this.log('weixin monitor stopped');
    }

    async sendText(to, text, contextToken) {
        if (!this.state.token) throw new Error('微信未登录, 请先扫码');
        if (!to) throw new Error('发送目标为空');
        const ctx = contextToken || this.contextTokens.get(to) || '';
        const out = [];
        for (let i = 0; i < text.length; i += 2000) {
            const chunk = text.slice(i, i + 2000);
            const body = {
                msg: {
                    from_user_id: '', to_user_id: to,
                    client_id: 'codex-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex'),
                    message_type: 2, message_state: 2,
                    item_list: [{ type: 1, text_item: { text: chunk } }],
                    context_token: ctx || undefined
                },
                base_info: baseInfo()
            };
            const r = await request(this.state.baseUrl || FIXED_BASE, 'ilink/bot/sendmessage', { method: 'POST', token: this.state.token, body, label: 'sendmessage' });
            if (r.ret && r.ret !== 0) throw new Error('sendmessage ret=' + r.ret + ' ' + (r.errmsg || ''));
            out.push(r);
        }
        return { parts: out.length, results: out };
    }

    async sendImage() { throw new Error('iLink 图片发送暂未实现, 先发文本'); }

    async contacts() { return { friends: [], chatrooms: [] }; }

    stop() {
        if (this.monitorAbort) this.monitorAbort.abort();
        this.monitorAbort = null;
        this.monitorRunning = false;
    }
}

module.exports = { WeixinChannel, FIXED_BASE };
