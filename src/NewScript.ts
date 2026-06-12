import { Cha } from "./badm/cha";
import { Res } from "./libs/res";
import { Timer } from "./libs/time";
import { Control } from "./badm/control";
import { Phy } from "./badm/phy";
import { Obj } from "./badm/obj";
import { Ball } from "./badm/ball";
const { regClass, property, Browser } = Laya;


@regClass()
export class NewScript extends Laya.Script {
    //declare owner : Laya.Sprite3D;
    //declare owner : Laya.Sprite;

  private skeleton: Laya.Spine2DRenderNode;
    private index: number = -1;

    @property(Laya.Sprite)
    public Sprite!: Laya.Sprite;
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



       // --- 新增：用于根运动测试的变量 ---
    private _p1Animator: Laya.Animator;          // p1 的动画组件
    private _p1RootBoneName: string = "pole.Hips";     // 根骨骼名称（根据实际骨骼命名修改）
    private _p1LastRootPos: Laya.Vector3;         // 上一帧根骨骼的世界位置
    private _enableRootMotion: boolean = true;     // 是否启用根运动（测试开关）

    private ballO: Ball;
    private cha1: Cha;
    public phy: Phy;

    //组件被激活后执行，此时所有节点和组件均已创建完毕，此方法只执行一次
    //onAwake(): void {
        // console.log("SpineTemplet:", Laya.SpineTemplet);
        // Res.init();
        // Laya.init(Browser.width, Browser.height).then(() => {
        // Res._net.on('downloadProgress', (key: string, percent: number) => {
        //     console.log('progress', key, percent + '%');
        // });
        // Res._net.on('downloadError', (key: string, mes: string) => {
        //     console.error('error', key, mes);
        // });
        // Res._net.on('downloadComplete', (key: string, blob: Blob, fromCache: boolean) => {
        //     console.log('complete', key, fromCache);
        // });
        // const dl = (url: string) => new Promise<Blob>((resolve, reject) => {
        //     Res._net.download(url, {
        //         key: url,
        //         force: true,
        //         onProgress: (p: number) => console.log('dl', url, p + '%'),
        //         onComplete: (b: Blob) => resolve(b),
        //         onError: (e: any) => reject(e)
        //     });
        // });
        // (async () => {
        //         // const sk = await dl('http://normalgame.cn/1/linyueru.json');
        //         // const at = await dl('http://normalgame.cn/1/linyueru.atlas');
        //         // const img = await dl('http://normalgame.cn/1/linyueru.png');
        //         // console.log(img, sk, at);
        //         console.log("jwzlziyr");
        //         Res.url("http://normalgame.cn/res.res", (res:any)=>{
        //     console.log(res)
        //     Res.downRes((suc, err, total) => {
        //         console.log("下载资源成功", suc, err, total);
        //          Res.downRes((suc, err, total) => {
        //             console.log('downRes', suc, err, total);
        //         const temp = Res.get("catgirl/catgirl") as Laya.SpineTemplet;
        //         console.log(this.linyueru)
        //         this.skeleton = new Laya.Spine2DRenderNode();
                
        //         this.Sprite.addComponentInstance(this.skeleton);
        //         this.skeleton.templet = temp as Laya.SpineTemplet;
        //         this.skeleton.animationName = this.skeleton.templet.skeletonData.animations[0].name;
        //         this.Sprite.pos(Browser.width / 2, Browser.height / 2 + 100);
        //         this.Sprite.scale(0.5, 0.5);
        //         this.Sprite.on(Laya.Event.STOPPED, this, this.play);
        //         this.skeleton.useFastRender = false;
        //         this.play();
        //         });
        //     });
        // })
               
        // })();
        // });
    //}

    private frame(){
    }

    private play(): void {
		this.index++;
		if (this.index >= this.skeleton.getAnimNum()) {
			this.index = 0;
		}
		this.skeleton.play(this.index, false);

	}

    //组件被启用后执行，例如节点被添加到舞台后
    //onEnable(): void {}
    private ctrl: Control;
    private chb: Cha;
    onStart(): void {
        Laya.Config.useWebGL2 = false;


        this.ctrl = new Control(Laya.stage);

        Res.init();
        Res._net.on('downloadProgress', (key: string, percent: number) => {
            console.log('progress', key, percent + '%');
        });
        Res._net.on('downloadError', (key: string, mes: string) => {
            console.error('error', key, mes);
        });
        Res._net.on('downloadComplete', (key: string, blob: Blob, fromCache: boolean) => {
            console.log('complete', key, fromCache);
        });
        Res.url("http://normalgame.cn/tex.res", (res:any)=>{
            Res.url("http://normalgame.cn/res.res", ()=>{
                console.log(this.p1);
                this.ballO = new Ball(this.ball);
                this.cha1 = new Cha(this.p1);
                this.cha1.setDress({
                    meshs:
                    {
                        body: "res@body.lm",
                        shirt: "res@shirt.lm",
                        hair: "res@hair.lm",
                        face: "res@face.lm",
                        shoes: "res@shoes.lm"
                    },
                    mats:
                    {
                    //     "Body_Unlit.002": "body.mat",
                    //     head: "head.mat",
                    //     hand: "hand.mat",
                    //     "Face_Tooth.002": "leg.mat",
                    //     foot: "foot.mat",
                    //     arm: "arm.mat"
                    },
                    textures:
                    {
                        "Body_Unlit.002": "tex@body.png",
                        "Face_Tooth.002": "tex@face.png"
                    }
                })
                console.log("cha1:", this.cha1);
                this.cha1.ball(this.ballO);
                this.ctrl.onMove = (angH: number, power: number) => {
                    this.cha1.move(angH, power);
                    //this.chb.move(angH, power);
                };
                this.ctrl.onHit = (params?:any, spi ?:Laya.Vector3) => {
                    if (params) 
                    console.log("hit:", params.power, params.angH, params.angV, spi);
                    this.cha1.hit(params, this.ballO);
                };
             });
        })
        
        



        console.log("onStart");
        console.log("NewScript:", this.courtNet);
        if (this.courtNet) {
            const meshRenderer: Laya.MeshRenderer = this.courtNet.getComponent(Laya.MeshRenderer);
            const materials: Laya.Material[] = meshRenderer.materials;

            console.log("materials:", materials);
            if (materials && materials.length > 0) {
                for (let i = 0; i < materials.length; i++) {  
                    const mat: Laya.Material = materials[i];
                    if (mat) {
                        mat.cull = Laya.CullMode.Off;
                        mat.materialRenderMode = Laya.MaterialRenderMode.RENDERMODE_TRANSPARENT;
                    }
                }
            }
        }

    
    }
    //组件被禁用时执行，例如从节点从舞台移除后
    //onDisable(): void {}

    //第一次执行update之前执行，只会执行一次
    //onStart(): void {}

    //手动调用节点销毁时执行
    //onDestroy(): void {}
    //每帧更新时执行，尽量不要在这里写大循环逻辑或者使用getComponent方法

       // Timer.start('x');
        //}
      //  console.log(this.ball.transform);

    //每帧更新时执行，在update之后执行，尽量不要在这里写大循环逻辑或者使用getComponent方法
    //onLateUpdate(): void {}

    //鼠标点击后执行。与交互相关的还有onMouseDown等十多个函数，具体请参阅文档。
    //onMouseClick(): void {}

}
