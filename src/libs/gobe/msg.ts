/**
 * msg — 房间消息唯一收发层
 *
 * 一封信只有一个格式, 信封字段全部由本文件写, 调用点只填自己的载荷:
 *   { v, kind, seq, time, from, to?, authTerm, ...载荷 }
 * - seq: 本端发送计数器(单调 +1)。用途是"可靠点对点通道有没有丢包"的观测量;
 *   真正的先后判定由各 kind 声明的业务序号字段(assignSeq / syncSeq)负责——
 *   那两个字段的定义域就是它们的业务语义, 而本机计数器页面一重载会从头开始。
 * - from: 本端身份。接收端一律与【GOBE 报的实收发送者 sendPlayerId】比对;
 *   载荷里再自带 playerId 就成了"自称是谁"的第二套口径(历史上错房主/旧权威的消息
 *   就是这么混进来的)。内嵌在帧载荷里的小对象(击球事件)可以不写 from, 它的发送者
 *   身份由外层帧的 from 负责。
 * - to: 只在定向发送时写入, 未被点名的一端直接吞掉。
 * - authTerm: 权威任期。比本机认定值小的整封丢弃(旧权威迟到的消息不能覆盖新权威状态);
 *   比本机大的【不】在这里采纳——任期是权威裁决的输入, 只有 pvp.ts 的裁决路径能改写它。
 *
 * roomEpoch 没有进信封: GOBE 不提供跨重连的房间代次, 编一个假值比不写更坏。
 * 权威代次由 authTerm 承担, 房间身份由指派协议里的 roomId 字段承担(load.ts 用)。
 *
 * 去重 / 过期 / 体积三件事在 registry 里逐 kind 声明一次, 由 accept() 统一执行;
 * 校验器仍住 pvpProto(线上字段语义的规范处): checkAssign 管指派三件套, checkHit 管击球事件。
 *
 * 通道分工与 pvpProto 顶部一致: ch='msg' 走 sendToClient(可靠, 事件与协商),
 * ch='frame' 走 sendFrame(服务端聚合、不可靠, 承载"当前画面"与小量选举通告)。
 */
import { Gnet } from "./net";
import { Timer } from "../time";
import * as Proto from "../pvpProto";

/** 消息归属上下文: game = 对局内(pvp.ts), match = 匹配页(load.ts); 决定身份从哪一份读 */
export type Space = 'game' | 'match';

/** 发送侧配置: 全部按引用读取, 因为权威端与任期在局中会变 */
export interface SpaceCtx {
    /** 本机在房间体系里的 playerId */
    selfId(): string;
    /** 本机认定的当前权威端 */
    authId(): string | null;
    /** 本机认定的权威任期 */
    authTerm(): number;
    /** 收到该端任何消息时的旁路(存活判定口径: 帧与消息都算"还在说话") */
    onAnyMessage?(senderId: string, kind: string): void;
}

/** 校验器上下文: selfId/authTerm 供 pvpProto 的校验函数使用 */
export interface CheckCtx { selfId: string; authTerm: number; }

type Handler = (data: any, senderId: string) => void;

interface KindSpec {
    ch: 'msg' | 'frame';
    space: Space;
    /**
     * 只认权威端的消息。判定含"任期更高"这一支: 新权威端上任后发出的第一批消息,
     * 很可能早于本机更新所认定的权威端 ID, 纯 ID 比较会把开局状态整批丢掉。
     */
    authOnly?: boolean;
    /** 定向消息必须点名本机 */
    forMe?: boolean;
    /** 去重键(返回 null = 本条不去重); 同键只处理一次, 表有上限按到达序淘汰 */
    dedupe?: (data: any, senderId: string) => string | null;
    /** 业务序号字段: 小于同一发送方已接受过的值即过期 */
    seqField?: string;
    /** 序号相等也丢弃(重发同一条没有新信息, 还会重复回执) */
    seqStrict?: boolean;
    /**
     * 发送时刻年龄上限(ms)。只有"按 (现在-发送时刻) 积分会把球推回很久以前"的载荷才设——
     * 两端设备钟差未知, 拿绝对时间戳判过期会误杀正常消息, 其余种类一律靠 seq / 任期定序。
     */
    maxAgeMs?: number;
    /** 结构校验器(pvpProto 提供), 返回拒绝原因; 失败原因在 accept 里加 check: 前缀 */
    check?: (data: any, ctx: CheckCtx) => string | null;
}

