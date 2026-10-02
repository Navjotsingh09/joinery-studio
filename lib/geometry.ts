import {JoineryItem,Project,ViewMode} from "@/types/model";
export const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export const snap=(n:number,step:number)=>step>0?Math.round(n/step)*step:n;
export const normalizeRotation=(degrees=0)=>((Math.round(degrees/90)*90)%360+360)%360;
export function footprint(i:JoineryItem){
  const r=normalizeRotation(i.rotation??0),quarter=r===90||r===270;
  return {width:quarter?i.depth:i.width,depth:quarter?i.width:i.depth};
}
export type Rect={left:number;top:number;width:number;height:number};
export function viewSize(p:Project,v:Exclude<ViewMode,"3d">){if(v==="front")return {w:p.roomWidth,h:p.roomHeight};if(v==="top")return {w:p.roomWidth,h:p.roomDepth};return {w:p.roomDepth,h:p.roomHeight}}
export function itemRect(i:JoineryItem,p:Project,v:Exclude<ViewMode,"3d">):Rect{
  const fp=footprint(i);
  if(v==="front")return{left:i.x,top:p.roomHeight-i.y-i.height,width:fp.width,height:i.height};
  if(v==="top")return{left:i.x,top:p.roomDepth-i.z-fp.depth,width:fp.width,height:fp.depth};
  return{left:i.z,top:p.roomHeight-i.y-i.height,width:fp.depth,height:i.height}
}
export function labelFor(i:JoineryItem,v:Exclude<ViewMode,"3d">){
  const fp=footprint(i);
  if(v==="front")return fp.width+" × "+i.height+" mm";
  if(v==="top")return fp.width+" × "+fp.depth+" mm";
  return fp.depth+" × "+i.height+" mm"
}
export const isWallMounted=(i:JoineryItem)=>["Wall cabinet","Microwave","Extractor hood","Window"].includes(i.type);
export function clampItemToRoom(i:JoineryItem,p:Project):JoineryItem{
  const rotation=normalizeRotation(i.rotation??0),candidate={...i,rotation},fp=footprint(candidate),step=Math.max(1,p.rules.snap),c=Math.max(0,p.rules.wallClearance);
  return{...candidate,x:clamp(snap(candidate.x,step),c,Math.max(c,p.roomWidth-c-fp.width)),y:isWallMounted(candidate)?clamp(snap(candidate.y,step),0,Math.max(0,p.roomHeight-candidate.height)):0,z:clamp(snap(candidate.z,step),0,Math.max(0,p.roomDepth-fp.depth))}
}
export function allowedOverlap(a:JoineryItem,b:JoineryItem){
  const pair=[a.type,b.type];
  return pair.includes("Under-stair storage")&&pair.some(t=>t.includes("staircase")||t==="L staircase"||t==="U staircase");
}
export function itemsCollide(a:JoineryItem,b:JoineryItem,gap=0){
  if(allowedOverlap(a,b))return false;
  const A=footprint(a),B=footprint(b);
  return a.x<b.x+B.width+gap&&a.x+A.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y&&a.z<b.z+B.depth+gap&&a.z+A.depth+gap>b.z
}
export function canPlace(p:Project,candidate:JoineryItem,ignoreId?:string){
  const c=Math.max(0,p.rules.wallClearance),fp=footprint(candidate);
  if(candidate.width<=0||candidate.height<=0||candidate.depth<=0)return false;
  if(candidate.x<c||candidate.x+fp.width>p.roomWidth-c||candidate.y<0||candidate.y+candidate.height>p.roomHeight||candidate.z<0||candidate.z+fp.depth>p.roomDepth)return false;
  return !p.items.some(i=>i.id!==ignoreId&&itemsCollide(candidate,i,p.rules.componentGap))
}
export function findFreePlacement(p:Project,item:JoineryItem){
  const step=Math.max(25,p.rules.snap),c=Math.max(0,p.rules.wallClearance),base=clampItemToRoom(item,p),fp=footprint(base),maxX=Math.max(c,p.roomWidth-c-fp.width),maxZ=Math.max(0,p.roomDepth-fp.depth);
  for(let z=0;z<=maxZ;z+=step)for(let x=c;x<=maxX;x+=step){const candidate=clampItemToRoom({...base,x,z},p);if(canPlace(p,candidate,item.id))return candidate}
  return base
}
export function validate(p:Project){
  const issues:string[]=[],c=p.rules.wallClearance,g=p.rules.componentGap;
  p.items.forEach(i=>{
    const fp=footprint(i);
    if(i.width<=0||i.height<=0||i.depth<=0)issues.push(i.name+": dimensions must be positive.");
    if(i.x<c||i.x+fp.width>p.roomWidth-c)issues.push(i.name+": violates left/right wall clearance.");
    if(i.y<0||i.y+i.height>p.roomHeight)issues.push(i.name+": outside room height.");
    if(i.z<0||i.z+fp.depth>p.roomDepth)issues.push(i.name+": outside room depth.");
    if(!isWallMounted(i)&&i.y!==0)issues.push(i.name+": floor-standing component must sit on the floor.")
  });
  for(let a=0;a<p.items.length;a++)for(let b=a+1;b<p.items.length;b++){const A=p.items[a],B=p.items[b];if(itemsCollide(A,B,g))issues.push(A.name+" clashes with "+B.name+".")}
  return [...new Set(issues)]
}
export function svgPoint(svg:SVGSVGElement,clientX:number,clientY:number){const pt=svg.createSVGPoint();pt.x=clientX;pt.y=clientY;const ctm=svg.getScreenCTM();if(!ctm)throw new Error("SVG CTM unavailable");return pt.matrixTransform(ctm.inverse())}
export function luminance(hex:string){const h=hex.replace("#","");const vals=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*vals[0]+.7152*vals[1]+.0722*vals[2]}
export const contrastText=(hex:string)=>luminance(hex)<.35?"#ffffff":"#111111";
