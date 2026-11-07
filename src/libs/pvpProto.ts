/**
 * pvpProto — PVP 联机通讯协议的唯一定义处(消息种类 / 字段 / 校验 / 球快照编解码)
 *
 * ── 球为什么不需要连续同步(本项目的核心前提) ──────────────────────────
 * 球是【绝对时间驱动】的确定性模拟: 给定 (击球参数, 进入时刻, 入口状态), 任意时刻的状态
 * 由物理内核唯一决定。所以:
 *   - 要同步的只有"每一次击球的那一条": 参数 + 时刻 + 入口状态锚点 → 走 B 可靠通道(hit_event);
 *   - 两端各自 simTo(现在) 之后必然一致, 每帧拽球位是错的方向(它把本该一致的量变成永远在纠偏);
 *   - 钉在手上/停在落点属于【附件】不是【弹道】: 两端按同一权威状态(阶段 + holderId)各自本地钉,
 *     手的位置本身就是同步来的角色坐标, 所以钉出来必然一致;
 *   - 链断(迟入 / 接管 / 击球序号缺口)才用 recovery 给一次完整锚点, 之后回到参数驱动。
 * 以往所有"各打各的 / 球瞬移 / 无限远击球"类问题, 根因都是这条没成立: 要么击球参数根本没同步,
 * 要么用连续球位覆盖代替了参数同步。
 *
 * ── 行为规则(用户规格; 改同步逻辑前先照这几条对, 别从故障现象反推) ─────────
 * R1 击球入口四件套一条不落: 击球参数 + 击球时刻 + 入口球状态 + 击球者坐标。
 *    自己这一拍也要按权威入口重锚——本地先出手用的是【本端当时】的球状态, 权威端用的是【它当时】
 *    的球状态, 两份入口差一点, 同参数同时刻也会飞成两条线(run38 稳态 median 2.6m 的来源)。
 * R2 兜底只有这一条: 球停止后同步一次权威端的球位置(ball_stop), 用于对齐, 不当常规纠偏。
 * R3 任何状态都要能被同步立即带走, 不允许"本地某个字段卡住状态推进"——
 *    典型反例: 钉球等本端自己判"球停下了", 而两端各自积分的休眠/贴地判定不会同时成立,
 *    于是一端钉回手上、另一端还躺在地上(run38 连续 36 个超差样本)。持球者只认权威 id。
 * R4 比分结算【不】停止球的模拟: 落地后自己滚完; 只有下一回合分配球权才钉回手上。
 * R5 鹰眼: 双击确认后只显示"鹰眼挑战中"(确认期倒计时文字立刻消失), 且两端必须一起进
 *    (轨迹记录一起同步; 本机没记录也照样进阶段, 不能一个人进鹰眼另一个人没进)。
 *
 * ── 通道 ─────────────────────────────────────────────────────────────
 * A. 帧通道  Gnet.sendFrame(压缩 JSON)             心跳级, 只有【角色画面】走这里(可丢, 下一帧自愈)
 *      权威帧  { players:[{id,x,y,z,isP,state,isMoving,moveState,anim}] }
 *      非权威帧 { nonAuthFrame:true, playerId, authId, time, cha:{...} }
 * B. 消息通道 Gnet.sendToClient(1, json[, target])  事件与协商, 以及【击球事件】
 *      注意: GOBE 的 sendToClient 实测会丢包(限流/中继丢弃, 信封序号缺口为证), 并非真可靠。
 *      "必须可靠送达"的种类(hit_event/ball_stop)由 msg.ts 加【应用层 ACK+重传】兜底:
 *      发送方挂起待 ack, 300ms 未收到 event_ack 就重发同一载荷(接收方按 eventId/stopId 去重,
 *      重发幂等), 收到 ack 才销账, ~5s 仍无 ack 放弃并告警(交给击球序号缺口 recovery 兜底)。
 *      其余种类(action/anim/帧)丢了自愈, 不挂起重传。
 * C. 服务器通道 本项目未启用: room.sendToServer 全仓无调用, realtimeserver/index.ts 按
 *      data.type 分发而客户端发的是 data.kind → 那条链路是死的。要上服务器权威,
 *      第一步就是让服务端与本表对齐(kind + v + authTerm), 而不是再加一套字段名。
 *
 * ── kind 表 ────────────────────────────────────────────────────────
 * 收发信封与逐 kinds 的通道/去重/过期规则在 libs/gobe/msg.ts, 本文件只定字段语义与校验。
 * action                  本地操作回放(move/hit), 权威端负责把它转成带 seq 的击球事件
 * hit_event               一条弹道的全部入口(参数 + 时刻 + 入口状态锚点), 【必须可靠送达】
 * ball_stop               {stopId, bt, ball, hs} 球停止后权威端报一次自己的球位(R2 兜底);
 *                         hs=发送方此刻的权威击球序号, 接收端已应用更晚击球时整条丢弃
 *                         (上一回合的停球不能钉住新回合正在飞的球)
 * event_ack               {ackKind, ackId} 可靠种类的签收: 接收端接受/去重命中都会回一份,
 *                         发送方收到才销账; ack 自己丢了无所谓, 重传会再换一份(幂等)
 * state_propose / state_confirm / state_final   比分与阶段状态机三步确认
 * auth_declare            权威端声明(任期 authTerm 单调递增, 小的一律降级)
 * sync_recover / ball_recovery                  请求一次权威快照 / 回一份权威快照(链断重锚)
 * state_recover_request / state_recover         角色状态补(用于卡帧修复)
 * player_state_report     非权威端报告自己看到的自身状态, 供权威端纠偏
 * anim_state_request / anim_state_broadcast     动作状态补齐
 * eagle                   鹰眼挑战确认
 * role_assign / role_ack / match_start         进房角色指派(匹配页 load.ts, 房主单源)
 * auth_frame / non_auth_frame / auth_candidate  走帧通道的三种载荷
 *
 * ── 约定(新增字段请全部走这里, 别再散落各处) ──────────────────────────
 * v: 协议版本, 收到高版本只解公共字段; authTerm: 权威任期; time: 发送方 Timer.now()
 * 定点网格: 与物理内核一致 1/1024(Fx.SC), 球快照直接传整数, 杜绝浮点影子被 iSync 覆盖
 * 一切远端数据先过本文件校验再落盘到模拟: 坐标必须有限且在场地范围内,
 * 击球事件必须不陈旧、任期匹配、与本端可回退的历史大致吻合。
 */

