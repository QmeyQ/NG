'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('../realtimeserver/node_modules/typescript/lib/typescript.js');

const source = path.resolve(__dirname, '../src/libs/MT.ts');
const options = {
    target: ts.ScriptTarget.ES2018,
    module: ts.ModuleKind.CommonJS,
    types: [],
    skipLibCheck: true,
    noEmitOnError: true,
};
const program = ts.createProgram([source], options);
let compiled;
const emitted = program.emit(undefined, (filename, contents) => {
    if (filename.endsWith('/MT.js')) compiled = contents;
});
const diagnostics = [...ts.getPreEmitDiagnostics(program), ...emitted.diagnostics];
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: name => name,
    getCurrentDirectory: () => path.dirname(source),
    getNewLine: () => '\n',
}));
assert.equal(emitted.emitSkipped, false);
assert.equal(typeof compiled, 'string');
const exportsObject = {};
vm.runInNewContext(compiled, { exports: exportsObject }, { filename: source });
const { ProgPID } = exportsObject;

function advance(progress, steps = 200, now = 0, ceiling = 0.99) {
    for (let i = 1; i <= steps; i++) {
        const previous = progress.value;
        progress.tick(100, now + i * 100);
        assert.ok(Number.isFinite(progress.value));
        assert.ok(progress.value >= previous, 'display must not regress');
        assert.ok(progress.value <= ceiling, 'prediction must respect the stage ceiling');
    }
}

