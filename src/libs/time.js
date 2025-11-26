/*
time.ts
class TimeManager
coreTime: 核心时间基准（不受本地时间篡改影响）
timeOffset: 本地时间与网络时间的偏移量
timeDrift: 时间漂移补偿值
lastCheckTime: 上次时间检查的时间戳
intervalId: 定期校准计时器ID
minimalUpdateInterval: 最小更新间隔(ms)
maxAllowedJump: 最大允许时间跳变(ms)
startTimer(label：无参默认为递增值) - 开始计时，返回lable
getElapsed(label - 获取计时 elapsed 时间，返回lable
start(label) 开始/重新指定标记计时 返回label
invoke(label = '0')指定标记距离开始的间隔时间number
setTimeout(ms, func) - 增强型定时器，返回id
setInterval(ms, func) - 增强型间隔器,返回id
clear(id) - 清除定时器
calibrate() - 校准时间（与网络时间同步）
getCurrentTime() - 获取当前可靠时间
destroy() - 销毁时间管理器
 */

class TimeManager {
    constructor() {
        // 核心时间管理属性
        this.coreTime = Date.now(); // 内部时间基准，不受系统时间篡改影响
        this.timeOffset = 0; // 本地时间与网络时间的偏移量
        this.timeDrift = 0; // 时间漂移补偿值
        this.lastSystemTime = Date.now(); // 上次记录的系统时间
        this.lastCheckTime = 0; // 上次时间检查的时间戳

        // 时间源管理
        this.usingNetworkTime = false; // 是否正在使用网络时间
        this.networkTimeAvailable = false; // 网络时间是否可用
        this.lastNetworkTime = 0; // 上次成功的网络时间

        // 定时器管理
        this.activeTimers = new Map(); // 存储活跃的定时器
        this.timerIdCounter = 0; // 定时器ID生成器

        // 配置参数
        this.minimalUpdateInterval = 100; // 最小更新间隔(ms)
        this.maxAllowedJump = 5000; // 最大允许时间跳变(ms)，超过此值视为异常
        this.calibrationInterval = 300000; // 定期校准间隔(5分钟)
        this.calibrationAttempts = 3; // 校准尝试次数

        // 可靠的时间API源
        this.calibrationSources = [
            'https://ip.ddnspod.com/timestamp',
            'https://quan.suning.com/getSysTime.do',
            'http://api.liangmlk.cn?ak=xxxx&appid=40'
        ];

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
    startTimeTracking() {
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
            setTimeout(() => updateCoreTime(), this.minimalUpdateInterval);
        };

        updateCoreTime();
    }

    /**
     * 获取当前可靠时间（不受本地时间篡改影响）
     * @returns {number} 毫秒级时间戳
     */
    getCurrentTime() {
        // 返回核心时间 + 网络校准偏移
        return this.coreTime + this.timeOffset;
    }

    /**
     * 记录日志
     * @param {string} message 日志消息
     * @param {string} level 日志级别
     */
    log(message, level = 'info') {
        const event = new CustomEvent('timeManagerLog', {
            detail: { message, level }
        });
        window.dispatchEvent(event);
    }

