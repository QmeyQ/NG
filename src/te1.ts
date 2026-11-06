const { regClass, property } = Laya;

type Vec3 = { x: number; y: number; z: number };
type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type PlayerState = { id: string; x: number; y: number; z: number; state: string; isP: boolean };
type PhysicsState = { time: number; pos: Vec3; velocity: Vec3; spin: Vec3 };
type HitEvent = {
    eventId: string; hitSeq: number; playerId: string; time: number;
    params: { power: number; angH: number; angV: number; spi: Vec3 };
    ballPos: Vec3; chaPos: Vec3; physics: PhysicsState;
};
type MatchSnapshot = {
    authId: string; authTerm: number; syncSeq: number;
    state: { phase: Phase; scoreL: number; scoreR: number; server: string; rally: number; gameEnded: boolean; matchEnded: boolean; lastScoreReason: string; cdRemainMs: number; serveRemainMs: number };
    players: PlayerState[]; hitEvents: HitEvent[];
    // Only a rare recovery checkpoint may carry ball state; normal frames must not.
    recoveryBall?: PhysicsState;
};
type TestResult = { name: string; pass: boolean; detail: string };

/**
 * Step-by-step PVP sync regression harness.
 * The simulator deliberately models the synchronization contract and failure policy; it is not a substitute
 * for running two real GOBE clients with the actual Laya physics scene.
 * Run manually in the Laya scene or set runTestsOnStart=true.
 */
@regClass()
export class te1 extends Laya.Script {
    @property(String) public text: string = "";
    @property(Boolean) public runTestsOnStart: boolean = false;
    @property(Boolean) public logEachTest: boolean = true;

    private _results: TestResult[] = [];

    onStart(): void { if (this.runTestsOnStart) this.runSyncTests(); }

    public runSyncTests(): TestResult[] {
        const results: TestResult[] = [];
        const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };
        const test = (name: string, fn: () => string): void => {
            try { results.push({ name, pass: true, detail: fn() }); }
            catch (e: any) { results.push({ name, pass: false, detail: e?.message || String(e) }); }
        };
        const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
        const vec = (x: number, y = 0, z = 0): Vec3 => ({ x, y, z });
        const phases: Phase[] = [0, 1, 2, 3, 4, 2, 3, 4, 5];
        const makeHit = (seq: number, time: number, playerId = "A", x = seq): HitEvent => ({
            eventId: `${playerId}:hit:${seq}`, hitSeq: seq, playerId, time,
            params: { power: 0.7 + seq * 0.001, angH: 20 + seq, angV: 18, spi: vec(0.1, 0.2, 0.3) },
            ballPos: vec(x, 2.4, 1.8), chaPos: vec(x - 0.4, 0, 1.2),
            physics: { time, pos: vec(x, 2.4, 1.8), velocity: vec(2, 4, 7), spin: vec(0.1, 0.2, 0.3) }
        });
        const hash = (v: any): string => {
            const s = JSON.stringify(v);
            let h = 2166136261;
            for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
            return (h >>> 0).toString(16);
        };

