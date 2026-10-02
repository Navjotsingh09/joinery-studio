"use client";
import {useEffect,useRef,useState} from "react";
import {Canvas,useThree} from "@react-three/fiber";
import {OrbitControls,Grid,GizmoHelper,GizmoViewport,TransformControls,ContactShadows} from "@react-three/drei";
import * as THREE from "three";
import {Project,JoineryItem} from "@/types/model";
import {material} from "@/lib/materials";
import {clampItemToRoom,isWallMounted,footprint,normalizeRotation} from "@/lib/geometry";

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

const textureCache=new Map<string,THREE.CanvasTexture>();
function woodTexture(colour:string){
  const wood=["#b98e5d","#c7a477","#d7bd8b","#c5aa82"].includes(colour.toLowerCase());
  if(!wood||typeof document==="undefined")return null;
  const cached=textureCache.get(colour);if(cached)return cached;
  const canvas=document.createElement("canvas");canvas.width=128;canvas.height=256;
  const ctx=canvas.getContext("2d");if(!ctx)return null;
  ctx.fillStyle=colour;ctx.fillRect(0,0,128,256);
  for(let y=4;y<256;y+=7){
    ctx.beginPath();
    for(let x=0;x<=128;x+=4){
      const wave=Math.sin((x+y)*.055)*2.2+Math.sin(x*.17+y*.013)*1.1;
      if(x===0)ctx.moveTo(x,y+wave);else ctx.lineTo(x,y+wave);
    }
    ctx.strokeStyle="rgba(74,48,28,.12)";ctx.lineWidth=.75;ctx.stroke();
  }
  for(let y=17;y<256;y+=41){
    const grad=ctx.createLinearGradient(0,y,128,y+10);
    grad.addColorStop(0,"rgba(255,255,255,.02)");grad.addColorStop(.5,"rgba(60,38,20,.07)");grad.addColorStop(1,"rgba(255,255,255,.02)");
    ctx.fillStyle=grad;ctx.fillRect(0,y,128,7);
  }
  const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(1,2.4);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;textureCache.set(colour,tex);return tex;
}

function Panel({position,size,colour,front=false}:{position:[number,number,number];size:[number,number,number];colour:string;front?:boolean}){
  const tex=woodTexture(colour);
  return <mesh position={position} castShadow receiveShadow>
    <boxGeometry args={size}/>
    <meshStandardMaterial map={tex??undefined} color={tex?"#ffffff":front?boardColour(colour,.025):colour} roughness={front?.48:.68} metalness={0}/>
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


function Countertop({w,d,y,colour="#e8e4dc"}:{w:number;d:number;y:number;colour?:string}){
  return <Panel position={[0,y,0]} size={[w+.025,.028,d+.025]} colour={colour} front/>;
}

function Sink({w,d,y}:{w:number;d:number;y:number}){
  const sw=Math.min(.55,w*.7),sd=Math.min(.42,d*.68);
  return <group position={[0,y,d*.03]}>
    <mesh receiveShadow castShadow><boxGeometry args={[sw,.035,sd]}/><meshStandardMaterial color="#8f9699" roughness={.18} metalness={.72}/></mesh>
    <mesh position={[0,.023,0]}><boxGeometry args={[sw-.045,.022,sd-.045]}/><meshStandardMaterial color="#40474b" roughness={.3} metalness={.45}/></mesh>
    <mesh position={[sw*.28,.13,-sd*.2]} castShadow><cylinderGeometry args={[.012,.012,.24,18]}/><meshStandardMaterial color="#5b6063" metalness={.75} roughness={.22}/></mesh>
    <mesh position={[sw*.28,.245,-sd*.1]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.012,.012,.18,18]}/><meshStandardMaterial color="#5b6063" metalness={.75} roughness={.22}/></mesh>
  </group>;
}

