import {supabase,hasSupabase} from "./supabase";
import {Project,JoineryItem,ItemLayer} from "@/types/model";
import {normalizeRotation} from "./geometry";

const ROTATION_SUFFIX=/::jsrot=(0|90|180|270)$/;
const decodeFinish=(finish:string)=>{
  const match=finish.match(ROTATION_SUFFIX);
  return {finish:finish.replace(ROTATION_SUFFIX,""),rotation:match?Number(match[1]):0};
};
const encodeLegacyFinish=(finish:string,rotation:number)=>finish.replace(ROTATION_SUFFIX,"")+"::jsrot="+normalizeRotation(rotation);
const ITEM_META="\n::jsitem=";
const PROJECT_META="\n::jsproject=";
const encodeMeta=(plain:string,marker:string,meta:any)=>plain.replace(new RegExp(marker.trim()+"[^\\n]*$"),"")+marker+encodeURIComponent(JSON.stringify(meta));
const decodeMeta=(value:string|undefined|null,marker:string)=>{
  const raw=value??"",i=raw.lastIndexOf(marker);
  if(i<0)return {plain:raw,meta:{} as any};
  try{return {plain:raw.slice(0,i),meta:JSON.parse(decodeURIComponent(raw.slice(i+marker.length)))}}
  catch{return {plain:raw.slice(0,i),meta:{} as any}}
};

export async function signIn(email:string,password:string){return supabase().auth.signInWithPassword({email,password})}
export async function signOut(){clearCloudSession();return supabase().auth.signOut({scope:"local"})}
export async function currentUser(){if(!hasSupabase())return null;return (await supabase().auth.getUser()).data.user}
export function onAuthChange(cb:(user:{id:string;email?:string}|null)=>void){const {data}=supabase().auth.onAuthStateChange((_event,session)=>cb(session?.user??null));return()=>data.subscription.unsubscribe()}

const toItem=(i:any):JoineryItem=>{
  const legacy=decodeFinish(i.finish??""),decoded=decodeMeta(i.notes,ITEM_META),m=decoded.meta??{};
  return {
    id:i.id,name:i.name,type:i.type,x:i.x,y:i.y,z:i.z,width:i.width,height:i.height,depth:i.depth,
    shelves:i.shelves,doors:i.doors,materialId:i.material_id,finish:legacy.finish,notes:decoded.plain,locked:i.locked,
    hardware:i.hardware,edgeBanding:i.edge_banding,rotation:normalizeRotation(i.rotation??legacy.rotation??0),
    visible:i.visible??true,layer:(i.layer??"Joinery") as ItemLayer,groupId:i.group_id??undefined,
    carcassMaterialId:m.carcassMaterialId,doorMaterialId:m.doorMaterialId,sideMaterialId:m.sideMaterialId,
    leftSideMaterialId:m.leftSideMaterialId,rightSideMaterialId:m.rightSideMaterialId,plinthMaterialId:m.plinthMaterialId,worktopMaterialId:m.worktopMaterialId,worktopEdge:m.worktopEdge,
    plinthStyle:m.plinthStyle,plinthRecess:m.plinthRecess,wallSide:m.wallSide,
    plinthHeight:m.plinthHeight,wardrobeLayout:m.wardrobeLayout,stairRisers:m.stairRisers,stairRailHeight:m.stairRailHeight,stairRailing:m.stairRailing,treadMaterialId:m.treadMaterialId,riserMaterialId:m.riserMaterialId,railingMaterialId:m.railingMaterialId,productStyle:m.productStyle,colourVariant:m.colourVariant,openAmount:m.openAmount
  };
};

export async function loadCloud():Promise<Project[]>{
  const db=supabase();
  const {data:ps,error}=await db.from("projects").select("*").order("updated_at",{ascending:false});
  if(error)throw error;
  const out:Project[]=[];
  for(const p of ps??[]){
    if(p.design_snapshot){versions.set(p.id,p.save_version??0);out.push({...p.design_snapshot,id:p.id,cloudVersion:p.save_version??0});continue}
    versions.set(p.id,p.save_version??0);
    const [itemsResult,revsResult]=await Promise.all([
      db.from("project_items").select("*").eq("project_id",p.id),
      db.from("project_revisions").select("*").eq("project_id",p.id).order("revision")
    ]);
    if(itemsResult.error)throw itemsResult.error;
    if(revsResult.error)throw revsResult.error;
    const projectDecoded=decodeMeta(p.project_notes,PROJECT_META),projectMeta=projectDecoded.meta??{};
    out.push({
      id:p.id,name:p.name,customer:p.customer,reference:p.reference,status:p.status,revision:p.revision,
      roomWidth:p.room_width,roomHeight:p.room_height,roomDepth:p.room_depth,
      rules:{wallClearance:p.wall_clearance,componentGap:p.component_gap,snap:p.snap,serviceClearance:p.service_clearance??50},
      address:p.address??"",notes:projectDecoded.plain,archived:p.archived??false,
      customMaterials:projectMeta.customMaterials??[],floorMaterialId:projectMeta.floorMaterialId,
      createdAt:p.created_at,updatedAt:p.updated_at,cloudVersion:p.save_version??0,
      items:(itemsResult.data??[]).map(toItem),
      revisions:(revsResult.data??[]).map(r=>({id:r.id,revision:r.revision,createdAt:r.created_at,snapshot:r.snapshot}))
    });
  }
  return out;
}

const versions=new Map<string,number>();
let saveQueue:Promise<unknown>=Promise.resolve();
let sessionOwner:string|null=null;
let sessionGeneration=0;
export function saveCloud(p:Project){
  const snapshot=structuredClone(p),owner=sessionOwner,generation=sessionGeneration;
  const run=saveQueue.catch(()=>{}).then(async()=>{
    const db=supabase(),u=(await db.auth.getUser()).data.user;
    if(!u||u.id!==owner||generation!==sessionGeneration)throw new Error("Account changed. This save was cancelled.");
    const expected=versions.get(snapshot.id)??0;
    const {data,error}=await db.rpc("save_design",{design:snapshot,expected_version:expected});
    if(error)throw new Error(/conflict/i.test(error.message)?"This project changed in another tab. Export a backup, then reload to review the latest saved design.":error.message+". Check that the latest database migration is installed.");
    if(generation===sessionGeneration)versions.set(snapshot.id,Number(data));
    return {id:snapshot.id,version:Number(data),updatedAt:snapshot.updatedAt};
  });
  saveQueue=run;return run;
}
export function clearCloudSession(owner:string|null=null){sessionGeneration++;sessionOwner=owner;versions.clear()}
export async function requestPasswordReset(email:string){return supabase().auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+"/reset-password"})}
export async function updatePassword(password:string){return supabase().auth.updateUser({password})}
export async function saveAllCloud(projects:Project[]){const out=[];for(const p of projects)out.push(await saveCloud(p));return out}
export function deleteCloud(id:string){
  const owner=sessionOwner,generation=sessionGeneration;
  const run=saveQueue.catch(()=>{}).then(async()=>{
    const db=supabase(),u=(await db.auth.getUser()).data.user;
    if(!u||u.id!==owner||generation!==sessionGeneration)throw new Error("Account changed. Deletion cancelled.");
    const {error}=await db.from("projects").delete().eq("id",id);if(error)throw error;
    // Retain the version so undo cannot silently recreate a deleted cloud project.
  });saveQueue=run;return run;
}
