/**
 * mag/mag.js - 超级管理终端云函数 handler(AGC Node.js, 独立函数)
 *
 * 请求(经 Worker 代理 data): { t: "login"|"list"|"get"|"set"|"bag"|"del"|"passwd"|"shell", d: {...} }
 * 前端: server/mag/web/(mag.html + mag.js), 调用 {name:"mag", data:{t, d}}
 *
 * 认证: 登录返回 token = sha256(MAG_SALT + 账号), 后续请求 d.token 比对
 *        管理员配置存 CloudDB NG 行 "mag:admin": name=账号, pass=sha256(MAG_SALT2+密码),
 *        首次默认 账号"1" 密码"1" —— 多实例共享, 改密码全局生效
 *
 * 用户数据(CloudDB NG 对象类型, 经 db.js → Worker → cloudb 函数):
 *   id(主键)=userid  name  flag  bag(JSON字符串)  dollar(Integer)
 *   head  etc(ctime 毫秒字符串)
 *
 * 接口:
 *   login  {u, p}                          → { code, token }
 *   list   {token}                         → { code, users:[{userid,name,flag,head,dollar,ctime}] }
 *   get    {token, userid}                 → { code, user, bag }
 *   set    {token, userid, name?,flag?,head?,dollar?} → 修改用户信息(dollar 直接设置)
 *   bag    {token, userid, item, count}    → 设置背包物品数量(count<=0 删除)
 *   del    {token, userid}                 → 删除用户
 *   passwd {token, u, p}                   → 修改管理员账号密码
 *   shell  {token, cmd}                    → Shell 命令(运维, cwd=函数目录)
 *
 * 错误码: 0成功 1用户不存在 2认证失败 5参数错误
 */
const crypto = require('crypto');

const MAG_SALT = 'ng~mag#2026$tk';
const MAG_SALT2 = 'ng~mag#2026$pw';
const DEFAULT_ADMIN = { u: '1', p: '1' };
const ADMIN_ROW = 'mag:admin';

// ==================== 工具 ====================

// 代码版本(每次部署自增): 客户端响应 v 字段可核对云端实际运行的版本, 部署问题定位后删除
const CODE_V = 'v1022a';

function out(c, extra) {
    return Object.assign({ code: c, v: CODE_V }, extra || {});
}

function sha256(s) {
    return crypto.createHash('sha256').update(String(s)).digest('hex');
}

/** 读取管理员配置(CloudDB NG 行 mag:admin, name=账号, pass=hash; 不存在则初始化默认 1/1) */
async function loadAdmin(db) {
    const row = await db.dbGet(ADMIN_ROW);
    if (row && row.name && row.pass) return { u: row.name, ph: row.pass };
    const def = { u: DEFAULT_ADMIN.u, ph: sha256(MAG_SALT2 + DEFAULT_ADMIN.p) };
    await db.dbPut(ADMIN_ROW, { name: def.u, pass: def.ph });
    return def;
}

/** 管理员登录校验 */
function adminOk(admin, u, p) {
    return String(u) === String(admin.u) && sha256(MAG_SALT2 + String(p)) === admin.ph;
}

/** token 校验: 由 账号 派生, 无状态(实例重启/多实例均有效) */
function tokenOk(admin, token) {
    if (!token || !admin) return false;
    return sha256(MAG_SALT + admin.u) === String(token);
}

function mkToken(u) {
    return sha256(MAG_SALT + u);
}

// ==================== 登录防爆破(实例内存) ====================

// 直连暴露后 mag login 无 Worker IP 风控前置, 实例内存计数兜底: 5 次失败锁 1 小时
const LOGIN_MAX_FAIL = 5;
const LOGIN_LOCK_MS = 3600 * 1000;
let loginFails = 0;       // 连续失败次数(成功清零)
let loginLockUntil = 0;   // 锁定截止(毫秒)

