import { Cha } from "./badm/cha";
import { Res } from "./libs/res";
import { AIControl, AIDifficulty } from "./badm/NPC/ai";
import { Control } from "./badm/control";
import { UI } from "./badm/ui";
import { Ball } from "./badm/ball";
import { PVE } from "./badm/mag/pve";   // 新增
import { PVP } from "./badm/mag/pvp";   // 新增
import { Gnet } from "./libs/GNet";


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

        Res.url("http://normalgame.cn/nor.br", (list) => {
            console.log("资源加载：", list);
            this.ui.setProgress();
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
                const pve = this.mag as PVE;
                pve.setLocalCha(this.localCha);
                pve.setupDefaultAI(this.ballO);
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
                    this.ui.setHitIndicator(true, params.angV);
                } else {
                    this.ui.setHitIndicator(false);
                    this.localCha.hit({ angH: -1, angV: -1, power: -1 ,spi:null});
                }
                if (this.isPvp) {
                    (this.mag as PVP).syncAction({ type: 'hit', params });
                }
                this.localCha.hit(params, this.ballO);
            };

            this.ui.setProgress();
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
        console.log( `[NewScript] 当前玩家: ${myId}, 房间玩家: ${Gnet.getRoomPlayerId()}`);
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