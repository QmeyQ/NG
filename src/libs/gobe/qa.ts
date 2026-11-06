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
 *   __qa.tail(n)               最近 n 条自采日志（不受 CDP 注入失效影响）
 */
import { Gnet } from "./net";
import { Timer } from "../time";
import { SceneNav } from "../nav";
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
 */
function frameProbe(): any {
    if (!store.frameProbe) {
        const p: any = store.frameProbe = {
            n: 0, withInfo: 0, withData: 0, dataChars: 0, selfEntry: 0, otherEntry: 0,
            samples: [] as string[], last: ''
        };
        Gnet.onFrame((msg: any) => {
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
        });
    }
    const q = store.frameProbe;
    return { n: q.n, withInfo: q.withInfo, withData: q.withData, dataChars: q.dataChars,
        selfEntry: q.selfEntry, otherEntry: q.otherEntry, samples: q.samples.slice(0, 3), last: q.last };
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
        ballVel: v3((g.ballO as any)?.phy?.state?.vel),
        ballSleeping: !!(g.ballO as any)?.phy?.isSleeping,
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
    hit(opts?: any): string {
        const g = role('game');
        if (!g || !g.ctrl || typeof g.ctrl.onHit !== 'function') return 'NOT_IN_GAME';
        const o = Object.assign({ power: 60, angH: 0, angV: -20 }, opts || {});
        try { g.ctrl.onHit(o); } catch (e) { return 'ERR ' + (e as any).message; }
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
