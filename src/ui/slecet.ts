const { regClass, property } = Laya;

import {Res} from "../libs/res";
import { TimeManager } from "../libs/time"; // 按实际路径导入

@regClass()
export class slecet extends Laya.Script {
    //declare owner : Laya.Sprite3D;
    //declare owner : Laya.Sprite;

    @property(String)
    public text: string = "";

    public camera : Laya.Camera2D;
 
    //组件被激活后执行，此时所有节点和组件均已创建完毕，此方法只执行一次
    onAwake(): void {
    this.camera = this.owner.getChild("Area2D").getChild("Camera2D");
    ;
    //this.camera.zoom = new Laya.Vector2(Laya.stage.height / 1000, Laya.stage.height / 1000);
    console.log(this.camera)
                
    //添加keydown事件
    Laya.stage.on(Laya.Event.KEY_DOWN, Laya.caller, (evt: Laya.Event)=>{
        
        //console.log(evt.keyCode);
    });
    console.log(Laya.stage.width + "//////////" + Laya.stage.height);


    const time = new TimeManager();
    console.log("res");
    console.log(Res);
    Res.init();
    Res.url("http://normalgame.cn/res.json", (()=>{
    Res.downRes();
        const vvv =time.setInterval(500, () => {
            time.clear(vvv);
            if (Res.getList()) {
            if(Res.get("lemon")){
                const lemon = this.owner.getChild("Area2D").getChildByName("list").getChildByName("item0").getChild("trace") as Laya.Sprite;
                console.log(lemon)
                lemon.graphics = new Laya.Graphics();
                const sc = new Laya.Script();
                lemon.on(Laya.Event.CLICK,(evt:Laya.Event)=>{
                    //laya跳转页面
                    console.log("game/"+ evt.target.name + ".ls");
                    Laya.Scene.unDestroyedScenes.forEach(scene => {
                    });
                    Laya.Scene.open("game/Scene.ls", true)
                });
                lemon.addComponentInstance(sc);
                let url = URL.createObjectURL(Res.get("lemon"));
                console.log(url);
                Laya.loader.load(
                    {url, 
                        type: Laya.Loader.IMAGE,
                        key:"lemon"}).then((texture: Laya.Texture)=>{
                    console.log(texture);
                    lemon.graphics.drawImage(texture);
                    
                    lemon
                }).catch(e=>{
                    console.log(e);
            });
                //通过res.get("lemon", 0)=>blob) 创建laya.texture,lemon.graphics.drawImage (
                time.clear(vvv);
            }
            }
        })
    }))
    


    //找到laya。stage下名字为0的文本组件，并设置点击事件，点击后设置ViewStack为名字转index
    for(var i = 0; i < 3; i++){
    const text = this.owner.getChild("Area2D").getChild("Panel").getChild("HBox").getChildByName(i + '') as Laya.Text;
    text.on(Laya.Event.CLICK, this, () => {
        var viewStack = this.owner.getChild("Area2D").getChildByName("list") as Laya.ViewStack;
        
        viewStack.selectedIndex = parseInt(text.name);
        console.log(viewStack);
        console.log(viewStack.selectedIndex);
        viewStack.selection = viewStack.items[parseInt(text.name)];
    });
    }
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