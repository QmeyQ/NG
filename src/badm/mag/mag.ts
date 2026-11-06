/**
 * Mag - 比赛管理基类
 *
 * 本版重点：
 * - 普通击球取消“大圆形范围”判定，改为“前方较大 + 背后很小”的方向性命中区。
 * - 击球动画按球高度分 high / flat / low 三层，再按球位于角色左右生成：
 *   lhighhit / rhighhit / lhit / rhit / llowhit / rlowhit
 * - 移动与击球互不排斥。
 * - 双击 hit 触发特殊接球（jumphit / diving）。
 * - jumphit 提高可接高度，同时缩小低位接球范围。
 * - diving 通过移动摇杆方向动态调整方向（最大 30°/s），
 *   角色以 3 倍移动速度前进，最大距离 = diveMaxDist * 摇杆力度，
 *   期间接球范围随鱼跃进度从近到远动态扩展，球进入范围立即击球。
 */
import { Cha, ChaState, StrokeParams } from "../obj/cha";
import { Ball } from "../obj/ball";
import { Rule, MatchMode, MatchPhase, TeamSide, CourtCfg, MatchCfg } from "./rule";
import { Timer } from "../../libs/time";
import { State } from "../engine/phyCfg";

export { MatchMode, MatchPhase, TeamSide, CourtCfg, MatchCfg };

type ReceiveAction = "none" | "jumphit" | "diving";

interface HitState {
    stroke: StrokeParams;
    /** 击球时刻(时间驱动同步, 用户规格): 本地击球=undefined(出手时=现在);
     *  PVP 远端重放=消息内击球时刻——出手时传 ball.hitAt 把轨迹从过去时刻起算 */
    hitTime?: number;
    ballPos: Laya.Vector3 | null;
    recoveryDuration: number;
    compensating: boolean;
    lastDist: number;
    animName: string;
    receiveAction: ReceiveAction;

    /** 特殊动作的方向 */
    receiveAngle: number;

    /** 本次动作临时扩大/缩小的判定参数 */
    reachBonus: number;
    highBonus: number;
    lowRangeScale: number;

    /** 鱼跃动态输入 */
    diveInputActive: boolean;
    diveInputAngle: number;
    diveInputPower: number;
    diveMaxDist: number;
    diveTraveled: number;
    lastUpdateMs: number;

    /** 单手自动补偿: jumphit 自动 move 追球 / diving 自动转向+满冲程; 玩家移动操作即终止 */
    autoComp: boolean;

    /** 前摇延迟击球定时器 id(松手早于前摇时长 → 挂到前摇结束自动出手) */
    pendExecId: string | null;
}

export abstract class Mag {
    public ball: Ball;
    public players: Cha[] = [];
    public rule: Rule;

    public phase: MatchPhase = MatchPhase.WAITING_START;
    public scores: Record<TeamSide, number> = { [TeamSide.LEFT]: 0, [TeamSide.RIGHT]: 0 };
    public servingTeam: TeamSide = TeamSide.LEFT;
    public currentHitTeam: TeamSide = TeamSide.RIGHT;
    public gamesWon: Record<TeamSide, number> = { [TeamSide.LEFT]: 0, [TeamSide.RIGHT]: 0 };
    public gameEnded = false;
    public matchEnded = false;

    public teamMap: Map<Cha, TeamSide> = new Map();
    public court: CourtCfg;
    public cfg: MatchCfg;
    public currentServer: Cha | null = null;
    public currentReceiver: Cha | null = null;
    public mode: MatchMode;
    public isSingle = false;

    public isBallAssigned = false;
    /**
     * 权威状态声明的持球角色 id(-1 = 当前无人持球)。
     * 非权威端本地 isP 会被普通角色帧跳过本地控制角色, 单靠 isP 判断"球该不该钉在手上"
     * 在两端不等价; 这个值只来自权威状态, 是唯一可信的持球口径。
     */
    public authBallHolderId = -1;
    public isServeShot = false;
    public lastHitCha: Cha | null = null;
    public lastScoreReason = "";
    public isAuthoritative = true;
        /** 鹰眼记录: 轨迹点(落地前 2.5s 取自 phy.map 历史 + 落地后继续采样) */
    public eagleRecPts: State[] | null = null;
    /** 记录完成标志(落地后采样窗结束) */
    public eagleRecDone = false;
    /** 落地后追加采样定时器(40ms 采 ballO 实际位置) */
    public eagleRecTid: string | null = null;
    /** 记录开始时刻(落地时刻) */
    public eagleRecT0 = -1;
    /** PVP 联机模式标志(非权威端 rule 不本地推进, 状态由权威端 state 帧驱动) */
    public isPvpMode = false;
    /** 鹰眼回放进行中(badm 维护; PVP 非权威端 applyState 开窗同步时防回放中重开提示) */
    public eaglePlaying = false;
    /** 鹰眼回放记录就绪回调(badm 接线: 落地时已存前后 2.5s 轨迹记录; 无记录不开挑战窗) */
    /** 发球阶段开始回调(rule COUNTDOWN→SERVING 转换时调; badm 接线清鹰眼记录——
     *  用户规格: 记录每次发球阶段才清, 没清不覆盖(结算后的鹰眼窗口期旧记录保留可回放)) */
    public onServeStart?: () => void;

        /** 本地角色跟随相机 */
    private _camera: Laya.Camera | null = null;
    /** 相机跟随目标（本地角色） */
    private _cameraTarget: Cha | null = null;

    /** 相机相对角色的后向距离 */
    public cameraBackDist = 3.0;
    /** 相机相对角色的高度偏移 */
    public cameraUpOffset = 2;
    /** 相机相对角色的横向偏移 */
    public cameraSideOffset = -0.2;
    /** 相机看向的前瞻距离 */
    public cameraLookAhead = 3.0;
    /** 相机看向的角色高度基准 */
    public cameraLookHeight = 0.8;