function Hob({w,d,y}:{w:number;d:number;y:number}){
  const hw=Math.min(.6,w*.72),hd=Math.min(.52,d*.72);
  return <group position={[0,y,.015]}>
    <mesh castShadow><boxGeometry args={[hw,.018,hd]}/><meshStandardMaterial color="#121416" roughness={.12} metalness={.18}/></mesh>
    {[-.22,.22].flatMap((x,xi)=>[-.17,.17].map((z,zi)=><mesh key={xi+"-"+zi} position={[x*hw,0.011,z*hd]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[Math.min(hw,hd)*.12,.006,10,28]}/><meshStandardMaterial color="#3b3f42" metalness={.45} roughness={.25}/></mesh>))}
  </group>;
}

function ApplianceGlass({position,size}:{position:[number,number,number];size:[number,number,number]}){
  return <mesh position={position} castShadow><boxGeometry args={size}/><meshStandardMaterial color="#141618" roughness={.12} metalness={.12}/></mesh>;
}


function Dishwasher({w,h,d}:{w:number;h:number;d:number}){
  return <group>
    <mesh castShadow receiveShadow><boxGeometry args={[w,h,d]}/><meshStandardMaterial color="#c5c8c9" metalness={.42} roughness={.36}/></mesh>
    <ApplianceGlass position={[0,h*.23,d/2+.012]} size={[w-.08,.13,.024]}/>
    <Metal position={[0,h*.37,d/2+.028]} size={[w-.14,.018,.018]}/>
    <circleGeometry args={[.01,16]}/>
  </group>;
}

function WashingMachine({w,h,d}:{w:number;h:number;d:number}){
  return <group>
    <mesh castShadow receiveShadow><boxGeometry args={[w,h,d]}/><meshStandardMaterial color="#ecebea" roughness={.48}/></mesh>
    <mesh position={[0,-h*.05,d/2+.016]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[Math.min(w,h)*.29,Math.min(w,h)*.29,.035,40]}/><meshStandardMaterial color="#2c3134" metalness={.25} roughness={.24}/></mesh>
    <mesh position={[0,-h*.05,d/2+.038]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[Math.min(w,h)*.2,Math.min(w,h)*.2,.016,40]}/><meshStandardMaterial color="#66808c" transparent opacity={.55} roughness={.12}/></mesh>
    <rectAreaLight position={[0,h*.35,d/2+.03]} width={w*.35} height={.02} intensity={.15}/>
    <Metal position={[w*.23,h*.34,d/2+.025]} size={[.08,.025,.018]}/>
  </group>;
}

function Microwave({w,h,d}:{w:number;h:number;d:number}){
  return <group>
    <mesh castShadow><boxGeometry args={[w,h,d]}/><meshStandardMaterial color="#2b2d2f" metalness={.25} roughness={.3}/></mesh>
    <ApplianceGlass position={[-w*.07,0,d/2+.014]} size={[w*.68,h*.72,.025]}/>
    <mesh position={[w*.36,.08,d/2+.025]}><boxGeometry args={[w*.12,h*.36,.02]}/><meshStandardMaterial color="#17191a"/></mesh>
    <Metal position={[-w*.32,0,d/2+.035]} size={[.015,h*.5,.018]}/>
  </group>;
}

function ExtractorHood({w,h,d}:{w:number;h:number;d:number}){
  return <group>
    <mesh position={[0,-h*.28,.04]} castShadow><boxGeometry args={[w,.11,d]}/><meshStandardMaterial color="#777b7d" metalness={.65} roughness={.24}/></mesh>
    <mesh position={[0,.05,-d*.18]} castShadow><boxGeometry args={[w*.34,h*.58,d*.34]}/><meshStandardMaterial color="#85898b" metalness={.62} roughness={.25}/></mesh>
    <mesh position={[0,-h*.35,d*.28]} rotation={[Math.PI/2,0,0]}><circleGeometry args={[w*.18,32]}/><meshStandardMaterial color="#242729"/></mesh>
  </group>;
}

