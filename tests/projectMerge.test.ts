import {describe,it,expect} from "vitest";
import {mergeProjects} from "@/lib/projectMerge";
import {newProject} from "@/lib/defaults";

describe("project merge",()=>{
  it("keeps unique local and remote projects",()=>{
    const a=newProject("Local"),b=newProject("Remote");
    const out=mergeProjects([a],[b]);
    expect(out.map(p=>p.id).sort()).toEqual([a.id,b.id].sort());
  });
  it("keeps the newest version of the same project",()=>{
    const a=newProject("Old");
    const b={...a,name:"New",updatedAt:new Date(Date.parse(a.updatedAt)+1000).toISOString()};
    expect(mergeProjects([a],[b])[0].name).toBe("New");
  });
});