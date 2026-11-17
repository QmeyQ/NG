import { Cha } from "./badm/obj/cha";
import { Res } from "./libs/res/res";
import { AIControl, AIDifficulty } from "./badm/NPC/ai";
import { Control } from "./badm/sys/control";
import { UI } from "./ui/ui";
import { Ball } from "./badm/obj/ball";
import { Timer } from "./libs/time";
import { PVE } from "./badm/mag/pve";   // 新增
import { PVP } from "./badm/mag/pvp";   // 新增
import { MatchPhase, TeamSide } from "./badm/mag/mag";
import { Gnet } from "./libs/gobe/net";
import { QA } from "./libs/gobe/qa";
import { Au } from "./libs/au";
import { Cloud } from "./libs/server/cloud";
import { Social } from "./libs/server/social";
import { LocalMatch, MatchPlayer } from "./libs/server/localMatch";
import { SceneNav } from "./libs/nav";
import { Dialog } from "./ui/DIalog";
import { PhyCfg, State } from "./badm/engine/phyCfg";
import { ProgPID } from "./libs/MT";


const { regClass, property, Browser } = Laya;

@regClass()
export class NewScript extends Laya.Script {
    private skeleton: Laya.Spine2DRenderNode;
    private index: number = -1;

    @property(Laya.Sprite)
    public linyueru!: Laya.Sprite;
    /** 球网节点(场景静态引用; badm.ls 删节点后由 nor 包动态加载兜底) */
    @property(Laya.Sprite3D)
    public courtNet?: Laya.Sprite3D;
    /** 场地节点(同上) */
    @property(Laya.Sprite3D)
    public courtFloor?: Laya.Sprite3D;
    /** 羽毛球节点(同上) */
    @property(Laya.Sprite3D)
    public ball?: Laya.Sprite3D;
    @property(Laya.Sprite3D)
    public p1!: Laya.Sprite3D;
    @property(Laya.Sprite3D)
    public p2!: Laya.Sprite3D;
    @property(Laya.Sprite3D)
    public p3!: Laya.Sprite3D;
    @property(Laya.Sprite3D)
    public p4!: Laya.Sprite3D;
    @property(Laya.Camera)
    public camera!: Laya.Camera;

    private ballO: Ball;

    private ui: UI;
    private mag: PVP | PVE;                  // 基类引用，实际为子类实例
    private ctrl: Control;
    private localCha!: Cha;
    private isPvp: boolean = false;
    private isSingle: boolean = false;

    /** PID 预测进度(vers 探测/Brotli 解压无真值阶段外推, DP/DC/XP 真值锚入) */
    private _prog: ProgPID | null = null;
    private _progTid: any = null;
    private _progLastT = 0;

    /** 启动预测进度条: cap=阶段天花板, 帧环只写百分比(文案由事件驱动) */
    private _startProg(cap: number): void {
        this._stopProg();
        this._prog = new ProgPID();
        this._prog.cap(cap);
        this._progLastT = Timer.now();
        Res.on('XP', this._onXp);
        this._progTid = Timer.frameLoop(() => {
            if (!this._prog) return;
            const now = Timer.now();
            this._prog.tick(now - this._progLastT, now);
            this._progLastT = now;
            if(this.ui._progressBar.visible)
                this.ui.setProgress(undefined, this._prog.value * 100);
        });
    }

    private _stopProg(): void {
        if (this._progTid != null) { Timer.clear(this._progTid); this._progTid = null; }
        Res.off('XP', this._onXp);
        this._prog = null;
    }

    /** 解压真进度(Res 'XP'): nor 包下载/缓存恢复后的解压映射 [0.5,0.8] */
    private _onXp = (_pack: string, frac: number): void => {
        this._prog?.anchor(0.5 + frac * 0.3, Timer.now());
    };