/** 单条消息序列化上限(字符): 超出说明调用方把大块画面数据塞进了点对点消息 */
export const MAX_MSG_CHARS = 60000;
/** 去重表上限(按到达序淘汰): 远大于单局击球/提案数, 只防长局内存无界增长 */
const DEDUPE_MAX = 1024;

const K = Proto.Kind;

/**
 * kind 注册表: 每个种类自己说清走哪条通道、谁发的才算、怎么去重、怎么算过期。
 * 新增 kind 只改这里 + pvpProto 的 Kind 表, 不要在调用点补 if。
 */
export const registry: Record<string, KindSpec> = {
    // ---- 对局: 操作与鹰眼 ----
    [K.Action]: {
        ch: 'msg', space: 'game',
        // 击球意图按 eventId 去重(同一条重达两次不能出手两回); move 不去重(每帧都是新值)
        dedupe: (d) => (d.type === 'hit' ? key(d.eventId, 'hit:') : null)
    },
    [K.Eagle]: { ch: 'msg', space: 'game' },

    // ---- 对局: 比分与阶段状态机三步确认 ----
    [K.StatePropose]: { ch: 'msg', space: 'game', authOnly: true, dedupe: (d) => key(d.proposeId) },
    [K.StateConfirm]: { ch: 'msg', space: 'game', dedupe: (d, from) => key(d.proposeId) + '@' + from },
    [K.StateFinal]: { ch: 'msg', space: 'game', authOnly: true, dedupe: (d) => key(d.proposeId) },

    // ---- 对局: 权威端选举 ----
    [K.AuthDeclare]: { ch: 'msg', space: 'game' },
    [K.AuthCandidate]: { ch: 'frame', space: 'game' },
    [K.NonAuthFrame]: { ch: 'frame', space: 'game' },
    // 权威快照帧: 由 pvp.ts 的帧入口拿 accept() 当任期/序号闸门(它是大载荷组装, 不参与路由)
    [K.AuthFrame]: { ch: 'frame', space: 'game', authOnly: true, seqField: 'syncSeq' },
    // 击球事件走【可靠通道】: 球是绝对时间驱动的确定性模拟, 一次击球的(参数+进入时刻+入口状态)
    // 就是之后全部轨迹的唯一依据——这条丢了, 两端从那一刻起就是两段弹道, 后续任何时刻都对不上。
    // 以前它随 10Hz 权威帧(sendFrame, 有损)携带, 于是"丢一次击球"要靠整段轨迹重锚才能救回来。
    [K.HitEvent]: {
        ch: 'msg', space: 'game', authOnly: true,
        // 不设 maxAgeMs: 迟到也要落地(入口不落地=两端两段弹道, 之后再也对不上)。
        // 射程失控由 catchUpBall 的补算封顶挡住, 残余误差由 ball_stop 兜底对齐。
        dedupe: (d) => key(d.eventId),
        check: (d, ctx) => Proto.checkHit(d, { now: Timer.now(), authTerm: ctx.authTerm })
    },
    // 球停止后权威端报一次自己的球位: 参数同步的兜底对齐点(只在"停了"这个时刻发一次)
    [K.BallStop]: {
        ch: 'msg', space: 'game', authOnly: true,
        dedupe: (d) => key(d.stopId)
    },

    // ---- 对局: 异常恢复 ----
    [K.SyncRecover]: { ch: 'msg', space: 'game', dedupe: (d) => key(d.requestId) },
    [K.BallRecovery]: { ch: 'msg', space: 'game', authOnly: true, forMe: true, dedupe: (d) => key(d.requestId) },
    [K.RoleRecoverRequest]: { ch: 'msg', space: 'game', dedupe: (d) => key(d.requestId) },
    [K.RoleRecover]: { ch: 'msg', space: 'game', authOnly: true, forMe: true, dedupe: (d) => key(d.requestId) },
    [K.PlayerStateReport]: { ch: 'msg', space: 'game' },
    [K.AnimStateRequest]: { ch: 'msg', space: 'game' },
    [K.AnimStateBroadcast]: { ch: 'msg', space: 'game', authOnly: true },

    // ---- 匹配页: 角色指派单源化 ----
    [K.RoleAssign]: {
        ch: 'msg', space: 'match', seqField: 'assignSeq', seqStrict: true,
        check: (d, ctx) => Proto.checkAssign(d, ctx.selfId)
    },
    [K.RoleAck]: { ch: 'msg', space: 'match' },
    [K.MatchStart]: { ch: 'msg', space: 'match', check: (d, ctx) => Proto.checkAssign(d, ctx.selfId) }
};

