import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import {KITCHEN_ASSET_CREDITS,requiredKitchenAssets} from '@/lib/kitchenAssets';
import {newProject,newItem} from '@/lib/defaults';
describe('real CC0 kitchen assets exported from Blender',()=>{
 it.each(KITCHEN_ASSET_CREDITS.flatMap(a=>a.files))('loads %s with a normalized envelope and no scene cameras/lights',async name=>{
  const bytes=readFileSync(`public/models/kitchen/${name}.glb`);const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const bounds=new THREE.Box3().setFromObject(gltf.scene),size=bounds.getSize(new THREE.Vector3());expect(size.x).toBeCloseTo(1,4);expect(size.y).toBeCloseTo(1,4);expect(size.z).toBeCloseTo(1,4);expect(bounds.getCenter(new THREE.Vector3()).length()).toBeLessThan(.0001);let meshes=0;gltf.scene.traverse(o=>{expect((o as THREE.Camera).isCamera).not.toBe(true);expect((o as THREE.Light).isLight).not.toBe(true);if((o as THREE.Mesh).isMesh)meshes++});expect(meshes).toBeGreaterThan(0);expect(bytes.length).toBeLessThan(2000000);
 });
 it('requests only assets matching the visible customer configuration',()=>{const p=newProject();p.items=[{...newItem('Kitchen island'),islandAppliance:'sink',islandTapStyle:'Cross-handle mixer'},{...newItem('Hob base'),hobStyle:'gas',hobZones:4},{...newItem('Square neck tap'),visible:false}];expect(requiredKitchenAssets(p).sort()).toEqual(['cross-handle-mixer','gas-hob','inset-sink']);p.items[1].hobZones=5;expect(requiredKitchenAssets(p)).not.toContain('gas-hob')});
});
