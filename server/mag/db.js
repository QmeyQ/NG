/**
 * db.js - CloudDB 直连客户端(mag 内嵌 SDK, 与 server/te/db.js 保持同步)
 *
 * 直接 require CloudDBZoneWrapper 访问 CloudDB(NG 对象类型, User 存储区),
 * 不再经 Worker→cloudb 环回(环回实测 2-5s, 直连后仅剩华为内网 ~100ms)
 *
 * 数据行(平铺字段): { id(主键), name, flag, bag(JSON字符串), dollar, head, etc(ctime), ... }
 *
 * 接口(与旧 fetch 版完全一致, 调用方零改动):
 *   dbGet(id)          → row 对象 | null(无此行) | null(调用失败, 用 dbOk 区分)
 *   dbPut(id, fields)  → 部分字段合并更新(读旧行→合并→整行 upsert) → true/false
 *   dbDel(id)          → true/false
 *   dbList()           → [row] | null
 *   dbOk               → 最后一次调用是否成功(false=CloudDB 故障, mag 应回 code 5)
 */
const CloudDBZoneWrapper = require('./CloudDBZoneWrapper');

const ZONE = 'User';

let wrap = null;
let dbOk = true;

/** 懒初始化 wrapper(首个请求时连接 CloudDB, 实例存活期间复用) */
function w() {
    if (!wrap) wrap = new CloudDBZoneWrapper(null, ZONE);
    return wrap;
}

/** 诊断: 最近一次 CloudDB 错误(初始化/操作), code 5 时随 msg 返回 */
function dbErr() {
    return CloudDBZoneWrapper.lastError();
}

/** 读一行: row | null */
async function dbGet(id) {
    try {
        const row = await w().executeQueryById(String(id));
        dbOk = true;
        return row;
    } catch (e) {
        dbOk = false;
        w().noteOpError(e);
        return null;
    }
}

/** 部分字段合并更新: 先读旧行合并成完整行再 upsert(缺省字段保留旧值) */
async function dbPut(id, fields) {
    try {
        const old = await w().executeQueryById(String(id)) || {};
        const merged = Object.assign({}, old, fields || {}, { id: String(id) });
        await w().executeUpsert(merged);
        dbOk = true;
        return true;
    } catch (e) {
        dbOk = false;
        w().noteOpError(e);
        return false;
    }
}

/** 删除一行 */
async function dbDel(id) {
    try {
        await w().executeDelete(String(id));
        dbOk = true;
        return true;
    } catch (e) {
        dbOk = false;
        w().noteOpError(e);
        return false;
    }
}

/** 全部行 */
async function dbList() {
    try {
        const rows = await w().executeQueryAll();
        dbOk = true;
        return rows;
    } catch (e) {
        dbOk = false;
        w().noteOpError(e);
        return null;
    }
}

module.exports = { dbGet, dbPut, dbDel, dbList, dbErr, get dbOk() { return dbOk; } };