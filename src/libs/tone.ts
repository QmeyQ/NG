/**
 * ToneEng - 终极自研双端(Web/微信小游戏)合成引擎
 * 纯合成极限：包含侧链压缩总线、多段EQ避让、声像、人性化随机(Time/Pitch/Vel)、模拟硬件漂移。
 * 兼容微信小游戏老旧基础库缺失高级节点的降级处理。
 */
import { wxEnv } from "./wx";

const g: any = typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : {} as any);

/** 音色定义(osc 波形组 + ADSR + filter + 噪声 + FM/AM + 弯音) */
interface ToneDef {
    /** osc 组: t=波形 r=频率比 d=detune(分) g=增益, 空数组=纯噪声打击乐 */
    oscs: { t: string; r?: number; d?: number; g?: number }[];
    /** ADSR 包络(秒); s=0 衰减型(拨弦/鼓, dur 不截尾自然衰减, 同旧 PluckSynth 语义) */
    env: { a: number; d: number; s: number; r: number };
    /** 滤波器: t=类型 f=截止(q=谐振) e=包络扫频量(Hz, 衰减期从 f+e 扫到 f) */
    flt?: { t: string; f: number; q?: number; e?: number };
    /** 🌟 新增：频段避让 EQ，强制切掉不属于自己的频段，防止多轨混音浑浊 */
    eq?: { hp?: number; lp?: number };
    /** 音色峰值增益 */
    gn?: number;
    /** 白噪声混合比(拨弦激发/军鼓/镲/气声) */
    nz?: number;
    /** FM 调制: r=调制频率比 a=调制深度(Hz) d=深度衰减(秒) */
    fm?: { r: number; a: number; d?: number };
    /** AM 调幅(5.2Hz 颤抖) */
    am?: boolean;
    /** 弯音: 起始频率倍率(0.09s 内滑落回原频率, kick/tom 下扫) */
    bd?: number;
    /** 🌟 新增：模拟硬件漂移(Cents)，让每次发声音高都有极其微小的不同，消除数码味 */
    drift?: number;
}

