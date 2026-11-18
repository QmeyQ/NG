/**
 * Timer.ts 全局静态时间管理器
 * 
 * - now(): number                                         获取可靠时间戳(不受系统时间篡改影响)
 * - start(label?: string): string                         开始/重新指定标记计时，返回标签
 * - invoke(label: string = '0'): number                   获取指定标记距离开始的间隔毫秒数
 * - has(label: string): boolean                           标记是否已起表(invoke 未起表会自起并返回 -1)
 * - setMark(label: string, startAt: number): void         显式写入标记起点(跨端时钟对齐用)
 * - setTimeout(ms: number, func: Function): string        设置抗篡改超时定时器
 * - setInterval(ms: number, func: Function): string       设置抗篡改间隔定时器
 * - clear(id: string): void                               清除指定ID的定时器
 * - calibrate(): Promise<number>                          手动触发时间校准，返回偏移量
 * - destroy(): void                                       销毁所有定时器
 * - getTimers(): Map<string, any>                         获取所有活跃定时器
 * - offset: number                                        当前时间偏移量(毫秒)
 * - minimalUpdateInterval: number = 100                   最小更新时间间隔(毫秒)
 * - maxAllowedJump: number = 5000                         最大允许时间跳变阈值(毫秒)
 * - calibrationInterval: number = 300000                  定期校准间隔(毫秒)
 */

export class Timer {


    // 核心时间基准
    private static coreTime: number = Date.now();
    private static lastSystemTime: number = Date.now();
    private static _offset: number = 0;                     // 时间偏移量
    private static drift: number = 0;                       // 漂移补偿

    // 状态标志
    private static usingNetwork: boolean = false;
    private static networkAvailable: boolean = false;
    private static lastCheckTime: number = 0;

    // 定时器管理
    private static timers: Map<string, any> = new Map();
    private static timerCounter: number = 0;
    private static intervalId: string | null = null;

    // 计时器标记
    private static marks: Record<string, number> = {};

    // 配置参数
    static minimalUpdateInterval: number = 100;
    static maxAllowedJump: number = 5000;
    static calibrationInterval: number = 300000;

    // 时间源
    private static sources: string[] = [
        // 仅保留实测可解析源(suning JSONP 必失败/liangmlk ak 无效)
        'https://ip.ddnspod.com/timestamp'
    ];

    // 初始化
    private static _initialized: boolean = false;
    public static init(): void {
        if (Timer._initialized) return;
        Timer._initialized = true;
        Timer.startTracking();
        //Timer.startPeriodicCalibration();
        console.log('[Timer] 初始化完成，使用本地时间');
    }

    // 核心时间跟踪
    private static startTracking(): void {
        const update = () => {
            const now = Date.now();
            const delta = now - Timer.lastSystemTime;

            if (Math.abs(delta) > Timer.maxAllowedJump) {
                Timer.coreTime += Math.sign(delta) * Math.min(Math.abs(delta), Timer.maxAllowedJump + Timer.drift);
                console.warn(`[Timer] 检测到时间跳变: ${delta}ms，已补偿`);
            } else {
                Timer.coreTime += delta + Timer.drift;
            if (!isFinite(Timer.coreTime)) { Timer.coreTime = Date.now(); Timer.drift = 0; }
            }

            Timer.lastSystemTime = now;
            Laya.timer.once(Timer.minimalUpdateInterval, null, update);
        };
        update();
    }

    /** 获取当前可靠时间戳（毫秒） */
    static now(): number {
        Timer.init();
        const t = Timer.coreTime + Timer._offset;
        return isFinite(t) ? t : Date.now(); // 校准异常回退, 平台计时永不 NaN
    }

    /** 当前时间偏移量 */
    static get offset(): number {
        return Timer._offset;
    }

    // ==================== 计时功能 ====================
    static start(label?: string): string {
        Timer.init();
        if (label === undefined) {
            let i = 0;
            while (Timer.marks[i] !== undefined) i++;
            label = i.toString();
        }
        Timer.marks[label] = Timer.now();
        return label;
    }

    static invoke(label: string = '0'): number {
        Timer.init();
        if (Timer.marks[label] === undefined) {
            Timer.start(label);
            return -1;
        }
        return Timer.now() - Timer.marks[label];
    }

    /**
     * 标记是否已起表。invoke 对未起表的键会【自起并返回 -1】, 调用方把 -1 当成"已过时长"
     * 就会算出比上限还长的剩余时间(PVP 非权威端升格权威后的发球冻结即此坑)。
     */
    static has(label: string): boolean {
        return Timer.marks[label] !== undefined;
    }

