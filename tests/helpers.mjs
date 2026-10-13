// 测试专用：将真正的 TS 源码载入 Node，不建立虚假的 iOS API 类型声明。
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
export const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(import.meta.url);
export const ts=require(process.env.TYPESCRIPT_PATH||'typescript');
export function loadTS(file,imports={},globals={}) {
  const output=ts.transpileModule(readFileSync(root+file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
  if(output.diagnostics?.length)throw new Error('TS语法诊断：'+JSON.stringify(output.diagnostics));
  const exports={},context={exports,require:name=>{if(!(name in imports))throw new Error('未模拟的模块 '+name);return imports[name];},console,Date,Error,Promise,...globals};
  vm.runInNewContext(output.outputText,context,{filename:file});return {exports,context};
}
export const Core=loadTS('core.ts').exports;
// 以下是明确的测试夹具，绝不被生产程序引入或用于离线兜底。
export const fixture={date:'2026-01-02',rates:{USD:1.2,CNY:8.4,CAD:1.6,EUR:1,GBP:.8,AUD:1.8,JPY:160,CHF:.95}};
export const plain=value=>JSON.parse(JSON.stringify(value));
export function fakeStorage(initial={}) {const data=new Map(Object.entries(initial));return {get:k=>data.has(k)?data.get(k):null,set:(k,v)=>{data.set(k,v);return true;},remove:k=>data.delete(k),data};}
export function service(storage,request){return loadTS('service.ts',{'./core':Core,scripting:{fetch:request,Script:{directory:'/手机脚本'}}},{Storage:storage,FileManager:{}}).exports;}
