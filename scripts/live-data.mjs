// 只读真实公开接口；不写生产缓存，不使用夹具作为网络结果。每源独立报告，不因一个端点失败跳过新增源。
import assert from 'node:assert/strict';
import {Core} from '../tests/helpers.mjs';
async function get(url,text=false){const r=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,url);return text?r.text():r.json();}
console.log('核验时间',new Date().toISOString());
const failures=[];
async function verify(label,run){try{await run();}catch(e){failures.push(label);console.error('真实验证失败',label,e.message);}}
await verify('Frankfurter机构目录',async()=>{
 const providers=await get('https://api.frankfurter.dev/v2/providers');
 for(const key of ['ECB','BOC','CFETS','FRED','INFOREURO','CBR']){
  const p=providers.find(p=>p.key===key);assert.ok(p,key);
  console.log('机构目录（仅证据，新源实际直连官方）',JSON.stringify({key,date:p.end_date,cadence:p.publish_cadence,pivot:p.pivot_currency,count:p.currencies.length,missing:Core.DEFAULT_CODES.filter(c=>!p.currencies.includes(c)),terms:p.terms_url}));
 }
});
let ecb;
for(const s of Core.SOURCES)await verify('最新 '+s.key,async()=>{
 const period=s.key==='inforeuro'?Core.inforEuroRequest():null;
 const url=period?.url||s.url;
 const raw=await get(url,['safe','fed','cbr'].includes(s.key));
 const data=period?{...period,rates:raw}:raw,snapshot=Core.parseSource(s.key,data);
 const rawCount=typeof raw==='string'?null:Array.isArray(raw)?raw.length:s.key==='er'?Object.keys(raw.rates).length:s.key==='float'?Object.keys(raw).length:Object.keys(raw.eur).length;
 const missing=Core.DEFAULT_CODES.filter(c=>!(snapshot.rates[c]>0));assert.equal(missing.length,0);assert.equal(snapshot.rates.EUR,1);
 assert.ok(Object.keys(snapshot.rates).every(c=>Core.CURRENCIES.some(x=>x.code===c)));
 console.log('最新汇率',JSON.stringify({key:s.key,name:s.name,url,date:snapshot.date,rawCount,currencyCount:Object.keys(snapshot.rates).length,missingDefaults:missing,missingDirectory:Core.CURRENCIES.filter(c=>!snapshot.rates[c.code]).map(c=>c.code),perEUR:Object.fromEntries(Core.DEFAULT_CODES.map(c=>[c,snapshot.rates[c]]))}));
 if(s.key==='ecb')ecb=snapshot;
 // 用实际官方字段再次核对计价单位与日期，绝不跨源补币。
 if(s.key==='safe'){
  const table=raw.replace(/<!--[\s\S]*?-->/g,'').match(/<table[^>]*id="InfoTable"[\s\S]*?<\/table>/)[0];
  const row=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)][1][1];
  const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m=>m[1].trim());
  assert.equal(snapshot.date,cells[0]);assert.ok(Math.abs(snapshot.rates.CNY-Number(cells[2])/100)<1e-10);
  assert.ok(Math.abs(snapshot.rates.JPY-Number(cells[2])/Number(cells[3]))<1e-10);
  assert.ok(Math.abs(snapshot.rates.KRW-(Number(cells[2])/100)*(Number(cells[15])/100))<1e-10);
  console.log('SAFE真实100单位直接/间接标价核对通过');
 }
 if(s.key==='cbr'){
  const blocks=[...raw.matchAll(/<Valute\b[^>]*>([\s\S]*?)<\/Valute>/g)].map(m=>m[1]);
  const field=(b,n)=>b.match(new RegExp(`<${n}>([^<]+)</${n}>`))[1];
  const rubPerEUR=Number(field(blocks.find(b=>field(b,'CharCode')==='EUR'),'Value').replace(',','.'));
  for(const c of ['JPY','KRW','IDR']){const b=blocks.find(b=>field(b,'CharCode')===c);assert.ok(Math.abs(snapshot.rates[c]-rubPerEUR*Number(field(b,'Nominal'))/Number(field(b,'Value').replace(',','.')))<1e-8);}
  console.log('CBR真实Nominal 100/1000/10000单位核对通过，日期为官方生效日');
 }
 if(s.key==='fed')console.log('H.10周报原始发布日期',raw.match(/Release Date:\s*[^<]+/)[0].trim(),'选用观测日',snapshot.date);
 if(s.key==='inforeuro'){assert.equal(snapshot.date,`${period.year}-${String(period.month).padStart(2,'0')}-01`);console.log('InforEuro适用月份（非抓取日或交易报价日）',period.year,period.month);}
});
if(ecb){
 for(const p of Core.PERIODS.filter(p=>!p.intraday))await verify('ECB历史 '+p.label,async()=>{
  const {from,to}=Core.historyRange(ecb.date,p.days);
  const raw=await get(`https://api.frankfurter.dev/v2/rates?providers=ECB&base=AUD&quotes=USD&from=${from}&to=${to}`);
  const records=Core.parseHistory(raw,'AUD','USD',from,to);assert.ok(records.length>1);
  console.log('ECB 历史',JSON.stringify({period:p.label,count:records.length,first:records[0].date,last:records.at(-1).date}));
 });
 await verify('ECB交叉换算',async()=>{const pair=await get(`https://api.frankfurter.dev/v2/rate/CNY/USD?providers=ECB&date=${ecb.date}`);assert.ok(Math.abs(Core.convert(1,'CNY','USD',ecb)-pair.rate)<0.00001);console.log('同日交叉换算核对通过',JSON.stringify(pair));});
}
// Yahoo 为非官方接口，真实端点失败只报告，不合成行情。
for(const [hours,range,interval] of [[24,'2d','15m'],[168,'7d','30m']])await verify('Yahoo '+hours,async()=>{
 const load=async code=>Core.parseYahoo(await get(`https://query1.finance.yahoo.com/v8/finance/chart/USD${code}=X?interval=${interval}&range=${range}`));
 const [a,b]=await Promise.all([load('CNY'),load('AUD')]);const records=Core.crossIntraday('CNY','AUD',a,b,hours);assert.ok(records.length>1);
 console.log('Yahoo 日内',JSON.stringify({hours,count:records.length,last:records.at(-1)}));
});
console.log('真实接口验证结束',JSON.stringify({failures}));if(failures.length)process.exitCode=1;
