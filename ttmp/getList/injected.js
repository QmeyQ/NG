// injected.js
(function () {
  const DOWNLOAD_BASE = 'https://agc-storage-drcn.platform.dbankcloud.cn/v0/';
  let abortFlag = false;

  function post(type, payload) {
    window.postMessage({ type, payload }, '*');
  }

  // ========== 1. 等待 AGC_API 就绪 ==========
  function waitForApi(timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      const t0 = Date.now();
      const tick = () => {
        if (window.AGC_API && window.AGC_API.API_CLOUDSTORAGE) {
          resolve(window.AGC_API);
          return;
        }
        if (Date.now() - t0 > timeoutMs) {
          reject(new Error('AGC_API 未加载，请确认已打开 AGC 云存储文件列表页'));
          return;
        }
        setTimeout(tick, 300);
      };
      tick();
    });
  }

  // ========== 2. 解析 zoneId（多路兜底） ==========
  function resolveZoneId(api) {
    try {
      const z = api.getZoneId();
      if (z) return z;
    } catch (_) {}
    const cfg = window.top?.cfpConfig;
    if (cfg) {
      return cfg.chinaZoneID || cfg.singaporeZoneId || cfg.europeanZoneId || '';
    }
    return '';
  }

  // ========== 3. 自动探测当前桶 ==========
  async function resolveBucket(api) {
    // 优先从 URL / hash 读取
    const href = window.location.href + (window.top?.location?.hash || '');
    const m = href.match(/[?&]bucket=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
    // 其次尝试 queryBucketIds
    try {
      const res = await api.API_CLOUDSTORAGE.queryBucketIds({}, { zoneId: resolveZoneId(api) });
      const d = res?.data ?? res;
      const list = d?.bucketIds ?? d?.buckets ?? d?.data ?? [];
      if (Array.isArray(list) && list.length) return list[0];
    } catch (_) {}
    return 'sgf-rhq1y'; // 默认兜底
  }

  // ========== 4. 递归列举（S3 ListObjectsV2 语义） ==========
  async function listAllFiles(api, bucket, prefix = '', out = []) {
    const zoneId = resolveZoneId(api);
    const res = await api.API_CLOUDSTORAGE.listFiles(
      { bucket, prefix, delimiter: '/', maxKeys: 1000 },
      { zoneId }
    );
    const d = res?.data ?? res;
    // 兼容不同响应层级
    const body = d?.ret ? d : (d?.data ?? d);
    if (body?.ret && body.ret.code !== 0) {
      throw new Error(`listFiles 失败: code=${body.ret.code} msg=${body.ret.msg}`);
    }

    const contents = body?.contents ?? body?.objects ?? [];
    const folders = body?.commonPrefixes ?? body?.folders ?? [];

    for (const it of contents) {
      const key = it.key ?? it.name ?? it.objectKey;
      if (!key) continue;
      if (key.endsWith('/')) {
        folders.push({ prefix: key });
      } else {
        out.push({
          key,
          size: it.size,
          lastModified: it.lastModified ?? it.lastModifiedTime,
        });
      }
    }

    for (const f of folders) {
      const p = f.prefix ?? f.name ?? f;
      await listAllFiles(api, bucket, p, out);
    }
    return out;
  }

  // ========== 5. 单文件生成 token ==========
  async function createToken(api, bucket, objectKey) {
    const zoneId = resolveZoneId(api);
    const res = await api.API_CLOUDSTORAGE.createToken(
      { bucket, objectKey },
      { zoneId }
    );
    const d = res?.data ?? res;
    const body = d?.ret ? d : (d?.data ?? d);
    if (body?.ret && body.ret.code !== 0) {
      throw new Error(`createToken 失败: code=${body.ret.code} msg=${body.ret.msg}`);
    }
    return body?.token ?? body?.shareToken ?? body?.data?.token ?? '';
  }

  // ========== 6. 主流程 ==========
  async function traverse(bucketOverride) {
    abortFlag = false;
    try {
      post('__AGC_TRAVERSE_STATUS__', { status: 'init' });
      const api = await waitForApi();
      const bucket = bucketOverride || (await resolveBucket(api));
      post('__AGC_TRAVERSE_STATUS__', { status: 'bucket', bucket });

      const files = await listAllFiles(api, bucket);
      post('__AGC_TRAVERSE_STATUS__', { status: 'listed', total: files.length });
      if (!files.length) {
        post('__AGC_TRAVERSE_STATUS__', { status: 'done', count: 0 });
        return;
      }

      const tokens = [];
      for (let i = 0; i < files.length; i++) {
        if (abortFlag) {
          post('__AGC_TRAVERSE_STATUS__', { status: 'aborted', done: i });
          return;
        }
        const f = files[i];
        try {
          const token = await createToken(api, bucket, f.key);
          if (token) {
            tokens.push({ fileName: f.key, token });
            post('__AGC_TRAVERSE_STATUS__', {
              status: 'progress',
              current: i + 1,
              total: files.length,
              fileName: f.key,
            });
          }
        } catch (e) {
          post('__AGC_TRAVERSE_STATUS__', {
            status: 'warn',
            fileName: f.key,
            message: e.message,
          });
        }
        // 轻微节流，避免批量 createToken 触发限流
        await new Promise(r => setTimeout(r, 80));
      }

      post('__AGC_TOKEN_DATA__', tokens);
      post('__AGC_TRAVERSE_STATUS__', { status: 'done', count: tokens.length });
    } catch (err) {
      post('__AGC_TRAVERSE_STATUS__', { status: 'error', message: err.message });
    }
  }

  // ========== 7. 接收触发/中止指令 ==========
  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    if (e.data?.type === '__AGC_START_TRAVERSE__') {
      traverse(e.data.payload?.bucket);
    } else if (e.data?.type === '__AGC_ABORT_TRAVERSE__') {
      abortFlag = true;
    }
  });

  // ========== 8. 保留原请求钩子做兜底（用户手动点详情也能捕获） ==========
  const TOKEN_KEYS = ['token', 'sharedToken', 'downloadToken', 'shareToken', 'fileToken'];
  function deepFind(obj, acc = '', out = []) {
    if (!obj || typeof obj !== 'object') return out;
    for (const k of TOKEN_KEYS) {
      if (typeof obj[k] === 'string' && obj[k].length > 10) {
        const name = obj.name || obj.fileName || obj.objectName || obj.key || acc;
        if (name && name.includes('.')) out.push({ fileName: name, token: obj[k] });
      }
    }
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === 'object') deepFind(v, acc ? `${acc}/${k}` : k, out);
    }
    return out;
  }
  function relevant(url) {
    try {
      const u = new URL(url, location.href);
      return /agcstorage\.link|dbankcloud\.cn/i.test(u.hostname) &&
             /\/v0\/|\/storage\/|\/list|\/listFiles|\/createToken/.test(u.pathname);
    } catch { return false; }
  }
  const rawFetch = window.fetch;
  window.fetch = function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    const rel = relevant(url);
    return rawFetch.apply(this, args).then(res => {
      if (rel) {
        res.clone().json().then(d => {
          const t = deepFind(d);
          if (t.length) post('__AGC_TOKEN_DATA__', t);
        }).catch(() => {});
      }
      return res;
    });
  };
  const XHR = XMLHttpRequest.prototype;
  const _open = XHR.open, _send = XHR.send;
  XHR.open = function (m, u, ...rest) { this.__agc_url = u; return _open.call(this, m, u, ...rest); };
  XHR.send = function (...a) {
    if (relevant(this.__agc_url)) {
      this.addEventListener('load', () => {
        try {
          const d = JSON.parse(this.responseText);
          const t = deepFind(d);
          if (t.length) post('__AGC_TOKEN_DATA__', t);
        } catch {}
      });
    }
    return _send.apply(this, a);
  };

  console.log('[AGC Extractor] injected ready');
})();