    onStart(): void {
        QA.installGame(this);
        Laya.Config.useWebGL2 = false;
        this.ui = new UI();
        this.ctrl = new Control(Laya.stage);

        // 双手模式: menu 设置页 double 勾选=开(未配置=单手默认)
        // 双手: 击球时移动方向控制 angV, 滑动距离控制力度, 滑动方向控制 angH
        this.ctrl.sin = Laya.LocalStorage.getItem("double") !== "1";

        // 捕获场景 hit 控件作击球操作区域锚点(位置/大小即操作区); show 配置关闭时隐藏
        // 脚本挂在 Scene3D 上，hit 是 Scene2D 子节点(兄弟子树)，从 stage 根搜
        const hitCtl: any = UI.findNode(Laya.stage, "hit");
        if (hitCtl) {
            this.ctrl.add(hitCtl, "hit");
            hitCtl.visible = Laya.LocalStorage.getItem("hitShow") !== "0";
        }

        // 移动摇杆底座: badm.ls move 控件(anchor 0.5 中心)注入 cui, 显示/位置随按下点;
        // 无 move 控件退回程序化底圈
        const moveCtl: any = UI.findNode(Laya.stage, "move");
        if (moveCtl) {
            moveCtl.visible = false;
            this.ctrl.cui.setMoveBase(moveCtl);
        } else {
            console.warn("[badm] 未找到 move 控件, 移动摇杆使用程序化底圈");
        }

        // 鹰眼挑战触发: 双击任意区域走 Inp 事件队列(用户规格——统一双击判定,
        // 旧自维护 stage MOUSE_DOWN 320ms/60px 与 Inp 600ms/40px 两套阈值, 手机双击
        // 间隔常超 320ms → isDouble 恒 false = "从未正确进入"根因)
        this.ctrl.inp.on('dobclick', () => {
            // 回放中双击任意区域 = 提前退出鹰眼
            if (this.ballO.playing) { this._stopEagleEye(); return; }
            // 挑战窗口内双击任意区域 = 确认进入 5s 鹰眼挑战阶段(用户规格: 确认了就要增加
            // 这个阶段, 且对端一起进)——PVP 走 confirmEagle(转段+广播, 对端同进回放);
            // PVE 直接本地转段
            if (this._eagleWin) {
                this.mag.closeEagleWindow();
                if (this.isPvp) {
                    (this.mag as PVP).confirmEagle();
                } else {
                    (this.mag as any).rule.beginEagleChallenge?.();
                }
                this._startEagleEye();
            }
        });

        // 返回按钮(程序化, badm.ls 无 bButton 节点): 左上角, back 回 match 预制体复用
        const s2d: any = (Laya.stage.getChildByName("root") as any)?.getChildByName("Scene2D");
        if (s2d) {
            const bk = UI.findNode(s2d, "bButton").on(Laya.Event.CLICK, this, () => {
                Au.tap();
                SceneNav.back();
            });
        }

        // gList 玩家列表渲染(PVE: 玩家+人机; PVP: 房间所有玩家, 昵称/头像由进房时 customPlayerProperties 同步)
        this._renderPlayers();
        // 展板收起开关: 点击 txt(▲/▼) 收起/展开 gList 玩家列表展板
        this._setupBoardToggle();

        Res.init();
        // vers 探测无真值: PID 预测渐近 10%
        this._startProg(0.1);
        this.ui.setProgress("正在加载资源...");
        Res.net.on('DP', (key: string, percent: number, speed: number) => {
            // 网络下载真进度映射 [0.1,0.5]
            this._prog?.cap(0.5);
            this._prog?.anchor(0.1 + percent / 100 * 0.4, Timer.now());
            this.ui.setProgress(`下载资源:${speed}/s ${key}`);
        });
        Res.net.on('DE', (key: string, mes: string) => {
            console.error('error', key, mes);
            this._stopProg();
            this.ui.setProgress(`加载失败: ${key}`);
        });
        Res.net.on('DC', (key: string, blob: Blob, fromCache: boolean) => {
            console.log('complete', key, fromCache);
            // 整包到手(下载/缓存): 进入解压阶段, XP 真值映射 [0.5,0.8], 预测天花板 0.8
            this._prog?.anchor(0.5, Timer.now());
            this._prog?.cap(0.8);
            this.ui.setProgress("正在加载资源...");
        });
        Res.vers(Res.ResList.nor, (result) => {
            console.log("version：", result);
            // 探测完成: 本地恢复无 DP/DC 事件, 直接进解压阶段预测(XP 真值锚入)
            this._prog?.anchor(0.1, Timer.now());
            if (!result.needUpdate) this._prog?.cap(0.8);
            Res.url(Res.ResList.nor,
                result.needUpdate, (list) => {
                    console.log("资源加载：", list);
                    // court/ball 就绪(场景静态节点或 nor 包动态加载兜底)后再建球与角色
                    this._ensureCourtBall(async () => {
                        const scene3D = Laya.stage._scene3Ds && Laya.stage._scene3Ds[0];
                        if (!scene3D) {
                            console.error("[badm] 未找到 Scene3D，取消角色初始化");
                            this._stopProg();
                            this.ui.setProgress("场景初始化失败");
                            return;
                        }
                        if (!this.ball || (this.ball as any).destroyed) {
                            console.error("[badm] 羽毛球资源未就绪，取消角色初始化");
                            this._stopProg();
                            this.ui.setProgress("场地资源加载失败");
                            return;
                        }
                        this.ballO = new Ball(this.ball);

                        // 1) 先确定比赛模式和每个参赛槽位的模型分配。
                        const playerCount: number = (window as any).gamePlayerCount || 4;
                        this.isSingle = playerCount === 2;
                        this.isPvp = (window as any).gameMode === "pvp";
                        const roleModels = this._buildRoleModels();
                        const roleSlots = this.isSingle ? [0, 1] : [0, 1, 2, 3];
                        const requiredModelIds = Array.from(new Set(roleSlots.map(slot => Number(roleModels[slot]))));
                        if (requiredModelIds.some(id => id !== 0 && id !== 1)) {
                            console.error("[badm] roleModels 包含无效模型编号", roleModels);
                            this._stopProg();
                            this.ui.setProgress("角色分配数据无效");
                            return;
                        }

                        // 2) 只加载 roleModels 实际需要的模型模板；球拍和共用动画控制器是本局公共资源。
                        // 模板由 Res 缓存持有，永不加入场景；Mag 只接收模板并负责 clone 实例。
                        const modelPaths: { [modelId: number]: string } = {
                            0: "nor/girl1@0.lh",
                            1: "nor/boy@0.lh"
                        };
                        const resourceJobs: Promise<any>[] = [
                            Res.get("nor/racket@0.lh"),
                            Res.get("nor/ani.controller"),
                            ...requiredModelIds.map(modelId =>
                                Res.get(modelPaths[modelId]).then(node => ({ modelId, node }))
                            )
                        ];
                        let _racket: Laya.Sprite3D;
                        let _ctrl: Laya.AnimatorController;
                        const modelTemplates: { [modelId: number]: Laya.Sprite3D } = {};
                        try {
                            const loaded = await Promise.all(resourceJobs);
                            _racket = loaded[0] as Laya.Sprite3D;
                            _ctrl = loaded[1];
                            for (const item of loaded.slice(2) as any[]) {
                                modelTemplates[item.modelId] = item.node as Laya.Sprite3D;
                            }
                            if (!_racket || !(_ctrl instanceof Laya.AnimatorController) || !_ctrl.data.controllerLayers.length) {
                                throw new Error("球拍或 ani.controller 资源无效");
                            }
                            for (const modelId of requiredModelIds) {
                                const template = modelTemplates[modelId];
                                if (!template) throw new Error(`角色模型资源缺失: ${modelPaths[modelId]}`);
                                let anim = template.getComponent(Laya.Animator);
                                if (!anim) anim = template.addComponent(Laya.Animator);
                                anim.controller = _ctrl;
                            }
                        } catch (error) {
                            console.error("[badm] 角色资源加载/动画挂载失败", error);
                            this._stopProg();
                            this.ui.setProgress("角色资源加载失败");
                            return;
                        }

                        console.log(`[badm] 角色资源就绪: models=${requiredModelIds.join(",")}, roles=${roleModels.map((m, i) => `${i}:${m === 1 ? "boy" : "girl1"}`).join(" ")}`);
                        console.log(`[badm] 共用动画控制器已挂载: ${_ctrl.data.controllerLayers.length} 层`);
                        this._prog?.anchor(0.8, Timer.now());
                        this._prog?.cap(0.95);
                        this.ui.setProgress("初始化角色...");
                        console.log(`[NewScript] 模式: ${this.isSingle ? '单打' : '双打'}, isPvp=${this.isPvp}`);

                            // 3) 角色模板资源和动画均就绪后，Mag 按 roleModels 为每个参赛槽位 clone 一次。
                            // 模板不进场景，scene3D 由入口显式传递，不从模板 parent 反推。
                            this.ui.setProgress("创建参赛角色...");
                            try {
                                if (this.isPvp) {
                                    this.mag = new PVP(scene3D, this.ballO, this.isSingle, modelTemplates, _racket, roleModels);
                                } else {
                                    this.mag = new PVE(scene3D, this.ballO, this.isSingle, modelTemplates, _racket, roleModels);
                                }
                            } catch (error) {
                                console.error("[badm] 参赛角色实例化失败", error);
                                this._stopProg();
                                this.ui.setProgress("角色初始化失败");
                                return;
                            }
                            this.ui.setProgress("加载完成...", 100);
                            this.ui.setProgress();


                            // 绑定 UI 回调
                            this.mag.onCountdown = (count: number, redAt?: number) => {
                                this.ui.setCountdown(count, redAt);
                                // 倒计时音(用户规格: 专用音调不能用按钮音, 只在发球阶段最后 3 秒响):
                                // 准备阶段/鹰眼确认/挑战阶段都不响; final(最后 1 秒)高八度双哔收尾
                                if (this.mag && this.mag.phase === MatchPhase.SERVING
                                    && count >= 1 && count <= 3) {
                                    Au.cd(count === 1);
                                }
                                const info = this.mag.getDisplayInfo();
                                this.ui.setScore(info.left, info.right, info.status, info.reason);
                            };
                            this.mag.onScoreChanged = (l: number, r: number) => {
                                const info = this.mag.getDisplayInfo();
                                this.ui.setScore(info.left, info.right, info.status, info.reason);
                            };
                            // 局/场结束反馈: 旧版这两个回调没有任何接线, 权威端打完最后一分
                            // 阶段进入 ENDED 但界面毫无变化(联机客机也一样), 玩家只能自己发现"打完了"。
                            this.mag.onGameEnded = (winner: TeamSide) => {
                                const info = this.mag.getDisplayInfo();
                                this.ui.setScore(info.left, info.right, info.status, info.reason);
                                const mySide = this.localCha ? this.mag.teamMap.get(this.localCha) : undefined;
                                Dialog.toast(mySide === undefined ? "本局结束" : (winner === mySide ? "本局获胜" : "本局失利"), 2500);
                            };
                            this.mag.onMatchEnded = (winner: TeamSide) => {
                                const mySide = this.localCha ? this.mag.teamMap.get(this.localCha) : undefined;
                                this.ui.setCountdown(0);
                                Dialog.toast(mySide === undefined ? "比赛结束" : (winner === mySide ? "比赛结束：你赢了" : "比赛结束：你输了"), 4000);
                                // 战绩落库(社交排行前置): 每局一次, PVE/PVP 两端各自上报, 失败不阻塞
                                if (!this._scoreReported && mySide !== undefined) {
                                    this._scoreReported = true;
                                    Social.reportResult(winner === mySide, this.isPvp ? "pvp" : "pve");
                                    // 对局详情仅存本地(不经过服务器), 供个人页战绩列表/详情
                                    try {
                                        const info = this.mag.getDisplayInfo();
                                        const players: MatchPlayer[] = [];
                                        const me = Cloud.getUser();
                                        for (const cha of this.mag.players) {
                                            const side = this.mag.teamMap.get(cha);
                                            if (side === undefined) continue;
                                            const isSelf = cha === this.localCha;
                                            let uid: string | undefined;
                                            if (isSelf) uid = me ? me.userid : undefined;
                                            else if (this.isPvp && typeof (this.mag as any)._pidForCha === "function") uid = String((this.mag as any)._pidForCha(cha.id) || "") || undefined;
                                            const prof = uid ? Social.profile(uid) : null;
                                            players.push({ userid: uid, name: isSelf ? (me ? me.name : "我") : (prof ? prof.name : (this.isPvp ? "玩家" + String(uid || cha.id).slice(-4) : "AI")), head: prof ? prof.head : (isSelf && me ? me.head : undefined), side: side as number, self: isSelf });
                                        }
                                        LocalMatch.save({ id: Date.now() + ":" + Math.random().toString(36).slice(2, 8), ts: Date.now(), mode: this.isPvp ? "pvp" : "pve", win: winner === mySide, score: [info.left || 0, info.right || 0], players: players });
                                    } catch (e) { console.warn("[badm] 本地对局详情保存失败:", e); }
                                }
                            };
                            // 联机无法继续(对端离开/房间解散/进场景后始终拿不到房间玩家表):
                            // 明确告诉玩家这局不是联机, 否则会各自打完一整局才发现比分对不上
                            this.mag.onPeerLeft = () => {
                                if (this._peerGone) return;
                                this._peerGone = true;
                                this.ui.setCountdown(0);
                                Dialog.toast("联机已断开，本局结束", 3000);
                            };


                            // 鹰眼挑战窗口(rule 结算后 3s): 开=显示"双击进入鹰眼挑战 N"倒计时提示
                            // + 双击任意区域直进回放(不弹框); 关(3s 超时/进入回放/回合重置)=清提示
                            // PVP 非权威端窗口由权威端 state eagleWin 同步驱动(applyState→rule)
                            this.mag.onEagleChallengeWindow = (open: boolean) => {
                                this._eagleWin = open;
                                if (open) {
                                    this._startEagleWinTip();
                                } else {
                                    this._stopEagleTip();
                                }
                            };
                            // 鹰眼记录与回放都在 Ball 内部(轨迹本来就是球自己的历史), 场景只留三件事:
                            // 1) 什么时候算"正式回合"——球不认识比赛阶段, 由这里给门控;
                            // 2) 新回合发球阶段清记录; 3) 回放每帧把相机对准球。
                            this.ballO.trackGate = () => !!this.mag && this.mag.phase === MatchPhase.RALLYING;
                            this.ballO.on('playbackEnd', () => this._stopEagleEye());
                            this.mag.onServeStart = () => this.ballO.clearTrack();
                            // 鹰眼远端确认(PVP): 对端确认进入挑战阶段 → 本地同进回放
                            // (用户规格: 一个玩家确认了另一个玩家一起进)
                            if (this.isPvp) {
                                (this.mag as any).onEagleRemoteConfirm = () => {
                                    if (!this.ballO.playing) this._startEagleEye();
                                };
                            }

                            // 如果是 PVP 模式，进行网络绑定
                            if (this.isPvp) {
                                this.localCha = (this.mag as PVP).setup();
                                // 相机挂本地角色(用户规格): setup 分配 localCha 后挂载——
                                // 旧版 mag 构造时硬编码 players[0], B 端相机跟对方角色 = "挂错角色"根因
                                this.mag.attachCamera(this.localCha);
                            } else {
                                // PVE 模式：本地玩家为第一个角色，其余角色挂 AI
                                this.localCha = this.mag.players[0];
                                (this.mag as PVE).setLocalCha(this.localCha);
                                (this.mag as PVE).setupDefaultAI(this.ballO);
                            }

                            this.ui.setProgress();

                            // 显示玩家信息
                            this._setupPlayerInfo();

                            // 关闭非本地相机
                            this._disableNonLocalCameras();

                            // 天空盒挂载(用户规格): nor/sky.lmat 全景天空 → Scene3D.skyRenderer
                            // (SkyPanoramic 材质经 Res._buildMaterial 构造: type 别名/panoramicTexture
                            //  映射/顶层 u_TintColor·u_Exposure·u_Rotation 散属性; SkyDome 单例网格)
                            Res.get("nor/sky.lmat", (skyMat: any) => {
                                const scene3d: any = (Laya.stage as any)._scene3Ds && (Laya.stage as any)._scene3Ds[0];
                                if (!skyMat || !scene3d || !scene3d.skyRenderer) {
                                    console.warn('[badm] 天空盒挂载跳过: mat=' + !!skyMat + ' scene3d=' + !!scene3d);
                                    return;
                                }
                                scene3d.skyRenderer.mesh = Laya.SkyDome.instance;
                                scene3d.skyRenderer.material = skyMat;
                                console.log('[badm] 天空盒已挂载: nor/sky.lmat(SkyPanoramic)');
                            });

                            // 开始比赛
                            this.mag.startMatch();

                            this.ui.setScore();

                            // ----- 控制回调 -----
                            this.ctrl.onMove = (angH: number, power: number) => {
                                // 仅当 PVP 且为权威端时发送操作（或所有客户端发送，由 PVP_Mag 内部过滤）
                                if (this.isPvp) {
                                    (this.mag as PVP).syncAction({ type: 'move', angH, power });
                                }
                                // 特殊击球期间玩家移动照常(用户规格: 只有移速快慢无瞬移,
                                // diving 2 倍/jumphit 减半由 cha 统一移速模型) + 终止单手自动补偿
                                this.mag.notifyUserMove(this.localCha);
                                this.localCha.move(angH, power);
                            };
                            this.ctrl.onHit = (params?: any, spi?: Laya.Vector3) => {
                                if (params) {
                                    // angH 本地视角角(0=角色正前=朝对方, 90=视觉右) → 世界系角(phy.hit 语义)。
                                    // 击球与移动共享 root.rotation 变换(cha.move 同款), 方向感必然一致;
                                    // 换边后朝向由 _forceTeleportAll→_alignAllFacing 重对齐, 无需 side 翻转
                                    params.angH = this._localAngToWorld(params.angH);
                                    const ballPos = this.ballO.pos;
                                    const cha = this.localCha;
                                    const distXZ = Math.sqrt((ballPos.x - cha.x) ** 2 + (ballPos.z - cha.z) ** 2);
                                    const heightDiff = ballPos.y - cha.y;
                                    let power = params.power;
                                    if (heightDiff > 1.2 && distXZ < cha.hitRange * 1.2) {
                                        power = Math.min(power, cha.power);
                                    } else if (distXZ > cha.hitRange * 0.8 && distXZ <= cha.hitRange) {
                                        power = Math.min(power, cha.power);
                                    }
                                    params.power = Math.max(3, power);
                                    this.ui.setHitIndicator(true, params.power);
                                } else {
                                    this.ui.setHitIndicator(false);
                                }
                                if (this.isPvp) {
                                    (this.mag as PVP).syncAction({ type: 'hit', params });
                                }
                                // 新回合: 鹰眼挑战窗口关(若在回放中先退出)
                                if (this.ballO.playing) this._stopEagleEye();
                                this.mag.hit(params, this.localCha);
                            };

                            // 连点+按住 hit → 特殊击球(用户规格): hit 基础操作链不变(按下/滑动/松手
                            // 照常走 _startHit/_updateHit/_releaseHit 击球), 仅绘制箭头切特殊样式;
                            // 姿态(diving/jumphit 移速快慢+起跳)由 onSpecialHit(true) 进入,
                            // 松手击球走标准链, false 仅做未出手时的姿态收尾兜底
                            this.ctrl.onSpecialHit = (active: boolean, angle: number) => {
                                if (!this.mag || !this.localCha) return;
                                if (!active) {
                                    // 松手收尾兜底: 滑动不足未击球时清特殊姿态(已出手则由恢复分支收尾)
                                    this.mag.endSpecial(this.localCha);
                                    return;
                                }
                                // 鹰眼窗口/回放中: hit 双击让位 stage 级监听(进鹰眼/退出), 不走特殊接球
                                if (this.ballO.playing) {
                                    this.ctrl.setSpecialHit(false);
                                    return;
                                }
                                // 摇杆数学角(0=右 90=上) → 本地视角角(0=正前 90=视觉右) → 世界系角
                                let angH = (90 - angle + 360) % 360;
                                angH = this._localAngToWorld(angH);
                                // 单手模式开启自动补偿(jump 追球/dive 转向), 玩家移动即终止
                                this.mag.startSpecialReceive(this.localCha, angH, this.ctrl.sin);
                            };

                            this.ballO.on('hit', () => {
                                // 计算音量（0~100），距离越近音量越大。
                                // 球/角色在物理回滚或节点销毁边界可能暂时出现非有限坐标；
                                // Vector3.distance 此时会返回 NaN，Math.min/max 不会自动修复 NaN。
                                try {
                                    const distance = Laya.Vector3.distance(this.ballO.pos, this.localCha.pos);
                                    if (!Number.isFinite(distance)) {
                                        console.warn("[badm] 跳过击球音效：球或角色距离不是有限数值", {
                                            ball: this.ballO?.pos, cha: this.localCha?.pos
                                        });
                                        return;
                                    }
                                    const vol = Math.max(0, Math.min(100, (10 - distance) * 10));
                                    Au.play("hit", vol);
                                } catch (e) {
                                    // 音效是表现层，不能让音频异常中断击球/同步事件链。
                                    console.warn("[badm] 击球音效播放失败，已忽略", e);
                                }
                            });


                            // LC=剩余件数(首次 emit 为总数): 真实完成比映射到角色阶段 [80,100]
                            let lcTotal = 0;
                            this.localCha.on("load", (LC: number) => {
                                console.log("资源加载：", LC)
                                if (LC > lcTotal) lcTotal = LC;
                                if (LC <= 0) {
                                    this.ui.setProgress();
                                    return;
                                }
                                const frac = lcTotal > 0 ? Math.min(1, (lcTotal - LC) / lcTotal) : 0;
                                this.ui.setProgress("加载角色：" + LC, 80 + frac * 20);
                            })
                    });  // _ensureCourtBall: 角色模板按 roleModels 加载完毕后进入比赛初始化
                })
        })

    }

