import {Project} from "@/types/model";

const num=(v:unknown)=>typeof v==="number"&&Number.isFinite(v);
export function isProjectBackup(value:unknown):value is Project[]{
  if(!Array.isArray(value)||value.length===0)return false;
  return value.every(p=>{
    if(!p||typeof p!=="object")return false;
    const x=p as Partial<Project>;
    if(typeof x.id!=="string"||typeof x.name!=="string"||!num(x.roomWidth)||!num(x.roomHeight)||!num(x.roomDepth))return false;
    if(!x.rules||!num(x.rules.wallClearance)||!num(x.rules.componentGap)||!num(x.rules.snap)||!Array.isArray(x.items)||!Array.isArray(x.revisions))return false;
    return x.items.every(i=>i&&typeof i.id==="string"&&typeof i.name==="string"&&num(i.x)&&num(i.y)&&num(i.z)&&num(i.width)&&num(i.height)&&num(i.depth));
  });
}