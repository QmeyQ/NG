/**
 * Worker 侧 CloudDB 直连（不经云函数），用于用户风控查询(主键点查用户行 history 行内审计)。
 * 协议与 Huawei CloudDB Server SDK 一致：
 *   POST https://connect-api.cloud.huawei.com/api/clouddb/clouddbservice/v4/objects/queries
 *   Bearer token + clientid/productid 标识头，body 含 objectTypeName / cloudDBZoneName / queryConditions
 */
import { getAccessToken } from './agc/tokenService.js';

const SERVICE_PREFIX = 'api/clouddb/clouddbservice/';
const QUERY_PATH = 'v4/objects/queries';
const RETENTION_MS = 24 * 60 * 60 * 1000;

// CloudDB 服务端网关（与云函数/OAuth 同源的 connect-api 网关，非 connect-drcn 授权网关）
const CLOUDDB_GATEWAY = 'https://connect-api.cloud.huawei.com/';
const CLOUDDB_BACKUP_GATEWAY = 'https://connect-api.cloud.huawei.com.cn/';

// CloudDB 对象类型与存储区（服务端固定配置）
const CLOUDDB_ZONE = 'User';
const CLOUDDB_OBJECT_TYPE = 'NG';
const QUERY_LIMIT = 500;

function requestId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function cloudDbHeaders(cred, token, id) {
  return {
    Authorization: `Bearer ${token}`,
    client_Id: String(cred.clientId || ''),
    productId: String(cred.projectId || ''),
    requestId: id,
    traceId: id,
    serverSdkName: 'node/cloud-server/database-server',
    serverSdkVersion: '1.0.0',
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
}

async function postQuery(cred, body) {
  const token = await getAccessToken(cred);
  if (!token) throw new Error('AGC Access Token 获取失败');
  const id = requestId();
  const headers = cloudDbHeaders(cred, token, id);
  const urls = [CLOUDDB_GATEWAY, CLOUDDB_BACKUP_GATEWAY].map(
    base => `${base}${SERVICE_PREFIX}${QUERY_PATH}`
  );
  let lastError;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000)
      });
      const text = await response.text();
      let payload;
      try { payload = JSON.parse(text); } catch { payload = null; }
      if (!response.ok) {
        lastError = new Error(`CloudDB HTTP ${response.status}: ${text.slice(0, 500)}`);
        continue;
      }
      if (!payload || !payload.data) {
        lastError = new Error(`CloudDB 响应缺少 data: ${text.slice(0, 500)}`);
        continue;
      }
      return payload;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('CloudDB 主、备用网关均请求失败');
}

/**
 * 读取某用户近 24h 的操作审计记录(行内 history 字段)。
 * 最小写入契约: 审计已合并进用户行(te/shield.js 纯函数追加), 不再写独立 __shield__ 行。
 * 这里按主键 EqualTo 点查单行(替代旧前缀扫描 ≤500 行), 解析 history 为 [{record}]。
 * 行不存在(已注销/未注册) → 返回 [](闸门放行, 后续 te 分支自会回 code 1)。
 * 查询/解析失败 → 抛错, 由调用方 fail-open 记录放行(与旧行为一致)。
 */
export async function getUserCallHistory(cred, env, userid) {
  if (userid === undefined || userid === null || String(userid) === '') {
    throw new Error('CloudDB 风控查询缺少 userid');
  }
  const id = String(userid);
  const body = {
    objectTypeName: CLOUDDB_OBJECT_TYPE,
    cloudDBZoneName: CLOUDDB_ZONE,
    isQueryDelete: false,
    queryConditions: [
      { conditionType: 'EqualTo', fieldName: 'id', value: id },
      { conditionType: 'Limit', fieldName: null, value: { offset: 0, number: 1 } }
    ]
  };

  const payload = await postQuery(cred, body);
  const rows = payload.data.data;
  if (!Array.isArray(rows)) {
    throw new Error('CloudDB 查询结果 data.data 不是数组');
  }
  if (!rows.length) return [];

  const cutoff = Date.now() - RETENTION_MS;
  const history = String(rows[0].history || '');
  const out = [];
  for (const part of history.split(',')) {
    const value = part.trim();
    if (!/^\d{13}\d+$/.test(value)) continue;
    const timestamp = value.slice(0, 13);
    if (Number(timestamp) >= cutoff) out.push({ id: id, record: value });
  }
  return out;
}
