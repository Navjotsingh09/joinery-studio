import {it,expect} from 'vitest';
import {copyName} from '@/lib/copyName';
import {adjacentUnitSnap} from '@/lib/placementSnap';
import {newProject,newItem} from '@/lib/defaults';
it('numbers copies without repeated suffixes',()=>{expect(copyName('Base cabinet copy copy',[{name:'Base cabinet copy'},{name:'Base cabinet copy 2'}])).toBe('Base cabinet copy 3')});
it('closes a 50mm gap while preserving the configured component gap',()=>{const p=newProject();p.rules.componentGap=0;p.items=[{...newItem('Base cabinet'),id:'a',width:600,x:1000,z:500}];const moved={...newItem('Base cabinet'),id:'b',width:600,x:1650,z:500};expect(adjacentUnitSnap(p,moved).x).toBe(1600);p.rules.componentGap=2;expect(adjacentUnitSnap(p,moved).x).toBe(1602)});