function DoorOpening({w,h,d,c}:{w:number;h:number;d:number;c:string}){
  const frame=.055,leaf=Math.max(.035,d*.38);
  return <group>
    <mesh position={[0,0,-d*.12]}><boxGeometry args={[Math.max(.05,w-frame*2),Math.max(.05,h-frame),.025]}/><meshStandardMaterial color="#4b4844" roughness={.92}/></mesh>
    <Panel position={[-w/2+frame/2,0,0]} size={[frame,h,d]} colour={c}/>
    <Panel position={[w/2-frame/2,0,0]} size={[frame,h,d]} colour={c}/>
    <Panel position={[0,h/2-frame/2,0]} size={[w,frame,d]} colour={c}/>
    <group position={[-w/2+frame+.015,-h*.05,d*.22]} rotation={[0,-.45,0]}>
      <Panel position={[w*.34,0,0]} size={[w*.68,h*.88,leaf]} colour={boardColour(c,-.08)} front/>
      <Handle x={w*.59} y={0} z={leaf/2+.02} height={h*.7} hardware="Bar handle"/>
    </group>
  </group>;
}

function WindowFrame({w,h,d}:{w:number;h:number;d:number}){
  const frame=.055;
  return <group>
    <mesh><boxGeometry args={[w,h,.018]}/><meshPhysicalMaterial color="#9eb9c4" transparent opacity={.34} roughness={.08} transmission={.55}/></mesh>
    <Metal position={[-w/2+frame/2,0,.012]} size={[frame,h,.04]}/>
    <Metal position={[w/2-frame/2,0,.012]} size={[frame,h,.04]}/>
    <Metal position={[0,h/2-frame/2,.012]} size={[w,frame,.04]}/>
    <Metal position={[0,-h/2+frame/2,.012]} size={[w,frame,.04]}/>
    <Metal position={[0,0,.015]} size={[.025,h-frame*2,.035]}/>
    <Panel position={[0,-h/2-.045,-.015]} size={[w+.08,.07,Math.max(.11,d+.08)]} colour="#e6e1da" front/>
  </group>;
}

function GlassBalustrade({w,h,d}:{w:number;h:number;d:number}){
  const panels=Math.max(1,Math.round(w/.9)),pw=w/panels;
  return <group>
    {Array.from({length:panels},(_,n)=>{const x=-w/2+pw*(n+.5);return <mesh key={n} position={[x,0,0]}><boxGeometry args={[pw-.045,h-.08,.018]}/><meshPhysicalMaterial color="#b7d2db" transparent opacity={.32} roughness={.06} transmission={.65}/></mesh>})}
    {Array.from({length:panels+1},(_,n)=><Metal key={"p"+n} position={[-w/2+pw*n,0,0]} size={[.035,h,.035]}/>)}
    <Metal position={[0,h/2+.02,0]} size={[w+.06,.055,.055]}/>
  </group>;
}

function TimberBalustrade({w,h,d,c}:{w:number;h:number;d:number;c:string}){
  const count=Math.max(4,Math.round(w/.18));
  return <group>
    <Panel position={[0,h/2+.025,0]} size={[w+.08,.065,Math.max(.07,d)]} colour={boardColour(c,-.08)} front/>
    <Panel position={[-w/2+.045,0,0]} size={[.09,h,.09]} colour={c} front/>
    <Panel position={[w/2-.045,0,0]} size={[.09,h,.09]} colour={c} front/>
    {Array.from({length:count},(_,n)=><Panel key={n} position={[-w/2+(w*(n+1))/(count+1),0,0]} size={[.035,h-.08,.035]} colour={c} front/>)}
  </group>;
}