const ctxs: Partial<Record<Space, SpaceCtx>> = {};
const handlers = new Map<string, Handler>();
const seen = new Set<string>();
const seenOrder: string[] = [];
const lastSeq = new Map<string, number>();
/** 各发送方最近见过的信封 seq(只用于丢包观测) */
const lastEnv = new Map<string, number>();
let sendSeq = 0;
let lastDropLogAt = 0;

function key(v: any, prefix = ''): string | null {
    if (typeof v === 'string' && v) return prefix + v;
    if (typeof v === 'number' && Number.isFinite(v)) return prefix + v;
    return null;
}

function sameId(a: any, b: any): boolean {
    return String(a == null ? '' : a).trim() === String(b == null ? '' : b).trim();
}

/** 注册某一侧的身份上下文与处理器; 同 kind 的旧处理器被直接顶掉(旧场景实例不再抢消息) */
export function bind(space: Space, ctx: SpaceCtx, subs: Record<string, Handler>): void {
    ctxs[space] = ctx;
    for (const kind of Object.keys(subs)) handlers.set(kind, subs[kind]);
}

/**
 * 摘除: 处理器只摘引用相符的, ctx 只摘身份相符的——
 * 新场景实例先 bind、旧实例后 destroy 是常态, 无脑 delete 会把新局的服务摘没了。
 */
export function unbind(space: Space, ctx: SpaceCtx, subs: Record<string, Handler>): void {
    for (const kind of Object.keys(subs)) {
        if (handlers.get(kind) === subs[kind]) handlers.delete(kind);
    }
    if (ctxs[space] === ctx) delete ctxs[space];
}

/**
 * 按 registry 组装并发送。返回 false = 没发出去(未登记 / 体积超限)。
 * target 省略即广播; 只有一个收件人时写入信封 to, 由接收侧的 forMe 规则过滤。
 */
export function send(kind: string, payload?: any, target?: string[]): boolean {
    const spec = registry[kind];
    const ctx = spec && ctxs[spec.space];
    if (!spec || !ctx) {
        console.error(`[msg] 未登记的 kind: ${kind}`);
        return false;
    }
    const msg = Object.assign({
        v: Proto.V,
        kind,
        seq: ++sendSeq,
        time: Timer.now(),
        from: ctx.selfId(),
        authTerm: ctx.authTerm()
    }, payload || {});
    if (target && target.length === 1) msg.to = String(target[0]);
    const text = JSON.stringify(msg);
    if (text.length > MAX_MSG_CHARS) {
        console.error(`[msg] ${kind} 超出单条上限(${text.length}>${MAX_MSG_CHARS}), 未发送`);
        return false;
    }
    if (spec.ch === 'frame') Gnet.sendFrame(text);
    else Gnet.sendToClient(1, text, target);
    return true;
}

/** 该发送方当前算不算权威端(含"任期更高"一支, 见 KindSpec.authOnly) */
function isFromAuthority(ctx: SpaceCtx, data: any, senderId: string): boolean {
    if (sameId(senderId, ctx.authId())) return true;
    const term = Number(data.authTerm);
    return Proto.isNum(term) && term > ctx.authTerm();
}

/**
 * 信封 + registry 规则的统一裁决: null = 接受, 否则返回拒绝原因。
 * 不做路由, 所以 A 通道内嵌的小载荷(权威快照帧、击球事件)也复用这同一个函数。
 */
