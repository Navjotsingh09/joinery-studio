"use client";
import {useMemo,useState} from "react";
import {createScenarioPlan,DESIGN_KINDS,DesignKind,ScenarioPlan,inferDesignKind} from "@/lib/scenarios";
import {Project} from "@/types/model";
import {Icon} from "./Icon";

function DesignPreview({kind}:{kind:DesignKind}){
  if(kind==="kitchen")return <svg viewBox="0 0 640 360" role="img" aria-label="Kitchen design preview">
    <defs>
      <linearGradient id="kgWall" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f4f1eb"/><stop offset="1" stopColor="#e7e1d8"/></linearGradient>
      <linearGradient id="kgOak" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b88b59"/><stop offset="1" stopColor="#8d6743"/></linearGradient>
      <linearGradient id="kgStone" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#dedbd5"/><stop offset="1" stopColor="#c7c2bb"/></linearGradient>
      <filter id="kgShadow"><feDropShadow dx="0" dy="12" stdDeviation="10" floodOpacity=".17"/></filter>
    </defs>
    <rect width="640" height="360" fill="url(#kgWall)"/>
    <polygon points="0,274 640,230 640,360 0,360" fill="#c8b39a"/>
    <g filter="url(#kgShadow)">
      <rect x="65" y="110" width="450" height="125" rx="4" fill="#d9d5cf"/>
      <rect x="65" y="105" width="450" height="18" rx="3" fill="url(#kgStone)"/>
      <g stroke="#a29b92" strokeWidth="2">
        <line x1="150" y1="123" x2="150" y2="235"/><line x1="235" y1="123" x2="235" y2="235"/><line x1="320" y1="123" x2="320" y2="235"/><line x1="405" y1="123" x2="405" y2="235"/>
      </g>
      <rect x="275" y="132" width="78" height="12" rx="6" fill="#17191b"/>
      <circle cx="294" cy="138" r="7" fill="none" stroke="#555b5e" strokeWidth="2"/><circle cx="334" cy="138" r="7" fill="none" stroke="#555b5e" strokeWidth="2"/>
      <rect x="79" y="45" width="92" height="52" rx="3" fill="#ece9e4" stroke="#c6c0b7"/><rect x="178" y="45" width="92" height="52" rx="3" fill="#ece9e4" stroke="#c6c0b7"/>
      <rect x="405" y="42" width="110" height="56" rx="3" fill="#ece9e4" stroke="#c6c0b7"/>
      <g><rect x="205" y="242" width="270" height="68" rx="4" fill="url(#kgOak)"/><rect x="193" y="236" width="294" height="14" rx="3" fill="url(#kgStone)"/><line x1="295" y1="251" x2="295" y2="308" stroke="#76543a"/><line x1="385" y1="251" x2="385" y2="308" stroke="#76543a"/></g>
    </g>
    <rect x="42" y="28" width="160" height="1" fill="#aaa39b"/><text x="42" y="22" fill="#777067" fontSize="12" fontFamily="Arial">FITTED KITCHEN</text>
  </svg>;

  if(kind==="bedroom")return <svg viewBox="0 0 640 360" role="img" aria-label="Bedroom design preview">
    <defs>
      <linearGradient id="bdWall" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f0ece5"/><stop offset="1" stopColor="#ddd5ca"/></linearGradient>
      <linearGradient id="bdOak" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#c49b69"/><stop offset="1" stopColor="#92704e"/></linearGradient>
      <filter id="bdShadow"><feDropShadow dx="0" dy="12" stdDeviation="10" floodOpacity=".16"/></filter>
    </defs>
    <rect width="640" height="360" fill="url(#bdWall)"/>
    <polygon points="0,277 640,238 640,360 0,360" fill="#b9a487"/>
    <g filter="url(#bdShadow)">
      <rect x="54" y="56" width="190" height="205" rx="4" fill="url(#bdOak)"/>
      <line x1="117" y1="58" x2="117" y2="259" stroke="#76573e"/><line x1="180" y1="58" x2="180" y2="259" stroke="#76573e"/>
      <rect x="260" y="117" width="230" height="128" rx="7" fill="#bbb1a4"/>
      <g fill="#d5cdc2">{Array.from({length:12},(_,i)=><rect key={i} x={270+(i%4)*53} y={127+Math.floor(i/4)*34} width="46" height="27" rx="5"/>)}</g>
      <rect x="284" y="240" width="214" height="62" rx="6" fill="#e6e2db"/>
      <rect x="295" y="229" width="194" height="42" rx="18" fill="#f6f3ee"/>
      <rect x="305" y="216" width="78" height="30" rx="12" fill="#faf8f4"/><rect x="391" y="216" width="78" height="30" rx="12" fill="#faf8f4"/>
      <rect x="506" y="230" width="68" height="52" rx="5" fill="#b88b59"/>
    </g>
    <rect x="42" y="28" width="172" height="1" fill="#aaa39b"/><text x="42" y="22" fill="#777067" fontSize="12" fontFamily="Arial">FITTED BEDROOM</text>
  </svg>;

  return <svg viewBox="0 0 640 360" role="img" aria-label="Stair design preview">
    <defs>
      <linearGradient id="stWall" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f2efea"/><stop offset="1" stopColor="#dfdad3"/></linearGradient>
      <linearGradient id="stOak" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#c49a66"/><stop offset="1" stopColor="#8d6947"/></linearGradient>
      <filter id="stShadow"><feDropShadow dx="0" dy="12" stdDeviation="10" floodOpacity=".16"/></filter>
    </defs>
    <rect width="640" height="360" fill="url(#stWall)"/>
    <polygon points="0,286 640,246 640,360 0,360" fill="#c1b5a6"/>
    <g filter="url(#stShadow)">
      {Array.from({length:11},(_,i)=>{const x=86+i*34,y=280-i*18;return <g key={i}><rect x={x} y={y} width="78" height={20+i*18} fill="url(#stOak)" stroke="#846447"/><rect x={x} y={y-7} width="82" height="9" fill="#d1aa77"/></g>})}
      <line x1="115" y1="250" x2="453" y2="70" stroke="#3e3b38" strokeWidth="7" strokeLinecap="round"/>
      {Array.from({length:7},(_,i)=>{const x=120+i*54,y=246-i*29;return <line key={i} x1={x} y1={y} x2={x} y2={y-70} stroke="#4e4a46" strokeWidth="4"/>})}
      <path d="M85 281 L295 170 L295 281 Z" fill="#ece8e1" stroke="#c1b9af"/>
      <line x1="155" y1="244" x2="155" y2="280" stroke="#aaa39a"/><line x1="225" y1="207" x2="225" y2="280" stroke="#aaa39a"/>
    </g>
    <rect x="42" y="28" width="155" height="1" fill="#aaa39b"/><text x="42" y="22" fill="#777067" fontSize="12" fontFamily="Arial">BESPOKE STAIRS</text>
  </svg>;
}

