import { Gnet } from "./libs/GNet";
const { regClass, property } = Laya;

@regClass()
export class RoomItem extends Laya.Box {
    // UI元素引用
    @property(Laya.Label)
    public roomNameLabel: Laya.Label;
    
    @property(Laya.Label)
    public playerCountLabel: Laya.Label;
    
    @property(Laya.Label)
    public roomIdLabel: Laya.Label;
    
    @property(Laya.Button)
    public joinBtn: Laya.Button;
    
    // 房间数据
    private roomData: any = null;

    onAwake(): void {
        // 获取UI元素引用
        this.roomNameLabel = this.getChildByName("roomNameLabel") as Laya.Label;
        this.playerCountLabel = this.getChildByName("playerCountLabel") as Laya.Label;
        this.roomIdLabel = this.getChildByName("roomIdLabel") as Laya.Label;
        this.joinBtn = this.getChildByName("joinBtn") as Laya.Button;
        
        // 绑定加入按钮事件
        this.joinBtn.on(Laya.Event.CLICK, this, this.onJoinClick);
    }
    
    /**
     * 设置房间数据
     */
    setData(data: any): void {
        this.roomData = data;
        this.updateUI();
    }
    
    /**
     * 更新UI显示
     */
    private updateUI(): void {
        if (this.roomData) {
            if (this.roomNameLabel) {
                this.roomNameLabel.text = this.roomData.roomName || "未知房间";
            }
            if (this.playerCountLabel) {
                this.playerCountLabel.text = `${this.roomData.playerCount || 0}/${this.roomData.maxPlayers || 2}`;
            }
            if (this.roomIdLabel) {
                this.roomIdLabel.text = `ID: ${this.roomData.roomId || "未知"}`;
            }
            
            // 根据玩家数量更新按钮状态
            if (this.joinBtn) {
                const isFull = this.roomData.playerCount >= this.roomData.maxPlayers;
                this.joinBtn.disabled = isFull;
                this.joinBtn.label = isFull ? "已满" : "加入";
            }
        }
    }
    
    /**
     * 加入按钮点击事件
     */
    private onJoinClick(): void {
        if (!this.roomData || !this.roomData.roomId) {
            console.error("房间数据无效");
            return;
        }
        
        // 禁用按钮防止重复点击
        this.joinBtn.disabled = true;
        this.joinBtn.label = "加入中...";
        
        // 调用Gnet加入房间
        Gnet.joinRoom(this.roomData.roomId, (err: Error | null, room: any) => {
            if (err) {
                console.error("加入房间失败: " + err.message);
                
                // 恢复按钮状态
                this.joinBtn.disabled = false;
                this.joinBtn.label = "加入";
                
                // 可以在这里显示错误提示
                return;
            }
            
            console.log("加入房间成功", room);
            
            // 加入成功，可以在这里处理跳转逻辑
            // 例如：Laya.Scene.open("game.scene");
        });
    }
}