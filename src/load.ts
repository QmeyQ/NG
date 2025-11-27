import { Gnet } from "./libs/GNet";
import { Res } from "./libs/res";

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
        const openId = Date.now().toString();
        const roomName = "room";
        Gnet.init({
                clientId: '1263859182919011264',
                clientSecret: '8D99CCC71D57DD3DFF0F1C4EB5A800E527AB122C9580D781E6BEB18C917AE277',
                openId,
                appId: '172249065902748389',
            },(err: Error | null, client: any) => {
            if (err) {
                console.error("init failed: " + err.message);
                return;
            }
            console.log("init success", client);

            //创建房间
            Gnet.createRoom(roomName, 4, (err: Error | null, room: any) => {
                if (err) {
                    console.error("create room failed: " + err.message);
                    return;
                }
                console.log("create room success", room);
                //setupRoom(room);
            });
            return;

            // // 将时间戳转换为中文日期的函数
            // const timestampToChineseDate = (timestamp: string): string => {
            //     const date = new Date(parseInt(timestamp));
            //     const year = date.getFullYear();
            //     const month = date.getMonth() + 1;
            //     const day = date.getDate();
            //     const hours = date.getHours();
            //     const minutes = date.getMinutes();
            //     const seconds = date.getSeconds();
                
            //     // 中文日期格式：XXXX年XX月XX日 XX时XX分XX秒
            //     return `${year}年${month}月${day}日 ${hours}时${minutes}分${seconds}秒`;
            // };



            // const setupRoom = (room: any) => {
            //     console.log("room ready", {
            //         id: room.id,
            //         name: room.roomName,
            //         type: room.roomType,
            //         ownerId: room.ownerId,
            //         maxPlayers: room.maxPlayers,
            //         isPrivate: room.isPrivate,
            //         isLock: room.isLock,
            //         createTime: room.createTime
            //     });
            //     const players = room.players || [];
            //     console.log("room players", players.map((p: any) => ({ playerId: p.playerId, status: p.status, customPlayerStatus: p.customPlayerStatus, customPlayerProperties: p.customPlayerProperties })));
                
            //     // 生成中文日期
            //     const chineseDate = timestampToChineseDate(openId);
                
            //     // 构建包含openid和中文日期的消息
            //     const payloadClient = JSON.stringify({ ts: Date.now(), from: openId, type: "client", msg: "broadcast" });
            //     const payloadServer = JSON.stringify({ 
            //         ts: Date.now(), 
            //         from: openId, 
            //         type: "server", 
            //         openid: openId, 
            //         chineseDate: chineseDate,
            //         msg: "玩家信息" 
            //     });
                
            //     Gnet.onClient((info: any) => {
            //         console.log("client recv", { roomId: info.roomId, from: info.sendPlayerId, msg: info.msg });
            //     });
            //     Gnet.onServer((info: any) => {
            //         console.log("server recv", info);
            //     });
            //     Gnet.onConnect((player: any) => {
            //         console.log("connect", player);
            //     });
            //     Gnet.onJoin((player: any) => {
            //         console.log("join", player);
            //         const all = room.players || [];
            //         console.log("room players", all.map((p: any) => ({ playerId: p.playerId, status: p.status, customPlayerStatus: p.customPlayerStatus, customPlayerProperties: p.customPlayerProperties })));
            //     });
            //     Gnet.onLeave((player: any) => {
            //         console.log("leave", player);
            //         const all = room.players || [];
            //         console.log("room players", all.map((p: any) => ({ playerId: p.playerId, status: p.status, customPlayerStatus: p.customPlayerStatus, customPlayerProperties: p.customPlayerProperties })));
            //     });
                
            //     // 发送消息
            //     Gnet.sendToClient( 0, payloadClient);
            //     Gnet.sendToServer(payloadServer);
            //     console.log("发送到服务器的消息:", payloadServer);
            // };

            // const level = (this.text && this.text.trim()) || "1";
            // console.log("matchR", { matchParams: { level }, maxPlayers: 4, roomType: "demo" });
            // Gnet.matchRoom({ matchParams: { level }, maxPlayers: 4, roomType: "demo" }, (err: Error | null, room?: any) => {
            //     if (err || !room) {
            //         console.error("matchRoom failed", err?.message);
            //         return;
            //     }
            //     console.log("matchRoom success", room);
            //     setupRoom(room);
            // });
        });

        console.log("load");
        return;
        this.progress = this.owner.getChildByName("Area2D").getChildByName("progress") as Laya.Text
        Res.init();
        Res.url('http://normalgame.cn/res.json?v=99999', (res: Res) => {
            Res.down("card");
            //监听进度
            Res.onProcessUpdate = (pro, err, cont) => {
                console.log(this.progress);
                this.progress.text = "下载进度：" + pro + "/" + cont;
            }
            //监听完成
            Res.onDownComplete = (res: Res) => {
                Res.loadTexture("card", undefined, 0, (tex: Laya.Texture) => {
                    console.log(tex);
                });
                Res.onLoadComplete = (res: Res) => {
                    Laya.Scene.open("game/select.ls");
                }
            }
        }, true);
        
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
