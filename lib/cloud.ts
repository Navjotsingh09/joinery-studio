import {supabase,hasSupabase} from "./supabase";
import {Project,JoineryItem,ItemLayer} from "@/types/model";
import {normalizeRotation} from "./geometry";

const ROTATION_SUFFIX=/::jsrot=(0|90|180|270)$/;
const decodeFinish=(finish:string)=>{
  const match=finish.match(ROTATION_SUFFIX);
  return {finish:finish.replace(ROTATION_SUFFIX,""),rotation:match?Number(match[1]):0};
};
const encodeLegacyFinish=(finish:string,rotation:number)=>finish.replace(ROTATION_SUFFIX,"")+"::jsrot="+normalizeRotation(rotation);

export async function signIn(email:string,password:string){return supabase().auth.signInWithPassword({email,password})}
export async function signUp(email:string,password:string){return supabase().auth.signUp({email,password})}
export async function signOut(){return supabase().auth.signOut()}
export async function currentUser(){if(!hasSupabase())return null;return (await supabase().auth.getUser()).data.user}
export function onAuthChange(cb:(email:string|null)=>void){const {data}=supabase().auth.onAuthStateChange((_event,session)=>cb(session?.user?.email??null));return()=>data.subscription.unsubscribe()}

const toItem=(i:any):JoineryItem=>{
  const legacy=decodeFinish(i.finish??"");
  return {
    id:i.id,name:i.name,type:i.type,x:i.x,y:i.y,z:i.z,width:i.width,height:i.height,depth:i.depth,
    shelves:i.shelves,doors:i.doors,materialId:i.material_id,finish:legacy.finish,notes:i.notes,locked:i.locked,
    hardware:i.hardware,edgeBanding:i.edge_banding,rotation:normalizeRotation(i.rotation??legacy.rotation??0),
    visible:i.visible??true,layer:(i.layer??"Joinery") as ItemLayer,groupId:i.group_id??undefined
  };
};

export async function loadCloud():Promise<Project[]>{
  const db=supabase();
  const {data:ps,error}=await db.from("projects").select("*").order("updated_at",{ascending:false});
  if(error)throw error;
  const out:Project[]=[];
  for(const p of ps??[]){
    const [itemsResult,revsResult]=await Promise.all([
      db.from("project_items").select("*").eq("project_id",p.id),
      db.from("project_revisions").select("*").eq("project_id",p.id).order("revision")
    ]);
    if(itemsResult.error)throw itemsResult.error;
    if(revsResult.error)throw revsResult.error;
    out.push({
      id:p.id,name:p.name,customer:p.customer,reference:p.reference,status:p.status,revision:p.revision,
      roomWidth:p.room_width,roomHeight:p.room_height,roomDepth:p.room_depth,
      rules:{wallClearance:p.wall_clearance,componentGap:p.component_gap,snap:p.snap,serviceClearance:p.service_clearance??50},
      address:p.address??"",notes:p.project_notes??"",archived:p.archived??false,
      createdAt:p.created_at,updatedAt:p.updated_at,
      items:(itemsResult.data??[]).map(toItem),
      revisions:(revsResult.data??[]).map(r=>({id:r.id,revision:r.revision,createdAt:r.created_at,snapshot:r.snapshot}))
    });
  }
  return out;
}

export async function saveCloud(p:Project){
  const db=supabase();
  const u=(await db.auth.getUser()).data.user;
  if(!u)throw new Error("Sign in first");
  const legacyRow={
    id:p.id,user_id:u.id,name:p.name,customer:p.customer,reference:p.reference,status:p.status,revision:p.revision,
    room_width:p.roomWidth,room_height:p.roomHeight,room_depth:p.roomDepth,
    wall_clearance:p.rules.wallClearance,component_gap:p.rules.componentGap,snap:p.rules.snap,updated_at:new Date().toISOString()
  };
  const modernRow={...legacyRow,address:p.address??"",project_notes:p.notes??"",archived:p.archived??false,service_clearance:p.rules.serviceClearance??50};
  let e=(await db.from("projects").upsert(modernRow)).error;
  if(e)e=(await db.from("projects").upsert(legacyRow)).error;
  if(e)throw e;

  if(p.items.length){
    const modernRows=p.items.map(i=>({
      id:i.id,project_id:p.id,name:i.name,type:i.type,x:i.x,y:i.y,z:i.z,width:i.width,height:i.height,depth:i.depth,
      shelves:i.shelves,doors:i.doors,material_id:i.materialId,finish:i.finish,notes:i.notes,locked:i.locked,
      hardware:i.hardware,edge_banding:i.edgeBanding,rotation:normalizeRotation(i.rotation??0),
      visible:i.visible!==false,layer:i.layer??"Joinery",group_id:i.groupId??null
    }));
    e=(await db.from("project_items").upsert(modernRows)).error;
    if(e){
      const compatibilityRows=modernRows.map(({visible,layer,group_id,...r})=>r);
      e=(await db.from("project_items").upsert(compatibilityRows)).error;
      if(e&&/rotation/i.test(e.message??"")){
        const legacyRows=compatibilityRows.map(({rotation,...r},index)=>({...r,finish:encodeLegacyFinish(p.items[index].finish,rotation)}));
        e=(await db.from("project_items").upsert(legacyRows)).error;
      }
    }
    if(e)throw e;

    const existing=await db.from("project_items").select("id").eq("project_id",p.id);
    if(existing.error)throw existing.error;
    const keep=new Set(p.items.map(i=>i.id)),stale=(existing.data??[]).map(x=>x.id).filter(id=>!keep.has(id));
    if(stale.length){
      e=(await db.from("project_items").delete().eq("project_id",p.id).in("id",stale)).error;
      if(e)throw e;
    }
  }else{
    e=(await db.from("project_items").delete().eq("project_id",p.id)).error;
    if(e)throw e;
  }

  for(const r of p.revisions){
    e=(await db.from("project_revisions").upsert({id:r.id,project_id:p.id,revision:r.revision,snapshot:r.snapshot,created_at:r.createdAt})).error;
    if(e)throw e;
  }
}
export async function saveAllCloud(projects:Project[]){for(const p of projects)await saveCloud(p)}
export async function deleteCloud(id:string){const {error}=await supabase().from("projects").delete().eq("id",id);if(error)throw error}