    /**
     * court/ball 就绪通道: 一律从 nor 包预制体(court.lh/ball.lh)加载, 挂 Scene3D 下 (0,0,0)。
     * 场景静态占位节点(badm.ls 遗留 ball)先摘除; Res 缓存实例若已随上局场景销毁则清缓存重载(尸体自愈)。
     */
    private _ensureCourtBall(done: () => void): void {
        const scene3D: any = Laya.stage._scene3Ds && Laya.stage._scene3Ds[0];
        if (!scene3D) { console.error("[badm] 未找到 3D 场景, court/ball 无法挂载"); done(); return; }

        // 场景静态占位节点弃用: 摘除后统一走预制体动态加载
        if (this.ball) { this.ball.removeSelf(); this.ball = undefined; }
        this.courtFloor = undefined;
        this.courtNet = undefined;

        const load = (url: string, cb: (node: any) => void): void => {
            Res.get(url, (node: any) => {
                if (node && node.destroyed) { Res.clear(url); Res.get(url, cb); return; }
                cb(node || null);
            });
        };

        let pending = 0;
        const one = () => { if (--pending <= 0) done(); };

        pending++;
        load("nor/court@0.lh", (court: any) => {
            if (!court) { console.error("[badm] 场地加载失败: nor/court@0.lh"); one(); return; }
            scene3D.addChild(court);
            court.transform.position = new Laya.Vector3(0, 0, 0);

            this.courtFloor = UI.findNode(court, "floor") as Laya.Sprite3D;
            this.courtNet = UI.findNode(court, "net") as Laya.Sprite3D;
            this._setNetTransparent(this.courtNet);
            one();
        });

        pending++;
        load("nor/ball@0.lh", (ball: any) => {
            if (!ball) { console.error("[badm] 球加载失败: nor/ball@0.lh"); one(); return; }
            scene3D.addChild(ball);
            //ball.transform.position = new Laya.Vector3(0, 0, 0);

            this.ball = ball//UI.findNode(ball, "Shuttlecock.001") || ball;
            one();
        });
    }

