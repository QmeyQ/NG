/**
 * qa — 客户端调试接口（仅调试环境生效，玩家侧不挂载、不包 console）
 *
 * 为什么状态必须放在 window 上：项目脚本被切成多个 bundle（js/bundle.js、sub/game.js …），
 * 每个 bundle 各有一份本模块实例；用模块级变量注册就会出现"菜单那份写进了自己的副本、
 * __qa 读到的是另一份"的假象（实测 toMatch 恒返回 NO_MENU_PAGE）。
 *
 * 安装闸门: localStorage.qa === '1' 或 URL 带 ?qa=1。
 *   自动化里先: localStorage.setItem('qa','1'); location.reload()
 *
 * 接口（页面内直接调用）:
 *   __qa.toMatch()             从菜单进匹配页（等价点游戏列表，但不依赖画布命中）
 *   __qa.match()               发起匹配；已在匹配/已在房间时先干净退出再开（幂等重启）
 *   __qa.cancel()              取消匹配并离开房间
 *   __qa.back()                游戏场景 → 匹配页(等价游戏内返回键, 归零 _gameStarted)
 *   __qa.moveTo(ang, power)    移动指令（与摇杆同一条路：ctrl → mag.syncAction）
 *   __qa.hit(opts)             击球指令（走 ctrl.onHit）
 *   __qa.serve()               发球
 *   __qa.state()               房间/权威端/分配表/球与角色坐标/比分 一把取全
 *   __qa.frames()              帧通道原始计数 + 首批载荷形状(区分"没送到"与"送到了不认")
 *   __qa.determinism()         内核确定性自测: 同参数同时刻, 三种采样节奏算出的球位差(必须 0)
 *   __qa.pve(pc)               直接跳人机局(单机复现发球/落球/结算, 不依赖配对)
 *   __qa.tail(n)               最近 n 条自采日志（不受 CDP 注入失效影响）
 */
import { Gnet } from "./net";
import { Timer } from "../time";
import { SceneNav } from "../nav";
import { Phy } from "../../badm/engine/phy";
import * as Msg from "./msg";
import * as Proto from "../pvpProto";

type Role = 'game' | 'matchPage' | 'menuPage';

const W: any = typeof window !== 'undefined' ? window : ({} as any);
const store: any = W.__qaStore || (W.__qaStore = { game: null, matchPage: null, menuPage: null, logs: [] });

function enabled(): boolean {
    try {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('qa') === '1') return true;
        if (typeof location !== 'undefined' && /[?&]qa=1/.test(location.search)) return true;
    } catch (e) { }
    return false;
}

function role(r: Role): any { return store[r] || null; }

/** console 环形缓冲存 window 上, 多个 bundle 实例共用一份 */
function startRing(): void {
    if (store.ringed) return;
    store.ringed = true;
    ['log', 'warn', 'error', 'info'].forEach((k: string) => {
        const o = (console as any)[k].bind(console);
        (console as any)[k] = function () {
            try {
                const s = [].slice.call(arguments).map((x: any) =>
                    typeof x === 'object' ? JSON.stringify(x).slice(0, 240) : String(x).slice(0, 240)).join(' ');
                store.logs.push(k + ': ' + s);
                if (store.logs.length > 1200) store.logs.splice(0, store.logs.length - 600);
            } catch (e) { }
            o.apply(null, arguments);
        };
    });
}

function v3(v: any): number[] | null {
    return v && [v.x, v.y, v.z].every((n: any) => typeof n === 'number' && isFinite(n))
        ? [Math.round(v.x * 1000) / 1000, Math.round(v.y * 1000) / 1000, Math.round(v.z * 1000) / 1000] : null;
}

/**
 * 帧通道取证: 只计数、不解析地挂一个 Gnet 帧监听(与 pvp 的监听共存, mpm 按引用摘除)。
 * 用途是分辨两种完全不同的故障: net.rxAuthFrames=0 且这里 n=0 → GOBE 根本没把帧送到本端;
 * n>0 而 rx=0 → 是本端的载荷形状/校验判定问题。
 *
 * 每次调用都要重新 onFrame: Gnet.destroy() 会 _mpm.unon() 把订阅整体清掉, 而计数器对象留在
 * window 上——只挂一次的话, 退出过一次房间之后这个探针就永远读到 n=0(假故障)。
 * MPM 用 Set 存回调, 同一引用重复注册是无操作。
 */
