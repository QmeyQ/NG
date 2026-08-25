/**
 * AIControl - AI 智能体控制器，驱动非本地角色的移动、追球、发球和击球决策
 * 包含难度系数枚举（AIDifficulty），由 PVE.update() 每帧调用
 * 负责球落点预测、击球冷却控制、双打分工与防守站位
 */
import { Cha, ChaState, StrokeParams } from "../cha";
import { Ball } from "../ball";
import { Timer } from "../../libs/time";
import { Mag, MatchPhase, TeamSide , MatchMode} from "../mag/mag";
import { PVE } from "../mag/pve";

/** AI 难度系数枚举，值越大 AI 越强 */
export enum AIDifficulty {
    EASY = 0.4,
    NORMAL = 0.6,
    HARD = 0.8,
    EXPERT = 0.95
}

/**
 * AIControl - AI 智能体控制器
 * 负责驱动非本地角色的移动、追球、发球和击球决策
 * 由 PVE.update() 每帧调用
 */
export class AIControl {
    /** 控制的角色实例 */
    private readonly _cha: Cha;
    /** 球引用 */
    private readonly _ball: Ball;
    /** 比赛管理器引用，用于查询比赛状态和规则 */
    private readonly _mag: Mag;
    /** 难度系数（0~1），影响击球力度和决策精度 */
    private readonly _difficulty: number;

    /** 是否激活（false 时 AI 停止一切行动） */
    private _isActive: boolean = true;
    /** AI 所属队伍，用于判断己方半场和击球权 */
    private _team: TeamSide | null = null;
    /** 预测的球落点坐标（XZ 平面 + 目标高度） */
    private _predictedPos: Laya.Vector3 = new Laya.Vector3();

    /** 上次击球时间戳，用于击球冷却控制 */
    private _lastHitTime: number = 300;
    /** 上次调试日志时间，用于限频 */
    private _lastDebugLog: number = 0;

    /** 击球冷却时间（毫秒），两次击球之间的最小间隔 */
    public hitCooldown: number = 300;
    /** 移动速度功率（0~1），传给 cha.move 的 power 参数 */
    public moveSpeed: number = 1.0;
    /** 目标击球高度（米），AI 尝试在球降到此高度时击球 */
    public targetHitHeight: number = 1.2;

    /** 获取 AI 控制的角色实例 */
    get cha(): Cha { return this._cha; }

    /**
     * 构造函数：绑定角色、球、比赛管理器，并查询初始队伍归属
     * @param cha 控制的角色
     * @param ball 球引用
     * @param mag 比赛管理器
     * @param difficulty AI 难度系数
     */
    constructor(cha: Cha, ball: Ball, mag: Mag, difficulty: AIDifficulty = AIDifficulty.NORMAL) {
        this._cha = cha;
        this._ball = ball;
        this._mag = mag;
        this._difficulty = difficulty;
        this._team = this._mag.getTeam(this._cha) ?? null;

    }

    /**
     * 设置 AI 激活/停用状态
     * 停用时如果角色正在移动则立即停止
     * @param active 是否激活
     */
    public setActive(active: boolean): void {
        this._isActive = active;
        if (!active && this._cha.state === ChaState.MOVE) this._cha.move(0, -1);
    }

    /**
     * 每帧更新：根据比赛阶段分发到对应的处理逻辑
     * - 未激活或被锁定时停止移动并返回
     * - 倒计时/发球阶段 → _handleServePhase
     * - 对打阶段 → _handleRallyPhase
     * - 其他阶段停止移动
     */
    public update(): void {
        if (!this._isActive) {
            if (this._cha.state === ChaState.MOVE) this._cha.move(0, -1);
            return;
        }

        if (!this._cha.canAct) {

            if (this._cha.state === ChaState.MOVE) this._cha.move(0, -1);
            return;
        }

        this._team = this._mag.getTeam(this._cha) ?? null;
        if (this._team === null) return;

        const phase = this._mag.phase;

        if (phase === MatchPhase.COUNTDOWN || phase === MatchPhase.SERVING) {
            this._handleServePhase(phase);
            return;
        }

        if (phase !== MatchPhase.RALLYING) {
            if (this._cha.state === ChaState.MOVE) this._cha.move(0, -1);
            return;
        }

        this._handleRallyPhase();
    }

