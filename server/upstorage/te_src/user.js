/**
 * te/user.js - 用户系统云函数 handler(AGC Node.js)
 *
 * 请求(经 Worker 代理 data): { t: "reg"|"agt"|"user"|"bag"|"set"|"buy"|"del", d: {...} }
 *
 * 登录/注册一并下发联机凭据: reg 与 bag(d.gt=1) 的响应带 gobe{token,exp,clientId,appId},
 * 客户端(选局页)据此直接 Gnet.init, 不再单独请求 GOBE。
 * 换发失败只是省略 gobe 字段, 登录/注册照常成功(客户端回退单独取)。
 *
 * 密匙体系(见 code.js):
 *   - key = code.key(userid): 确定性, 服务器由 userid 直接重算
 *   - 认证: code.keyOk(userid, key), 不查库
 *   - 注册下发 key = code.key(userid), 数据库不再存 secret 字段
 *
 * 存储: id(主键)=userid  name  flag  bag(JSON)  dollar  head  etc(注册认领令牌 "ctime:随机串",
 *       rowToUser 用 parseInt 取前段当 ctime; 随机后缀用于并发注册回读校验, 见 reg 分支)
 *       老数据行的 secret 字段保留但不再读取/写入
 *
 * 错误码: 0成功 1用户不存在 2认证失败 3背包数量不足 4金币不足 5参数错误 6已注册
 *         11上游(GOBE 换 token)异常 —— 与 Worker 侧同号, 客户端按"可退避重试"处理
 *
 * gt / gprobe 分支需要函数环境变量: GOBE_CLIENT_ID / GOBE_CLIENT_SECRET / GOBE_APP_ID
 */
const code = require('./code');
let db = null;
let shield = null;
let gobe = null;

async function recordDbOperation(userid, op) {
    // 审计尽力而为: record 内部有 upsert/前缀查询/逐行删除三次 CloudDB 往返, 任何一次抛错
    // 都不能让已提交的业务(尤其注册)回 code 5 —— 否则账号已创建, 客户端却当成注册失败
    try {
        if (!shield) shield = require('./shield');
        return await shield.record(String(userid), op);
    } catch (e) {
        console.error('[te] shield 审计失败(不影响业务): ' + String(e && e.message || e).slice(0, 160));
        return null;
    }
}

/** 必须是 ui 包 head/ 下真实存在的文件(旧值 head/0101.png 属已弃用的 30 张头像包) */
const DEFAULT_HEAD = 'head/0.png';
const DEFAULT_FLAG = '美好的一天开始喽！';
const SEQ_ROW = '_seq';
const CODE_V = 'v1112a';

/** 注册认领令牌: 前段是 ctime(rowToUser parseInt 取前段), 随机后缀区分并发写入者 */
function claimToken() {
    return Date.now() + ':' + Math.random().toString(36).slice(2);
}