function frameProbe(): any {
    const p: any = store.frameProbe || (store.frameProbe = {
        n: 0, withInfo: 0, withData: 0, dataChars: 0, selfEntry: 0, otherEntry: 0,
        samples: [] as string[], last: '', cb: null as any
    });
    if (!p.cb) {
        p.cb = (msg: any) => {
            p.n++;
            const info = msg && msg.frameInfo;
            if (!Array.isArray(info) || !info.length) return;
            p.withInfo++;
            const me = String(Gnet.getCurrentPlayerId() || '');
            let chars = 0, hasData = false;
            for (const fi of info) {
                if (String(fi && fi.playerId) === me) p.selfEntry++; else p.otherEntry++;
                const arr = (fi && fi.data) || [];
                if (!arr.length) continue;
                hasData = true;
                for (const one of arr) {
                    chars += String(one).length;
                    // 前 3 条 + 最新 1 条原文: "帧通道到底送到了什么"只能看现场, 计数推不出来
                    if (p.samples.length < 3) p.samples.push(String(one).slice(0, 180));
                    p.last = String(arr[arr.length - 1]).slice(0, 180);
                }
            }
            if (hasData) { p.withData++; p.dataChars += chars; }
        };
    }
    Gnet.onFrame(p.cb);
    return { n: p.n, withInfo: p.withInfo, withData: p.withData, dataChars: p.dataChars,
        selfEntry: p.selfEntry, otherEntry: p.otherEntry, samples: p.samples.slice(0, 3), last: p.last };
}

function netState(): any {
    const room: any = Gnet.getRoom();
    const mag: any = role('game') && (role('game') as any).mag;
    return {
        inited: Gnet.checkInitialized(),
        frameProbe: store.frameProbe ? { n: store.frameProbe.n } : null,
        me: String(Gnet.getCurrentPlayerId() || ''),
        openId: String((Gnet as any).getOpenId ? Gnet.getOpenId() : ''),
        roomId: room ? String(room.id || room.roomId || '') : '',
        ownerId: String(Gnet.getRoomOwnerId() || ''),
        players: (Gnet.getPlayers() || []).map((p: any) => ({
            id: String(p.playerId),
            props: (() => { try { return JSON.parse(p.customPlayerProperties || '{}'); } catch (e) { return null; } })()
        })),
        maxPlayers: room ? room.maxPlayers : null,
        amAuth: mag ? !!mag._amAuth : null,
        authId: mag ? String((mag as any)._currentAuthId || '') : null,
        authTerm: mag ? (mag as any)._authorityTerm : null,
        hitSeq: mag ? (mag as any)._authHitSequence : null,
        appliedHitSeq: mag ? (mag as any)._lastAppliedAuthHitSeq : null,
        // 同步线程存活取证: tx=本机发过的权威帧轮次, rx/rxAuthSeq=对端权威帧是否真的到达
        txAuthFrames: mag ? (mag as any)._txAuthFrames : null,
        rxAuthFrames: mag ? (mag as any)._rxAuthFrames : null,
        rxFrameTicks: mag ? (mag as any)._rxFrameTicks : null,
        authFrameDrops: mag ? (mag as any)._authFrameDrops : null,
        authFrameDropFrom: mag ? (mag as any)._lastAuthFrameFrom : null,
        rxAuthSeq: mag ? Msg.lastAcceptedSeq(Proto.Kind.AuthFrame, String((mag as any)._currentAuthId || '')) : null
    };
}

function gameState(): any {
    const g = role('game');
    if (!g) return null;
    // 场景已经销毁(玩家按过返回/我们调过 back)时 store.game 仍指着尸体:
    // 这里任何一次取坐标都会 "Cannot read properties of null (reading 'position')" 把整条采样打挂
    if ((g as any).destroyed) { store.game = null; return null; }
    try { return gameStateInner(g); } catch (e) { store.game = null; return null; }
}

