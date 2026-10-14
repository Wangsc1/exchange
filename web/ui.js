/* 本地界面；所有网络与持久化操作通过官方 Promise 消息桥完成。 */
'use strict';
const $ = id => document.getElementById(id);
let settings = Core.normalizeSettings(null), fetchedAt = null, refreshToken = 0, settingsSaving = false;
let config = Core.normalizeConfig(null), snapshot = null, expr = '100', fresh = true, edited = false;
let offline = false, warning = '', busy = false, page = 'home', toastTimer, saveQueue = Promise.resolve();
let selection = null, detailBase = 'CNY', detailQuote = 'USD', detailAmount = 100, period = 1, historyToken = 0;
// 原生处理函数不依赖 postMessage 返回值：原生完成后主动调用 window.__exchangeReply 回传结果。
const pending = new Map(); let seq = 0;
window.__exchangeReply = (reply) => { const item = pending.get(reply && reply.id); if (!item) return; pending.delete(reply.id); clearTimeout(item.timer); reply.ok ? item.resolve(reply.value) : item.reject(new Error(reply.error || '原生操作失败')); };
function bridge(action, value) {
  const handler = window.webkit?.messageHandlers?.exchange;
  if (!handler) return Promise.reject(new Error('请在 iPhone Scripting 中运行本脚本，浏览器没有原生数据桥'));
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('原生操作超时，请重试')); }, 60000);
    pending.set(id, { resolve, reject, timer });
    try { Promise.resolve(handler.postMessage({ id, action, value })).catch(e => window.__exchangeReply({ id, ok: false, error: '消息发送失败：' + (e && e.message || e) })); }
    catch (e) { window.__exchangeReply({ id, ok: false, error: '消息发送失败：' + (e && e.message || e) }); }
  });
}
function toast(message) { $('toast').textContent = message; $('toast').classList.remove('hidden'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.add('hidden'), 5500); }
const PAGE_IDS=['home','detail','selector','menu','choices','decimalSettings','decimalChoices'];
let choiceField='source', choiceTitle='换算汇率源', needsRefresh=false;
function mount(){
 for(const id of PAGE_IDS)$(id).classList.toggle('hidden',id!==page);
 render();
 if(page==='detail'&&snapshot)renderDetail();
 if(page==='selector'){$('selectTitle').textContent=selection?.kind==='base'?'选择基准币种':selection?.kind==='quote'?'选择目标币种':'切换货币';renderSelector();}
 if(page==='menu')renderSettings();
 if(page==='choices')renderChoices(choiceField,choiceTitle);
 if(page==='decimalSettings')renderDecimalSettings();
 if(page==='decimalChoices')renderDecimalChoices();
 if(needsRefresh&&(page==='menu'||page==='home')){needsRefresh=false;refresh();}
}
// 1.2.1 临时恢复：单网页页面栈与自定义边缘返回，不是系统原生导航。
const pageStack=[],entryDir={};
function show(target,dir='right'){
 const leaving=page;
 historyToken++;
 if(dir==='back'){target=pageStack.pop()||target||'home';dir=entryDir[leaving]==='right'?'left':'right';}
 else{pageStack.push(leaving);entryDir[target]=dir;}
 page=target;mount();
 for(const id of PAGE_IDS)$(id).classList.remove('enterLeft','enterRight');
 // 设置相关页面不叠加回弹，只在三个主页面之间保留原进入动画。
 // 例外：从设置返回主页也使用回弹动画。
 if((['home','detail','selector'].includes(leaving)&&['home','detail','selector'].includes(target))||(leaving==='menu'&&target==='home')){
  void $(target).offsetWidth;$(target).classList.add(dir==='left'?'enterLeft':'enterRight');
 }
}
function backPage(){if(pageStack.length)show(pageStack[pageStack.length-1],'back');}
{
 let sx=0,sy=0,tracking=false;
 document.addEventListener('touchstart',e=>{const t=e.touches[0];tracking=page!=='home'&&e.touches.length===1&&t.clientX<=28;sx=t.clientX;sy=t.clientY;},{passive:true});
 document.addEventListener('touchend',e=>{if(!tracking)return;tracking=false;const t=e.changedTouches[0],dx=t.clientX-sx,dy=Math.abs(t.clientY-sy);if(dx>70&&dx>dy*1.5)backPage();},{passive:true});
 document.addEventListener('touchcancel',()=>{tracking=false;},{passive:true});
}
function numberText(n) { return n.toLocaleString('en-US', { useGrouping: false, maximumSignificantDigits: 15 }); }
function formatted(n) { return n.toLocaleString('en-US', { minimumFractionDigits: settings.decimals, maximumFractionDigits: settings.decimals }); }
function persist() {
  const value = { codes: [...config.codes], base: config.base, amount: config.amount };
  saveQueue = saveQueue.catch(() => {}).then(() => bridge('save', value)).catch(e => toast(e.message));
}
function element(tag, text, className) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; }
function currency(code) { return Core.CURRENCIES.find(c => c.code === code); }
function renderRows() {
  $('rows').classList.toggle('edited',edited);
  $('rows').replaceChildren();
  config.codes.forEach((code, index) => {
    const c = currency(code), row = element('div', undefined, 'row' + (code === config.base ? ' active' : ''));
    const swap = element('button', '切换货币 ⇆', 'swipe left'), info = element('button', 'ⓘ 汇率详情', 'swipe right');
    swap.setAttribute('aria-label', '切换' + c.name); info.setAttribute('aria-label', c.name + '汇率详情');
    swap.onclick = () => openSelector({ kind: 'row', index, back: 'home' }); info.onclick = () => openDetail(code);
    const content = element('button', undefined, 'rowContent');
    content.append(element('span', Core.flag(c.country), 'flag'), element('span', code, 'code'));
    const amounts = element('div', undefined, 'amounts');
    let amount = code === config.base ? config.amount : null;
    try { if (snapshot) amount = Core.convert(config.amount, config.base, code, snapshot); } catch { /* 没有行情的行显示破折号，不合成汇率。 */ }
    amounts.append(element('div', code === config.base ? expr : amount === null ? '—' : formatted(amount), 'amount'), element('div', `${c.name}${settings.symbols ? ' ' + c.symbol : ''}`, 'name'));
    content.append(amounts); content.setAttribute('aria-label', `${c.name} ${amount === null ? '暂无数据' : numberText(amount)}，点击作为输入基准；左右滑动打开操作`);
    let startX = 0, startY = 0, startOffset = 0, offset = 0, moving = false, dragged = false;
    // 内容跟手位移；左右操作面板宽度等于已露出的宽度，因此可一直滑到底。animate=true 时使用回弹曲线。
    const setOffset = (o, animate) => {
      const t = animate ? '' : 'none';
      content.style.transition = t; swap.style.transition = t; info.style.transition = t;
      content.style.transform = o ? `translateX(${o}px)` : ''; swap.style.width = o > 0 ? o + 'px' : ''; info.style.width = o < 0 ? -o + 'px' : '';
    };
    content.onpointerdown = event => { startX = event.clientX; startY = event.clientY; startOffset = offset; moving = false; dragged = false; };
    content.onpointermove = event => {
      const dx = event.clientX - startX, dy = event.clientY - startY;
      if (!moving && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { moving = true; dragged = true; content.setPointerCapture(event.pointerId); }
      if (!moving) return;
      event.preventDefault(); const w = row.clientWidth; offset = Math.max(-w, Math.min(w, startOffset + dx));
      setOffset(offset, false);
    };
    content.onpointerup = () => {
      if (moving) {
        const w = row.clientWidth;
        if (Math.abs(offset) >= w * 0.5) {
          // 超过一半：自动进入对应页面（页面回弹进入），行随后弹回原位。
          const action = offset > 0 ? () => openSelector({ kind: 'row', index, back: 'home' }, 'left') : () => openDetail(code);
          offset = 0; moving = false; action(); setOffset(0, true); return;
        }
        offset = 0; setOffset(0, true); // 未过半：不停留半开状态，直接弹回
      }
      moving = false;
    };
    content.onpointercancel = () => { moving = false; offset = 0; setOffset(0, true); };
    content.onclick = () => {
      if (dragged) { dragged = false; return; }
      if (offset) { offset = 0; setOffset(0, true); return; }
      if (!snapshot) return toast('请先刷新取得汇率');
      if(!snapshot.rates[code])return toast('本源没有'+code+'汇率，请切换此行币种或换源');
      try { config = { ...config, base: code, amount: settings.defaultAmount }; expr = numberText(settings.defaultAmount); fresh = true; edited = false; persist(); render(); } catch (e) { toast(e.message); }
    };
    row.append(swap, info, content); $('rows').append(row);
  });
}
function render() {
  renderRows(); $('expression').textContent = `${expr} ${config.base}`;
  const src = Core.SOURCES.find(s => s.key === settings.source);
  $('source').classList.toggle('hidden', !settings.showSource);
  $('source').textContent = `${src.name} | ${snapshot ? snapshot.date : '暂无数据'}${offline ? ' | 离线缓存' : ''}${warning ? ' | ' + warning : ''}`;
}
async function refresh() {
  const token = ++refreshToken, key = settings.source; busy = true;
  snapshot = null; warning = ''; render();
  try { const r = await bridge('latest', key); if(token !== refreshToken)return; snapshot = Core.validateSnapshot(r.value); offline = r.offline; warning = r.warning; fetchedAt = r.fetchedAt || null; const missing=config.codes.filter(c=>!snapshot.rates[c]);if(missing.length){const note='本源不覆盖已选 '+missing.join('/')+'，保留配置不自动折算，请切换缺失行或换源';warning=[warning,note].filter(Boolean).join('；');} if (warning) toast(warning); }
  catch (e) { if(token !== refreshToken)return; warning = e.message; toast(e.message); }
  finally { if(token === refreshToken){busy = false; render(); renderSettings();} }
}

function restoreDefaultAmount(){config.amount=settings.defaultAmount;expr=numberText(config.amount);fresh=true;edited=false;persist();render();}
function input(key) {
  if(key==='⌫'&&!edited)return; // 灰显默认值不可退格；数字键仍替换并进入编辑态。
  // keyInput 的零占位不能用于判断删空：先查看退格后的原始表达式是否还含数字。
  if(key==='AC'||(key==='⌫'&&!/[0-9]/.test(expr.slice(0,-1)))){restoreDefaultAmount();return;}
  if(/^[0-9.]$/.test(key))edited=true;
  if (key === '=') { try { config.amount = Core.calculate(expr); expr = numberText(config.amount); fresh = true; persist(); render(); } catch (e) { toast(e.message); } return; }
  if (fresh && /^[0-9.]$/.test(key)) expr = '0';
  fresh = false; expr = Core.keyInput(expr, key);
  try { config.amount = Core.calculate(expr); persist(); } catch { /* 未完成的算式保留最后一个有效金额，等号时才提示。 */ }
  render();
}
['7','8','9','+','4','5','6','-','1','2','3','×','.','0','⌫','÷'].forEach(key => { const b = element('button', key); b.setAttribute('aria-label', key === '⌫' ? '退格' : key); b.onclick = () => input(key); $('keyboard').append(b); });
$('clear').onclick = () => { input('AC'); fresh = true; }; $('equals').onclick = () => input('=');
function available() { return snapshot ? Object.keys(snapshot.rates) : []; }
function openSelector(value, dir = 'right') { if (!snapshot) return toast('请先取得可用币种汇率'); selection = value; $('selectTitle').textContent = value.kind === 'row' ? '切换货币' : value.kind === 'base' ? '选择基准币种' : '选择目标币种'; $('search').value = ''; show('selector', dir); renderSelector(); }
function selectedCode() { return selection.kind === 'row' ? config.codes[selection.index] : selection.kind === 'base' ? detailBase : detailQuote; }
// 中文名称首字拼音首字母（固定表，避免依赖系统拼音排序）。
const INITIAL = { USD:'M',CNY:'R',CAD:'J',EUR:'O',GBP:'Y',AUD:'A',BRL:'B',CHF:'R',CZK:'J',DKK:'D',HKD:'G',HUF:'X',IDR:'Y',ILS:'Y',INR:'Y',ISK:'B',JPY:'R',KRW:'H',MXN:'M',MYR:'M',NOK:'N',NZD:'X',PHP:'F',PLN:'B',RON:'L',SEK:'R',SGD:'X',THB:'T',TRY:'T',ZAR:'N' };
function renderLetterIndex(letters) {
  const box = $('letterIndex'); box.replaceChildren(); box.classList.toggle('hidden', !letters.length);
  for (const l of letters) box.append(element('span', l.label, 'letter'));
  box._letters = letters;
}
function jumpLetter(clientY) {
  const box = $('letterIndex'), letters = box._letters || []; if (!letters.length) return;
  const r = box.getBoundingClientRect(), i = Math.max(0, Math.min(letters.length - 1, Math.floor((clientY - r.top) / r.height * letters.length)));
  const target = [...$('currencyList').querySelectorAll('.groupTitle')].find(t => t.dataset.key === letters[i].key);
  if (target) $('currencyList').scrollTop = target.offsetTop;
  $('letterBubble').textContent = letters[i].label; $('letterBubble').classList.remove('hidden');
}
{
  const box = $('letterIndex'); let down = false;
  box.onpointerdown = e => { down = true; try { box.setPointerCapture(e.pointerId); } catch {} e.preventDefault(); jumpLetter(e.clientY); };
  box.onpointermove = e => { if (down) { e.preventDefault(); jumpLetter(e.clientY); } };
  const end = () => { down = false; $('letterBubble').classList.add('hidden'); };
  box.onpointerup = end; box.onpointercancel = end;
}
function renderSelector() {
  const query = $('search').value, found = Core.search(query, available()), common = Core.DEFAULT_CODES;
  $('currencyList').replaceChildren();
  const searching = !!query.trim(), letterOf = c => INITIAL[c.code] || '#';
  const groups = searching ? [['搜索结果', found, 'search']] : [['常用', found.filter(c => common.includes(c.code)), 'common']];
  const letters = [];
  if (!searching) {
    letters.push({ key: 'common', label: '#' });
    for (const L of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      const items = found.filter(c => letterOf(c) === L).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-u-co-pinyin'));
      if (items.length) { groups.push([L, items, L]); letters.push({ key: L, label: L }); }
    }
  }
  renderLetterIndex(letters);
  for (const [title, items, key] of groups) {
    const heading = element('div', title, 'groupTitle'); heading.dataset.key = key; $('currencyList').append(heading);
    for (const c of items) {
      const b = element('button', undefined, 'currency'), labels = element('span', undefined, 'labels');
      labels.append(element('span', c.name), element('small', c.code + ' · ' + c.region));
      b.append(element('span', Core.flag(c.country), 'flag'), labels, element('span', c.code === selectedCode() ? '✓' : '', 'check'));
      b.disabled = selection.kind === 'row' ? config.codes.includes(c.code) && c.code !== selectedCode() : selection.kind === 'base' ? c.code === detailQuote : c.code === detailBase;
      b.onclick = () => {
        try {
          if (selection.kind === 'row') { if(config.base===config.codes[selection.index]&&!snapshot.rates[config.base])throw new Error('旧基准币无本源汇率，不能折算金额；请先点击有汇率的行设为基准，再替换缺失行'); config = Core.replaceCurrency(config, selection.index, c.code, snapshot); expr = numberText(config.amount); fresh = true; persist(); render(); }
          else if (selection.kind === 'base') { detailAmount = settings.defaultAmount; detailBase = c.code; }
          else detailQuote = c.code;
          show(selection.back, 'back');
        } catch (e) { toast(e.message); }
      };
      $('currencyList').append(b);
    }
  }
  if (!found.length) $('currencyList').append(element('p', '没有匹配的可用法币', 'muted'));
}
$('search').oninput = renderSelector;
function openDetail(code) {
  if (!snapshot) return toast('请先取得汇率');
  if(!snapshot.rates[code])return toast('本源没有'+code+'汇率，无法打开换算详情');
  try { detailBase = code; detailAmount = settings.defaultAmount; detailQuote = code === 'USD' ? 'CNY' : 'USD'; show('detail', 'right'); } catch (e) { toast(e.message); }
}
function renderDetail() {
  const base = currency(detailBase), quote = currency(detailQuote); $('pair').replaceChildren();
  const b = element('button', `${Core.flag(base.country)} ${numberText(detailAmount)} ${detailBase}`), q = element('button', `${Core.flag(quote.country)} ${detailQuote} ▾`);
  b.onclick = () => openSelector({kind:'base',back:'detail'}); q.onclick = () => openSelector({kind:'quote',back:'detail'});
  $('pair').append(b, element('span',' → '), q);
  if(!snapshot.rates[detailBase]||!snapshot.rates[detailQuote]){ $('bigAmount').textContent='—';$('detailSource').textContent='当前源没有所选币种汇率，请更换币种或源；没有混入其他来源。';$('historyStatus').textContent='当前币种不可换算';$('chart').replaceChildren();$('stats').replaceChildren();$('chartDates').replaceChildren();return; }
  $('bigAmount').textContent = formatted(Core.convert(detailAmount, detailBase, detailQuote, snapshot));
  $('periods').replaceChildren();
  Core.PERIODS.forEach(p => { const button = element('button',p.label,p.days === period ? 'active' : ''); button.onclick = () => { period = p.days; renderDetail(); }; $('periods').append(button); });
  $('detailSource').textContent = `换算来源：${Core.SOURCES.find(s=>s.key===settings.source).name}；${snapshot.date}。历史走势：ECB（1月及以上）；24时/7天：Yahoo Finance 非官方日内行情。仅供参考，非交易或银行报价。`;
  loadHistory();
}
function timeLabel(date) { if (date.length <= 10) return date; const d = new Date(date), p = n => String(n).padStart(2, '0'); return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; }
async function loadHistory() {
  const token = ++historyToken, base = detailBase, quote = detailQuote, selected = Core.PERIODS.find(p => p.days === period);
  $('chart').replaceChildren(); $('stats').replaceChildren(); $('chartDates').replaceChildren(); $('historyStatus').textContent = selected.intraday ? '正在读取日内行情…' : '正在读取真实日历史…';
  try {
    let records, result;
    if (selected.intraday) {
      result = await bridge('intraday', { base, quote, hours: period === 1 ? 24 : 168 }); if (token !== historyToken) return;
      records = Core.validateIntraday(result.value, base, quote);
    } else {
      result = await bridge('history', { base, quote, days: period, end: snapshot.date }); if (token !== historyToken) return;
      const range = Core.historyRange(snapshot.date, period); records = Core.parseHistory(result.value, base, quote, range.from, range.to);
    }
    const stats = Core.statistics(records), scale = detailAmount, fixed = v => formatted(v * scale);
    $('historyStatus').textContent = [result.offline ? '离线缓存' : '', result.warning || ''].filter(Boolean).join(' · ');
    chart(records, stats); $('chartDates').append(element('span', timeLabel(records[0].date)), element('span', timeLabel(records[records.length - 1].date)));
    [['最高', stats.high], ['最低', stats.low], ['平均', stats.average], ['涨跌', stats.change]].forEach(([label, value]) => { const box = element('div'); box.append(element('label', label), element('strong', label === '涨跌' ? `${value >= 0 ? '+' : ''}${value.toFixed(4)}%` : fixed(value))); $('stats').append(box); });
  } catch (e) { if (token === historyToken) $('historyStatus').textContent = e.message; }
}
function chart(records,stats) {
  const ns='http://www.w3.org/2000/svg';
  function svg(tag,attrs) {const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el;}
  const first=Date.parse(records[0].date),last=Date.parse(records[records.length-1].date),padding=(stats.high-stats.low)*.15 || stats.high*.001;
  const low=stats.low-padding,high=stats.high+padding;
  const points=records.map(r=>[12+(Date.parse(r.date)-first)/(last-first||1)*336,190-(r.rate-low)/(high-low)*165]);
  // X轴按真实日期间距；不插入周末记录。一个点只绘制圆点。
  if(points.length>1){const d=points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');$('chart').append(svg('path',{d:`${d} L${points[points.length-1][0]},198 L${points[0][0]},198 Z`,fill:'#ef2c73','fill-opacity':'.08'}),svg('path',{d,fill:'none',stroke:'#ef2c73','stroke-width':'2'}));}
  else $('chart').append(svg('circle',{cx:points[0][0],cy:points[0][1],r:'3',fill:'#ef2c73'}));
  const title=svg('title',{});title.textContent=`${records[0].base}兑${records[0].quote}，${records[0].date}至${records[records.length-1].date}，最低${stats.low}，最高${stats.high}`;$('chart').prepend(title);
}
async function start(){
 mount();
 try{config=Core.normalizeConfig(await bridge('config'));settings=Core.normalizeSettings(await bridge('settings'));expr=numberText(config.amount);mount();}catch(e){toast(e.message);}
 await refresh();
}
start();
let lastRefresh=Date.now();
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&page==='home'&&Date.now()-lastRefresh>20000){lastRefresh=Date.now();refresh();}});

