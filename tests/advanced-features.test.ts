import {describe,it,expect} from "vitest";
import {newItem,newProject} from "@/lib/defaults";
import {canPlace,findFreePlacement,isItemOnWall,wallItemRect,wallViewSize} from "@/lib/geometry";

describe("advanced showroom tools",()=>{
  it("creates backsplash, faucet and appliance variants",()=>{
    const backsplash=newItem("Backsplash"),tap=newItem("Pull-out tap"),range=newItem("Range cooker");
    expect(backsplash.type).toBe("Backsplash");
    expect(tap.productStyle).toBe("Pull-out");
    expect(tap.colourVariant).toBe("Chrome");
    expect(range.productStyle).toBe("Contemporary");
    expect(range.colourVariant).toBe("Stainless steel");
  });

  it("projects all four wall elevations",()=>{
    const p=newProject("Wall test");
    const i={...newItem("Base cabinet"),x:100,z:0,width:600,depth:600};
    p.items=[i];
    expect(wallViewSize(p,"back")).toEqual({w:p.roomWidth,h:p.roomHeight});
    expect(isItemOnWall(p,i,"back")).toBe(true);
    expect(wallItemRect(i,p,"back").left).toBe(100);
    expect(wallItemRect(i,p,"front").width).toBe(600);
  });

  it("finds a non-overlapping drop location",()=>{
    const p=newProject("Drop test");
    const first={...newItem("Base cabinet"),x:0,z:0};
    p.rules={...p.rules,wallClearance:0,componentGap:2,snap:50};
    p.items=[first];
    const next={...newItem("Base cabinet"),x:0,z:0};
    const free=findFreePlacement(p,next);
    expect(canPlace(p,free)).toBe(true);
    expect(free.x!==first.x||free.z!==first.z).toBe(true);
  });
});
