/**
 * Cha - 角色类，管理游戏中的角色行为、动画、物理和UI
 * 1. new Laya.Sprite()
 * 2. new Cha(sprite, isEnemy)
 * 3. setHealth(100)等
 * 4. setAtlas(atlasResource)
 * 5. gameManager.addCha(character, isEnemy)
 * - cha(Sprite, isEnemy): 创建角色实例，Sprite为显示对象，isEnemy是否为敌方
 * - setAtlas(atlas): 设置动画图集资源，atlas为Laya.AtlasResource实例
 * - setState(state, duration): 设置动画状态，state为AnimationState枚举，duration为可选持续时间
 * - setPosition(x, y): 设置角色位置
 * - setSize(width, height): 设置角色大小
 * - setHealth(value): 设置当前血量
 * - setMaxHealth(value): 设置最大血量
 * - setShield(value): 设置护盾值
 * - setAttack(value): 设置攻击力
 * - setDefense(value): 设置防御力
 * - setAngle(value): 设置攻击角度
 * - setForce(value): 设置攻击力度
 * - showAimLine(show): 显示/隐藏瞄准线
 * - showForceBar(show): 显示/隐藏力度条
 * - showRigidBodyCircle(show): 显示/隐藏钢体圆圈
 * - applyForce(): 应用设定的力和角度使角色移动
 * - addDamageText(value, isCrit): 显示伤害文本
 * - addHealText(amount): 显示治疗文本
 * - triggerAttack(duration): 触发攻击动画
 * - triggerHit(duration): 触发受击动画
 * - triggerFrozen(duration): 触发冻结状态
 * - triggerSlowed(duration): 触发迟缓状态
 * - isVelocityNearZero(threshold): 检查速度是否接近零
 * - drawUI(): 重绘角色UI（血条、护盾、瞄准线等）
 * - destroy(): 销毁角色，清理资源
 * 
 * - IDLE: 静止状态 (0-4帧) - 永恒基态
 * - MOVING: 移动状态 (4-8帧) - 永恒基态  
 * - ATTACK: 攻击状态 (8-13帧)
 * - HIT: 受击状态 (14帧)
 * - FROZEN: 冻结状态
 * - SLOWED: 迟缓状态
 * - onWallCollision(): 墙体碰撞
 * - onAllyCollision(ally): 友方碰撞
 * - onEnemyCollision(enemy): 敌方碰撞
 * - effectManager: 管理角色身上的各种效果
 * - initPassives(): 初始化被动效果
 * - useActiveSkill(target): 使用主动技能
 * - id: 角色唯一标识
 * - Sprite: 角色显示对象
 * - health/maxHealth: 当前血量/最大血量
 * - shield/maxShield: 当前护盾/最大护盾
 * - attack/defense: 攻击力/防御力
 * - angle/force: 攻击角度/力度
 * - isEnemy: 是否为敌方
 * - isPlayerControlled: 是否为玩家控制
 */

const { regClass } = Laya;
import { EffectManager, Effect, EffectTrigger } from "./EffectManager";

// 动画状态枚举
enum AnimationState {
    IDLE = "idle",      // 静止状态 (0-4帧) - 永恒基态
    MOVING = "moving",  // 移动状态 (4-8帧) - 永恒基态
    ATTACK = "attack",  // 攻击状态 (8-13帧)
    HIT = "hit",        // 受击状态 (14帧)
    FROZEN = "frozen",  // 冻结状态
    SLOWED = "slowed"   // 迟缓状态
}

@regClass()
export class Cha {
    // 角色唯一标识
    public id: string = '';

    // 角色节点
    public Sprite: Laya.Sprite;

    // 角色属性
    public angle: number = 0;
    public force: number = 5000;
    public health: number = 100;
    public maxHealth: number = 100;
    public shield: number = 50; // 护盾值
    public maxShield: number = 50; // 最大护盾值
    public attack: number = 10; // 攻击力
    public defense: number = 5; // 防御力
    public isEnemy: boolean = false; // 是否为敌方
    public isPlayerControlled: boolean = false; // 是否为玩家控制的友方
    public showAim: boolean = false; // 是否显示方向线
    public showForce: boolean = false; // 是否显示力度条
    public showRigidBody: boolean = false; // 新增：是否显示钢体圆圈
    public heightRatio = 1;
    public rigidBody: Laya.RigidBody;
    
    // 动画相关属性
    private frameAnimation: Laya.FrameAnimation;
    private currentState: AnimationState = AnimationState.IDLE;
    private stateStartTime: number = 0;
    private stateDurations: Map<AnimationState, number> = new Map();
    private lastFrameUpdateTime: number = 0;
    private currentFrameIndex: number = 0;
    private frameRate: number = 100; // 帧率（毫秒每帧）
    
