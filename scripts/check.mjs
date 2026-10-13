// 严格检查纯业务模块；宿主完整类型只使用 App 同步的官方声明，绝不伪造。
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),ts=require(process.env.TYPESCRIPT_PATH||'typescript');
const root=fileURLToPath(new URL('../',import.meta.url));
const options={noEmit:true,strict:true,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.Preserve,skipLibCheck:true};
const official=process.argv[2];
function declarations(path){if(statSync(path).isFile())return path.endsWith('.d.ts')?[path]:[];return readdirSync(path).flatMap(f=>declarations(path+'/'+f));}
const files=['core.ts'];
if(official)files.push('index.tsx','service.ts');
const names=files.map(f=>root+f).concat(official?declarations(official):[]);
if(official&&!names.some(f=>f.endsWith('.d.ts')))throw new Error('指定目录没有官方 .d.ts 文件');
const program=ts.createProgram(names,options),diagnostics=ts.getPreEmitDiagnostics(program);
if(diagnostics.length){console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:f=>f,getCurrentDirectory:()=>root,getNewLine:()=> '\n'}));process.exit(1);}
for(const f of ['index.tsx','service.ts']){
 const r=ts.transpileModule(readFileSync(root+f,'utf8'),{compilerOptions:options,reportDiagnostics:true});
 if(r.diagnostics?.length)throw new Error('宿主源码语法错误：'+f);
}
for(const f of ['web/ui.js','web/core.js'])new vm.Script(readFileSync(root+f,'utf8'),{filename:f});
const source=readFileSync(root+'core.ts','utf8'),generated=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,removeComments:false}}).outputText;
assert.equal(readFileSync(root+'web/core.js','utf8'),'// 此文件由 scripts/build.mjs 自动生成，请修改 core.ts 后重新构建。\nconst Core = (() => { const exports = {};\n'+generated+'\nreturn exports; })();\n','浏览器业务脚本与源码不一致，请重新构建');
const metadata=JSON.parse(readFileSync(root+'script.json','utf8')),manifest=JSON.parse(readFileSync(root+'version.json','utf8'));
assert.match(source,new RegExp("VERSION='"+metadata.version+"'"));assert.equal(metadata.name,'汇率');assert.equal(metadata.localizedNames.zh,'汇率');assert.equal(metadata.version,manifest.version);assert.equal(metadata.remoteResource.url,'https://github.com/Wangsc1/exchange');assert.ok(!('autoUpdateInterval' in metadata.remoteResource));
console.log('纯业务严格类型、全部源码语法、共享构建一致性及元数据检查通过。');
console.log(official?'宿主源码已使用提供的官方 .d.ts 完成完整类型检查。':'未提供 App 同步的官方 .d.ts：宿主源码只完成语法检查，不能称为官方完整类型检查。');
