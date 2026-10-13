import { Script, Navigation, NavigationStack, NavigationDestination, WebView, VStack, Observable } from 'scripting'
import * as Service from './service'
import { NavigationSession } from './navigation'

async function run(){
 const directory=Script.directory
 const [template,style,core,ui]=await Promise.all(['web/index.html','web/style.css','web/core.js','web/ui.js'].map(file=>FileManager.readAsString(directory+'/'+file)))
 const safe=(s:string)=>s.replace(/<\/script/gi,'<\\/script')
 const encode=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')
 const path=new Observable<string[]>([])
 const readiness=new Map<WebViewController,Promise<void>>()
 const alive=new Set<WebViewController>()
 let session:NavigationSession
 const request=async(action:string,value:unknown):Promise<unknown>=>{
  switch(action){
   case 'config':return Service.readConfig()
   case 'save':return Service.saveConfig(value)
   case 'settings':return Service.readSettings()
   case 'saveSettings':return Service.saveSettings(value)
   case 'latest':return Service.latest(value as string | undefined)
   case 'history':return Service.history(value as Parameters<typeof Service.history>[0])
   case 'intraday':return Service.intraday(value as Parameters<typeof Service.intraday>[0])
   default:throw new Error('不支持的操作')
  }
 }
 session=new NavigationSession({
  create:(id,page,state)=>{
   const controller=new WebViewController();alive.add(controller)
   const ready=(async()=>{
    await controller.addScriptMessageHandler('exchange',(message:{id:number;action:string;value?:unknown})=>{
     session.handle(id,message.action,message.value).then(value=>({ok:true,value}),e=>({ok:false,error:e instanceof Error?e.message:'未知错误'})).then(result=>{
      // 已弹出/退出的控制器不能再收到异步回调；非活跃页面也不能覆盖会话。
      if(alive.has(controller)&&session.isActive(id))return controller.evaluateJavaScript(`window.__exchangeReply(${encode({id:message.id,...result})})`).catch(()=>undefined)
     })
     return true
    })
    if(!alive.has(controller))return
    const boot=`window.__exchangeBoot=${encode({page,state})};`
    const html=template.replace('/* 样式入口 */',()=>style).replace('/* 业务入口 */',()=>safe(core)).replace('/* 界面入口 */',()=>safe(boot+ui))
    if(!await controller.loadHTML(html))throw new Error('本地页面加载失败')
   })()
   readiness.set(controller,ready);ready.catch(e=>{
    if(id!=='root'&&session.isActive(id)){
     const state={...session.state,warning:e instanceof Error?e.message:'页面加载失败'};
     session.handle(id,'navigate',{page:'home',back:true,state}).catch(()=>undefined);
    }
   });return controller
  },
  dispose:c=>{const controller=c as WebViewController;if(alive.delete(controller)){controller.dispose();readiness.delete(controller)}},
  sync:async(c,state)=>{const controller=c as WebViewController;await readiness.get(controller);if(alive.has(controller)&&session.pages.get(session.activeId)?.controller===controller&&state!==null)return controller.evaluateJavaScript(`window.__exchangeResume(${encode(state)})`)},
  setPath:ids=>path.setValue(ids),request
 },{config:Service.readConfig(),settings:Service.readSettings(),snapshot:null,needsRefresh:true})
 const changed=(ids:string[])=>session.reconcile(ids)
 path.subscribe(changed)
 function Screen({id}:{id:string}){
  const record=session.pages.get(id)
  if(!record)return <VStack/>
  return <WebView controller={record.controller as WebViewController}
   navigationBarBackButtonHidden={true}
   frame={{maxWidth:'infinity',maxHeight:'infinity'}}
   onAppear={()=>session.appear(id)} />
 }
 function App(){
  return <NavigationStack path={path}>
   <VStack frame={{maxWidth:'infinity',maxHeight:'infinity'}} navigationBarBackButtonHidden={true}
    navigationDestination={<NavigationDestination>{(id)=><Screen id={id}/>}</NavigationDestination>}>
    <Screen id="root"/>
   </VStack>
  </NavigationStack>
 }
 try {
  await readiness.get(session.pages.get('root')!.controller as WebViewController)
  await Navigation.present({element:<App/>})
 }finally{path.unsubscribe(changed);session.dispose();path.dispose()}
}
run().finally(()=>Script.exit())
