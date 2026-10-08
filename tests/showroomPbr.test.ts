import {describe,it,expect} from 'vitest';
import {surfaceMaps,surfaceMapping} from '../lib/pbrMaterials';
import {material} from '../lib/materials';
import {createScenarioPlan} from '../lib/scenarios';
import {newProject} from '../lib/defaults';
import {validate} from '../lib/geometry';
describe('photographed kitchen surfaces and showroom',()=>{
 it('keeps supplied textures authoritative and preserves physical scale overrides',()=>{
  expect(surfaceMaps({...material('h1180'),textureDataUrl:'data:image/png;base64,AAA'})).toBeNull();
  expect(surfaceMaps({...material('h1180'),textureImage:'/custom.jpg'})).toBeNull();
  expect(surfaceMapping(material('h1180')).textureWidthMm).toBe(1800);
  expect(surfaceMapping({...material('h1180'),textureWidthMm:900}).textureWidthMm).toBe(900);
  expect(surfaceMaps(material('stone-light'))?.normal).toContain('marble012-normal');
 });
 it('builds a measured showroom with clearances and editable components',()=>{
  for(const [w,d] of [[4200,3400],[2600,2200]]){
   const p={...newProject(),...createScenarioPlan('kitchen','showroom',w,2400,d)};
   expect(validate(p)).toEqual([]);
   expect(p.items.some(i=>i.frontStyle==='shaker')).toBe(true);
   expect(p.items.some(i=>i.type==='Window')).toBe(true);
   if(w===4200)expect(p.items.filter(i=>i.type==='Pendant light')).toHaveLength(2);
  }
 });
});