    // 状态配置 - 静止和移动作为永恒基态，没有持续时间
    private readonly stateConfig = {
        [AnimationState.IDLE]: { minFrame: 0, maxFrame: 4, priority: 0, defaultDuration: -1 }, // 永恒状态
        [AnimationState.MOVING]: { minFrame: 4, maxFrame: 8, priority: 0, defaultDuration: -1 }, // 永恒状态
        [AnimationState.ATTACK]: { minFrame: 8, maxFrame: 13, priority: 4, defaultDuration: 600 },
        [AnimationState.HIT]: { minFrame: 14, maxFrame: 14, priority: 3, defaultDuration: 400 },
        [AnimationState.FROZEN]: { minFrame: 0, maxFrame: 4, priority: 5, defaultDuration: 2000 },
        [AnimationState.SLOWED]: { minFrame: 0, maxFrame: 4, priority: 1, defaultDuration: 1500 }
    };

    // 效果系统
    public effectManager: EffectManager;

    // 技能/被动
    public passiveEffects: Effect[] = []; // 被动效果
    public activeEffects: Effect[] = [];  // 主动技能

    // 绘制相关属性
    private originalWidth: number = 200;
    private originalHeight: number = 200;
    
    // 伤害文本管理 - 修改为使用独立文本节点
    private damageTexts: Array<{
        textNode: Laya.Text;
        life: number;
        startY: number;
    }> = [];
    
    // 回血文本管理 - 修改为使用独立文本节点
    private healTexts: Array<{
        textNode: Laya.Text;
        life: number;
        startY: number;
    }> = [];

    // 文本配置（区分伤害和回血）
    private readonly textConfig = {
        damage: {
            fontSize: 30,
            duration: 1500,
            speed: 0.05,
            fadeSpeed: 0.8,
            critColor: "#ffea2eff", // 暴击文本色
            normalColor: "#ff5151ff", // 普通伤害文本色
            strokeColor: "#000000",
            strokeWidth: 2
        },
        heal: {
            fontSize: 30,
            duration: 1500,
            speed: 0.05,
            fadeSpeed: 0.8,
            color: "#4eff4e", // 回血文本色（绿色）
            strokeColor: "#000000",
            strokeWidth: 2
        }
    };

    // 记录上一次的缩放值，用于横向翻转
    private lastScaleX: number = 1;

    // 钢体形状信息
    private rigidBodyShape: Laya.CircleShape2D | undefined;

    constructor(Sprite: Laya.Sprite, isEnemy: boolean = false) {
        this.Sprite = Sprite;
        this.isEnemy = isEnemy;
        this.effectManager = new EffectManager(this);

        // 初始化缩放值
        this.Sprite.scaleX = 1;
        this.lastScaleX = 1;

        // 初始化动画组件
        this.initAnimation();
        
        // 初始化状态持续时间
        this.initStateDurations();

        this.initPhysics();
        if (!this.Sprite.graphics) {
            this.Sprite.graphics = new Laya.Graphics();
        }
        this.rigidBody = this.Sprite.getComponent(Laya.RigidBody);

        if(!this.rigidBodyShape)
            this.rigidBodyShape = this.rigidBody.shapes[0] as Laya.CircleShape2D;

        // 启动伤害和回血文本动画更新
        Laya.timer.frameLoop(1, this, this.updateTexts);
        
        console.log("Cha构造函数完成，初始状态:", this.currentState);
    }

    // 初始化动画组件
    private initAnimation(): void {
        // 尝试获取现有的FrameAnimation组件
        this.frameAnimation = this.Sprite.getComponent(Laya.FrameAnimation);
        if (!this.frameAnimation) {
            console.log("未找到FrameAnimation组件");
            return;
        }
        console.log("找到FrameAnimation组件:", this.frameAnimation);
        
        // 添加lateUpdate脚本
        var script = this.Sprite.addComponent(Laya.Script);
        script.onLateUpdate = () => {
            this.updateFrameAnimation();
        };
        this.Sprite.addComponentInstance(script);
        console.log("已添加lateUpdate脚本");
    }

