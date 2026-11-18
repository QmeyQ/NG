/**
 * 1. new EffectManager(character)
 * 2. new DamageShieldEffect(amount, duration)
 * 3. effectManager.addEffect(effect)
 * 4. effectManager.triggerEffects(triggerType, context)
 * - EffectManager(owner): 创建效果管理器，owner为拥有该管理器的角色实例
 * - addEffect(effect): 添加效果，effect为Effect实例
 * - removeEffect(effectId): 移除指定ID的效果
 * - triggerEffects(trigger, context): 触发指定类型的效果，trigger为EffectTrigger枚举，context为触发上下文
 * - onTurnStart(): 处理回合开始时的效果
 * - onTurnEnd(): 处理回合结束时的效果
 * - getEffects(): 获取所有效果
 * - getEffectsByType(type): 获取指定类型的效果，type为EffectType枚举
 * - clearAllEffects(): 清除所有效果
 * 
 * - Effect(data): 创建效果，data为EffectData配置对象
 * - trigger(source, target, context): 触发效果，source为效果来源，target为效果目标，context为触发上下文
 * - isExpired(): 检查效果是否已结束
 * - reduceDuration(amount): 减少效果持续时间
 * - addStacks(amount): 增加堆叠层数
 * 
 * - EffectData: {id, type, name, description, durationType, duration, priority, triggers, params, stackable, stacks}
 * 
 * - EffectType: BUFF(正面效果), DEBUFF(负面效果), SPECIAL(特殊效果)
 * - EffectDurationType: TURNS(回合数), TIMES(触发次数), PERMANENT(永久效果)
 * - EffectTrigger: TURN_START(回合开始), TURN_END(回合结束), COLLISION(碰撞), ATTACK(攻击), DAMAGED(受击), HEALED(治疗), WALL_HIT(撞墙), ALLY_HIT(友方碰撞), ENEMY_HIT(敌方碰撞)
 * - EffectPriority: LOW(1), NORMAL(2), HIGH(3), CRITICAL(4) - 数值越高优先级越高
 * 
 * - DamageShieldEffect(amount, duration): 伤害护盾效果，吸收指定量伤害
 * - AttackBoostEffect(boostPercent, duration): 攻击提升效果，按百分比提升攻击力
 * - WallCollisionAttackEffect(boostPercent): 撞墙攻击提升效果，撞墙后下次攻击提升
 * - EnemyCollisionSpeedBoostEffect(duration): 敌方碰撞速度提升效果，碰撞后速度翻倍
 */

export class EffectManager {
    
    private effects: Effect[] = [];
    private passiveEffects: Effect[] = []; // 专门存储被动效果
    private activeEffects: Effect[] = [];  // 专门存储主动效果
    
    constructor(private owner: any) {}
    
    /** 添加效果 */
    addEffect(effect: Effect): void {
        // 检查是否可叠加
        const existingEffect = this.effects.find(e => 
            e.data.name === effect.data.name && e.data.stackable
        );
        
        if (existingEffect) {
            existingEffect.addStacks(effect.data.stacks);
        } else {
            this.effects.push(effect);
            // 按优先级排序
            this.effects.sort((a, b) => b.data.priority - a.data.priority);
        }
    }
    
    /** 移除效果 */
    removeEffect(effectId: string): void {
        this.effects = this.effects.filter(e => e.data.id !== effectId);
    }
    
    /** 触发指定类型的效果 */
    triggerEffects(trigger: EffectTrigger, context: Record<string, any> = {}): void {
        
        // 先触发被动效果（优先级更高）
        const passiveToTrigger = this.passiveEffects.filter(e => 
            e.data.triggers.indexOf(trigger) !==-1 && !e.isExpired()
        );
        
        // 再触发主动效果
        const activeToTrigger = this.activeEffects.filter(e => 
            e.data.triggers.indexOf(trigger) !==-1 && !e.isExpired()
        );
        
        // 合并并按优先级排序所有要触发的效果
        const allEffects = [...passiveToTrigger, ...activeToTrigger]
            .sort((a, b) => b.data.priority - a.data.priority);
        
        // 添加触发类型到上下文
        context.trigger = trigger;
        
        for (const effect of allEffects) {
            const shouldConsume = effect.trigger(this.owner, context.target || this.owner, context);
            
            // 如果是次数型效果且需要消耗，减少次数
            if (shouldConsume && effect.data.durationType === EffectDurationType.TIMES) {
                effect.reduceDuration(1);
            }
        }
        
        // 移除已过期的效果
        this.cleanupExpiredEffects();
    }
    
