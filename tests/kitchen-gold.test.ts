import {describe,it,expect} from "vitest";
import {createScenarioPlan} from "@/lib/scenarios";
import {newItem,newProject} from "@/lib/defaults";
import {autoFaceNearestWall,validate} from "@/lib/geometry";

describe("kitchen gold-standard contract",()=>{
  it("joins the L runs at the wall and centres extraction over the hob",()=>{
    for(const depth of [2200,3400,4200]){
      const plan=createScenarioPlan("kitchen","l-shape",4200,2400,depth);
      const corner=plan.items.find(i=>i.type==="Corner cabinet")!;
      const returnBase=plan.items.find(i=>i.name==="Return base")!;
      const hob=plan.items.find(i=>i.type==="Hob base")!;
      const hood=plan.items.find(i=>i.type==="Extractor hood")!;
      expect(corner.x).toBe(returnBase.x);
      expect(corner.z+corner.depth).toBe(returnBase.z);
      expect(hood.z+hood.width/2).toBe(hob.z+hob.width/2);
    }
  });
  it("ships the reference-style L kitchen with the complete visible system",()=>{
    const plan=createScenarioPlan("kitchen","l-shape",4200,2400,3400);
    const types=new Set(plan.items.map(i=>i.type));
    ["Base cabinet","Corner cabinet","Drawer unit","Sink base","Dishwasher","Oven tower","Fridge housing","Hob base","Wall cabinet","Extractor hood","Worktop","Backsplash","Pull-out tap"].forEach(type=>expect(types.has(type),type).toBe(true));
    expect(validate({
      id:"kitchen",name:plan.name,customer:"",reference:"QA",status:"Draft",revision:1,
      roomWidth:plan.roomWidth,roomHeight:plan.roomHeight,roomDepth:plan.roomDepth,
      rules:plan.rules,items:plan.items,revisions:[],createdAt:"",updatedAt:""
    })).toEqual([]);
  });

  it("keeps the L-shaped starter valid in a compact measured room",()=>{
    const plan=createScenarioPlan("kitchen","l-shape",2600,2400,2200);
    const project={
      id:"compact",name:plan.name,customer:"",reference:"QA",status:"Draft" as const,revision:1,
      roomWidth:plan.roomWidth,roomHeight:plan.roomHeight,roomDepth:plan.roomDepth,
      rules:plan.rules,items:plan.items,revisions:[],createdAt:"",updatedAt:""
    };
    expect(validate(project)).toEqual([]);
    expect(Math.max(...plan.items.map(i=>i.x+(i.rotation===90||i.rotation===270?i.depth:i.width)))).toBeLessThanOrEqual(plan.roomWidth);
    expect(Math.max(...plan.items.map(i=>i.z+(i.rotation===90||i.rotation===270?i.width:i.depth)))).toBeLessThanOrEqual(plan.roomDepth);
  });

  it("gives every kitchen cabinet independent manufactured-surface finishes",()=>{
    for(const type of ["Base cabinet","Drawer unit","Wall cabinet","Tall cabinet","Sink base","Hob base","Oven tower","Fridge housing","Kitchen island","Corner cabinet"]){
      const i=newItem(type);
      expect(i.carcassMaterialId,type+" carcass").toBeTruthy();
      expect(i.doorMaterialId,type+" fronts").toBeTruthy();
      expect(i.leftSideMaterialId,type+" left side").toBeTruthy();
      expect(i.rightSideMaterialId,type+" right side").toBeTruthy();
      expect(i.plinthMaterialId,type+" plinth").toBeTruthy();
      expect(i.plinthStyle,type+" plinth style").toBe("recessed");
    }
  });

  it("faces cabinetry inward on all four room walls",()=>{
    const p=newProject("Wall QA");p.rules={...p.rules,wallClearance:0};
    const back=autoFaceNearestWall(p,{...newItem("Base cabinet"),x:1200,z:0});
    const front=autoFaceNearestWall(p,{...newItem("Base cabinet"),x:1200,z:p.roomDepth-560});
    const left=autoFaceNearestWall(p,{...newItem("Base cabinet"),x:0,z:1000});
    const right=autoFaceNearestWall(p,{...newItem("Base cabinet"),x:p.roomWidth-560,z:1000});
    expect(back.wallSide).toBe("back");expect(back.rotation).toBe(0);
    expect(front.wallSide).toBe("front");expect(front.rotation).toBe(180);
    expect(left.wallSide).toBe("left");expect(left.rotation).toBe(90);
    expect(right.wallSide).toBe("right");expect(right.rotation).toBe(270);
  });

  it("supports every requested faucet finish and style",()=>{
    const taps=["Arc mixer tap","Pull-out tap","Bridge tap","Square neck tap"].map(newItem);
    expect(taps.map(t=>t.productStyle)).toEqual(["Arc mixer","Pull-out","Bridge","Square neck"]);
    expect(taps.every(t=>t.colourVariant==="Chrome")).toBe(true);
  });

  it("provides appliance variation metadata",()=>{
    for(const type of ["Dishwasher","Washing machine","Microwave","Extractor hood","Freestanding fridge","Single oven","Range cooker"]){
      const i=newItem(type);
      expect(i.productStyle).toBe("Contemporary");
      expect(i.colourVariant).toBe("Stainless steel");
    }
  });
});
