/**
 * Timer.ts 全局静态时间管理器
 * 
 * - now(): number                                         获取可靠时间戳(不受系统时间篡改影响)
 * - start(label?: string): string                         开始/重新指定标记计时，返回标签
 * - invoke(label: string = '0'): number                   获取指定标记距离开始的间隔毫秒数
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
        'https://ip.ddnspod.com/timestamp',
        'https://quan.suning.com/getSysTime.do',
        'http://api.liangmlk.cn?ak=xxxx&appid=40'
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
            }

            Timer.lastSystemTime = now;
            Laya.timer.once(Timer.minimalUpdateInterval, null, update);
        };
        update();
    }

    /** 获取当前可靠时间戳（毫秒） */
    static now(): number {
        Timer.init();
        return Timer.coreTime + Timer._offset;
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
            return 1;
        }
        return Timer.now() - Timer.marks[label];
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
                target = Timer.now() + ms;
                Timer.timers.get(id).target = target;
            }
            const next = Math.min(100, target - Timer.now());
            Timer.timers.get(id).handle = Laya.timer.once(next, null, check);
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
        Timer._offset = localOffset;

        const networkTime = await Timer.fetchNetworkAverage();
        if (networkTime !== null) {
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
            Timer.drift = (Timer.drift * 0.7 + systemDrift * 0.3) / 1000;
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
                    } else if (url.includes('liangmlk')) {
                        serverTime = data.timestamp;
                    } else {
                        serverTime = data.timestamp || data.unixtime * 1000 || Date.now();
                    }
                    // 关键修正：以请求开始与结束的中间点作为本地参考，加上服务器时间，再补偿 RTT/2
                    const localMidpoint = start + rtt / 2;
                    const estimatedNetworkTime = serverTime + (localMidpoint - start);
                    resolve(estimatedNetworkTime);
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