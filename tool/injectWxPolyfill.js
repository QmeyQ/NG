/**
 * injectWxPolyfill.js — 微信环境 polyfill 注入 GOBE.js 头部(幂等)
 *
 * 用法: node tool/injectWxPolyfill.js
 *
 * 背景(2026-10-21): 微信逻辑层无全局 URL 构造类, GOBE.js(内嵌 axios)模块顶层
 * 立即执行 new URL(Me.origin) 做 sameOrigin 判定 → require 期即崩
 * "Can't find variable: URL"。另 weapp-adapter 的 FileReader 是空壳类
 * (无 readAsText), res.ts 的 spine/atlas 链路也依赖 URL.createObjectURL。
 *
 * 注入内容(全部 typeof wx 守卫, web 发布同文件零副作用):
 *   A. URL 构造类(WHATWG 子集: href/protocol/host/port/pathname/origin + base 相对拼接)
 *   B. btoa/atob 手写(微信无)
 *   C. URL.createObjectURL/revokeObjectURL — 强制覆盖(原生备份 __nativeCreateObjectURL)。
 *      基础库3.x 原生版返回 blob: 协议, adapter XHR(wx.request) 与 wx Image 均不认 blob:
 *      → 引擎 loader 拿原生 blob: URL 必失败(预制体/图片全挂)。故一律覆盖为内存注册表
 *      blobwx://<id>, 由 D/E 段 hook 消费。
 *   D. XHR hook — blobwx:// url → 内存 blob 直接模拟响应(不走 wx.request), responseType
 *      为 json 时 parse 成对象对齐 adapter 原生行为。
 *   E. Image 覆盖(Proxy wx.createImage) — blobwx:// src → 异步写 USER_DATA_PATH
 *      临时文件 → inner.src=文件路径(wx Image 认本地路径不认 blob:)
 *   F. FileReader 完整实现(readAsText/readAsArrayBuffer + onload/result)
 *
 * 幂等策略: 已含 __WX_PF__ 标记时先剥离旧注入块(以 __WX_PF_END__ 结束标记为界,
 * 旧版无 END 标记则按 polyfill 尾行正则定位)再重新注入 — polyfill 模板更新后直接重跑即可。
 *
 * GOBE SDK 升级重拷后需重跑本脚本。注入点选 GOBE.js(game.js 中它在
 * bundle.js 之前 require, 且早于 res.ts 任何运行期 URL 调用)。
 */
const fs = require('fs');
const path = require('path');

const MARK = '__WX_PF__';
const binFile = path.join(__dirname, '..', 'src', 'libs', 'GOBE.js');
const relFile = path.join(__dirname, '..', 'release', 'wxgame', 'js', 'GOBE.js');

