/**
 * GameManager - 游戏核心管理器
 * 
 * 使用步骤：
 * 1. GameManager(mainScene, config, touchConfig)
 * 2. setResourceManager(resManager)
 * 3. setCallbacks(callbacks)
 * 4. loadGameResources('res/res.json')
 * 5. createAlly(position, scene, atlas) 或 game.createEnemy(position, scene, atlas)
 * 6. setActiveChar(character)
 * 7. startGame()
 * - GameManager(mainScene, config, touchConfig): 创建游戏实例，mainScene为游戏主场景，config为游戏配置，touchConfig为触控配置
 * - setResourceManager(resManager): 设置资源管理器，resManager为Res类的实例
 * - setCallbacks(callbacks): 设置游戏事件回调，callbacks包含onRoundChange、onDamage等回调函数
 * - loadGameResources(resourceUrl): 加载游戏资源，resourceUrl为res.json文件路径
 * - createAlly(position, scene, atlas): 创建友方角色，position为{x,y}坐标，scene为父容器，atlas为图集资源
 * - createEnemy(position, scene, atlas): 创建敌方角色，参数同上
 * - setActiveChar(char): 设置玩家控制的角色，char为Cha实例
 * - startGame(): 开始游戏
 * - addWall(wall): 添加墙体，wall为Laya.Sprite实例
 * - destroyGame(): 销毁游戏，清理资源
 * - onRoundChange(round): 回合切换时触发，round为'player'或'enemy'
 * - onTimeUpdate(time): 时间更新时触发，time为剩余时间
 * - onDamage(attacker, target, damage, isCrit, type): 造成伤害时触发
 * - onHeal(char, amount): 治疗时触发
 * - onGameOver(winner): 游戏结束时触发，winner为获胜方
 * - onResourceLoaded(): 资源加载完成时触发
 * - onTouchStart(pos): 触摸开始时触发，pos为触摸位置
 * - onTouchEnd(pos, isClick): 触摸结束时触发，isClick表示是否为单击
 * - config: {turnTime, prepTime, baseDmg, shieldRecoverRate, critChance, critMultiplier, stillCheckInterval, healRate}
 * - touchConfig: {clickTimeThreshold, touchMoveThreshold, forceAdjustSensitivity, angleAdjustSensitivity}
 */

import { Res } from "./lib/res";
import { Cha } from "./cha";
import { TimeManager } from "./lib/time";
import { MapManager } from "./lib/mpm";
import { EffectTrigger } from "./EffectManager";

// 类型别名简化
type RoundType = 'player' | 'enemy';
type RoundPhase = 'preparation' | 'action' | 'pre_turn' | 'post_turn';

// 定义MapManager的层级标识
const LAYOUT = {
    PLAYER: 1,   // 玩家角色层级
    ENEMY: 2,    // 敌方角色层级
    GLOBAL: 0,   // 全局对象层级
    WALL: 3      // 墙体层级
};

// 触控配置接口
interface TouchConfig {
    clickTimeThreshold: number;    // 单击时间阈值（毫秒）
    touchMoveThreshold: number;    // 触摸移动阈值
    forceAdjustSensitivity: number; // 力度调节灵敏度
    angleAdjustSensitivity: number; // 角度调节灵敏度
}

export class GameManager {
    // 游戏状态
    private currRound: RoundType = 'player';
    private roundNum: number = 1;
    private isGameOver: boolean = false;
    private roundPhase: RoundPhase = 'preparation';
    private timer: TimeManager = new TimeManager();
    
    // 核心修复：MapManager存储Cha实例而非属性副本
    private mapManager: MapManager;
    // 辅助映射：节点名称 -> Cha实例（快速查找）
    private nodeToChar: Map<string, Cha> = new Map();

    // 游戏配置
    private config: GameConfig = {
        turnTime: 20,
        prepTime: 15,
        baseDmg: 10,
        shieldRecoverRate: 0.1,
        critChance: 0.2,
        critMultiplier: 1.5,
        stillCheckInterval: 500,
        healRate: 0.05
    };

    // 触控配置
    private touchConfig: TouchConfig = {
        clickTimeThreshold: 300,
        touchMoveThreshold: 1,
        forceAdjustSensitivity: 5,
        angleAdjustSensitivity: 0.01
    };

