const DOWNLOAD_BASE = 'https://agc-storage-drcn.platform.dbankcloud.cn/v0/';

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type === 'AGC_TOKENS') {
    chrome.storage.local.get(['agcTokens'], (res) => {
      const map = new Map((res.agcTokens || []).map(x => [x.fileName, x]));
      (msg.tokens || []).forEach(x => map.set(x.fileName, x));
      const merged = Array.from(map.values());
      chrome.storage.local.set({ agcTokens: merged }, () => {
        chrome.action.setBadgeText({ text: String(merged.length) });
        reply({ ok: true, count: merged.length });  // ← 加回执
      });
    });
    return true;  // ← 声明异步响应
  }
  if (msg.type === 'GET_URLS') {
    chrome.storage.local.get(['agcTokens', 'agcBucket'], (res) => {
      const b = res.agcBucket || 'sgf-rhq1y';
      const urls = (res.agcTokens || []).map(({ fileName, token }) => {
        const p = fileName.startsWith('/') ? fileName.slice(1) : fileName;
        return `${DOWNLOAD_BASE}${b}/${p}?token=${token}`;
      });
      reply({ urls });
    });
    return true;
  }
});