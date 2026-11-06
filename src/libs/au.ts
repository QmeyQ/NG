/**
 * Au - 静态音频管理器
 * 基于 Res 加载音频，使用 MPM 管理事件，支持分层音量控制
 */
import { Res } from "./res";
import { MPM } from "./mpm"; // 假定 MPM 已导出
import { ToneEng, Syn, TONE_NAMES, mapTone } from "./tone";
import { Timer } from "./time";

/** 电子乐播放参数: type=音色 fx=效果器链 vol=音量dB */
export type ToneOpts = { type?: string; vol?: number; fx?: string[] };

export class Au {
    // 缓存已加载的 Sound
    private static _sounds: Map<string, any> = new Map();
    // 加载中的 Promise
    private static _loading: Map<string, Promise<any>> = new Map();
    // 播放中的通道信息：channel -> { key, lay, baseVol }
    private static _channels: Map<Laya.SoundChannel, { key: string; lay: string }> = new Map();
    // 层级音量倍率 (lay -> 0~1)
    private static _layVolumes: Map<string, number> = new Map([['0', 1]]);
    // 事件管理器
    private static _mpm: MPM = new MPM();

    // ---------- 总开关(menu 设置页 au/aue 复选框控制) ----------
    /** 音乐开关(背景乐 mid/midN/cgen), false 时停当前曲 */
    private static _musicOn: boolean = true;
    /** 音效开关(tap 按键音/play 资源音效) */
    private static _sfxOn: boolean = true;

    /** 音乐总开关: 关=立即停当前曲(dispose synth); 关→开=自动恢复背景乐循环 */
    static setMusic(on: boolean): void {
        const was = Au._musicOn;
        Au._musicOn = on;
        if (on) {
            if (!was && Au._bgmKind) Au.bgmPlayRich(Au._bgmKind);
            return;
        }
        Au.bgmStop();

        if (Au._synth) {
            Au._synth.dispose();
            Au._synth = null;
            Au._synthFx = "";
            Au._schedEnd = 0;
        }
        Au._bgmSynths.forEach(s => s.dispose());
        Au._bgmSynths.clear();
        if (Au._rsHeart) {
            Timer.clear(Au._rsHeart);
            Au._rsHeart = null;
        }
    }

    /** 音效总开关: false 后 tap/play 全静默(已在播的短音效自然衰减完) */
    static setSfx(on: boolean): void {
        Au._sfxOn = on;
    }

    // ---------- 加载（重载） ----------
    /**
     * 加载单个音效
     * @param key 音效标识
     * @param resPath Res 资源路径
     * @returns Promise<Laya.Sound>
     */
    static load(key: string, resPath: string): Promise<any>;

    /**
     * 批量加载音效
     * @param map 键值对 { key: resPath, ... }
     * @param onProgress 进度回调 (loaded, total)
     * @returns Promise<void>
     */
    static load(map: Record<string, string>, onProgress?: (loaded: number, total: number) => void): Promise<void>;

    static load(
        arg1: string | Record<string, string>,
        arg2?: string | ((loaded: number, total: number) => void)
    ): Promise<any | void> {
        // 单个加载
        if (typeof arg1 === 'string' && typeof arg2 === 'string') {
            const key = arg1;
            const resPath = arg2;
            if (Au._sounds.has(key)) {
                return Promise.resolve(Au._sounds.get(key)!);
            }
            if (Au._loading.has(key)) {
                return Au._loading.get(key)!;
            }
            const promise = Res.get(resPath, 'auto')
                .then((sound: any) => {
                    Au._sounds.set(key, sound);
                    Au._loading.delete(key);
                    return sound;
                })
                .catch((err) => {
                    Au._loading.delete(key);
                    Au._mpm.emit('err', key, err);
                    throw err;
                });
            Au._loading.set(key, promise);
            return promise;
        }

        // 批量加载
        if (typeof arg1 === 'object') {
            const map = arg1;
            const onProgress = typeof arg2 === 'function' ? arg2 : undefined;
            const keys = Object.keys(map);
            const total = keys.length;
            let loaded = 0;
            const promises = keys.map((key) =>
                Au.load(key, map[key]) // 复用单个加载
                    .then(() => {
                        loaded++;
                        onProgress?.(loaded, total);
                    })
                    .catch(() => { }) // 单个失败不中断整体
            );
            return Promise.all(promises).then(() => { });
        }

        throw new Error('无效参数');
    }

