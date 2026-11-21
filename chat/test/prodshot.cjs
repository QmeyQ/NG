'use strict';
const cp=require('child_process'),fs=require('fs'),path=require('path');
const {getJson,Page,sleep}=require('../../local/cdpkit.cjs');
const [url,out,w,h]=process.argv.slice(2);
const port=9231, prof=path.join(__dirname,'edge-prod-'+Date.now());
const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
(async()=>{
 const child=cp.spawn(edge,['--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1','--remote-debugging-port='+port,'--user-data-dir='+prof,'--window-size='+(w||1400)+','+(h||1000),'about:blank'],{windowsHide:true,stdio:'ignore'});
 let tabs=null;for(let i=0;i<25;i++){await sleep(500);try{tabs=await getJson('http://127.0.0.1:'+port+'/json/list');if(tabs&&tabs.length)break}catch(e){}}
 if(!tabs)throw new Error('no cdp');
 const pg=tabs.find(x=>x.type==='page');
 const p=await new Page(pg.webSocketDebuggerUrl).open();
 await p.send('Page.enable',{});await p.send('Emulation.setDeviceMetricsOverride',{width:+w||1400,height:+h||1000,deviceScaleFactor:1,mobile:false});
 await p.send('Page.navigate',{url});await sleep(5000);
 const r=await p.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,Buffer.from(r.result.data,'base64'));
 console.log('saved '+out+' '+fs.statSync(out).size);
 try{child.kill()}catch(e){}
 process.exit(0);
})().catch(e=>{console.log('ERR '+e.message);process.exit(1)});

