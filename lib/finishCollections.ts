import {Project} from '@/types/model';
export const FINISH_COLLECTIONS=[
 {id:'k-oak',kind:'kitchen',name:'Oak & charcoal',wood:'h1180',front:'palette-15',surface:'wt-15',floor:'floor-oak'},
 {id:'k-sage',kind:'kitchen',name:'Sage & warm white',wood:'h1385',front:'palette-17',surface:'wt-16',floor:'floor-oak'},
 {id:'b-cashmere',kind:'bedroom',name:'Cashmere & oak',wood:'h1180',front:'palette-5',surface:'wt-16',floor:'floor-oak'},
 {id:'b-walnut',kind:'bedroom',name:'Ivory & walnut',wood:'timber-4',front:'palette-2',surface:'wt-16',floor:'floor-walnut'},
 {id:'s-oak',kind:'stairs',name:'Oak & white',wood:'h1180',front:'w1000',surface:'wt-16',floor:'floor-oak'},
 {id:'s-dark',kind:'stairs',name:'Walnut & charcoal',wood:'timber-4',front:'palette-15',surface:'wt-16',floor:'floor-stone'}
] as const;
export function applyFinishCollection(p:Project,id:string):Partial<Project>{
 const c=FINISH_COLLECTIONS.find(c=>c.id===id);if(!c)return {};
 const cabinets=new Set(['Base cabinet','Drawer unit','Wall cabinet','Tall cabinet','Sink base','Hob base','Oven tower','Fridge housing','Kitchen island','Corner cabinet','Wardrobe','Sliding wardrobe','Dressing table','Bedside cabinet','Media unit','Shelving','Internal drawers','Loft box','Under-stair storage']);
 return {floorMaterialId:c.floor,items:p.items.map(i=>i.type.includes('staircase')?{...i,treadMaterialId:c.wood,riserMaterialId:c.front,railingMaterialId:c.wood}:cabinets.has(i.type)?{...i,materialId:c.wood,carcassMaterialId:'w1000',doorMaterialId:c.front,leftSideMaterialId:c.wood,rightSideMaterialId:c.wood,plinthMaterialId:c.front,...(i.type==='Kitchen island'?{worktopMaterialId:c.surface}:{})}:i.type==='Worktop'?{...i,materialId:c.surface,worktopMaterialId:c.surface}:i.type==='Bed wall'?{...i,materialId:c.front}:i)};
}
