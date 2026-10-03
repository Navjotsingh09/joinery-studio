import {describe,it,expect} from "vitest";
import {newItem,newProject} from "@/lib/defaults";
import {createScenarioPlan} from "@/lib/scenarios";
import {autoFaceNearestWall,canPlace,findFreePlacement,validate} from "@/lib/geometry";
import {isProjectBackup} from "@/lib/backup";

describe("kitchen end-to-end contract",()=>{
  it("creates a visually complete kitchen starter system",()=>{
    const plan=createScenarioPlan("kitchen","l-shape",4200,2400,3400);
    const types=new Set(plan.items.map(i=>i.type));
    for(const t of ["Base cabinet","Drawer unit","Sink base","Hob base","Dishwasher","Oven tower","Fridge housing","Wall cabinet","Extractor hood","Worktop","Backsplash","Pull-out tap"])expect(types.has(t),t).toBe(true);
    expect(validate({
      id:"k",name:plan.name,customer:"",reference:"QA",status:"Draft",revision:1,
      roomWidth:plan.roomWidth,roomHeight:plan.roomHeight,roomDepth:plan.roomDepth,
      rules:plan.rules,items:plan.items,revisions:[],createdAt:"",updatedAt:""
    })).toEqual([]);
  });

  it("supports independent manufactured-surface finishes and persistence",()=>{
    const p=newProject("Kitchen QA"),i=newItem("Base cabinet");
    i.carcassMaterialId="h1180";
    i.doorMaterialId="u961";
    i.leftSideMaterialId="u705";
    i.rightSideMaterialId="w1000";
    i.plinthMaterialId="u399";
    i.worktopMaterialId="stone-dark";
    i.plinthStyle="recessed";i.plinthRecess=80;
    p.floorMaterialId="floor-oak";
    p.customMaterials=[{id:"client-oak",code:"CLIENT",name:"Client Oak",colour:"#a88662",thickness:18,category:"Custom",textureDataUrl:"data:image/png;base64,AA=="}];
    p.items=[i];
    expect(isProjectBackup([p])).toBe(true);
  });

  it("keeps new drag-and-drop cabinetry collision free",()=>{
    const p=newProject("Placement QA");p.rules={...p.rules,wallClearance:0,snap:50,componentGap:2};
    const a={...newItem("Base cabinet"),x:0,z:0};p.items=[a];
    const b=findFreePlacement(p,{...newItem("Base cabinet"),x:0,z:0});
    expect(canPlace(p,b)).toBe(true);
    expect(b.x!==a.x||b.z!==a.z).toBe(true);
  });

  it("auto-orients cabinetry on all four walls",()=>{
    const p=newProject("Wall QA");p.rules={...p.rules,wallClearance:0};
    const cases=[
      [{...newItem("Base cabinet"),x:1200,z:0},"back",0],
      [{...newItem("Base cabinet"),x:1200,z:p.roomDepth-560},"front",180],
      [{...newItem("Base cabinet"),x:0,z:1000},"left",90],
      [{...newItem("Base cabinet"),x:p.roomWidth-560,z:1000},"right",270],
    ] as const;
    for(const [item,wall,rotation] of cases){const q=autoFaceNearestWall(p,item);expect(q.wallSide).toBe(wall);expect(q.rotation).toBe(rotation)}
  });

  it("auto-orients wall finishes as well as cabinets",()=>{
    const p=newProject("Wall finish QA");p.rules={...p.rules,wallClearance:0};
    const backsplash={...newItem("Backsplash"),x:0,z:900};
    const q=autoFaceNearestWall(p,backsplash);
    expect(q.wallSide).toBe("left");
    expect(q.rotation).toBe(90);
  });

  it("ships requested faucet and appliance variation defaults",()=>{
    for(const type of ["Arc mixer tap","Pull-out tap","Bridge tap","Square neck tap"]){
      const i=newItem(type);expect(i.productStyle).toBeTruthy();expect(i.colourVariant).toBe("Chrome");
    }
    for(const type of ["Dishwasher","Washing machine","Microwave","Extractor hood","Freestanding fridge","Single oven","Range cooker"]){
      const i=newItem(type);expect(i.productStyle).toBe("Contemporary");expect(i.colourVariant).toBe("Stainless steel");
    }
  });
});
