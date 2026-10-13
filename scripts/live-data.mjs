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
for(const p of Core.PERIODS){
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