    // 定时器ID
    private roundTimer: string | null = null;
    private prepTimer: string | null = null;
    private stillCheckTimer: string | null = null;
    private remainTime: number = 0;

    // 触控状态
    private isAdjustingForce: boolean = false;
    private isAdjustingAngle: boolean = false;
    private touchStartTime: number = 0;
    private touchStartPos: Laya.Vector2 = new Laya.Vector2();
    private originalAngle: number = 0;
    private originalForce: number = 5000;
    private screenCenterX: number = 0;

    // 当前激活的角色（玩家控制的主角）
    private activeChar: Cha | null = null;

    // 资源管理器引用
    private resManager: Res = null;

    // 游戏事件回调
    private callbacks: GameCallbacks = {
        onRoundChange: () => {},
        onTimeUpdate: () => {},
        onDamage: () => {},
        onHeal: () => {},
        onGameOver: () => {},
        onRoundStart: () => {},
        onPhaseChange: () => {},
        onEffectApplied: () => {},
        onAnimationStateChange: () => {},
        onResourceLoaded: () => {}, // 新增：资源加载完成回调
        onTouchStart: () => {},     // 新增：触摸开始回调
        onTouchEnd: () => {}        // 新增：触摸结束回调
    };

    constructor(mainScene: Laya.Sprite, customConfig?: Partial<GameConfig>, touchConfig?: Partial<TouchConfig>) {
        // 初始化MapManager
        this.mapManager = new MapManager(100);
        
        // 设置屏幕中心
        this.screenCenterX = Laya.stage.width / 2;
        
        // 合并配置
        if (customConfig) {
            this.config = { ...this.config, ...customConfig };
        }
        if (touchConfig) {
            this.touchConfig = { ...this.touchConfig, ...touchConfig };
        }

        Res.init();
        Res.url("");
        Res.downRes();
        
        
        // 设置事件监听
        this.setupTouchEvents();
    }

    /** 设置资源管理器 */
    public setResourceManager(resManager: any): void {
        this.resManager = resManager;
    }

    /** 设置游戏回调 */
    public setCallbacks(cb: Partial<GameCallbacks>): void {
        this.callbacks = { ...this.callbacks, ...cb };
    }

    /** 设置激活角色 */
    public setActiveChar(char: Cha): void {
        this.activeChar = char;
        char.isPlayerControlled = true;
    }

    /** 添加角色到MapManager */
    public addCha(char: Cha, isEnemy: boolean = false): void {
        const id = this.genCharId();
        char.id = id;
        char.isEnemy = isEnemy;
        
        // 初始化被动效果
        char.initPassives();

        // 设置角色节点名称，确保唯一性
        this.nodeToChar.set(char.Sprite.name, char);

        // 添加到MapManager
        this.mapManager.add(char, isEnemy ? LAYOUT.ENEMY : LAYOUT.PLAYER);

        // 绑定碰撞事件
        this.bindCharCollision(char);
        
        // 设置初始动画状态
        char.setState('idle' as any);
    }
    
    /** 添加墙体 */
    public addWall(wall: Laya.Sprite): void {
        this.mapManager.add(wall, LAYOUT.WALL);
    }

    /** 通过节点名称或节点实例获取角色 */
    public getChar(node: string | Laya.Sprite): Cha | null {
        // 如果是字符串则直接使用，否则获取节点的name属性
        const nodeName = typeof node === 'string' ? node : node.name;
        return this.nodeToChar.get(nodeName);
    }

    /** 开始游戏 */
    public startGame(): void {
        this.isGameOver = false;
        this.roundNum = 1;
        this.startRound('player');
    }

    /** 加载游戏资源 */
    public loadGameResources(resourceUrl: string): void {
        if (!Res.storage) {
            console.error("资源管理器未设置");
            return;
        }

        Res.url(resourceUrl, true);
        Res.downRes();
        
        // 监听资源加载进度
        this.monitorResourceLoading();
    }

    /** 创建敌人角色 */
    public createEnemy(position: {x: number, y: number}, area2D: Laya.Sprite, atlas?: Laya.AtlasResource): Cha {
        const enemySprite = new Laya.Sprite();
        enemySprite.name = `enemy_${Date.now()}`;
        enemySprite.anchorX = 0.5;
        enemySprite.anchorY = 0.5;
        enemySprite.pos(position.x, position.y);
        area2D.addChild(enemySprite);

        const enemyCha = new Cha(enemySprite, true);
        enemyCha.attack = 20;
        enemyCha.defense = 10;
        enemyCha.setPosition(position.x, position.y);
        enemyCha.setSize(200, 200);
        enemyCha.setHealth(80);
        enemyCha.setMaxHealth(80);

        // 设置图集（如果提供）
        if (atlas) {
            enemyCha.setAtlas(atlas);
        }

        this.addCha(enemyCha, true);
        return enemyCha;
    }

