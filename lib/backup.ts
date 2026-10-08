import {validCamera,validLighting} from "./renderSettings";
import {validDrawingReference} from "./drawingReference";
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
    if(x.address!==undefined&&!str(x.address)||x.notes!==undefined&&!str(x.notes)||x.archived!==undefined&&typeof x.archived!=="boolean")return false;
    if(x.floorMaterialId!==undefined&&!str(x.floorMaterialId)||x.customMaterials!==undefined&&!Array.isArray(x.customMaterials))return false;
    if(x.designKind!==undefined&&!["kitchen","bedroom","stairs"].includes(x.designKind)||x.displayUnit!==undefined&&!["mm","cm","in"].includes(x.displayUnit)||x.drawingReference!==undefined&&!validDrawingReference(x.drawingReference))return false;
    if(x.savedCameras!==undefined&&(!Array.isArray(x.savedCameras)||x.savedCameras.length>20||!x.savedCameras.every(validCamera))||x.lighting!==undefined&&!validLighting(x.lighting)||x.nextItemNumber!==undefined&&(!Number.isInteger(x.nextItemNumber)||x.nextItemNumber<1))return false;
    if(!x.rules||!num(x.rules.wallClearance)||!num(x.rules.componentGap)||!num(x.rules.snap)||(x.rules.serviceClearance!==undefined&&!num(x.rules.serviceClearance))||!Array.isArray(x.items)||!Array.isArray(x.revisions))return false;
    return x.items.every(i=>i&&str(i.id)&&str(i.name)&&str(i.type)&&num(i.x)&&num(i.y)&&num(i.z)&&num(i.width)&&num(i.height)&&num(i.depth)&&num(i.shelves)&&num(i.doors)&&str(i.materialId)&&str(i.finish)&&str(i.notes)&&typeof i.locked==="boolean"&&str(i.hardware)&&str(i.edgeBanding)&&(i.sourceUnitIds===undefined||(Array.isArray(i.sourceUnitIds)&&i.sourceUnitIds.every(str)))&&(i.unitNumber===undefined||(Number.isInteger(i.unitNumber)&&i.unitNumber>0))&&(i.frontStyle===undefined||["slab","shaker","slim-shaker","raised-panel","fluted"].includes(i.frontStyle))&&(i.worktopFinishedEdges===undefined||(Array.isArray(i.worktopFinishedEdges)&&i.worktopFinishedEdges.every(e=>["front","back","left","right"].includes(e))))&&(i.rotation===undefined||num(i.rotation))&&(i.visible===undefined||typeof i.visible==="boolean")&&(i.layer===undefined||str(i.layer))&&(i.groupId===undefined||str(i.groupId))&&(i.carcassMaterialId===undefined||str(i.carcassMaterialId))&&(i.doorMaterialId===undefined||str(i.doorMaterialId))&&(i.sideMaterialId===undefined||str(i.sideMaterialId))&&(i.leftSideMaterialId===undefined||str(i.leftSideMaterialId))&&(i.rightSideMaterialId===undefined||str(i.rightSideMaterialId))&&(i.plinthMaterialId===undefined||str(i.plinthMaterialId))&&(i.worktopMaterialId===undefined||str(i.worktopMaterialId))&&(i.plinthSides===undefined||(Array.isArray(i.plinthSides)&&i.plinthSides.every(e=>["front","back","left","right"].includes(e))))&&(i.plinthStyle===undefined||["recessed","flush","legs","none"].includes(i.plinthStyle))&&(i.plinthRecess===undefined||num(i.plinthRecess))&&(i.wallSide===undefined||str(i.wallSide))&&(i.productStyle===undefined||str(i.productStyle))&&(i.colourVariant===undefined||str(i.colourVariant))&&(i.plinthHeight===undefined||num(i.plinthHeight))&&(i.wardrobeLayout===undefined||str(i.wardrobeLayout))&&(i.stairRisers===undefined||num(i.stairRisers))&&(i.stairRailHeight===undefined||num(i.stairRailHeight))&&(i.stairRailing===undefined||str(i.stairRailing))&&(i.treadMaterialId===undefined||str(i.treadMaterialId))&&(i.riserMaterialId===undefined||str(i.riserMaterialId))&&(i.railingMaterialId===undefined||str(i.railingMaterialId))&&(i.openAmount===undefined||num(i.openAmount))&&
      (i.handleFinish===undefined||["Chrome","Brushed steel","Matt black","Brass","Copper"].includes(i.handleFinish))&&
      (i.larderLayout===undefined||["shelves","pull-out","internal-drawers"].includes(i.larderLayout))&&
      (i.hobStyle===undefined||["induction","gas","ceramic","grill"].includes(i.hobStyle))&&
      (i.hobZones===undefined||[2,4,5].includes(i.hobZones))&&
      (i.islandStyle===undefined||["storage","breakfast","dining","extended","hob","grill"].includes(i.islandStyle))&&
      (i.islandAppliance===undefined||["none","sink","hob","grill"].includes(i.islandAppliance))&&
      (i.seatingSide===undefined||["back","front"].includes(i.seatingSide))&&
      (i.islandFront===undefined||["doors","drawers"].includes(i.islandFront))&&
      [i.handleLength,i.topThickness,i.topOverhang,i.seatingOverhang,i.counterExtension].every(v=>v===undefined||(num(v)&&v>=0&&v<=2000))&&
      [i.islandSinkStyle,i.islandSinkFinish,i.islandTapStyle,i.islandTapFinish].every(v=>v===undefined||str(v)));
  });
}
