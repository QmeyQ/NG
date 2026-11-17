/**
 * te/user.js - 用户体系 + 社交云函数 handler(AGC Node.js)
 *
 * 请求(经 Worker 代理 data): { t: "reg"|"agt"|"user"|"bag"|"set"|"buy"|"del"
 *                              |"find"|"friend"|"msg"|"sync"|"mes"|"rank"|"score"|"profiles", d: {...} }
 *
 * ── 最小写入契约(按量付费, 每请求单记录"一查一写") ──
 *   业务分支先 dbGet 拿旧行 → 内存合并字段(审计 history 由 shield.append 纯函数追加)
 *   → dbUpsert 整行直写一次。不再使用 dbPut 的"内部再读一次"。
 *   bag/user/set/buy/score/friend(自己)/mes = 1 查 + 1 写; del = 1 查 + 1 删;
 *   find/sync/rank/profiles = 1 查(纯读不审计); friend request/msg = 查对方 + 写对方(2 次);
 *   friend accept/remove = 双方各一查一写(4 次, 每条记录仍单次循环)。
 *   reg: 冷启 5 次(seq 查/存在查/直写/认领回读/seq 直写), 热实例 seqHint 缓存省 seq 查 = 4 次;
 *        撞号/认领失败才重读 seq 追赶(尽力而为, 不写回踩号)。
 *   审计合并进用户行 history(13 位 ms+op, 逗号分隔, 24h 裁剪/120 条上限), 额外 DB 操作 = 0。
 *   写别人行不追加对方 history(防刷爆受害者风控计数); 删行后无审计(IP 闸门兜底)。
 *   并发取舍: 读-合并-写非原子, 末写覆盖(审计丢条目/业务字段)为已知边界, 认领令牌保注册唯一。
 *
 * ── 社交数据(全落 NG 既有字段, 不改控制台对象类型) ──
 *   social(JSON): {f:[userid], req:[{id,ts}], blk:[id]}  上限 200/50/50
 *   mes(JSON):    收件箱 [{id,from,text,ts}]  上限 50 条, 每条 ≤200 字, 超限裁最旧
 *   record(JSON): {win,play,last,recent:[{w,m,ts}]}  recent ≤10, 上报冷却 30s
 *   level(String): 胜场零填充 10 位(已建索引 → rank 一次 orderByDesc 查询)
 *
 * 登录/注册一并下发联机凭据: reg 与 bag(d.gt=1) 的响应带 gobe{token,exp,clientId,appId}。
 * 换发失败只是省略 gobe 字段, 登录/注册照常成功(客户端回退单独取)。
 *
 * 密匙体系(见 code.js): key = code.key(userid) 确定性, 认证纯计算不查库。
 *
 * 错误码: 0成功 1用户不存在 2认证失败 3背包数量不足 4金币不足 5参数/存储/内部 6已注册
 *         11上游(GOBE)异常 12社交条件不满足(msg 带原因)
 *
 * gt / gprobe 分支需要函数环境变量: GOBE_CLIENT_ID / GOBE_CLIENT_SECRET / GOBE_APP_ID
 */
const code = require('./code');
const shield = require('./shield');
let db = null;
let gobe = null;

/** 必须是 ui 包 head/ 下真实存在的文件(旧值 head/0101.png 属已弃用的 30 张头像包) */
const DEFAULT_HEAD = 'head/0.png';
const DEFAULT_FLAG = '美好的一天开始喽！';
const SEQ_ROW = '_seq';
const CODE_V = 'v1116a';

// ---- 社交容量/风控常量 ----
const MAX_FRIENDS = 200;
const MAX_REQUESTS = 50;
const MAX_MES = 50;
const MES_TEXT_MAX = 200;
const MAX_RECENT = 10;
const SCORE_COOLDOWN_MS = 30000;
const MAX_PRICE = 500;
const DEFAULT_PRICE = 1;
const MAX_GROUP_MEMBERS = 20;
/** 屏蔽词: 命中则消息标记 w=1, 客户端渲染红色(仍转交, 不拦截) */
const BLOCKED_WORDS = ['傻逼', '煞笔', '操你', '草你', '妈的', '他妈', '垃圾', '滚蛋', '去死', '废物', '脑残', '智障'];
function hasBlocked(text) {
    const t = String(text || '');
    for (const w of BLOCKED_WORDS) if (t.indexOf(w) >= 0) return true;
    return false;
}
/** 群行主键: grp:<gid>; gid 形如 g<ts><rand> */
function groupKey(gid) { return 'grp:' + String(gid); }
function validGid(g) { return /^g[A-Za-z0-9]{1,24}$/.test(String(g || '')); }
const RANK_MAX = 50;

/** seq 热缓存: 实例存活期间记住已推进的序号, 省每次注册的 seq 查(冷启/撞号才重读) */
let seqHint = 0;

/** 注册认领令牌: 前段是 ctime(rowToUser parseInt 取前段), 随机后缀区分并发写入者 */
function claimToken() {
    return Date.now() + ':' + Math.random().toString(36).slice(2);
}

/**
 * 新建行字段补全: 注册是唯一"新建 CloudDB 行"的路径, 行里缺的字段(secret/pass/social/
 * history/record/mes/level 等)若在控制台对象类型里是非空, upsert 会直接失败。全字段给安全默认值。
 */
function fullRow(fields) {
    return Object.assign({
        name: '', flag: '', bag: '{}', head: '', dollar: 0,
        secret: '', pass: '', social: '', history: '', record: '', mes: '', level: '', etc: ''
    }, fields || {});
}

