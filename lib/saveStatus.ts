import type {StateStorage,PersistStorage,StorageValue} from 'zustand/middleware';
export type LocalSaveStatus='pending'|'saved'|'error';
let status:LocalSaveStatus='pending';
const listeners=new Set<()=>void>();
export const getLocalSaveStatus=()=>status;
export const subscribeLocalSave=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}};
function report(next:LocalSaveStatus){if(next===status)return;status=next;listeners.forEach(l=>l())}
export function trackedStorage(storage:Storage):StateStorage{return {
  getItem(name){try{const value=storage.getItem(name);if(value)report('saved');return value}catch{report('error');return null}},
  setItem(name,value){try{storage.setItem(name,value);report('saved')}catch{report('error')}},
  removeItem(name){try{storage.removeItem(name)}catch{report('error')}}
}}

// Persist the latest immutable project collection once per editing burst. Avoid
// JSON serialization entirely for selection, notices and history-only updates.
type SavedProjects={projects:unknown;activeId:string;view:string};
const flushers=new Set<()=>void>();
export function flushProjectStorage(){flushers.forEach(flush=>flush())}
export function bufferedProjectStorage():PersistStorage<any>{
  let pending:{name:string;value:StorageValue<SavedProjects>}|null=null;
  let last:SavedProjects|null=null,lastName="",timer:ReturnType<typeof setTimeout>|undefined;
  const flush=()=>{if(timer)clearTimeout(timer);timer=undefined;if(!pending)return;const entry=pending;pending=null;try{window.localStorage.setItem(entry.name,JSON.stringify(entry.value));report('saved')}catch{report('error');last=null}};
  flushers.add(flush);
  if(typeof window!=='undefined'&&window.addEventListener){window.addEventListener('pagehide',flush);window.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()})}
  return {
    getItem(name){try{const data=window.localStorage.getItem(name);if(!data)return null;const value=JSON.parse(data);last=value.state;lastName=name;report('saved');return value}catch{report('error');return null}},
    setItem(name,value){const next=value.state as SavedProjects;if(name===lastName&&last&&last.projects===next.projects&&last.activeId===next.activeId&&last.view===next.view)return;if(pending&&pending.name!==name)flush();last=next;lastName=name;pending={name,value};report('pending');if(timer)clearTimeout(timer);timer=setTimeout(flush,180)},
    removeItem(name){if(pending?.name===name){pending=null;if(timer)clearTimeout(timer)}last=null;try{window.localStorage.removeItem(name)}catch{report('error')}}
  };
}