    /** 处理回合结束时的效果 */
    onTurnEnd(): void {
        this.triggerEffects(EffectTrigger.TURN_END);
        
        // 减少所有回合型效果的持续时间
        this.effects.forEach(effect => {
            if (effect.data.durationType === EffectDurationType.TURNS) {
                effect.reduceDuration(1);
            }
        });
        
        this.cleanupExpiredEffects();
    }
    
    /** 处理回合开始时的效果 */
    onTurnStart(): void {
        this.triggerEffects(EffectTrigger.TURN_START);
        this.cleanupExpiredEffects();
    }
    
    /** 清理过期效果 */
    private cleanupExpiredEffects(): void {
        this.effects = this.effects.filter(e => !e.isExpired());
    }
    
    /** 获取所有效果 */
    getEffects(): Effect[] {
        return [...this.effects];
    }
    
    /** 获取指定类型的效果 */
    getEffectsByType(type: EffectType): Effect[] {
        return this.effects.filter(e => e.data.type === type);
    }
    
    /** 清除所有效果 */
    clearAllEffects(): void {
        this.effects = [];
    }
}


// Effect.ts
export enum EffectType {
    // 效果类型
    BUFF = "buff",       // 正面效果
    DEBUFF = "debuff",   // 负面效果
    SPECIAL = "special"  // 特殊效果
}

export enum EffectDurationType {
    // 效果持续类型
    TURNS = "turns",     // 按回合数
    TIMES = "times",     // 按触发次数
    PERMANENT = "permanent" // 永久效果
}

export enum EffectTrigger {
    // 效果触发时机
    TURN_START = "turn_start",
    TURN_END = "turn_end",
    COLLISION = "collision",
    ATTACK = "attack",
    DAMAGED = "damaged",
    HEALED = "healed",
    WALL_HIT = "wall_hit",
    ALLY_HIT = "ally_hit",
    ENEMY_HIT = "enemy_hit"
}

export enum EffectPriority {
    // 效果优先级（数值越高越先处理）
    LOW = 1,
    NORMAL = 2,
    HIGH = 3,
    CRITICAL = 4
}

export interface EffectData {
    id: string;
    type: EffectType;
    name: string;
    description: string;
    durationType: EffectDurationType;
    duration: number; // 回合数或次数
    priority: EffectPriority;
    triggers: EffectTrigger[];
    // 效果参数（根据不同效果类型有不同参数）
    params: Record<string, any>;
    // 效果是否可叠加
    stackable: boolean;
    // 当前堆叠层数
    stacks: number;
}

export class Effect {
    public data: EffectData;
    
    constructor(data: Partial<EffectData>) {
        this.data = {
            id: data.id || `effect_${Date.now()}`,
            type: data.type || EffectType.SPECIAL,
            name: data.name || "Unnamed Effect",
            description: data.description || "",
            durationType: data.durationType || EffectDurationType.TURNS,
            duration: data.duration || 1,
            priority: data.priority || EffectPriority.NORMAL,
            triggers: data.triggers || [],
            params: data.params || {},
            stackable: data.stackable || false,
            stacks: data.stacks || 1
        };
    }
    
    /**
     * 触发效果
     * @param source 效果来源
     * @param target 效果目标
     * @param context 触发上下文
     * @returns 是否消耗效果次数
     */
    trigger(source: any, target: any, context: Record<string, any>): boolean {
        // 子类实现具体效果逻辑
        return true;
    }
    
    /** 检查效果是否已结束 */
    isExpired(): boolean {
        return this.data.duration <= 0 && 
               this.data.durationType !== EffectDurationType.PERMANENT;
    }
    
    /** 减少效果持续时间 */
    reduceDuration(amount: number = 1): void {
        if (this.data.durationType !== EffectDurationType.PERMANENT) {
            this.data.duration = Math.max(0, this.data.duration - amount);
        }
    }
    
