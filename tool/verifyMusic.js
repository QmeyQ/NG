// 流式无限随机背景乐验证(Node 直跑): 精确复制 au.ts _barToks 单小节核心 + _rsPump 调用方式
const BPM = 120;
const BEAT = 60 / BPM;
function tsec(d) {
    const m = /^(\d+)(n)?(\.?)$/.exec(d);
    if (!m) return parseFloat(d) || 0.5;
    const n = parseInt(m[1], 10);
    let beats = n === 1 ? 4 : 4 / n;
    if (m[3]) beats *= 1.5;
    return beats * BEAT;
}

const uScale = ["C4","D4","E4","F4","G4","A4","B4","C5","D5","E5","F5","G5","A5","B5"];
const PROGS = [["C","G","Am","F"],["C","Am","F","G"],["Am","F","C","G"],["C","Dm","F","G"]];
const CHORD_TONES = {
    C:  { bassRoot: "C2", arp: ["C3","E3","G3","C4"], pad: "C3+E3+G3", bassFifth: "G2" },
    Dm: { bassRoot: "D2", arp: ["D3","F3","A3","D4"], pad: "D3+F3+A3", bassFifth: "A2" },
    Em: { bassRoot: "E2", arp: ["E3","G3","B3","E4"], pad: "E3+G3+B3", bassFifth: "B2" },
    F:  { bassRoot: "F2", arp: ["F3","A3","C4","F4"], pad: "F3+A3+C4", bassFifth: "C3" },
    G:  { bassRoot: "G2", arp: ["G3","B3","D4","G4"], pad: "G3+B3+D4", bassFifth: "D3" },
    Am: { bassRoot: "A2", arp: ["A3","C4","E4","A4"], pad: "A3+C4+E4", bassFifth: "E3" },
};
const CHORD_LEAD = { C:[0,2,4,7], Dm:[1,3,5,8], Em:[2,4,6,9], F:[3,5,7,10], G:[4,6,8,11], Am:[5,7,9,12] };
const RHY = [
    [2,2,2,2,2,2,2,2],[1,1,2,2,2,2,2,2,2],[2,1,1,2,2,2,2,2,2],
    [3,1,2,2,2,2,4],[2,2,4,2,2,4],[4,2,2,4,2,2],
    [2,2,1,1,2,2,2,2,2],[6,2,2,2,2,2],[4,4,4,4],
    [2,2,2,2,4,4],[4,4,2,2,2,2],[8,4,4],
];
const SLOT_DUR = ["","16n","8n","8n.","4n","","4n.","","2n"];

function _uWalk(prev, back, last) {
    const r = Math.random(); let step;
    if (back !== 0) step = back * (Math.random() < 0.6 ? 1 : 2);
    else if (r < 0.45) step = Math.random() < 0.5 ? 1 : -1;
    else if (r < 0.8) step = Math.random() < 0.5 ? 2 : -2;
    else step = (3 + Math.floor(Math.random() * 3)) * (Math.random() < 0.5 ? 1 : -1);
    return Math.max(0, Math.min(last, prev + step));
}
function _uBack(prev, idx) { const s = idx - prev; return Math.abs(s) >= 3 ? -Math.sign(s) : 0; }