/** 音色表: 乐器化 23 种，参数经过精细声学调教 */
const TONE_DEFS: Record<string, ToneDef> = {
    // ---- 拨弦/键盘 ----
    pluck:   { oscs: [{ t: "triangle" }, { t: "sawtooth", g: 0.15 }], nz: 0.15, env: { a: 0.002, d: 1.2, s: 0, r: 0.3 }, flt: { t: "lowpass", f: 2800, q: 1.2, e: 1500 }, eq: { hp: 200 }, drift: 4, gn: 0.45 },
    piano:   { oscs: [{ t: "triangle" }, { t: "sine", r: 2, g: 0.4 }, { t: "triangle", d: 4, g: 0.2 }], env: { a: 0.003, d: 1.8, s: 0.05, r: 0.5 }, flt: { t: "lowpass", f: 3800, e: 2200 }, eq: { hp: 120 }, drift: 2, gn: 0.5 },
    epiano:  { oscs: [{ t: "sine" }], fm: { r: 3, a: 300, d: 0.6 }, env: { a: 0.004, d: 1.4, s: 0.1, r: 0.5 }, eq: { hp: 150, lp: 8000 }, drift: 3, gn: 0.45 },
    organ:   { oscs: [{ t: "sine", g: 0.6 }, { t: "sine", r: 2, g: 0.25 }, { t: "sine", r: 3, g: 0.1 }], env: { a: 0.015, d: 0.1, s: 0.9, r: 0.15 }, eq: { hp: 100, lp: 5000 }, gn: 0.4 },
    // ---- 吉他/贝斯 ----
    guitar:  { oscs: [{ t: "sawtooth" }, { t: "triangle", r: 2, g: 0.2 }], nz: 0.1, env: { a: 0.005, d: 1.0, s: 0, r: 0.3 }, flt: { t: "lowpass", f: 2200, q: 1.5, e: 800 }, eq: { hp: 150 }, drift: 5, gn: 0.4 },
    bass:    { oscs: [{ t: "sawtooth" }, { t: "sine", r: 0.5, g: 0.8 }], env: { a: 0.005, d: 0.8, s: 0.2, r: 0.2 }, flt: { t: "lowpass", f: 600, q: 1.0, e: 400 }, eq: { hp: 30, lp: 800 }, drift: 2, gn: 0.55 },
    sub:     { oscs: [{ t: "sine" }], env: { a: 0.01, d: 1.5, s: 0.4, r: 0.3 }, eq: { lp: 200 }, gn: 0.6 },
    // ---- 管弦/合成器 ----
    strings: { oscs: [{ t: "sawtooth", d: 8 }, { t: "sawtooth", d: -8 }], env: { a: 0.25, d: 0.5, s: 0.8, r: 0.8 }, flt: { t: "lowpass", f: 2200, e: 500 }, eq: { hp: 150 }, drift: 8, gn: 0.3 },
    brass:   { oscs: [{ t: "sawtooth" }, { t: "square", g: 0.2 }], env: { a: 0.08, d: 0.3, s: 0.7, r: 0.3 }, flt: { t: "lowpass", f: 1000, e: 1500 }, eq: { hp: 120 }, drift: 4, gn: 0.4 },
    flute:   { oscs: [{ t: "sine" }, { t: "sine", r: 2, g: 0.15 }], nz: 0.08, env: { a: 0.12, d: 0.2, s: 0.85, r: 0.3 }, flt: { t: "lowpass", f: 3000 }, drift: 6, gn: 0.45 },
    pad:     { oscs: [{ t: "sawtooth", d: 12 }, { t: "sawtooth", d: -12 }, { t: "triangle", r: 0.5, g: 0.5 }], env: { a: 0.6, d: 0.6, s: 0.9, r: 1.5 }, flt: { t: "lowpass", f: 1400, e: 300 }, eq: { hp: 200 }, drift: 10, gn: 0.2 },
    glock:   { oscs: [{ t: "sine" }], fm: { r: 6.1, a: 200, d: 0.3 }, env: { a: 0.002, d: 1.8, s: 0, r: 0.5 }, eq: { hp: 1000, lp: 10000 }, drift: 2, gn: 0.35 },
    // ---- 鼓组 (不做EQ限制，保证打击感) ----
    kick:    { oscs: [{ t: "sine" }], bd: 3.5, env: { a: 0.001, d: 0.5, s: 0, r: 0.1 }, gn: 0.9 },
    snare:   { oscs: [{ t: "triangle", g: 0.4 }], nz: 0.9, env: { a: 0.001, d: 0.2, s: 0, r: 0.1 }, flt: { t: "bandpass", f: 1600, q: 0.8 }, eq: { hp: 400 }, gn: 0.6 },
    hihat:   { oscs: [], nz: 1, env: { a: 0.001, d: 0.08, s: 0, r: 0.05 }, flt: { t: "highpass", f: 8000 }, eq: { hp: 6000 }, gn: 0.3 },
    tom:     { oscs: [{ t: "sine" }], bd: 1.8, env: { a: 0.001, d: 0.4, s: 0, r: 0.1 }, gn: 0.7 },
    clap:    { oscs: [], nz: 1, env: { a: 0.001, d: 0.15, s: 0, r: 0.1 }, flt: { t: "bandpass", f: 1000, q: 1.2 }, eq: { hp: 500 }, gn: 0.5 },
    // 其他合成
    saw:     { oscs: [{ t: "sawtooth", d: 6 }, { t: "sawtooth", d: -6 }], env: { a: 0.01, d: 0.2, s: 0.6, r: 0.3 }, flt: { t: "lowpass", f: 3200, e: 1000 }, drift: 5, gn: 0.35 },
    square:  { oscs: [{ t: "square" }], env: { a: 0.005, d: 0.15, s: 0.7, r: 0.1 }, gn: 0.25 },
    fm:      { oscs: [{ t: "sine" }], fm: { r: 2, a: 350 }, env: { a: 0.005, d: 0.4, s: 0.4, r: 0.4 }, drift: 3, gn: 0.45 },
    am:      { oscs: [{ t: "sine" }, { t: "triangle", r: 2, g: 0.15 }], am: true, env: { a: 0.01, d: 0.3, s: 0.6, r: 0.3 }, gn: 0.4 },
    noise:   { oscs: [], nz: 1, env: { a: 0.002, d: 0.3, s: 0, r: 0.1 }, flt: { t: "lowpass", f: 1000 }, gn: 0.4 },
    tri:     { oscs: [{ t: "triangle" }], env: { a: 0.01, d: 0.2, s: 0.7, r: 0.3 }, drift: 3, gn: 0.45 },
};