    // 手动更新帧动画
    private updateFrameAnimation(): void {
        if (!this.frameAnimation || !this.frameAnimation.frames || this.frameAnimation.frames.length === 0) {
            console.log("帧动画未就绪，等待图集加载");
            return;
        }

        const currentTime = Laya.timer.currTimer;
        const config = this.stateConfig[this.currentState];
        
        // 检查是否需要更新帧
        if (currentTime - this.lastFrameUpdateTime > this.frameRate) {
            this.lastFrameUpdateTime = currentTime;
            
            // 根据状态处理帧更新
            switch (this.currentState) {
                case AnimationState.HIT:
                    // 受击状态：固定显示第14帧
                    this.currentFrameIndex = 14;
                    console.log(`受击状态，固定帧: ${this.currentFrameIndex}`);
                    break;
                    
                case AnimationState.FROZEN:
                case AnimationState.SLOWED:
                    // 特殊状态：使用静止状态的帧范围，但可能有不同的播放逻辑
                    this.currentFrameIndex = config.minFrame;
                    console.log(`${this.currentState}状态，固定帧: ${this.currentFrameIndex}`);
                    break;
                    
                default:
                    // 其他状态：循环播放指定范围的帧
                    if (this.currentFrameIndex < config.minFrame || this.currentFrameIndex >= config.maxFrame) {
                        this.currentFrameIndex = config.minFrame;
                        console.log(`${this.currentState}状态，重置到起始帧: ${this.currentFrameIndex}, 范围: ${config.minFrame}-${config.maxFrame}`);
                    } else {
                        this.currentFrameIndex++;
                        console.log(`${this.currentState}状态，下一帧: ${this.currentFrameIndex}, 范围: ${config.minFrame}-${config.maxFrame}`);
                    }
                    break;
            }
            
            // 确保帧索引在有效范围内
            const totalFrames = this.frameAnimation.frames.length;
            if (this.currentFrameIndex >= totalFrames) {
                this.currentFrameIndex = 0;
                console.log(`帧索引超出范围，重置为0，总帧数: ${totalFrames}`);
            }
            
            // 设置当前帧
            this.frameAnimation.frame = this.currentFrameIndex;
            console.log(`设置帧索引: ${this.currentFrameIndex}, 状态: ${this.currentState}`);
        }
        
        // 更新动画状态逻辑 - 只在非基态时检查状态结束
        if (!this.isBaseState(this.currentState)) {
            this.updateAnimationState();
        }
        
        // 永恒基态的逻辑：根据物理状态自动切换
        this.updateBaseStateByPhysics();
    }

    // 判断是否为永恒基态
    private isBaseState(state: AnimationState): boolean {
        return state === AnimationState.IDLE || state === AnimationState.MOVING;
    }

    // 初始化状态持续时间
    private initStateDurations(): void {
        for (const state in this.stateConfig) {
            const animState = state as AnimationState;
            this.stateDurations.set(animState, this.stateConfig[animState].defaultDuration);
        }
        console.log("状态持续时间初始化完成");
    }

    // 设置动画状态
    public setState(state: AnimationState, customDuration?: number): void {
        if(!this.frameAnimation)
            this.initAnimation()
        if(!this.frameAnimation) {
            console.log("无法设置状态: FrameAnimation未初始化");
            return;
        }
        
        // 检查状态优先级
        const currentPriority = this.stateConfig[this.currentState].priority;
        const newPriority = this.stateConfig[state].priority;
        
        console.log(`尝试设置状态: ${state}, 当前状态: ${this.currentState}, 新优先级: ${newPriority}, 当前优先级: ${currentPriority}`);
        
        // 永恒基态的特殊处理：基态之间可以自由切换，其他状态需要优先级检查
        const canSwitch = this.isBaseState(state) || 
                         newPriority > currentPriority || 
                         this.isStateFinished();
        
        if (canSwitch) {
            const oldState = this.currentState;
            this.currentState = state;
            this.stateStartTime = Laya.timer.currTimer;
            this.lastFrameUpdateTime = Laya.timer.currTimer;
            
            // 设置自定义持续时间或使用默认值（基态忽略持续时间）
            if (customDuration !== undefined && !this.isBaseState(state)) {
                this.stateDurations.set(state, customDuration);
            }
            
            // 重置帧索引到新状态的起始帧
            const config = this.stateConfig[state];
            this.currentFrameIndex = config.minFrame;
            
            // 立即更新帧显示
            this.frameAnimation.frame = this.currentFrameIndex;
            
            console.log(`状态切换成功: ${oldState} -> ${state}, 起始帧: ${this.currentFrameIndex}, 帧范围: ${config.minFrame}-${config.maxFrame}`);
        } else {
            console.log(`状态切换被拒绝: 优先级不足或当前状态未结束`);
        }
    }