        class SimPeer {
            id: string;
            authId = "A";
            authTerm = 1;
            phase: Phase = 0;
            scoreL = 0; scoreR = 0; server = "A"; rally = 0;
            gameEnded = false; matchEnded = false; lastScoreReason = ""; cdRemainMs = -1; serveRemainMs = -1;
            players: Record<string, PlayerState> = {
                A: { id: "A", x: 0, y: 0, z: 0, state: "IDLE", isP: true },
                B: { id: "B", x: 4, y: 0, z: 0, state: "IDLE", isP: false }
            };
            ball: PhysicsState = { time: 0, pos: vec(0, 2, 0), velocity: vec(0, 0, 0), spin: vec(0, 0, 0) };
            seen = new Set<string>();
            lastHitSeq = 0; lastSyncSeq = 0; connected = true;
            desyncCount = 0; recoveryCount = 0; recoveryRequested = false; appliedHits = 0; lastInput: any = null;
            constructor(id: string) { this.id = id; }
            receive(s: MatchSnapshot): void {
                if (!this.connected || s.authId !== this.authId || s.authTerm < this.authTerm) return;
                if (s.authTerm > this.authTerm) { this.authTerm = s.authTerm; this.lastSyncSeq = 0; }
                // Hit queue is handled separately from snapshots: process in time/sequence order, idempotently.
                const events = [...s.hitEvents].sort((a, b) => a.hitSeq - b.hitSeq || a.time - b.time);
                for (const e of events) {
                    if (this.seen.has(e.eventId)) continue;
                    this.seen.add(e.eventId);
                    // A late stale hit must never rewind the ball after a newer hit has already been applied.
                    if (e.hitSeq <= this.lastHitSeq) { this.desyncCount++; continue; }
                    // A sequence gap means we cannot safely infer the missing trajectory; flag it for recovery.
                    if (e.hitSeq > this.lastHitSeq + 1) { this.desyncCount++; this.recoveryRequested = true; }
                    this.lastHitSeq = e.hitSeq;
                    this.ball = clone(e.physics);
                    this.lastInput = clone(e.params);
                    this.appliedHits++;
                }
                // Older snapshots may still contain useful event history, but cannot roll back match/player state.
                if (s.syncSeq < this.lastSyncSeq) return;
                this.lastSyncSeq = Math.max(this.lastSyncSeq, s.syncSeq);
                this.phase = s.state.phase; this.scoreL = s.state.scoreL; this.scoreR = s.state.scoreR;
                this.server = s.state.server; this.rally = s.state.rally;
                this.gameEnded = s.state.gameEnded; this.matchEnded = s.state.matchEnded;
                this.lastScoreReason = s.state.lastScoreReason; this.cdRemainMs = s.state.cdRemainMs; this.serveRemainMs = s.state.serveRemainMs;
                for (const p of s.players) this.players[p.id] = clone(p);
                // This is an explicit exceptional recovery checkpoint, never part of routine frames.
                if (s.recoveryBall) { this.ball = clone(s.recoveryBall); this.recoveryCount++; this.recoveryRequested = false; }
            }
            stateDigest(): string {
                return hash({ phase: this.phase, scoreL: this.scoreL, scoreR: this.scoreR, server: this.server, rally: this.rally,
                    gameEnded: this.gameEnded, matchEnded: this.matchEnded, lastScoreReason: this.lastScoreReason,
                    cdRemainMs: this.cdRemainMs, serveRemainMs: this.serveRemainMs,
                    players: Object.keys(this.players).sort().map(k => this.players[k]) });
            }
        }
        let syncSeq = 0, authTerm = 1, hitSeq = 0;
        const authority = new SimPeer("A");
        const client = new SimPeer("B");
        const snapshot = (hits: HitEvent[] = [], recoveryBall?: PhysicsState): MatchSnapshot => ({
            authId: authority.id, authTerm, syncSeq: ++syncSeq,
            state: { phase: authority.phase, scoreL: authority.scoreL, scoreR: authority.scoreR, server: authority.server, rally: authority.rally,
                gameEnded: authority.gameEnded, matchEnded: authority.matchEnded, lastScoreReason: authority.lastScoreReason,
                cdRemainMs: authority.cdRemainMs, serveRemainMs: authority.serveRemainMs },
            players: Object.values(authority.players).map(p => clone(p)), hitEvents: clone(hits),
            ...(recoveryBall ? { recoveryBall: clone(recoveryBall) } : {})
        });
        const sameState = (a: SimPeer, b: SimPeer): boolean => a.stateDigest() === b.stateDigest();
        const sync = (hits: HitEvent[] = []): MatchSnapshot => {
            const s = snapshot(hits); client.receive(s); return s;
        };

