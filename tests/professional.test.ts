import {describe,it,expect} from "vitest";
import {newItem,newProject} from "@/lib/defaults";
import {wallClearances,snapItemToWall,mirrorItem,stairMetrics,itemsCollide} from "@/lib/geometry";

describe("professional design helpers",()=>{
  it("reports clearances to every room boundary",()=>{
    const p=newProject(),i=newItem("Base cabinet");i.x=100;i.z=200;
    expect(wallClearances(p,i)).toMatchObject({left:100,back:200,right:p.roomWidth-100-i.width,front:p.roomDepth-200-i.depth});
  });
  it("snaps and rotates an item to a room wall",()=>{
    const p=newProject();p.rules.wallClearance=0;const i=newItem("Base cabinet");
    const q=snapItemToWall(p,i,"right");
    expect(q.rotation).toBe(270);expect(q.x).toBe(p.roomWidth-q.depth);
  });
  it("mirrors item position across the room",()=>{
    const p=newProject();p.rules.wallClearance=0;const i=newItem("Base cabinet");i.x=200;
    expect(mirrorItem(p,i,"x").x).toBe(p.roomWidth-200-i.width);
  });
  it("calculates practical stair geometry without claiming compliance",()=>{
    const i=newItem("Straight staircase");i.height=2400;i.depth=3200;
    const m=stairMetrics(i);
    expect(m.risers).toBeGreaterThan(10);expect(m.rise).toBeGreaterThan(0);expect(m.going).toBeGreaterThan(0);expect(m.pitch).toBeGreaterThan(0);
  });
  it("allows a generated worktop to occupy the same run as base cabinets",()=>{
    const base=newItem("Base cabinet"),top=newItem("Worktop");base.x=top.x=0;base.z=top.z=0;top.y=base.height;
    expect(itemsCollide(base,top,2)).toBe(false);
  });
});

it("allows doors and windows to sit inside editable wall segments",()=>{
  const wall=newItem("Wall segment"),opening=newItem("Window");wall.x=opening.x=100;wall.z=opening.z=0;opening.y=900;
  expect(itemsCollide(wall,opening)).toBe(false);
});
