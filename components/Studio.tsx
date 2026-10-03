"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {useStudio} from "@/lib/store";
import {newItem} from "@/lib/defaults";
import {MATERIALS,material,floorMaterials} from "@/lib/materials";
import {Drawing2D} from "./Drawing2D";
import {Scene3D} from "./Scene3D";
import {validate,findFreePlacement,clampItemToRoom,canPlace,footprint,normalizeRotation,autoFaceNearestWall} from "@/lib/geometry";
import {exportPdf} from "@/lib/pdf";
import {hasSupabase} from "@/lib/supabase";
import * as cloud from "@/lib/cloud";
import {ProjectStatus,Material,WallSide} from "@/types/model";
import {isProjectBackup} from "@/lib/backup";
import {mergeProjects} from "@/lib/projectMerge";
import {COMPONENT_GROUPS_BY_KIND,inferDesignKind,ScenarioPlan} from "@/lib/scenarios";
import {ScenarioStart} from "./ScenarioStart";
import {Icon} from "./Icon";
import {ProfessionalPanel} from "./ProfessionalPanel";

function ComponentIcon({type}:{type:string}){const cls=type.toLowerCase().replaceAll(" ","-");return <span className={"cabIcon "+cls}><i/><i/><i/><i/></span>}
function componentDescription(type:string){
  const descriptions:Record<string,string>={
    "Base cabinet":"Floor cabinet with plinth and worktop line",
    "Drawer unit":"Stacked drawer cabinet",
    "Wall cabinet":"Wall-mounted storage cabinet",
    "Tall cabinet":"Full-height storage housing",
    "Sink base":"Base cabinet prepared around a sink",
    "Hob base":"Cooking cabinet with hob",
    "Oven tower":"Tall appliance housing",
    "Fridge housing":"Integrated fridge surround",
    "Kitchen island":"Freestanding island cabinetry",
    "Wardrobe":"Hinged fitted wardrobe",
    "Sliding wardrobe":"Sliding-door wardrobe system",
    "Bed":"Full-size bed context object",
    "Dressing table":"Drawer desk and vanity unit",
    "Bedside cabinet":"Compact bedside storage",
    "Bed wall":"Upholstered or panelled headboard wall",
    "Media unit":"Low fitted media storage",
    "Shelving":"Open fitted shelving",
    "Straight staircase":"Single straight stair flight",
    "L staircase":"Quarter-turn staircase",
    "U staircase":"Half-turn staircase",
    "Under-stair storage":"Fitted storage below stair flight",
    "Dishwasher":"Integrated 600 mm dishwasher appliance",
    "Washing machine":"Freestanding laundry appliance",
    "Microwave":"Wall-mounted microwave appliance",
    "Extractor hood":"Wall-mounted cooker extraction hood",
    "Door opening":"Measured door opening and clearance zone",
    "Window":"Measured window opening",
    "Glass balustrade":"Clear glass guarding with metal posts",
    "Timber balustrade":"Timber handrail and spindle system"
  };
  return descriptions[type]??"Editable joinery component";
}

