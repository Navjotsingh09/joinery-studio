import {describe,it,expect} from "vitest";
import {isProjectBackup} from "@/lib/backup";
import {newProject,newItem} from "@/lib/defaults";

describe("backup validation",()=>{
  it("accepts a complete project backup",()=>{const p=newProject();p.items=[newItem()];expect(isProjectBackup([p])).toBe(true)});
  it("rejects empty or malformed backups",()=>{expect(isProjectBackup([])).toBe(false);expect(isProjectBackup([{id:"x"}])).toBe(false)});
});