/** 协议版本: 线上字段语义变化时 +1 */
export const V = 2;

/** B 通道消息种类(通道/authOnly/去重/时效规则见 libs/gobe/msg.ts 的 registry) */
export const Kind = {
    Action: 'action',
    Eagle: 'eagle',
    StatePropose: 'state_propose',
    StateConfirm: 'state_confirm',
    StateFinal: 'state_final',
    AuthDeclare: 'auth_declare',
    SyncRecover: 'sync_recover',
    BallRecovery: 'ball_recovery',
    RoleRecoverRequest: 'state_recover_request',
    RoleRecover: 'state_recover',
    PlayerStateReport: 'player_state_report',
    AnimStateRequest: 'anim_state_request',
    AnimStateBroadcast: 'anim_state_broadcast',
    /** 角色指派单源化: 房主出表 → 全员 ack → 房主广播 start */
    RoleAssign: 'role_assign',
    RoleAck: 'role_ack',
    MatchStart: 'match_start',
    // ---- A 通道(帧)上的种类: 同一条 msg 层规则, 只是发送走 sendFrame ----
    /** 权威快照帧外壳 { frame, state, authTerm, syncSeq } —— 只有角色画面, 不带球位 */
    AuthFrame: 'auth_frame',
    /** 击球事件(参数 + 击球时刻 + 入口球状态 + 击球者位置): 弹道的唯一入口, 走可靠消息通道 */
    HitEvent: 'hit_event',
    /** 球停止(落地/死球)后权威端报一次自己的球位 —— 参数同步的兜底对齐点 */
    BallStop: 'ball_stop',
    /** 可靠种类(hit_event/ball_stop)的签收: 发送方凭它销账, 见 msg.ts 的 ACK+重传层 */
    EventAck: 'event_ack',
    /** 非权威端上报的本地角色帧 */
    NonAuthFrame: 'non_auth_frame',
    /** 选举候选通告 */
    AuthCandidate: 'auth_candidate'
} as const;

