// 纯业务模块：不依赖 iOS、DOM 或网络，可在 Node 中验证。
export type Rate = { date: string; base: string; quote: string; rate: number }
export type Snapshot = { date: string; rates: Record<string, number> }
export type Config = { codes: string[]; base: string; amount: number }
export const DEFAULT_CODES = ['USD', 'CNY', 'CAD', 'EUR', 'GBP', 'AUD']
// 当前 ECB 常规发布的法币；没有行情的币种不会出现在选择列表中。
export const CURRENCIES = [
  ['USD','美元','美国','US','$'],['CNY','人民币','中国','CN','¥'],['CAD','加元','加拿大','CA','$'],['EUR','欧元','欧盟 欧元区 德国 法国 意大利 西班牙','EU','€'],['GBP','英镑','英国','GB','£'],['AUD','澳元','澳大利亚','AU','$'],
  ['BRL','巴西雷亚尔','巴西','BR','R$'],['CHF','瑞士法郎','瑞士 列支敦士登','CH','CHF'],['CZK','捷克克朗','捷克','CZ','Kč'],['DKK','丹麦克朗','丹麦','DK','kr'],['HKD','港元','中国香港','HK','$'],['HUF','匈牙利福林','匈牙利','HU','Ft'],['IDR','印尼盾','印度尼西亚','ID','Rp'],['ILS','以色列新谢克尔','以色列','IL','₪'],['INR','印度卢比','印度','IN','₹'],['ISK','冰岛克朗','冰岛','IS','kr'],['JPY','日元','日本','JP','¥'],['KRW','韩元','韩国','KR','₩'],['MXN','墨西哥比索','墨西哥','MX','$'],['MYR','马来西亚林吉特','马来西亚','MY','RM'],['NOK','挪威克朗','挪威','NO','kr'],['NZD','新西兰元','新西兰','NZ','$'],['PHP','菲律宾比索','菲律宾','PH','₱'],['PLN','波兰兹罗提','波兰','PL','zł'],['RON','罗马尼亚列伊','罗马尼亚','RO','Lei'],['SEK','瑞典克朗','瑞典','SE','kr'],['SGD','新加坡元','新加坡','SG','$'],['THB','泰铢','泰国','TH','฿'],['TRY','土耳其里拉','土耳其','TR','₺'],['ZAR','南非兰特','南非','ZA','R'],
  // 以下币种仅在所选来源实际提供时出现在选择列表。
  ['AED','阿联酋迪拉姆','阿联酋','AE','د.إ'],
  ['AFN','阿富汗尼','阿富汗','AF','؋'],
  ['ALL','阿尔巴尼亚列克','阿尔巴尼亚','AL','L'],
  ['AMD','亚美尼亚德拉姆','亚美尼亚','AM','֏'],
  ['AOA','安哥拉宽扎','安哥拉','AO','Kz'],
  ['ARS','阿根廷比索','阿根廷','AR','$'],
  ['AWG','阿鲁巴弗罗林','阿鲁巴','AW','ƒ'],
  ['AZN','阿塞拜疆马纳特','阿塞拜疆','AZ','₼'],
  ['BAM','波黑可兑换马克','波斯尼亚和黑塞哥维那','BA','KM'],
  ['BBD','巴巴多斯元','巴巴多斯','BB','$'],
  ['BDT','孟加拉塔卡','孟加拉国','BD','৳'],
  ['BHD','巴林第纳尔','巴林','BH','.د.ب'],
  ['BIF','布隆迪法郎','布隆迪','BI','FBu'],
  ['BMD','百慕大元','百慕大','BM','$'],
  ['BND','文莱元','文莱','BN','$'],
  ['BOB','玻利维亚诺','玻利维亚','BO','Bs'],
  ['BSD','巴哈马元','巴哈马','BS','$'],
  ['BTN','不丹努尔特鲁姆','不丹','BT','Nu.'],
  ['BWP','博茨瓦纳普拉','博茨瓦纳','BW','P'],
  ['BZD','伯利兹元','伯利兹','BZ','$'],
  ['CDF','刚果法郎','刚果民主共和国','CD','FC'],
  ['CLP','智利比索','智利','CL','$'],
  ['COP','哥伦比亚比索','哥伦比亚','CO','$'],
  ['CRC','哥斯达黎加科朗','哥斯达黎加','CR','₡'],
  ['CUP','古巴比索','古巴','CU','$'],
  ['CVE','佛得角埃斯库多','佛得角','CV','$'],
  ['DJF','吉布提法郎','吉布提','DJ','Fdj'],
  ['DOP','多米尼加比索','多米尼加','DO','$'],
  ['DZD','阿尔及利亚第纳尔','阿尔及利亚','DZ','دج'],
  ['EGP','埃及镑','埃及','EG','E£'],
  ['ERN','厄立特里亚纳克法','厄立特里亚','ER','Nfk'],
  ['ETB','埃塞俄比亚比尔','埃塞俄比亚','ET','Br'],
  ['FJD','斐济元','斐济','FJ','$'],
  ['FKP','福克兰群岛镑','福克兰群岛','FK','£'],
  ['GEL','格鲁吉亚拉里','格鲁吉亚','GE','₾'],
  ['GHS','加纳塞地','加纳','GH','₵'],
  ['GIP','直布罗陀镑','直布罗陀','GI','£'],
  ['GMD','冈比亚达拉西','冈比亚','GM','D'],
  ['GNF','几内亚法郎','几内亚','GN','FG'],
  ['GTQ','危地马拉格查尔','危地马拉','GT','Q'],
  ['GYD','圭亚那元','圭亚那','GY','$'],
  ['HNL','洪都拉斯伦皮拉','洪都拉斯','HN','L'],
  ['HTG','海地古德','海地','HT','G'],
  ['IQD','伊拉克第纳尔','伊拉克','IQ','ع.د'],
  ['IRR','伊朗里亚尔','伊朗','IR','﷼'],
  ['JMD','牙买加元','牙买加','JM','$'],
  ['JOD','约旦第纳尔','约旦','JO','د.ا'],
  ['KES','肯尼亚先令','肯尼亚','KE','KSh'],
  ['KGS','吉尔吉斯斯坦索姆','吉尔吉斯斯坦','KG','с'],
  ['KHR','柬埔寨瑞尔','柬埔寨','KH','៛'],
  ['KMF','科摩罗法郎','科摩罗','KM','CF'],
  ['KPW','朝鲜元','朝鲜','KP','₩'],
  ['KWD','科威特第纳尔','科威特','KW','د.ك'],
  ['KYD','开曼群岛元','开曼群岛','KY','$'],
  ['KZT','哈萨克斯坦坚戈','哈萨克斯坦','KZ','₸'],
  ['LAK','老挝基普','老挝','LA','₭'],
  ['LBP','黎巴嫩镑','黎巴嫩','LB','ل.ل'],
  ['LKR','斯里兰卡卢比','斯里兰卡','LK','Rs'],
  ['LRD','利比里亚元','利比里亚','LR','$'],
  ['LSL','莱索托洛蒂','莱索托','LS','L'],
  ['LYD','利比亚第纳尔','利比亚','LY','ل.د'],
  ['MAD','摩洛哥迪拉姆','摩洛哥','MA','د.م.'],
  ['MDL','摩尔多瓦列伊','摩尔多瓦','MD','L'],
  ['MGA','马达加斯加阿里亚里','马达加斯加','MG','Ar'],
  ['MKD','北马其顿代纳尔','北马其顿','MK','ден'],
  ['MMK','缅甸缅元','缅甸','MM','K'],
  ['MNT','蒙古图格里克','蒙古','MN','₮'],
  ['MOP','澳门币','中国澳门','MO','MOP$'],
  ['MRU','毛里塔尼亚乌吉亚','毛里塔尼亚','MR','UM'],
  ['MUR','毛里求斯卢比','毛里求斯','MU','₨'],
  ['MVR','马尔代夫拉菲亚','马尔代夫','MV','Rf'],
  ['MWK','马拉维克瓦查','马拉维','MW','MK'],
  ['MZN','莫桑比克梅蒂卡尔','莫桑比克','MZ','MT'],
  ['NAD','纳米比亚元','纳米比亚','NA','$'],
  ['NGN','尼日利亚奈拉','尼日利亚','NG','₦'],
  ['NIO','尼加拉瓜科多巴','尼加拉瓜','NI','C$'],
  ['NPR','尼泊尔卢比','尼泊尔','NP','₨'],
  ['OMR','阿曼里亚尔','阿曼','OM','ر.ع.'],
  ['PAB','巴拿马巴波亚','巴拿马','PA','B/.'],
  ['PEN','秘鲁索尔','秘鲁','PE','S/'],
  ['PGK','巴布亚新几内亚基那','巴布亚新几内亚','PG','K'],
  ['PKR','巴基斯坦卢比','巴基斯坦','PK','₨'],
  ['PYG','巴拉圭瓜拉尼','巴拉圭','PY','₲'],
  ['QAR','卡塔尔里亚尔','卡塔尔','QA','ر.ق'],
  ['RSD','塞尔维亚第纳尔','塞尔维亚','RS','дин'],
  ['RUB','俄罗斯卢布','俄罗斯','RU','₽'],
  ['RWF','卢旺达法郎','卢旺达','RW','FRw'],
  ['SAR','沙特里亚尔','沙特阿拉伯','SA','ر.س.'],
  ['SBD','所罗门群岛元','所罗门群岛','SB','$'],
  ['SCR','塞舌尔卢比','塞舌尔','SC','₨'],
  ['SDG','苏丹镑','苏丹','SD','ج.س.'],
  ['SHP','圣赫勒拿镑','圣赫勒拿','SH','£'],
  ['SLE','塞拉利昂利昂','塞拉利昂','SL','Le'],
  ['SOS','索马里先令','索马里','SO','Sh'],
  ['SRD','苏里南元','苏里南','SR','$'],
  ['SSP','南苏丹镑','南苏丹','SS','£'],
  ['STN','圣多美多布拉','圣多美和普林西比','ST','Db'],
  ['SVC','萨尔瓦多科朗','萨尔瓦多','SV','₡'],
  ['SYP','叙利亚镑','叙利亚','SY','£'],
  ['SZL','斯威士兰里兰吉尼','斯威士兰','SZ','L'],
  ['TJS','塔吉克斯坦索莫尼','塔吉克斯坦','TJ','SM'],
  ['TMT','土库曼斯坦马纳特','土库曼斯坦','TM','m'],
  ['TND','突尼斯第纳尔','突尼斯','TN','د.ت'],
  ['TOP','汤加潘加','汤加','TO','T$'],
  ['TTD','特立尼达和多巴哥元','特立尼达和多巴哥','TT','$'],
  ['TWD','新台币','中国台湾','TW','NT$'],
  ['TZS','坦桑尼亚先令','坦桑尼亚','TZ','TSh'],
  ['UAH','乌克兰格里夫纳','乌克兰','UA','₴'],
  ['UGX','乌干达先令','乌干达','UG','USh'],
  ['UYU','乌拉圭比索','乌拉圭','UY','$'],
  ['UZS','乌兹别克斯坦苏姆','乌兹别克斯坦','UZ','soʻm'],
  ['VES','委内瑞拉玻利瓦尔','委内瑞拉','VE','Bs'],
  ['VND','越南盾','越南','VN','₫'],
  ['VUV','瓦努阿图瓦图','瓦努阿图','VU','VT'],
  ['WST','萨摩亚塔拉','萨摩亚','WS','T'],
  ['XAF','中非法郎','中非','CF','FCFA'],
  ['XCD','东加勒比元','东加勒比','AG','$'],
  ['XOF','西非法郎','西非','SN','CFA'],
  ['XPF','太平洋法郎','法属波利尼西亚','PF','₣'],
  ['YER','也门里亚尔','也门','YE','﷼'],
  ['ZMW','赞比亚克瓦查','赞比亚','ZM','ZK'],
  // 加密货币与贵金属：仅 fawaz 开源源提供，非央行汇率；选择页单独标注。
  ['BTC','比特币','加密货币','BTC','₿'],['ETH','以太坊','加密货币','ETH','Ξ'],['USDT','泰达币','加密货币','USDT','₮'],['USDC','USD Coin','加密货币','USDC','$'],['BNB','币安币','加密货币','BNB','BNB'],['SOL','索拉纳','加密货币','SOL','◎'],['XRP','瑞波币','加密货币','XRP','XRP'],['DOGE','狗狗币','加密货币','DOGE','Ð'],
  ['XAU','黄金 盎司','贵金属','XAU','Au'],['XAG','白银 盎司','贵金属','XAG','Ag'],['XPT','铂金 盎司','贵金属','XPT','Pt'],['XPD','钯金 盎司','贵金属','XPD','Pd'],
].map(([code,name,region,country,symbol]) => ({code,name,region,country,symbol}))
export const NON_FIAT:Record<string,string>={BTC:'₿',ETH:'Ξ',USDT:'₮',USDC:'$',BNB:'◆',SOL:'◎',XRP:'✕',DOGE:'Ð',XAU:'🥇',XAG:'🥈',XPT:'⬜',XPD:'⬜'}
export function flag(country: string): string { if(NON_FIAT[country])return NON_FIAT[country]; return [...country].map(x => String.fromCodePoint(127397+x.charCodeAt(0))).join('') }
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
export const PERIODS:{label:string;days:number;intraday?:boolean}[] = [{label:'24时',days:1,intraday:true},{label:'7天',days:7,intraday:true},{label:'1月',days:30},{label:'6月',days:183},{label:'1年',days:365},{label:'3年',days:1095}]
export function historyRange(end:string,days:number) {if(!validDate(end)||!PERIODS.some(p=>p.days===days&&!p.intraday))throw new Error('历史周期无效');const d=new Date(end+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-days+1);return {from:d.toISOString().slice(0,10),to:end}}
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
export const VERSION='1.5.3'