    /**
     * 发球阶段处理：AI 站位+发对角球
     * - 如果自己是发球员且持球 → 尝试发球
     * - 否则移动到发球目标点等待
     * @param phase 当前比赛阶段（COUNTDOWN 或 SERVING）
     */
private _handleServePhase(phase: MatchPhase): void {
    const isServer = this._mag.isServer(this._cha);
    const isReceiver = this._mag.isReceiver(this._cha);
    
    // 1. 发球员：持球则发球，否则站位
    if (isServer) {
        if (this._cha.isP) {
            if (this._cha.state === ChaState.MOVE) this._cha.move(0, -1);
            this._tryServe();
            return;
        }
        // 发球员站位（移动到自己的发球位置）
        const pos = this._mag.getPlayerServePosition(this._cha);
        if (this._distanceTo(pos) > 0.2) {
            this._moveToward(pos);
        } else {
            if (this._cha.state === ChaState.MOVE) this._cha.move(0, -1);
        }
        return;
    }
    
    // 2. 接发球员：移动到球的落点目标区域准备接球
    if (isReceiver) {
        const pos = (this._mag as PVE).getServeTarget();
        if (this._distanceTo(pos) > 0.2) {
            this._moveToward(pos);
        } else {
            if (this._cha.state === ChaState.MOVE) this._cha.move(0, -1);
        }
        return;
    }
    
    // 3. 其他队友：移动到己方防守站位
    const pos = this._mag.getPlayerServePosition(this._cha);
    if (this._distanceTo(pos) > 0.2) {
        this._moveToward(pos);
    } else {
        if (this._cha.state === ChaState.MOVE) this._cha.move(0, -1);
    }
}

    /**
     * 尝试发球：管理蓄力 → 释放的完整流程
     * - 蓄力中：等待蓄力时长到达后释放击球
     * - 未蓄力：检查冷却、状态、球距离后开始蓄力发球
     */
private _tryServe(): void {
    const now = Timer.now();

    if (now - this._lastHitTime < this.hitCooldown) return;
    if (this._cha.state !== ChaState.IDLE && this._cha.state !== ChaState.MOVE) return;

    const ballPos = this._ball.pos;
    const dist2D = Math.sqrt(
        (this._cha.x - ballPos.x) ** 2 +
        (this._cha.z - ballPos.z) ** 2
    );
    if (dist2D > this._cha.hitRange * 0.9) return;

    this._cha.move(0, -1);
    const stroke = this._calcServeStroke();
        this._cha.hit(stroke, this._ball);
        this._lastHitTime = now;   // ★ 关键：更新击球时间
    }

