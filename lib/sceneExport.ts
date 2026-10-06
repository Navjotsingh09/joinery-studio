import * as THREE from 'three';
import {Project} from '@/types/model';
import {DEFAULT_LIGHTING} from './renderSettings';
import {renderZip} from './renderZip';
export const RENDER_ENVIRONMENT='/materials/pbr/studio_small_09.hdr';
export function createRenderScene(model:THREE.Object3D,camera:THREE.Camera){
 const scene=new THREE.Scene(),geometry=model.clone(true),remove:THREE.Object3D[]=[];
 geometry.traverse(o=>{if(o.userData.editorOnly)remove.push(o)});remove.forEach(o=>o.removeFromParent());
 model.updateWorldMatrix(true,false);geometry.matrix.copy(model.matrixWorld);geometry.matrixAutoUpdate=false;scene.add(geometry);
 camera.updateWorldMatrix(true,false);const view=camera.clone();view.matrix.copy(camera.matrixWorld);view.matrixAutoUpdate=false;scene.add(view);scene.updateMatrixWorld(true);return scene;
}
export async function exportSceneGlb(model:THREE.Object3D,camera:THREE.Camera){const {GLTFExporter}=await import('three/examples/jsm/exporters/GLTFExporter.js');return await new GLTFExporter().parseAsync(createRenderScene(model,camera),{binary:true,onlyVisible:true,maxTextureSize:2048}) as ArrayBuffer}
export async function exportRenderPackage({project,model,camera,aspect,quality,readAsset}:{project:Project;model:THREE.Object3D;camera:THREE.Camera;aspect:number;quality:'preview'|'customer';readAsset?:(url:string)=>Promise<Uint8Array>}){
 const read=readAsset??(async(url:string)=>{const r=await fetch(url);if(!r.ok)throw new Error('A final-render file could not be downloaded. Check your connection and try again.');return new Uint8Array(await r.arrayBuffer())});
 const [glb,script,hdr,mac,windows]=await Promise.all([exportSceneGlb(model,camera),read('/render/render.py'),read(RENDER_ENVIRONMENT),read('/render/run-render.command'),read('/render/run-render.bat')]);const enc=new TextEncoder();
 return renderZip([
  {name:'scene.glb',bytes:new Uint8Array(glb)},
  {name:'settings.json',bytes:enc.encode(JSON.stringify({reference:project.reference,revision:project.revision,aspect,quality,room:{width:project.roomWidth/1000,height:project.roomHeight/1000,depth:project.roomDepth/1000},lighting:project.lighting??DEFAULT_LIGHTING},null,2))},
  {name:'render.py',bytes:script},{name:'environment.hdr',bytes:hdr},{name:'run-render.command',bytes:mac,executable:true},{name:'run-render.bat',bytes:windows},
  {name:'README.txt',bytes:enc.encode('JOINERY STUDIO / FINAL RENDER\nExtract all files and install Blender 4.x.\nWindows: double-click run-render.bat.\nMac: run ./run-render.command in Terminal (chmod +x run-render.command if needed).\nLinux: run sh run-render.command.\nManual: blender --background --disable-autoexec --python render.py -- scene.glb settings.json final.png\n\nPreview: 2048 pixels wide / 96 samples. Customer: 4096 pixels wide / 256 samples.\nThe package includes the current scene, embedded textures and camera. Rendering runs on your workstation, with a supported GPU if available. The website does not run a remote render job.\nThe launcher writes final.png and an editable final.blend.\n')}
 ]);
}