/** 旧 Tone.js 音色名 → 新音色 id(上层旧调用无损兼容) */
const LEGACY: Record<string, string> = {
    PluckSynth: "pluck", FMSynth: "fm", AMSynth: "am", MembraneSynth: "kick",
    MonoSynth: "saw", Synth: "tri", PolySynth: "strings", NoiseSynth: "noise", MetalSynth: "bell",
};

/** 可选音色名(新 id + 旧 Tone 名, au.TONES 呈现用) */
export const TONE_NAMES: string[] = Object.keys(TONE_DEFS).concat(Object.keys(LEGACY));

/** 可选效果器名 */
export const FX_NAMES: string[] = ["reverb", "delay", "dist", "chorus", "trem"];

/** 旧名映射+未知回退(大小写不敏感) */
export function mapTone(t: string): string {
    const low = (t || "").toLowerCase();
    if (TONE_DEFS[low]) return low;
    if (LEGACY[t]) return LEGACY[t];
    console.warn("[Tone] 未知音色: " + t + " (可选: " + Object.keys(TONE_DEFS).join("/") + "), 回退 pluck");
    return "pluck";
}

function db2lin(db: number): number { return Math.pow(10, db / 20); }
function clampF(f: number): number { return Math.max(20, Math.min(12000, f)); }

function mkDistCurve(k: number): Float32Array {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
    return c;
}

/** 运行中 voice 记录(releaseAll 快停/生命周期过滤) */
interface VoiceR { vg: any; srcs: any[]; end: number; }

/**
 * 合成器实例: voice 汇入 in → bus(音量 dB) → fx 链 → eng.masterBus/sidechainBus
 */
export class Syn {
    readonly type: string;
    private _e: ToneEng;
    private _d: ToneDef;
    private _bus: any;
    private _in: any;
    private _voices: VoiceR[] = [];
    /** 常驻节点(LFO osc, dispose 时 stop) */
    private _alive: any[] = [];
    /** fx 链全部节点(dispose 时 disconnect) */
    private _nodes: any[] = [];
    private _disposed = false;
    get disposed(): boolean { return this._disposed; }

    constructor(eng: ToneEng, type: string, opts?: { vol?: number; fx?: string[], isDrum?: boolean }) {
        const ctx = eng.ctx;
        this._e = eng;
        this.type = type;
        this._d = TONE_DEFS[type] || TONE_DEFS.pluck;
        
        // 内部总线 (控制整体音量)
        this._bus = ctx.createGain();
        this._bus.gain.value = db2lin(opts?.vol != null ? opts.vol : 0);
        
        // 🌟 修复：完整拼接 fx 链
        let tail: any = this._bus;
        if (opts?.fx && opts.fx.length > 0) {
            for (const fxName of opts.fx) {
                const f = mkFx(eng, fxName, this._alive, this._nodes);
                tail.connect(f.in);
                tail = f.out;
            }
        }
        
        // 路由：鼓组走 masterBus(硬压限)，其余走 sidechainBus(被踢鼓压低)
        tail.connect(opts?.isDrum ? eng.masterBus : eng.sidechainBus);
        
        this._in = ctx.createGain();
        this._in.gain.value = 1;
        this._in.connect(this._bus);
    }

    /** 设置音量(dB) */
    setVol(db: number): void { if (!this._disposed) this._bus.gain.value = db2lin(db); }

    /**
     * 🌟 触发音符（加入力度、声像、人性化微调）
     * @param velocity 力度 (0~1)，影响音量和滤波器亮度
     */
    triggerAttackRelease(note: string, dur: string, when: number, pan: number = 0, velocity: number = 1): void {
        if (this._disposed) return;
        const durS = this._e.tsec(dur);
        
        // 如果是打击乐，不需要和弦拆分，直接触发；和弦记法("+")由外部处理或底层拆分
        for (const n of note.split("+")) {
            const f = this._e.freq(n);
            if (f > 0) { 
                try { this._mkVoice(f, durS, when, pan, velocity); } catch (e) { } 
            }
        }
        const now = this._e.now();
        if (this._voices.length > 64) this._voices = this._voices.filter(v => v.end > now);
    }

