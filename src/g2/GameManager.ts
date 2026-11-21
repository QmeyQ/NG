// @ts-nocheck
// GameManager - g2 对局编排: 确定性内核 Phys2D 驱动回合/碰撞/伤害,
// 多端 = 操作同步(fire 带执行步) + 房主周期快照补充校正; 渲染从内核取状态(平滑, 不闪烁)。
// 离线单机走同一内核(AI 操作本地生成), 保证单机/联机同一套物理与回合逻辑。
import { Cha } from "./cha";
import { Phys2D, FP, STEP_MS, stepFor } from "./phys2d";
import { Timer } from "../libs/time";

type RoundType = 'player' | 'enemy';
export type G2Event = any;

const LAYOUT = { PLAYER: 1, ENEMY: 2 };

export class GameManager {
  owner: Laya.Sprite;
  config: any;
  kernel: Phys2D | null = null;
  myPid = '';
  pidSide: Record<string, number> = {};
  nodeToChar: Map<string, Cha> = new Map();
  activeChar: Cha = null;
  callbacks: any = {};
  started = false;
  online = false;
  isHost = false;
  private touchStartPos = { x: 0, y: 0 };
  private isAdjustingForce = false;
  private isAdjustingAngle = false;
  private originalAngle = 0;
  private originalForce = 0;
  private touchConfig = { clickTimeThreshold: 300, touchMoveThreshold: 1, forceAdjustSensitivity: 5, angleAdjustSensitivity: 0.01 };
  private clickT0 = 0;
  private aiFireStep = -1;
  private lastSnapSend = -1;
  private netSend: ((obj: any) => void) | null = null;
  private lastHp: Record<string, number> = {};
  private lastSh: Record<string, number> = {};
  private lastFlip: Record<string, number> = {};
  private resultShown = false;
  private _pendingFire = false;
  private atk = 40; // 单机40/联机80: 单机3身体(双弹道)约4hit约20-30s; 联机2 hit/kill ~60-100s
  private _lastRoundSeen = 1;

  constructor(owner: Laya.Sprite, config: any) {
    this.owner = owner;
    this.config = Object.assign({ prepTime: 30, turnTime: 20, attack: 60, defense: 10, maxHp: 100, maxSh: 50, shieldRec: 0.01, healRec: 0.01, critChance: 0.1, critMul: 2 }, config || {});
    Laya.stage.on(Laya.Event.MOUSE_DOWN, this, this.onTouchStart);
    Laya.stage.on(Laya.Event.MOUSE_UP, this, this.onTouchEnd);
    Laya.stage.on(Laya.Event.MOUSE_OUT, this, this.onTouchEnd);
    Laya.stage.on(Laya.Event.MOUSE_MOVE, this, this.onTouchMove);
  }

  setCallbacks(cb: any): void { this.callbacks = cb || {}; }
  setNetSend(fn: (obj: any) => void): void { this.netSend = fn; }
  setActiveChar(cha: Cha): void { this.activeChar = cha; cha.isPlayerControlled = true; }
  addCha(cha: Cha, isEnemy: boolean): void { this.nodeToChar.set(cha.bodyPid || cha.Sprite.name, cha); }
  getChar(name: string): Cha | null { return this.nodeToChar.get(name) || null; }

  createEnemy(pos: { x: number, y: number }, area: Laya.Sprite): Cha {
    const s = new Laya.Sprite(); s.name = 'ai_e'; s.anchorX = 0; s.anchorY = 0; s.pos(pos.x, pos.y); area.addChild(s);
    const cha = new Cha(s, true); cha.bodyPid = 'ai_e'; cha.attack = this.config.attack; cha.defense = this.config.defense;
    this.addCha(cha, true); return cha;
  }
  createAlly(pos: { x: number, y: number }, area: Laya.Sprite): Cha {
    const s = new Laya.Sprite(); s.name = 'ai_a'; s.anchorX = 0; s.anchorY = 0; s.pos(pos.x, pos.y); area.addChild(s);
    const cha = new Cha(s, false); cha.bodyPid = 'ai_a'; cha.attack = 15; cha.defense = 8;
    this.addCha(cha, false); return cha;
  }
  createPlayerAvatar(pid: string, pos: { x: number, y: number }, area: Laya.Sprite, isEnemy: boolean): Cha {
    const s = new Laya.Sprite(); s.name = 'player_' + pid; s.anchorX = 0; s.anchorY = 0; s.pos(pos.x, pos.y); area.addChild(s);
    const cha = new Cha(s, isEnemy); cha.bodyPid = pid; cha.attack = this.config.attack; cha.defense = this.config.defense;
    this.addCha(cha, isEnemy); return cha;
  }

