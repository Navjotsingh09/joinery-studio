"use client";
import {ReactNode,Suspense,useEffect,useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import {Project} from '@/types/model';
import {assertSceneResourcesReady,modelResourceId,retainSceneResource,setSceneResourceStatus} from '@/lib/sceneResources';
import {ResourceBoundary} from './ResourceBoundary';
export const kitchenAssetsReady=(p:Project)=>{try{assertSceneResourcesReady(p);return true}catch{return false}};
const resource=(name:string)=>({id:modelResourceId(name),url:`/models/kitchen/${name}.glb`,label:name.replaceAll('-',' '),kind:'model' as const});
type Props={name:string;size:[number,number,number];colour?:string;metalness?:number;roughness?:number;fallback:ReactNode};
function LoadedAsset({name,size,colour,metalness,roughness}:Omit<Props,'fallback'>){
 const {scene}=useGLTF(`/models/kitchen/${name}.glb`);
 useEffect(()=>{setSceneResourceStatus(resource(name),'ready')},[name]);
 const clone=useMemo(()=>{const copy=scene.clone(true);copy.traverse(o=>{const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;mesh.castShadow=mesh.receiveShadow=true;const rematerial=(m:THREE.Material)=>{const next=m.clone() as THREE.MeshStandardMaterial;if(colour)next.color.set(colour);if(metalness!==undefined)next.metalness=metalness;if(roughness!==undefined)next.roughness=roughness;return next};mesh.material=Array.isArray(mesh.material)?mesh.material.map(rematerial):rematerial(mesh.material)});return copy},[scene,colour,metalness,roughness]);
 useEffect(()=>()=>clone.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh)(Array.isArray(m.material)?m.material:[m.material]).forEach(mat=>mat.dispose())}),[clone]);
 return <primitive object={clone} scale={size} dispose={null}/>;
}
export function KitchenAsset(props:Props){
 useEffect(()=>{if(typeof document==='undefined')return;return retainSceneResource(resource(props.name))},[props.name]);
 // The test reconciler has no DOM/fetch context; its procedural counterpart is
 // checked separately from the GLB loader's real exported geometry.
 const content=typeof document==='undefined'?props.fallback:<ResourceBoundary key={props.name} resource={resource(props.name)} fallback={props.fallback}><Suspense fallback={props.fallback}><LoadedAsset {...props}/></Suspense></ResourceBoundary>;
 return <group name={'Kitchen asset '+props.name} userData={{kitchenAsset:props.name,dimensions:props.size,colour:props.colour,metalness:props.metalness,roughness:props.roughness}}>{content}</group>;
}