    // 检查当前状态是否已结束（永恒基态永不会结束）
    private isStateFinished(): boolean {
        // 永恒基态永不会自动结束
        if (this.isBaseState(this.currentState)) {
            return false;
        }
        
        const duration = this.stateDurations.get(this.currentState) || 0;
        // 如果持续时间为-1，表示无限持续时间
        if (duration === -1) {
            return false;
        }
        
        const isFinished = Laya.timer.currTimer - this.stateStartTime >= duration;
        console.log(`检查状态是否结束: ${this.currentState}, 持续时间: ${duration}, 已过时间: ${Laya.timer.currTimer - this.stateStartTime}, 是否结束: ${isFinished}`);
        return isFinished;
    }

    // 更新动画状态逻辑（只处理非基态）
    private updateAnimationState(): void {
        // 只有非基态才需要检查状态结束
        if (!this.isBaseState(this.currentState) && this.isStateFinished()) {
            console.log(`状态 ${this.currentState} 已结束，准备回到基态`);
            
            // 所有非基态结束后都根据物理状态回到相应的基态
            this.returnToBaseState();
        }
    }

    // 根据物理状态回到相应的基态
    private returnToBaseState(): void {
        if (!this.isVelocityNearZero(20)) {
            console.log("状态结束，切换到移动状态");
            this.setState(AnimationState.MOVING);
        } else {
            console.log("状态结束，切换到静止状态");
            this.setState(AnimationState.IDLE);
        }
    }

    // 根据物理状态自动更新永恒基态
    private updateBaseStateByPhysics(): void {
        // 只在当前是基态时才进行自动切换
        if (!this.isBaseState(this.currentState)) {
            return;
        }
        
        const isMoving = !this.isVelocityNearZero(20);
        console.log(`基态自动更新检查: 是否移动: ${isMoving}, 当前状态: ${this.currentState}`);
        
        if (isMoving && this.currentState !== AnimationState.MOVING) {
            console.log("检测到移动，切换到移动状态");
            this.setState(AnimationState.MOVING);
        } else if (!isMoving && this.currentState !== AnimationState.IDLE) {
            console.log("检测到静止，切换到静止状态");
            this.setState(AnimationState.IDLE);
        }
    }

    // 触发攻击动画
    public triggerAttack(duration?: number): void {
        console.log("触发攻击动画");
        this.setState(AnimationState.ATTACK, duration);
    }

    // 触发受击动画
    public triggerHit(duration?: number): void {
        console.log("触发受击动画");
        this.setState(AnimationState.HIT, duration);
    }

    // 触发冻结状态
    public triggerFrozen(duration?: number): void {
        console.log("触发冻结状态");
        this.setState(AnimationState.FROZEN, duration);
    }

    // 触发迟缓状态
    public triggerSlowed(duration?: number): void {
        console.log("触发迟缓状态");
        this.setState(AnimationState.SLOWED, duration);
    }

    // 清除特殊状态
    public clearSpecialStates(): void {
        if (this.currentState === AnimationState.FROZEN || 
            this.currentState === AnimationState.SLOWED) {
            console.log("清除特殊状态，回到基态");
            this.returnToBaseState();
        }
    }

    // 获取当前动画状态
    public getCurrentState(): AnimationState {
        return this.currentState;
    }

    // 设置图集
    public setAtlas(atlas: Laya.AtlasResource): void {
        if (this.frameAnimation) {
            console.log("设置图集");
            this.frameAnimation.setAtlas(atlas);
            this.frameAnimation.autoPlay = false; // 改为手动控制
            this.frameAnimation.loop = false; // 改为手动控制循环
            
            // 设置初始状态
            this.setState(AnimationState.IDLE);
        } else {
            console.log("无法设置图集: FrameAnimation未找到");
        }
    }

    // 初始化被动效果
    public initPassives(): void {
        console.log("初始化被动效果");
        this.passiveEffects.forEach(effect => {
            this.effectManager.addEffect(effect);
        });
    }

    // 使用主动技能
    public useActiveSkill(target: Cha | null = null): void {
        console.log("使用主动技能");
        this.activeEffects.forEach(effect => {
            if (target) {
                target.effectManager.addEffect(effect);
            } else {
                this.effectManager.addEffect(effect);
            }
        });
    }

