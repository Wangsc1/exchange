import { Script } from 'scripting'
import * as Service from './service'
// 使用官方 Promise 消息桥；页面关闭之后销毁控制器并结束脚本。
async function run(){
  const controller=new WebViewController()
  let closed=false
  try {
    const reply=(payload:unknown)=>controller.evaluateJavaScript(`window.__exchangeReply(${JSON.stringify(payload).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')})`).catch(()=>undefined)
    const handle=async(message:{id:number;action:string;value?:unknown})=>{
      if(closed)return {ok:false,error:'页面已关闭'}
      try {
        let value:unknown
        switch(message?.action){
          case 'config':value=Service.readConfig();break
          case 'save':value=Service.saveConfig(message.value);break
          case 'latest':value=await Service.latest();break
          case 'history':value=await Service.history(message.value as Parameters<typeof Service.history>[0]);break
          case 'intraday':value=await Service.intraday(message.value as Parameters<typeof Service.intraday>[0]);break
          case 'checkUpdate':value=await Service.checkUpdate();break
          case 'update':value=await Service.update();break
          case 'close':setTimeout(()=>controller.dismiss(),0);value=true;break
          default:throw new Error('不支持的操作')
        }
        return {ok:true,value}
      }catch(e){return {ok:false,error:e instanceof Error?e.message:'未知错误'}}
    }
    controller.addScriptMessageHandler('exchange',(message:{id:number;action:string;value?:unknown})=>{
      handle(message).then(result=>reply({id:message?.id,...result}))
      return true
    })
    const directory=Script.directory
    const [template,style,core,ui]=await Promise.all(['web/index.html','web/style.css','web/core.js','web/ui.js'].map(file=>FileManager.readAsString(directory+'/'+file)))
    const safe=(s:string)=>s.replace(/<\/script/gi,'<\\/script')
    const html=template.replace('/* 样式入口 */',()=>style).replace('/* 业务入口 */',()=>safe(core)).replace('/* 界面入口 */',()=>safe(ui))
    if(!await controller.loadHTML(html))throw new Error('本地页面加载失败')
    await controller.present({fullscreen:true})
  }finally{closed=true;controller.dispose();Script.exit()}
}
run()
