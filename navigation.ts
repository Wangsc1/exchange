// 原生栈会话。平台适配在 index.tsx；测试只模拟这些适配，不伪造宿主类型。
export const PAGES=['home','detail','selector','menu','choices','decimalSettings','decimalChoices']
export type PageRecord={id:string;page:string;closed:boolean;controller:unknown;syncedVersion:number}
export type SessionIO={create:(id:string,page:string,state:unknown)=>unknown;dispose:(controller:unknown)=>void;sync:(controller:unknown,state:unknown)=>Promise<unknown>;setPath:(ids:string[])=>void;request:(action:string,value:unknown)=>Promise<unknown>}
export class NavigationSession {
 readonly pages=new Map<string,PageRecord>();state:any=null;path:string[]=[];private sequence=0;private version=0;private writes:Record<string,number>={};closed=false
 constructor(private io:SessionIO,initialState:unknown=null){this.state=initialState;this.create('root','home')}
 private create(id:string,page:string){const record:PageRecord={id,page,closed:false,controller:null,syncedVersion:this.version};this.pages.set(id,record);record.controller=this.io.create(id,page,this.state);return record}
 get activeId(){return this.path[this.path.length-1]||'root'}
 isActive(id:string){return !this.closed&&id===this.activeId&&!this.pages.get(id)?.closed}
 // Observable.path 由系统手势更新时也走同一清理路径，不能在 onDisappear 上销毁被覆盖的父页面。
 reconcile(ids:string[]){if(this.closed)return;const keep=new Set(['root',...ids]);for(const [id,p] of this.pages){if(!keep.has(id)){p.closed=true;this.io.dispose(p.controller);this.pages.delete(id)}}this.path=[...ids];this.appear(this.activeId)}
 async handle(id:string,action:string,value:any):Promise<unknown>{
  if(!this.isActive(id))throw new Error('页面已关闭或不是当前页面')
  if(action==='state'){this.state=value;this.version++;const p=this.pages.get(id);if(p)p.syncedVersion=this.version;return true}
  if(action==='navigate'){
   if(!value||!PAGES.includes(value.page))throw new Error('未知页面')
   this.state=value.state;this.version++;
   if(value.back){if(!this.path.length)throw new Error('已经是首页');const next=this.path.slice(0,-1);this.io.setPath(next);this.reconcile(next)}
   else {const nextId='page.'+(++this.sequence);this.create(nextId,value.page);const next=[...this.path,nextId];this.path=next;this.io.setPath(next)}
   return true
  }
  if(action==='save'||action==='saveSettings'){
   const ticket=(this.writes[action]||0)+1;this.writes[action]=ticket;
   const saved=await this.io.request(action,value);
   // 已受理的保存仍应跨系统pop保留；后受理写入优先，退出后不再触碰页面。
   if(!this.closed&&this.writes[action]===ticket&&this.state){
    if(action==='save')this.state={...this.state,config:saved};
    else {const sourceChanged=this.state.settings?.source!==(saved as any).source;this.state={...this.state,settings:saved,...(sourceChanged?{snapshot:null,fetchedAt:null,needsRefresh:true}:{})}}
    this.version++;const p=this.pages.get(id);if(this.isActive(id)&&p)p.syncedVersion=this.version;else this.appear(this.activeId)
   }
   return saved
  }
  return this.io.request(action,value)
 }
 appear(id:string){if(this.isActive(id)){const p=this.pages.get(id);if(p&&p.syncedVersion!==this.version){p.syncedVersion=this.version;this.io.sync(p.controller,this.state).catch(()=>undefined)}}}
 dispose(){if(this.closed)return;this.closed=true;for(const p of this.pages.values()){p.closed=true;this.io.dispose(p.controller)}this.pages.clear()}
}