    /** 普通前向命中距离比例；取消原“大范围圆形” */
    public frontHitRatio = 1.0;
    /** 背后命中距离大幅降低 */
    public backHitRatio = 0.38;
    /** 前方最大夹角 */
    public frontHitHalfAngle = 72;
    /** 背后极小夹角 */
    public backHitHalfAngle = 18;

    /** 高位分层阈值 */
    public highHitHeight = 1.25;
    /** 低位分层阈值 */
    public lowHitHeight = 0.35;

    /** jumphit：允许提高的球高度 */
    public jumpHighBonus = 1.15;
    /** jumphit：低位范围缩小（不能接过低的球） */
    public jumpLowRangeScale = 0.55;
    /** diving：沿滑动方向额外扩大接球距离 */
    public divingReachBonus = 1.35;
    /** diving：非冲出方向的接球范围缩短系数 */
    public diveSideScale = 0.6;

    /** 鱼跃最大位移（米） */
    public diveMaxDistance = 2.5;
    /** 特殊接球滞留超时(ms): 冲程+趴地窗口, 到时强制起身(未进前摇态的兜底出口) */
    private static readonly SPECIAL_IDLE_TIMEOUT = 1500;
    /** 鱼跃方向最大调整角速度（度/秒） */
    public diveTurnSpeed = 30;

    private _hitStates: Map<Cha, HitState> = new Map();

    public onScoreChanged?: (l: number, r: number) => void;
    public onGameEnded?: (winner: TeamSide) => void;
    public onMatchEnded?: (winner: TeamSide) => void;
    public onSideSwitch?: () => void;
    public onCountdown?: (count: number, redAt?: number) => void;
    public onStateChange?: () => void;
    public onTeleport?: () => void;
    public onHit?: () => void;
    /** 联机对端离场(离开房间/房间解散/本机已不在房间): badm 接线提示玩家, 空串=房间已没了 */
    public onPeerLeft?: (playerId: string) => void;
    /** 鹰眼挑战窗口开关通知(rule 结算后 3s 窗口): true=开(badm 显示"双击进入"倒计时提示), false=关 */
    public onEagleChallengeWindow?: (open: boolean) => void;
    /** 鹰眼远端确认回调(PVP): 对端确认进入挑战阶段时触发——badm 接线 _startEagleEye
     *  双端同进回放(用户规格: 一个玩家确认了另一个玩家一起进) */
    public onEagleRemoteConfirm?: () => void;

    /** 关闭鹰眼挑战窗口(用户双击进入回放 / 回合重置; 幂等) */
    public closeEagleWindow(): void {
        this.rule.closeEagleWindow();
    }

    constructor(p1: Laya.Sprite3D, ball: Ball, isSingle: boolean = false, p2?: Laya.Sprite3D, racket?: Laya.Sprite3D) {
        this.ball = ball;
        this.isSingle = isSingle;
        this._initPlayers(p1, p2, racket);

        this.mode = this.players.length === 2 ? MatchMode.SINGLE : MatchMode.DOUBLE;
        this.court = this.mode === MatchMode.SINGLE
            ? { halfLength: 6.7, halfWidth: 2.59, serveLineX: 1.98, serveHalfZ: 2.59 }
            : { halfLength: 6.7, halfWidth: 3.05, serveLineX: 1.98, serveHalfZ: 1.525 };

        this.cfg = {
            maxScore: 21,
            bestOf: 3,
            serveTimeLimit: 10000,
            countdownDuration: 5000,
            ballAssignDelay: 5000 // 已废弃: 准备阶段结束(_updateCountdown)才分球
        };

        this._initTeams();
        this.rule = new Rule(this);
        // 相机延后挂载: attachCamera(localCha) 由 badm 在确定本地角色后调用——
        // 旧版此处硬编码 players[0], PVP 时 B 端(1 号)相机跟 0 号(对方) = "相机挂错角色"根因
    }

    /**
     * 挂载本地跟随相机到指定角色(用户规格: 相机必须挂本地玩家控制的角色上)。
     * 幂等: 重复调用先摘旧相机; PVP 在 setup() 得到 localCha 后调, PVE 在 setLocalCha 后调。
     */
    public attachCamera(target: Cha): void {
        if (this._camera && this._cameraTarget === target) return;
        if (this._camera) {
            this._camera.removeSelf();
            this._camera.destroy();
            this._camera = null;
            this._cameraTarget = null;
        }
        this._createCamera(target);
    }

    /** 销毁(场景 onDestroy 调): 子类停网络线程/清回调; 基类摘相机+清击球排队。幂等可重入 */
    public destroy(): void {
        this._pendHit.clear();
        if (this._camera) {
            this._camera.removeSelf();
            this._camera.destroy();
            this._camera = null;
            this._cameraTarget = null;
        }
    }

    private _initPlayers(p1: Laya.Sprite3D, p2?: Laya.Sprite3D, racket?: Laya.Sprite3D): void {
        const scene3D = p1.parent as Laya.Sprite3D;
        const charNodes: Laya.Sprite3D[] = [p1];

        const total = this.isSingle ? 2 : 4;
        for (let i = 1; i < total; i++) {
            // 角色按 id 轮换 prefab: 偶数 id 用 p1, 奇数 id 用 p2(若提供)否则 p1
            const src = (p2 && i % 2 === 1) ? p2 : p1;
            const clone = src.clone() as Laya.Sprite3D;
            clone.active = true;  // p2 作 clone 源可能 active=false, clone 后恢复参与渲染
            scene3D.addChild(clone);
            charNodes.push(clone);
        }
        // p2 仅作 clone 源, 隐藏不参与渲染(若提供且非 p1)
        if (p2 && p2 !== p1) p2.active = false;

        const cha1 = new Cha(p1, undefined);
        cha1.id = 0;
        cha1.odd = false;
        this.players.push(cha1);

        if (this.isSingle) {
            const cha3 = new Cha(charNodes[1], undefined);
            cha3.id = 2;
            cha3.odd = false;
            this.players.push(cha3);
        } else {
            const cha2 = new Cha(charNodes[1], undefined);
            cha2.id = 1;
            cha2.odd = true;

            const cha3 = new Cha(charNodes[2], undefined);
            cha3.id = 2;
            cha3.odd = false;

            const cha4 = new Cha(charNodes[3], undefined);
            cha4.id = 3;
            cha4.odd = true;

            this.players.push(cha2, cha3, cha4);
        }

        // 球拍挂载(用户规格): 角色与拍分离, 每个角色挂 racket 到 RP 骨骼节点, 对齐坐标系
        if (racket) for (const node of charNodes) this._attachRacket(node, racket);

        // girl1/boy 角色均自带 mesh/动画(lh 占位符链), 跳过 girl 专用 setDress
        console.log('[mag] 角色自带 mesh/动画, 跳过 setDress');
    }

