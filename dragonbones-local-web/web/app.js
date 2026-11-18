/* 龙骨本地播放器 —— 基于本地源码编译的 DragonBones 5.7 运行时 + PixiJS 4.6.2
 * 纯前端、离线运行；本地 HTTP 服务下打开即可（file:// 会因 XHR 限制无法读取 JSON）。
 */
'use strict';

var DEMOS = [
  { id: 'mecha_1004d', title: '机甲 1004d', desc: 'JSON 数据（_ske.json）', base: 'assets/mecha_1004d/mecha_1004d', binary: false },
  { id: 'mecha_1406',  title: '机甲 1406', desc: '二进制数据（_ske.dbbin）', base: 'assets/mecha_1406/mecha_1406', binary: true }
];

var app = null;
var stageEl = null;
var current = {
  display: null,
  bounds: null,
  fitScale: 1,
  zoom: 1,
  speed: 1,
  playing: true,
  skeData: null,
  pairs: null,
  label: '',
  armature: ''
};

/* ---------------- 基础工具 ---------------- */

function $(id) { return document.getElementById(id); }
function viewW() { return app ? app.renderer.width : 0; }
function viewH() { return app ? app.renderer.height : 0; }

function setHint(text) {
  var h = $('hint');
  h.style.display = text ? 'block' : 'none';
  h.innerHTML = text || '';
}

function showError(msg) {
  var e = $('err');
  e.textContent = msg;
  e.style.display = 'block';
  setHint('');
  console.error('[龙骨播放器]', msg);
}

function hideError() { $('err').style.display = 'none'; }

var toastTimer = null;
function toast(msg) {
  var t = $('toast');
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.style.opacity = '0'; }, 1800);
}

function readText(file) {
  return new Promise(function (resolve, reject) {
    var fr = new FileReader();
    fr.onload = function () { resolve(String(fr.result)); };
    fr.onerror = function () { reject(new Error('读取文件失败：' + file.name)); };
    fr.readAsText(file);
  });
}

function readBuffer(file) {
  return new Promise(function (resolve, reject) {
    var fr = new FileReader();
    fr.onload = function () { resolve(fr.result); };
    fr.onerror = function () { reject(new Error('读取文件失败：' + file.name)); };
    fr.readAsArrayBuffer(file);
  });
}

function fetchJson(url) {
  return fetch(url, { cache: 'no-store' }).then(function (r) {
    if (!r.ok) { throw new Error('HTTP ' + r.status + ' · ' + url); }
    return r.json();
  });
}

function fetchBuffer(url) {
  return fetch(url, { cache: 'no-store' }).then(function (r) {
    if (!r.ok) { throw new Error('HTTP ' + r.status + ' · ' + url); }
    return r.arrayBuffer();
  });
}

function loadTexture(url) {
  return new Promise(function (resolve, reject) {
    var loader = new PIXI.loaders.Loader();
    loader.add('tex', url);
    loader.once('error', function (err) { reject(new Error('贴图加载失败：' + url)); });
    loader.load(function (l, resources) { resolve(resources.tex.texture); });
  });
}

/* ---------------- Pixi 初始化 ---------------- */

function initPixi() {
  stageEl = $('stage');
  app = new PIXI.Application({
    width: stageEl.clientWidth,
    height: stageEl.clientHeight,
    backgroundColor: 0x0b0d12,
    antialias: true,
    resolution: 1
  });
  stageEl.appendChild(app.view);

  window.addEventListener('resize', function () {
    app.renderer.resize(stageEl.clientWidth, stageEl.clientHeight);
    fitToView();
  });

  setInterval(function () {
    if (app && app.ticker) {
      $('fps').textContent = Math.round(app.ticker.FPS) + ' FPS';
    }
  }, 500);
}

/* ---------------- 视图变换 ---------------- */

function viewCenter() {
  // 底部控制条约占 110px，取景时让出来
  return { x: viewW() / 2, y: (viewH() - 110) / 2 };
}

