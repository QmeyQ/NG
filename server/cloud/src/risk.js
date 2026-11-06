/**
 * risk.js - IP 风控封禁管理(Cloudflare Worker 内存实现)
 *
 * 判定: 滑动窗口(WINDOW_MS)内请求数超过 MAX_HITS 视为一次违规
 * 惩罚(违规计数 n):
 *   - 第 1~9 次: 封 n*10 秒 (10s, 20s, ... 90s)
 *   - 第 10 次起: 每次 +30 秒 (90s+(n-9)*30s)
 *   - 隔天清除违规计数(重新从 10s 开始)
 *   - 封号: 当月从 1 号到今天每天都违规超过 30 次 → 永久封禁
 *
 * 说明: 状态存 isolate 内存, 重启丢失(不依赖 KV/Durable Objects 绑定)
 */

const WINDOW_MS = 10e3;   // 滑动统计窗口
const MAX_HITS = 20;      // 窗口内最大请求数
const MAX_TRACK = 10000;  // 最多跟踪 IP 数, 防内存膨胀

const DAY_MS = 86400e3;
const TZ_OFF = 8 * 3600e3;  // 东八区日界

/** 本地(东八区)日期键 yyyy-mm-dd */
function dayKeyOf(now) {
  return new Date(now + TZ_OFF).toISOString().slice(0, 10);
}
/** 月键 yyyy-mm */
function monthKeyOf(now) {
  return new Date(now + TZ_OFF).toISOString().slice(0, 7);
}
/** 当月 1 号 0 点(东八区)时间戳 */
function monthStartMs(now) {
  const d = new Date(now + TZ_OFF);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - TZ_OFF;
}

/** ip -> { times, dayKey, vioCount, monthKey, monthDays, until, forever } */
const state = new Map();

export function getClientIp(request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  );
}

function cleanWindow(rec, now) {
  while (rec.times.length > 0 && rec.times[0] <= now - WINDOW_MS) rec.times.shift();
}

function evictIfNeeded() {
  if (state.size <= MAX_TRACK) return;
  const now = Date.now();
  for (const [ip, rec] of state) {
    if (!rec.forever && rec.until <= now && rec.times.length === 0) state.delete(ip);
    if (state.size <= MAX_TRACK) break;
  }
}

/** 封号判定: 当月从 1 号到今天, 每天违规数都超过 30 次 */
export function isMonthBan(rec, now) {
  const start = monthStartMs(now);
  for (let t = start; t <= now; t += DAY_MS) {
    if ((rec.monthDays[dayKeyOf(t)] || 0) <= 30) return false;
  }
  return true;
}

/** 第 n 次违规的封禁时长(毫秒): 1~9 次 n*10s, 第 10 次起 90s+(n-9)*30s */
export function banMsOf(n) {
  return n <= 9 ? n * 10e3 : 90e3 + (n - 9) * 30e3;
}

/**
 * 某 IP 的风控快照, 供 /gobe/debug 排障用(只读, 不影响闸门)。
 * 无记录时返回 exists:false 的零值快照。
 */
export function getRiskSnapshot(ip, now = Date.now()) {
  const rec = state.get(ip);
  const reg = regState.get(ip);
  if (!rec) {
    return {
      exists: false,
      windowMs: WINDOW_MS,
      maxHits: MAX_HITS,
      hits: 0,
      vioCount: 0,
      bannedSec: 0,
      forever: false,
      regCount: reg ? reg.count : 0,
      regMax: REG_MAX
    };
  }
  return {
    exists: true,
    windowMs: WINDOW_MS,
    maxHits: MAX_HITS,
    hits: rec.times.length,
    vioCount: rec.vioCount,
    bannedSec: rec.until > now ? Math.ceil((rec.until - now) / 1000) : 0,
    forever: !!rec.forever,
    regCount: reg ? reg.count : 0,
    regMax: REG_MAX
  };
}

/**
 * 风控闸门: 每次请求调用一次
 * @returns {ok: true} 或 {ok: false, level, levelName, retryAfter(秒|null=永久/封号)}
 */
