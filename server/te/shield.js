'use strict';

/**
 * shield.js - 行内审计(纯函数, 零 CloudDB 操作)
 *
 * 最小写入契约(见 user.js/db.js): 审计不再独立占行。
 * 旧实现每次成功操作 = 1 次 upsert(独立行) + 1 次前缀查询 + N 次过期删除;
 * 现改为把审计条目合并进用户行 history 字段, 随业务同一次 upsert 落库, 额外操作数 = 0。
 *
 * 条目格式严格为 13 位 Unix 毫秒时间戳 + 操作代号(0 起, 可变长度), 条目间逗号分隔。
 * append 时在内存里惰性裁剪 24h 以前的条目并限制总条数(MAX_ENTRIES), 防行膨胀。
 *
 * 并发取舍: 读-合并-写非原子, 并发追加会末写覆盖丢条目(业务字段本就非原子, 见 db.js)。
 * 风控窗口(默认 10s/20 次)远大于单条丢失率, 且 Worker IP 闸门兜底, 故接受。
 *
 * 只审计"写自己行"的操作; 写别人行(好友申请/消息投递)不追加对方 history——
 * 否则攻击者可刷爆受害者 history 使其被 USER_RATE_LIMITED 误封。
 *
 * op: 0 reg / 1 user / 2 bag / 3 set / 4 buy / 5 del(遗留, 删行后不再写)
 *     6 friend(自己行) / 8 score / 9 mes clear
 * 纯读(find/sync/rank/profiles)与写别人行不审计, 由 Worker IP 闸门兜底。
 */

const RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 120;
/** 遗留独立审计行前缀(旧数据一次性清理用, 见 mag clean) */
const PREFIX = '__shield__';

/** 单条目: 13 位 ms + 操作代号(校验与旧版一致) */
function makeRecord(op, now) {
    const ts = String(Math.trunc(now == null ? Date.now() : now)).padStart(13, '0');
    if (!/^\d{13}$/.test(ts)) throw new Error('shield timestamp must be 13 digits');
    const code = String(op);
    if (!/^\d+$/.test(code)) throw new Error('shield operation code must be a non-negative integer');
    return ts + code;
}

/** 解析 history 字符串 → [{ts, op, record}]；垃圾数据静默跳过(不抛错) */
function parse(history) {
    const out = [];
    const parts = String(history == null ? '' : history).split(',');
    for (const p of parts) {
        const v = p.trim();
        if (!/^\d{13}\d+$/.test(v)) continue;
        const ts = Number(v.slice(0, 13));
        if (!isFinite(ts)) continue;
        out.push({ ts: ts, op: Number(v.slice(13)), record: v });
    }
    return out;
}

/**
 * 追加一条审计并返回新 history 字符串(纯函数, 不落库)。
 * 顺带裁剪过期(>24h)条目, 再按 MAX_ENTRIES 截断(保留最新)。
 */
function append(history, op, now) {
    const t = now == null ? Date.now() : now;
    const entry = makeRecord(op, t);
    const kept = parse(history).filter(e => t - e.ts <= RETENTION_MS);
    kept.push({ ts: Math.trunc(t), op: Number(op), record: entry });
    const tail = kept.length > MAX_ENTRIES ? kept.slice(kept.length - MAX_ENTRIES) : kept;
    return tail.map(e => e.record).join(',');
}

/** Worker 风控消费形态: [{record}] (与旧独立行查询返回同构) */
function records(history) {
    return parse(history).map(e => ({ record: e.record }));
}

/** 遗留独立行 id 前缀(仅 mag clean 一次性清理使用) */
function userPrefix(userid) {
    return PREFIX + encodeURIComponent(String(userid)) + '__';
}

module.exports = { makeRecord, parse, append, records, userPrefix, RETENTION_MS, MAX_ENTRIES, PREFIX };
