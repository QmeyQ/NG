
const path = require('path');
const { AGCClient, CredentialParser } = require('@agconnect/common-server');
(async () => {
  const cred = JSON.parse(require('fs').readFileSync(path.resolve(__dirname, 'te_src/resources/agc-apiclient-1503913765794529216-7418901157095317432.json'), 'utf8'));
  AGCClient.initialize(CredentialParser.toCredential(path.resolve(__dirname, 'te_src/resources/agc-apiclient-1503913765794529216-7418901157095317432.json')));
  const tok = await AGCClient.getInstance().getCredential().getAccessToken();
  const body = require('fs').readFileSync(path.resolve(__dirname, '../../release/web/js/bundle.js'));
  const url = 'https://agc-storage-drcn.platform.dbankcloud.cn/v0/sgf-rhq1y/js/bundle.js';
  const baseHdr = {
    'app_id': '5765880207855344723',
    'client_id': cred.client_id,
    'productId': cred.project_id,
    'Content-Type': 'text/plain',
    'Accept': 'application/json',
    'Origin': 'https://developer.huawei.com',
    'Referer': 'https://developer.huawei.com/',
  };
  for (const [label, hdr, method] of [
    ['PUT-bearer', Object.assign({ Authorization: 'Bearer ' + tok }, baseHdr), 'PUT'],
    ['POST-bearer', Object.assign({ Authorization: 'Bearer ' + tok }, baseHdr), 'POST'],
    ['PUT-raw', Object.assign({ Authorization: tok }, baseHdr), 'PUT'],
  ]) {
    try {
      const r = await fetch(url, { method, headers: hdr, body });
      console.log(label, '->', r.status, (await r.text()).slice(0, 200));
    } catch (e) { console.log(label, 'ERR', e.message.slice(0, 150)); }
  }
})();