    /** 球拍挂载(用户规格): clone racket 挂到角色 RP 骨骼节点, 对齐坐标系(位置/旋转/缩放归零);
     *  挂前清 RP 下旧 racket(模板复用/重复初始化时防叠加) */
    private _attachRacket(chaNode: Laya.Sprite3D, racketPrefab: Laya.Sprite3D): void {
        const rp = this._findNode(chaNode, "RP");
        if (!rp) { console.warn("[mag] 角色 RP 节点未找到, 跳过球拍挂载"); return; }
        for (let i = rp.numChildren - 1; i >= 0; i--) {
            const old = rp.getChildAt(i) as Laya.Sprite3D;
            if (old && old.name === "racket") { old.removeSelf(); old.destroy(); }
        }
        const racket = racketPrefab.clone() as Laya.Sprite3D;
        racket.name = "racket";
        racket.transform.position = new Laya.Vector3(0, 0, 0);
        racket.transform.rotation = new Laya.Quaternion(0, 0, 0, 1);
        racket.transform.scale = new Laya.Vector3(1, 1, 1);
        rp.addChild(racket);
    }

    /** 递归查找子节点 by name */
    private _findNode(node: Laya.Sprite3D, name: string): Laya.Sprite3D | null {
        if (node.name === name) return node;
        for (let i = 0; i < node.numChildren; i++) {
            const r = this._findNode(node.getChildAt(i) as Laya.Sprite3D, name);
            if (r) return r;
        }
        return null;
    }

    private _initTeams(): void {
        if (this.mode === MatchMode.SINGLE) {
            this.teamMap.set(this.players[0], TeamSide.LEFT);
            this.teamMap.set(this.players[1], TeamSide.RIGHT);
            this.players[0].side = -1;
            this.players[1].side = 1;
        } else {
            this.teamMap.set(this.players[0], TeamSide.LEFT);
            this.teamMap.set(this.players[1], TeamSide.LEFT);
            this.teamMap.set(this.players[2], TeamSide.RIGHT);
            this.teamMap.set(this.players[3], TeamSide.RIGHT);

            this.players[0].side = -1;
            this.players[1].side = -1;
            this.players[2].side = 1;
            this.players[3].side = 1;
        }
    }

    public startMatch(): void {
        this.rule.initMatch();
    }

    public update(): void {
        this.rule.update();
        this._updateBallHolding();
        this._updateHitStates();
        //this._updateHitRangeDbg();    绘制角色击球范围
    }

    /**
     * 击球范围调试绘制(默认开启, Cha.dbgRange 总开关): 每帧把 _canHitBall 的
     * 判定几何参数喂给各角色线框自绘——前方扇形/背后窄扇/高度带/鱼跃矩形/脚下十字。
     * 用于排查"不击球"(球出判定区)与"位置偏移"(十字 vs 视觉模型)。
     */
    private _updateHitRangeDbg(): void {
        if (!Cha.dbgRange) return;
        for (const cha of this.players) {
            const st = this._hitStates.get(cha);
            const diving = st && st.receiveAction === "diving";
            const jumping = st && st.receiveAction === "jumphit";
            let hMin = -0.65;
            let hMax = 1.5;
            if (jumping) {
                hMax += st!.highBonus;
                hMin *= st!.lowRangeScale;
            }
            cha.dbgHitRange({
                rangeF: cha.hitRange * (diving ? 1 : this.frontHitRatio),
                angF: this.frontHitHalfAngle,
                rangeB: cha.hitRange * this.backHitRatio,
                angB: this.backHitHalfAngle,
                hMin, hMax,
                // 鱼跃矩形: 冲出方向(receiveAngle 世界系) len = 判定 range(含 reachBonus), 宽取侧向缩短判定近似
                dive: diving ? {
                    ang: st!.receiveAngle,
                    len: cha.hitRange * this.frontHitRatio + st!.reachBonus,
                    wid: cha.hitRange * this.frontHitRatio * this.diveSideScale * 2
                } : null,
                // 球可视化(黄竖线+青连线): 每角色到球的距离/角度一眼可见
                ball: this.ball ? { x: this.ball.x, y: this.ball.y, z: this.ball.z } : null
            });
        }
    }

    private _updateBallHolding(): void {
        // 钉球是"附件"不是"弹道": 持球者是谁由权威状态给( ballHolderChaId / isP ), 手在哪由本机
        // 角色位置决定(角色坐标本身就是同步来的)——两端各钉各的手才是【一致】的, 而不是分家。
        // 旧版只在权威端钉球、非权威端等权威快照拽球位, 于是发球阶段两端一个球在甲手一个球在乙手。
        // 飞行中的球不归这里管(下面 isCalc 一判就返回)。

        // 准备阶段(用户规格): 无人持球——球停在上回合落地处直到分球瞬移到手
        if (this.phase === MatchPhase.COUNTDOWN && !this.isBallAssigned) return;

        // 持球兜底铁律(用户规则): 物理未激活(!isCalc) = 球在"待发球"态——必须始终钉在持球者手上。
        // isP 流转空窗(hit 判罚 score→resetMatch→ballAssignDelay 窗口期 isP 全 false)钉回 currentServer,
        // 任何路径都不允许球滞留物理残态(prefab 初始位 0,0,0"卡原点"根因)。
        if (this.ball && this.ball.phy && this.ball.phy.isCalc) return;

        let holder: Cha | null = null;
        for (const cha of this.players) {
            if (cha.isP) { holder = cha; break; }
        }
        if (!holder) {
            // 空窗兜底: 钉回当前发球员(发球权转移/回合重置的过渡帧)
            holder = this.currentServer || null;
            if (holder) holder.isP = true;
        }
        if (!holder) return;

        const holderNode = holder.ballHolderNode;
        if (holderNode) {
            const wm = holderNode.transform.worldMatrix;
            this.ball.pos = new Laya.Vector3(
                wm.elements[12],
                wm.elements[13],
                wm.elements[14]
            );
        } else {
            const dir = holder.x > 0 ? -1 : 1;
            this.ball.pos = new Laya.Vector3(
                holder.x + 0.5 * dir,
                1.0,
                holder.z
            );
        }
    }

