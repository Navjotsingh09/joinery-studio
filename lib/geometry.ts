import {JoineryItem,Project,ViewMode} from "@/types/model";
import {stairPlan} from "./stairGeometry";
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
const floatingTypes=new Set(["Wall cabinet","Microwave","Extractor hood","Window","Worktop","Ceiling bulkhead","Radiator","Socket","Switch","Mirror","Ceiling light","Pendant light","Tap","Arc mixer tap","Pull-out tap","Bridge tap","Square neck tap","Backsplash","Single oven","Hanging rail","Internal drawers","Shoe rack","Loft box","Cornice"]);
export const isWallMounted=(i:JoineryItem)=>floatingTypes.has(i.type);
export function clampItemToRoom(i:JoineryItem,p:Project,snapPosition=true):JoineryItem{
  const rotation=normalizeRotation(i.rotation??0),candidate={...i,rotation},fp=footprint(candidate),step=Math.max(1,p.rules.snap),c=Math.max(0,p.rules.wallClearance);
  const place=(n:number)=>snapPosition?snap(n,step):n;
  return{...candidate,x:clamp(place(candidate.x),c,Math.max(c,p.roomWidth-c-fp.width)),y:clamp(candidate.y,0,Math.max(0,p.roomHeight-candidate.height)),z:clamp(place(candidate.z),0,Math.max(0,p.roomDepth-fp.depth))}
}
// Snap only the axes being dragged, using the measured origin rather than the
// rendered centre. Untouched coordinates retain their exact stored values.
export function moveItemOnAxes(i:JoineryItem,p:Project,position:Pick<JoineryItem,"x"|"y"|"z">,axes:readonly ("x"|"y"|"z")[]):JoineryItem{
  const candidate={...i},step=p.rules.snap;
  for(const axis of axes)candidate[axis]=Math.round(snap(position[axis],step)*1000)/1000;
  const bounded=clampItemToRoom(candidate,p,false);
  for(const axis of axes)candidate[axis]=bounded[axis];
  return candidate;
}
const wardrobeInternal=new Set(["Hanging rail","Internal drawers","Shoe rack","Internal divider","Loft box","Cornice"]);
const baseKitchen=new Set(["Base cabinet","Drawer unit","Sink base","Hob base","Corner cabinet","Wine rack","Kitchen island","Filler panel","End panel","Dishwasher","Washing machine"]);
export function allowedOverlap(a:JoineryItem,b:JoineryItem){
  const pair=[a.type,b.type];
  if(pair.includes("Under-stair storage")&&pair.some(t=>t.includes("staircase")||t==="L staircase"||t==="U staircase"))return true;
  if(pair.some(t=>wardrobeInternal.has(t))&&pair.some(t=>t==="Wardrobe"||t==="Sliding wardrobe"))return true;
  if(wardrobeInternal.has(a.type)&&wardrobeInternal.has(b.type))return true;
  if(pair.includes("Worktop")&&pair.some(t=>baseKitchen.has(t)))return true;
  const tapType=(t:string)=>t==="Tap"||t.endsWith(" tap");
  if(pair.some(t=>tapType(t))&&pair.some(t=>t==="Sink base"||t==="Worktop"))return true;
  if(pair.includes("Backsplash")&&pair.some(t=>baseKitchen.has(t)||["Wall cabinet","Tall cabinet","Oven tower","Fridge housing"].includes(t)))return true;
  if(pair.some(t=>t==="Door opening"||t==="Window")&&pair.includes("Wall segment"))return true;
  return false;
}
export function itemsCollide(a:JoineryItem,b:JoineryItem,gap=0){
  if(allowedOverlap(a,b))return false;
  const A=footprint(a),B=footprint(b);
  return a.x<b.x+B.width+gap&&a.x+A.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y&&a.z<b.z+B.depth+gap&&a.z+A.depth+gap>b.z
}
// Rear service void is required for freestanding appliances; integrated housings
// already include their void within their configured cabinet depth.
const serviceAppliances=new Set(["Washing machine","Freestanding fridge","Range cooker"]);
export function serviceGapSatisfied(p:Project,i:JoineryItem){
  if(!serviceAppliances.has(i.type))return true;
  const gap=Math.max(0,p.rules.serviceClearance??50),fp=footprint(i),r=normalizeRotation(i.rotation);
  return (r===0?i.z:r===90?i.x:r===180?p.roomDepth-i.z-fp.depth:p.roomWidth-i.x-fp.width)>=gap;
}
export function canPlace(p:Project,candidate:JoineryItem,ignoreId?:string){
  const c=Math.max(0,p.rules.wallClearance),fp=footprint(candidate);
  if(![candidate.x,candidate.y,candidate.z,candidate.width,candidate.height,candidate.depth].every(Number.isFinite))return false;
  if(!serviceGapSatisfied(p,candidate))return false;
  if(candidate.width<=0||candidate.height<=0||candidate.depth<=0)return false;
  if(candidate.x<c||candidate.x+fp.width>p.roomWidth-c||candidate.y<0||candidate.y+candidate.height>p.roomHeight||candidate.z<0||candidate.z+fp.depth>p.roomDepth)return false;
  return !p.items.some(i=>i.id!==ignoreId&&itemsCollide(candidate,i,p.rules.componentGap))
}
export function findFreePlacement(p:Project,item:JoineryItem){
  const step=Math.max(25,p.rules.snap),c=Math.max(0,p.rules.wallClearance),base=clampItemToRoom(item,p),fp=footprint(base),maxX=Math.max(c,p.roomWidth-c-fp.width),maxZ=Math.max(0,p.roomDepth-fp.depth);
  for(let z=0;z<=maxZ;z+=step)for(let x=c;x<=maxX;x+=step){const candidate=clampItemToRoom({...base,x,z},p);if(canPlace(p,candidate,item.id))return candidate}
  return base
}
export type WallSide="back"|"front"|"left"|"right";
export function wallViewSize(p:Project,wall:WallSide){return {w:(wall==="back"||wall==="front")?p.roomWidth:p.roomDepth,h:p.roomHeight}}
export function wallItemRect(i:JoineryItem,p:Project,wall:WallSide):Rect{
  const fp=footprint(i),top=p.roomHeight-i.y-i.height;
  if(wall==="back")return {left:i.x,top,width:fp.width,height:i.height};
  if(wall==="front")return {left:p.roomWidth-i.x-fp.width,top,width:fp.width,height:i.height};
  if(wall==="left")return {left:p.roomDepth-i.z-fp.depth,top,width:fp.depth,height:i.height};
  return {left:i.z,top,width:fp.depth,height:i.height}
}
export function isItemOnWall(p:Project,i:JoineryItem,wall:WallSide,tolerance=260){
  if(i.wallSide===wall)return true;
  const c=wallClearances(p,i);
  return wall==="back"?c.back<=tolerance:wall==="front"?c.front<=tolerance:wall==="left"?c.left<=tolerance:c.right<=tolerance
}
export function wallClearances(p:Project,i:JoineryItem){
  const fp=footprint(i);
  return{left:Math.max(0,i.x),right:Math.max(0,p.roomWidth-i.x-fp.width),back:Math.max(0,i.z),front:Math.max(0,p.roomDepth-i.z-fp.depth),bottom:Math.max(0,i.y),top:Math.max(0,p.roomHeight-i.y-i.height)}
}
export function snapItemToWall(p:Project,i:JoineryItem,wall:WallSide){
  const c=Math.max(0,p.rules.wallClearance);
  const rotation=wall==="back"?0:wall==="front"?180:wall==="left"?90:270;
  let q={...i,rotation};
  const fp=footprint(q);
  if(wall==="back")q={...q,z:0};
  if(wall==="front")q={...q,z:Math.max(0,p.roomDepth-fp.depth)};
  if(wall==="left")q={...q,x:c};
  if(wall==="right")q={...q,x:Math.max(c,p.roomWidth-c-fp.width)};
  return clampItemToRoom(q,p,false)
}
const autoWallTypes=new Set(["Base cabinet","Drawer unit","Wall cabinet","Tall cabinet","Sink base","Hob base","Oven tower","Fridge housing","Corner cabinet","Filler panel","End panel","Backsplash","Extractor hood","Microwave","Wardrobe","Sliding wardrobe","Media unit","Shelving"]);
export function autoFaceNearestWall(p:Project,i:JoineryItem,threshold=160){
  if(!autoWallTypes.has(i.type))return i;
  const clearance=wallClearances(p,i);
  const distances:{side:WallSide;distance:number}[]=[
    {side:"back",distance:clearance.back},
    {side:"front",distance:clearance.front},
    {side:"left",distance:clearance.left},
    {side:"right",distance:clearance.right}
  ];
  const nearest=distances.sort((a,b)=>a.distance-b.distance)[0];
  if(nearest.distance>threshold)return {...i,wallSide:undefined};
  const q=snapItemToWall(p,i,nearest.side);
  return {...q,wallSide:nearest.side};
}
export function mirrorItem(p:Project,i:JoineryItem,axis:"x"|"z"){
  const fp=footprint(i);
  return clampItemToRoom(axis==="x"?{...i,x:p.roomWidth-i.x-fp.width}:{...i,z:p.roomDepth-i.z-fp.depth},p)
}
export function stairMetrics(i:JoineryItem){
  const plan=stairPlan(i),risers=plan.count,rise=plan.stepRise*1000,goings=risers;
  const going=plan.going*1000,pitch=Math.atan2(rise,going)*180/Math.PI,comfort=2*rise+going;
  return{risers,rise:Math.round(rise),goings,going:Math.round(going),pitch:Math.round(pitch*10)/10,comfort:Math.round(comfort),review:rise<150||rise>220||going<220||pitch>42}
}
const stairTypesForValidation=new Set(["Straight staircase","L staircase","U staircase"]);
const standardCabinetTypes=new Set(["Base cabinet","Drawer unit","Wall cabinet","Tall cabinet","Sink base","Hob base","Oven tower","Fridge housing"]);
export function validate(p:Project){
  const issues:string[]=[],c=p.rules.wallClearance,g=p.rules.componentGap;
  p.items.forEach(i=>{
    const fp=footprint(i);
    if(!serviceGapSatisfied(p,i))issues.push(i.name+": insufficient rear service clearance.");
    if(i.width<=0||i.height<=0||i.depth<=0)issues.push(i.name+": dimensions must be positive.");
    if(i.x<c||i.x+fp.width>p.roomWidth-c)issues.push(i.name+": violates left/right wall clearance.");
    if(i.y<0||i.y+i.height>p.roomHeight)issues.push(i.name+": outside room height.");
    if(i.z<0||i.z+fp.depth>p.roomDepth)issues.push(i.name+": outside room depth.");

    if(standardCabinetTypes.has(i.type)&&(i.width<250||i.width>1400))issues.push(i.name+": cabinet width is outside the normal configurable range.");
    if(stairTypesForValidation.has(i.type)&&stairMetrics(i).review)issues.push(i.name+": stair rise/going/pitch needs design review before manufacture.")
  });
  for(let a=0;a<p.items.length;a++)for(let b=a+1;b<p.items.length;b++){const A=p.items[a],B=p.items[b];if(itemsCollide(A,B,g))issues.push(A.name+" clashes with "+B.name+".")}
  return [...new Set(issues)]
}
export function svgPoint(svg:SVGSVGElement,clientX:number,clientY:number){const pt=svg.createSVGPoint();pt.x=clientX;pt.y=clientY;const ctm=svg.getScreenCTM();if(!ctm)throw new Error("SVG CTM unavailable");return pt.matrixTransform(ctm.inverse())}
export function luminance(hex:string){const h=hex.replace("#","");const vals=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*vals[0]+.7152*vals[1]+.0722*vals[2]}
export const contrastText=(hex:string)=>luminance(hex)<.35?"#ffffff":"#111111";
