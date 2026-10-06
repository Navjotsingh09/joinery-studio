import {useStudio} from '@/lib/store';
import {adjacentUnitSnap} from '@/lib/placementSnap';
import {describe,it,expect} from 'vitest';
import {newProject,newItem} from '@/lib/defaults';
import {connectedWorktopItems,generateWorktops} from '@/lib/worktops';
describe('connected worktop editing',()=>{
 const room=()=>{const p=newProject();p.rules.wallClearance=0;p.rules.componentGap=0;p.items=[{...newItem('Base cabinet'),x:0,z:0,width:600}];p.autoWorktops=true;p.autoWorktopOverhang=45;p.items.push(...generateWorktops(p,45,25));return p};
 it('extends the existing slab as adjacent cabinets are added, preserving finish and overhang',()=>{const p=room(),top=p.items.find(i=>i.type==='Worktop')!;top.materialId='wt-15';const items=connectedWorktopItems(p,[...p.items,{...newItem('Sink base'),x:600,z:0,width:600}]);const tops=items.filter(i=>i.type==='Worktop');expect(tops).toHaveLength(1);expect(tops[0].id).toBe(top.id);expect(tops[0].width).toBe(1200);expect(tops[0].height).toBe(25);expect(tops[0].depth).toBe(645);expect(tops[0].materialId).toBe('wt-15')});
 it('shrinks and separates worktops when a run is changed',()=>{const p=room();const added={...newItem('Base cabinet'),x:600,z:0,width:600};p.items=connectedWorktopItems(p,[...p.items,added]);const moved=connectedWorktopItems(p,p.items.map(i=>i.id===added.id?{...i,x:1800}:i));const tops=moved.filter(i=>i.type==='Worktop');expect(tops).toHaveLength(2);expect(new Set(tops.map(i=>i.id)).size).toBe(2);expect(tops.every(i=>i.width===600)).toBe(true)});
 it('leaves manually managed worktops untouched when automatic mode is off',()=>{const p=room();p.autoWorktops=false;expect(connectedWorktopItems(p,p.items)).toBe(p.items)});
});

 it('snaps beside adjacent units without accepting a collision',()=>{const p=newProject();p.rules.componentGap=2;p.items=[{...newItem('Base cabinet'),id:'a',x:1000,z:500,width:600}];const i={...newItem('Base cabinet'),id:'b',x:1590,z:500,width:600};const q=adjacentUnitSnap(p,i);expect(q.x).toBe(1602);expect(q.y).toBe(i.y);expect(q.z).toBe(i.z);const far=adjacentUnitSnap(p,{...i,x:1800});expect(far.x).toBe(1800)});

 it('updates the worktop in the same undoable edit as adding a cabinet',()=>{const p=newProject();p.rules.wallClearance=0;p.rules.componentGap=0;p.autoWorktops=true;p.items=[{...newItem('Base cabinet'),x:0,z:0,width:600}];p.items.push(...generateWorktops(p));useStudio.setState({projects:[p],activeId:p.id,past:[],future:[],editError:''});useStudio.getState().addItem({...newItem('Base cabinet'),x:600,z:0,width:600});expect(useStudio.getState().projects[0].items.filter(i=>i.type==='Worktop')[0].width).toBe(1200);useStudio.getState().undo();expect(useStudio.getState().projects[0].items.filter(i=>i.type==='Worktop')[0].width).toBe(600)});
