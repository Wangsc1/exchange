// 更新只接触固定程序文件；绝不下载或写入 script.json，也不清除私有 Storage。
import { newer } from './core'
export const UPDATE_FILES = ['index.tsx','core.ts','service.ts','update.ts','web/index.html','web/style.css','web/ui.js','web/core.js']
export type Manifest = { version:string; notes:string; files:string[] }
export function validateManifest(value:unknown):Manifest {
  const m=value as Manifest
  if(!m||!/^\d+\.\d+\.\d+$/.test(m.version)||typeof m.notes!=='string'||!Array.isArray(m.files)||m.files.length!==UPDATE_FILES.length||new Set(m.files).size!==m.files.length||m.files.some(f=>!UPDATE_FILES.includes(f)))throw new Error('更新清单无效，已拒绝安装')
  return {version:m.version,notes:m.notes,files:[...UPDATE_FILES]}
}
export type UpdateIO = { download:(file:string)=>Promise<string>; read:(file:string)=>Promise<string>; write:(file:string,text:string)=>Promise<void>; saveVersion:(version:string)=>boolean }
export async function installUpdate(manifest:Manifest,current:string,io:UpdateIO):Promise<void> {
  const m=validateManifest(manifest)
  if(!newer(m.version,current))throw new Error('当前已是最新版')
  const incoming:Record<string,string>={},backup:Record<string,string>={}
  // 全部下载及备份完成后才写文件，避免网络失败留下半套程序。
  for(const f of m.files){incoming[f]=await io.download(f);if(!incoming[f].trim()||incoming[f].length>500000)throw new Error('更新文件大小异常');backup[f]=await io.read(f)}
  const written:string[]=[]
  try {
    for(const f of m.files){written.push(f);await io.write(f,incoming[f])}
    if(!io.saveVersion(m.version))throw new Error('无法保存安装版本')
  } catch(e) {
    let failed=false
    for(const f of written.reverse()){try{await io.write(f,backup[f])}catch{failed=true}}
    if(failed)throw new Error('更新失败且回滚未完成，请从原始文件恢复程序；本地配置未清除')
    throw new Error(`更新失败，已恢复程序：${e instanceof Error?e.message:'未知错误'}`)
  }
}