    /**
     * 普通命中判定：
     * 本地前后方向 + XZ 距离 + 高度层。
     */
    private _canHitBall(
        cha: Cha,
        ballPos: Laya.Vector3,
        state: HitState
    ): boolean {
        const dx = ballPos.x - cha.x;
        const dz = ballPos.z - cha.z;
        const distXZ = Math.hypot(dx, dz);
        if (distXZ <= 0.001) return true;

        const invQuat = new Laya.Quaternion();
        Laya.Quaternion.invert(cha.root.transform.rotation, invQuat);

        const localDir = new Laya.Vector3(dx, 0, dz);
        Laya.Vector3.transformQuat(localDir, invQuat, localDir);

        const localAngle = Math.atan2(localDir.x, localDir.z) * 180 / Math.PI;
        const absAngle = Math.abs(localAngle);

        let range = cha.hitRange;
        let allowedAngle = this.frontHitHalfAngle;

        const isBack = Math.abs(absAngle) > 90;
        if (isBack) {
            range *= this.backHitRatio;
            allowedAngle = this.backHitHalfAngle;
        } else {
            range *= this.frontHitRatio;
        }

        // diving：receiveAngle 是世界系角(atan2(x,z) 语义 0=+z, 与 phy.hit/_localAngToWorld 统一)——
        // 冲出方向(dot>0.35)接球范围延伸, 其他方向缩短。
        // 【旧 bug】: actionDir 曾用 (cos,sin)(0=+x 语义) 与 receiveAngle 体系差 90°,
        // 对角线上表现为右下↔左上互换(45°/225° 两体系方向重合故右上/左下正常)
        if (state.receiveAction === "diving") {
            const moveRad = state.receiveAngle * Math.PI / 180;
            const actionDir = new Laya.Vector3(Math.sin(moveRad), 0, Math.cos(moveRad));

            const dot = (dx * actionDir.x + dz * actionDir.z) / distXZ;
            if (dot > 0.35) range += state.reachBonus;
            else range *= this.diveSideScale;
        }

        const h = ballPos.y - cha.y;
        let minH = -0.65;
        let maxH = 1.5;

        if (state.receiveAction === "jumphit") {
            maxH += state.highBonus;
            minH *= state.lowRangeScale;
        }

        // 贴身球(用户规格): 球近身(distXZ ≤ hitRange×0.25)时拍子随手可及, 跳过朝向角度
        // 判定(高度/距离仍查)——近身球方位角天然极端(极小横向偏移即大角度),
        // 旧版 0.26m 贴身侧向球被 79°>72° 拒绝 = "球在身上打不到"荒谬判定
        const isNear = distXZ <= cha.hitRange * 0.25;

        // 调试: 记录最近一次判定的完整细节(_executeHit 的 HIT 日志消费, 定位"不击球"维度)
        this._dbgHitCheck = {
            cha: `${cha.id}@(${cha.x.toFixed(2)},${cha.y.toFixed(2)},${cha.z.toFixed(2)})`,
            ball: `(${ballPos.x.toFixed(2)},${ballPos.y.toFixed(2)},${ballPos.z.toFixed(2)})`,
            distXZ: distXZ, absAngle: absAngle, isBack: isBack, isNear: isNear,
            range: range, allowedAngle: allowedAngle,
            h: h, hBand: `${minH.toFixed(2)}~${maxH.toFixed(2)}`,
        };

        if (h < minH || h > maxH) return false;
        if (distXZ > range) return false;
        if (!isNear && absAngle > allowedAngle) return false;

        return true;
    }

    /** 最近一次 _canHitBall 判定细节(HIT 日志调试用) */
    private _dbgHitCheck: any = null;

    /**
     * 选择普通击球动画：上/中/下三层 + 左/右。
     */
    private _selectStandardHitAnim(
        cha: Cha,
        ballPos: Laya.Vector3
    ): string {
        const invQuat = new Laya.Quaternion();
        Laya.Quaternion.invert(cha.root.transform.rotation, invQuat);

        const local = new Laya.Vector3(
            ballPos.x - cha.x,
            ballPos.y - cha.y,
            ballPos.z - cha.z
        );
        Laya.Vector3.transformQuat(local, invQuat, local);

        const prefix = local.x < -0.12 ? "l" : "r";
        const h = local.y;

        if (h >= this.highHitHeight) return `${prefix}highhit`;
        if (h <= this.lowHitHeight) return `${prefix}lowhit`;
        return `${prefix}hit`;
    }

    /**
     * 球高 -> jumphit；否则 -> diving。
     */
    private _selectReceiveAction(cha: Cha, ballPos: Laya.Vector3): ReceiveAction {
        const h = ballPos.y - cha.y;
        return h >= this.highHitHeight ? "jumphit" : "diving";
    }

