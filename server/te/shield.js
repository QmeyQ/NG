'use strict';

/**
 * TE CloudDB 操作审计记录。
 * record 字段格式严格为 13 位 Unix 毫秒时间戳 + 操作代号(0 起，可变长度)。
 * 每条记录单独占一行，避免并发 append 覆盖；记录行 id 以用户前缀区分。
 * 记录保留 24 小时；每次写入时顺带清理该用户过期记录。
 */
const CloudDBZoneWrapper = require('./CloudDBZoneWrapper');
const crypto = require('crypto');

const ZONE = process.env.CLOUDDB_ZONE || 'User';
const PREFIX = '__shield__';
const RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_SCAN = 500;
let wrapper;

function getWrapper() {
    if (!wrapper) wrapper = new CloudDBZoneWrapper(null, ZONE);
    return wrapper;
}

function userPrefix(userid) {
    return PREFIX + encodeURIComponent(String(userid)) + '__';
}

function makeRecord(op, now) {
    const ts = String(Math.trunc(now == null ? Date.now() : now)).padStart(13, '0');
    if (!/^\d{13}$/.test(ts)) throw new Error('shield timestamp must be 13 digits');
    const code = String(op);
    if (!/^\d+$/.test(code)) throw new Error('shield operation code must be a non-negative integer');
    return ts + code;
}

async function record(userid, op) {
    if (userid === undefined || userid === null || String(userid) === '') {
        throw new Error('shield userid is required');
    }
    const now = Date.now();
    const recordValue = makeRecord(op, now);
    const prefix = userPrefix(userid);
    const id = prefix + recordValue + '__' + crypto.randomBytes(6).toString('hex');
    const w = getWrapper();

    // 先写本次记录。记录行只使用 NG 已有的 id / record 字段。
    await w.executeUpsert({ id, record: recordValue });

    // 懒清理该用户 24 小时以前的记录；清理失败不吞掉，避免误以为审计已完整。
    const oldRows = await w.executeQueryByIdPrefix(prefix, MAX_SCAN);
    for (const row of oldRows) {
        const value = String(row.record || '');
        const timestamp = value.slice(0, 13);
        if (!/^\d{13}$/.test(timestamp) || now - Number(timestamp) > RETENTION_MS) {
            await w.executeDelete(row.id);
        }
    }
    return recordValue;
}

module.exports = { record, makeRecord, userPrefix, RETENTION_MS };
