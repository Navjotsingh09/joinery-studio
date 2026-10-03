import {Project,ProjectStatus} from "@/types/model";
const num=(v:unknown)=>typeof v==="number"&&Number.isFinite(v);
const str=(v:unknown)=>typeof v==="string";
const statuses:ProjectStatus[]=["Draft","Presented","Accepted","Rejected"];

export function isProjectBackup(value:unknown):value is Project[]{
  if(!Array.isArray(value)||value.length===0)return false;
  return value.every(p=>{
    if(!p||typeof p!=="object")return false;
    const x=p as Partial<Project>;
    if(!str(x.id)||!str(x.name)||!str(x.customer)||!str(x.reference)||!statuses.includes(x.status as ProjectStatus))return false;
    if(!num(x.revision)||!num(x.roomWidth)||!num(x.roomHeight)||!num(x.roomDepth)||!str(x.createdAt)||!str(x.updatedAt))return false;
    if(x.address!==undefined&&!str(x.address)||x.notes!==undefined&&!str(x.notes)||x.archived!==undefined&&typeof x.archived!=="boolean")return false;\n    if(x.floorMaterialId!==undefined&&!str(x.floorMaterialId)||x.customMaterials!==undefined&&!Array.isArray(x.customMaterials))return false;
    if(!x.rules||!num(x.rules.wallClearance)||!num(x.rules.componentGap)||!num(x.rules.snap)||(x.rules.serviceClearance!==undefined&&!num(x.rules.serviceClearance))||!Array.isArray(x.items)||!Array.isArray(x.revisions))return false;
    return x.items.every(i=>i&&str(i.id)&&str(i.name)&&str(i.type)&&num(i.x)&&num(i.y)&&num(i.z)&&num(i.width)&&num(i.height)&&num(i.depth)&&num(i.shelves)&&num(i.doors)&&str(i.materialId)&&str(i.finish)&&str(i.notes)&&typeof i.locked==="boolean"&&str(i.hardware)&&str(i.edgeBanding)&&(i.rotation===undefined||num(i.rotation))&&(i.visible===undefined||typeof i.visible==="boolean")&&(i.layer===undefined||str(i.layer))&&(i.groupId===undefined||str(i.groupId))&&(i.carcassMaterialId===undefined||str(i.carcassMaterialId))&&(i.doorMaterialId===undefined||str(i.doorMaterialId))&&(i.sideMaterialId===undefined||str(i.sideMaterialId))&&(i.plinthStyle===undefined||str(i.plinthStyle))&&(i.plinthRecess===undefined||num(i.plinthRecess))&&(i.wallSide===undefined||str(i.wallSide))&&(i.productStyle===undefined||str(i.productStyle))&&(i.colourVariant===undefined||str(i.colourVariant))&&(i.openAmount===undefined||num(i.openAmount)));
  });
}
