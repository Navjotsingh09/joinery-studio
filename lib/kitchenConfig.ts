import {JoineryItem,Project} from "@/types/model";
export const FRONT_STYLES=["slab","shaker","slim-shaker","raised-panel","fluted"] as const;
export const HANDLE_STYLES=["None","Handleless","Bar handle","Knob","Cup pull","Edge pull","Push-to-open","Client specified"];
export const HANDLE_FINISHES=["Chrome","Brushed steel","Matt black","Brass","Copper"] as const;
export const ISLAND_STYLES=["storage","breakfast","dining","extended","hob","grill"] as const;
export function islandAppliance(i:JoineryItem){return i.islandAppliance??(i.islandStyle==="hob"?"hob":i.islandStyle==="grill"?"grill":"none")}
// Dimensions are in local cabinet coordinates. Rotation uses the same centre and
// clockwise quarter turns as the editor; extensions remain attached on rotation.
export function islandWorktops(i:JoineryItem):JoineryItem[]{
  if(i.type!=="Kitchen island"||i.visible===false)return [];
  const pad=i.topOverhang??30,t=i.topThickness??32,style=i.islandStyle??"storage";
  const seating=style==="breakfast"?(i.seatingOverhang??300):pad,ext=["extended","dining"].includes(style)?(i.counterExtension??900):0;
  const rot=((Math.round(i.rotation/90)*90)%360+360)%360,a=rot*Math.PI/180,c=Math.round(Math.cos(a)),s=Math.round(Math.sin(a)),quarter=rot%180!==0;
  const centreX=i.x+(quarter?i.depth:i.width)/2,centreZ=i.z+(quarter?i.width:i.depth)/2;
  function top(suffix:string,x:number,z:number,w:number,d:number,y:number):JoineryItem{
    const cx=centreX+x*c+z*s,cz=centreZ-x*s+z*c;
    return {...i,id:i.id+suffix,name:i.name+(suffix===":top"?" · worktop":" · dining counter"),type:"Worktop",sourceUnitIds:[i.id],unitNumber:undefined,x:cx-(quarter?d:w)/2,z:cz-(quarter?w:d)/2,y,width:w,depth:d,height:t,doors:0,shelves:0,hardware:"None",materialId:i.worktopMaterialId??"stone-light",worktopMaterialId:i.worktopMaterialId??"stone-light",finish:i.finish,locked:true,worktopFinishedEdges:["front","back","left","right"]};
  }
  const width=i.width+pad*2+(style==="extended"?ext:0),depth=i.depth+pad+seating;
  const main=top(":top",style==="extended"?ext/2:0,(pad-seating)/2,width,depth,i.y+i.height-t);
  return style==="dining"?[main,top(":dining",i.width/2+pad+ext/2,0,ext,depth,i.y+Math.min(740,i.height-100)-t)]:[main];
}
export function syncIslandWorktops(items:JoineryItem[]):JoineryItem[]{
  const islands=new Map(items.filter(i=>i.type==="Kitchen island").map(i=>[i.id,i]));
  return items.flatMap(top=>{
    if(top.type!=="Worktop"||top.sourceUnitIds?.length!==1)return [top];
    const owner=islands.get(top.sourceUnitIds[0]);if(!owner)return [top];
    const derived=islandWorktops(owner),d=top.id.endsWith(":dining")?derived[1]:derived[0];
    return d?[{...top,...d,id:top.id,name:top.name,unitNumber:top.unitNumber}]:[];
  });
}
export function kitchenProject(p:Project):Project{
  const items=syncIslandWorktops(p.items),extra:JoineryItem[]=[];
  for(const island of items.filter(i=>i.type==="Kitchen island")){
    const tops=islandWorktops(island),linked=items.filter(t=>t.type==="Worktop"&&t.sourceUnitIds?.includes(island.id));
    tops.forEach((top,n)=>{if(!linked.some(t=>n===1?t.id.endsWith(":dining"):!t.id.endsWith(":dining")))extra.push(top)});
  }
  return {...p,items:[...items,...extra]};
}
export function kitchenSpecification(i:JoineryItem){
  const details=[`${i.hardware}${["None","Handleless","Push-to-open"].includes(i.hardware)?"":` / ${i.handleFinish??"Brushed steel"} / ${i.handleLength??160} mm`}`,`plinth ${i.plinthStyle??"recessed"} / ${i.plinthHeight??100} mm`];
  if(i.type==="Tall cabinet")details.push(`larder ${i.larderLayout??"shelves"}`);
  if(i.type==="Hob base")details.push(`${i.hobStyle??"induction"} / ${i.hobZones??4} zones`);
  if(i.type==="Sink base")details.push(`${i.productStyle??"Inset stainless"} / ${i.colourVariant??"Stainless steel"}`);
  if(i.type==="Kitchen island")details.push(`${i.islandStyle??"storage"} island / ${i.islandFront??"drawers"}; ${islandAppliance(i)}; top ${i.topThickness??32} mm; overhang ${i.topOverhang??30} mm; seating ${i.seatingOverhang??300} mm; extension ${i.counterExtension??900} mm`);
  return details.join("; ");
}
