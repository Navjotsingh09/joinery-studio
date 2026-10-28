import {describe,it,expect} from 'vitest';
import {newItem,newProject} from '@/lib/defaults';
import {numberItems,dimensionStops,referenceLabel,onPlan} from '@/lib/drawingPack';
import {wallCells} from '@/lib/roomOpenings';
import {generateWorktops} from '@/lib/worktops';
import {exportPdf} from '@/lib/pdf';
import {worktopCutouts} from '@/lib/renderGeometry';
import {isProjectBackup} from '@/lib/backup';
import {createScenarioPlan} from '@/lib/scenarios';

describe('coordinated drawing package',()=>{
  it('keeps references stable when a unit is deleted and another is added',()=>{
    const a=newItem('Base cabinet'),b=newItem('Wall cabinet'),initial=numberItems({items:[a,b]});
    const next=numberItems({items:[initial.items[1],newItem('Worktop')],nextItemNumber:initial.nextItemNumber});
    expect(referenceLabel(next.items[0])).toBe('U02');expect(referenceLabel(next.items[1])).toBe('WT03');
    expect(numberItems({...next,items:[next.items[1],next.items[0]]}).items.map(i=>i.unitNumber)).toEqual([3,2]);
  });
  it('deduplicates imported reference numbers without changing valid references',()=>{
    const result=numberItems({items:[{...newItem(),unitNumber:4},{...newItem(),unitNumber:4}]});
    expect(result.items.map(i=>i.unitNumber)).toEqual([4,5]);
  });
  it('creates separate plans and nine coordinated sheets without mutating the design',()=>{
    const scenario=createScenarioPlan('kitchen','l-shape',4200,2400,3400),p={...newProject(),...scenario};
    const original=JSON.stringify(p),pdf=exportPdf(p,false),data=pdf.output();
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(9);
    ['BASE UNIT PLAN','WALL UNIT PLAN','WORKTOP PLAN','UNIT / MATERIAL SCHEDULE','SERVICE / APPLIANCE SCHEDULE'].forEach(t=>expect(data).toContain(t));
    expect(JSON.stringify(p)).toBe(original);
    expect(onPlan(newItem('Wall cabinet'),'base')).toBe(false);expect(onPlan(newItem('Wall cabinet'),'wall')).toBe(true);
  });
  it('dimension chains start at zero, deduplicate and end at the room boundary',()=>{
    const stops=dimensionStops([500,500.01,1100,2800,5000,-10],3600);
    expect(stops).toEqual([0,500,1100,2800,3600]);expect(stops.slice(1).reduce((n,v,k)=>n+v-stops[k],0)).toBe(3600);
  });
});
describe('room and surfaces',()=>{
  it('cuts a window aperture out of the wall rather than placing glass over solid plaster',()=>{
    const p=newProject();p.items=[{...newItem('Window'),x:600,z:0,y:900,width:1200,height:1000}];
    const cells=wallCells(p,'back');
    expect(cells.reduce((n,c)=>n+c.width*c.height,0)).toBe(p.roomWidth*p.roomHeight-1200000);
    expect(cells.some(c=>c.x<1800&&c.x+c.width>600&&c.y<1900&&c.y+c.height>900)).toBe(false);
  });
  it('handles overlapping wall openings once',()=>{
    const p=newProject();p.items=[{...newItem('Window'),x:600,z:0,y:900,width:1200,height:1000},{...newItem('Window'),x:600,z:0,y:900,width:1200,height:1000}];
    expect(wallCells(p,'back').reduce((n,c)=>n+c.width*c.height,0)).toBe(p.roomWidth*p.roomHeight-1200000);
  });
  it('generates separate sections across a gap and includes island worktops',()=>{
    const p=newProject();p.rules.wallClearance=0;p.items=[{...newItem('Base cabinet'),x:0,z:0},{...newItem('Base cabinet'),x:1300,z:0},{...newItem('Kitchen island'),x:800,z:1200,width:1200,depth:700}];
    const tops=generateWorktops(p,30,20);expect(tops).toHaveLength(3);expect(tops[0].width).toBe(600);expect(tops[0].depth).toBe(590);expect(tops[0].height).toBe(20);
    expect(tops[2].width).toBe(1260);expect(tops[2].depth).toBe(760);
  });
  it('preserves exact section IDs and finishes when regenerating a rotated run',()=>{
    const p=newProject();p.rules.wallClearance=0;p.items=[{...newItem('Hob base'),x:0,z:800,rotation:90}];
    const [a]=generateWorktops(p,30,38);expect(a.rotation).toBe(90);expect(a.x).toBe(0);expect(a.depth).toBe(630);expect(worktopCutouts(a,p.items)).toHaveLength(1);
    p.items.push({...a,materialId:'stone-dark',worktopFinishedEdges:['front']});const [b]=generateWorktops(p,40,20);expect(b.id).toBe(a.id);expect(b.materialId).toBe('stone-dark');expect(b.worktopFinishedEdges).toEqual(['front']);
  });
});
it('validates render views and lighting in recoverable backups',()=>{
  const p=newProject();p.savedCameras=[{id:'v',name:'Island',position:[4,3,5],target:[0,1,0],up:[0,1,0],fov:38}];p.lighting={exposure:.9,daylight:1.7,warmLights:true,ceiling:false};p.items=[{...newItem(),frontStyle:'shaker',unitNumber:1}];
  expect(isProjectBackup(JSON.parse(JSON.stringify([p])))).toBe(true);
  expect(isProjectBackup([{...p,savedCameras:[{...p.savedCameras[0],position:[0,1,0]}]}])).toBe(false);
  expect(isProjectBackup([{...p,lighting:{...p.lighting,daylight:Infinity}}])).toBe(false);
});
