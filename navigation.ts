// 只管理页面所有权/共享状态，不依赖宿主或DOM；原生组件由index.tsx适配。
export type PageState=Record<string,any>
export type PageRecord={id:string;page:string;title:string;parent:string|null;controller:unknown;child:string|null;present:(value:boolean)=>void;disposed:boolean}
export type NavigationAdapter={
 create:(id:string,page:string,state:PageState|null)=>unknown
 dispose:(controller:unknown)=>void
 sync:(controller:unknown,state:PageState)=>Promise<unknown>
 pause:(controller:unknown)=>Promise<unknown>
 request:(action:string,value:unknown)=>Promise<unknown>
}
const PAGES=['home','detail','selector','menu','choices','decimalSettings','decimalChoices']
export class NavigationSession {
 readonly pages=new Map<string,PageRecord>()
 activeId='root';state:PageState|null=null;private sequence=0;private closed=false
 constructor(private adapter:NavigationAdapter){this.add('root','home',null,null)}
 private add(id:string,page:string,parent:string|null,state:PageState|null){
  const title=page==='selector'?(state?.selection?.kind==='base'?'选择基准币种':state?.selection?.kind==='quote'?'选择目标币种':'切换货币'):page==='choices'?(state?.choiceTitle||'选项'):({home:'汇率',detail:'汇率详情',menu:'换算设置',decimalSettings:'小数点设置',decimalChoices:'法定货币'} as Record<string,string>)[page]
  const record:PageRecord={id,page,title,parent,controller:null,child:null,present:()=>{},disposed:false}
  this.pages.set(id,record)
  try{record.controller=this.adapter.create(id,page,state)}catch(e){this.pages.delete(id);throw e}
  return record
 }
 bind(id:string,present:(value:boolean)=>void){const r=this.pages.get(id);if(r)r.present=present}
 isActive(id:string){return !this.closed&&id===this.activeId&&this.pages.has(id)}
 private accept(id:string,state:PageState){if(this.isActive(id))this.state={...state}}
 async handle(id:string,action:string,value:any):Promise<unknown>{
  if(this.closed||!this.pages.has(id))throw new Error('页面已关闭')
  if(action==='state'){this.accept(id,value);return true}
  if(action==='navigate'){
   if(!this.isActive(id))throw new Error('页面不再活跃')
   this.accept(id,value.state)
   if(value.back){await this.pop(id);return true}
   if(!PAGES.includes(value.page)||value.page==='home')throw new Error('无效页面')
   const parent=this.pages.get(id)!;if(parent.child)throw new Error('页面正在切换')
   await this.adapter.pause(parent.controller)
   const child=this.add('page'+(++this.sequence),value.page,id,this.state)
   parent.child=child.id;this.activeId=child.id;parent.present(true)
   return true
  }
  const result=await this.adapter.request(action,value)
  // 保存完成时，即使发起页刚被系统pop，也要把真实成功值带回当前页。
  if(action==='save'||action==='saveSettings'){
   if(this.state){
    if(action==='save')this.state.config=result
    else {const old=this.state.settings?.source;this.state.settings=result;if(old!==(result as any)?.source){this.state.snapshot=null;this.state.needsRefresh=true;this.state.fetchedAt=null}}
   }
   if(!this.isActive(id)&&this.state&&!this.closed){const current=this.pages.get(this.activeId);if(current)await this.adapter.sync(current.controller,this.state)}
  }
  return result
 }
 async pop(id:string){
  if(!this.isActive(id))return
  const child=this.pages.get(id);if(!child?.parent)return
  const parent=this.pages.get(child.parent);if(!parent)return
  this.activeId=parent.id;parent.child=null;parent.present(false)
  // 先失效所有权再释放；迟到网络/网页回调不得覆盖父页。
  child.disposed=true;this.pages.delete(id);this.adapter.dispose(child.controller)
  if(this.state)await this.adapter.sync(parent.controller,this.state)
 }
 dispose(){if(this.closed)return;this.closed=true;for(const r of this.pages.values()){r.disposed=true;this.adapter.dispose(r.controller)}this.pages.clear()}
}