    /** 增加堆叠层数 */
    addStacks(amount: number = 1): void {
        if (this.data.stackable) {
            this.data.stacks += amount;
        }
    }
}

// 具体效果实现示例
export class DamageShieldEffect extends Effect {
    constructor(amount: number, duration: number) {
        super({
            type: EffectType.BUFF,
            name: "Damage Shield",
            description: `吸收${amount}点伤害`,
            durationType: EffectDurationType.TIMES,
            duration: 1,
            triggers: [EffectTrigger.DAMAGED],
            params: { amount },
            priority: EffectPriority.HIGH
        });
    }
    
    trigger(source: any, target: any, context: { damage: number }): boolean {
        const damageToAbsorb = Math.min(context.damage, this.data.params.amount);
        context.damage -= damageToAbsorb;
        
        // 显示吸收效果
        target.addDamageText(-damageToAbsorb, false); // 使用负数值表示吸收
        
        return true; // 消耗一次效果
    }
}

export class AttackBoostEffect extends Effect {
    constructor(boostPercent: number, duration: number) {
        super({
            type: EffectType.BUFF,
            name: "Attack Boost",
            description: `攻击力提升${boostPercent}%`,
            durationType: EffectDurationType.TURNS,
            duration,
            triggers: [EffectTrigger.ATTACK],
            params: { boostPercent },
            priority: EffectPriority.NORMAL
        });
    }
    
    trigger(source: any, target: any, context: { damage: number }): boolean {
        const boost = 1 + (this.data.params.boostPercent / 100);
        context.damage = Math.floor(context.damage * boost);
        return false; // 不消耗效果次数（每回合持续生效）
    }
}

export class WallCollisionAttackEffect extends Effect {
    constructor(boostPercent: number) {
        super({
            type: EffectType.BUFF,
            name: "Wall Rage",
            description: "碰撞墙后攻击力提升",
            durationType: EffectDurationType.TURNS,
            duration: 1,
            triggers: [EffectTrigger.WALL_HIT, EffectTrigger.ATTACK],
            params: { boostPercent, active: false },
            priority: EffectPriority.NORMAL
        });
    }
    
    trigger(source: any, target: any, context: any): boolean {
        if (context.trigger === EffectTrigger.WALL_HIT) {
            this.data.params.active = true;
            return false;
        }
        
        if (context.trigger === EffectTrigger.ATTACK && this.data.params.active) {
            const boost = 1 + (this.data.params.boostPercent / 100);
            context.damage = Math.floor(context.damage * boost);
            return false;
        }
        
        return false;
    }
}

/** 碰撞敌方速度翻倍效果 */
export class EnemyCollisionSpeedBoostEffect extends Effect {
    private originalLinearDamping: number = 0; // 记录原始线性阻尼（影响速度衰减）
    private speedMultiplier: number = 2; // 速度翻倍倍数

    constructor(duration: number = 3000) { // 默认持续3秒
        super({
            type: EffectType.BUFF,
            name: "Enemy Collision Speed Boost",
            description: "碰撞敌方后速度翻倍，持续3秒",
            durationType: EffectDurationType.TURNS, // 按时间持续（此处用TURNS暂代时间，实际通过定时器处理）
            duration: 10, // 
            priority: EffectPriority.NORMAL,
            triggers: [EffectTrigger.ENEMY_HIT],
            params: { 
                active: false,
                duration,
                startTime: 0
            },
            stackable: false
        });
    }

    /** 触发效果 */
    trigger(source: any, target: any, context: Record<string, any> = {}): boolean {
        console.log(context.trigger)
        // 碰撞敌方时激活效果
        if (context.trigger === EffectTrigger.ENEMY_HIT) {
            // 记录原始线性阻尼（阻尼越小，速度保持越久）
            source.Sprite.rigidBody.linearVelocity = new Laya.Vector2(source.Sprite.rigidBody.linearVelocity.x * 2, source.Sprite.rigidBody.linearVelocity.y * 2)
            source.addDamageText("速度翻倍!", false); // 显示效果提示
            return true;
        }
        return true;
    }
}