import { Res } from "./lib/res";

const { regClass, property } = Laya;


@regClass()
export class load extends Laya.Script {
    //declare owner : Laya.Sprite3D;
    //declare owner : Laya.Sprite;

    //定义text控件progress来自当前组件下area2d下的progress
    @property(Laya.Text)
    public progress: Laya.Text;
    @property(String)
    public text: string = "";

    //组件被激活后执行，此时所有节点和组件均已创建完毕，此方法只执行一次
    onAwake(): void {
        this.progress = this.owner.getChildByName("Area2D").getChildByName("progress") as Laya.Text
        Res.init();
        Res.url('http://normalgame.cn/res.json?v=9999', (res: Res) => {
            Res.down("card");
            //监听进度
            Res.onProcessUpdate = (pro, err, cont) => {
                console.log(this.progress);
                this.progress.text = "下载进度：" + pro + "/" + cont;
            }
            //监听完成
            Res.onDownComplete = (res: Res) => {
                Res.loadTexture("card", "catgirl", 0, (tex: Laya.Texture) => {
                    console.log(tex);
                });
                Res.onLoadComplete = (res: Res) => {
                    Laya.Scene.open("game/select.ls");
                }
            }
        });
        
    }

    //组件被启用后执行，例如节点被添加到舞台后
    //onEnable(): void {}

    //组件被禁用时执行，例如从节点从舞台移除后
    //onDisable(): void {}

    //第一次执行update之前执行，只会执行一次
    //onStart(): void {}

    //手动调用节点销毁时执行
    //onDestroy(): void {}

    //每帧更新时执行，尽量不要在这里写大循环逻辑或者使用getComponent方法
    //onUpdate(): void {}

    //每帧更新时执行，在update之后执行，尽量不要在这里写大循环逻辑或者使用getComponent方法
    //onLateUpdate(): void {}

    //鼠标点击后执行。与交互相关的还有onMouseDown等十多个函数，具体请参阅文档。
    //onMouseClick(): void {}
}