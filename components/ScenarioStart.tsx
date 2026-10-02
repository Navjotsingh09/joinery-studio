"use client";
import {useMemo,useState} from "react";
import {createScenarioPlan,DESIGN_KINDS,DesignKind,ScenarioPlan} from "@/lib/scenarios";

export function ScenarioStart({onCreate}:{onCreate:(plan:ScenarioPlan)=>void}){
  const [kind,setKind]=useState<DesignKind|null>(null);
  const [scenario,setScenario]=useState<string|null>(null);
  const [room,setRoom]=useState({width:4200,height:2400,depth:3200});
  const choice=useMemo(()=>DESIGN_KINDS.find(x=>x.id===kind),[kind]);

  const resetForKind=(k:DesignKind)=>{
    setKind(k);setScenario(null);
    if(k==="kitchen")setRoom({width:4200,height:2400,depth:3400});
    if(k==="bedroom")setRoom({width:4200,height:2400,depth:3600});
    if(k==="stairs")setRoom({width:3200,height:2600,depth:4200});
  };

  return <div className="scenarioStart">
    <div className="scenarioHero">
      <div className="brand large"><b>JOINERY</b><span>STUDIO</span></div>
      <p className="eyebrow">{scenario?"ROOM SETUP":kind?"CHOOSE A LAYOUT":"NEW DESIGN"}</p>
      <h1>{scenario?"Set the real room size":kind?"How should the "+choice?.title.toLowerCase()+" start?":"What do you want to design?"}</h1>
      <p>{scenario?"Enter the room dimensions in millimetres. We will build a realistic starter layout that you can edit immediately.":kind?"Choose a starting scenario. You can change every cabinet, material and dimension afterwards.":"Start from a real-world scenario instead of an empty generic canvas."}</p>
    </div>

    {!kind&&<div className="designKindGrid">
      {DESIGN_KINDS.map(k=><button key={k.id} className={"designKindCard "+k.id} onClick={()=>resetForKind(k.id)}>
        <div className="kindVisual"><span/><span/><span/><span/></div>
        <div><h2>{k.title}</h2><p>{k.description}</p><small>Start {k.title.toLowerCase()} design →</small></div>
      </button>)}
    </div>}

    {kind&&!scenario&&<div className="scenarioPicker">
      <button className="backLink" onClick={()=>setKind(null)}>← Back to design types</button>
      <div className="scenarioGrid">
        {choice?.scenarios.map(s=><button key={s.id} className="scenarioCard" onClick={()=>setScenario(s.id)}>
          <div className={"scenarioMini "+kind+" "+s.id}><span/><span/><span/><span/><span/></div>
          <div><b>{s.title}</b><p>{s.description}</p><small>Use this layout →</small></div>
        </button>)}
      </div>
    </div>}

    {kind&&scenario&&<div className="roomSetup">
      <button className="backLink" onClick={()=>setScenario(null)}>← Back to layouts</button>
      <div className="roomSetupCard">
        <div className="roomSketch"><div className="floor"/><div className="wall back"/><div className="wall side"/><span>{room.width} W</span><span>{room.height} H</span><span>{room.depth} D</span></div>
        <div className="roomForm">
          <h3>Room dimensions</h3>
          <p>Measure the internal space. All values are in millimetres.</p>
          <div className="roomFields">
            <label>Width<input type="number" min="2600" step="50" value={room.width} onChange={e=>setRoom({...room,width:Math.max(2600,+e.target.value)})}/></label>
            <label>Height<input type="number" min="2200" step="50" value={room.height} onChange={e=>setRoom({...room,height:Math.max(2200,+e.target.value)})}/></label>
            <label>Depth<input type="number" min="2200" step="50" value={room.depth} onChange={e=>setRoom({...room,depth:Math.max(2200,+e.target.value)})}/></label>
          </div>
          <div className="scenarioSummary"><b>{choice?.title}</b><span>{choice?.scenarios.find(x=>x.id===scenario)?.title}</span></div>
          <button className="primary startDesignButton" onClick={()=>onCreate(createScenarioPlan(kind,scenario,room.width,room.height,room.depth))}>Create realistic starter design</button>
        </div>
      </div>
    </div>}
  </div>;
}