  /** 建立确定性世界: bodies=[{pid,x,y,hp,sh,side}] */
  beginWorld(bodies: any[], seed: number, t0: number, online: boolean, isHost: boolean): void {
    this.online = online; this.isHost = isHost; this.atk = online ? 80 : 40;
    const cfg = {
      W: Laya.stage.width, H: Laya.stage.height,
      attack: this.config.attack, defense: this.config.defense, maxHp: this.config.maxHp, maxSh: this.config.maxSh,
      shieldRec: this.config.shieldRec, healRec: this.config.healRec, critChance: this.config.critChance, critMul: this.config.critMul,
      prepSteps: Math.round(this.config.prepTime * 60), turnSteps: Math.round((this.config.turnTime || 20) * 60),
    };
    const k = new Phys2D(cfg);
    this.pidSide = {};
    const snap = {
      step: 0, t0, prng: (seed >>> 0) || 1, round: 1, side: 0, phase: 'pre',
      prepDeadline: cfg.prepSteps, actionDeadline: 0, winner: null,
      bodies: bodies.slice().sort((a, b) => a.pid < b.pid ? -1 : 1).map(b => {
        this.pidSide[b.pid] = b.side;
        return { pid: b.pid, x: Math.round(b.x * FP), y: Math.round(b.y * FP), vx: 0, vy: 0, hp: b.hp, sh: b.sh, alive: true };
      }),
      ops: [],
    };
    k.pidSide = this.pidSide;
    k.reset(snap);
    this.kernel = k;
    this.started = true;
    this.resultShown = false;
    this.lastHp = {}; this.lastSh = {}; this.lastFlip = {};
    this.aiFireStep = -1;
    // 角色血量上限按 pid 配置(离线敌/友不同)
    for (const b of bodies) { const cha = this.nodeToChar.get(b.pid); if (cha) { cha.maxHealth = b.hp; cha.maxShield = b.sh; cha.health = b.hp; cha.shield = b.sh; } }
    if (this.callbacks.onRoundChange) this.callbacks.onRoundChange(1);
    if (this.side === this.mySide()) this.prepPlayerRound();
  }

  startGame(): void { /* 世界由 beginWorld 建立( Main 调用 ) */ }
  loadGameResources(_url: string): void { /* g2 资源在分包, 无需旧 res.res */ }

  get currRound(): RoundType { return this.kernel && this.kernel.side === (this.pidSide[this.myPid] || 0) ? 'player' : 'enemy'; }
  get roundPhase(): string { if (!this.kernel) return 'pre_turn'; return this.kernel.phase === 'pre' ? 'pre_turn' : (this.kernel.phase === 'action' ? 'action' : 'post_turn'); }
  getCurrRound(): RoundType { return this.currRound; }
  getCurrPhase(): string { return this.roundPhase; }
  getRoundNum(): number { return this.kernel ? this.kernel.round : 1; }
  isFinished(): boolean { return !!this.kernel && this.kernel.phase === 'over'; }
  hasRemotePlayers(): boolean { return this.online; }
  get authority(): boolean { return true; }
  get fireSeq(): number { return 0; }
  syncRound(_n: number, _r: RoundType, _p: string): void { /* 内核确定性推导, 无需外部回合覆盖 */ }
  remoteFire(_pid: string, _a: number, _f: number): void { /* 操作通道取代 */ }

  mySide(): number { return this.pidSide[this.myPid] !== undefined ? this.pidSide[this.myPid] : 0; }
  myBody(): any { return this.kernel ? this.kernel.body(this.myPid) : null; }
  canAct(): boolean {
    if (!this.kernel || this.kernel.phase !== 'pre') return false;
    if (this._pendingFire) return false; // 发射 lead 窗口内禁止重复发射
    if (this.kernel.side !== this.mySide()) return false;
    const b = this.myBody();
    return !!b && b.alive && Math.abs(b.vx) < 21 && Math.abs(b.vy) < 21;
  }

