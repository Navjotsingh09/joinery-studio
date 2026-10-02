import {describe,it,expect} from "vitest";
import {newProject,newItem} from "@/lib/defaults";
import {canPlace,findFreePlacement,validate,itemRect} from "@/lib/geometry";
import {isProjectBackup} from "@/lib/backup";
import {mergeProjects} from "@/lib/projectMerge";

describe("V1 design workflow",()=>{
  it("creates, places, edits and serialises a valid room design",()=>{
    const p=newProject("V1 QA room");
    p.roomWidth=4200;p.roomHeight=2500;p.roomDepth=3200;
    const wardrobe=findFreePlacement(p,newItem("Wardrobe"));
    expect(canPlace(p,wardrobe)).toBe(true);
    p.items.push(wardrobe);

    const base=findFreePlacement(p,newItem("Base cabinet"));
    expect(canPlace(p,base)).toBe(true);
    p.items.push(base);

    const media=findFreePlacement(p,newItem("Media unit"));
    expect(canPlace(p,media)).toBe(true);
    p.items.push(media);

    expect(validate(p)).toEqual([]);
    expect(itemRect(wardrobe,p,"front").width).toBe(wardrobe.width);
    expect(itemRect(base,p,"top").height).toBe(base.depth);
    expect(itemRect(media,p,"side").width).toBe(media.depth);

    const json=JSON.stringify([p]);
    const restored=JSON.parse(json);
    expect(isProjectBackup(restored)).toBe(true);
    expect(restored[0].items).toHaveLength(3);
  });

  it("detects an intentional collision",()=>{
    const p=newProject("Collision QA");
    p.rules.wallClearance=0;
    const a=newItem("Wardrobe");
    const b={...newItem("Tall cabinet"),x:a.x,y:a.y,z:a.z};
    p.items=[a,b];
    expect(validate(p).some(issue=>issue.includes("clashes"))).toBe(true);
  });

  it("merges a newer cloud revision without dropping another local project",()=>{
    const a=newProject("A");
    const b=newProject("B");
    const newer={...a,name:"A updated",updatedAt:new Date(Date.parse(a.updatedAt)+2000).toISOString()};
    const merged=mergeProjects([a,b],[newer]);
    expect(merged).toHaveLength(2);
    expect(merged.find(p=>p.id===a.id)?.name).toBe("A updated");
    expect(merged.some(p=>p.id===b.id)).toBe(true);
  });
});