    /** 单 voice 节点树: osc组(±FM/AM) [+噪声] → 包络vg → [EQ] → [filter] → [panner] → in */
    private _mkVoice(f0: number, durS: number, t0: number, pan: number, velocity: number): void {
        const d = this._d, ctx = this._e.ctx;
        const vg = ctx.createGain();
        let tailNode: any = vg;
        const srcs: any[] = [];

        // 1. 频段避让 EQ (高通 + 低通)
        if (d.eq) {
            if (d.eq.hp) {
                const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = d.eq.hp;
                tailNode.connect(hp); tailNode = hp;
            }
            if (d.eq.lp) {
                const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = d.eq.lp;
                tailNode.connect(lp); tailNode = lp;
            }
        }

        // 2. 主力滤波器 (带包络)
        let flt: any = null;
        if (d.flt) {
            flt = ctx.createBiquadFilter();
            flt.type = d.flt.t; 
            flt.Q.value = d.flt.q || 1;
            
            // 🌟 力度联动滤波：敲得越重，截止频率越高（越亮）
            const baseFreq = d.flt.f + (velocity * (d.flt.e || 0));
            flt.frequency.value = clampF(baseFreq);
            
            if (d.flt.e) {
                flt.frequency.setValueAtTime(clampF(baseFreq), t0);
                flt.frequency.exponentialRampToValueAtTime(clampF(d.flt.f), t0 + d.env.a + d.env.d);
            }
            tailNode.connect(flt); tailNode = flt;
        }

        // 3. 立体声声像 (兼容老基础库)
        if (pan !== 0 && ctx.createStereoPanner) {
            const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
            tailNode.connect(p); tailNode = p;
        }
        tailNode.connect(this._in);

        // 4. AM 层
        let mix: any = vg;
        if (d.am) {
            const ag = ctx.createGain(); ag.gain.value = 0.72;
            const mo = ctx.createOscillator(); mo.frequency.value = 5.2;
            const mg = ctx.createGain(); mg.gain.value = 0.3;
            mo.connect(mg); mg.connect(ag.gain);
            ag.connect(vg); mix = ag; srcs.push(mo);
        }

        // 5. osc 组
        const oscs: any[] = [];
        for (const o of d.oscs) {
            const osc = ctx.createOscillator();
            osc.type = o.t;
            osc.frequency.value = clampF(f0 * (o.r || 1));
            
            // 🌟 模拟硬件漂移：引入微小随机 detune (-5 ~ +5 cents)，让声音活起来
            let detuneVal = o.d || 0;
            if (d.drift) {
                detuneVal += (Math.random() * 2 - 1) * d.drift;
            }
            osc.detune.value = detuneVal;
            
            const og = ctx.createGain(); og.gain.value = o.g != null ? o.g : 1;
            osc.connect(og); og.connect(mix);
            oscs.push(osc); srcs.push(osc);
        }

        // 6. FM 调制
        if (d.fm && oscs.length > 0) {
            const mo = ctx.createOscillator(); mo.frequency.value = clampF(f0 * d.fm.r);
            const mg = ctx.createGain(); mg.gain.value = d.fm.a;
            if (d.fm.d) { mg.gain.setValueAtTime(d.fm.a, t0); mg.gain.exponentialRampToValueAtTime(0.01, t0 + d.fm.d); }
            mo.connect(mg); mg.connect(oscs[0].frequency);
            srcs.push(mo);
        }

        // 7. 噪声源
        if (d.nz) {
            const ns = ctx.createBufferSource(); ns.buffer = this._e.noiseBuf(); ns.loop = true;
            const ng = ctx.createGain(); ng.gain.value = d.nz;
            ns.connect(ng); ng.connect(mix); srcs.push(ns);
        }

        // 8. 弯音下扫
        if (d.bd) {
            for (const osc of oscs) {
                osc.frequency.setValueAtTime(clampF(f0 * d.bd), t0);
                osc.frequency.exponentialRampToValueAtTime(clampF(f0), t0 + 0.09);
            }
        }

        // 9. ADSR 包络 (融合 velocity 力度)
        const a = d.env.a, dd = d.env.d, s = d.env.s, r = d.env.r;
        const peak = (d.gn != null ? d.gn : 0.5) * velocity;
        const gv = vg.gain;
        let endT = t0 + a + dd + r;

        gv.setValueAtTime(0.0001, t0);
        gv.linearRampToValueAtTime(peak, t0 + a);
        if (s > 0) {
            const relT = Math.max(t0 + durS, t0 + a + 0.015);
            gv.exponentialRampToValueAtTime(Math.max(peak * s, 0.0002), Math.min(t0 + a + dd, relT));
            gv.linearRampToValueAtTime(0.0001, relT + r);
            endT = relT + r;
        } else {
            gv.exponentialRampToValueAtTime(0.0002, t0 + a + dd);
            endT = t0 + a + dd + r;
        }

        for (const src of srcs) { try { src.start(t0); src.stop(endT + 0.06); } catch (e) { } }
        this._voices.push({ vg: vg, srcs: srcs, end: endT });
    }

