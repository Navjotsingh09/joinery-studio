"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {useStudio} from "@/lib/store";
import {newItem} from "@/lib/defaults";
import {MATERIALS,material} from "@/lib/materials";
import {Drawing2D} from "./Drawing2D";
import {Scene3D} from "./Scene3D";
import {validate,findFreePlacement,clampItemToRoom,canPlace} from "@/lib/geometry";
import {exportPdf} from "@/lib/pdf";
import {hasSupabase} from "@/lib/supabase";
import * as cloud from "@/lib/cloud";
import {ProjectStatus} from "@/types/model";

export default function Studio(){
  const s=useStudio();
  const p=s.projects.find(x=>x.id===s.activeId)??s.projects[0];
  const item=p?.items.find(i=>i.id===s.selectedId);
  const [tab,setTab]=useState<"components"|"materials"|"revisions">("components");
  const [search,setSearch]=useState("");
  const [menu,setMenu]=useState<{x:number;y:number;id:string}|null>(null);
  const [auth,setAuth]=useState({email:"",password:""});
  const [user,setUser]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const file=useRef<HTMLInputElement>(null);
  const issues=useMemo(()=>validate(p),[p]);

  useEffect(()=>{if(hasSupabase())cloud.currentUser().then(u=>setUser(u?.email??null)).catch(()=>setUser(null))},[]);
  const cloudSave=async()=>{if(!hasSupabase()||!user)return;setBusy(true);try{await cloud.saveCloud(p);setNotice("Saved to cloud.")}catch(e:any){setNotice("Cloud save failed: "+(e?.message??"Unknown error"))}finally{setBusy(false)}};
  useEffect(()=>{if(!hasSupabase()||!user)return;const t=window.setTimeout(()=>{cloud.saveCloud(p).catch(()=>{})},1600);return()=>window.clearTimeout(t)},[user,p]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      const tag=(e.target as HTMLElement)?.tagName;
      if(["INPUT","TEXTAREA","SELECT"].includes(tag))return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();cloudSave()}
      else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();e.shiftKey?s.redo():s.undo()}
      else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){e.preventDefault();s.redo()}
      else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="d"&&item){e.preventDefault();s.duplicateItem(item.id)}
      else if((e.key==="Delete"||e.key==="Backspace")&&item){e.preventDefault();if(confirm("Delete "+item.name+"?"))s.deleteItem(item.id)}
      else if(item&&e.key.startsWith("Arrow")){e.preventDefault();const st=e.shiftKey?100:p.rules.snap,dx=e.key==="ArrowLeft"?-st:e.key==="ArrowRight"?st:0,d=e.key==="ArrowDown"?-st:e.key==="ArrowUp"?st:0;const q=clampItemToRoom({...item,x:item.x+dx,y:s.view==="top"?item.y:item.y+d,z:s.view==="top"?item.z+d:item.z},p);if(canPlace(p,q,item.id))s.updateItem(item.id,{x:q.x,y:q.y,z:q.z})}
    };
    window.addEventListener("keydown",key); return()=>window.removeEventListener("keydown",key)
  },[s,item,p]);

  const add=(type:string)=>{const i=findFreePlacement(p,newItem(type));if(!canPlace(p,i)){setNotice("No collision-free space remains for that component.");return}s.addItem(i)};
  const patch=(k:string,v:any)=>{
    if(!item)return;
    if(!["x","y","z","width","height","depth"].includes(k)){s.updateItem(item.id,{[k]:v});return}
    const n=Number(v)||0;
    let candidate={...item};
    if(k==="x")candidate.x=n;
    if(k==="y")candidate.y=n;
    if(k==="z")candidate.z=n;
    if(k==="width")candidate.width=Math.max(1,n);
    if(k==="height")candidate.height=Math.max(1,n);
    if(k==="depth")candidate.depth=Math.max(1,n);
    candidate=clampItemToRoom(candidate,p);
    if(canPlace(p,candidate,item.id))s.updateItem(item.id,candidate);
    else setNotice("That edit would leave the room or clash with another component.");
  };
  const exportJson=()=>{const b=new Blob([JSON.stringify(s.projects,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="joinery-studio-projects.json";a.click();URL.revokeObjectURL(a.href)};
  const importJson=async(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(!f)return;try{const d=JSON.parse(await f.text());if(!Array.isArray(d))throw new Error();if(confirm("Replace local projects with this backup?"))s.replaceAll(d)}catch{alert("Invalid Joinery Studio JSON file.")}e.target.value=""};
  const sync=async()=>{try{await cloud.saveCloud(p);alert("Saved to Supabase.")}catch(e:any){alert(e.message)}};
  const login=async(signup=false)=>{setBusy(true);setNotice("");try{const r=signup?await cloud.signUp(auth.email,auth.password):await cloud.signIn(auth.email,auth.password);if(r.error){setNotice(r.error.message);return}setUser(r.data.user?.email??auth.email);const ps=await cloud.loadCloud();if(ps.length){s.replaceAll(ps);setNotice("Cloud projects loaded.")}else setNotice(signup?"Account created. Confirm your email if required, then sign in.":"Signed in. No cloud projects yet.")}catch(e:any){setNotice(e?.message??"Authentication failed.")}finally{setBusy(false)}};

  return <main className="shell" onClick={()=>setMenu(null)}>
    <header><div><b>JOINERY</b><span>STUDIO</span></div><div className="projectMeta"><strong>{p.name}</strong><small>{p.reference} · Rev {p.revision}</small></div><div className="actions"><button onClick={s.undo}>Undo</button><button onClick={s.redo}>Redo</button><button onClick={exportJson}>JSON ↓</button><button onClick={()=>file.current?.click()}>JSON ↑</button><input ref={file} hidden type="file" accept=".json" onChange={importJson}/><button onClick={()=>exportPdf(p)}>PDF</button>{hasSupabase()&&user&&<button disabled={busy} onClick={sync}>{busy?"Saving…":"Cloud save"}</button>}<button disabled={issues.length>0} className="primary" onClick={s.saveRevision}>Save revision</button></div></header>
    <aside className="left">
      <section><label>Project</label><select value={p.id} onChange={e=>s.setActive(e.target.value)}>{s.projects.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><div className="row"><button onClick={s.addProject}>New</button><button onClick={async()=>{if(!confirm('Delete project "'+p.name+'"?'))return;if(hasSupabase()&&user){try{await cloud.deleteCloud(p.id)}catch(e:any){return alert(e.message)}}s.deleteProject()}}>Delete</button></div></section>
      {!hasSupabase()?<section className="cloudNote"><b>Local mode</b><small>Add Supabase env values for account/cloud sync.</small></section>:!user?<section><label>Supabase account</label><input placeholder="Email" value={auth.email} onChange={e=>setAuth({...auth,email:e.target.value})}/><input type="password" placeholder="Password" value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})}/><div className="row"><button disabled={busy} onClick={()=>login(false)}>Login</button><button disabled={busy} onClick={()=>login(true)}>Sign up</button></div></section>:<section><small>Signed in as {user}</small><div className="row"><button disabled={busy} onClick={async()=>{setBusy(true);try{const ps=await cloud.loadCloud();if(ps.length){s.replaceAll(ps);setNotice("Cloud projects loaded.")}else setNotice("No cloud projects found.")}catch(e:any){setNotice(e?.message??"Cloud load failed.")}finally{setBusy(false)}}}>Load cloud</button><button onClick={async()=>{await cloud.signOut();setUser(null)}}>Logout</button></div></section>}
      {notice&&<section className="cloudNote"><small>{notice}</small></section>}<section><label>Project name</label><input value={p.name} onChange={e=>s.updateProject({name:e.target.value})}/><label>Customer</label><input value={p.customer} onChange={e=>s.updateProject({customer:e.target.value})}/><label>Reference</label><input value={p.reference} onChange={e=>s.updateProject({reference:e.target.value})}/><label>Status</label><select value={p.status} onChange={e=>s.updateProject({status:e.target.value as ProjectStatus})}>{(["Draft","Presented","Accepted","Rejected"] as ProjectStatus[]).map(x=><option key={x}>{x}</option>)}</select><label>Room W / H / D (mm)</label><div className="triple">{(["roomWidth","roomHeight","roomDepth"] as const).map(k=><input key={k} min="100" type="number" value={p[k]} onChange={e=>s.updateProject({[k]:Math.max(100,+e.target.value)})}/>)}</div><label>Clearance / Gap / Snap (mm)</label><div className="triple"><input type="number" min="0" value={p.rules.wallClearance} onChange={e=>s.updateProject({rules:{...p.rules,wallClearance:Math.max(0,+e.target.value)}})}/><input type="number" min="0" value={p.rules.componentGap} onChange={e=>s.updateProject({rules:{...p.rules,componentGap:Math.max(0,+e.target.value)}})}/><input type="number" min="1" value={p.rules.snap} onChange={e=>s.updateProject({rules:{...p.rules,snap:Math.max(1,+e.target.value)}})}/></div></section>
      <div className="tabs"><button className={tab==="components"?"active":""} onClick={()=>setTab("components")}>Components</button><button className={tab==="materials"?"active":""} onClick={()=>setTab("materials")}>Materials</button><button className={tab==="revisions"?"active":""} onClick={()=>setTab("revisions")}>History</button></div>
      {tab==="components"&&<><input placeholder="Search components…" value={search} onChange={e=>setSearch(e.target.value)}/><section className="cards">{["Wardrobe","Base cabinet","Wall cabinet","Tall cabinet","Shelving","Media unit"].filter(x=>x.toLowerCase().includes(search.toLowerCase())).map(x=><button key={x} onClick={()=>add(x)}><b>{x}</b><small>Add to design</small></button>)}</section></>}
      {tab==="materials"&&<section className="materials">{MATERIALS.map(m=><div key={m.id}><i style={{background:m.colour}}/><span><b>{m.code}</b> {m.name}<small>{m.category} · {m.thickness} mm</small></span></div>)}</section>}
      {tab==="revisions"&&<section className="revisionList">{[...p.revisions].reverse().map(r=><div key={r.id}><b>Revision {r.revision}</b><small>{new Date(r.createdAt).toLocaleString()}</small><button onClick={()=>confirm("Restore revision "+r.revision+"?")&&s.restoreRevision(r.id)}>Restore</button></div>)}{!p.revisions.length&&<small>No saved revisions yet.</small>}</section>}
    </aside>
    <section className="workspace"><nav>{(["front","top","side","3d"] as const).map(v=><button key={v} className={s.view===v?"active":""} onClick={()=>s.setView(v)}>{v.toUpperCase()}</button>)}<span>{issues.length?<b className="warning">{issues.length} validation issue{issues.length>1?"s":""}</b>:<b className="valid">Design valid</b>}</span></nav><div className="stage">{s.view==="3d"?<Scene3D project={p} selected={s.selectedId} onSelect={s.select}/>:<Drawing2D project={p} view={s.view} selected={s.selectedId} onSelect={s.select} onMove={(id,x,y,z)=>s.moveItem(id,{x,y,z})} onMoveStart={s.checkpoint} onContext={(e,id)=>{s.select(id);setMenu({x:e.clientX,y:e.clientY,id})}}/>}</div><footer>{hasSupabase()?(user?"Cloud autosave enabled":"Supabase available"):"Local storage fallback"} · mm coordinate model · Ctrl/Cmd+S save · Ctrl/Cmd+Z undo · Ctrl/Cmd+D duplicate</footer></section>
    <aside className="right">{!item?<div className="empty"><b>No selection</b><p>Select a component to edit it.</p></div>:<><h3>{item.name}</h3><label>Name</label><input value={item.name} onChange={e=>patch("name",e.target.value)}/><label>X / Y / Z</label><div className="triple">{["x","y","z"].map(k=><input key={k} type="number" value={(item as any)[k]} onChange={e=>patch(k,+e.target.value)}/>)}</div><label>Width / Height / Depth</label><div className="triple">{["width","height","depth"].map(k=><input key={k} type="number" value={(item as any)[k]} onChange={e=>patch(k,+e.target.value)}/>)}</div><label>Shelves / Doors</label><div className="triple"><input type="number" value={item.shelves} onChange={e=>patch("shelves",+e.target.value)}/><input type="number" value={item.doors} onChange={e=>patch("doors",+e.target.value)}/></div><label>Material</label><select value={item.materialId} onChange={e=>patch("materialId",e.target.value)}>{MATERIALS.map(m=><option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}</select><div className="swatch" style={{background:material(item.materialId).colour}}/><label>Finish</label><input value={item.finish} onChange={e=>patch("finish",e.target.value)}/><label>Edge banding</label><select value={item.edgeBanding} onChange={e=>patch("edgeBanding",e.target.value)}>{["Matching 1mm","Matching 2mm","Contrast edge","None / raw"].map(x=><option key={x}>{x}</option>)}</select><label>Hardware</label><select value={item.hardware} onChange={e=>patch("hardware",e.target.value)}>{["None","Handleless","Bar handle","Knob","Push-to-open","Client specified"].map(x=><option key={x}>{x}</option>)}</select><label><input type="checkbox" checked={item.locked} onChange={e=>patch("locked",e.target.checked)}/> Lock position</label><textarea placeholder="Notes" value={item.notes} onChange={e=>patch("notes",e.target.value)}/><div className="row"><button onClick={()=>s.duplicateItem(item.id)}>Duplicate</button><button className="danger" onClick={()=>confirm("Delete "+item.name+"?")&&s.deleteItem(item.id)}>Delete</button></div></>}{issues.length>0&&<div className="issues"><b>Validation</b>{issues.slice(0,6).map((x,i)=><p key={i}>{x}</p>)}</div>}</aside>
    {menu&&<div className="contextMenu" style={{left:menu.x,top:menu.y}} onClick={e=>e.stopPropagation()}><button onClick={()=>{s.duplicateItem(menu.id);setMenu(null)}}>Duplicate</button><button onClick={()=>{if(confirm("Delete component?"))s.deleteItem(menu.id);setMenu(null)}}>Delete</button></div>}
  </main>
}