    // 初始化物理属性
    private initPhysics(): void {
        console.log("初始化物理属性");
        this.rigidBody = this.Sprite.getComponent(Laya.RigidBody);
        if (!this.rigidBody) {
            this.rigidBody = this.Sprite.addComponent(Laya.RigidBody);
            this.rigidBody.type = "dynamic";
            this.rigidBody.gravityScale = 0;
            this.rigidBody.linearDamping = 0.5;
            this.rigidBody.allowRotation = false;
            this.rigidBody.applyOwnerColliderComponent = false;
            const shape = new Laya.CircleShape2D();
            shape.restitution = 1;
            shape.friction = 0.2;
            shape.radius = 80;
            shape.density = 1;
            this.rigidBody.shapes = [shape];
            this.rigidBodyShape = shape; // 保存形状引用
        } else {
            // 如果已经存在刚体，获取其形状信息
            if (this.rigidBody.shapes && this.rigidBody.shapes.length > 0) {
                this.rigidBodyShape = this.rigidBody.shapes[0] as Laya.CircleShape2D;
            }
        }
    }

    // 处理碰撞墙体
    public onWallCollision(): void {
        console.log("墙体碰撞");
        this.effectManager.triggerEffects(EffectTrigger.WALL_HIT);
        this.triggerHit(300); // 碰撞时短暂显示受击状态
    }

    // 处理碰撞友方
    public onAllyCollision(ally: Cha): void {
        console.log("友方碰撞");
        this.effectManager.triggerEffects(EffectTrigger.ALLY_HIT, { target: ally });
    }

    // 处理碰撞敌方
    public onEnemyCollision(enemy: Cha): void {
        console.log("敌方碰撞");
        this.effectManager.triggerEffects(EffectTrigger.ENEMY_HIT, { target: enemy });
        this.triggerHit(400); // 被敌人碰撞时显示受击状态
    }

    // 添加回血文本
    public addHealText(amount: number): void {
        console.log(`添加回血文本: +${amount}`);
        const config = this.textConfig.heal;
        
        // 创建文本节点
        const textNode = new Laya.Text();
        textNode.text = `+${amount}`;
        textNode.fontSize = config.fontSize;
        textNode.color = config.color;
        textNode.stroke = config.strokeWidth;
        textNode.strokeColor = config.strokeColor;
        textNode.align = "center";
        textNode.valign = "middle";
        
        // 设置初始位置（角色中心）
        const worldPos = this.Sprite.localToGlobal(new Laya.Point(this.Sprite.width / 2, this.Sprite.height / 2));
        textNode.pos(worldPos.x - textNode.width / 2, worldPos.y - textNode.height / 2);
        
        // 添加到舞台
        this.Sprite.parent.addChild(textNode);
        
        this.healTexts.push({
            textNode,
            life: config.duration,
            startY: worldPos.y
        });
    }

    // 添加伤害文本
    public addDamageText(value: number, isCrit: boolean): void {
        console.log(`添加伤害文本: ${isCrit ? '暴击!' : ''}${value}`);
        const config = this.textConfig.damage;
        
        // 创建文本节点
        const textNode = new Laya.Text();
        textNode.text = isCrit ? `暴击! ${value}` : `-${value}`;
        textNode.fontSize = config.fontSize;
        textNode.color = isCrit ? config.critColor : config.normalColor;
        textNode.stroke = config.strokeWidth;
        textNode.strokeColor = config.strokeColor;
        textNode.align = "center";
        textNode.valign = "middle";
        
        // 设置初始位置（角色中心）
        const worldPos = this.Sprite.localToGlobal(new Laya.Point(this.Sprite.width / 2, this.Sprite.height / 2));
        textNode.pos(worldPos.x - textNode.width / 2, worldPos.y - textNode.height / 2);
        
        // 添加到舞台
       this.Sprite.parent.addChild(textNode);
        
        this.damageTexts.push({
            textNode,
            life: config.duration,
            startY: worldPos.y
        });
        
        // 受到伤害时触发受击动画
        this.triggerHit(500);
    }

    // 统一更新伤害和回血文本动画
    private updateTexts(): void {
        this.updateDamageTexts();
        this.updateHealTexts();
        this.updateFlip();
        this.drawUI();
    }

    // 更新翻转状态，并在状态改变时重绘UI
    private updateFlip(): void {
        const rigidBody = this.Sprite.getComponent(Laya.RigidBody);
        if (!rigidBody) return;

        const velocity = rigidBody.linearVelocity;
        let isFlipped = false;

        // 根据X速度方向决定是否翻转
        if (velocity.x < 0 && this.lastScaleX > 0) {
            // X速度为负，需要翻转
            this.Sprite.scaleX = -1;
            isFlipped = true;
        } else if (velocity.x > 0 && this.lastScaleX < 0) {
            // X速度为正，需要恢复正常
            this.Sprite.scaleX = 1;
            isFlipped = true;
        }
        // 如果速度为0，保持当前状态

        // 记录新的缩放值
        const newScaleX = this.Sprite.scaleX;
        
        // 当翻转状态发生变化时，强制重绘UI
        if (this.lastScaleX !== newScaleX) {
            this.lastScaleX = newScaleX;
            // 强制重绘UI，确保所有元素正确显示
            this.drawUI();
            console.log(`角色翻转状态改变为: ${newScaleX < 0 ? '翻转' : '正常'}`);
        }
    }

