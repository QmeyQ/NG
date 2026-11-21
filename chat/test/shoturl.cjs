'use strict';
const cp=require('child_process'),fs=require('fs'),path=require('path');
const [url,out,w,h]=process.argv.slice(2);
const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const prof=path.join(__dirname,'edge-shot-'+Date.now());
const p=cp.spawn(edge,['--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1','--user-data-dir='+prof,'--window-size='+(w||1400)+','+(h||1000),'--virtual-time-budget=6000','--screenshot='+out,url],{windowsHide:true,stdio:['ignore','pipe','pipe']});
let log='';p.stdout.on('data',d=>log+=d);p.stderr.on('data',d=>log+=d);
p.on('close',c=>{console.log('exit',c,fs.existsSync(out)?fs.statSync(out).size:0);if(!fs.existsSync(out))console.log(log.slice(-1500));process.exit(0)});
setTimeout(()=>{try{p.kill()}catch(e){};console.log('timeout',fs.existsSync(out)?fs.statSync(out).size:0);process.exit(0)},25000);
