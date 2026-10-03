"use client";
import {useState} from "react";
import {JoineryItem,Material} from "@/types/model";
import {SPLASHBACK_MATERIALS} from "@/lib/splashbacks";

export function SplashbackOptions({item,materials,onChange}:{item:JoineryItem;materials:Material[];onChange:(patch:Partial<JoineryItem>)=>void}){
  const [search,setSearch]=useState(""),[finish,setFinish]=useState(""),[brand,setBrand]=useState(""),[room,setRoom]=useState("");
  const selected=materials.find(m=>m.id===item.materialId);
  const choices=SPLASHBACK_MATERIALS.filter(m=>(!finish||m.splashbackFinish===finish)&&(!brand||m.supplier===brand)&&(!room||m.splashbackRoom===room)&&`${m.name} ${m.supplier} ${m.splashbackFinish}`.toLowerCase().includes(search.toLowerCase()));
  const apply=(m:Material)=>onChange({materialId:m.id,depth:m.thickness,finish:m.surfaceFinish});
  return <div className="splashbackOptions">
    <label>Backsplash material<select value={item.materialId} onChange={e=>{const m=materials.find(x=>x.id===e.target.value);if(m)apply(m)}}>{materials.map(m=><option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}</select></label>
    <p className="surfaceHelp">69 supplier glass splashbacks. Marble and patterned kitchen designs use photographic texture samples. Full printed layouts and colours remain approximate. Custom images and other materials remain available above.</p>
    <label>Search splashbacks<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Sage, marble, Laura Ashley…"/></label>
    <div className="fieldGrid2"><label>Finish<select value={finish} onChange={e=>setFinish(e.target.value)}><option value="">All finishes</option>{Array.from(new Set(SPLASHBACK_MATERIALS.map(m=>m.splashbackFinish))).sort().map(v=><option key={v}>{v}</option>)}</select></label><label>Range<select value={brand} onChange={e=>setBrand(e.target.value)}><option value="">All ranges</option>{Array.from(new Set(SPLASHBACK_MATERIALS.map(m=>m.supplier))).sort().map(v=><option key={v}>{v}</option>)}</select></label></div>
    <label>Product range<select value={room} onChange={e=>setRoom(e.target.value)}><option value="">Kitchen & bathroom</option><option>Kitchen</option><option>Bathroom</option></select></label>
    <small className="surfaceHelp">{choices.length} matching splashbacks</small>
    <div className="splashbackGrid">{choices.map(m=><button key={m.id} className={item.materialId===m.id?"selectedMaterial":""} aria-pressed={item.materialId===m.id} onClick={()=>apply(m)}><img src={m.previewImage} alt={m.name} loading="lazy" width="160" height="210"/><span>{m.name.replace(" Self-Adhesive Glass Splashback","").replace(" Self-Adhesive Glass Bathroom Splashback"," · Bathroom")}<small>{m.splashbackFinish} · {m.thickness} mm glass</small></span></button>)}</div>
    {selected?.supplierUrl&&<a href={selected.supplierUrl} target="_blank" rel="noopener noreferrer">View selected product at Splashback.co.uk ↗</a>}
  </div>;
}