    // 更新伤害文本动画
    private updateDamageTexts(): void {
        if (this.damageTexts.length === 0) return;

        for (let i = this.damageTexts.length - 1; i >= 0; i--) {
            const text = this.damageTexts[i];
            text.life -= Laya.timer.delta;
            
            // 更新文本位置（向上飘动）
            const config = this.textConfig.damage;
            const offsetY = config.speed * (this.textConfig.damage.duration - text.life);
            text.textNode.y = text.startY - offsetY;
            
            // 更新透明度
            text.textNode.alpha = text.life / this.textConfig.damage.duration;

            if (text.life <= 0) {
                text.textNode.removeSelf();
                text.textNode.destroy();
                this.damageTexts.splice(i, 1);
            }
        }
    }

    // 更新回血文本动画
    private updateHealTexts(): void {
        if (this.healTexts.length === 0) return;

        for (let i = this.healTexts.length - 1; i >= 0; i--) {
            const text = this.healTexts[i];
            text.life -= Laya.timer.delta;
            
            // 更新文本位置（向上飘动）
            const config = this.textConfig.heal;
            const offsetY = config.speed * (this.textConfig.heal.duration - text.life);
            text.textNode.y = text.startY - offsetY;
            
            // 更新透明度
            text.textNode.alpha = text.life / this.textConfig.heal.duration;

            if (text.life <= 0) {
                text.textNode.removeSelf();
                text.textNode.destroy();
                this.healTexts.splice(i, 1);
            }
        }
    }

    // 设置位置
    setPosition(x: number, y: number): void {
        this.Sprite.pos(x, y);
    }

    // 设置大小
    setSize(width: number, height: number): void {
        this.Sprite.size(width, height);
        this.drawUI();
    }

    // 设置血量
    setHealth(value: number): void {
        this.health = value;
        this.drawUI();
    }

    // 设置最大血量
    setMaxHealth(value: number): void {
        this.maxHealth = value;
    }

    // 设置护盾值
    setShield(value: number): void {
        this.shield = value;
        this.drawUI();
    }

    // 设置最大护盾值
    setMaxShield(value: number): void {
        this.maxShield = value;
    }

    // 设置攻击力
    setAttack(value: number): void {
        this.attack = value;
    }

    // 设置防御力
    setDefense(value: number): void {
        this.defense = value;
    }

    // 设置角度
    setAngle(value: number): void {
        this.angle = value;
        this.drawUI();
    }

    // 设置力度
    setForce(value: number): void {
        this.force = Math.max(0, Math.min(10000, value));
        this.drawUI();
    }

    // 显示/隐藏瞄准线
    showAimLine(show: boolean): void {
        this.showAim = show;
        this.drawUI(); // 确保UI立即更新
    }

    // 显示/隐藏力度条
    showForceBar(show: boolean): void {
        this.showForce = show;
        this.drawUI(); // 确保UI立即更新
    }

    // 显示/隐藏钢体圆圈
    showRigidBodyCircle(show: boolean): void {
        this.showRigidBody = show;
        this.drawUI(); // 确保UI立即更新
    }

    // 应用力度
    applyForce(): void {
        if (this.force == 0)
            return;
        const rigidBody = this.Sprite.getComponent(Laya.RigidBody);
        if (!rigidBody) return;

        const vx = Math.cos(this.angle) * this.force;
        const vy = Math.sin(this.angle) * this.force;
        rigidBody.linearVelocity = new Laya.Vector2(vx, vy);

        // 应用力时立即更新翻转状态
        if (vx < 0 && this.lastScaleX > 0) {
            this.Sprite.scaleX = -1;
            this.lastScaleX = -1;
        } else if (vx > 0 && this.lastScaleX < 0) {
            this.Sprite.scaleX = 1;
            this.lastScaleX = 1;
        }
        
        // 应用力时切换到移动状态
        this.setState(AnimationState.MOVING);
        console.log("应用力度，切换到移动状态");
    }

