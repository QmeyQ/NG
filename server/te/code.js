/**
 * code.js - 确定性密匙计算(AGC Node.js)
 *
 * key(userid): userid -> 32 hex 字符的确定性密匙
 *              服务器无需查库, 由 userid 直接重算即可验证用户
 * keyOk(userid, submitted): 常数时间比对, 不泄露"差在哪一位"
 *
 * 安全前提: SALT 仅存在于服务端代码, 不随客户端下发。
 *           SALT 一旦泄露, 所有 userid 的密匙均可被离线重算。
 */
const crypto = require('crypto');

// 加盐(仅服务器端, 不可泄露)
const SALT = 'ng~te#2026$kx';

/** userid -> 确定性密匙(32 hex 字符) */
function key(userid) {
    return crypto.createHash('sha256')
        .update(SALT + '\x00' + String(userid))
        .digest('hex').slice(0, 32);
}

/** 常数时间比对: 不查库, 纯计算 */
function keyOk(userid, submitted) {
    if (typeof submitted !== 'string') return false;
    const expected = key(userid);
    if (submitted.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
        diff |= expected.charCodeAt(i) ^ submitted.charCodeAt(i);
    }
    return diff === 0;
}

module.exports = { key, keyOk };