// ==================== 时间与误差阈值(米 / 毫秒) ====================

/** 单次重放最多补算的飞行时长: 迟到的击球只补这么多, 剩下的差由 ball_stop 兜底对齐 */
export const CATCHUP_MAX_MS = 600;

/** 定点网格, 与物理内核 Fx.SC 一致 */
export const Q = 1024;

// ==================== 权威端存活判定(阶段感知三级, 取代固定 500ms 硬超时升格) ====================

/** 权威帧静默多久先向权威端发一次"消息同步请求"(帧是唯一模拟器口径, 消息回执不算) */
export const ASK_SYNC_MS = 1000;
/** 消息同步请求的重发间隔(权威端必须用消息把状态回过去, 不能只靠帧) */
export const ASK_RETRY_MS = 1000;
/** 发球阶段允许的最大帧静默: 发球阶段权威端每秒都要有一帧, 2s 没有帧即进入升格流程 */
export const SERVING_SILENT_MS = 2000;
/** 帧静默上限: 到这才允许升格自己。口径是【帧】不是"帧+消息"——
 *  权威端是唯一模拟器, 帧停了画面就停了, 消息急救包只能把误差维持在秒级(实测 42m 球位差) */
export const PROMOTE_SILENT_MS = 3000;

/**
 * 升格候选的公认排序: 两端拿到的是同一份房间玩家顺序时按"失效权威端的下一位"轮转;
 * 顺序拿不准(失效权威端已不在列表/两端列表不一致)时按 playerId 字典序取第一个。
 * 绝不使用随机或本机私有下标——那正是两端各自升格、权威端来回翻转的源头。
 */
export function pickPromotable(orderedIds: string[], currentAuthId: string | null, selfId: string): string {
    const list = (orderedIds || []).filter((x) => !!x).map((x) => String(x));
    if (!list.length) return selfId;
    const idx = list.indexOf(String(currentAuthId));
    if (idx >= 0) {
        for (let step = 1; step <= list.length; step++) {
            const cand = list[(idx + step) % list.length];
            if (cand) return cand;
        }
    }
    return list.slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))[0];
}
/** 场地边界(m): z 为场长方向(球网在 z=0), x 为场宽方向, y 向上。越界即脏数据 */
export const BOUNDS = { x: 9, y: 14, z: 15 };

// ==================== 基础校验 ====================

export function isNum(v: any): boolean {
    return typeof v === 'number' && Number.isFinite(v);
}

export function isVec3(p: any): boolean {
    return !!p && isNum(p.x) && isNum(p.y) && isNum(p.z);
}

// ==================== 球快照编解码 ====================

/** 线上形态: [px,py,pz, vx,vy,vz, sx,sy,sz, sai, time] —— 全整数(定点) + 仿真时钟 */
export type BallSnap = {
    pos: { x: number, y: number, z: number };
    vel: { x: number, y: number, z: number };
    sn: { x: number, y: number, z: number };
    sai: number;
    time: number;
};

/** 从物理 State 取快照; 只读定点字段(浮点影子随时可能被 iSync 重建) */
export function encodeBall(st: any): number[] | null {
    if (!st) return null;
    const f = (i: any, v: any): number => isNum(i) ? (i | 0) : (isNum(v) ? Math.round(v * Q) : NaN);
    /** 自旋/轴向速度缺失按 0: 它不该让整份球快照作废 */
    const f0 = (i: any, v: any): number => isNum(i) ? (i | 0) : (isNum(v) ? Math.round(v * Q) : 0);
    const arr = [
        f(st.px, st.pos && st.pos.x), f(st.py, st.pos && st.pos.y), f(st.pz, st.pos && st.pos.z),
        f(st.vx, st.vel && st.vel.x), f(st.vy, st.vel && st.vel.y), f(st.vz, st.vel && st.vel.z),
        f0(st.sx, st.sn && st.sn.x), f0(st.sy, st.sn && st.sn.y), f0(st.sz, st.sn && st.sn.z),
        f0(st.sai, st.sa), isNum(st.time) ? Math.round(st.time) : 0
    ];
    // 位置/速度必须完整: 缺任何一个都宁可不发(接收端会走快照恢复而不是猜半颗球)
    for (let i = 0; i < 6; i++) if (!isNum(arr[i])) return null;
    return arr;
}

