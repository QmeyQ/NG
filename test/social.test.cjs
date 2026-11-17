'use strict';
// Offline only: node --test test/social.test.cjs
// 执行真实业务源码(te/user.js + te/shield.js + Worker agc.js + 客户端 social.ts),
// mock DB/fetch/IDB/Timer, 断言最小写入契约: 每请求单记录一查一写, 审计合并行内 history。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const userSource = fs.readFileSync(path.join(ROOT, 'server/te/user.js'), 'utf8');
const shieldSource = fs.readFileSync(path.join(ROOT, 'server/te/shield.js'), 'utf8');
const agcSource = fs.readFileSync(path.join(ROOT, 'server/cloud/src/agc.js'), 'utf8');
const socialClientSource = fs.readFileSync(path.join(ROOT, 'src/libs/server/social.ts'), 'utf8');

function loadTs() {
    const ts = require(path.join(ROOT, 'realtimeserver/node_modules/typescript/lib/typescript.js'));
    assert.equal(typeof ts.transpileModule, 'function');
    return ts;
}
const ts = loadTs();
const copy = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
async function flush() { for (let i = 0; i < 100; i++) await Promise.resolve(); }

function sandbox(source, filename, deps, extra) {
    const logs = [];
    const fakeConsole = Object.fromEntries(['log', 'info', 'warn', 'error', 'debug'].map(l => [l, (...a) => logs.push({ level: l, args: a })]));
    const module = { exports: {} };
    const ctx = vm.createContext(Object.assign({
        module, exports: module.exports,
        __filename: filename, __dirname: path.dirname(filename),
        require: name => Object.hasOwn(deps, name) ? deps[name] : (() => { throw new Error('blocked require ' + name); })(),
        console: fakeConsole,
        process: { version: process.version, env: {} },
        setTimeout, clearTimeout,
        Buffer, URL, TextDecoder, TextEncoder
    }, extra || {}));
    new vm.Script(source, { filename }).runInContext(ctx, { timeout: 2000 });
    return { exports: module.exports, logs };
}

// ==================== shield 纯函数 ====================

const shield = sandbox(shieldSource, 'shield.js', {}).exports;

test('shield: makeRecord 严格 13 位 ms + 非负整数 op', () => {
    assert.equal(shield.makeRecord(0, 1800000000000), '18000000000000');
    assert.equal(shield.makeRecord(12, 1800000000000), '180000000000012');
    assert.throws(() => shield.makeRecord(-1, 1800000000000));
    assert.throws(() => shield.makeRecord('x', 1800000000000));
    assert.throws(() => shield.makeRecord(0, -5));   // 负时间戳非法
});

test('shield: parse 容忍垃圾数据, append 裁剪 24h 与 120 条上限', () => {
    assert.deepEqual(copy(shield.parse('garbage,,18000000000001,xx')), [{ ts: 1800000000000, op: 1, record: '18000000000001' }]);
    const now = 1800000000000;
    const old = now - 25 * 3600 * 1000;   // 25h 前 → 裁掉
    const h0 = shield.makeRecord(1, old) + ',' + shield.makeRecord(2, now - 1000);
    const h1 = shield.append(h0, 3, now);
    const entries = shield.parse(h1);
    assert.equal(entries.length, 2, '过期条目必须被裁剪');
    assert.equal(entries[1].op, 3);
    // 上限: 预置 130 条新鲜条目 → append 后保留最新 120
    let big = [];
    for (let i = 0; i < 130; i++) big.push(shield.makeRecord(1, now - 130 + i));
    const h2 = shield.append(big.join(','), 4, now);
    const e2 = shield.parse(h2);
    assert.equal(e2.length, shield.MAX_ENTRIES);
    assert.equal(e2[e2.length - 1].op, 4);
    assert.deepEqual(copy(shield.records(h2).slice(-1)), [{ record: shield.makeRecord(4, now) }]);
});

// ==================== 服务端 harness ====================

const KEY = id => 'k' + id;
function mkUser(id, extra) {
    return Object.assign({
        id: String(id), name: '玩家' + String(id).slice(-4), flag: '', bag: '{}', head: 'head/0.png',
        dollar: 5, secret: '', pass: '', social: '', history: '', record: '', mes: '', level: '',
        etc: '1700000000000:abc'
    }, extra || {});
}
function socialJson(f, req, blk) { return JSON.stringify({ f: f || [], req: req || [], blk: blk || [] }); }

function harness(t, opts) {
    opts = opts || {};
    const rows = new Map();
    for (const r of opts.rows || []) rows.set(String(r.id), copy(r));
    const trace = [];
    let dbOk = true;
    let gets = 0, writes = 0;
    const db = {
        get dbOk() { return dbOk; },
        dbErr: () => 'offline injected DB failure',
        async dbGet(id) {
            const ordinal = ++gets;
            trace.push({ op: 'get', id: String(id), ordinal });
            const f = (opts.getFaults || {})[ordinal] || {};
            const value = copy(rows.get(String(id)) || null);
            dbOk = f.ok !== false;
            if (f.throw) throw new Error('offline get throw');
            return dbOk ? value : null;
        },
        async dbUpsert(row) {
            const ordinal = ++writes;
            trace.push({ op: 'upsert', id: String(row.id), ordinal, fields: copy(row) });
            const f = (opts.putFaults || {})[ordinal] || {};
            dbOk = f.ok !== false;
            if (f.throw) throw new Error('offline upsert throw');
            if (!dbOk) return false;
            rows.set(String(row.id), copy(row));
            return true;
        },
        async dbDel(id) {
            trace.push({ op: 'del', id: String(id) });
            dbOk = true;
            rows.delete(String(id));
            return true;
        },
        async dbTop(field, limit) {
            trace.push({ op: 'top', field, limit });
            dbOk = true;
            const all = Array.from(rows.values()).filter(r => typeof r.level === 'string' && /^\d{10}$/.test(r.level));
            all.sort((a, b) => b.level.localeCompare(a.level));
            return all.slice(0, limit).map(copy);
        },
        async dbByIds(ids) {
            trace.push({ op: 'byIds', ids: ids.slice() });
            dbOk = true;
            return ids.map(id => rows.get(String(id))).filter(Boolean).map(copy);
        }
    };
    const shieldLoaded = sandbox(shieldSource, 'shield.js', {});
    const loaded = sandbox(userSource, 'user.js', {
        './code': { key: KEY, keyOk: (id, key) => String(key) === KEY(id) },
        './db': db,
        './shield': shieldLoaded.exports,
        './gobe': { getGobeToken: async () => ({ ok: false }) }
    });
    return {
        rows, trace,
        invoke(t, d) {
            const run = { responses: [], error: null, finished: false };
            const work = loaded.exports.myHandler({ t, d }, {}, body => run.responses.push(body), { info() {}, error() {} });
            Promise.resolve(work).then(() => { run.finished = true; }, e => { run.error = e; });
            return run;
        }
    };
}
async function call(h, t, d) {
    const run = h.invoke(t, d);
    await flush();
    assert.equal(run.error, null, 'handler must not reject');
    assert.equal(run.finished, true);
    assert.equal(run.responses.length, 1);
    return copy(run.responses[0]);
}
const ops = h => h.trace.map(x => x.op + ':' + x.id);
const auth = id => ({ userid: String(id), key: KEY(id) });