const PF = [
'/*' + MARK + ' 微信环境 polyfill (tool/injectWxPolyfill.js 注入, GOBE 升级后重跑) */',
'(function (g) {',
'  if (typeof wx === "undefined" || typeof wx.getFileSystemManager !== "function") return;',
'  var reg = new Map();   // blobwx:// -> blob',
'  var files = new Map(); // blobwx:// -> USER_DATA_PATH 文件',
'  var uid = 0;',
'',
'  function blobAb(b) {',
'    try {',
'      if (b instanceof ArrayBuffer) return Promise.resolve(b);',
'      if (b && typeof b.arrayBuffer === "function") return Promise.resolve(b.arrayBuffer());',
'      if (b instanceof Uint8Array) return Promise.resolve(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));',
'    } catch (e) {}',
'    return Promise.resolve(new ArrayBuffer(0));',
'  }',
'',
'  var _td = null;',
'  function ab2txt(ab) {',
'    try {',
'      if (typeof TextDecoder !== "undefined") { _td = _td || new TextDecoder("utf-8"); return _td.decode(ab); }',
'    } catch (e) {}',
'    var u = new Uint8Array(ab), s = "", i = 0;',
'    while (i < u.length) {',
'      var c = u[i];',
'      if (c < 128) { s += String.fromCharCode(c); i++; }',
'      else if (c < 224) { s += String.fromCharCode(((c & 31) << 6) | (u[i + 1] & 63)); i += 2; }',
'      else if (c < 240) { s += String.fromCharCode(((c & 15) << 12) | ((u[i + 1] & 63) << 6) | (u[i + 2] & 63)); i += 3; }',
'      else { var cp = ((c & 7) << 18) | ((u[i + 1] & 63) << 12) | ((u[i + 2] & 63) << 6) | (u[i + 3] & 63); cp -= 65536; s += String.fromCharCode(55296 + (cp >> 10), 56320 + (cp & 1023)); i += 4; }',
'    }',
'    return s;',
'  }',
'',
'  // ---- A. URL 构造类 ----',
'  if (typeof g.URL !== "function") {',
'    function PURL(s) {',
'      var m = /^([a-zA-Z][a-zA-Z0-9+.\\-]*):\\/\\/([^\\/?#]*)([^?#]*)(\\?[^#]*)?(#.*)?/.exec(String(s));',
'      if (!m) return null;',
'      var host = m[2].replace(/^[^@]*@/, "");',
'      var at = host.lastIndexOf(":"), hn = at > 0 ? host.slice(0, at) : host, port = at > 0 ? host.slice(at + 1) : "";',
'      var pr = m[1];',
'      if ((pr === "http" && port === "80") || (pr === "https" && port === "443") || (pr === "ws" && port === "80") || (pr === "wss" && port === "443")) port = "";',
'      return { pr: pr, host: host, hn: hn, port: port, path: m[3] || "/", q: m[4] || "", f: m[5] || "" };',
'    }',
'    function joinU(b, u) {',
'      if (u.charAt(0) === "/") return b.pr + "//" + b.host + u;',
'      var dir = b.path.replace(/[^\\/]*$/, "");',
'      return b.pr + "//" + b.host + dir + u;',
'    }',
'    function URLX(url, base) {',
'      if (!(this instanceof URLX)) return new URLX(url, base);',
'      url = String(url == null ? "" : url);',
'      var bp = null;',
'      if (base != null) bp = PURL(base instanceof URLX ? base.href : String(base));',
'      var p = PURL(url);',
'      if (!p && bp) p = PURL(joinU(bp, url));',
'      if (!p) p = { pr: "", host: "", hn: "", port: "", path: url, q: "", f: "" };',
'      this._u = p;',
'    }',
'    URLX.prototype.toString = function () { var p = this._u; return (p.pr ? p.pr + "//" : "") + p.host + p.path + p.q + p.f; };',
'    Object.defineProperties(URLX.prototype, {',
'      href: { get: function () { return this.toString(); } },',
'      protocol: { get: function () { return this._u.pr ? this._u.pr + ":" : ""; } },',
'      host: { get: function () { var p = this._u; return p.port ? p.hn + ":" + p.port : p.hn; } },',
'      hostname: { get: function () { return this._u.hn; } },',
'      port: { get: function () { return this._u.port; } },',
'      pathname: { get: function () { return this._u.path; } },',
'      search: { get: function () { return this._u.q; } },',
'      hash: { get: function () { return this._u.f; } },',
'      origin: { get: function () { var p = this._u; return p.pr ? p.pr + "://" + (p.port ? p.hn + ":" + p.port : p.hn) : "null"; } }',
'    });',
'    g.URL = URLX;',
'  }',
'',
'  // ---- B. btoa/atob ----',
'  if (typeof g.btoa !== "function") {',
'    var B64C = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";',
'    g.btoa = function (s) {',
'      var u = new Uint8Array(s.length);',
'      for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255;',
'      var r = "", j = 0;',
'      for (; j + 2 < u.length; j += 3) r += B64C[u[j] >> 2] + B64C[((u[j] & 3) << 4) | (u[j + 1] >> 4)] + B64C[((u[j + 1] & 15) << 2) | (u[j + 2] >> 6)] + B64C[u[j + 2] & 63];',
'      var rest = u.length - j;',
'      if (rest === 1) r += B64C[u[j] >> 2] + B64C[(u[j] & 3) << 4] + "==";',
'      else if (rest === 2) r += B64C[u[j] >> 2] + B64C[((u[j] & 3) << 4) | (u[j + 1] >> 4)] + B64C[(u[j + 1] & 15) << 2] + "=";',
'      return r;',
'    };',
'  }',
'  if (typeof g.atob !== "function") {',
'    g.atob = function (s) {',
'      s = String(s).replace(/=+$/, "");',
'      var buf = [];',
'      for (var i = 0; i < s.length; i += 4) {',
'        var n = 0, k = 0;',
'        for (var j = 0; j < 4 && i + j < s.length; j++) { var d = B64C.indexOf(s[i + j]); if (d < 0) continue; n = (n << 6) | d; k += 6; }',
'        for (var b = k - 8; b >= 0; b -= 8) buf.push((n >> b) & 255);',
'      }',
'      var r = "";',
'      for (var x = 0; x < buf.length; x++) r += String.fromCharCode(buf[x]);',
'      return r;',
'    };',
'  }',
'',
'  // ---- C. createObjectURL / revokeObjectURL (强制覆盖) ----',
'  // 基础库3.x 原生返回 blob: 协议, adapter XHR(wx.request) 与 wx Image 均不支持 → 一律覆盖',
'  var U = g.URL;',
'  if (U) {',
'    if (typeof U.createObjectURL === "function" && !U.__nativeCreateObjectURL) {',
'      U.__nativeCreateObjectURL = U.createObjectURL;',
'    }',
'    U.createObjectURL = function (blob) {',
'      var u = "blobwx://" + (++uid);',
'      reg.set(u, blob);',
'      return u;',
'    };',
'    U.revokeObjectURL = function (u) {',
'      reg.delete(u);',
'      var p = files.get(u);',
'      if (p) { files.delete(u); try { wx.getFileSystemManager().unlink({ filePath: p, fail: function () {} }); } catch (e) {} }',
'    };',
'  }',
'',
'  // ---- D. XHR hook: blobwx:// → 内存响应 ----',
'  var XHR = g.XMLHttpRequest;',
'  if (XHR && XHR.prototype && typeof XHR.prototype.send === "function") {',
'    var oo = XHR.prototype.open, os = XHR.prototype.send;',
'    XHR.prototype.open = function (m, u) {',
'      this.__wxu = (typeof u === "string") ? u : "";',
'      return oo.apply(this, arguments);',
'    };',
'    XHR.prototype.send = function (d) {',
'      var u = this.__wxu, self = this;',
'      if (!u || u.indexOf("blobwx://") !== 0 || !reg.has(u)) return os.apply(this, arguments);',
'      blobAb(reg.get(u)).then(function (ab) {',
'        try {',
'          self.status = 200; self.readyState = 4;',
'          if (self.responseType === "arraybuffer" || self.responseType === "blob") { self.response = ab; self.responseText = ""; }',
'          else if (self.responseType === "json") { var jt = ab2txt(ab); self.responseText = jt; try { self.response = JSON.parse(jt); } catch (e) { self.response = null; } }',
'          else { self.response = self.responseText = ab2txt(ab); }',
'          if (self.onreadystatechange) self.onreadystatechange();',
'          if (self.onprogress) self.onprogress({ lengthComputable: true, loaded: ab.byteLength, total: ab.byteLength });',
'          if (self.onload) self.onload({ type: "load", target: self });',
'          try { if (self.dispatchEvent) self.dispatchEvent({ type: "load" }); } catch (e) {}',
'          if (self.onloadend) self.onloadend({ type: "loadend", target: self });',
'        } catch (e) { if (self.onerror) self.onerror({ type: "error" }); }',
'      }, function () {',
'        if (self.onerror) self.onerror({ type: "error" });',
'        if (self.onloadend) self.onloadend({ type: "loadend" });',
'      });',
'    };',
'  }',
'',
'  // ---- E. Image 覆盖: blobwx:// src → 临时文件 → wx Image ----',
'  var EXTS = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/bmp": ".bmp", "image/gif": ".gif" };',
'  if (typeof Proxy === "function" && g.Image) {',
'    function mkImg() {',
'      var inner = wx.createImage();',
'      return new Proxy(inner, {',
'        get: function (t, k) { return t[k]; },',
'        set: function (t, k, v) {',
'          if (k === "src" && typeof v === "string" && reg.has(v)) {',
'            var u = v, blob = reg.get(u);',
'            t.__wxsrc = v;',
'            blobAb(blob).then(function (ab) {',
'              var ext = EXTS[(blob && blob.type) || ""] || ".png";',
'              var p = wx.env.USER_DATA_PATH + "/wxpf" + (++uid) + ext;',
'              wx.getFileSystemManager().writeFile({',
'                filePath: p, data: ab,',
'                success: function () { files.set(u, p); t.src = p; },',
'                fail: function () { if (t.onerror) t.onerror({ type: "error" }); }',
'              });',
'            }, function () { if (t.onerror) t.onerror({ type: "error" }); });',
'            return true;',
'          }',
'          t[k] = v;',
'          return true;',
'        }',
'      });',
'    }',
'    g.Image = function () { return mkImg(); };',
'  }',
'',
'  // ---- F. FileReader 完整实现(adapter 的是空壳类) ----',
'  function FileReaderX() {',
'    this.onload = null; this.onerror = null; this.onloadend = null; this.onabort = null;',
'    this.result = null; this.readyState = 0;',
'  }',
'  function frDone(fr, ok) {',
'    fr.readyState = 2;',
'    if (ok && fr.onload) fr.onload({ type: "load", target: fr });',
'    if (!ok && fr.onerror) fr.onerror({ type: "error", target: fr });',
'    if (fr.onloadend) fr.onloadend({ type: "loadend", target: fr });',
'  }',
'  FileReaderX.prototype.readAsText = function (blob, enc) {',
'    var self = this; this.readyState = 1;',
'    blobAb(blob).then(function (ab) { self.result = ab2txt(ab); frDone(self, true); },',
'      function () { frDone(self, false); });',
'  };',
'  FileReaderX.prototype.readAsArrayBuffer = function (blob) {',
'    var self = this; this.readyState = 1;',
'    blobAb(blob).then(function (ab) { self.result = ab; frDone(self, true); },',
'      function () { frDone(self, false); });',
'  };',
'  FileReaderX.prototype.readAsDataURL = function (blob) {',
'    var self = this; this.readyState = 1;',
'    blobAb(blob).then(function (ab) {',
'      var u = new Uint8Array(ab), bin = "";',
'      for (var i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]);',
'      self.result = "data:" + ((blob && blob.type) || "application/octet-stream") + ";base64," + g.btoa(bin);',
'      frDone(self, true);',
'    }, function () { frDone(self, false); });',
'  };',
'  FileReaderX.prototype.abort = function () {};',
'  g.FileReader = FileReaderX;',
'})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));',
'/*__WX_PF_END__*/',
''
].join('\n');

