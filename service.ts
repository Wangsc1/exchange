import { fetch } from 'scripting'
import * as Core from './core'
const API='https://api.frankfurter.dev/v2'
const store:Core.CacheStore={get:key=>Storage.get(key),set:(key,value)=>Storage.set(key,value)}
async function json(url:string,headers?:Record<string,string>):Promise<unknown>{const r=await fetch(url,{timeout:20,headers});if(!r.ok)throw new Error(`请求失败 HTTP ${r.status}`);return await r.json()}
async function sourceData(key:string,url:string):Promise<unknown>{
 if(key==='inforeuro'){const period=Core.inforEuroRequest();return {...period,rates:await json(period.url)}}
 if(['safe','fed','cbr'].includes(key)){const r=await fetch(url,{timeout:20});if(!r.ok)throw new Error(`请求失败 HTTP ${r.status}`);return await r.text()}
 return await json(url)
}
export function readConfig(){return Core.normalizeConfig(Storage.get('config.v1'))}
export function saveConfig(value:unknown){const c=Core.normalizeConfig(value);const v=value as Core.Config;if(!v||!Array.isArray(v.codes)||v.codes.length!==c.codes.length||v.codes.some((x,i)=>x!==c.codes[i])||v.base!==c.base||v.amount!==c.amount)throw new Error('配置格式不正确');if(!Storage.set('config.v1',c))throw new Error('配置保存失败');return c}
export function readSettings(){return Core.normalizeSettings(Storage.get('settings.v1'))}
export function saveSettings(value:unknown){const c=Core.normalizeSettings(value);const v=value as Core.Settings;if(!v||Object.keys(c).some(k=>v[k as keyof Core.Settings]!==c[k as keyof Core.Settings]))throw new Error('设置格式不正确');if(!Storage.set('settings.v1',c))throw new Error('设置保存失败');return c}
export async function latest(key=readSettings().source){
 const source=Core.SOURCES.find(s=>s.key===key);if(!source)throw new Error('未知汇率源')
 const stampKey=source.cache+'.fetchedAt',stamp=Storage.get<number>(stampKey)
 // 开放端点每小时最多请求一次；其他日更源也避免前后台反复取数。
 const ttl=key==='er'?3600000:20000
 if(typeof stamp==='number'&&Date.now()-stamp>=0&&Date.now()-stamp<ttl){try{const value=Core.validateSnapshot(store.get(source.cache));if(key==='inforeuro'&&value.date!==`${Core.inforEuroRequest().year}-${String(Core.inforEuroRequest().month).padStart(2,'0')}-01`)throw new Error('会计月份已变化');return {value,offline:false,warning:'',fetchedAt:stamp,source:key}}catch{}}
 const attemptKey=source.cache+'.attemptAt',attempt=Storage.get<number>(attemptKey)
 if(key==='er'&&typeof attempt==='number'&&Date.now()-attempt>=0&&Date.now()-attempt<3600000){try{return {value:Core.validateSnapshot(store.get(source.cache)),offline:true,warning:'开放端点请求限频，使用本源缓存',fetchedAt:typeof stamp==='number'?stamp:null,source:key}}catch{throw new Error('开放端点请求限频，且没有可用缓存，请稍后重试')}}
 if(key==='er')Storage.set(attemptKey,Date.now())
 const result=await Core.cached(store,source.cache,async()=>{try{return Core.parseSource(key,await sourceData(key,source.url))}catch(e){throw new Error(source.name+'：'+(e instanceof Error?e.message:'取数失败'))}},Core.validateSnapshot)
 const fetchedAt=result.offline?(typeof stamp==='number'?stamp:null):Date.now()
 if(!result.offline&&fetchedAt&&!result.warning&&!Storage.set(stampKey,fetchedAt))result.warning='成功取得时间保存失败'
 return {...result,fetchedAt,source:key}
}
export async function history(params:{base:string;quote:string;days:number;end:string}){
  const {base,quote,days,end}=params
  if(!Core.CURRENCIES.some(c=>c.code===base)||!Core.CURRENCIES.some(c=>c.code===quote)||base===quote)throw new Error('请选择两个不同币种')
  const {from,to}=Core.historyRange(end,days)
  const key=`history.ecb.${base}.${quote}.${days}`
  const validate=(x:unknown)=>Core.parseHistory(x,base,quote,from,to)
  // 每个货币对/周期仅保留一份，最多60份；不会自动删除用户配置或最新缓存。
  const result=await Core.cached(store,key,()=>json(`${API}/rates?providers=ECB&base=${base}&quotes=${quote}&from=${from}&to=${to}`),validate)
  const keys=Storage.get<string[]>('history.keys')||[]
  const next=[...keys.filter(x=>x!==key),key]
  while(next.length>60){const old=next.shift();if(old)Storage.remove(old)}
  Storage.set('history.keys',next)
  return result
}
async function yahoo(code:string,range:string,interval:string):Promise<Core.Point[]|null>{
  if(code==='USD')return null
  const path=`/v8/finance/chart/USD${code}=X?interval=${interval}&range=${range}`,h={'User-Agent':'Mozilla/5.0'}
  try{return Core.parseYahoo(await json('https://query1.finance.yahoo.com'+path,h))}catch{return Core.parseYahoo(await json('https://query2.finance.yahoo.com'+path,h))}
}
export async function intraday(params:{base:string;quote:string;hours:number}){
  const {base,quote,hours}=params
  if(!Core.CURRENCIES.some(c=>c.code===base)||!Core.CURRENCIES.some(c=>c.code===quote)||base===quote||(hours!==24&&hours!==168))throw new Error('日内周期无效')
  const key=`intraday.${base}.${quote}.${hours}`,range=hours===24?'2d':'7d',interval=hours===24?'15m':'30m'
  const result=await Core.cached(store,key,async()=>{const [a,b]=await Promise.all([yahoo(base,range,interval),yahoo(quote,range,interval)]);return Core.crossIntraday(base,quote,a,b,hours)},x=>Core.validateIntraday(x,base,quote))
  const keys=Storage.get<string[]>('history.keys')||[],next=[...keys.filter(x=>x!==key),key]
  while(next.length>60){const old=next.shift();if(old)Storage.remove(old)}
  Storage.set('history.keys',next)
  return result
}
