import {Project} from "@/types/model";

const stamp=(p:Project)=>Number.isFinite(Date.parse(p.updatedAt))?Date.parse(p.updatedAt):0;

export function mergeProjects(local:Project[],remote:Project[]){
  const merged=new Map<string,Project>();
  for(const p of remote)merged.set(p.id,p);
  for(const p of local){
    const r=merged.get(p.id);
    if(!r||stamp(p)>stamp(r))merged.set(p.id,p);
  }
  return [...merged.values()].sort((a,b)=>stamp(b)-stamp(a));
}