function gameStateInner(g: any): any {
    const mag: any = g.mag;
    const st: any = mag && mag._cachedGlobalStatus;
    // 发球/准备阶段的 HUD 数字取 UI 实际渲染值(ui._cd), 不是 rule 的推算值——
    // 验收要的是"两端玩家看到的数字一致"
    const cd: any = g.ui ? (g.ui as any)._cd : null;
    return {
        ball: v3(g.ballO && g.ballO.pos),
        // 球速: 采样对齐用。两端是先后两次读页(差 100~400ms), 30m/s 的球在这段间隔里自己就走
        // 3~12m, 不拿速度把两个样本对齐到同一时刻, 量到的"分歧"大半是测量动作本身。
        // 鹰眼取证: 记录在球手里(拆到 Ball 之后), 有没有记录/是否在回放决定两端画面会不会分叉
        eaglePlaying: !!(g.ballO as any)?.playing,
        trackPts: ((g.ballO as any)?.trackPts || []).length,
        ballVel: v3((g.ballO as any)?.phy?.state?.vel),
        ballSleeping: !!(g.ballO as any)?.phy?.isSleeping,
        // 球到底还在不在积分(卡在原地不飞 = isCalc 被谁关了), 以及该发球的人和球隔多远:
        // "发球站位不对→球不模拟"要看的就是这两条
        ballCalc: !!(g.ballO as any)?.phy?.isCalc,
        serverId: mag && (mag as any).currentServer ? (mag as any).currentServer.id : null,
        ballToServer: (() => {
            const srv = mag && (mag as any).currentServer;
            if (!srv || !g.ballO) return null;
            return Math.round(Math.hypot(g.ballO.x - srv.x, g.ballO.y - srv.y, g.ballO.z - srv.z) * 100) / 100;
        })(),
        localCha: v3(g.localCha && g.localCha.pos),
        mode: W.gameMode || null,
        count: W.gamePlayerCount || null,
        assignments: W.gamePlayerAssignments || null,
        phase: mag ? String(mag.phase) : null,
        scores: st ? st.scores : null,
        servingTeam: st ? st.servingTeam : null,
        isBallAssigned: st ? st.isBallAssigned : null,
        lastScoreReason: st ? st.lastScoreReason : null,
        cd: typeof cd === 'number' ? cd : null,
        // 权威给的剩余毫秒(时钟重基的输入)与本端认定的持球者: 冻结/分家两案的现场证据
        remainMs: st ? Math.max(st.serveRemainMs ?? -1, st.cdRemainMs ?? -1) : null,
        holderId: mag ? mag.authBallHolderId : null,
        // 绑网时刻的房间人数: 联机退化成"本机单机局"(bindNetwork 拿到空/半张玩家表)的现场证据
        party: mag && mag._allPlayerIds ? mag._allPlayerIds.length : null
    };
}

function matchState(): any {
    const p = role('matchPage');
    if (!p) return null;
    return {
        isMatching: !!p.isMatching,
        matched: !!p._matchSucceeded,
        started: !!p._gameStarted,
        wantPlayers: p.matchMaxPlayers,
        resolved: !!p._assignmentResolved,
        assignSeq: p._assignSeq || 0,
        appliedSeq: p._appliedAssignSeq || 0,
        acks: p._assignAcks ? p._assignAcks.size : 0,
        finalAssignment: p._finalAssignment || null
    };
}

