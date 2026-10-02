"use client";
import {useRef,useState} from "react";
import {Project,ViewMode,JoineryItem} from "@/types/model";
import {itemRect,labelFor,viewSize,svgPoint,contrastText,clampItemToRoom,validate} from "@/lib/geometry";
import {material} from "@/lib/materials";

type DragState={
  id:string;
  mode:"move"|"resize";
  start:{x:number;y:number};
  original:JoineryItem;
};

export function Drawing2D({
  project,view,selected,onSelect,onMove,onResize,onMoveStart,onContext,onDropType
}:{
  project:Project;
  view:Exclude<ViewMode,"3d">;
  selected:string|null;
  onSelect:(id:string|null)=>void;
  onMove:(id:string,x:number,y:number,z:number)=>void;
  onResize:(id:string,patch:Partial<JoineryItem>)=>void;
  onMoveStart:()=>void;
  onContext:(e:React.MouseEvent,id:string)=>void;
  onDropType:(type:string,x:number,y:number,z:number)=>void;
}){
  const ref=useRef<SVGSVGElement>(null);
  const [drag,setDrag]=useState<DragState|null>(null);
  const [guides,setGuides]=useState<{x?:number;y?:number;label?:string}>({});
  const size=viewSize(project,view),pad=76,W=1000,H=650;
  const scale=Math.min((W-pad*2)/size.w,(H-pad*2)/size.h);
  const tx=pad+(W-pad*2-size.w*scale)/2,ty=pad+(H-pad*2-size.h*scale)/2;
  const issueNames=new Set(validate(project).flatMap(msg=>project.items.filter(i=>msg.includes(i.name)).map(i=>i.id)));

  const begin=(e:React.PointerEvent,id:string,mode:"move"|"resize")=>{
    e.preventDefault();e.stopPropagation();
    const i=project.items.find(x=>x.id===id);
    if(!i||i.locked||!ref.current)return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    onMoveStart();
    setDrag({id,mode,start:svgPoint(ref.current,e.clientX,e.clientY),original:{...i}});
    onSelect(id);
  };

  const move=(e:React.PointerEvent)=>{
    if(!drag||!ref.current)return;
    const q=svgPoint(ref.current,e.clientX,e.clientY);
    const dx=(q.x-drag.start.x)/scale,dy=(q.y-drag.start.y)/scale;
    const i=drag.original;
    if(drag.mode==="move"){
      let candidate={...i};
      if(view==="front")candidate={...candidate,x:i.x+dx,y:i.y-dy};
      if(view==="top")candidate={...candidate,x:i.x+dx,z:i.z-dy};
      if(view==="side")candidate={...candidate,y:i.y-dy,z:i.z+dx};
      candidate=clampItemToRoom(candidate,project);
      let r=itemRect(candidate,project,view);
      const others=project.items.filter(o=>o.id!==i.id);
      let gx:number|undefined,gy:number|undefined,label:string|undefined;
      const threshold=Math.max(20,project.rules.snap*.6);
      let bestX=threshold+1,bestY=threshold+1,deltaX=0,deltaY=0;
      const cx=[r.left,r.left+r.width/2,r.left+r.width],cy=[r.top,r.top+r.height/2,r.top+r.height];
      for(const o of others){
        const or=itemRect(o,project,view);
        const xs=[or.left,or.left+or.width/2,or.left+or.width],ys=[or.top,or.top+or.height/2,or.top+or.height];
        for(const a of cx)for(const b of xs){const d=b-a;if(Math.abs(d)<bestX&&Math.abs(d)<=threshold){bestX=Math.abs(d);deltaX=d;gx=b;label="Snap"}}
        for(const a of cy)for(const b of ys){const d=b-a;if(Math.abs(d)<bestY&&Math.abs(d)<=threshold){bestY=Math.abs(d);deltaY=d;gy=b;label="Snap"}}
      }
      if(bestX<=threshold){
        if(view==="front"||view==="top")candidate.x+=deltaX;
        else candidate.z+=deltaX;
      }
      if(bestY<=threshold){
        if(view==="front"||view==="side")candidate.y-=deltaY;
        else candidate.z-=deltaY;
      }
      candidate=clampItemToRoom(candidate,project);
      r=itemRect(candidate,project,view);
      setGuides({x:gx,y:gy,label});
      onMove(i.id,candidate.x,candidate.y,candidate.z);
      return;
    }
    const min=100;
    let candidate={...i};
    if(view==="front")candidate={...candidate,width:Math.max(min,i.width+dx),height:Math.max(min,i.height+dy)};
    if(view==="top")candidate={...candidate,width:Math.max(min,i.width+dx),depth:Math.max(min,i.depth+dy)};
    if(view==="side")candidate={...candidate,depth:Math.max(min,i.depth+dx),height:Math.max(min,i.height+dy)};
    candidate=clampItemToRoom(candidate,project);
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
      <pattern id="minorGrid" width={50*scale} height={50*scale} patternUnits="userSpaceOnUse"><path d={"M "+(50*scale)+" 0L0 0 0 "+(50*scale)} fill="none" stroke="#efede9" strokeWidth=".7"/></pattern>
      <pattern id="grid" width={500*scale} height={500*scale} patternUnits="userSpaceOnUse"><rect width={500*scale} height={500*scale} fill="url(#minorGrid)"/><path d={"M "+(500*scale)+" 0L0 0 0 "+(500*scale)} fill="none" stroke="#ddd9d2" strokeWidth="1.2"/></pattern>
      <filter id="selectionShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity=".2"/></filter>
    </defs>
    <text x={tx} y={34} className="viewTitle">{view==="front"?"FRONT ELEVATION":view==="top"?"PLAN VIEW":"SIDE ELEVATION"}</text>
    <text x={tx} y={52} className="viewHint">Click to select · drag to move · drag corner handle to resize</text>
    <g transform={"translate("+tx+","+ty+")"}>
      <rect className="roomCanvas" width={size.w*scale} height={size.h*scale} fill="url(#grid)" stroke="#383838" strokeWidth="2" onPointerDown={e=>{e.stopPropagation();onSelect(null)}}/>
      <line x1="0" y1={size.h*scale+25} x2={size.w*scale} y2={size.h*scale+25} stroke="#777"/>
      <line x1="0" y1={size.h*scale+19} x2="0" y2={size.h*scale+31} stroke="#777"/><line x1={size.w*scale} y1={size.h*scale+19} x2={size.w*scale} y2={size.h*scale+31} stroke="#777"/>
      <text x={size.w*scale/2} y={size.h*scale+47} textAnchor="middle" className="dim">{size.w} mm</text>
      <line x1="-25" y1="0" x2="-25" y2={size.h*scale} stroke="#777"/>
      <line x1="-31" y1="0" x2="-19" y2="0" stroke="#777"/><line x1="-31" y1={size.h*scale} x2="-19" y2={size.h*scale} stroke="#777"/>
      <text x="-43" y={size.h*scale/2} transform={"rotate(-90 -43 "+(size.h*scale/2)+")"} textAnchor="middle" className="dim">{size.h} mm</text>
      {guides.x!==undefined&&<><line className="snapGuide" x1={guides.x*scale} x2={guides.x*scale} y1="0" y2={size.h*scale}/><text className="snapHint" x={guides.x*scale+8} y="18">{guides.label}</text></>}
      {guides.y!==undefined&&<><line className="snapGuide" x1="0" x2={size.w*scale} y1={guides.y*scale} y2={guides.y*scale}/><text className="snapHint" x="8" y={guides.y*scale-8}>{guides.label}</text></>}
      {project.items.map(i=>{
        const r=itemRect(i,project,view),sel=i.id===selected,invalid=issueNames.has(i.id),fill=material(i.materialId).colour,tc=contrastText(fill),rw=r.width*scale,rh=r.height*scale,isDrawer=i.type==="Drawer unit"||i.type==="Media unit",hasPlinth=["Wardrobe","Base cabinet","Tall cabinet","Drawer unit","Media unit","Sink base","Hob base","Kitchen island"].includes(i.type),plinthPx=hasPlinth?Math.min(rh*.14,100*scale):0,isStair=["Straight staircase","L staircase","U staircase"].includes(i.type),isBed=i.type==="Bed",isSink=i.type==="Sink base",isHob=i.type==="Hob base",isOven=i.type==="Oven tower";
        return <g key={i.id} className={"drawingItem "+(sel?"selected ":"")+(invalid?"invalid ":"")} transform={"translate("+(r.left*scale)+","+(r.top*scale)+")"}
          onPointerDown={e=>begin(e,i.id,"move")}
          onContextMenu={e=>{e.preventDefault();e.stopPropagation();onContext(e,i.id)}}
          style={{cursor:i.locked?"not-allowed":drag?.id===i.id?"grabbing":"grab"}}>
          <rect className="itemBody" width={rw} height={rh} rx="2" fill={fill} stroke={invalid?"#e15544":sel?"#c8102e":i.edgeBanding==="None / raw"?"#777":"#292929"} strokeWidth={sel?4:invalid?3:i.edgeBanding.includes("2mm")?3:1.5} filter={sel?"url(#selectionShadow)":undefined}/>
          {view==="front"&&i.doors===0&&Array.from({length:Math.max(0,i.shelves)}).map((_,n)=><line key={"s"+n} x1="0" x2={rw} y1={rh*(n+1)/(i.shelves+1)} y2={rh*(n+1)/(i.shelves+1)} stroke={tc} opacity=".58"/>)}
          {view==="front"&&!isDrawer&&i.doors>1&&Array.from({length:i.doors-1}).map((_,n)=><line key={"d"+n} y1="2" y2={rh-plinthPx-2} x1={rw*(n+1)/i.doors} x2={rw*(n+1)/i.doors} stroke={tc} opacity=".72"/>)}
          {view==="front"&&isDrawer&&i.doors>1&&Array.from({length:i.doors-1}).map((_,n)=><line key={"dr"+n} x1="2" x2={rw-2} y1={(rh-plinthPx)*(n+1)/i.doors} y2={(rh-plinthPx)*(n+1)/i.doors} stroke={tc} opacity=".72"/>)}
          {view==="front"&&hasPlinth&&<><line x1="0" x2={rw} y1={rh-plinthPx} y2={rh-plinthPx} stroke={tc} opacity=".5"/><rect x={rw*.06} y={rh-plinthPx} width={rw*.88} height={plinthPx} fill={fill} opacity=".78"/></>}
          {view==="front"&&i.doors>0&&!isDrawer&&i.hardware!=="None"&&i.hardware!=="Push-to-open"&&Array.from({length:i.doors}).map((_,n)=>{const dw=rw/i.doors,x=dw*n+dw*(n<i.doors/2?.82:.18);return <line key={"h"+n} x1={x} x2={x} y1={(rh-plinthPx)*.42} y2={(rh-plinthPx)*.58} stroke={tc} strokeWidth="2.4" opacity=".85"/>})}
          {view==="front"&&isDrawer&&i.hardware!=="None"&&i.hardware!=="Push-to-open"&&Array.from({length:Math.max(1,i.doors)}).map((_,n)=>{const fh=(rh-plinthPx)/Math.max(1,i.doors),y=fh*n+fh*.32;return <line key={"dh"+n} x1={rw*.42} x2={rw*.58} y1={y} y2={y} stroke={tc} strokeWidth="2.4" opacity=".85"/>})}
          {isStair&&view==="side"&&Array.from({length:13}).map((_,n)=>{const x=rw*n/13,y=rh-rh*(n+1)/13;return <path key={"st"+n} d={"M "+x+" "+rh+" V "+y+" H "+(rw*(n+1)/13)} fill="none" stroke={tc} strokeWidth="1.6" opacity=".9"/>})}
          {isStair&&view==="top"&&Array.from({length:13}).map((_,n)=><line key={"pt"+n} x1="0" x2={rw} y1={rh*(n+1)/13} y2={rh*(n+1)/13} stroke={tc} strokeWidth="1.3" opacity=".75"/>)}
          {isBed&&view==="top"&&<><rect x={rw*.04} y={rh*.04} width={rw*.92} height={rh*.92} rx="8" fill="#f1eee8" stroke="#a79e91"/><rect x={rw*.12} y={rh*.08} width={rw*.34} height={rh*.18} rx="8" fill="#fff" stroke="#bbb4aa"/><rect x={rw*.54} y={rh*.08} width={rw*.34} height={rh*.18} rx="8" fill="#fff" stroke="#bbb4aa"/></>}
          {isSink&&view==="top"&&<ellipse cx={rw/2} cy={rh*.45} rx={rw*.28} ry={rh*.26} fill="#8f9699" stroke="#52585c" strokeWidth="1.5"/>}
          {isHob&&view==="top"&&<><rect x={rw*.2} y={rh*.18} width={rw*.6} height={rh*.64} rx="4" fill="#181a1c"/>{[[.35,.35],[.65,.35],[.35,.65],[.65,.65]].map((p,n)=><circle key={n} cx={rw*p[0]} cy={rh*p[1]} r={Math.min(rw,rh)*.08} fill="none" stroke="#5b6064" strokeWidth="2"/>)}</>}
          {isOven&&view==="front"&&<><rect x={rw*.12} y={rh*.36} width={rw*.76} height={rh*.26} rx="3" fill="#17191b" stroke="#0c0d0e"/><line x1={rw*.24} x2={rw*.76} y1={rh*.41} y2={rh*.41} stroke="#777" strokeWidth="2"/></>}
          <text x={rw/2} y={Math.max(15,rh/2-2)} textAnchor="middle" className="itemLabel" fill={tc}>{i.name}</text>
          <text x={rw/2} y={Math.max(30,rh/2+15)} textAnchor="middle" className="itemSub" fill={tc}>{labelFor(i,view)}</text>
          {sel&&<>
            <line x1="0" y1={rh+11} x2={rw} y2={rh+11} stroke="#c8102e"/><text x={rw/2} y={rh+27} textAnchor="middle" className="dim selectionDim">{view==="side"?i.depth:i.width} mm</text>
            <line x1={rw+11} y1="0" x2={rw+11} y2={rh} stroke="#c8102e"/><text x={rw+27} y={rh/2} textAnchor="middle" className="dim selectionDim" transform={"rotate(-90 "+(rw+27)+" "+(rh/2)+")"}>{view==="top"?i.depth:i.height} mm</text>
            <text x="4" y="-10" className="dim selectionDim">{view==="front"?"X "+i.x+" · Y "+i.y:view==="top"?"X "+i.x+" · Z "+i.z:"Z "+i.z+" · Y "+i.y}</text>
            {!i.locked&&<g className="resizeHandle" transform={"translate("+rw+","+rh+")"} onPointerDown={e=>begin(e,i.id,"resize")}><circle r="10" fill="#fff" stroke="#c8102e" strokeWidth="3"/><circle r="3" fill="#c8102e"/></g>}
          </>}
        </g>
      })}
      {!project.items.length&&<g className="emptyCanvas" pointerEvents="none"><text x={size.w*scale/2} y={size.h*scale/2-8} textAnchor="middle">Drag a component here</text><text x={size.w*scale/2} y={size.h*scale/2+16} textAnchor="middle">or click a component in the library to add it</text></g>}
    </g>
  </svg>;
}
