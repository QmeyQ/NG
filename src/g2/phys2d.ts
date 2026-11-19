// @ts-nocheck
// phys2d - g2 确定性 2D 物理内核(参考羽毛球 Phy 的时间同步计算模式)。
// 多端同步 = 操作同步(fire 带执行时刻) + 补充状态同步(房主周期快照, 仅分歧时校正重算),
// 不再逐帧覆盖远端坐标(旧方案疯狂闪烁的根因)。
// 确定性保证: 固定步长(60Hz)整数定点(FP=256)积分/阻尼/反弹/分离; sqrt/cos/sin 为 IEEE 正确舍入,
// 同输入同输出; 随机仅来自种子化 xorshift32; 身体按 pid 排序遍历。同操作序列+同初始快照 → 各端轨迹逐位一致。
export const FP = 256;
export const STEP_MS = 1000 / 60;
export const R = 80 * FP;
const DAMP_NUM = 32112, DAMP_SHIFT = 15;      // 0.98/步
const REST_V = 21;                            // ~5px/s 静止阈值(FP/步)
const HIT_CD = 20;                            // 同对碰撞伤害冷却(步)

export interface BodySnap { pid: string; x: number; y: number; vx: number; vy: number; hp: number; sh: number; alive: boolean; }
export interface WorldSnap {
  step: number; t0: number; prng: number; round: number; side: number; phase: string;
  prepDeadline: number; actionDeadline: number; winner: string | null;
  bodies: BodySnap[]; ops: any[];
}
export interface PhysCfg {
  W: number; H: number; attack: number; defense: number; maxHp: number; maxSh: number;
  shieldRec: number; healRec: number; critChance: number; critMul: number;
  prepSteps: number; turnSteps: number;
}
interface Body extends BodySnap { lastHit: Record<string, number>; }

function idiv(a: number, b: number): number { return (a / b) | 0; } // 向零取整, 各端一致

export class Phys2D {
  cfg: PhysCfg;
  step = 0; t0 = 0; prng = 1; round = 1; side = 0; phase: 'pre' | 'action' | 'over' = 'pre';
  prepDeadline = 0; actionDeadline = 0; actionStartStep = -1; winner: string | null = null;
  bodies: Body[] = [];
  ops: any[] = [];
  opLog: any[] = [];
  history: WorldSnap[] = [];
  events: any[] = [];
  private lastSnapStep = -1;

  constructor(cfg: PhysCfg) { this.cfg = cfg; }

  reset(s: WorldSnap): void {
    this.step = s.step; this.t0 = s.t0; this.prng = s.prng >>> 0; this.round = s.round; this.side = s.side;
    this.phase = s.phase as any; this.prepDeadline = s.prepDeadline; this.actionDeadline = s.actionDeadline; this.actionStartStep = s.actionStartStep !== undefined ? s.actionStartStep : -1;
    this.winner = s.winner;
    this.bodies = s.bodies.slice().sort((a, b) => a.pid < b.pid ? -1 : 1).map(b => ({ ...b, lastHit: {} }));
    // 快照 bodies 已含 at<=step 的操作效果: 重放只取未来操作, 否则重复结算(实测双倍伤害)
    this.ops = (s.ops || []).filter(o => o.at > s.step).sort((a, b) => a.at - b.at);
    this.opLog = (s.ops || []).slice();
    this.history = []; this.events = []; this.lastSnapStep = -1;
  }

  snapshot(): WorldSnap {
    return {
      step: this.step, t0: this.t0, prng: this.prng >>> 0, round: this.round, side: this.side, phase: this.phase,
      prepDeadline: this.prepDeadline, actionDeadline: this.actionDeadline, actionStartStep: this.actionStartStep, winner: this.winner,
      bodies: this.bodies.map(b => ({ pid: b.pid, x: b.x, y: b.y, vx: b.vx, vy: b.vy, hp: b.hp, sh: b.sh, alive: b.alive })),
      ops: this.opLog.slice(),
    };
  }

  body(pid: string): Body | null { for (const b of this.bodies) if (b.pid === pid) return b; return null; }
  sideBodies(side: number): Body[] { return this.bodies.filter(b => b.alive && this.sideOf(b.pid) === side); }
  sideOf(pid: string): number { const i = this.bodies.findIndex(b => b.pid === pid); return i < 0 ? -1 : (this.pidSide[pid] !== undefined ? this.pidSide[pid] : 0); }
  pidSide: Record<string, number> = {};

  addOp(op: any): boolean {
    // 去重: fire 按 k+pid+round(每回合每身体一次, clamp 改变 at 不破坏去重);
    // hit 按 k+pid+at+from(双通道冗余同载荷)
    const key = op.k === 'fire' ? ('fire:' + (op.pid || '') + ':' + (op.round !== undefined ? op.round : -1)) : (op.k + ':' + (op.pid || '') + ':' + op.at + ':' + (op.from || ''));
    for (const o of this.opLog) {
      const ok = o.k === 'fire' ? ('fire:' + (o.pid || '') + ':' + (o.round !== undefined ? o.round : -1)) : (o.k + ':' + (o.pid || '') + ':' + o.at + ':' + (o.from || ''));
      if (ok === key) return false;
    }
    if (op.at < this.step) op.at = this.step; // 迟到操作 clamp(分歧由快照校正兜底)
    this.ops.push(op); this.ops.sort((a, b) => a.at - b.at);
    this.opLog.push(op);
    return true;
  }

