'use strict';
const fs = require('fs'); const path = require('path');
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const URL = 'http://127.0.0.1:' + CFG.port + '/';
async function call(body, headers) { const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Re-Token': CFG.token, ...(headers||{}) }, body: JSON.stringify(body) }); return { status: r.status, json: await r.json() }; }
(async () => {
    let pass = 0, fail = 0;
    const chk = (n, c, d) => { if (c) { pass++; console.log('PASS ' + n); } else { fail++; console.log('FAIL ' + n + ' | ' + JSON.stringify(d).slice(0, 200)); } };
    let r = await call({ action: 'ping' }); chk('ping', r.json.ok && r.json.pong, r.json);
    r = await call({ action: 'fs.read' }); chk('bad-params returns help', r.status === 400 && r.json.ok === false && !!r.json.help, r.json);
    r = await call({ action: 'nope' }); chk('unknown action returns help', r.status === 400 && !!r.json.help, r.json);
    r = await call({ action: 'ping' }, { 'X-Re-Token': 'wrong' }); chk('wrong token 401', r.status === 401, r.json);
    r = await call({ action: 'fs.write', path: 'tmp_re_test/a.txt', content: 'hello-relay', mkdir: true }); chk('fs.write', r.json.ok && r.json.bytesWritten === 11, r.json);
    r = await call({ action: 'fs.read', path: 'tmp_re_test/a.txt' }); chk('fs.read', r.json.ok && r.json.content === 'hello-relay', r.json);
    r = await call({ action: 'fs.list', path: 'tmp_re_test' }); chk('fs.list', r.json.ok && r.json.count >= 1, r.json);
    r = await call({ action: 'fs.copy', from: 'tmp_re_test/a.txt', to: 'tmp_re_test/b.txt' }); chk('fs.copy', r.json.ok, r.json);
    r = await call({ action: 'fs.move', from: 'tmp_re_test/b.txt', to: 'tmp_re_test/c.txt' }); chk('fs.move', r.json.ok, r.json);
    r = await call({ action: 'fs.stat', path: 'tmp_re_test/c.txt' }); chk('fs.stat', r.json.ok && r.json.size === 11, r.json);
    r = await call({ action: 'fs.delete', path: 'tmp_re_test', recursive: true }); chk('fs.delete', r.json.ok, r.json);
    r = await call({ action: 'exec', cmd: 'node -v' }); chk('exec', r.json.ok && /v\d+/.test(r.json.stdout), r.json);
    r = await call({ action: 'laya.state' }); chk('laya.state', r.json.ok && !!r.json.result, r.json);
    r = await call({ action: 'laya.list' }); chk('laya.list', r.json.ok && Array.isArray(r.json.tools) && r.json.tools.length > 0, r.json);
    const g = await fetch(URL); const gj = await g.json(); chk('GET help', g.status === 200 && !!gj.actions, gj);
    console.log('==== ' + pass + '/' + (pass + fail) + ' PASS ====');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.log('TEST ERR ' + e.message); process.exit(1); });