    /**
     * 双击 hit 入口。
     * angle 为摇杆当前/最近方向; auto=单手模式(开启自动补偿: jump 追球/dive 转向)。
     */
    public startSpecialReceive(
        cha: Cha,
        angle: number,
        auto?: boolean,
        stroke?: StrokeParams
    ): void {
        if (cha.receiveAction !== "none") return;

        const ballPos = new Laya.Vector3(this.ball.x, this.ball.y, this.ball.z);
        const action = this._selectReceiveAction(cha, ballPos);

        const safeStroke: StrokeParams = stroke ?? {
            power: 75,
            angH: angle,
            angV: 55,
            spi: new Laya.Vector3(0, 0, 0)
        };

        // 先重置角色自身移动积分，避免重复叠加位移
        cha.compMoving = false;
        cha.move(0, 0);
        cha.diveDriving = false;

        cha.beginReceiveAction(action);

        Timer.start(`special_${cha.id}`);

        const state: HitState = {
            stroke: safeStroke,
            ballPos,
            recoveryDuration: 0,
            compensating: true,
            lastDist: Math.hypot(ballPos.x - cha.x, ballPos.z - cha.z),
            animName: action,
            receiveAction: action,
            receiveAngle: angle,
            reachBonus: action === "diving" ? this.divingReachBonus * 0.5 : 0,
            highBonus: action === "jumphit" ? this.jumpHighBonus : 0,
            lowRangeScale: this.jumpLowRangeScale,

            diveInputActive: false,
            diveInputAngle: angle,
            diveInputPower: 0,
            diveMaxDist: this.diveMaxDistance,
            diveTraveled: 0,
            lastUpdateMs: Timer.now(),

            autoComp: !!auto,
            pendExecId: null,
        };

        this._hitStates.set(cha, state);
        cha.playAnim(action, 0.05);

        if (action === "jumphit") {
            // 跳跃(用户规格): 按住不松一直起跳直到最大跳跃高度(y 轴 cha 跳跃系统积分),
            // 击球高度随高度变化; 松手立即在此高度击球停止上升开始下降(后摇按高度计)。
            // 移动照常只是移速减半(cha.jumpMoveSpeedScale), 无瞬移; 单手自动补偿照常
            cha.beginJump();
        } else {
            // 鱼跃(用户规格): 特殊击球没有瞬间移动, 只是移动最大速度变快(diveSpeedScale=2);
            // 玩家摇杆自由移动, 旧满冲程自动冲刺(diveInputActive+power=1 窜出感)已删
            cha.compMoving = false;
        }
    }

    /**
     * 特殊击球松手收尾兜底(用户规格: 松手击球走 control._releaseHit 标准链)——
     * 松手未触发击球(滑动不足 hitMinDistance, mag.hit 空参对 IDLE/MOVE return)时
     * 特殊姿态残留: 本方法立即收尾(diving 起身/jumphit 落地), 不出手。
     * 已进 WINDUP/RECOVERY(击球链进行中)不动——由 _executeHit/恢复分支收尾。
     */
    public endSpecial(cha: Cha): void {
        const state = this._hitStates.get(cha);
        if (cha.receiveAction === "none") return;
        if (cha.state !== ChaState.IDLE && cha.state !== ChaState.MOVE) return;
        if (state && state.pendExecId != null) return;  // 前摇挂起出手在途, 让它走完
        cha.beginReceiveAction("none");
        cha.compMoving = false;
        cha.diveDriving = false;
        cha.resetJump();
        cha.move(0, 0);
        cha.playAnim("stand", 0.05);
        Timer.clear(`special_${cha.id}`);
        if (state) this._hitStates.delete(cha);
    }

    /**
     * 玩家移动操作通知(badm.onMove / pvp 远端 move 重放):
     * jumphit → 终止单手自动追球(玩家自控, 移速仍减半);
     * diving  → 请改用 applyUserDive(只微调方向不正常移动)。
     */
    public notifyUserMove(cha: Cha): void {
        const state = this._hitStates.get(cha);
        if (!state || !state.autoComp) return;
        state.autoComp = false;
        // 跳跃自动补偿终止: 停补偿移动(玩家 move 接管), 保持当前动画
        if (state.receiveAction === "jumphit") {
            state.compensating = false;
            cha.compMoving = false;
        }
    }

    /**
     * 鱼跃期间玩家移动操作: 只微调冲刺方向(diveTurnSpeed 限速), 不产生正常移动;
     * 同时终止单手自动转向(玩家接管方向)。angle 为 move 本地角(摇杆语义)。
     */
    public applyUserDive(cha: Cha, angle: number): void {
        const state = this._hitStates.get(cha);
        if (!state || state.receiveAction !== "diving") return;
        state.autoComp = false;
        state.diveInputActive = true;
        state.diveInputAngle = this._moveToWorldAngle(cha, angle);
        // 玩家接管方向后保持满冲程(微调方向不缩距离)
        state.diveInputPower = 1;
    }

    /** move 本地角(cha.move 语义) → 世界系角(receiveAngle/diveInputAngle 语义) */
    private _moveToWorldAngle(cha: Cha, angle: number): number {
        const rad = angle * Math.PI / 180;
        const local = new Laya.Vector3(-Math.cos(rad), 0, Math.sin(rad));
        const world = new Laya.Vector3();
        Laya.Vector3.transformQuat(local, cha.root.transform.rotation, world);
        return (Math.atan2(world.z, world.x) * 180 / Math.PI + 360) % 360;
    }


    /**
     * 由 Control 在双击 hit 特殊模式下持续调用，驱动鱼跃方向/位移。
     */
    public applyDiveInput(active: boolean, angle: number, power: number): void {
        for (const [, state] of this._hitStates) {
            if (state.receiveAction !== "diving") continue;
            state.diveInputActive = active;
            if (active) {
                state.diveInputAngle = angle;
                state.diveInputPower = Math.max(0, Math.min(1, power));
            }
        }
    }