    /**
     * 对打阶段处理：AI 核心决策逻辑
     * - 蓄力中：只检查释放，不移动
     * - 预测球落点，判断是否可以击球
     * - 可击球 → 执行击球
     * - 不可击球但球落己方 → 追球或靠近球
     * - 球落对方 → 回防到默认站位
     * 最后限制位置在己方半场
     */
private _handleRallyPhase(): void {
    const now = Timer.now();

    // 前摇/后摇期间不干预，让 cha.update 推进状态
    if (this._cha.state === ChaState.HIT_WINDUP || this._cha.state === ChaState.HIT_RECOVERY) {
        return;
    }

    const ballPhy = (this._ball as any).phy;
    if (!ballPhy || !ballPhy.state) {
        this._cha.move(0, -1);
        return;
    }


    const ballPos = ballPhy.state.pos;
    const ballVel = ballPhy.state.vel;

    this._predictLandingPoint(ballPos, ballVel);

    const dx = this._predictedPos.x - this._cha.x;
    const dz = this._predictedPos.z - this._cha.z;
    const distToLanding = Math.sqrt(dx * dx + dz * dz);

    const ballDistXZ = Math.sqrt(
        (this._cha.x - ballPos.x) ** 2 +
        (this._cha.z - ballPos.z) ** 2
    );

    const ballSpeed = Math.sqrt(ballVel.x ** 2 + ballVel.y ** 2 + ballVel.z ** 2);

    // 计算球靠近 AI 的速度（XZ 平面投影），用于提前量判定
    const dirToAiX = this._cha.x - ballPos.x;
    const dirToAiZ = this._cha.z - ballPos.z;
    const dirLen = Math.sqrt(dirToAiX * dirToAiX + dirToAiZ * dirToAiZ);
    let approachSpeed = 0;
    if (dirLen > 0.01) {
        approachSpeed = (ballVel.x * dirToAiX + ballVel.z * dirToAiZ) / dirLen;
    }
    // 球到达 AI 位置的时间（秒），不减阈值——提前量预留前摇时间
    const timeToReach = approachSpeed > 0.1 ? dirLen / approachSpeed : 100;

    // 预测前摇完成时球的高度，用于判断届时是否可击
    // 实际前摇时间 = upTime * 200ms（与 cha.ts update 中 windupTarget 一致）
    const windupSec = this._cha.upTime * 0.2;
    const futureY = ballPos.y + ballVel.y * windupSec - 0.5 * 9.8 * windupSec * windupSec;

    // --- 获取同队队友（双打时） ---
    let teammate: Cha | null = null;
    if (this._mag.mode === MatchMode.DOUBLE) {
        const teammates = this._mag.getTeamPlayers(this._team).filter(p => p !== this._cha);
        if (teammates.length > 0) teammate = teammates[0];
    }

  const isHittable = futureY < 8.0 && futureY > -2.0;
    const isOnCooldown = now - this._lastHitTime < this.hitCooldown;
    const canHit = this._canHitNow(ballDistXZ, isHittable, isOnCooldown, timeToReach, distToLanding, futureY);

    // ===== 调试：AI 决策信息（限频200ms） =====
    if (now - this._lastDebugLog > 200) {
        this._lastDebugLog = now;
        const distXZ = Math.sqrt((this._cha.x - ballPos.x) ** 2 + (this._cha.z - ballPos.z) ** 2);
        console.log(`%c[AI:${this._cha.id}] 决策 phase=RALLYING state=${this._cha.state}
  球位置=(${ballPos.x.toFixed(2)},${ballPos.y.toFixed(2)},${ballPos.z.toFixed(2)}) 球速=${ballSpeed.toFixed(1)}
  AI位置=(${this._cha.x.toFixed(2)},${this._cha.y.toFixed(2)},${this._cha.z.toFixed(2)})
  球XZ距离=${distXZ.toFixed(2)} hitRange=${this._cha.hitRange} hitRange*1.5=${(this._cha.hitRange*1.5).toFixed(2)}
  落点=(${this._predictedPos.x.toFixed(2)},${this._predictedPos.z.toFixed(2)}) 到落点距离=${distToLanding.toFixed(2)}
  approachSpeed=${approachSpeed.toFixed(1)} timeToReach=${timeToReach.toFixed(2)}s upTime=${windupSec}s
  futureY=${futureY.toFixed(2)} isHittable=${isHittable} isOnCooldown=${isOnCooldown} canHit=${canHit}
  lastHitCha=${this._mag.lastHitCha?.id ?? -1} currentHitTeam=${this._mag.currentHitTeam} myTeam=${this._team}
  isServeShot=${this._mag.isServeShot} isReceiver=${this._mag.isReceiver(this._cha)}`, "color: #00FFFF;");
    }

    if (canHit) {
        this._executeHit(now);
        return;
    }

    // 判断落点是否在自己半场
    const willLandOnMySide = (this._team === TeamSide.LEFT && this._predictedPos.x < 0.5) ||
                             (this._team === TeamSide.RIGHT && this._predictedPos.x > -0.5);

    // 双打分工：如果落点在自己半场，比较自己和队友谁更接近落点
    let shouldChase = false;
    if (willLandOnMySide) {
        if (teammate) {
            // 计算落点到队友的距离
            const dxTeammate = this._predictedPos.x - teammate.x;
            const dzTeammate = this._predictedPos.z - teammate.z;
            const distToLandingTeammate = Math.sqrt(dxTeammate * dxTeammate + dzTeammate * dzTeammate);
            // 如果自己离落点更近，或者队友距离太远（超过3米），则由自己接
            shouldChase = (distToLanding < distToLandingTeammate - 0.5) || (distToLandingTeammate > 3.0);
        } else {
            // 单打：只要是自己的半场就追
            shouldChase = true;
        }
    }

    // 另外，发球后第一拍必须由接发球员接（原有逻辑保留）
    const isServeReceiver = (!this._mag.isServeShot || this._mag.isReceiver(this._cha));

    if (shouldChase && isServeReceiver && distToLanding > 0.3) {
        // 追落点
        this._moveToward(this._predictedPos);
    } else if (shouldChase && isServeReceiver && distToLanding <= 0.3) {
        // 已到落点附近，但球还在空中，微调位置
        if (ballPos.y < 3.0) {
            const ballXZ = { x: ballPos.x, z: ballPos.z };
            const distToBallXZ = this._distanceTo(ballXZ);
            if (distToBallXZ > 0.3) {
                this._moveToward(ballXZ);
            } else {
                if (this._cha.state === ChaState.MOVE) this._cha.move(0, -1);
            }
        } else {
            if (this._cha.state === ChaState.MOVE) this._cha.move(0, -1);
        }
    } else {
        // 不需要追球：回到防守位置
        const defendX = this._team === TeamSide.LEFT ? -3.5 : 3.5;
        const defendPos = { x: defendX, z: 0 };
        const distToDefend = this._distanceTo(defendPos);
        if (distToDefend > 0.5) {
            this._moveToward(defendPos);
        } else {
            if (this._cha.state === ChaState.MOVE) this._cha.move(0, -1);
        }
    }

    this._clampPosition();
}

