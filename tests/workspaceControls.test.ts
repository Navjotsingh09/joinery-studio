import {describe,it,expect} from "vitest";
import {newProject,newItem} from "@/lib/defaults";
import {clampItemToRoom,moveItemOnAxes,findFreePlacement,validate} from "@/lib/geometry";
import {connectedWorktopItems,generateWorktops} from "@/lib/worktops";
import {isProjectBackup} from "@/lib/backup";
describe("designer workspace controls",()=>{
 it("allows precise unsnapped dragging while retaining room bounds",()=>{const p=newProject();p.rules.snapEnabled=false;p.rules.snap=50;const i=newItem("Base cabinet");const q=moveItemOnAxes(i,p,{x:123.4,y:i.y,z:267.8},["x","z"]);expect(q.x).toBe(123.4);expect(q.z).toBe(267.8);const bounded=clampItemToRoom({...q,x:-500,z:100000},p);expect(bounded.x).toBe(p.rules.wallClearance);expect(bounded.z).toBe(p.roomDepth-i.depth)});
 it("preserves mounting height when only the horizontal axis moves",()=>{const p=newProject(),i=newItem("Wall cabinet");i.y=1473;const q=moveItemOnAxes(i,p,{x:123,y:300,z:200},["x"]);expect(q.y).toBe(1473);expect(q.z).toBe(i.z);expect(q.x%p.rules.snap).toBe(0)});
 it("restores aluminium glass fronts and independent snap preferences from backup",()=>{const p=newProject();p.items=[{...newItem("Wall cabinet"),frontStyle:"aluminium-glass"}];p.rules.snapEnabled=false;p.rules.autoRotateSnap=false;expect(isProjectBackup(JSON.parse(JSON.stringify([p])))).toBe(true)});
 it("rejects invalid snapping preferences in imported backups",()=>{const p=newProject();(p.rules as any).snapEnabled="false";expect(isProjectBackup([p])).toBe(false)});
});

it("extends the run when units are added from the library",()=>{const p=newProject();p.rules.wallClearance=0;p.rules.componentGap=0;p.autoWorktops=true;p.items=[{...newItem("Base cabinet"),x:100,z:0}];p.items.push(...generateWorktops(p));const q=findFreePlacement(p,newItem("Base cabinet"));expect(q.x).toBe(700);expect(q.z).toBe(0);p.items=connectedWorktopItems(p,[...p.items,q]);expect(p.items.filter(i=>i.type==="Worktop")).toHaveLength(1);expect(validate(p)).toEqual([])});
it("caps slab overhangs at a neighbouring parallel cabinet row",()=>{const p=newProject();p.rules.wallClearance=0;p.rules.componentGap=0;p.items=[{...newItem("Base cabinet"),x:100,z:0},{...newItem("Base cabinet"),x:100,z:560}];p.items.push(...generateWorktops(p));expect(validate(p)).toEqual([]);expect(p.items.filter(i=>i.type==="Worktop")[0].depth).toBe(560)});
