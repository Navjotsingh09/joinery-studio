"use client";
import {create} from "zustand";
import {persist} from "zustand/middleware";
import {Project,JoineryItem,ViewMode,ProjectSnapshot,Revision} from "@/types/model";
import {newProject} from "./defaults";
import {findFreePlacement,canPlace} from "./geometry";

type Core={projects:Project[];activeId:string;selectedId:string|null;view:ViewMode};
type State=Core&{
  past:Core[];future:Core[];clipboard:JoineryItem[];
  setView:(v:ViewMode)=>void;setActive:(id:string)=>void;select:(id:string|null)=>void;
  addProject:()=>void;duplicateProject:()=>void;deleteProject:()=>void;replaceAll:(p:Project[])=>void;
  configureActive:(patch:Partial<Project>&{items:JoineryItem[]})=>void;updateProject:(patch:Partial<Project>)=>void;
  addItem:(i:JoineryItem)=>void;updateItem:(id:string,patch:Partial<JoineryItem>)=>void;
  updateItems:(ids:string[],patch:Partial<JoineryItem>|((item:JoineryItem)=>Partial<JoineryItem>))=>void;
  moveItem:(id:string,patch:Partial<JoineryItem>)=>void;checkpoint:()=>void;
  deleteItem:(id:string)=>void;deleteItems:(ids:string[])=>void;duplicateItem:(id:string)=>void;
  copyItems:(ids:string[])=>void;pasteItems:()=>void;
  saveRevision:()=>void;restoreRevision:(id:string)=>void;undo:()=>void;redo:()=>void
};

const first=newProject("Showroom concept");
const core=(s:State):Core=>({projects:structuredClone(s.projects),activeId:s.activeId,selectedId:s.selectedId,view:s.view});
const withHistory=(s:State,patch:Partial<State>):Partial<State>=>({...patch,past:[...s.past.slice(-79),core(s)],future:[]});
const snapshot=(p:Project):ProjectSnapshot=>({
  name:p.name,customer:p.customer,reference:p.reference,status:p.status,
  roomWidth:p.roomWidth,roomHeight:p.roomHeight,roomDepth:p.roomDepth,
  rules:structuredClone(p.rules),items:structuredClone(p.items),
  address:p.address,notes:p.notes,archived:p.archived
});
const normaliseProject=(p:Project):Project=>({
  ...p,address:p.address??"",notes:p.notes??"",archived:p.archived??false,
  rules:{...p.rules,serviceClearance:p.rules?.serviceClearance??50},
  items:(p.items??[]).map(i=>({visible:true,layer:"Joinery",rotation:0,...i}))
});