function fitToView() {
  var d = current.display;
  if (!d) { return; }
  d.scale.set(1);
  d.position.set(0, 0);
  var b = d.getBounds();
  if (!b || b.width <= 0 || b.height <= 0) { return; }
  current.bounds = { x: b.x, y: b.y, w: b.width, h: b.height };
  var availW = viewW() - 80;
  var availH = viewH() - 110 - 50;
  current.fitScale = Math.min(availW / b.width, availH / b.height);
  applyTransform();
}

function applyTransform() {
  var d = current.display, b = current.bounds;
  if (!d || !b) { return; }
  var s = current.fitScale * current.zoom;
  d.scale.set(s);
  var c = viewCenter();
  d.position.set(c.x - (b.x + b.w / 2) * s, c.y - (b.y + b.h / 2) * s);
  $('iScale').textContent = (s * 100).toFixed(0) + '%';
}

/* ---------------- 加载与解析 ---------------- */

function applySet(skeData, pairs, label, preferredArmature) {
  hideError();
  clearStage();

  var factory = dragonBones.PixiFactory.factory;
  factory.clear();

  var dbData = null;
  try {
    dbData = factory.parseDragonBonesData(skeData);
  } catch (e) {
    showError('骨架数据解析失败：\n' + (e && e.message ? e.message : e));
    return;
  }
  if (!dbData) {
    showError('骨架数据解析失败：数据为空，或者不是 DragonBones 5.x 数据格式。');
    return;
  }

  try {
    pairs.forEach(function (p) { factory.parseTextureAtlasData(p.json, p.texture); });
  } catch (e) {
    showError('贴图集解析失败：\n' + (e && e.message ? e.message : e));
    return;
  }

  var names = (dbData.armatureNames || []).slice();
  if (names.length === 0) {
    showError('这份数据里没有骨架（armature）。');
    return;
  }

  current.skeData = skeData;
  current.pairs = pairs;
  current.label = label;
  current.armature = (preferredArmature && names.indexOf(preferredArmature) >= 0) ? preferredArmature : names[0];

  fillArmatureSelect(names, current.armature);
  buildArmature(current.armature, label, pairs);
}

function buildArmature(name, label, pairs) {
  var factory = dragonBones.PixiFactory.factory;
  var display = null;
  try {
    display = factory.buildArmatureDisplay(name);
  } catch (e) {
    showError('创建骨架失败：' + (e && e.message ? e.message : e));
    return;
  }
  if (!display) {
    showError('创建骨架失败：找不到「' + name + '」对应的数据。');
    return;
  }

  app.stage.addChild(display);
  current.display = display;
  current.zoom = 1;
  $('zoom').value = 1;
  $('zoomVal').textContent = '1.00×';

  var anims = (display.animation && display.animation.animationNames) ? display.animation.animationNames.slice() : [];
  fillAnimSelect(anims);

  current.playing = true;
  $('playBtn').textContent = '暂停';
  applySpeed();

  if (anims.length > 0) {
    playAnimation(anims[0]);
  }

  fitToView();
  // 首帧更新后再自适应一次：骨架首帧前 getBounds() 可能偏小
  setTimeout(fitToView, 120);

  var texInfo = pairs.map(function (p) {
    var bt = p.texture && p.texture.baseTexture ? p.texture.baseTexture : p.texture;
    return (bt && bt.width ? (bt.width + '×' + bt.height) : '未知尺寸');
  }).join('，');

  $('iSource').textContent = label;
  $('iArmature').textContent = name;
  $('iAnimCount').textContent = String(anims.length);
  $('iTexture').textContent = texInfo;
  setHint('');
  toast('已载入：' + label);
}

function playAnimation(name) {
  var d = current.display;
  if (!d || !d.animation || !name) { return; }
  var loop = $('loop').checked;
  try {
    d.animation.play(name, loop ? 0 : 1);
  } catch (e) {
    showError('播放动画失败：' + (e && e.message ? e.message : e));
    return;
  }
  applySpeed();
}

function applySpeed() {
  var d = current.display;
  if (!d || !d.animation) { return; }
  d.animation.timeScale = current.playing ? current.speed : 0;
}

