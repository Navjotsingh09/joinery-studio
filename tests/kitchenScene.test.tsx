import React from 'react';
import {describe,it,expect} from 'vitest';
import {create} from '@react-three/test-renderer';
import * as THREE from 'three';
import {JoineryModel} from '@/components/Scene3D';
import {newItem,newProject} from '@/lib/defaults';
import {islandWorktops} from '@/lib/kitchenConfig';
Object.assign(globalThis,{React,IS_REACT_ACT_ENVIRONMENT:true});
function design(){const p=newProject();p.roomWidth=6000;p.roomDepth=5000;p.items=[{...newItem('Kitchen island'),x:1800,z:1800,topThickness:20,topOverhang:30}];return p}
function meshes(scene:THREE.Object3D){const result:THREE.Mesh[]=[];scene.traverse(o=>{if((o as THREE.Mesh).isMesh)result.push(o as THREE.Mesh)});return result}
describe('actual kitchen scene geometry',()=>{
 it.each([0,90,180,270])('renders one correctly sized cutout slab for a rotated hob island at %i degrees',async rotation=>{
  const p=design();p.items[0]={...p.items[0],rotation,islandStyle:'extended',counterExtension:900,islandAppliance:'hob',hobStyle:'gas',hobZones:5};
  const r=await create(<JoineryModel project={p} showWalls={false} realistic={false}/>),scene=r.scene.instance;scene.updateMatrixWorld(true);
  const slabs=meshes(scene).filter(m=>m.geometry.type==='ExtrudeGeometry'&&(m.geometry as THREE.ExtrudeGeometry).parameters.shapes instanceof Object&&((m.geometry as THREE.ExtrudeGeometry).parameters.shapes as THREE.Shape).holes?.length>0);expect(slabs).toHaveLength(1);const slab=slabs[0],g=slab.geometry as THREE.ExtrudeGeometry,shape=g.parameters.shapes as THREE.Shape;expect(shape.holes).toHaveLength(1);
  const box=new THREE.Box3().setFromObject(slab),[top]=islandWorktops(p.items[0]);expect(box.max.y).toBeCloseTo(.92);expect(box.min.y).toBeCloseTo(.9);expect(box.max.x-box.min.x).toBeCloseTo((rotation%180?top.depth:top.width)/1000);expect(box.max.z-box.min.z).toBeCloseTo((rotation%180?top.width:top.depth)/1000);
  // Five gas burner cylinders are present above the cutout surface.
  expect(meshes(scene).filter(m=>m.geometry.type==='CylinderGeometry'&&Math.abs((m.geometry as any).parameters.radiusTop-.027)<.0001)).toHaveLength(5);await r.unmount();
 });
 it('renders distinct front styles, brass knobs and exposed feet',async()=>{const counts:number[]=[];for(const frontStyle of ['slab','slim-shaker','raised-panel','fluted'] as const){const p=design();p.items[0]={...p.items[0],frontStyle,hardware:'Knob',handleFinish:'Brass',plinthStyle:'legs'};const r=await create(<JoineryModel project={p} showWalls={false} realistic={false}/>);const all=meshes(r.scene.instance);counts.push(all.length);const knobs=all.filter(m=>m.geometry.type==='SphereGeometry'&&(m.geometry as any).parameters.radius===.017);expect(knobs).toHaveLength(4);expect((knobs[0].material as THREE.MeshStandardMaterial).color.getHexString()).toBe('b18a45');expect(all.filter(m=>m.geometry.type==='CylinderGeometry'&&(m.geometry as any).parameters.radiusTop===.024)).toHaveLength(4);await r.unmount()}expect(counts[1]).toBeGreaterThan(counts[0]);expect(counts[3]).toBeGreaterThan(counts[1])},15000);
});

 it("renders aluminium frames with glass infill and a matt cabinet front",async()=>{const p=design();p.items=[{...newItem("Wall cabinet"),x:1000,y:1200,z:0,frontStyle:"aluminium-glass"},{...newItem("Base cabinet"),x:2200,z:0,frontStyle:"slab",finish:"Matt"}];const r=await create(<JoineryModel project={p} showWalls={false} realistic={false}/>);const all=meshes(r.scene.instance);expect(all.some(m=>(m.material as THREE.MeshPhysicalMaterial).name==="Cabinet glass"&&(m.material as THREE.MeshPhysicalMaterial).transmission===.9)).toBe(true);expect(all.some(m=>(m.material as THREE.MeshStandardMaterial).metalness===.92)).toBe(true);expect(all.some(m=>(m.material as THREE.MeshStandardMaterial).roughness===.85)).toBe(true);await r.unmount()});
