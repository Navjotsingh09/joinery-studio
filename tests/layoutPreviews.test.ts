import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadImage} from '@napi-rs/canvas';
import {createScenarioPlan,DESIGN_KINDS} from '@/lib/scenarios';
it('provides a distinct decoded render for every kitchen layout, with matching starter geometry and an empty blank canvas',async()=>{
 const manifest=JSON.parse(readFileSync('public/showroom/layouts/manifest.json','utf8')).previews as {id:string;items:number;width:number;height:number;roomMm:number[]}[];
 expect(manifest.map(p=>p.id).sort()).toEqual(DESIGN_KINDS[0].scenarios.filter(s=>s.id!=='showroom').map(s=>s.id).sort());const hashes=new Set<string>();
 for(const p of manifest){const plan=createScenarioPlan('kitchen',p.id,4200,2400,3400),bytes=readFileSync(`public/showroom/layouts/${p.id}.jpg`),image=await loadImage(bytes);expect(p.items).toBe(plan.items.length);expect(p.roomMm).toEqual([4200,2400,3400]);expect([image.width,image.height]).toEqual([1280,720]);expect([p.width,p.height]).toEqual([1280,720]);hashes.add(createHash('sha256').update(bytes).digest('hex'));expect(plan.lighting?.ceiling).toBe(true)}
 expect(hashes.size).toBe(manifest.length);expect(manifest.find(p=>p.id==='blank')?.items).toBe(0);
});