    /** 显式写入标记起点(PVP: 权威端是唯一时钟源, 非权威端把本地标记对齐到权威算出的起点) */
    static setMark(label: string, startAt: number): void {
        Timer.init();
        Timer.marks[label] = startAt;
    }

    // ==================== 定时器 ====================
    static setTimeout(ms: number, func: Function): string {
        Timer.init();
        const id = `to-${Timer.timerCounter++}`;
        const target = Timer.now() + ms;

        const check = () => {
            if (!Timer.timers.has(id)) return;
            if (Timer.now() >= target) {
                Timer.timers.delete(id);
                func();
            } else {
                const next = Math.min(100, target - Timer.now());
                Timer.timers.get(id).handle = Laya.timer.once(next, null, check);
            }
        };

        Timer.timers.set(id, {
            type: 'timeout',
            target,
            callback: func,
            handle: Laya.timer.once(Math.min(ms, 100), null, check)
        });
        return id;
    }

    static setInterval(ms: number, func: Function): string {
        Timer.init();
        const id = `iv-${Timer.timerCounter++}`;
        let target = Timer.now() + ms;

        const check = () => {
            if (!Timer.timers.has(id)) return;
            if (Timer.now() >= target) {
                func();
                // func 内可能自杀(回调里 Timer.clear 本 id——鹰眼窗口提示 _stopEagleTip 形态):
                // has 通过后 get 仍可能 undefined, 裸写 .target 即 Uncaught TypeError 卡死
                const rec = Timer.timers.get(id);
                if (!rec) return;
                target = Timer.now() + ms;
                rec.target = target;
            }
            const rec2 = Timer.timers.get(id);
            if (!rec2) return;
            const next = Math.min(100, target - Timer.now());
            rec2.handle = Laya.timer.once(next, null, check);
        };

        Timer.timers.set(id, {
            type: 'interval',
            target,
            interval: ms,
            callback: func,
            handle: Laya.timer.once(Math.min(ms, 100), null, check)
        });
        return id;
    }

    /**
     * 帧循环平替(引擎 frameLoop 的 Timer 版): 每渲染帧回调, 返回 id 供 clear。
     * 实现 = setInterval(16ms)(≈60fps) 走 Timer 自身抗篡改时基驱动, 不直接依赖 Laya.timer.frameLoop。
     */
    static frameLoop(func: Function): string {
        return Timer.setInterval(16, func);
    }

    static clear(id: string): void {
        if (Timer.timers.has(id)) {
            Laya.timer.clear(null, Timer.timers.get(id).handle);
            Timer.timers.delete(id);
        }
    }

    static getTimers(): Map<string, any> {
        return Timer.timers;
    }

    // ==================== 校准 ====================
    private static startPeriodicCalibration(): void {
        Timer.intervalId = Timer.setInterval(Timer.calibrationInterval, () => Timer.calibrate());
        Timer.calibrate(); // 立即首次校准
    }

    static async calibrate(): Promise<number> {
        const localNow = Date.now();
        const localOffset = localNow - Timer.coreTime;
        if (isFinite(localOffset)) Timer._offset = localOffset;

        const networkTime = await Timer.fetchNetworkAverage();
        if (networkTime !== null && isFinite(networkTime) && Math.abs(networkTime - Date.now()) < 86400000) {
            const networkOffset = networkTime - Timer.coreTime;
            const diff = networkOffset - Timer._offset;

            if (Math.abs(diff) > Timer.maxAllowedJump) {
                Timer._offset += diff * 0.2;
                console.warn(`[Timer] 网络偏移过大(${diff.toFixed(2)}ms)，部分调整`);
            } else {
                Timer._offset = networkOffset;
            }

            Timer.usingNetwork = true;
            Timer.networkAvailable = true;
            console.log(`[Timer] 网络校准完成，偏移: ${Timer._offset.toFixed(2)}ms`);
        } else {
            Timer.networkAvailable = false;
            console.log(`[Timer] 网络不可用，使用本地偏移: ${Timer._offset.toFixed(2)}ms`);
        }

        // 计算漂移
        const now = Date.now();
        if (Timer.lastCheckTime > 0) {
            const elapsed = now - Timer.lastCheckTime;
            const systemDrift = (now - Timer.lastSystemTime) - elapsed;
            const nd = (Timer.drift * 0.7 + systemDrift * 0.3) / 1000;
            if (isFinite(nd)) Timer.drift = nd;
        }
        Timer.lastCheckTime = now;

        return Timer._offset;
    }