function clearStage() {
  if (current.display) {
    try {
      current.display.animation.stop();
    } catch (e) { /* ignore */ }
    if (current.display.parent) { current.display.parent.removeChild(current.display); }
    try { current.display.dispose(); } catch (e) { /* ignore */ }
  }
  current.display = null;
  current.bounds = null;
}

/* ---------------- 下拉框 ---------------- */

function fillArmatureSelect(names, selected) {
  var sel = $('armature');
  sel.innerHTML = '';
  names.forEach(function (n) {
    var o = document.createElement('option');
    o.value = n;
    o.textContent = n;
    if (n === selected) { o.selected = true; }
    sel.appendChild(o);
  });
}

function fillAnimSelect(names) {
  var sel = $('anim');
  sel.innerHTML = '';
  if (names.length === 0) {
    var o = document.createElement('option');
    o.textContent = '（无动画）';
    sel.appendChild(o);
    return;
  }
  names.forEach(function (n, i) {
    var opt = document.createElement('option');
    opt.value = n;
    opt.textContent = n;
    if (i === 0) { opt.selected = true; }
    sel.appendChild(opt);
  });
}

/* ---------------- 内置示例 ---------------- */

function loadDemo(demo) {
  hideError();
  setHint('加载中…');
  var markupActive = function () {
    Array.prototype.forEach.call(document.querySelectorAll('.demo-btn'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-id') === demo.id);
    });
  };
  markupActive();

  var skePromise = demo.binary ? fetchBuffer(demo.base + '_ske.dbbin') : fetchJson(demo.base + '_ske.json');
  Promise.all([fetchJson(demo.base + '_tex.json'), skePromise, loadTexture(demo.base + '_tex.png')])
    .then(function (r) {
      applySet(r[1], [{ json: r[0], texture: r[2] }], demo.title);
    })
    .catch(function (e) {
      showError('内置示例加载失败：\n' + (e && e.message ? e.message : e));
    });
}

function renderDemoList() {
  var box = $('demoList');
  DEMOS.forEach(function (d) {
    var b = document.createElement('button');
    b.className = 'demo-btn';
    b.setAttribute('data-id', d.id);
    b.innerHTML = '<span>' + d.title + '</span><small>' + d.desc + '</small>';
    b.addEventListener('click', function () { loadDemo(d); });
    box.appendChild(b);
  });
}

/* ---------------- 本地文件 ---------------- */

function loadFromFiles(fileList) {
  hideError();
  var all = Array.prototype.slice.call(fileList);
  var bins = [];
  var jsons = [];
  var imgs = [];

  all.forEach(function (f) {
    var n = f.name.toLowerCase();
    if (n.slice(-6) === '.dbbin') { bins.push(f); }
    else if (n.slice(-5) === '.json' || n.slice(-5) === '.skel') { jsons.push(f); }
    else if (/\.(png|jpe?g|webp)$/.test(n)) { imgs.push(f); }
  });

  if (bins.length === 0 && jsons.length === 0) {
    showError('没有识别到骨架数据：\n需要 *_ske.json、*.skel 或 *_ske.dbbin 文件。');
    return;
  }
  if (imgs.length === 0) {
    showError('没有识别到贴图图片：\n需要 *_tex.png 之类的图片文件。');
    return;
  }

  // 先把所有 json 读出来，按内容判断谁是骨架、谁是贴图集（不依赖文件名）
  var readJsons = Promise.all(jsons.map(function (f) {
    return readText(f).then(function (t) {
      var obj = null;
      try { obj = JSON.parse(t); } catch (e) { /* 非 JSON，忽略 */ }
      return { file: f, obj: obj };
    });
  }));

  var readBin = bins.length ? readBuffer(bins[0]) : Promise.resolve(null);

  Promise.all([readJsons, readBin])
    .then(function (r) {
      var list = r[0];
      var bin = r[1];

      var skeItem = null;
      var texItems = [];
      list.forEach(function (it) {
        if (!it.obj) { return; }
        if (it.obj.armature) { if (!skeItem) { skeItem = it; } }
        else if (it.obj.SubTexture) { texItems.push(it); }
      });
      // 内容判断失败时用文件名兜底
      if (!skeItem) {
        skeItem = list.filter(function (it) { return /_ske\.(json|skel)$/i.test(it.file.name); })[0] || null;
      }
      if (texItems.length === 0) {
        texItems = list.filter(function (it) { return /_tex\.json$/i.test(it.file.name); });
      }

      var skeData = bin || (skeItem ? skeItem.obj : null);
      if (!skeData) { showError('没有找到骨架数据（armature）。'); return; }
      if (texItems.length === 0) { showError('没有找到贴图集数据（*_tex.json）。'); return; }

      var pairPromises = texItems.map(function (it, idx) {
        var prefix = it.file.name.replace(/_tex\.json$/i, '').replace(/\.(json|skel)$/i, '').toLowerCase();
        var img = imgs.filter(function (f) { return f.name.toLowerCase().indexOf(prefix) === 0; })[0]
          || imgs[Math.min(idx, imgs.length - 1)];
        var url = URL.createObjectURL(img);
        return loadTexture(url).then(function (tex) {
          return { json: it.obj, texture: tex };
        });
      });

      return Promise.all(pairPromises).then(function (pairs) {
        var label = '本地文件：' + (bin ? bins[0].name : skeItem.file.name);
        applySet(skeData, pairs, label);
      });
    })
    .catch(function (e) {
      showError('解析失败：\n' + (e && e.message ? e.message : e));
    });
}