// ==================== 既有业务: 最小写入契约 ====================

test('bag: 1 查 + 1 写, 审计 op2 合并 history, 响应不变', async () => {
    const h = harness(null, { rows: [mkUser(1000, { history: '17999999990001', bag: '{"head/0.png":2}', dollar: 7 })] });
    const r = await call(h, 'bag', Object.assign(auth(1000), { gt: 0 }));
    assert.equal(r.code, 0);
    assert.deepEqual(r.bag, { 'head/0.png': 2 });
    assert.equal(r.dollar, 7);
    assert.deepEqual(ops(h), ['get:1000', 'upsert:1000']);
    const hist = shield.parse(h.rows.get('1000').history);
    assert.equal(hist.length, 2);
    assert.equal(hist[1].op, 2);
});

test('bag: 审计写失败不阻塞登录(读已权威)', async () => {
    const h = harness(null, { rows: [mkUser(1000)], putFaults: { 1: { ok: false } } });
    const r = await call(h, 'bag', auth(1000));
    assert.equal(r.code, 0);
    assert.deepEqual(r.bag, {});
});

test('user: 改名扣 1 金币, 1 查 + 1 写; 无变更也仅 2 次(审计)', async () => {
    const h = harness(null, { rows: [mkUser(1000, { dollar: 3 })] });
    const r = await call(h, 'user', Object.assign(auth(1000), { name: '新名字', flag: '新签名' }));
    assert.equal(r.code, 0);
    assert.equal(r.user.name, '新名字');
    assert.equal(r.user.dollar, 2);
    assert.deepEqual(ops(h), ['get:1000', 'upsert:1000']);
    const h2 = harness(null, { rows: [mkUser(1000)] });
    const r2 = await call(h2, 'user', auth(1000));
    assert.equal(r2.code, 0);
    assert.deepEqual(ops(h2), ['get:1000', 'upsert:1000']);
});

test('user: 垃圾 history 不破坏业务(审计容错重建)', async () => {
    const h = harness(null, { rows: [mkUser(1000, { history: '%%garbage%%' })] });
    const r = await call(h, 'user', Object.assign(auth(1000), { flag: 'ok' }));
    assert.equal(r.code, 0);
    const hist = shield.parse(h.rows.get('1000').history);
    assert.equal(hist.length, 1);
    assert.equal(hist[0].op, 1);
});

test('user: 金币不足回 4 且零写入', async () => {
    const h = harness(null, { rows: [mkUser(1000, { dollar: 0 })] });
    const r = await call(h, 'user', Object.assign(auth(1000), { name: 'x' }));
    assert.equal(r.code, 4);
    assert.deepEqual(ops(h), ['get:1000']);
});

test('set: 背包扣减/删除, 1 查 + 1 写; 数量不足回 3', async () => {
    const h = harness(null, { rows: [mkUser(1000, { bag: '{"head/1.png":1,"head/2.png":3}' })] });
    const r = await call(h, 'set', Object.assign(auth(1000), { head: 'head/1.png' }));
    assert.equal(r.code, 0);
    assert.deepEqual(r.user.bag, { 'head/2.png': 3 });
    assert.equal(r.user.head, 'head/1.png');
    assert.deepEqual(ops(h), ['get:1000', 'upsert:1000']);
    const r2 = await call(h, 'set', Object.assign(auth(1000), { head: 'head/9.png' }));
    assert.equal(r2.code, 3);
});

test('buy: 普通 −1/+1, 金币商品 +5, 1 查 + 1 写; 不足回 4', async () => {
    const h = harness(null, { rows: [mkUser(1000, { dollar: 2 })] });
    const r = await call(h, 'buy', Object.assign(auth(1000), { item: 'head/5.png' }));
    assert.equal(r.code, 0);
    assert.equal(r.user.dollar, 1);
    assert.deepEqual(r.user.bag, { 'head/5.png': 1 });
    const r2 = await call(h, 'buy', Object.assign(auth(1000), { item: 'main/shop/dollar.png' }));
    assert.equal(r2.code, 0);
    assert.equal(r2.user.dollar, 6);
    const h2 = harness(null, { rows: [mkUser(1000, { dollar: 0 })] });
    const r3 = await call(h2, 'buy', Object.assign(auth(1000), { item: 'head/5.png' }));
    assert.equal(r3.code, 4);
    assert.deepEqual(ops(h2), ['get:1000']);
});

test('del: 1 查 + 1 删, 无写入(行已不存在, 无审计)', async () => {
    const h = harness(null, { rows: [mkUser(1000)] });
    const r = await call(h, 'del', auth(1000));
    assert.equal(r.code, 0);
    assert.deepEqual(ops(h), ['get:1000', 'del:1000']);
    assert.equal(h.rows.has('1000'), false);
    assert.equal(h.trace.filter(x => x.op === 'upsert').length, 0);
});

test('认证失败/缺参: 零 DB 操作', async () => {
    const h = harness(null, { rows: [mkUser(1000)] });
    const r = await call(h, 'sync', { userid: '1000', key: 'wrong' });
    assert.equal(r.code, 2);
    const r2 = await call(h, 'friend', { userid: '1000' });
    assert.equal(r2.code, 5);
    assert.deepEqual(h.trace, []);
});

