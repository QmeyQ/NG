'use strict';

// Offline only: node --test test/cloud-registration.test.cjs
// Execute the real business sources, not copies of their registration logic.
// Every business require is allowlisted; no real SDK, network, IDB, or DB is loaded.
// The in-memory DB deliberately has no transaction/CAS/uniqueness enforcement.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { inspect } = require('node:util');

const ROOT = path.resolve(__dirname, '..');
const SERVER_FILE = path.join(ROOT, 'server/te/user.js');
const CLIENT_FILE = path.join(ROOT, 'src/libs/server/cloud.ts');
const BUDGET = 1500;
const EPOCH = 1800000000000;
const serverSource = fs.readFileSync(SERVER_FILE, 'utf8');

function loadTypeScript() {
    // TS 7 at the repository root may expose only version.cjs, not the JS API.
    // Use an already-installed compiler only; never install or emit any files.
    for (const dir of ['node_modules/typescript', 'realtimeserver/node_modules/typescript']) {
        const candidate = path.join(ROOT, dir);
        if (!fs.existsSync(path.join(candidate, 'lib/typescript.js'))) continue;
        const ts = require(path.join(candidate, 'lib/typescript.js'));
        if (typeof ts.transpileModule === 'function') return ts;
    }
    throw new Error('Offline tests require a locally installed TypeScript transpileModule API');
}