    // ---------- 播放 ----------
    /**
     * 播放音效
     * @param key 音效标识
     * @param vol 音量 (0~100)，默认 10
     * @param lay 层级标识，用于分组音量控制，默认 '0'
     * @param loop 是否循环，默认 false
     * @param sta 起始播放位置（秒），默认 0
     */
    static play(key: string, vol: number = 10, lay: string = '0', loop: boolean = false, sta: number = 0): void {
        if (!Au._sfxOn) return;
        if (!Au._sounds.get(key)) {
            Au._mpm.emit('err', key, new Error('音效未加载'));
            return;
        }

        const handler = Laya.Handler.create(Au, () => {
            // 播放结束（非循环模式）
            Au._mpm.emit('finish', key);
            // 清理通道记录
            for (const [ch, info] of Au._channels) {
                if (info.key === key && info.lay === lay) {
                    // 注意：可能有多个相同 key 同时播放，需要精确匹配通道，但这里无法直接关联，用简单方式：移除所有该 key+lay 的通道（但可能有多个）
                    // 更准确：在回调中通过闭包记录 channel，但此处无法获取。我们使用另一种方式：在播放时保存 handler 的引用？简化：不精确移除，但在 setVol 时不会影响已停止的通道
                }
            }
            // 从 _channels 中移除已停止的通道（遍历删除）
            for (const [ch, info] of Au._channels) {
                // 检查 channel 是否已停止（isPlaying 为 false）
                if (ch.isStopped) {
                    Au._channels.delete(ch);
                }
            }
        });
        var channel = Laya.SoundManager.playSound(Au._sounds.get(key), loop ? 0 : 1, handler, 0);
        if (!channel) {
            Au._mpm.emit('err', key, new Error('播放失败'));
            return;
        }

        // WebAudio AudioParam 不接受 NaN / Infinity。音量可能来自球与角色距离，
        // 一旦任一位置分量无效，Vector3.distance 会返回 NaN 并一路传到这里。
        const numericVol = Number(vol);
        const safeVol = Number.isFinite(numericVol)
            ? Math.max(0, Math.min(100, numericVol))
            : 0;
        try {
            channel.volume = safeVol / 100;
        } catch (e) {
            console.warn(`[Au] 设置音效音量失败 key=${key}, vol=${String(vol)}`, e);
        }

        // 设置起始位置：同样拦截非有限值，避免异常参数污染音频通道。
        const numericSta = Number(sta);
        if (Number.isFinite(numericSta) && numericSta > 0) {
            channel.startTime = numericSta;
        }

        // 触发播放事件
        Au._mpm.emit('play', key);
    }

    // ---------- 音量控制 ----------
    /**
     * 设置指定层级的音量倍率（影响该层所有正在播放及后续播放的音效）
     * @param vol 0~100 的音量值，内部归一化到 0~1
     * @param lay 层级标识，默认 '0'
     */
    static setVol(vol: number, lay: string = '0'): void {
        const numericVol = Number(vol);
        const normalized = Number.isFinite(numericVol)
            ? Math.max(0, Math.min(1, numericVol / 100))
            : 0;
        Au._layVolumes.set(lay, normalized);

        // 更新正在播放的该层音效音量
        // for (const [channel, info] of Au._channels) {
        //     if (info.lay === lay) {
        //         const finalVol = Math.max(0, Math.min(1, info.channel.volume * normalized));
        //         channel.volume = finalVol;
        //     }
        // }
    }

    // ---------- 事件管理 (基于 MPM) ----------
    /**
     * 注册事件监听
     * @param event 事件名 'play' | 'finish' | 'err'
     * @param callback 回调函数，参数为 (key, ...)
     */
    static on(event: 'play' | 'finish' | 'err', callback: (key: string, ...args: any[]) => void): void {
        Au._mpm.on(event, callback);
    }

    /**
     * 移除事件监听
     * @param event 事件名
     * @param callback 要移除的回调（不传则移除该事件所有回调）
     */
    static off(event: 'play' | 'finish' | 'err', callback?: (key: string, ...args: any[]) => void): void {
        if (callback) {
            Au._mpm.off(event, callback);
        } else {
            Au._mpm.unon(event);
        }
    }

    /** 完全销毁，释放所有资源 */
    static destroy(): void {
        Au.bgmStop();
        Au.clear();
        Au._sounds.clear();
        Au._layVolumes.clear();
        Au._mpm.unon(); // 清除所有事件
        if (Au._synth) { Au._synth.dispose(); Au._synth = null; Au._synthFx = ""; Au._schedEnd = 0; }
        if (Au._tapSynth) { Au._tapSynth.dispose(); Au._tapSynth = null; Au._tapEnd = 0; }
        
        // 销毁多轨背景乐资源
        Au._bgmSynths.forEach(s => s.dispose());
        Au._bgmSynths.clear();
        if (Au._rsHeart) { Timer.clear(Au._rsHeart); Au._rsHeart = null; }
        Au._bgmKind = null;
    }

    // ---------- 电子乐 (自研双端合成引擎 tone.ts: 网页/微信通用, 乐器化音色+效果器) ----------

    /** 当前合成器实例(单例, 音色/fx 变更时重建) */
    private static _synth: Syn | null = null;
    private static _synthFx = "";
    /** 按键音专用合成器(固定拨弦独立实例, 与背景乐 _synth 解耦互不影响) */
    private static _tapSynth: Syn | null = null;
    /** _tapSynth 已调度的末尾绝对时间(连点时顺延起点, 防完全重叠爆音) */
    private static _tapEnd: number = 0;
    /** _synth 已调度的末尾绝对时间(新曲起点早于此 → 时钟冻结/上曲未播完, releaseAll 换曲) */
    private static _schedEnd: number = 0;

    // 多轨背景乐合成器池 (键: 音色名, 每轨一 Syn)
    private static _bgmSynths: Map<string, Syn> = new Map();
    // 流式无限背景乐: 心跳定时器 id(500ms, Timer.setInterval 驱动)
    private static _rsHeart: any = null;
    /** 当前背景乐场景类型("main"|"match"|null): setMusic 关→开时按此恢复 */
    private static _bgmKind: string | null = null;

