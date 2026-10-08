import {describe,it,expect,vi,afterEach} from 'vitest';
import React from 'react';
import {create} from '@react-three/test-renderer';
import * as THREE from 'three';
import {JoineryModel} from '@/components/Scene3D';
import {newItem,newProject} from '@/lib/defaults';
import {dwgToDxf} from '@/lib/dwgImport';
Object.assign(globalThis,{React,IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>vi.unstubAllGlobals());
describe('plinth panels',()=>{
 it('uses a thin front panel, keeps cabinet height, and adds only chosen returns',async()=>{
  const p=newProject('Plinth');p.items=[{...newItem('Base cabinet'),plinthMaterialId:'palette-17',plinthSides:['front'],height:870}];
  for(const sides of [['front'],['front','left','right']] as const){p.items[0]={...p.items[0],plinthSides:[...sides]};const r=await create(<JoineryModel project={p} showWalls={false} realistic={false}/>);const all:THREE.Mesh[]=[];r.scene.instance.traverse(o=>{if((o as THREE.Mesh).isMesh&&((o as THREE.Mesh).material as THREE.Material).name==='palette-17')all.push(o as THREE.Mesh)});expect(all).toHaveLength(sides.length);for(const m of all){m.geometry.computeBoundingBox();const size=m.geometry.boundingBox!.getSize(new THREE.Vector3());expect(Math.min(size.x,size.z)).toBeCloseTo(.018,3);expect(size.y).toBeCloseTo(.1,3)}expect(p.items[0].height).toBe(870);await r.unmount()}
 });
});
describe('DWG import worker',()=>{
 it('rejects invalid DWG before launching the decoder',async()=>{await expect(dwgToDxf(new TextEncoder().encode('garbage').buffer)).rejects.toThrow('recognised DWG')});
 it('uses a disposable worker and terminates it on decoding success',async()=>{let worker:any;class W {onmessage:any;onerror:any;terminate=vi.fn();constructor(){worker=this}postMessage(){queueMicrotask(()=>this.onmessage({data:{text:'DXF'}}))}}vi.stubGlobal('Worker',W);expect(await dwgToDxf(new TextEncoder().encode('AC1015drawing').buffer)).toBe('DXF');expect(worker.terminate).toHaveBeenCalledOnce()});
 it('surfaces decoder errors and terminates the worker',async()=>{let worker:any;class W {onmessage:any;onerror:any;terminate=vi.fn();constructor(){worker=this}postMessage(){queueMicrotask(()=>this.onmessage({data:{error:'Unsupported drawing'}}))}}vi.stubGlobal('Worker',W);await expect(dwgToDxf(new TextEncoder().encode('AC1015drawing').buffer)).rejects.toThrow('Unsupported drawing');expect(worker.terminate).toHaveBeenCalledOnce()});
});