    releaseAll(): void {
        const now = this._e.now();
        for (const v of this._voices) {
            try {
                v.vg.gain.cancelScheduledValues(now);
                v.vg.gain.setValueAtTime(Math.max(v.vg.gain.value, 0.0001), now);
                v.vg.gain.linearRampToValueAtTime(0.0001, now + 0.04);
                for (const s of v.srcs) s.stop(now + 0.06);
            } catch (e) { }
        }
        this._voices.length = 0;
    }

    dispose(): void {
        if (this._disposed) return;
        this._disposed = true;
        this.releaseAll();
        for (const o of this._alive) { try { o.stop(); } catch (e) { } }
        for (const n of this._nodes) { try { n.disconnect(); } catch (e) { } }
        try { this._in.disconnect(); this._bus.disconnect(); } catch (e) { }
        this._alive.length = 0; this._nodes.length = 0;
    }
}

/** 效果器节点段构建 */
function mkFx(eng: ToneEng, name: string, alive: any[], nodes: any[]): { in: any; out: any } {
    const ctx = eng.ctx;
    const mkG = (v?: number) => { const g = ctx.createGain(); if (v != null) g.gain.value = v; nodes.push(g); return g; };
    switch (name) {
        case "reverb": { 
            const inp = mkG(1), out = mkG(1);
            inp.connect(out);
            for (const dt of [0.029, 0.047, 0.071]) {
                const dl = ctx.createDelay(1); dl.delayTime.value = dt;
                const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3800;
                const fb = mkG(0.32), wg = mkG(0.12);
                inp.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl);
                lp.connect(wg); wg.connect(out);
                nodes.push(dl, lp);
            }
            return { in: inp, out: out };
        }
        case "delay": { 
            const inp = mkG(1), out = mkG(1);
            inp.connect(out);
            const dl = ctx.createDelay(1); dl.delayTime.value = 0.25;
            const fb = mkG(0.3), wg = mkG(0.28);
            inp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wg); wg.connect(out);
            nodes.push(dl);
            return { in: inp, out: out };
        }
        case "dist": { 
            const inp = mkG(1), out = mkG(1);
            const pre = mkG(0.4), post = mkG(1.6);
            const sh = ctx.createWaveShaper(); sh.curve = mkDistCurve(30); sh.oversample = "2x";
            inp.connect(pre); pre.connect(sh); sh.connect(post); post.connect(out);
            nodes.push(sh);
            return { in: inp, out: out };
        }
        case "chorus": { 
            const inp = mkG(1), out = mkG(1);
            inp.connect(out);
            const dl = ctx.createDelay(0.1); dl.delayTime.value = 0.024;
            const lfo = ctx.createOscillator(); lfo.frequency.value = 0.55;
            const lg = mkG(0.006), wg = mkG(0.45);
            lfo.connect(lg); lg.connect(dl.delayTime);
            inp.connect(dl); dl.connect(wg); wg.connect(out);
            try { lfo.start(); } catch (e) { }
            alive.push(lfo); nodes.push(dl);
            return { in: inp, out: out };
        }
        case "trem": { 
            const inp = mkG(1), out = mkG(1);
            const tg = mkG(0.72);
            const lfo = ctx.createOscillator(); lfo.frequency.value = 5.2;
            const lg = mkG(0.3);
            lfo.connect(lg); lg.connect(tg.gain);
            inp.connect(tg); tg.connect(out);
            try { lfo.start(); } catch (e) { }
            alive.push(lfo);
            return { in: inp, out: out };
        }
    }
    const pas = mkG(1);
    return { in: pas, out: pas };
}