export function decodeBall(a: any): BallSnap | null {
    if (!Array.isArray(a) || a.length < 11) return null;
    for (let i = 0; i < 11; i++) if (!isNum(a[i])) return null;
    return {
        pos: { x: a[0] / Q, y: a[1] / Q, z: a[2] / Q },
        vel: { x: a[3] / Q, y: a[4] / Q, z: a[5] / Q },
        sn: { x: a[6] / Q, y: a[7] / Q, z: a[8] / Q },
        sai: a[9] / Q,
        time: a[10]
    };
}

// ==================== 击球事件校验 ====================

export type HitCtx = {
    /** 本机当前时间(Timer.now()) */
    now: number;
    /** 本机认定的权威任期; 事件带更小任期即作废 */
    authTerm: number;
};

/**
 * 击球事件入场前的全部合法性检查。返回 null 表示可以施加, 否则返回拒绝原因(调用方据此
 * 决定是否请求一次权威快照)。校验顺序: 结构 → 数值范围 → 时效 → 权威任期 → 出手强度。
 *
 * 线上只传"意图 + 权威端自己的球快照(ball)": 发送方不能再自称球在哪、物理状态如何,
 * 否则接收端 _canHitBall 的两个操作数来自同一个包, 射程判定形同虚设(无限远击球的一半根因)。
 */
/**
 * 击球入口事件的校验。原则(用户规格): 球的一致性靠【每一次击球的入口】保证,
 * 所以除了"这封信本身就是坏的"以外一律放行, 绝不能用参数把同步挡在门外——
 * 挡下的每一条都是一段无法收敛的弹道, 而偏差只会越滚越大。
 *  - 结构坏(没有 eventId/时刻/入口状态、坐标非有限数值) → 拒(收了只会写进 NaN)
 *  - 迟到很久 / 球已飞到场外 → 【不再拒】: 补算时长由内核 strike 的 catchUpDeadline 封顶,
 *    剩下的差由"球停止后报一次权威球位"(ball_stop)兜底对齐 —— 这两层才是本模型的纠偏手段
 *  - 任期比本机认定的旧 → 仍拒(这是身份围栏, 不是参数限制: 旧权威的弹道入口必须作废)
 */
export function checkHit(ev: any, ctx: HitCtx): string | null {
    if (!ev || typeof ev.eventId !== 'string') return 'no-eventId';
    if (!isNum(ev.time)) return 'no-time';
    if (!decodeBall(ev.ball)) return 'no-ball';
    if (ev.ballPos && !isFiniteVec(ev.ballPos)) return 'ballPos-NaN';
    if (ev.chaPos && !isFiniteVec(ev.chaPos)) return 'chaPos-NaN';
    const p = ev.params;
    if (p && (!isNum(p.power) || !isNum(p.angH) || !isNum(p.angV))) return 'bad-params';
    if (isNum(ev.authTerm) && isNum(ctx.authTerm) && ev.authTerm < ctx.authTerm) return 'stale-auth-term';
    return null;
}

/** 只判"是不是有限数值", 不判在不在场地内(球本来就可以被打到场外) */
function isFiniteVec(v: any): boolean {
    return !!v && [v.x, v.y, v.z].every((n: any) => typeof n === 'number' && Number.isFinite(n));
}

// ==================== 鹰眼回放轨迹(双端看同一段) ====================