  /** 发射操作: 本地入队 + 联机广播(带执行步, 各端同一步应用) */
  fireOp(angle: number, force: number, delayMs: number = 800): void {
    if (!this.kernel || !this.canAct()) return;
    // 量化到未来绝对步: 各端在同一步应用操作(消息需在 delayMs 内到达, 迟到 clamp 由快照校正兜底)
    // 量化到 30 步网格 + 800ms lead: 覆盖网络延迟尖峰, 各端同一步应用
    const at = Math.ceil((Timer.now() + delayMs - this.kernel.t0) / STEP_MS / 30) * 30;
    const ops: any[] = [];
    for (const b of this.kernel.sideBodies(this.mySide())) {
      let ang = angle, f = force;
      if (b.pid !== this.myPid) { // 离线友军: 朝最近敌人
        let tgt: any = null;
        for (const o of this.kernel.bodies) if (o.alive && this.kernel.sideOf(o.pid) !== this.mySide() && !tgt) tgt = o;
        if (tgt) { ang = Math.atan2(tgt.y - b.y, tgt.x - b.x); f = force; } else continue;
      }
      ops.push({ k: 'fire', pid: b.pid, angle: ang, force: f, at });
    }
    for (const op of ops) { op.round = this.kernel.round; this.kernel.addOp(op); if (this.online && this.netSend) this.netSend(op); }
    if (ops.length) this._pendingFire = true;
  }
  endPrepPhase(): void { if (this.activeChar) this.fireOp(this.activeChar.angle, this.activeChar.force, 800); }

  /** 房主超时兜底 / 离线 AI: 生成确定性发射操作 */
  private autoFireIfNeeded(): void {
    const k = this.kernel; if (!k || k.phase !== 'pre') return;
    if (!this.online) {
      if (k.side === 1) {
        if (this.aiFireStep < 0) this.aiFireStep = k.step + 60 + (k.rand() % 120); // 回合开始后 1~3s 发射
        if (k.step >= this.aiFireStep) {
          const es = k.sideBodies(1); const ts = k.sideBodies(0);
          if (es.length && ts.length) {
            const e = es[0], t = ts[0];
            const ang = Math.atan2(t.y - e.y, t.x - e.x);
            const dist = Math.sqrt((t.x - e.x) ** 2 + (t.y - e.y) ** 2) / FP;
            const force = Math.min(10000, Math.max(1000, Math.round(dist * 45)));
            k.addOp({ k: 'fire', pid: e.pid, angle: ang, force, at: k.step });
          }
          this.aiFireStep = -1;
        }
      }
      return;
    }
    if (this.isHost && k.step >= k.prepDeadline) {
      const sb = k.sideBodies(k.side);
      if (sb.length) {
        const b = sb[0];
        let tgt: any = null;
        for (const o of k.bodies) if (o.alive && k.sideOf(o.pid) !== k.side && !tgt) tgt = o;
        const ang = tgt ? Math.atan2(tgt.y - b.y, tgt.x - b.x) : 0;
        const op = { k: 'fire', pid: b.pid, angle: ang, force: 4000, at: k.step };
        k.addOp(op); if (this.netSend) this.netSend(op);
      }
    }
  }