export function gate(ip) {
  const now = Date.now();
  const dayKey = dayKeyOf(now);
  const monthKey = monthKeyOf(now);
  let rec = state.get(ip);
  if (!rec) {
    rec = { times: [], dayKey: dayKey, vioCount: 0, monthKey: monthKey, monthDays: {}, until: 0, forever: false };
    state.set(ip, rec);
    evictIfNeeded();
  }

  // 封号: 永久拒绝
  if (rec.forever) {
    return { ok: false, level: 99, levelName: '封号', retryAfter: null };
  }

  // 隔天清除违规计数
  if (rec.dayKey !== dayKey) {
    rec.dayKey = dayKey;
    rec.vioCount = 0;
  }
  // 隔月清除月度记录
  if (rec.monthKey !== monthKey) {
    rec.monthKey = monthKey;
    rec.monthDays = {};
  }

  // 封禁中直接拒绝
  if (rec.until > now) {
    return {
      ok: false,
      level: 1,
      levelName: '封禁中',
      retryAfter: Math.ceil((rec.until - now) / 1000),
    };
  }

  // 记录本次请求并检查窗口超频
  rec.times.push(now);
  cleanWindow(rec, now);
  if (rec.times.length > MAX_HITS) {
    rec.vioCount++;
    rec.monthDays[dayKey] = (rec.monthDays[dayKey] || 0) + 1;
    rec.times = [];

    // 封号判定: 当月每天都违规超 30 次
    if (isMonthBan(rec, now)) {
      rec.forever = true;
      return { ok: false, level: 99, levelName: '封号', retryAfter: null };
    }

    const ms = banMsOf(rec.vioCount);
    rec.until = now + ms;
    const sec = Math.round(ms / 1000);
    return { ok: false, level: rec.vioCount, levelName: sec + ' 秒', retryAfter: sec };
  }

  return { ok: true };
}
// ==================== 注册限流(防 IP 批量刷号) ====================

/**
 * regLimit - IP 注册配额(内存实现, 与 gate 独立计数)
 *
 * 每 IP 每自然日(东八区)最多 REG_MAX 次 te reg(含 /token 注册分支与主代理路径),
 * 超出后当日拒绝。正常玩家(1 个/设备)与多设备家庭场景远低于配额。
 */

const REG_MAX = 5;
const regState = new Map(); // ip -> { dayKey, count }

/** 注册前检查: false=当日配额用尽 */
export function regAllowed(ip) {  const now = Date.now();
  const dayKey = dayKeyOf(now);
  let rec = regState.get(ip);
  if (!rec || rec.dayKey !== dayKey) {
    rec = { dayKey, count: 0 };
    regState.set(ip, rec);
    if (regState.size > MAX_TRACK) {
      // 防膨胀: 淘汰过期记录
      for (const [k, r] of regState) {
        if (r.dayKey !== dayKey) regState.delete(k);
        if (regState.size <= MAX_TRACK) break;
      }
    }
  }
  return rec.count < REG_MAX;
}

/** 注册成功后记账(仅 te reg 实际成功时调用) */
export function regHit(ip) {
  const now = Date.now();
  const dayKey = dayKeyOf(now);
  let rec = regState.get(ip);
  if (!rec || rec.dayKey !== dayKey) {
    rec = { dayKey, count: 0 };
    regState.set(ip, rec);
  }
  rec.count++;
}
/** 当日注册配额距重置的秒数(东八区次日 0 点), 给客户端做 retryAfter */
export function regResetSec(now = Date.now()) {
  const next = dayKeyOf(now + DAY_MS);
  if (next === dayKeyOf(now)) return DAY_MS / 1000;
  const midnight = (Math.floor((now + TZ_OFF) / DAY_MS) + 1) * DAY_MS - TZ_OFF;
  return Math.max(1, Math.ceil((midnight - now) / 1000));
}

// ==================== 用户历史风控 ====================
// 与 IP 闸门采用相同的默认窗口/阈值；可通过 Worker vars 覆盖。
// 历史数据由 Worker/agc.js 从 CloudDB 直接读取，查询失败由调用方 fail-closed。
export function userHistoryGate(records, env = {}, now = Date.now()) {
  const windowMs = Math.max(1000, Number(env.USER_RISK_WINDOW_MS) || WINDOW_MS);
  const maxHits = Math.max(1, Number(env.USER_RISK_MAX_HITS) || MAX_HITS);
  const cutoff = now - windowMs;
  let recent = 0;
  for (const item of Array.isArray(records) ? records : []) {
    const value = String(item && item.record || '');
    const ts = value.slice(0, 13);
    if (/^\d{13}$/.test(ts) && Number(ts) >= cutoff && Number(ts) <= now) recent++;
  }
  if (recent >= maxHits) {
    return {
      ok: false,
      code: 'USER_RATE_LIMITED',
      retryAfter: Math.max(1, Math.ceil(windowMs / 1000)),
      recent,
      limit: maxHits
    };
  }
  return { ok: true, recent, limit: maxHits };
}
