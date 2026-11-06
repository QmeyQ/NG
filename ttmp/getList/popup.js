const $ = (id) => document.getElementById(id);
const out = null; // 不再用单一 textarea
const statusEl = $('status');
const logEl = $('log');
const bucketEl = $('bucket');
const groupsEl = $('groups');

const DOWNLOAD_BASE = 'https://agc-storage-drcn.platform.dbankcloud.cn/v0/';

function log(m) {
  console.log('[popup]', m);
  if (logEl) { logEl.textContent += '\n' + m; logEl.scrollTop = logEl.scrollHeight; }
}

// ---------- storage 安全封装 ----------
function storageGet(keys, cb) {
  try {
    if (chrome.storage && chrome.storage.local) { chrome.storage.local.get(keys, cb); return; }
  } catch (_) {}
  cb({});
}
function storageSet(obj, cb) {
  try {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(obj, () => {
        if (chrome.runtime.lastError) console.warn('[popup] storage set:', chrome.runtime.lastError.message);
        cb && cb();
      });
      return;
    }
  } catch (_) {}
  cb && cb();
}

// ---------- URL 拼接 ----------
function buildUrl(fileName, token, bucket) {
  const p = fileName.startsWith('/') ? fileName.slice(1) : fileName;
  return `${DOWNLOAD_BASE}${bucket}/${p}?token=${token}`;
}

// ---------- 按顶层文件夹分组 ----------
function groupByTopFolder(tokens) {
  const groups = new Map();
  for (const t of tokens) {
    if (!t || !t.fileName || !t.token) continue;
    const name = t.fileName;
    const idx = name.indexOf('/');
    const groupName = idx >= 0 ? name.slice(0, idx + 1) : '(根目录)';
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName).push(t);
  }
  const arr = Array.from(groups.entries());
  arr.sort((a, b) => {
    if (a[0] === '(根目录)') return -1;
    if (b[0] === '(根目录)') return 1;
    return a[0].localeCompare(b[0]);
  });
  return arr;
}

// ---------- 渲染分组 ----------
function renderGroups(tokens, bucket) {
  groupsEl.innerHTML = '';
  if (!tokens || !tokens.length) {
    groupsEl.innerHTML = '<div class="empty-tip">暂无数据，点击"自动遍历"</div>';
    statusEl.textContent = '(0 个文件)';
    return;
  }

  const groups = groupByTopFolder(tokens);
  for (const [groupName, list] of groups) {
    const urls = list.map(t => buildUrl(t.fileName, t.token, bucket));

    const section = document.createElement('div');
    section.className = 'group';

    const header = document.createElement('div');
    header.className = 'group-header';

    const title = document.createElement('span');
    title.className = 'group-title';
    title.textContent = groupName;
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = `(${list.length} 个)`;
    title.appendChild(count);

    const copyBtn = document.createElement('button');
    copyBtn.textContent = '复制本组';
    copyBtn.onclick = () => {
      const ta = section.querySelector('textarea');
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        copyBtn.textContent = '已复制 ✓';
        setTimeout(() => { copyBtn.textContent = '复制本组'; }, 1000);
      } catch (e) { log('复制失败: ' + e.message); }
    };

    header.appendChild(title);
    header.appendChild(copyBtn);
    section.appendChild(header);

    const ta = document.createElement('textarea');
    ta.readOnly = true;
    ta.value = urls.join('\n');
    // 按文件数动态给高度（2~10 行）
    ta.rows = Math.min(Math.max(list.length, 2), 10);
    section.appendChild(ta);

    groupsEl.appendChild(section);
  }

  statusEl.textContent = `(${tokens.length} 个文件 / ${groups.length} 个分组)`;
}

// ---------- 从 storage 加载 ----------
function load() {
  storageGet(['agcTokens', 'agcBucket'], (res) => {
    const tokens = res.agcTokens || [];
    const b = res.agcBucket || bucketEl.value.trim() || 'sgf-rhq1y';
    renderGroups(tokens, b);
  });
}