function close(actual, expected) {
    assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`);
}

test('without truth PID advances to the stage ceiling', () => {
    const progress = new ProgPID();
    progress.cap(0.35);
    progress.tick(100, 100);
    assert.ok(progress.value > 0);
    advance(progress, 300, 100, 0.35);
    close(progress.value, 0.35);
});

test('first anchor does not stop prediction, including after raising cap', () => {
    const progress = new ProgPID();
    progress.cap(0.3);
    progress.anchor(0.1, 1000);
    assert.equal(progress.value, 0.1);
    progress.tick(100, 1100);
    assert.ok(progress.value > 0.1);
    advance(progress, 300, 1100, 0.3);
    close(progress.value, 0.3);
    progress.cap(0.6);
    progress.tick(100, 32000);
    assert.ok(progress.value > 0.3);
    advance(progress, 300, 32000, 0.6);
    close(progress.value, 0.6);
});

test('default and explicit caps never display completion', () => {
    for (const cap of [undefined, 1, 2, 0.99, 0, -1]) {
        const progress = new ProgPID();
        if (cap !== undefined) progress.cap(cap);
        const ceiling = cap === undefined ? 0.99 : Math.max(0, Math.min(0.99, cap));
        advance(progress, 1000, 0, ceiling);
        close(progress.value, ceiling);
        assert.ok(progress.value < 1);
    }
});

test('anchors prioritize truth but cannot complete or regress', () => {
    const progress = new ProgPID();
    progress.cap(0.2);
    progress.anchor(0.6, 1000);
    assert.equal(progress.value, 0.6);
    for (const real of [0.2, 0.6, -1]) {
        progress.anchor(real, 2000);
        assert.equal(progress.value, 0.6);
    }
    progress.anchor(1, 3000);
    assert.equal(progress.value, 0.99);
    progress.anchor(2, 4000);
    advance(progress);
    assert.equal(progress.value, 0.99);
});

test('lowering cap preserves the display and raising it resumes prediction', () => {
    const progress = new ProgPID();
    progress.cap(0.7);
    advance(progress, 300, 0, 0.7);
    const displayed = progress.value;
    progress.anchor(0.2, 31000);
    progress.cap(0.1);
    advance(progress, 100, 31000, displayed);
    assert.equal(progress.value, displayed);
    progress.cap(0.8);
    progress.tick(100, 42000);
    assert.ok(progress.value > displayed);
    advance(progress, 300, 42000, 0.8);
});

test('valid measured rate drives the extrapolation target', () => {
    const progress = new ProgPID(1, 0, 0);
    progress.cap(0.8);
    progress.anchor(0.1, 1000);
    progress.anchor(0.2, 2000);
    progress.tick(100, 2100);
    close(progress.value, 0.201);
    advance(progress, 300, 2100, 0.8);
});

test('cap changes reset PID history and speed in both directions', () => {
    for (const nextCap of [0.4, 0.9]) {
        const progress = new ProgPID();
        progress.cap(0.7);
        progress.anchor(0.1, 1000);
        progress.anchor(0.2, 2000);
        advance(progress, 5, 2000, 0.7);
        const fresh = new ProgPID();
        fresh.cap(nextCap);
        fresh.anchor(progress.value, 2500);
        progress.cap(nextCap);
        for (let now = 2600; now <= 5000; now += 100) {
            progress.tick(100, now);
            fresh.tick(100, now);
            close(progress.value, fresh.value);
        }
    }
});

test('new stage rate never uses samples from the previous stage', () => {
    const progress = new ProgPID(1, 0, 0);
    progress.cap(0.4);
    progress.anchor(0.1, 1000);
    progress.anchor(0.2, 2000);
    progress.cap(0.8);
    progress.anchor(0.3, 3000);
    progress.tick(100, 3100);
    close(progress.value, 0.35);
    progress.anchor(0.4, 4000);
    progress.tick(100, 4100);
    close(progress.value, 0.401);
});

test('unchanged cap preserves PID and measured speed', () => {
    const progress = new ProgPID();
    const control = new ProgPID();
    for (const p of [progress, control]) {
        p.cap(0.8);
        p.anchor(0.1, 1000);
        p.anchor(0.2, 2000);
        p.tick(100, 2100);
    }
    for (let now = 2200; now <= 4000; now += 100) {
        progress.cap(0.8);
        progress.tick(100, now);
        control.tick(100, now);
        close(progress.value, control.value);
    }
});

test('non-finite inputs are ignored without corrupting subsequent prediction', () => {
    const progress = new ProgPID();
    const control = new ProgPID();
    for (const p of [progress, control]) {
        p.cap(0.8);
        p.anchor(0.1, 1000);
        p.anchor(0.2, 2000);
        p.tick(100, 2100);
    }
    const previous = progress.value;
    for (const invalid of [NaN, Infinity, -Infinity]) {
        progress.cap(invalid);
        progress.anchor(invalid, 2200);
        progress.anchor(0.7, invalid);
        progress.tick(invalid, 2200);
        progress.tick(100, invalid);
        assert.equal(progress.value, previous);
    }
    progress.tick(0, 2200);
    progress.tick(-100, 2200);
    for (let now = 2200; now <= 4000; now += 100) {
        progress.tick(100, now);
        control.tick(100, now);
        close(progress.value, control.value);
    }
});

test('unusable timestamp intervals fall back to stage prediction', () => {
    for (const now of [1000, 900]) {
        const progress = new ProgPID(1, 0, 0);
        progress.cap(0.8);
        progress.anchor(0.1, 1000);
        progress.anchor(0.2, now);
        progress.tick(100, now + 100);
        close(progress.value, 0.26);
    }
});

test('large dt is equivalent to a 100ms step, even with measured rate', () => {
    for (const anchored of [false, true]) {
        const progress = new ProgPID();
        const control = new ProgPID();
        for (const p of [progress, control]) {
            p.cap(0.8);
            if (anchored) {
                p.anchor(0.1, 1000);
                p.anchor(0.2, 2000);
            }
        }
        const previous = progress.value;
        progress.tick(Number.MAX_VALUE, 1000000);
        control.tick(100, 1000000);
        close(progress.value, control.value);
        assert.ok(progress.value - previous <= 0.060000000001);
        assert.ok(progress.value < 1);
    }
});

test('finish alone displays exactly 1 and remains terminal', () => {
    const progress = new ProgPID();
    progress.cap(0.2);
    progress.anchor(0.1, 1000);
    progress.finish();
    assert.equal(progress.value, 1);
    progress.cap(0);
    progress.anchor(0.5, 2000);
    progress.anchor(2, 3000);
    progress.tick(1000000, 4000);
    progress.finish();
    assert.equal(progress.value, 1);
});
