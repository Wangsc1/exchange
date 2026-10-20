// 运行真实TSX入口，JSX/宿主为受控模拟，不等于iPhone启动或手势验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {root,loadTS,Core} from './helpers.mjs';
const {NavigationSession}=loadTS('navigation.ts').exports;
const tick=()=>new Promise(r=>setTimeout(r,8));
async function runEntry(mode='success'){
 const calls=[],dialogs=[],errors=[],views=[];let exit,dismiss,finishLatest,render,currentOwner,currentContext,finishSettings;const contexts=[];const stateMap=new Map(),mounted=new Set(),nodes=new Map();
 const done=new Promise(r=>exit=r);
 const React={createElement:(type,props,...children)=>({type,props:{...props,children}})};
 const host={Script:{directory:root,exit:()=>{calls.push('exit');exit();}},VStack:'stack',WebView:'web',Text:'text',Button:'button',NavigationStack:'navigation',useState:()=>{const key=currentOwner;return [stateMap.get(key)||false,value=>{stateMap.set(key,value);queueMicrotask(()=>render?.());}];},Navigation:{useDismiss:()=>{const context=currentContext;return ()=>{calls.push('dismiss');context.close();};},present:async({element,modalPresentationStyle})=>{
  assert.equal(modalPresentationStyle,'fullScreen');
  calls.push('native-present');if(mode==='present')throw new Error('原生展示异常');
  const rootPresentation=contexts.length===0;let finish;const pending=new Promise(r=>finish=r);const context={element,close:()=>finish()};contexts.push(context);dismiss=context.close;
  function mount(node,owner){if(!node||typeof node!=='object')return;if(typeof node.type==='function'){const next=node.props.id||owner;currentOwner=next;return mount(node.type(node.props),next);}if(node.type==='stack'){nodes.set(owner,node.props);if(!mounted.has(owner)){mounted.add(owner);node.props.onAppear?.();}}for(const c of node.props.children||[])mount(c,owner);if(node.props.navigationDestination?.isPresented)mount(node.props.navigationDestination.content,owner);}
  render=()=>{for(const c of contexts){currentContext=c;mount(c.element);}};if(mode!=='appear-timeout')render();
  if(!rootPresentation&&mode==='menu-present')throw new Error('设置展示异常');
  if(!rootPresentation){await pending;contexts.splice(contexts.indexOf(context),1);dismiss=contexts[0]?.close;render();return;}
  if(mode==='root-close'){await tick();const button=nodes.get('root').toolbar.cancellationAction;assert.equal(button.type,'button');assert.equal(button.props.title,'');assert.equal(button.props.systemImage,'xmark');button.props.action();}
  if(mode==='menu-present'){await tick();views[0].handler({id:17,action:'navigate',value:{page:'menu',state:{config:Core.normalizeConfig(null),settings:Core.normalizeSettings(null),expr:'2+',edited:true}}});}
  if(mode==='late-fail'){await tick();views[0].handler({id:15,action:'navigate',value:{page:'invalid',state:{config:Core.normalizeConfig(null),settings:Core.normalizeSettings(null),expr:'2+',edited:true}}});}
  if(mode==='native-navigate'){
   assert.deepEqual(JSON.parse(JSON.stringify(nodes.get('root').ignoresSafeArea)),{regions:'container',edges:'bottom'});
   const settings=nodes.get('root').toolbar.primaryAction;assert.equal(settings.props.systemImage,'ellipsis.circle');assert.ok(!views[0].evaluations.some(js=>js.includes('__exchangeOpenSettings')));settings.props.action();await tick();assert.equal(views[0].evaluations.at(-1),'window.__exchangeOpenSettings()');
   const state={config:Core.normalizeConfig(null),settings:Core.normalizeSettings(null),snapshot:null,expr:'2+',edited:true};
   await tick();views[0].handler({id:11,action:'navigate',value:{page:'detail',state}});await tick();assert.equal(views.length,2);assert.equal(nodes.get('root').toolbar,undefined);assert.equal(nodes.get('page1').toolbar,undefined);assert.equal(nodes.get('page1').ignoresSafeArea,undefined);
   views[1].handler({id:12,action:'navigate',value:{page:'selector',state:{...state,selection:{kind:'quote',back:'detail'}}}});await tick();assert.equal(views.length,3);assert.equal(nodes.get('page2').toolbar,undefined);
   const detail=[...nodes].find(([id])=>id==='page1')[1];detail.navigationDestination.onChanged(true);await tick();assert.equal(views[2].disposed,false);
   detail.navigationDestination.onChanged(false);await tick();assert.equal(views[2].disposed,true);assert.match(views[1].evaluations.at(-1),/__exchangeResume/);
   nodes.get('root').navigationDestination.onChanged(false);await tick();assert.equal(views[1].disposed,true);assert.match(views[0].evaluations.at(-1),/2\+/);assert.equal(nodes.get('root').toolbar.cancellationAction.props.systemImage,'xmark');
   views[0].handler({id:13,action:'navigate',value:{page:'menu',state}});await tick();assert.equal(views.length,4);assert.equal(nodes.get('page3').navigationTitle,'换算设置');assert.equal(nodes.get('root').toolbar,undefined);assert.equal(nodes.get('page3').toolbar.topBarLeading.props.systemImage,'chevron.left');
   assert.equal(nodes.get('root').navigationDestination.isPresented,false);assert.equal(contexts.length,2);assert.equal(views[0].disposed,false);
   nodes.get('root').navigationDestination.onChanged(false);await tick();assert.equal(views[3].disposed,false);
   views[3].handler({id:14,action:'navigate',value:{page:'choices',state:{...state,choiceField:'source'}}});await tick();assert.equal(views.length,5);assert.equal(nodes.get('page3').navigationDestination.isPresented,true);assert.equal(nodes.get('page4').toolbar,undefined);assert.equal(contexts.length,2);
   views[4].handler({id:16,action:'saveSettings',value:{...Core.normalizeSettings(null),source:'er',defaultAmount:1000}});await tick();
   nodes.get('page3').navigationDestination.onChanged(false);await tick();assert.equal(views[4].disposed,true);
   nodes.get('page3').toolbar.topBarLeading.props.action();await tick();assert.equal(contexts.length,1);assert.equal(views[3].disposed,true);assert.equal(views[0].disposed,false);assert.match(views[0].evaluations.at(-1),/__exchangeResume/);assert.ok(!calls.includes('exit'));assert.equal(nodes.get('root').toolbar.cancellationAction.props.systemImage,'xmark');finishSettings();await tick();assert.match(views[0].evaluations.at(-1),/"source":"er"/);assert.match(views[0].evaluations.at(-1),/"needsRefresh":true/);assert.match(views[0].evaluations.at(-1),/"defaultAmount":1000/);dismiss();
  }
  if(mode==='success'){await tick();const v=views[0];v.handler({id:1,action:'config'});await tick();v.handler({id:2,action:'latest',value:'ecb'});await tick();dismiss();}
  return pending;
 }}};
 if(mode==='missing')delete host.WebView;
 const svc={saveSettings:value=>new Promise(r=>finishSettings=()=>r(value)),readConfig:()=>Core.normalizeConfig(null),latest:()=>new Promise(r=>finishLatest=r)};
 loadTS('index.tsx',{'./service':svc,'./navigation':{NavigationSession},scripting:host},{React,
  WebViewController:function(){calls.push('create');const index=views.length;const v={
   handler:null,evaluations:[],disposed:false,
   addScriptMessageHandler:async(name,f)=>{calls.push('bridge');v.handler=f;if(index===0&&mode==='bridge')throw new Error('消息桥异常');if(index===0&&mode==='timeout')await new Promise(()=>{});},
   loadHTML:async html=>{v.html=html;calls.push('load');assert.match(html,/汇率/);assert.doesNotMatch(html,/\/\* (样式|业务|界面)入口 \*\//);return !(index===0&&mode==='load');},
   present:async options=>{calls.push('fallback-present');assert.equal(options.fullscreen,true);if(mode==='fallback-fail')throw new Error('兼容展示失败');},
   evaluateJavaScript:async js=>{assert.equal(v.disposed,false);v.evaluations.push(js);},
   dispose:()=>{assert.equal(v.disposed,false);v.disposed=true;calls.push('dispose');}
  };if(mode==='create'&&index===0&&calls.filter(c=>c==='create').length===1)throw new Error('控制器异常');views.push(v);return v;},
  FileManager:{readAsString:async f=>{calls.push('read');if(mode==='files')throw new Error('找不到本地文件');return readFileSync(f,'utf8');}},
  Dialog:{alert:async o=>{dialogs.push(o);calls.push('dialog');}},console:{...console,error:s=>errors.push(s)},queueMicrotask,
  setTimeout:(f,ms)=>setTimeout(f,ms===30000?70:ms),clearTimeout
 });
 await done;if(finishLatest){finishLatest({value:{}});await tick();}
 return {calls,dialogs,errors,views};
}
test('原生壳先展示再安装桥/load，关闭释放一次，迟到网络回复不再访问控制器',async()=>{const r=await runEntry();assert.ok(r.calls.indexOf('native-present')<r.calls.indexOf('load'));assert.equal(r.dialogs.length,0);assert.equal(r.views[0].evaluations.length,1);assert.match(r.views[0].evaluations[0],/__exchangeReply\(\{"id":1,"ok":true/);assert.equal(r.calls.filter(c=>c==='dispose').length,1);assert.equal(r.calls.at(-1),'exit');});
for(const [mode,reason] of [['create','控制器异常'],['bridge','消息桥异常'],['load','页面加载失败'],['present','原生展示异常'],['timeout','等待超过30秒'],['appear-timeout','onAppear等待超过30秒'],['missing','缺少 WebView'],['late-fail','无效页面'],['menu-present','设置展示异常']])test('原生失败有明确诊断并退回旧WebView '+mode,async()=>{const r=await runEntry(mode);assert.equal(r.dialogs[0].title,'原生导航失败');assert.ok(r.dialogs[0].message.includes(reason));assert.ok(r.calls.includes('fallback-present'));assert.ok(r.calls.indexOf('dialog')<r.calls.indexOf('fallback-present'));assert.equal(r.calls.at(-1),'exit');assert.ok(r.views.every(v=>v.disposed));});
test('缺少本地文件明确错误，不试图展示残缺回退页面',async()=>{const r=await runEntry('files');assert.equal(r.dialogs[0].title,'汇率启动失败');assert.match(r.dialogs[0].message,/读取本地文件/);assert.ok(!r.calls.includes('native-present'));assert.ok(!r.calls.includes('fallback-present'));});

test('真实TSX设置独立fullScreen上下呈现/返回只关设置，内部push/pop、迟到保存同步主页；详情选择仍用destination',async()=>{const r=await runEntry('native-navigate');assert.equal(r.dialogs.length,0);assert.equal(r.views.length,5);assert.ok(r.views.every(v=>v.disposed));});

test('失败回退带回最近表达式和编辑态，不重置为默认金额',async()=>{const r=await runEntry('late-fail');assert.match(r.views.at(-1).html,/"native":false/);assert.match(r.views.at(-1).html,/"expr":"2\+","edited":true/);});

test('根页X调用整窗dismiss后释放controller并退出；子页无X且返回根页恢复X',async()=>{const r=await runEntry('root-close');assert.equal(r.calls.filter(c=>c==='dismiss').length,1);assert.equal(r.calls.filter(c=>c==='dispose').length,1);assert.ok(r.calls.indexOf('dismiss')<r.calls.indexOf('dispose'));assert.equal(r.calls.at(-1),'exit');assert.equal(r.dialogs.length,0);});