/**
 * 新建行字段补全: 注册是唯一"新建 CloudDB 行"的路径, 行里缺的字段(secret/pass/social/
 * history/record/mes/level 等)若在控制台对象类型里是非空, upsert 会直接失败 ——
 * 表现为"只有注册挂, 其余操作(总是更新已有行)都正常"。全字段给安全默认值规避。
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

/**
 * 换 GOBE(联机对战)开发者 accessToken, 供登录/注册响应顺带下发。
 * 失败返回 null 而不是抛错: 取不到联机凭据不该让登录失败, 客户端会自己单独取一次。
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

async function registrationExtras(userid) {
    let timer;
    let result = null;
    try {
        // 已提交的身份不能被附加服务拖到客户端请求超时。
        await Promise.race([
            Promise.all([
                recordDbOperation(userid, 0),
                gobeInfo().then(value => { result = value; })
            ]),
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
    // 云函数跑在华为网络内没有这个问题。两条分支都先过 code.keyOk,
    // 于是"Worker 代理"与"客户端直连云函数"两条路共用同一道身份闸。
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
            // 只回逐网关状态码现场, 不含 token/secret
            callback(out(0, { probe: await gobe.probeGobeToken() }));
            return;
        }

        const r = await gobe.getGobeToken();
        if (!r.ok) {
            // 把逐网关现场一起带回去: 客户端一次调用就能看出是"凭据不对"还是"网关拦截"
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
            // 显式 userid 注册(旧客户端兼容)
            if (d.userid) {
                const id0 = String(d.userid);
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
                const userKey0 = code.key(id0);   // ✅ 确定性 key, 不再随机
                const claim0 = claimToken();
                const ok0 = await db.dbPut(id0, fullRow({
                    name: user0.name,
                    flag: user0.flag,
                    head: user0.head,
                    dollar: user0.dollar,
                    bag: JSON.stringify(bag0),
                    etc: claim0
                }));
                if (!ok0) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
                // 查存在→写入不是原子序列, 并发显式注册会互相覆盖: 回读认自己的令牌才算成功
                const back0 = await db.dbGet(id0);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!back0 || back0.etc !== claim0) { callback(out(6, { msg: '该用户已注册' })); return; }
                const extras0 = await registrationExtras(id0);
                if (logger) logger.info('reg user: ' + id0);
                callback(out(0, { key: userKey0, user: user0, gobe: extras0 }));
                return;
            }

            // 顺序 id 分配(认领失败要让号重试, 预算须覆盖并发数: N 路并发最坏让 N-1 次)
            // n 为本地进度: 每轮取 max(全局 seq, 本地), 既跟进别人推进的序号, 也绝不回退
            // (seq 行写失败时不会原地重试同一个 id 烧预算)
            let n = 0;
            for (let attempt = 0; attempt < 16; attempt++) {
                const seqRow = await db.dbGet(SEQ_ROW);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                const s = parseInt(seqRow && seqRow.etc, 10);
                if (isFinite(s) && s > n) n = s;
                if (n < 1000) n = 1000;
                const id = String(n);
                const exists = await db.dbGet(id);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (exists) {
                    // seq 写回尽力而为(失败自愈: 本地 n 已前进, 下轮换下一个 id)
                    await db.dbPut(SEQ_ROW, fullRow({ etc: String(n + 1) }));
                    n = n + 1;
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
                const userKey = code.key(id);     // ✅ 确定性 key
                const claim = claimToken();
                const ok = await db.dbPut(id, fullRow({
                    name: user.name,
                    flag: user.flag,
                    head: user.head,
                    dollar: user.dollar,
                    bag: JSON.stringify(bag),
                    etc: claim
                }));
                if (!ok) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
                // 读序号→查存在→写入不是原子序列: 并发注册会同时相中同一个 id 互相覆盖,
                // 两端拿到同一账号(实测双开同撞 1035)。回读认自己的令牌才算成功, 否则让号重试。
                const back = await db.dbGet(id);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!back || back.etc !== claim) {
                    // 赢家在自己的成功路径里推进 seq; 这里只前进本地进度, 不写回 ——
                    // 迟到的 n+1 会把赢家已推进的序号踩回去, 让后续请求反复撞号
                    n = n + 1;
                    continue;
                }
                // 到这里注册已提交(账号落库且认领成功), 后续全部尽力而为:
                // seq 写回失败只影响下次起点(存在性检查自愈), 审计失败见 recordDbOperation
                await db.dbPut(SEQ_ROW, fullRow({ etc: String(n + 1) }));
                const extras = await registrationExtras(id);
                if (logger) logger.info('reg user: ' + id);
                callback(out(0, { key: userKey, user: user, gobe: extras }));
                return;
            }
            callback(out(5, { msg: 'id 分配失败(多次撞号)' }));
            return;
        }

        // ---- 更新昵称/签名 ----
        case 'user': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }   // ✅ 先纯计算认证
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
            if (!Object.keys(fields).length) { await recordDbOperation(id, 1); callback(out(0, { user: rowToUser(row) })); return; }
            const ok = await db.dbPut(id, fields);
            if (!ok) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
            const nrow = Object.assign({}, row, fields);
            await recordDbOperation(id, 1);
            callback(out(0, { user: rowToUser(nrow) }));
            return;
        }

        // ---- 背包查询 ----
        case 'bag': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            const id = String(d.userid);
            const row = await db.dbGet(id);
            if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
            if (!row) { callback(out(1)); return; }
            await recordDbOperation(id, 2);
            const res = { bag: rowBag(row), dollar: row.dollar || 0 };
            // gt=1: 登录验证这一次顺带把联机 accessToken 一起给出去(选局页直接 Gnet.init)
            if (d.gt) res.gobe = await gobeInfo();
            callback(out(0, res));
            return;
        }

        // ---- 设置头像 ----
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
            const ok = await db.dbPut(id, { bag: JSON.stringify(bag), head: d.head });
            if (!ok) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
            if (logger) logger.info('set head: ' + d.userid + ' -> ' + d.head);
            const nrow = Object.assign({}, row, { bag: JSON.stringify(bag), head: d.head });
            await recordDbOperation(id, 3);
            callback(out(0, { user: rowToUser(nrow) }));
            return;
        }

        // ---- 购买 ----
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
            const ok = await db.dbPut(id, fields);
            if (!ok) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
            const nrow = Object.assign({}, row, fields);
            await recordDbOperation(id, 4);
            callback(out(0, { user: rowToUser(nrow) }));
            return;
        }

        // ---- 注销 ----
        case 'del': {
            if (!d.userid || !d.key) { callback(out(5)); return; }
            if (!authOk(d.userid, d.key)) { callback(out(2)); return; }
            const id = String(d.userid);
            const row = await db.dbGet(id);
            if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
            if (!row) { callback(out(1)); return; }
            const ok = await db.dbDel(id);
            if (!ok) { callback(out(5, { msg: '存储删除失败' })); return; }
            await recordDbOperation(id, 5);
            if (logger) logger.info('del user: ' + d.userid);
            callback(out(0));
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