test('DB 读/写故障: 回 5 不冒称成功', async () => {
    const h = harness(null, { rows: [mkUser(1000)], getFaults: { 1: { ok: false } } });
    assert.equal((await call(h, 'sync', auth(1000))).code, 5);
    const h2 = harness(null, { rows: [mkUser(1000)], putFaults: { 1: { ok: false } } });
    assert.equal((await call(h2, 'score', Object.assign(auth(1000), { win: 1 }))).code, 5);
});

// ==================== 社交分支 ====================

test('find: 1 查目标行, 只回公开资料(不泄露 bag/dollar/secret)', async () => {
    const h = harness(null, { rows: [mkUser(1000), mkUser(2000, { record: '{"win":3,"play":5}', dollar: 99 })] });
    const r = await call(h, 'find', Object.assign(auth(1000), { target: '2000' }));
    assert.equal(r.code, 0);
    assert.deepEqual(r.user, { userid: '2000', name: '玩家2000', head: 'head/0.png', flag: '', win: 3, play: 5, room: '' });
    assert.deepEqual(ops(h), ['get:2000']);
    const r2 = await call(h, 'find', Object.assign(auth(1000), { target: '9999' }));
    assert.equal(r2.code, 1);
    const r3 = await call(h, 'find', Object.assign(auth(1000), { target: '_seq' }));
    assert.equal(r3.code, 5, '系统行不可查');
});

test('profiles: 1 次 in 批量查; 空列表零操作', async () => {
    const h = harness(null, { rows: [mkUser(1000), mkUser(2000), mkUser(3000)] });
    const r = await call(h, 'profiles', Object.assign(auth(1000), { ids: ['2000', '3000', '_seq'] }));
    assert.equal(r.code, 0);
    assert.equal(r.users.length, 2);
    assert.deepEqual(ops(h), ['byIds:undefined']);
    assert.deepEqual(h.trace[0].ids, ['2000', '3000']);
    const r2 = await call(h, 'profiles', Object.assign(auth(1000), { ids: [] }));
    assert.equal(r2.code, 0);
    assert.deepEqual(r2.users, []);
});

test('friend request: 写对方 req+回读自己附带 mes, 不扣金币不审计对方', async () => {
    const h = harness(null, { rows: [mkUser(1000), mkUser(2000, { history: '17999999990001' })] });
    const r = await call(h, 'friend', Object.assign(auth(1000), { action: 'request', target: '2000' }));
    assert.equal(r.code, 0);
    assert.deepEqual(ops(h), ['get:2000', 'upsert:2000', 'get:1000']);
    const them = JSON.parse(h.rows.get('2000').social);
    assert.equal(them.req.length, 1);
    assert.equal(them.req[0].id, '1000');
    assert.equal(them.req[0].price, undefined, 'req 不携带 price');
    assert.equal(h.rows.get('2000').history, '17999999990001', '写别人行不得追加对方 history');
    assert.equal(h.rows.get('1000').dollar, 5, '申请不扣金币');
    // 幂等保护: 重复申请/已是好友/拉黑/容量
    assert.equal((await call(h, 'friend', Object.assign(auth(1000), { action: 'request', target: '2000' }))).code, 12);
    const h2 = harness(null, { rows: [mkUser(1000), mkUser(2000, { social: socialJson(['1000']) })] });
    assert.equal((await call(h2, 'friend', Object.assign(auth(1000), { action: 'request', target: '2000' }))).code, 12);
    const h3 = harness(null, { rows: [mkUser(1000), mkUser(2000, { social: socialJson([], [], ['1000']) })] });
    assert.equal((await call(h3, 'friend', Object.assign(auth(1000), { action: 'request', target: '2000' }))).code, 12);
    const fullReq = [];
    for (let i = 0; i < 50; i++) fullReq.push({ id: 'u' + i, ts: 1 });
    const h4 = harness(null, { rows: [mkUser(1000), mkUser(2000, { social: socialJson([], fullReq) })] });
    assert.equal((await call(h4, 'friend', Object.assign(auth(1000), { action: 'request', target: '2000' }))).code, 12);
    assert.equal((await call(h, 'friend', Object.assign(auth(1000), { action: 'request', target: '1000' }))).code, 12);
});

test('friend accept: 双方各一查一写(4 次), 双向好友, 审计只进自己行', async () => {
    const h = harness(null, { rows: [
        mkUser(1000, { social: socialJson([], [{ id: '2000', ts: 1 }]), history: '17999999990001' }),
        mkUser(2000, { history: '17999999990002' })
    ] });
    const r = await call(h, 'friend', Object.assign(auth(1000), { action: 'accept', target: '2000' }));
    assert.equal(r.code, 0);
    assert.equal(r.friend.userid, '2000');
    assert.deepEqual(ops(h), ['get:1000', 'get:2000', 'upsert:1000', 'upsert:2000']);
    const me = JSON.parse(h.rows.get('1000').social);
    const them = JSON.parse(h.rows.get('2000').social);
    assert.deepEqual(me.f, ['2000']);
    assert.deepEqual(me.req, []);
    assert.deepEqual(them.f, ['1000']);
    assert.equal(shield.parse(h.rows.get('1000').history).slice(-1)[0].op, 6);
    assert.equal(h.rows.get('2000').history, '17999999990002');
});

test('friend accept: 幂等重试修复对方侧; 对方已注销清申请回 12; 无申请回 12', async () => {
    // 上次 accept 对方侧写失败 → 重试时我已在 f, 仍补写对方
    const h = harness(null, { rows: [
        mkUser(1000, { social: socialJson(['2000']) }),
        mkUser(2000, { social: socialJson([]) })
    ] });
    const r = await call(h, 'friend', Object.assign(auth(1000), { action: 'accept', target: '2000' }));
    assert.equal(r.code, 0);
    assert.deepEqual(JSON.parse(h.rows.get('2000').social).f, ['1000']);
    const h2 = harness(null, { rows: [mkUser(1000, { social: socialJson([], [{ id: '2000', ts: 1 }]) })] });
    const r2 = await call(h2, 'friend', Object.assign(auth(1000), { action: 'accept', target: '2000' }));
    assert.equal(r2.code, 12);
    assert.deepEqual(JSON.parse(h2.rows.get('1000').social).req, []);
    const h3 = harness(null, { rows: [mkUser(1000), mkUser(2000)] });
    assert.equal((await call(h3, 'friend', Object.assign(auth(1000), { action: 'accept', target: '2000' }))).code, 12);
});

