import {NextResponse} from "next/server";
import {createScenarioPlan} from "@/lib/scenarios";
import {validate} from "@/lib/geometry";

export const dynamic="force-dynamic";

export async function GET(){
  const plan=createScenarioPlan("kitchen","l-shape",4200,2400,3400);
  const types=new Set(plan.items.map(i=>i.type));
  const required=["Corner cabinet","Drawer unit","Sink base","Hob base","Wall cabinet","Dishwasher","Oven tower","Fridge housing","Worktop","Backsplash","Pull-out tap"];
  const issues=validate({
    id:"qa",name:plan.name,customer:"",reference:"QA",status:"Draft",revision:1,
    roomWidth:plan.roomWidth,roomHeight:plan.roomHeight,roomDepth:plan.roomDepth,
    rules:plan.rules,items:plan.items,revisions:[],createdAt:"",updatedAt:""
  });
  const checks={
    valid:issues.length===0,
    requiredComponents:required.every(type=>types.has(type)),
    independentMaterials:plan.items.filter(i=>["Base cabinet","Corner cabinet","Drawer unit","Sink base","Hob base","Wall cabinet","Oven tower"].includes(i.type)).every(i=>!!i.carcassMaterialId&&!!i.doorMaterialId&&!!i.leftSideMaterialId&&!!i.rightSideMaterialId&&!!i.plinthMaterialId),
    recessedPlinth:plan.items.some(i=>i.plinthStyle==="recessed"&&(i.plinthRecess??0)>0),
    wallOrientation:plan.items.some(i=>i.wallSide==="left")&&plan.items.some(i=>i.wallSide==="back"),
    sinkAndTap:types.has("Sink base")&&types.has("Pull-out tap"),
    applianceInventory:types.has("Dishwasher")&&types.has("Oven tower")&&types.has("Fridge housing"),
    surfaces:types.has("Worktop")&&types.has("Backsplash")
  };
  return NextResponse.json({
    ok:Object.values(checks).every(Boolean),
    checks,
    itemCount:plan.items.length,
    issues,
    generatedAt:new Date().toISOString()
  },{headers:{"Cache-Control":"no-store"}});
}
