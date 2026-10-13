import { Script } from 'scripting'
import * as Service from './service'
// 1.2.1 恢复此前可打开的单 WebView 入口，不依赖原生导航的新增导出。
async function run(){
 let controller:WebViewController|undefined
 let closed=false,stage='创建 WebView'
 async function startup<T>(operation:Promise<T>):Promise<T>{
  let timer:ReturnType<typeof setTimeout>|undefined
  try{return await Promise.race([operation,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('启动步骤等待超过30秒')),30000)})])}
  finally{if(timer)clearTimeout(timer)}
 }
 try {
  controller=new WebViewController()
  const view=controller
  const reply=(payload:unknown)=>{
   if(closed)return Promise.resolve()
   return view.evaluateJavaScript(`window.__exchangeReply(${JSON.stringify(payload).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')})`).catch(()=>undefined)
  }
  const handle=async(message:{id:number;action:string;value?:unknown})=>{
   if(closed)return {ok:false,error:'页面已关闭'}
   try {
    let value:unknown
    switch(message?.action){
     case 'config':value=Service.readConfig();break
     case 'save':value=Service.saveConfig(message.value);break
     case 'settings':value=Service.readSettings();break
     case 'saveSettings':value=Service.saveSettings(message.value);break
     case 'latest':value=await Service.latest(message.value as string | undefined);break
     case 'history':value=await Service.history(message.value as Parameters<typeof Service.history>[0]);break
     case 'intraday':value=await Service.intraday(message.value as Parameters<typeof Service.intraday>[0]);break
     default:throw new Error('不支持的操作')
    }
    return {ok:true,value}
   }catch(e){return {ok:false,error:e instanceof Error?e.message:'未知错误'}}
  }
  stage='安装消息桥'
  await startup(view.addScriptMessageHandler('exchange',(message:{id:number;action:string;value?:unknown})=>{
   handle(message).then(result=>reply({id:message?.id,...result}))
   return true
  }))
  stage='读取本地文件'
  const directory=Script.directory
  const [template,style,core,ui]=await startup(Promise.all(['web/index.html','web/style.css','web/core.js','web/ui.js'].map(file=>FileManager.readAsString(directory+'/'+file))))
  const safe=(s:string)=>s.replace(/<\/script/gi,'<\\/script')
  const html=template.replace('/* 样式入口 */',()=>style).replace('/* 业务入口 */',()=>safe(core)).replace('/* 界面入口 */',()=>safe(ui))
  stage='加载本地页面'
  if(!await startup(view.loadHTML(html)))throw new Error('本地页面加载失败')
  stage='展示 WebView'
  await view.present({fullscreen:true})
 }catch(e){
  closed=true
  const reason=e instanceof Error?e.message:String(e)
  console.error(`汇率启动失败（${stage}）：${e instanceof Error?e.stack||e.message:reason}`)
  // Dialog 为官方示例中的全局 API；错误展示失败仍保留控制台信息，不再次吞掉原因。
  try{await Dialog.alert({title:'汇率启动失败',message:`步骤：${stage}\n${reason}\n请截图此信息反馈，并检查脚本文件是否完整。`,buttonLabel:'知道了'})}catch{console.error('启动错误弹窗展示失败，请查看上一条错误日志')}
 }finally{closed=true;controller?.dispose();Script.exit()}
}
run()
