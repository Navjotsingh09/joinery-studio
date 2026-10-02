import {describe,it,expect} from "vitest";
import {itemRect,labelFor,viewSize,validate,contrastText,snap,clamp,clampItemToRoom,itemsCollide,canPlace,findFreePlacement,footprint,normalizeRotation} from "@/lib/geometry";
import {newProject,newItem} from "@/lib/defaults";

describe("geometry",()=>{
  it("uses floor origin and correct front inversion",()=>{const p=newProject();const i=newItem();i.y=150;i.height=2200;expect(itemRect(i,p,"front").top).toBe(50)});
  it("maps view dimensions correctly",()=>{const p=newProject();expect(viewSize(p,"top")).toEqual({w:3600,h:3000});expect(viewSize(p,"side")).toEqual({w:3000,h:2400})});
  it("labels top and side correctly",()=>{const i=newItem();expect(labelFor(i,"top")).toBe(i.width+" × "+i.depth+" mm");expect(labelFor(i,"side")).toBe(i.depth+" × "+i.height+" mm")});
  it("snap/clamp",()=>{expect(snap(126,50)).toBe(150);expect(clamp(12,20,100)).toBe(20)});
  it("contrasts dark fills",()=>expect(contrastText("#111111")).toBe("#ffffff"));
  it("keeps floor units grounded and in-room",()=>{const p=newProject();const i=newItem("Wardrobe");i.x=-200;i.y=500;i.z=9999;const q=clampItemToRoom(i,p);expect(q.x).toBe(p.rules.wallClearance);expect(q.y).toBe(0);expect(q.z).toBe(p.roomDepth-i.depth)});
  it("keeps wall cabinets vertically movable",()=>{const p=newProject();const i=newItem("Wall cabinet");i.y=1450;expect(clampItemToRoom(i,p).y).toBe(1450)});\n  it("swaps the occupied footprint at 90 degrees",()=>{const i=newItem("Base cabinet");i.rotation=90;expect(footprint(i)).toEqual({width:i.depth,depth:i.width});expect(normalizeRotation(450)).toBe(90)});\n  it("maps rotated components correctly into plan and elevation views",()=>{const p=newProject();const i=newItem("Base cabinet");i.rotation=90;const top=itemRect(i,p,"top"),front=itemRect(i,p,"front");expect(top.width).toBe(i.depth);expect(top.height).toBe(i.width);expect(front.width).toBe(i.depth)});
});

describe("placement",()=>{
  it("detects AABB collisions",()=>{const a=newItem(),b=newItem();a.x=b.x=100;expect(itemsCollide(a,b)).toBe(true)});
  it("finds a collision-free slot",()=>{const p=newProject();p.rules.wallClearance=0;const a=newItem("Base cabinet");a.x=0;p.items=[a];const b=findFreePlacement(p,newItem("Base cabinet"));expect(itemsCollide(a,b,p.rules.componentGap)).toBe(false);expect(canPlace(p,b)).toBe(true)});\n  it("uses rotated footprint for collisions",()=>{const a=newItem("Base cabinet"),b=newItem("Base cabinet");a.x=a.z=0;b.x=580;b.z=0;a.rotation=90;expect(itemsCollide(a,b)).toBe(false);b.x=500;expect(itemsCollide(a,b)).toBe(true)});
});

describe("validation",()=>{
  it("detects room overflow",()=>{const p=newProject();const i=newItem();i.x=3500;p.items=[i];expect(validate(p).some(x=>x.includes("clearance"))).toBe(true)});
  it("detects 3D clashes",()=>{const p=newProject();const a=newItem(),b=newItem();a.x=b.x=100;a.z=b.z=0;p.items=[a,b];expect(validate(p).some(x=>x.includes("clashes"))).toBe(true)});
  it("passes separated items inside room",()=>{const p=newProject();p.rules.wallClearance=0;const a=newItem(),b=newItem();a.x=0;b.x=1500;p.items=[a,b];expect(validate(p)).toEqual([])});
});