test('friend reject/remove: 幂等; remove 双向解除(4 次), 对方注销只清自己(2 次)', async () => {
    const h = harness(null, { rows: [mkUser(1000, { social: socialJson([], [{ id: '2000', ts: 1 }]) })] });
    const r = await call(h, 'friend', Object.assign(auth(1000), { action: 'reject', target: '2000' }));
    assert.equal(r.code, 0);
    assert.deepEqual(ops(h), ['get:1000', 'upsert:1000']);
    assert.deepEqual(JSON.parse(h.rows.get('1000').social).req, []);
    const h2 = harness(null, { rows: [
        mkUser(1000, { social: socialJson(['2000']) }),
        mkUser(2000, { social: socialJson(['1000']) })
    ] });
    const r2 = await call(h2, 'friend', Object.assign(auth(1000), { action: 'remove', target: '2000' }));
    assert.equal(r2.code, 0);
    assert.deepEqual(ops(h2), ['get:1000', 'get:2000', 'upsert:1000', 'upsert:2000']);
    assert.deepEqual(JSON.parse(h2.rows.get('1000').social).f, []);
    assert.deepEqual(JSON.parse(h2.rows.get('2000').social).f, []);
    const h3 = harness(null, { rows: [mkUser(1000, { social: socialJson(['2000']) })] });
    const r3 = await call(h3, 'friend', Object.assign(auth(1000), { action: 'remove', target: '2000' }));
    assert.equal(r3.code, 0);
    assert.deepEqual(ops(h3), ['get:1000', 'get:2000', 'upsert:1000']);
});

test('msg: 查+写对方收件箱(2 次); 非好友/空/超长拦截; 50 条裁最旧; 不审计对方', async () => {
    const h = harness(null, { rows: [
        mkUser(1000),
        mkUser(2000, { social: socialJson(['1000']), history: '17999999990001' })
    ] });
    const r = await call(h, 'msg', Object.assign(auth(1000), { target: '2000', text: '你好' }));
    assert.equal(r.code, 0);
    assert.ok(r.id);
    assert.deepEqual(ops(h), ['get:2000', 'upsert:2000']);
    const inbox = JSON.parse(h.rows.get('2000').mes);
    assert.equal(inbox.length, 1);
    assert.equal(inbox[0].from, '1000');
    assert.equal(inbox[0].text, '你好');
    assert.equal(h.rows.get('2000').history, '17999999990001');
    // 非好友
    const h2 = harness(null, { rows: [mkUser(1000), mkUser(2000)] });
    assert.equal((await call(h2, 'msg', Object.assign(auth(1000), { target: '2000', text: 'hi' }))).code, 12);
    assert.equal(h2.trace.filter(x => x.op === 'upsert').length, 0);
    // 空/超长
    assert.equal((await call(h, 'msg', Object.assign(auth(1000), { target: '2000', text: '  ' }))).code, 5);
    assert.equal((await call(h, 'msg', Object.assign(auth(1000), { target: '2000', text: 'x'.repeat(201) }))).code, 12);
    // 容量: 预置 50 条 → 新消息挤掉最旧
    const old = [];
    for (let i = 0; i < 50; i++) old.push({ id: 'm' + i, from: '1000', text: 't' + i, ts: i });
    const h3 = harness(null, { rows: [mkUser(1000), mkUser(2000, { social: socialJson(['1000']), mes: JSON.stringify(old) })] });
    const r3 = await call(h3, 'msg', Object.assign(auth(1000), { target: '2000', text: '最新' }));
    assert.equal(r3.code, 0);
    const inbox3 = JSON.parse(h3.rows.get('2000').mes);
    assert.equal(inbox3.length, 50);
    assert.equal(inbox3[0].id, 'm1');
    assert.equal(inbox3[49].text, '最新');
});

test('身价=个人设置(setprice 0-500), 好友申请/同意/拒绝不转移金币', async () => {
    const h = harness(null, { rows: [mkUser(1000, { dollar: 10 }), mkUser(2000, { dollar: 0 })] });
    const r = await call(h, 'friend', Object.assign(auth(1000), { action: 'request', target: '2000' }));
    assert.equal(r.code, 0);
    assert.equal(h.rows.get('1000').dollar, 10, '申请不扣金币');
    assert.equal(JSON.parse(h.rows.get('2000').social).req[0].price, undefined, 'req 不携带 price');
    const a = await call(h, 'friend', Object.assign(auth(2000), { action: 'accept', target: '1000' }));
    assert.equal(a.code, 0);
    assert.equal(h.rows.get('2000').dollar, 0, '同意不到账金币');
    assert.equal(h.rows.get('1000').dollar, 10);
    // setprice 个人设置
    const sp = await call(h, 'setprice', Object.assign(auth(1000), { price: 200 }));
    assert.equal(sp.code, 0);
    assert.equal(sp.price, 200);
    assert.equal(JSON.parse(h.rows.get('1000').social).price, 200);
    const sy = await call(h, 'sync', auth(1000));
    assert.equal(sy.social.price, 200);
    assert.equal((await call(h, 'setprice', Object.assign(auth(1000), { price: 501 }))).code, 5);
    assert.equal((await call(h, 'setprice', Object.assign(auth(1000), { price: 0 }))).code, 0);
    // reject 不退金币(本就没扣)
    const h2 = harness(null, { rows: [mkUser(1000, { dollar: 7 }), mkUser(2000)] });
    await call(h2, 'friend', Object.assign(auth(1000), { action: 'request', target: '2000' }));
    await call(h2, 'friend', Object.assign(auth(2000), { action: 'reject', target: '1000' }));
    assert.equal(h2.rows.get('1000').dollar, 7);
});

test('ack: 删除已送达条目(查+写自己), 无 ids 零操作', async () => {
    const h = harness(null, { rows: [mkUser(1000, { mes: JSON.stringify([{ id: 'a', from: '2000', text: 'x', ts: 1 }, { id: 'b', from: '2000', text: 'y', ts: 2 }]) })] });
    const r = await call(h, 'ack', Object.assign(auth(1000), { ids: ['a'] }));
    assert.equal(r.code, 0);
    assert.equal(r.removed, 1);
    const left = JSON.parse(h.rows.get('1000').mes);
    assert.deepEqual(left.map(m => m.id), ['b']);
    const r0 = await call(h, 'ack', Object.assign(auth(1000), { ids: [] }));
    assert.equal(r0.removed, 0);
});

