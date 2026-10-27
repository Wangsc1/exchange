// 真正的导航会话+网页源码，DOM/宿主模拟；不证明iPhone转场和系统手势。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {loadTS,root,Core,fixture,plain} from './helpers.mjs';
const {NavigationSession}=loadTS('navigation.ts').exports;
const {Window}=await import(pathToFileURL(process.env.HAPPY_DOM_PATH||createRequire(import.meta.url).resolve('happy-dom')).href);
const tick=()=>new Promise(r=>setTimeout(r,30));
async function boot(options={}){
 const windows=[],saves=[],requests=[],disposed=[],paths=[];let session;
 const adapter={
  create(id,page,state){
   const w=new Window({settings:{enableJavaScriptEvaluation:true}});windows.push(w);w.confirm=()=>true;w.__exchangeBoot={native:true,page,state:state?plain(state):null};
   w.webkit={messageHandlers:{exchange:{postMessage:m=>{session.handle(id,m.action,m.value).then(value=>({ok:true,value}),e=>({ok:false,error:e.message})).then(r=>{if(session.isActive(id))w.__exchangeReply({id:m.id,...r});});}}}};
   w.document.write(readFileSync(root+'web/index.html','utf8'));
   setTimeout(()=>{if(!disposed.includes(w))w.eval(readFileSync(root+'web/core.js','utf8')+'\n'+readFileSync(root+'web/ui.js','utf8'));},0);
   return w;
  },
  pause:async w=>w.__exchangePause(),sync:async(w,state)=>w.__exchangeResume(plain(state)),dispose:w=>{assert.ok(!disposed.includes(w));disposed.push(w);w.happyDOM.abort();},
  request:async(action,value)=>{
   requests.push({action,value:plain(value??null)});
   if(action==='config')return options.config||plain(Core.normalizeConfig(null));
   if(action==='settings')return options.settings||plain(Core.normalizeSettings(null));
   if(action==='save'||action==='saveSettings'){if(options.saveDelay&&action==='saveSettings')await options.saveDelay;saves.push(plain(value));return plain(value);}
   if(action==='latest'){if(options.delayedSource===value)await options.delay;return {value:options.snapshot||fixture,fetchedAt:Date.now(),offline:!!options.offline,warning:options.offline?'离线缓存':''};}
   if(action==='intraday')return {value:[{date:'2026-01-02T00:00:00.000Z',base:value.base,quote:value.quote,rate:2},{date:'2026-01-02T12:00:00.000Z',base:value.base,quote:value.quote,rate:3}],offline:false,warning:''};
   if(action==='history')return {value:[{date:'2026-01-02',base:value.base,quote:value.quote,rate:2}],offline:false,warning:''};
   throw Error(action);
  }
 };
 session=new NavigationSession(adapter);await tick();
 const a={session,windows,saves,requests,disposed,get window(){return session.pages.get(session.activeId).controller},get document(){return this.window.document},get page(){return session.pages.get(session.activeId).page},async click(id){this.document.getElementById(id).click();await tick();},async pop(){await session.pop(session.activeId);await tick();},async close(){session.dispose();await Promise.all(windows.map(w=>w.happyDOM.abort()));}};
 return a;
}
function key(a,k){[...a.document.querySelectorAll('#keyboard button')].find(b=>b.textContent===k).click();}
function choose(a,q){const s=a.document.getElementById('search');s.value=q;s.dispatchEvent(new a.window.Event('input'));a.document.querySelector('#currencyList .currency').click();}
test('原生详情->选择->详情->主页，回传基准/目标且不丢表达式；所有controller只dispose一次',async()=>{const a=await boot();try{key(a,'2');key(a,'+');a.document.querySelector('.swipe.right').click();await tick();assert.equal(a.page,'detail');const detail=a.window;assert.match(a.document.getElementById('pair').textContent,/USD/);a.document.querySelectorAll('#pair button')[1].click();await tick();assert.equal(a.page,'selector');choose(a,'欧元');await tick();assert.equal(a.page,'detail');assert.equal(a.window,detail);assert.match(a.document.getElementById('pair').textContent,/EUR/);assert.equal(a.requests.filter(r=>r.action==='intraday').at(-1).value.quote,'EUR');await a.pop();assert.equal(a.page,'home');assert.equal(a.document.getElementById('expression').textContent,'2+ CNY');assert.equal(a.document.getElementById('rows').classList.contains('edited'),true);key(a,'3');await a.click('equals');assert.equal(a.saves.at(-1).amount,5);a.document.querySelector('.swipe.left').click();await tick();choose(a,'日本');await tick();assert.equal(a.page,'home');assert.equal(a.document.querySelector('.code').textContent,'JPY');assert.equal(a.saves.at(-1).codes[0],'JPY');assert.equal(a.session.pages.size,1);assert.equal(a.disposed.length,3);}finally{await a.close();}});
test('设置所有子页原生push/pop；小数/源/默认值共享，灰显金额仍不可删',async()=>{const a=await boot();try{await a.click('settings');assert.equal(a.page,'menu');await a.click('setting-decimals');assert.equal(a.page,'decimalSettings');await a.click('fiatDecimals');assert.equal(a.page,'decimalChoices');a.document.querySelector('[data-value="4"]').click();await tick();assert.equal(a.page,'decimalSettings');assert.match(a.document.getElementById('fiatDecimalsValue').textContent,/4/);await a.pop();await a.click('setting-source');a.document.querySelectorAll('#choiceRows button')[Core.SOURCES.findIndex(s=>s.key==='er')].click();await tick();assert.equal(a.page,'menu');assert.equal(a.session.state.settings.source,'er');await a.click('setting-defaultAmount');a.document.querySelectorAll('#choiceRows button')[3].click();await tick();await a.pop();assert.equal(a.page,'home');assert.match(a.document.getElementById('source').textContent,/ExchangeRate-API/);assert.match(a.document.querySelector('.row:not(.active) .amount').textContent,/\.\d{4}$/);a.document.querySelector('.rowContent').click();await tick();assert.equal(a.document.querySelector('.row.active .amount').textContent,'1000');for(let i=0;i<5;i++)key(a,'⌫');assert.equal(a.document.querySelector('.row.active .amount').textContent,'1000');key(a,'0');await tick();assert.equal(a.saves.at(-1).amount,0);}finally{await a.close();}});
test('系统pop后迟到旧源不覆盖新源，非活跃页不能publish或再次导航',async()=>{let finish;const delay=new Promise(r=>finish=r);const a=await boot({delayedSource:'er',delay});try{await a.click('settings');const menuId=a.session.activeId;await a.click('setting-source');a.document.querySelectorAll('#choiceRows button')[Core.SOURCES.findIndex(s=>s.key==='er')].click();await tick();assert.equal(a.page,'menu');await a.pop();await a.click('settings');await a.click('setting-source');a.document.querySelectorAll('#choiceRows button')[Core.SOURCES.findIndex(s=>s.key==='fawaz-pages')].click();await tick();await a.pop();finish();await tick();assert.equal(a.session.state.settings.source,'fawaz-pages');assert.match(a.document.getElementById('source').textContent,/Cloudflare/);await assert.rejects(a.session.handle(menuId,'state',{}),/页面已关闭/);}finally{finish();await a.close();}});
test('保存设置期间系统pop，成功值仍回传父页；不在已释放网页回复',async()=>{let finish;const saveDelay=new Promise(r=>finish=r);const a=await boot({saveDelay});try{await a.click('settings');await a.click('setting-source');a.document.querySelectorAll('#choiceRows button')[Core.SOURCES.findIndex(s=>s.key==='er')].click();await tick();assert.equal(a.page,'choices');await a.pop();assert.equal(a.page,'menu');finish();await tick();assert.equal(a.session.state.settings.source,'er');await a.pop();assert.match(a.document.getElementById('source').textContent,/ExchangeRate-API/);}finally{finish();await a.close();}});
test('原生模式无网页touch返回/整页回弹，保留行过半push及不过半回原位',async()=>{const a=await boot();try{const row=a.document.querySelector('.row'),c=row.querySelector('.rowContent');Object.defineProperty(row,'clientWidth',{value:360});c.setPointerCapture=()=>{};const p=(type,x)=>c.dispatchEvent(new a.window.PointerEvent(type,{clientX:x,clientY:40,pointerId:1}));p('pointerdown',200);p('pointermove',290);p('pointerup',290);assert.equal(a.page,'home');assert.equal(c.style.transform,'');p('pointerdown',200);p('pointermove',390);p('pointerup',390);await tick();assert.equal(a.page,'selector');assert.equal(a.document.querySelectorAll('.enterLeft,.enterRight').length,0);for(const [type,x] of [['touchstart',10],['touchend',150]]){const e=new a.window.Event(type);e.touches=type==='touchstart'?[{clientX:x,clientY:200}]:[];e.changedTouches=[{clientX:x,clientY:200}];a.document.dispatchEvent(e);}await tick();assert.equal(a.page,'selector');await a.pop();assert.equal(a.page,'home');const source=readFileSync(root+'index.tsx','utf8');assert.doesNotMatch(source,/navigationBarBackButtonHidden|new Observable|NavigationDestination/);assert.match(source,/content:<Destination id=\{childId\}/);assert.match(source,/if\(!value&&session\?\.pages\.get\(id\)\?\.child===childId\)/);}finally{await a.close();}});
test('详情周期通过系统pop保存到会话，下次打开仍保持；返回不丢基准输入',async()=>{const a=await boot();try{key(a,'6');a.document.querySelector('.swipe.right').click();await tick();a.document.querySelectorAll('#periods button')[2].click();await tick();const period=a.session.state.period;assert.notEqual(period,1);await a.pop();a.document.querySelector('.swipe.right').click();await tick();assert.equal(a.session.state.period,period);assert.equal(a.document.querySelector('#periods button.active').textContent,'1月');await a.pop();assert.equal(a.document.querySelector('.row.active .amount').textContent,'6');}finally{await a.close();}});

