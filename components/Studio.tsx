"use client";
import {projectLimitReached,projectLimitExceeded} from "@/lib/projectAllowance";
import {MeasureInput} from "./MeasureInput";
import {DisplayUnit} from "@/lib/units";
import {adjacentUnitSnap} from "@/lib/placementSnap";
import {newId} from "@/lib/id";
import {useEffect,useMemo,useRef,useState,useSyncExternalStore} from "react";
import {FINISH_COLLECTIONS,applyFinishCollection} from "@/lib/finishCollections";
import {getLocalSaveStatus,subscribeLocalSave} from "@/lib/saveStatus";
import {switchAccountStorage,useStudio} from "@/lib/store";
import {newItem} from "@/lib/defaults";
import {MATERIALS,material,floorMaterials} from "@/lib/materials";
import {Drawing2D} from "./Drawing2D";
import {Scene3D} from "./Scene3D";
import {SplashbackOptions} from "./SplashbackOptions";
import {alignApplianceFront} from "@/lib/renderGeometry";
import {SceneBoundary} from "./SceneBoundary";
import {validate,findFreePlacement,clampItemToRoom,canPlace,footprint,normalizeRotation,autoFaceNearestWall} from "@/lib/geometry";
import {numberItems,referenceLabel} from "@/lib/drawingPack";
import {exportPdf} from "@/lib/pdf";
import {hasSupabase} from "@/lib/supabase";
import * as cloud from "@/lib/cloud";
import {ProjectStatus,Material,WallSide,JoineryPart} from "@/types/model";
import {isProjectBackup} from "@/lib/backup";
import {COMPONENT_GROUPS_BY_KIND,inferDesignKind,ScenarioPlan} from "@/lib/scenarios";
import {ScenarioStart} from "./ScenarioStart";
import {Icon} from "./Icon";
import {KitchenOptions} from "./KitchenOptions";
import {FRONT_STYLES,HANDLE_STYLES} from "@/lib/kitchenConfig";
import {WorktopOptions} from "./WorktopOptions";
import {KitchenWorkflow} from "./KitchenWorkflow";
import {ProfessionalPanel} from "./ProfessionalPanel";

