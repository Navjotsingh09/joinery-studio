import {JoineryItem,Project} from '@/types/model';
import {isWallMounted,wallItemRect} from './geometry';
import {islandAppliance} from './kitchenConfig';
import type {WallSide} from '@/types/model';

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
export function elevationDimensionItems(items:JoineryItem[]){
  // Worktop overhangs and appliance clearances must not split cabinet dimensions.
  return items.filter(i=>i.visible!==false&&i.layer!=='Services'&&i.layer!=='Architecture'&&i.type!=='Worktop'&&i.type!=='Backsplash');
}
export function elevationDimensions(p:Project,wall:WallSide,items:JoineryItem[]){
  const rects=elevationDimensionItems(items).map(i=>wallItemRect(i,p,wall));
  return {widths:dimensionStops(rects.flatMap(r=>[r.left,r.left+r.width]),wall==='back'||wall==='front'?p.roomWidth:p.roomDepth),heights:dimensionStops(rects.flatMap(r=>[r.top,r.top+r.height]),p.roomHeight)};
}
export function serviceEntries(p:Project){
  return p.items.filter(i=>i.visible!==false).flatMap(i=>{
    const kinds=i.type==='Sink base'?['Integrated sink']:i.type==='Hob base'?['Integrated hob']:i.type==='Oven tower'?['Integrated oven']:i.type==='Fridge housing'?['Integrated fridge']:i.type==='Kitchen island'&&islandAppliance(i)!=='none'?(islandAppliance(i)==='sink'?['Island sink','Island tap']:[`Island ${islandAppliance(i)}`]):i.layer==='Services'&&i.type!=='Backsplash'?[i.type]:[];
    return kinds.map(kind=>({item:i,kind,integrated:kind!==i.type}));
  });
}
export function itemColour(i:JoineryItem):[number,number,number]{
  if(i.layer==='Architecture')return [237,235,231];
  if(i.type==='Worktop')return [224,238,226];
  if(i.type==='Wall cabinet')return [222,235,249];
  if(['Tall cabinet','Fridge housing','Oven tower'].includes(i.type))return [247,222,229];
  if(i.layer==='Services')return [241,230,216];
  return [247,242,220];
}
