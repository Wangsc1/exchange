// 纯业务模块：不依赖 iOS、DOM 或网络，可在 Node 中验证。
export type Rate = { date: string; base: string; quote: string; rate: number }
export type Snapshot = { date: string; rates: Record<string, number> }
export type Config = { codes: string[]; base: string; amount: number }
export const DEFAULT_CODES = ['USD', 'CNY', 'CAD', 'EUR', 'GBP', 'AUD']
// 当前 ECB 常规发布的法币；没有行情的币种不会出现在选择列表中。
export const CURRENCIES = [
  ['USD','美元','美国','US','$'],['CNY','人民币','中国','CN','¥'],['CAD','加元','加拿大','CA','$'],['EUR','欧元','欧盟 欧元区 德国 法国 意大利 西班牙','EU','€'],['GBP','英镑','英国','GB','£'],['AUD','澳元','澳大利亚','AU','$'],
  ['BRL','巴西雷亚尔','巴西','BR','R$'],['CHF','瑞士法郎','瑞士 列支敦士登','CH','CHF'],['CZK','捷克克朗','捷克','CZ','Kč'],['DKK','丹麦克朗','丹麦','DK','kr'],['HKD','港元','中国香港','HK','$'],['HUF','匈牙利福林','匈牙利','HU','Ft'],['IDR','印尼盾','印度尼西亚','ID','Rp'],['ILS','以色列新谢克尔','以色列','IL','₪'],['INR','印度卢比','印度','IN','₹'],['ISK','冰岛克朗','冰岛','IS','kr'],['JPY','日元','日本','JP','¥'],['KRW','韩元','韩国','KR','₩'],['MXN','墨西哥比索','墨西哥','MX','$'],['MYR','马来西亚林吉特','马来西亚','MY','RM'],['NOK','挪威克朗','挪威','NO','kr'],['NZD','新西兰元','新西兰','NZ','$'],['PHP','菲律宾比索','菲律宾','PH','₱'],['PLN','波兰兹罗提','波兰','PL','zł'],['RON','罗马尼亚列伊','罗马尼亚','RO','Lei'],['SEK','瑞典克朗','瑞典','SE','kr'],['SGD','新加坡元','新加坡','SG','$'],['THB','泰铢','泰国','TH','฿'],['TRY','土耳其里拉','土耳其','TR','₺'],['ZAR','南非兰特','南非','ZA','R']
].map(([code,name,region,country,symbol]) => ({code,name,region,country,symbol}))
export function flag(country: string): string { return [...country].map(x => String.fromCodePoint(127397+x.charCodeAt(0))).join('') }
export function search(query: string, available: string[]) { const q=query.trim().toLowerCase(); return CURRENCIES.filter(c=>available.includes(c.code)&&`${c.code} ${c.name} ${c.region}`.toLowerCase().includes(q)) }
export function validDate(s: unknown): s is string { if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s }
export function parseLatest(data: unknown): Snapshot {
  if (!Array.isArray(data)||!data.length) throw new Error('数据源未返回汇率')
  const rates: Record<string,number>={}; let date=''
  for(const r of data as Rate[]) {
    if (!r||r.base!=='EUR'||!validDate(r.date)||!CURRENCIES.some(c=>c.code===r.quote)||!Number.isFinite(r.rate)||r.rate<=0||rates[r.quote]!==undefined) throw new Error('汇率数据格式异常')
    if(date&&date!==r.date) throw new Error('汇率日期不一致')
    date=r.date; rates[r.quote]=r.rate
  }
  if(rates.EUR!==1 || DEFAULT_CODES.some(c=>!rates[c])) throw new Error('缺少默认币种汇率')
  return {date,rates}
}
export function validateSnapshot(value: unknown): Snapshot {
  const s=value as Snapshot
  if(!s || !s.rates || !validDate(s.date)) throw new Error('缓存损坏')
  return parseLatest(Object.entries(s.rates).map(([quote,rate])=>({base:'EUR',quote,rate,date:s.date})))
}
export function normalizeConfig(value: unknown): Config {
  const c=value as Config
  if(!c||!Array.isArray(c.codes)||c.codes.length!==6||new Set(c.codes).size!==6||c.codes.some(x=>!CURRENCIES.some(y=>y.code===x))||!c.codes.includes(c.base)||!Number.isFinite(c.amount)||Math.abs(c.amount)>1e15) return {codes:[...DEFAULT_CODES],base:'CNY',amount:100}
  return {codes:[...c.codes],base:c.base,amount:c.amount}
}
export function convert(amount:number,base:string,target:string,s:Snapshot): number {
  if(!s.rates[base]||!s.rates[target]) throw new Error('该币种当前没有汇率')
  const result=amount/s.rates[base]*s.rates[target]
  if(!Number.isFinite(result)||Math.abs(result)>1e15) throw new Error('金额超出范围')
  return result
}
export function changeBase(c:Config,target:string,s:Snapshot):Config {
  if(!c.codes.includes(target)) throw new Error('请选择列表中的币种')
  return {...c,base:target,amount:convert(c.amount,c.base,target,s)}
}
export function replaceCurrency(c:Config,index:number,target:string,s:Snapshot):Config {
  if(!Number.isInteger(index)||index<0||index>=6||!s.rates[target]) throw new Error('无法切换此币种')
  if(c.codes[index]===target) return c
  if(c.codes.includes(target)) throw new Error('该币种已在其他行中')
  const next={...c,codes:[...c.codes]}; next.codes[index]=target
  if(c.base===c.codes[index]) {next.amount=convert(c.amount,c.base,target,s);next.base=target}
  return next
}
// 两级优先级递归下降：支持一元正负、小数，拒绝非法字符；绝不使用 eval。
export function calculate(expression:string):number {
  const text=expression.replace(/×/g,'*').replace(/÷/g,'/').replace(/\s/g,'')
  if(!text||text.length>160||/[^0-9.+\-*/]/.test(text)) throw new Error('算式无效')
  let i=0
  function number():number {let sign=1; if(text[i]==='+'||text[i]==='-') {if(text[i++]==='-')sign=-1}; const m=text.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)/); if(!m)throw new Error('算式未完成'); i+=m[0].length; return sign*Number(m[0])}
  function term():number {let v=number();while(text[i]==='*'||text[i]==='/'){const op=text[i++],r=number(); if(op==='/'&&r===0)throw new Error('不能除以零');v=op==='*'?v*r:v/r}return v}
  let result=term();while(text[i]==='+'||text[i]==='-'){const op=text[i++],r=term();result=op==='+'?result+r:result-r}
  if(i!==text.length||!Number.isFinite(result)||Math.abs(result)>1e15) throw new Error('算式无效或金额超出范围')
  return Number(result.toPrecision(15))
}
export function keyInput(text:string,key:string):string {
  if(key==='AC')return '0'
  if(key==='⌫')return text.slice(0,-1)||'0'
  if(/^[+\-×÷]$/.test(key)) return /[+\-×÷]$/.test(text)?text.slice(0,-1)+key:text+key
  if(!/^[0-9.]$/.test(key)||text.length>=160)return text
  const tail=text.split(/[+\-×÷]/).pop()||''
  if(key==='.'&&tail.includes('.')) return text
  if(tail.replace('.','').length>=15) return text
  if(key==='.') return text+(tail?'':'0')+'.'
  return text==='0'?key:text+key
}
export const PERIODS = [{label:'7天',days:7},{label:'1月',days:30},{label:'6月',days:183},{label:'1年',days:365},{label:'3年',days:1095}]
export function historyRange(end:string,days:number) {if(!validDate(end)||!PERIODS.some(p=>p.days===days))throw new Error('历史周期无效');const d=new Date(end+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-days+1);return {from:d.toISOString().slice(0,10),to:end}}
export function parseHistory(data:unknown,base:string,quote:string,from:string,to:string):Rate[] {
  if(!Array.isArray(data)||!data.length) throw new Error('这个周期没有历史数据')
  const seen=new Set<string>();const records=(data as Rate[]).map(r=>{
    if(!r||r.base!==base||r.quote!==quote||!validDate(r.date)||r.date>to||!Number.isFinite(r.rate)||r.rate<=0||seen.has(r.date)) throw new Error('历史数据格式异常')
    seen.add(r.date);return {date:r.date,base,quote,rate:r.rate}
  // v2 在周期起点为休市日时会携带此前最后一次报价；保留日期真实含义，过滤区间外点。
  }).filter(r=>r.date>=from).sort((a,b)=>a.date.localeCompare(b.date))
  if(!records.length)throw new Error('这个周期没有历史数据')
  return records
}
export function statistics(records:Rate[]) {if(!records.length)throw new Error('没有历史数据');const values=records.map(r=>r.rate);return {high:Math.max(...values),low:Math.min(...values),average:values.reduce((a,b)=>a+b,0)/values.length,change:(values[values.length-1]/values[0]-1)*100}}
export type CacheStore = {get:(key:string)=>unknown;set:(key:string,value:unknown)=>boolean}
// 缓存必须重新校验；网络/HTTP/解析失败时仅返回真实缓存，并显式标记离线。
export async function cached<T>(store:CacheStore,key:string,load:()=>Promise<unknown>,validate:(x:unknown)=>T):Promise<{value:T;offline:boolean;warning:string}> {
  try {const value=validate(await load()); const saved=store.set(key,value); return {value,offline:false,warning:saved?'':'缓存保存失败，下次离线可能不可用'}}
  catch(e) {try{return {value:validate(store.get(key)),offline:true,warning:`连接失败，使用缓存：${e instanceof Error?e.message:'未知错误'}`}}catch{throw new Error(`无法取得数据且没有可用缓存：${e instanceof Error?e.message:'未知错误'}`)}}
}
export const VERSION='1.0.7'
export function newer(remote:string,local:string) {if(!/^\d+\.\d+\.\d+$/.test(remote)||!/^\d+\.\d+\.\d+$/.test(local))throw new Error('版本格式无效');const a=remote.split('.').map(Number),b=local.split('.').map(Number);for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i]}return false}
