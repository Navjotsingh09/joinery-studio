import {JoineryItem,Project} from '@/types/model';
import {isWallMounted} from './geometry';

export type PlanKind='base'|'wall'|'worktop';
export const referenceLabel=(i:JoineryItem,n=0)=>`${i.type==='Worktop'?'WT':i.layer==='Services'?'S':i.layer==='Architecture'?'A':'U'}${String(i.unitNumber??n+1).padStart(2,'0')}`;
// Allocate once; the high-water mark prevents a deleted number being reassigned.
export function numberItems(p:Pick<Project,'items'|'nextItemNumber'>){
  let next=Math.max(p.nextItemNumber??1,...p.items.map(i=>(i.unitNumber??0)+1));
  const used=new Set<number>();
  const items=p.items.map(i=>{const n=i.unitNumber;if(n&&Number.isInteger(n)&&n>0&&!used.has(n)){used.add(n);return i}const q={...i,unitNumber:next++};used.add(q.unitNumber);return q});
  return {items,nextItemNumber:next};
}
export function onPlan(i:JoineryItem,kind:PlanKind){
  if(i.visible===false)return false;
  if(kind==='worktop')return i.type==='Worktop';
  if(['Door opening','Window','Wall segment','Column','Chimney breast'].includes(i.type))return true;
  const upper=['Wall cabinet','Cornice','Microwave','Extractor hood','Loft box','Ceiling light','Pendant light','Ceiling bulkhead'].includes(i.type)||i.y>=1200;
  if(kind==='wall')return upper;
  return !upper&&i.type!=='Worktop'&&i.type!=='Backsplash'&&i.y<1200;
}
export function dimensionStops(values:number[],length:number){
  return [...new Set([0,length,...values.filter(v=>v>=0&&v<=length)].map(v=>Math.round(v*10)/10))].sort((a,b)=>a-b);
}
export function itemColour(i:JoineryItem):[number,number,number]{
  if(i.layer==='Architecture')return [237,235,231];
  if(i.type==='Worktop')return [224,238,226];
  if(i.type==='Wall cabinet')return [222,235,249];
  if(['Tall cabinet','Fridge housing','Oven tower'].includes(i.type))return [247,222,229];
  if(i.layer==='Services')return [241,230,216];
  return [247,242,220];
}
