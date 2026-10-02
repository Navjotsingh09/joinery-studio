"use client";
import {useRef} from "react";
import {Canvas} from "@react-three/fiber";
import {OrbitControls,Grid,GizmoHelper,GizmoViewport,TransformControls,ContactShadows} from "@react-three/drei";
import * as THREE from "three";
import {Project,JoineryItem} from "@/types/model";
import {material} from "@/lib/materials";
import {clampItemToRoom,isWallMounted} from "@/lib/geometry";

const mm=(v:number)=>v/1000;
const BOARD=18;
const BACK=6;
const REVEAL=3;

function boardColour(hex:string,amount=0){
  const c=new THREE.Color(hex);
  if(amount>0)c.lerp(new THREE.Color("#ffffff"),amount);
  if(amount<0)c.lerp(new THREE.Color("#000000"),-amount);
  return "#"+c.getHexString();
}

function Panel({position,size,colour,front=false}:{position:[number,number,number];size:[number,number,number];colour:string;front?:boolean}){
  return <mesh position={position} castShadow receiveShadow>
    <boxGeometry args={size}/>
    <meshStandardMaterial color={front?boardColour(colour,.025):colour} roughness={front?.52:.7} metalness={0}/>
  </mesh>
}

function Metal({position,size,rotation=[0,0,0]}:{position:[number,number,number];size:[number,number,number];rotation?:[number,number,number]}){
  return <mesh position={position} rotation={rotation} castShadow>
    <boxGeometry args={size}/>
    <meshStandardMaterial color="#343434" roughness={.26} metalness={.72}/>
  </mesh>
}

function Handle({x,y,z,height,hardware,orientation="vertical"}:{x:number;y:number;z:number;height:number;hardware:string;orientation?:"vertical"|"horizontal"}){
  if(hardware==="None"||hardware==="Push-to-open")return null;
  if(hardware==="Handleless")return <Metal position={[x,y,z]} size={orientation==="vertical"?[.008,Math.min(.22,height*.34),.009]:[Math.min(.22,height*.55),.008,.009]}/>;
  if(hardware==="Knob")return <mesh position={[x,y,z]} castShadow><sphereGeometry args={[.018,18,18]}/><meshStandardMaterial color="#333" roughness={.2} metalness={.78}/></mesh>;
  const len=Math.min(.24,Math.max(.11,height*.28));
  return <group position={[x,y,z]}>
    <Metal position={[0,0,-.012]} size={orientation==="vertical"?[.012,len,.012]:[len,.012,.012]}/>
    {orientation==="vertical"?<>
      <Metal position={[0,-len/2+.015,-.022]} size={[.012,.012,.035]}/>
      <Metal position={[0,len/2-.015,-.022]} size={[.012,.012,.035]}/>
    </>:<>
      <Metal position={[-len/2+.015,0,-.022]} size={[.012,.012,.035]}/>
      <Metal position={[len/2-.015,0,-.022]} size={[.012,.012,.035]}/>
    </>}
  </group>;
}

function Plinth({w,d,h,colour}:{w:number;d:number;h:number;colour:string}){
  const recess=Math.min(.065,d*.16);
  return <group>
    <Panel position={[0,h/2,-recess/2]} size={[Math.max(.05,w-.05),h,Math.max(.04,d-recess)]} colour={boardColour(colour,-.08)}/>
    <Panel position={[0,h-.009,d/2-.035]} size={[Math.max(.05,w-.04),.018,.05]} colour={boardColour(colour,-.12)}/>
  </group>;
}