function out(code, extra) {
    return Object.assign({ code: code, v: CODE_V }, extra || {});
}

/** NG 行 → 客户端 user 对象 */
function rowToUser(row) {
    let bag = {};
    try { bag = JSON.parse(row.bag || '{}'); } catch (e) { }
    return {
        userid: row.id,
        name: row.name || '',
        flag: row.flag || '',
        head: row.head || '',
        dollar: row.dollar || 0,
        bag: bag,
        ctime: parseInt(row.etc || '0', 10) || undefined
    };
}

function rowBag(row) {
    try { return JSON.parse(row.bag || '{}'); } catch (e) { return {}; }
}

/** Dollar 货币商品: 金币 +5, 不消耗金币 */
function isDollarItem(p) {
    return /(^|\/)dollar\.png$/i.test(String(p || ''));
}

/** 纯计算认证: 不查库 */
function authOk(userid, key) {
    return code.keyOk(String(userid), String(key || ''));
}

// ==================== 最小写入 helpers ====================

/** 行内审计(纯函数): 任何异常都不能破坏业务, 失败退回原 history */
function auditOf(row, op) {
    try {
        return shield.append(row && row.history, op);
    } catch (e) {
        return String((row && row.history) || '');
    }
}

/**
 * 自己行提交: 旧行 + 业务字段 + 行内审计 → 一次 dbUpsert。
 * 成功返回合并后的完整行(供 rowToUser), 失败返回 null(调用方回 code 5)。
 */
async function commitRow(row, fields, op) {
    const merged = Object.assign({}, row, fields || {});
    merged.history = auditOf(row, op);
    const ok = await db.dbUpsert(merged);
    return ok ? merged : null;
}

function parseJson(s, fallback) {
    try {
        const v = JSON.parse(s == null || s === '' ? 'null' : s);
        return v == null ? fallback : v;
    } catch (e) { return fallback; }
}

/** social 字段容错解析(旧行/垃圾数据 → 空结构) */
function socialOf(row) {
    const s = parseJson(row && row.social, {});
    return {
        f: Array.isArray(s.f) ? s.f.filter(x => typeof x === 'string') : [],
        req: Array.isArray(s.req) ? s.req.filter(x => x && typeof x.id === 'string') : [],
        blk: Array.isArray(s.blk) ? s.blk.filter(x => typeof x === 'string') : [],
        g: Array.isArray(s.g) ? s.g.filter(x => typeof x === 'string') : [],
        price: Number(s.price) >= 0 ? Math.min(500, Math.trunc(Number(s.price))) : 1,
        room: typeof s.room === 'string' ? s.room : '',
        inv: s.inv && typeof s.inv === 'object' ? s.inv : null
    };
}

function mesOf(row) {
    const m = parseJson(row && row.mes, []);
    return Array.isArray(m) ? m.filter(x => x && typeof x.from === 'string') : [];
}

function recordOf(row) {
    const r = parseJson(row && row.record, {});
    return {
        win: Number(r.win) || 0,
        play: Number(r.play) || 0,
        last: Number(r.last) || 0,
        recent: Array.isArray(r.recent) ? r.recent.slice(0, MAX_RECENT) : []
    };
}

/** 转交契约: 任何读到自己行的响应都附带待转交消息 mes, 客户端缓存后 ack 删除 */
function withPending(res, row) {
    res.mes = mesOf(row);
    return res;
}

/** 公开资料(搜索/排行/好友列表共用, 不含 bag/dollar 等隐私) */
function publicProfile(row) {
    const rec = recordOf(row);
    return {
        userid: row.id,
        name: row.name || '',
        head: row.head || '',
        flag: row.flag || '',
        win: rec.win,
        play: rec.play,
        room: socialOf(row).room || ""
    };
}

/** 目标 id 合法性: 排除系统行(_seq/mag:admin/__shield__ 前缀)与控制字符 */
function validTargetId(v) {
    const s = String(v == null ? '' : v);
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(s)) return false;
    if (s.charAt(0) === '_' || s.indexOf(':') >= 0) return false;
    return true;
}

/**
 * 换 GOBE(联机对战)开发者 accessToken。失败返回 null: 取不到联机凭据不该让登录失败。
 */
async function gobeInfo() {
    try {
        if (!gobe) gobe = require('./gobe');
        const r = await gobe.getGobeToken();
        if (!r.ok) return null;
        return {
            token: r.token,
            exp: r.expiresIn,
            clientId: String(process.env.GOBE_CLIENT_ID || ''),
            appId: String(process.env.GOBE_APP_ID || '')
        };
    } catch (e) {
        return null;
    }
}

/** 注册已提交后的附加服务: 仅 GOBE(审计已随注册行落库), 共享 1500ms 预算不拖垮响应 */
async function registrationExtras() {
    let timer;
    let result = null;
    try {
        await Promise.race([
            gobeInfo().then(value => { result = value; }),
            new Promise(resolve => { timer = setTimeout(resolve, 1500); })
        ]);
        return result;
    } finally {
        clearTimeout(timer);
    }
}

// ==================== handler ====================

