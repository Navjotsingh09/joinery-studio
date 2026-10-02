import {Project,ProjectStatus} from "@/types/model";
const num=(v:unknown)=>typeof v==="number"&&Number.isFinite(v);
const str=(v:unknown)=>typeof v==="string";
const statuses:ProjectStatus[]=["Draft","Presented","Accepted","Rejected"];

export function isProjectBackup(value:unknown):value is Project[]{
  if(!Array.isArray(value)||value.length===0)return false;
  return value.every(p=>{
    if(!p||typeof p!=="object")return false;
    const x=p as Partial<Project>;
    if(!str(x.id)||!str(x.name)||!str(x.customer)||!str(x.reference)||!statuses.includes(x.status as ProjectStatus))return false;
    if(!num(x.revision)||!num(x.roomWidth)||!num(x.roomHeight)||!num(x.roomDepth)||!str(x.createdAt)||!str(x.updatedAt))return false;
    if(!x.rules||!num(x.rules.wallClearance)||!num(x.rules.componentGap)||!num(x.rules.snap)||!Array.isArray(x.items)||!Array.isArray(x.revisions))return false;
    return x.items.every(i=>i&&str(i.id)&&str(i.name)&&str(i.type)&&num(i.x)&&num(i.y)&&num(i.z)&&num(i.width)&&num(i.height)&&num(i.depth)&&num(i.shelves)&&num(i.doors)&&str(i.materialId)&&str(i.finish)&&str(i.notes)&&typeof i.locked==="boolean"&&str(i.hardware)&&str(i.edgeBanding)&&(i.rotation===undefined||num(i.rotation)));
  });
}