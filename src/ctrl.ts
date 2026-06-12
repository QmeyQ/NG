import { Control } from "./badm/control";

const { regClass, property, Browser } = Laya;


@regClass()
export class ctrl extends Laya.Script {
    //declare owner : Laya.Sprite3D;
    //declare owner : Laya.Sprite;




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


    //组件被启用后执行，例如节点被添加到舞台后
    //onEnable(): void {}

    onStart(): void {
       var x = new Control(Laya.stage);
       
    }

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