export function accept(kind: string, data: any, senderId: string): string | null {
    const spec = registry[kind];
    const ctx = spec && ctxs[spec.space];
    if (!spec || !ctx) return 'unknown-kind';
    if (!data || typeof data !== 'object') return 'no-payload';
    if (data.v !== Proto.V) return 'version';
    if (sameId(senderId, ctx.selfId())) return 'self-echo';
    // from 缺省 = 发送者身份由外层载荷负责(帧内嵌对象); 带了就必须等于 GOBE 报的实收发送者
    if (data.from != null && !sameId(data.from, senderId)) return 'spoofed-from';
    if (typeof data.authTerm === 'number' && data.authTerm < ctx.authTerm()) return 'stale-term';
    if (spec.authOnly && !isFromAuthority(ctx, data, senderId)) return 'not-from-authority';
    if (spec.forMe && !sameId(data.to, ctx.selfId())) return 'not-for-me';
    if (spec.maxAgeMs != null && Proto.isNum(data.time) && Timer.now() - data.time > spec.maxAgeMs) return 'stale';
    if (spec.seqField) {
        const id = kind + '@' + String(senderId);
        const cur = Number(data[spec.seqField]);
        const prev = lastSeq.get(id);
        if (Proto.isNum(cur)) {
            if (prev != null && (cur < prev || (spec.seqStrict && cur === prev))) return 'stale-seq';
            lastSeq.set(id, cur);
        }
    }
    if (spec.check) {
        const why = spec.check(data, { selfId: ctx.selfId(), authTerm: ctx.authTerm() });
        if (why) return 'check:' + why;
    }
    const dk = spec.dedupe && spec.dedupe(data, senderId);
    if (dk) {
        const id = kind + '#' + dk;
        if (seen.has(id)) return 'dedupe';
        seen.add(id);
        seenOrder.push(id);
        if (seenOrder.length > DEDUPE_MAX) {
            for (const drop of seenOrder.splice(0, seenOrder.length - DEDUPE_MAX)) seen.delete(drop);
        }
    }
    return null;
}

/** accept 之前先读该发送方上一个被接受的业务序号, 供调用方做缺口检测 */
export function lastAcceptedSeq(kind: string, senderId: string): number {
    return lastSeq.get(kind + '@' + String(senderId)) ?? 0;
}

/**
 * 路由一条消息: 身份旁路 → 规则裁决 → 交给该 kind 的处理器。
 * @returns 是否已处理(未登记 / 被规则丢弃 / 无人注册都返回 false)
 */
export function dispatch(data: any, senderId: string): boolean {
    const kind = data && typeof data.kind === 'string' ? data.kind : '';
    const spec = registry[kind];
    const ctx = spec && ctxs[spec.space];
    if (!spec || !ctx) return false;
    ctx.onAnyMessage?.(senderId, kind);
    const why = accept(kind, data, senderId);
    if (why) {
        logDrop(kind, why, senderId);
        return false;
    }
    trackEnvSeq(data, senderId);
    const h = handlers.get(kind);
    if (!h) return false;
    h(data, senderId);
    return true;
}

/** 直接吃 Gnet 的 onClient 回调参数: 非 JSON(系统文本消息)返回 false 交调用方处理 */
export function dispatchInfo(info: any): boolean {
    if (!info || typeof info.msg !== 'string') return false;
    let data: any = null;
    try { data = JSON.parse(info.msg); } catch (e) { return false; }
    return dispatch(data, info.sendPlayerId);
}

/** 信封序号出现缺口 = 点对点通道真丢包了; 节流报警, 实测定位用 */
function trackEnvSeq(data: any, senderId: string): void {
    const id = String(senderId);
    const prev = lastEnv.get(id);
    const cur = Number(data.seq);
    if (Proto.isNum(cur)) {
        if (prev != null && cur > prev + 1) {
            const now = Timer.now();
            if (now - lastDropLogAt > 1000) {
                lastDropLogAt = now;
                console.warn(`[msg] ${data.kind} 序号缺口 ${prev} -> ${cur} from=${id}`);
            }
        }
        lastEnv.set(id, Math.max(prev ?? 0, cur));
    }
}

function logDrop(kind: string, why: string, senderId: string): void {
    // dedupe 是设计内的常态(提案重达/事件重发), 不占报警额度
    if (why === 'dedupe' || why === 'self-echo') return;
    const now = Timer.now();
    if (now - lastDropLogAt < 1000) return;
    lastDropLogAt = now;
    console.warn(`[msg] 丢弃 ${kind} from=${senderId} 原因=${why}`);
}