function updatedText() {
 if(!fetchedAt)return '上次更新 暂无成功记录';
 const d=new Date(fetchedAt),now=new Date(),yesterday=new Date(now);yesterday.setDate(now.getDate()-1);
 const day=d.toDateString()===now.toDateString()?'今天':d.toDateString()===yesterday.toDateString()?'昨天':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 return `上次更新 ${day}${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function renderSettings(){
 $('lastUpdated').textContent=updatedText();$('version').textContent='汇率 版本 '+Core.VERSION;
 const box=$('settingRows');box.replaceChildren();
 for(const [field,label] of [['symbols','货币符号'],['showSource','显示换算汇率源']]){
  const b=element('button',undefined,'settingRow');b.id=field;b.setAttribute('role','switch');b.setAttribute('aria-checked',String(settings[field]));
  const toggle=element('span',undefined,'toggle '+(settings[field]?'on':''));toggle.setAttribute('aria-hidden','true');toggle.append(element('span',undefined,'toggleDot'));
  b.append(element('span',label),toggle);
  b.onclick=()=>updateSettings(field,!settings[field]);box.append(b);
 }
 for(const [field,label,value] of [['source','换算汇率源',Core.SOURCES.find(s=>s.key===settings.source).name],['defaultAmount','货币默认值',settings.defaultAmount.toLocaleString('en-US')],['decimals','小数点位数',decimalLabel(settings.decimals)]]){
  const b=element('button',undefined,'settingRow');b.id='setting-'+field;b.append(element('span',label),element('span',value+' ›','muted'));b.onclick=()=>field==='decimals'?openDecimalSettings():openChoices(field,label);box.append(b);
 }
}
async function updateSettings(field,value){
 if(settingsSaving)return;settingsSaving=true;
 const buttons=[...document.querySelectorAll('#settingRows button, #choiceRows button, #decimalChoiceRows button')];buttons.forEach(b=>b.disabled=true);
 const origin=page,next={...settings,[field]:value};
 try{await bridge('saveSettings',next);settings=Core.normalizeSettings(next);renderSettings();render();if(field==='source'){snapshot=null;fetchedAt=null;needsRefresh=true;if(page===origin&&origin==='choices')show('menu','back');else{needsRefresh=false;await refresh();if(page==='detail'&&snapshot)renderDetail();}}else if(page===origin&&page==='decimalChoices'){show('decimalSettings','back');}else if(page===origin&&page==='choices')show('menu','back');}
 catch(e){toast(e.message);}
 finally{settingsSaving=false;buttons.forEach(b=>b.disabled=false);}
}
function renderChoices(field,title){
 $('choiceTitle').textContent=title;const box=$('choiceRows');box.replaceChildren();
 const items=field==='source'?Core.SOURCES.map(s=>[s.key,s.name,s.description]):[1,10,100,1000,10000].map(v=>[v,v.toLocaleString('en-US'),'']);
 for(const [value,label,desc] of items){const b=element('button',undefined,'currency');b.setAttribute('role','radio');b.setAttribute('aria-checked',String(settings[field]===value));const labels=element('span',undefined,'labels');labels.append(element('span',label));if(desc)labels.append(element('small',desc));b.append(labels,element('span',settings[field]===value?'✓':'','check'));b.onclick=()=>updateSettings(field,value);box.append(b);}
 box.setAttribute('role','radiogroup');box.setAttribute('aria-label',title);
}
function openChoices(field,title){choiceField=field;choiceTitle=title;show('choices');}
function decimalLabel(value){return value===0?'无':value+' 位';}
function renderDecimalSettings(){
 $('fiatDecimalsValue').textContent=decimalLabel(settings.decimals);
}
function openDecimalSettings(){renderDecimalSettings();show('decimalSettings');}
function renderDecimalChoices(){
 const box=$('decimalChoiceRows');box.replaceChildren();
 for(const value of [0,2,4,6,8]){
  const b=element('button',undefined,'decimalOption');b.dataset.value=String(value);b.setAttribute('role','radio');b.setAttribute('aria-checked',String(settings.decimals===value));
  b.append(element('span',decimalLabel(value),'decimalLabel'),element('span',(1234).toLocaleString('en-US',{minimumFractionDigits:value,maximumFractionDigits:value}),'decimalExample'),element('span',settings.decimals===value?'✓':'','check'));
  b.onclick=()=>updateSettings('decimals',value);box.append(b);
 }
}
function openDecimalChoices(){show('decimalChoices');}
$('fiatDecimals').onclick=openDecimalChoices;
$('settings').onclick=()=>{renderSettings();show('menu');};
$('resetCurrencies').onclick=()=>{if(!confirm('恢复默认币种列表？将恢复 USD、CNY、CAD、EUR、GBP、AUD，并以人民币为基准。'))return;config={codes:[...Core.DEFAULT_CODES],base:'CNY',amount:settings.defaultAmount};expr=numberText(config.amount);fresh=true;edited=false;persist();render();toast('已恢复默认币种列表');};
