window.runResLoaderTests = async function () {
    const { ResLoader, Res } = window.ResLoaderQA;
    const checks = [];
    const check = (name, value) => {
        if (!value) throw new Error(name);
        checks.push(name);
    };
    const cache = new Map();
    const counts = new Map();
    const requests = [];
    const blobs = new Map();
    const getBlob = async (path) => {
        if (blobs.has(path)) return blobs.get(path);
        const response = await fetch('/tool/' + path);
        if (!response.ok) throw new Error('Missing fixture: ' + path);
        return response.blob();
    };
    const parse = async (path, blob) => {
        const slash = path.indexOf('/');
        return new Promise(resolve => loader.parseBlobToEngineObject(path.slice(0, slash), path.slice(slash + 1), blob, resolve));
    };
    const source = {
        hasPack: name => name === 'nor' || name === 'ui',
        loadFile: (pack, path, type, done) => getBlob(pack + '/' + path).then(done, () => done(null)),
        get: path => {
            requests.push(path);
            if (!cache.has(path)) {
                counts.set(path, (counts.get(path) || 0) + 1);
                cache.set(path, getBlob(path).then(blob => blob ? parse(path, blob) : null));
            }
            return cache.get(path);
        }
    };
    const loader = new ResLoader(source);
    const controller = await source.get('nor/ani.controller');
    check('真实 controller 加载为 AnimatorController', controller instanceof Laya.AnimatorController);
    const makeAnimator = ctrl => {
        const node = new Laya.Sprite3D();
        const animator = node.addComponent(Laya.Animator);
        animator.controller = ctrl;
        return { node, animator, layer: animator.getControllerLayer(0) };
    };
    const original = makeAnimator(controller);
    const layer = original.layer;
    check('Entry 按非连续 ID 选中 stand', layer.defaultState.name === 'stand');
    check('状态数量保留，伪节点不进入状态表', layer.states.length === 8);
    for (const name of ['diving', 'hitoff', 'jumphit']) {
        const state = layer.getAnimatorState(name);
        check(name + ' 强制单次播放', state.islooping === false);
        check(name + ' 普通转换连接 stand', state.transitions.some(t => t.destState === layer.defaultState));
    }
    check('stand 强制循环', layer.defaultState.islooping === true);
    check('Any State 展开至全部状态', layer.states.every(s => s.transitions.some(t => t.destState === layer.defaultState)));
    check('默认 Exit Time / Duration', layer.getAnimatorState('jumphit').transitions.every(t => t.exitTime === 0.85 && t.transduration === 0.15));
    const clonedNode = original.node.clone();
    const cloned = clonedNode.getComponent(Laya.Animator);
    const clonedLayer = cloned.getControllerLayer(0);
    check('克隆保留 controller', cloned.controller === controller);
    check('克隆状态层独立且默认状态不变', clonedLayer !== layer && clonedLayer.defaultState !== layer.defaultState && clonedLayer.defaultState.name === 'stand');
    check('克隆保留转换及循环覆盖', clonedLayer.getAnimatorState('diving').transitions.length === layer.getAnimatorState('diving').transitions.length && !clonedLayer.getAnimatorState('diving').islooping);

    const data = {
        layerW: 150,
        animatorParams: [
            { id: 90, name: 'speedQA', type: 0, val: 2 },
            { id: 7, name: 'readyQA', type: 1, val: false },
            { id: 44, name: 'fireQA', type: 2, val: true }
        ],
        controllerLayers: [{ name: 'QA', playOnWake: false, defaultWeight: 0.7, blendingMode: 0, states: [
            { id: '-1', name: 'Entry', soloTransitions: [{ id: '42' }] },
            { id: '-2', name: 'Any State', soloTransitions: [{ id: '10', conditions: [{ id: 44 }], exitByTime: false }] },
            { id: '10', name: 'Idle', clip: { _$uuid: '../boy/stand.lani' }, _isLooping: 1, soloTransitions: [
                { id: '42', conditions: [{ id: 90, checkValue: 3, type: 1 }], exitByTime: true, exitTime: 0.4, transduration: 0.25, transstartoffset: 0.2 }
            ] },
            { id: '42', name: 'Action', clip: { _$uuid: 'nor/boy/stand.lani' }, _isLooping: 2, speed: 1.5, clipStart: 0.1, clipEnd: 0.9, cycleOffset: 0.3, soloTransitions: [
                { id: '10', solo: true, mute: true, conditions: [{ id: 7, checkValue: true }], exitByTime: false, exitTime: 0, transduration: 0 },
                { id: '10', solo: true, conditions: [{ id: 7, checkValue: true }], exitByTime: false, exitTime: 0, transduration: 0 }
            ] },
            { id: '99', name: 'Inherit', clip: { _$uuid: 'nor/boy/stand.lani' }, _isLooping: 0 }
        ] }]
    };
    const jsonBlob = value => new Blob([JSON.stringify(value)], { type: 'application/json' });
    const synthetic = await parse('nor/controllers/qa.controller', jsonBlob(data));
    check('相对路径和跨包前缀解析正确', requests.filter(p => p === 'nor/boy/stand.lani').length >= 2 && counts.get('nor/boy/stand.lani') === 1);
    const a = makeAnimator(synthetic);
    const b = makeAnimator(synthetic);
    const idle = a.layer.getAnimatorState('Idle');
    const action = a.layer.getAnimatorState('Action');
    const inherit = a.layer.getAnimatorState('Inherit');
    check('同 clip 不同状态循环互不污染', idle.clip === action.clip && idle.islooping && !action.islooping && inherit.islooping === inherit.clip.islooping);
    check('状态 speed/clipStart/clipEnd/cycleOffset', action.speed === 1.5 && action.clipStart === 0.1 && action.clipEnd === 0.9 && action.cycleOffset === 0.3);
    check('层权重与唤醒设置保留', a.layer.defaultWeight === 0.7 && !a.layer.playOnWake);
    const edge = idle.transitions.find(t => t.destState === action);
    check('目标状态按 ID 映射', a.layer.defaultState === action && edge.destState === action);
    check('Exit Time / Duration / Offset 精确传递', edge.exitTime === 0.4 && edge.transduration === 0.25 && edge.transstartoffset === 0.2 && edge.exitByTime);
    const speedId = Laya.AnimatorStateCondition.conditionNameToID('speedQA');
    const readyId = Laya.AnimatorStateCondition.conditionNameToID('readyQA');
    const triggerId = Laya.AnimatorStateCondition.conditionNameToID('fireQA');
    check('参数按名称初始化，不误用序列化 ID', a.animator.animatorParams[speedId] === 2 && a.animator.animatorParams[readyId] === false && a.animator.animatorParams[triggerId] === true);
    check('数字条件阈值未满足', !edge.check(0.5, a.animator.animatorParams));
    a.animator.setParamsNumber('speedQA', 4);
    check('Exit Time 阻止提前转换', !edge.check(0.2, a.animator.animatorParams));
    check('时间与数字条件满足后转换', edge.check(0.5, a.animator.animatorParams));
    check('不同 Animator 参数独立', b.animator.animatorParams[speedId] === 2);
    check('solo 分流并保留 mute', action.soloTransitions.length === 2 && action.soloTransitions[0].mute);
    a.animator.setParamsBool('readyQA', true);
    check('mute 阻止转换', !action.soloTransitions[0].check(0.5, a.animator.animatorParams));
    check('布尔条件和零 Duration/Exit Time 保留', action.soloTransitions[1].check(0, a.animator.animatorParams) && action.soloTransitions[1].transduration === 0 && action.soloTransitions[1].exitTime === 0);
    const anyEdge = idle.transitions.find(t => t.conditions.some(c => c.id === triggerId));
    check('Trigger 条件触发并消费', anyEdge.check(0, a.animator.animatorParams) && a.animator.animatorParams[triggerId] === false);
    check('Trigger 不影响另一 Animator', b.animator.animatorParams[triggerId] === true);
    check('solo 存在时不回退普通转换', (a.animator.setParamsBool('readyQA', false), action._eventtransition(1, a.animator.animatorParams)) === null);

    original.animator.play('diving');
    const observed = [];
    const crossFade = original.animator.crossFade;
    original.animator.crossFade = (...args) => observed.push(args);
    original.animator._updatePlayer(layer.getAnimatorState('diving'), layer.getCurrentPlayState(), layer.getAnimatorState('diving').clip.duration() * 0.9, false, 0);
    original.animator._LateUpdateEvents.invoke();
    original.animator.crossFade = crossFade;
    check('真实 Animator 更新触发动作回 stand', observed.some(args => args[0] === 'stand' && args[1] === 0.15));

    const sky = await source.get('nor/sky.lmat');
    check('全景天空构造为 SkyPanoramicMaterial', sky instanceof Laya.SkyPanoramicMaterial);
    check('天空纹理不是默认占位图', sky.panoramicTexture.width === 1920 && sky.panoramicTexture.height === 1080);
    check('天空纹理绑定实际 u_Texture', sky.shaderData.getTexture(Laya.Shader3D.propertyNameToID('u_Texture')) === sky.panoramicTexture);
    check('不生成错误 panoramicTexture uniform', !sky.shaderData.getTexture(Laya.Shader3D.propertyNameToID('panoramicTexture')));
    check('天空曝光与色调保留', Math.abs(sky.exposure - 1.068) < 0.0001 && sky.tintColor.r === 0.5);
    const crossSky = await parse('nor/cross-sky.lmat', jsonBlob({ props: {
        type: 'SkyPanoramic', textures: [{ name: 'u_Texture', path: 'nor/court.jpg' }]
    } }));
    check('跨包天空纹理同样调用 setter', crossSky instanceof Laya.SkyPanoramicMaterial && crossSky.panoramicTexture.width === 1920);
    const pbr = new Laya.PBRStandardMaterial();
    loader._setMatTex(pbr, 'u_AlbedoTexture', sky.panoramicTexture);
    check('普通材质纹理 setter 不回归', pbr.albedoTexture === sky.panoramicTexture && pbr.shaderData.hasDefine(Laya.PBRStandardMaterial.SHADERDEFINE_ALBEDOTEXTURE));
    loader._setMatTex(pbr, 'u_QATexture', sky.panoramicTexture);
    check('自定义 uniform 仍可直接绑定', pbr.shaderData.getTexture(Laya.Shader3D.propertyNameToID('u_QATexture')) === sky.panoramicTexture);
    pbr.destroy();
    crossSky.destroy();

    const atlas = await new Promise(resolve => Promise.all([getBlob('ui/internal/UI/comp.png'), getBlob('ui/internal/UI/comp.atlas')]).then(([image, atlas]) => loader.createAtlas(image, atlas, 'qa-atlas', resolve)));
    check('真实图集加载并生成帧', atlas instanceof Laya.AtlasResource && atlas.frames.length > 0);
    const node = await parse('nor/qa.lh', jsonBlob({ _$ver: 1, _$id: 'qa-root', _$type: 'Sprite3D', name: 'QA Prefab', _$child: [{ _$id: 'qa-child', _$type: 'Sprite3D', name: 'Child' }] }));
    check('预制体加载并创建节点树', node instanceof Laya.Sprite3D && node.getChildAt(0).name === 'Child');
    const opaque = new Blob(['opaque']);
    check('未知扩展名仍返回 Blob', await parse('nor/qa.bin', opaque) === opaque);
    const failures = [];
    const oldError = console.error;
    console.error = (...args) => failures.push(args.map(String).join(' '));
    try {
        check('损坏 controller 返回 null', await parse('nor/broken.controller', new Blob(['{'])) === null);
        const missing = JSON.parse(JSON.stringify(data));
        missing.controllerLayers[0].states.find(s => s.id === '42').clip._$uuid = 'nor/missing.lani';
        blobs.set('nor/missing.lani', null);
        check('缺失 clip 不返回半成品 controller', await parse('nor/missing.controller', jsonBlob(missing)) === null);
    } finally {
        console.error = oldError;
    }
    Res.init();
    const net = Res.net;
    Res.net = {
        storage: { set: (key, value, done) => done(true), deleteFile: (key, done) => done(), getFile: (key, done) => done(null) },
        fetchInfo: async () => ({ etag: null, lm: null, size: 0 })
    };
    const mount = async (pack, paths) => {
        const files = {};
        const body = [];
        let size = 0;
        for (const path of paths) {
            const blob = await getBlob(pack + '/' + path);
            const parts = path.split('/');
            let target = files;
            for (const part of parts.slice(0, -1)) target = target[part] || (target[part] = {});
            target[parts[parts.length - 1]] = [size, blob.size];
            body.push(blob);
            size += blob.size;
        }
        const header = new TextEncoder().encode(JSON.stringify({ version: 'qa', files }));
        const prefix = new Uint8Array(8);
        prefix.set(new TextEncoder().encode('BRP1'));
        new DataView(prefix.buffer).setUint32(4, header.length + 8, false);
        const blob = new Blob([prefix, header, ...body]);
        await new Promise((resolve, reject) => Res._processDownloadedBlob(blob, pack + '.res', pack, info => info ? resolve(info) : reject(new Error('Pack mount failed'))));
    };
    try {
        await mount('nor', ['sky.lmat', 'court.jpg', 'ani.controller', ...['diving', 'down', 'hitoff', 'jumphit', 'left', 'right', 'stand', 'up'].map(name => 'boy/' + name + '.lani')]);
        const packedSky = await new Promise(resolve => Res.get('nor/sky.lmat', resolve));
        check('Res.get 天空回调返回完整材质与纹理', packedSky instanceof Laya.SkyPanoramicMaterial && packedSky.panoramicTexture.width === 1920);
        await mount('ui', ['internal/UI/comp.png', 'internal/UI/comp.atlas']);
        const packed = await Res.get('nor/ani.controller');
        check('Res.get 经包索引调用独立加载器', packed instanceof Laya.AnimatorController);
        check('Res.get 保留缓存和 @ 路径', await Res.get('nor@ani.controller') === packed && Res.val('nor@ani.controller') === packed);
        check('Res.get callback 接口保持可用', await new Promise(resolve => Res.get('nor/ani.controller', resolve)) === packed);
        check('Res.get blob 接口不返回已解析缓存', await Res.get('nor/ani.controller', 'blob') instanceof Blob);
        check('Res 图集资源组委托保持可用', await Res.get('ui/internal/UI/comp') instanceof Laya.AtlasResource);
        const packedAnimator = makeAnimator(packed);
        check('包内控制器正确挂载默认状态与转换', packedAnimator.layer.defaultState.name === 'stand' && packedAnimator.layer.getAnimatorState('diving').transitions.length > 0);
        packedAnimator.node.destroy();
        Res.clear('nor/ani.controller');
        check('Res.clear 后重新构建控制器', await Res.get('nor/ani.controller') !== packed);
    } finally {
        Res.net = net;
    }
    node.destroy();
    original.node.destroy();
    clonedNode.destroy();
    a.node.destroy();
    b.node.destroy();
    return { passed: checks.length, checks, expectedErrors: failures };
};
