"use client";
import {numberItems} from "./drawingPack";
import {projectLimitReached} from "./projectAllowance";
import {newId} from "@/lib/id";
import {create} from "zustand";import {persist,createJSONStorage} from "zustand/middleware";
import {Project,JoineryItem,ViewMode,ProjectSnapshot,Revision} from "@/types/model";
import {newProject} from "./defaults";import {findFreePlacement,canPlace} from "./geometry";
type Core={projects:Project[];activeId:string;selectedId:string|null;view:ViewMode};
type State=Core&{editError:string;clearEditError:()=>void;past:Core[];future:Core[];setView:(v:ViewMode)=>void;setActive:(id:string)=>void;select:(id:string|null)=>void;addProject:()=>void;duplicateProject:()=>void;deleteProject:(id?:string)=>void;replaceAll:(p:Project[])=>void;configureActive:(patch:Partial<Project>&{items:JoineryItem[]})=>void;updateProject:(patch:Partial<Project>)=>void;addItem:(i:JoineryItem)=>void;updateItem:(id:string,patch:Partial<JoineryItem>)=>void;updateItems:(ids:string[],patch:Partial<JoineryItem>|((item:JoineryItem)=>Partial<JoineryItem>))=>void;moveItem:(id:string,patch:Partial<JoineryItem>)=>void;checkpoint:()=>void;deleteItem:(id:string)=>void;deleteItems:(ids:string[])=>void;duplicateItem:(id:string)=>void;copyItems:(ids:string[])=>void;pasteItems:()=>void;saveRevision:()=>void;restoreRevision:(id:string)=>void;undo:()=>void;redo:()=>void};
import {syncIslandWorktops} from "./kitchenConfig";
import {trackedStorage} from "./saveStatus";
let itemClipboard:JoineryItem[]=[];
const positionKeys=["x","y","z","width","height","depth","rotation"] as const;
export function checkChanges(p:Project,items:JoineryItem[]):string|null{
  const proposed={...p,items};
  for(const i of items){const old=p.items.find(q=>q.id===i.id);if(!old)continue;
    if(i.type==="Kitchen island"&&JSON.stringify(old)!==JSON.stringify(i)&&!canPlace(proposed,i,i.id))return i.name+": counter configuration leaves the room or clashes with another object.";
    if(!positionKeys.some(k=>old[k]!==i[k]))continue;
    if(old.locked&&!(i.type==="Worktop"&&i.sourceUnitIds?.some(id=>items.find(q=>q.id===id)?.type==="Kitchen island")))return old.name+" is position locked. Unlock it before changing its position or size.";
    if(!canPlace(proposed,i,i.id))return i.name+": change rejected because it clashes, leaves the room or violates a clearance.";
  }return null;
}
const first=newProject("Showroom concept"),core=(s:State):Core=>({projects:structuredClone(s.projects),activeId:s.activeId,selectedId:s.selectedId,view:s.view});
const mutate=(set:any,fn:(s:State)=>Partial<State>)=>set((s:State)=>{const next=fn(s);if(!next.projects)return next;return {...next,past:[...s.past.slice(-39),core(s)],future:[]}});
const snapshot=(p:Project):ProjectSnapshot=>({name:p.name,customer:p.customer,reference:p.reference,status:p.status,roomWidth:p.roomWidth,roomHeight:p.roomHeight,roomDepth:p.roomDepth,rules:structuredClone(p.rules),items:structuredClone(p.items),address:p.address,notes:p.notes,archived:p.archived,customMaterials:structuredClone(p.customMaterials??[]),floorMaterialId:p.floorMaterialId,designKind:p.designKind,displayUnit:p.displayUnit,drawingReference:structuredClone(p.drawingReference),nextItemNumber:p.nextItemNumber,savedCameras:structuredClone(p.savedCameras),lighting:structuredClone(p.lighting)});
export const useStudio=create<State>()(persist((set,get)=>({projects:[first],activeId:first.id,selectedId:null,view:"front",past:[],future:[],editError:"",clearEditError:()=>set({editError:""}),
setView:view=>set({view}),setActive:activeId=>set({activeId,selectedId:null}),select:selectedId=>set({selectedId}),
addProject:()=>mutate(set,s=>{if(projectLimitReached(s.projects.length))return{editError:"Basic allows two projects. Export or delete a project before creating another."};const p=newProject();return{projects:[...s.projects,p],activeId:p.id,selectedId:null}}),
duplicateProject:()=>mutate(set,s=>{if(projectLimitReached(s.projects.length))return{editError:"Basic allows two projects. Export or delete a project first."};const source=s.projects.find(p=>p.id===s.activeId);if(!source)return{};const now=new Date().toISOString(),copy=structuredClone(source);copy.id=newId();copy.name=source.name+" copy";copy.reference="JS-"+String(Date.now()).slice(-5);copy.revision=1;copy.revisions=[];copy.cloudVersion=undefined;copy.createdAt=now;copy.updatedAt=now;const itemIds=new Map(copy.items.map(i=>[i.id,newId()]));copy.items=copy.items.map(i=>({...i,id:itemIds.get(i.id)!,sourceUnitIds:i.sourceUnitIds?.map(id=>itemIds.get(id)??id),groupId:undefined}));return{projects:[...s.projects,copy],activeId:copy.id,selectedId:null}}),
deleteProject:(id)=>mutate(set,s=>{const target=id??s.activeId;if(!s.projects.some(p=>p.id===target))return{};const ps=s.projects.filter(p=>p.id!==target);if(!ps.length){const p=newProject("New project");return{projects:[p],activeId:p.id,selectedId:null}}return{projects:ps,activeId:s.activeId===target?ps[0].id:s.activeId,selectedId:s.activeId===target?null:s.selectedId}}),
replaceAll:projects=>{const ps=projects.length?projects:[newProject("New project")];set({projects:ps,activeId:ps[0].id,selectedId:null,past:[],future:[]})},
configureActive:patch=>mutate(set,s=>({projects:s.projects.map(p=>p.id===s.activeId?{...p,...patch,...numberItems({items:structuredClone(patch.items),nextItemNumber:1}),updatedAt:new Date().toISOString()}:p),selectedId:null,view:"3d"})),
updateProject:patch=>mutate(set,s=>({projects:s.projects.map(p=>p.id===s.activeId?{...p,...patch,...(patch.items?numberItems({items:patch.items,nextItemNumber:p.nextItemNumber}):{}),updatedAt:new Date().toISOString()}:p)})),
addItem:i=>{const p=get().projects.find(p=>p.id===get().activeId);if(p&&!canPlace(p,i)){set({editError:"This object clashes or leaves the room."});return}mutate(set,s=>({projects:s.projects.map(p=>p.id===s.activeId?{...p,...numberItems({items:[...p.items,{...i,unitNumber:undefined}],nextItemNumber:p.nextItemNumber}),updatedAt:new Date().toISOString()}:p),selectedId:i.id}))},
updateItem:(id,patch)=>{const p=get().projects.find(p=>p.id===get().activeId),source=p?.items.find(i=>i.id===id);if(!source)return;const dx=(patch.x??source.x)-source.x,dy=(patch.y??source.y)-source.y,dz=(patch.z??source.z)-source.z;const ids=source.groupId&&(dx||dy||dz)?p!.items.filter(i=>i.groupId===source.groupId).map(i=>i.id):[id];get().updateItems(ids,i=>i.id===id?patch:{x:i.x+dx,y:i.y+dy,z:i.z+dz})},
updateItems:(ids,patch)=>mutate(set,s=>{
  const wanted=new Set(ids),p=s.projects.find(p=>p.id===s.activeId);if(!p)return{};
  const changes=syncIslandWorktops(p.items.map(i=>wanted.has(i.id)?{...i,...(typeof patch==="function"?patch(i):patch)}:i));
  const error=checkChanges(p,changes);if(error)return{editError:error};
  return{editError:"",projects:s.projects.map(q=>q.id===p.id?{...q,items:changes,updatedAt:new Date().toISOString()}:q)};
}),
moveItem:(id,patch)=>set((s:State)=>{
  const p=s.projects.find(p=>p.id===s.activeId),source=p?.items.find(i=>i.id===id);if(!p||!source)return{};
  const dx=typeof patch.x==="number"?patch.x-source.x:0,dy=typeof patch.y==="number"?patch.y-source.y:0,dz=typeof patch.z==="number"?patch.z-source.z:0;
  const changes=syncIslandWorktops(p.items.map(i=>i.id===id?{...i,...patch}:source.groupId&&i.groupId===source.groupId&&(dx||dy||dz)?{...i,x:i.x+dx,y:i.y+dy,z:i.z+dz}:i));
  const error=checkChanges(p,changes);if(error)return{editError:error};
  return{editError:"",projects:s.projects.map(q=>q.id===p.id?{...q,items:changes,updatedAt:new Date().toISOString()}:q)};
}),
checkpoint:()=>set((s:State)=>({past:[...s.past.slice(-39),core(s)],future:[]})),
deleteItem:id=>mutate(set,s=>({projects:s.projects.map(p=>p.id===s.activeId?{...p,items:p.items.filter(i=>i.id!==id&&!i.sourceUnitIds?.includes(id)),updatedAt:new Date().toISOString()}:p),selectedId:null})),
deleteItems:ids=>mutate(set,s=>{const wanted=new Set(ids);return{projects:s.projects.map(p=>p.id===s.activeId?{...p,items:p.items.filter(i=>!wanted.has(i.id)&&!i.sourceUnitIds?.some(id=>wanted.has(id))),updatedAt:new Date().toISOString()}:p),selectedId:s.selectedId&&wanted.has(s.selectedId)?null:s.selectedId}}),
duplicateItem:id=>{const p=get().projects.find(x=>x.id===get().activeId),i=p?.items.find(x=>x.id===id);if(i&&p){const q=findFreePlacement(p,{...i,id:newId(),name:i.name+" copy",unitNumber:undefined,x:i.x+Math.max(50,p.rules.snap),groupId:undefined});if(canPlace(p,q))get().addItem(q)}},
copyItems:ids=>{const s=get() as State;itemClipboard=structuredClone(s.projects.find(p=>p.id===s.activeId)?.items.filter(i=>ids.includes(i.id))??[])},
pasteItems:()=>{const s=get() as State,p=s.projects.find(x=>x.id===s.activeId);if(!p||!itemClipboard.length)return;const temp={...p,items:[...p.items]};for(const original of itemClipboard){const q=findFreePlacement(temp,{...structuredClone(original),id:newId(),name:original.name+" copy",unitNumber:undefined,locked:false,x:original.x+Math.max(50,p.rules.snap),z:original.z+Math.max(50,p.rules.snap),groupId:undefined});if(!canPlace(temp,q)){set({editError:"There is no valid space for this paste. Move objects or enlarge the room."});return}temp.items.push(q)}mutate(set,()=>({projects:s.projects.map(q=>q.id===p.id?{...temp,...numberItems(temp),updatedAt:new Date().toISOString()}:q),editError:""}))},
saveRevision:()=>mutate(set,s=>({projects:s.projects.map(p=>{if(p.id!==s.activeId)return p;const n=p.revision+1,r:Revision={id:newId(),revision:n,createdAt:new Date().toISOString(),snapshot:snapshot(p)};return{...p,revision:n,revisions:[...p.revisions,r],updatedAt:new Date().toISOString()}})})),
restoreRevision:id=>mutate(set,s=>({projects:s.projects.map(p=>{if(p.id!==s.activeId)return p;const r=p.revisions.find(x=>x.id===id);return r?{...p,drawingReference:undefined,savedCameras:undefined,lighting:undefined,nextItemNumber:undefined,designKind:undefined,displayUnit:undefined,...structuredClone(r.snapshot),updatedAt:new Date().toISOString()}:p}),selectedId:null})),
undo:()=>set(s=>{const prev=s.past.at(-1);if(!prev)return s;return{...prev,past:s.past.slice(0,-1),future:[core(s),...s.future].slice(0,40)}}),
redo:()=>set(s=>{const next=s.future[0];if(!next)return s;return{...next,past:[...s.past,core(s)].slice(-40),future:s.future.slice(1)}})
}),{name:"joinery-studio-v6:guest",storage:createJSONStorage(()=>trackedStorage(window.localStorage)),partialize:s=>({projects:s.projects,activeId:s.activeId,selectedId:null,view:s.view,past:[],future:[]})}));
export async function switchAccountStorage(accountId:string|null){
  itemClipboard=[];
  const key="joinery-studio-v6:"+(accountId??"guest");
  let stored:string|null=null;
  try{stored=window.localStorage.getItem(key)}catch{}
  useStudio.persist.setOptions({name:key});
  const p=newProject("New project");
  // Clear memory without overwriting the destination account's stored projects.
  useStudio.setState({projects:[p],activeId:p.id,selectedId:null,past:[],future:[],editError:""});
  if(stored){try{window.localStorage.setItem(key,stored);await useStudio.persist.rehydrate()}catch{}}
}