// ---- 24时/7天：日内行情（Yahoo Finance 非官方图表接口），以 USD 为中间腿交叉计算 ----
export type Point={t:number;v:number}
export function parseYahoo(data:unknown):Point[] {
  const r=(data as {chart?:{result?:{timestamp?:number[];indicators?:{quote?:{close?:(number|null)[]}[]}}[]}})?.chart?.result?.[0]
  const ts=r?.timestamp,close=r?.indicators?.quote?.[0]?.close
  if(!Array.isArray(ts)||!Array.isArray(close)||ts.length!==close.length) throw new Error('日内行情数据格式异常')
  const out:Point[]=[];ts.forEach((t,i)=>{const v=close[i];if(Number.isFinite(t)&&typeof v==='number'&&Number.isFinite(v)&&v>0)out.push({t:t*1000,v})})
  if(out.length<2) throw new Error('日内行情数据不足')
  return out.sort((a,b)=>a.t-b.t)
}
// base/quote 均为“1 美元兑该币种”的序列（null 代表 USD=1）；返回 1 base 兑 quote，并截取最后 hours 小时。
export function crossIntraday(base:string,quote:string,a:Point[]|null,b:Point[]|null,hours:number):Rate[] {
  const A=a||[],B=b||[];const times=[...new Set([...A.map(p=>p.t),...B.map(p=>p.t)])].sort((x,y)=>x-y)
  let i=0,j=0,va=a?0:1,vb=b?0:1;const all:Rate[]=[]
  for(const t of times){while(i<A.length&&A[i].t<=t)va=A[i++].v;while(j<B.length&&B[j].t<=t)vb=B[j++].v;if(va>0&&vb>0)all.push({date:new Date(t).toISOString(),base,quote,rate:vb/va})}
  if(all.length<2) throw new Error('日内行情数据不足')
  const end=Date.parse(all[all.length-1].date),from=end-hours*3600000
  const cut=all.filter(r=>Date.parse(r.date)>=from)
  if(cut.length<2) throw new Error('日内行情数据不足')
  return cut
}
export function validateIntraday(value:unknown,base:string,quote:string):Rate[] {
  if(!Array.isArray(value)||value.length<2) throw new Error('日内缓存损坏')
  return (value as Rate[]).map(r=>{if(!r||r.base!==base||r.quote!==quote||!Number.isFinite(Date.parse(r.date))||!Number.isFinite(r.rate)||r.rate<=0)throw new Error('日内缓存损坏');return {date:r.date,base,quote,rate:r.rate}})
}

