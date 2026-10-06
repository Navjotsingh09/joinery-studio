"use client";
import {kitchenProject} from "@/lib/kitchenConfig";
import {worktopCutouts} from "@/lib/renderGeometry";
import {referenceLabel} from "@/lib/drawingPack";
import {formatMeasure} from "@/lib/units";
import {referenceDepth} from "@/lib/drawingReference";
import {stairPlan} from "@/lib/stairGeometry";
import {useRef,useState} from "react";
import {Project,ViewMode,JoineryItem,WallSide} from "@/types/model";
import {itemRect,labelFor,viewSize,svgPoint,contrastText,moveItemOnAxes,clampItemToRoom,validate,normalizeRotation,wallClearances,wallViewSize,wallItemRect,isItemOnWall} from "@/lib/geometry";
import {material} from "@/lib/materials";

type DragState={
  id:string;
  mode:"move"|"resize"|"rotate";
  start:{x:number;y:number};
  original:JoineryItem;
};

export function Drawing2D({
  project,view,selected,wallSide,onSelect,onDuplicate,onMove,onResize,onRotate,onMoveStart,onContext,onDropType
}:{
  project:Project;
  view:Exclude<ViewMode,"3d">;
  selected:string|null;
  wallSide?:WallSide;
  onSelect:(id:string|null)=>void;
  onDuplicate?:(id:string)=>JoineryItem|null;
  onMove:(id:string,x:number,y:number,z:number)=>void;
  onResize:(id:string,patch:Partial<JoineryItem>)=>void;
  onRotate:(id:string,rotation:number)=>void;
  onMoveStart:()=>void;
  onContext:(e:React.MouseEvent,id:string)=>void;
  onDropType:(type:string,x:number,y:number,z:number)=>void;
}){
  project=kitchenProject(project);
  const ref=useRef<SVGSVGElement>(null);
  const [drag,setDrag]=useState<DragState|null>(null);
  const [guides,setGuides]=useState<{x?:number;y?:number;label?:string}>({});
  const elevation=!!wallSide&&view==="front";
  const measure=(n:number)=>formatMeasure(n,project.displayUnit??"mm");
  const size=elevation?wallViewSize(project,wallSide!):viewSize(project,view),pad=76,W=1000,H=650;
  const rectFor=(i:JoineryItem)=>elevation?wallItemRect(i,project,wallSide!):itemRect(i,project,view);
  const visibleItems=project.items.filter(i=>i.visible!==false&&(!elevation||isItemOnWall(project,i,wallSide!))).sort((a,b)=>{
    // Surface outlines and cutouts remain visible above base cabinetry.
    const order=(i:JoineryItem)=>i.id===selected?3:["Worktop","Backsplash"].includes(i.type)?2.5:view==="top"&&i.y>1000?1:2;
    return order(a)-order(b);
  });
  const scale=Math.min((W-pad*2)/size.w,(H-pad*2)/size.h);
  const tx=pad+(W-pad*2-size.w*scale)/2,ty=pad+(H-pad*2-size.h*scale)/2;
  const issueNames=new Set(validate(project).flatMap(msg=>project.items.filter(i=>msg.includes(i.name)).map(i=>i.id)));

  const begin=(e:React.PointerEvent,id:string,mode:"move"|"resize"|"rotate")=>{
    e.preventDefault();e.stopPropagation();
    let i=project.items.find(x=>x.id===id);
    if(!i||i.locked||!ref.current)return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    if(e.altKey&&mode==="move"){const copy=onDuplicate?.(id);if(!copy)return;i=copy}else onMoveStart();
    setDrag({id,mode,start:svgPoint(ref.current,e.clientX,e.clientY),original:{...i}});
    onSelect(i.id);
  };

  const move=(e:React.PointerEvent)=>{
    if(!drag||!ref.current)return;
    const q=svgPoint(ref.current,e.clientX,e.clientY);
    const dx=(q.x-drag.start.x)/scale,dy=(q.y-drag.start.y)/scale;
    const i=drag.original;
    if(drag.mode==="rotate"){
      const originalRect=rectFor(i);
      const center={x:tx+(originalRect.left+originalRect.width/2)*scale,y:ty+(originalRect.top+originalRect.height/2)*scale};
      const a0=Math.atan2(drag.start.y-center.y,drag.start.x-center.x);
      const a1=Math.atan2(q.y-center.y,q.x-center.x);
      const delta=(a1-a0)*180/Math.PI;
      onRotate(i.id,normalizeRotation((i.rotation??0)+delta));
      return;
    }
    if(drag.mode==="move"){
      let candidate={...i};
      if(view==="front"){
        if(elevation&&(wallSide==="left"||wallSide==="right"))candidate={...candidate,z:i.z+(wallSide==="left"?-dx:dx),y:i.y-dy};
        else candidate={...candidate,x:i.x+(elevation&&wallSide==="front"?-dx:dx),y:i.y-dy};
      }
      if(view==="top")candidate={...candidate,x:i.x+dx,z:i.z-dy};
      if(view==="side")candidate={...candidate,y:i.y-dy,z:i.z+dx};
      candidate=moveItemOnAxes(i,project,candidate,view==="top"?["x","z"]:view==="side"||elevation&&(wallSide==="left"||wallSide==="right")?["y","z"]:["x","y"]);
      let r=rectFor(candidate);
      const others=project.items.filter(o=>o.id!==i.id&&o.visible!==false);
      let gx:number|undefined,gy:number|undefined,label:string|undefined;
      const threshold=Math.max(20,project.rules.snap*.6);
      let bestX=threshold+1,bestY=threshold+1,deltaX=0,deltaY=0;
      const cx=[r.left,r.left+r.width/2,r.left+r.width],cy=[r.top,r.top+r.height/2,r.top+r.height];
      for(const o of others){
        const or=rectFor(o);
        const xs=[or.left,or.left+or.width/2,or.left+or.width],ys=[or.top,or.top+or.height/2,or.top+or.height];
        for(const a of cx)for(const b of xs){const d=b-a;if(Math.abs(d)<bestX&&Math.abs(d)<=threshold){bestX=Math.abs(d);deltaX=d;gx=b;label="Snap"}}
        for(const a of cy)for(const b of ys){const d=b-a;if(Math.abs(d)<bestY&&Math.abs(d)<=threshold){bestY=Math.abs(d);deltaY=d;gy=b;label="Snap"}}
      }
      if(bestX<=threshold){
        if(elevation&&(wallSide==="left"||wallSide==="right"))candidate.z+=wallSide==="left"?-deltaX:deltaX;
        else if(elevation&&wallSide==="front")candidate.x-=deltaX;
        else if(view==="front"||view==="top")candidate.x+=deltaX;
        else candidate.z+=deltaX;
      }
      if(bestY<=threshold){
        if(view==="front"||view==="side")candidate.y-=deltaY;
        else candidate.z-=deltaY;
      }
      candidate=clampItemToRoom(candidate,project,false);
      r=rectFor(candidate);
      setGuides({x:gx,y:gy,label});
      onMove(i.id,candidate.x,candidate.y,candidate.z);
      return;
    }
    const min=100,rotation=normalizeRotation(i.rotation??0),quarter=rotation===90||rotation===270;
    let candidate={...i};
    if(view==="front"){
      candidate=quarter?{...candidate,depth:Math.max(min,i.depth+dx),height:Math.max(min,i.height+dy)}:{...candidate,width:Math.max(min,i.width+dx),height:Math.max(min,i.height+dy)};
    }
    if(view==="top"){
      candidate=quarter?{...candidate,depth:Math.max(min,i.depth+dx),width:Math.max(min,i.width+dy)}:{...candidate,width:Math.max(min,i.width+dx),depth:Math.max(min,i.depth+dy)};
    }
    if(view==="side"){
      candidate=quarter?{...candidate,width:Math.max(min,i.width+dx),height:Math.max(min,i.height+dy)}:{...candidate,depth:Math.max(min,i.depth+dx),height:Math.max(min,i.height+dy)};
    }
    candidate=clampItemToRoom(candidate,project,false);
    onResize(i.id,{width:candidate.width,height:candidate.height,depth:candidate.depth,x:candidate.x,y:candidate.y,z:candidate.z});
  };

  const drop=(e:React.DragEvent<SVGSVGElement>)=>{
    e.preventDefault();
    if(!ref.current)return;
    const type=e.dataTransfer.getData("application/x-joinery-component")||e.dataTransfer.getData("text/plain");
    if(!type)return;
    const q=svgPoint(ref.current,e.clientX,e.clientY);
    const rx=(q.x-tx)/scale,ry=(q.y-ty)/scale;
    let x=0,y=0,z=0;
    if(view==="front"){x=rx;y=project.roomHeight-ry}
    if(view==="top"){x=rx;z=project.roomDepth-ry}
    if(view==="side"){z=rx;y=project.roomHeight-ry}
    onDropType(type,x,y,z);
  };

  return <svg ref={ref} className={"drawing "+(drag?"isDragging":"")} viewBox={"0 0 "+W+" "+H}
    onPointerMove={move} onPointerUp={()=>{setDrag(null);setGuides({})}} onPointerCancel={()=>{setDrag(null);setGuides({})}}
    onPointerDown={e=>{if(e.target===e.currentTarget)onSelect(null)}}
    onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="copy"}} onDrop={drop}>
    <defs>
      <pattern id="minorGrid" width={50*scale} height={50*scale} patternUnits="userSpaceOnUse" x="0" y={size.h*scale}><path d={"M "+(50*scale)+" 0L0 0 0 "+(50*scale)} fill="none" stroke="#efede9" strokeWidth=".7"/></pattern>
      <pattern id="grid" width={500*scale} height={500*scale} patternUnits="userSpaceOnUse" x="0" y={size.h*scale}><rect width={500*scale} height={500*scale} fill="url(#minorGrid)"/><path d={"M "+(500*scale)+" 0L0 0 0 "+(500*scale)} fill="none" stroke="#ddd9d2" strokeWidth="1.2"/></pattern>
      <clipPath id="roomReferenceClip"><rect width={size.w*scale} height={size.h*scale}/></clipPath>
      <filter id="selectionShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity=".2"/></filter>
    </defs>
    <text x={tx} y={34} className="viewTitle">{elevation?(wallSide!.toUpperCase()+" WALL ELEVATION"):view==="front"?"FRONT ELEVATION":view==="top"?"PLAN VIEW":"SIDE ELEVATION"}</text>
    <text x={tx} y={52} className="viewHint">Click to select · drag to move · drag corner handle to resize · Alt + drag copies</text>
    <g transform={"translate("+tx+","+ty+")"}>
      <rect className="roomCanvas" width={size.w*scale} height={size.h*scale} fill="url(#grid)" stroke="#383838" strokeWidth="2" onPointerDown={e=>{e.stopPropagation();onSelect(null)}}/>
      {view==="top"&&project.drawingReference?.visible&&<g clipPath="url(#roomReferenceClip)" pointerEvents="none"><image preserveAspectRatio="none" href={project.drawingReference.dataUrl} x={project.drawingReference.x*scale} y={(project.roomDepth-project.drawingReference.z-referenceDepth(project.drawingReference))*scale} width={project.drawingReference.widthMm*scale} height={referenceDepth(project.drawingReference)*scale} opacity={project.drawingReference.opacity}/></g>}
      <line x1="0" y1={size.h*scale+25} x2={size.w*scale} y2={size.h*scale+25} stroke="#777"/>
      <line x1="0" y1={size.h*scale+19} x2="0" y2={size.h*scale+31} stroke="#777"/><line x1={size.w*scale} y1={size.h*scale+19} x2={size.w*scale} y2={size.h*scale+31} stroke="#777"/>
      <text x="0" y={size.h*scale+47} className="dim originDim">0</text><text x="-30" y={size.h*scale+4} textAnchor="end" className="dim originDim">0</text>
      <text x={size.w*scale/2} y={size.h*scale+47} textAnchor="middle" className="dim">{measure(size.w)}</text>
      <line x1="-25" y1="0" x2="-25" y2={size.h*scale} stroke="#777"/>
      <line x1="-31" y1="0" x2="-19" y2="0" stroke="#777"/><line x1="-31" y1={size.h*scale} x2="-19" y2={size.h*scale} stroke="#777"/>
      <text x="-43" y={size.h*scale/2} transform={"rotate(-90 -43 "+(size.h*scale/2)+")"} textAnchor="middle" className="dim">{measure(size.h)}</text>
      {guides.x!==undefined&&<><line className="snapGuide" x1={guides.x*scale} x2={guides.x*scale} y1="0" y2={size.h*scale}/><text className="snapHint" x={guides.x*scale+8} y="18">{guides.label}</text></>}
      {guides.y!==undefined&&<><line className="snapGuide" x1="0" x2={size.w*scale} y1={guides.y*scale} y2={guides.y*scale}/><text className="snapHint" x="8" y={guides.y*scale-8}>{guides.label}</text></>}
      {visibleItems.map(i=>{
        const planOverlay=view==="top"&&(i.y>1000||["Worktop","Backsplash"].includes(i.type));
        const r=rectFor(i),sel=i.id===selected,invalid=issueNames.has(i.id),rotation=normalizeRotation(i.rotation??0),quarter=rotation===90||rotation===270,faceView=elevation?((wallSide==="left"||wallSide==="right")?quarter:!quarter):(view==="front"&&!quarter)||(view==="side"&&quarter),drawMaterialId=i.type==="Worktop"?(i.worktopMaterialId??i.materialId):(faceView&&i.doors>0?(i.doorMaterialId??i.materialId):i.materialId),fill=material(drawMaterialId,project.customMaterials??[]).colour,tc=contrastText(fill),rw=r.width*scale,rh=r.height*scale,isDrawer=i.type==="Drawer unit"||i.type==="Media unit"||(i.type==="Kitchen island"&&i.islandFront!=="doors"),hasPlinth=["Wardrobe","Base cabinet","Tall cabinet","Drawer unit","Media unit","Sink base","Hob base","Kitchen island","Corner cabinet"].includes(i.type),plinthPx=hasPlinth&&i.plinthStyle!=="none"?Math.min(rh*.25,(i.plinthHeight??100)*scale):0,isStair=["Straight staircase","L staircase","U staircase"].includes(i.type),isBed=i.type==="Bed",isSink=i.type==="Sink base",isHob=i.type==="Hob base",isOven=i.type==="Oven tower",isDish=i.type==="Dishwasher",isWasher=i.type==="Washing machine",isMicrowave=i.type==="Microwave",isExtractor=i.type==="Extractor hood",isDoor=i.type==="Door opening",isWindow=i.type==="Window",isGlassBal=i.type==="Glass balustrade",isTimberBal=i.type==="Timber balustrade",clear=wallClearances(project,i);
        return <g key={i.id} className={"drawingItem "+(sel?"selected ":"")+(invalid?"invalid ":"")} transform={"translate("+(r.left*scale)+","+(r.top*scale)+")"}
          onPointerDown={e=>i.id.includes(":top")||i.id.includes(":dining")?(e.stopPropagation(),onSelect(i.sourceUnitIds?.[0]??i.id)):begin(e,i.id,"move")}
          onContextMenu={e=>{e.preventDefault();e.stopPropagation();onContext(e,i.id.includes(":top")||i.id.includes(":dining")?i.sourceUnitIds?.[0]??i.id:i.id)}}
          style={{cursor:i.locked?"not-allowed":drag?.id===i.id?"grabbing":"grab"}}>
          <title>{i.name+" · "+r.width+" × "+r.height+" mm"}</title>
          <rect className="itemBody" width={rw} height={rh} rx="2" fill={planOverlay?"none":fill} strokeDasharray={planOverlay?"5 4":undefined} pointerEvents={planOverlay?"stroke":undefined} stroke={invalid?"#e15544":sel?"#c8102e":i.edgeBanding==="None / raw"?"#777":"#292929"} strokeWidth={sel?4:invalid?3:i.edgeBanding.includes("2mm")?3:1.5} filter={sel?"url(#selectionShadow)":undefined}/>
          {view==="top"&&i.type==="Worktop"&&worktopCutouts(i,project.items).map((hole,n)=>{const a=rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a),cx=hole.x*c+hole.z*s,cz=-hole.x*s+hole.z*c,cross=rotation%180!==0,hw=(cross?hole.depth:hole.width)*1000*scale,hd=(cross?hole.width:hole.depth)*1000*scale;return <rect key={"cutout"+n} x={rw/2+cx*1000*scale-hw/2} y={rh/2-cz*1000*scale-hd/2} width={hw} height={hd} fill="#fff" stroke="#555" strokeDasharray="3 2" pointerEvents="none"/>})}
          {faceView&&i.doors===0&&Array.from({length:Math.max(0,i.shelves)}).map((_,n)=><line key={"s"+n} x1="0" x2={rw} y1={rh*(n+1)/(i.shelves+1)} y2={rh*(n+1)/(i.shelves+1)} stroke={tc} opacity=".58"/>)}
          {faceView&&["shaker","slim-shaker","raised-panel"].includes(i.frontStyle??"")&&i.doors>0&&Array.from({length:Math.min(12,i.doors)},(_,n)=>{const count=Math.min(12,i.doors),fw=isDrawer?rw:rw/count,fh=isDrawer?(rh-plinthPx)/count:rh-plinthPx,inset=Math.min(6,fw*.15,fh*.15);return <rect key={"shaker"+n} x={(isDrawer?0:n*fw)+inset} y={(isDrawer?n*fh:0)+inset} width={fw-inset*2} height={fh-inset*2} fill="none" stroke={tc} opacity=".5"/>})}
          {faceView&&i.frontStyle==="fluted"&&Array.from({length:Math.min(48,Math.max(4,Math.round(i.width/25)))},(_,n)=><line key={"flute"+n} x1={(n+.5)*rw/Math.min(48,Math.max(4,Math.round(i.width/25)))} x2={(n+.5)*rw/Math.min(48,Math.max(4,Math.round(i.width/25)))} y1={2} y2={rh-plinthPx-2} stroke={tc} opacity=".3"/>)}
          {faceView&&!isDrawer&&i.doors>1&&Array.from({length:i.doors-1}).map((_,n)=><line key={"d"+n} y1="2" y2={rh-plinthPx-2} x1={rw*(n+1)/i.doors} x2={rw*(n+1)/i.doors} stroke={tc} opacity=".72"/>)}
          {faceView&&isDrawer&&i.doors>1&&Array.from({length:i.doors-1}).map((_,n)=><line key={"dr"+n} x1="2" x2={rw-2} y1={(rh-plinthPx)*(n+1)/i.doors} y2={(rh-plinthPx)*(n+1)/i.doors} stroke={tc} opacity=".72"/>)}
          {faceView&&hasPlinth&&<><line x1="0" x2={rw} y1={rh-plinthPx} y2={rh-plinthPx} stroke={tc} opacity=".5"/><rect x={rw*.06} y={rh-plinthPx} width={rw*.88} height={plinthPx} fill={fill} opacity=".78"/></>}
          {faceView&&i.doors>0&&!isDrawer&&i.hardware!=="None"&&i.hardware!=="Push-to-open"&&i.hardware!=="Handleless"&&Array.from({length:i.doors}).map((_,n)=>{const dw=rw/i.doors,x=dw*n+dw*(n<i.doors/2?.82:.18);return <line key={"h"+n} x1={x} x2={x} y1={(rh-plinthPx)*.42} y2={(rh-plinthPx)*.58} stroke={tc} strokeWidth="2.4" opacity=".85"/>})}
          {faceView&&isDrawer&&i.hardware!=="None"&&i.hardware!=="Push-to-open"&&i.hardware!=="Handleless"&&Array.from({length:Math.max(1,i.doors)}).map((_,n)=>{const fh=(rh-plinthPx)/Math.max(1,i.doors),y=fh*n+fh*.32;return <line key={"dh"+n} x1={rw*.42} x2={rw*.58} y1={y} y2={y} stroke={tc} strokeWidth="2.4" opacity=".85"/>})}
          {isStair&&view==="side"&&Array.from({length:stairPlan(i).count}).map((_,n)=>{const count=stairPlan(i).count,x=rw*n/count,y=rh-rh*(n+1)/count;return <path key={"st"+n} d={"M "+x+" "+rh+" V "+y+" H "+(rw*(n+1)/stairPlan(i).count)} fill="none" stroke={tc} strokeWidth="1.6" opacity=".9"/>})}
          {isStair&&view==="top"&&<g transform={`translate(${rw/2} ${rh/2}) rotate(${-rotation})`}>{stairPlan(i).flights.map((f,fi)=>Array.from({length:f.count},(_,n)=>{const along=(f.reverse?-1:1)*(-f.run/2+(n+1)*f.run/f.count),sx=f.position[0]*1000*scale,sz=f.position[2]*1000*scale;return <line key={`${fi}-${n}`} x1={sx+(f.axis==="z"?-f.width/2:along)*1000*scale} x2={sx+(f.axis==="z"?f.width/2:along)*1000*scale} y1={sz+(f.axis==="z"?along:-f.width/2)*1000*scale} y2={sz+(f.axis==="z"?along:f.width/2)*1000*scale} stroke={tc} strokeWidth="1.3"/>}))}{stairPlan(i).landings.map((l,n)=><rect key={n} x={(l.position[0]-l.size[0]/2)*1000*scale} y={(l.position[2]-l.size[2]/2)*1000*scale} width={l.size[0]*1000*scale} height={l.size[2]*1000*scale} fill="none" stroke={tc}/>)}</g>}

          {isBed&&view==="top"&&<><rect x={rw*.04} y={rh*.04} width={rw*.92} height={rh*.92} rx="8" fill="#f1eee8" stroke="#a79e91"/><rect x={rw*.12} y={rh*.08} width={rw*.34} height={rh*.18} rx="8" fill="#fff" stroke="#bbb4aa"/><rect x={rw*.54} y={rh*.08} width={rw*.34} height={rh*.18} rx="8" fill="#fff" stroke="#bbb4aa"/></>}
          {isSink&&view==="top"&&<ellipse cx={rw/2} cy={rh*.45} rx={rw*.28} ry={rh*.26} fill="#8f9699" stroke="#52585c" strokeWidth="1.5"/>}
          {isHob&&view==="top"&&<><rect x={rw*.2} y={rh*.18} width={rw*.6} height={rh*.64} rx="4" fill="#181a1c"/>{[[.35,.35],[.65,.35],[.35,.65],[.65,.65]].map((p,n)=><circle key={n} cx={rw*p[0]} cy={rh*p[1]} r={Math.min(rw,rh)*.08} fill="none" stroke="#5b6064" strokeWidth="2"/>)}</>}
          {isOven&&faceView&&<><rect x={rw*.12} y={rh*.36} width={rw*.76} height={rh*.26} rx="3" fill="#17191b" stroke="#0c0d0e"/><line x1={rw*.24} x2={rw*.76} y1={rh*.41} y2={rh*.41} stroke="#777" strokeWidth="2"/></>}
          {isDish&&faceView&&<><rect x={rw*.06} y={rh*.08} width={rw*.88} height={rh*.84} rx="3" fill="#c5c8c9" stroke="#777"/><line x1={rw*.18} x2={rw*.82} y1={rh*.2} y2={rh*.2} stroke="#555" strokeWidth="3"/></>}
          {isWasher&&faceView&&<><rect x={rw*.05} y={rh*.05} width={rw*.9} height={rh*.9} rx="3" fill="#ecebea" stroke="#8d8d8d"/><circle cx={rw*.5} cy={rh*.55} r={Math.min(rw,rh)*.27} fill="#344047" stroke="#15191b" strokeWidth="3"/><circle cx={rw*.5} cy={rh*.55} r={Math.min(rw,rh)*.18} fill="#7893a0" opacity=".55"/></>}
          {isMicrowave&&faceView&&<><rect x={rw*.05} y={rh*.08} width={rw*.9} height={rh*.84} rx="3" fill="#292b2d"/><rect x={rw*.1} y={rh*.17} width={rw*.67} height={rh*.66} rx="2" fill="#151719"/><rect x={rw*.82} y={rh*.28} width={rw*.08} height={rh*.28} rx="2" fill="#444"/></>}
          {isExtractor&&faceView&&<><path d={"M "+(rw*.18)+" "+(rh*.84)+" L "+(rw*.32)+" "+(rh*.52)+" L "+(rw*.68)+" "+(rh*.52)+" L "+(rw*.82)+" "+(rh*.84)+" Z"} fill="#777b7d" stroke="#4d5052"/><rect x={rw*.39} y={rh*.08} width={rw*.22} height={rh*.45} fill="#85898b" stroke="#5e6264"/></>}
          {isDoor&&faceView&&<><rect x={rw*.07} y={rh*.04} width={rw*.86} height={rh*.94} fill="#4b4844" stroke="#292724" strokeWidth="2"/><rect x={rw*.13} y={rh*.09} width={rw*.68} height={rh*.85} fill={fill} stroke={tc} opacity=".9"/><circle cx={rw*.72} cy={rh*.53} r="4" fill="#343434"/></>}
          {isDoor&&view==="top"&&<><line x1={rw*.08} y1={rh*.88} x2={rw*.08} y2={rh*.08} stroke="#555" strokeWidth="3"/><path d={"M "+(rw*.08)+" "+(rh*.88)+" A "+(rw*.8)+" "+(rh*.8)+" 0 0 1 "+(rw*.88)+" "+(rh*.08)} fill="none" stroke="#888" strokeDasharray="5 4"/></>}
          {isWindow&&faceView&&<><rect x={rw*.04} y={rh*.04} width={rw*.92} height={rh*.92} fill="#b6d0da" opacity=".45" stroke="#555" strokeWidth="3"/><line x1={rw*.5} y1={rh*.05} x2={rw*.5} y2={rh*.95} stroke="#666" strokeWidth="2"/><line x1={rw*.05} y1={rh*.5} x2={rw*.95} y2={rh*.5} stroke="#666" strokeWidth="2"/></>}
          {(isGlassBal||isTimberBal)&&faceView&&<>{Array.from({length:7}).map((_,n)=><line key={"bal"+n} x1={rw*n/6} x2={rw*n/6} y1={rh*.12} y2={rh*.92} stroke={isGlassBal?"#7795a1":tc} strokeWidth={isGlassBal?2:3} opacity={isGlassBal?.65:.9}/>)}<line x1="0" x2={rw} y1={rh*.1} y2={rh*.1} stroke={isGlassBal?"#555":tc} strokeWidth="4"/></>}
          {(!planOverlay&&rw>=65&&rh>=45)&&<g pointerEvents="none">
            <text x={rw/2} y={Math.max(15,rh/2-2)} textAnchor="middle" className="itemLabel" fill={planOverlay?"#292929":tc} textLength={(i.name.length+6)*6>rw-12?Math.max(40,rw-12):undefined} lengthAdjust="spacingAndGlyphs">{referenceLabel(i)} · {i.name}</text>
            {rh>=55&&<text x={rw/2} y={Math.max(30,rh/2+15)} textAnchor="middle" className="itemSub" fill={planOverlay?"#292929":tc}>{measure(r.width)} × {measure(r.height)}</text>}
          </g>}
          {sel&&<>
            <line x1="0" y1={rh+11} x2={rw} y2={rh+11} stroke="#c8102e"/><text x={rw/2} y={rh+27} textAnchor="middle" className="dim selectionDim">{measure(r.width)}</text>
            <line x1={(size.w-r.left)*scale+18} y1="0" x2={(size.w-r.left)*scale+18} y2={rh} stroke="#c8102e"/><text x={(size.w-r.left)*scale+34} y={rh/2} textAnchor="middle" className="dim selectionDim" transform={"rotate(-90 "+((size.w-r.left)*scale+34)+" "+(rh/2)+")"}>{measure(r.height)}</text>
            <text x="4" y="-10" className="dim selectionDim">{view==="front"?"X "+measure(i.x)+" · Y "+measure(i.y):view==="top"?"X "+measure(i.x)+" · Z "+measure(i.z):"Z "+measure(i.z)+" · Y "+measure(i.y)}</text>
            {view==="top"&&<text x="4" y="-24" className="dim clearanceDim">L {measure(clear.left)} · R {measure(clear.right)} · Back {measure(clear.back)} · Front {measure(clear.front)}</text>}
            <g className="rotationBadge" transform={"translate("+(rw-6)+",-18)"}><rect x="-42" y="-13" width="42" height="18" rx="5" fill="#fff" stroke="#c8102e"/><text x="-21" y="0" textAnchor="middle" className="rotationText">{rotation}°</text></g>
            {!i.locked&&<>
              <g className="resizeHandle" transform={"translate("+rw+","+rh+")"} onPointerDown={e=>begin(e,i.id,"resize")}><circle r="10" fill="#fff" stroke="#c8102e" strokeWidth="3"/><circle r="3" fill="#c8102e"/></g>
              <g className="rotateHandle" transform={"translate("+(rw/2)+",-34)"} onPointerDown={e=>begin(e,i.id,"rotate")}><line x1="0" y1="12" x2="0" y2="24" stroke="#c8102e" strokeWidth="2"/><circle r="11" fill="#fff" stroke="#c8102e" strokeWidth="2.5"/><path d="M -4 -2 A 5 5 0 1 1 3 4 M 3 4 L 3 0 M 3 4 L -1 4" fill="none" stroke="#c8102e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></g>
            </>}
          </>}
        </g>
      })}
      {!project.items.length&&<g className="emptyCanvas" pointerEvents="none"><text x={size.w*scale/2} y={size.h*scale/2-8} textAnchor="middle">Drag a component here</text><text x={size.w*scale/2} y={size.h*scale/2+16} textAnchor="middle">or click a component in the library to add it</text></g>}
    </g>
  </svg>;
}