test('屏蔽词: 命中标记 w=1 仍转交; 未命中 w=0', async () => {
    const h = harness(null, { rows: [mkUser(1000), mkUser(2000, { social: socialJson(['1000']) })] });
    const r = await call(h, 'msg', Object.assign(auth(1000), { target: '2000', text: '你个傻逼' }));
    assert.equal(r.code, 0);
    const box = JSON.parse(h.rows.get('2000').mes);
    assert.equal(box[0].w, 1);
    const r2 = await call(h, 'msg', Object.assign(auth(1000), { target: '2000', text: '你好' }));
    const box2 = JSON.parse(h.rows.get('2000').mes);
    assert.equal(box2[1].w, 0);
});

test('group: create 建群行+成员 social.g; info 读元数据; msg 带 gid 转交全体成员', async () => {
    const h = harness(null, { rows: [mkUser(1000), mkUser(2000, { social: socialJson(['1000']) }), mkUser(3000, { social: socialJson(['1000']) })] });
    const c = await call(h, 'group', Object.assign(auth(1000), { action: 'create', name: '开黑群', members: ['2000', '3000'] }));
    assert.equal(c.code, 0);
    assert.ok(c.gid);
    assert.deepEqual(c.members.sort(), ['1000', '2000', '3000']);
    assert.ok(h.rows.has('grp:' + c.gid));
    assert.ok(JSON.parse(h.rows.get('2000').social).g.includes(c.gid));
    const info = await call(h, 'group', Object.assign(auth(2000), { action: 'info', gid: c.gid }));
    assert.equal(info.name, '开黑群');
    const m = await call(h, 'msg', Object.assign(auth(1000), { gid: c.gid, text: '集合' }));
    assert.equal(m.code, 0);
    assert.equal(JSON.parse(h.rows.get('2000').mes)[0].gid, c.gid);
    assert.equal(JSON.parse(h.rows.get('3000').mes)[0].text, '集合');
    assert.equal(JSON.parse(h.rows.get('1000').mes || '[]').length, 0, '不发给自己');
    // 非成员发群消息拒绝
    const h2 = harness(null, { rows: [mkUser(9000)] });
    assert.equal((await call(h2, 'msg', Object.assign(auth(9000), { gid: c.gid, text: 'x' }))).code, 1);
});

test('转交契约: 读自己行的响应附带 mes(bag/sync), 读别人行不附带(find)', async () => {
    const h = harness(null, { rows: [mkUser(1000, { mes: JSON.stringify([{ id: 'p1', from: '2000', text: 'hi', ts: 1 }]) }), mkUser(2000, { mes: JSON.stringify([{ id: 'p2', from: '3000', text: 'secret', ts: 1 }]) })] });
    const b = await call(h, 'bag', auth(1000));
    assert.equal(b.mes.length, 1);
    assert.equal(b.mes[0].id, 'p1');
    const f = await call(h, 'find', Object.assign(auth(1000), { target: '2000' }));
    assert.equal(f.mes, undefined, 'find 不泄露对方待转交消息');
});

test('sync: 1 查零写, 回 social/mes/record 解析结果', async () => {
    const h = harness(null, { rows: [mkUser(1000, {
        social: socialJson(['2000'], [{ id: '3000', ts: 9 }]),
        mes: JSON.stringify([{ id: 'm1', from: '2000', text: 'hi', ts: 5 }]),
        record: '{"win":2,"play":4,"last":123,"recent":[{"w":1,"m":"pvp","ts":123}]}'
    })] });
    const r = await call(h, 'sync', auth(1000));
    assert.equal(r.code, 0);
    assert.deepEqual(r.social.f, ['2000']);
    assert.equal(r.social.req[0].id, '3000');
    assert.equal(r.mes.length, 1);
    assert.equal(r.record.win, 2);
    assert.equal(r.user.userid, '1000');
    assert.deepEqual(ops(h), ['get:1000']);
});

test('mes clear: 查+写自己(2 次), 收件箱清空且审计 op9', async () => {
    const h = harness(null, { rows: [mkUser(1000, { mes: JSON.stringify([{ id: 'm', from: '2000', text: 'x', ts: 1 }]) })] });
    const r = await call(h, 'mes', Object.assign(auth(1000), { action: 'clear' }));
    assert.equal(r.code, 0);
    assert.deepEqual(ops(h), ['get:1000', 'upsert:1000']);
    assert.equal(h.rows.get('1000').mes, '[]');
    assert.equal(shield.parse(h.rows.get('1000').history).slice(-1)[0].op, 9);
});

test('rank: 1 次索引查询, 过滤系统行/未上报行, limit 生效', async () => {
    const rows = [
        mkUser(1000, { level: '0000000003', record: '{"win":3,"play":5}' }),
        mkUser(2000, { level: '0000000007', record: '{"win":7,"play":9}' }),
        mkUser(3000),                                   // level 空 → 不上榜
        { id: '_seq', etc: '1000', level: '' },
        { id: 'mag:admin', name: 'admin', level: '' }
    ];
    const h = harness(null, { rows });
    const r = await call(h, 'rank', Object.assign(auth(1000), { limit: 1 }));
    assert.equal(r.code, 0);
    assert.equal(r.users.length, 1);
    assert.equal(r.users[0].userid, '2000');
    assert.equal(r.users[0].win, 7);
    assert.equal(h.trace.filter(x => x.op === 'top').length, 1);
    assert.equal(h.trace.filter(x => x.op === 'upsert').length, 0);
    const r2 = await call(h, 'rank', Object.assign(auth(1000), { limit: 50 }));
    assert.deepEqual(r2.users.map(u => u.userid), ['2000', '1000']);
});