    /** 3D 节点补 mesh/材质已由 Res 占位符机制接管(_lhPlaceholders + _applyNode3DRes), 此处无需手工映射 */

    /** 球网材质透明双面渲染(静态/动态两路统一; 材质是 Res 缓存单例, 幂等重设无害) */
    /**
     * 本地视角角 → 世界系角(phy.hit 语义 0=+z / 90=+x):
     * 本地向量 (−sin a, 0, cos a)(a=0 本地+z 正前, 90 本地−x 视觉右——cha.move 同约定)
     * 经 root.rotation 变换后 atan2(x,z) 取世界角。换边由朝向重对齐自然吸收。
     */
    private _localAngToWorld(a: number): number {
        const rad = a * Math.PI / 180;
        const local = new Laya.Vector3(-Math.sin(rad), 0, Math.cos(rad));
        const world = new Laya.Vector3();
        Laya.Vector3.transformQuat(local, this.localCha.root.transform.rotation, world);
        return (Math.atan2(world.x, world.z) * 180 / Math.PI + 360) % 360;
    }

    private _setNetTransparent(node?: Laya.Sprite3D): void {
        if (!node) return;
        const renderer = node.getComponent(Laya.MeshRenderer);
        if (!renderer) return;
        const materials = renderer.materials;
        if (!materials || materials.length === 0) return;
        for (const mat of materials) {
            if (mat) {
                mat.cull = Laya.CullMode.Off;
                mat.materialRenderMode = Laya.MaterialRenderMode.RENDERMODE_TRANSPARENT;
            }
        }
    }