/**
 * 轨迹压缩编码: 定点整数三元组扁平数组 [x0,y0,z0, x1,y1,z1, ...](1/1024 m)。
 * 为什么要同步这段数据: 回放原本播【本端】记录的 eagleRecPts, 而记录是靠本端物理落地时采的,
 * 只要两端没进同一个状态(或压根没进到鹰眼), 就会出现"一端有回放另一端什么都没有"。
 * 权威端把记录随确认一起发过去, 对端就必然播同一段。
 */
/** 轨迹点数上限: 点对点消息大小有限, 60 点(≈2.5s 采样)按等间隔抽到 48 点足够平滑回放 */
const TRACK_MAX_PTS = 48;

export function encodeTrack(pts: any[]): number[] | null {
    if (!Array.isArray(pts) || pts.length < 2) return null;
    const step = Math.max(1, Math.ceil(pts.length / TRACK_MAX_PTS));
    const out: number[] = [];
    for (let i = 0; i < pts.length; i += step) {
        const p = pts[i] && (pts[i].pos || pts[i]);
        if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) continue;
        out.push(Math.round(p.x * Q), Math.round(p.y * Q), Math.round(p.z * Q));
    }
    // 末点必留: 抽稀会把最后落地那一帧抽掉, 而"压线/出界"的观感恰恰在最后一段
    const last = pts[pts.length - 1];
    const lp = last && (last.pos || last);
    if (lp && Number.isFinite(lp.x)) {
        const n = out.length;
        if (n < 3 || out[n - 3] !== Math.round(lp.x * Q) || out[n - 2] !== Math.round(lp.y * Q)
            || out[n - 1] !== Math.round(lp.z * Q)) {
            out.push(Math.round(lp.x * Q), Math.round(lp.y * Q), Math.round(lp.z * Q));
        }
    }
    return out.length >= 6 ? out : null;
}

/** 解回 State[] (只需位置: 回放渲染读 pos) */
export function decodeTrack(buf: any): { pos: { x: number, y: number, z: number } }[] | null {
    if (!Array.isArray(buf) || buf.length < 6 || buf.length % 3 !== 0) return null;
    const pts: { pos: { x: number, y: number, z: number } }[] = [];
    for (let i = 0; i + 2 < buf.length; i += 3) {
        const x = buf[i], y = buf[i + 1], z = buf[i + 2];
        if (![x, y, z].every((n: any) => typeof n === 'number' && Number.isFinite(n))) return null;
        pts.push({ pos: { x: x / Q, y: y / Q, z: z / Q } });
    }
    return pts.length >= 2 ? pts : null;
}

// ==================== 角色指派(单一权威源) ====================

/** 房主等 ack 的上限: 到点就广播 match_start, 弱网不能让全场干等 */
export const ASSIGN_ACK_WAIT_MS = 600;

/** roleId → 队伍号: 单人 0/1 各一队; 双打 0/1 一队、2/3 另一队 */
export function teamOfRoleId(roleId: number, players: number): number {
    if (players <= 2) return roleId === 0 ? 0 : 1;
    return roleId <= 1 ? 0 : 1;
}

/** 分配表完整性: 有条目/有业务序号、roleId 唯一且覆盖 0..n-1、必须包含本机
 *  业务序号字段是 assignSeq 而不是 seq——seq 被 msg 层的信封占用(本端发送计数器) */
export function checkAssign(d: any, myId: string): string | null {
    if (!d || !Array.isArray(d.assignments) || !d.assignments.length) return 'no-assignments';
    if (!isNum(d.assignSeq) || d.assignSeq <= 0) return 'no-assignSeq';
    const n = d.assignments.length;
    const roles: number[] = [];
    let hasSelf = false;
    for (const a of d.assignments) {
        if (!a || !isNum(a.roleId) || !a.playerId) return 'bad-entry';
        if (roles.indexOf(a.roleId) >= 0) return 'dup-roleId';
        roles.push(a.roleId);
        if (String(a.playerId) === String(myId)) hasSelf = true;
    }
    for (let i = 0; i < n; i++) if (roles.indexOf(i) < 0) return 'role-gap';
    if (!hasSelf) return 'self-missing';
    return null;
}
