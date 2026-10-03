import {describe,it,expect} from 'vitest';
import {FINISH_COLLECTIONS,applyFinishCollection} from '@/lib/finishCollections';
import {MATERIALS} from '@/lib/materials';
import {newProject,newItem} from '@/lib/defaults';
describe('coordinated finishes',()=>{
 it('uses valid materials for all collections',()=>{for(const c of FINISH_COLLECTIONS)for(const id of [c.wood,c.front,c.surface,c.floor])expect(MATERIALS.some(m=>m.id===id)).toBe(true)});
 it('preserves dimensions, placement and appliance finish',()=>{const p=newProject();p.items=[newItem('Wardrobe'),newItem('Dishwasher')];const next=applyFinishCollection(p,'b-cashmere');expect(next.items![0].width).toBe(p.items[0].width);expect(next.items![0].x).toBe(p.items[0].x);expect(next.items![0].doorMaterialId).toBe('palette-5');expect(next.items![1]).toEqual(p.items[1]);expect(p.items[0].doorMaterialId).toBeUndefined()});
});