    // ---- 流式无限随机背景乐状态(跨小节延续, 永不重样) ----
    /** 已排小节序号(无限递增, 0 起) */
    private static _rsBeat: number = 0;
    /** WebAudio 时轴已排终点(秒): 保证未来 RS_AHEAD 秒音符始终就绪 */
    private static _rsCursor: number = 0;
    /** 当前和声走向(每和弦 2 小节, 每 16 小节概率换新) */
    private static _rsProg: string[] = [];
    /** lead 游走状态: 上音索引(0~13)与大跳回归方向 */
    private static _rsPrev: number = 7;
    private static _rsBack: number = 0;
    /** 前瞻缓冲(秒): 心跳可停摆 RS_AHEAD-心跳周期 而不断流(后台/掉帧免疫) */
    private static readonly RS_AHEAD: number = 12;

    /** 可选音色表(自研引擎音色 + 旧 Tone.js 名兼容映射, mid/midN/cgen 的 opts.type 传其中之一) */
    static readonly TONES: string[] = TONE_NAMES;
    /** 默认音色: pluck 拨弦 */
    private static readonly DEF_TONE: string = "pluck";

    /** 音符表: C2~B5 共 48 个半音 */
    private static _notes: string[] = (() => {
        const arr: string[] = [];
        const ns = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        for (let o = 2; o <= 5; o++) for (const n of ns) arr.push(n + o);
        return arr;
    })();

    /** 节奏/停顿表 8 档 */
    private static _durs: string[] = ["32n", "16n", "8n", "8n.", "4n", "4n.", "2n", "2n."];

    /**
     * 播放电子乐(双端通用: 网页/微信小游戏)
     * @param str 乐谱字符串: 两两一组, 偶数位字符取余 48 定音符, 奇数位字符取余 8 定节奏
     * @param t 0=音符+时值连奏 triggerAttackRelease(note, dur) / 1=音符(8n)+其后停顿
     * @param opts {type?: 音色(pluck/piano/bass/kick... 或旧 Tone 名), vol?: 音量 dB, fx?: 效果器链 ["reverb","delay","dist","chorus","trem"]}
     * @returns 曲目总时长(秒, 供循环续播调度)
     */
    static mid(str: string, t: number = 0, opts?: ToneOpts, startTime?: number): number {
        if (!Au._musicOn) return 0;
        if (!ToneEng.ins()) return 0;
        return Au._midPlay(str, t, opts, startTime);
    }

    /**
     * 按键音: C5→E5 大三度上行双拨弦(独立实例), 清脆有物理感的"嗒"声, 全局按键点击反馈
     * 独立于背景乐合成器——背景乐任意换音色不会被按键音 dispose 销毁
     */
    static tap(): void {
        if (!Au._sfxOn) return;
        const eng = ToneEng.ins();
        if (!eng) return;
        try {
            if (!Au._tapSynth || Au._tapSynth.disposed) {
                Au._tapSynth = eng.mkSyn("pluck", { vol: 4 });
                Au._tapEnd = 0;
            }
            // 起点顺延: 连点拿到相同时间会完全重叠爆音, 10ms 级顺延听感无差
            const t0 = Math.max(eng.now() + 0.02, Au._tapEnd + 0.01);
            Au._tapSynth.triggerAttackRelease("C5", "32n", t0);
            Au._tapSynth.triggerAttackRelease("E5", "32n", t0 + 0.07);
            Au._tapEnd = t0 + 0.07;
        } catch (e) { }
    }

    /** 倒计时专用音 synth(独立实例, 与按键音区分——倒计时不能用按钮音) */
    private static _cdSynth: Syn | null = null;
    /** _cdSynth 已调度的末尾绝对时间(顺延防重叠爆音) */
    private static _cdEnd: number = 0;

    /**
     * 倒计时专用音(用户规格: 必须重新设计, 不能用按钮音效; 只在发球阶段最后 3 秒响):
     * 每秒单音"哔"——A5 短促(8n)时钟感; 最后 1 秒(final)升八度 A6 + 更短(16n) + 音量更
     * 大, "时间快到"的紧迫感。低音区起 A4→A5→A6(倒计时段 sec=3,2,1)可再分层,
     * 当前取统一 A5(秒间隔 1s 音感更均匀), final 用 A6 尖锐收尾。
     */
    static cd(final: boolean = false): void {
        if (!Au._sfxOn) return;
        const eng = ToneEng.ins();
        if (!eng) return;
        try {
            if (!Au._cdSynth || Au._cdSynth.disposed) {
                Au._cdSynth = eng.mkSyn("pluck", { vol: 5 });
                Au._cdEnd = 0;
            }
            const t0 = Math.max(eng.now() + 0.02, Au._cdEnd + 0.01);
            if (final) {
                // 最后一秒: A6 高八度短促双击(哔-哔), 紧迫收尾
                Au._cdSynth.triggerAttackRelease("A6", "16n", t0);
                Au._cdSynth.triggerAttackRelease("A6", "16n", t0 + 0.09);
                Au._cdEnd = t0 + 0.09;
            } else {
                // 常规秒: A5 单音"哔"(8n), 时钟倒计时感
                Au._cdSynth.triggerAttackRelease("A5", "8n", t0);
                Au._cdEnd = t0 + 0.25;
            }
        } catch (e) { }
    }

    /**
     * 手势解锁 AudioContext(网页自动播放策略): 需在用户手势栈内调用。
     * 幂等, 在"必然会点击的地方"(隐私勾选框/背景板等)显式调用, 避免网页端静音;
     * 微信端由引擎 wx.onTouchStart 持续 resume 兜底。
     */
    static unlock(): void {
        const eng = ToneEng.ins();
        if (eng) eng.resume();
    }