// ---------- 自动遍历 ----------
async function startTraverse() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return log('找不到当前标签页');
  const bucket = bucketEl.value.trim() || 'sgf-rhq1y';
  log('tab=' + tab.url);
  log('bucket=' + bucket);
  statusEl.textContent = '遍历中…';

  let results;
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      world: 'MAIN',
      func: async (bucket) => {
        const logs = [];
        const A = window.AGC_API;
        if (!A || !A.API_CLOUDSTORAGE) return { ok: false, logs: ['无 API_CLOUDSTORAGE'], tokens: [] };
        const API = A.API_CLOUDSTORAGE;

        async function listOnce(prefix) {
          const files = [], folders = new Set();
          let marker = '', guard = 0;
          while (true) {
            if (++guard > 50) { logs.push('分页超限 ' + prefix); break; }
            const body = { bucketName: bucket, maxKey: 1000 };
            if (prefix) body.prefix = prefix;
            if (marker) body.marker = marker;
            const r = await API.listFiles(body, {});
            const fl = r && r.fileList;
            if (!fl) throw new Error('无 fileList: ' + JSON.stringify(r).slice(0, 200));
            for (const it of fl.contents || []) {
              const key = it.key || '';
              const isFolder = !!it.folderName || key.endsWith('/');
              if (isFolder) { folders.add(key); continue; }
              const tok = it.tokenList && it.tokenList[0];
              if (tok) files.push({ fileName: key, token: tok });
              else logs.push('无 token: ' + key);
            }
            for (const p of fl.commonPrefixes || []) if (p.prefix) folders.add(p.prefix);
            if (!fl.truncated) break;
            marker = fl.nextMarker || fl.marker || '';
            if (!marker) break;
          }
          return { files, folders: Array.from(folders) };
        }

        const acc = [], visited = new Set();
        async function walk(prefix, depth) {
          if (depth > 10 || visited.has(prefix)) return;
          visited.add(prefix);
          const { files, folders } = await listOnce(prefix);
          logs.push(`[${prefix || '/'}] 文件 ${files.length}，子文件夹 ${folders.length}`);
          acc.push(...files);
          for (const f of folders) await walk(f, depth + 1);
        }

        try { await walk('', 0); }
        catch (e) { return { ok: false, logs, error: '遍历失败: ' + e.message, tokens: acc }; }
        return { ok: true, logs, tokens: acc };
      },
      args: [bucket],
    });
  } catch (e) {
    statusEl.textContent = '失败';
    return log('executeScript 失败: ' + e.message);
  }

  // 合并去重
  const map = new Map();
  let successFrames = 0;
  for (const r of results) {
    const d = r.result;
    if (!d) continue;
    if (d.ok) successFrames++;
    (d.logs || []).forEach(l => log(`[frame ${r.frameId}] ${l}`));
    if (d.error && !/403/.test(d.error)) log(`[frame ${r.frameId}] ✗ ${d.error}`);
    if (d.tokens) d.tokens.forEach(t => {
      const name = t.fileName || t.key;
      if (name && t.token) map.set(name, { fileName: name, token: t.token });
    });
  }

  if (successFrames === 0) {
    statusEl.textContent = '所有 frame 都失败';
    return;
  }

  const fresh = Array.from(map.values());
  log(`本次合并去重后 ${fresh.length} 个文件`);

  // 立即渲染（不等 storage）
  renderGroups(fresh, bucket);
  log('✓ 已渲染 ' + fresh.length + ' 条');

  // 异步持久化
  storageSet({ agcTokens: fresh, agcBucket: bucket });
  try { chrome.action.setBadgeText({ text: String(fresh.length) }); } catch (_) {}
}

// ---------- 全局复制 ----------
function copyAll() {
  const textareas = groupsEl.querySelectorAll('textarea');
  const all = [];
  textareas.forEach(ta => { if (ta.value) all.push(ta.value); });
  const text = all.join('\n');
  // 用临时 textarea 复制
  const tmp = document.createElement('textarea');
  tmp.value = text;
  tmp.style.position = 'fixed';
  tmp.style.left = '-9999px';
  document.body.appendChild(tmp);
  tmp.select();
  try {
    document.execCommand('copy');
    log('✓ 已复制全部 ' + text.split('\n').length + ' 行');
  } catch (e) { log('复制失败: ' + e.message); }
  tmp.remove();
}

// ---------- 事件绑定 ----------
$('start').onclick = startTraverse;
$('refresh').onclick = () => { log('刷新'); load(); };
$('copyAll').onclick = copyAll;
$('clear').onclick = () => {
  storageSet({ agcTokens: [] }, () => {
    groupsEl.innerHTML = '<div class="empty-tip">暂无数据，点击"自动遍历"</div>';
    logEl.textContent = '';
    statusEl.textContent = '(0 个文件)';
    try { chrome.action.setBadgeText({ text: '' }); } catch (_) {}
  });
};

load();