// 只读真实公开接口；不写生产缓存，不使用测试夹具作为网络结果。
import assert from 'node:assert/strict';
import {Core} from '../tests/helpers.mjs';
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,url);return r.json();}
console.log('核验时间',new Date().toISOString());
const providers=await get('https://api.frankfurter.dev/v2/providers');
for(const key of ['ECB','BOC','BOE','BDI','BIS','HKMA','BOJ']){
 const p=providers.find(p=>p.key===key);
 console.log('央行目录',JSON.stringify({key,date:p.end_date,cadence:p.publish_cadence,count:p.currencies.length,missing:Core.DEFAULT_CODES.filter(c=>!p.currencies.includes(c)),terms:p.terms_url}));
}
let ecb;
for(const s of Core.SOURCES){
 const raw=await get(s.url),snapshot=Core.parseSource(s.key,raw);
 const rawCount=Array.isArray(raw)?raw.length:s.key==='er'?Object.keys(raw.rates).length:s.key==='float'?Object.keys(raw).length:Object.keys(raw.eur).length;
 assert.ok(Core.DEFAULT_CODES.every(c=>snapshot.rates[c]>0));
 console.log('最新汇率',JSON.stringify({key:s.key,name:s.name,url:s.url,date:snapshot.date,rawCount,currencyCount:Object.keys(snapshot.rates).length,perEUR:Object.fromEntries(Core.DEFAULT_CODES.map(c=>[c,snapshot.rates[c]]))}));
 if(s.key==='ecb')ecb=snapshot;
}
// BOE、BDI 仅作排除证据，不进入生产可选源。
for(const key of ['BOE','BDI']){const r=await get(`https://api.frankfurter.dev/v2/rates?providers=${key}&base=EUR`);console.log('排除候选',JSON.stringify({key,count:r.length,dates:[...new Set(r.map(x=>x.date))],defaultRates:r.filter(r=>Core.DEFAULT_CODES.includes(r.quote))}));}
for(const p of Core.PERIODS.filter(p=>!p.intraday)){
 const {from,to}=Core.historyRange(ecb.date,p.days);
 const raw=await get(`https://api.frankfurter.dev/v2/rates?providers=ECB&base=AUD&quotes=USD&from=${from}&to=${to}`);
 const records=Core.parseHistory(raw,'AUD','USD',from,to);assert.ok(records.length>1);
 console.log('ECB 历史',JSON.stringify({period:p.label,count:records.length,first:records[0].date,last:records.at(-1).date}));
}
const pair=await get(`https://api.frankfurter.dev/v2/rate/CNY/USD?providers=ECB&date=${ecb.date}`);
assert.ok(Math.abs(Core.convert(1,'CNY','USD',ecb)-pair.rate)<0.00001);
console.log('同日交叉换算核对通过',JSON.stringify(pair));
// Yahoo 为非官方接口，不把暂时不可用当成可合成行情。
for(const [hours,range,interval] of [[24,'2d','15m'],[168,'7d','30m']]){
 const load=async code=>Core.parseYahoo(await get(`https://query1.finance.yahoo.com/v8/finance/chart/USD${code}=X?interval=${interval}&range=${range}`));
 const [a,b]=await Promise.all([load('CNY'),load('AUD')]);const records=Core.crossIntraday('CNY','AUD',a,b,hours);assert.ok(records.length>1);
 console.log('Yahoo 日内',JSON.stringify({hours,count:records.length,last:records.at(-1)}));
}
console.log('所有纳入源、ECB历史、交叉换算与Yahoo日内真实接口验证通过。');
