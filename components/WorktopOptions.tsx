"use client";
import {MeasureInput} from "./MeasureInput";
import {useState} from "react";
import {material} from "@/lib/materials";
import {JoineryItem,Material} from "@/types/model";

export function WorktopOptions({item,materials,onChange}:{item:JoineryItem;materials:Material[];onChange:(patch:Partial<JoineryItem>)=>void}){
  const [base,setBase]=useState(""),[style,setStyle]=useState(""),[colour,setColour]=useState("");
  const options=materials.filter(m=>m.category==="Worktop"||m.category==="Custom");
  const visible=options.filter(m=>(!base||m.worktopMaterial===base)&&(!style||m.worktopStyle===style)&&(!colour||m.colourFamily===colour));
  const values=(key:"worktopMaterial"|"worktopStyle"|"colourFamily")=>Array.from(new Set(options.map(m=>m[key]).filter((v):v is string=>!!v))).sort();
  const current=material(item.worktopMaterialId??item.materialId,materials);
  return <div className="worktopOptions">
    <p className="surfaceHelp">Choose the actual material separately from its appearance. These are generic design finishes.</p>
    <label>Worktop material type<select value={base} onChange={e=>setBase(e.target.value)}><option value="">All materials</option>{values("worktopMaterial").map(v=><option key={v}>{v}</option>)}</select></label>
    <div className="fieldGrid2"><label>Worktop style<select value={style} onChange={e=>setStyle(e.target.value)}><option value="">All styles</option>{values("worktopStyle").map(v=><option key={v}>{v}</option>)}</select></label><label>Worktop colour<select value={colour} onChange={e=>setColour(e.target.value)}><option value="">All colours</option>{values("colourFamily").map(v=><option key={v}>{v}</option>)}</select></label></div>
    <div className="worktopSwatches">{visible.map(m=><button key={m.id} className={current.id===m.id?"active":""} aria-pressed={current.id===m.id} onClick={()=>onChange({materialId:m.id,worktopMaterialId:m.id,height:m.thickness,finish:m.surfaceFinish??"Matt"})}><i style={{background:m.colour,backgroundImage:m.textureDataUrl?`url(${m.textureDataUrl})`:undefined}}/><span>{m.name}<small>{m.thickness} mm · {m.worktopMaterial??m.category}</small></span></button>)}</div>
    {!visible.length&&<p role="status">No finishes match these filters. Choose All materials, styles or colours to see more.</p>}
    <p className="surfaceHelp">Selected: {current.name}</p>
    <label>Worktop thickness (mm)<MeasureInput min={6} max={100} value={item.height} onCommit={height=>onChange({height})}/></label>
    <label>Worktop edge profile<select value={item.worktopEdge??"rounded"} onChange={e=>onChange({worktopEdge:e.target.value as "square"|"rounded"})}><option value="square">Square</option><option value="rounded">Rounded</option></select></label>
    <fieldset><legend>Finished edges</legend>{(["front","back","left","right"] as const).map(edge=><label key={edge} className="checkRow"><input type="checkbox" checked={(item.worktopFinishedEdges??["front","left","right"]).includes(edge)} onChange={e=>{const edges=item.worktopFinishedEdges??["front","left","right"];onChange({worktopFinishedEdges:e.target.checked?[...edges,edge]:edges.filter(v=>v!==edge)})}}/>{edge}</label>)}</fieldset>
    <label>Worktop surface finish<select value={["Matt","Textured matt","Semi-gloss","Gloss","Oiled"].includes(item.finish)?item.finish:"Matt"} onChange={e=>onChange({finish:e.target.value})}>{["Matt","Textured matt","Semi-gloss","Gloss","Oiled"].map(v=><option key={v}>{v}</option>)}</select></label>
  </div>;
}
