/* 本地界面；所有网络与持久化操作通过官方 Promise 消息桥完成。 */
'use strict';
const $ = id => document.getElementById(id);
let config = Core.normalizeConfig(null), snapshot = null, expr = '100', fresh = true;
let offline = false, warning = '', busy = false, page = 'home', toastTimer, saveQueue = Promise.resolve();
let selection = null, detailBase = 'CNY', detailQuote = 'USD', detailAmount = 100, period = 30, historyToken = 0;
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
function show(target) { page = target; for (const id of ['home', 'detail', 'selector', 'menu']) $(id).classList.toggle('hidden', id !== target); }
function numberText(n) { return n.toLocaleString('en-US', { useGrouping: false, maximumSignificantDigits: 15 }); }
function formatted(n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: Math.abs(n) < 0.01 && n !== 0 ? 6 : 2 }); }
function persist() {
  const value = { codes: [...config.codes], base: config.base, amount: config.amount };
  saveQueue = saveQueue.catch(() => {}).then(() => bridge('save', value)).catch(e => toast(e.message));
}
function element(tag, text, className) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; }
function currency(code) { return Core.CURRENCIES.find(c => c.code === code); }
function renderRows() {
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
    amounts.append(element('div', amount === null ? '—' : formatted(amount), 'amount'), element('div', `${c.name} ${c.symbol}`, 'name'));
    content.append(amounts); content.setAttribute('aria-label', `${c.name} ${amount === null ? '暂无数据' : numberText(amount)}，点击作为输入基准；左右滑动打开操作`);
    let startX = 0, startY = 0, startOffset = 0, offset = 0, moving = false, dragged = false;
    content.onpointerdown = event => { startX = event.clientX; startY = event.clientY; startOffset = offset; moving = false; dragged = false; };
    content.onpointermove = event => {
      const dx = event.clientX - startX, dy = event.clientY - startY;
      if (!moving && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { moving = true; dragged = true; content.setPointerCapture(event.pointerId); }
      if (!moving) return;
      event.preventDefault(); offset = Math.max(-row.clientWidth / 2, Math.min(row.clientWidth / 2, startOffset + dx));
      content.style.transition = 'none'; content.style.transform = `translateX(${offset}px)`;
    };
    content.onpointerup = () => {
      if (moving) {
        const max = row.clientWidth / 2;
        if (Math.abs(offset) >= max * 0.9) {
          // 滑到底：松手后自动打开对应页面，并让行恢复原位。
          const action = offset > 0 ? () => openSelector({ kind: 'row', index, back: 'home' }) : () => openDetail(code);
          offset = 0; content.style.transition = ''; content.style.transform = ''; moving = false; action(); return;
        }
        offset = Math.abs(offset) > 45 ? Math.sign(offset) * max : 0; content.style.transition = ''; content.style.transform = `translateX(${offset}px)`;
      }
      moving = false;
    };
    content.onpointercancel = () => { moving = false; offset = 0; content.style.transition = ''; content.style.transform = ''; };
    content.onclick = () => {
      if (dragged) { dragged = false; return; }
      if (offset) { offset = 0; content.style.transform = ''; return; }
      if (!snapshot) return toast('请先刷新取得汇率');
      try { config = Core.changeBase(config, code, snapshot); expr = numberText(config.amount); fresh = true; persist(); render(); } catch (e) { toast(e.message); }
    };
    row.append(swap, info, content); $('rows').append(row);
  });
}
function render() {
  renderRows(); $('expression').textContent = `${expr} ${config.base}`;
  $('source').textContent = snapshot ? `Frankfurter · ECB | ${snapshot.date} · 工作日日更 · 仅供参考${offline ? ' | 离线缓存' : ''}${warning ? ' | ' + warning : ''}` : `Frankfurter · ECB | ${warning ? '取数失败：' + warning : '暂无数据，请联网刷新'}（仅供参考）`;
}
async function refresh() {
  if (busy) return; busy = true; $('refresh').disabled = true;
  try { const r = await bridge('latest'); snapshot = Core.validateSnapshot(r.value); offline = r.offline; warning = r.warning; if (warning) toast(warning); }
  catch (e) { warning = e.message; toast(e.message); }
  finally { busy = false; $('refresh').disabled = false; render(); }
}
function input(key) {
  if (key === '=') { try { config.amount = Core.calculate(expr); expr = numberText(config.amount); fresh = true; persist(); render(); } catch (e) { toast(e.message); } return; }
  if (fresh && /^[0-9.]$/.test(key)) expr = '0';
  fresh = false; expr = Core.keyInput(expr, key);
  try { config.amount = Core.calculate(expr); persist(); } catch { /* 未完成的算式保留最后一个有效金额，等号时才提示。 */ }
  render();
}
['7','8','9','+','4','5','6','-','1','2','3','×','.','0','⌫','÷'].forEach(key => { const b = element('button', key); b.setAttribute('aria-label', key === '⌫' ? '退格' : key); b.onclick = () => input(key); $('keyboard').append(b); });
$('clear').onclick = () => { input('AC'); fresh = true; }; $('equals').onclick = () => input('='); $('refresh').onclick = refresh;
function available() { return snapshot ? Object.keys(snapshot.rates) : []; }
function openSelector(value) { if (!snapshot) return toast('请先取得可用币种汇率'); selection = value; $('selectTitle').textContent = value.kind === 'row' ? '切换货币' : value.kind === 'base' ? '选择基准币种' : '选择目标币种'; $('search').value = ''; show('selector'); renderSelector(); }
function selectedCode() { return selection.kind === 'row' ? config.codes[selection.index] : selection.kind === 'base' ? detailBase : detailQuote; }
function renderSelector() {
  const query = $('search').value, found = Core.search(query, available()), common = Core.DEFAULT_CODES;
  $('currencyList').replaceChildren();
  const groups = query.trim() ? [['搜索结果', found]] : [['常用', found.filter(c => common.includes(c.code))], ['全部', found]];
  for (const [title, items] of groups) {
    $('currencyList').append(element('div', title, 'groupTitle'));
    for (const c of items) {
      const b = element('button', undefined, 'currency'), labels = element('span', undefined, 'labels');
      labels.append(element('span', c.name), element('small', c.code + ' · ' + c.region));
      b.append(element('span', Core.flag(c.country), 'flag'), labels, element('span', c.code === selectedCode() ? '✓' : '', 'check'));
      b.disabled = selection.kind === 'row' ? config.codes.includes(c.code) && c.code !== selectedCode() : selection.kind === 'base' ? c.code === detailQuote : c.code === detailBase;
      b.onclick = () => {
        try {
          if (selection.kind === 'row') { config = Core.replaceCurrency(config, selection.index, c.code, snapshot); expr = numberText(config.amount); fresh = true; persist(); render(); }
          else if (selection.kind === 'base') { detailAmount = Core.convert(detailAmount, detailBase, c.code, snapshot); detailBase = c.code; }
          else detailQuote = c.code;
          show(selection.back); if (selection.back === 'detail') renderDetail();
        } catch (e) { toast(e.message); }
      };
      $('currencyList').append(b);
    }
  }
  if (!found.length) $('currencyList').append(element('p', '没有匹配的可用法币', 'muted'));
}
$('search').oninput = renderSelector;
function dismissSelector() { show(selection?.back || 'home'); }
$('selectorBack').onclick = dismissSelector; $('selectorDone').onclick = dismissSelector;
function openDetail(code) {
  if (!snapshot) return toast('请先取得汇率');
  try { detailBase = code; detailAmount = Core.convert(config.amount, config.base, code, snapshot); detailQuote = code === 'USD' ? 'CNY' : 'USD'; show('detail'); renderDetail(); } catch (e) { toast(e.message); }
}
function renderDetail() {
  const base = currency(detailBase), quote = currency(detailQuote); $('pair').replaceChildren();
  const b = element('button', `${Core.flag(base.country)} ${numberText(detailAmount)} ${detailBase}`), q = element('button', `${Core.flag(quote.country)} ${detailQuote} ▾`);
  b.onclick = () => openSelector({kind:'base',back:'detail'}); q.onclick = () => openSelector({kind:'quote',back:'detail'});
  $('pair').append(b, element('span',' → '), q);
  $('bigAmount').textContent = formatted(Core.convert(detailAmount, detailBase, detailQuote, snapshot));
  $('unitRate').textContent = `1 ${detailBase} = ${numberText(Core.convert(1,detailBase,detailQuote,snapshot))} ${detailQuote} · ${snapshot.date}`;
  $('periods').replaceChildren();
  Core.PERIODS.forEach(p => { const button = element('button',p.label,p.days === period ? 'active' : ''); button.onclick = () => { period = p.days; renderDetail(); }; $('periods').append(button); });
  loadHistory();
}
async function loadHistory() {
  const token = ++historyToken, base = detailBase, quote = detailQuote;
  $('chart').replaceChildren(); $('stats').replaceChildren(); $('chartDates').replaceChildren(); $('historyStatus').textContent = '正在读取真实日历史…';
  try {
    const result = await bridge('history',{base,quote,days:period,end:snapshot.date});
    if (token !== historyToken) return;
    const range = Core.historyRange(snapshot.date,period), records = Core.parseHistory(result.value,base,quote,range.from,range.to), stats = Core.statistics(records);
    $('historyStatus').textContent = `${records.length} 个实际日记录 · ${result.offline ? '离线缓存' : 'ECB 参考汇率'}${result.warning ? ' · ' + result.warning : ''}`;
    chart(records,stats); $('chartDates').append(element('span',records[0].date),element('span',records[records.length-1].date));
    [['最高',stats.high],['最低',stats.low],['平均',stats.average],['涨跌',stats.change]].forEach(([label,value])=>{ const box=element('div');box.append(element('label',label),element('strong',label==='涨跌'?`${value>=0?'+':''}${value.toFixed(2)}%`:numberText(value)));$('stats').append(box); });
  } catch(e) { if (token === historyToken) $('historyStatus').textContent = e.message; }
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
$('detailBack').onclick = () => { historyToken++; show('home'); }; $('pairChoice').onclick = () => openSelector({kind:'quote',back:'detail'});
$('settings').onclick = () => { show('menu'); $('version').textContent = Core.VERSION; }; $('menuBack').onclick = () => show('home');
$('close').onclick = async () => { await saveQueue; try {await bridge('close');}catch(e){toast(e.message);} };
$('checkUpdate').onclick = async () => {
  $('checkUpdate').disabled=true; $('install').classList.add('hidden'); $('updateStatus').textContent='正在检查公开仓库…';
  try {const r=await bridge('checkUpdate');$('version').textContent=r.current;$('updateStatus').textContent=r.available?`发现 ${r.manifest.version}：${r.manifest.notes}`:`已是最新版 ${r.current}`;$('install').classList.toggle('hidden',!r.available);}
  catch(e){$('updateStatus').textContent=`检查失败：${e.message}。仓库尚未发布程序时也会出现此提示。`;}
  finally{$('checkUpdate').disabled=false;}
};
$('install').onclick = async () => {
  if(!window.confirm('只更新程序文件，保留手机 script.json 与本地配置。更新完成后需重新运行。是否继续？'))return;
  $('install').disabled=true; $('checkUpdate').disabled=true; $('updateStatus').textContent='正在下载并备份程序，请勿关闭…';
  try{await saveQueue;const r=await bridge('update');$('updateStatus').textContent=`已更新至 ${r.version}，请关闭并重新运行。`; $('install').classList.add('hidden');}
  catch(e){$('updateStatus').textContent=e.message;}
  finally{$('install').disabled=false;$('checkUpdate').disabled=false;}
};
async function start(){render();try{config=Core.normalizeConfig(await bridge('config'));expr=numberText(config.amount);render();}catch(e){toast(e.message);}await refresh();}
start();