function ComponentIcon({type}:{type:string}){const cls=type.toLowerCase().replaceAll(" ","-");return <span className={"cabIcon "+cls}><i/><i/><i/><i/></span>}
function componentDescription(type:string){
  const descriptions:Record<string,string>={
    "Cornice":"Top trim for wall cabinets",
    "Wine rack":"Narrow open bottle storage",
    "Bar stool":"Island seating with a footrest",
    "Base cabinet":"Floor cabinet with plinth and worktop line",
    "Drawer unit":"Stacked drawer cabinet",
    "Wall cabinet":"Wall-mounted storage cabinet",
    "Tall cabinet":"Larder · shelves, pull-out baskets or internal drawers",
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
    "Freestanding fridge":"Full-height freestanding fridge appliance",
    "Single oven":"Built-in or freestanding single oven",
    "Range cooker":"Wide professional-style cooker",
    "Tap":"Standard mixer tap",
    "Arc mixer tap":"High-arc kitchen mixer tap",
    "Pull-out tap":"Mixer tap with pull-out spray head",
    "Bridge tap":"Traditional two-post bridge tap",
    "Square neck tap":"Angular contemporary mixer tap",
    "Backsplash":"Wall finish panel behind worktops",
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
  useEffect(()=>{if(p?.items.some(i=>!i.unitNumber))s.updateProject(numberItems(p))},[p?.id,p?.items,s.updateProject]);
  const item=p?.items.find(i=>i.id===s.selectedId);
  const [tab,setTab]=useState<"components"|"items"|"materials"|"revisions"|"professional">("components");
  const [search,setSearch]=useState("");
  const [menu,setMenu]=useState<{x:number;y:number;id:string}|null>(null);
  const [auth,setAuth]=useState({email:"",password:""});
  const [user,setUser]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [cloudReady,setCloudReady]=useState(false);
  const [accountReady,setAccountReady]=useState(!hasSupabase());
  const [cloudSync,setCloudSync]=useState<"waiting"|"saving"|"saved"|"error">("waiting");
  const [cloudSavedVersion,setCloudSavedVersion]=useState("");
  const localSave=useSyncExternalStore(subscribeLocalSave,getLocalSaveStatus,()=>"pending");
  const [notice,setNotice]=useState("");
  const [showDesignIssues,setShowDesignIssues]=useState(false);
  const [leftOpen,setLeftOpen]=useState(true);
  const [rightOpen,setRightOpen]=useState(true);
  const [projectOpen,setProjectOpen]=useState(false);
  const [showLauncher,setShowLauncher]=useState(true);
  useEffect(()=>{
    // Keep the active design visible on refresh. Explicit new-design links still open the chooser.
    const query=new URLSearchParams(window.location.search);
    if(query.get("new")!=="1"&&p.items.length&&(!query.get("kind")||query.get("kind")===(p.designKind??inferDesignKind(p.items))))setShowLauncher(false);
  },[]);
  const [presentationMode,setPresentationMode]=useState(false);
  const [moveAxis,setMoveAxis]=useState<"xz"|"x"|"y"|"z">("xz");
  const [materialScope,setMaterialScope]=useState("all");
  const [transformMode,setTransformMode]=useState<"translate"|"rotate">("translate");
  const [elevationWall,setElevationWall]=useState<WallSide>("back");
  const [selectedPart,setSelectedPart]=useState<JoineryPart|null>(null);
  const partSelectionItem=useRef<string|null>(null);
  const [materialSearch,setMaterialSearch]=useState("");
  const [materialCategory,setMaterialCategory]=useState("");
  const file=useRef<HTMLInputElement>(null);
  const materialFile=useRef<HTMLInputElement>(null);
  const issues=useMemo(()=>validate(p),[p]);
  const designKind=useMemo(()=>p.designKind??inferDesignKind(p.items),[p.designKind,p.items]);
  const displayUnit:DisplayUnit=p.displayUnit??"mm";
  const componentGroups=COMPONENT_GROUPS_BY_KIND[designKind];
  const availableMaterials=useMemo(()=>[...(p.customMaterials??[]),...MATERIALS],[p.customMaterials]);
  const unitMaterialsFor=(current:string)=>availableMaterials.filter(m=>m.id===current||!["Worktop","Splashback","Floor"].includes(m.category));
  const [sceneVisited,setSceneVisited]=useState(s.view==="3d");
  useEffect(()=>{if(s.view==="3d")setSceneVisited(true)},[s.view]);
  const availableFloors=useMemo(()=>floorMaterials(p.customMaterials??[]),[p.customMaterials]);
  const applianceTypes=new Set(["Dishwasher","Washing machine","Microwave","Extractor hood","Freestanding fridge","Single oven","Range cooker"]);
  const kitchenSurfaceTypes=new Set(["Base cabinet","Drawer unit","Wall cabinet","Tall cabinet","Sink base","Hob base","Oven tower","Fridge housing","Kitchen island","Corner cabinet"]);
  const openableSelected=!!item&&item.doors>0&&!applianceTypes.has(item.type);
  const cabinetSurfaceSelected=!!item&&new Set([...kitchenSurfaceTypes,"Wardrobe","Sliding wardrobe","Dressing table","Bedside cabinet","Media unit","Shelving","Internal drawers","Loft box","Under-stair storage"]).has(item.type);

  useEffect(()=>{if(item){setRightOpen(true);setTransformMode("translate");if(partSelectionItem.current!==item.id)setSelectedPart(null);partSelectionItem.current=null}},[item?.id]);

  useEffect(()=>{
    if(!hasSupabase())return;
    let active=true;
    let account:string|null|undefined=undefined;
    let generation=0;
    const initialise=async(u:{id:string;email?:string}|null)=>{
      if(!active||account===(u?.id??null))return;
      account=u?.id??null;const ticket=++generation;
      setUser(u?.email??null);setCloudReady(false);setAccountReady(false);cloud.clearCloudSession(u?.id??null);
      try{
        await switchAccountStorage(u?.id??null);
        if(!active||ticket!==generation)return;
        setAccountReady(true);
        if(!u)return;
        const remote=await cloud.loadCloud();
        if(!active||ticket!==generation)return;
        const local=useStudio.getState().projects;
        const recovered=local.filter(p=>p.items.length&&!remote.some(r=>r.id===p.id&&r.cloudVersion===p.cloudVersion));
        if(recovered.length)window.localStorage.setItem("joinery-recovery:"+u.id,JSON.stringify(recovered));
        const merged=remote.map(r=>local.find(p=>p.id===r.id&&p.cloudVersion===r.cloudVersion&&p.updatedAt>r.updatedAt)??r);
        const drafts=local.filter(p=>p.items.length&&p.cloudVersion===undefined&&!remote.some(r=>r.id===p.id));
        useStudio.getState().replaceAll([...merged,...drafts.slice(0,Math.max(0,2-merged.length))]);
        if(recovered.length)setNotice("Local recovery copies are available in Project settings. Cloud versions were kept for conflicting projects.");
        setCloudReady(true);
      }catch(e:any){if(active&&ticket===generation){setCloudSync("error");setAccountReady(true);setNotice("Cloud initialisation failed: "+(e?.message??"Unknown error"))}}
    };
    cloud.currentUser().then(initialise).catch(()=>initialise(null));
    // Defer database calls outside Supabase's auth callback lock.
    const off=cloud.onAuthChange(u=>{window.setTimeout(()=>void initialise(u),0)});
    return()=>{active=false;off()};
  },[]);

  useEffect(()=>{
    const changed=(event:StorageEvent)=>{if(event.key===useStudio.persist.getOptions().name)setNotice("This account’s local projects changed in another tab. Export a backup before reloading; cloud saves will check for conflicts.")};
    window.addEventListener("storage",changed);return()=>window.removeEventListener("storage",changed);
  },[]);

  const markCloudSaved=(saved:{id:string;version:number;updatedAt:string}[])=>{
    useStudio.setState(state=>({projects:state.projects.map(p=>{const result=saved.find(r=>r.id===p.id);return result?{...p,cloudVersion:result.version}:p})}));
  };
  const cloudSave=async()=>{
    if(!hasSupabase()||!user)return;
    if(!cloudReady){setNotice("Cloud is not ready. Export a recovery copy and reload to reconnect.");return}
    setBusy(true);
    try{setCloudSync("saving");markCloudSaved(await cloud.saveAllCloud(s.projects));setCloudSavedVersion(p.id+p.updatedAt);setCloudSync("saved");setNotice("All projects saved to cloud.")}
    catch(e:any){setCloudSync("error");setNotice("Cloud save failed: "+(e?.message??"Unknown error"))}
    finally{setBusy(false)}
  };

  useEffect(()=>{
    if(!hasSupabase()||!user||!cloudReady)return;
    let active=true;setCloudSync("waiting");
    const t=window.setTimeout(async()=>{setCloudSync("saving");try{markCloudSaved([await cloud.saveCloud(p)]);if(active){setCloudSavedVersion(p.id+p.updatedAt);setCloudSync("saved")}}catch(e:any){if(active){setCloudSync("error");setNotice("Cloud save failed: "+(e?.message??"Export a backup or use Save to retry."))}}},1600);
    return()=>{active=false;window.clearTimeout(t)}
  },[user,cloudReady,p.id,p.updatedAt]);

  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(presentationMode){if(e.key==="Escape"){setPresentationMode(false);setLeftOpen(true)}return}
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
  },[s,item,p,user,presentationMode]);

  const add=(type:string,at?:{x:number;y:number;z:number})=>{
    let i=newItem(type);
    if(type==="Backsplash"){
      i=findFreePlacement(p,i);
      if(!canPlace(p,i)){setNotice("No suitable wall space for a backsplash. Adjust the wall units or panel size.");return}
      s.addItem(i);setNotice("Backsplash placed against the wall above the worktop.");return;
    }
    if(at){
      i=clampItemToRoom({...i,x:at.x-i.width/2,y:Math.max(0,at.y-i.height/2),z:at.z-i.depth/2},p);
      i=autoFaceNearestWall(p,i);
      if(!canPlace(p,i)){
        const free=findFreePlacement(p,i);
        if(!canPlace(p,free)){setNotice("No clear space for that unit. Placement cancelled.");return}
        i=free;
        setNotice("That position was unavailable, so the unit moved to the nearest clear space.");
      }else setNotice("");
      s.addItem(i);return;
    }
    i=findFreePlacement(p,i);
    if(!canPlace(p,i)){setNotice("No clear space remains. Reposition the new component.");return}
    s.addItem(i);
  };

  const rotateItem=(id:string,nextRotation:number,transient=false)=>{
    const current=p.items.find(x=>x.id===id);if(!current||current.locked)return false;
    const oldBox=footprint(current),rotation=normalizeRotation(nextRotation);
    const candidateBase={...current,rotation};
    const newBox=footprint(candidateBase);
    const cx=current.x+oldBox.width/2,cz=current.z+oldBox.depth/2;
    const candidate=clampItemToRoom({...candidateBase,x:cx-newBox.width/2,z:cz-newBox.depth/2},p,false);
    if(canPlace(p,candidate,id)){transient?s.moveItem(id,candidate):s.updateItem(id,candidate);setNotice("");return true}
    else {setNotice("Rotation blocked: the component would hit a wall or another object.");return false}
  };

  const rotateSelected=(delta=90)=>{if(item)rotateItem(item.id,(item.rotation??0)+delta)};

  const moveSafely=(id:string,x:number,y:number,z:number,faceWall=true)=>{
    const current=p.items.find(v=>v.id===id);if(!current||current.locked)return false;
    let candidate=clampItemToRoom({...current,x,y,z},p,false);
    if(faceWall){candidate=autoFaceNearestWall(p,candidate);candidate=adjacentUnitSnap(p,candidate)}
    if(current.groupId){s.moveItem(id,candidate);const accepted=!useStudio.getState().editError;if(accepted)setNotice(current=>current.startsWith("Placement blocked")?"":current);return accepted}
    if(canPlace(p,candidate,id)){s.moveItem(id,candidate);if(useStudio.getState().editError)return false;setNotice(current=>current.startsWith("Placement blocked")?"":current);return true}
    else {setNotice("Placement blocked — that unit would overlap another object or leave the room.");return false}
  };

  const materialFieldForPart=(part:JoineryPart)=>{
    if(part==="treads")return "treadMaterialId";
    if(part==="risers")return "riserMaterialId";
    if(part==="railing")return "railingMaterialId";
    if(part==="carcass")return "carcassMaterialId";
    if(part==="fronts")return "doorMaterialId";
    if(part==="left-side")return "leftSideMaterialId";
    if(part==="right-side")return "rightSideMaterialId";
    if(part==="plinth")return "plinthMaterialId";
    if(part==="worktop")return "worktopMaterialId";
    return "materialId";
  };
  const materialIdForPart=(part:JoineryPart)=>{
    if(!item)return "";
    if(part==="treads")return item.treadMaterialId??item.materialId;
    if(part==="risers")return item.riserMaterialId??item.materialId;
    if(part==="railing")return item.railingMaterialId??item.materialId;
    if(part==="carcass")return item.carcassMaterialId??item.materialId;
    if(part==="fronts")return item.doorMaterialId??item.materialId;
    if(part==="left-side")return item.leftSideMaterialId??item.sideMaterialId??item.carcassMaterialId??item.materialId;
    if(part==="right-side")return item.rightSideMaterialId??item.sideMaterialId??item.carcassMaterialId??item.materialId;
    if(part==="plinth")return item.plinthMaterialId??item.carcassMaterialId??item.materialId;
    if(part==="worktop")return item.worktopMaterialId??item.materialId;
    return item.materialId;
  };
  const applyMaterial=(materialId:string)=>{
    if(!item)return;
    if(item.type==="Backsplash"){const m=material(materialId,p.customMaterials);s.updateItem(item.id,{materialId,...(m.category==="Splashback"?{depth:m.thickness,finish:m.surfaceFinish}:{})});return}
    if(selectedPart){s.updateItem(item.id,{[materialFieldForPart(selectedPart)]:materialId});return}
    if(["Straight staircase","L staircase","U staircase"].includes(item.type)){s.updateItem(item.id,{materialId,treadMaterialId:materialId,riserMaterialId:materialId,railingMaterialId:materialId});return}
    const cabinetTypes=new Set(["Wardrobe","Sliding wardrobe","Dressing table","Bedside cabinet","Media unit","Shelving","Internal drawers","Loft box","Under-stair storage","Base cabinet","Drawer unit","Wall cabinet","Tall cabinet","Sink base","Hob base","Oven tower","Fridge housing","Kitchen island","Corner cabinet"]);
    if(cabinetTypes.has(item.type)){
      s.updateItem(item.id,{materialId,carcassMaterialId:materialId,doorMaterialId:materialId,sideMaterialId:materialId,leftSideMaterialId:materialId,rightSideMaterialId:materialId,plinthMaterialId:materialId});
      setNotice("Applied to the whole cabinet. Select a surface to use different finishes by part.");
      return;
    }
    if(item.type==="Worktop")s.updateItem(item.id,{materialId,worktopMaterialId:materialId});
    else s.updateItem(item.id,{materialId});
  };

  const patch=(k:string,v:any)=>{
    if(!item)return;
    if(item.locked&&["x","y","z","width","height","depth"].includes(k)){setNotice("Position locked. Unlock this component before moving or resizing it.");return}
    if(!["x","y","z","width","height","depth"].includes(k)){s.updateItem(item.id,{[k]:v});return}
    const n=Number(v)||0;
    let candidate={...item};
    if(k==="x")candidate.x=n;if(k==="y")candidate.y=n;if(k==="z")candidate.z=n;
    if(k==="width")candidate.width=Math.max(1,n);if(k==="height")candidate.height=Math.max(1,n);if(k==="depth")candidate.depth=Math.max(1,n);
    candidate=clampItemToRoom(candidate,p,false);
    if(canPlace(p,candidate,item.id))s.updateItem(item.id,candidate);
    else setNotice("That edit would leave the room or clash with another component.");
  };

  const exportJson=()=>{
    const b=new Blob([JSON.stringify(s.projects,null,2)],{type:"application/json"}),a=document.createElement("a");
    a.href=URL.createObjectURL(b);a.download="joinery-studio-projects.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
  };

  const importJson=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0];if(!f)return;
    try{const d=JSON.parse(await f.text());if(!isProjectBackup(d))throw new Error();if(projectLimitExceeded(d.length)){alert("Basic allows two projects. Please import a backup containing at most two projects.");return}if(confirm("Replace local projects with this backup?"))s.replaceAll(d)}
    catch{alert("Invalid Joinery Studio JSON file.")}
    e.target.value=""
  };

  const optimiseMaterialImage=async(f:File)=>{
    const raw=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(f)});
    const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("Image could not be read"));img.src=raw});
    if(image.width<64||image.height<64)throw new Error("Image is too small. Use at least 64 × 64 pixels.");
    const maxEdge=900,scale=Math.min(1,maxEdge/Math.max(image.width,image.height)),canvas=document.createElement("canvas");
    canvas.width=Math.max(64,Math.round(image.width*scale));canvas.height=Math.max(64,Math.round(image.height*scale));
    const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Your browser could not prepare the material image.");
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(image,0,0,canvas.width,canvas.height);
    for(const quality of [.82,.7,.58,.46,.36]){
      const data=canvas.toDataURL("image/webp",quality);
      if(data.length<220000)return data;
    }
    throw new Error("The material image is still too large after optimisation. Crop it closer to the material sample.");
  };

  const removeCustomMaterial=(id:string)=>{
    const fields=(i:typeof p.items[number])=>[i.materialId,i.carcassMaterialId,i.doorMaterialId,i.sideMaterialId,i.leftSideMaterialId,i.rightSideMaterialId,i.plinthMaterialId,i.worktopMaterialId];
    const usedBy=p.items.find(i=>fields(i).includes(id));
    if(p.floorMaterialId===id||usedBy){setNotice("That material is still in use"+(usedBy?" on "+usedBy.name:" as the floor")+". Change those finishes before removing it.");return}
    const target=(p.customMaterials??[]).find(m=>m.id===id);if(!target)return;
    if(!confirm('Remove custom material "'+target.name+'"?'))return;
    s.updateProject({customMaterials:(p.customMaterials??[]).filter(m=>m.id!==id)});
    setNotice(target.name+" removed.");
  };

  const uploadMaterial=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0];if(!f)return;
    if(!f.type.startsWith("image/")){setNotice("Choose an image file for the material.");e.target.value="";return}
    if(f.size>8000000){setNotice("Material image is too large. Please use an image under 8 MB.");e.target.value="";return}
    if((p.customMaterials??[]).length>=12){setNotice("This project already has 12 custom materials. Remove an unused material before adding another.");e.target.value="";return}
    try{
      setNotice("Optimising material image…");
      const dataUrl=await optimiseMaterialImage(f);
      const name=(window.prompt("Material name",f.name.replace(/\.[^.]+$/,""))||"Custom material").trim();
      const custom:Material={id:"custom-"+newId(),code:"CUSTOM",name,colour:"#b8b2a8",thickness:18,category:"Custom",textureDataUrl:dataUrl};
      s.updateProject({customMaterials:[...(p.customMaterials??[]),custom]});
      setNotice(name+" added. Select a cabinet surface, worktop, backsplash or floor to apply it.");
    }catch(err:any){setNotice("Material upload failed: "+(err?.message??"Please try another image."))}
    finally{e.target.value=""}
  };

  const login=async()=>{
    setBusy(true);setNotice("");
    try{
      const r=await cloud.signIn(auth.email,auth.password);
      if(r.error){setNotice(r.error.message);return}
      setUser(r.data.user?.email??auth.email);
      setNotice("Signed in. Preparing your projects.");
    }catch(e:any){setNotice(e?.message??"Authentication failed.")}
    finally{setBusy(false)}
  };

  useEffect(()=>{if(s.editError){setNotice(s.editError);s.clearEditError()}},[s.editError]);

  if(!accountReady)return <main className="studioGate"><h1>Opening your private workspace…</h1></main>;

  if(showLauncher){
    return <ScenarioStart
      initialKind={typeof window!=="undefined"?new URLSearchParams(window.location.search).get("kind"):null}
      continueName={p.name}
      projects={s.projects}
      activeId={p.id}
      onOpenProject={id=>{s.setActive(id);setShowLauncher(false)}}
      onDeleteProject={async id=>{
        if(hasSupabase()&&user)await cloud.deleteCloud(id);
        useStudio.getState().deleteProject(id);
      }}
      onContinue={()=>setShowLauncher(false)}
      onCreate={(plan:ScenarioPlan)=>{
        if(p.items.length){
          if(projectLimitReached(s.projects.length)){alert("Basic allows two projects. Export or delete one before starting another.");return}
          s.addProject();
          useStudio.getState().configureActive({
            name:plan.name,
            designKind:plan.kind,
            drawingReference:undefined,
            roomWidth:plan.roomWidth,
            roomHeight:plan.roomHeight,
            roomDepth:plan.roomDepth,
            rules:plan.rules,
            lighting:plan.lighting,
            items:plan.items
          });
        }else{
          s.configureActive({
            name:plan.name,
            designKind:plan.kind,
            drawingReference:undefined,
            roomWidth:plan.roomWidth,
            roomHeight:plan.roomHeight,
            roomDepth:plan.roomDepth,
            rules:plan.rules,
            lighting:plan.lighting,
            items:plan.items
          });
        }
        setShowLauncher(false);setLeftOpen(true);setRightOpen(false);setTab("components");if(plan.scenario==="blank")s.setView("top");if(plan.scenario==="showroom"){setPresentationMode(true);setLeftOpen(false);setRightOpen(false)}
      }}
    />;
  }

  return <main className={"studio "+(presentationMode?"presentationMode ":"")+(!leftOpen?"libraryClosed ":"")+(!rightOpen||!item?"inspectorClosed ":"")} onClick={()=>setMenu(null)}>
    {notice&&<div className="studioNotice" role="status">{notice}<button aria-label="Dismiss notification" onClick={()=>setNotice("")}>×</button></div>}
    <header className="topbar">
      <button className="studioBrand" onClick={()=>setShowLauncher(true)} title="Design home"><span className="studioBrandMark">JS</span><span><b>Joinery Studio</b><small>{designKind[0].toUpperCase()+designKind.slice(1)} · 6 Oct update</small></span></button>
      <button className="projectButton projectPill" onClick={e=>{e.stopPropagation();setProjectOpen(v=>!v)}}>
        <span><b>{p.name}</b><small>{p.reference} · Rev {p.revision}</small></span><Icon name="settings" size={15}/>
      </button>
      <div className="topActions">
        <button className={"presentationToggle "+(presentationMode?"active":"")} title="Client presentation view" onClick={()=>{const next=!presentationMode;setPresentationMode(next);if(next){s.setView("3d");setLeftOpen(false);setRightOpen(false)}else{setLeftOpen(true)}}}><Icon name="box" size={16}/><span>{presentationMode?"Exit presentation":"Present"}</span></button>
        {!presentationMode&&<><button className="iconBtn topIcon" title="Undo" onClick={s.undo}><Icon name="undo" size={17}/></button>
        <button className="iconBtn topIcon" title="Redo" onClick={s.redo}><Icon name="redo" size={17}/></button>
        <div className="viewSwitcher">{(["front","top","side","3d"] as const).map(v=><button key={v} className={s.view===v?"active":""} onClick={()=>s.setView(v)}>{v==="3d"?"3D":v==="front"?"Elevations":v[0].toUpperCase()+v.slice(1)}</button>)}</div>
        {s.view==="front"&&<div className="wallElevationPicker">{(["back","right","front","left"] as WallSide[]).map(w=><button key={w} className={elevationWall===w?"active":""} onClick={()=>setElevationWall(w)}>{w[0].toUpperCase()+w.slice(1)}</button>)}</div>}
        </>}<details className="topMenu"><summary><Icon name="download" size={15}/> Export</summary><div>
          <button onClick={()=>exportPdf(p)}>PDF drawing pack</button>
          <button onClick={exportJson}>Export JSON</button>
          {!presentationMode&&<><button onClick={()=>file.current?.click()}>Import JSON</button><button onClick={()=>{setLeftOpen(true);setTab("professional");s.setView("top")}}>Import CAD / PDF drawing</button></>}
        </div></details>
        <input ref={file} hidden type="file" accept=".json" onChange={importJson}/>
        {!presentationMode&&hasSupabase()&&user&&<button className="quietBtn" disabled={busy} onClick={cloudSave}>{busy?"Saving…":"Save"}</button>}
        {!presentationMode&&<button disabled={issues.length>0} className="primary compactPrimary saveRevisionBtn" onClick={s.saveRevision}><Icon name="save" size={15}/> Save revision</button>}
      </div>
    </header>

    <nav className="toolRail">
      <button className={tab==="components"&&leftOpen?"active":""} title="Add" onClick={()=>{setTab("components");setLeftOpen(true)}}><Icon name="plus" size={19}/><small>Add</small></button>
      <button className={tab==="items"&&leftOpen?"active":""} title="Items" onClick={()=>{setTab("items");setLeftOpen(true)}}><Icon name="layers" size={18}/><small>Items</small></button>
      <button className={tab==="materials"&&leftOpen?"active":""} title="Materials" onClick={()=>{setTab("materials");setLeftOpen(true)}}><Icon name="swatch" size={18}/><small>Material</small></button>
      <button className={tab==="revisions"&&leftOpen?"active":""} title="History" onClick={()=>{setTab("revisions");setLeftOpen(true)}}><Icon name="history" size={18}/><small>History</small></button>
      <button className={tab==="professional"&&leftOpen?"active":""} title="Drawing and placement tools" onClick={()=>{setTab("professional");setLeftOpen(true)}}><Icon name="settings" size={18}/><small>Tools</small></button>
      <div className="railSpacer"/>
      <button title={leftOpen?"Hide library":"Show library"} onClick={()=>setLeftOpen(v=>!v)}>{leftOpen?<Icon name="chevron-left" size={18}/>:<Icon name="chevron-right" size={18}/>}</button>
    </nav>

    <aside className="libraryPanel">
      <div className="panelHead">
        <div><b>{tab==="components"?"Add joinery":tab==="items"?"Items":tab==="materials"?"Materials":tab==="revisions"?"History":"Drawing & placement"}</b><small>{tab==="components"?"Drag to canvas":tab==="items"?p.items.length+" objects":tab==="materials"?(item?"Apply to selection":"Select an object"):tab==="revisions"?"Saved snapshots":"Placement, batch editing and design rules"}</small></div>
        <button className="iconBtn" onClick={()=>setLeftOpen(false)}><Icon name="x" size={16}/></button>
      </div>
      <div className="panelBody">
        {tab==="components"&&<>
          {designKind==="kitchen"&&<KitchenWorkflow onChoose={type=>{setProjectOpen(false);s.setView("top");setSearch(type)}} onFloor={()=>{setProjectOpen(false);setTab("materials")}} onRoom={()=>setProjectOpen(true)}/>}
          <input className="searchInput" placeholder="Search components" value={search} onChange={e=>setSearch(e.target.value)}/>
          <section className="componentGroups">{componentGroups.map(group=>{
            const matches=group.items.filter(x=>x.toLowerCase().includes(search.toLowerCase()));
            if(!matches.length)return null;
            return <div className="componentGroup" key={group.title}><div className="componentGroupTitle"><span>{group.title}</span><small>{matches.length}</small></div><div className="cards">{matches.map(x=><button key={x} draggable onDragStart={e=>{e.dataTransfer.setData("application/x-joinery-component",x);e.dataTransfer.setData("text/plain",x);e.dataTransfer.effectAllowed="copy"}} onClick={()=>add(x)}><ComponentIcon type={x}/><span><b>{x}</b><small>{componentDescription(x)}</small><em>Drag to place</em></span></button>)}</div></div>
          })}</section>
        </>}
        {tab==="items"&&<section className="itemManager">{p.items.map(i=><button key={i.id} className={s.selectedId===i.id?"activeItem":""} onClick={()=>s.select(i.id)}><ComponentIcon type={i.type}/><span><b>{i.name}</b><small>{i.width} × {i.height} × {i.depth} mm</small></span><span className="itemState">{i.locked?"●":""}</span></button>)}{!p.items.length&&<small className="muted">No joinery yet.</small>}</section>}
        {tab==="materials"&&<section className="materials"><div className="materialTools"><fieldset className="finishCollections"><legend>Coordinated finishes</legend>{FINISH_COLLECTIONS.filter(c=>c.kind===designKind).map(c=><button key={c.id} onClick={()=>{s.updateProject(applyFinishCollection(p,c.id));setNotice(c.name+" applied. Use Undo to restore the previous finishes.")}} aria-label={"Apply "+c.name}><span aria-hidden="true">{[c.wood,c.front,c.surface].map(id=><i key={id} style={{background:material(id).colour}}/>)}</span>{c.name}</button>)}</fieldset><button onClick={()=>materialFile.current?.click()}>Upload material image</button>{designKind==="kitchen"&&<button onClick={()=>s.updateProject({items:p.items.map(i=>kitchenSurfaceTypes.has(i.type)?{...i,carcassMaterialId:"h1180",doorMaterialId:["Wall cabinet","Tall cabinet","Oven tower","Fridge housing"].includes(i.type)?"palette-15":"h1180",leftSideMaterialId:"h1180",rightSideMaterialId:"h1180",plinthMaterialId:"palette-16",worktopMaterialId:"wt-15"}:i.type==="Worktop"?{...i,materialId:"wt-15",worktopMaterialId:"wt-15",height:20,finish:"Matt",worktopEdge:"square"}:i.type==="Backsplash"?{...i,materialId:"wt-15"}:i)})}>Apply reference kitchen finishes</button>}<input ref={materialFile} hidden type="file" accept="image/*" onChange={uploadMaterial}/><label>Floor material<select value={p.floorMaterialId??"floor-oak"} onChange={e=>s.updateProject({floorMaterialId:e.target.value})}>{availableFloors.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>{item&&<small className="materialTarget">Applying to: {selectedPart?selectedPart.replace("-"," "):"whole object"}</small>}</div><div className="materialScopes" aria-label="Material collections">{[["all","All"],["units","Units"],["worktop","Worktops"],["backsplash","Backsplashes"],["uploads","Uploaded textures"]].map(([id,label])=><button key={id} className={materialScope===id?"active":""} onClick={()=>{setMaterialScope(id);setMaterialCategory("")}}>{label}</button>)}</div><label>Search materials<input type="search" placeholder="Oak, charcoal, marble…" value={materialSearch} onChange={e=>setMaterialSearch(e.target.value)}/></label><label>Material category<select value={materialCategory} onChange={e=>setMaterialCategory(e.target.value)}><option value="">All materials</option>{Array.from(new Set(availableMaterials.map(m=>m.category))).sort().map(c=><option key={c}>{c}</option>)}</select></label><p className="surfaceHelp">{availableMaterials.length} finishes · select a surface to apply a finish to that part.</p>{availableMaterials.filter(m=>(materialScope==="all"||materialScope==="uploads"&&m.category==="Custom"||materialScope==="worktop"&&(m.category==="Worktop"||m.category==="Custom")||materialScope==="backsplash"&&(m.category==="Splashback"||m.category==="Custom")||materialScope==="units"&&!["Worktop","Splashback","Floor"].includes(m.category))&&(!materialCategory||m.category===materialCategory)&&`${m.name} ${m.code} ${m.worktopMaterial??""} ${m.worktopStyle??""}`.toLowerCase().includes(materialSearch.toLowerCase())).map(m=><button key={m.id} className={(item&&(selectedPart?materialIdForPart(selectedPart):item.materialId)===m.id)?"selectedMaterial":""} disabled={!item} onClick={()=>applyMaterial(m.id)}><i style={{background:m.colour,backgroundImage:m.textureDataUrl?`url(${m.textureDataUrl})`:undefined,backgroundSize:"cover"}}/><span><b>{m.code}</b>{m.name}<small>{m.category} · {m.thickness} mm</small></span></button>)}{materialScope==="uploads"&&!!(p.customMaterials??[]).length&&<div className="customMaterialManager"><b>Custom materials</b>{(p.customMaterials??[]).map(m=><div key={m.id}><span>{m.name}</span><div className="textureSettings"><label>Tile width (mm)<input type="number" min="50" max="10000" step="50" value={m.textureWidthMm??650} onChange={e=>s.updateProject({customMaterials:(p.customMaterials??[]).map(x=>x.id===m.id?{...x,textureWidthMm:Math.max(50,Math.min(10000,+e.target.value))}:x)})}/></label><label>Tile height (mm)<input type="number" min="50" max="10000" step="50" value={m.textureHeightMm??1200} onChange={e=>s.updateProject({customMaterials:(p.customMaterials??[]).map(x=>x.id===m.id?{...x,textureHeightMm:Math.max(50,Math.min(10000,+e.target.value))}:x)})}/></label><label>Grain direction<select value={m.textureRotation??0} onChange={e=>s.updateProject({customMaterials:(p.customMaterials??[]).map(x=>x.id===m.id?{...x,textureRotation:+e.target.value}:x)})}><option value="0">Original</option><option value="90">Rotate 90°</option></select></label></div><button onClick={()=>removeCustomMaterial(m.id)}>Remove</button></div>)}</div>}</section>}
        {tab==="revisions"&&<section className="revisionList">{[...p.revisions].reverse().map(r=><div key={r.id}><span><b>Revision {r.revision}</b><small>{new Date(r.createdAt).toLocaleString()}</small></span><button onClick={()=>confirm("Restore revision "+r.revision+"?")&&s.restoreRevision(r.id)}>Restore</button></div>)}{!p.revisions.length&&<small className="muted">No saved revisions yet.</small>}</section>}
        {tab==="professional"&&<ProfessionalPanel project={p}/>}
      </div>
    </aside>

    <section className="workspace">
      {!p.items.length&&!presentationMode&&<div className="blankCanvasGuide"><b>Your blank {designKind} canvas</b><span>1. Add a unit from the library. 2. Set its size in the inspector. 3. Position it in plan view.</span><button onClick={()=>{setLeftOpen(true);setTab("components");s.setView("top")}}>Add your first unit</button></div>}<div className="stage">{(sceneVisited||s.view==="3d")&&<div className="persistentScene" style={{display:s.view==="3d"?"block":"none"}}><SceneBoundary onUsePlan={()=>{setPresentationMode(false);setLeftOpen(true);s.setView("top")}}><Scene3D key={p.id} active={s.view==="3d"} project={p} onProjectChange={s.updateProject} presentationOnly={presentationMode} selected={s.selectedId} selectedPart={selectedPart} transformMode={transformMode} moveAxis={moveAxis} onSelect={id=>{s.select(id);if(id!==s.selectedId)setSelectedPart(null)}} onDuplicate={id=>{s.duplicateItem(id)}} onSelectPart={(id,part)=>{if(id!==s.selectedId)partSelectionItem.current=id;s.select(id);setSelectedPart(part)}} onDropType={(type,x,y,z)=>add(type,{x,y,z})} onMove={(id,x,y,z)=>moveSafely(id,x,y,z,moveAxis==="xz")} onRotate={(id,rotation)=>rotateItem(id,rotation,true)} onMoveStart={s.checkpoint}/></SceneBoundary></div>}{s.view!=="3d"&&<Drawing2D onDuplicate={s.duplicateItem} project={p} view={s.view} wallSide={s.view==="front"?elevationWall:undefined} selected={s.selectedId} onSelect={s.select} onMove={moveSafely} onResize={(id,patch)=>s.moveItem(id,patch)} onRotate={(id,rotation)=>rotateItem(id,rotation,true)} onMoveStart={s.checkpoint} onDropType={(type,x,y,z)=>add(type,{x,y,z})} onContext={(e,id)=>{s.select(id);setMenu({x:e.clientX,y:e.clientY,id})}}/>}</div>

      {item&&!presentationMode&&<div className="selectionBar" onClick={e=>e.stopPropagation()}>
        <span className="selectionName">{item.name}</span>{selectedPart&&<button className="selectedPartPill" onClick={()=>setSelectedPart(null)}>Surface: {selectedPart.replace("-"," ")} ×</button>}
        <button className={transformMode==="translate"?"activeTool":""} onClick={()=>setTransformMode("translate")}><Icon name="move" size={15}/> Move</button><label className="axisControl">Axis<select aria-label="Movement axis" value={moveAxis} onChange={e=>setMoveAxis(e.target.value as typeof moveAxis)}><option value="xz">Floor X / Z</option><option value="x">X · left / right</option><option value="y">Y · height</option><option value="z">Z · forward / back</option></select></label><button className={transformMode==="rotate"?"activeTool":""} onClick={()=>setTransformMode("rotate")}><Icon name="rotate" size={15}/> Rotate</button><button title="Rotate 90° left" onClick={()=>rotateSelected(-90)}>−90°</button><button title="Rotate 90° right" onClick={()=>rotateSelected(90)}>+90°</button>
        <button onClick={()=>s.duplicateItem(item.id)}><Icon name="copy" size={15}/> Copy</button>
        <button onClick={()=>s.updateItem(item.id,{locked:!item.locked})}>{item.locked?<Icon name="unlock" size={15}/>:<Icon name="lock" size={15}/>} {item.locked?"Unlock":"Lock"}</button>
        <button className="dangerTool" onClick={()=>confirm("Delete "+item.name+"?")&&s.deleteItem(item.id)}><Icon name="trash" size={15}/> Delete</button>
      </div>}

      {showDesignIssues&&issues.length>0&&<div className="designIssuePopover" role="region" aria-label="Design checks"><b>Design checks</b><button aria-label="Close design checks" onClick={()=>setShowDesignIssues(false)}>×</button>{issues.map((issue,n)=><p key={n}>{issue}</p>)}<small>Select the named unit to correct its position or size. A blocked drag keeps its last valid position.</small></div>}
      <div className="statusChip"><span className={issues.length?"statusDot warn":"statusDot live"}/>{issues.length?<button className="issueSummary" aria-expanded={showDesignIssues} onClick={()=>setShowDesignIssues(v=>!v)}>{issues.length} issue{issues.length>1?"s":""} — view details</button>:<span>Design valid</span>}<span className="dotSep">·</span><span className="statusMode">{designKind[0].toUpperCase()+designKind.slice(1)}</span><span className="dotSep">·</span><span role="status">{localSave==="error"?<button onClick={exportJson}>Local save failed — export backup</button>:user?(cloudReady?(cloudSync==="error"?<button onClick={cloudSave}>Cloud save failed — retry</button>:cloudSync==="saving"?"Saving to cloud…":cloudSync==="saved"&&cloudSavedVersion===p.id+p.updatedAt?"Saved to cloud":"Changes waiting to sync"):(cloudSync==="error"?<button onClick={()=>window.location.reload()}>Cloud connection failed — reload</button>:"Cloud connecting")):(localSave==="saved"?"Saved locally":"Local autosave")}</span></div>
    </section>

    {item&&<aside className="inspector">
      <div className="inspectorHeader"><div><small>{item.type}</small><input value={item.name} onChange={e=>patch("name",e.target.value)}/></div><button className="iconBtn" onClick={()=>setRightOpen(false)}><Icon name="x" size={16}/></button></div>
      <div className="inspectorBody">
        <section className="inspectorGroup"><h4>Position · {displayUnit}</h4><div className="fieldGrid3">{(["x","y","z"] as const).map((k,n)=><label key={k}>{["Left / right","Height","Forward / back"][n]}<small>{k.toUpperCase()}</small><MeasureInput value={item[k]} unit={displayUnit} min={0} onCommit={v=>patch(k,v)}/></label>)}</div><label className="rotationField">Rotation<select value={normalizeRotation(item.rotation??0)} onChange={e=>rotateItem(item.id,+e.target.value)}>{[0,90,180,270].map(v=><option key={v} value={v}>{v}°</option>)}</select></label>{["Dishwasher","Washing machine"].includes(item.type)&&<button disabled={item.locked} onClick={()=>{const at=alignApplianceFront(item,p.items);if(!at){setNotice("No neighbouring cabinet run found. Use the position fields to align this appliance.");return}s.checkpoint();moveSafely(item.id,at.x,item.y,at.z)}}>Align front with cabinets</button>}</section>
        <section className="inspectorGroup"><h4>Size · {displayUnit}</h4><div className="fieldGrid3">{(["width","height","depth"] as const).map((k,n)=><label key={k}>{["W","H","D"][n]}<MeasureInput value={item[k]} unit={displayUnit} min={k==="width"||k==="height"||k==="depth"?1:0} onCommit={v=>patch(k,v)}/></label>)}</div></section>
        <section className="inspectorGroup"><h4>Configuration</h4><div className="fieldGrid2"><label>Shelves<input type="number" min="0" value={item.shelves} onChange={e=>patch("shelves",Math.max(0,+e.target.value))}/></label><label>Doors<input type="number" min="0" value={item.doors} onChange={e=>patch("doors",Math.max(0,+e.target.value))}/></label></div><label>Hardware<select value={item.hardware} onChange={e=>patch("hardware",e.target.value)}>{HANDLE_STYLES.map(x=><option key={x}>{x}</option>)}</select></label><label>Layer<select value={item.layer??"Joinery"} onChange={e=>patch("layer",e.target.value)}>{["Joinery","Architecture","Services","Decor"].map(x=><option key={x}>{x}</option>)}</select></label><label className="checkRow"><input type="checkbox" checked={item.visible!==false} onChange={e=>patch("visible",e.target.checked)}/>Visible in drawings and 3D</label><label className="checkRow"><input type="checkbox" checked={item.locked} onChange={e=>patch("locked",e.target.checked)}/>Lock position</label></section>
        {kitchenSurfaceTypes.has(item.type)&&<KitchenOptions item={item} onChange={change=>s.updateItem(item.id,change)} onApplyFronts={()=>{s.updateItems(p.items.filter(i=>kitchenSurfaceTypes.has(i.type)).map(i=>i.id),{frontStyle:item.frontStyle??"slab",doorMaterialId:item.doorMaterialId??item.materialId});setNotice("Front style and colour applied throughout the kitchen. Use Undo to restore.")}} onApplyHandles={()=>{s.updateItems(p.items.filter(i=>kitchenSurfaceTypes.has(i.type)).map(i=>i.id),{hardware:item.hardware,handleFinish:item.handleFinish??"Brushed steel",handleLength:item.handleLength??160});setNotice("Handles applied throughout the kitchen. Use Undo to restore.")}}/>}
        {item.type==="Kitchen accessory"&&<section className="inspectorGroup"><h4>Kitchen accessory</h4><label>Model<select value={item.productStyle??"Ceramic mug"} onChange={e=>s.updateItem(item.id,e.target.value==="Cooking pot"?{productStyle:"Cooking pot",width:350,height:170,depth:270}:{productStyle:"Ceramic mug",width:150,height:125,depth:120})}><option>Ceramic mug</option><option>Cooking pot</option></select></label><p className="surfaceHelp">CC0 models by Davilion. Set the bottom height to your finished worktop height.</p></section>}
        {item.type==="Bed wall"&&<section className="inspectorGroup"><h4>Headboard</h4><label>Panel style<select value={item.productStyle??"Tufted"} onChange={e=>patch("productStyle",e.target.value)}>{["Tufted","Vertical panels","Plain"].map(v=><option key={v}>{v}</option>)}</select></label></section>}
        {["Wardrobe","Sliding wardrobe"].includes(item.type)&&<section className="inspectorGroup"><h4>Wardrobe internals</h4><label>Layout<select value={item.wardrobeLayout??"mixed"} onChange={e=>patch("wardrobeLayout",e.target.value)}><option value="mixed">Hanging + shelves</option><option value="hanging">Full hanging</option><option value="shelves">Shelves only</option></select></label><label>Plinth height (mm)<input type="number" min="0" max="250" value={item.plinthHeight??80} onChange={e=>patch("plinthHeight",Math.max(0,Math.min(250,+e.target.value)))}/></label></section>}
        {["Straight staircase","L staircase","U staircase"].includes(item.type)&&<section className="inspectorGroup"><h4>Stair construction</h4><label>Number of risers<input type="number" min="4" max="40" value={item.stairRisers??Math.round(item.height/180)} onChange={e=>patch("stairRisers",Math.max(4,Math.min(40,+e.target.value)))}/></label><label>Railing<select value={item.stairRailing??"both"} onChange={e=>patch("stairRailing",e.target.value)}>{["both","left","right","none"].map(v=><option key={v}>{v}</option>)}</select></label><label>Railing height (mm)<input type="number" min="500" max="1400" value={item.stairRailHeight??900} onChange={e=>patch("stairRailHeight",Math.max(500,Math.min(1400,+e.target.value)))}/></label>{(["treads","risers","railing"] as JoineryPart[]).map(part=><label key={part}>{part}<select value={materialIdForPart(part)} onChange={e=>s.updateItem(item.id,{[materialFieldForPart(part)]:e.target.value})}>{availableMaterials.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>)}</section>}
        <section className="inspectorGroup"><h4>Interaction</h4>{openableSelected&&<><button onClick={()=>patch("openAmount",(item.openAmount??0)>0?0:100)}>{(item.openAmount??0)>0?"Close doors / drawers":"Open doors / drawers"}</button><label>Open doors / drawers<input type="range" min="0" max="100" step="5" value={item.openAmount??0} onPointerDown={()=>s.checkpoint()} onChange={e=>s.moveItem(item.id,{openAmount:+e.target.value})}/><span className="rangeValue">{item.openAmount??0}%</span></label></>}{applianceTypes.has(item.type)&&<><label>Appliance style<select value={item.productStyle??"Contemporary"} onChange={e=>patch("productStyle",e.target.value)}>{["Contemporary","Minimal","Classic","Professional"].map(x=><option key={x}>{x}</option>)}</select></label><label>Appliance colour<select value={item.colourVariant??"Stainless steel"} onChange={e=>patch("colourVariant",e.target.value)}>{["Stainless steel","Black","White","Graphite","Cream"].map(x=><option key={x}>{x}</option>)}</select></label></>}{item.type==="Sink base"&&<><label>Sink style<select value={item.productStyle??"Inset stainless"} onChange={e=>patch("productStyle",e.target.value)}>{["Inset stainless","Undermount","Belfast ceramic"].map(x=><option key={x}>{x}</option>)}</select></label><label>Sink finish<select value={item.colourVariant??"Stainless steel"} onChange={e=>patch("colourVariant",e.target.value)}>{["Stainless steel","Black","White ceramic"].map(x=><option key={x}>{x}</option>)}</select></label></>}{(item.type==="Tap"||item.type.endsWith(" tap"))&&<><label>Tap style<select value={item.productStyle??"Arc mixer"} onChange={e=>patch("productStyle",e.target.value)}>{["Arc mixer","Pull-out","Bridge","Square neck","Cross-handle mixer"].map(x=><option key={x}>{x}</option>)}</select></label><label>Tap finish<select value={item.colourVariant??"Chrome"} onChange={e=>patch("colourVariant",e.target.value)}>{["Chrome","Brushed steel","Matt black","Brass"].map(x=><option key={x}>{x}</option>)}</select></label></>}</section>
        <section className="inspectorGroup"><h4>{cabinetSurfaceSelected?"Materials by part":item.type==="Worktop"?"Worktop finish":item.type==="Backsplash"?"Backsplash finish":"Material & finish"}</h4>
        {cabinetSurfaceSelected?<><label>Front style<select value={item.frontStyle??"slab"} onChange={e=>patch("frontStyle",e.target.value)}>{FRONT_STYLES.map(v=><option key={v} value={v}>{v.replaceAll("-"," ")}</option>)}</select></label><p className="surfaceHelp">Click a cabinet face in 3D to select that surface. You can also choose a surface here.</p><div className="surfacePicker">{(["carcass","fronts","left-side","right-side","plinth"] as JoineryPart[]).map(part=><button key={part} className={selectedPart===part?"active":""} onClick={()=>setSelectedPart(part)}>{part==="fronts"?"Doors / fronts":part==="left-side"?"Left side":part==="right-side"?"Right side":part[0].toUpperCase()+part.slice(1)}</button>)}{["Kitchen island","Base cabinet","Drawer unit","Hob base","Corner cabinet"].includes(item.type)&&<button className={selectedPart==="worktop"?"active":""} onClick={()=>setSelectedPart("worktop")}>Worktop</button>}</div><label>Carcass<select value={item.carcassMaterialId??item.materialId} onChange={e=>patch("carcassMaterialId",e.target.value)}>{unitMaterialsFor(item.carcassMaterialId??item.materialId).map(m=><option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}</select></label><div className="fieldGrid2"><label>Left visible side<select value={item.leftSideMaterialId??item.sideMaterialId??item.carcassMaterialId??item.materialId} onChange={e=>patch("leftSideMaterialId",e.target.value)}>{unitMaterialsFor(item.leftSideMaterialId??item.sideMaterialId??item.carcassMaterialId??item.materialId).map(m=><option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}</select></label><label>Right visible side<select value={item.rightSideMaterialId??item.sideMaterialId??item.carcassMaterialId??item.materialId} onChange={e=>patch("rightSideMaterialId",e.target.value)}>{unitMaterialsFor(item.rightSideMaterialId??item.sideMaterialId??item.carcassMaterialId??item.materialId).map(m=><option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}</select></label></div><label>Doors / fronts<select value={item.doorMaterialId??item.materialId} onChange={e=>patch("doorMaterialId",e.target.value)}>{unitMaterialsFor(item.doorMaterialId??item.materialId).map(m=><option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}</select></label><label>Plinth material<select value={item.plinthMaterialId??item.carcassMaterialId??item.materialId} onChange={e=>patch("plinthMaterialId",e.target.value)}>{unitMaterialsFor(item.plinthMaterialId??item.carcassMaterialId??item.materialId).map(m=><option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}</select></label>{["Kitchen island","Base cabinet","Drawer unit","Hob base","Corner cabinet"].includes(item.type)&&<label>Top panel / worktop<select value={item.worktopMaterialId??"stone-light"} onChange={e=>patch("worktopMaterialId",e.target.value)}>{availableMaterials.filter(m=>m.category==="Worktop"||m.category==="Custom").map(m=><option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}</select></label>}<label>Plinth style<select value={item.plinthStyle??"recessed"} onChange={e=>patch("plinthStyle",e.target.value)}>{["recessed","flush","legs","none"].map(x=><option key={x} value={x}>{x[0].toUpperCase()+x.slice(1)}</option>)}</select></label>{(item.plinthStyle??"recessed")==="recessed"&&<label>Plinth recess (mm)<input type="number" min="0" max="250" value={item.plinthRecess??65} onChange={e=>patch("plinthRecess",Math.max(0,+e.target.value))}/></label>}</>:item.type==="Worktop"?<WorktopOptions key={item.id} item={item} materials={availableMaterials} onChange={change=>s.updateItem(item.id,change)}/>:item.type==="Backsplash"?<SplashbackOptions key={item.id} item={item} materials={availableMaterials} onChange={change=>s.updateItem(item.id,change)}/>:<label>Material<select value={item.materialId} onChange={e=>patch("materialId",e.target.value)}>{availableMaterials.map(m=><option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}</select></label>}
        <div className="materialPreview"><i style={{background:material(selectedPart?materialIdForPart(selectedPart):item.type==="Worktop"?(item.worktopMaterialId??item.materialId):item.doorMaterialId??item.materialId,p.customMaterials??[]).colour}}/><span><b>{material(selectedPart?materialIdForPart(selectedPart):item.type==="Worktop"?(item.worktopMaterialId??item.materialId):item.doorMaterialId??item.materialId,p.customMaterials??[]).code}</b>{material(selectedPart?materialIdForPart(selectedPart):item.type==="Worktop"?(item.worktopMaterialId??item.materialId):item.doorMaterialId??item.materialId,p.customMaterials??[]).name}</span></div><label>Finish<input value={item.finish} onChange={e=>patch("finish",e.target.value)}/></label><label>Edge<select value={item.edgeBanding} onChange={e=>patch("edgeBanding",e.target.value)}>{["Matching 1mm","Matching 2mm","Contrast edge","None / raw"].map(x=><option key={x}>{x}</option>)}</select></label></section>
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
        <div className="groupLabel">Room · {displayUnit}</div>
        <label>Display units<select value={displayUnit} onChange={e=>s.updateProject({displayUnit:e.target.value as DisplayUnit})}><option value="mm">Millimetres</option><option value="cm">Centimetres</option><option value="in">Inches</option></select></label><small>Sizes and positions use {displayUnit}. Stored geometry stays in millimetres.</small><div className="fieldGrid3">{(["roomWidth","roomHeight","roomDepth"] as const).map((k,n)=><label key={k}>{["W","H","D"][n]}<MeasureInput value={p[k]} unit={displayUnit} min={100} onCommit={v=>s.updateProject({[k]:v})}/></label>)}</div>
        <div className="groupLabel">Rules · mm</div>
        <div className="fieldGrid2"><label>Wall clearance<input type="number" min="0" value={p.rules.wallClearance} onChange={e=>s.updateProject({rules:{...p.rules,wallClearance:Math.max(0,+e.target.value)}})}/></label><label>Component gap<input type="number" min="0" value={p.rules.componentGap} onChange={e=>s.updateProject({rules:{...p.rules,componentGap:Math.max(0,+e.target.value)}})}/></label><label>Snap grid<input type="number" min="1" value={p.rules.snap} onChange={e=>s.updateProject({rules:{...p.rules,snap:Math.max(1,+e.target.value)}})}/></label><label>Service gap<input type="number" min="0" value={p.rules.serviceClearance??50} onChange={e=>s.updateProject({rules:{...p.rules,serviceClearance:Math.max(0,+e.target.value)}})}/></label></div>
        <div className="groupLabel">Cloud</div>
        <div className="row"><button onClick={()=>{const key=(useStudio.persist.getOptions().name??"").split(":").slice(1).join(":"),raw=window.localStorage.getItem("joinery-recovery:"+key)||window.localStorage.getItem("joinery-studio-v5");if(!raw){setNotice("No recovery copies found on this browser.");return}const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(JSON.parse(raw).state?.projects??JSON.parse(raw),null,2)],{type:"application/json"}));a.download="joinery-local-recovery.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}}>Export recovery copies</button><a href="/">Website home</a></div>
        {!hasSupabase()?<small className="muted">Local storage mode.</small>:!user?<><input placeholder="Email" value={auth.email} onChange={e=>setAuth({...auth,email:e.target.value})}/><input type="password" placeholder="Password" value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})}/><div className="row"><button disabled={busy} onClick={()=>login()}>Login</button><a href="/signup">Request access</a><a href="/forgot-password">Forgot password?</a></div></>:<><div className="cloudStatus"><span className={cloudReady?"statusDot live":"statusDot"}/><span>{cloudReady?"Cloud autosave on":"Preparing cloud sync"}</span></div><small className="muted">{user}</small><div className="row"><button disabled={busy} onClick={cloudSave}>Save all</button><button disabled={busy} onClick={async()=>{setBusy(true);try{await cloud.signOut();setUser(null);setCloudReady(false)}finally{setBusy(false)}}}>Logout</button></div></>}
        {notice&&<small className="noticeText">{notice}</small>}
      </div>
    </div>}

    {menu&&<div className="contextMenu" style={{left:menu.x,top:menu.y}} onClick={e=>e.stopPropagation()}><button onClick={()=>{s.duplicateItem(menu.id);setMenu(null)}}>Duplicate</button><button onClick={()=>{if(confirm("Delete component?"))s.deleteItem(menu.id);setMenu(null)}}>Delete</button></div>}
  </main>
}