    // 检查速度是否接近零
    isVelocityNearZero(threshold: number = 10): boolean {
        const rigidBody = this.Sprite.getComponent(Laya.RigidBody);
        if (!rigidBody) return true;

        const velocity = rigidBody.linearVelocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        const isNearZero = speed < threshold;
        
        // 注意：这里不再直接设置状态，状态切换在updateBaseStateByPhysics中处理
        this.setState(AnimationState.IDLE);
        return isNearZero;
    }

    // 绘制UI
    drawUI(): void {
        this.Sprite.graphics;
        // 1. 遍历命令数组，筛选出所有纹理绘制命令
        const textureCmds: Laya.DrawTextureCmd[] = [];

        // 兼容不同Laya版本的命令数组
        const allCmds = this.Sprite.graphics.cmds;
        let is = false;
        allCmds.forEach(cmd => {
            // 判断是否为纹理绘制命令
            if (cmd instanceof Laya.DrawTextureCmd) {
                is = true;
                this.Sprite.graphics.clear(true, cmd);
            }
        });
        if (!is)
            this.Sprite.graphics.clear();

        // 2. 完全清除所有绘制命令

        const widthRatio = this.Sprite.width / this.originalWidth;

        // 1. 绘制钢体圆圈（新增）
        if (this.showRigidBody) {
            this.drawRigidBodyCircle(widthRatio);
        }

        // 2. 绘制瞄准线
        if (this.showAim) {
            const lineLength = 100 * widthRatio;
            const endX = Math.cos(this.angle) * lineLength + this.Sprite.anchorX * this.Sprite.width;
            const endY = Math.sin(this.angle) * lineLength + this.Sprite.anchorY * this.Sprite.height;
            const lineColor = this.isPlayerControlled ? "#FFFFFF" : "#FF0000";

            this.Sprite.graphics.drawLine(
                this.Sprite.anchorX * this.Sprite.width,
                this.Sprite.anchorY * this.Sprite.height,
                endX,
                endY,
                lineColor,
                3 * widthRatio
            );
            this.Sprite.graphics.drawCircle(endX, endY, 5 * widthRatio, lineColor);
        }

        // 3. 绘制护盾条和血量条
        this.drawShieldAndHealthBar(widthRatio);

        // 4. 绘制力度条
        if (this.showForce) {
            this.drawForceBar(widthRatio);
        }

        // 5. 绘制效果图标（新增）
        this.drawEffectIcons(widthRatio);
        
        // 6. 不再需要绘制文本，因为现在使用独立的文本节点
    }

    // 绘制钢体圆圈（新增方法）
    private drawRigidBodyCircle(widthRatio: number): void {
        if (!this.rigidBodyShape) {
            return;
        }

        // 获取钢体形状的半径
        const radius = this.rigidBodyShape.radius;
        
        // 圆心位置（角色中心点）
        const centerX = this.Sprite.anchorX * this.Sprite.width;
        const centerY = this.Sprite.anchorY * this.Sprite.height;
        
        // 绘制钢体圆圈 - 使用半透明的颜色以便观察
        const circleColor = this.isEnemy ? "#ff000010" : "#ffee0010"; // 半透明绿色（玩家）或红色（敌方）
        
        // 绘制圆圈轮廓
        this.Sprite.graphics.drawCircle(centerX, centerY, radius, circleColor, "#000000", 0);
    }

    // 绘制效果图标
    private drawEffectIcons(widthRatio: number): void {
        const effects = this.effectManager.getEffects();
        const iconSize = 30 * widthRatio;
        const startX = -this.Sprite.width / 4;
        const startY = -this.Sprite.height / 2 - 20 * widthRatio;

        effects.forEach((effect: any, index: number) => {
            const x = startX + (index * (iconSize + 5 * widthRatio));
            const color = effect.data.type === "buff" ? "#4eff4e" :
                effect.data.type === "debuff" ? "#ff5151ff" : "#ffff00";

            // 绘制简单的效果图标
            this.Sprite.graphics.drawCircle(x, startY, iconSize / 2, color);

            // 绘制堆叠层数
            if (effect.data.stacks > 1) {
                this.Sprite.graphics.fillText(
                    effect.data.stacks.toString(),
                    x,
                    startY,
                    `${iconSize}px Arial`,
                    "#000000",
                    "center"
                );
            }
        });
    }