function SlidingWardrobe({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  const bodyD=d-mm(BOARD),track=.028,gap=.012,count=Math.max(2,i.doors);
  return <group>
    <Carcass w={w} h={h} d={bodyD} colour={c} shelves={Math.max(2,i.shelves)}/>
    <Panel position={[0,-h/2+.018,d/2-.015]} size={[w,.036,.055]} colour="#797b7d"/>
    <Panel position={[0,h/2-.018,d/2-.015]} size={[w,.036,.055]} colour="#797b7d"/>
    {Array.from({length:count},(_,n)=>{
      const pw=(w-gap*(count+1))/count;
      const x=-w/2+gap+pw/2+n*(pw+gap);
      const z=d/2+.008+(n%2)*track;
      return <group key={n}>
        <Panel position={[x,0,z]} size={[pw,h-.045,.022]} colour={n===1&&count===3?"#cfd1d2":c} front/>
        <Metal position={[x+(n<count/2?pw*.43:-pw*.43),0,z+.018]} size={[.009,Math.min(.5,h*.28),.01]}/>
      </group>;
    })}
  </group>;
}

function DressingTable({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  const bodyH=Math.min(.34,h*.45),bodyY=-h/2+bodyH/2+.12;
  return <group>
    <Panel position={[0,h/2-.018,0]} size={[w,.036,d]} colour={c} front/>
    <group position={[0,bodyY,0]}><Carcass w={w} h={bodyH} d={d-.02} colour={c}/><DrawerFronts i={{...i,doors:Math.max(2,i.doors)}} w={w} h={bodyH} d={d-.02} colour={c}/></group>
    <Panel position={[-w/2+.04,-h/2+.12,0]} size={[.05,.24,d*.82]} colour={boardColour(c,-.04)}/>
    <Panel position={[w/2-.04,-h/2+.12,0]} size={[.05,.24,d*.82]} colour={boardColour(c,-.04)}/>
  </group>;
}

function BedsideCabinet({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  return <group><Carcass w={w} h={h} d={d-.02} colour={c}/><DrawerFronts i={{...i,doors:Math.max(2,i.doors)}} w={w} h={h} d={d-.02} colour={c}/><Panel position={[0,h/2+.014,0]} size={[w+.015,.028,d+.015]} colour={boardColour(c,.04)} front/></group>;
}

function BedWall({w,h,d,c}:{w:number;h:number;d:number;c:string}){
  const cols=6,rows=3,g=.012,pw=(w-g*(cols+1))/cols,ph=(h-g*(rows+1))/rows;
  return <group>{Array.from({length:cols*rows},(_,n)=>{
    const col=n%cols,row=Math.floor(n/cols),x=-w/2+g+pw/2+col*(pw+g),y=-h/2+g+ph/2+row*(ph+g);
    return <mesh key={n} position={[x,y,d/2]} castShadow><boxGeometry args={[pw,ph,Math.max(.04,d)]}/><meshStandardMaterial color={boardColour(c,row%2?.03:-.015)} roughness={.88}/></mesh>
  })}</group>;
}

function Bed({w,h,d,c}:{w:number;h:number;d:number;c:string}){
  const baseH=Math.min(.24,h*.45),mattressH=Math.max(.18,Math.min(.28,h*.45));
  return <group>
    <Panel position={[0,-h/2+baseH/2,0]} size={[w,baseH,d]} colour={boardColour(c,-.12)}/>
    <mesh position={[0,-h/2+baseH+mattressH/2,-.03]} castShadow receiveShadow><boxGeometry args={[Math.max(.3,w-.08),mattressH,Math.max(.5,d-.1)]}/><meshStandardMaterial color="#f1eee8" roughness={.9}/></mesh>
    <mesh position={[0,-h/2+baseH+mattressH+.055,-d*.35]} castShadow><boxGeometry args={[Math.max(.24,w*.42),.1,Math.max(.18,d*.25)]}/><meshStandardMaterial color="#f8f6f2" roughness={.95}/></mesh>
    <mesh position={[-w*.23,-h/2+baseH+mattressH+.04,-d*.34]} rotation={[0,0,.08]} castShadow><boxGeometry args={[w*.38,.09,d*.22]}/><meshStandardMaterial color="#faf8f4" roughness={.96}/></mesh>
    <mesh position={[w*.23,-h/2+baseH+mattressH+.04,-d*.34]} rotation={[0,0,-.08]} castShadow><boxGeometry args={[w*.38,.09,d*.22]}/><meshStandardMaterial color="#faf8f4" roughness={.96}/></mesh>
  </group>;
}

function KitchenIsland({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  const plinth=.09,bodyH=h-plinth-.035,bodyY=-h/2+plinth+bodyH/2;
  return <group>
    <Plinth w={w} d={d} h={plinth} colour={c}/>
    <group position={[0,bodyY,0]}><Carcass w={w} h={bodyH} d={d-.04} colour={c}/><DrawerFronts i={{...i,doors:Math.max(3,i.doors)}} w={w} h={bodyH} d={d-.04} colour={c}/></group>
    <Countertop w={w+.06} d={d+.08} y={h/2-.014} colour="#ddd7cc"/>
  </group>;
}

function SinkBase({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  return <group><BaseCabinet i={i} w={w} h={h} d={d} c={c}/><Sink w={w} d={d} y={h/2+.015}/></group>;
}

function HobBase({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  return <group><BaseCabinet i={i} w={w} h={h} d={d} c={c}/><Hob w={w} d={d} y={h/2+.015}/></group>;
}

function OvenTower({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  return <group><TallCabinet i={i} w={w} h={h} d={d} c={c}/><ApplianceGlass position={[0,.08,d/2+.015]} size={[w-.09,.62,.035]}/><Metal position={[0,.34,d/2+.043]} size={[w-.18,.018,.02]}/></group>;
}

function FridgeHousing({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  return <group><TallCabinet i={{...i,doors:2}} w={w} h={h} d={d} c={c}/><lineSegments position={[0,0,d/2+.03]}><edgesGeometry args={[new THREE.BoxGeometry(w-.06,h-.08,.01)]}/><lineBasicMaterial color="#6f6f6f"/></lineSegments></group>;
}

function StairFlight({width,run,rise,count=13,position=[0,0,0],axis="z",reverse=false,colour}:{width:number;run:number;rise:number;count?:number;position?:[number,number,number];axis?:"x"|"z";reverse?:boolean;colour:string}){
  const tread=run/count,stepRise=rise/count;
  return <group position={position}>{Array.from({length:count},(_,n)=>{
    const level=n+1,stepH=stepRise*level;
    const along=-run/2+tread/2+n*tread;
    const a=reverse?-along:along;
    const pos:[number,number,number]=axis==="z"?[0,-rise/2+stepH/2,a]:[a,-rise/2+stepH/2,0];
    const size:[number,number,number]=axis==="z"?[width,stepH,tread+.006]:[tread+.006,stepH,width];
    return <Panel key={n} position={pos} size={size} colour={colour} front/>
  })}
  </group>;
}

function RailPosts({width,run,rise,axis="z",side=1,position=[0,0,0]}:{width:number;run:number;rise:number;axis?:"x"|"z";side?:number;position?:[number,number,number]}){
  const count=6;
  return <group position={position}>{Array.from({length:count},(_,n)=>{
    const t=n/(count-1),along=-run/2+t*run,y=-rise/2+t*rise+.46;
    const pos:[number,number,number]=axis==="z"?[side*(width/2-.035),y,along]:[along,y,side*(width/2-.035)];
    return <Metal key={n} position={pos} size={[.026,.92,.026]}/>
  })}</group>;
}

function StraightStaircase({w,h,d,c}:{w:number;h:number;d:number;c:string}){
  const count=Math.max(11,Math.round(h/.18)),rise=h*.96,run=d*.94;
  return <group>
    <StairFlight width={w} run={run} rise={rise} count={count} colour={c}/>
    <RailPosts width={w} run={run} rise={rise} side={1}/>
    <RailPosts width={w} run={run} rise={rise} side={-1}/>
    <Panel position={[0,rise/2+.015,-run/2-.035]} size={[w,.04,.11]} colour={boardColour(c,-.12)}/>
  </group>;
}

function LStaircase({w,h,d,c}:{w:number;h:number;d:number;c:string}){
  const flightW=Math.min(w*.46,1.0),half=h*.48,run1=d*.58,run2=w*.52;
  return <group>
    <StairFlight width={flightW} run={run1} rise={half} count={7} position={[-w*.25,-h*.24,d*.19]} colour={c}/>
    <Panel position={[-w*.25,0,-d*.13]} size={[flightW,.08,flightW]} colour={c} front/>
    <StairFlight width={flightW} run={run2} rise={half} count={7} axis="x" position={[w*.08,h*.24,-d*.13]} colour={c}/>
    <RailPosts width={flightW} run={run1} rise={half} side={1} position={[-w*.25,-h*.24,d*.19]}/>
  </group>;
}

function UStaircase({w,h,d,c}:{w:number;h:number;d:number;c:string}){
  const fw=Math.min(.92,w*.42),gap=.14,half=h*.48,run=d*.72;
  return <group>
    <StairFlight width={fw} run={run} rise={half} count={7} position={[-fw/2-gap/2,-h*.24,0]} colour={c}/>
    <StairFlight width={fw} run={run} rise={half} count={7} reverse position={[fw/2+gap/2,h*.24,0]} colour={c}/>
    <Panel position={[0,0,-run/2+.04]} size={[fw*2+gap,.08,fw]} colour={c} front/>
    <RailPosts width={fw} run={run} rise={half} side={-1} position={[-fw/2-gap/2,-h*.24,0]}/>
    <RailPosts width={fw} run={run} rise={half} side={1} position={[fw/2+gap/2,h*.24,0]}/>
  </group>;
}

function UnderStairStorage({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  const sections=Math.max(3,i.doors),gap=.012,sw=(w-gap*(sections+1))/sections;
  return <group>{Array.from({length:sections},(_,n)=>{
    const sh=Math.max(.35,h*(.38+.62*(n+1)/sections)),x=-w/2+gap+sw/2+n*(sw+gap);
    return <group key={n} position={[x,-h/2+sh/2,0]}><Carcass w={sw} h={sh} d={d} colour={c} shelves={n%2}/><DoorFronts i={{...i,doors:1}} w={sw} h={sh} d={d} colour={c}/></group>
  })}</group>;
}

function CabinetGeometry({i}:{i:JoineryItem}){
  const c=material(i.materialId).colour,w=mm(i.width),h=mm(i.height),d=mm(i.depth);
  if(i.type==="Wardrobe")return <Wardrobe i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Sliding wardrobe")return <SlidingWardrobe i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Dressing table")return <DressingTable i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Bedside cabinet")return <BedsideCabinet i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Bed wall")return <BedWall w={w} h={h} d={d} c={c}/>;
  if(i.type==="Bed")return <Bed w={w} h={h} d={d} c={c}/>;
  if(i.type==="Base cabinet")return <BaseCabinet i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Sink base")return <SinkBase i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Hob base")return <HobBase i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Oven tower")return <OvenTower i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Fridge housing")return <FridgeHousing i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Kitchen island")return <KitchenIsland i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Wall cabinet")return <WallCabinet i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Tall cabinet")return <TallCabinet i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Drawer unit")return <DrawerUnit i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Media unit")return <MediaUnit i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Straight staircase")return <StraightStaircase w={w} h={h} d={d} c={c}/>;
  if(i.type==="L staircase")return <LStaircase w={w} h={h} d={d} c={c}/>;
  if(i.type==="U staircase")return <UStaircase w={w} h={h} d={d} c={c}/>;
  if(i.type==="Under-stair storage")return <UnderStairStorage i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Dishwasher")return <Dishwasher w={w} h={h} d={d}/>;
  if(i.type==="Washing machine")return <WashingMachine w={w} h={h} d={d}/>;
  if(i.type==="Microwave")return <Microwave w={w} h={h} d={d}/>;
  if(i.type==="Extractor hood")return <ExtractorHood w={w} h={h} d={d}/>;
  if(i.type==="Door opening")return <DoorOpening w={w} h={h} d={d} c={c}/>;
  if(i.type==="Window")return <WindowFrame w={w} h={h} d={d}/>;
  if(i.type==="Glass balustrade")return <GlassBalustrade w={w} h={h} d={d}/>;
  if(i.type==="Timber balustrade")return <TimberBalustrade w={w} h={h} d={d} c={c}/>;
  return <OpenShelving i={i} w={w} h={h} d={d} c={c}/>;
}

function ItemNode({i,project,selected,mode,onSelect,onMove,onRotate,onMoveStart}:{i:JoineryItem;project:Project;selected:boolean;mode:"translate"|"rotate";onSelect?:(id:string|null)=>void;onMove?:(id:string,x:number,y:number,z:number)=>void;onRotate?:(id:string,rotation:number)=>void;onMoveStart?:()=>void}){
  const group=useRef<THREE.Group>(null);
  const fp=footprint(i),rotation=normalizeRotation(i.rotation??0);
  const position:[number,number,number]=[
    mm(i.x+fp.width/2-project.roomWidth/2),
    mm(i.y+i.height/2),
    mm(i.z+fp.depth/2-project.roomDepth/2)
  ];
  const sync=()=>{
    const g=group.current;if(!g)return;
    if(mode==="rotate"){
      const next=normalizeRotation(THREE.MathUtils.radToDeg(g.rotation.y));
      onRotate?.(i.id,next);
      return;
    }
    const current={...i,rotation},box=footprint(current);
    const raw={...current,x:(g.position.x+mm(project.roomWidth)/2)*1000-box.width/2,y:g.position.y*1000-i.height/2,z:(g.position.z+mm(project.roomDepth)/2)*1000-box.depth/2};
    const q=clampItemToRoom(raw,project);
    onMove?.(i.id,q.x,q.y,q.z);
  };
  const node=<group ref={group} position={position} rotation={[0,THREE.MathUtils.degToRad(rotation),0]} onClick={e=>{e.stopPropagation();onSelect?.(i.id)}}>
    <CabinetGeometry i={i}/>
    {selected&&<mesh><boxGeometry args={[mm(i.width)+.035,mm(i.height)+.035,mm(i.depth)+.035]}/><meshBasicMaterial color="#c8102e" wireframe transparent opacity={.55}/></mesh>}
  </group>;
  if(!selected||i.locked)return node;
  return <TransformControls mode={mode} translationSnap={Math.max(1,project.rules.snap)/1000} rotationSnap={Math.PI/2} showX={mode==="translate"} showY showZ={mode==="translate"} onMouseDown={()=>onMoveStart?.()} onObjectChange={sync}>{node}</TransformControls>;
}


type CameraPreset="iso"|"front"|"side"|"top";
function CameraRig({preset,rw,rh,rd}:{preset:CameraPreset;rw:number;rh:number;rd:number}){
  const {camera,controls}=useThree();
  useEffect(()=>{
    const m=Math.max(rw,rh,rd),target=new THREE.Vector3(0,Math.min(1.15,rh*.45),0);
    camera.up.set(0,1,0);
    if(preset==="front")camera.position.set(0,Math.max(1.4,rh*.5),Math.max(4.2,m*1.7));
    else if(preset==="side")camera.position.set(Math.max(4.2,m*1.7),Math.max(1.4,rh*.5),0);
    else if(preset==="top"){camera.up.set(0,0,-1);camera.position.set(0,Math.max(5,m*1.9),0);target.set(0,0,0)}
    else camera.position.set(Math.max(3.7,rw*.95),Math.max(2.2,rh*.78),Math.max(4.3,rd*1.35));
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    const orbit=controls as any;
    if(orbit?.target){orbit.target.copy(target);orbit.update?.()}
  },[preset,rw,rh,rd,camera,controls]);
  return null;
}

export function Scene3D({project,selected,transformMode="translate",onSelect,onMove,onRotate,onMoveStart}:{project:Project;selected?:string|null;transformMode?:"translate"|"rotate";onSelect?:(id:string|null)=>void;onMove?:(id:string,x:number,y:number,z:number)=>void;onRotate?:(id:string,rotation:number)=>void;onMoveStart?:()=>void}){
  const rw=mm(project.roomWidth),rh=mm(project.roomHeight),rd=mm(project.roomDepth),roomMax=Math.max(rw,rh,rd);
  const [preset,setPreset]=useState<CameraPreset>("iso"),[showGrid,setShowGrid]=useState(true),[showWalls,setShowWalls]=useState(true);
  return <div className="three"><div className="sceneToolbar"><div className="cameraPresets">{(["iso","front","side","top"] as CameraPreset[]).map(v=><button key={v} className={preset===v?"active":""} onClick={()=>setPreset(v)}>{v==="iso"?"Iso":v[0].toUpperCase()+v.slice(1)}</button>)}</div><div className="sceneToggles"><button className={showGrid?"active":""} onClick={()=>setShowGrid(v=>!v)}>Grid</button><button className={showWalls?"active":""} onClick={()=>setShowWalls(v=>!v)}>Walls</button></div></div><Canvas onPointerMissed={()=>onSelect?.(null)} camera={{position:[Math.max(3.7,rw*.95),Math.max(2.2,rh*.78),Math.max(4.3,rd*1.35)],fov:38}} shadows gl={{antialias:true}}>
    <CameraRig preset={preset} rw={rw} rh={rh} rd={rd}/>
    <color attach="background" args={["#f2f1ee"]}/>
    <ambientLight intensity={.72}/>
    <hemisphereLight args={["#ffffff","#b6afa5",1.25]}/>
    <directionalLight castShadow position={[3.5,6.5,4.5]} intensity={2.15} shadow-mapSize-width={2048} shadow-mapSize-height={2048}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.012,0]} receiveShadow><boxGeometry args={[rw,rd,.024]}/><meshStandardMaterial color="#d8d3cb" roughness={.9}/></mesh>
{showGrid&&<Grid position={[0,.002,0]} args={[Math.max(rw,rd)*1.25,Math.max(rw,rd)*1.25]} cellSize={.1} sectionSize={.5} cellColor="#cbc6bf" sectionColor="#aaa49b" fadeDistance={15} fadeStrength={1.5}/>}
{showWalls&&<><mesh position={[0,rh/2,-rd/2]} receiveShadow><boxGeometry args={[rw,rh,.035]}/><meshStandardMaterial color="#f7f6f3" roughness={.96}/></mesh><mesh position={[-rw/2,rh/2,0]} receiveShadow><boxGeometry args={[.035,rh,rd]}/><meshStandardMaterial color="#f4f3f0" roughness={.96}/></mesh></>}
    {project.items.map(i=><ItemNode key={i.id} i={i} project={project} selected={selected===i.id} mode={transformMode} onSelect={onSelect} onMove={onMove} onRotate={onRotate} onMoveStart={onMoveStart}/>)}
    <ContactShadows position={[0,.003,0]} opacity={.32} scale={Math.max(5,roomMax*1.8)} blur={2.6} far={Math.max(5,roomMax*1.8)}/>
    <OrbitControls makeDefault target={[0,Math.min(1.15,rh*.48),0]} enableDamping dampingFactor={.08} enablePan enableZoom minDistance={1} maxDistance={Math.max(8,roomMax*4)}/>
    <GizmoHelper alignment="bottom-right" margin={[70,70]}><GizmoViewport axisColors={["#c8102e","#2f8f5b","#315fa8"]} labelColor="#222"/></GizmoHelper>
  </Canvas></div>;
}