// ---- 注入执行(已含标记则先剥离旧注入块再重注入, 支持模板升级) ----
const END_MARK = '__WX_PF_END__';
const START_TAG = '/*' + MARK;
let src = fs.readFileSync(binFile, 'utf8');

const start = src.indexOf(START_TAG);
if (start >= 0) {
    const endTag = '/*' + END_MARK + '*/';
    const endIdx = src.indexOf(endTag);
    if (endIdx >= 0 && endIdx > start) {
        src = src.slice(0, start) + src.slice(endIdx + endTag.length).replace(/^\n/, '');
    } else {
        // 旧版注入无 END 标记: 以 polyfill 尾行(IIFE 收口)为界剥离
        const tailRe = /\}\)\(typeof globalThis !== "undefined" \? globalThis : \(typeof window !== "undefined" \? window : this\)\);\n?/;
        const m = tailRe.exec(src.slice(start));
        if (!m) {
            console.error('[injectWxPolyfill] 检测到 ' + MARK + ' 但无法定位旧注入块尾部, 请手动清理 GOBE.js 头部后重跑');
            process.exit(1);
        }
        src = src.slice(0, start) + src.slice(start + m.index + m[0].length);
    }
    console.log('[injectWxPolyfill] 已剥离旧注入块');
}

src = PF + src;
fs.writeFileSync(binFile, src);
console.log('[injectWxPolyfill] bin/js/GOBE.js 注入完成 (+' + PF.length + ' 字节)');

if (fs.existsSync(relFile)) {
    fs.copyFileSync(binFile, relFile);
    console.log('[injectWxPolyfill] release/wxgame/js/GOBE.js 已同步 bin 版');
} else {
    console.log('[injectWxPolyfill] release/wxgame/js/GOBE.js 不存在, 跳过 (发布后重跑本脚本)');
}
console.log('[injectWxPolyfill] 完成');