  /** 每帧: 推进内核到墙钟步 → 消费事件 → 渲染同步 → 房主快照 */
  tick(): void {
    const k = this.kernel; if (!k) return;
    k.advanceTo(stepFor(k.t0, Timer.now()));
    if (k.round !== this._lastRoundSeen) { this._lastRoundSeen = k.round; this._pendingFire = false; }
    if (k.phase !== 'pre') this._pendingFire = false;
    this.autoFireIfNeeded();
    const evs = k.events.splice(0, k.events.length);
    for (const e of evs) {
      if (e.type === 'damage') {
        const cha = this.nodeToChar.get(e.pid);
        if (cha) cha.addDamageText(e.dmg, e.crit);
        if (this.callbacks.onDamage) this.callbacks.onDamage(this.nodeToChar.get(e.from), cha, e.dmg, e.crit);
      } else if (e.type === 'contact') {
        // 房主(或单机)把接触结算为 hit 操作: 暴击种子随机只在操作生成端消费
        if (!this.online || this.isHost) {
          const k = this.kernel;
          for (const [att, def] of [[e.a, e.b], [e.b, e.a]]) {
            const ab = k.body(att), db = k.body(def);
            if (!ab || !db || !ab.alive || !db.alive) continue;
            if (k.sideOf(att) !== k.side) continue;
            let dmg = this.atk;
            const crit = (k.rand() % 1000) < Math.round(this.config.critChance * 1000);
            if (crit) dmg = Math.floor(dmg * this.config.critMul);
            const op = { k: 'hit', pid: def, from: att, dmg: Math.max(1, dmg), crit, at: e.step + 60 }; // 1s lead > 网络延迟尖峰: 各端同一步应用
            k.addOp(op);
            if (this.online && this.netSend) this.netSend(op);
          }
        }
      } else if (e.type === 'wall') {
        const cha = this.nodeToChar.get(e.pid); if (cha) cha.triggerHit(300);
      } else if (e.type === 'round') {
        this.aiFireStep = -1;
        if (this.callbacks.onRoundChange) this.callbacks.onRoundChange(e.round);
        this.hideAllForceUI();
        if (k.side === this.mySide()) this.prepPlayerRound();
      } else if (e.type === 'over') {
        this.hideAllForceUI();
        if (!this.resultShown) {
          this.resultShown = true;
          const win = e.winner === this.myPid;
          if (this.callbacks.onGameOver) this.callbacks.onGameOver(win ? 'player' : 'enemy');
        }
      }
    }
    // 渲染同步: 位置/血量/翻转/动画态全部来自内核(平滑确定性, 无网络抖动)
    for (const b of k.bodies) {
      const cha = this.nodeToChar.get(b.pid); if (!cha) continue;
      cha.syncBody(b);
    }
    // 房主快照在绝对网格步发送(1s 一次), 接收端历史网格对齐可直接对比
    if (this.online && this.isHost && this.netSend && k.step % 60 === 0 && k.step !== this.lastSnapSend) {
      this.lastSnapSend = k.step;
      this.netSend({ k: 'g2snap', snap: k.snapshot() });
    }
  }

  applyNetOp(op: any): boolean { if (this.kernel && op && (op.k === 'fire' || op.k === 'hit')) return this.kernel.addOp(op); return false; }
  applyNetSnap(snap: any): void {
    if (!snap) return;
    if (!this.kernel) { const k = new Phys2D(this.cfgFromSnap(snap)); k.pidSide = this.pidSide; k.reset(snap); this.kernel = k; this.started = true; this.online = true; this.isHost = false; this.atk = 80; this.resultShown = false; k.advanceTo(stepFor(snap.t0, Timer.now())); return; }
    if (snap.t0 !== this.kernel.t0) {
      // 新世界(再来一局): 整局重置; 旧局消息已被 seq 检查丢弃
      const k = new Phys2D(this.cfgFromSnap(snap)); k.pidSide = this.pidSide; k.reset(snap);
      this.kernel = k; this.started = true; this.online = true; this.resultShown = false;
      this._pendingFire = false; this._lastRoundSeen = snap.round;
      k.advanceTo(stepFor(snap.t0, Timer.now()));
      return;
    }
    const nowStep = stepFor(this.kernel.t0, Timer.now());
    if (snap.step > nowStep + 30) return;
    if (this.kernel.diverged(snap)) { try { (window as any).__g2div = this.kernel.lastDiv; } catch (e) { } this.kernel.restoreAndReplay(snap, nowStep); }
    // 补充状态同步: 离散状态(回合/阶段/胜负)以房主网格快照为准(1s 节拍, 非逐帧);
    // 血量/护盾仅在校正时采纳, 避免旧快照回滚刚到的 hit 操作
    const k = this.kernel;
    if (k.round !== snap.round || k.side !== snap.side || k.phase !== snap.phase) {
      k.round = snap.round; k.side = snap.side; k.phase = snap.phase as any;
      k.prepDeadline = snap.prepDeadline; k.actionDeadline = snap.actionDeadline;
      this._pendingFire = false; this._lastRoundSeen = snap.round;
      if (snap.phase === 'over' && !this.resultShown) {
        this.resultShown = true;
        if (this.callbacks.onGameOver) this.callbacks.onGameOver(snap.winner === this.myPid ? 'player' : 'enemy');
      }
    }
    // 静止位置静默收敛: 操作迟到 clamp 造成的 ±1 步偏移在静止时对齐(运动中不干预, 保持平滑)
    for (const sb of snap.bodies) {
      const mb = k.body(sb.pid);
      if (!mb) continue;
      const restM = Math.abs(mb.vx) < 21 && Math.abs(mb.vy) < 21;
      const restS = Math.abs(sb.vx) < 21 && Math.abs(sb.vy) < 21;
      if (restM && restS && (Math.abs(mb.x - sb.x) > 8 * 256 || Math.abs(mb.y - sb.y) > 8 * 256)) { mb.x = sb.x; mb.y = sb.y; }
    }
  }
  private cfgFromSnap(s: any): any {
    return { W: Laya.stage.width, H: Laya.stage.height, attack: this.config.attack, defense: this.config.defense, maxHp: this.config.maxHp, maxSh: this.config.maxSh, shieldRec: this.config.shieldRec, healRec: this.config.healRec, critChance: this.config.critChance, critMul: this.config.critMul, prepSteps: Math.round(this.config.prepTime * 60), turnSteps: Math.round((this.config.turnTime || 20) * 60) };
  }