    /** 创建友方角色 */
    public createAlly(position: {x: number, y: number}, area2D: Laya.Sprite, atlas?: Laya.AtlasResource): Cha {
        const allySprite = new Laya.Sprite();
        allySprite.name = `ally_${Date.now()}`;
        allySprite.anchorX = 0.5;
        allySprite.anchorY = 0.5;
        allySprite.pos(position.x, position.y);
        area2D.addChild(allySprite);

        const allyCha = new Cha(allySprite, false);
        allyCha.attack = 15;
        allyCha.defense = 8;
        allyCha.setPosition(position.x, position.y);
        allyCha.setSize(200, 200);
        allyCha.setHealth(70);
        allyCha.setMaxHealth(70);

        // 设置图集（如果提供）
        if (atlas) {
            allyCha.setAtlas(atlas);
        }

        this.addCha(allyCha, false);
        return allyCha;
    }

    // ------------------------------ 触控事件集成 ------------------------------
    
    /** 设置触控事件监听 */
    private setupTouchEvents(): void {
        Laya.stage.on(Laya.Event.MOUSE_DOWN, this, this.onTouchStart);
        Laya.stage.on(Laya.Event.MOUSE_UP, this, this.onTouchEnd);
        Laya.stage.on(Laya.Event.MOUSE_OUT, this, this.onTouchEnd);
        Laya.stage.on(Laya.Event.MOUSE_MOVE, this, this.onTouchMove);
    }

    /** 触摸开始事件处理 */
    private onTouchStart(e: Laya.Event): void {
        const mousePos = new Laya.Vector2(Laya.stage.mouseX, Laya.stage.mouseY);
        
        // 记录触摸开始时间和位置
        this.timer.start('click');
        this.touchStartPos.x = mousePos.x;
        this.touchStartPos.y = mousePos.y;
        
        // 只有当有激活角色、速度接近0且为玩家回合时才允许操作
        if (this.activeChar && this.activeChar.isVelocityNearZero(10) && 
            this.currRound === 'player' && this.roundPhase === 'pre_turn') {
            
            // 记录原始角度和力度
            this.originalAngle = this.activeChar.angle;
            this.originalForce = this.activeChar.force;
            
            // 判断是左侧还是右侧点击
            if (mousePos.x < this.screenCenterX) {
                // 左侧点击 - 进入力度调整模式
                this.isAdjustingForce = true;
                this.activeChar.showForceBar(true);
            } else {
                // 右侧点击 - 进入角度微调模式
                this.isAdjustingAngle = true;
            }
            
            // 显示瞄准线
            this.activeChar.showAimLine(true);
            
            this.callbacks.onTouchStart(mousePos);
        }
    }

    /** 触摸结束事件处理 */
    private onTouchEnd(e: Laya.Event): void {
        const mousePos = new Laya.Vector2(Laya.stage.mouseX, Laya.stage.mouseY);
        
        // 计算移动距离
        const moveDistance = Math.sqrt(
            Math.pow(mousePos.x - this.touchStartPos.x, 2) +
            Math.pow(mousePos.y - this.touchStartPos.y, 2)
        );
        
        // 判断是否为单击（时间短且移动距离小）
        const isClick = this.timer.invoke('click') < this.touchConfig.clickTimeThreshold && 
                      moveDistance < this.touchConfig.touchMoveThreshold;
        
        // 处理单击结束准备阶段
        if (isClick && this.activeChar && this.currRound === 'player' && this.roundPhase === 'pre_turn') {
            this.activeChar.setAngle(this.originalAngle);
            this.activeChar.setForce(this.originalForce);
            this.endPrepPhase();
            
            // 隐藏绘制线和力度条
            this.activeChar.showAimLine(false);
            this.activeChar.showForceBar(false);
        }
        
        // 重置所有状态
        this.isAdjustingForce = false;
        this.isAdjustingAngle = false;
        
        this.callbacks.onTouchEnd(mousePos, isClick);
    }

