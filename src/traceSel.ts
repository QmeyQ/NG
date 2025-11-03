const { regClass, property } = Laya;
import { TimeManager } from "./lib/time";
import { Cha } from "./cha";
import { GameManager } from "./GameManager";
import { EnemyCollisionSpeedBoostEffect } from "./EffectManager";
import { Res } from "./lib/res";

@regClass()
export class traceSel extends Laya.Script {
    private gameManager: GameManager;
    private timer: TimeManager;
    private bagList: Laya.List;
    private lastIndex: number = -1;
    private res : Res;

    onStart() {
    console.log(Res.get("card", "catgirl"));
    
    const jsonPath = "resources/UI/json/bag.json";

    this.bagList = this.owner.getChildByName("Area2D").getChildByName("View").getChildByName("list");
    
    console.log(Res.getList().card);
    this.bagList.array = ['111', '222', '333'];
    //绑定list渲染单元处理方法，自定义list的渲染单元数据
    this.bagList.renderHandler = new Laya.Handler(this, this.onListRender);
    //绑定list选项改变的切换
    this.bagList.selectHandler = new Laya.Handler(this, this.onListSelect);
    //绑定单元格的鼠标事件
    this.bagList.mouseHandler = new Laya.Handler(this, this.onListMouse);

    //不使用皮肤，但有滚动条效果
    this.bagList.vScrollBarSkin = "";

    this.timer = new TimeManager();
    
    // 初始化游戏管理器
    //this.initializeGameManager();
    
    // 加载游戏资源
}

    /** 列表单元的渲染处理 */
    onListRender(item: Laya.Box, index: number): void {
        console.log("onListRender", item, index);
        //如果当前索引不在数据源可索引范围,则跳出
        if (index > this.bagList.array.length || index < 0) return;

        // 获取listItemBG子项
        const listItemBG = item.getChildByName("name") as Laya.Text;
        const heros = item.getChildByName("hero") as Laya.Image;
        listItemBG.text = this.bagList.array[index].name;
        // 如果当前渲染项为选中项,设置选中的背景图片,否则设置未选中的背景图片
        if (index === this.lastIndex) {
             listItemBG.texture = Res.get("card", "catgirl");
            listItemBG.text = "selectBox";
        } else {
            listItemBG.texture = Res.get("card", "catgirl");
            listItemBG.text = "selectBox";
        }
    }

    /**列表选择改变处理 
     * @readme 这里是为了示范怎么在选项切换里处理数据的变化，故意采用了自定义的方式处理选中状态切换。
     * 如果只是为了列表单元的选中状态切换， 引擎里提供了更简单的设置方式：将选中态ui的name设置为selectBox。
     * 简单方式，可参照拉动刷新列表的示例。
    */
    onListSelect(index: number): void {
        //this.tips.visible = true;

        // 更新上次选中的索引
        this.lastIndex = index;

        // 刷新列表
        this.bagList.refresh();

        // 选中的数据显示
        // this.itemImg.skin = this.bagList.array[index].listItemImg.skin;
        // this.itemNumber.text = ("数量 " + this.bagList.array[index].listItemNumber.text);
        // this.itemReadme.text = this.bagList.array[index].readme;
    }


    /**列表单元上的鼠标事件处理 */
    onListMouse(e: Laya.Event, index: number): void {
        //鼠标单击事件触发
        // if (e.type == Laya.Event.MOUSE_DOWN) {
        //     // console.log("事件目标", e.target);
        //     (e.target as Laya.Image).skin = "bg/bg100-1.png"; 

        // }
    }


    /** 初始化游戏管理器 */
    private initializeGameManager(): void {
        // 创建游戏管理器实例
        this.gameManager = new GameManager(this.owner as Laya.Sprite, {
            prepTime: 30,
            baseDmg: 1,
            shieldRecoverRate: 1,
            critChance: 0.1,
            critMultiplier: 2,
            stillCheckInterval: 500,
            healRate: 0.1
        });

        // 设置游戏事件回调
        this.setupGameCallbacks();

        // 初始化游戏场景
        this.initializeGameScene();
    }

    /** 设置游戏回调 */
    private setupGameCallbacks(): void {
        this.gameManager.setCallbacks({
            onRoundChange: (round) => {
                console.log(`回合变更: ${round}`);
            },
            onTimeUpdate: (time) => {
                console.log(`剩余时间: ${time}`);
            },
            onDamage: (attacker, target, damage, isCritical) => {
                console.log(`${attacker.isEnemy ? '敌方' : '我方'}对${target.isEnemy ? '敌方' : '我方'}造成${damage}点伤害${isCritical ? '(暴击!)' : ''}`);
            },
            onGameOver: (winner) => {
                console.log(`游戏结束，${winner === 'player' ? '玩家' : '敌方'}胜利!`);
            },
            onResourceLoaded: () => {
                console.log("资源加载完成，创建游戏角色");
                this.createGameCharacters();
            },
            onTouchStart: (pos) => {
                console.log(`触摸开始: (${pos.x}, ${pos.y})`);
            },
            onTouchEnd: (pos, isClick) => {
                console.log(`触摸结束: (${pos.x}, ${pos.y}), 是否单击: ${isClick}`);
            }
        });
    }

    /** 初始化游戏场景 */
    private initializeGameScene(): void {
        const area2D = this.owner.getChildByName("Area2D");
        if (!area2D) {
            console.error("未找到名为'Area2D'的节点");
            return;
        }

        // 创建主角色
        this.createMasterCharacter(area2D);
    }

    /** 创建主角色 */
    private createMasterCharacter(area2D: Laya.Sprite): void {
        const masterSprite = area2D.getChildByName("master") as Laya.Sprite;
        if (!masterSprite) {
            console.error("未找到名为'master'的节点");
            return;
        }

        const masterCha = new Cha(masterSprite, false);
        masterCha.attack = 20;
        masterCha.defense = 10;
        masterCha.setPosition(0, 0);
        masterCha.setSize(200, 200);
        masterCha.setHealth(100);
        masterCha.setMaxHealth(100);

        // 设置为主角并添加被动效果
        this.gameManager.setActiveChar(masterCha);
        this.gameManager.addCha(masterCha, false);

        // 添加"撞敌速度翻倍"被动效果
        const speedBoostEffect = new EnemyCollisionSpeedBoostEffect(3000);
        masterCha.passiveEffects.push(speedBoostEffect);
    }

    /** 创建游戏角色（资源加载完成后调用） */
    private createGameCharacters(): void {
        const area2D = this.owner.getChildByName("Area2D");
        if (!area2D) return;

        // 创建敌人角色
        this.gameManager.createEnemy({ x: -200, y: 1000 }, area2D);
        
        // 创建友方角色
        this.gameManager.createAlly({ x: -200, y: 1400 }, area2D);

        // 设置主角色动画图集（示例）
        const masterSprite = area2D.getChildByName("master") as Laya.Sprite;
        if (masterSprite) {
            const frameAnim = masterSprite.addComponent(Laya.FrameAnimation);
            // 这里可以设置实际的图集资源
            frameAnim.autoPlay = true;
            frameAnim.loop = true;
            frameAnim.timeScale = 0.4;
        }

        // 开始游戏
        this.gameManager.startGame();
    }

    onDestroy(): void {
        if (this.gameManager) {
            this.gameManager.destroyGame();
        }
    }

    @property(String)
    public text: string = "";
}