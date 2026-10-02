"use client";
import {Canvas} from "@react-three/fiber";
import {OrbitControls,Grid} from "@react-three/drei";
import {Project,JoineryItem} from "@/types/model";
import {material} from "@/lib/materials";

const mm=(v:number)=>v/1000;
function Panel({position,size,colour}:{position:[number,number,number];size:[number,number,number];colour:string}){
  return <mesh position={position} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={colour} roughness={0.72}/></mesh>
}
function Cabinet({i,project}:{i:JoineryItem;project:Project}){
  const c=material(i.materialId).colour,t=Math.min(18,Math.max(12,i.width/20)),tm=mm(t);
  const w=mm(i.width),h=mm(i.height),d=mm(i.depth);
  const ox=mm(i.x+i.width/2-project.roomWidth/2),oy=mm(i.y+i.height/2),oz=mm(i.z+i.depth/2-project.roomDepth/2);
  const innerW=Math.max(.01,w-2*tm),innerH=Math.max(.01,h-2*tm);
  const shelves=Array.from({length:Math.max(0,i.shelves)},(_,n)=>-h/2+tm+(innerH*(n+1))/(i.shelves+1));
  const doors=Math.max(0,i.doors);
  return <group position={[ox,oy,oz]}>
    <Panel position={[-w/2+tm/2,0,0]} size={[tm,h,d]} colour={c}/>
    <Panel position={[w/2-tm/2,0,0]} size={[tm,h,d]} colour={c}/>
    <Panel position={[0,h/2-tm/2,0]} size={[innerW,tm,d]} colour={c}/>
    <Panel position={[0,-h/2+tm/2,0]} size={[innerW,tm,d]} colour={c}/>
    <Panel position={[0,0,-d/2+tm/2]} size={[innerW,innerH,tm]} colour={c}/>
    {shelves.map((sy,n)=><Panel key={n} position={[0,sy,0]} size={[innerW,tm,Math.max(.01,d-tm)]} colour={c}/>)}
    {i.type==="Media unit"&&doors>0?Array.from({length:doors},(_,n)=>{const dh=innerH/doors;return <group key={"dr"+n}><Panel position={[0,-innerH/2+dh*(n+.5),d/2+tm*.35]} size={[innerW,Math.max(.01,dh-.003),tm*.7]} colour={c}/>{i.hardware!=="Handleless"&&i.hardware!=="None"&&<mesh position={[0,-innerH/2+dh*(n+.5),d/2+tm*1.2]}><boxGeometry args={[Math.min(.18,innerW*.3),.012,.012]}/><meshStandardMaterial color="#303030"/></mesh>}</group>}):Array.from({length:doors},(_,n)=>{const dw=innerW/doors;return <group key={"d"+n}><Panel position={[-innerW/2+dw*(n+.5),0,d/2+tm*.35]} size={[Math.max(.01,dw-.003),innerH,tm*.7]} colour={c}/>{i.hardware!=="Handleless"&&i.hardware!=="None"&&<mesh position={[-innerW/2+dw*(n+.5),0,d/2+tm*1.2]}><boxGeometry args={[.012,Math.min(.18,innerH*.25),.012]}/><meshStandardMaterial color="#303030"/></mesh>}</group>})}
    {i.type!=="Wall cabinet"&&i.type!=="Shelving"&&<Panel position={[0,-h/2+.04,d*.12]} size={[innerW,.08,Math.max(.01,d*.72)]} colour={c}/>}
  </group>
}
export function Scene3D({project,selected,onSelect}:{project:Project;selected?:string|null;onSelect?:(id:string|null)=>void}){
  const rw=mm(project.roomWidth),rh=mm(project.roomHeight),rd=mm(project.roomDepth),roomMax=Math.max(rw,rh,rd);
  return <div className="three"><Canvas onPointerMissed={()=>onSelect?.(null)} camera={{position:[Math.max(4,rw*1.25),Math.max(3,rh*1.1),Math.max(4,rd*1.5)],fov:42}} shadows>
    <ambientLight intensity={1.25}/><directionalLight castShadow position={[4,8,5]} intensity={2.2}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.0125,0]} receiveShadow><boxGeometry args={[rw,rd,.025]}/><meshStandardMaterial color="#ece9e4" roughness={.95}/></mesh>
    <Grid position={[0,.001,0]} args={[Math.max(rw,rd)*1.4,Math.max(rw,rd)*1.4]} cellSize={.1} sectionSize={1} fadeDistance={20}/>
    <mesh position={[0,rh/2,-rd/2]} receiveShadow><boxGeometry args={[rw,rh,.025]}/><meshStandardMaterial color="#f2f2f0" roughness={.9}/></mesh>
    <mesh position={[-rw/2,rh/2,0]} receiveShadow><boxGeometry args={[.025,rh,rd]}/><meshStandardMaterial color="#f7f7f5" roughness={.9}/></mesh>
    {project.items.map(i=><group key={i.id} onClick={e=>{e.stopPropagation();onSelect?.(i.id)}}><Cabinet i={i} project={project}/>{selected===i.id&&<mesh position={[(i.x+i.width/2-project.roomWidth/2)/1000,(i.y+i.height/2)/1000,(i.z+i.depth/2-project.roomDepth/2)/1000]}><boxGeometry args={[i.width/1000+.025,i.height/1000+.025,i.depth/1000+.025]}/><meshBasicMaterial color="#c8102e" wireframe transparent opacity={.85}/></mesh>}</group>)}
    <OrbitControls makeDefault target={[0,Math.min(1.2,rh/2),0]} enableDamping dampingFactor={.08} enablePan enableZoom minDistance={1} maxDistance={Math.max(8,roomMax*4)}/>
  </Canvas></div>
}