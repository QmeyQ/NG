'use strict';
// mock-proxy.cjs - 本地模拟"苍何"微信代理服务, 用于离线验证 openclaw-wechat 协议链路。
// 支持: /v1/iPadLogin /v1/getIPadLoginInfo /v1/account/status /v1/sendText /v1/sendImage2 /v1/getAddressList /v1/webhook/register
const http = require('http');
const PORT = Number(process.argv[2] || process.env.MOCK_PROXY_PORT || 18990);
const state = { loginChecks: 0, loggedIn: true, webhooks: [], messages: [], wcId: 'wxid_bot', nickName: 'CodexBot' };

function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); }
function body(req) { return new Promise(r => { let s = ''; req.on('data', d => s += d); req.on('end', () => { try { r(JSON.parse(s || '{}')); } catch (e) { r({}); } }); }); }

const srv = http.createServer(async (req, res) => {
    const p = (req.url || '').split('?')[0];
    if (req.method === 'GET' && p === '/health') return json(res, 200, { ok: true, port: PORT });
    if (req.method === 'GET' && p === '/__mock/state') return json(res, 200, { ok: true, state });
    if (req.method === 'POST' && p === '/__mock/reset') { state.loginChecks = 0; state.loggedIn = true; state.webhooks = []; state.messages = []; return json(res, 200, { ok: true, state }); }
    if (req.method === 'POST' && p === '/__mock/login') { state.loggedIn = true; return json(res, 200, { ok: true }); }
    if (req.method === 'GET' && p === '/qr') {
        res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
        res.end('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#fff"/><g fill="#111">' + Array.from({ length: 64 }, (_, i) => `<rect x="${(i % 8) * 28 + 8}" y="${Math.floor(i / 8) * 28 + 8}" width="22" height="22" opacity="${i % 3 ? 1 : 0.15}"/>`).join('') + '</g><text x="120" y="232" font-size="12" text-anchor="middle" fill="#555">MOCK WECHAT QR</text></svg>');
        return;
    }
    if (req.method === 'POST' && p.startsWith('/v1/')) {
        const b = await body(req);
        const key = req.headers['x-api-key'] || '';
        if (!key) return json(res, 401, { error: 'missing X-API-Key' });
        if (p === '/v1/account/status') return json(res, 200, { code: '1000', data: { valid: true, wcId: state.loggedIn ? state.wcId : '', isLoggedIn: state.loggedIn, nickName: state.loggedIn ? state.nickName : '', tier: 'mock', quota: { maxMessagesPerDay: 99999, usedToday: 0 } } });
        if (p === '/v1/iPadLogin') return json(res, 200, { code: '1000', data: { wId: 'mock-wid-1', qrCodeUrl: 'http://127.0.0.1:' + PORT + '/qr' } });
        if (p === '/v1/getIPadLoginInfo') {
            state.loginChecks++;
            if (!state.loggedIn) return json(res, 200, { code: '1000', data: { status: 'waiting' } });
            return json(res, 200, { code: '1000', data: { status: 'logged_in', wcId: state.wcId, nickName: state.nickName, headUrl: '' } });
        }
        if (p === '/v1/webhook/register') { state.webhooks.push(b); return json(res, 200, { code: '1000', data: { ok: true } }); }
        if (p === '/v1/sendText') { state.messages.push({ at: Date.now(), to: b.wcId, text: b.content }); return json(res, 200, { code: '1000', data: { msgId: state.messages.length, newMsgId: 1000 + state.messages.length, createTime: Math.floor(Date.now() / 1000) } }); }
        if (p === '/v1/sendImage2') { state.messages.push({ at: Date.now(), to: b.wcId, image: b.imageUrl }); return json(res, 200, { code: '1000', data: { msgId: state.messages.length, newMsgId: 2000 + state.messages.length, createTime: Math.floor(Date.now() / 1000) } }); }
        if (p === '/v1/getAddressList') return json(res, 200, { code: '1000', data: { friends: ['wxid_test'], chatrooms: ['room_test'] } });
        return json(res, 200, { code: '1000', data: { mock: true, path: p, body: b } });
    }
    json(res, 404, { error: 'not found' });
});
srv.listen(PORT, '127.0.0.1', () => console.log('mock-proxy listening on ' + PORT));
