import { Cha } from "./badm/obj/cha";
import { Res } from "./libs/res";
import { AIControl, AIDifficulty } from "./badm/NPC/ai";
import { Control } from "./badm/control";
import { UI } from "./badm/engine/ui";
import { Ball } from "./badm/obj/ball";
import { PVE } from "./badm/mag/pve";   // 新增
import { PVP } from "./badm/mag/pvp";   // 新增
import { Gnet } from "./libs/GNet";
import { Au } from "./libs/au";


const { regClass, property, Browser } = Laya;

@regClass()
export class NewScript extends Laya.Script {
    private skeleton: Laya.Spine2DRenderNode;
    private index: number = -1;

    @property(Laya.Sprite)
    public linyueru!: Laya.Sprite;
    @property(Laya.Sprite3D)
    public courtNet!: Laya.Sprite3D;
    @property(Laya.Sprite3D)
    public courtFloor!: Laya.Sprite3D;
    @property(Laya.Sprite3D)
    public ball!: Laya.Sprite3D;
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
    private ai!: AIControl;
    private ctrl: Control;
    private localCha!: Cha;
    private isPvp: boolean = false;
    private isSingle: boolean = false;


    onStart(): void {
        Laya.Config.useWebGL2 = false;
        this.ui = new UI();
        this.ctrl = new Control(Laya.stage);

        Res.init();
        this.ui.setProgress("正在加载资源...", 0);
        Res._net.on('downloadProgress', (key: string, percent: number, speed: number) => {
            this.ui.setProgress(`下载资源:${speed}/s ${key}`, percent - 5);
        });
        Res._net.on('downloadError', (key: string, mes: string) => {
            console.error('error', key, mes);
            this.ui.setProgress(`加载失败: ${key}`);
        });
        Res._net.on('downloadComplete', (key: string, blob: Blob, fromCache: boolean) => {
            console.log('complete', key, fromCache);
        });
        Res.vers("http://normalgame.cn/nor.br", (result) => {
            console.log("version：", result);            Res.url("http://normalgame.cn/nor.br", result.localLm != result.serverLm, (list) => {
            console.log("资源加载：", list);
            this.ballO = new Ball(this.ball);

            // 读取玩家数量和模式
            const playerCount: number = (window as any).gamePlayerCount || 4;
            this.isSingle = playerCount === 2;
            this.isPvp = (window as any).gameMode === "pvp";
            console.log(`[NewScript] 模式: ${this.isSingle ? '单打' : '双打'}, isPvp=${this.isPvp}`);

            // ----- 创建 Mag（根据模式选择子类，内部完成角色初始化） -----
            if (this.isPvp) {
                this.mag = new PVP(this.p1, this.ballO, this.isSingle);
            } else {
                this.mag = new PVE(this.p1, this.ballO, this.isSingle);
            }


            // 绑定 UI 回调
            this.mag.onCountdown = (count: number) => {
                this.ui.setCountdown(count);
                const info = this.mag.getDisplayInfo();
                this.ui.setScore(info.left, info.right, info.status, info.reason);
            };
            this.mag.onScoreChanged = (l: number, r: number) => {
                const info = this.mag.getDisplayInfo();
                this.ui.setScore(info.left, info.right, info.status, info.reason);
            };

            // 如果是 PVP 模式，进行网络绑定
            if (this.isPvp) {
                this.localCha = (this.mag as PVP).setup();
            } else {
                // PVE 模式：本地玩家为第一个角色，其余角色挂 AI
                this.localCha = this.mag.players[0];
                (this.mag as PVE).setLocalCha(this.localCha);
                (this.mag as PVE).setupDefaultAI(this.ballO);
            }

            // 显示玩家信息
            this._setupPlayerInfo();

            // 关闭非本地相机
            this._disableNonLocalCameras();

            // 开始比赛
            this.mag.startMatch();

            this.ui.setScore();

            // ----- 控制回调 -----
            this.ctrl.onMove = (angH: number, power: number) => {
                // 仅当 PVP 且为权威端时发送操作（或所有客户端发送，由 PVP_Mag 内部过滤）
                if (this.isPvp) {
                    (this.mag as PVP).syncAction({ type: 'move', angH, power });
                }
                this.localCha.move(angH, power);
            };
            this.ctrl.onHit = (params?: any, spi?: Laya.Vector3) => {
                if (params) {
                    if (this.localCha.x > 0) {
                        params.angH = (params.angH + 180) % 360;
                    }
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
                this.mag.hit(params, this.localCha);
            };

            this.ballO.on('hit', () => {
                // 计算音量（0~100），距离越近音量越大
                let vol = Math.min(100,
                    Math.max(0, (10 - Laya.Vector3.distance(this.ballO.pos, this.localCha.pos)) * 10));
                // 如果希望音量与距离成正比，则改为：let vol = Math.min(100, (distance / maxDistance) * 100);
                Au.play("hit", vol);
            });


            this.localCha.on("load", (LC:number) => {
                console.log("资源加载：", LC)
                if(LC <= 0)
                this.ui.setProgress();
            else
                this.ui.setProgress("加载角色："+LC, (100-LC)*100);
            })
        });

        // 球网透明（保持不变）
        if (this.courtNet) {
            const meshRenderer = this.courtNet.getComponent(Laya.MeshRenderer);
            const materials = meshRenderer.materials;
            if (materials && materials.length > 0) {
                for (const mat of materials) {
                    if (mat) {
                        mat.cull = Laya.CullMode.Off;
                        mat.materialRenderMode = Laya.MaterialRenderMode.RENDERMODE_TRANSPARENT;
                    }
                }
            }
        }
        })
        
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
        const myId = Gnet.getCurrentPlayerId() || leftId;
        const roomPlayers = Gnet.getPlayers().map((p: any) => p.playerId).join(', ');
        console.log(`[NewScript] 当前玩家: ${myId}, 房间玩家: ${Gnet.getRoomPlayerId()}`);
        this.ui.setPlayerInfo(myId, Gnet.getRoomPlayerId() || leftId);
    }

    private play(): void {
        // 保持原有 Spine 播放逻辑（如果有）
        this.index++;
        if (this.index >= this.skeleton.getAnimNum()) {
            this.index = 0;
        }
        this.skeleton.play(this.index, false);
    }
}