export const SOURCES = [
 {key:'ecb',name:'Frankfurter · 欧洲央行 ECB',description:'欧洲央行参考汇率，工作日更新',url:'https://api.frankfurter.dev/v2/rates?providers=ECB&base=EUR',cache:'rates.ecb.v2'},
 {key:'boc',name:'Frankfurter · 加拿大央行 BOC',description:'加拿大央行指示汇率，工作日更新；交叉换算',url:'https://api.frankfurter.dev/v2/rates?providers=BOC&base=EUR',cache:'rates.boc.v1'},
 {key:'bdi',name:'Frankfurter · 意大利银行 BDI',description:'意大利银行每日汇率，币种最多；工作日更新；交叉换算',url:'https://api.frankfurter.dev/v2/rates?providers=BDI&base=EUR',cache:'rates.bdi.v1'},
 {key:'nbp',name:'Frankfurter · 波兰国家银行 NBP',description:'波兰国家银行平均汇率，币种较多；工作日更新；交叉换算',url:'https://api.frankfurter.dev/v2/rates?providers=NBP&base=EUR',cache:'rates.nbp.v1'},
 {key:'cbkkw',name:'Frankfurter · 科威特央行 CBKKW',description:'科威特央行参考汇率，含海湾币种；工作日更新；交叉换算',url:'https://api.frankfurter.dev/v2/rates?providers=CBKKW&base=EUR',cache:'rates.cbkkw.v1'},
 {key:'lb',name:'Frankfurter · 立陶宛银行 LB',description:'立陶宛银行每日汇率，欧洲央行体系成员；工作日更新；交叉换算',url:'https://api.frankfurter.dev/v2/rates?providers=LB&base=EUR',cache:'rates.lb.v1'},
 {key:'nbu',name:'Frankfurter · 乌克兰国家银行 NBU',description:'乌克兰国家银行官方汇率；工作日更新；交叉换算',url:'https://api.frankfurter.dev/v2/rates?providers=NBU&base=EUR',cache:'rates.nbu.v1'},
 {key:'boe',name:'Frankfurter · 英格兰银行 BOE',description:'英格兰银行现货汇率；工作日更新；交叉换算',url:'https://api.frankfurter.dev/v2/rates?providers=BOE&base=EUR',cache:'rates.boe.v1'},
 {key:'amcm',name:'Frankfurter · 澳门金融管理局 AMCM',description:'澳门金管局银行间中间价，含澳门币；工作日更新；交叉换算',url:'https://api.frankfurter.dev/v2/rates?providers=AMCM&base=EUR',cache:'rates.amcm.v1'},
 {key:'mas',name:'Frankfurter · 新加坡金融管理局 MAS',description:'新加坡金管局汇率，含亚洲币种；工作日更新；交叉换算',url:'https://api.frankfurter.dev/v2/rates?providers=MAS&base=EUR',cache:'rates.mas.v1'},
 {key:'er',name:'ExchangeRate-API',description:'开放参考汇率，每日更新',url:'https://open.er-api.com/v6/latest/EUR',cache:'rates.er.v1'},
 {key:'fawaz-cdn',name:'开源汇率 · jsDelivr',description:'fawazahmed0 每日数据，CDN 日期可能滞后',url:'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json',cache:'rates.fawaz-cdn.v1'},
 {key:'fawaz-pages',name:'开源汇率 · Cloudflare',description:'fawazahmed0 每日数据',url:'https://latest.currency-api.pages.dev/v1/currencies/eur.json',cache:'rates.fawaz-pages.v1'},
 {key:'float',name:'FloatRates',description:'综合参考汇率，约每12小时更新',url:'https://www.floatrates.com/daily/eur.json',cache:'rates.float.v1'},
 {key:'safe',name:'国家外汇管理局 · 人民币中间价',description:'SAFE官方转发中国外汇交易中心数据；工作日中间价，100单位直接/间接标价，非买卖价',url:'https://www.safe.gov.cn/AppStructured/hlw/RMBQuery.do',cache:'rates.safe.v1'},
 {key:'fed',name:'美联储 · H.10',description:'美联储官方周报中的每日纽约午间买入参考价；周一发布上周数据，以USD交叉换算，非用户成交报价',url:'https://www.federalreserve.gov/releases/h10/current/',cache:'rates.fed.v1'},
 {key:'inforeuro',name:'欧盟委员会 · InforEuro',description:'欧盟委员会官方月度会计汇率；日期为适用月份首日，不是当天市场报价',url:'https://ec.europa.eu/budg/inforeuro/api/public/monthly-rates',cache:'rates.inforeuro.v1'},
 {key:'cbr',name:'俄罗斯央行 · CBR',description:'俄罗斯央行官方每日汇率；日期为官方生效日，按Nominal折算卢布，央行不承诺按此买卖',url:'https://www.cbr.ru/scripts/XML_daily.asp',cache:'rates.cbr.v1'}
]
export type Settings={symbols:boolean;showSource:boolean;source:string;defaultAmount:number;decimals:number}
export function normalizeSettings(value:unknown):Settings {
 const v=value as Settings
 if(!v||typeof v.symbols!=='boolean'||typeof v.showSource!=='boolean'||!SOURCES.some(s=>s.key===v.source)||![1,10,100,1000,10000].includes(v.defaultAmount)||!Number.isInteger(v.decimals)||v.decimals<0||v.decimals>8)return {symbols:true,showSource:true,source:'ecb',defaultAmount:100,decimals:2}
 return {symbols:v.symbols,showSource:v.showSource,source:v.source,defaultAmount:v.defaultAmount,decimals:v.decimals}
}
const FRANKFURTER_KEYS=['ecb','boc','bdi','nbp','cbkkw','lb','nbu','boe','amcm','mas']
export function parseSource(key:string,data:unknown):Snapshot {
 if(!SOURCES.some(s=>s.key===key))throw new Error('未知汇率源')
 if(key==='safe')return parseSAFE(data)
 if(key==='fed')return parseFED(data)
 if(key==='cbr')return parseCBR(data)
 if(key==='inforeuro')return parseInforEuro(data)
 const d=data as any
 if(FRANKFURTER_KEYS.includes(key)) {
  if(!Array.isArray(d))throw new Error('汇率数据格式异常')
  // 同一响应可能混有较旧日期行；只取最新日期，缺失币种不回填旧日期。
  const dates=d.map((r:any)=>r?.date).filter(validDate).sort(),latest=dates[dates.length-1]
  return parseLatest(d.filter((r:any)=>r?.date===latest&&CURRENCIES.some(c=>c.code===r?.quote&&!NON_FIAT[c.code])))
 }
 let date='', raw:Record<string,unknown>={}
 if(key==='er') {if(d?.result!=='success'||d.base_code!=='EUR'||!Number.isFinite(d.time_last_update_unix))throw new Error('开放汇率数据格式异常');date=new Date(d.time_last_update_unix*1000).toISOString().slice(0,10);raw=d.rates}
 else if(key.startsWith('fawaz-')) {date=d?.date;raw=d?.eur}
 else {
  if(!d||typeof d!=='object'||Array.isArray(d))throw new Error('FloatRates 数据格式异常')
  raw={EUR:1}
  for(const c of CURRENCIES.filter(c=>c.code!=='EUR')){const r=d[c.code.toLowerCase()];if(!r)continue;const t=Date.parse(r.date);if(r.code!==c.code||!Number.isFinite(t))throw new Error('FloatRates 数据格式异常');const rd=new Date(t).toISOString().slice(0,10);if(date&&date!==rd)throw new Error('汇率日期不一致');date=rd;raw[c.code]=typeof r.rate==='string'&&r.rate.trim()?Number(r.rate):r.rate}
 }
 if(!raw||typeof raw!=='object')throw new Error('汇率数据格式异常')
 const rates:Record<string,number>={}
 for(const c of CURRENCIES){if(NON_FIAT[c.code]&&!key.startsWith('fawaz-'))continue;const v=raw[c.code]??raw[c.code.toLowerCase()];if(v!==undefined){if(typeof v!=='number'||!Number.isFinite(v)||v<=0)throw new Error('汇率数据格式异常');rates[c.code]=v}}
 return validateSnapshot({date,rates})
}