    // ============================================================
    // 鹰眼挑战(落地结算后 3s 窗口内双击触发, 回放最长 5s)
    // 记录与回放都在 Ball 里(轨迹本来就是球自己的历史), 这里只剩"换相机 + 写文案 + 通知规则收尾"
    // ============================================================

    /** 挑战窗口开(rule 结算后 3s; 双击直进回放) */
    private _eagleWin = false;
    /** 联机对端已离场(只提示一次) */
    private _peerGone = false;
    /** 本局战绩已上报(每局一次; 服务端 30s 冷却兜底防刷) */
    private _scoreReported = false;
    /** 窗口提示刷新定时器(每秒 3→2→1) */
    private _eagleTipTid: string | null = null;
    /** 鹰眼临时相机 + 被让位的原相机(退出时按原样恢复) */
    private _eagleCam: Laya.Camera | null = null;
    private _eagleCamsOff: Laya.Camera[] = [];

    /** 窗口期提示: "双击进入鹰眼挑战 N" 每秒递减(3→2→1), 窗口关闭时清
     *  (倒计时音只在发球阶段末 3 秒响, 此处不播——用户规格) */
    private _startEagleWinTip(): void {
        this._stopEagleTip();
        let sec = 3;
        this.ui.setEagleTip(`双击进入鹰眼挑战 ${sec}`);
        this._eagleTipTid = Timer.setInterval(1000, () => {
            sec--;
            if (sec <= 0) { this._stopEagleTip(); return; }
            this.ui.setEagleTip(`双击进入鹰眼挑战 ${sec}`);
        });
    }

    /** 清窗口提示(窗口关/进入回放时; 回放期文案由 _startEagleEye 写一次"鹰眼挑战中") */
    private _stopEagleTip(): void {
        if (this._eagleTipTid != null) { Timer.clear(this._eagleTipTid); this._eagleTipTid = null; }
        this.ui.setEagleTip(null);
    }

    /**
     * 进入鹰眼回放: 球位/轨迹线由 Ball 播记录(Ball 不再 predict 重演——重演时长不稳,
     * 存储记录时长精确), 这里只负责机位与文案。
     * 本机没记录时 pvp 已把对端记录灌进 ball; 两端都没有记录就只挂文案, 阶段照旧走完——
     * 旧版这里直接 return 且不写字, 表现就是"一个人进了鹰眼, 另一端什么都没发生"。
     */
    private _startEagleEye(): void {
        if (!this.ballO) return;
        // 一确认进挑战, "双击进入鹰眼挑战 N"这类确认期文字就必须立刻消失(用户规格: 只显示鹰眼挑战中)
        this._stopEagleTip();
        if (!this.ballO.hasTrack() || !this._setupEagleCamera() || !this.ballO.startPlayback()) {
            if (!this.ballO.hasTrack()) console.warn('[badm] 鹰眼无可用轨迹(本机与对端记录都缺), 跳过回放');
            this._restoreEagleCamera();
            this.ui.setEagleTip("鹰眼挑战中");
            return;
        }
        this.ballO.onPlaybackPose = (x: number, y: number, z: number) => this._eagleLookAt(x, y, z);
        this.ui.setEagleTip("鹰眼挑战中");
    }