const api = {
    toMatch(): string {
        if (role('matchPage')) return 'ALREADY_ON_MATCH_PAGE';
        const m = role('menuPage');
        if (!m) return 'NO_MENU_PAGE';
        try { m._checkNorAndJump(); return 'JUMPING'; } catch (e) { return 'ERR ' + (e as any).message; }
    },
    match(): string {
        const p = role('matchPage');
        if (!p) return 'NO_MATCH_PAGE';
        if (p.isMatching || Gnet.getRoom()) {
            p.exitMatch(() => {
                p._userCancel = false;
                if (p._resetAssignmentState) p._resetAssignmentState();
                p._startMatch();
            });
            return 'RESTARTING';
        }
        if (p._resetAssignmentState) p._resetAssignmentState();
        p._startMatch();
        return 'MATCHING';
    },
    cancel(): string {
        const p = role('matchPage');
        if (!p) return 'NO_MATCH_PAGE';
        p._userCancel = false;
        p.exitMatch(() => { });
        return 'CANCELLED';
    },
    /**
     * 从游戏场景回匹配页(等价点游戏内左上角返回键: SceneNav.back, 会让 match 预制体重新
     * sceneShow 并把 _gameStarted/指派状态整体归零)。
     * 为什么需要: 实测有一端带着空房间表进了游戏, _gameStarted 卡在 true,
     * 之后每一轮 match() 都被 _startMatch 的开头判断吃掉, 连续 5 次"等待开赛超时"。
     * history.back() 顶不了这个用——它只在页面被重载过之后才与应用的场景栈对得上。
     */
    back(): string {
        try { SceneNav.back(); return 'BACK'; } catch (e) { return 'ERR ' + (e as any).message; }
    },
    /** 直接跳 PVE 人机局(等价点匹配页的"人机"按钮): 一个客户端就能复现发球/落球/结算这类与网络无关的问题 */
    pve(pc?: number): string {
        const p = role('matchPage');
        if (!p) return 'NO_MATCH_PAGE';
        try { p._jumpPve(Number(pc) || 2); return 'OPENING_PVE'; }
        catch (e) { return 'ERR ' + (e as any).message; }
    },
    /** 按房间号加入(等价于产品里的"恢复旧房间"): 自动化用它确定性地凑齐一房两人 */
    join(roomId: string): string {
        const p = role('matchPage');
        if (!p) return 'NO_MATCH_PAGE';
        if (!roomId) return 'NO_ID';
        try { p.joinRoomById(String(roomId)); return 'JOINING ' + roomId; }
        catch (e) { return 'ERR ' + (e as any).message; }
    },
    /** 直接建一房两人房(绕开匹配池; 与 join() 配套做确定性配对) */
    create(): string {
        const p = role('matchPage');
        if (!p) return 'NO_MATCH_PAGE';
        try { p.createRoomForTest(); return 'CREATING'; }
        catch (e) { return 'ERR ' + (e as any).message; }
    },
    moveTo(ang?: number, power?: number): string {
        const g = role('game');
        if (!g || !g.mag) return 'NOT_IN_GAME';
        const a = ang === undefined ? 0 : Number(ang);
        const pw = power === undefined ? 0 : Number(power);
        try {
            if (g.ctrl && typeof g.ctrl.handleMove === 'function') g.ctrl.handleMove(a, pw);
            else g.mag.syncAction({ type: 'move', angH: a, power: pw });
        } catch (e) { return 'ERR ' + (e as any).message; }
        return 'MOVE ' + a + '/' + pw;
    },
    /**
     * 击球指令: 必须【按下 + 松手】两段。
     * ctrl.onHit(params)=按下只起前摇(WINDUP), onHit()=松手才真正 _executeHit 出手——
     * 旧版只发按下, 于是自动化里本地球永远打不出去(实测按下后 3s 球仍钉在手上, 最后以
     * "发球超时"判分收场), 之前量到的"回合"大半是对方/AI 的击球, 不是被测的本地出手。
     */
    hit(opts?: any): string {
        const g = role('game');
        if (!g || !g.ctrl || typeof g.ctrl.onHit !== 'function') return 'NOT_IN_GAME';
        const o = Object.assign({ power: 60, angH: 0, angV: -20 }, opts || {});
        try {
            g.ctrl.onHit(o);
            Timer.setTimeout(420, () => { try { g.ctrl.onHit(); } catch (e) { } });
        } catch (e) { return 'ERR ' + (e as any).message; }
        return 'HIT';
    },
    serve(): string { return api.hit({ power: 45, angH: 0, angV: -12 }); },
    /**
     * 让本端同步线程暂时闭嘴 ms 毫秒(只停发送, 不断线、不掉房)。
     * 用途: 实测权威交接。旧做法是阻塞主线程 5s, 但那会被 GOBE 判定掉线并把本端【移出房间】,
     * 于是测的其实是"对手退赛"而不是"权威端卡住"(实测: 冻结端此后再无 roomId, 另一端 45s 无反应)。
     */
    mute(ms?: number): string {
        const g = role('game');
        if (!g || !g.mag) return 'NOT_IN_GAME';
        const v = Number(ms === undefined ? 4000 : ms);
        (g.mag as any)._mutedUntil = Timer.now() + v;
        return 'MUTED ' + v;
    },
    state(): any {
        return { at: Date.now(), net: netState(), game: gameState(), page: matchState(),
            roles: { game: !!role('game'), matchPage: !!role('matchPage'), menuPage: !!role('menuPage') } };
    },
    tail(n?: number): string[] { return (store.logs || []).slice(-(n || 40)); },
    frames(): any { return frameProbe(); },
    msgStats(): any { return Msg.stats; },
    /**
     * 内核确定性自测(一个客户端就够, 不用配对两端): 同一份击球参数 + 同一个击球时刻,
     * 用三种完全不同的采样节奏推进(≈60fps / ≈30fps / 一次算到底), 再比三者的权威状态。
     * 差值必须恒为 0——只要不是 0, 联机两端的球路就必然分叉: 帧率不同 → 积分步长序列不同
     * → RK4 + 定点舍入不同 → 同参数算出两条轨迹。这条判据比"量两端球位差"更直接, 因为它
     * 排除了网络、房间、匹配一切变量, 只问内核本身。
     */
    determinism(): any {
        const mk = () => new Phy({ pos: { x: -3, y: 1.2, z: 0 }, rot: { x: 0, y: 0, z: 0, w: 1 } }, {});
        const stroke = { power: 62, angH: 18, angV: -26, spi: null as any };
        const t0 = Timer.now(), span = 1600;
        const A = mk(), B = mk(), C = mk(), D = mk();
        for (const p of [A, B, C, D]) p.strike(stroke, t0);
        for (let t = t0; t <= t0 + span; t += 16) A.advanceTo(t);
        for (let t = t0; t <= t0 + span; t += 33) B.advanceTo(t);
        C.advanceTo(t0 + span);
        // 抖动节奏(真实帧率不会这么整齐): 7/23/41 轮着来
        let i = 0;
        for (let t = t0; t <= t0 + span; t += [7, 23, 41][i++ % 3]) D.advanceTo(t);
        // 三条(四条)采样路径必须先对齐到同一时刻再比, 否则比的是两个不同时刻的球
        for (const p of [A, B, C, D]) p.advanceTo(t0 + span);
        const snap = (p: any) => {
            const s = p.snapshot();
            return { t: Math.round(s.time - t0), x: s.px / 1024, y: s.py / 1024, z: s.pz / 1024,
                calc: !!p.isCalc, sleep: !!p.isSleeping };
        };
        const a = snap(A), b = snap(B), c = snap(C), d = snap(D);
        const dd = (u: any, v: any) => Math.round(Math.max(Math.abs(u.x - v.x), Math.abs(u.y - v.y),
            Math.abs(u.z - v.z)) * 1000);
        return { A: a, B: b, C: c, D: d, diffAB_mm: dd(a, b), diffAC_mm: dd(a, c),
            diffAD_mm: dd(a, d), diffBC_mm: dd(b, c) };
    },
    /**
     * 匹配池现场: 每次调用都发起一次 getAvailableRooms, 并回传【上一次】拿到的快照。
     * 用途是判"两个客户端各进各的房"到底是我们的匹配参数问题, 还是池子里全是还没超时的鬼房。
     * 异步接口在 CDP 里同步取不到, 所以调用两次(第一次触发, 第二次读)。
     */
    rooms(): any {
        Gnet.getAvailableRooms((err: any, info: any) => {
            store.rooms = err ? { err: String((err && err.message) || err) } : info;
        }, { limit: 20, roomType: 'demo' });
        return store.rooms || null;
    },
    installGame(scene: any): void { if (!enabled()) return; startRing(); frameProbe(); store.game = scene; },
    installMatch(page: any): void { if (!enabled()) return; startRing(); store.matchPage = page; },
    installMenu(page: any): void { if (!enabled()) return; startRing(); store.menuPage = page; }
};

if (enabled()) {
    startRing();
    W.__qa = api;
}

export { api as QA, enabled as qaEnabled };
