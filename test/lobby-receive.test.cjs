'use strict';
// Offline only: node --test test/lobby-receive.test.cjs
// 锁定 GOBE 接收侧契约: SDK onRecvFromClient 不带 imType, 故 lobby 必须走 Gnet.onClient(catch-all)
// + 载荷 k 标签分发(chat/invite/invroom/freq/facc), 且忽略 PVP 信封(kind=...)。回归 guards。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const ts = require(path.join(ROOT, 'realtimeserver/node_modules/typescript/lib/typescript.js'));
const lobbySrc = fs.readFileSync(path.join(ROOT, 'src/libs/server/lobby.ts'), 'utf8');
const lobbyCjs = ts.transpileModule(lobbySrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;

function setup() {
    const clientCbs = [];      // Gnet.onClient 注册的回回调
    const onMessageCalls = []; // 若 lobby 误用 onMessage 会被记录
    const sinks = { chat: [], freq: 0, sync: 0, group: [], cloud: [] };
    const sent = [];           // Gnet.sendToClient 记录
    const teWrites = [];
    const Gnet = {
        onClient: cb => clientCbs.push(cb),
        onMessage: (t, cb) => onMessageCalls.push(t),
        off: () => { },
        checkInitialized: () => true,
        getRoom: () => ({ id: 'R1' }),
        getPlayers: () => [{ playerId: 'pB', customPlayerProperties: JSON.stringify({ userid: 'B' }) }],
        getAvailableRooms: (cb) => cb(null, { rooms: [{ id: 'R1', playerCount: 2, customRoomProperties: JSON.stringify({ kind: 'lobby', region: '华东' }) }] }),
        joinRoom: (id, cb) => cb(null),
        createRoom: (n, m, cb) => cb(null, { id: 'R1' }),
        leaveRoom: cb => cb && cb(),
        updatePlayerProperties: (o, cb) => cb && cb(null),
        sendToClient: (type, msg, recv) => sent.push({ type, msg, recv }),
        ensureBridge: () => { },
        chatType: 190, ROUTE_ALL: 0, ROUTE_OTHERS: 1, ROUTE_TARGET: 2,
    };
    const deps = {
        '../gobe/net': { Gnet },
        '../time': { Timer: { setTimeout: () => 'tid', clear: () => { } } },
        '../netboot': { ensure: (a, cb) => cb() },
        './cloud': { Cloud: { getUser: () => ({ userid: 'A', key: 'k', head: '', name: 'A' }), teWrite: (t, d, cb) => { teWrites.push({ t, d }); if (t === 'lobbygroup') cb && cb({ code: 0, gid: 'globbyHD', name: '华东区大厅', oldLobbyGids: [] }); else cb && cb({ code: 0 }); }, teSafe: (t, d, cb) => cb && cb({ code: 0 }) } },
    };
    const module = { exports: {} };
    const lsStore = {};
    const localStorage = { getItem: k => (k in lsStore ? lsStore[k] : null), setItem: (k, v) => { lsStore[k] = String(v); }, removeItem: k => { delete lsStore[k]; } };
    const ctx = vm.createContext({ module, exports: module.exports, require: n => Object.hasOwn(deps, n) ? deps[n] : (() => { throw new Error('blocked ' + n); })(), console, window: {}, localStorage, setTimeout, clearTimeout, Intl, Date, Math, JSON, String, Number, Array, Object });
    new vm.Script(lobbyCjs, { filename: 'lobby.js' }).runInContext(ctx);
    const Lobby = module.exports;
    Lobby.setSinks({
        chat: m => sinks.chat.push(m),
        freq: () => sinks.freq++,
        sync: () => sinks.sync++,
        cloud: (t, p, cb, gid) => { sinks.cloud.push({ t, p, gid }); cb && cb(true); },
        group: (gid, name, old) => sinks.group.push({ gid, name, old }),
        roomOf: () => 'R1',
    });
    return { Lobby, clientCbs, onMessageCalls, sinks, sent, teWrites };
}
function feed(clientCbs, obj) { const info = { sendPlayerId: 'pB', msg: typeof obj === 'string' ? obj : JSON.stringify(obj) }; clientCbs.forEach(cb => cb(info)); }

test('lobby 接收走 onClient catch-all, 不用 onMessage(type)', async () => {
    const { Lobby, clientCbs, onMessageCalls } = setup();
    await new Promise(r => Lobby.ensure(() => r()));
    assert.ok(clientCbs.length >= 1, 'must register onClient');
    assert.equal(onMessageCalls.length, 0, 'must NOT use onMessage(type) — SDK 不回传 imType');
});

test('chat/invite/invroom/freq/facc 正确分发; PVP 信封与非 JSON 被忽略', async () => {
    const { Lobby, clientCbs, sinks } = setup();
    await new Promise(r => Lobby.ensure(() => r()));
    feed(clientCbs, { k: 'chat', id: 'm1', from: 'B', text: 'hi', ts: 5 });
    feed(clientCbs, { k: 'invite', id: 'i1', from: 'B', invite: { mode: 'doubles' } });
    feed(clientCbs, { k: 'invroom', id: 'r1', from: 'B', room: 'RM', inviteId: 'B' });
    feed(clientCbs, { k: 'freq', from: 'B' });
    feed(clientCbs, { k: 'facc', from: 'B' });
    feed(clientCbs, { kind: 'role_assign', v: 1, from: 'B' }); // PVP 信封: 忽略
    feed(clientCbs, 'not-json');                                 // 非 JSON: 忽略
    assert.equal(sinks.chat.length, 3, 'chat+invite+invroom 三条进 chatSink');
    assert.equal(sinks.chat[0].text, 'hi');
    assert.match(sinks.chat[1].text, /羽毛球双打/);
    assert.equal(sinks.chat[2].room, 'RM');
    assert.equal(sinks.freq, 1);
    assert.equal(sinks.sync, 1, 'facc 触发 syncSink');
});

test('notifyFriendAccept 向同房申请方点对点发 facc', async () => {
    const { Lobby, sent } = setup();
    await new Promise(r => Lobby.ensure(() => r()));
    Lobby.notifyFriendAccept('B');
    const f = sent.find(s => { try { return JSON.parse(s.msg).k === 'facc'; } catch (e) { return false; } });
    assert.ok(f, 'must send facc');
    assert.equal(f.recv.length, 1); assert.equal(f.recv[0], 'pB', '点对点 recvPlayerIdList');
});

test('sendRaw 路由模式: 群广播=1(ROUTE_OTHERS), 点对点=2(ROUTE_TARGET); 绝不用 190(会 102016)', async () => {
    const { Lobby, sent } = setup();
    await new Promise(r => Lobby.ensure(() => r()));
    sent.length = 0;
    Lobby.sendRaw('B', JSON.stringify({ k: 'chat', from: 'A', text: 'x' }), () => { }, 'globbyHD'); // 群广播
    Lobby.sendRaw('B', JSON.stringify({ k: 'chat', from: 'A', text: 'y' }), () => { });            // 点对点
    const bc = sent[0], pp = sent[1];
    assert.equal(bc.type, 1, '群广播必须 type=1');
    assert.equal(pp.type, 2, '点对点必须 type=2');
    assert.equal(pp.recv[0], 'pB');
    assert.ok(sent.every(s => s.type !== 190), '不得使用 chatType=190 作路由');
});

test('setroom 最小写入: 首次进大区房写一次, 同大区房重进复用本地记录不重复写', async () => {
    const { Lobby, teWrites } = setup();
    await new Promise(r => Lobby.ensure(() => r()));
    assert.equal(teWrites.filter(x => x.t === 'setroom').length, 1, '首次进大区房写一次 setroom');
    assert.equal(teWrites.filter(x => x.t === 'lobbygroup').length, 1, '首次建/取大厅群一次');
    await new Promise(r => Lobby.rejoin(() => r())); // 重进同一房间
    assert.equal(teWrites.filter(x => x.t === 'setroom').length, 1, '同大区房复用本地记录, 不重复 setroom');
    assert.equal(teWrites.filter(x => x.t === 'lobbygroup').length, 1, '同房复用本地群记录, 不重复 lobbygroup');
});
