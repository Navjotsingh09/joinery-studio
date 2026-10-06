import {JoineryItem,Project} from '@/types/model';
import {canPlace,footprint} from './geometry';
/** Magnetise floor-plane movement only; dedicated X/Y/Z controls keep their axis. */
export function adjacentUnitSnap(p:Project,i:JoineryItem):JoineryItem{
 const f=footprint(i),threshold=Math.max(20,p.rules.snap*.6),gap=p.rules.componentGap;
 let best=i,distance=threshold+1;
 for(const other of p.items){
  if(other.id===i.id||other.visible===false||Math.abs(other.y-i.y)>5||other.type==='Worktop')continue;
  const g=footprint(other);
  const proposals=[{...i,x:other.x+g.width+gap},{...i,x:other.x-f.width-gap},{...i,z:other.z+g.depth+gap},{...i,z:other.z-f.depth-gap}];
  for(const q of proposals){
   const delta=Math.hypot(q.x-i.x,q.z-i.z),cross=q.x!==i.x?Math.abs(i.z-other.z):Math.abs(i.x-other.x);
   if(delta<=threshold&&delta<distance&&cross<=threshold&&canPlace(p,q,i.id)){best=q;distance=delta}
  }
 }
 return best;
}