    private static _midPlay(str: string, t: number, opts?: ToneOpts, startTime?: number): number {
        const notes = Au._notes;
        const durs = Au._durs;
        const items: { note: string; dur: string }[] = [];
        for (let i = 0; i + 1 < str.length; i += 2) {
            items.push({
                note: notes[parseInt(str[i], 36) % notes.length],
                dur: durs[parseInt(str[i + 1], 36) % durs.length],
            });
        }
        return Au._midSchedule(items, t, opts, startTime);
    }

    /**
     * 播放电子乐(原生音符名格式)
     */
    static midN(str: string, t: number = 0, opts?: ToneOpts, startTime?: number): number {
        if (!Au._musicOn) return 0;
        if (!ToneEng.ins()) return 0;
        const items: { note: string; dur: string }[] = [];
        for (const tok of str.trim().split(/\s+/)) {
            const seg = tok.split(":");
            const note = seg[0];
            if (!/^([A-Ga-g][#b]?\d)(\+[A-Ga-g][#b]?\d)*$/.test(note)) continue;
            const dur = seg[1] || "4n";
            items.push({ note, dur });
        }
        return Au._midSchedule(items, t, opts, startTime);
    }

    /** 统一调度核心: 合成器单例管理 + 事件按绝对时间调度(起点 +0.1s), suspended 期间 now() 不前进; 返回曲长秒 */
    private static _midSchedule(items: { note: string; dur: string }[], t: number, opts?: ToneOpts, startTime?: number): number {
        const eng = ToneEng.ins();
        if (!eng) return 0;
        
        let type = opts?.type || Au.DEF_TONE;
        if (Au.TONES.indexOf(type) < 0) {
            console.warn("[Au] 未知音色: " + type + ", 回退 " + Au.DEF_TONE);
            type = Au.DEF_TONE;
        }
        const fx = opts?.fx;
        const fxKey = fx ? fx.join(",") : "";
        
        if (Au._synth && (Au._synth.type !== mapTone(type) || Au._synthFx !== fxKey)) {
            Au._synth.dispose();
            Au._synth = null;
            Au._schedEnd = 0;
        }
        
        // 核心修改 1：支持外部传入绝对开始时间
        let time = startTime !== undefined ? startTime : (eng.now() + 0.1);
        const t0 = time;
        
        // 核心修改 2：只有非无缝拼接（外部没传时间）且发生冲突时，才触发 releaseAll
        if (startTime === undefined && Au._synth && time < Au._schedEnd) {
            Au._synth.releaseAll();
            Au._schedEnd = 0;
        }
        
        if (!Au._synth) {
            Au._synth = eng.mkSyn(type, { vol: opts?.vol, fx: fx });
            Au._synthFx = fxKey;
        } else if (opts?.vol != null) {
            Au._synth.setVol(opts.vol);
        }
        
        const sec = (d: string) => eng.tsec(d);
        for (const it of items) {
            if (t === 1) {
                Au._synth.triggerAttackRelease(it.note, "8n", time);
                time += sec("8n") + sec(it.dur);
            } else {
                Au._synth.triggerAttackRelease(it.note, it.dur, time);
                time += sec(it.dur);
            }
        }
        Au._schedEnd = time;
        return time - t0;
    }

    // ---------- 背景乐循环(全局唯一, 跨场景共用) ----------

    /** 背景乐续播 Timer (单轨兼容版) */
    private static _bgmTimer: any = null;

    /**
     * 播放背景乐并自动循环: 生成轻快随机曲(cgenUpStr), 按曲长到点续播下一曲。
     * 全局唯一循环——重复调用换新曲(先停旧 Timer), index/load 等场景共用不打架。
     */
    static bgmPlay(opts?: ToneOpts, startTime?: number): void {
        if (!Au._musicOn) return;
        if (!ToneEng.ins()) return;
        
        if (Au._bgmTimer) {
            Timer.clear(Au._bgmTimer);
            Au._bgmTimer = null;
        }

        const bars = 12 + Math.floor(Math.random() * 5);
        const str = Au.cgenUpStr(bars);
        const eng = ToneEng.ins()!;
        
        const actualStartTime = startTime !== undefined ? startTime : (eng.now() + 0.1);
        const dur = Au.midN(str, 0, opts, actualStartTime);
        
        const nextStartTime = actualStartTime + dur - 0.05;
        const prepareAheadMs = 1500;
        const timeUntilScheduleMs = Math.max(0, (dur * 1000) - prepareAheadMs);
        
        Au._bgmTimer = Timer.setTimeout(timeUntilScheduleMs, () => {
            Au._bgmTimer = null;
            Au.bgmPlay(opts, nextStartTime);
        });
    }

    // ---------- 流式无限随机背景乐 (Lead + Bass + Chords + 鼓组, 场景化配置) ----------

    /**
     * 播放流式无限随机背景乐(逐小节滚动生成, 永不重样永不断)
     */
    static bgmPlayRich(kind: string = "main"): void {
        // 音乐总开关关: 只记 _bgmKind 不启流(setMusic(true) 时按此恢复播放场景)
        if (!Au._musicOn) { Au._bgmKind = kind; return; }
        const eng = ToneEng.ins();
        if (!eng) return;
        if (Au._rsHeart && Au._bgmKind === kind) return;
        Au._rsStart(kind, eng);
    }

    /** 启动/重启流式无限背景乐 */
    private static _rsStart(kind: string, eng: ToneEng): void {
        Au._rsStop();
        Au._bgmSynths.forEach(s => s.releaseAll());
        Au._bgmKind = kind;
        Au._rsProg = Au._rsProgs[Math.floor(Math.random() * Au._rsProgs.length)].slice();
        Au._rsBeat = 0;
        Au._rsPrev = 7;
        Au._rsBack = 0;
        Au._rsCursor = eng.now() + 0.1;

        Au._rsPump(eng);
        Au._rsHeart = Timer.setInterval(500, Au._rsTick);
        
    }

    /** 停流(清心跳) */
    private static _rsStop(): void {
        if (Au._rsHeart) {
            Timer.clear(Au._rsHeart);
            Au._rsHeart = null;
        }
    }

    /** 心跳: 500ms 检查补排(帧驱动, 后台停摆无妨——恢复即补) */
    private static _rsTick(): void {
        if (!Au._musicOn || !Au._bgmKind) return;
        const eng = ToneEng.ins();
        if (eng) Au._rsPump(eng);
    }

    /** 自适应补排: 保证 WebAudio 时轴未来 RS_AHEAD 秒音符就绪(免疫墙钟漂移/帧抖动) */
    private static _rsPump(eng: ToneEng): void {
        const now = eng.now();
        if (now > Au._rsCursor - 0.05) Au._rsCursor = now + 0.05;
        const barSec = 4 * 60 / eng.bpm;
        let guard = 24;
        while (Au._rsCursor < now + Au.RS_AHEAD && guard-- > 0) {
            Au._rsBar(Au._bgmKind === "match", Au._rsCursor);
            Au._rsCursor += barSec;
            Au._rsBeat++;
            // 每 16 小节 30% 概率换新和声走向(无限不重样)
            if (Au._rsBeat % 16 === 0 && Math.random() < 0.3) {
                Au._rsProg = Au._rsProgs[Math.floor(Math.random() * Au._rsProgs.length)].slice();
            }
        }
    }

    /** 生成并调度单个小节六轨(流式核心: 无终曲收束, 状态跨小节延续) */
    private static _rsBar(isMatch: boolean, t0: number): void {
        const r = Au._barToks(Au._rsBeat, Au._rsProg[Math.floor(Au._rsBeat / 2) % Au._rsProg.length], false, isMatch, Au._rsPrev, Au._rsBack);
        Au._rsPrev = r.prev;
        Au._rsBack = r.back;
        
        // 🌟 极致优化：重新分配各轨电平，避免爆音，增加层次感
        Au._scheduleTrack(r.lead.join(" "), isMatch ? "piano" : "epiano", t0, { vol: isMatch ? -2 : -3, fx: ["reverb"] });
        Au._scheduleTrack(r.bass.join(" "), "bass", t0, { vol: isMatch ? -6 : -8 });
        Au._scheduleTrack(r.chords.join(" "), isMatch ? "organ" : "glock", t0, { vol: isMatch ? -10 : -12, fx: ["reverb"] });
        Au._scheduleTrack(r.kick.join(" "), "kick", t0, { vol: isMatch ? -10 : -14 });
        Au._scheduleTrack(r.snare.join(" "), "snare", t0, { vol: isMatch ? -14 : -18 });
        Au._scheduleTrack(r.hihat.join(" "), "hihat", t0, { vol: isMatch ? -16 : -20 });
    }

    /** 停背景乐循环(清心跳+杀已排音符, 含未来缓冲) */
    static bgmStop(): void {
        if (Au._bgmTimer) {
            Timer.clear(Au._bgmTimer);
            Au._bgmTimer = null;
        }
        if (Au._rsHeart) {
            Timer.clear(Au._rsHeart);
            Au._rsHeart = null;
        }
        Au._bgmSynths.forEach(s => s.releaseAll());
    }

    /**
     * 独立调度单轨乐谱(不干扰全局 _synth; 音色池化复用, "R"=休止只推进时间)
     * @returns 轨道总时长(秒)
     */
    private static _scheduleTrack(str: string, type: string, startTime: number, opts: ToneOpts): number {
        const eng = ToneEng.ins();
        if (!eng) return 0;

        let syn = Au._bgmSynths.get(type);
        if (!syn || syn.disposed) {
            syn = eng.mkSyn(type, opts);
            Au._bgmSynths.set(type, syn);
        } else if (opts.vol != null) {
            syn.setVol(opts.vol);
        }

        const items: { note: string; dur: string }[] = [];
        for (const tok of str.trim().split(/\s+/)) {
            const seg = tok.split(":");
            const note = seg[0];
            const dur = seg[1] || "4n";
            if (note === "R" || note === "r") { items.push({ note: "R", dur }); continue; }
            if (!/^([A-Ga-g][#b]?\d)(\+[A-Ga-g][#b]?\d)*$/.test(note)) continue;
            items.push({ note, dur });
        }

        let time = startTime;
        const t0 = time;
        const sec = (d: string) => eng.tsec(d);

        for (const it of items) {
            if (it.note !== "R") syn.triggerAttackRelease(it.note, it.dur, time);
            time += sec(it.dur);
        }
        return time - t0;
    }


    // ---------- 永远和弦的随机曲目生成 (C 大调) ----------
    /** C 大调音阶 C3~B4 共 14 个音级(音域限制, 无升降号永不走调) */
    private static readonly _cScale: string[] = ["C3", "D3", "E3", "F3", "G3", "A3", "B3", "C4", "D4", "E4", "F4", "G4", "A4", "B4"];
    /** 大三和弦音级索引(C/E/G 各八度, 重音强化用) */
    private static readonly _cChord: number[] = [0, 2, 4, 7, 9, 11];

    /**
     * 生成永远和弦的随机曲目(C 大调随机游走):
     */
    static cgenStr(bars: number = 4): string {
        const scale = Au._cScale;
        const chord = Au._cChord;
        const last = scale.length - 1;
        const notes: string[] = [];
        let prev = 0;
        let back = 0;
        const total = bars * 4;
        for (let i = 0; i < total; i++) {
            let idx: number;
            if (i % 4 === 0) {
                const cands = chord.slice().sort((a, b) => Math.abs(a - prev) - Math.abs(b - prev));
                const r = Math.random();
                idx = cands[r < 0.5 ? 0 : (r < 0.8 ? 1 : 2)];
                back = 0;
            } else {
                const r = Math.random();
                let step: number;
                if (back !== 0) {
                    step = back * (Math.random() < 0.6 ? 1 : 2);
                    back = 0;
                } else if (r < 0.45) {
                    step = Math.random() < 0.5 ? 1 : -1;
                } else if (r < 0.8) {
                    step = Math.random() < 0.5 ? 2 : -2;
                } else {
                    step = (3 + Math.floor(Math.random() * 3)) * (Math.random() < 0.5 ? 1 : -1);
                    back = -Math.sign(step);
                }
                idx = Math.max(0, Math.min(last, prev + step));
            }
            notes.push(scale[idx] + (i === total - 1 ? ":2n" : ":4n"));
            prev = idx;
        }
        return notes.join(" ");
    }

    /**
     * 生成并播放随机曲目
     */
    static cgen(bars: number = 4, opts?: ToneOpts): string {
        const str = Au.cgenStr(bars);
        Au.midN(str, 0, opts);
        return str;
    }

    // ---------- 轻快随机曲生成(bgmPlay 专用) ----------
    /** C 大调音阶 C4~B5 共 14 个音级(高两个八度, 明亮轻快; 无升降号永不走调) */
    private static readonly _uScale: string[] = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5", "F5", "G5", "A5", "B5"];
    /** 大三和弦音级索引(重音小节头用) */
    private static readonly _uChord: number[] = [0, 2, 4, 7, 9, 11];

    // ---------- 多轨曲生成共享常量(cgenRichStr 与流式 _rsBar 同源, 单一事实源) ----------
    /** 🌟 极致优化：和声走向池升级，引入七和弦，极大提升高级感 */
    private static readonly _rsProgs: string[][] = [
        ["Cmaj7", "G7", "Am7", "Fmaj7"],
        ["C", "Am7", "Fmaj7", "G7"],
        ["Am7", "Fmaj7", "Cmaj7", "G7"],
        ["Fmaj7", "G7", "Em7", "Am7"],
    ];
    /** 和弦名 → {根音(低音区), 琶音[根三五七], 长和弦, 五音} */
    private static readonly _rsTones: Record<string, { bassRoot: string; arp: string[]; pad: string; bassFifth: string }> = {
        C:      { bassRoot: "C2", arp: ["C3", "E3", "G3", "C4"], pad: "C3+E3+G3", bassFifth: "G2" },
        Dm:     { bassRoot: "D2", arp: ["D3", "F3", "A3", "D4"], pad: "D3+F3+A3", bassFifth: "A2" },
        Em:     { bassRoot: "E2", arp: ["E3", "G3", "B3", "E4"], pad: "E3+G3+B3", bassFifth: "B2" },
        F:      { bassRoot: "F2", arp: ["F3", "A3", "C4", "F4"], pad: "F3+A3+C4", bassFifth: "C3" },
        G:      { bassRoot: "G2", arp: ["G3", "B3", "D4", "G4"], pad: "G3+B3+D4", bassFifth: "D3" },
        Am:     { bassRoot: "A2", arp: ["A3", "C4", "E4", "A4"], pad: "A3+C4+E4", bassFifth: "E3" },
        // 七和弦扩展
        Cmaj7:  { bassRoot: "C2", arp: ["C3", "E3", "G3", "B3"], pad: "C3+E3+G3+B3", bassFifth: "G2" },
        G7:     { bassRoot: "G2", arp: ["G3", "B3", "D4", "F4"], pad: "G3+B3+D4+F4", bassFifth: "D3" },
        Am7:    { bassRoot: "A2", arp: ["A3", "C4", "E4", "G4"], pad: "A3+C4+E4+G4", bassFifth: "E3" },
        Fmaj7:  { bassRoot: "F2", arp: ["F3", "A3", "C4", "E4"], pad: "F3+A3+C4+E4", bassFifth: "C3" },
        Em7:    { bassRoot: "E2", arp: ["E3", "G3", "B3", "D4"], pad: "E3+G3+B3+D4", bassFifth: "B2" },
    };
    /** lead 高音区和弦音索引(_uScale C4~B5: 0=C4 2=E4 4=G4 5=A4 ...) */
    private static readonly _rsLead: Record<string, number[]> = {
        C: [0, 2, 4, 7], Dm: [1, 3, 5, 8], Em: [2, 4, 6, 9],
        F: [3, 5, 7, 10], G: [4, 6, 8, 11], Am: [5, 7, 9, 12],
        Cmaj7: [0, 2, 4, 6], G7: [4, 6, 8, 10], Am7: [5, 7, 9, 11], Fmaj7: [3, 5, 7, 9], Em7: [2, 4, 6, 8],
    };
    /** lead 节奏型池(16n 槽数组, 槽和恒 16 = 4 拍小节) */
    private static readonly _rsRhy: number[][] = [
        [2, 2, 2, 2, 2, 2, 2, 2], [1, 1, 2, 2, 2, 2, 2, 2, 2], [2, 1, 1, 2, 2, 2, 2, 2, 2],
        [3, 1, 2, 2, 2, 2, 4], [2, 2, 4, 2, 2, 4], [4, 2, 2, 4, 2, 2],
        [2, 2, 1, 1, 2, 2, 2, 2, 2], [6, 2, 2, 2, 2, 2], [4, 4, 4, 4],
        [2, 2, 2, 2, 4, 4], [4, 4, 2, 2, 2, 2], [8, 4, 4],
    ];
    /** 槽数→时值记法(3=附点8n, 6=附点4n, 8=2n) */
    private static readonly _rsSlot: string[] = ["", "16n", "8n", "8n.", "4n", "", "4n.", "", "2n"];

    /**
     * 生成轻快随机曲目(C 大调高音区密集节奏)
     */
    static cgenUpStr(bars: number = 14): string {
        const scale = Au._uScale;
        const chord = Au._uChord;
        const last = scale.length - 1;
        const toks: string[] = [];
        let prev = 7;
        let back = 0;
        for (let b = 0; b < bars; b++) {
            const isAccent = b % 4 === 0;
            const isFinal = b === bars - 1;
            if (isFinal) {
                toks.push(scale[prev] + ":4n", scale[prev] + ":4n", scale[prev] + "+" + scale[Math.max(0, prev - 2)] + ":2n");
                continue;
            }
            if (isAccent) {
                const cands = chord.slice().sort((a, b2) => Math.abs(a - prev) - Math.abs(b2 - prev));
                const ci = cands[Math.random() < 0.55 ? 0 : (Math.random() < 0.75 ? 1 : 2)];
                const root = scale[ci];
                const third = scale[Math.min(last, ci + 2)];
                const fifth = scale[Math.min(last, ci + 4)];
                toks.push(root + "+" + third + "+" + fifth + ":4n");
                prev = ci;
                back = 0;
                for (let k = 0; k < 6; k++) {
                    const idx = Au._uWalk(prev, back, last);
                    back = Au._uBack(prev, idx);
                    prev = idx;
                    toks.push(scale[idx] + (Math.random() < 0.2 ? ":16n" : ":8n"));
                }
            } else {
                for (let k = 0; k < 8; k++) {
                    const idx = Au._uWalk(prev, back, last);
                    back = Au._uBack(prev, idx);
                    prev = idx;
                    toks.push(scale[idx] + (Math.random() < 0.25 ? ":16n" : ":8n"));
                }
            }
        }
        return toks.join(" ");
    }

    /**
     * 生成多声部随机曲目
     */
    static cgenRichStr(bars: number = 14, isMatch: boolean = false): { lead: string; bass: string; chords: string; kick: string; snare: string; hihat: string } {
        const prog = Au._rsProgs[Math.floor(Math.random() * Au._rsProgs.length)];
        const leadToks: string[] = [];
        const bassToks: string[] = [];
        const chordToks: string[] = [];
        const kickToks: string[] = [];
        const snareToks: string[] = [];
        const hatToks: string[] = [];
        let prev = 7, back = 0;
        for (let b = 0; b < bars; b++) {
            const r = Au._barToks(b, prog[Math.floor(b / 2) % prog.length], b === bars - 1, isMatch, prev, back);
            prev = r.prev;
            back = r.back;
            leadToks.push(...r.lead);
            bassToks.push(...r.bass);
            chordToks.push(...r.chords);
            kickToks.push(...r.kick);
            snareToks.push(...r.snare);
            hatToks.push(...r.hihat);
        }
        return {
            lead: leadToks.join(" "),
            bass: bassToks.join(" "),
            chords: chordToks.join(" "),
            kick: kickToks.join(" "),
            snare: snareToks.join(" "),
            hihat: hatToks.join(" "),
        };
    }

    /**
     * 🌟 极致优化：生成单个小节六轨 token
     * 引入了切分音（Syncopation）、轻重音（Accent/Ghost Note）和过门（Fill）
     */
    private static _barToks(
        b: number, ch: string, isFinal: boolean, isMatch: boolean, prevIn: number, backIn: number
    ): { lead: string[]; bass: string[]; chords: string[]; kick: string[]; snare: string[]; hihat: string[]; prev: number; back: number } {
        const tones = Au._rsTones[ch];
        const leadChord = Au._rsLead[ch];
        const isAccent = b % 4 === 0;
        const isFill = b % 8 === 7; // 🌟 每 8 小节来个过门
        const scale = Au._uScale;
        const last = scale.length - 1;
        const leadToks: string[] = [];
        const bassToks: string[] = [];
        const chordToks: string[] = [];
        const kickToks: string[] = [];
        const snareToks: string[] = [];
        const hatToks: string[] = [];
        let prev = prevIn, back = backIn;

        // ---- lead ----
        if (isFinal) {
            leadToks.push(tones.pad + ":1n");
        } else if (isAccent) {
            const rootIdx = leadChord.slice().sort((a, b2) => Math.abs(a - prev) - Math.abs(b2 - prev))[0];
            const thirdIdx = Math.min(last, rootIdx + 2);
            const rhy = Au._rsRhy[Math.floor(Math.random() * Au._rsRhy.length)];
            leadToks.push(scale[rootIdx] + "+" + scale[thirdIdx] + ":" + Au._rsSlot[rhy[0]]);
            prev = rootIdx;
            back = 0;
            for (let k = 1; k < rhy.length; k++) {
                const idx = Au._uWalk(prev, back, last);
                back = Au._uBack(prev, idx);
                prev = idx;
                leadToks.push(scale[idx] + ":" + Au._rsSlot[rhy[k]]);
            }
        } else {
            const rhy = Au._rsRhy[Math.floor(Math.random() * Au._rsRhy.length)];
            const headIdx = leadChord.slice().sort((a, b2) => Math.abs(a - prev) - Math.abs(b2 - prev))[0];
            leadToks.push(scale[headIdx] + ":" + Au._rsSlot[rhy[0]]);
            prev = headIdx;
            back = 0;
            for (let k = 1; k < rhy.length; k++) {
                let idx: number;
                if (Math.random() < 0.6) {
                    idx = leadChord.slice().sort((a, b2) => Math.abs(a - prev) - Math.abs(b2 - prev))[Math.random() < 0.6 ? 0 : 1];
                } else {
                    idx = Au._uWalk(prev, back, last);
                    back = Au._uBack(prev, idx);
                }
                prev = idx;
                leadToks.push(scale[idx] + ":" + Au._rsSlot[rhy[k]]);
            }
        }

        // ---- bass: 切分律动优化 ----
        if (isMatch && Math.random() < 0.4) {
            const up = tones.bassRoot.replace(/(\d)/, (m) => String(parseInt(m) + 1));
            // 八度跳跃+切分
            bassToks.push(tones.bassRoot + ":8n", "R:8n", up + ":4n", tones.bassRoot + ":8n", "R:8n");
        } else {
            const second = Math.random() < 0.4 ? tones.bassFifth : tones.bassRoot;
            // 动感切分
            bassToks.push(tones.bassRoot + ":8n", "R:8n", second + ":4n", tones.bassRoot + ":8n", "R:8n");
        }

        // ---- chords ----
        if (isMatch) {
            chordToks.push(tones.pad + ":1n");
        } else {
            const a = tones.arp;
            chordToks.push(a[0] + ":8n", a[1] + ":8n", a[2] + ":8n", a[3] + ":8n", a[2] + ":8n", a[3] + ":8n", a[1] + ":8n", a[0] + ":8n");
        }

        // ---- kick: 基础律动 ----
        if (!isFinal && Math.random() < 0.25) {
            kickToks.push("C1:4n", "R:4n", "C1:8n", "C1:8n", "R:4n");
        } else {
            kickToks.push("C1:4n", "R:4n", "C1:4n", "R:4n");
        }

        // ---- snare: 加入过门 Fill ----
        if (isFill) {
            // 🌟 第 8 小节，最后两拍密集敲击过门
            snareToks.push("R:2n", "C2:16n", "C2:16n", "C2:16n", "C2:16n", "D2:16n", "D2:16n", "E2:16n", "E2:16n");
        } else if (isMatch) {
            snareToks.push("R:4n", "C2:4n", "R:4n", "C2:4n");
        } else {
            snareToks.push("R:4n", "R:4n", "R:4n", "C2:4n");
        }

        // ---- hihat: 轻重音+幽灵音优化 ----
        if (isFill) {
            // 过门时 Hihat 退让
            hatToks.push("R:1n");
        } else if (Math.random() < 0.3) {
            // 🌟 密集16分，模拟强弱交替的律动（用长短音区分轻重，虽然这招不一定完美，但能产生律动感）
            for (let k = 0; k < 16; k++) {
                const isAcc = (k % 4 === 0);
                hatToks.push("C6:" + (isAcc ? "8n" : "16n"));
            }
        } else {
            for (let k = 0; k < 8; k++) {
                const isAcc = (k % 2 === 0);
                hatToks.push("C6:" + (isAcc ? "8n" : "16n"));
            }
        }

        return { lead: leadToks, bass: bassToks, chords: chordToks, kick: kickToks, snare: snareToks, hihat: hatToks, prev, back };
    }

    /** 轻快曲随机游走一步(45% ±1 / 35% ±2 / 20% 跳进, 大跳后强制反向回归) */
    private static _uWalk(prev: number, back: number, last: number): number {
        const r = Math.random();
        let step: number;
        if (back !== 0) {
            step = back * (Math.random() < 0.6 ? 1 : 2);
        } else if (r < 0.45) {
            step = Math.random() < 0.5 ? 1 : -1;
        } else if (r < 0.8) {
            step = Math.random() < 0.5 ? 2 : -2;
        } else {
            step = (3 + Math.floor(Math.random() * 3)) * (Math.random() < 0.5 ? 1 : -1);
        }
        return Math.max(0, Math.min(last, prev + step));
    }

    /** 大跳回归方向(小步视为已回归清零) */
    private static _uBack(prev: number, idx: number): number {
        const step = idx - prev;
        return Math.abs(step) >= 3 ? -Math.sign(step) : 0;
    }

    // ---------- 清理 ----------
    static clear(key?: string): void {
        if (key) {
            Au._sounds.delete(key);
            Au._loading.delete(key);
            Res.clear(key);
        } else {
            for (const key of Au._sounds.keys()) {
                URL.revokeObjectURL(Au._sounds.get(key));
                Res.clear(key);
            }
            Au._channels.clear();
            Au._sounds.clear();
            Au._loading.clear();
        }
    }
}