    /** 换鹰眼机位: 原相机(左右分屏)全关, 按轨迹整体形态定一个固定机位。成功返回 true */
    private _setupEagleCamera(): boolean {
        const pts = this.ballO.trackPts;
        const scene3d: any = UI.findNode(this.owner, "Scene3D");
        if (!pts || !pts.length || !scene3d) return false;
        this._eagleCamsOff = [];
        for (const c of scene3d._children || []) {
            if (c instanceof Laya.Camera && c.active) { c.active = false; this._eagleCamsOff.push(c); }
        }
        const cam = new Laya.Camera();
        cam.clearFlag = Laya.CameraClearFlags.Sky;
        // 固定机位(用户规格"视角不要乱晃"): 首尾中点 + 垂直于轨迹走向的侧向偏移 3.5m + 抬高 2.2m
        // (电视转播机位)。回放期间位置不动, 只 lookAt 转动跟随球——旧版每帧沿速度反向偏移,
        // 球一弹跳/转折相机就跟着甩, 那才是"乱晃"根因。
        const a = pts[0].pos, b = pts[pts.length - 1].pos;
        const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
        let dx = b.x - a.x, dz = b.z - a.z;
        const dl = Math.hypot(dx, dz);
        if (dl < 1e-4) { dx = 0; dz = 1; } else { dx /= dl; dz /= dl; }
        cam.transform.position = new Laya.Vector3(mx - dz * 3.5, 2.2, mz + dx);
        cam.transform.lookAt(new Laya.Vector3(mx, 0.5, mz), new Laya.Vector3(0, 1, 0));
        scene3d.addChild(cam);
        this._eagleCam = cam;
        return true;
    }

    /** 回放每帧(Ball 给的球位): 机位不动, 只让镜头转向球 */
    private _eagleLookAt(x: number, y: number, z: number): void {
        if (!this._eagleCam) return;
        this._eagleCam.transform.lookAt(new Laya.Vector3(x, y, z), new Laya.Vector3(0, 1, 0));
    }

    /** 恢复原相机、销毁鹰眼临时相机(幂等) */
    private _restoreEagleCamera(): void {
        for (const c of this._eagleCamsOff) c.active = true;
        this._eagleCamsOff = [];
        if (this._eagleCam) { this._eagleCam.removeSelf(); this._eagleCam.destroy(); this._eagleCam = null; }
    }

    /** 退出鹰眼: 停回放(球自己还原位置与轨迹线)+ 恢复相机 + 结束确认阶段。幂等 */
    private _stopEagleEye(): void {
        if (this.ballO) {
            this.ballO.onPlaybackPose = null;
            this.ballO.stopPlayback();
        }
        this._restoreEagleCamera();
        if (this.mag) {
            // 回放结束 → 结束鹰眼确认阶段(用户规格: 阶段化计时; 超时路径由 rule._updateEagleConfirm 自转)
            try { this.mag.rule.endEagleConfirm(); } catch (e) { }
        }
    }

    onUpdate(): void {
        if (this.mag) this.mag.update();
        if (this.ctrl) this.ctrl.update();
        // 注意：我们移除了帧同步发送，因为 PVP_Mag 自己处理同步
    }


    private _disableCamerasInNode(node: Laya.Sprite3D): void {
        const cam = node.getChild("Camera") as Laya.Camera;
        if (cam) cam.active = false;
        for (let i = 0; i < node.numChildren; i++) {
            this._disableCamerasInNode(node.getChildAt(i) as Laya.Sprite3D);
        }
    }

    private _disableNonLocalCameras(): void {
        for (const cha of this.mag.players) {
            if (cha === this.localCha) continue;
            this._disableCamerasInNode(cha.root as Laya.Sprite3D);
            console.log(`[NewScript] 已关闭角色 ${cha.id} 的相机`);
        }
    }

    private _setupPlayerInfo(): void {
        let leftId = 'Player', rightId = 'AI';
        if (this.isPvp) {
            const assignments: { playerId: string, roleId: number }[] = (window as any).gamePlayerAssignments || [];
            for (const a of assignments) {
                if (a.roleId <= 1) leftId = a.playerId;
                else rightId = a.playerId;
            }
        }
        // 显示用户id(用户规格: 云函数数据库的用户id, 非房间id/GOBE服务器playerId):
        // 自己 = 本地 Cloud userid; 对手 = 进房 customPlayerProperties.userid 透传
        // (GOBE 通讯路由体系是服务器 playerId, 用户id只作显示/业务身份)
        const cu = Cloud.getUser();
        const myUserId = (cu && cu.userid) || '';
        const norm = (s: any) => String(s == null ? '' : s).trim();
        const myPid = Gnet.getCurrentPlayerId();
        const useridOf = (pid: string): string => {
            const p = (Gnet.getPlayers() || []).find((x: any) => norm(x.playerId) === norm(pid));
            if (!p) return '';
            try {
                const props = typeof p.customPlayerProperties === 'string' ? JSON.parse(p.customPlayerProperties) : p.customPlayerProperties;
                return (props && props.userid) || '';
            } catch (e) { return ''; }
        };
        // 对手: 协商表里排除自己的对方(GOBE playerId 体系) → 解析其 props.userid
        const others = ((window as any).gamePlayerAssignments || [])
            .map((a: any) => a.playerId)
            .filter((pid: any) => norm(pid) !== norm(myPid));
        let oppUserId = '';
        for (const pid of others) { oppUserId = useridOf(pid); if (oppUserId) break; }
        if (!oppUserId) {
            for (const p of (Gnet.getPlayers() || [])) {
                if (norm(p.playerId) !== norm(myPid)) { oppUserId = useridOf(p.playerId); if (oppUserId) break; }
            }
        }
        if (!oppUserId) {
            // userid 都取不到时降级显示 GOBE playerId
            const players = Gnet.getPlayers() || [];
            const opp = players.find((p: any) => norm(p.playerId) !== norm(myPid));
            oppUserId = opp ? String(opp.playerId) : (rightId !== 'AI' ? rightId : leftId);
        }
        console.log(`[NewScript] 我的用户id: ${myUserId || myPid}, 对手用户id: ${oppUserId}, 房间玩家(GOBE playerId): ${(Gnet.getPlayers() || []).map((p: any) => p.playerId).join(', ')}`);
        this.ui.setPlayerInfo(myUserId || leftId, oppUserId);
    }

