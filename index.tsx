import { Script } from 'scripting'
import * as Service from './service'
// 使用官方 Promise 消息桥；页面关闭之后销毁控制器并结束脚本。
async function run(){
  const controller=new WebViewController()
  let closed=false
  try {
    await controller.addScriptMessageHandler('exchange',async (message:{action:string;value?:unknown}={action:''})=>{
      if(closed)return {ok:false,error:'页面已关闭'}
      try {
        let value:unknown
        switch(message?.action){
          case 'config':value=Service.readConfig();break
          case 'save':value=Service.saveConfig(message.value);break
          case 'latest':value=await Service.latest();break
          case 'history':value=await Service.history(message.value as Parameters<typeof Service.history>[0]);break
          case 'checkUpdate':value=await Service.checkUpdate();break
          case 'update':value=await Service.update();break
          case 'close':controller.dismiss();value=true;break
          default:throw new Error('不支持的操作')
        }
        return {ok:true,value}
      }catch(e){return {ok:false,error:e instanceof Error?e.message:'未知错误'}}
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