const ts = loadTypeScript();
const transpiled = ts.transpileModule(fs.readFileSync(CLIENT_FILE, 'utf8'), {
    fileName: CLIENT_FILE,
    reportDiagnostics: true,
    compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        sourceMap: false,
        inlineSourceMap: false
    }
});
assert.deepEqual((transpiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error)
    .map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')), [], 'cloud.ts must transpile');

const coreSource = ts.transpileModule(fs.readFileSync(path.join(ROOT, 'src/libs/agcCore.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;

for (const wxEnv of [false, true]) {
    test(`transport: ${wxEnv ? 'WeChat keeps its allowed domain' : 'Web uses the verified Worker domain'} without registration retries`, async () => {
        const calls = [];
        let fail = false;
        const exports = {};
        vm.runInNewContext(coreSource, {
            exports,
            console: { error() {}, warn() {}, log() {} },
            require(name) {
                assert.equal(name, './wx');
                return {
                    wxEnv,
                    pFetch(url, init) {
                        calls.push({ url, init });
                        if (fail) return Promise.reject(new TypeError('Failed to fetch'));
                        return Promise.resolve({ status: 429, text: async () => JSON.stringify({ code: 7, msg: '稍后重试' }) });
                    }
                };
            }
        });
        const expected = wxEnv ? 'https://www.normalgame.cn/' : 'https://cloud.2998856667.workers.dev/';
        assert.equal(exports.AGC_PROXY, expected);
        const first = exports.agcRegister();
        assert.equal(exports.agcRegister(), first);
        assert.equal((await first).code, 7);
        await flushMicrotasks();
        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, expected + 'token');
        assert.equal(calls[0].init.method, 'POST');
        assert.deepEqual(JSON.parse(calls[0].init.body), { reg: true });
        fail = true;
        assert.equal(await exports.agcRegister(), null);
        await flushMicrotasks();
        assert.equal(calls.length, 2);
    });
}

const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}
const never = () => new Promise(() => {});

async function flushMicrotasks() {
    // Finite pumping also lets pre-fix, permanently pending handlers fail assertions
    // instead of hanging the test runner. Native promises are not replaced.
    for (let i = 0; i < 100; i++) await Promise.resolve();
}

class FakeClock {
    constructor() {
        this.now = 0;
        this.nextId = 1;
        this.pending = new Map();
        this.created = [];
        this.cleared = [];
        this.fired = [];
        this.setTimeout = (fn, ms = 0, ...args) => {
            assert.equal(typeof fn, 'function');
            const delay = Math.max(0, Number(ms) || 0);
            const handle = { id: this.nextId++, unref() { return this; }, ref() { return this; } };
            const task = { handle, at: this.now + delay, delay, fn, args };
            this.created.push(task);
            this.pending.set(handle, task);
            return handle;
        };
        this.clearTimeout = handle => {
            this.cleared.push(handle);
            this.pending.delete(handle);
        };
    }

    async advance(ms) {
        await flushMicrotasks();
        const target = this.now + ms;
        let steps = 0;
        for (;;) {
            const next = [...this.pending.values()].filter(task => task.at <= target)
                .sort((a, b) => a.at - b.at || a.handle.id - b.handle.id)[0];
            if (!next) break;
            assert.ok(++steps < 1000, 'unexpected timer/retry loop');
            this.now = next.at;
            this.pending.delete(next.handle);
            this.fired.push(next.handle);
            next.fn(...next.args);
            await flushMicrotasks();
        }
        this.now = target;
        await flushMicrotasks();
    }
}

function sandbox(t, source, filename, deps, clock) {
    const blocked = [];
    const logs = [];
    const deny = name => (...args) => {
        blocked.push(name);
        throw new Error('Offline harness blocked: ' + name);
    };
    const fakeConsole = Object.fromEntries(['log', 'info', 'warn', 'error', 'debug'].map(level =>
        [level, (...args) => logs.push({ level, args })]));
    class FakeDate extends Date {
        constructor(...args) { super(...(args.length ? args : [EPOCH + clock.now])); }
        static now() { return EPOCH + clock.now; }
    }
    let claimCounter = 0;
    const fakeMath = Object.create(Math);
    fakeMath.random = () => ++claimCounter / 10000;
    const module = { exports: {} };
    const context = vm.createContext({
        module,
        exports: module.exports,
        __filename: filename,
        __dirname: path.dirname(filename),
        require: name => Object.hasOwn(deps, name) ? deps[name] : deny('require ' + name)(),
        console: fakeConsole,
        Date: FakeDate,
        Math: fakeMath,
        process: { version: process.version, env: { GOBE_CLIENT_ID: 'offline-client', GOBE_APP_ID: 'offline-app' } },
        setTimeout: clock.setTimeout,
        clearTimeout: clock.clearTimeout,
        setInterval: deny('setInterval'),
        clearInterval: deny('clearInterval'),
        fetch: deny('fetch'),
        XMLHttpRequest: deny('XMLHttpRequest'),
        WebSocket: deny('WebSocket')
    }, { codeGeneration: { strings: false, wasm: false } });
    new vm.Script(source, { filename }).runInContext(context, { timeout: 1000 });
    t.after(() => assert.deepEqual(blocked, [], 'business code must not reach unmocked I/O'));
    return { exports: module.exports, logs, console: fakeConsole, deny };
}

const GOBE_RAW = { ok: true, token: 'offline-gobe-token', expiresIn: 3600 };
const GOBE = { token: 'offline-gobe-token', exp: 3600, clientId: 'offline-client', appId: 'offline-app' };
const FULL_ROW = {
    name: '', flag: '', bag: '{}', head: '', dollar: 0,
    secret: '', pass: '', social: '', history: '', record: '', mes: '', level: '', etc: ''
};
const AUDIT0 = String(EPOCH) + '0';   // 注册审计条目: 13 位 ms + op 0(行内 history)
const routes = [
    { name: 'auto', data: {}, id: '1000', firstRead: 2, readback: 3 },
    { name: 'explicit', data: { userid: 'chosen-id' }, id: 'chosen-id', firstRead: 1, readback: 2 }
];

const SHIELD_FILE = path.join(ROOT, 'server/te/shield.js');
const shieldSource = fs.readFileSync(SHIELD_FILE, 'utf8');

function serverHarness(t, options = {}) {
    const clock = new FakeClock();
    const rows = new Map([['_seq', { id: '_seq', etc: '1000' }]]);
    for (const row of options.rows || []) rows.set(String(row.id), copy(row));
    const trace = [];
    const writes = [];
    let dbOk = true;
    let gets = 0;
    let puts = 0;
    const db = {
        get dbOk() { return dbOk; },
        dbErr: () => 'offline injected DB failure',
        async dbGet(id) {
            id = String(id);
            const ordinal = ++gets;
            trace.push({ type: 'get', id, ordinal, at: clock.now });
            const fault = (options.getFaults || {})[ordinal] || {};
            const value = copy(Object.hasOwn(fault, 'value') ? fault.value : rows.get(id) || null);
            if (fault.wait) await fault.wait;
            dbOk = fault.ok !== false;
            if (fault.throw) throw new Error('offline DB get throw');
            return dbOk ? value : null;
        },
        // 最小写入契约: 整行直写, 无内部读(旧 dbPut 的二次读已消灭)
        async dbUpsert(row) {
            const id = String(row.id);
            const ordinal = ++puts;
            const write = { type: 'upsert', id, ordinal, fields: copy(row), at: clock.now };
            trace.push(write);
            writes.push(write);
            const fault = (options.putFaults || {})[ordinal] || {};
            dbOk = fault.ok !== false;
            if (fault.throw) throw new Error('offline DB upsert throw');
            if (!dbOk) return false;
            rows.set(id, copy(row));
            return true;
        },
        async dbPut(id, fields) {
            // 兼容保留: 新业务代码不应再走 dbPut(内部二次读)
            const oldRow = rows.get(String(id)) || {};
            return db.dbUpsert(Object.assign({}, oldRow, fields, { id: String(id) }));
        },
        async dbDel(id) {
            trace.push({ type: 'del', id: String(id), at: clock.now });
            dbOk = true;
            rows.delete(String(id));
            return true;
        },
        async dbTop() { dbOk = true; return []; },
        async dbByIds() { dbOk = true; return []; }
    };
    // 审计是纯函数: 加载真实 shield.js(零依赖), 不再 mock 异步 record
    const shieldLoaded = sandbox(t, shieldSource, SHIELD_FILE, {}, clock);
    const loaded = sandbox(t, serverSource, SERVER_FILE, {
        './code': { key: id => 'offline-key-' + id, keyOk: () => false },
        './db': db,
        './shield': shieldLoaded.exports,
        './gobe': {
            getGobeToken() {
                trace.push({ type: 'gobe', at: clock.now });
                return options.gobe ? options.gobe() : Promise.resolve(copy(GOBE_RAW));
            }
        }
    }, clock);
    return {
        clock, rows, trace, writes, logs: loaded.logs, shield: shieldLoaded.exports,
        invoke(data) {
            const run = { responses: [], finished: false, error: null, startedAt: clock.now };
            const work = loaded.exports.myHandler({ t: 'reg', d: data }, {}, body => {
                run.responses.push({ body, at: clock.now });
            }, loaded.console);
            Promise.resolve(work).then(() => { run.finished = true; }, error => { run.error = error; });
            return run;
        }
    };
}

function responseOf(h, run, code = 0) {
    assert.equal(run.error, null, 'handler must not reject');
    assert.equal(run.responses.length, 1, `registration must callback once by fake ${h.clock.now}ms`);
    assert.equal(run.finished, true, 'handler must finish instead of retaining a pending extras await');
    const { body, at } = run.responses[0];
    assert.equal(body.code, code);
    assert.equal(body.v, 'v1116a');
    assert.ok(at - run.startedAt <= BUDGET, 'post-commit extras exceeded the shared 1500ms budget');
    return copy(body);
}

function extrasStarted(h, route) {
    // 审计已合并进注册行 history(额外 DB 操作 = 0), 不再有独立 audit 往返
    const account = h.writes.find(x => x.id === route.id);
    assert.ok(account, 'account row must be written');
    assert.equal(account.fields.history, AUDIT0, 'registration audit must ride the account upsert');
    assert.equal(h.trace.filter(x => x.type === 'gobe').length, 1, 'GOBE must start without awaiting audit');
    if (route.name === 'auto') {
        const seq = h.trace.findIndex(x => x.type === 'upsert' && x.id === '_seq');
        assert.ok(seq >= 0);
        assert.ok(seq < h.trace.findIndex(x => x.type === 'gobe'), '_seq must advance before gobe');
    }
}

function timersClean(h) {
    assert.equal(h.clock.pending.size, 0, 'registration must leave no active timer');
    for (const task of h.clock.created) {
        assert.ok(h.clock.cleared.includes(task.handle), 'registration deadline must be cleared on every exit');
    }
}

for (const route of routes) {
    test(`server ${route.name}: success, complete new rows, credentials and sequence ordering`, async t => {
        const h = serverHarness(t);
        const run = h.invoke(route.data);
        await flushMicrotasks();
        const r = responseOf(h, run);
        assert.equal(r.key, 'offline-key-' + route.id);
        assert.deepEqual(r.user, {
            userid: route.id, name: '玩家' + route.id.slice(-4), flag: '美好的一天开始喽！',
            head: 'head/0.png', dollar: 1, bag: { 'head/0.png': 1 }
        });
        assert.deepEqual(r.gobe, GOBE);
        const account = h.writes.find(x => x.id === route.id);
        assert.ok(account);
        assert.match(account.fields.etc, /^1800000000000:[a-z0-9]+$/);
        assert.deepEqual(account.fields, {
            ...FULL_ROW, id: route.id, name: r.user.name, flag: r.user.flag, head: r.user.head,
            dollar: 1, bag: JSON.stringify(r.user.bag), etc: account.fields.etc, history: AUDIT0
        });
        assert.equal(h.rows.get(route.id).etc, account.fields.etc);
        if (route.name === 'auto') {
            assert.deepEqual(h.writes.find(x => x.id === '_seq').fields, { ...FULL_ROW, id: '_seq', etc: '1001' });
            assert.equal(h.rows.get('_seq').etc, '1001');
        } else {
            assert.equal(h.writes.length, 1, 'explicit registration must not allocate a sequence ID');
        }
        extrasStarted(h, route);
        timersClean(h);
        await h.clock.advance(10000);
        assert.equal(run.responses.length, 1);
    });

    test(`server ${route.name}: minimized DB operation budget (single read-write cycle per record)`, async t => {
        const h = serverHarness(t);
        const run = h.invoke(route.data);
        await flushMicrotasks();
        responseOf(h, run);
        const ops = h.trace.filter(x => x.type !== 'gobe').map(x => [x.type, x.id]);
        if (route.name === 'explicit') {
            // 查存在 → 整行直写(含审计) → 认领回读 = 3 次, 单记录
            assert.deepEqual(ops, [['get', route.id], ['upsert', route.id], ['get', route.id]]);
        } else {
            // 冷启: seq 查 → 存在查 → 直写 → 认领回读 → seq 直写 = 5 次
            assert.deepEqual(ops, [
                ['get', '_seq'], ['get', '1000'], ['upsert', '1000'], ['get', '1000'], ['upsert', '_seq']
            ]);
        }
        assert.equal(h.writes.length, route.name === 'auto' ? 2 : 1);
        timersClean(h);
    });

    for (const [name, gobe] of [
        ['reject', () => Promise.reject(new Error('offline GOBE reject'))],
        ['null', () => Promise.resolve(null)],
        ['not ok', () => Promise.resolve({ ok: false })]
    ]) {
        test(`server ${route.name}: GOBE ${name} returns successful registration with null gobe`, async t => {
            const h = serverHarness(t, { gobe });
            const run = h.invoke(route.data);
            await flushMicrotasks();
            assert.equal(responseOf(h, run).gobe, null);
            extrasStarted(h, route);
            timersClean(h);
        });
    }

    test(`server ${route.name}: never-settling GOBE expires at 1500ms, not earlier`, async t => {
        const h = serverHarness(t, { gobe: never });
        const run = h.invoke(route.data);
        await h.clock.advance(BUDGET - 1);
        assert.ok(h.rows.has(route.id), 'account should already be committed');
        assert.equal(run.responses.length, 0, 'the full extras budget must remain available');
        await h.clock.advance(1);
        assert.equal(responseOf(h, run).gobe, null);
        assert.equal(run.responses[0].at, BUDGET);
        extrasStarted(h, route);
        timersClean(h);
    });

    test(`server ${route.name}: resolving GOBE early cancels the deadline`, async t => {
        const token = deferred();
        const h = serverHarness(t, { gobe: () => token.promise });
        const run = h.invoke(route.data);
        await flushMicrotasks();
        extrasStarted(h, route);
        assert.ok(h.clock.created.some(x => x.delay === BUDGET), 'install a 1500ms deadline');
        await h.clock.advance(400);
        token.resolve(copy(GOBE_RAW));
        await flushMicrotasks();
        assert.deepEqual(responseOf(h, run).gobe, GOBE);
        assert.equal(run.responses[0].at, 400, 'do not wait for a deadline after extras finish');
        timersClean(h);
        await h.clock.advance(10000);
        assert.deepEqual(h.clock.fired, [], 'cancelled deadline must never fire');
        assert.equal(run.responses.length, 1);
    });

    for (const late of ['resolve', 'reject']) {
        test(`server ${route.name}: late GOBE ${late} cannot reply again or mutate the response`, async t => {
            const token = deferred();
            const h = serverHarness(t, { gobe: () => token.promise });
            const run = h.invoke(route.data);
            await h.clock.advance(BUDGET);
            const before = responseOf(h, run);
            assert.equal(before.gobe, null);
            timersClean(h);
            if (late === 'resolve') token.resolve(copy(GOBE_RAW));
            else token.reject(new Error('offline late GOBE rejection'));
            await h.clock.advance(10000);
            assert.equal(run.responses.length, 1);
            assert.deepEqual(copy(run.responses[0].body), before);
            timersClean(h);
        });
    }

    const dbFaults = [
        ['existence read false', { getFaults: { [route.firstRead]: { ok: false } } }],
        ['existence read throw', { getFaults: { [route.firstRead]: { throw: true } } }],
        ['account write false', { putFaults: { 1: { ok: false } } }],
        ['account write throw', { putFaults: { 1: { throw: true } } }],
        ['claim readback false', { getFaults: { [route.readback]: { ok: false } } }]
    ];
    if (route.name === 'auto') dbFaults.push(['sequence read false', { getFaults: { 1: { ok: false } } }]);
    for (const [name, options] of dbFaults) {
        test(`server ${route.name}: DB ${name} must not report registration success`, async t => {
            const h = serverHarness(t, options);
            const run = h.invoke(route.data);
            await flushMicrotasks();
            const r = responseOf(h, run, 5);
            assert.equal(r.key, undefined);
            assert.equal(r.user, undefined);
            assert.equal(h.trace.filter(x => x.type === 'gobe').length, 0);
            assert.equal(h.writes.filter(x => x.id === '_seq').length, 0);
            timersClean(h);
        });
    }

    test(`server ${route.name}: lost claim is rejected or moves to the next ID`, async t => {
        const h = serverHarness(t, {
            getFaults: { [route.readback]: { value: { id: route.id, etc: 'another-claim' } } }
        });
        const run = h.invoke(route.data);
        await flushMicrotasks();
        if (route.name === 'explicit') {
            responseOf(h, run, 6);
            assert.equal(h.trace.filter(x => x.type === 'gobe').length, 0);
        } else {
            assert.equal(responseOf(h, run).user.userid, '1001');
            const account = h.writes.find(x => x.id === '1001');
            assert.equal(account.fields.history, AUDIT0, 'audit rides the winning account row');
            assert.equal(h.rows.get('_seq').etc, '1002');
        }
        timersClean(h);
    });

    test(`server ${route.name}: known non-atomic stale reads can still yield two successes (characterization)`, async t => {
        // This intentionally documents the existing race, NOT a concurrency fix.
        const staleRead = deferred();
        const h = serverHarness(t, { getFaults: { [route.firstRead]: { wait: staleRead.promise } } });
        const delayed = h.invoke({ ...route.data, name: 'delayed writer' });
        await flushMicrotasks();
        assert.equal(delayed.responses.length, 0);
        const first = h.invoke({ ...route.data, name: 'first writer' });
        await flushMicrotasks();
        const a = responseOf(h, first);
        staleRead.resolve();
        await flushMicrotasks();
        const b = responseOf(h, delayed);
        assert.equal(a.user.userid, b.user.userid, 'the mock must not invent atomic ID allocation');
        assert.equal(h.rows.get(route.id).name, 'delayed writer');
        assert.equal(a.key, b.key);
        timersClean(h);
    });
}

test('server auto: warm seqHint skips the sequence read on the next registration', async t => {
    const h = serverHarness(t);
    const first = h.invoke({});
    await flushMicrotasks();
    assert.equal(responseOf(h, first).user.userid, '1000');
    const mark = h.trace.length;
    const second = h.invoke({});
    await flushMicrotasks();
    assert.equal(responseOf(h, second).user.userid, '1001');
    const ops = h.trace.slice(mark).filter(x => x.type !== 'gobe').map(x => [x.type, x.id]);
    // 热实例: 存在查 → 直写 → 认领回读 → seq 直写 = 4 次(省 seq 查)
    assert.deepEqual(ops, [['get', '1001'], ['upsert', '1001'], ['get', '1001'], ['upsert', '_seq']]);
    assert.equal(h.rows.get('_seq').etc, '1002');
    timersClean(h);
});

test('server explicit: an already-existing ID returns code 6 without any writes or extras', async t => {
    const existing = { id: 'chosen-id', name: 'untouched', etc: 'old-claim' };
    const h = serverHarness(t, { rows: [existing] });
    const run = h.invoke({ userid: existing.id, name: 'replacement' });
    await flushMicrotasks();
    responseOf(h, run, 6);
    assert.deepEqual(h.rows.get(existing.id), existing);
    assert.deepEqual(h.writes, []);
    assert.equal(h.trace.length, 1);
    timersClean(h);
});

test('server auto: _seq write false after account commit still returns success before hanging extras expire', async t => {
    const h = serverHarness(t, { putFaults: { 2: { ok: false } }, gobe: never });
    const run = h.invoke({});
    await h.clock.advance(BUDGET);
    const r = responseOf(h, run);
    assert.equal(r.user.userid, '1000');
    assert.equal(r.gobe, null);
    assert.ok(h.rows.has('1000'));
    assert.equal(h.rows.get('_seq').etc, '1000', 'failed sequence write must not be mocked as committed');
    assert.equal(h.writes.filter(x => x.id === '1000').length, 1);
    extrasStarted(h, routes[0]);
    timersClean(h);
});

const SECRET_KEY = 'TEST_ONLY_KEY_DO_NOT_LOG';
const SECRET_TOKEN = 'TEST_ONLY_TOKEN_DO_NOT_LOG';
const SECRET_GOBE = 'TEST_ONLY_GOBE_DO_NOT_LOG';
function registrationResult() {
    return {
        code: 0, key: SECRET_KEY, token: SECRET_TOKEN, exp: 3600,
        user: { userid: '1042', name: 'fixture player', flag: 'fixture flag', head: 'head/0.png', dollar: 0, bag: { 'head/0.png': 2 } },
        gobe: { token: SECRET_GOBE, exp: 3600 }
    };
}

function clientHarness(t, local = null) {
    const clock = new FakeClock();
    const registrations = [];
    const reads = [];
    const writes = [];
    const pendingReads = [];
    const pendingWrites = [];
    const persisted = new Map(local ? [['cloud_user', copy(local)]] : []);
    const prohibited = [];
    const deny = name => () => {
        prohibited.push(name);
        throw new Error('Offline client dependency blocked: ' + name);
    };
    class IDBStorage {
        get(key, cb) { reads.push(key); pendingReads.push({ key, cb }); }
        set(key, value, cb) {
            const write = { key, value: copy(value), cb };
            writes.push(write);
            pendingWrites.push(write);
        }
        delete() { deny('IDB.delete')(); }
        clear() { deny('IDB.clear')(); }
    }
    const loaded = sandbox(t, transpiled.outputText, CLIENT_FILE, {
        '../time': { Timer: { setTimeout: (ms, fn) => clock.setTimeout(fn, ms), clear: clock.clearTimeout } },
        '../IDBStorage': { IDBStorage },
        '../wx': { wxEnv: false, pFetch: deny('pFetch') },
        '../agcCore': {
            AGC_PROXY: 'https://offline.invalid/',
            agcRegister: (...args) => {
                const request = { ...deferred(), args };
                registrations.push(request);
                return request.promise;
            },
            isLimitedRes: r => !!r && [7, 8, 10].includes(Number(r.code)),
            parseWorkerRes: deny('parseWorkerRes'),
            seedGobe: deny('seedGobe')
        },
        '../agcWeb': { webCall: deny('webCall'), webReady: deny('webReady') },
        '../agcWx': { wxCall: deny('wxCall') }
    }, clock);
    t.after(() => assert.deepEqual(prohibited, [], 'reg/init must use only mocked agcRegister and IDB'));
    return {
        Cloud: loaded.exports.Cloud, logs: loaded.logs, clock, registrations, reads, writes, persisted,
        respond(value, index = registrations.length - 1) {
            assert.ok(registrations[index], 'agcRegister was not called');
            registrations[index].resolve(value);
        },
        reject(error, index = registrations.length - 1) { registrations[index].reject(error); },
        finishRead() {
            assert.equal(pendingReads.length, 1);
            const read = pendingReads.shift();
            read.cb(copy(persisted.get(read.key) || null));
        },
        finishSave() {
            assert.equal(pendingWrites.length, 1);
            const write = pendingWrites.shift();
            persisted.set(write.key, copy(write.value));
            write.cb();
        }
    };
}

async function assertNoRetry(h, expectedCalls = 1) {
    await h.clock.advance(60000);
    assert.equal(h.registrations.length, expectedCalls, 'registration must never automatically retry');
    assert.equal(h.clock.created.length, 0, 'registration must not schedule delayed retries');
    assert.equal(h.clock.pending.size, 0);
    for (const request of h.registrations) assert.deepEqual(request.args, [], 'registration does not reuse existing auth');
}

function assertNoSecrets(h) {
    const logged = inspect(h.logs, { depth: 20 });
    for (const secret of [SECRET_KEY, SECRET_TOKEN, SECRET_GOBE, 'TEST_ONLY_CLIENT_SECRET']) {
        assert.ok(!logged.includes(secret), 'console output must not contain fixture secret: ' + secret);
    }
}

test('client: concurrent reg shares one agcRegister and one save, completing every callback', async t => {
    const h = clientHarness(t);
    const calls = [];
    for (let i = 0; i < 5; i++) {
        h.Cloud.reg(u => {
            calls.push({ i, u });
            if (i === 1) throw new Error('offline consumer callback throws');
        });
    }
    h.Cloud.reg();
    assert.equal(h.registrations.length, 1);
    h.respond(registrationResult());
    await flushMicrotasks();
    assert.equal(h.writes.length, 1);
    assert.deepEqual(calls, [], 'callbacks must wait for the local save callback');
    h.finishSave();
    await flushMicrotasks();
    assert.deepEqual(calls.map(x => x.i), [0, 1, 2, 3, 4]);
    assert.ok(calls.every(x => x.u === h.Cloud.getUser()));
    assert.equal(h.Cloud.getUser().userid, '1042');
    await assertNoRetry(h);
    assert.equal(calls.length, 5);
    assertNoSecrets(h);
});

test('client: successful registration persists the local identity without token/secret extras', async t => {
    const h = clientHarness(t);
    h.Cloud.lastMsg = 'old failure';
    const calls = [];
    h.Cloud.reg(u => calls.push(u));
    h.respond(registrationResult());
    await flushMicrotasks();
    const expected = {
        userid: '1042', key: SECRET_KEY, name: 'fixture player', flag: 'fixture flag',
        head: 'head/0.png', dollar: 0, bag: { 'head/0.png': 2 }, bagSynced: true
    };
    assert.equal(h.writes.length, 1);
    assert.equal(h.writes[0].key, 'cloud_user');
    assert.deepEqual(h.writes[0].value, expected);
    assert.equal(h.persisted.has('cloud_user'), false);
    h.finishSave();
    assert.deepEqual(h.persisted.get('cloud_user'), expected);
    assert.deepEqual(copy(calls), [expected]);
    assert.equal(h.Cloud.lastMsg, '');
    await assertNoRetry(h);
    assertNoSecrets(h);
});

test('client: successful minimal user normalizes userid and keeps existing field defaults', async t => {
    const h = clientHarness(t);
    const calls = [];
    h.Cloud.reg(u => calls.push(u));
    h.respond({ code: 0, key: SECRET_KEY, user: { userid: 42 } });
    await flushMicrotasks();
    h.finishSave();
    assert.deepEqual(copy(calls), [{
        userid: '42', key: SECRET_KEY, name: '玩家42', flag: '美好的一天开始喽！',
        head: '', dollar: 1, bag: {}, bagSynced: true
    }]);
    await assertNoRetry(h);
});

for (const code of [7, 8, 10]) {
    for (const withMsg of [true, false]) {
        test(`client: rate limit ${code} ${withMsg ? 'preserves server hint' : 'has fallback hint'} without retry`, async t => {
            const h = clientHarness(t);
            const calls = [];
            h.Cloud.reg(u => calls.push(u));
            h.Cloud.reg(u => calls.push(u));
            const result = { code, retryAfter: 60 };
            if (withMsg) result.msg = '请等待 60 秒后再试';
            h.respond(result);
            await flushMicrotasks();
            assert.deepEqual(calls, [null, null]);
            assert.equal(h.Cloud.getUser(), null);
            assert.equal(h.writes.length, 0);
            if (withMsg) assert.equal(h.Cloud.lastMsg, result.msg);
            else assert.match(h.Cloud.lastMsg, /失败|频繁|重试/);
            await assertNoRetry(h);
            assert.equal(calls.length, 2);
        });
    }
}

for (const failure of ['network null', 'network rejection']) {
    test(`client: ${failure} gives a useful hint and never retries`, async t => {
        const h = clientHarness(t);
        const calls = [];
        h.Cloud.reg(u => calls.push(u));
        h.Cloud.reg(u => calls.push(u));
        if (failure === 'network null') h.respond(null);
        else h.reject(new Error('offline network rejection'));
        await flushMicrotasks();
        assert.deepEqual(calls, [null, null]);
        assert.match(h.Cloud.lastMsg, /网络/);
        assert.equal(h.Cloud.getUser(), null);
        assert.equal(h.writes.length, 0);
        await assertNoRetry(h);
    });
}

for (const [name, change, missingUserid] of [
    ['missing key', r => { delete r.key; }, false],
    ['empty key', r => { r.key = ''; }, false],
    ['missing user', r => { delete r.user; }, false],
    ['null user', r => { r.user = null; }, false],
    ['missing userid', r => { delete r.user.userid; }, true],
    ['empty userid', r => { r.user.userid = ''; }, true],
    ['null userid', r => { r.user.userid = null; }, true]
]) {
    test(`client: ${name} rejects the response with a hint and never persists it`, async t => {
        const h = clientHarness(t);
        const calls = [];
        h.Cloud.reg(u => calls.push(u));
        const r = registrationResult();
        change(r);
        h.respond(r);
        await flushMicrotasks();
        assert.deepEqual(calls, [null]);
        assert.equal(h.Cloud.getUser(), null);
        assert.equal(h.writes.length, 0);
        assert.equal(h.persisted.has('cloud_user'), false);
        assert.ok(h.Cloud.lastMsg.trim(), 'malformed registration must not leave lastMsg blank');
        if (missingUserid) assert.match(h.Cloud.lastMsg, /用户编号|userid/i, 'missing userid needs an explicit diagnostic');
        await assertNoRetry(h);
        assertNoSecrets(h);
    });
}

test('client: registration failure logs only the code, never the full response or credentials', async t => {
    const h = clientHarness(t);
    const r = {
        ...registrationResult(), code: 11, msg: 'offline upstream failure',
        credentials: { client_secret: 'TEST_ONLY_CLIENT_SECRET' }
    };
    h.Cloud.reg();
    h.respond(r);
    await flushMicrotasks();
    const errors = h.logs.filter(x => x.level === 'error');
    assert.equal(errors.length, 1);
    assert.equal(errors[0].args.length, 2, 'failure log should contain a label and only the code');
    assert.equal(typeof errors[0].args[0], 'string');
    assert.equal(errors[0].args[1], 11);
    assertNoSecrets(h);
    assert.equal(h.Cloud.lastMsg, r.msg);
    await assertNoRetry(h);
});

test('client: failed registration releases its single-flight state for a later manual request', async t => {
    const h = clientHarness(t);
    const oldCalls = [];
    h.Cloud.reg(u => oldCalls.push(u));
    h.respond(null);
    await flushMicrotasks();
    await assertNoRetry(h);
    const newCalls = [];
    h.Cloud.reg(u => newCalls.push(u));
    assert.equal(h.registrations.length, 2);
    h.respond(registrationResult());
    await flushMicrotasks();
    h.finishSave();
    assert.deepEqual(oldCalls, [null]);
    assert.equal(newCalls.length, 1);
    assert.equal(newCalls[0].userid, '1042');
    assert.equal(h.Cloud.lastMsg, '');
    await assertNoRetry(h, 2);
});

test('client: concurrent init reuses a valid local account without registering or rewriting storage', async t => {
    const local = {
        userid: 'local-id', key: SECRET_KEY, name: 'local player', flag: '',
        head: '', dollar: 9, bag: {}, bagSynced: false
    };
    const h = clientHarness(t, local);
    const calls = [];
    for (let i = 0; i < 3; i++) h.Cloud.init((u, from) => calls.push({ u, from }));
    assert.deepEqual(h.reads, ['cloud_user']);
    assert.equal(calls.length, 0);
    h.finishRead();
    await flushMicrotasks();
    assert.equal(calls.length, 3);
    assert.ok(calls.every(x => x.from === 'local' && x.u === h.Cloud.getUser()));
    assert.deepEqual(copy(h.Cloud.getUser()), local);
    assert.equal(h.writes.length, 0);
    await assertNoRetry(h, 0);
    assertNoSecrets(h);
});

for (const [name, local] of [
    ['no local record', null],
    ['local missing key', { userid: 'invalid-local' }],
    ['local missing userid', { key: SECRET_KEY }]
]) {
    test(`client: init with ${name} coalesces initialization and registration callbacks`, async t => {
        const h = clientHarness(t, local);
        const calls = [];
        for (let i = 0; i < 3; i++) h.Cloud.init((u, from) => calls.push({ u, from }));
        assert.deepEqual(h.reads, ['cloud_user']);
        h.finishRead();
        const direct = [];
        h.Cloud.reg(u => direct.push(u));
        assert.equal(h.registrations.length, 1);
        h.respond(registrationResult());
        await flushMicrotasks();
        assert.equal(calls.length, 0);
        h.finishSave();
        assert.equal(calls.length, 3);
        assert.ok(calls.every(x => x.from === 'reg' && x.u === h.Cloud.getUser()));
        assert.equal(direct.length, 1);
        assert.equal(direct[0], h.Cloud.getUser());
        assert.equal(h.writes.length, 1);
        await assertNoRetry(h);
        assertNoSecrets(h);
    });
}
