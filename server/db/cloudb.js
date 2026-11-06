"use strict";
/**
 * cloudb.js - CloudDB 存储云函数 handler(AGC Node.js)
 *
 * 请求(经 Worker 代理 data): { action: "get"|"put"|"del"|"list", extraData: {...} }
 * 数据行: NG 对象类型结构化字段
 *   id(主键) name flag bag(JSON字符串) dollar(整数) head etc(ctime) ...
 *
 *   get  {id}                     → { code:0, row:{...}|null }
 *   put  {id, name?,flag?,...}    → 部分字段更新(读旧行合并后整行 upsert) → { code:0, n }
 *   del  {id}                     → { code:0, n }
 *   list {}                       → { code:0, rows:[{...}] }
 *
 * 错误码: 0成功 5服务器错误
 */
var CloudDBZoneWrapper = require("./CloudDBZoneWrapper.js");
var FIELDS = CloudDBZoneWrapper.FIELDS;

var myHandler = async function (event, context, callback, logger) {
    var action, data;
    try {
        if (event.body) {
            var _body = JSON.parse(typeof event.body === 'string' ? event.body : JSON.stringify(event.body));
            action = _body.action;
            data = _body.extraData;
        } else {
            action = event.action;
            data = event.extraData;
        }
    } catch (e) {
        callback({ code: 5, msg: '请求解析失败' });
        return;
    }
    if (logger) logger.info("cloudb action: " + action + " id: " + (data && data.id) + " zone: " + (data && data.zone));

    // 存储区: 请求参数 zone 覆盖(缺省 DEFAULT_ZONE, 即环境变量 CLOUDDB_ZONE 或 "User")
    var w = new CloudDBZoneWrapper(logger, data && data.zone);
    try {
        switch (action) {
            case 'get': {
                if (!data || !data.id) { callback({ code: 5, msg: '缺少 id' }); return; }
                var row = await w.executeQueryById(data.id);
                callback({ code: 0, row: row });
                return;
            }
            case 'put': {
                if (!data || !data.id) { callback({ code: 5, msg: '缺少 id' }); return; }
                // 部分字段更新: 读旧行合并(缺省保留旧值), 整行 upsert
                var merged = await w.executeQueryById(data.id) || {};
                for (var i = 0; i < FIELDS.length; i++) {
                    var f = FIELDS[i];
                    if (data[f] !== undefined && data[f] !== null) merged[f] = data[f];
                }
                merged.id = data.id;
                var n = await w.executeUpsert(merged);
                callback({ code: 0, n: n });
                return;
            }
            case 'del': {
                if (!data || !data.id) { callback({ code: 5, msg: '缺少 id' }); return; }
                var dn = await w.executeDelete(data.id);
                callback({ code: 0, n: dn });
                return;
            }
            case 'list': {
                var rows = await w.executeQueryAll();
                callback({ code: 0, rows: rows });
                return;
            }
            default:
                callback({ code: 5, msg: 'invalid action: ' + action });
        }
    } catch (e) {
        if (logger) logger.info("cloudb error: " + (e && e.stack));
        callback({ code: 5, msg: '服务器错误: ' + (e && e.message) });
    }
};
exports.myHandler = myHandler;