    private static async fetchNetworkAverage(): Promise<number | null> {
        const results: number[] = [];
        for (const src of Timer.sources) {
            try {
                const t = await Timer.fetchSingle(src);
                if (t !== null) results.push(t);
                if (results.length >= 1) break;
            } catch { /* 忽略单源错误 */ }
        }
        if (results.length === 0) return null;
        const sorted = results.sort((a, b) => a - b);
        const filtered = sorted.slice(1, -1);
        const reliable = filtered.length > 0 ? filtered : sorted;
        return reliable.reduce((a, b) => a + b, 0) / reliable.length;
    }

    private static fetchSingle(url: string): Promise<number | null> {
        return new Promise((resolve) => {
            const start = Date.now();
            const http = new Laya.HttpRequest();
            http.once(Laya.Event.COMPLETE, null, (response: string) => {
                const end = Date.now();
                const rtt = end - start;
                try {
                    const data = JSON.parse(response);
                    let serverTime: number;
                    if (url.includes('SysTime')) {
                        serverTime = new Date(data.sysTime2).getTime();
                    } else if (url.includes('ddnspod')) {
                        serverTime = parseInt(data, 10);
                        if (isFinite(serverTime) && serverTime < 1e12) serverTime *= 1000; // 秒→毫秒
                    } else if (url.includes('liangmlk')) {
                        serverTime = data.timestamp;
                    } else {
                        serverTime = data.timestamp || data.unixtime * 1000 || Date.now();
                    }
                    // 关键修正：以请求开始与结束的中间点作为本地参考，加上服务器时间，再补偿 RTT/2
                    const localMidpoint = start + rtt / 2;
                    const estimatedNetworkTime = serverTime + (localMidpoint - start);
                    resolve(isFinite(estimatedNetworkTime) ? estimatedNetworkTime : null);
                } catch {
                    resolve(null);
                }
            });
            http.once(Laya.Event.ERROR, null, () => resolve(null));
            http.send(url, null, 'get', 'text');
        });
    }

    // ==================== 销毁 ====================
    static destroy(): void {
        Timer.timers.forEach((v, id) => Laya.timer.clear(null, v.handle));
        Timer.timers.clear();
        Timer.marks = {};
        Timer._initialized = false;
        console.log('[Timer] 已销毁');
    }
}

// ==================== TimeManager(实例式可靠计时, 原 g2 工具并入平台共享) ====================
export class TimeManager {
    // 核心时间管理属性
    private coreTime: number = 0; // 内部时间基准，不受系统时间篡改影响
    private timeOffset: number = 0; // 本地时间与网络时间的偏移量
    private timeDrift: number = 0; // 时间漂移补偿值
    private lastSystemTime: number; // 上次记录的系统时间
    private lastCheckTime: number = 0; // 上次时间检查的时间戳

    // 时间源管理
    private usingNetworkTime: boolean = false; // 是否正在使用网络时间
    private networkTimeAvailable: boolean = false; // 网络时间是否可用
    private lastNetworkTime: number = 0; // 上次成功的网络时间

    // 定时器管理
    private activeTimers: Map<string, any> = new Map(); // 存储活跃的定时器
    private timerIdCounter: number = 0; // 定时器ID生成器

    // 配置参数
    private minimalUpdateInterval: number = 100; // 最小更新间隔(ms)
    private maxAllowedJump: number = 5000; // 最大允许时间跳变(ms)，超过此值视为异常
    private calibrationInterval: number = 300000; // 定期校准间隔(5分钟)
    private calibrationAttempts: number = 3; // 校准尝试次数

    // 可靠的时间API源
    private calibrationSources: string[] = [
        // 仅保留实测可解析的源; suning 为 JSONP 必解析失败、liangmlk ak 无效(曾致 offset=NaN)
        'https://ip.ddnspod.com/timestamp'
    ];

    private intervalId: any = null; // 定期校准计时器ID
    private startTime: { [label: string]: number } = {}; // 存储开始时间

    constructor() {
        this.coreTime = Date.now();
        this.lastSystemTime = Date.now();
        
        // 初始化时间跟踪
        this.startTimeTracking();

        // 启动定期校准
        this.startPeriodicCalibration();

        this.log('时间管理器已初始化，使用本地时间');
    }