function Carcass({w,h,d,colour,shelves=0,openBack=false}:{w:number;h:number;d:number;colour:string;shelves?:number;openBack?:boolean}){
  const t=mm(BOARD),back=mm(BACK),innerW=Math.max(.02,w-2*t),innerH=Math.max(.02,h-2*t),bodyD=Math.max(.04,d);
  const shelfD=Math.max(.03,bodyD-t*.7);
  return <group>
    <Panel position={[-w/2+t/2,0,0]} size={[t,h,bodyD]} colour={colour}/>
    <Panel position={[w/2-t/2,0,0]} size={[t,h,bodyD]} colour={colour}/>
    <Panel position={[0,h/2-t/2,0]} size={[innerW,t,bodyD]} colour={colour}/>
    <Panel position={[0,-h/2+t/2,0]} size={[innerW,t,bodyD]} colour={colour}/>
    {!openBack&&<Panel position={[0,0,-bodyD/2+back/2+.006]} size={[innerW,innerH,back]} colour={boardColour(colour,-.04)}/>}
    {Array.from({length:Math.max(0,shelves)},(_,n)=>{
      const y=-h/2+t+(innerH*(n+1))/(shelves+1);
      return <Panel key={n} position={[0,y,.005]} size={[innerW,t,shelfD]} colour={boardColour(colour,.015)}/>
    })}
  </group>;
}

function DoorFronts({i,w,h,d,colour}:{i:JoineryItem;w:number;h:number;d:number;colour:string}){
  const count=Math.max(1,i.doors),gap=mm(REVEAL),frontT=mm(BOARD);
  const faceW=(w-gap*(count+1))/count;
  const faceH=h-gap*2;
  const z=d/2-frontT/2;
  return <>{Array.from({length:count},(_,n)=>{
    const x=-w/2+gap+faceW/2+n*(faceW+gap);
    const handleX=i.hardware==="Handleless"?x+(n<count/2?faceW*.42:-faceW*.42):x+(n<count/2?faceW*.38:-faceW*.38);
    return <group key={n}>
      <Panel position={[x,0,z]} size={[faceW,faceH,frontT]} colour={colour} front/>
      <Handle x={handleX} y={-.02} z={z+frontT/2+.014} height={faceH} hardware={i.hardware}/>
    </group>;
  })}</>;
}

function DrawerFronts({i,w,h,d,colour}:{i:JoineryItem;w:number;h:number;d:number;colour:string}){
  const count=Math.max(2,i.doors||3),gap=mm(REVEAL),frontT=mm(BOARD),faceW=w-gap*2,faceH=(h-gap*(count+1))/count,z=d/2-frontT/2;
  return <>{Array.from({length:count},(_,n)=>{
    const y=-h/2+gap+faceH/2+n*(faceH+gap);
    return <group key={n}>
      <Panel position={[0,y,z]} size={[faceW,faceH,frontT]} colour={colour} front/>
      <Handle x={0} y={y+faceH*.28} z={z+frontT/2+.014} height={faceW} hardware={i.hardware} orientation="horizontal"/>
    </group>;
  })}</>;
}