/* ---------------- 事件绑定 ---------------- */

function bindUI() {
  $('playBtn').addEventListener('click', function () {
    if (!current.display) { return; }
    current.playing = !current.playing;
    this.textContent = current.playing ? '暂停' : '播放';
    applySpeed();
  });

  $('loop').addEventListener('change', function () {
    var name = $('anim').value;
    if (name) { playAnimation(name); }
  });

  $('speed').addEventListener('input', function () {
    current.speed = parseFloat(this.value) || 1;
    $('speedVal').textContent = current.speed.toFixed(2) + '×';
    applySpeed();
  });

  $('zoom').addEventListener('input', function () {
    current.zoom = parseFloat(this.value) || 1;
    $('zoomVal').textContent = current.zoom.toFixed(2) + '×';
    applyTransform();
  });

  $('fitBtn').addEventListener('click', function () {
    current.zoom = 1;
    $('zoom').value = 1;
    $('zoomVal').textContent = '1.00×';
    fitToView();
  });

  $('anim').addEventListener('change', function () {
    playAnimation(this.value);
  });

  $('armature').addEventListener('change', function () {
    if (!current.skeData) { return; }
    applySet(current.skeData, current.pairs, current.label, this.value);
  });

  $('pickFiles').addEventListener('click', function () { $('fileInput').click(); });
  $('pickFolder').addEventListener('click', function () { $('folderInput').click(); });
  $('fileInput').addEventListener('change', function () {
    if (this.files && this.files.length) { loadFromFiles(this.files); }
    this.value = '';
  });
  $('folderInput').addEventListener('change', function () {
    if (this.files && this.files.length) { loadFromFiles(this.files); }
    this.value = '';
  });

  var drop = $('drop');
  ['dragenter', 'dragover'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
  });
  // 整页拖放（唯一入口，避免一次拖放触发两次加载）
  ['dragover', 'drop'].forEach(function (ev) {
    window.addEventListener(ev, function (e) { e.preventDefault(); });
  });
  window.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      loadFromFiles(e.dataTransfer.files);
    }
  });
}

/* ---------------- 启动 ---------------- */

(function main() {
  initPixi();
  renderDemoList();
  bindUI();

  // 支持 ?demo=mecha_1004d / ?demo=mecha_1406 直接打开指定示例
  var want = null;
  try { want = new URLSearchParams(window.location.search).get('demo'); } catch (e) { /* ignore */ }
  var demo = DEMOS.filter(function (d) { return d.id === want; })[0] || DEMOS[0];
  if (demo) {
    setTimeout(function () { loadDemo(demo); }, 200);
  }
})();