  rand(): number { let x = this.prng >>> 0; x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; this.prng = x; return x; }

  advanceTo(target: number): void {
    let guard = 0;
    while (this.step < target && guard++ < 20000) {
      while (this.ops.length && this.ops[0].at <= this.step) this.applyOp(this.ops.shift());
      this.integrate();
      this.collide();
      this.phaseLogic();
      this.step++;
      // 历史网格对齐绝对步(60 的倍数): 各端网格一致, 快照/对比不依赖发送时刻
      if (this.step % 60 === 0) { this.lastSnapStep = this.step; this.history.push(this.snapshot()); if (this.history.length > 60) this.history.shift(); }
    }
  }

  private applyOp(op: any): void {
    if (op.k === 'hit') {
      const def = this.body(op.pid);
      if (!def || !def.alive) return;
      this.events.push({ step: this.step, type: 'damage', pid: op.pid, from: op.from, dmg: op.dmg, crit: op.crit });
      let remain = op.dmg;
      if (def.sh > 0) { const ab = Math.min(remain, def.sh); def.sh -= ab; remain -= ab; }
      if (remain > 0) def.hp = Math.max(0, def.hp - remain);
      if (def.hp <= 0) { def.alive = false; def.vx = 0; def.vy = 0; this.events.push({ step: this.step, type: 'dead', pid: op.pid }); }
      this.checkOver();
      return;
    }
    if (op.k === 'fire') {
      const b = this.body(op.pid);
      // 同一步允许多身体同侧发射(离线 master+ally); 行动阶段开始后拒绝新发射
      const sameStepBurst = this.phase === 'action' && this.step === this.actionStartStep;
      if (!b || !b.alive || (this.phase !== 'pre' && !sameStepBurst)) return;
      if (this.sideOf(op.pid) !== this.side) return;
      b.vx = Math.round(Math.cos(op.angle) * op.force * FP / 60);
      b.vy = Math.round(Math.sin(op.angle) * op.force * FP / 60);
      if (this.phase === 'pre') { this.phase = 'action'; this.actionStartStep = this.step; }
      this.actionDeadline = this.step + this.cfg.turnSteps;
      this.events.push({ step: this.step, type: 'fire', pid: op.pid });
    }
  }

  private integrate(): void {
    const W = this.cfg.W * FP, H = this.cfg.H * FP;
    for (const b of this.bodies) {
      if (!b.alive) continue;
      b.vx = (b.vx * DAMP_NUM) >> DAMP_SHIFT;
      b.vy = (b.vy * DAMP_NUM) >> DAMP_SHIFT;
      b.x += b.vx; b.y += b.vy;
      if (b.x < R) { b.x = 2 * R - b.x; b.vx = -idiv(b.vx * 4, 5); this.events.push({ step: this.step, type: 'wall', pid: b.pid }); }
      if (b.x > W - R) { b.x = 2 * (W - R) - b.x; b.vx = -idiv(b.vx * 4, 5); this.events.push({ step: this.step, type: 'wall', pid: b.pid }); }
      if (b.y < R) { b.y = 2 * R - b.y; b.vy = -idiv(b.vy * 4, 5); this.events.push({ step: this.step, type: 'wall', pid: b.pid }); }
      if (b.y > H - R) { b.y = 2 * (H - R) - b.y; b.vy = -idiv(b.vy * 4, 5); this.events.push({ step: this.step, type: 'wall', pid: b.pid }); }
    }
  }