    // ======================== 核心时间维护 ========================
    /**
     * 启动时间跟踪，持续更新核心时间基准
     */
    private startTimeTracking(): void {
        const updateCoreTime = () => {
            const currentSystemTime = Date.now();
            const systemDelta = currentSystemTime - this.lastSystemTime;

            // 检测时间跳变（向前或向后）
            if (Math.abs(systemDelta) > this.maxAllowedJump) {
                // 时间异常跳变，使用平均漂移补偿而不是直接跟随系统时间
                this.coreTime += Math.sign(systemDelta) * Math.min(
                    Math.abs(systemDelta),
                    this.maxAllowedJump + this.timeDrift
                );
                this.log(`检测到时间异常跳变: ${systemDelta}ms，已进行补偿`, 'warn');
            } else {
                // 正常情况下，核心时间跟随系统时间，但加入漂移补偿
                this.coreTime += systemDelta + (isFinite(this.timeDrift) ? this.timeDrift : 0);
            }
            if (!isFinite(this.coreTime)) { this.coreTime = currentSystemTime; this.timeDrift = 0; }

            this.lastSystemTime = currentSystemTime;
            Laya.timer.once(this.minimalUpdateInterval, this, updateCoreTime);
        };

        updateCoreTime();
    }

    /**
     * 获取当前可靠时间（不受本地时间篡改影响）
     * @returns 毫秒级时间戳
     */
    getCurrentTime(): number {
        // 返回核心时间 + 网络校准偏移; 校准异常(NaN/Infinity)时回退系统时间,
        // 保证计时/单击判定在任何网络环境下都可用(实测校准源返回异常值曾使 offset=NaN → 单击发射失效)
        const t = this.coreTime + this.timeOffset;
        if (isFinite(t)) return t;
        return Date.now();
    }

    /**
     * 记录日志
     * @param message 日志消息
     * @param level 日志级别
     */
    private log(message: string, level: string = 'info'): void {
        console.log(`[TimeManager ${level}] ${message}`);
    }

    // ======================== 计时功能 ========================
    /**
     * 获取计时已过去的时间
     * @param label 计时标签
     * @returns 已过去的毫秒数
     */
    getElapsed(label: string): number {
        if (!this.activeTimers.has(label)) {
            this.log(`计时标签不存在: ${label}`, 'warn');
            return 0;
        }

        const timer = this.activeTimers.get(label);
        const elapsed = this.getCurrentTime() - timer.startTime;
        this.log(`计时器 ${label} 已运行: ${elapsed}ms`);
        return elapsed;
    }

    /**
     * 开始/重新指定标记计时
     * @param label 计时标签
     * @returns 计时标签
     */
    start(label?: string): string {
        if (label === undefined) {
            let v = 0;
            while (this.startTime[v] !== undefined) {
                v++;
            }
            this.startTime[v] = this.getCurrentTime();
            return v.toString();
        }
        
        this.startTime[label] = this.getCurrentTime();
        return label;
    }

    /**
     * 指定标记距离开始的间隔时间
     * @param label 计时标签，默认为'0'
     * @returns 经过的毫秒数
     */
    invoke(label: string = '0'): number {
        if (this.startTime[label] === undefined) {
            this.start(label);           
            return 1;
        }

        let currentTime = this.getCurrentTime();
        let timeDifference = currentTime - this.startTime[label];

        return timeDifference;
    }

    // ======================== 定时器功能 ========================
    /**
     * 增强型setTimeout，抵抗时间篡改
     * @param ms 延迟毫秒数
     * @param func 回调函数
     * @returns 定时器ID
     */
    setTimeout(ms: number, func: Function): string {
        const timerId = `timeout-${this.timerIdCounter++}`;
        const targetTime = this.getCurrentTime() + ms;

        const checkTimeout = () => {
            if (!this.activeTimers.has(timerId)) return;

            if (this.getCurrentTime() >= targetTime) {
                this.activeTimers.delete(timerId);
                this.log(`超时定时器触发: ${timerId}`);
                func();
            } else {
                // 计算下次检查的时间（最多100ms，避免长时间阻塞）
                const nextCheck = Math.min(
                    100,
                    targetTime - this.getCurrentTime()
                );
                this.activeTimers.get(timerId).timeoutId = Laya.timer.once(nextCheck, this, checkTimeout);
            }
        };

        this.activeTimers.set(timerId, {
            type: 'timeout',
            targetTime,
            callback: func,
            timeoutId: Laya.timer.once(Math.min(ms, 100), this, checkTimeout)
        });

        this.log(`设置超时定时器: ${timerId}, 延迟: ${ms}ms`);
        return timerId;
    }