// 精确复制 au.ts Au._barToks(流式调用: isFinal 恒 false, prev/back 状态跨小节延续)
function barToks(b, ch, isFinal, isMatch, prevIn, backIn) {
    const tones = CHORD_TONES[ch], leadChord = CHORD_LEAD[ch];
    const isAccent = b % 4 === 0;
    const scale = uScale, last = scale.length - 1;
    const leadToks = [], bassToks = [], chordToks = [], kickToks = [], snareToks = [], hatToks = [];
    let prev = prevIn, back = backIn;

    if (isFinal) {
        leadToks.push(tones.arp[0] + "+" + tones.arp[1] + "+" + tones.arp[2] + ":1n");
    } else if (isAccent) {
        const rootIdx = leadChord.slice().sort((a, b2) => Math.abs(a - prev) - Math.abs(b2 - prev))[0];
        const thirdIdx = Math.min(last, rootIdx + 2);
        const rhy = RHY[Math.floor(Math.random() * RHY.length)];
        leadToks.push(scale[rootIdx] + "+" + scale[thirdIdx] + ":" + SLOT_DUR[rhy[0]]);
        prev = rootIdx; back = 0;
        for (let k = 1; k < rhy.length; k++) {
            const idx = _uWalk(prev, back, last);
            back = _uBack(prev, idx); prev = idx;
            leadToks.push(scale[idx] + ":" + SLOT_DUR[rhy[k]]);
        }
    } else {
        const rhy = RHY[Math.floor(Math.random() * RHY.length)];
        const headIdx = leadChord.slice().sort((a, b2) => Math.abs(a - prev) - Math.abs(b2 - prev))[0];
        leadToks.push(scale[headIdx] + ":" + SLOT_DUR[rhy[0]]);
        prev = headIdx; back = 0;
        for (let k = 1; k < rhy.length; k++) {
            let idx;
            if (Math.random() < 0.6) {
                idx = leadChord.slice().sort((a, b2) => Math.abs(a - prev) - Math.abs(b2 - prev))[Math.random() < 0.6 ? 0 : 1];
            } else {
                idx = _uWalk(prev, back, last);
                back = _uBack(prev, idx);
            }
            prev = idx;
            leadToks.push(scale[idx] + ":" + SLOT_DUR[rhy[k]]);
        }
    }

    if (isMatch && Math.random() < 0.3) {
        const up = tones.bassRoot.replace(/(\d)/, m => String(parseInt(m) + 1));
        bassToks.push(tones.bassRoot + ":4n", "R:4n", up + ":8n", tones.bassRoot + ":8n", "R:4n");
    } else {
        const second = Math.random() < 0.4 ? tones.bassFifth : tones.bassRoot;
        bassToks.push(tones.bassRoot + ":4n", "R:4n", second + ":4n", "R:4n");
    }

    if (isMatch) chordToks.push(tones.pad + ":1n");
    else { const a = tones.arp; chordToks.push(a[0]+":8n",a[1]+":8n",a[2]+":8n",a[3]+":8n",a[2]+":8n",a[3]+":8n",a[1]+":8n",a[0]+":8n"); }

    if (!isFinal && Math.random() < 0.25) kickToks.push("C1:4n","R:4n","C1:8n","C1:8n","R:4n");
    else kickToks.push("C1:4n","R:4n","C1:4n","R:4n");

    if (isMatch) snareToks.push("R:4n","C2:4n","R:4n","C2:4n");
    else snareToks.push("R:4n","R:4n","R:4n","C2:4n");

    if (Math.random() < 0.2) { for (let k = 0; k < 16; k++) hatToks.push("C6:16n"); }
    else { for (let k = 0; k < 8; k++) hatToks.push("C6:8n"); }

    return { lead: leadToks, bass: bassToks, chords: chordToks, kick: kickToks, snare: snareToks, hihat: hatToks, prev, back };
}

function toksDur(toks) {
    let t = 0;
    for (const tok of toks) t += tsec(tok.split(":")[1] || "4n");
    return t;
}

const NOTE_RE = /^([A-Ga-g][#b]?\d)(\+[A-Ga-g][#b]?\d)*$/;
const BAR_SEC = 4 * BEAT;
let fails = 0;
// 300 轮: 每轮模拟一条无限流连跑 32 小节(含走向切换/状态延续/流式恒无终曲)
for (let round = 0; round < 300; round++) {
    const isMatch = round % 2 === 0;
    let prog = PROGS[Math.floor(Math.random() * PROGS.length)];
    let prev = 7, back = 0;
    let totalLeadChars = 0;
    for (let b = 0; b < 32; b++) {
        const ch = prog[Math.floor(b / 2) % prog.length];
        const r = barToks(b, ch, false, isMatch, prev, back);
        prev = r.prev; back = r.back;
        if (prev < 0 || prev > 13 || back < -1 || back > 1) {
            console.log(`FAIL r${round} b${b} 游走状态越界: prev=${prev} back=${back}`); fails++;
        }
        for (const name of ["lead","bass","chords","kick","snare","hihat"]) {
            const d = toksDur(r[name]);
            if (Math.abs(d - BAR_SEC) > 1e-6) { console.log(`FAIL r${round} ${isMatch?'match':'main'} b${b} ${name}: ${d}s ≠ ${BAR_SEC}s`); fails++; }
            for (const tok of r[name]) {
                const note = tok.split(":")[0];
                if (note === "R") continue;
                if (!NOTE_RE.test(note)) { console.log(`FAIL r${round} b${b} ${name} 非法音符: ${tok}`); fails++; }
            }
        }
        totalLeadChars += r.lead.join(" ").length;
        // 每 16 小节 30% 概率换走向(同 au.ts _rsPump)
        if ((b + 1) % 16 === 0 && Math.random() < 0.3) {
            prog = PROGS[Math.floor(Math.random() * PROGS.length)];
        }
    }
    // 32 小节 lead 累计串长(用户要求"一曲至少 100 字符"量级参考)
    if (totalLeadChars < 100) { console.log(`FAIL r${round} 32 小节 lead 累计 ${totalLeadChars} 字符 < 100`); fails++; }
}
console.log(fails === 0 ? "300 轮全部通过: 单小节六轨严格 2s 对齐, 音符全合法, 游走状态无越界" : `${fails} 处失败`);
// 打印一例(流式前 2 小节)
const demo = barToks(0, "C", false, true, 7, 0);
console.log("\nsample(match,bar0) lead:", demo.lead.join(" ").slice(0, 100) + "...");
console.log("bass:", demo.bass.join(" "));
console.log("chords:", demo.chords.join(" "));
console.log("kick:", demo.kick.join(" "));
console.log("hihat:", demo.hihat.join(" ").slice(0, 60) + "...");