/**
 * 引擎单例
 */
export class ToneEng {
    private static _ins: ToneEng | null = null;
    private static _tried = false;
    private _nb: any = null;

    static ins(): ToneEng | null {
        if (ToneEng._ins) return ToneEng._ins;
        if (ToneEng._tried) return null;
        ToneEng._tried = true;
        let ctx: any = null;
        try {
            if (wxEnv) {
                ctx = g.wx && g.wx.createWebAudioContext ? g.wx.createWebAudioContext() : null;
            } else {
                const AC = g.AudioContext || g.webkitAudioContext;
                if (AC) ctx = new AC();
            }
        } catch (e) { ctx = null; }
        if (!ctx) { console.warn("[Tone] 当前环境无 WebAudio, 电子乐禁用"); return null; }
        ToneEng._ins = new ToneEng(ctx);
        return ToneEng._ins;
    }

    ctx: any;
    masterBus: any;      
    sidechainBus: any;   
    bpm = 120;

    private constructor(ctx: any) {
        this.ctx = ctx;
        
        this.masterBus = ctx.createGain();
        this.sidechainBus = ctx.createGain();
        
        // 🌟 降级兼容：微信旧基础库没有 compressor
        let finalNode = ctx.destination;
        try {
            if (ctx.createDynamicsCompressor) {
                const comp = ctx.createDynamicsCompressor();
                comp.threshold.value = -15; 
                comp.knee.value = 12;       
                comp.ratio.value = 4;       
                comp.attack.value = 0.003;  
                comp.release.value = 0.2;   
                comp.connect(ctx.destination);
                finalNode = comp;
            }
        } catch (e) {
            console.warn("[Tone] 压缩器初始化失败，直连输出");
        }

        this.masterBus.connect(finalNode);
        this.sidechainBus.connect(finalNode);

        this._hookUnlock();
    }

    now(): number { return this.ctx.currentTime; }

    /** 🌟 侧链核心：在踢鼓发声时调用，让其他乐器瞬间"凹陷" */
    pump(when: number): void {
        try {
            const g = this.sidechainBus.gain;
            g.cancelScheduledValues(when);
            g.setValueAtTime(1.0, when);
            // 瞬间压到 0.2 (大约 -14dB)
            g.linearRampToValueAtTime(0.2, when + 0.02);
            // 在 0.25 秒内丝滑恢复
            g.linearRampToValueAtTime(1.0, when + 0.25);
        } catch (e) {}
    }

    resume(): void {
        try { if (this.ctx.start) this.ctx.start(); } catch (e) { }
        try { if (this.ctx.resume) this.ctx.resume(); } catch (e) { }
    }

    private _hookUnlock(): void {
        if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
            document.addEventListener("pointerdown", () => this.resume(), { capture: true });
        }
        if (wxEnv && g.wx && g.wx.onTouchStart) {
            try { g.wx.onTouchStart(() => this.resume()); } catch (e) { }
        }
    }

    tsec(d: string): number {
        const m = /^(\d+)(n)?(\.?)$/.exec(d);
        if (!m) { const v = parseFloat(d); return isNaN(v) ? 0.5 : v; }
        const n = parseInt(m[1], 10);
        let beats = n === 1 ? 4 : 4 / n;
        if (m[3]) beats *= 1.5;
        return beats * 60 / this.bpm;
    }

    freq(note: string): number {
        const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(note.trim());
        if (!m) return 0;
        const base: any = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
        const acc = m[2] === "#" ? 1 : (m[2] === "b" ? -1 : 0);
        const midi = (parseInt(m[3], 10) + 1) * 12 + base[m[1].toUpperCase()] + acc;
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    noiseBuf(): any {
        if (this._nb) return this._nb;
        const ctx = this.ctx, sr = ctx.sampleRate || 44100;
        const buf = ctx.createBuffer(1, Math.floor(sr * 0.5), sr);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
        this._nb = buf;
        return this._nb;
    }

    mkSyn(type: string, opts?: { vol?: number; fx?: string[] }): Syn {
        const isDrum = ["kick", "snare", "hihat", "tom", "clap"].includes(type);
        return new Syn(this, mapTone(type), { ...opts, isDrum });
    }
}