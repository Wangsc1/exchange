// 将唯一业务源 core.ts 编译为本地 WebView 可加载的脚本，不依赖线上 CDN。
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(import.meta.url);
const compiler=process.env.TYPESCRIPT_PATH||'typescript';
const ts=require(compiler);
const source=await readFile(root+'core.ts','utf8');
const result=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,removeComments:false},reportDiagnostics:true});
if(result.diagnostics?.length)throw new Error(ts.formatDiagnosticsWithColorAndContext(result.diagnostics,{getCanonicalFileName:f=>f,getCurrentDirectory:()=>root,getNewLine:()=> '\n'}));
await writeFile(root+'web/core.js','// 此文件由 scripts/build.mjs 自动生成，请修改 core.ts 后重新构建。\nconst Core = (() => { const exports = {};\n'+result.outputText+'\nreturn exports; })();\n');
console.log('业务浏览器脚本已生成');