export default function Studio(){
  const s=useStudio();
  const p=s.projects.find(x=>x.id===s.activeId)??s.projects[0];
  const item=p?.items.find(i=>i.id===s.selectedId);
  const [tab,setTab]=useState<"components"|"items"|"materials"|"revisions"|"professional">("components");
  const [search,setSearch]=useState("");
  const [menu,setMenu]=useState<{x:number;y:number;id:string}|null>(null);
  const [auth,setAuth]=useState({email:"",password:""});
  const [user,setUser]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [cloudReady,setCloudReady]=useState(false);
  const [notice,setNotice]=useState("");
  const [leftOpen,setLeftOpen]=useState(true);
  const [rightOpen,setRightOpen]=useState(true);
  const [projectOpen,setProjectOpen]=useState(false);
  const [showLauncher,setShowLauncher]=useState(true);
  const [presentationMode,setPresentationMode]=useState(false);
  const [transformMode,setTransformMode]=useState<"translate"|"rotate">("translate");
  const [elevationWall,setElevationWall]=useState<WallSide>("back");
  const file=useRef<HTMLInputElement>(null);
  const materialFile=useRef<HTMLInputElement>(null);
  const issues=useMemo(()=>validate(p),[p]);
  const designKind=useMemo(()=>inferDesignKind(p.items),[p.items]);
  const componentGroups=COMPONENT_GROUPS_BY_KIND[designKind];
  const availableMaterials=useMemo(()=>[...(p.customMaterials??[]),...MATERIALS],[p.customMaterials]);
  const availableFloors=useMemo(()=>floorMaterials(p.customMaterials??[]),[p.customMaterials]);

  useEffect(()=>{if(item){setRightOpen(true);setTransformMode("translate")}},[item?.id]);

  useEffect(()=>{
    if(!hasSupabase())return;
    let active=true;
    const initialise=async(email:string|null)=>{
      if(!active)return;
      setUser(email);
      if(!email){setCloudReady(false);return}
      setCloudReady(false);
      try{
        const remote=await cloud.loadCloud();
        if(!active)return;
        if(remote.length)useStudio.getState().replaceAll(mergeProjects(useStudio.getState().projects,remote));
        setCloudReady(true);
      }catch(e:any){
        if(active){setCloudReady(false);setNotice("Cloud initialisation failed: "+(e?.message??"Unknown error"))}
      }
    };
    cloud.currentUser().then(u=>initialise(u?.email??null)).catch(()=>initialise(null));
    const off=cloud.onAuthChange(email=>{void initialise(email)});
    return()=>{active=false;off()};
  },[]);

  const cloudSave=async()=>{
    if(!hasSupabase()||!user)return;
    setBusy(true);
    try{await cloud.saveAllCloud(s.projects);setNotice("All projects saved to cloud.")}
    catch(e:any){setNotice("Cloud save failed: "+(e?.message??"Unknown error"))}
    finally{setBusy(false)}
  };

  useEffect(()=>{
    if(!hasSupabase()||!user||!cloudReady)return;
    const t=window.setTimeout(()=>{cloud.saveCloud(p).catch(()=>{})},1600);
    return()=>window.clearTimeout(t)
  },[user,cloudReady,p]);

  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      const tag=(e.target as HTMLElement)?.tagName;
      if(["INPUT","TEXTAREA","SELECT"].includes(tag))return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();cloudSave()}
      else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();e.shiftKey?s.redo():s.undo()}
      else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){e.preventDefault();s.redo()}
      else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="d"&&item){e.preventDefault();s.duplicateItem(item.id)}
      else if(e.key.toLowerCase()==="r"&&item){e.preventDefault();rotateSelected(e.shiftKey?-90:90)}
      else if((e.key==="Delete"||e.key==="Backspace")&&item){e.preventDefault();if(confirm("Delete "+item.name+"?"))s.deleteItem(item.id)}
      else if(item&&e.key.startsWith("Arrow")){
        e.preventDefault();
        const st=e.shiftKey?100:p.rules.snap,dx=e.key==="ArrowLeft"?-st:e.key==="ArrowRight"?st:0,d=e.key==="ArrowDown"?-st:e.key==="ArrowUp"?st:0;
        const q=clampItemToRoom({...item,x:item.x+dx,y:s.view==="top"?item.y:item.y+d,z:s.view==="top"?item.z+d:item.z},p);
        if(canPlace(p,q,item.id))s.updateItem(item.id,{x:q.x,y:q.y,z:q.z});
      }
      else if(e.key==="Escape")s.select(null);
    };
    window.addEventListener("keydown",key); return()=>window.removeEventListener("keydown",key)
  },[s,item,p,user]);

  const add=(type:string,at?:{x:number;y:number;z:number})=>{
    let i=newItem(type);
    if(at){
      i=clampItemToRoom({...i,x:at.x-i.width/2,y:Math.max(0,at.y-i.height/2),z:at.z-i.depth/2},p);
      if(!canPlace(p,i))setNotice("Placed with a clash — move it until the warning clears.");
      s.addItem(i);return;
    }
    i=findFreePlacement(p,i);
    if(!canPlace(p,i)){setNotice("No clear space remains. Reposition the new component.");i=clampItemToRoom(i,p)}
    s.addItem(i);
  };

  const rotateItem=(id:string,nextRotation:number,transient=false)=>{
    const current=p.items.find(x=>x.id===id);if(!current||current.locked)return;
    const oldBox=footprint(current),rotation=normalizeRotation(nextRotation);
    const candidateBase={...current,rotation};
    const newBox=footprint(candidateBase);
    const cx=current.x+oldBox.width/2,cz=current.z+oldBox.depth/2;
    const candidate=clampItemToRoom({...candidateBase,x:cx-newBox.width/2,z:cz-newBox.depth/2},p);
    if(canPlace(p,candidate,id)){transient?s.moveItem(id,candidate):s.updateItem(id,candidate);setNotice("")}
    else setNotice("Rotation blocked: the component would hit a wall or another object.");
  };

  const rotateSelected=(delta=90)=>{if(item)rotateItem(item.id,(item.rotation??0)+delta)};

  const moveSafely=(id:string,x:number,y:number,z:number)=>{
    const current=p.items.find(v=>v.id===id);if(!current||current.locked)return;
    let candidate=clampItemToRoom({...current,x,y,z},p);
    candidate=autoFaceNearestWall(p,candidate);
    if(canPlace(p,candidate,id)){s.moveItem(id,candidate);if(notice.startsWith("Placement blocked"))setNotice("")}
    else setNotice("Placement blocked — that unit would overlap another object or leave the room.");
  };

  const patch=(k:string,v:any)=>{
    if(!item)return;
    if(!["x","y","z","width","height","depth"].includes(k)){s.updateItem(item.id,{[k]:v});return}
    const n=Number(v)||0;
    let candidate={...item};
    if(k==="x")candidate.x=n;if(k==="y")candidate.y=n;if(k==="z")candidate.z=n;
    if(k==="width")candidate.width=Math.max(1,n);if(k==="height")candidate.height=Math.max(1,n);if(k==="depth")candidate.depth=Math.max(1,n);
    candidate=clampItemToRoom(candidate,p);
    if(canPlace(p,candidate,item.id))s.updateItem(item.id,candidate);
    else setNotice("That edit would leave the room or clash with another component.");
  };

  const exportJson=()=>{
    const b=new Blob([JSON.stringify(s.projects,null,2)],{type:"application/json"}),a=document.createElement("a");
    a.href=URL.createObjectURL(b);a.download="joinery-studio-projects.json";a.click();URL.revokeObjectURL(a.href)
  };

  const importJson=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0];if(!f)return;
    try{const d=JSON.parse(await f.text());if(!isProjectBackup(d))throw new Error();if(confirm("Replace local projects with this backup?"))s.replaceAll(d)}
    catch{alert("Invalid Joinery Studio JSON file.")}
    e.target.value=""
  };

  const uploadMaterial=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0];if(!f)return;
    if(!f.type.startsWith("image/")){setNotice("Choose an image file for the material.");e.target.value="";return}
    if(f.size>1800000){setNotice("Material image is too large. Please use an image under 1.8 MB.");e.target.value="";return}
    const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(f)});
    const name=(window.prompt("Material name",f.name.replace(/\.[^.]+$/,""))||"Custom material").trim();
    const custom:Material={id:"custom-"+crypto.randomUUID(),code:"CUSTOM",name,colour:"#b8b2a8",thickness:18,category:"Custom",textureDataUrl:dataUrl};
    s.updateProject({customMaterials:[...(p.customMaterials??[]),custom]});
    setNotice(name+" added to the material library.");
    e.target.value="";
  };

  const login=async(signup=false)=>{
    setBusy(true);setNotice("");
    try{
      const r=signup?await cloud.signUp(auth.email,auth.password):await cloud.signIn(auth.email,auth.password);
      if(r.error){setNotice(r.error.message);return}
      if(signup&&!r.data.session){setUser(null);setCloudReady(false);setNotice("Account created. Confirm your email, then sign in.");return}
      setUser(r.data.user?.email??auth.email);
      const ps=await cloud.loadCloud();
      if(ps.length){s.replaceAll(mergeProjects(useStudio.getState().projects,ps));setNotice("Cloud and local projects merged.")}
      else setNotice("Signed in. No cloud projects yet.");
      setCloudReady(true);
    }catch(e:any){setNotice(e?.message??"Authentication failed.")}
    finally{setBusy(false)}
  };

  if(showLauncher||!p.items.length){
    return <ScenarioStart
      continueName={p.items.length?p.name:undefined}
      projects={s.projects}
      activeId={p.id}
      onOpenProject={id=>{s.setActive(id);setShowLauncher(false)}}
      onContinue={p.items.length?()=>setShowLauncher(false):undefined}
      onCreate={(plan:ScenarioPlan)=>{
        if(p.items.length){
          s.addProject();
          useStudio.getState().configureActive({
            name:plan.name,
            roomWidth:plan.roomWidth,
            roomHeight:plan.roomHeight,
            roomDepth:plan.roomDepth,
            rules:plan.rules,
            items:plan.items
          });
        }else{
          s.configureActive({
            name:plan.name,
            roomWidth:plan.roomWidth,
            roomHeight:plan.roomHeight,
            roomDepth:plan.roomDepth,
            rules:plan.rules,
            items:plan.items
          });
        }
        setShowLauncher(false);setLeftOpen(true);setRightOpen(false);setTab("components");
      }}
    />;
  }

  return <main className={"studio "+(presentationMode?"presentationMode ":"")+(!leftOpen?"libraryClosed ":"")+(!rightOpen||!item?"inspectorClosed ":"")} onClick={()=>setMenu(null)}>
    <header className="topbar">
      <button className="studioBrand" onClick={()=>setShowLauncher(true)} title="Design home"><span className="studioBrandMark">JS</span><span><b>Joinery Studio</b><small>{designKind[0].toUpperCase()+designKind.slice(1)} design</small></span></button>
      <button className="projectButton projectPill" onClick={e=>{e.stopPropagation();setProjectOpen(v=>!v)}}>
        <span><b>{p.name}</b><small>{p.reference} · Rev {p.revision}</small></span><Icon name="settings" size={15}/>
      </button>
      <div className="topActions">
        <button className={"presentationToggle "+(presentationMode?"active":"")} title="Client presentation view" onClick={()=>{const next=!presentationMode;setPresentationMode(next);if(next){s.setView("3d");setLeftOpen(false);setRightOpen(false)}else{setLeftOpen(true)}}}><Icon name="box" size={16}/><span>{presentationMode?"Exit presentation":"Present"}</span></button>
        <button className="iconBtn topIcon" title="Undo" onClick={s.undo}><Icon name="undo" size={17}/></button>
        <button className="iconBtn topIcon" title="Redo" onClick={s.redo}><Icon name="redo" size={17}/></button>
        <div className="viewSwitcher">{(["front","top","side","3d"] as const).map(v=><button key={v} className={s.view===v?"active":""} onClick={()=>s.setView(v)}>{v==="3d"?"3D":v==="front"?"Elevations":v[0].toUpperCase()+v.slice(1)}</button>)}</div>
        {s.view==="front"&&<div className="wallElevationPicker">{(["back","right","front","left"] as WallSide[]).map(w=><button key={w} className={elevationWall===w?"active":""} onClick={()=>setElevationWall(w)}>{w[0].toUpperCase()+w.slice(1)}</button>)}</div>}
        <details className="topMenu"><summary><Icon name="download" size={15}/> Export</summary><div>
          <button onClick={()=>exportPdf(p)}>PDF drawing pack</button>
          <button onClick={exportJson}>Export JSON</button>
          <button onClick={()=>file.current?.click()}>Import JSON</button>
        </div></details>
        <input ref={file} hidden type="file" accept=".json" onChange={importJson}/>
        {hasSupabase()&&user&&<button className="quietBtn" disabled={busy} onClick={cloudSave}>{busy?"Saving…":"Save"}</button>}
        <button disabled={issues.length>0} className="primary compactPrimary saveRevisionBtn" onClick={s.saveRevision}><Icon name="save" size={15}/> Save revision</button>
      </div>
    </header>

    <nav className="toolRail">
      <button className={tab==="components"&&leftOpen?"active":""} title="Add" onClick={()=>{setTab("components");setLeftOpen(true)}}><Icon name="plus" size={19}/><small>Add</small></button>
      <button className={tab==="items"&&leftOpen?"active":""} title="Items" onClick={()=>{setTab("items");setLeftOpen(true)}}><Icon name="layers" size={18}/><small>Items</small></button>
      <button className={tab==="materials"&&leftOpen?"active":""} title="Materials" onClick={()=>{setTab("materials");setLeftOpen(true)}}><Icon name="swatch" size={18}/><small>Material</small></button>
      <button className={tab==="revisions"&&leftOpen?"active":""} title="History" onClick={()=>{setTab("revisions");setLeftOpen(true)}}><Icon name="history" size={18}/><small>History</small></button>
      <button className={tab==="professional"&&leftOpen?"active":""} title="Professional tools" onClick={()=>{setTab("professional");setLeftOpen(true)}}><Icon name="settings" size={18}/><small>Pro</small></button>
      <div className="railSpacer"/>
      <button title={leftOpen?"Hide library":"Show library"} onClick={()=>setLeftOpen(v=>!v)}>{leftOpen?<Icon name="chevron-left" size={18}/>:<Icon name="chevron-right" size={18}/>}</button>
    </nav>

    <aside className="libraryPanel">
      <div className="panelHead">
        <div><b>{tab==="components"?"Add joinery":tab==="items"?"Items":tab==="materials"?"Materials":tab==="revisions"?"History":"Professional tools"}</b><small>{tab==="components"?"Drag to canvas":tab==="items"?p.items.length+" objects":tab==="materials"?(item?"Apply to selection":"Select an object"):tab==="revisions"?"Saved snapshots":"Placement, batch editing and design rules"}</small></div>
        <button className="iconBtn" onClick={()=>setLeftOpen(false)}><Icon name="x" size={16}/></button>
      </div>
      <div className="panelBody">
        {tab==="components"&&<>
          <input className="searchInput" placeholder="Search components" value={search} onChange={e=>setSearch(e.target.value)}/>
          <section className="componentGroups">{componentGroups.map(group=>{
            const matches=group.items.filter(x=>x.toLowerCase().includes(search.toLowerCase()));
            if(!matches.length)return null;
            return <div className="componentGroup" key={group.title}><div className="componentGroupTitle"><span>{group.title}</span><small>{matches.length}</small></div><div className="cards">{matches.map(x=><button key={x} draggable onDragStart={e=>{e.dataTransfer.setData("application/x-joinery-component",x);e.dataTransfer.setData("text/plain",x);e.dataTransfer.effectAllowed="copy"}} onClick={()=>add(x)}><ComponentIcon type={x}/><span><b>{x}</b><small>{componentDescription(x)}</small><em>Drag to place</em></span></button>)}</div></div>
          })}</section>
        </>}
        {tab==="items"&&<section className="itemManager">{p.items.map(i=><button key={i.id} className={s.selectedId===i.id?"activeItem":""} onClick={()=>s.select(i.id)}><ComponentIcon type={i.type}/><span><b>{i.name}</b><small>{i.width} × {i.height} × {i.depth} mm</small></span><span className="itemState">{i.locked?"●":""}</span></button>)}{!p.items.length&&<small className="muted">No joinery yet.</small>}</section>}
        {tab==="materials"&&<section className="materials"><div className="materialTools"><button onClick={()=>materialFile.current?.click()}>Upload material image</button><input ref={materialFile} hidden type="file" accept="image/*" onChange={uploadMaterial}/><label>Floor material<select value={p.floorMaterialId??"floor-oak"} onChange={e=>s.updateProject({floorMaterialId:e.target.value})}>{availableFloors.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label></div>{availableMaterials.map(m=><button key={m.id} className={item?.materialId===m.id?"selectedMaterial":""} disabled={!item} onClick={()=>item&&patch("materialId",m.id)}><i style={{background:m.colour,backgroundImage:m.textureDataUrl?`url(${m.textureDataUrl})`:undefined,backgroundSize:"cover"}}/><span><b>{m.code}</b>{m.name}<small>{m.category} · {m.thickness} mm</small></span></button>)}</section>}
        {tab==="revisions"&&<section className="revisionList">{[...p.revisions].reverse().map(r=><div key={r.id}><span><b>Revision {r.revision}</b><small>{new Date(r.createdAt).toLocaleString()}</small></span><button onClick={()=>confirm("Restore revision "+r.revision+"?")&&s.restoreRevision(r.id)}>Restore</button></div>)}{!p.revisions.length&&<small className="muted">No saved revisions yet.</small>}</section>}
        {tab==="professional"&&<ProfessionalPanel project={p}/>}
      </div>
    </aside>

    <section className="workspace">
      <div className="stage">{s.view==="3d"?<Scene3D project={p} selected={s.selectedId} transformMode={transformMode} onSelect={s.select} onMove={moveSafely} onRotate={(id,rotation)=>rotateItem(id,rotation,true)} onMoveStart={s.checkpoint}/>:<Drawing2D project={p} view={s.view} wallSide={s.view==="front"?elevationWall:undefined} selected={s.selectedId} onSelect={s.select} onMove={moveSafely} onResize={(id,patch)=>s.moveItem(id,patch)} onRotate={(id,rotation)=>rotateItem(id,rotation,true)} onMoveStart={s.checkpoint} onDropType={(type,x,y,z)=>add(type,{x,y,z})} onContext={(e,id)=>{s.select(id);setMenu({x:e.clientX,y:e.clientY,id})}}/>}</div>

      {item&&<div className="selectionBar" onClick={e=>e.stopPropagation()}>
        <span className="selectionName">{item.name}</span>
        <button className={transformMode==="translate"?"activeTool":""} onClick={()=>setTransformMode("translate")}><Icon name="move" size={15}/> Move</button><button className={transformMode==="rotate"?"activeTool":""} onClick={()=>setTransformMode("rotate")}><Icon name="rotate" size={15}/> Rotate</button><button title="Rotate 90° left" onClick={()=>rotateSelected(-90)}>−90°</button><button title="Rotate 90° right" onClick={()=>rotateSelected(90)}>+90°</button>
        <button onClick={()=>s.duplicateItem(item.id)}><Icon name="copy" size={15}/> Copy</button>
        <button onClick={()=>s.updateItem(item.id,{locked:!item.locked})}>{item.locked?<Icon name="unlock" size={15}/>:<Icon name="lock" size={15}/>} {item.locked?"Unlock":"Lock"}</button>
        <button className="dangerTool" onClick={()=>confirm("Delete "+item.name+"?")&&s.deleteItem(item.id)}><Icon name="trash" size={15}/> Delete</button>
      </div>}

      <div className="statusChip"><span className={issues.length?"statusDot warn":"statusDot live"}/><span>{issues.length?issues.length+" issue"+(issues.length>1?"s":""):"Design valid"}</span><span className="dotSep">·</span><span className="statusMode">{designKind[0].toUpperCase()+designKind.slice(1)}</span><span className="dotSep">·</span><span>{user?(cloudReady?"Cloud synced":"Cloud connecting"):"Local"}</span></div>
    </section>

    {item&&<aside className="inspector">
      <div className="inspectorHeader"><div><small>{item.type}</small><input value={item.name} onChange={e=>patch("name",e.target.value)}/></div><button className="iconBtn" onClick={()=>setRightOpen(false)}><Icon name="x" size={16}/></button></div>
      <div className="inspectorBody">
        <section className="inspectorGroup"><h4>Position</h4><div className="fieldGrid3">{(["x","y","z"] as const).map(k=><label key={k}>{k.toUpperCase()}<input type="number" value={item[k]} onChange={e=>patch(k,+e.target.value)}/></label>)}</div><label className="rotationField">Rotation<select value={normalizeRotation(item.rotation??0)} onChange={e=>rotateItem(item.id,+e.target.value)}>{[0,90,180,270].map(v=><option key={v} value={v}>{v}°</option>)}</select></label></section>
        <section className="inspectorGroup"><h4>Size</h4><div className="fieldGrid3">{(["width","height","depth"] as const).map((k,n)=><label key={k}>{["W","H","D"][n]}<input type="number" value={item[k]} onChange={e=>patch(k,+e.target.value)}/></label>)}</div></section>
        <section className="inspectorGroup"><h4>Configuration</h4><div className="fieldGrid2"><label>Shelves<input type="number" min="0" value={item.shelves} onChange={e=>patch("shelves",Math.max(0,+e.target.value))}/></label><label>Doors<input type="number" min="0" value={item.doors} onChange={e=>patch("doors",Math.max(0,+e.target.value))}/></label></div><label>Hardware<select value={item.hardware} onChange={e=>patch("hardware",e.target.value)}>{["None","Handleless","Bar handle","Knob","Push-to-open","Client specified"].map(x=><option key={x}>{x}</option>)}</select></label><label>Layer<select value={item.layer??"Joinery"} onChange={e=>patch("layer",e.target.value)}>{["Joinery","Architecture","Services","Decor"].map(x=><option key={x}>{x}</option>)}</select></label><label className="checkRow"><input type="checkbox" checked={item.visible!==false} onChange={e=>patch("visible",e.target.checked)}/>Visible in drawings and 3D</label><label className="checkRow"><input type="checkbox" checked={item.locked} onChange={e=>patch("locked",e.target.checked)}/>Lock position</label></section>
        <section className="inspectorGroup"><h4>Interaction</h4><label>Open doors / drawers<input type="range" min="0" max="100" step="5" value={item.openAmount??0} onChange={e=>patch("openAmount",+e.target.value)}/><span className="rangeValue">{item.openAmount??0}%</span></label>{["Dishwasher","Washing machine","Microwave","Extractor hood","Freestanding fridge","Single oven","Range cooker"].includes(item.type)&&<><label>Appliance style<select value={item.productStyle??"Contemporary"} onChange={e=>patch("productStyle",e.target.value)}>{["Contemporary","Minimal","Classic","Professional"].map(x=><option key={x}>{x}</option>)}</select></label><label>Appliance colour<select value={item.colourVariant??"Stainless steel"} onChange={e=>patch("colourVariant",e.target.value)}>{["Stainless steel","Black","White","Graphite","Cream"].map(x=><option key={x}>{x}</option>)}</select></label></>}{(item.type==="Tap"||item.type.endsWith(" tap"))&&<><label>Tap style<select value={item.productStyle??"Arc mixer"} onChange={e=>patch("productStyle",e.target.value)}>{["Arc mixer","Pull-out","Bridge","Square neck"].map(x=><option key={x}>{x}</option>)}</select></label><label>Tap finish<select value={item.colourVariant??"Chrome"} onChange={e=>patch("colourVariant",e.target.value)}>{["Chrome","Brushed steel","Matt black","Brass"].map(x=><option key={x}>{x}</option>)}</select></label></>}</section>
        <section className="inspectorGroup"><h4>Materials by part</h4><label>Carcass<select value={item.carcassMaterialId??item.materialId} onChange={e=>patch("carcassMaterialId",e.target.value)}>{availableMaterials.map(m=><option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}</select></label><label>Doors / fronts<select value={item.doorMaterialId??item.materialId} onChange={e=>patch("doorMaterialId",e.target.value)}>{availableMaterials.map(m=><option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}</select></label><label>Visible sides<select value={item.sideMaterialId??item.carcassMaterialId??item.materialId} onChange={e=>patch("sideMaterialId",e.target.value)}>{availableMaterials.map(m=><option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}</select></label><div className="materialPreview"><i style={{background:material(item.doorMaterialId??item.materialId,p.customMaterials??[]).colour}}/><span><b>{material(item.doorMaterialId??item.materialId,p.customMaterials??[]).code}</b>{material(item.doorMaterialId??item.materialId,p.customMaterials??[]).name}</span></div><label>Finish<input value={item.finish} onChange={e=>patch("finish",e.target.value)}/></label><label>Edge<select value={item.edgeBanding} onChange={e=>patch("edgeBanding",e.target.value)}>{["Matching 1mm","Matching 2mm","Contrast edge","None / raw"].map(x=><option key={x}>{x}</option>)}</select></label><label>Plinth<select value={item.plinthStyle??"recessed"} onChange={e=>patch("plinthStyle",e.target.value)}>{["recessed","flush","none"].map(x=><option key={x} value={x}>{x[0].toUpperCase()+x.slice(1)}</option>)}</select></label>{(item.plinthStyle??"recessed")==="recessed"&&<label>Plinth recess (mm)<input type="number" min="0" max="250" value={item.plinthRecess??65} onChange={e=>patch("plinthRecess",Math.max(0,+e.target.value))}/></label>}</section>
        <section className="inspectorGroup"><h4>Notes</h4><textarea placeholder="Notes" value={item.notes} onChange={e=>patch("notes",e.target.value)}/></section>
        {issues.length>0&&<section className="issues"><b>Design checks</b>{issues.slice(0,6).map((x,i)=><p key={i}>{x}</p>)}</section>}
      </div>
    </aside>}

    {projectOpen&&<div className="projectPopover" onClick={e=>e.stopPropagation()}>
      <div className="popoverHead"><div><b>Project settings</b><small>Room, reference and cloud</small></div><button className="iconBtn" onClick={()=>setProjectOpen(false)}>×</button></div>
      <div className="popoverBody">
        <label>Project<select value={p.id} onChange={async e=>{if(hasSupabase()&&user){try{await cloud.saveCloud(p)}catch{}}s.setActive(e.target.value)}}>{s.projects.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <div className="row projectActions"><button onClick={async()=>{if(hasSupabase()&&user){try{await cloud.saveCloud(p)}catch{}}s.addProject()}}>New</button><button onClick={()=>s.duplicateProject()}>Duplicate</button><button className="dangerText" onClick={async()=>{if(!confirm('Delete project "'+p.name+'"?'))return;if(hasSupabase()&&user){try{await cloud.deleteCloud(p.id)}catch(e:any){return alert(e.message)}}s.deleteProject()}}>Delete</button></div>
        <label>Name<input value={p.name} onChange={e=>s.updateProject({name:e.target.value})}/></label>
        <div className="fieldGrid2"><label>Reference<input value={p.reference} onChange={e=>s.updateProject({reference:e.target.value})}/></label><label>Status<select value={p.status} onChange={e=>s.updateProject({status:e.target.value as ProjectStatus})}>{(["Draft","Presented","Accepted","Rejected"] as ProjectStatus[]).map(x=><option key={x}>{x}</option>)}</select></label></div>
        <label>Customer<input value={p.customer} onChange={e=>s.updateProject({customer:e.target.value})}/></label>
        <label>Site address<input value={p.address??""} placeholder="Project / installation address" onChange={e=>s.updateProject({address:e.target.value})}/></label>
        <label>Project notes<textarea value={p.notes??""} placeholder="Survey notes, client requirements, access notes…" onChange={e=>s.updateProject({notes:e.target.value})}/></label>
        <label className="checkRow"><input type="checkbox" checked={p.archived??false} onChange={e=>s.updateProject({archived:e.target.checked})}/>Archive this project</label>
        <div className="groupLabel">Room · mm</div>
        <div className="fieldGrid3">{(["roomWidth","roomHeight","roomDepth"] as const).map((k,n)=><label key={k}>{["W","H","D"][n]}<input min="100" type="number" value={p[k]} onChange={e=>s.updateProject({[k]:Math.max(100,+e.target.value)})}/></label>)}</div>
        <div className="groupLabel">Rules · mm</div>
        <div className="fieldGrid2"><label>Wall clearance<input type="number" min="0" value={p.rules.wallClearance} onChange={e=>s.updateProject({rules:{...p.rules,wallClearance:Math.max(0,+e.target.value)}})}/></label><label>Component gap<input type="number" min="0" value={p.rules.componentGap} onChange={e=>s.updateProject({rules:{...p.rules,componentGap:Math.max(0,+e.target.value)}})}/></label><label>Snap grid<input type="number" min="1" value={p.rules.snap} onChange={e=>s.updateProject({rules:{...p.rules,snap:Math.max(1,+e.target.value)}})}/></label><label>Service gap<input type="number" min="0" value={p.rules.serviceClearance??50} onChange={e=>s.updateProject({rules:{...p.rules,serviceClearance:Math.max(0,+e.target.value)}})}/></label></div>
        <div className="groupLabel">Cloud</div>
        {!hasSupabase()?<small className="muted">Local storage mode.</small>:!user?<><input placeholder="Email" value={auth.email} onChange={e=>setAuth({...auth,email:e.target.value})}/><input type="password" placeholder="Password" value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})}/><div className="row"><button disabled={busy} onClick={()=>login(false)}>Login</button><button disabled={busy} onClick={()=>login(true)}>Sign up</button></div></>:<><div className="cloudStatus"><span className={cloudReady?"statusDot live":"statusDot"}/><span>{cloudReady?"Cloud autosave on":"Preparing cloud sync"}</span></div><small className="muted">{user}</small><div className="row"><button disabled={busy} onClick={cloudSave}>Save all</button><button disabled={busy} onClick={async()=>{setBusy(true);try{await cloud.saveCloud(p);await cloud.signOut();setUser(null);setCloudReady(false)}finally{setBusy(false)}}}>Logout</button></div></>}
        {notice&&<small className="noticeText">{notice}</small>}
      </div>
    </div>}

    {menu&&<div className="contextMenu" style={{left:menu.x,top:menu.y}} onClick={e=>e.stopPropagation()}><button onClick={()=>{s.duplicateItem(menu.id);setMenu(null)}}>Duplicate</button><button onClick={()=>{if(confirm("Delete component?"))s.deleteItem(menu.id);setMenu(null)}}>Delete</button></div>}
  </main>
}