function ScenarioDiagram({kind,scenario}:{kind:DesignKind;scenario:string}){
  return <div className={"layoutDiagram "+kind+" "+scenario}>
    <div className="layoutRoom"/>
    <div className="layoutRun a"/><div className="layoutRun b"/><div className="layoutRun c"/>
    <div className="layoutIsland"/><div className="layoutBed"/>
    <div className="layoutArrow">↗</div>
  </div>;
}

export function ScenarioStart({onCreate,onContinue,continueName,projects=[],activeId,onOpenProject}:{onCreate:(plan:ScenarioPlan)=>void;onContinue?:()=>void;continueName?:string;projects?:Project[];activeId?:string;onOpenProject?:(id:string)=>void}){
  const [kind,setKind]=useState<DesignKind|null>(null);
  const [scenario,setScenario]=useState<string|null>(null);
  const [room,setRoom]=useState({width:4200,height:2400,depth:3200});
  const [showArchived,setShowArchived]=useState(false);
  const choice=useMemo(()=>DESIGN_KINDS.find(x=>x.id===kind),[kind]);
  const step=scenario?3:kind?2:1;

  const resetForKind=(k:DesignKind)=>{
    setKind(k);setScenario(null);
    if(k==="kitchen")setRoom({width:4200,height:2400,depth:3400});
    if(k==="bedroom")setRoom({width:4200,height:2400,depth:3600});
    if(k==="stairs")setRoom({width:3200,height:2600,depth:4200});
  };

  return <main className="designHome">
    <header className="designHomeTop">
      <div className="homeBrand"><span className="brandMark">JS</span><div><b>Joinery Studio</b><small>Precision interior design</small></div></div>
      <div className="homeMeta"><span>Millimetre precision</span><i/><span>2D + 3D</span><i/><span>Drawing export</span></div>
      {onContinue&&<button className="resumeTop" onClick={onContinue}>Open current design <Icon name="chevron-right" size={16}/></button>}
    </header>

    <section className="designHomeBody">
      <div className="flowRail">
        {[["01","Space"],["02","Layout"],["03","Room"]].map((x,n)=><div key={x[0]} className={"flowStep "+(step===n+1?"active ":"")+(step>n+1?"done ":"")}><span>{step>n+1?<Icon name="check" size={13}/>:x[0]}</span><b>{x[1]}</b></div>)}
      </div>

      {!kind&&<>
        <section className="homeIntro">
          <p className="eyebrow">START A NEW DESIGN</p>
          <h1>Design a real space,<br/><span>not a generic box.</span></h1>
          <p>Choose the room type first. Joinery Studio will load the right layouts, components and modelling rules for that job.</p>
        </section>

        <section className="premiumKindGrid">
          {DESIGN_KINDS.map(k=><button key={k.id} className={"premiumKindCard "+k.id} onClick={()=>resetForKind(k.id)}>
            <div className="premiumVisual"><DesignPreview kind={k.id}/><span className="previewBadge">{k.id==="stairs"?"Structure + storage":k.id==="kitchen"?"Cabinetry + appliances":"Wardrobes + furniture"}</span></div>
            <div className="premiumCardCopy">
              <div><span className="cardNumber">0{DESIGN_KINDS.findIndex(x=>x.id===k.id)+1}</span><h2>{k.title}</h2></div>
              <p>{k.description}</p>
              <span className="cardAction">Choose {k.title.toLowerCase()} <Icon name="chevron-right" size={16}/></span>
            </div>
          </button>)}
        </section>

        {!!projects.length&&<section className="projectLibrary">
          <div className="projectLibraryHead"><div><p className="eyebrow">YOUR PROJECTS</p><h2>Continue a design.</h2></div><button onClick={()=>setShowArchived(v=>!v)}>{showArchived?"Hide archived":"Show archived"}</button></div>
          <div className="projectGrid">{projects.filter(p=>showArchived||!p.archived).map(pr=>{const pk=inferDesignKind(pr.items);return <button key={pr.id} className={"projectCard "+(pr.id===activeId?"activeProject ":"")+(pr.archived?"archivedProject":"")} onClick={()=>onOpenProject?.(pr.id)}>
            <div className="projectThumb"><DesignPreview kind={pk}/><span>{pk}</span></div>
            <div className="projectCardCopy"><small>{pr.reference} · Rev {pr.revision}</small><b>{pr.name}</b><p>{pr.customer||"No customer yet"}{pr.address?" · "+pr.address:""}</p><div><span className={"projectStatus "+pr.status.toLowerCase()}>{pr.status}</span><em>{pr.items.length} objects</em></div></div>
          </button>})}</div>
        </section>}
        {onContinue&&!projects.length&&<section className="recentDesign">
          <div><span className="recentIcon"><Icon name="box"/></span><div><small>CURRENT DESIGN</small><b>{continueName||"Untitled design"}</b><p>Continue exactly where you left off.</p></div></div>
          <button onClick={onContinue}>Continue editing <Icon name="chevron-right" size={16}/></button>
        </section>}
      </>}

      {kind&&!scenario&&<>
        <section className="subPageHead">
          <button className="backLink premiumBack" onClick={()=>setKind(null)}><Icon name="chevron-left" size={16}/> All spaces</button>
          <p className="eyebrow">{choice?.title.toUpperCase()} · LAYOUT</p>
          <h1>Choose a starting layout.</h1>
          <p>These are realistic starting points, not locked templates. Every object remains editable.</p>
        </section>
        <section className="premiumScenarioGrid">
          {choice?.scenarios.map((s,n)=><button key={s.id} className={"premiumScenarioCard "+(kind==="kitchen"&&s.id==="l-shape"?"recommendedScenario":"")} onClick={()=>setScenario(s.id)}>
            <ScenarioDiagram kind={kind} scenario={s.id}/>
            {kind==="kitchen"&&s.id==="l-shape"&&<span className="recommendedBadge">Recommended · reference kitchen</span>}
            <div className="scenarioCopy"><span className="scenarioIndex">0{n+1}</span><div><b>{s.title}</b><p>{s.description}</p></div><Icon name="chevron-right" size={18}/></div>
          </button>)}
        </section>
      </>}

      {kind&&scenario&&<>
        <section className="subPageHead roomHead">
          <button className="backLink premiumBack" onClick={()=>setScenario(null)}><Icon name="chevron-left" size={16}/> Layouts</button>
          <p className="eyebrow">{choice?.title.toUpperCase()} · ROOM</p>
          <h1>Enter the measured room.</h1>
          <p>Use finished internal dimensions. The starter model is generated to these dimensions in real millimetres.</p>
        </section>
        <section className="premiumRoomSetup">
          <div className="roomBlueprint">
            <div className="blueprintLabel">ROOM ENVELOPE</div>
            <div className="blueprintBox"><span className="bpWidth">{room.width} mm</span><span className="bpHeight">{room.height} mm</span><span className="bpDepth">{room.depth} mm</span><i className="bpBack"/><i className="bpSide"/><i className="bpFloor"/></div>
            <div className="blueprintLegend"><span><i/> Width</span><span><i/> Height</span><span><i/> Depth</span></div>
          </div>
          <div className="roomForm premium">
            <div className="selectedScenario">
              <small>STARTER LAYOUT</small><b>{choice?.scenarios.find(x=>x.id===scenario)?.title}</b><span>{choice?.title}</span>
            </div>
            <div className="dimensionFields">
              <label><span>Width <small>W</small></span><div><input type="number" min="2600" step="50" value={room.width} onChange={e=>setRoom({...room,width:Math.max(2600,+e.target.value)})}/><em>mm</em></div></label>
              <label><span>Height <small>H</small></span><div><input type="number" min="2200" step="50" value={room.height} onChange={e=>setRoom({...room,height:Math.max(2200,+e.target.value)})}/><em>mm</em></div></label>
              <label><span>Depth <small>D</small></span><div><input type="number" min="2200" step="50" value={room.depth} onChange={e=>setRoom({...room,depth:Math.max(2200,+e.target.value)})}/><em>mm</em></div></label>
            </div>
            <div className="roomAdvice"><Icon name="check" size={15}/><span>You can change the room size later without rebuilding the project.</span></div>
            <button className="createDesignCTA" onClick={()=>onCreate(createScenarioPlan(kind,scenario,room.width,room.height,room.depth))}><span>Create starter design</span><Icon name="chevron-right" size={18}/></button>
          </div>
        </section>
      </>}
    </section>
  </main>;
}
