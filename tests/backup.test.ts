import {describe,it,expect} from "vitest";
import {isProjectBackup} from "@/lib/backup";
import {newProject,newItem} from "@/lib/defaults";

describe("backup validation",()=>{
  it("accepts a complete project backup",()=>{const p=newProject();p.items=[newItem()];expect(isProjectBackup([p])).toBe(true)});
  it("rejects empty or malformed backups",()=>{expect(isProjectBackup([])).toBe(false);expect(isProjectBackup([{id:"x"}])).toBe(false)});
  it("accepts face materials, custom textures and floor selections",()=>{
    const p=newProject("Kitchen backup"),i=newItem("Base cabinet");
    i.leftSideMaterialId="u961";i.rightSideMaterialId="h1180";i.plinthMaterialId="u961";i.worktopMaterialId="stone-light";
    p.floorMaterialId="floor-oak";p.customMaterials=[{id:"custom-test",code:"CUSTOM",name:"Client oak",colour:"#aa9988",thickness:18,category:"Custom",textureDataUrl:"data:image/png;base64,AA=="}];p.items=[i];
    expect(isProjectBackup([p])).toBe(true);
  });
});