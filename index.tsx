import * as Host from 'scripting'
import * as Service from './service'
import { NavigationSession, PageState } from './navigation'
const encode=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')
async function startup<T>(stage:string,operation:Promise<T>):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined
 try{return await Promise.race([operation,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error(stage+'等待超过30秒')),30000)})])}
 finally{if(timer)clearTimeout(timer)}
}
async function diagnostic(title:string,stage:string,error:unknown){
 const reason=error instanceof Error?error.message:String(error)
 console.error(`汇率：${title}（${stage}）：${error instanceof Error?error.stack||reason:reason}`)
 try{await Dialog.alert({title,message:`步骤：${stage}\n${reason}\n${title==='原生导航失败'?'将退回兼容网页窗口；子页以网页返回操作，不是原生返回。':'请截图反馈，并检查脚本文件是否完整。'}`})}catch{console.error('错误弹窗展示失败，请查看上述日志')}
}
async function request(action:string,value:unknown):Promise<unknown>{
 switch(action){
  case 'config':return Service.readConfig()
  case 'save':return Service.saveConfig(value)
  case 'settings':return Service.readSettings()
  case 'saveSettings':return Service.saveSettings(value)
  case 'latest':return Service.latest(value as string|undefined)
  case 'history':return Service.history(value as Parameters<typeof Service.history>[0])
  case 'intraday':return Service.intraday(value as Parameters<typeof Service.intraday>[0])
  default:throw new Error('不支持的操作')
 }
}
async function run(){
 let stage='读取本地文件',session:NavigationSession|undefined,closed=false
 let fallbackState:PageState|null=null,nativeRunning=true
 const alive=new Set<WebViewController>(),loading=new Map<WebViewController,Promise<void>>()
 const loaders=new Map<string,()=>Promise<void>>(),viewIds=new Map<WebViewController,string>(),appearanceTimers=new Map<WebViewController,ReturnType<typeof setTimeout>>()
 let parts:string[]=[]
 const html=(boot:unknown)=>{
  const [template,style,core,ui]=parts,safe=(s:string)=>s.replace(/<\/script/gi,'<\\/script')
  return template.replace('/* 样式入口 */',()=>style).replace('/* 业务入口 */',()=>safe(core)).replace('/* 界面入口 */',()=>safe(`window.__exchangeBoot=${encode(boot)};`+ui))
 }
 const dispose=(c:unknown)=>{const v=c as WebViewController;if(alive.delete(v)){loading.delete(v);const timer=appearanceTimers.get(v);if(timer)clearTimeout(timer);appearanceTimers.delete(v);const id=viewIds.get(v);if(id)loaders.delete(id);viewIds.delete(v);v.dispose()}}
 try{
  parts=await startup(stage,Promise.all(['web/index.html','web/style.css','web/core.js','web/ui.js'].map(f=>FileManager.readAsString(Host.Script.directory+'/'+f))))
  let nativeError:unknown=null,dismiss:(()=>void)|undefined,signalFailure:(error:unknown)=>void=()=>{}
  const failure=new Promise<never>((_,reject)=>{signalFailure=reject});failure.catch(()=>{})
  const fail=(error:unknown)=>{if(nativeError||closed||!nativeRunning)return;nativeError=error;console.error('原生页面错误：'+String(error));dismiss?.();signalFailure(error)}
  const create=(id:string,page:string,state:PageState|null)=>{
   const view=new WebViewController();alive.add(view);viewIds.set(view,id)
   appearanceTimers.set(view,setTimeout(()=>{if(alive.has(view)&&!loading.has(view))fail(new Error(page+'原生页面onAppear等待超过30秒'))},30000))
   // 只创建控制器；等原生视图onAppear后安装桥并loadHTML，不在present前等待根页面加载。
   const load=()=>{
    if(loading.has(view))return loading.get(view)!
    const timer=appearanceTimers.get(view);if(timer)clearTimeout(timer);appearanceTimers.delete(view)
    const ready=(async()=>{
     await startup(page+'安装消息桥',view.addScriptMessageHandler('exchange',(m:{id:number;action:string;value?:unknown})=>{
      session!.handle(id,m.action,m.value).then(value=>({ok:true,value}),e=>{if(m.action==='navigate')fail(e);return {ok:false,error:e instanceof Error?e.message:String(e)}}).then(result=>{
       if(alive.has(view)&&(session?.isActive(id)||m.action==='navigate'))return view.evaluateJavaScript(`window.__exchangeReply(${encode({id:m.id,...result})})`).catch(fail)
      }).catch(fail)
      return true
     }))
     if(!alive.has(view))return
     if(!await startup(page+'加载本地页面',view.loadHTML(html({native:true,page,state}))))throw new Error(page+'本地页面加载失败')
    })()
    loading.set(view,ready);ready.catch(fail);return ready
   }
   loaders.set(id,load);return view
  }
  stage='检查原生导航接口'
  for(const [key,value] of Object.entries({Navigation:Host.Navigation,NavigationStack:Host.NavigationStack,VStack:Host.VStack,WebView:Host.WebView,Text:Host.Text,Button:Host.Button,useState:Host.useState}))if(value==null)throw new Error('当前Scripting缺少 '+key)
  stage='构造原生根页'
  session=new NavigationSession({create,dispose,
   pause:async c=>{await loading.get(c as WebViewController);if(alive.has(c as WebViewController))await startup('暂停原生网页',(c as WebViewController).evaluateJavaScript('window.__exchangePause()'))},
   sync:async(c,state)=>{await loading.get(c as WebViewController);if(alive.has(c as WebViewController))await startup('同步原生网页',(c as WebViewController).evaluateJavaScript(`window.__exchangeResume(${encode(state)})`))},request})
  const {Navigation,NavigationStack,VStack,WebView,Text,Button,useState}=Host
  // 每个父页都持有固定Destination组件；isPresented只控制呈现，不替换content。
  function Destination({id}:{id:string|null}){
   return id?<Screen id={id}/>:<Text>正在准备页面…</Text>
  }
  function Screen({id}:{id:string}){
   const [presented,setPresented]=useState(false)
   session!.bind(id,setPresented)
   const record=session!.pages.get(id)
   if(!record)return <Text>页面已关闭</Text>
   const title=record.title
   return <VStack frame={{maxWidth:'infinity',maxHeight:'infinity'}} navigationTitle={title} navigationBarTitleDisplayMode="inline"
    toolbar={id==='root'&&!presented?{cancellationAction:<Button title="" systemImage="xmark" action={()=>dismiss?.()}/>} : undefined}
    onAppear={()=>{loaders.get(id)?.().catch(fail)}}
    navigationDestination={{isPresented:presented,onChanged:value=>{if(!value){setPresented(false);const child=session!.pages.get(id)?.child;if(child)session!.pop(child).catch(fail)}},content:<Destination id={record.child}/>}}>
    <WebView controller={record.controller as WebViewController} frame={{maxWidth:'infinity',maxHeight:'infinity'}}/>
   </VStack>
  }
  function App(){dismiss=Navigation.useDismiss();return <NavigationStack><Screen id="root"/></NavigationStack>}
  stage='展示原生导航'
  // 壳先展示，再在onAppear加载网页；30秒内未出现回调也有可诊断失败，不会永远无反应。
  await Promise.race([Navigation.present({element:<App/>}),failure]);if(nativeError)throw nativeError
 }catch(error){
  nativeRunning=false
  fallbackState=session?.state||null;session?.dispose();session=undefined
  for(const v of [...alive])dispose(v)
  await diagnostic(parts.length?'原生导航失败':'汇率启动失败',stage,error)
  if(parts.length){
   // 回退复用已确认的单WebView路径，不需要任何原生导航导出。保留最近共享业务状态。
   let fallback:WebViewController|undefined
   try{
    stage='创建兼容WebView';fallback=new WebViewController();alive.add(fallback);const view=fallback
    stage='兼容模式安装消息桥'
    await startup(stage,view.addScriptMessageHandler('exchange',(m:{id:number;action:string;value?:unknown})=>{
     request(m.action,m.value).then(value=>({ok:true,value}),e=>({ok:false,error:e instanceof Error?e.message:String(e)})).then(result=>{if(!closed&&alive.has(view))return view.evaluateJavaScript(`window.__exchangeReply(${encode({id:m.id,...result})})`).catch(()=>undefined)})
     return true
    }))
    stage='兼容模式加载本地页面'
    if(!await startup(stage,view.loadHTML(html({native:false,page:'home',state:fallbackState}))))throw new Error('本地页面加载失败')
    stage='展示兼容WebView';await view.present({fullscreen:true})
   }catch(e){await diagnostic('汇率启动失败',stage,e)}finally{if(fallback)dispose(fallback)}
  }
 }finally{closed=true;session?.dispose();for(const v of [...alive])dispose(v);Host.Script.exit()}
}
run()
