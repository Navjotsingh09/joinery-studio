import {describe,it,expect} from "vitest";
import {createScenarioPlan} from "@/lib/scenarios";
import {autoFaceNearestWall,canPlace,findFreePlacement,isItemOnWall,validate,wallItemRect} from "@/lib/geometry";
import {newItem,newProject} from "@/lib/defaults";
import {isProjectBackup} from "@/lib/backup";

describe("kitchen gold-standard acceptance",()=>{
  it("builds a reference L-shaped kitchen with real kitchen systems",()=>{
    const plan=createScenarioPlan("kitchen","l-shape",4200,2400,3400);
    const types=new Set(plan.items.map(i=>i.type));
    expect(types.has("Base cabinet")).toBe(true);
    expect(types.has("Drawer unit")).toBe(true);
    expect(types.has("Sink base")).toBe(true);
    expect(types.has("Hob base")).toBe(true);
    expect(types.has("Wall cabinet")).toBe(true);
    expect(types.has("Dishwasher")).toBe(true);
    expect(types.has("Oven tower")).toBe(true);
    expect(types.has("Worktop")).toBe(true);
    expect(types.has("Backsplash")).toBe(true);
    expect(types.has("Pull-out tap")).toBe(true);
  });

  it("keeps cabinet finishes independently configurable by construction part",()=>{
    const cabinet=newItem("Base cabinet");
    cabinet.carcassMaterialId="h1180";
    cabinet.doorMaterialId="u961";
    cabinet.leftSideMaterialId="u705";
    cabinet.rightSideMaterialId="w1000";
    cabinet.plinthMaterialId="u399";
    expect(new Set([
      cabinet.carcassMaterialId,
      cabinet.doorMaterialId,
      cabinet.leftSideMaterialId,
      cabinet.rightSideMaterialId,
      cabinet.plinthMaterialId
    ]).size).toBe(5);
  });

  it("auto-orients a base cabinet to each wall",()=>{
    const p=newProject("Wall orientation");p.rules.wallClearance=0;
    const tests=[
      [{x:1200,z:0},"back",0],
      [{x:1200,z:p.roomDepth-600},"front",180],
      [{x:0,z:1100},"left",90],
      [{x:p.roomWidth-600,z:1100},"right",270]
    ] as const;
    for(const [pos,side,rotation] of tests){
      const q=autoFaceNearestWall(p,{...newItem("Base cabinet"),...pos});
      expect(q.wallSide).toBe(side);
      expect(q.rotation).toBe(rotation);
    }
  });

  it("finds collision-free drag and drop placement",()=>{
    const p=newProject("Placement");p.rules={...p.rules,wallClearance:0,componentGap:2,snap:50};
    const first={...newItem("Base cabinet"),x:0,z:0};p.items=[first];
    const candidate={...newItem("Base cabinet"),x:0,z:0};
    const free=findFreePlacement(p,candidate);
    expect(canPlace(p,free)).toBe(true);
    expect(free.x!==first.x||free.z!==first.z).toBe(true);
  });

  it("places backsplash and worktop without false kitchen clashes",()=>{
    const plan=createScenarioPlan("kitchen","l-shape",4200,2400,3400);
    expect(validate({
      id:"acceptance",name:plan.name,customer:"",reference:"KITCHEN",status:"Draft",revision:1,
      roomWidth:plan.roomWidth,roomHeight:plan.roomHeight,roomDepth:plan.roomDepth,
      rules:plan.rules,items:plan.items,revisions:[],createdAt:"",updatedAt:""
    })).toEqual([]);
  });

  it("projects kitchen content into all four elevations",()=>{
    const p=newProject("Elevations");p.rules.wallClearance=0;
    const back={...newItem("Base cabinet"),x:400,z:0,wallSide:"back" as const};
    const left={...newItem("Base cabinet"),x:0,z:900,rotation:90,wallSide:"left" as const};
    p.items=[back,left];
    expect(isItemOnWall(p,back,"back")).toBe(true);
    expect(isItemOnWall(p,left,"left")).toBe(true);
    expect(wallItemRect(back,p,"back").width).toBe(600);
    expect(wallItemRect(left,p,"left").width).toBe(600);
  });

  it("preserves advanced kitchen finishes and custom materials in JSON backups",()=>{
    const p=newProject("Persistence");
    const i=newItem("Base cabinet");
    i.carcassMaterialId="h1180";i.doorMaterialId="u961";i.leftSideMaterialId="u705";i.rightSideMaterialId="w1000";
    i.plinthMaterialId="u399";i.worktopMaterialId="stone-light";i.openAmount=65;i.wallSide="back";
    p.floorMaterialId="floor-oak";
    p.customMaterials=[{id:"custom-test",code:"CUSTOM",name:"Client Oak",colour:"#b79772",thickness:18,category:"Custom",textureDataUrl:"data:image/webp;base64,AA=="}];
    p.items=[i];
    const restored=JSON.parse(JSON.stringify([p]));
    expect(isProjectBackup(restored)).toBe(true);
    expect(restored[0].items[0].doorMaterialId).toBe("u961");
    expect(restored[0].customMaterials[0].name).toBe("Client Oak");
    expect(restored[0].floorMaterialId).toBe("floor-oak");
  });
});