let myHandler = async function (event, context, callback, logger) {
    let req;
    try {
        req = event.body ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) : event;
    } catch (e) {
        callback(out(5, { msg: '请求解析失败' }));
        return;
    }

    const t = req.t;
    const d = req.d || {};

    // ---- agt: 纯计算认证, 完全不触碰数据库 ----
    if (t === 'agt') {
        if (!d.userid || !d.key) { callback(out(5, { msg: '缺少 userid/key' })); return; }
        if (!authOk(d.userid, d.key)) { callback(out(2, { msg: '密匙错误' })); return; }
        callback(out(0, {}));
        return;
    }

    // ---- gt / gprobe: 在函数侧换 GOBE(联机对战)开发者 accessToken ----
    // 为什么不在 Worker 里取: 华为 CN 客户端网关拦截 Cloudflare Workers 出网(501);
    // 云函数跑在华为网络内没有这个问题。两条分支都先过 code.keyOk。
    if (t === 'gt' || t === 'gprobe') {
        if (!d.userid || !d.key) { callback(out(5, { msg: '缺少 userid/key' })); return; }
        if (!authOk(d.userid, d.key)) { callback(out(2, { msg: '密匙错误' })); return; }

        try {
            if (!gobe) gobe = require('./gobe');
        } catch (e) {
            callback(out(11, { msg: 'gobe 模块加载失败: ' + String(e && e.message || e).slice(0, 160) }));
            return;
        }

        if (t === 'gprobe') {
            callback(out(0, { probe: await gobe.probeGobeToken() }));
            return;
        }

        const r = await gobe.getGobeToken();
        if (!r.ok) {
            callback(out(11, {
                msg: r.fatal ? 'GOBE 凭据未配置: ' + r.fatal : 'GOBE token 获取失败',
                fatal: r.fatal || null,
                attempts: r.attempts || []
            }));
            return;
        }
        callback(out(0, {
            token: r.token,
            exp: r.expiresIn,
            gateway: r.gateway,
            clientId: String(process.env.GOBE_CLIENT_ID || ''),
            appId: String(process.env.GOBE_APP_ID || '')
        }));
        return;
    }

    // ---- 其余分支需要 db ----
    try {
        if (!db) db = require('./db');
    } catch (e) {
        let tree = '';
        try {
            const fs = require('fs');
            const path = require('path');
            const base = path.dirname(__filename);
            const nm = path.join(base, 'node_modules');
            if (fs.existsSync(nm)) {
                tree += ' | nm=[' + fs.readdirSync(nm).slice(0, 30).join(',') + ']';
                const hwDb = path.join(nm, '@hw-agconnect', 'database-server', 'dist', 'index.js');
                tree += ' | dbServer存在=' + fs.existsSync(hwDb);
            } else tree += ' | node_modules不存在';
            tree += ' | 根=' + fs.readdirSync(base).slice(0, 30).join(',');
        } catch (e2) { tree = ' | 扫描失败:' + e2.message; }
        callback(out(5, { msg: '模块加载失败 v' + process.version + ': ' + String(e && e.message || e).slice(0, 150) + tree }));
        return;
    }

    try {
        switch (t) {

        // ---- 注册 ----
        case 'reg': {
            // 显式 userid 注册(旧客户端兼容): 查存在 → 直写(含审计) → 认领回读, 3 次
            if (d.userid) {
                const id0 = String(d.userid);
                if (!validTargetId(id0)) { callback(out(5, { msg: 'userid 非法' })); return; }
                const exists0 = await db.dbGet(id0);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (exists0) { callback(out(6, { msg: '该用户已注册' })); return; }
                const bag0 = {};
                bag0[DEFAULT_HEAD] = 1;
                const user0 = {
                    userid: id0,
                    name: d.name || ('玩家' + id0.slice(-4)),
                    flag: d.flag || DEFAULT_FLAG,
                    head: DEFAULT_HEAD,
                    dollar: 1,
                    bag: bag0
                };
                const userKey0 = code.key(id0);
                const claim0 = claimToken();
                const ok0 = await db.dbUpsert(fullRow({
                    id: id0,
                    name: user0.name,
                    flag: user0.flag,
                    head: user0.head,
                    dollar: user0.dollar,
                    bag: JSON.stringify(bag0),
                    etc: claim0,
                    history: auditOf(null, 0)
                }));
                if (!ok0) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
                // 查存在→写入不是原子序列, 并发显式注册会互相覆盖: 回读认自己的令牌才算成功
                const back0 = await db.dbGet(id0);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!back0 || back0.etc !== claim0) { callback(out(6, { msg: '该用户已注册' })); return; }
                const extras0 = await registrationExtras();
                if (logger) logger.info('reg user: ' + id0);
                callback(out(0, { key: userKey0, user: user0, gobe: extras0 }));
                return;
            }

            // 顺序 id 分配: 热实例 seqHint 起步(省 seq 查); 冷启/撞号/认领失败才重读 seq 追赶。
            // 认领失败让号重试, 预算 16 次覆盖并发; 迟到者不写回 seq(防踩赢家已推进的序号)。
            let n = seqHint;
            let refresh = n < 1000;
            for (let attempt = 0; attempt < 16; attempt++) {
                if (refresh) {
                    const seqRow = await db.dbGet(SEQ_ROW);
                    if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                    const s = parseInt(seqRow && seqRow.etc, 10);
                    if (isFinite(s) && s > n) n = s;
                    if (n < 1000) n = 1000;
                    refresh = false;
                }
                const id = String(n);
                const exists = await db.dbGet(id);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (exists) {
                    // 撞号: 本地前进 + 重读 seq 跟进别人推进的序号(不写回, 存在性检查自愈)
                    n = n + 1;
                    seqHint = n;
                    refresh = true;
                    continue;
                }
                const bag = {};
                bag[DEFAULT_HEAD] = 1;
                const user = {
                    userid: id,
                    name: d.name || ('玩家' + id.slice(-4)),
                    flag: d.flag || DEFAULT_FLAG,
                    head: DEFAULT_HEAD,
                    dollar: 1,
                    bag: bag
                };
                const userKey = code.key(id);
                const claim = claimToken();
                const ok = await db.dbUpsert(fullRow({
                    id: id,
                    name: user.name,
                    flag: user.flag,
                    head: user.head,
                    dollar: user.dollar,
                    bag: JSON.stringify(bag),
                    etc: claim,
                    history: auditOf(null, 0)
                }));
                if (!ok) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
                // 读序号→查存在→写入不是原子序列: 回读认自己的令牌才算成功, 否则让号重试
                const back = await db.dbGet(id);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!back || back.etc !== claim) {
                    n = n + 1;
                    seqHint = n;
                    refresh = true;
                    continue;
                }
                // 注册已提交(账号落库且认领成功), 后续全部尽力而为:
                // seq 直写失败只影响下次起点(存在性检查自愈); GOBE 见 registrationExtras
                seqHint = n + 1;
                await db.dbUpsert(fullRow({ id: SEQ_ROW, etc: String(n + 1) }));
                const extras = await registrationExtras();
                if (logger) logger.info('reg user: ' + id);
                callback(out(0, { key: userKey, user: user, gobe: extras }));
                return;
            }
            callback(out(5, { msg: 'id 分配失败(多次撞号)' }));
            return;
        }

        // ---- 更新昵称/签名: 1 查 + 1 写(审计同写) ----
        case 'user': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            const id = String(d.userid);
            const row = await db.dbGet(id);
            if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
            if (!row) { callback(out(1)); return; }
            const fields = {};
            if (d.name !== undefined && d.name !== null && String(d.name) !== row.name) {
                if ((row.dollar || 0) < 1) { callback(out(4, { msg: '改名需要 1 金币' })); return; }
                fields.dollar = (row.dollar || 0) - 1;
                fields.name = String(d.name);
            }
            if (d.flag !== undefined && d.flag !== null) fields.flag = String(d.flag);
            const nrow = await commitRow(row, fields, 1);
            if (!nrow) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
            callback(withPending(out(0, { user: rowToUser(nrow) }), nrow));
            return;
        }

        // ---- 背包查询(登录验证): 1 查 + 1 写(审计合并); 审计写失败不阻塞登录 ----
        case 'bag': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            const id = String(d.userid);
            const row = await db.dbGet(id);
            if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
            if (!row) { callback(out(1)); return; }
            const nrow = await commitRow(row, {}, 2);
            if (!nrow) console.error('[te] bag 审计合并写失败(不阻塞登录): ' + String(db.dbErr() || '').slice(0, 160));
            const res = { bag: rowBag(row), dollar: row.dollar || 0 };
            // gt=1: 登录验证这一次顺带把联机 accessToken 一起给出去(选局页直接 Gnet.init)
            if (d.gt) res.gobe = await gobeInfo();
            callback(withPending(out(0, res), row));
            return;
        }

        // ---- 设置头像: 1 查 + 1 写 ----
        case 'set': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!d.head) { callback(out(5, { msg: '缺少 head' })); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            const id = String(d.userid);
            const row = await db.dbGet(id);
            if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
            if (!row) { callback(out(1)); return; }
            const bag = rowBag(row);
            const n = bag[d.head] || 0;
            if (n < 1) { callback(out(3, { msg: '背包中该头像数量不足' })); return; }
            if (n === 1) delete bag[d.head]; else bag[d.head] = n - 1;
            const nrow = await commitRow(row, { bag: JSON.stringify(bag), head: d.head }, 3);
            if (!nrow) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
            if (logger) logger.info('set head: ' + d.userid + ' -> ' + d.head);
            callback(withPending(out(0, { user: rowToUser(nrow) }), nrow));
            return;
        }

        // ---- 购买: 1 查 + 1 写 ----
        case 'buy': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!d.item) { callback(out(5, { msg: '缺少 item' })); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            const id = String(d.userid);
            const row = await db.dbGet(id);
            if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
            if (!row) { callback(out(1)); return; }
            const bag = rowBag(row);
            const fields = {};
            if (isDollarItem(d.item)) {
                fields.dollar = (row.dollar || 0) + 5;
                if (logger) logger.info('buy dollar: ' + d.userid + ' +5');
            } else {
                if ((row.dollar || 0) < 1) { callback(out(4, { msg: '金币不足' })); return; }
                fields.dollar = (row.dollar || 0) - 1;
                bag[d.item] = (bag[d.item] || 0) + 1;
                fields.bag = JSON.stringify(bag);
                if (logger) logger.info('buy: ' + d.userid + ' -> ' + d.item);
            }
            const nrow = await commitRow(row, fields, 4);
            if (!nrow) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
            callback(withPending(out(0, { user: rowToUser(nrow) }), nrow));
            return;
        }

        // ---- 注销: 1 查 + 1 删(行已不存在, 无审计; 后续调用回 1, IP 闸门兜底) ----
        case 'del': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            const id = String(d.userid);
            const row = await db.dbGet(id);
            if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
            if (!row) { callback(out(1)); return; }
            const ok = await db.dbDel(id);
            if (!ok) { callback(out(5, { msg: '存储删除失败' })); return; }
            if (logger) logger.info('del user: ' + d.userid);
            callback(out(0));
            return;
        }

        // ---- 社交: 对局邀请(id=发起人userid; create/accept/setroom/get; 满员由发起人建房) ----
        case 'invite': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            const id = String(d.userid);
            const action = String(d.action || '');
            if (action === 'create') {
                const mode = d.mode === 'doubles' ? 'doubles' : 'singles';
                const need = mode === 'doubles' ? 4 : 2;
                const row = await db.dbGet(id);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!row) { callback(out(1)); return; }
                const me = socialOf(row);
                me.inv = { id: id, mode: mode, need: need, members: [id], ts: Date.now(), room: '' };
                const nrow = await commitRow(row, { social: JSON.stringify(me) }, 6);
                if (!nrow) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
                callback(withPending(out(0, { invite: me.inv }), nrow));
                return;
            }
            if (action === 'accept' || action === 'get' || action === 'setroom') {
                const inviter = String(d.inviter || '');
                if (!validTargetId(inviter)) { callback(out(5, { msg: 'inviter 非法' })); return; }
                const irow = await db.dbGet(inviter);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!irow) { callback(out(1, { msg: '邀请不存在' })); return; }
                const them = socialOf(irow);
                const inv = them.inv;
                if (!inv || inv.id !== inviter) { callback(out(12, { msg: '邀请已失效' })); return; }
                if (action === 'get') { callback(out(0, { invite: inv })); return; }
                if (action === 'setroom') {
                    if (inviter !== id) { callback(out(2, { msg: '仅发起人可设房间' })); return; }
                    inv.room = String(d.room || '');
                    const nrow = await commitRow(irow, { social: JSON.stringify(them) }, 6);
                    if (!nrow) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
                    callback(out(0, { invite: inv }));
                    return;
                }
                // accept
                const members = Array.isArray(inv.members) ? inv.members : [];
                if (members.indexOf(id) >= 0) { callback(out(0, { invite: inv, full: members.length >= inv.need })); return; }
                if (members.length >= inv.need) { callback(out(12, { msg: '邀请已满员' })); return; }
                members.push(id);
                inv.members = members;
                const full = members.length >= inv.need;
                const nrow = await commitRow(irow, { social: JSON.stringify(them) }, 6);
                if (!nrow) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
                callback(out(0, { invite: inv, full: full }));
                return;
            }
            callback(out(5, { msg: '未知 invite action' }));
            return;
        }

        // ---- 社交: 大区群单例(get-or-create, gid=globby+地区码; 全员同群, 清理其它大厅群) ----
        case 'lobbygroup': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            const code = String(d.code || '');
            if (!/^[A-Z]{2}$/.test(code)) { callback(out(5, { msg: 'code 非法' })); return; }
            const gid = 'globby' + code;
            const name = String(d.name || (code + '区大厅'));
            const id = String(d.userid);
            let grow = await db.dbGet(groupKey(gid));
            if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
            if (!grow) {
                grow = fullRow({ id: groupKey(gid), name: name, social: JSON.stringify({ name: name, members: [id], owner: id, ts: Date.now(), lobby: true }) });
                const okg = await db.dbUpsert(grow);
                if (!okg) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
            } else {
                const g = parseJson(grow.social, {});
                const members = Array.isArray(g.members) ? g.members : [];
                if (members.indexOf(id) < 0) {
                    members.push(id);
                    await db.dbUpsert(Object.assign({}, grow, { social: JSON.stringify(Object.assign({}, g, { members: members })) }));
                }
            }
            const row = await db.dbGet(id);
            if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
            if (!row) { callback(out(1)); return; }
            const me = socialOf(row);
            const oldLobbyGids = [];
            for (const g0 of me.g) {
                if (g0 === gid || g0.indexOf('globby') === 0) continue;
                const gr = await db.dbGet(groupKey(g0));
                const gn = gr ? String(parseJson(gr.social, {}).name || '') : '';
                if (gn && gn.indexOf(name.replace(/区大厅$/, '区')) === 0) oldLobbyGids.push(g0);
            }
            me.g = me.g.filter(x => (x.indexOf('globby') !== 0 || x === gid) && oldLobbyGids.indexOf(x) < 0);
            if (me.g.indexOf(gid) < 0) me.g.push(gid);
            const nrow = await commitRow(row, { social: JSON.stringify(me) }, 6);
            if (!nrow) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
            callback(withPending(out(0, { gid: gid, name: name, oldLobbyGids: oldLobbyGids }), nrow));
            return;
        }

        // ---- 社交: 记录自己所在 GOBE 房间号(进大厅房后写一次, 非轮询) ----
        case 'setroom': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            const room = String(d.room || '');
            if (!room || room.length > 40) { callback(out(5, { msg: 'room 非法' })); return; }
            const id = String(d.userid);
            const row = await db.dbGet(id);
            if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
            if (!row) { callback(out(1)); return; }
            const me = socialOf(row);
            me.room = room;
            const nrow = await commitRow(row, { social: JSON.stringify(me) }, 6);
            if (!nrow) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
            callback(withPending(out(0, { room: room }), nrow));
            return;
        }

        // ---- 社交: 设置自己的身价(0-500, 默认1; 个人设置, 不涉及金币转移) ----
        case 'setprice': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            let price = Math.trunc(Number(d.price));
            if (!isFinite(price) || price < 0 || price > 500) { callback(out(5, { msg: '身价须 0-500' })); return; }
            const id = String(d.userid);
            const row = await db.dbGet(id);
            if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
            if (!row) { callback(out(1)); return; }
            const me = socialOf(row);
            me.price = price;
            const nrow = await commitRow(row, { social: JSON.stringify(me) }, 6);
            if (!nrow) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
            callback(withPending(out(0, { price: price }), nrow));
            return;
        }

        // ---- 社交: 搜索用户公开资料(1 查, 纯读不审计) ----
        case 'find': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            const target = String(d.target || '');
            if (!validTargetId(target)) { callback(out(5, { msg: 'target 非法' })); return; }
            const trow = await db.dbGet(target);
            if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
            if (!trow) { callback(out(1, { msg: '用户不存在' })); return; }
            callback(out(0, { user: publicProfile(trow) }));
            return;
        }

        // ---- 社交: 批量公开资料(好友列表渲染, 1 次 in 查询) ----
        case 'profiles': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            const ids = Array.isArray(d.ids) ? d.ids.map(String).filter(validTargetId).slice(0, MAX_FRIENDS) : [];
            if (!ids.length) { callback(out(0, { users: [] })); return; }
            const rows = await db.dbByIds(ids);
            if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
            callback(out(0, { users: (rows || []).map(publicProfile) }));
            return;
        }

        // ---- 社交: 好友 request/accept/reject/remove ----
        case 'friend': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            const id = String(d.userid);
            const target = String(d.target || '');
            const action = String(d.action || '');
            if (!validTargetId(target)) { callback(out(5, { msg: 'target 非法' })); return; }
            if (target === id) { callback(out(12, { msg: '不能对自己操作' })); return; }

            if (action === 'request') {
                // 身价是"自己的身价"个人设置(隐私栏), 加好友不涉及金币转移
                const trow = await db.dbGet(target);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!trow) { callback(out(1, { msg: '用户不存在' })); return; }
                const them = socialOf(trow);
                if (them.f.indexOf(id) >= 0) { callback(out(12, { msg: '你们已经是好友' })); return; }
                if (them.req.some(r => r.id === id)) { callback(out(12, { msg: '已申请过, 等待对方同意' })); return; }
                if (them.blk.indexOf(id) >= 0) { callback(out(12, { msg: '对方已拒绝你的申请' })); return; }
                if (them.req.length >= MAX_REQUESTS) { callback(out(12, { msg: '对方申请列表已满' })); return; }
                if (them.f.length >= MAX_FRIENDS) { callback(out(12, { msg: '对方好友已满' })); return; }
                them.req.push({ id: id, ts: Date.now() });
                const ok = await db.dbUpsert(Object.assign({}, trow, { social: JSON.stringify(them) }));
                if (!ok) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
                const srow = await db.dbGet(id);
                callback(withPending(out(0), srow || trow));
                return;
            }

            if (action === 'accept') {
                // 双方各一查一写(4 次); 幂等: 已在好友列表则修复对方侧(上次写失败可重试)
                const row = await db.dbGet(id);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!row) { callback(out(1)); return; }
                const me = socialOf(row);
                const already = me.f.indexOf(target) >= 0;
                if (!already && !me.req.some(r => r.id === target)) { callback(out(12, { msg: '没有这条好友申请' })); return; }
                if (!already && me.f.length >= MAX_FRIENDS) { callback(out(12, { msg: '你的好友已满' })); return; }
                const trow = await db.dbGet(target);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!trow) {
                    // 对方已注销: 清掉申请, 不建单向关系
                    me.req = me.req.filter(r => r.id !== target);
                    const nrow = await commitRow(row, { social: JSON.stringify(me) }, 6);
                    if (!nrow) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
                    callback(out(12, { msg: '对方账号已不存在' }));
                    return;
                }
                const them = socialOf(trow);
                if (them.f.indexOf(id) < 0 && them.f.length >= MAX_FRIENDS) { callback(out(12, { msg: '对方好友已满' })); return; }
                me.req = me.req.filter(r => r.id !== target);
                if (me.f.indexOf(target) < 0) me.f.push(target);
                if (them.f.indexOf(id) < 0) them.f.push(id);
                const nrow = await commitRow(row, { social: JSON.stringify(me) }, 6);
                if (!nrow) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
                const ok2 = await db.dbUpsert(Object.assign({}, trow, { social: JSON.stringify(them) }));
                if (!ok2) { callback(out(5, { msg: '好友关系写入失败, 请重试' })); return; }
                callback(withPending(out(0, { friend: publicProfile(trow) }), nrow));
                return;
            }

            if (action === 'reject') {
                const row = await db.dbGet(id);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!row) { callback(out(1)); return; }
                const me = socialOf(row);
                me.req = me.req.filter(r => r.id !== target);
                const nrow = await commitRow(row, { social: JSON.stringify(me) }, 6);
                if (!nrow) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
                callback(withPending(out(0), nrow));
                return;
            }

            if (action === 'remove') {
                // 双向解除: 双方各一查一写(4 次, 幂等; 对方行不存在则只清自己)
                const row = await db.dbGet(id);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!row) { callback(out(1)); return; }
                const trow = await db.dbGet(target);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                const me = socialOf(row);
                me.f = me.f.filter(x => x !== target);
                me.req = me.req.filter(r => r.id !== target);
                const nrow = await commitRow(row, { social: JSON.stringify(me) }, 6);
                if (!nrow) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
                if (trow) {
                    const them = socialOf(trow);
                    them.f = them.f.filter(x => x !== id);
                    them.req = them.req.filter(r => r.id !== id);
                    const ok2 = await db.dbUpsert(Object.assign({}, trow, { social: JSON.stringify(them) }));
                    if (!ok2) { callback(out(5, { msg: '好友关系解除失败, 请重试' })); return; }
                }
                callback(withPending(out(0), nrow));
                return;
            }

            callback(out(5, { msg: '未知 action: ' + action }));
            return;
        }

        // ---- 社交: 发消息(只转交不存会话): 写入对方/群成员待转交缓冲 mes; 屏蔽词标记 w=1 ----
        case 'msg': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            const id = String(d.userid);
            const gid = d.gid ? String(d.gid) : '';
            const text = String(d.text == null ? '' : d.text).trim();
            if (!text) { callback(out(5, { msg: '消息不能为空' })); return; }
            if (text.length > MES_TEXT_MAX) { callback(out(12, { msg: '消息过长(最多 ' + MES_TEXT_MAX + ' 字)' })); return; }
            const w = hasBlocked(text) ? 1 : 0;
            const mid = Date.now() + ':' + Math.random().toString(36).slice(2, 10);
            const entry = { id: mid, from: id, text: text, ts: Date.now(), w: w };
            if (gid) {
                if (!validGid(gid)) { callback(out(5, { msg: 'gid 非法' })); return; }
                const grow = await db.dbGet(groupKey(gid));
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!grow) { callback(out(1, { msg: '群不存在' })); return; }
                const g = parseJson(grow.social, {});
                const members = Array.isArray(g.members) ? g.members : [];
                if (members.indexOf(id) < 0) { callback(out(12, { msg: '你不是该群成员' })); return; }
                entry.gid = gid;
                // 转交给除自己外每个成员: 各一查一写
                for (const m of members) {
                    if (m === id) continue;
                    const mrow = await db.dbGet(m);
                    if (!db.dbOk || !mrow) continue;
                    const box = mesOf(mrow);
                    box.push(Object.assign({}, entry));
                    while (box.length > MAX_MES) box.shift();
                    await db.dbUpsert(Object.assign({}, mrow, { mes: JSON.stringify(box) }));
                }
                callback(out(0, { id: mid }));
                return;
            }
            const target = String(d.target || '');
            if (!validTargetId(target)) { callback(out(5, { msg: 'target 非法' })); return; }
            if (target === id) { callback(out(12, { msg: '不能给自己发消息' })); return; }
            const trow = await db.dbGet(target);
            if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
            if (!trow) { callback(out(1, { msg: '用户不存在' })); return; }
            const them = socialOf(trow);
            if (them.f.indexOf(id) < 0) { callback(out(12, { msg: '你们还不是好友, 无法私信' })); return; }
            const inbox = mesOf(trow);
            inbox.push(entry);
            while (inbox.length > MAX_MES) inbox.shift();
            const ok = await db.dbUpsert(Object.assign({}, trow, { mes: JSON.stringify(inbox) }));
            if (!ok) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
            callback(out(0, { id: mid }));
            return;
        }

        // ---- 社交: 送达确认(客户端缓存到本地后 ack, 服务端删除已送达条目) ----
        case 'ack': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            const id = String(d.userid);
            const ids = Array.isArray(d.ids) ? d.ids.map(String) : [];
            if (!ids.length) { callback(out(0, { removed: 0 })); return; }
            const row = await db.dbGet(id);
            if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
            if (!row) { callback(out(1)); return; }
            const box = mesOf(row);
            const keep = box.filter(m => ids.indexOf(String(m.id)) < 0);
            const removed = box.length - keep.length;
            if (!removed) { callback(out(0, { removed: 0 })); return; }
            const nrow = await commitRow(row, { mes: JSON.stringify(keep) }, 9);
            if (!nrow) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
            callback(out(0, { removed: removed }));
            return;
        }

        // ---- 社交: 群(create 建群行+成员 social.g; info 读群元数据) ----
        case 'group': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            const id = String(d.userid);
            const action = String(d.action || '');
            if (action === 'create') {
                const name = String(d.name == null ? '' : d.name).trim();
                if (!name || name.length > 20) { callback(out(5, { msg: '群名 1-20 字' })); return; }
                const members = Array.isArray(d.members) ? d.members.map(String).filter(validTargetId) : [];
                const uniq = Array.from(new Set([id].concat(members))).slice(0, MAX_GROUP_MEMBERS);
                if (uniq.length < (d.lobby ? 1 : 2)) { callback(out(12, { msg: '群至少 2 人(选好友)' })); return; }
                const gid = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
                const gmeta = { name: name, members: uniq, owner: id, ts: Date.now() };
                const okg = await db.dbUpsert(fullRow({ id: groupKey(gid), name: name, social: JSON.stringify(gmeta) }));
                if (!okg) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
                // 每个成员 social.g 追加 gid(各一查一写)
                for (const m of uniq) {
                    const mrow = await db.dbGet(m);
                    if (!db.dbOk || !mrow) continue;
                    const ms = socialOf(mrow);
                    if (ms.g.indexOf(gid) < 0) ms.g.push(gid);
                    await db.dbUpsert(Object.assign({}, mrow, { social: JSON.stringify(ms) }));
                }
                callback(out(0, { gid: gid, name: name, members: uniq }));
                return;
            }
            if (action === 'join') {
                const gid = String(d.gid || '');
                if (!validGid(gid)) { callback(out(5, { msg: 'gid 非法' })); return; }
                const grow = await db.dbGet(groupKey(gid));
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!grow) { callback(out(1, { msg: '群不存在' })); return; }
                const g = parseJson(grow.social, {});
                const members = Array.isArray(g.members) ? g.members : [];
                if (members.indexOf(id) < 0) { members.push(id); await db.dbUpsert(Object.assign({}, grow, { social: JSON.stringify(Object.assign({}, g, { members })) })); }
                const row = await db.dbGet(id);
                if (db.dbOk && row) {
                    const me = socialOf(row);
                    if (me.g.indexOf(gid) < 0) me.g.push(gid);
                    const nrow = await commitRow(row, { social: JSON.stringify(me) }, 6);
                    callback(withPending(out(0, { gid, name: g.name || '' }), nrow || row));
                } else callback(out(0, { gid, name: g.name || '' }));
                return;
            }
            if (action === 'leave') {
                const gid = String(d.gid || '');
                if (!validGid(gid)) { callback(out(5, { msg: 'gid 非法' })); return; }
                const grow = await db.dbGet(groupKey(gid));
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (grow) {
                    const g = parseJson(grow.social, {});
                    g.members = (Array.isArray(g.members) ? g.members : []).filter(m => m !== id);
                    await db.dbUpsert(Object.assign({}, grow, { social: JSON.stringify(g) }));
                }
                const row = await db.dbGet(id);
                if (db.dbOk && row) {
                    const me = socialOf(row);
                    me.g = me.g.filter(x => x !== gid);
                    await commitRow(row, { social: JSON.stringify(me) }, 6);
                }
                callback(out(0));
                return;
            }
            if (action === 'info') {
                const gid = String(d.gid || '');
                if (!validGid(gid)) { callback(out(5, { msg: 'gid 非法' })); return; }
                const grow = await db.dbGet(groupKey(gid));
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!grow) { callback(out(1, { msg: '群不存在' })); return; }
                const g = parseJson(grow.social, {});
                callback(out(0, { gid: gid, name: g.name || '', members: Array.isArray(g.members) ? g.members : [], owner: g.owner || '' }));
                return;
            }
            callback(out(5, { msg: '未知 group action' }));
            return;
        }

        // ---- 社交: 同步自己(1 查, 纯读不审计; 社交页轮询入口) ----
        case 'sync': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            const id = String(d.userid);
            const row = await db.dbGet(id);
            if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
            if (!row) { callback(out(1)); return; }
            callback(out(0, {
                user: rowToUser(row),
                social: socialOf(row),
                mes: mesOf(row),
                record: recordOf(row)
            }));
            return;
        }

        // ---- 社交: 收件箱清理(查自己 + 写自己, 2 次) ----
        case 'mes': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            if (String(d.action || '') !== 'clear') { callback(out(5, { msg: '未知 action' })); return; }
            const id = String(d.userid);
            const row = await db.dbGet(id);
            if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
            if (!row) { callback(out(1)); return; }
            const nrow = await commitRow(row, { mes: '[]' }, 9);
            if (!nrow) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
            callback(withPending(out(0), nrow));
            return;
        }

        // ---- 社交: 排行榜(1 次 orderByDesc(level) 索引查询, 无写) ----
        case 'rank': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            const limit = Math.max(1, Math.min(RANK_MAX, Number(d.limit) || 20));
            // 多取一些再过滤: 系统行/未上报行 level 为空或非法, 不占榜单
            const rows = await db.dbTop('level', RANK_MAX + 20);
            if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
            const users = [];
            for (const r of rows || []) {
                if (!/^\d{10}$/.test(String(r.level || ''))) continue;
                if (!validTargetId(r.id)) continue;
                users.push(publicProfile(r));
                if (users.length >= limit) break;
            }
            callback(out(0, { users: users }));
            return;
        }

        // ---- 社交: 战绩上报(查自己 + 写自己, 2 次; 30s 冷却防刷) ----
        case 'score': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            const win = Number(d.win);
            if (win !== 0 && win !== 1) { callback(out(5, { msg: 'win 必须为 0/1' })); return; }
            const mode = d.mode === 'pvp' ? 'pvp' : 'pve';
            const id = String(d.userid);
            const row = await db.dbGet(id);
            if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
            if (!row) { callback(out(1)); return; }
            const rec = recordOf(row);
            const now = Date.now();
            if (rec.last && now - rec.last < SCORE_COOLDOWN_MS) { callback(out(12, { msg: '战绩上报过频, 请稍后再试' })); return; }
            rec.play += 1;
            rec.win += win;
            rec.last = now;
            rec.recent.unshift({ w: win, m: mode, ts: now });
            rec.recent = rec.recent.slice(0, MAX_RECENT);
            const nrow = await commitRow(row, {
                record: JSON.stringify(rec),
                level: String(rec.win).padStart(10, '0')
            }, 8);
            if (!nrow) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
            if (logger) logger.info('score: ' + id + ' win=' + win + ' mode=' + mode + ' total=' + rec.win);
            callback(withPending(out(0, { record: rec }), nrow));
            return;
        }

        default:
            callback(out(5, { msg: '未知 t: ' + t }));
        }
    } catch (e) {
        if (logger) logger.error('te/user error: ' + (e && e.stack));
        callback(out(5, { msg: '服务器内部错误 v' + process.version + ': ' + String(e && e.message || e).slice(0, 300) }));
    }
};

module.exports.myHandler = myHandler;