    /**
     * 预测球落点：基于当前球位置和速度，用抛物线公式计算球降到 targetHitHeight 时的 XZ 坐标
     * @param ballPos 球当前位置
     * @param ballVel 球当前速度
     */
    private _predictLandingPoint(ballPos: Laya.Vector3, ballVel: Laya.Vector3): void {
        const g = 9.8;
        const y0 = ballPos.y;
        const vy = ballVel.y;
        const yTarget = this._cha.hitHeight;

        const a = 0.5 * g;
        const b = -vy;
        const c = yTarget - y0;

        let t = -1;
        const disc = b * b - 4 * a * c;
        if (disc >= 0) {
            const sqrtDisc = Math.sqrt(disc);
            const t1 = (-b + sqrtDisc) / (2 * a);
            const t2 = (-b - sqrtDisc) / (2 * a);
            
            if (t1 > 0 && t2 > 0) t = Math.min(t1, t2);
            else if (t1 > 0) t = t1;
            else if (t2 > 0) t = t2;
        }

        if (t > 0) {
            this._predictedPos.setValue(
                ballPos.x + ballVel.x * t,
                yTarget,
                ballPos.z + ballVel.z * t
            );
        } else {
            this._predictedPos.setValue(ballPos.x, yTarget, ballPos.z);
        }
    }

    /**
     * 判断当前是否可以击球，逐条检查并输出不击球原因
     * - 冷却中
     * - 球高度不可击（太高或太低）
     * - AI 不在落点附近（还没到位）
     * - 提前量：球将在前摇时间（upTime）内到达才蓄力，蓄力完成时球刚好到
     * - 球距离安全上限
     * - 双打同队刚击球
     * - 自己刚击球
     * - 发球后非接球员不能击球
     * @param ballDistXZ 球与角色的 XZ 距离
     * @param isHittable 球高度是否可击
     * @param isOnCooldown 是否在冷却中
     * @param timeToReach 球到达击球范围的预计时间（秒）
     * @param distToLanding AI 到预测落点的距离
     * @returns true 表示可以击球
     */
    private _canHitNow(ballDistXZ: number, isHittable: boolean, isOnCooldown: boolean, timeToReach: number, distToLanding: number, futureY: number): boolean {
        if (isOnCooldown) {
            this._debugLog(`不击球: 冷却中 remaining=${(this.hitCooldown - (Timer.now() - this._lastHitTime)).toFixed(0)}ms`);
            return false;
        }
        if (!isHittable) {
            this._debugLog(`不击球: 球高度不可击 futureY=${futureY.toFixed(2)} (需0.1~4.5)`);
            return false;
        }
        if (distToLanding > this._cha.hitRange * 1.5) {
            this._debugLog(`不击球: 未到位 distToLanding=${distToLanding.toFixed(2)} > ${(this._cha.hitRange * 1.5).toFixed(2)}`);
            return false;
        }
        if (ballDistXZ > this._cha.hitRange) {
            this._debugLog(`不击球: 球不在击球范围 ballDistXZ=${ballDistXZ.toFixed(2)} > hitRange=${this._cha.hitRange}`);
            return false;
        }
        if (this._mag.mode === MatchMode.DOUBLE && this._mag.currentHitTeam === this._team) {
            this._debugLog(`不击球: 同队刚击球 currentHitTeam=${this._mag.currentHitTeam} myTeam=${this._team}`);
            return false;
        }
        if (this._mag.lastHitCha === this._cha) {
            this._debugLog(`不击球: 自己刚击球 lastHitCha=${this._mag.lastHitCha?.id}`);
            return false;
        }
        if (this._mag.isServeShot && !this._mag.isReceiver(this._cha)) {
            this._debugLog(`不击球: 发球后非接球员 isReceiver=${this._mag.isReceiver(this._cha)}`);
            return false;
        }
        return true;
    }