    private _updateHitStates(): void {
        for (const cha of this.players) {
            const state = this._hitStates.get(cha);

            // ---------- 位置补偿 ----------
            if (state?.compensating && state.ballPos) {
                const bp = state.ballPos;
                const distXZ = Math.hypot(cha.x - bp.x, cha.z - bp.z);
                const prevDist = state.lastDist;

                if (this._canHitBall(cha, bp, state) || distXZ > prevDist) {
                    cha.move(-1, 0);
                    cha.compMoving = false;
                    state.compensating = false;
                } else {
                    // 自动追球(单手自动补偿; 移速快慢由 cha 统一模型——diving 2 倍/jumphit 减半)
                    const dx = bp.x - cha.x;
                    const dz = bp.z - cha.z;
                    const worldDir = new Laya.Vector3(dx, 0, dz);
                    Laya.Vector3.normalize(worldDir, worldDir);

                    const invQuat = new Laya.Quaternion();
                    Laya.Quaternion.invert(cha.root.transform.rotation, invQuat);

                    const localDir = new Laya.Vector3();
                    Laya.Vector3.transformQuat(worldDir, invQuat, localDir);

                    const outAngle =
                        (Math.atan2(localDir.z, -localDir.x) * 180 / Math.PI + 360) % 360;

                    cha.move(outAngle, 1);
                }
                state.lastDist = distXZ;
            }

            // ---------- 特殊接球滞留(未进前摇) ----------
            // 连点+按住触发鱼跃/跳跃后 cha.state 仍 IDLE/MOVE(用户规格: 按住期间只进姿态)。
            // 击球操作逻辑完全沿用标准 hit 链(用户规格: 唯一改变的只是击球高度)——
            // 滞留期不出手(旧"球进范围立即出手"绕过前摇已删), 出手只经:
            // 滑动→WINDUP 前摇→松手/超时 _executeHit; 兜底: special_ 超时自动起身回 IDLE。
            // diving 期间移动 = 玩家摇杆自由移动 2 倍速(cha 统一移速模型, 无冲程冲刺)。
            if (state && state.receiveAction !== "none" &&
                (cha.state === ChaState.IDLE || cha.state === ChaState.MOVE)) {
                const curBallPos = new Laya.Vector3(this.ball.x, this.ball.y, this.ball.z);
                state.ballPos = curBallPos;

                // 鱼跃限距终止(用户规格: 达最大距离必须终止鱼跃): 冲程满起身收尾
                // (击球链在途 WINDUP 不拦——出手由标准链收尾)
                if (cha.isDiving && cha.diveDone) {
                    cha.beginReceiveAction("none");
                    cha.compMoving = false;
                    cha.diveDriving = false;
                    cha.move(0, 0);
                    cha.playAnim("stand", 0.05);
                    Timer.clear(`special_${cha.id}`);
                    this._hitStates.delete(cha);
                    continue;
                }

                if (Timer.invoke(`special_${cha.id}`) >= Mag.SPECIAL_IDLE_TIMEOUT) {
                    cha.beginReceiveAction("none");
                    cha.compMoving = false;
                    cha.diveDriving = false;
                    cha.resetJump();  // 超时起身兜底: 跳跃未出手的强制落地
                    cha.move(0, 0);
                    cha.playAnim("stand", 0.05);
                    Timer.clear(`special_${cha.id}`);
                    this._hitStates.delete(cha);
                }
                continue;
            }

            // ---------- 蓄力中 ----------
            if (cha.state === ChaState.HIT_WINDUP && state) {
                const curBallPos = new Laya.Vector3(
                    this.ball.x,
                    this.ball.y,
                    this.ball.z
                );
                state.ballPos = curBallPos;

                // 鱼跃期间移动 = 玩家摇杆 2 倍速自由移动(cha 统一移速模型), 无冲程冲刺

                // 动画选择
                let newAnim: string;
                if (state.receiveAction !== "none") {
                    newAnim = state.receiveAction;
                } else {
                    newAnim = this._selectStandardHitAnim(cha, curBallPos);
                }

                if (newAnim !== state.animName) {
                    state.animName = newAnim;
                    cha.unfreezeAnim();
                    cha.playAnim(newAnim, 0.05);
                }

                // 鱼跃中，球进入范围立即击球
                if (state.receiveAction === "diving" &&
                    this._canHitBall(cha, curBallPos, state)) {
                    this._executeHit(cha);
                    continue;
                }

                if (Timer.invoke(`windup_${cha.id}`) >= 2000) {
                    this._executeHit(cha);
                } else if (Timer.invoke(`windup_${cha.id}`) >= cha.upTime * 200) {
                    cha.freezeAnim();
                }
            }

            // ---------- 恢复 ----------
            if (cha.state === ChaState.HIT_RECOVERY) {
                const recTime = Timer.invoke(`recovery_${cha.id}`);
                if (state && recTime >= state.recoveryDuration) {
                    cha.state = ChaState.IDLE;
                    cha.compMoving = false;
                    cha.diveDriving = false;
                    cha.resetJump();  // 跳跃下降兜底落地(下降时长与后摇对齐, 通常已自然归零)
                    cha.beginReceiveAction("none");
                    cha.move(0, 0);
                    cha.playAnim("stand", 0.1);
                    this._hitStates.delete(cha);
                    // 后摇期排队的击球立即执行(排队不吞修复): 前摇挂起到冻结点自动出手,
                    // 已松手(released)则走 hit 空参释放链(挂满前摇后自动 _executeHit)
                    const pend = this._pendHit.get(cha);
                    if (pend) {
                        this._pendHit.delete(cha);
                        this._startWindup(pend.stroke, cha, pend.hitTime);
                        if (pend.released) this.hit(undefined, cha);
                    }
                }
            }

        }
    }


