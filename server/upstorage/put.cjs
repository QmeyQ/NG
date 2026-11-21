'use strict';
const path = require('path');
const { AGCClient, CredentialParser } = require('@agconnect/common-server');
const credPath = path.resolve(__dirname, 'te_src/resources/agc-apiclient-1503913765794529216-7418901157095317432.json');
AGCClient.initialize(CredentialParser.toCredential(credPath));
(async () => {
  const tok = await AGCClient.getInstance().getCredential().getAccessToken();
  console.log('TOKEN len=' + tok.length + ' prefix=' + tok.slice(0, 24));
  const fs = require('fs');
  const file = fs.readFileSync(path.resolve(__dirname, '../../release/web/js/bundle.js'));
  const h = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../local/upload_headers.json'), 'utf8'));
  const req = h.find(e => e.req && e.req.includes('agc-storage'));
  const teamId = req.hdr.teamId, productId = req.hdr.productId;
  const boundary = '----upstorage' + Date.now();
  const body = Buffer.concat([
    Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="bundle.js"\r\nContent-Type: text/javascript\r\n\r\n'),
    file,
    Buffer.from('\r\n--' + boundary + '--\r\n'),
  ]);
  const headers = {
    'Authorization': 'Bearer ' + tok,
    'productId': productId,
    'teamId': teamId,
    'X-Agc-File-Size': String(file.length),
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Accept': 'application/json',
    'Origin': 'https://developer.huawei.com',
    'Referer': 'https://developer.huawei.com/',
  };
  const r = await fetch('https://agc-storage-drcn.developer.huawei.com/v0/sgf-rhq1y?name=js/bundle.js', { method: 'POST', headers, body });
  console.log('UPLOAD status=' + r.status + ' body=' + (await r.text()).slice(0, 300));
})().catch(e => { console.log('ERR ' + (e && e.stack || e)); process.exit(1); });
