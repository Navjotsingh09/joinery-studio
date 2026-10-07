import {JoineryItem,Project,ViewMode} from "@/types/model";
import {islandWorktops,kitchenProject} from "./kitchenConfig";
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
  if(pair.includes("Kitchen accessory")&&pair.some(t=>baseKitchen.has(t)||t==="Worktop"))return true;
  if(pair.includes("Under-stair storage")&&pair.some(t=>t.includes("staircase")||t==="L staircase"||t==="U staircase"))return true;
  if(pair.some(t=>wardrobeInternal.has(t))&&pair.some(t=>t==="Wardrobe"||t==="Sliding wardrobe"))return true;
  if(wardrobeInternal.has(a.type)&&wardrobeInternal.has(b.type))return true;
  if(pair.includes("Worktop")&&pair.some(t=>baseKitchen.has(t)))return true;
  const tapType=(t:string)=>t==="Tap"||t.endsWith(" tap");
  if(pair.some(t=>tapType(t))&&pair.some(t=>t==="Sink base"||t==="Worktop"))return true;
  if(pair.includes("Backsplash")&&pair.some(t=>baseKitchen.has(t)||t==="Wall cabinet"))return true;
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
  if(candidate.type==="Kitchen island"&&islandWorktops(candidate).some(top=>!canPlace({...p,items:p.items.filter(t=>!t.sourceUnitIds?.includes(candidate.id))},top,top.id)))return false;
  if(![candidate.x,candidate.y,candidate.z,candidate.width,candidate.height,candidate.depth].every(Number.isFinite))return false;
  if(!serviceGapSatisfied(p,candidate))return false;
  if(candidate.width<=0||candidate.height<=0||candidate.depth<=0)return false;
  if(candidate.x<c||candidate.x+fp.width>p.roomWidth-c||candidate.y<0||candidate.y+candidate.height>p.roomHeight||candidate.z<0||candidate.z+fp.depth>p.roomDepth)return false;
  return !p.items.some(i=>i.visible!==false&&i.id!==ignoreId&&itemsCollide(candidate,i,p.rules.componentGap))
}
export function islandAisleSatisfied(p:Project,i:JoineryItem){
  const box=islandWorktops(i)[0]??i,F=footprint(box);
  return !p.items.some(j=>j.visible!==false&&j.id!==i.id&&!j.sourceUnitIds?.includes(i.id)&&(baseKitchen.has(j.type)||['Tall cabinet','Oven tower','Fridge housing'].includes(j.type))&&(()=>{const G=footprint(j),dx=Math.max(j.x-box.x-F.width,box.x-j.x-G.width,0),dz=Math.max(j.z-box.z-F.depth,box.z-j.z-G.depth,0);return (dx===0&&dz<900)||(dz===0&&dx<900)})());
}
export function findFreePlacement(p:Project,item:JoineryItem){
  const live=p.items.filter(i=>i.visible!==false);
  const tap=item.type==="Tap"||item.type.endsWith(" tap");
  if(tap){
    for(const sink of live.filter(i=>i.type==="Sink base")){
      const f=footprint(sink),rot=normalizeRotation(sink.rotation),a=rot*Math.PI/180;
      const q={...item,rotation:rot,x:sink.x+f.width/2-Math.sin(a)*sink.depth*.32-footprint({...item,rotation:rot}).width/2,z:sink.z+f.depth/2-Math.cos(a)*sink.depth*.32-footprint({...item,rotation:rot}).depth/2,y:Math.max(sink.y+sink.height,...live.filter(i=>i.type==="Worktop"&&i.x<=sink.x+f.width/2&&i.x+footprint(i).width>=sink.x+f.width/2&&i.z<=sink.z+f.depth/2&&i.z+footprint(i).depth>=sink.z+f.depth/2).map(i=>i.y+i.height))};
      if(canPlace(p,q,item.id))return q;
    }
    // A tap needs a sink; return an explicitly invalid placement when none fits.
    return {...item,x:-item.width};
  }
  if(item.type==="Backsplash"){
    // Wall finishes must never fall back to the freestanding floor search.
    const step=Math.max(25,p.rules.snap),walls:WallSide[]=item.wallSide?[item.wallSide,...(["back","left","front","right"] as WallSide[]).filter(w=>w!==item.wallSide)]:["back","left","front","right"];
    let fallback={...snapItemToWall(p,item,walls[0]),x:-item.width};
    for(const wall of walls){
      const mounted=snapItemToWall(p,item,wall),fp=footprint(mounted),horizontal=wall==="back"||wall==="front";
      const max=(horizontal?p.roomWidth-fp.width:p.roomDepth-fp.depth)-Math.max(0,p.rules.wallClearance);
      for(let offset=Math.max(0,p.rules.wallClearance);offset<=max;offset+=step){
        let q={...mounted,wallSide:wall,...(horizontal?{x:offset}:{z:offset})};
        const supporting=p.items.filter(top=>top.type==="Worktop"&&isItemOnWall(p,top,wall,50)&&(()=>{const t=footprint(top);return horizontal?q.x<top.x+t.width&&q.x+fp.width>top.x:q.z<top.z+t.depth&&q.z+fp.depth>top.z})());
        const fitted=live.some(i=>baseKitchen.has(i.type)||i.type==='Worktop');
        if(fitted&&!supporting.some(top=>{const t=footprint(top);return horizontal?q.x>=top.x&&q.x+fp.width<=top.x+t.width:q.z>=top.z&&q.z+fp.depth<=top.z+t.depth}))continue;
        q={...q,y:Math.max(item.y,...supporting.map(top=>top.y+top.height+Math.max(0,p.rules.componentGap)))};
        if(canPlace(p,q,item.id))return q;
        fallback={...q,x:-item.width};
      }
    }
    return fallback;
  }
  const wallTypes=new Set(["Wall cabinet","Door opening","Window","Wall segment","Extractor hood"]);
  if(wallTypes.has(item.type)){
    const walls:WallSide[]=item.wallSide?[item.wallSide]:["back","left","front","right"];
    for(const wall of walls){const mounted={...snapItemToWall(p,item,wall),wallSide:wall},f=footprint(mounted),horizontal=wall==='back'||wall==='front',extent=horizontal?p.roomWidth-f.width:p.roomDepth-f.depth;
      const original=horizontal?item.x:item.z,step=Math.max(25,p.rules.snap),offsets=[original,...live.flatMap(i=>{const g=footprint(i);return horizontal?[i.x+g.width+p.rules.componentGap,i.x-f.width-p.rules.componentGap]:[i.z+g.depth+p.rules.componentGap,i.z-f.depth-p.rules.componentGap]}),0];
      for(let n=0;n<=extent&&offsets.length<2000;n+=step)offsets.push(n);
      offsets.sort((a,b)=>Math.abs(a-original)-Math.abs(b-original));
      for(const offset of offsets){const q={...mounted,...(horizontal?{x:offset}:{z:offset})};if(canPlace(p,q,item.id))return q}
    }
    return {...item,x:-item.width};
  }
  const step=Math.max(25,p.rules.snap),c=Math.max(0,p.rules.wallClearance),base=clampItemToRoom(item,p),fp=footprint(base),maxX=Math.max(c,p.roomWidth-c-fp.width),maxZ=Math.max(0,p.roomDepth-fp.depth);
  const acceptable=(q:JoineryItem)=>canPlace(p,q,item.id)&&(q.type!=="Kitchen island"||islandAisleSatisfied(p,q));
  if(acceptable(base))return base;
  let attempts=0;
  for(let z=0;z<=maxZ;z+=step)for(let x=c;x<=maxX;x+=step){if(++attempts>20000)return {...base,x:-base.width};const candidate=clampItemToRoom({...base,x,z},p);if(acceptable(candidate))return candidate}
  return {...base,x:-base.width}
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
  if(i.wallSide&&i.wallSide!==wall)return false;
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
  p=kitchenProject(p);
  const issues:string[]=[];
  if(![p.roomWidth,p.roomHeight,p.roomDepth].every(Number.isFinite)||p.roomWidth<100||p.roomDepth<100||p.roomHeight<100||p.roomWidth>50000||p.roomDepth>50000||p.roomHeight>10000)issues.push("Room dimensions are outside the supported range: width/depth 100–50000 mm; height 100–10000 mm.");
  p={...p,items:p.items.filter(i=>i.visible!==false)};
  const c=p.rules.wallClearance,g=p.rules.componentGap;
  p.items.forEach(i=>{
    const fp=footprint(i);
    if(!serviceGapSatisfied(p,i))issues.push(i.name+": insufficient rear service clearance.");
    if(i.width<=0||i.height<=0||i.depth<=0)issues.push(i.name+": dimensions must be positive.");
    if(i.x<c||i.x+fp.width>p.roomWidth-c)issues.push(i.name+": violates left/right wall clearance.");
    if(i.y<0||i.y+i.height>p.roomHeight)issues.push(i.name+": outside room height.");
    if(i.z<0||i.z+fp.depth>p.roomDepth)issues.push(i.name+": outside room depth.");

    if(i.type==='Kitchen island'){
      if(!islandAisleSatisfied(p,i))issues.push(i.name+": less than 900 mm circulation space beside the island counter.");
    }
    if(standardCabinetTypes.has(i.type)&&(i.width<250||i.width>1400))issues.push(i.name+": cabinet width is outside the normal configurable range.");
    if(stairTypesForValidation.has(i.type)&&stairMetrics(i).review)issues.push(i.name+": stair rise/going/pitch needs design review before manufacture.")
  });
  for(let a=0;a<p.items.length;a++)for(let b=a+1;b<p.items.length;b++){const A=p.items[a],B=p.items[b];if(itemsCollide(A,B,g))issues.push(A.name+" clashes with "+B.name+".")}
  return [...new Set(issues)]
}
export function svgPoint(svg:SVGSVGElement,clientX:number,clientY:number){const pt=svg.createSVGPoint();pt.x=clientX;pt.y=clientY;const ctm=svg.getScreenCTM();if(!ctm)throw new Error("SVG CTM unavailable");return pt.matrixTransform(ctm.inverse())}
export function luminance(hex:string){const h=hex.replace("#","");const vals=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*vals[0]+.7152*vals[1]+.0722*vals[2]}
export const contrastText=(hex:string)=>luminance(hex)<.35?"#ffffff":"#111111";
