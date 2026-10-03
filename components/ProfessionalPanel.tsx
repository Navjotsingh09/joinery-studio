"use client";
import {useEffect,useMemo,useState} from "react";
import {Project,JoineryItem} from "@/types/model";
import {useStudio} from "@/lib/store";
import {newItem} from "@/lib/defaults";
import {canPlace,clampItemToRoom,footprint,mirrorItem,normalizeRotation,snapItemToWall,stairMetrics,wallClearances,WallSide} from "@/lib/geometry";

const stairTypes=new Set(["Straight staircase","L staircase","U staircase"]);
const wardrobeTypes=new Set(["Wardrobe","Sliding wardrobe"]);
const baseTypes=new Set(["Base cabinet","Drawer unit","Sink base","Hob base","Corner cabinet","Dishwasher","Washing machine","Filler panel","End panel"]);

export function ProfessionalPanel({project}:{project:Project}){
  const s=useStudio();
  const [ids,setIds]=useState<string[]>([]);
  const [message,setMessage]=useState("");
  useEffect(()=>{setIds(v=>v.filter(id=>project.items.some(i=>i.id===id)))},[project.id,project.items.length]);
  useEffect(()=>{if(s.selectedId&&project.items.some(i=>i.id===s.selectedId))setIds(v=>v.includes(s.selectedId!)?v:[s.selectedId!])},[s.selectedId,project.id]);
  const picked=useMemo(()=>project.items.filter(i=>ids.includes(i.id)),[project.items,ids]);
  const primary=picked[0]??project.items.find(i=>i.id===s.selectedId);
  const clear=primary?wallClearances(project,primary):null;
  const stairs=primary&&stairTypes.has(primary.type)?stairMetrics(primary):null;
  const pairGap=useMemo(()=>{
    if(picked.length!==2)return null;const [a,b]=picked,A=footprint(a),B=footprint(b);
    const gapX=Math.max(0,b.x-(a.x+A.width),a.x-(b.x+B.width)),gapZ=Math.max(0,b.z-(a.z+A.depth),a.z-(b.z+B.depth));
    return{gapX,gapZ,centre:Math.round(Math.hypot((a.x+A.width/2)-(b.x+B.width/2),(a.z+A.depth/2)-(b.z+B.depth/2)))}
  },[picked]);
  const toggle=(id:string)=>{setIds(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);s.select(id)};
  const apply=(fn:(i:JoineryItem)=>Partial<JoineryItem>)=>{if(!picked.length)return; s.updateItems(picked.map(i=>i.id),fn);setMessage("Updated "+picked.length+" item"+(picked.length===1?"":"s")+".")};
  const wall=(side:WallSide)=>{
    if(!primary)return;
    const q=snapItemToWall(project,primary,side);
    if(canPlace(project,q,primary.id)){s.updateItem(primary.id,q);setMessage(primary.name+" snapped to "+side+" wall.")}
    else setMessage("Wall snap blocked by another object or clearance rule.");
  };
  const mirror=(axis:"x"|"z")=>{
    if(!primary)return;
    const q=mirrorItem(project,primary,axis);
    if(canPlace(project,q,primary.id)){s.updateItem(primary.id,q);setMessage("Mirrored "+primary.name+".")}
    else setMessage("Mirror blocked by another object.");
  };
  const group=()=>{if(picked.length<2)return setMessage("Select at least two items.");const groupId=crypto.randomUUID();apply(()=>({groupId}));setMessage("Grouped "+picked.length+" items.");};
  const distribute=()=>{
    if(picked.length<3)return setMessage("Select at least three items to distribute.");
    const ordered=[...picked].sort((a,b)=>a.x-b.x),first=ordered[0],last=ordered[ordered.length-1],span=last.x-first.x;
    const positions=new Map(ordered.map((i,n)=>[i.id,Math.round(first.x+span*n/(ordered.length-1))]));
    s.updateItems(ordered.map(i=>i.id),i=>({x:positions.get(i.id)??i.x}));
    setMessage("Distributed "+ordered.length+" items evenly across X.");
  };
  const copyAlongWall=()=>{
    if(!primary)return;
    const step=footprint(primary).width+Math.max(project.rules.componentGap,project.rules.snap),temp={...project,items:[...project.items]},made:JoineryItem[]=[];
    for(let n=1;n<=12;n++){
      const q=clampItemToRoom({...primary,id:crypto.randomUUID(),name:primary.name+" "+(n+1),x:primary.x+step*n,groupId:primary.groupId},temp);
      if(q.x<=primary.x||temp.items.some(x=>x.id!==primary.id&&x.x===q.x&&x.z===q.z))break;
      if(!canPlace(temp,q))break;
      temp.items.push(q);made.push(q);
    }
    made.forEach(i=>s.addItem(i));
    setMessage(made.length?"Added "+made.length+" copies along the wall.":"No clear space for another copy.");
  };
  const makeWorktop=()=>{
    const bases=project.items.filter(i=>baseTypes.has(i.type)&&i.visible!==false&&i.z<250);
    if(!bases.length)return setMessage("No back-wall base cabinet run found.");
    const minX=Math.min(...bases.map(i=>i.x)),maxX=Math.max(...bases.map(i=>i.x+footprint(i).width)),top=Math.max(...bases.map(i=>i.y+i.height)),depth=Math.max(...bases.map(i=>footprint(i).depth));
    const existing=project.items.find(i=>i.type==="Worktop"&&Math.abs(i.x-minX)<100);
    const q={...newItem("Worktop"),id:existing?.id??crypto.randomUUID(),name:"Continuous worktop",x:minX,y:top,z:0,width:maxX-minX,height:38,depth:depth+40,materialId:"stone-light",layer:"Joinery" as const};
    existing?s.updateItem(existing.id,q):s.addItem(q);
    setMessage("Continuous worktop generated across "+(maxX-minX)+" mm.");
  };
  const addWardrobeInternals=()=>{
    if(!primary||!wardrobeTypes.has(primary.type))return setMessage("Select a wardrobe first.");
    if(normalizeRotation(primary.rotation)%180!==0)return setMessage("Rotate the wardrobe to 0° or 180° before auto-fitting internals.");
    const groupId=crypto.randomUUID(),pad=50,innerW=Math.max(300,primary.width-pad*2);
    const rail={...newItem("Hanging rail"),id:crypto.randomUUID(),name:primary.name+" hanging rail",x:primary.x+pad,y:primary.y+Math.min(primary.height-350,1450),z:primary.z+Math.max(40,primary.depth*.42),width:innerW,groupId};
    const drawers={...newItem("Internal drawers"),id:crypto.randomUUID(),name:primary.name+" internal drawers",x:primary.x+pad,y:primary.y+100,z:primary.z+60,width:Math.min(innerW,800),depth:Math.max(300,primary.depth-120),groupId};
    const loft={...newItem("Loft box"),id:crypto.randomUUID(),name:primary.name+" loft box",x:primary.x+pad,y:primary.y+Math.max(1200,primary.height-480),z:primary.z+50,width:innerW,height:380,depth:Math.max(300,primary.depth-100),groupId};
    [rail,drawers,loft].forEach(i=>s.addItem(clampItemToRoom(i,project)));
    setMessage("Added hanging rail, internal drawers and loft storage.");
  };
  return <section className="proPanel">
    <div className="proIntro"><b>Professional edit</b><p>Select one or more objects, then use real-world placement and batch tools.</p></div>
    <details open><summary>Selection <span>{picked.length}</span></summary>
      <div className="proObjectList">{project.items.map(i=><label key={i.id} className={(ids.includes(i.id)?"picked ":"")+(i.visible===false?"hiddenItem":"")}><input type="checkbox" checked={ids.includes(i.id)} onChange={()=>toggle(i.id)}/><span><b>{i.name}</b><small>{i.layer??"Joinery"} · {i.visible===false?"Hidden":"Visible"}{i.locked?" · Locked":""}</small></span></label>)}</div>
      <div className="proButtonRow"><button onClick={()=>setIds(project.items.map(i=>i.id))}>All</button><button onClick={()=>setIds([])}>Clear</button></div>
    </details>
    <details open><summary>Place & measure</summary>
      {primary?<><div className="proPrimary"><b>{primary.name}</b><small>{primary.width} × {primary.height} × {primary.depth} mm</small></div>
      {clear&&<div className="clearanceGrid"><span>Left<b>{clear.left} mm</b></span><span>Right<b>{clear.right} mm</b></span><span>Back<b>{clear.back} mm</b></span><span>Front<b>{clear.front} mm</b></span><span>Top<b>{clear.top} mm</b></span><span>Floor<b>{clear.bottom} mm</b></span></div>}
      {pairGap&&<div className="pairMeasure"><b>Between selected objects</b><span>X gap {pairGap.gapX} mm · Z gap {pairGap.gapZ} mm · centre-to-centre {pairGap.centre} mm</span></div>}
      <small className="proLabel">Snap to room wall</small><div className="proButtonGrid"><button onClick={()=>wall("back")}>Back</button><button onClick={()=>wall("front")}>Front</button><button onClick={()=>wall("left")}>Left</button><button onClick={()=>wall("right")}>Right</button></div>
      <div className="proButtonRow"><button onClick={()=>mirror("x")}>Mirror L/R</button><button onClick={()=>mirror("z")}>Mirror F/B</button><button onClick={copyAlongWall}>Auto-fill wall</button></div></>:<small className="muted">Select an object to see clearances.</small>}
    </details>
    <details><summary>Batch edit</summary>
      <div className="proButtonGrid"><button onClick={()=>apply(i=>({x:picked[0]?.x??i.x}))}>Align X</button><button onClick={()=>apply(i=>({z:picked[0]?.z??i.z}))}>Align Z</button><button onClick={distribute}>Distribute X</button><button onClick={group}>Group</button><button onClick={()=>apply(()=>({groupId:undefined}))}>Ungroup</button><button onClick={()=>apply(()=>({locked:true}))}>Lock</button><button onClick={()=>apply(()=>({locked:false}))}>Unlock</button><button onClick={()=>apply(()=>({visible:false}))}>Hide</button><button onClick={()=>apply(()=>({visible:true}))}>Show</button><button onClick={()=>{s.copyItems(picked.map(i=>i.id));setMessage("Copied "+picked.length+" item"+(picked.length===1?"":"s")+" to the project clipboard.")}}>Copy</button><button onClick={()=>{s.pasteItems();setMessage("Pasted clipboard items into this project.")}}>Paste</button></div>
      <button className="proDanger" onClick={()=>{if(picked.length&&confirm("Delete "+picked.length+" selected item"+(picked.length===1?"":"s")+"?")){s.deleteItems(picked.map(i=>i.id));setIds([])}}}>Delete selected</button>
    </details>
    <details open><summary>Joinery intelligence</summary>
      <button className="proWide" onClick={makeWorktop}>Generate continuous kitchen worktop</button>
      <button className="proWide" onClick={addWardrobeInternals}>Auto-fit selected wardrobe internals</button>
      {stairs&&<div className={"stairMetrics "+(stairs.review?"needsReview":"")}><b>Stair geometry</b><div><span>Risers<strong>{stairs.risers}</strong></span><span>Rise<strong>{stairs.rise} mm</strong></span><span>Going<strong>{stairs.going} mm</strong></span><span>Pitch<strong>{stairs.pitch}°</strong></span></div><small>{stairs.review?"Review these proportions before manufacture.":"Proportions look workable."} Planning aid only — verify site dimensions and applicable regulations.</small></div>}
    </details>
    {message&&<div className="proMessage">{message}</div>}
  </section>
}