    /** 触摸移动事件处理 */
    private onTouchMove(e: Laya.Event): void {
        const mousePos = new Laya.Vector2(Laya.stage.mouseX, Laya.stage.mouseY);
        
        // 计算移动距离
        const moveDistance = Math.sqrt(
            Math.pow(mousePos.x - this.touchStartPos.x, 2) +
            Math.pow(mousePos.y - this.touchStartPos.y, 2)
        );
        
        // 如果移动距离超过阈值，则认为是滑动而不是单击
        if (moveDistance > this.touchConfig.touchMoveThreshold && this.activeChar) {
            if (this.isAdjustingForce) {
                this.handleForceAdjustment(mousePos);
            } else if (this.isAdjustingAngle) {
                this.handleAngleAdjustment(mousePos);
            }
        }
    }

    /** 处理力度调节 */
    private handleForceAdjustment(mousePos: Laya.Vector2): void {
        if (!this.activeChar) return;

        const deltaY = mousePos.y - this.touchStartPos.y;
        const newForce = this.activeChar.force - deltaY * this.touchConfig.forceAdjustSensitivity;
        this.activeChar.setForce(newForce);

        // 更新起始位置以实现连续调节
        this.touchStartPos.x = mousePos.x;
        this.touchStartPos.y = mousePos.y;
    }

    /** 处理角度微调 */
    private handleAngleAdjustment(mousePos: Laya.Vector2): void {
        if (!this.activeChar) return;

        const deltaX = mousePos.x - this.touchStartPos.x;
        const newAngle = this.activeChar.angle + deltaX * this.touchConfig.angleAdjustSensitivity;
        this.activeChar.setAngle(newAngle);

        // 更新起始位置以实现连续调节
        this.touchStartPos.x = mousePos.x;
        this.touchStartPos.y = mousePos.y;
    }

        // ------------------------------ 资源加载优化 ------------------------------
    
    /** 监控资源加载进度 */
    private monitorResourceLoading(): void {
        if (!this.resManager) return;

        const checkInterval = this.timer.setInterval(100, () => {
            const process = Res.getProcess();
            
            if (process && process.count > 0) {
                if (process.process === process.count) {
                    // 资源加载完成
                    for (const key in Res.getList()) {
                        if (key === "v") continue;

                        console.log(`🎬 创建资源[${key}]`);
                        Res.load( "role",key,
                            (atlas: Laya.AtlasResource) => {

                            });
                    }
                    this.timer.clear(checkInterval);
                    this.onResourcesLoaded();
                }
            }
        });
    }

    /** 资源加载完成处理 */
    private onResourcesLoaded(): void {
        console.log("所有资源加载完成");
        this.callbacks.onResourceLoaded();
        
        // 可以在这里创建默认的角色或执行其他初始化逻辑
    }


    // ------------------------------ 原有游戏逻辑（保持核心逻辑不变） ------------------------------
    
    /** 结束当前回合 */
    public endCurrentRound(): void {
        this.clearAllTimers();
        
        // 进入回合结束阶段
        this.roundPhase = 'post_turn';
        this.callbacks.onPhaseChange('post_turn');
        
        // 触发回合结束效果
        this.triggerPostTurnEffects();
        
        // 恢复护盾和回血
        this.recoverShields();
        this.healCharacters();
        
        // 检查游戏是否结束
        if (this.isGameOver) return;
        
        // 准备下一回合
        const nextRound = this.currRound === 'player' ? 'enemy' : 'player';
        this.roundNum++;
        this.startRound(nextRound);
    }

    /** 开始新回合 */
    private startRound(round: RoundType): void {
        this.currRound = round;
        this.roundPhase = 'pre_turn';
        this.remainTime = this.config.prepTime;

        this.callbacks.onRoundStart(round);
        this.callbacks.onRoundChange(round);
        this.callbacks.onPhaseChange('pre_turn');

        // 隐藏所有UI
        this.hideAllForceUI();

        // 触发回合前效果
        this.triggerPreTurnEffects();
        
        // 准备当前回合的角色
        if (round === 'player') {
            this.prepPlayerRound();
            this.startPrepTimer();
        } else {
            this.prepEnemyRound();
            this.endPrepPhase();
        }
    }