const storeCreator=(set:any,get:any):State=>({
  projects:[first],activeId:first.id,selectedId:null,view:"front",past:[],future:[],clipboard:[],
  setView:view=>set({view}),
  setActive:activeId=>set({activeId,selectedId:null}),
  select:selectedId=>set({selectedId}),
  addProject:()=>set((s:State)=>{const p=newProject();return withHistory(s,{projects:[...s.projects,p],activeId:p.id,selectedId:null})}),
  duplicateProject:()=>set((s:State)=>{
    const source=s.projects.find(p=>p.id===s.activeId);if(!source)return s;
    const now=new Date().toISOString(),copy:Project=structuredClone(source);
    copy.id=crypto.randomUUID();copy.name=source.name+" copy";copy.reference="JS-"+String(Date.now()).slice(-5);
    copy.revision=1;copy.revisions=[];copy.createdAt=now;copy.updatedAt=now;
    const groups=new Map<string,string>();
    copy.items=copy.items.map(i=>{
      let groupId: string|undefined;
      if(i.groupId){if(!groups.has(i.groupId))groups.set(i.groupId,crypto.randomUUID());groupId=groups.get(i.groupId)}
      return {...i,id:crypto.randomUUID(),groupId}
    });
    return withHistory(s,{projects:[...s.projects,copy],activeId:copy.id,selectedId:null})
  }),
  deleteProject:()=>set((s:State)=>{
    if(s.projects.length===1){const p=newProject("New project");return withHistory(s,{projects:[p],activeId:p.id,selectedId:null})}
    const projects=s.projects.filter(p=>p.id!==s.activeId);
    return withHistory(s,{projects,activeId:projects[0].id,selectedId:null})
  }),
  replaceAll:projects=>set((s:State)=>{
    const ps=(projects.length?projects:[newProject("New project")]).map(normaliseProject);
    return {...s,projects:ps,activeId:ps[0].id,selectedId:null,past:[],future:[]}
  }),
  configureActive:patch=>set((s:State)=>withHistory(s,{
    projects:s.projects.map(p=>p.id===s.activeId?normaliseProject({...p,...patch,items:structuredClone(patch.items),updatedAt:new Date().toISOString()}):p),
    selectedId:null,view:"3d"
  })),
  updateProject:patch=>set((s:State)=>withHistory(s,{
    projects:s.projects.map(p=>p.id===s.activeId?normaliseProject({...p,...patch,updatedAt:new Date().toISOString()}):p)
  })),
  addItem:item=>set((s:State)=>{
    const i:JoineryItem={visible:true,layer:"Joinery",rotation:0,...item};
    return withHistory(s,{projects:s.projects.map(p=>p.id===s.activeId?{...p,items:[...p.items,i],updatedAt:new Date().toISOString()}:p),selectedId:i.id})
  }),
  updateItem:(id,patch)=>set((s:State)=>withHistory(s,{
    projects:s.projects.map(p=>p.id===s.activeId?{...p,items:p.items.map(i=>i.id===id?{...i,...patch}:i),updatedAt:new Date().toISOString()}:p)
  })),
  updateItems:(ids,patch)=>set((s:State)=>{
    const wanted=new Set(ids);
    const projects=s.projects.map(p=>{
      if(p.id!==s.activeId)return p;
      const items=p.items.map(i=>{
        if(!wanted.has(i.id))return i;
        const next=typeof patch==="function"?patch(i):patch;
        return {...i,...next}
      });
      return {...p,items,updatedAt:new Date().toISOString()}
    });
    return withHistory(s,{projects})
  }),
  moveItem:(id,patch)=>set((s:State)=>{
    const projects=s.projects.map(p=>{
      if(p.id!==s.activeId)return p;
      const source=p.items.find(i=>i.id===id);if(!source)return p;
      const dx=typeof patch.x==="number"?patch.x-source.x:0;
      const dy=typeof patch.y==="number"?patch.y-source.y:0;
      const dz=typeof patch.z==="number"?patch.z-source.z:0;
      const items=p.items.map(i=>{
        if(i.id===id)return {...i,...patch};
        if(source.groupId&&i.groupId===source.groupId&&(dx||dy||dz))return {...i,x:i.x+dx,y:i.y+dy,z:i.z+dz};
        return i
      });
      return {...p,items,updatedAt:new Date().toISOString()}
    });
    return {projects}
  }),
  checkpoint:()=>set((s:State)=>({past:[...s.past.slice(-79),core(s)],future:[]})),
  deleteItem:id=>set((s:State)=>withHistory(s,{
    projects:s.projects.map(p=>p.id===s.activeId?{...p,items:p.items.filter(i=>i.id!==id),updatedAt:new Date().toISOString()}:p),selectedId:null
  })),
  deleteItems:ids=>set((s:State)=>{
    const wanted=new Set(ids);
    return withHistory(s,{
      projects:s.projects.map(p=>p.id===s.activeId?{...p,items:p.items.filter(i=>!wanted.has(i.id)),updatedAt:new Date().toISOString()}:p),
      selectedId:s.selectedId&&wanted.has(s.selectedId)?null:s.selectedId
    })
  }),
  duplicateItem:id=>{
    const s=get() as State,p=s.projects.find(x=>x.id===s.activeId),i=p?.items.find(x=>x.id===id);if(!i||!p)return;
    const q=findFreePlacement(p,{...i,id:crypto.randomUUID(),name:i.name+" copy",x:i.x+Math.max(50,p.rules.snap),groupId:undefined});
    if(canPlace(p,q))s.addItem(q)
  },
  copyItems:ids=>set((s:State)=>({clipboard:structuredClone(s.projects.find(p=>p.id===s.activeId)?.items.filter(i=>ids.includes(i.id))??[])})),
  pasteItems:()=>set((s:State)=>{
    const p=s.projects.find(x=>x.id===s.activeId);if(!p||!s.clipboard.length)return s;
    const temp:Project={...p,items:[...p.items]},copies:JoineryItem[]=[];
    for(const original of s.clipboard){
      let candidate:JoineryItem={...structuredClone(original),id:crypto.randomUUID(),name:original.name+" copy",x:original.x+Math.max(50,p.rules.snap),z:original.z+Math.max(50,p.rules.snap),groupId:undefined};
      candidate=findFreePlacement(temp,candidate);temp.items.push(candidate);copies.push(candidate)
    }
    return withHistory(s,{projects:s.projects.map(x=>x.id===p.id?{...x,items:[...x.items,...copies],updatedAt:new Date().toISOString()}:x),selectedId:copies.at(-1)?.id??s.selectedId})
  }),
  saveRevision:()=>set((s:State)=>withHistory(s,{projects:s.projects.map(p=>{
    if(p.id!==s.activeId)return p;
    const revision=p.revision+1;
    const r:Revision={id:crypto.randomUUID(),revision,createdAt:new Date().toISOString(),snapshot:snapshot(p)};
    return {...p,revision,revisions:[...p.revisions,r],updatedAt:new Date().toISOString()}
  })})),
  restoreRevision:id=>set((s:State)=>withHistory(s,{
    projects:s.projects.map(p=>{if(p.id!==s.activeId)return p;const r=p.revisions.find(x=>x.id===id);return r?normaliseProject({...p,...structuredClone(r.snapshot),updatedAt:new Date().toISOString()}):p}),
    selectedId:null
  })),
  undo:()=>set((s:State)=>{const prev=s.past.at(-1);if(!prev)return s;return {...prev,past:s.past.slice(0,-1),future:[core(s),...s.future].slice(0,80),clipboard:s.clipboard}}),
  redo:()=>set((s:State)=>{const next=s.future[0];if(!next)return s;return {...next,past:[...s.past,core(s)].slice(-80),future:s.future.slice(1),clipboard:s.clipboard}})
});

const persistOptions:any={
  name:"joinery-studio-v5",
  partialize:(s:State)=>({projects:s.projects,activeId:s.activeId,selectedId:null,view:s.view,past:[],future:[]}),
  merge:(persisted:any,current:State)=>{
    const saved=persisted&&typeof persisted==="object"?persisted:{};
    const projects=Array.isArray(saved.projects)?saved.projects.map(normaliseProject):current.projects;
    const activeId=projects.some((p:Project)=>p.id===saved.activeId)?saved.activeId:projects[0]?.id??current.activeId;
    return {...current,...saved,projects,activeId,selectedId:null,past:[],future:[],clipboard:[]}
  }
};
export const useStudio=create<State>()(persist(storeCreator,persistOptions));
