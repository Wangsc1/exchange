// DOM 集成测试不等于 iOS 真机验证；此处桥接明确使用模拟服务。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { root, Core, fixture, plain } from './helpers.mjs';
const path=process.env.HAPPY_DOM_PATH||createRequire(import.meta.url).resolve('happy-dom');
const {Window}=await import(pathToFileURL(path).href);
const tick=()=>new Promise(r=>setTimeout(r,20));
async function boot(options={}){
  const window=new Window({settings:{enableJavaScriptEvaluation:true}}),saves=[],requests=[];
  window.confirm=()=>true;
  const handle=async m=>{
    requests.push(m);
    if(m.action==='config')return {ok:true,value:options.config||Core.normalizeConfig(null)};
    if(m.action==='save'){saves.push(plain(m.value));return {ok:true,value:m.value};}
    if(m.action==='latest')return options.error?{ok:false,error:'离线且没有缓存'}:{ok:true,value:{value:fixture,offline:!!options.offline,warning:options.offline?'离线缓存':''}};
    if(m.action==='history')return {ok:true,value:{value:[{date:'2026-01-02',base:m.value.base,quote:m.value.quote,rate:Core.convert(1,m.value.base,m.value.quote,fixture)}],offline:false,warning:''}};
    if(m.action==='checkUpdate')return {ok:false,error:'请求失败 HTTP 404'};
    return {ok:true,value:true};
  };
  // 模拟真机：postMessage 不返回结果，原生稍后用 evaluateJavaScript 回调页面。
  window.webkit={messageHandlers:{exchange:{postMessage:m=>{handle(m).then(r=>window.__exchangeReply({id:m.id,...r}));}}}};
  window.document.write(readFileSync(root+'web/index.html','utf8'));
  window.eval(readFileSync(root+'web/core.js','utf8')+'\n'+readFileSync(root+'web/ui.js','utf8'));
  await tick();return {window,document:window.document,saves,requests,close:()=>window.happyDOM.abort()};
}
function key(document,text){const b=[...document.querySelectorAll('#keyboard button')].find(b=>b.textContent===text);assert.ok(b);b.click();}
test('界面默认六行、名称汇率、基准点击金额等值',async()=>{const app=await boot();try{const d=app.document;assert.equal(d.querySelector('h1').textContent,'汇率');assert.equal(d.querySelectorAll('.row').length,6);assert.match(d.querySelector('.row.active').textContent,/CNY/);d.querySelector('.rowContent').click();await tick();assert.equal(app.saves.at(-1).base,'USD');assert.ok(Math.abs(app.saves.at(-1).amount-100/7)<1e-9);assert.match(d.getElementById('expression').textContent,/USD/);}finally{await app.close();}});
test('界面键盘四则、等号、退格与清空',async()=>{const app=await boot();try{const d=app.document;key(d,'2');key(d,'+');key(d,'3');key(d,'×');key(d,'4');d.getElementById('equals').click();await tick();assert.equal(app.saves.at(-1).amount,14);key(d,'8');key(d,'⌫');await tick();assert.equal(app.saves.at(-1).amount,0);d.getElementById('clear').click();assert.match(d.getElementById('expression').textContent,/0 CNY/);key(d,'1');key(d,'÷');key(d,'0');d.getElementById('equals').click();assert.match(d.getElementById('toast').textContent,/除以零/);}finally{await app.close();}});
test('右侧功能打开切换，搜索地区并避免重复币种',async()=>{const app=await boot();try{const d=app.document;d.querySelector('.swipe.left').click();const search=d.getElementById('search');search.value='日本';search.dispatchEvent(new app.window.Event('input'));assert.equal(d.querySelectorAll('.currency').length,1);d.querySelector('.currency').click();await tick();assert.equal(app.saves.at(-1).codes[0],'JPY');assert.equal(app.saves.at(-1).base,'CNY');d.querySelector('.swipe.left').click();search.value='人民币';search.dispatchEvent(new app.window.Event('input'));assert.equal(d.querySelector('.currency').disabled,true);}finally{await app.close();}});
test('详情只提供日周期，真实历史及目标选择',async()=>{const app=await boot();try{const d=app.document;d.querySelector('.swipe.right').click();await tick();assert.equal(d.querySelectorAll('#periods button').length,5);assert.doesNotMatch(d.getElementById('periods').textContent,/24/);assert.equal(d.querySelectorAll('#chart circle').length,1);assert.equal(d.querySelectorAll('#stats strong').length,4);d.getElementById('pairChoice').click();d.getElementById('search').value='日元';d.getElementById('search').dispatchEvent(new app.window.Event('input'));d.querySelector('.currency').click();await tick();assert.match(d.getElementById('pair').textContent,/JPY/);assert.equal(app.requests.filter(r=>r.action==='history').at(-1).value.quote,'JPY');}finally{await app.close();}});
test('离线缓存日期可见，无缓存时不显示合成金额',async()=>{const app=await boot({offline:true});try{assert.match(app.document.getElementById('source').textContent,/2026-01-02.*离线缓存/);}finally{await app.close();}const bad=await boot({error:true});try{assert.equal(bad.document.querySelector('.amount').textContent,'—');assert.match(bad.document.getElementById('toast').textContent,/没有缓存/);}finally{await bad.close();}});
test('恢复币种配置且更新404不会误报成功',async()=>{const config={codes:['JPY','CNY','CAD','EUR','GBP','AUD'],base:'JPY',amount:200};const app=await boot({config});try{const d=app.document;assert.match(d.querySelector('.row.active').textContent,/JPY/);d.getElementById('settings').click();d.getElementById('checkUpdate').click();await tick();assert.match(d.getElementById('updateStatus').textContent,/检查失败.*404/);assert.equal(d.getElementById('install').classList.contains('hidden'),true);}finally{await app.close();}});
test('左右滑动分别露出青色详情及蓝色切换，宽度为半行',async()=>{const app=await boot();try{const row=app.document.querySelector('.row'),content=row.querySelector('.rowContent');Object.defineProperty(row,'clientWidth',{value:360});content.setPointerCapture=()=>{};const pointer=(type,x)=>content.dispatchEvent(new app.window.PointerEvent(type,{clientX:x,clientY:30,pointerId:1,bubbles:true}));pointer('pointerdown',200);pointer('pointermove',80);pointer('pointerup',80);assert.equal(content.style.transform,'translateX(-180px)');content.click();content.click();assert.equal(content.style.transform,'');pointer('pointerdown',100);pointer('pointermove',230);pointer('pointerup',230);assert.equal(content.style.transform,'translateX(180px)');}finally{await app.close();}});
test('滑到底自动打开页面：左滑详情，右滑切换货币',async()=>{const app=await boot();try{const d=app.document,row=d.querySelector('.row'),content=row.querySelector('.rowContent');Object.defineProperty(row,'clientWidth',{value:360});content.setPointerCapture=()=>{};const pointer=(type,x)=>content.dispatchEvent(new app.window.PointerEvent(type,{clientX:x,clientY:30,pointerId:1,bubbles:true}));
pointer('pointerdown',300);pointer('pointermove',100);pointer('pointerup',100);await tick();assert.equal(d.getElementById('detail').classList.contains('hidden'),false);assert.equal(content.style.transform,'');
d.getElementById('detail').querySelector('button').click();await tick();
pointer('pointerdown',50);pointer('pointermove',260);pointer('pointerup',260);await tick();assert.equal(d.getElementById('selector').classList.contains('hidden'),false);assert.equal(content.style.transform,'');}finally{await app.close();}});