    /**
     * 绘制护盾条和血量条（完全适配翻转状态）
     */
    private drawShieldAndHealthBar(widthRatio: number): void {
        const totalWidth = this.Sprite.width * 0.7; // 血条总宽度
        const height = 15 * this.heightRatio;
        const baseY = -this.Sprite.height * 0.1;
        const isFlipped = this.Sprite.scaleX < 0;

        // 计算基准X坐标（根据翻转调整左右位置）
        const baseX = isFlipped ? 
            (this.Sprite.width - totalWidth*1.2) : // 翻转时：基准点靠右
            (totalWidth / 5); // 正常时：基准点靠左

        // 1. 绘制血条背景（全屏背景，不受翻转影响）
        const bgParams = this.calculateFlippedRectParams(
            baseX, 
            totalWidth, 
            1 // 背景宽度占比100%
        );
        this.Sprite.graphics.drawRect(
            bgParams.x, 
            baseY, 
            bgParams.width, 
            height, 
            "#2e2525ff"
        );

        // 2. 绘制护盾条（适配翻转增长方向）
        if (this.shield > 0) {
            const shieldRatio = this.shield / this.maxShield;
            const shieldParams = this.calculateFlippedRectParams(
                baseX, 
                totalWidth, 
                shieldRatio
            );
            this.Sprite.graphics.drawRect(
                shieldParams.x, 
                baseY, 
                shieldParams.width, 
                height, 
                "#0088FF", 
                "#0088FF"
            );
        }

        // 3. 绘制血量条（核心修复：增长方向随翻转反向）
        var healthColor = "#00FF00";
        if(this.isPlayerControlled){
            healthColor = "#FFFF00"
        }else if(this.isEnemy)
             healthColor = "#FF0000"
        const healthRatio = Math.max(0, Math.min(1, this.health / this.maxHealth));
        const healthParams = this.calculateFlippedRectParams(
            baseX, 
            totalWidth, 
            healthRatio
        );

        this.Sprite.graphics.drawRect(
            healthParams.x, 
            baseY, 
            healthParams.width, 
            height, 
            healthColor
        );
    }

    /**
     * 绘制力度条（支持翻转反向）
     */
    private drawForceBar(widthRatio: number): void {
        const width = 20 * widthRatio;
        const height = this.Sprite.height * 0.7;
        const baseY = -height / 6;
        const isFlipped = this.Sprite.scaleX < 0; // 检测翻转状态

        // 基础X坐标（根据翻转调整左右位置）
        const baseX = isFlipped ?
            (this.Sprite.width - width) : // 翻转时：力度条靠右
            0; // 正常时：力度条靠左

        // 1. 绘制力度条背景（不受翻转影响，仅调整位置）
        this.Sprite.graphics.drawRect(
            baseX,
            baseY + this.Sprite.height * 0.3,
            width,
            height,
            "#5a4b4bff"
        );

        // 2. 绘制力度填充（支持反向）
        const forceRatio = Math.max(0, Math.min(1, this.force / 9000));
        const forceHeight = height * forceRatio;
        const forceColor = this.isPlayerControlled ? "#FFFF00" : "#FF9900";
        // 翻转时：填充方向不变（垂直方向不受横向翻转影响），仅调整X位置
        const forceY = baseY + (this.Sprite.height - forceHeight);

        this.Sprite.graphics.drawRect(
            baseX,
            forceY,
            width,
            forceHeight,
            forceColor,
            forceColor
        );
    }

    /**
     * 计算翻转时矩形绘制的关键参数（适配血条/护盾条/力度条）
     * @param baseX 正常状态下的基准X坐标
     * @param totalWidth 元素总宽度
     * @param fillRatio 填充比例（0-1）
     * @returns 适配翻转的绘制参数
     */
    private calculateFlippedRectParams(
        baseX: number,
        totalWidth: number,
        fillRatio: number
    ): { x: number, width: number } {
        const isFlipped = this.Sprite.scaleX < 0;
        const fillWidth = totalWidth * fillRatio;

        if (isFlipped) {
            // 翻转状态：从右向左增长
            return {
                x: baseX + (totalWidth - fillWidth),
                width: fillWidth
            };
        } else {
            // 正常状态：从左向右增长
            return {
                x: baseX,
                width: fillWidth
            };
        }
    }
    
    // 销毁方法
    destroy(): void {
        Laya.timer.clear(this, this.updateTexts);
        
        // 销毁所有伤害文本节点
        this.damageTexts.forEach(text => {
            text.textNode.removeSelf();
            text.textNode.destroy();
        });
        this.damageTexts = [];
        
        // 销毁所有回血文本节点
        this.healTexts.forEach(text => {
            text.textNode.removeSelf();
            text.textNode.destroy();
        });
        this.healTexts = [];
        
        this.effectManager.clearAllEffects();
        this.Sprite.destroy();
        
        console.log("Cha实例已销毁");
    }
}