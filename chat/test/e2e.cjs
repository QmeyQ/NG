'use strict';
// e2e.cjs - 离线端到端: mock 微信代理 + Codex 桥(mock 模型) + Web/配置页截图。
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const assert = require('assert');
const ROOT = path.resolve(__dirname, '..', '..');
const NODE = process.execPath;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEST = __dirname;
const CFG = path.join(TEST, 'e2e-config.json');
const PORT = 18991, PROXY = 18990, TOKEN = 'test-token';
let pass = 0, fail = 0;
function ok(cond, name, extra) { if (cond) { pass++; console.log('  PASS ' + name); } else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function req(url, opts) {
    const r = await fetch(url, opts); const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { raw: t }; }
    return { status: r.status, ok: r.ok, json: j };
}
async function api(p, body, method) {
    const r = await req('http://127.0.0.1:' + PORT + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', 'X-Cx-Token': TOKEN }, body: body ? JSON.stringify(body) : undefined });
    return r;
}
function writeConfig() {
    const cfg = {
        port: PORT, host: '127.0.0.1', token: TOKEN, mode: 'local',
        relay: { url: 'https://normalgame.cn/apim', token: '' },
        codex: { bin: '', sessionsPath: path.join(TEST, 'e2e-sessions.json'), cwd: ROOT, model: 'qwen4-max-preview', sandbox: 'read-only', timeoutMs: 30000 },
        wechat: { enabled: true, apiKey: 'wc_test_key', proxyUrl: 'http://127.0.0.1:' + PROXY, accountId: 'default', deviceType: 'ipad', proxy: '2', webhookHost: '127.0.0.1', webhookPort: 18791, webhookPath: '/webhook/wechat' },
        ecs: { regionId: 'cn-shenzhen', instanceId: 'i-test' }
    };
    fs.writeFileSync(CFG, JSON.stringify(cfg, null, 2));
}
async function waitFor(fn, timeout, label) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) { try { if (await fn()) return true; } catch (e) { } await sleep(300); }
    throw new Error('timeout: ' + label);
}
(async () => {
    console.log('== Codex chat bridge E2E ==');
    try { fs.unlinkSync(path.join(TEST, 'e2e-sessions.json')); } catch (e) { }
    writeConfig();
    for (const f of ['ui-chat.png', 'ui-codex.png']) try { fs.unlinkSync(path.join(TEST, f)); } catch (e) { }
    const proxy = cp.spawn(NODE, [path.join(ROOT, 'chat', 'mock-proxy.cjs'), String(PROXY)], { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let proxyLog = ''; proxy.stdout.on('data', d => proxyLog += d); proxy.stderr.on('data', d => proxyLog += d);
    await waitFor(async () => (await req('http://127.0.0.1:' + PROXY + '/health')).ok, 8000, 'mock proxy');

    const bridge = cp.spawn(NODE, [path.join(ROOT, 'chat', 'bridge.cjs')], { cwd: ROOT, windowsHide: true, env: Object.assign({}, process.env, { CX_CONFIG: CFG, CX_PORT: String(PORT), CODEX_MOCK: '1' }), stdio: ['ignore', 'pipe', 'pipe'] });
    let blog = ''; bridge.stdout.on('data', d => blog += d); bridge.stderr.on('data', d => blog += d);
    try {
        await waitFor(async () => (await req('http://127.0.0.1:' + PORT + '/api/help')).status === 200, 10000, 'bridge');
        ok(true, 'bridge 启动 + /api/help');

        const help = await req('http://127.0.0.1:' + PORT + '/api/help');
        ok(help.json.service === 'codex-chat-bridge' && !!help.json.endpoints, '帮助文档返回接口清单');

        const st0 = await waitFor(async () => { const r = await api('/api/status'); return r.json.wechat && r.json.wechat.loggedIn ? r : null; }, 12000, 'wechat login');
        ok(!!st0, '微信代理已登录');
        const st = await api('/api/status');
        ok(st.json.codex && st.json.codex.version, 'Codex 状态含版本', JSON.stringify(st.json.codex));
        ok(st.json.wechat.loggedIn === true, '微信状态 loggedIn');

        await waitFor(async () => { const r = await req('http://127.0.0.1:' + PROXY + '/__mock/state'); return r.json.state.webhooks.length > 0; }, 8000, 'webhook register');
        const ms = await req('http://127.0.0.1:' + PROXY + '/__mock/state');
        ok(ms.json.state.webhooks.length === 1 && /18791\/webhook\/wechat/.test(ms.json.state.webhooks[0].webhookUrl || ''), 'webhook 已注册到代理', JSON.stringify(ms.json.state.webhooks));

        const peer = 'webtest-' + Date.now();
        const c1 = await api('/api/chat', { peer, text: 'hello' });
        ok(c1.json.ok && c1.json.text === '[mock] hello', 'Web 对话返回 mock 回复', JSON.stringify(c1.json));
        const h1 = await api('/api/history?peer=' + peer);
        ok((h1.json.history.messages || []).length === 2, '历史 2 条(user+assistant)');

        const conv = await api('/api/conversations');
        ok((conv.json.conversations || []).some(x => x.id === peer), '会话列表含新会话');

        const hook = (p) => req('http://127.0.0.1:' + PORT + '/webhook/wechat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
        const payload = { messageType: '60001', wcId: 'wxid_bot', data: { fromUser: 'wxid_a', content: '你好', newMsgId: 'm1' } };
        await hook(payload); await sleep(900);
        let s1 = await req('http://127.0.0.1:' + PROXY + '/__mock/state');
        ok(s1.json.state.messages.some(m => m.to === 'wxid_a' && m.text === '[mock] 你好'), '微信私聊 -> Codex -> 回发 wxid_a', JSON.stringify(s1.json.state.messages));
        const cnt1 = s1.json.state.messages.length;
        await hook(payload); await sleep(700);
        let s2 = await req('http://127.0.0.1:' + PROXY + '/__mock/state');
        ok(s2.json.state.messages.length === cnt1, '重复 newMsgId 去重');

        await hook({ messageType: '80001', wcId: 'wxid_bot', data: { fromUser: 'wxid_b', fromGroup: 'room1', content: '群消息', newMsgId: 'm2' } }); await sleep(900);
        let s3 = await req('http://127.0.0.1:' + PROXY + '/__mock/state');
        ok(s3.json.state.messages.some(m => m.to === 'room1' && m.text === '[mock] 群消息'), '群消息回发到群 room1', JSON.stringify(s3.json.state.messages.slice(-3)));

        const save = await api('/api/config', { patch: { codex: { cwd: ROOT, model: 'qwen3.8-max', sandbox: 'read-only', timeoutMs: 30000 }, ecs: { regionId: 'cn-shenzhen', instanceId: 'i-test', workbenchUrl: '' } } });
        ok(save.json.ok && save.json.config.codex.model === 'qwen3.8-max', '配置保存 model');
        const term = await api('/api/ecs/terminal');
        ok(/aliyun\.com/.test(term.json.url || ''), 'ECS 终端 URL 生成');

        const models = await api('/api/models');
        ok((models.json.models || []).length >= 5, '模型列表 >=5');

        // 截图
        const shot = (url, out) => new Promise((resolve) => {
            const dir = path.join(TEST, 'edge-prof-' + Date.now() + '-' + Math.random().toString(16).slice(2));
            const p = cp.spawn(EDGE, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--user-data-dir=' + dir, '--window-size=1400,900', '--virtual-time-budget=5000', '--screenshot=' + out, url], { windowsHide: true, stdio: 'ignore' });
            p.on('close', resolve); setTimeout(() => { try { p.kill(); } catch (e) { } resolve(); }, 25000);
        });
        await shot('http://127.0.0.1:' + PORT + '/?token=' + TOKEN + '&noevents=1', path.join(TEST, 'ui-chat.png'));
        await shot('http://127.0.0.1:' + PORT + '/codex.html?api=http://127.0.0.1:' + PORT + '&token=' + TOKEN, path.join(TEST, 'ui-codex.png'));
        for (const f of ['ui-chat.png', 'ui-codex.png']) { const n = fs.existsSync(path.join(TEST, f)) ? fs.statSync(path.join(TEST, f)).size : 0; ok(n > 15000, '截图 ' + f + ' (' + n + 'B)'); }
    } catch (e) {
        fail++; console.log('  FAIL exception: ' + e.message); console.log(blog.slice(-2000)); console.log(proxyLog.slice(-500));
    } finally {
        try { bridge.kill(); } catch (e) { }
        try { proxy.kill(); } catch (e) { }
        await sleep(400);
    }
    console.log('\nRESULT ' + pass + ' pass / ' + fail + ' fail');
    process.exit(fail ? 1 : 0);
})();