// 官方结构化页面/XML解析：不执行远程脚本，不依赖宿主DOM，不用请求日伪造报价日。
function sourceText(data:unknown):string {if(typeof data!=='string'||!data.trim())throw new Error('官方数据格式异常');return data.replace(/<!--[\s\S]*?-->/g,'')}
function cellText(s:string):string {return s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim()}
function positive(s:string):number {if(!/^\d+(?:[.,]\d+)?$/.test(s))throw new Error('官方汇率数值异常');const n=Number(s.replace(',','.'));if(!Number.isFinite(n)||n<=0)throw new Error('官方汇率数值异常');return n}
function rows(table:string):string[][] {return [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(c=>cellText(c[1])))}
// 输入是每1 pivot可兑换的外币数量。EUR归一后每1EUR可兑换该币数量。
function pivotSnapshot(date:string,pivot:string,perPivot:Record<string,number>):Snapshot {
 const eur=perPivot.EUR;if(!eur||perPivot[pivot]!==1)throw new Error('官方数据缺少欧元或基准币')
 const rates:Record<string,number>={};for(const c of CURRENCIES){const n=perPivot[c.code];if(n!==undefined){if(!Number.isFinite(n)||n<=0)throw new Error('官方汇率数值异常');rates[c.code]=c.code==='EUR'?1:n/eur}}
 return validateSnapshot({date,rates})
}
export function parseSAFE(data:unknown):Snapshot {
 const text=sourceText(data),table=text.match(/<table\b[^>]*\bid=["']InfoTable["'][^>]*>[\s\S]*?<\/table>/i)?.[0]
 if(!table)throw new Error('SAFE官方表格结构变化')
 const all=rows(table),headers=all[0];if(!headers||headers[0]!=='日期')throw new Error('SAFE官方表头异常')
 const codes:Record<string,string>={'美元':'USD','欧元':'EUR','日元':'JPY','港元':'HKD','英镑':'GBP','澳元':'AUD','新西兰元':'NZD','新加坡元':'SGD','瑞士法郎':'CHF','加元':'CAD','澳门元':'MOP','林吉特':'MYR','卢布':'RUB','兰特':'ZAR','韩元':'KRW','迪拉姆':'AED','里亚尔':'SAR','福林':'HUF','兹罗提':'PLN','丹麦克朗':'DKK','瑞典克朗':'SEK','挪威克朗':'NOK','里拉':'TRY','比索':'MXN','泰铢':'THB'}
 const indirect=new Set(['MOP','MYR','RUB','ZAR','KRW','AED','SAR','HUF','PLN','DKK','SEK','NOK','TRY','MXN','THB'])
 const quotes=headers.slice(1).map(h=>codes[h]);if(quotes.some(c=>!c)||new Set(quotes).size!==quotes.length)throw new Error('SAFE币种表头变化')
 const records=all.slice(1).filter(r=>r.length);if(records.some(r=>!validDate(r[0])||r.length!==headers.length))throw new Error('SAFE官方日期或数据异常');records.sort((a,b)=>b[0].localeCompare(a[0]));const r=records[0]
 if(!r||r.length!==headers.length)throw new Error('SAFE官方日期或数据异常')
 const perCNY:Record<string,number>={CNY:1}
 quotes.forEach((c,i)=>{const v=r[i+1];if(v==='-'||v==='—'||v==='')return;const n=positive(v);perCNY[c]=indirect.has(c)?n/100:100/n})
 return pivotSnapshot(r[0],'CNY',perCNY)
}
export function parseCBR(data:unknown):Snapshot {
 const text=sourceText(data),date=text.match(/<ValCurs\b[^>]*\bDate=["'](\d{2})\.(\d{2})\.(\d{4})["']/)?.slice(1)
 if(!date||!/<\/ValCurs>\s*$/.test(text))throw new Error('CBR官方日期或XML异常')
 const perRUB:Record<string,number>={RUB:1},seen=new Set<string>()
 for(const m of text.matchAll(/<Valute\b[^>]*>([\s\S]*?)<\/Valute>/g)){
  const field=(name:string)=>m[1].match(new RegExp(`<${name}>([^<]+)</${name}>`))?.[1].trim()
  const c=field('CharCode');if(!c||!/^([A-Z]{3})$/.test(c)||seen.has(c)||c==='RUB')throw new Error('CBR币种异常');seen.add(c)
  const nominal=positive(field('Nominal')||''),value=positive(field('Value')||'');if(!Number.isInteger(nominal))throw new Error('CBR报价单位异常')
  perRUB[c]=nominal/value
 }
 return pivotSnapshot(`${date[2]}-${date[1]}-${date[0]}`,'RUB',perRUB)
}
const MONTH_NAMES=['January','February','March','April','May','June','July','August','September','October','November','December']
export function parseFED(data:unknown):Snapshot {
 const text=sourceText(data),release=text.match(/Release Date:\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/)
 if(!release||!text.includes('Rates in currency units per U.S. dollar except as noted by an asterisk')||!text.includes('U.S. dollars per currency unit'))throw new Error('H.10官方日期或报价单位变化')
 const rm=MONTH_NAMES.indexOf(release[1])+1,rd=`${release[3]}-${String(rm).padStart(2,'0')}-${release[2].padStart(2,'0')}`;if(!validDate(rd))throw new Error('H.10发布日期异常')
 const table=text.match(/<table\b[^>]*class=["']statistics["'][^>]*>[\s\S]*?<\/table>/i)?.[0];if(!table)throw new Error('H.10官方表格结构变化')
 const all=rows(table),header=all[0];if(!header||header[0]!=='COUNTRY'||header[1]!=='CURRENCY'||header.length<3)throw new Error('H.10表头异常')
 const countries:Record<string,string>={'AUSTRALIA':'AUD','BRAZIL':'BRL','CANADA':'CAD','CHINA, P.R.':'CNY','DENMARK':'DKK','EMU MEMBERS':'EUR','HONG KONG':'HKD','INDIA':'INR','JAPAN':'JPY','MALAYSIA':'MYR','MEXICO':'MXN','NEW ZEALAND':'NZD','NORWAY':'NOK','SINGAPORE':'SGD','SOUTH AFRICA':'ZAR','SOUTH KOREA':'KRW','SWEDEN':'SEK','SWITZERLAND':'CHF','THAILAND':'THB','UNITED KINGDOM':'GBP'}
 const seen=new Set<string>(),fx=all.slice(1).filter(r=>countries[r[0]?.replace(/^\*\s*/, '')]);for(const r of fx){const c=countries[r[0].replace(/^\*\s*/, '')];if(seen.has(c)||r.length!==header.length)throw new Error('H.10币种或列异常');seen.add(c)}
 // 周报假期ND不倒填其他日期；选择最近一个默认六币同日齐备的观测列。
 for(let col=header.length-1;col>=2;col--){
  const h=header[col].match(/^([A-Za-z]+)\.?\s+(\d{1,2})$/),month=h?MONTH_NAMES.findIndex(m=>m===h[1]||m.slice(0,3)===h[1])+1:0
  if(!h||!month)throw new Error('H.10观测日期异常')
  let year=Number(release[3]);if(month>rm)year--;const date=`${year}-${String(month).padStart(2,'0')}-${h[2].padStart(2,'0')}`
  if(!validDate(date)||date>rd||Date.parse(rd)-Date.parse(date)>14*86400000)throw new Error('H.10观测日期异常')
  const perUSD:Record<string,number>={USD:1}
  for(const r of fx){const c=countries[r[0].replace(/^\*\s*/, '')],v=r[col];if(v==='ND')continue;const n=positive(v);perUSD[c]=r[0].startsWith('*')?1/n:n}
  if(DEFAULT_CODES.every(c=>perUSD[c]))return pivotSnapshot(date,'USD',perUSD)
 }
 throw new Error('缺少默认币种汇率（H.10同日数据）')
}
// 官方API以year/month确定适用期，响应无逐日报价日期。首日仅代表会计月份，非抓取日。
export function inforEuroRequest(now:Date=new Date()):{url:string;year:number;month:number} {
 const year=now.getUTCFullYear(),month=now.getUTCMonth()+1
 return {url:`${SOURCES.find(s=>s.key==='inforeuro')!.url}?year=${year}&month=${month}`,year,month}
}
export function parseInforEuro(data:unknown):Snapshot {
 const d=data as {year:number;month:number;rates:unknown}
 if(!d||!Number.isInteger(d.year)||d.year<1994||d.year>9999||!Number.isInteger(d.month)||d.month<1||d.month>12||!Array.isArray(d.rates)||!d.rates.length)throw new Error('InforEuro适用月份或官方数据异常')
 const rates:Record<string,number>={},seen=new Set<string>()
 for(const r of d.rates as {isoA3Code:string;value:number}[]){if(!r||!/^([A-Z]{3})$/.test(r.isoA3Code)||seen.has(r.isoA3Code)||typeof r.value!=='number'||!Number.isFinite(r.value)||r.value<=0)throw new Error('InforEuro官方汇率异常');seen.add(r.isoA3Code);if(CURRENCIES.some(c=>c.code===r.isoA3Code))rates[r.isoA3Code]=r.value}
 return validateSnapshot({date:`${d.year}-${String(d.month).padStart(2,'0')}-01`,rates})
}
