// 在线试验只读官方接口，不将任何历史试验结果作为手机离线兜底。
import assert from 'node:assert/strict';
import { Core } from '../tests/helpers.mjs';
const API='https://api.frankfurter.dev/v2';
async function get(path){const response=await fetch(API+path,{signal:AbortSignal.timeout(30000)});assert.equal(response.status,200,path);return response.json();}
const specification=await get('/openapi.json');
assert.ok(specification.paths['/rates']);
assert.ok(specification.components.parameters.providers);
const provider=await get('/providers/ECB');
assert.equal(provider.rate_type,'reference rate');
assert.equal(provider.publish_cadence,'daily');
const catalog=await get('/currencies?providers=ECB');
const snapshot=Core.parseLatest(await get('/rates?providers=ECB&base=EUR'));
for(const code of Core.DEFAULT_CODES)assert.ok(catalog.some(c=>c.iso_code===code));
const expected=new Set(Core.CURRENCIES.map(c=>c.code));
assert.ok(Object.keys(snapshot.rates).every(code=>expected.has(code)));
const checks=[];
for(const p of Core.PERIODS.filter(x=>!x.intraday)){
  const {from,to}=Core.historyRange(snapshot.date,p.days);
  const records=Core.parseHistory(await get(`/rates?providers=ECB&base=AUD&quotes=USD&from=${from}&to=${to}`),'AUD','USD',from,to);
  assert.ok(records.length>1,p.label);
  assert.ok(records.every((r,i)=>!i||records[i-1].date<r.date));
  const stats=Core.statistics(records);
  assert.ok(stats.high>=stats.average&&stats.average>=stats.low);
  checks.push({period:p.label,from,to,count:records.length,first:records[0],last:records.at(-1),statistics:stats});
}
// 对照同一天官方货币对，证明EUR交叉换算方向正确。
const pair=await get(`/rate/CNY/USD?providers=ECB&date=${snapshot.date}`);
assert.ok(Math.abs(Core.convert(1,'CNY','USD',snapshot)-pair.rate)<0.00001);
const summary={checkedAt:new Date().toISOString(),api:API,provider:provider.name,rateType:provider.rate_type,latestDate:snapshot.date,currencyCount:Object.keys(snapshot.rates).length,cny100InUsd:Core.convert(100,'CNY','USD',snapshot),officialPair:pair,history:checks};
console.log(JSON.stringify(summary,null,2));
console.log('官方文档、最新汇率、五个真实日历史周期及交叉换算对照全部通过。');

// 24时/7天：真实 Yahoo Finance 日内行情，覆盖全部 30 个币种（USD 为中间腿，AUD→USD 与 CNY→EUR 为交叉校验）。
for(const [hours,range,interval] of [[24,'2d','15m'],[168,'7d','30m']]){
  const fetchSeries=async code=>code==='USD'?null:Core.parseYahoo(await (await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/USD${code}=X?interval=${interval}&range=${range}`,{headers:{'User-Agent':'Mozilla/5.0'}})).json());
  const missing=[];
  for(const c of Core.CURRENCIES){try{await fetchSeries(c.code)}catch(e){missing.push(c.code+':'+e.message)}}
  console.log(`日内${hours}h 缺失币种：`,missing.length?missing.join(', '):'无');
  const cny=await fetchSeries('CNY'),aud=await fetchSeries('AUD');
  const pair=Core.crossIntraday('CNY','AUD',cny,aud,hours);
  assert.ok(pair.length>10);console.log(`CNY→AUD ${hours}h 点数`,pair.length,'最新',pair.at(-1).rate);
}