    private _executeHit(cha: Cha): void {
        const state = this._hitStates.get(cha);
        if (!state) return;

        // 清挂起的前摇延迟定时器(任何路径出手都作废挂起)
        if (state.pendExecId != null) {
            Timer.clear(state.pendExecId);
            state.pendExecId = null;
        }

        cha.isP = false;

        const bp = state.ballPos ?? new Laya.Vector3(
            this.ball.x,
            this.ball.y,
            this.ball.z
        );

        const hitOK = this._canHitBall(cha, bp, state);

        // 弹道由【击球参数 + 击球时刻】唯一决定, 与"本机是不是权威端"无关: 每个端都照同一组参数
        // 起算, 之后各自 simTo(现在) 必然得到同一个位置(时间驱动物理的意义)。
        // 权威端只管裁定规则(判罚/结算), 不负责"替两端算球"——以前非权威端不起弹道、
        // 靠每帧被权威快照拽, 才是"发球阶段两端差 60m"这类现象的根源。
        const simBall = hitOK;

        // 死球期(结算后分球前)允许击球(用户规格 v2): 出手照常(物理球可飞), 只是不判罚
        // 不记录——hit 事件被 rule COUNTDOWN 守卫拦(判罚字段不更新), 落地不结算(settle 仅
        // RALLYING), 不进鹰眼记录(仅 RALLYING 落地记录且没清不覆盖); SERVING 开始
        // _assignBall 掐灭残球钉回发球员手 → 新回合干净开始
        // 出手前击球权拦截(双打竞态, 2026-10-27): hit 事件判罚是"球已被打飞后判负"——
        // 竞态击球(队友先出手球已飞, 自己的释放晚到)会把球打向乱方向 + 判对面得分。
        // 前置拦截: 不出手不判罚, 球保持队友击球的合法轨迹 → 落地按真实击球方结算 ✓
        {
            const myTeam = this.teamMap.get(cha);
            if (hitOK && myTeam != null && this.phase === MatchPhase.RALLYING) {
                const sameTeamJustHit = this.mode === MatchMode.DOUBLE &&
                    this.currentHitTeam === myTeam && this.lastHitCha !== cha;
                const doubleHit = this.lastHitCha === cha;
                const wrongReceiver = this.mode === MatchMode.DOUBLE &&
                    this.isServeShot && this.currentReceiver !== cha;
                if (sameTeamJustHit || doubleHit || wrongReceiver) {
                    console.warn(`[Mag] 击球权拦截(不出手不判罚): cha=${cha.id} ` +
                        `${sameTeamJustHit ? '同队刚击球' : doubleHit ? '连击' : '发球首击非接球员'}`);
                    // 状态照常收尾(RECOVERY 走完), 但物理球不动
                } else if (simBall) {
                    // 时间驱动击球(用户规格): 远端重放带 hitTime(过去时刻) → ball.hitAt
                    // 回退球到击球时刻起算轨迹 + simTo 现在; 本地 hitTime=undefined=现在
                    (this.ball as any).hitAt(
                        state.stroke.power,
                        state.stroke.angH,
                        state.stroke.angV,
                        state.stroke.spi,
                        cha.id,
                        state.hitTime,
                        state.hitTime != null ? { x: bp.x, y: bp.y, z: bp.z } : undefined
                    );
                    this.onHit?.();
                }
            } else if (simBall) {
                (this.ball as any).hitAt(
                    state.stroke.power,
                    state.stroke.angH,
                    state.stroke.angV,
                    state.stroke.spi,
                    cha.id,
                    state.hitTime,
                    state.hitTime != null ? { x: bp.x, y: bp.y, z: bp.z } : undefined
                );
                this.onHit?.();
            }
        }

        console.log(
            `%c[Mag] HIT chaId=${cha.id}` +
            ` action=${state.receiveAction}` +
            ` anim=${state.animName}` +
            ` ball=(${bp.x.toFixed(2)},${bp.y.toFixed(2)},${bp.z.toFixed(2)})` +
            ` stroke=(power:${state.stroke.power.toFixed(1)},` +
            ` angH:${state.stroke.angH.toFixed(1)},angV:${state.stroke.angV.toFixed(1)})` +
            ` hit=${hitOK}`,
            hitOK ? "color:#00ff00;font-weight:bold" : "color:#ff4444;font-weight:bold"
        );
        // 失败必打判定细节(定位"不击球"维度: 距离/角度/高度/朝向 + 球位置), 一行锁定根因
        if (!hitOK && this._dbgHitCheck) {
            const d = this._dbgHitCheck;
            const failWhy =
                d.h < parseFloat(d.hBand.split("~")[0]) || d.h > parseFloat(d.hBand.split("~")[1]) ? "高度出带" :
                    d.distXZ > d.range ? "距离超range" :
                        d.absAngle > d.allowedAngle ? `角度超限(${d.isBack ? "背后" : "前向"}, 距离${d.distXZ.toFixed(2)}m非贴身)` : "?";
            console.warn(
                `[Mag] HIT判定细节 cha=${d.cha} ball=${d.ball}` +
                ` distXZ=${d.distXZ.toFixed(2)}/${d.range.toFixed(2)}` +
                ` 角度=${d.absAngle.toFixed(1)}°/${d.allowedAngle.toFixed(0)}°` +
                ` 高度=${d.h.toFixed(2)}/${d.hBand}` +
                ` → 失败原因: ${failWhy}`
            );
        }


        // jumphit 松手/超时兜底路径: 仍在上升则此刻停跳开始下降(在此高度击球);
        // 后摇根据跳跃高度计算时长(越高后摇越长, 用户规格)
        if (cha.receiveAction === "jumphit") {
            cha.endJump();
            state.recoveryDuration = cha.jumpRecoveryDur();
        } else {
            state.recoveryDuration = cha.upTime * 400;
        }

        Timer.clear(`windup_${cha.id}`);
        Timer.clear(`special_${cha.id}`);
        Timer.start(`recovery_${cha.id}`);

        cha.playAnim(state.animName, 0.05);
        cha.state = ChaState.HIT_RECOVERY;
        cha.compMoving = false;
        cha.diveDriving = false;
    }

    /**
     * 外部击球入口：
     * - IDLE/MOVE：开始前摇
     * - HIT_WINDUP：更新蓄力
     * - 未传 stroke：释放
     */
    /**
     * 后摇期击球排队(每角色): RECOVERY 中收到的击球意图存此, 后摇结束自动执行。
     * 【双打误判根因 2026-10-27】旧版 RECOVERY 静默 return 吞击球 → hit 事件不触发 →
     * currentHitTeam 保持旧值 → 球落地 settle 按旧击球方判罚 = "接球打过去了判球落几方场地"。
     * 高发场景: AI pending 到点时后摇未完 / PVP 双端后摇时轴差(jumphit 后摇按跳跃高度动态)。
     */
    private _pendHit: Map<Cha, { stroke: StrokeParams, released: boolean, hitTime?: number }> = new Map();