    /** 取某房间玩家的 customPlayerProperties(昵称/头像等; 解析失败按空) */
    private _propsOf(pid: string): any {
        const players: any[] = Gnet.getPlayers() || [];
        const p = players.find((x: any) => String(x.playerId).trim() === String(pid).trim());
        if (!p) return null;
        try {
            return typeof p.customPlayerProperties === "string"
                ? JSON.parse(p.customPlayerProperties)
                : (p.customPlayerProperties || null);
        } catch (e) { return null; }
    }

    /**
     * 每个 roleId 的角色模型(0=girl1, 1=boy)。唯一事实来源 = 该角色自己的头像。
     * PVP: 分配表 + 房间 props(head) 双端同源 → 同一 roleId 必得同一模型；不能用本机头像
     *      推导（否则角色 0 在两端各显一套模型）。空头像=未选头像, 按默认头像(headKey 回落的
     *      包内首张, 新 4 头像包即 head/0→girl1)决定模型, 不再按 roleId 奇偶另造——头像与模型同源。
     * PVE: role 0 用本机头像; 人机的展示头像由 _pveRoleHead 显式配对交替模型。
     */
    private _buildRoleModels(): number[] {
        const out: number[] = [];
        const heads: string[] = [];
        const isPvp = (window as any).gameMode === "pvp";
        if (!isPvp) {
            for (let i = 0; i < 4; i++) {
                heads[i] = this._pveRoleHead(i);
                out[i] = Res.headModel(heads[i]);
            }
        } else {
            const assignments: { playerId: string, roleId: number }[] = (window as any).gamePlayerAssignments || [];
            const players: any[] = Gnet.getPlayers() || [];
            const list = assignments.length > 0
                ? assignments
                : players.map((p: any, i: number) => ({ playerId: p.playerId, roleId: i }));
            for (const a of list) {
                const roleId = Number(a.roleId);
                if (!Number.isInteger(roleId) || roleId < 0 || roleId >= 4) continue;
                const props = this._propsOf(String(a.playerId));
                heads[roleId] = props && props.head ? String(props.head) : "";
                out[roleId] = Res.headModel(heads[roleId]);
            }
        }
        // 角色分配表偶发缺项时统一回落 girl1；所有客户端对同一缺失 roleId 得到相同结果。
        for (let roleId = 0; roleId < 4; roleId++) {
            if (out[roleId] !== 0 && out[roleId] !== 1) out[roleId] = 0;
        }
        // 头像与模型必须成对：这行直接暴露"头像全 girl、模型却 boy"的错配
        console.log(`[badm] 角色头像映射: ${out.map((m, i) => `${i}:${Res.headKey(heads[i])}→${m === 1 ? 'boy' : 'girl1'}`).join(', ')}`);
        return out;
    }

    /**
     * PVE 每个 roleId 的展示头像(唯一口径): role 0 = 本机云端头像; 人机角色给与交替模型
     * 配对的头像(Res.headForModel 从当前包反查, 兼容新 4 头像包与旧 30 头像包)。
     * 列表头像与 3D 模型都从这里来, 避免"头像全一样、场上模型却不一样"。
     */
    private _pveRoleHead(roleId: number): string {
        const cu = Cloud.getUser();
        const localHead = (cu && cu.head) || "";
        if (roleId === 0) return localHead;
        const m = Res.headModel(localHead);
        return Res.headForModel(roleId % 2 === 0 ? m : 1 - m);
    }

    /**
     * 构建玩家列表数据。
     * PVP: 房间所有玩家(gamePlayerAssignments 的 roleId 排序, customPlayerProperties 取昵称/头像);
     * PVE: 本地玩家(Cloud 用户数据) + 人机。
     * 队伍按 roleId: 单打 0=红方 1=蓝方; 双打 0/1=红方 2/3=蓝方(与 Mag.teamMap 一致)。
     */
    /** 点击对局头像 → 直接发好友申请(身价是个人设置, 不在申请时支付金币) */
    private onHeadClick(info: any): void {
        Social.request(String(info.id), (ok: boolean) => {
            Dialog.toast(ok ? "好友申请已发送" : (Social.lastMsg || "申请失败"));
        });
    }

    private _buildPlayerInfos(): any[] {
        const playerCount: number = (window as any).gamePlayerCount || 4;
        const isSingle = playerCount === 2;
        const isPvp = (window as any).gameMode === "pvp";
        const redCount = isSingle ? 1 : 2;
        const infos: any[] = [];

        if (isPvp) {
            const assignments: { playerId: string, roleId: number }[] = (window as any).gamePlayerAssignments || [];
            const players: any[] = Gnet.getPlayers();
            const propsOf = (pid: string): any => this._propsOf(pid);
            // roleId 协商表(洗牌后乱序)按 roleId 升序 = 红方在前; 空表回退 room players 顺序
            const sorted = assignments.length > 0
                ? assignments.slice().sort((a: any, b: any) => a.roleId - b.roleId)
                : players.map((p: any, i: number) => ({ playerId: p.playerId, roleId: i }));
            for (const a of sorted) {
                if (a.roleId >= playerCount) continue;
                const props = propsOf(a.playerId);
                infos.push({
                    name: (props && props.playerName) || ("玩家" + String(a.playerId).slice(-4)),
                    // 用户id(用户规格: 云数据库 userid, 进房经 props.userid 透传)——
                    // a.playerId 是 GOBE 服务器分配的房间玩家id(11207..体系), 严禁直接显示
                    id: (props && props.userid) || "",
                    head: (props && props.head) || "",
                    team: a.roleId < redCount ? "红方" : "蓝方"
                });
            }
        } else {
            const cu = Cloud.getUser();
            infos.push({
                name: (cu && cu.name) || "玩家",
                id: (cu && cu.userid) || "",
                head: (cu && cu.head) || "",
                team: "红方"
            });
            const aiCount = playerCount - 1;
            for (let i = 1; i <= aiCount; i++) {
                infos.push({
                    name: "人机" + i,
                    id: "AI" + i,
                    head: this._pveRoleHead(i),
                    team: i < redCount ? "红方" : "蓝方"
                });
            }
        }
        return infos;
    }

