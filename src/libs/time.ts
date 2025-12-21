/** time.ts
 * - TimeManager()构造
 * - getCurrentTime(): number 获取可靠时间戳(不受系统时间篡改影响)
 * - getElapsed(label: string): number 获取指定标签计时器的已过去毫秒数
 * - start(label?: string): string 开始/重新指定标记计时，label为可选标签
 * - invoke(label: string = '0'): number 获取指定标记距离开始的间隔毫秒数
 * - setTimeout(ms: number, func: Function): string 设置抗篡改超时定时器，ms为毫秒数，func为回调函数
 * - setInterval(ms: number, func: Function): string 设置抗篡改间隔定时器，ms为毫秒数，func为回调函数
 * - clear(id: string): void 清除指定ID的定时器
 * - calibrate(): Promise<number> 手动触发时间校准，返回Promise包含校准后的时间偏移量
 * - destroy(): void 销毁时间管理器，清理所有定时器
 * - getId(): Map<string, any> 获取所有活跃定时器的映射
 * - minimalUpdateInterval: number = 100 最小更新时间间隔(毫秒)
 * - maxAllowedJump: number = 5000 最大允许时间跳变阈值(毫秒)
 * - calibrationInterval: number = 300000 定期校准间隔(毫秒)
 * - calibrationAttempts: number = 3 校准尝试次数
 */

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
        'https://ip.ddnspod.com/timestamp',
        'https://quan.suning.com/getSysTime.do',
        'http://api.liangmlk.cn?ak=xxxx&appid=40'
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
                this.coreTime += systemDelta + this.timeDrift;
            }

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
        // 返回核心时间 + 网络校准偏移
        return this.coreTime + this.timeOffset;
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

        // 设置初始偏移为本地时间偏移
        this.timeOffset = localOffset;
        this.usingNetworkTime = false;

        // 尝试使用网络时间进行更精确的校准
        const networkTime = await this.tryNetworkCalibration();

        if (networkTime !== null) {
            // 网络时间可用，使用网络时间进行精确校准
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
            this.timeDrift = (this.timeDrift * 0.7 + systemDrift * 0.3) / 1000;
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
                        // DDNSPod接口返回纯数字时间戳
                        networkTime = parseInt(dataObj, 10);
                    } else if (url.includes('liangmlk')) {
                        // liangmlk接口格式
                        networkTime = dataObj.timestamp;
                    } else {
                        // 默认解析逻辑
                        networkTime = dataObj.unixtime ? dataObj.unixtime * 1000 :
                                      dataObj.timestamp ? dataObj.timestamp :
                                      Date.now();
                    }
                    
                    // 计算往返延迟并补偿
                    const roundTripTime = endTime - startTime;
                    resolve(networkTime + roundTripTime / 2);
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