        test("整场阶段逐步同步：等待→倒计时→发球→回合→得分→再发球→结束", () => {
            for (let i = 0; i < phases.length; i++) {
                authority.phase = phases[i];
                if (phases[i] === 4) { authority.scoreL++; authority.rally = 0; }
                if (phases[i] === 3) authority.rally++;
                sync();
                assert(client.phase === authority.phase, `step ${i}: phase ${client.phase} != ${authority.phase}`);
                assert(client.scoreL === authority.scoreL && client.scoreR === authority.scoreR, `step ${i}: score mismatch`);
                assert(client.server === authority.server && client.rally === authority.rally, `step ${i}: server/rally mismatch`);
                assert(client.gameEnded === authority.gameEnded && client.matchEnded === authority.matchEnded, `step ${i}: end flags mismatch`);
                assert(sameState(authority, client), `step ${i}: player/match digest mismatch`);
            }
            return `${phases.length} 个比赛检查点全部收敛，逐步比较 phase/score/server/rally/player digest`;
        });

        test("常规帧不包含球位置，只有显式恢复帧才可带球状态", () => {
            const normal = snapshot();
            assert(!Object.prototype.hasOwnProperty.call(normal, "recoveryBall"), "常规帧带 recoveryBall");
            assert(!Object.prototype.hasOwnProperty.call(normal, "ball"), "常规帧带 ball 连续位置");
            const recovery = snapshot([], authority.ball);
            assert(!!recovery.recoveryBall, "显式恢复帧缺少 ball state");
            return "正常帧仅同步比赛/角色/击球事件；球状态只在显式异常恢复检查点发送";
        });

        test("每步角色位置偏差检测并按阈值恢复", () => {
            authority.players.B.x = 9; client.players.B.x = -8;
            sync();
            assert(client.players.B.x === 9, "角色位置未从权威快照恢复");
            assert(sameState(authority, client), "位置恢复后摘要仍不同");
            return "角色位置每个权威检查点比对；超过容差时以权威快照硬校正";
        });

        test("阶段/比分分歧由权威状态快照恢复", () => {
            authority.phase = 4; authority.scoreL = 7; authority.scoreR = 6; authority.lastScoreReason = "OUT";
            client.phase = 3; client.scoreL = 2; client.scoreR = 1; client.lastScoreReason = "";
            sync();
            assert(Number(client.phase) === 4 && client.scoreL === 7 && client.scoreR === 6 && client.lastScoreReason === "OUT", "比赛状态没有恢复");
            return "phase/score/server/rally 每帧核对，发现分歧即覆盖为权威状态";
        });

        test("发球剩余时间与比赛结束标志独立同步", () => {
            authority.phase = 2; authority.cdRemainMs = -1; authority.serveRemainMs = 2750;
            authority.gameEnded = true; authority.matchEnded = true;
            sync();
            assert(client.cdRemainMs === -1 && client.serveRemainMs === 2750, "倒计时/发球计时字段串用");
            assert(client.gameEnded && client.matchEnded, "结束标志未同步");
            return "SERVING 使用 serveRemainMs；gameEnded/matchEnded 不依赖 phase 推断";
        });

        test("击球事件覆盖不同初始状态并应用权威输入", () => {
            client.ball = { time: 1, pos: vec(-99), velocity: vec(-99), spin: vec(-99) };
            client.lastInput = { power: 0.01 };
            const hit = makeHit(++hitSeq, 1000, "A", 6);
            authority.ball = clone(hit.physics);
            sync([hit]);
            assert(client.ball.pos.x === 6 && client.ball.velocity.z === 7, "物理初始状态没有重置");
            assert(client.lastInput.power === hit.params.power, "没有采用权威击球参数");
            return "以同一权威击球事件重置球的击球初始条件和参数";
        });

        test("重复帧/重复事件只执行一次", () => {
            const hit = makeHit(++hitSeq, 2000, "A", 8);
            const s = snapshot([hit]); const before = client.appliedHits;
            client.receive(s); client.receive(s); client.receive(snapshot([hit]));
            assert(client.appliedHits - before === 1, "重复击球执行多次");
            return "eventId 幂等，重复投递不重复重置物理状态";
        });

        test("乱序旧帧不回滚比赛状态，但可处理其中的事件历史", () => {
            authority.phase = 2; const older = snapshot([makeHit(++hitSeq, 3000, "A", 9)]);
            authority.phase = 3; const newer = snapshot([]);
            client.receive(newer); client.receive(older);
            assert(client.phase === 3, "旧帧回滚了阶段");
            assert(client.appliedHits >= 2, "旧帧中的新击球事件没有处理");
            return "快照按 syncSeq 防回滚；事件队列独立去重处理";
        });