    /** 限频调试日志（200ms），自动附带 AI 位置和球位置 */
    private _debugLog(msg: string): void {
        const now = Timer.now();
        if (now - this._lastDebugLog > 200) {
            this._lastDebugLog = now;
            const ballPos = this._ball.pos;
            const distXZ = Math.sqrt((this._cha.x - ballPos.x) ** 2 + (this._cha.z - ballPos.z) ** 2);
            console.log(`%c[AI:${this._cha.id}] ${msg}
  AI=(${this._cha.x.toFixed(2)},${this._cha.y.toFixed(2)},${this._cha.z.toFixed(2)}) 球=(${ballPos.x.toFixed(2)},${ballPos.y.toFixed(2)},${ballPos.z.toFixed(2)}) distXZ=${distXZ.toFixed(2)}`, "color: #FFA500;");
        }
    }

    /**
     * 执行击球：直接击球（参考发球逻辑，无蓄力流程）
     * - 在 IDLE/MOVE 状态下停止移动、计算击球参数、直接击球
     * - 其他状态不击球
     * @param now 当前时间戳
     */
 private _executeHit(now: number): void {
    const ballPos = this._ball.pos;
    const distXZ = Math.sqrt((this._cha.x - ballPos.x) ** 2 + (this._cha.z - ballPos.z) ** 2);
    if (this._cha.state === ChaState.IDLE || this._cha.state === ChaState.MOVE) {
        this._cha.move(0, -1);
        const stroke = this._calcRallyStroke();
        console.log(`%c[AI:${this._cha.id}] 执行击球! state=${this._cha.state} power=${stroke.power.toFixed(0)}
  球位置=(${ballPos.x.toFixed(2)},${ballPos.y.toFixed(2)},${ballPos.z.toFixed(2)})
  AI位置=(${this._cha.x.toFixed(2)},${this._cha.y.toFixed(2)},${this._cha.z.toFixed(2)})
  球XZ距离=${distXZ.toFixed(2)} hitRange=${this._cha.hitRange} upTime=${this._cha.upTime}`, "color: #00FF00; font-weight:bold;");
        this._cha.hit(stroke, this._ball);
        this._lastHitTime = now;
    } else {
        console.log(`%c[AI:${this._cha.id}] 无法击球: state=${this._cha.state} (非IDLE/MOVE)
  球位置=(${ballPos.x.toFixed(2)},${ballPos.y.toFixed(2)},${ballPos.z.toFixed(2)})
  AI位置=(${this._cha.x.toFixed(2)},${this._cha.y.toFixed(2)},${this._cha.z.toFixed(2)})
  球XZ距离=${distXZ.toFixed(2)}`, "color: #FF0000; font-weight:bold;");
    }
}
    /**
     * 朝目标点移动：计算世界方向并转换为角色局部移动角度
     * 距离 < 0.01 时停止移动
     * @param target 目标坐标 {x, z}
     */
    private _moveToward(target: { x: number, z: number }): void {
        const dx = target.x - this._cha.x;
        const dz = target.z - this._cha.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 0.01) {
            if (this._cha.state === ChaState.MOVE) this._cha.move(0, -1);
            return;
        }

        const worldDir = new Laya.Vector3(dx, 0, dz);
        Laya.Vector3.normalize(worldDir, worldDir);

