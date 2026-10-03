import {describe,it,expect} from "vitest";
import {newItem} from "@/lib/defaults";
import {sinkCutouts,alignApplianceFront,roomShellWalls} from "@/lib/renderGeometry";

describe("sink cutouts",()=>{
  const top={...newItem("Worktop"),x:0,y:870,z:0,width:2400,height:38,depth:600};
  const sink={...newItem("Sink base"),x:700,y:0,z:0,width:700,height:870,depth:600};
  it("places a hole above the sink centre",()=>{const hole=sinkCutouts(top,[sink])[0];expect(hole.x).toBeCloseTo(-.15);expect(hole.z).toBeCloseTo(.018);expect(hole.width).toBeCloseTo(.452)});
  it("ignores hidden sinks and worktops at another height",()=>{expect(sinkCutouts(top,[{...sink,visible:false}])).toEqual([]);expect(sinkCutouts({...top,y:1400},[sink])).toEqual([])});
  it("does not cut a hole beyond the worktop edge",()=>{expect(sinkCutouts(top,[{...sink,x:2400}])).toEqual([])});
  it("maps a rotated return run into local coordinates",()=>{const t={...top,x:0,z:600,width:2000,depth:630,rotation:90};const q={...sink,x:0,z:1200,width:800,rotation:90};const hole=sinkCutouts(t,[q])[0];expect(hole.x).toBeCloseTo(0);expect(hole.z).toBeCloseTo(0.003);expect(hole.width).toBeCloseTo(.508)});
});
describe("appliance front alignment",()=>{
  it.each([0,90,180,270])("aligns a cabinet run at %i degrees",rotation=>{const unit={...newItem("Dishwasher"),x:rotation%180===0?700:150,z:rotation%180===0?150:700,rotation};const cabinet={...newItem("Base cabinet"),x:0,z:0,depth:600,rotation};const at=alignApplianceFront(unit,[cabinet]);expect(at).not.toBeNull();expect(rotation%180===0?at!.z:at!.x).toBe(rotation===0||rotation===90?600-unit.depth:0)});
  it("does not use an unrelated tall unit",()=>{expect(alignApplianceFront(newItem("Dishwasher"),[newItem("Fridge housing")])).toBeNull()});
});


describe("room walls do not hide splashbacks",()=>{
  it.each([.004,.006,.02])("keeps a %s metre splashback in front of both room walls",thickness=>{
    const w=4.2,h=2.4,d=3.4,walls=roomShellWalls(w,h,d);
    const backInside=walls.back.position[2]+walls.back.size[2]/2;
    const leftInside=walls.left.position[0]+walls.left.size[0]/2;
    expect(backInside).toBeCloseTo(-d/2);
    expect(leftInside).toBeCloseTo(-w/2);
    // A flush panel's room-facing surface must lie in front of the wall's inside face.
    expect(-d/2+thickness).toBeGreaterThan(backInside);
    expect(-w/2+thickness).toBeGreaterThan(leftInside);
  });
});
