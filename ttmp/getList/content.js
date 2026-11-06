// content.js
(function () {
  // 注入 injected.js 到主世界
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('injected.js');
  document.documentElement.appendChild(s);
  s.onload = () => s.remove();
})();

window.addEventListener('message', (e) => {
  if (e.source !== window) return;
  const t = e.data?.type;
  if (t === '__AGC_TOKEN_DATA__') {
    chrome.runtime.sendMessage({ type: 'AGC_TOKENS', tokens: e.data.payload });
  } else if (t === '__AGC_TRAVERSE_STATUS__') {
    chrome.runtime.sendMessage({ type: 'AGC_TRAVERSE_STATUS', status: e.data.payload });
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'START_TRAVERSE') {
    window.postMessage({ type: '__AGC_START_TRAVERSE__', payload: { bucket: msg.bucket } }, '*');
  } else if (msg.type === 'ABORT_TRAVERSE') {
    window.postMessage({ type: '__AGC_ABORT_TRAVERSE__' }, '*');
  }
});