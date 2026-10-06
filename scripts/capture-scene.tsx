import React from 'react';
import {create} from '@react-three/test-renderer';
import * as THREE from 'three';
import {readFileSync,writeFileSync} from 'node:fs';
import {Project} from '../types/model';
import {JoineryModel} from '../components/Scene3D';
import {newProject} from '../lib/defaults';
import {createScenarioPlan} from '../lib/scenarios';
import {isProjectBackup} from '../lib/backup';
import {material} from '../lib/materials';
import {surfaceMaps} from '../lib/pbrMaterials';
Object.assign(globalThis,{React,IS_REACT_ACT_ENVIRONMENT:true});
let project:Project={...newProject('Sage & oak showroom'),...createScenarioPlan('kitchen','showroom',4200,2400,3400)};
if(process.env.JOINERY_DESIGN){const input=JSON.parse(readFileSync(process.env.JOINERY_DESIGN,'utf8'));if(!isProjectBackup(input))throw new Error('Use a valid Export JSON backup.');const index=Number(process.env.JOINERY_PROJECT_INDEX??0);if(!input[index])throw new Error('Project index does not exist.');project=input[index]}
const r=await create(<JoineryModel project={project} showWalls={true} realistic={true}/>),scene=r.scene.instance;scene.updateMatrixWorld(true);
const meshes:unknown[]=[],assets:unknown[]=[];
function description(m:THREE.Material){const a=m as THREE.MeshStandardMaterial,source=material(m.name,project.customMaterials??[]),maps=surfaceMaps(source);return {name:m.name,colour:a.color?.toArray()??[1,1,1],metalness:a.metalness??0,roughness:a.roughness??.7,opacity:a.opacity,transmission:(a as THREE.MeshPhysicalMaterial).transmission??0,ior:(a as THREE.MeshPhysicalMaterial).ior??1.5,emissive:a.emissive?.toArray(),emissiveIntensity:a.emissiveIntensity,normalStrength:(a as THREE.MeshPhysicalMaterial).normalScale?.x??.35,maps,source}}
scene.traverse(o=>{
 if(o.userData.kitchenAsset)assets.push({...o.userData,matrix:o.matrixWorld.toArray()});
 let parent:THREE.Object3D|null=o;while(parent){if(parent.userData.kitchenAsset||parent.userData.editorOnly||!parent.visible)return;parent=parent.parent}
 const m=o as THREE.Mesh;if(!m.isMesh)return;const g=m.geometry;
 meshes.push({matrix:m.matrixWorld.toArray(),vertices:Array.from(g.getAttribute('position').array),normals:g.getAttribute('normal')?Array.from(g.getAttribute('normal').array):[],uv:g.getAttribute('uv')?Array.from(g.getAttribute('uv').array):[],indices:g.index?Array.from(g.index.array):null,groups:g.groups,materials:(Array.isArray(m.material)?m.material:[m.material]).map(description)});
});
writeFileSync(process.env.JOINERY_CAPTURE??'/tmp/joinery-scene.json',JSON.stringify({project,meshes,assets}));console.log(`Captured ${meshes.length} meshes and ${assets.length} imported components from JoineryModel.`);await r.unmount();
