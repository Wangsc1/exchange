import { fetch, Script } from 'scripting'
import * as Core from './core'
import { installUpdate, validateManifest } from './update'
const API='https://api.frankfurter.dev/v2'
const REMOTE='https://raw.githubusercontent.com/Wangsc1/exchange/main/'
const store:Core.CacheStore={get:key=>Storage.get(key),set:(key,value)=>Storage.set(key,value)}
async function json(url:string,headers?:Record<string,string>):Promise<unknown>{const r=await fetch(url,{timeout:20,headers});if(!r.ok)throw new Error(`请求失败 HTTP ${r.status}`);return await r.json()}
export function readConfig(){return Core.normalizeConfig(Storage.get('config.v1'))}
export function saveConfig(value:unknown){const c=Core.normalizeConfig(value);const v=value as Core.Config;if(!v||!Array.isArray(v.codes)||v.codes.length!==c.codes.length||v.codes.some((x,i)=>x!==c.codes[i])||v.base!==c.base||v.amount!==c.amount)throw new Error('配置格式不正确');if(!Storage.set('config.v1',c))throw new Error('配置保存失败');return c}
export async function latest(){return Core.cached(store,'rates.ecb.v2',async()=>Core.parseLatest(await json(API+'/rates?providers=ECB&base=EUR')),Core.validateSnapshot)}
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
export function installedVersion(){const local=Storage.get<string>('installed.version');try{return local&&Core.newer(local,Core.VERSION)?local:Core.VERSION}catch{return Core.VERSION}}
export async function checkUpdate(){const manifest=validateManifest(await json(REMOTE+'version.json'));return {manifest,current:installedVersion(),available:Core.newer(manifest.version,installedVersion())}}
export async function update(){const check=await checkUpdate();await installUpdate(check.manifest,installedVersion(),{
  download:async f=>{const r=await fetch(REMOTE+f,{timeout:20});if(!r.ok)throw new Error(`下载失败 HTTP ${r.status}`);return r.text()},
  read:f=>FileManager.readAsString(Script.directory+'/'+f),
  write:(f,text)=>FileManager.writeAsString(Script.directory+'/'+f,text),
  saveVersion:v=>Storage.set('installed.version',v)
});return {version:check.manifest.version}}