test('币种对勾状态：六行各自选中项、搜索后标记、详情基准/目标选择均一致',async()=>{const a=await boot();try{
 const verify=expected=>{const selected=[...a.document.querySelectorAll('#currencyList [aria-pressed="true"]')];assert.ok(selected.length);for(const b of selected){assert.ok(b.querySelector('.labels small').textContent.startsWith(expected+' ·'));assert.ok(b.querySelector('.check svg path'));assert.equal(b.disabled,false);}for(const b of a.document.querySelectorAll('#currencyList [aria-pressed="false"]'))assert.equal(b.querySelector('.check svg'),null);};
 const codes=plain(Core.DEFAULT_CODES);
 for(let i=0;i<codes.length;i++){a.document.querySelectorAll('.swipe.left')[i].click();await tick();verify(codes[i]);const search=a.document.getElementById('search');search.value=codes[i];search.dispatchEvent(new a.window.Event('input'));verify(codes[i]);await a.pop();}
 a.document.querySelector('.swipe.right').click();await tick();for(const i of [0,1]){const code=i===0?'USD':'CNY';a.document.querySelectorAll('#pair button')[i].click();await tick();verify(code);await a.pop();}
 }finally{await a.close();}});
test('原生设置桥仅点击才打开，沿用show共享未完成表达式和编辑态；返回仍可续写',async()=>{const a=await boot();try{key(a,'2');key(a,'+');assert.equal(a.page,'home');a.window.__exchangeOpenSettings();await tick();assert.equal(a.page,'menu');assert.equal(a.session.state.expr,'2+');assert.equal(a.session.state.edited,true);await a.pop();assert.equal(a.document.getElementById('expression').textContent,'2+ CNY');key(a,'3');await a.click('equals');assert.equal(a.saves.at(-1).amount,5);}finally{await a.close();}});

