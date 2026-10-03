import {describe,it,expect} from "vitest";
import {existsSync} from "node:fs";
import {SPLASHBACK_MATERIALS} from "@/lib/splashbacks";
import {material} from "@/lib/materials";
import {newProject,newItem} from "@/lib/defaults";
import {isProjectBackup} from "@/lib/backup";

describe("supplier splashback catalogue",()=>{
  it("includes every imported product once with a local preview",()=>{expect(SPLASHBACK_MATERIALS).toHaveLength(69);expect(new Set(SPLASHBACK_MATERIALS.map(m=>m.id)).size).toBe(69);for(const m of SPLASHBACK_MATERIALS){expect(existsSync('public'+m.previewImage)).toBe(true);expect(m.supplierUrl).toMatch(/^https:\/\/www\.splashback\.co\.uk\/shop\//);expect(material(m.id).id).toBe(m.id)}});
  it("uses supplier kitchen and bathroom glass thicknesses",()=>{for(const m of SPLASHBACK_MATERIALS)expect(m.thickness).toBe(m.splashbackRoom==="Bathroom"?4:6)});
  it("offers distinct matt, metallic, sparkle, marble, patterned and mirror finishes",()=>{const finishes=new Set(SPLASHBACK_MATERIALS.map(m=>m.splashbackFinish));for(const name of ['Matt','Metallic','Sparkle','Marble','Patterned','Floral','Mirrored','Plain'])expect(finishes.has(name)).toBe(true)});
  it("preserves splashback selection through JSON backup",()=>{const p=newProject(),m=SPLASHBACK_MATERIALS[0];p.items=[{...newItem('Backsplash'),materialId:m.id,depth:m.thickness,finish:m.surfaceFinish??"Gloss"}];const restored=JSON.parse(JSON.stringify([p]));expect(isProjectBackup(restored)).toBe(true);expect(material(restored[0].items[0].materialId).name).toBe(m.name)});
});