function Wardrobe({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  const plinth=.08,bodyH=Math.max(.3,h-plinth),bodyY=-h/2+plinth+bodyH/2,bodyD=d-mm(BOARD);
  return <group>
    <Plinth w={w} d={d} h={plinth} colour={c}/>
    <group position={[0,bodyY,-mm(BOARD)/2]}>
      <Carcass w={w} h={bodyH} d={bodyD} colour={c} shelves={Math.max(1,i.shelves)}/>
      <mesh position={[0,bodyH*.16,bodyD*.18]} rotation={[0,0,Math.PI/2]} castShadow>
        <cylinderGeometry args={[.011,.011,Math.max(.08,w-mm(90)),18]}/>
        <meshStandardMaterial color="#9b9b98" metalness={.75} roughness={.25}/>
      </mesh>
      {i.doors>0&&<DoorFronts i={i} w={w} h={bodyH} d={bodyD} colour={c}/>}
    </group>
  </group>;
}

function BaseCabinet({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  const plinth=.1,top=.025,bodyH=Math.max(.25,h-plinth-top),bodyY=-h/2+plinth+bodyH/2,bodyD=d-mm(BOARD);
  return <group>
    <Plinth w={w} d={d} h={plinth} colour={c}/>
    <group position={[0,bodyY,-mm(BOARD)/2]}>
      <Carcass w={w} h={bodyH} d={bodyD} colour={c} shelves={Math.max(0,i.shelves)}/>
      {i.doors>0&&<DoorFronts i={i} w={w} h={bodyH} d={bodyD} colour={c}/>}
    </group>
    <Panel position={[0,h/2-top/2,.008]} size={[w+.02,top,d+.02]} colour={boardColour(c,.05)} front/>
  </group>;
}

function TallCabinet({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  const plinth=.1,bodyH=Math.max(.4,h-plinth),bodyY=-h/2+plinth+bodyH/2,bodyD=d-mm(BOARD);
  return <group>
    <Plinth w={w} d={d} h={plinth} colour={c}/>
    <group position={[0,bodyY,-mm(BOARD)/2]}>
      <Carcass w={w} h={bodyH} d={bodyD} colour={c} shelves={Math.max(2,i.shelves)}/>
      {i.doors>0&&<DoorFronts i={i} w={w} h={bodyH} d={bodyD} colour={c}/>}
    </group>
  </group>;
}

function WallCabinet({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  const bodyD=d-mm(BOARD);
  return <group position={[0,0,-mm(BOARD)/2]}>
    <Carcass w={w} h={h} d={bodyD} colour={c} shelves={Math.max(1,i.shelves)}/>
    {i.doors>0&&<DoorFronts i={i} w={w} h={h} d={bodyD} colour={c}/>}
    <Panel position={[0,-h/2+.008,.012]} size={[Math.max(.03,w-.04),.01,Math.max(.03,d-.05)]} colour={boardColour(c,-.06)}/>
  </group>;
}

function DrawerUnit({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  const plinth=.1,bodyH=Math.max(.25,h-plinth),bodyY=-h/2+plinth+bodyH/2,bodyD=d-mm(BOARD);
  return <group>
    <Plinth w={w} d={d} h={plinth} colour={c}/>
    <group position={[0,bodyY,-mm(BOARD)/2]}>
      <Carcass w={w} h={bodyH} d={bodyD} colour={c}/>
      <DrawerFronts i={i} w={w} h={bodyH} d={bodyD} colour={c}/>
    </group>
  </group>;
}

function MediaUnit({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  const plinth=.07,bodyH=Math.max(.22,h-plinth),bodyY=-h/2+plinth+bodyH/2,bodyD=d-mm(BOARD);
  return <group>
    <Plinth w={w} d={d} h={plinth} colour={c}/>
    <group position={[0,bodyY,-mm(BOARD)/2]}>
      <Carcass w={w} h={bodyH} d={bodyD} colour={c}/>
      <DrawerFronts i={i} w={w} h={bodyH} d={bodyD} colour={c}/>
    </group>
  </group>;
}

function OpenShelving({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  return <group>
    <Carcass w={w} h={h} d={Math.max(.08,d-mm(BOARD))} colour={c} shelves={Math.max(2,i.shelves)} openBack/>
  </group>;
}

function CabinetGeometry({i}:{i:JoineryItem}){
  const c=material(i.materialId).colour,w=mm(i.width),h=mm(i.height),d=mm(i.depth);
  if(i.type==="Wardrobe")return <Wardrobe i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Base cabinet")return <BaseCabinet i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Wall cabinet")return <WallCabinet i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Tall cabinet")return <TallCabinet i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Drawer unit")return <DrawerUnit i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Media unit")return <MediaUnit i={i} w={w} h={h} d={d} c={c}/>;
  return <OpenShelving i={i} w={w} h={h} d={d} c={c}/>;
}

function ItemNode({i,project,selected,onSelect,onMove,onMoveStart}:{i:JoineryItem;project:Project;selected:boolean;onSelect?:(id:string|null)=>void;onMove?:(id:string,x:number,y:number,z:number)=>void;onMoveStart?:()=>void}){
  const group=useRef<THREE.Group>(null);
  const position:[number,number,number]=[
    mm(i.x+i.width/2-project.roomWidth/2),
    mm(i.y+i.height/2),
    mm(i.z+i.depth/2-project.roomDepth/2)
  ];
  const sync=()=>{
    const g=group.current;if(!g)return;
    const raw={...i,x:(g.position.x+mm(project.roomWidth)/2)*1000-i.width/2,y:g.position.y*1000-i.height/2,z:(g.position.z+mm(project.roomDepth)/2)*1000-i.depth/2};
    const q=clampItemToRoom(raw,project);
    onMove?.(i.id,q.x,q.y,q.z);
  };
  const node=<group ref={group} position={position} onClick={e=>{e.stopPropagation();onSelect?.(i.id)}}>
    <CabinetGeometry i={i}/>
    {selected&&<mesh><boxGeometry args={[mm(i.width)+.035,mm(i.height)+.035,mm(i.depth)+.035]}/><meshBasicMaterial color="#c8102e" wireframe transparent opacity={.55}/></mesh>}
  </group>;
  if(!selected||i.locked)return node;
  return <TransformControls mode="translate" translationSnap={Math.max(1,project.rules.snap)/1000} showX showY={isWallMounted(i)} showZ onMouseDown={()=>onMoveStart?.()} onObjectChange={sync}>{node}</TransformControls>;
}

export function Scene3D({project,selected,onSelect,onMove,onMoveStart}:{project:Project;selected?:string|null;onSelect?:(id:string|null)=>void;onMove?:(id:string,x:number,y:number,z:number)=>void;onMoveStart?:()=>void}){
  const rw=mm(project.roomWidth),rh=mm(project.roomHeight),rd=mm(project.roomDepth),roomMax=Math.max(rw,rh,rd);
  return <div className="three"><Canvas onPointerMissed={()=>onSelect?.(null)} camera={{position:[Math.max(3.7,rw*.95),Math.max(2.2,rh*.78),Math.max(4.3,rd*1.35)],fov:38}} shadows gl={{antialias:true}}>
    <color attach="background" args={["#f2f1ee"]}/>
    <ambientLight intensity={.72}/>
    <hemisphereLight args={["#ffffff","#b6afa5",1.25]}/>
    <directionalLight castShadow position={[3.5,6.5,4.5]} intensity={2.15} shadow-mapSize-width={2048} shadow-mapSize-height={2048}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.012,0]} receiveShadow><boxGeometry args={[rw,rd,.024]}/><meshStandardMaterial color="#d8d3cb" roughness={.9}/></mesh>
    <Grid position={[0,.002,0]} args={[Math.max(rw,rd)*1.25,Math.max(rw,rd)*1.25]} cellSize={.1} sectionSize={.5} cellColor="#cbc6bf" sectionColor="#aaa49b" fadeDistance={15} fadeStrength={1.5}/>
    <mesh position={[0,rh/2,-rd/2]} receiveShadow><boxGeometry args={[rw,rh,.035]}/><meshStandardMaterial color="#f7f6f3" roughness={.96}/></mesh>
    <mesh position={[-rw/2,rh/2,0]} receiveShadow><boxGeometry args={[.035,rh,rd]}/><meshStandardMaterial color="#f4f3f0" roughness={.96}/></mesh>
    {project.items.map(i=><ItemNode key={i.id} i={i} project={project} selected={selected===i.id} onSelect={onSelect} onMove={onMove} onMoveStart={onMoveStart}/>)}
    <ContactShadows position={[0,.003,0]} opacity={.32} scale={Math.max(5,roomMax*1.8)} blur={2.6} far={Math.max(5,roomMax*1.8)}/>
    <OrbitControls makeDefault target={[0,Math.min(1.15,rh*.48),0]} enableDamping dampingFactor={.08} enablePan enableZoom minDistance={1} maxDistance={Math.max(8,roomMax*4)}/>
    <GizmoHelper alignment="bottom-right" margin={[70,70]}><GizmoViewport axisColors={["#c8102e","#2f8f5b","#315fa8"]} labelColor="#222"/></GizmoHelper>
  </Canvas></div>;
}