    /**
     * 增强型setInterval，抵抗时间篡改
     * @param ms 间隔毫秒数
     * @param func 回调函数
     * @returns 定时器ID
     */
    setInterval(ms: number, func: Function): string {
        const tempId = `interval-${this.timerIdCounter++}`;
        let targetTime = this.getCurrentTime() + ms;

        const checkInterval = () => {
            if (!this.activeTimers.has(tempId)) return;

            if (this.getCurrentTime() >= targetTime) {
                //this.log(`间隔定时器触发: ${tempId}`);
                func();
                // 计算下一次目标时间（基于当前时间，避免累积误差）
                targetTime = this.getCurrentTime() + ms;
                 if(this.activeTimers.get(tempId)){
                    this.activeTimers.get(tempId).targetTime = targetTime;
                 }
                 
            }

            // 安排下一次检查
            const nextCheck = Math.min(
                100,
                targetTime - this.getCurrentTime()
            );
            if(this.activeTimers.get(tempId)){
                this.activeTimers.get(tempId).timeoutId = Laya.timer.once(nextCheck, this, checkInterval);
            }
        };

        this.activeTimers.set(tempId, {
            type: 'interval',
            targetTime,
            interval: ms,
            callback: func,
            timeoutId: Laya.timer.once(Math.min(ms, 100), this, checkInterval)
        });

        //this.log(`设置间隔定时器: ${tempId}, 间隔: ${ms}ms`);
        return tempId;
    }

    /**
     * 清除定时器
     * @param id 定时器ID
     */
    clear(id: string): void {
        if (this.activeTimers.has(id)) {
            Laya.timer.clear(this, this.activeTimers.get(id).timeoutId);
            this.activeTimers.delete(id);
            // this.log(`清除定时器: ${id}`);
        }
    }

    // ======================== 时间校准 ========================
    /**
     * 启动定期时间校准
     */
    private startPeriodicCalibration(): void {
        this.intervalId = this.setInterval(this.calibrationInterval, () => this.calibrate());
        // 立即进行首次校准
        this.calibrate();
    }

    /**
     * 校准时间（优先使用本地时间，网络时间辅助校准）
     * @returns 校准后的时间偏移量
     */
    async calibrate(): Promise<number> {
        // 首先使用本地时间进行校准
        const localTime = Date.now();
        const localOffset = localTime - this.coreTime;

        // 设置初始偏移为本地时间偏移(仅有限值才写入, 防 NaN 污染)
        if (isFinite(localOffset)) this.timeOffset = localOffset;
        this.usingNetworkTime = false;

        // 尝试使用网络时间进行更精确的校准
        const networkTime = await this.tryNetworkCalibration();

        if (networkTime !== null && isFinite(networkTime) && Math.abs(networkTime - Date.now()) < 86400000) {
            // 网络时间可用且 sane(±24h)，使用网络时间进行精确校准
            const networkOffset = networkTime - this.coreTime;

            // 平滑过渡到网络时间偏移
            const offsetDiff = networkOffset - this.timeOffset;
            if (Math.abs(offsetDiff) > this.maxAllowedJump) {
                // 偏移过大，可能是网络错误，仅部分应用
                this.timeOffset += offsetDiff * 0.2;
                this.log(`网络时间偏移过大(${offsetDiff}ms)，已部分调整`, 'warn');
            } else {
                // 正常偏移，使用网络时间
                this.timeOffset = networkOffset;
            }

            this.usingNetworkTime = true;
            this.networkTimeAvailable = true;
            this.lastNetworkTime = networkTime;
            this.log(`已使用网络时间校准，偏移量: ${this.timeOffset.toFixed(2)}ms`);
        } else {
            // 网络时间不可用，继续使用本地时间
            this.networkTimeAvailable = false;
            this.log(`网络时间不可用，继续使用本地时间，偏移量: ${this.timeOffset.toFixed(2)}ms`);
        }

        // 计算时间漂移（长期系统时钟偏差）
        const now = Date.now();
        if (this.lastCheckTime > 0) {
            const elapsed = now - this.lastCheckTime;
            const systemDrift = (now - this.lastSystemTime) - elapsed;
            const nd = (this.timeDrift * 0.7 + systemDrift * 0.3) / 1000;
            if (isFinite(nd)) this.timeDrift = nd;
        }
        this.lastCheckTime = now;


        return this.timeOffset;
    }

