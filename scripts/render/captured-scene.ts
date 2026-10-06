import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Project,Material} from '../../types/model';
import {SurfaceMaps} from '../../lib/pbrMaterials';
import {imageCanvas} from './node-graphics';
type Finish={name:string;colour:number[];metalness:number;roughness:number;opacity:number;transparent?:boolean;side?:THREE.Side;transmission:number;ior:number;clearcoat?:number;clearcoatRoughness?:number;emissive?:number[];emissiveIntensity?:number;normalStrength:number;maps:SurfaceMaps|null;source:Material};
export type CapturedScene={project:Project;lights?:{matrix:number[];colour:number[];intensity:number;distance:number;decay:number}[];meshes:{matrix:number[];vertices:number[];normals:number[];uv:number[];indices:number[]|null;groups:{start:number;count:number;materialIndex?:number}[];materials:Finish[]}[];assets:{kitchenAsset:string;matrix:number[];dimensions:[number,number,number];colour?:string;metalness?:number;roughness?:number}[]};
export async function hydrateCapturedScene(data:CapturedScene,publicDir:string){
 const model=new THREE.Group();model.name='Joinery design';const textures=new Map<string,THREE.CanvasTexture>(),materials=new Map<string,THREE.MeshPhysicalMaterial>();
 async function texture(url:string,dataMap=false,floor=false,source?:Material,maps?:SurfaceMaps|null){
  const key=url+':'+dataMap+':'+floor;if(textures.has(key))return textures.get(key)!;
  if(!url.startsWith('/')&&!url.startsWith('data:image/'))throw new Error('Embed external material textures before exporting a workstation render.');
  const input=url.startsWith('data:')?Buffer.from(url.split(',',2)[1],'base64'):readFileSync(resolve(publicDir,'.'+url));const canvas=await imageCanvas(input),map=new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=dataMap?THREE.NoColorSpace:THREE.SRGBColorSpace;
  if(floor){map.repeat.set(data.project.roomWidth/(source?.textureWidthMm??maps?.width??650),data.project.roomDepth/(source?.textureHeightMm??maps?.height??1200));map.rotation=(source?.textureRotation??0)*Math.PI/180;map.center.set(.5,.5)}
  textures.set(key,map);return map;
 }
 async function finish(spec:Finish){
  const key=JSON.stringify(spec);if(materials.has(key))return materials.get(key)!;
  const m=new THREE.MeshPhysicalMaterial({name:spec.name,side:spec.side??THREE.FrontSide,color:new THREE.Color().fromArray(spec.colour),metalness:spec.metalness,roughness:spec.roughness,opacity:spec.opacity,transparent:spec.transparent??spec.opacity<1,transmission:spec.transmission,ior:spec.ior,clearcoat:spec.clearcoat??0,clearcoatRoughness:spec.clearcoatRoughness??0,emissive:new THREE.Color().fromArray(spec.emissive??[0,0,0]),emissiveIntensity:spec.emissiveIntensity??0});
  const source=spec.source,maps=spec.maps,floor=source.category==='Floor',url=source.textureDataUrl??source.textureImage??maps?.colour;
  if(url){m.map=await texture(url,false,floor,source,maps);m.color.set('#ffffff');if(maps?.tint){const c=new THREE.Color(source.colour),base=new THREE.Color(floor?'#ad8052':'#cdb58b');m.color.setRGB(c.r/base.r,c.g/base.g,c.b/base.b)}}
  if(maps){m.normalMap=await texture(maps.normal,true,floor,source,maps);m.roughnessMap=await texture(maps.roughness,true,floor,source,maps);m.normalScale.setScalar(spec.normalStrength)}
  materials.set(key,m);return m;
 }
 for(const spec of data.meshes){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(spec.vertices,3));if(spec.normals.length)g.setAttribute('normal',new THREE.Float32BufferAttribute(spec.normals,3));if(spec.uv.length)g.setAttribute('uv',new THREE.Float32BufferAttribute(spec.uv,2));if(spec.indices)g.setIndex(spec.indices);for(const group of spec.groups)g.addGroup(group.start,group.count,group.materialIndex??0);const finishes=await Promise.all(spec.materials.map(finish)),mesh=new THREE.Mesh(g,finishes.length===1?finishes[0]:finishes);mesh.matrix.fromArray(spec.matrix);mesh.matrixAutoUpdate=false;mesh.castShadow=mesh.receiveShadow=true;model.add(mesh)}
 for(const spec of data.assets){const bytes=readFileSync(resolve(publicDir,'models/kitchen',spec.kitchenAsset+'.glb'));const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const group=new THREE.Group();group.name='Kitchen asset '+spec.kitchenAsset;group.matrix.fromArray(spec.matrix).multiply(new THREE.Matrix4().makeScale(...spec.dimensions));group.matrixAutoUpdate=false;gltf.scene.traverse(o=>{const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;const customise=(original:THREE.Material)=>{const m=original.clone() as THREE.MeshStandardMaterial;if(spec.colour)m.color.set(spec.colour);if(spec.metalness!==undefined)m.metalness=spec.metalness;if(spec.roughness!==undefined)m.roughness=spec.roughness;return m};mesh.material=Array.isArray(mesh.material)?mesh.material.map(customise):customise(mesh.material)});group.add(gltf.scene);model.add(group)}
 for(const spec of data.lights??[]){const light=new THREE.PointLight(new THREE.Color().fromArray(spec.colour),spec.intensity,spec.distance,spec.decay);light.matrix.fromArray(spec.matrix);light.matrixAutoUpdate=false;model.add(light)}
 const p=data.project,rw=p.roomWidth/1000,rd=p.roomDepth/1000,saved=p.savedCameras?.[0],camera=new THREE.PerspectiveCamera(saved?.fov??70,1.5,.01,100);camera.position.fromArray(saved?.position??[rw*.44,1.65,rd*.46]);camera.up.fromArray(saved?.up??[0,1,0]);camera.lookAt(new THREE.Vector3().fromArray(saved?.target??[-rw*.12,1.2,-rd*.25]));camera.updateMatrixWorld();model.updateMatrixWorld(true);return {model,camera};
}