test('score: 查+写自己(2 次), record/level/history 同写; 30s 冷却; 非法 win 零操作', async () => {
    const h = harness(null, { rows: [mkUser(1000)] });
    const r = await call(h, 'score', Object.assign(auth(1000), { win: 1, mode: 'pvp' }));
    assert.equal(r.code, 0);
    assert.equal(r.record.win, 1);
    assert.equal(r.record.play, 1);
    assert.equal(r.record.recent[0].m, 'pvp');
    assert.deepEqual(ops(h), ['get:1000', 'upsert:1000']);
    assert.equal(h.rows.get('1000').level, '0000000001');
    assert.equal(shield.parse(h.rows.get('1000').history).slice(-1)[0].op, 8);
    // 冷却: 紧接着再报 → 12, 只读不写
    const r2 = await call(h, 'score', Object.assign(auth(1000), { win: 1 }));
    assert.equal(r2.code, 12);
    assert.equal(h.trace.filter(x => x.op === 'upsert').length, 1);
    // 非法 win
    const h2 = harness(null, { rows: [mkUser(1000)] });
    assert.equal((await call(h2, 'score', Object.assign(auth(1000), { win: 5 }))).code, 5);
    assert.deepEqual(h2.trace, []);
    // recent 上限 10
    const rec = { win: 12, play: 15, last: 0, recent: [] };
    for (let i = 0; i < 10; i++) rec.recent.push({ w: 1, m: 'pve', ts: i });
    const h3 = harness(null, { rows: [mkUser(1000, { record: JSON.stringify(rec) })] });
    const r3 = await call(h3, 'score', Object.assign(auth(1000), { win: 0, mode: 'pve' }));
    assert.equal(r3.code, 0);
    assert.equal(r3.record.recent.length, 10);
    assert.equal(r3.record.win, 12);
    assert.equal(r3.record.play, 16);
    assert.equal(h3.rows.get('1000').level, '0000000012');
});

test('未知 t / 未知 action: 回 5', async () => {
    const h = harness(null, { rows: [mkUser(1000)] });
    assert.equal((await call(h, 'nope', auth(1000))).code, 5);
    assert.equal((await call(h, 'friend', Object.assign(auth(1000), { action: 'x', target: '2000' }))).code, 5);
});

// ==================== Worker agc.js: 主键点查 + 行内 history 解析 ====================