    /** 结束准备阶段 */
    public endPrepPhase(): void {
        this.clearTimer(this.prepTimer);
        this.prepTimer = null;

        // 隐藏所有UI
        this.hideAllForceUI();

        // 应用所有角色的力
        this.applyAllForces();
        
        // 进入行动阶段
        this.enterActionPhase();
    }

    // ... 其余原有方法保持不变（handleCollision、calculateCollisionDamage、applyDamage等）

    // ------------------------------ 工具方法 ------------------------------
    
    /** 销毁游戏 */
    public destroyGame(): void {
        // 移除事件监听
        Laya.stage.off(Laya.Event.MOUSE_DOWN, this, this.onTouchStart);
        Laya.stage.off(Laya.Event.MOUSE_UP, this, this.onTouchEnd);
        Laya.stage.off(Laya.Event.MOUSE_OUT, this, this.onTouchEnd);
        Laya.stage.off(Laya.Event.MOUSE_MOVE, this, this.onTouchMove);
        
        this.clearAllTimers();
        this.timer.destroy();
        this.mapManager.clearAll();
        this.nodeToChar.clear();
        
        if (this.activeChar) {
            this.activeChar.destroy();
            this.activeChar = null;
        }
    }

    private genCharId(): string {
        return `char_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }

    private bindCharCollision(char: Cha): void {
        const oldScript = char.Sprite.getComponent(Laya.Script);
        if (oldScript) oldScript.destroy();

        const collisionScript = new Laya.Script();
        collisionScript.onTriggerEnter = (other) => {
            this.handleCollision(char, other);
        };
        char.Sprite.addComponentInstance(collisionScript);
    }

    // ... 其他私有方法保持不变

    /** 获取当前回合类型 */
    public getCurrRound(): RoundType {
        return this.currRound;
    }

    /** 获取当前回合阶段 */
    public getCurrPhase(): RoundPhase {
        return this.roundPhase;
    }

    /** 获取回合数 */
    public getRoundNum(): number {
        return this.roundNum;
    }

    /** 获取剩余时间 */
    public getRemainTime(): number {
        return this.remainTime;
    }

    /** 获取角色数量 */
    public getCharCount(isEnemy: boolean = false): number {
        const layout = isEnemy ? LAYOUT.ENEMY : LAYOUT.PLAYER;
        const chars = this.mapManager.get(layout);
        return chars.size;
    }

    /** 游戏是否结束 */
    public isFinished(): boolean {
        return this.isGameOver;
    }

    // ------------------------------ 核心回合逻辑 ------------------------------
    
    /** 触发回合开始前效果 */
    private triggerPreTurnEffects(): void {
        const currentChars = this.mapManager.get(
            this.currRound === 'player' ? LAYOUT.PLAYER : LAYOUT.ENEMY
        );
        
        currentChars.forEach((char: Cha) => {
            if (char.health > 0) {
                char.effectManager.onTurnStart();
                // 清除特殊状态（冻结、迟缓等）
                char.clearSpecialStates();
            }
        });
    }
    
    /** 触发回合结束后效果 */
    private triggerPostTurnEffects(): void {
        const currentChars = this.mapManager.get(
            this.currRound === 'player' ? LAYOUT.PLAYER : LAYOUT.ENEMY
        );
        
        currentChars.forEach((char: Cha) => {
            if (char.health > 0) {
                char.effectManager.onTurnEnd();
            }
        });
    }

    /** 玩家回合准备 */
    private prepPlayerRound(): void {
        // 只显示玩家UI，不设置任何力
        const playerChars = this.mapManager.get();
        playerChars.forEach((char: Cha) => {
            if (char.health > 0) {
                char.showAimLine(true);
                char.showForceBar(true);
                char.showRigidBodyCircle(true);
                char.drawUI();
                // 设置准备阶段动画状态
                char.setState('idle' as any);
            }
        });
    }

    /** AI回合准备 */
    private prepEnemyRound(): void {
        // 计算敌方角色的力和方向（但不立即应用）
        const enemyChars = this.mapManager.get(LAYOUT.ENEMY);
        const playerTargets = Array.from(this.mapManager.get(LAYOUT.PLAYER).values())
            .filter((p: Cha) => p.health > 0)
            .sort((a: Cha, b: Cha) => a.health - b.health);

        if (playerTargets.length === 0) return;

        enemyChars.forEach((enemy: Cha) => {
            if (enemy.health <= 0) return;
            const target = playerTargets[0];

            // 直接访问Cha实例的节点属性
            const dx = target.Sprite.x - enemy.Sprite.x;
            const dy = target.Sprite.y - enemy.Sprite.y;
            const angle = Math.atan2(dy, dx);
            const distance = Math.sqrt(dx * dx + dy * dy);
            const force = this.calcEnemyForce(distance);

            enemy.setAngle(angle);
            enemy.setForce(force);
            
            // 显示敌方UI
            enemy.showAimLine(true);
            enemy.drawUI();
            // 设置准备阶段动画状态
            enemy.setState('idle' as any);
        });
    }

    /** 隐藏所有角色的力度条和方向线 */
    private hideAllForceUI(): void {
        // 隐藏玩家UI
        const playerChars = this.mapManager.get();
        playerChars.forEach((char: Cha) => {
            char.showAimLine(false);
            char.showForceBar(false);
            char.showRigidBodyCircle(false);
            char.drawUI();
        });
    }

    /** 计算AI角色的攻击力度 */
    private calcEnemyForce(distance: number): number {
        const baseForce = Math.min(10000, Math.max(1000, distance * 45));
        const randomFactor = 1 + (Math.random() * 0.1 - 0.05);
        return Math.floor(baseForce * randomFactor);
    }

    /** 进入行动阶段 */
    private enterActionPhase(): void {
        this.roundPhase = 'action';
        this.remainTime = this.config.turnTime;

        this.callbacks.onPhaseChange('action');
        this.callbacks.onTimeUpdate(this.remainTime);

        this.startRoundTimer();
        this.startStillCheck();
    }

    /** 应用所有存活角色已设置的力 */
    private applyAllForces(): void {
        // 只应用当前回合角色的力
        const layout = this.currRound === 'player' ? LAYOUT.PLAYER : LAYOUT.ENEMY;
        const chars = this.mapManager.get(layout);
        
        chars.forEach((char: Cha) => {
            if (char.health > 0 && char.force > 0) {
                char.applyForce();
                char.setForce(0);
                // 应用力后设置为移动状态
                char.setState('moving' as any);
            }
        });
    }

    // ------------------------------ 伤害与回血逻辑 ------------------------------
    /** 处理角色碰撞 */
    private handleCollision(attacker: Cha, other: Laya.PhysicsColliderComponent | Laya.ColliderBase): void {
        const targetNode = other.owner as Laya.Sprite;
        const targetChar = this.getChar(targetNode.name);
        const isWall = other instanceof Laya.StaticCollider;
        
        // 处理墙体碰撞
        if (isWall) {
            attacker.onWallCollision();
            // 墙体碰撞触发受击动画
            attacker.triggerHit(300);
            return;
        }
        
        // 过滤无效碰撞
        if (!targetChar || !other || attacker.id === targetChar.id || 
            attacker.health <= 0 || targetChar.health <= 0) {
            return;
        }
        
        // 处理角色间碰撞
        attacker.effectManager.triggerEffects(EffectTrigger.COLLISION, { target: targetChar });
        targetChar.effectManager.triggerEffects(EffectTrigger.COLLISION, { target: attacker });
        
        // 区分友方和敌方碰撞
        if (attacker.isEnemy || targetChar.isEnemy) {
            attacker.onEnemyCollision(targetChar);
            targetChar.onEnemyCollision(attacker);
            // 计算攻击者和防御者的伤害
            this.calculateCollisionDamage(attacker, targetChar);
            this.calculateCollisionDamage(targetChar, attacker);
        } else {
            attacker.onAllyCollision(targetChar);
            targetChar.onAllyCollision(attacker);
        }

        // 通过ID字典序比较，确保单次碰撞仅处理一次
        if (attacker.id.localeCompare(targetChar.id) > 0) {
            return;
        }

        this.checkGameOver();
    }

    /** 计算碰撞双方的伤害 */
    private calculateCollisionDamage(attacker: Cha, defender: Cha): void {
        // 判定当前攻击者是否在本回合
        const isAttackerInTurn = (attacker.isEnemy && this.currRound === 'enemy') || 
                                (!attacker.isEnemy && this.currRound === 'player');

        if (isAttackerInTurn) {
            // 攻击者在本回合，造成攻击伤害
            const attackDmg = this.calcAttackDamage(attacker);
            
            // 触发攻击动画
            attacker.triggerAttack(500); // 攻击动画持续500ms
            
            // 创建伤害上下文并触发攻击效果
            const damageContext = {
                damage: attackDmg.dmg,
                isCrit: attackDmg.isCrit,
                target: defender
            };

            const deContext = {
                damage: defender.defense,
                isCrit: false,
                target: attacker
            };
            
            attacker.effectManager.triggerEffects(EffectTrigger.ATTACK, damageContext);
            defender.effectManager.triggerEffects(EffectTrigger.DAMAGED, deContext);
            
            this.applyDamage(attacker, defender, {
                dmg: damageContext.damage,
                isCrit: damageContext.isCrit
            }, 'attack');

            this.applyDamage(defender, attacker, {
                dmg: deContext.damage,
                isCrit: deContext.isCrit
            }, 'counter');
        }
    }

    /** 计算攻击者造成的伤害 */
    private calcAttackDamage(attacker: Cha): { dmg: number, isCrit: boolean } {
        let dmg = attacker.attack;
        const isCrit = Math.random() < this.config.critChance;
        if (isCrit) {
            dmg = Math.floor(dmg * this.config.critMultiplier);
        }
        return { dmg: Math.max(1, dmg), isCrit };
    }

    /** 计算防御方的反伤 */
    private calcCounterDamage(defender: Cha): { dmg: number, isCrit: boolean } {
        const dmg = Math.max(1, defender.defense);
        return { dmg, isCrit: false };
    }

    /** 应用伤害 */
    private applyDamage(attacker: Cha, target: Cha, damage: { dmg: number, isCrit: boolean }, damageType: 'attack' | 'counter'): void {
        if (damage.dmg <= 0) return;
        
        let remainDmg = damage.dmg;
        target.addDamageText(remainDmg, damage.isCrit);

        // 先扣护盾
        if (target.shield > 0) {
            const shieldAbsorb = Math.min(remainDmg, target.shield);
            target.shield -= shieldAbsorb;
            remainDmg -= shieldAbsorb;
        }

        // 剩余伤害扣血
        if (remainDmg > 0) {
            target.health = Math.max(0, target.health - remainDmg);
        }

        target.drawUI();
        this.callbacks.onDamage(attacker, target, damage.dmg, damage.isCrit, damageType);

        // 触发受击动画（只在受到伤害时触发）
        if (damage.dmg > 0) {
            target.triggerHit(400);
        }

        // 移除死亡角色
        if (target.health <= 0) {
            this.removeChar(target);
        }
    }

    /** 回合结束时所有存活角色回血 */
    private healCharacters(): void {
        const allChars = this.mapManager.get();
        allChars.forEach((char: Cha) => {
            if (char.health <= 0 || char.health >= char.maxHealth) {
                return;
            }

            // 计算回血量（最大血量的5%）
            const healAmount = Math.floor(char.maxHealth * this.config.healRate);
            const prevHealth = char.health;
            char.health = Math.min(char.maxHealth, char.health + healAmount);

            // 显示回血文本
            if (char.health > prevHealth) {
                char.addHealText(healAmount);
                this.callbacks.onHeal(char, healAmount);
                
                // 触发回血效果
                char.effectManager.triggerEffects(EffectTrigger.HEALED, { amount: healAmount });
            }

            char.drawUI();
        });
    }

    // ------------------------------ 动画状态管理 ------------------------------
    /** 触发特殊状态效果 */
    public triggerSpecialState(char: Cha, stateType: 'frozen' | 'slowed', duration?: number): void {
        switch (stateType) {
            case 'frozen':
                char.triggerFrozen(duration);
                break;
            case 'slowed':
                char.triggerSlowed(duration);
                break;
        }
        
        this.callbacks.onAnimationStateChange(char, stateType);
    }

    /** 更新所有角色的动画状态（在每帧中调用） */
    public updateAnimationStates(): void {
        const allChars = this.mapManager.get();
        allChars.forEach((char: Cha) => {
            if (char.health > 0) {
                // 自动检测速度并更新动画状态
                // 这个功能已经在Cha类的updateAnimationState中实现
                // 这里主要是为了确保GameManager知道状态变化
                const currentState = char.getCurrentState();
                
                // 如果角色静止且当前不是特殊状态，确保是静止状态
                if (char.isVelocityNearZero(10) && 
                    currentState !== 'frozen' && 
                    currentState !== 'slowed' &&
                    currentState !== 'hit' &&
                    currentState !== 'attack') {
                    char.setState('idle' as any);
                }
            }
        });
    }

    // ------------------------------ 辅助逻辑 ------------------------------
    /** 移除角色 */
    private removeChar(char: Cha): void {
        this.nodeToChar.delete(char.Sprite.name);
        this.mapManager.removeObject(char);
        char.destroy();
    }

    /** 回合结束时恢复所有存活角色的护盾 */
    private recoverShields(): void {
        const allChars = this.mapManager.get();
        allChars.forEach((char: Cha) => {
            if (char.health <= 0) return;
            char.shield = Math.min(
                char.maxShield,
                char.shield + Math.floor(char.maxShield * this.config.shieldRecoverRate)
            );
            char.drawUI();
        });
    }

    /** 检查所有角色是否静止 */
    private checkAllStill(): void {
        const allChars = this.mapManager.get();
        const allStill = Array.from(allChars.values()).every((char: Cha) => 
            char.health <= 0 || char.isVelocityNearZero(5)
        );
        if (allStill) {
            // 所有角色静止时，更新动画状态为静止
            allChars.forEach((char: Cha) => {
                if (char.health > 0 && char.getCurrentState() === 'moving') {
                    char.setState('idle' as any);
                }
            });
            
            this.endCurrentRound();
        }
    }

    /** 检查游戏是否结束 */
    private checkGameOver(): void {
        const playerCount = this.mapManager.get(LAYOUT.PLAYER).size;
        const enemyCount = this.mapManager.get(LAYOUT.ENEMY).size;

        if (playerCount === 0) {
            this.isGameOver = true;
            this.callbacks.onGameOver('enemy');
        } else if (enemyCount === 0) {
            this.isGameOver = true;
            this.callbacks.onGameOver('player');
        }
    }

    // ------------------------------ 定时器管理 ------------------------------
    private startPrepTimer(): void {
        this.clearTimer(this.prepTimer);
        this.prepTimer = this.timer.setInterval(1000, () => {
            this.remainTime--;
            this.callbacks.onTimeUpdate(this.remainTime);
            if (this.remainTime <= 0) {
                this.endPrepPhase();
            }
        });
    }

    private startRoundTimer(): void {
        this.clearTimer(this.roundTimer);
        this.roundTimer = this.timer.setInterval(1000, () => {
            this.remainTime--;
            this.callbacks.onTimeUpdate(this.remainTime);
            
            // 每帧更新动画状态
            this.updateAnimationStates();
            
            if (this.remainTime <= 0) {
                this.endCurrentRound();
            }
        });
    }

    private startStillCheck(): void {
        this.clearTimer(this.stillCheckTimer);
        this.stillCheckTimer = this.timer.setInterval(
            this.config.stillCheckInterval,
            () => this.checkAllStill()
        );
    }

    private clearTimer(timerId: string | null): void {
        if (timerId) {
            this.timer.clear(timerId);
        }
    }

    private clearAllTimers(): void {
        this.clearTimer(this.prepTimer);
        this.clearTimer(this.roundTimer);
        this.clearTimer(this.stillCheckTimer);
        this.prepTimer = this.roundTimer = this.stillCheckTimer = null;
    }


}

// ------------------------------ 接口定义 ------------------------------
interface GameConfig {
    turnTime: number;
    prepTime: number;
    baseDmg: number;
    shieldRecoverRate: number;
    critChance: number;
    critMultiplier: number;
    stillCheckInterval: number;
    healRate: number;
}

interface GameCallbacks {
    onRoundChange: (round: RoundType) => void;
    onTimeUpdate: (time: number) => void;
    onDamage: (attacker: Cha, target: Cha, dmg: number, isCrit: boolean, damageType: 'attack' | 'counter') => void;
    onHeal: (char: Cha, amount: number) => void;
    onGameOver: (winner: RoundType) => void;
    onRoundStart: (round: RoundType) => void;
    onPhaseChange: (phase: RoundPhase) => void;
    onEffectApplied: (char: Cha, effectName: string) => void;
    onAnimationStateChange: (char: Cha, state: string) => void;
    onResourceLoaded: () => void; // 新增：资源加载完成
    onTouchStart: (pos: Laya.Vector2) => void; // 新增：触摸开始
    onTouchEnd: (pos: Laya.Vector2, isClick: boolean) => void; // 新增：触摸结束
}