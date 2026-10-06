import {islandAppliance} from "./kitchenConfig";
import {JoineryItem} from "@/types/model";
import {footprint,normalizeRotation} from "./geometry";

export type SinkCutout={x:number;z:number;width:number;depth:number};
// Return holes in worktop-local metres; preserve the user's saved placement.
export function sinkCutouts(top:JoineryItem,items:JoineryItem[]):SinkCutout[]{return worktopCutouts(top,items.filter(i=>i.type==="Sink base"))}
export function worktopCutouts(top:JoineryItem,items:JoineryItem[]):SinkCutout[]{
  const tf=footprint(top),angle=normalizeRotation(top.rotation??0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const appliances=items.map(i=>i.type==="Kitchen island"&&islandAppliance(i)!=="none"?{...i,type:islandAppliance(i)==="sink"?"Sink base":"Hob base",height:i.height-(i.topThickness??32)}:i);
  return appliances.filter(i=>["Sink base","Hob base"].includes(i.type)&&i.visible!==false).flatMap(sink=>{
    if(top.y>sink.y+sink.height+65||top.y+top.height<sink.y+sink.height)return [];
    const sf=footprint(sink),sa=normalizeRotation(sink.rotation??0)*Math.PI/180;
    const offset=sink.type==="Sink base"?sink.depth*.03:15;
    const dx=sink.x+sf.width/2+Math.sin(sa)*offset-(top.x+tf.width/2);
    const dz=sink.z+sf.depth/2+Math.cos(sa)*offset-(top.z+tf.depth/2);
    const x=(dx*c-dz*s)/1000,z=(dx*s+dz*c)/1000;
    const hob=sink.type==="Hob base";
    const sw=hob?Math.min(600,sink.width*.72)-20:Math.min(560,sink.width*.72)-52,sd=hob?Math.min(520,sink.depth*.72)-20:Math.min(430,sink.depth*.7)-52;
    if(sw<=0||sd<=0)return [];
    const cross=normalizeRotation((sink.rotation??0)-(top.rotation??0))%180!==0;
    const width=(cross?sd:sw)/1000,depth=(cross?sw:sd)/1000;
    if(Math.abs(x)+width/2>top.width/2000-.005||Math.abs(z)+depth/2>top.depth/2000-.005)return [];
    return [{x,z,width,depth}];
  });
}

export function alignApplianceFront(item:JoineryItem,items:JoineryItem[]){
  const rotation=normalizeRotation(item.rotation??0),axis=rotation%180===0?"z":"x",lateral=axis==="z"?"x":"z",box=footprint(item);
  const candidates=items.filter(i=>i.id!==item.id&&i.visible!==false&&["Base cabinet","Drawer unit","Sink base","Hob base"].includes(i.type)&&normalizeRotation(i.rotation??0)===rotation&&Math.abs(i.y-item.y)<100&&Math.abs(i[axis]-item[axis])<600&&Math.abs(i[lateral]-item[lateral])<1600);
  candidates.sort((a,b)=>Math.abs(a[lateral]-item[lateral])-Math.abs(b[lateral]-item[lateral]));
  const neighbour=candidates[0];if(!neighbour)return null;
  const nb=footprint(neighbour),size=axis==="z"?"depth":"width",positive=rotation===0||rotation===90;
  return {x:item.x,z:item.z,[axis]:positive?neighbour[axis]+nb[size]-box[size]:neighbour[axis]};
}

// Room dimensions describe finished INTERNAL faces. Wall thickness extends outward.
export function roomShellWalls(width:number,height:number,depth:number,thickness=.05){
  return {
    back:{position:[0,height/2,-depth/2-thickness/2] as [number,number,number],size:[width,height,thickness] as [number,number,number]},
    left:{position:[-width/2-thickness/2,height/2,0] as [number,number,number],size:[thickness,height,depth] as [number,number,number]}
  };
}

// Normalize against actual geometry bounds, including uncentred extrusion geometry.
export function splashbackTextureUV(x:number,y:number,minX:number,minY:number,maxX:number,maxY:number,crop:[number,number,number,number]):[number,number]{
  const [left,top,width,height]=crop;
  return [left+(x-minX)/Math.max(maxX-minX,1e-9)*width,1-top-height+(y-minY)/Math.max(maxY-minY,1e-9)*height];
}