  prepPlayerRound(): void {
    for (const b of this.kernel ? this.kernel.sideBodies(this.mySide()) : []) {
      const cha = this.nodeToChar.get(b.pid); if (!cha) continue;
      cha.showAimLine(true); cha.showForceBar(true); cha.showRigidBodyCircle(true); cha.drawUI();
    }
  }
  hideAllForceUI(): void {
    this.nodeToChar.forEach(cha => { cha.showAimLine(false); cha.showForceBar(false); cha.showRigidBodyCircle(false); cha.drawUI(); });
  }

  // ---------------- 触控(本地输入 → 操作) ----------------
  private onTouchStart(e: Laya.Event): void {
    const mx = Laya.stage.mouseX, my = Laya.stage.mouseY;
    this.clickT0 = Timer.now();
    this.touchStartPos.x = mx; this.touchStartPos.y = my;
    if (this.canAct()) {
      this.originalAngle = this.activeChar ? this.activeChar.angle : 0;
      this.originalForce = this.activeChar ? this.activeChar.force : 5000;
      if (mx < Laya.stage.width / 2) { this.isAdjustingForce = true; if (this.activeChar) this.activeChar.showForceBar(true); }
      else this.isAdjustingAngle = true;
      if (this.activeChar) this.activeChar.showAimLine(true);
      if (this.callbacks.onTouchStart) this.callbacks.onTouchStart({ x: mx, y: my });
    }
  }
  private onTouchEnd(e: Laya.Event): void {
    const mx = Laya.stage.mouseX, my = Laya.stage.mouseY;
    const dist = Math.sqrt((mx - this.touchStartPos.x) ** 2 + (my - this.touchStartPos.y) ** 2);
    const isClick = (Timer.now() - this.clickT0) < this.touchConfig.clickTimeThreshold && dist < this.touchConfig.touchMoveThreshold;
    if (isClick && this.canAct()) {
      this.fireOp(this.originalAngle, this.originalForce, 800);
      this.hideAllForceUI();
    }
    this.isAdjustingForce = false; this.isAdjustingAngle = false;
    if (this.callbacks.onTouchEnd) this.callbacks.onTouchEnd({ x: mx, y: my }, isClick);
  }
  private onTouchMove(e: Laya.Event): void {
    const mx = Laya.stage.mouseX, my = Laya.stage.mouseY;
    const dist = Math.sqrt((mx - this.touchStartPos.x) ** 2 + (my - this.touchStartPos.y) ** 2);
    if (dist > this.touchConfig.touchMoveThreshold && this.activeChar && this.canAct()) {
      if (this.isAdjustingForce) {
        this.activeChar.setForce(this.activeChar.force - (my - this.touchStartPos.y) * this.touchConfig.forceAdjustSensitivity);
      } else if (this.isAdjustingAngle) {
        this.activeChar.setAngle(this.activeChar.angle + (mx - this.touchStartPos.x) * this.touchConfig.angleAdjustSensitivity);
      }
      this.touchStartPos.x = mx; this.touchStartPos.y = my;
    }
  }

  destroyGame(): void {
    Laya.stage.off(Laya.Event.MOUSE_DOWN, this, this.onTouchStart);
    Laya.stage.off(Laya.Event.MOUSE_UP, this, this.onTouchEnd);
    Laya.stage.off(Laya.Event.MOUSE_OUT, this, this.onTouchEnd);
    Laya.stage.off(Laya.Event.MOUSE_MOVE, this, this.onTouchMove);
    this.nodeToChar.forEach(cha => { try { cha.destroy(); } catch (e) { } });
    this.nodeToChar.clear();
    this.kernel = null; this.activeChar = null; this.started = false;
  }
}