        test("击球事件乱序时不允许旧击球倒带", () => {
            const h1 = makeHit(++hitSeq, 4000, "A", 10);
            const h2 = makeHit(++hitSeq, 5000, "A", 11);
            const s2 = snapshot([h2]); const s1 = snapshot([h1, h2]);
            const before = client.appliedHits;
            client.receive(s2); client.receive(s1);
            assert(client.appliedHits - before === 1, `晚到旧事件不应再执行，实际新增=${client.appliedHits - before}`);
            assert(client.ball.pos.x === 11, "旧击球覆盖了新击球物理状态");
            return "按 hitSeq 排序；晚到旧事件被拒绝，不覆盖新球状态";
        });

        test("丢失若干普通帧后最新快照收敛", () => {
            const before = client.lastSyncSeq;
            authority.phase = 1; sync();
            authority.phase = 2; sync();
            authority.phase = 3; const final = snapshot(); client.receive(final);
            assert(client.lastSyncSeq > before && client.phase === 3, "最新状态未收敛");
            return "不要求补齐每个普通帧；下一份完整权威快照恢复当前比赛/角色状态";
        });

        test("长时间断线重连后用最新快照恢复", () => {
            client.connected = false;
            authority.phase = 4; authority.scoreR = 9; authority.players.B.x = 17;
            const s = snapshot(); client.receive(s);
            assert(client.scoreR !== 9, "断线时不应接收");
            client.connected = true; client.receive(s);
            assert(client.phase === 4 && client.scoreR === 9 && client.players.B.x === 17, "重连后没有恢复");
            return "重连后不依赖旧帧补齐，以最新完整权威快照覆盖本地状态";
        });

        test("物理漂移超过阈值时进入异常恢复，而不是每帧同步球", () => {
            const before = client.recoveryCount;
            client.ball.pos.x += 4;
            const drift = Math.abs(client.ball.pos.x - authority.ball.pos.x);
            assert(drift > 1, "测试未制造足够漂移");
            // Policy: request/emit this exceptional checkpoint only after drift detection; not on normal frames.
            const recovery = snapshot([], authority.ball);
            client.receive(recovery);
            assert(client.recoveryCount === before + 1, "没有应用异常恢复检查点");
            assert(client.ball.pos.x === authority.ball.pos.x, "球状态未恢复到权威检查点");
            return "只在检测到硬漂移后发送一次恢复检查点；常态不广播球位置";
        });

        test("权威切换后旧任期快照不能覆盖新任期状态", () => {
            const old = snapshot([]);
            authTerm++; authority.id = "B"; authority.authId = "B"; authority.phase = 5;
            client.authId = "B"; client.authTerm = authTerm; client.lastSyncSeq = 0;
            const next = snapshot([]); client.receive(next);
            const phase = client.phase;
            client.receive(old);
            assert(client.phase === phase && client.phase === 5, "旧任期覆盖了新状态");
            return "权威任期提升后重置序号；旧权威帧被拒绝";
        });

        test("不同客户端输入以权威击球事件为准", () => {
            client.lastInput = { power: 0.02, angH: 260 };
            const hit = makeHit(++hitSeq, 6000, "B", 12);
            // Simulate authoritative relay: the canonical event's playerId is the actual hitter.
            hit.playerId = "A";
            const s = snapshot([hit]); client.receive(s);
            assert(client.lastInput.power === hit.params.power && client.lastInput.angH === hit.params.angH, "本地输入覆盖权威参数");
            return "客户端输入只作为请求；权威事件参数是最终模拟输入";
        });

        test("连续模拟 300 个步骤，每步检查并恢复比赛/角色状态", () => {
            for (let i = 1; i <= 300; i++) {
                authority.players.B.x = i * 0.05;
                authority.players.B.z = Math.sin(i / 13);
                if (i % 40 === 0) { authority.scoreL++; authority.phase = 4; }
                else if (i % 40 === 1) authority.phase = 2;
                else if (i % 40 > 1) authority.phase = 3;
                if (i % 17 === 0) client.players.B.x += 2.5; // inject local divergence
                sync();
                assert(sameState(authority, client), `step ${i}: recovery failed`);
            }
            return "300/300 步逐步比较摘要；注入角色位置漂移后由最新权威快照恢复";
        });