    /**
     * 渲染 gList 玩家列表(itemTemplate 标准通道: itemRenderer + numItems)。
     * item 子节点: img(头像) + n(昵称) + id(id) + id_1(队伍)。
     * 头像异步加载用 __head 标记防池化复用错位。
     */
    private _renderPlayers(): void {
        // 限定当前场景 Scene2D 内搜(dialog.lh 头像弹窗也有 gList, stage 全局搜会被劫持)
        const root: any = Laya.stage.getChildByName("root");
        const scene2d: any = root ? root.getChildByName("Scene2D") : null;
        const gList: any = scene2d ? UI.findNode(scene2d, "gList") : null;
        if (!gList) return;
        const infos = this._buildPlayerInfos();
        if (!infos.length) return;

        gList.itemRenderer = (index: number, item: any) => {
            const info = infos[index];
            if (!info) return;
            item.data = info;

            const nT: any = UI.findNode(item, "n");
            const idT: any = UI.findNode(item, "id");
            const teamT: any = UI.findNode(item, "id_1");
            if (nT) nT.text = info.name;
            // 屏蔽自己ID: 仅显示掩码, info.id 仍为真实 userid(服务器操作/身份识别照用)
            const myUid = (Cloud.getUser() || {}).userid || "";
            const hideMy = (() => { try { return localStorage.getItem("hideMyId") === "1"; } catch (e) { return false; } })();
            const isSelf = !!info.id && info.id === myUid;
            if (idT) idT.text = (hideMy && isSelf) ? "****" : String(info.id);
            if (teamT) teamT.text = info.team;

            const img: any = UI.findNode(item, "img");
            if (!img) return;
            // 点击头像加好友(真实玩家且非自己): 弹金币档次选择
            img.mouseEnabled = true;
            img.off(Laya.Event.CLICK, this, this.onHeadClick);
            if (info.id && !isSelf && String(info.id).indexOf("AI") !== 0) {
                img.on(Laya.Event.CLICK, this, this.onHeadClick, [info]);
            }
            // 头像就是头像: 队色已经由 id_1 文字给出, 再给贴图乘一层红/蓝(旧值)会把脸染成色块
            img.color = "#FFFFFF";
            img.alpha = 1;
            // 键归一走 Res.headKey: 旧账号/空值在包里不存在时静默空白 = "头像没显示"
            const head: string = Res.headKey(info.head);
            // 守卫要看纹理还在不在: 池化节点同键但纹理已丢(缓存通道断)时, 只比 __head 会永久黑图
            const texLost = !img.texture;
            if (img.__head === head && !texLost) return;
            img.__head = head;
            if (!head) return;
            Res.get("ui/" + head, (tex: Laya.Texture) => {
                if (tex && !img.destroyed && img.__head === head) UI.setTex(img, tex);
            });
        };
        gList.numItems = infos.length;
    }

    /**
     * 展板收起开关(用户规格): 点击 txt(GTextField ▲) → gList 往上推收起展板(位移量 = txt 的 x),
     * txt 一起移动且 x 归 0、文本 ▲→▼; 保存 gList/txt 原始位置, 再次点击全部还原、▼→▲。
     * 位置信息只存首次展开态(收起态点击即还原, 不覆盖)。
     */
    private _setupBoardToggle(): void {
        // 限定当前场景 Scene2D 内搜(dialog.lh 有 gList 同名, stage 全局搜会被劫持)
        const root: any = Laya.stage.getChildByName("root");
        const scene2d: any = root ? root.getChildByName("Scene2D") : null;
        const txt: any = scene2d ? UI.findNode(scene2d, "txt") : null;
        const gList: any = scene2d ? UI.findNode(scene2d, "gList") : null;
        if (!txt || !gList) {
            console.warn('[badm] 展板开关缺控件: txt=' + !!txt + ' gList=' + !!gList + '(编辑器补 txt GTextField ▲)');
            return;
        }
        // 展开态文本兜底(场景未配时)
        if (!txt.text) txt.text = "▲";
        txt.mouseEnabled = true;
        let collapsed = false;
        let origin: { glx: number, gly: number, ty: number } | null = null;
        txt.on(Laya.Event.CLICK, this, () => {
            Au.tap();
            if (!collapsed) {
                // 展开 → 收起: 保存位置(只存首次展开态), gList 往上推 txt.x 的距离, txt 一起移 + x 归 0
                if (!origin) origin = { glx: gList.x, gly: gList.y, ty: txt.y };
                const d = txt.y;
                gList.y -= d;
                txt.y -= d;
                txt.y = 0;
                txt.text = "▼";
                collapsed = true;
            } else {
                // 收起 → 还原: 恢复保存的位置与展开箭头
                if (origin) { gList.x = origin.glx; gList.y = origin.gly; txt.y = origin.ty; }
                txt.text = "▲";
                collapsed = false;
            }
        });
    }

    private play(): void {
        // 保持原有 Spine 播放逻辑（如果有）
        this.index++;
        if (this.index >= this.skeleton.getAnimNum()) {
            this.index = 0;
        }
        this.skeleton.play(this.index, false);
    }

    onDestroy(): void {
        this._stopProg();
        // 鹰眼资源清理: 回放接管(球驱动/轨迹线)、临时相机、本回合记录。
        // 这里不走 _stopEagleEye——那还会推 rule 转段, 场景正在销毁, 不该再动比赛状态机
        if (this.ballO) {
            this.ballO.onPlaybackPose = null;
            this.ballO.stopPlayback();
            this.ballO.clearTrack();
        }
        this._restoreEagleCamera();
        // Control/Inp 销毁: dobclick 队列与 stage 触摸监听随之解除(防跨场景残留引用死实例)
        if (this.ctrl) this.ctrl.destroy();
        // mag 销毁(崩坑根因): PVP 心跳线程/帧回调/提案定时器必须随场景销毁停——
        // 旧版不销毁 → 退出对局后旧 PVP 心跳继续跑 serializeFrame(角色 root 已 null
        // = "null is not an object evaluating this.root.transform.position" 崩溃堆栈)
        // + 旧实例 onFrame/onClient 残留抢第二局消息(双权威互降级 = 收不到消息/提案全强制通过)
        if (this.mag) {
            try { this.mag.destroy(); } catch (e) { console.warn('[badm] mag destroy 异常', e); }
            this.mag = null as any;
        }
        Laya.stage.offAllCaller(this);
    }
}