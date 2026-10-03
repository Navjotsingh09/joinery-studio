import {describe,it,expect} from 'vitest';
import {newItem,newProject} from '@/lib/defaults';
import {stairPlan} from '@/lib/stairGeometry';
import {stairMetrics} from '@/lib/geometry';
import {createScenarioPlan} from '@/lib/scenarios';
import {isProjectBackup} from '@/lib/backup';
describe('bedroom and stair planning',()=>{
  for(const type of ['Straight staircase','L staircase','U staircase'])it(type+' reaches the selected floor height with the selected risers',()=>{
    const i={...newItem(type),stairRisers:16,height:2600},p=stairPlan(i);
    expect(p.flights.reduce((n,f)=>n+f.count,0)).toBe(16);
    expect(p.flights.reduce((n,f)=>n+f.rise,0)).toBeCloseTo(2.6);
    expect(stairMetrics(i).rise).toBe(Math.round(p.stepRise*1000));
    expect(stairMetrics(i).going).toBe(Math.round(p.going*1000));
    for(const f of p.flights){expect(f.run).toBeGreaterThan(0);expect(f.width).toBeGreaterThan(0)}
    if(type!=='Straight staircase'){expect(p.landings).toHaveLength(1);const lower=p.flights[0];expect(p.landings[0].position[1]+.02).toBeCloseTo(-1.3+lower.rise);expect(p.flights[1].position[1]-p.flights[1].rise/2).toBeCloseTo(-1.3+lower.rise)}
  });
  it('centres the L stair starter within the room',()=>{const p=createScenarioPlan('stairs','l-shape',4000,2400,4000);for(const i of p.items)expect(i.x+i.width).toBeLessThanOrEqual(p.roomWidth)});
  it('retains bedroom layouts and stair finishes in JSON backups',()=>{const p=newProject();p.items=[{...newItem('Sliding wardrobe'),wardrobeLayout:'mixed',openAmount:70,doorMaterialId:'w1000',plinthHeight:100},{...newItem('L staircase'),stairRisers:16,stairRailHeight:1000,stairRailing:'left',treadMaterialId:'h1180',riserMaterialId:'w1000',railingMaterialId:'h1385'}];const restored=JSON.parse(JSON.stringify([p]));expect(isProjectBackup(restored)).toBe(true);expect(restored[0].items).toEqual(p.items)});
});