  private collide(): void {
    const minD = 2 * R, minD2 = minD * minD;
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const a = this.bodies[i], b = this.bodies[j];
        if (!a.alive || !b.alive) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= minD2) continue;
        const d = d2 > 0 ? Math.sqrt(d2) : 0;
        const nx = d > 0 ? dx / d : 1, ny = d > 0 ? dy / d : 0;
        const push = Math.round((minD - d) / 2);
        a.x -= Math.round(nx * push); a.y -= Math.round(ny * push);
        b.x += Math.round(nx * push); b.y += Math.round(ny * push);
        const van = (a.vx * dx + a.vy * dy) / (d || 1);
        const vbn = (b.vx * dx + b.vy * dy) / (d || 1);
        const approaching = van - vbn > 0;
        if (approaching) {
          const dvn = vbn - van;
          a.vx += Math.round(dvn * nx); a.vy += Math.round(dvn * ny);
          b.vx -= Math.round(dvn * nx); b.vy -= Math.round(dvn * ny);
        }
        // 接触事件: 离散伤害不本地算(两端时钟 skew 会改变碰撞时机→分歧),
        // 由房主把伤害做成 hit 操作广播, 各端同一步应用(操作同步为主)
        if (this.phase === 'action' && approaching) {
          const key = a.pid < b.pid ? a.pid + '|' + b.pid : b.pid + '|' + a.pid;
          const last = a.lastHit[key] || -999;
          if (this.step - last > HIT_CD) {
            a.lastHit[key] = this.step; b.lastHit[key] = this.step;
            this.events.push({ step: this.step, type: 'contact', a: a.pid, b: b.pid });
          }
        }
      }
    }
  }

  private hit(att: Body, def: Body): void {
    const inTurn = this.sideOf(att.pid) === this.side;
    if (!inTurn) return;
    let dmg = att.hp > 0 ? this.cfg.attack : 0;
    const isCrit = (this.rand() % 1000) < Math.round(this.cfg.critChance * 1000);
    if (isCrit) dmg = Math.floor(dmg * this.cfg.critMul);
    dmg = Math.max(1, dmg);
    this.events.push({ step: this.step, type: 'damage', pid: def.pid, from: att.pid, dmg, crit: isCrit });
    let remain = dmg;
    if (def.sh > 0) { const ab = Math.min(remain, def.sh); def.sh -= ab; remain -= ab; }
    if (remain > 0) def.hp = Math.max(0, def.hp - remain);
    if (def.hp <= 0) { def.alive = false; def.vx = 0; def.vy = 0; this.events.push({ step: this.step, type: 'dead', pid: def.pid }); }
  }

  private checkOver(): void {
    const s0 = this.sideBodies(0).length, s1 = this.sideBodies(1).length;
    if (s0 === 0 || s1 === 0) {
      this.phase = 'over';
      const alive = this.bodies.find(b => b.alive);
      this.winner = alive ? alive.pid : null;
      this.events.push({ step: this.step, type: 'over', winner: this.winner });
    }
  }

  private phaseLogic(): void {
    if (this.phase === 'action') {
      const allStill = this.bodies.every(b => !b.alive || (Math.abs(b.vx) < REST_V && Math.abs(b.vy) < REST_V));
      if (allStill || this.step >= this.actionDeadline) {
        // 回合结束: 回复(整数) → 换边
        for (const b of this.bodies) {
          if (!b.alive) continue;
          b.sh = Math.min(this.cfg.maxSh, b.sh + Math.round(this.cfg.maxSh * this.cfg.shieldRec));
          b.hp = Math.min(this.cfg.maxHp, b.hp + Math.round(this.cfg.maxHp * this.cfg.healRec));
        }
        this.round++; this.side = this.side === 0 ? 1 : 0;
        this.phase = 'pre'; this.prepDeadline = this.step + this.cfg.prepSteps;
        this.events.push({ step: this.step, type: 'round', round: this.round, side: this.side });
        this.checkOver();
      }
    }
  }

  /** 校正: 采纳房主快照并重放其后操作, 再追到当前步 */
  restoreAndReplay(s: WorldSnap, nowStep: number): void {
    this.reset(s);
    this.advanceTo(nowStep);
  }

  diverged(s: WorldSnap): boolean {
    if (s.step > this.step + 120) { this.lastDiv = { why: 'snap-ahead-stall', snapStep: s.step, myStep: this.step }; return true; }
    if (s.step > this.step) return false; // 快照略领先=时钟 skew, 非分歧
    const mine = this.history.find(h => h.step === s.step);
    if (!mine) { this.lastDiv = { why: 'no-history', snapStep: s.step, myStep: this.step }; return true; }
    if (mine.round !== s.round || mine.side !== s.side || mine.phase !== s.phase) { this.lastDiv = { why: 'round/phase', mine: [mine.round, mine.side, mine.phase], snap: [s.round, s.side, s.phase], step: s.step }; return true; }
    for (const sb of s.bodies) {
      const mb = mine.bodies.find(b => b.pid === sb.pid);
      if (!mb) { this.lastDiv = { why: 'missing-body', pid: sb.pid }; return true; }
      // 位置容差 = 4px + 4步运动量(覆盖两端墙钟 skew); 静止时收紧到 4px 抓真分歧
      const tol = 4 * FP + (Math.abs(mb.vx) + Math.abs(mb.vy)) * 4;
      if (Math.abs(mb.x - sb.x) > tol || Math.abs(mb.y - sb.y) > tol || mb.hp !== sb.hp || mb.sh !== sb.sh || mb.alive !== sb.alive) {
        this.lastDiv = { why: 'body', pid: sb.pid, step: s.step, mine: [mb.x, mb.y, mb.vx, mb.vy, mb.hp, mb.sh], snap: [sb.x, sb.y, sb.vx, sb.vy, sb.hp, sb.sh], myOps: this.opLog.map(o => [o.pid, o.at]), snapOps: (s.ops || []).map(o => [o.pid, o.at]) };
        return true;
      }
    }
    return false;
  }
  lastDiv: any = null;
}
export function stepFor(t0: number, t: number): number { return Math.max(0, Math.round((t - t0) / STEP_MS)); }
