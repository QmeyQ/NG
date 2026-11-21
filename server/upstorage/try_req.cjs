
console.log('start');
try { const cs = require('@hw-agconnect/cloudstorage'); console.log('cloudstorage OK', Object.keys(cs).slice(0,8).join(',')); } catch (e) { console.log('cloudstorage ERR', e.message.slice(0,200)); }
try { const inst = require('@hw-agconnect/instance'); console.log('instance OK', Object.keys(inst).slice(0,10).join(',')); } catch (e) { console.log('instance ERR', e.message.slice(0,200)); }
console.log('done');
process.exit(0);
