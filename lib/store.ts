"use client";
import {create} from "zustand";import {persist} from "zustand/middleware";
import {Project,JoineryItem,ViewMode,ProjectSnapshot,Revision} from "@/types/model";
import {newProject} from "./defaults";import {findFreePlacement,canPlace} from "./geometry";
type Core={projects:Project[];activeId:string;selectedId:string|null;view:ViewMode};
type State=Core&{past:Core[];future:Core[];setView:(v:ViewMode)=>void;setActive:(id:string)=>void;select:(id:string|null)=>void;addProject:()=>void;duplicateProject:()=>void;deleteProject:()=>void;replaceAll:(p:Project[])=>void;configureActive:(patch:Partial<Project>&{items:JoineryItem[]})=>void;updateProject:(patch:Partial<Project>)=>void;addItem:(i:JoineryItem)=>void;updateItem:(id:string,patch:Partial<JoineryItem>)=>void;moveItem:(id:string,patch:Partial<JoineryItem>)=>void;checkpoint:()=>void;deleteItem:(id:string)=>void;duplicateItem:(id:string)=>void;saveRevision:()=>void;restoreRevision:(id:string)=>void;undo:()=>void;redo:()=>void};
const first=newProject("Showroom concept"),core=(s:State):Core=>({projects:structuredClone(s.projects),activeId:s.activeId,selectedId:s.selectedId,view:s.view});
const mutate=(set:any,fn:(s:State)=>Partial<State>)=>set((s:State)=>({...fn(s),past:[...s.past.slice(-39),core(s)],future:[]}));
const snapshot=(p:Project):ProjectSnapshot=>({name:p.name,customer:p.customer,reference:p.reference,status:p.status,roomWidth:p.roomWidth,roomHeight:p.roomHeight,roomDepth:p.roomDepth,rules:structuredClone(p.rules),items:structuredClone(p.items)});
export const useStudio=create<State>()(persist((set,get)=>({projects:[first],activeId:first.id,selectedId:null,view:"front",past:[],future:[],
setView:view=>set({view}),setActive:activeId=>set({activeId,selectedId:null}),select:selectedId=>set({selectedId}),
addProject:()=>mutate(set,s=>{const p=newProject();return{projects:[...s.projects,p],activeId:p.id,selectedId:null}}),
duplicateProject:()=>mutate(set,s=>{const source=s.projects.find(p=>p.id===s.activeId);if(!source)return{};const now=new Date().toISOString(),copy=structuredClone(source);copy.id=crypto.randomUUID();copy.name=source.name+" copy";copy.reference="JS-"+String(Date.now()).slice(-5);copy.revision=1;copy.revisions=[];copy.createdAt=now;copy.updatedAt=now;copy.items=copy.items.map(i=>({...i,id:crypto.randomUUID()}));return{projects:[...s.projects,copy],activeId:copy.id,selectedId:null}}),
deleteProject:()=>mutate(set,s=>{if(s.projects.length===1){const p=newProject("New project");return{projects:[p],activeId:p.id,selectedId:null}}const ps=s.projects.filter(p=>p.id!==s.activeId);return{projects:ps,activeId:ps[0].id,selectedId:null}}),
replaceAll:projects=>{const ps=projects.length?projects:[newProject("New project")];set({projects:ps,activeId:ps[0].id,selectedId:null,past:[],future:[]})},
configureActive:patch=>mutate(set,s=>({projects:s.projects.map(p=>p.id===s.activeId?{...p,...patch,items:structuredClone(patch.items),updatedAt:new Date().toISOString()}:p),selectedId:null,view:"3d"})),
updateProject:patch=>mutate(set,s=>({projects:s.projects.map(p=>p.id===s.activeId?{...p,...patch,updatedAt:new Date().toISOString()}:p)})),
addItem:i=>mutate(set,s=>({projects:s.projects.map(p=>p.id===s.activeId?{...p,items:[...p.items,i],updatedAt:new Date().toISOString()}:p),selectedId:i.id})),
updateItem:(id,patch)=>mutate(set,s=>({projects:s.projects.map(p=>p.id===s.activeId?{...p,items:p.items.map(i=>i.id===id?{...i,...patch}:i),updatedAt:new Date().toISOString()}:p)})),
moveItem:(id,patch)=>set((s:State)=>({projects:s.projects.map(p=>p.id===s.activeId?{...p,items:p.items.map(i=>i.id===id?{...i,...patch}:i),updatedAt:new Date().toISOString()}:p)})),
checkpoint:()=>set((s:State)=>({past:[...s.past.slice(-39),core(s)],future:[]})),
deleteItem:id=>mutate(set,s=>({projects:s.projects.map(p=>p.id===s.activeId?{...p,items:p.items.filter(i=>i.id!==id),updatedAt:new Date().toISOString()}:p),selectedId:null})),
duplicateItem:id=>{const p=get().projects.find(x=>x.id===get().activeId),i=p?.items.find(x=>x.id===id);if(i&&p){const q=findFreePlacement(p,{...i,id:crypto.randomUUID(),name:i.name+" copy",x:i.x+Math.max(50,p.rules.snap)});if(canPlace(p,q))get().addItem(q)}},
saveRevision:()=>mutate(set,s=>({projects:s.projects.map(p=>{if(p.id!==s.activeId)return p;const n=p.revision+1,r:Revision={id:crypto.randomUUID(),revision:n,createdAt:new Date().toISOString(),snapshot:snapshot(p)};return{...p,revision:n,revisions:[...p.revisions,r],updatedAt:new Date().toISOString()}})})),
restoreRevision:id=>mutate(set,s=>({projects:s.projects.map(p=>{if(p.id!==s.activeId)return p;const r=p.revisions.find(x=>x.id===id);return r?{...p,...structuredClone(r.snapshot),updatedAt:new Date().toISOString()}:p}),selectedId:null})),
undo:()=>set(s=>{const prev=s.past.at(-1);if(!prev)return s;return{...prev,past:s.past.slice(0,-1),future:[core(s),...s.future].slice(0,40)}}),
redo:()=>set(s=>{const next=s.future[0];if(!next)return s;return{...next,past:[...s.past,core(s)].slice(-40),future:s.future.slice(1)}})
}),{name:"joinery-studio-v5",partialize:s=>({projects:s.projects,activeId:s.activeId,selectedId:null,view:s.view,past:[],future:[]})}));