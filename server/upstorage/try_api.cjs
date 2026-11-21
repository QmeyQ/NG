
require('@hw-agconnect/cloudstorage');
const api = require('@hw-agconnect/api');
console.log('api keys:', Object.keys(api).join(','));
for (const k of Object.keys(api)) { const v = api[k]; if (v && typeof v === 'object') console.log(k, '->', Object.keys(v).slice(0, 14).join(',')); }
process.exit(0);
