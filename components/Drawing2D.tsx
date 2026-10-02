"use client";
import {useRef,useState} from "react";
import {Project,ViewMode} from "@/types/model";
import {itemRect,labelFor,viewSize,svgPoint,contrastText,clampItemToRoom,canPlace} from "@/lib/geometry";
import {material} from "@/lib/materials";

export function Drawing2D({project,view,selected,onSelect,onMove,onMoveStart,onContext}:{project:Project;view:Exclude<ViewMode,"3d">;selected:string|null;onSelect:(id:string|null)=>void;onMove:(id:string,x:number,y:number,z:number)=>void;onMoveStart:()=>void;onContext:(e:React.MouseEvent,id:string)=>void}){
  const ref=useRef<SVGSVGElement>(null);
  const [drag,setDrag]=useState<{id:string;start:{x:number;y:number};ox:number;oy:number;oz:number}|null>(null);
  const size=viewSize(project,view), pad=70, W=1000, H=650;
  const scale=Math.min((W-pad*2)/size.w,(H-pad*2)/size.h);
  const tx=pad+(W-pad*2-size.w*scale)/2, ty=pad+(H-pad*2-size.h*scale)/2;

  const down=(e:React.PointerEvent,id:string)=>{
    e.stopPropagation();
    const i=project.items.find(x=>x.id===id);
    if(!i||i.locked||!ref.current)return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    onMoveStart();
    setDrag({id,start:svgPoint(ref.current,e.clientX,e.clientY),ox:i.x,oy:i.y,oz:i.z});
    onSelect(id);
  };

  const move=(e:React.PointerEvent)=>{
    if(!drag||!ref.current)return;
    const i=project.items.find(x=>x.id===drag.id);
    if(!i)return;
    const q=svgPoint(ref.current,e.clientX,e.clientY);
    const dx=(q.x-drag.start.x)/scale,dy=(q.y-drag.start.y)/scale;
    let candidate={...i};
    if(view==="front")candidate={...candidate,x:drag.ox+dx,y:drag.oy-dy};
    if(view==="top")candidate={...candidate,x:drag.ox+dx,z:drag.oz-dy};
    if(view==="side")candidate={...candidate,y:drag.oy-dy,z:drag.oz+dx};
    candidate=clampItemToRoom(candidate,project);
    if(canPlace(project,candidate,i.id))onMove(i.id,candidate.x,candidate.y,candidate.z);
  };

  return <svg ref={ref} className="drawing" viewBox={"0 0 "+W+" "+H} onPointerMove={move} onPointerUp={()=>setDrag(null)} onPointerCancel={()=>setDrag(null)} onPointerDown={()=>onSelect(null)}>
    <defs><pattern id="grid" width={100*scale} height={100*scale} patternUnits="userSpaceOnUse"><path d={"M "+(100*scale)+" 0L0 0 0 "+(100*scale)} fill="none" stroke="#ece9e4"/></pattern></defs>
    <g transform={"translate("+tx+","+ty+")"}>
      <rect width={size.w*scale} height={size.h*scale} fill="url(#grid)" stroke="#222" strokeWidth="2"/>
      <line x1="0" y1={size.h*scale+25} x2={size.w*scale} y2={size.h*scale+25} stroke="#777"/>
      <text x={size.w*scale/2} y={size.h*scale+45} textAnchor="middle" className="dim">{size.w} mm</text>
      <line x1="-25" y1="0" x2="-25" y2={size.h*scale} stroke="#777"/>
      <text x="-40" y={size.h*scale/2} transform={"rotate(-90 -40 "+(size.h*scale/2)+")"} textAnchor="middle" className="dim">{size.h} mm</text>
      {project.items.map(i=>{
        const r=itemRect(i,project,view), sel=i.id===selected, fill=material(i.materialId).colour, tc=contrastText(fill), rw=r.width*scale, rh=r.height*scale;
        return <g key={i.id} transform={"translate("+(r.left*scale)+","+(r.top*scale)+")"} onPointerDown={e=>down(e,i.id)} onContextMenu={e=>{e.preventDefault();e.stopPropagation();onContext(e,i.id)}} style={{cursor:i.locked?"not-allowed":"move"}}>
          <rect width={rw} height={rh} fill={fill} stroke={sel?"#c8102e":i.edgeBanding==="None / raw"?"#777":"#222"} strokeWidth={sel?4:i.edgeBanding.includes("2mm")?3:1.5}/>
          {view==="front"&&Array.from({length:Math.max(0,i.shelves)}).map((_,n)=><line key={"s"+n} x1="0" x2={rw} y1={rh*(n+1)/(i.shelves+1)} y2={rh*(n+1)/(i.shelves+1)} stroke={tc} opacity=".55"/>)}
          {view==="front"&&Array.from({length:Math.max(0,i.doors-1)}).map((_,n)=><line key={"d"+n} y1="0" y2={rh} x1={rw*(n+1)/i.doors} x2={rw*(n+1)/i.doors} stroke={tc} opacity=".7"/>)}
          <text x={rw/2} y={Math.max(15,rh/2)} textAnchor="middle" className="itemLabel" fill={tc}>{i.name}</text>
          <text x={rw/2} y={Math.max(30,rh/2+16)} textAnchor="middle" className="itemSub" fill={tc}>{labelFor(i,view)}</text>
          {sel&&<><line x1="0" y1={rh+9} x2={rw} y2={rh+9} stroke="#c8102e"/><text x={rw/2} y={rh+24} textAnchor="middle" className="dim" fill="#c8102e">{view==="side"?i.depth:i.width} mm</text></>}
        </g>
      })}
    </g>
  </svg>;
}