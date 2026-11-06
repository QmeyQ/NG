/**
 * CloudDBZoneWrapper - CloudDB 存储封装(AGC Node.js)
 *
 * 对象类型 NG(控制台创建, 结构化字段):
 *   id(主键) name flag bag(JSON) dollar(Integer) secret pass social
 *   head history record mes level etc(存 ctime)
 */
const clouddb = require('@hw-agconnect/database-server/dist/index.js');
const agconnect = require('@agconnect/common-server');
const path = require('path');

const { NG } = require("./NG.js");

// AGC 控制台下载的服务端凭据(随函数包部署)
const credentialPath = "/resources/agc-apiclient-1503913765794529216-7418901157095317432.json";
// 默认存储区(可被环境变量 CLOUDDB_ZONE 或请求参数 zone 覆盖)
const DEFAULT_ZONE = process.env.CLOUDDB_ZONE || "User";

let logger;
let agcInited = false;
/** zoneName -> mCloudDBZone 连接缓存 */
const zoneClients = new Map();
/** 最近一次初始化/操作错误(诊断: 客户端 code 5 时带回) */
let lastInitError = null;
let lastOpError = null;

// NG 字段列表(与对象类型定义一致)
const FIELDS = ['id', 'name', 'flag', 'bag', 'dollar', 'secret', 'pass', 'social', 'head', 'history', 'record', 'mes', 'level', 'etc'];

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/** 普通对象 → NG 行对象 */
function rowFromObj(o) {
    const n = new NG();
    for (const f of FIELDS) {
        if (o[f] !== undefined && o[f] !== null) n['set' + cap(f)](o[f]);
    }
    return n;
}

/** NG 行对象 → 普通对象 */
function objFromRow(r) {
    const o = {};
    for (const f of FIELDS) {
        try { o[f] = r['get' + cap(f)](); } catch (e) { o[f] = undefined; }
    }
    return o;
}

class CloudDBZoneWrapper {

    /**
     * AGC & 数据库初始化(幂等: 按存储区缓存连接)
     * @param log   logger
     * @param zone  存储区名(缺省 DEFAULT_ZONE, 即环境变量 CLOUDDB_ZONE 或 "User")
     */
    constructor(log, zone) {
        logger = log;
        this.zone = zone || DEFAULT_ZONE;
        if (zoneClients.has(this.zone)) return;
        try {
            try {
                agconnect.AGCClient.initialize(agconnect.CredentialParser.toCredential(path.join(__dirname, credentialPath)));
            } catch (e) {
                // 二次 initialize 抛错属预期, 单例已存在; 但凭据文件读取失败属真错误, 记录之
                const m = String(e && e.message || e);
                if (!/already|exist|init/i.test(m)) {
                    lastInitError = 'toCredential: ' + m + ' | path=' + path.join(__dirname, credentialPath);
                    if (logger) logger.info('cloudb credential error: ' + lastInitError);
                }
            }
            const agcClient = agconnect.AGCClient.getInstance();
            clouddb.AGConnectCloudDB.initialize(agcClient);
            const cloudDBZoneConfig = new clouddb.CloudDBZoneConfig(this.zone);
            const agconnectCloudDB = clouddb.AGConnectCloudDB.getInstance(agcClient);
            zoneClients.set(this.zone, agconnectCloudDB.openCloudDBZone(cloudDBZoneConfig));
            if (logger) logger.info("cloudb init ok zone=" + this.zone);
        } catch (e) {
            lastInitError = 'init zone=' + this.zone + ': ' + String(e && e.stack || e).split('\n').slice(0, 2).join(' | ');
            zoneClients.set(this.zone, null);
            if (logger) logger.info("cloudb init error zone=" + this.zone + ": " + (e && e.message));
        }
    }

    /** 查询/写入时记录操作错误(db.js catch 调用) */
    noteOpError(e) {
        lastOpError = String(e && e.message || e).slice(0, 300);
    }

    /** 最近一次错误(初始化优先, 其次操作) */
    static lastError() {
        return lastInitError || lastOpError || null;
    }

    /** 当前存储区客户端(未初始化返回 null) */
    get client() {
        return zoneClients.get(this.zone) || null;
    }

    /** 按主键查询一行(普通对象), 无则 null */
    async executeQueryById(id) {
        const c = this.client;
        if (!c) throw new Error("CloudDB 未初始化 zone=" + this.zone);
        const query = clouddb.CloudDBZoneQuery.where(NG).equalTo("id", String(id));
        const resp = await c.executeQuery(query);
        const arr = resp.getSnapshotObjects();
        if (!arr || !arr.length) return null;
        return objFromRow(arr[0]);
    }

    /** 查询全部行 */
    async executeQueryAll() {
        const c = this.client;
        if (!c) throw new Error("CloudDB 未初始化 zone=" + this.zone);
        const query = clouddb.CloudDBZoneQuery.where(NG);
        const resp = await c.executeQuery(query);
        const arr = resp.getSnapshotObjects() || [];
        return arr.map(objFromRow);
    }

    /** 写入(整行 upsert, 主键相同则覆盖), 返回影响行数 */
    async executeUpsert(obj) {
        const c = this.client;
        if (!c) throw new Error("CloudDB 未初始化 zone=" + this.zone);
        return await c.executeUpsert(rowFromObj(obj));
    }

    /** 按主键删除, 返回影响行数 */
    async executeDelete(id) {
        const c = this.client;
        if (!c) throw new Error("CloudDB 未初始化 zone=" + this.zone);
        return await c.executeDelete(rowFromObj({ id: id }));
    }
}

module.exports = CloudDBZoneWrapper;
module.exports.FIELDS = FIELDS;
module.exports.DEFAULT_ZONE = DEFAULT_ZONE;module.exports.lastError = CloudDBZoneWrapper.lastError;