    /**
     * 外部击球入口：
     * - IDLE/MOVE：开始前摇
     * - HIT_WINDUP：更新蓄力
     * - 未传 stroke：释放
     * @param hitTime 击球时刻(时间驱动同步): 远端重放传消息内时刻, 出手时经 ball.hitAt
     *  把轨迹从过去时刻起算; 本地击球省略(出手时=现在)
     */
    public hit(stroke: StrokeParams | undefined, cha: Cha, hitTime?: number): void {
        const state = this._hitStates.get(cha);

        switch (cha.state) {
            case ChaState.IDLE:
            case ChaState.MOVE:
                if (!stroke) return;
                this._startWindup(stroke, cha, hitTime);
                break;

            case ChaState.HIT_WINDUP:
                if (stroke) {
                    if (state) {
                        state.stroke = stroke;
                        if (hitTime != null) state.hitTime = hitTime;
                    }
                } else {
                    // 松手: 蓄力不足前摇时长 → 挂到前摇结束(动画冻结点)自动出手; 已过前摇立即
                    const el = Timer.invoke(`windup_${cha.id}`);
                    const minW = cha.upTime * 300;
                    if (state && el < minW) {
                        if (state.pendExecId != null) return; // 已挂起(重复松手)
                        state.pendExecId = Timer.setTimeout(minW - el, () => {
                            state.pendExecId = null;
                            if (cha.state === ChaState.HIT_WINDUP) this._executeHit(cha);
                        });
                    } else {
                        this._executeHit(cha);
                    }
                }
                break;

            case ChaState.HIT_RECOVERY:
                // 后摇期击球排队不吞(用户操作/远端重放都有效): 带参覆盖存最新意图,
                // 空参标记已松手(后摇结束直接出手); 后摇结束由 _updateHitStates 恢复分支消费
                {
                    const pend = this._pendHit.get(cha);
                    if (stroke) {
                        this._pendHit.set(cha, { stroke, released: pend ? pend.released : false, hitTime });
                    } else if (pend) {
                        pend.released = true;
                    }
                }
                return;
        }
    }

    private _startWindup(stroke: StrokeParams, cha: Cha, hitTime?: number): void {
        const ballPos = new Laya.Vector3(
            this.ball.x,
            this.ball.y,
            this.ball.z
        );

        const animName = cha.receiveAction !== "none"
            ? cha.receiveAction
            : this._selectStandardHitAnim(cha, ballPos);

        Timer.start(`windup_${cha.id}`);

        const state: HitState = {
            stroke,
            hitTime,
            ballPos,
            recoveryDuration: 0,
            compensating: false,
            lastDist: Math.hypot(ballPos.x - cha.x, ballPos.z - cha.z),
            animName,
            receiveAction: cha.receiveAction,
            receiveAngle: 0,
            reachBonus: cha.receiveAction === "diving" ? this.divingReachBonus : 0,
            highBonus: cha.receiveAction === "jumphit" ? this.jumpHighBonus : 0,
            lowRangeScale: this.jumpLowRangeScale,

            diveInputActive: false,
            diveInputAngle: 0,
            diveInputPower: 0,
            diveMaxDist: this.diveMaxDistance,
            diveTraveled: 0,
            lastUpdateMs: Timer.now(),

            autoComp: false,
            pendExecId: null,
        };

        this._hitStates.set(cha, state);
        cha.playAnim(animName, 0.05);
        cha.state = ChaState.HIT_WINDUP;

        if (cha.receiveAction === "diving" || cha.receiveAction === "jumphit") {
            state.compensating = true;
            cha.compMoving = true;
        }
    }

    protected _onStateChanged(): void {
        this.onStateChange?.();
    }

    public getTeam(cha: Cha): TeamSide | undefined {
        return this.teamMap.get(cha);
    }

    public getTeamPlayers(team: TeamSide): Cha[] {
        return this.players.filter(p => this.teamMap.get(p) === team);
    }

    public isServer(cha: Cha): boolean {
        return cha === this.currentServer;
    }

    public isReceiver(cha: Cha): boolean {
        return cha === this.currentReceiver;
    }

    public checkServePosition(hitter: Cha): boolean {
        return this.rule.checkServePosition(hitter);
    }

    public getPlayerServePosition(cha: Cha): { x: number, y: number, z: number } {
        return this.rule.getPlayerServePosition(cha);
    }

    public getDisplayInfo(): {
        left: number,
        right: number,
        status: string,
        reason: string
    } {
        let status = "";
        let reason = "";

        if (this.phase === MatchPhase.COUNTDOWN) {
            if (!this.isBallAssigned) {
                status = "ready";
                reason = this.lastScoreReason || "请准备";
            } else {
                status = "serving";
            }
        } else if (this.phase === MatchPhase.SERVING) {
            status = "serving";
        }

        return {
            left: this.scores[TeamSide.LEFT],
            right: this.scores[TeamSide.RIGHT],
            status,
            reason
        };
    }
    /**
     * 为本地角色创建第三人称相机。
     * 相机直接挂在角色节点下，随角色一起移动/旋转，无需每帧更新。
     */
    private _createCamera(target: Cha): void {
        const cam = new Laya.Camera(0, 0.1, 200);
        cam.clearFlag = Laya.CameraClearFlags.Sky;
        cam.name = "LocalFollowCamera";

        // 挂到角色节点下
        target.root.addChild(cam);

        // 局部位置：角色后方 + 上方 + 横向偏移
        // Laya 里角色前方为 +Z，所以"后方"是 -Z
        cam.transform.localPosition = new Laya.Vector3(
            this.cameraSideOffset,
            this.cameraUpOffset,
            -this.cameraBackDist
        );

        // 角色相机配置，Laya Camera 默认朝 -Z 看；要看向角色前方（+Z），绕 Y 旋转 180°
        cam.transform.localRotationEuler = new Laya.Vector3(-15, 180, 0);

        this._camera = cam;
        this._cameraTarget = target;
    }
}