"use client";
import {Component,ReactNode,Suspense,useEffect,useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import {Project} from '@/types/model';
import {requiredKitchenAssets} from '@/lib/kitchenAssets';
const loadedAssets=new Set<string>();
export const kitchenAssetsReady=(p:Project)=>requiredKitchenAssets(p).every(name=>loadedAssets.has(name));
type Props={name:string;size:[number,number,number];colour?:string;metalness?:number;roughness?:number;fallback:ReactNode};
class AssetBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true}}render(){return this.state.failed?this.props.fallback:this.props.children}}
function LoadedAsset({name,size,colour,metalness,roughness}:Omit<Props,'fallback'>){
 const {scene}=useGLTF(`/models/kitchen/${name}.glb`);
 loadedAssets.add(name);
 const clone=useMemo(()=>{const copy=scene.clone(true);copy.traverse(o=>{const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;mesh.castShadow=mesh.receiveShadow=true;const rematerial=(m:THREE.Material)=>{const next=m.clone() as THREE.MeshStandardMaterial;if(colour)next.color.set(colour);if(metalness!==undefined)next.metalness=metalness;if(roughness!==undefined)next.roughness=roughness;return next};mesh.material=Array.isArray(mesh.material)?mesh.material.map(rematerial):rematerial(mesh.material)});return copy},[scene,colour,metalness,roughness]);
 useEffect(()=>()=>clone.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh)(Array.isArray(m.material)?m.material:[m.material]).forEach(mat=>mat.dispose())}),[clone]);
 return <primitive object={clone} scale={size} dispose={null}/>;
}
export function KitchenAsset(props:Props){
 // The test reconciler has no DOM/fetch context; its procedural counterpart is
 // checked separately from the GLB loader's real exported geometry.
 const content=typeof document==='undefined'?props.fallback:<AssetBoundary key={props.name} fallback={props.fallback}><Suspense fallback={props.fallback}><LoadedAsset {...props}/></Suspense></AssetBoundary>;
 return <group name={'Kitchen asset '+props.name} userData={{kitchenAsset:props.name,dimensions:props.size,colour:props.colour,metalness:props.metalness,roughness:props.roughness}}>{content}</group>;
}