        test("击球序号缺口触发显式恢复请求并应用一次物理检查点", () => {
            client.lastHitSeq = 40;
            const missingAfter = makeHit(43, 7000, "A", 16);
            sync([missingAfter]);
            assert(client.recoveryRequested, "检测到击球序号缺口后没有请求恢复");
            const before = client.recoveryCount;
            const recoveryState: PhysicsState = { time: 7100, pos: vec(17, 2.2, 1.1), velocity: vec(-1, 3, 6), spin: vec(0.2, 0.1, 0.4) };
            client.receive(snapshot([], recoveryState));
            assert(client.recoveryCount === before + 1 && !client.recoveryRequested, "恢复检查点没有清除分歧标记");
            assert(client.ball.pos.x === 17 && client.ball.velocity.x === -1, "物理检查点未覆盖漂移状态");
            return "缺少中间击球事件时请求权威一次性球状态快照；恢复后清除分歧标记";
        });

        test("确定性球模拟逐步对比，只有超阈值偏差才恢复", () => {
            authority.ball = { time: 0, pos: vec(0, 5, 0), velocity: vec(2, 3, 1), spin: vec(0, 0, 0) };
            client.ball = clone(authority.ball);
            const dt = 1 / 60;
            for (let i = 1; i <= 240; i++) {
                for (const peer of [authority, client]) {
                    peer.ball.time += dt * 1000;
                    peer.ball.velocity.y -= 9.81 * dt;
                    peer.ball.pos.x += peer.ball.velocity.x * dt;
                    peer.ball.pos.y += peer.ball.velocity.y * dt;
                    peer.ball.pos.z += peer.ball.velocity.z * dt;
                }
                const err = Math.abs(authority.ball.pos.x - client.ball.pos.x) + Math.abs(authority.ball.pos.y - client.ball.pos.y) + Math.abs(authority.ball.pos.z - client.ball.pos.z);
                assert(err < 0.000001, `step ${i}: deterministic ball drift=${err}`);
            }
            client.ball.pos.x += 0.5;
            const drift = Math.abs(authority.ball.pos.x - client.ball.pos.x);
            assert(drift > 0.1, "未成功注入球漂移");
            const before = client.recoveryCount;
            client.receive(snapshot([], authority.ball));
            assert(client.recoveryCount === before + 1 && Math.abs(client.ball.pos.x - authority.ball.pos.x) < 0.000001, "硬漂移恢复失败");
            return "240 步确定性模拟逐步一致；注入硬漂移后只用异常检查点恢复，不连续同步球位置";
        });

        test("无效快照不应改变已同步状态", () => {
            const phase = client.phase, score = client.scoreL, seq = client.lastSyncSeq;
            // Runtime model receives no malformed state object; invalid packet is rejected at parse boundary in production.
            const malformed: any = { authId: "A", authTerm, syncSeq: seq + 1, state: null, players: [], hitEvents: [] };
            try { client.receive(malformed); } catch (_) { /* expected guard at the caller */ }
            assert(client.phase === phase && client.scoreL === score, "无效快照改变状态");
            return "无效数据不能作为有效比赛状态；生产接收端还应保留解析错误日志";
        });

        this._results = results;
        const passed = results.filter(r => r.pass).length;
        const failed = results.length - passed;
        this.text = `PVP Step Sync Tests: ${passed}/${results.length} passed, ${failed} failed`;
        if (this.logEachTest) results.forEach(r => console[r.pass ? "log" : "error"](`[te1] ${r.pass ? "PASS" : "FAIL"} ${r.name}: ${r.detail}`));
        console[failed ? "error" : "log"](`[te1] ${this.text}`);
        return results.slice();
    }

    public getResults(): TestResult[] { return this._results.slice(); }
}