    /**
     * 尝试使用网络时间进行校准
     * @returns 网络时间戳（毫秒）或null（如果失败）
     */
    private async tryNetworkCalibration(): Promise<number | null> {
        const results: number[] = [];

        // 尝试多个时间源
        for (let i = 0; i < this.calibrationSources.length; i++) {
            const source = this.calibrationSources[i];
            try {
                const response = await this.fetchNetworkTime(source);
                if (response !== null) {
                    results.push(response);
                }
            } catch (error:any) {
                this.log(`时间校准源 ${source} 失败: ${error.message}`, 'error');
            }

            // 如果已经有一个成功的结果，可以提前结束
            if (results.length >= 1) break;
        }

        if (results.length === 0) {
            return null;
        }

        // 计算多个源的平均时间，排除异常值
        const sorted = results.sort((a, b) => a - b);
        const filtered = sorted.slice(1, -1); // 去除最高和最低值
        const reliableResults = filtered.length > 0 ? filtered : sorted;

        // 计算平均网络时间
        return reliableResults.reduce((sum, time) => sum + time, 0) / reliableResults.length;
    }

   /**
 * 从网络获取时间
 * @param url 时间API地址
 * @returns 网络时间戳（毫秒）
 */
private async fetchNetworkTime(url: string): Promise<number | null> {
    try {
        const startTime = Date.now();
        
        // 使用正确的Laya HTTP请求方式，不修改原型方法
        return new Promise<number | null>((resolve) => {
            // 创建新的HttpRequest实例（不修改原型）
            const http = new Laya.HttpRequest();
           // http.time = 5000; // 设置超时时间
            //http.responseType = Laya.HttpResponseType.TEXT; // 使用Laya枚举类型
            // 监听完成事件
            http.once(Laya.Event.COMPLETE, this, (response: string) => {
                try {
                    // 解析响应数据
                    const dataObj = JSON.parse(response);
                    const endTime = Date.now();
                    let networkTime: number;
                    
                    // 处理不同API的返回格式
                    if (url.includes('SysTime')) {
                        // 苏宁时间接口格式
                        networkTime = new Date(dataObj.sysTime2).getTime();
                    } else if (url.includes('ddnspod')) {
                        // DDNSPod接口返回纯数字时间戳(秒级, 需归一到毫秒)
                        networkTime = parseInt(dataObj, 10);
                        if (isFinite(networkTime) && networkTime < 1e12) networkTime *= 1000;
                    } else if (url.includes('liangmlk')) {
                        // liangmlk接口格式
                        networkTime = dataObj.timestamp;
                    } else {
                        // 默认解析逻辑
                        networkTime = dataObj.unixtime ? dataObj.unixtime * 1000 :
                                      dataObj.timestamp ? dataObj.timestamp :
                                      Date.now();
                    }
                    
                    // 计算往返延迟并补偿(非有限值视为失败)
                    const roundTripTime = endTime - startTime;
                    const compensated = networkTime + roundTripTime / 2;
                    resolve(isFinite(compensated) ? compensated : null);
                } catch (e) {
                    this.log(`解析时间响应失败: ${(e as Error).message}`, 'error');
                    resolve(null);
                }
            });
            
            // 监听错误事件
            http.once(Laya.Event.ERROR, this, () => {
                this.log(`请求时间接口失败: ${url}`, 'error');
                resolve(null);
            });
            
            // 监听超时事件
            http.once(Laya.Event.ERROR, this, () => {
                this.log(`请求时间接口超时: ${url}`, 'warn');
                resolve(null);
            });
            
            // 发送请求（使用正确的参数顺序）
            http.send(url, null, 'get', 'text');
        });
    } catch (error: any) {
        this.log(`获取网络时间失败 (${url}): ${error.message}`, 'error');
        return null;
    }
}


    // ======================== 销毁方法 ========================
    /**
     * 销毁时间管理器，清理所有定时器
     */
    destroy(): void {
        // 清除所有活跃定时器
        this.activeTimers.forEach((timer, id) => {
            Laya.timer.clear(this, timer.timeoutId);
        });
        this.activeTimers.clear();

        // 清除定期校准
        Laya.timer.clear(this, this.intervalId);

        this.log('时间管理器已销毁');
    }

    /**
     * 获取所有活跃定时器
     * @returns 活跃定时器映射
     */
    getId(): Map<string, any> {
        return this.activeTimers;
    }
}
