import {describe,it,expect} from "vitest";
import {createScenarioPlan,DESIGN_KINDS} from "@/lib/scenarios";
import {validate} from "@/lib/geometry";

describe("scenario starter designs",()=>{
  for(const kind of DESIGN_KINDS){
    for(const scenario of kind.scenarios){
      it(kind.id+" / "+scenario.id+" generates a valid editable starter",()=>{
        const room=kind.id==="stairs"?{w:3200,h:2600,d:4200}:kind.id==="kitchen"?{w:4200,h:2400,d:3400}:{w:4200,h:2400,d:3600};
        const plan=createScenarioPlan(kind.id,scenario.id,room.w,room.h,room.d);
        if(scenario.id==="blank")expect(plan.items).toEqual([]);else expect(plan.items.length).toBeGreaterThan(0);
        expect(validate({
          id:"test",name:plan.name,customer:"",reference:"TEST",status:"Draft",revision:1,
          roomWidth:plan.roomWidth,roomHeight:plan.roomHeight,roomDepth:plan.roomDepth,
          rules:plan.rules,items:plan.items,revisions:[],createdAt:"",updatedAt:""
        })).toEqual([]);
      });
    }
  }
});