test('设置子页保存中返回设置并关闭设置，迟到成功同步主页、切源重新请求且默认金额生效',async()=>{let finish;const saveDelay=new Promise(r=>finish=r);const a=await boot({saveDelay});try{
 a.window.__exchangeOpenSettings();await tick();await a.click('setting-source');a.document.querySelectorAll('#choiceRows button')[Core.SOURCES.findIndex(s=>s.key==='er')].click();await tick();await a.pop();await a.pop();assert.equal(a.page,'home');finish();await tick();await tick();assert.equal(a.session.state.settings.source,'er');assert.ok(a.requests.some(r=>r.action==='latest'&&r.value==='er'));assert.match(a.document.getElementById('source').textContent,/ExchangeRate-API/);
 a.window.__exchangeOpenSettings();await tick();await a.click('setting-defaultAmount');a.document.querySelectorAll('#choiceRows button')[3].click();await tick();await a.pop();a.document.querySelector('.rowContent').click();await tick();assert.equal(a.document.querySelector('.row.active .amount').textContent,'1000');
 }finally{finish();await a.close();}});

test('选择列表一次分组与原26次筛选结果等价：全部币种/过滤行情/搜索及清空，顺序与字母索引保持',async()=>{
 const source=readFileSync(root+'web/ui.js','utf8');const literal=source.match(/const INITIAL = (\{[^\n]+\});/)[1];const initial=JSON.parse(literal.replace(/([A-Z]+):/g,'"$1":').replace(/'/g,'"'));
 const snapshots=[fixture,{date:fixture.date,rates:Object.fromEntries(Core.CURRENCIES.map(c=>[c.code,1]))}];
 for(const snapshot of snapshots){const a=await boot({snapshot});try{a.document.querySelector('.swipe.left').click();await tick();
 for(const query of ['',' usd ','日本','不存在','']){const input=a.document.getElementById('search');input.value=query;input.dispatchEvent(new a.window.Event('input'));
 const found=Core.search(query,Object.keys(snapshot.rates));const searching=!!query.trim();const groups=searching?[['搜索结果',found,'search']]:[['常用',found.filter(c=>Core.DEFAULT_CODES.includes(c.code)),'common']];
 if(!searching)for(const L of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'){const items=found.filter(c=>(initial[c.code]||'#')===L).sort((x,y)=>x.name.localeCompare(y.name,'zh-Hans-u-co-pinyin'));if(items.length)groups.push([L,items,L]);}
 const expected=[];for(const [title,items,key] of groups){expected.push(['group',title,key]);for(const c of items)expected.push(['currency',c.code]);}
 const actual=[...a.document.getElementById('currencyList').children].filter(e=>e.matches('.groupTitle,.currency')).map(e=>e.matches('.groupTitle')?['group',e.textContent,e.dataset.key]:['currency',e.querySelector('small').textContent.split(' · ')[0]]);
 assert.deepEqual(actual,plain(expected));assert.deepEqual([...a.document.querySelectorAll('#letterIndex .letter')].map(e=>e.textContent),searching?[]:['#',...groups.slice(1).map(g=>g[0])]);
 }
 }finally{await a.close();}}
});

test('设置pause等待中系统pop，不再创建孤儿子页；重复navigate只push一次',async()=>{
 let resume;let delayed=false;const created=[],disposed=[];const session=new NavigationSession({create:(id)=>{created.push(id);return id},dispose:c=>disposed.push(c),pause:()=>delayed?new Promise(r=>resume=r):Promise.resolve(),sync:async()=>{},request:async()=>true});
 await session.handle('root','navigate',{page:'menu',state:{expr:'2+'}});const menu=session.activeId;delayed=true;
 const pending=session.handle(menu,'navigate',{page:'choices',state:{expr:'2+'}});await session.pop(menu);resume();await pending;assert.equal(session.activeId,'root');assert.equal(session.pages.size,1);assert.deepEqual(created,['root',menu]);assert.deepEqual(disposed,[menu]);
 const first=session.handle('root','navigate',{page:'menu',state:{}});await session.handle('root','navigate',{page:'menu',state:{}});resume();await first;assert.equal(created.length,3);assert.equal(session.pages.size,2);session.dispose();
});
