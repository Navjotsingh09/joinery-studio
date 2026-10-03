import type {StateStorage} from 'zustand/middleware';
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