        const invRot = new Laya.Quaternion();
        Laya.Quaternion.invert(this._cha.root.transform.rotation, invRot);
        const localIntent = new Laya.Vector3();
        Laya.Vector3.transformQuat(worldDir, invRot, localIntent);

        let moveAngle = Math.atan2(localIntent.z, -localIntent.x) * 180 / Math.PI;
        moveAngle = (moveAngle + 360) % 360;

        this._cha.move(moveAngle, this.moveSpeed);
    }

    /**
     * 限制角色位置在己方半场内：
     * - 左队 x ∈ [-halfLength, -0.2]
     * - 右队 x ∈ [0.2, halfLength]
     * - z ∈ [-halfWidth+0.2, halfWidth-0.2]
     */
    private _clampPosition(): void {
        const halfLength = 6.7;
        const halfWidth = this._mag.mode === 1 ? 2.59 : 3.05;

        const maxX = (this._team === TeamSide.LEFT) ? -0.2 : halfLength;
        const minX = (this._team === TeamSide.LEFT) ? -halfLength : 0.2;
        const maxZ = halfWidth - 0.2;
        const minZ = -halfWidth + 0.2;

        if (this._cha.x > maxX) this._cha.x = maxX;
        if (this._cha.x < minX) this._cha.x = minX;
        if (this._cha.z > maxZ) this._cha.z = maxZ;
        if (this._cha.z < minZ) this._cha.z = minZ;
    }

    /**
     * 计算发球击球参数：朝发球目标点发球，固定 angV=45°，力度受难度影响
     * @returns 发球击球参数
     */
    private _calcServeStroke(): StrokeParams {
        const target = (this._mag as PVE).getServeTarget();
        const dx = target.x - this._cha.x;
        const dz = target.z - this._cha.z;
        let angH = Math.atan2(dx, dz) * 180 / Math.PI;
        angH = (angH + 360) % 360;

        const power = 30 * (0.7 + this._difficulty * 0.3);
        const angV = 45;

        return { power, angH, angV, spi: new Laya.Vector3(0, 0, 0) };
    }

    /**
     * 计算对打击球参数：朝对方球员平均位置击球
     * - 距网近 → 高吊球（angV=70, 低力度）
     * - 距网中 → 平抽球（angV=30, 中力度）
     * - 距网远 → 中高球（angV=55, 高力度）
     * 力度受难度系数影响
     * @returns 对打击球参数
     */
    private _calcRallyStroke(): StrokeParams {
        const opponentTeam = (this._team === TeamSide.LEFT) ? TeamSide.RIGHT : TeamSide.LEFT;
        const opponentPlayers = this._mag.getTeamPlayers(opponentTeam);
        let targetX = 0, targetZ = 0;
        if (opponentPlayers.length > 0) {
            let sumX = 0, sumZ = 0;
            for (const p of opponentPlayers) {
                sumX += p.x;
                sumZ += p.z;
            }
            targetX = sumX / opponentPlayers.length;
            targetZ = sumZ / opponentPlayers.length;
        } else {
            targetX = (this._team === TeamSide.LEFT) ? 5 : -5;
            targetZ = 0;
        }

        const distToNet = Math.abs(this._cha.x);
        let angV: number, basePower: number;
        if (distToNet < 1.0) {
            angV = 70;
            basePower = 15;
        } else if (distToNet < 2.5) {
            angV = 30;
            basePower = 35;
        } else {
            angV = 55;
            basePower = 50;
        }

        const power = basePower * (0.7 + this._difficulty * 0.3);
        const dx = targetX - this._cha.x;
        const dz = targetZ - this._cha.z;
        let angH = Math.atan2(dx, dz) * 180 / Math.PI;
        angH = (angH + 360) % 360;

        return { power, angH, angV, spi: new Laya.Vector3(0, 0, 0) };
    }

    /**
     * 计算角色到目标点的 XZ 平面距离
     * @param pos 目标坐标 {x, z}
     * @returns XZ 距离
     */
    private _distanceTo(pos: { x: number, z: number }): number {
        const dx = pos.x - this._cha.x;
        const dz = pos.z - this._cha.z;
        return Math.sqrt(dx * dx + dz * dz);
    }
}