    // ======================== 计时功能 ========================
    /**
     * 开始计时
     * @param {string|number} label 计时标签（可选）
     * @returns {string|number} 计时标签
     */
    startTimer(label) {
        if (label === undefined) {
            // 自动生成标签
            label = `timer-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        }

        this.activeTimers.set(label, {
            type: 'stopwatch',
            startTime: this.getCurrentTime(),
            callback: null
        });

        this.log(`开始计时: ${label}`);
        return label;
    }

    /**
     * 获取计时已过去的时间
     * @param {string|number} label 计时标签
     * @returns {number} 已过去的毫秒数
     */
    getElapsed(label) {
        if (!this.activeTimers.has(label)) {
            this.log(`计时标签不存在: ${label}`, 'warn');
            return 0;
        }

        const timer = this.activeTimers.get(label);
        const elapsed = this.getCurrentTime() - timer.startTime;
        this.log(`计时器 ${label} 已运行: ${elapsed}ms`);
        return elapsed;
    }

    // ======================== 定时器功能 ========================
    /**
     * 增强型setTimeout，抵抗时间篡改
     * @param {number} ms 延迟毫秒数
     * @param {Function} func 回调函数
     * @returns {string} 定时器ID
     */
    setTimeout(ms, func) {
        var timerId = `timeout-${this.timerIdCounter++}`;
        var targetTime = this.getCurrentTime() + ms;

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
                this.activeTimers.get(timerId).timeoutId = setTimeout(checkTimeout, nextCheck);
            }
        };

        this.activeTimers.set(timerId, {
            type: 'timeout',
            targetTime,
            callback: func,
            timeoutId: setTimeout(checkTimeout, Math.min(ms, 100))
        });

        this.log(`设置超时定时器: ${timerId}, 延迟: ${ms}ms`);
        return timerId;
    }

    /**
     * 增强型setInterval，抵抗时间篡改
     * @param {number} ms 间隔毫秒数
     * @param {Function} func 回调函数
     * @returns {string} 定时器ID
     */
    setInterval(ms, func) {
        const timerId = `interval-${this.timerIdCounter++}`;
        var targetTime = this.getCurrentTime() + ms;

        const checkInterval = () => {
            if (!this.activeTimers.has(timerId)) return;

            if (this.getCurrentTime() >= targetTime) {
                this.log(`间隔定时器触发: ${timerId}`);
                func();
                // 计算下一次目标时间（基于当前时间，避免累积误差）
                targetTime = this.getCurrentTime() + ms;
                if(this.activeTimers.get(timerId)){
                    console.error(this.activeTimers.get(timerId).targetTime, targetTime)
                    this.activeTimers.get(timerId).targetTime = targetTime;
                }
            }

            // 安排下一次检查
            const nextCheck = Math.min(
                100,
                targetTime - this.getCurrentTime()
            );
            this.activeTimers.get(timerId).timeoutId = setTimeout(checkInterval, nextCheck);
        };

        this.activeTimers.set(timerId, {
            type: 'interval',
            targetTime,
            interval: ms,
            callback: func,
            timeoutId: setTimeout(checkInterval, Math.min(ms, 100))
        });

        this.log(`设置间隔定时器: ${timerId}, 间隔: ${ms}ms`);
        return timerId;
    }

    /**
     * 清除定时器
     * @param {string} id 定时器ID
     */
    clear(id) {
        if (this.activeTimers.has(id)) {
            clearTimeout(this.activeTimers.get(id).timeoutId);
            this.activeTimers.delete(id);
            this.log(`清除定时器: ${id}`);
        }
    }

    // ======================== 时间校准 ========================
    /**
     * 启动定期时间校准
     */
    startPeriodicCalibration() {
        this.intervalId = setInterval(() => {
            this.calibrate();
        }, this.calibrationInterval);

        // 立即进行首次校准
        this.calibrate();
    }

    /**
     * 校准时间（优先使用本地时间，网络时间辅助校准）
     * @returns {Promise<number>} 校准后的时间偏移量
     */
    async calibrate() {
        this.log('开始时间校准...');

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

        // 发送校准完成事件
        window.dispatchEvent(new CustomEvent('calibrationComplete', {
            detail: { usingNetworkTime: this.usingNetworkTime }
        }));

        return this.timeOffset;
    }


    start(label) {
        if (this.startTime == undefined) {
            this.startTime = {};
        }
        if (label == undefined) {
            let v = 0;
            while (this.startTime[v] != undefined) {
                v++;
            }
            this.startTime[v] = this.startTime[label];
            return v;
        }
        this.startTime[label] = this.getLocalTime();
        return label;
    }

     invoke(label = '0') {
        if (this.startTime == undefined || this.startTime[label] == undefined) {
            this.start(label);           
            return 1;
        }

        let currentTime = this.getLocalTime();
        let timeDifference = currentTime - this.startTime[label];

        return timeDifference;
    }

     getLocalTime() {
        return new Date().getTime() + this.timeOffset;
    }

    /**
     * 尝试使用网络时间进行校准
     * @returns {Promise<number|null>} 网络时间戳（毫秒）或null（如果失败）
     */
    async tryNetworkCalibration() {
        const results = [];

        // 尝试多个时间源
        for (let i = 0; i < this.calibrationSources.length; i++) {
            const source = this.calibrationSources[i];
            try {
                const response = await this.fetchNetworkTime(source);
                if (response !== null) {
                    results.push(response);
                    // 更新进度条
                    const progress = ((i + 1) / this.calibrationSources.length) * 100;
                    window.dispatchEvent(new CustomEvent('calibrationProgress', {
                        detail: progress
                    }));
                }
            } catch (error) {
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
     * @param {string} url 时间API地址
     * @returns {Promise<number|null>} 网络时间戳（毫秒）
     */
    async fetchNetworkTime(url) {
        try {
            const startTime = Date.now();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP错误! 状态码: ${response.status}`);
            }

            const data = await response.json();
            const endTime = Date.now();
            let networkTime;

            // 处理不同API的返回格式
            if (url.includes('SysTime')) {
                // worldtimeapi.org 格式
                networkTime = new Date(data.sysTime2).getTime();
            } else if (url.includes('ddnspod')) {
                // time.ist 格式
                console.log(data)
                networkTime = data;

            } else if (url.includes('dt.co')) {
                // time.artjoey.com 格式
                networkTime = data.timestamp;
            } else {
                // 默认尝试解析unixtime或timestamp字段
                networkTime = data.unixtime ? data.unixtime * 1000 :
                    data.timestamp ? data.timestamp :
                        Date.now();
            }

            // 计算往返延迟并补偿
            const roundTripTime = endTime - startTime;
            return networkTime + roundTripTime / 2; // 假设延迟均匀分布

        } catch (error) {
            this.log(`获取网络时间失败 (${url}): ${error.message}`, 'error');
            return null;
        }
    }

    // ======================== 销毁方法 ========================
    /**
     * 销毁时间管理器，清理所有定时器
     */
    destroy() {
        // 清除所有活跃定时器
        this.activeTimers.forEach(timer => {
            clearTimeout(timer.timeoutId);
        });
        this.activeTimers.clear();

        // 清除定期校准
        clearInterval(this.intervalId);

        this.log('时间管理器已销毁');
    }

    getId(){
        return this.activeTimers;
    }
}