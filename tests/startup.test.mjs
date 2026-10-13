// 运行真实入口源码，宿主为受控模拟。通过不代表iPhone可打开。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {root,loadTS,Core} from './helpers.mjs';
const tick=()=>new Promise(r=>setTimeout(r,10));
async function runEntry(mode='success'){
 const calls=[],dialogs=[],errors=[],evaluations=[];let exit,handler,finishLatest;
 const done=new Promise(r=>exit=r);
 const ctrl={
  addScriptMessageHandler:async(name,f)=>{calls.push('bridge');assert.equal(name,'exchange');handler=f;if(mode==='bridge')throw new Error('消息桥异常');if(mode==='timeout')await new Promise(()=>{});},
  loadHTML:async html=>{calls.push('load');assert.match(html,/汇率/);assert.doesNotMatch(html,/\/\* (样式|业务|界面)入口 \*\//);return mode!=='load';},
  present:async options=>{calls.push('present');assert.equal(options.fullscreen,true);if(mode==='present')throw new Error('展示异常');assert.equal(handler({id:1,action:'config'}),true);await tick();handler({id:2,action:'latest',value:'ecb'});await tick();},
  evaluateJavaScript:async js=>{assert.ok(!calls.includes('dispose'));evaluations.push(js);},
  dispose:()=>{assert.ok(!calls.includes('dispose'));calls.push('dispose');}
 };
 const service={readConfig:()=>Core.normalizeConfig(null),latest:()=>new Promise(r=>finishLatest=r)};
 loadTS('index.tsx',{'./service':service,scripting:{Script:{directory:root,exit:()=>{calls.push('exit');exit();}}}},{
  WebViewController:function(){calls.push('create');if(mode==='create')throw new Error('控制器异常');return ctrl;},
  FileManager:{readAsString:async f=>{calls.push('read');if(mode==='files')throw new Error('找不到本地文件');return readFileSync(f,'utf8');}},
  Dialog:{alert:async options=>{dialogs.push(options);calls.push('dialog');assert.ok(!calls.includes('exit'));}},
  console:{...console,error:s=>errors.push(s)},
  setTimeout:(f,ms)=>setTimeout(f,ms===30000?5:ms),clearTimeout
 });
 await done;
 if(finishLatest){finishLatest({value:{}});await tick();}
 return {calls,dialogs,errors,evaluations};
}
test('恢复入口仅需Script导出，按消息桥/读取/loadHTML/present/dispose/exit顺序，关闭后无延迟回复',async()=>{const r=await runEntry();assert.deepEqual(r.calls,['create','bridge','read','read','read','read','load','present','dispose','exit']);assert.equal(r.dialogs.length,0);assert.equal(r.evaluations.length,1);assert.match(r.evaluations[0],/__exchangeReply\(\{"id":1,"ok":true/);});
for(const [mode,stage] of [['create','创建 WebView'],['bridge','安装消息桥'],['files','读取本地文件'],['load','加载本地页面'],['present','展示 WebView'],['timeout','安装消息桥']])test('启动失败明确展示阶段 '+stage+' ('+mode+')',async()=>{const r=await runEntry(mode);assert.equal(r.dialogs.length,1);assert.equal(r.dialogs[0].title,'汇率启动失败');assert.ok(r.dialogs[0].message.includes(stage));assert.equal(r.errors.length,1);assert.equal(r.calls.at(-1),'exit');assert.equal(r.calls.filter(c=>c==='dispose').length,mode==='create'?0:1);if(mode==='timeout')assert.match(r.dialogs[0].message,/超过30秒/);});