const agcCjs = ts.transpileModule(agcSource, {
    fileName: 'agc.js',
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;

function workerHarness(t, respond) {
    const calls = [];
    const loaded = sandbox(agcCjs, 'agc.js', {
        './agc/tokenService.js': { getAccessToken: async () => 'offline-token' }
    }, {
        crypto: { getRandomValues: arr => { for (let i = 0; i < arr.length; i++) arr[i] = i; return arr; } },
        AbortSignal: { timeout: () => ({}) },
        fetch: async (url, init) => {
            calls.push({ url, body: JSON.parse(init.body) });
            return respond(url, init);
        }
    });
    return { calls, getUserCallHistory: loaded.exports.getUserCallHistory };
}
const okResponse = rows => async () => ({ ok: true, text: async () => JSON.stringify({ data: { data: rows } }) });

test('worker: EqualTo 主键点查(替代前缀扫描), 解析 history 为风控记录', async () => {
    const now = Date.now();
    const fresh = String(now - 1000).padStart(13, '0') + '2';
    const stale = String(now - 25 * 3600 * 1000).padStart(13, '0') + '1';
    const h = workerHarness(null, okResponse([{ id: '1000', history: stale + ',' + fresh }]));
    const records = await h.getUserCallHistory({}, {}, '1000');
    assert.equal(h.calls.length, 1);
    const cond = h.calls[0].body.queryConditions;
    assert.deepEqual(copy(cond[0]), { conditionType: 'EqualTo', fieldName: 'id', value: '1000' });
    assert.equal(cond[1].value.number, 1);
    assert.equal(h.calls[0].body.cloudDBZoneName, 'User');
    assert.equal(h.calls[0].body.objectTypeName, 'NG');
    assert.deepEqual(copy(records), [{ id: '1000', record: fresh }]);
});

test('worker: 行不存在 → []; 查询失败 → 抛错(调用方 fail-open)', async () => {
    const h = workerHarness(null, okResponse([]));
    assert.deepEqual(copy(await h.getUserCallHistory({}, {}, '9999')), []);
    const h2 = workerHarness(null, async () => ({ ok: false, status: 500, text: async () => 'boom' }));
    await assert.rejects(() => h2.getUserCallHistory({}, {}, '1000'));
    const h3 = workerHarness(null, async () => ({ ok: true, text: async () => JSON.stringify({ data: {} }) }));
    await assert.rejects(() => h3.getUserCallHistory({}, {}, '1000'));
});

// ==================== 客户端 Social 服务层 ====================

const socialCjs = ts.transpileModule(socialClientSource, {
    fileName: 'social.ts',
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
assert.ok(socialCjs.includes('Social'), 'social.ts must transpile');

function clientHarness(t, opts) {
    opts = opts || {};
    const store = {};
    const calls = [];
    const timers = [];
    const cleared = [];
    let user = opts.user === undefined ? { userid: '1000', key: 'k1000' } : opts.user;
    let route = opts.route || (() => ({ code: 5, msg: '未知 t: x' }));
    const local = {};
    if (opts.inviter) local.social_inviter = opts.inviter;
    const loaded = sandbox(socialCjs, 'social.ts', {
        './cloud': {
            Cloud: {
                getUser: () => user,
                teSafe: (t, d, cb) => { calls.push({ t, d, safe: true }); Promise.resolve().then(() => cb(copy(route(t, d)))); },
                teWrite: (t, d, cb) => { calls.push({ t, d, safe: false }); Promise.resolve().then(() => cb(copy(route(t, d)))); }
            }
        },
        '../IDBStorage': {
            IDBStorage: class {
                get(k, cb) { cb(copy(store[k] || null)); }
                set(k, v, cb) { store[k] = copy(v); if (cb) cb(); }
                delete(k, cb) { delete store[k]; if (cb) cb(); }
                clear(cb) { for (const k of Object.keys(store)) delete store[k]; if (cb) cb(); }
            }
        },
        '../time': {
            Timer: {
                setTimeout: (ms, fn) => { timers.push({ ms, fn }); return 'tid' + timers.length; },
                clear: tid => { cleared.push(tid); }
            }
        },
        '../wx': { wxEnv: false },
        '../gobe/net': { Gnet: { getRoom: () => null, getPlayers: () => [], sendChatMessage: () => { }, sendToClient: () => { }, onMessage: () => { }, onClient: () => { }, chatType: 5, updatePlayerProperties: () => { } } },
        './lobby': { setSinks: () => { }, sendTo: (tg, tx, cb) => cb(true, false), sendRaw: (tg, py, cb) => cb && cb(true, false), notifyFriendReq: () => { }, notifyFriendAccept: () => { }, ensure: (cb) => cb && cb(true), region: () => '华东', regionCode: () => 'HD', currentRoom: () => '', rejoin: (cb) => cb && cb(true), leaveForMatch: (cb) => cb && cb() }
    }, {
        location: { search: opts.search || '', origin: 'https://normalgame.cn', pathname: '/index.html' },
        localStorage: {
            getItem: k => (Object.hasOwn(local, k) ? local[k] : null),
            setItem: (k, v) => { local[k] = String(v); },
            removeItem: k => { delete local[k]; }
        },
        navigator: opts.clipboard === false ? {} : { clipboard: { writeText: async () => { } } },
        window: { prompt: () => { } }
    });
    return {
        Social: loaded.exports.Social, store, calls, timers, cleared, local, logs: loaded.logs,
        setUser: u => { user = u; },
        setRoute: fn => { route = fn; },
        init: async () => { loaded.exports.Social.init(); await flush(); }
    };
}

test('client sync: 更新 state/mes/record, 补取好友资料, 清已好友的本地申请, 落盘', async () => {
    const h = clientHarness(null, {
        route: (t, d) => {
            if (t === 'sync') return {
                code: 0,
                social: { f: ['2000'], req: [{ id: '3000', ts: 9 }], blk: [] },
                mes: [{ id: 'm1', from: '2000', text: 'hi', ts: 500 }],
                record: { win: 2, play: 4, last: 123, recent: [] }
            };
            if (t === 'profiles') return { code: 0, users: [{ userid: '2000', name: '好友A', head: 'head/1.png', flag: '', win: 1, play: 2 }] };
            return { code: 5 };
        }
    });
    h.store.cloud_social = { profiles: {}, sentReq: ['2000', '4000'], sentMsg: [], readTs: 0, invited: '' };
    await h.init();
    let ok = null;
    h.Social.sync(v => { ok = v; });
    await flush();
    assert.equal(ok, true);
    assert.deepEqual(copy(h.Social.state.f), ['2000']);
    assert.equal(h.Social.mes.length, 1);
    assert.equal(h.Social.record.win, 2);
    assert.equal(h.Social.profile('2000').name, '好友A');
    assert.deepEqual(h.Social.sentReq, ['4000']);
    assert.deepEqual(copy(h.calls.map(c => c.t)), ['sync', 'ack', 'profiles']);
    assert.deepEqual(copy(h.calls[1].d.ids), ['m1'], 'ack 删除已送达 m1');
    assert.deepEqual(copy(h.calls[2].d.ids), ['2000']);
    assert.ok(h.store.cloud_social, '必须落盘');
    assert.equal(h.Social.lastMsg, '');
});

test('client sync: 失败给 lastMsg 不抛错; 未登录直接 false', async () => {
    const h = clientHarness(null, { route: () => ({ code: 5, msg: '未知 t: sync' }) });
    await h.init();
    let ok = null;
    h.Social.sync(v => { ok = v; });
    await flush();
    assert.equal(ok, false);
    assert.match(h.Social.lastMsg, /未知 t/);
    const h2 = clientHarness(null, { user: null });
    await h2.init();
    let ok2 = null;
    h2.Social.sync(v => { ok2 = v; });
    await flush();
    assert.equal(ok2, false);
    assert.equal(h2.calls.length, 0);
});

test('client request/send: 成功本地留底, 失败不记; 超长/空本地拦截零调用', async () => {
    const h = clientHarness(null, { route: () => ({ code: 0, id: 'mid1' }) });
    await h.init();
    let ok = null;
    h.Social.request('2000', v => { ok = v; });
    await flush();
    assert.equal(ok, true);
    assert.deepEqual(copy(h.Social.sentReq), ['2000']);
    assert.equal(h.calls[0].t, 'friend');
    assert.equal(h.calls[0].d.action, 'request');
    assert.equal(h.calls[0].safe, false, '非幂等写不自动重试');
    h.Social.send('2000', '你好', v => { ok = v; });
    await flush();
    assert.equal(ok, true);
    assert.equal(h.Social.sentMsg.length, 1);
    assert.equal(h.Social.sentMsg[0].to, '2000');
    assert.equal(h.Social.sentMsg[0].from, '1000');
    const n = h.calls.length;
    h.Social.send('2000', 'x'.repeat(201), () => { });
    h.Social.send('2000', '   ', () => { });
    await flush();
    assert.equal(h.calls.length, n, '本地校验拦截, 不浪费云端操作');
    assert.match(h.Social.lastMsg, /200 字|为空/);
    const h2 = clientHarness(null, { route: () => null });
    await h2.init();
    h2.Social.request('2000', () => { });
    await flush();
    assert.deepEqual(copy(h2.Social.sentReq), []);
    assert.match(h2.Social.lastMsg, /网络/);
});

test('client unread/markRead: 本地水位, 不占服务端写', async () => {
    const h = clientHarness(null, {
        route: () => ({ code: 0, social: { f: [], req: [], blk: [] }, mes: [{ id: 'a', from: '2000', text: 'x', ts: 100 }, { id: 'b', from: '2000', text: 'y', ts: 200 }], record: { win: 0, play: 0, last: 0, recent: [] } })
    });
    await h.init();
    h.Social.sync(() => { });
    await flush();
    assert.equal(h.Social.unread(), 2);
    h.Social.markRead();
    assert.equal(h.Social.unread(), 0);
    assert.equal(h.store.cloud_social.readTs, 200);
});

test('client accept: 成功后 sync 刷新, res.friend 入缓存; reportResult 上报 win/mode', async () => {
    const h = clientHarness(null, {
        route: (t, d) => {
            if (t === 'friend' && d.action === 'accept') return { code: 0, friend: { userid: '2000', name: 'A', head: '', flag: '', win: 0, play: 0 } };
            if (t === 'sync') return { code: 0, social: { f: ['2000'], req: [], blk: [] }, mes: [], record: { win: 0, play: 0, last: 0, recent: [] } };
            if (t === 'score') return { code: 0, record: { win: 1, play: 1, last: 999, recent: [{ w: 1, m: 'pvp', ts: 999 }] } };
            return { code: 0, users: [] };
        }
    });
    await h.init();
    let ok = null;
    h.Social.accept('2000', v => { ok = v; });
    await flush();
    assert.equal(ok, true);
    assert.equal(h.Social.profile('2000').name, 'A');
    assert.deepEqual(h.Social.state.f, ['2000']);
    h.Social.reportResult(true, 'pvp');
    await flush();
    const score = h.calls.find(c => c.t === 'score');
    assert.deepEqual(copy(score.d), { userid: '1000', key: 'k1000', win: 1, mode: 'pvp' });
    assert.equal(h.Social.record.win, 1);
});

test('client invite: 捕获 ?inv, 登录后自动申请一次, code0/12 置标记, 网络失败可重试', async () => {
    const h = clientHarness(null, { search: '?inv=2000', route: () => ({ code: 0 }) });
    await h.init();
    assert.equal(h.local.social_inviter, '2000');
    assert.equal(h.Social.inviteLink(), 'https://normalgame.cn/index.html?inv=1000');
    h.Social.tryInviteFriend();
    await flush();
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].d.target, '2000');
    assert.equal(h.store.cloud_social.invited, '2000');
    // 再次登录不重发
    h.Social.tryInviteFriend();
    await flush();
    assert.equal(h.calls.length, 1);
    // code 12(已是好友/已申请) 同样置标记
    const h2 = clientHarness(null, { inviter: '3000', route: () => ({ code: 12, msg: '已申请过' }) });
    await h2.init();
    h2.Social.tryInviteFriend();
    await flush();
    assert.equal(h2.store.cloud_social.invited, '3000');
    // 网络失败不置标记 → 下次重试
    const h3 = clientHarness(null, { inviter: '4000', route: () => null });
    await h3.init();
    h3.Social.tryInviteFriend();
    await flush();
    assert.equal((h3.store.cloud_social || {}).invited || '', '');
    // 邀请者是自己 → 零调用
    const h4 = clientHarness(null, { inviter: '1000', route: () => ({ code: 0 }) });
    await h4.init();
    h4.Social.tryInviteFriend();
    await flush();
    assert.equal(h4.calls.length, 0);
});

test('client reportResult: 服务端拒绝(code5)走 warn 不抛错, 成功更新 record', async () => {
    const h = clientHarness(null, { route: () => ({ code: 5, msg: '未知 t: score' }) });
    await h.init();
    h.Social.reportResult(true, 'pve');
    await flush();
    const warn = h.logs.find(l => l.level === 'warn' && /战绩上报未成功/.test(l.args.join(' ')));
    assert.ok(warn, '失败上报必须 warn 留痕');
    assert.equal(h.Social.record.win, 0, '失败不得改本地战绩');
    h.setRoute(() => ({ code: 0, record: { win: 1, play: 1, last: 5, recent: [] } }));
    h.Social.reportResult(true, 'pvp');
    await flush();
    assert.equal(h.Social.record.win, 1);
});

test('client: 不再轮询云函数(startPolling 空实现), copyInvite 走 clipboard', async () => {
    const h = clientHarness(null, { route: () => ({ code: 0, social: { f: [], req: [], blk: [] }, mes: [], record: { win: 0, play: 0, last: 0, recent: [] } }) });
    await h.init();
    h.Social.startPolling();
    assert.equal(h.timers.length, 0, '不得用定时器轮询云函数');
    h.Social.stopPolling();
    let ok = null;
    h.Social.copyInvite(v => { ok = v; });
    await flush();
    assert.equal(ok, true);
});

// ==================== 对局邀请 ====================
test('invite: create/accept 满员/setroom 仅发起人/get', async () => {
    const h = harness(null, { rows: [mkUser(1000), mkUser(2000), mkUser(3000)] });
    const c = await call(h, 'invite', Object.assign(auth(1000), { action: 'create', mode: 'singles' }));
    assert.equal(c.code, 0);
    assert.equal(c.invite.need, 2);
    assert.deepEqual(c.invite.members, ['1000']);
    const a = await call(h, 'invite', Object.assign(auth(2000), { action: 'accept', inviter: '1000' }));
    assert.equal(a.code, 0);
    assert.equal(a.full, true);
    const full = await call(h, 'invite', Object.assign(auth(3000), { action: 'accept', inviter: '1000' }));
    assert.equal(full.code, 12);
    const sr = await call(h, 'invite', Object.assign(auth(1000), { action: 'setroom', inviter: '1000', room: 'r123' }));
    assert.equal(sr.code, 0);
    assert.equal(sr.invite.room, 'r123');
    const bad = await call(h, 'invite', Object.assign(auth(2000), { action: 'setroom', inviter: '1000', room: 'rX' }));
    assert.equal(bad.code, 2);
    const g = await call(h, 'invite', Object.assign(auth(2000), { action: 'get', inviter: '1000' }));
    assert.equal(g.invite.room, 'r123');
    const d = await call(h, 'invite', Object.assign(auth(1000), { action: 'create', mode: 'doubles' }));
    assert.equal(d.invite.need, 4);
});

test('client handlePending: 云兜底转发的 k 标签 JSON 载荷解析还原(chat/invite/invroom), 普通文本不误解析', async () => {
    const h = clientHarness(null, { route: () => ({ code: 0 }) });
    await h.init();
    h.Social.handlePending([
        { id: 'f1', from: '2000', text: JSON.stringify({ k: 'chat', id: 'f1', from: '2000', text: '转发你好', ts: 5 }), ts: 5, w: 0 },
        { id: 'f2', from: '2000', text: JSON.stringify({ k: 'invite', invite: { mode: 'doubles' } }), ts: 6, w: 0 },
        { id: 'f3', from: '2000', text: JSON.stringify({ k: 'invroom', room: 'RM9', inviteId: '2000' }), ts: 7, w: 0 },
        { id: 'f4', from: '2000', text: '普通文本', ts: 8, w: 0 },
    ]);
    await flush();
    const mes = h.Social.mes;
    assert.equal(mes.find(m => m.id === 'f1').text, '转发你好', 'chat 转发载荷须解析出 text');
    const f2 = mes.find(m => m.id === 'f2');
    assert.match(f2.text, /羽毛球双打/); assert.ok(f2.inv, 'invite 转发须保留 inv');
    const f3 = mes.find(m => m.id === 'f3');
    assert.equal(f3.room, 'RM9'); assert.equal(f3.invId, '2000');
    assert.equal(mes.find(m => m.id === 'f4').text, '普通文本', '普通文本不误解析');
});
