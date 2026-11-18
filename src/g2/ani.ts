const { regClass, property } = Laya;

@regClass()
export class ani extends Laya.Script {
    //declare owner : Laya.Sprite3D;
    //declare owner : Laya.Sprite;

    @property({ type: Laya.Sprite })
    public Sprite: Laya.Sprite;

    @property(String)
    public text: string = "";
    

    public FA:Laya.FrameAnimation;
    //组件被激活后执行，此时所有节点和组件均已创建完毕，此方法只执行一次
    onAwake(): void {
        console.log(this.Sprite)
        this.FA = this.Sprite.getComponent(Laya.FrameAnimation);
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
    onUpdate(): void {}

    onTriggerEnter(other: Laya.PhysicsColliderComponent | Laya.ColliderBase, self: Laya.ColliderBase, contains:any):void{
        console.log(contains)
        console.log(other)
        console.log(self)
    }

    //每帧更新时执行，在update之后执行，尽量不要在这里写大循环逻辑或者使用getComponent方法
    onLateUpdate(): void {
        //获取节点的animation组件的index，大于等于4时设置为0
        if(this.FA.frame >=4){
            this.FA.frame = 0;
        }
    }

    //鼠标点击后执行。与交互相关的还有onMouseDown等十多个函数，具体请参阅文档。
    //onMouseClick(): void {}
}