function loginLocked() {
    return Date.now() < loginLockUntil;
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

    let db = null;
    try {
        db = require('./db');
    } catch (e) {
        // 诊断: 扫描代码目录结构随错误返回(定位云端解压问题), 问题解决后删除
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

            // ---- 管理员登录 ----
            case 'login': {
                if (d.u === undefined || d.p === undefined) { callback(out(5, { msg: '缺少账号密码' })); return; }
                if (loginLocked()) { callback(out(2, { msg: '失败次数过多，已锁定 1 小时' })); return; }
                const admin = await loadAdmin(db);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!adminOk(admin, d.u, d.p)) {
                    loginFails++;
                    if (loginFails >= LOGIN_MAX_FAIL) {
                        loginLockUntil = Date.now() + LOGIN_LOCK_MS;
                        loginFails = 0;
                        if (logger) logger.warn('mag login locked (5 fails)');
                        callback(out(2, { msg: '失败次数过多，已锁定 1 小时' }));
                        return;
                    }
                    callback(out(2, { msg: '账号或密码错误' }));
                    return;
                }
                loginFails = 0;
                if (logger) logger.info('mag login ok');
                callback(out(0, { token: mkToken(String(d.u)) }));
                return;
            }

            // ---- 修改管理员密码 ----
            case 'passwd': {
                const admin = await loadAdmin(db);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!tokenOk(admin, d.token)) { callback(out(2, { msg: '未登录或登录失效' })); return; }
                if (!d.u || d.p === undefined) { callback(out(5, { msg: '缺少账号密码' })); return; }
                const ok = await db.dbPut(ADMIN_ROW, { name: String(d.u), pass: sha256(MAG_SALT2 + String(d.p)) });
                if (!ok) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
                if (logger) logger.info('mag passwd changed');
                callback(out(0, { token: mkToken(String(d.u)) }));
                return;
            }
        }

        // 以下接口均需 token
        const admin = await loadAdmin(db);
        if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
        if (!tokenOk(admin, d.token)) { callback(out(2, { msg: '未登录或登录失效' })); return; }

        switch (t) {

            // ---- Shell 命令(超级终端, cwd=函数目录) ----
            case 'shell': {
                if (!d.cmd || typeof d.cmd !== 'string') { callback(out(5, { msg: '缺少 cmd' })); return; }
                const { execSync } = require('child_process');
                try {
                    const stdout = execSync(d.cmd, {
                        encoding: 'utf8',
                        timeout: 15000,
                        cwd: __dirname,
                        maxBuffer: 4 * 1024 * 1024,
                        windowsHide: true
                    });
                    callback(out(0, { out: stdout || '(无输出)' }));
                } catch (e) {
                    // 非零退出码/超时也把已有输出带回
                    const parts = [];
                    if (e.stdout) parts.push(e.stdout);
                    if (e.stderr) parts.push('[stderr] ' + e.stderr);
                    if (e.killed) parts.push('[超时] 命令被终止(15s)');
                    parts.push('[exit] ' + (e.status === undefined ? '?' : e.status));
                    callback(out(0, { out: parts.join('\n') }));
                }
                return;
            }

            // ---- 用户列表 ----
            case 'list': {
                const rows = await db.dbList();
                if (!rows) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                const users = [];
                for (const r of rows) {
                    if (!r || !r.id || r.id === ADMIN_ROW || r.id === '_seq') continue;
                    users.push({
                        userid: r.id,
                        name: r.name || '',
                        flag: r.flag || '',
                        head: r.head || '',
                        dollar: r.dollar || 0,
                        ctime: parseInt(r.etc || '0', 10) || 0
                    });
                }
                users.sort((a, b) => (a.ctime || 0) - (b.ctime || 0));
                callback(out(0, { users: users }));
                return;
            }

            // ---- 用户详情(含背包) ----
            case 'get': {
                if (!d.userid) { callback(out(5, { msg: '缺少 userid' })); return; }
                const row = await db.dbGet(String(d.userid));
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!row || row.id !== String(d.userid)) { callback(out(1, { msg: '用户不存在' })); return; }
                let bag = {};
                try { bag = JSON.parse(row.bag || '{}'); } catch (e) { }
                callback(out(0, {
                    user: {
                        userid: row.id,
                        name: row.name || '',
                        flag: row.flag || '',
                        head: row.head || '',
                        dollar: row.dollar || 0,
                        secret: row.secret || '',
                        ctime: parseInt(row.etc || '0', 10) || 0
                    },
                    bag: bag
                }));
                return;
            }

            // ---- 修改用户信息 ----
            case 'set': {
                if (!d.userid) { callback(out(5, { msg: '缺少 userid' })); return; }
                const id = String(d.userid);
                const row = await db.dbGet(id);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!row || row.id !== id) { callback(out(1, { msg: '用户不存在' })); return; }
                const fields = {};
                if (d.name !== undefined && typeof d.name === 'string' && d.name.length) fields.name = d.name;
                if (d.flag !== undefined && typeof d.flag === 'string') fields.flag = d.flag;
                if (d.head !== undefined && typeof d.head === 'string' && d.head.length) fields.head = d.head;
                if (d.dollar !== undefined) {
                    const n = parseInt(d.dollar, 10);
                    if (!isFinite(n) || n < 0 || n > 100000000) { callback(out(5, { msg: 'dollar 非法' })); return; }
                    fields.dollar = n;
                }
                if (Object.keys(fields).length) {
                    const ok = await db.dbPut(id, fields);
                    if (!ok) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
                    if (logger) logger.info('mag set user: ' + id);
                }
                const nrow = Object.assign({}, row, fields);
                callback(out(0, {
                    user: {
                        userid: nrow.id,
                        name: nrow.name || '',
                        flag: nrow.flag || '',
                        head: nrow.head || '',
                        dollar: nrow.dollar || 0,
                        ctime: parseInt(nrow.etc || '0', 10) || 0
                    }
                }));
                return;
            }

            // ---- 修改背包物品数量 ----
            case 'bag': {
                if (!d.userid || !d.item) { callback(out(5, { msg: '缺少 userid/item' })); return; }
                const id = String(d.userid);
                const row = await db.dbGet(id);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!row || row.id !== id) { callback(out(1, { msg: '用户不存在' })); return; }
                let bag = {};
                try { bag = JSON.parse(row.bag || '{}'); } catch (e) { }
                const count = parseInt(d.count, 10);
                if (!isFinite(count) || count < 0 || count > 1000000) { callback(out(5, { msg: 'count 非法' })); return; }
                if (count > 0) bag[d.item] = count;
                else delete bag[d.item];
                const ok = await db.dbPut(id, { bag: JSON.stringify(bag) });
                if (!ok) { callback(out(5, { msg: '存储写入失败: ' + (db.dbErr() || '未知') })); return; }
                if (logger) logger.info('mag bag set: ' + id + ' ' + d.item + ' x' + count);
                callback(out(0, { bag: bag }));
                return;
            }

            // ---- 删除用户 ----
            case 'del': {
                if (!d.userid) { callback(out(5, { msg: '缺少 userid' })); return; }
                const id = String(d.userid);
                const row = await db.dbGet(id);
                if (!db.dbOk) { callback(out(5, { msg: '存储访问失败: ' + (db.dbErr() || '未知') })); return; }
                if (!row) { callback(out(1, { msg: '用户不存在' })); return; }
                const ok = await db.dbDel(id);
                if (!ok) { callback(out(5, { msg: '存储删除失败' })); return; }
                if (logger) logger.info('mag del user: ' + id);
                callback(out(0));
                return;
            }

            default:
                callback(out(5, { msg: '未知 t: ' + t }));
                return;
        }
    } catch (e) {
        if (logger) logger.error('mag error: ' + (e && e.message));
        callback(out(5, { msg: '服务器异常 v' + process.version + ': ' + String(e && e.message || e).slice(0, 300) }));
        return;
    }
};

module.exports.myHandler = myHandler;