
const path = require('path');
const { AGCClient, CredentialParser } = require('@agconnect/common-server');
const cred = path.resolve(__dirname, 'te_src/resources/agc-apiclient-1503913765794529216-7418901157095317432.json');
AGCClient.initialize(CredentialParser.toCredential(cred));
require('@hw-agconnect/cloudstorage');
const api = require('@hw-agconnect/api');
console.log('api keys', Object.keys(api).join(','));
let inst;
try { inst = api.instance(); console.log('instance OK', typeof inst, inst && Object.keys(inst).slice(0, 10).join(',')); } catch (e) { console.log('instance ERR', e.message.slice(0, 200)); }
if (!inst) process.exit(1);
let storage;
try { storage = api.cloudStorage(inst, 'sgf-rhq1y'); console.log('storage OK', Object.keys(storage).slice(0, 8).join(',')); } catch (e) { console.log('storage ERR', e.message.slice(0, 200)); process.exit(1); }
(async () => {
  try {
    const ref = storage.storageReference('js/bundle.js');
    console.log('ref', ref.path);
    const file = require('fs').readFileSync(path.resolve(__dirname, '../../release/web/js/bundle.js'));
    const task = ref.put(new Uint8Array(file), { contentType: 'text/javascript' });
    if (task && task.on) {
      task.on('state_changed', (snap) => { console.log('state', snap && snap.state, snap && snap.bytesTransferred, snap && snap.totalBytes); }, (err) => { console.log('UPLOAD ERR', String(err && (err.message || err)).slice(0, 300)); process.exit(2); }, () => { console.log('UPLOAD DONE'); ref.getDownloadURL().then(u => { console.log('URL', u); process.exit(0); }).catch(e => { console.log('URLERR', e.message.slice ? e.message.slice(0,120) : e); process.exit(0); }); });
    } else { console.log('put returned', task); process.exit(0); }
    setTimeout(() => { console.log('TIMEOUT'); process.exit(3); }, 90000);
  } catch (e) { console.log('PUT ERR', String(e && (e.stack || e)).slice(0, 500)); process.exit(2); }
})();
