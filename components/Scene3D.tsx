"use client";
import {createContext,useContext,useEffect,useRef,useState} from "react";
import {Canvas,useThree} from "@react-three/fiber";
import {OrbitControls,Grid,GizmoHelper,GizmoViewport,TransformControls,ContactShadows,Html,Line,RoundedBox} from "@react-three/drei";
import * as THREE from "three";
import {Project,JoineryItem,Material,JoineryPart} from "@/types/model";
import {material} from "@/lib/materials";
import {clampItemToRoom,isWallMounted,footprint,normalizeRotation} from "@/lib/geometry";

const mm=(v:number)=>v/1000;
const BOARD=18;
const BACK=6;
const REVEAL=3;
let activeCustomMaterials:Material[]=[];
let activeConstructionView=false;
type PartSelectionState={selected:boolean;selectedPart?:JoineryPart|null;onSelectPart?:(part:JoineryPart)=>void};
const PartSelectionContext=createContext<PartSelectionState>({selected:false});
const sceneMaterial=(id:string)=>material(id,activeCustomMaterials);
function useDataTexture(url?:string){
  const [tex,setTex]=useState<THREE.Texture|null>(null);
  useEffect(()=>{
    if(!url){setTex(null);return}
    let alive=true;
    const loader=new THREE.TextureLoader();
    loader.load(url,t=>{if(!alive){t.dispose();return}t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2.4,2.4);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;setTex(t)});
    return()=>{alive=false}
  },[url]);
  return tex;
}

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


const stoneTextureCache=new Map<string,THREE.CanvasTexture>();
function stoneTexture(id:string,colour:string){
  if(typeof document==="undefined"||!(id==="stone-light"||id==="stone-dark"))return null;
  const cached=stoneTextureCache.get(id);if(cached)return cached;
  const canvas=document.createElement("canvas");canvas.width=384;canvas.height=384;
  const ctx=canvas.getContext("2d");if(!ctx)return null;
  ctx.fillStyle=colour;ctx.fillRect(0,0,384,384);
  if(id==="stone-light"){
    const wash=ctx.createLinearGradient(0,0,384,384);wash.addColorStop(0,"rgba(255,255,255,.24)");wash.addColorStop(.5,"rgba(202,194,184,.08)");wash.addColorStop(1,"rgba(255,255,255,.18)");ctx.fillStyle=wash;ctx.fillRect(0,0,384,384);
    for(let k=0;k<7;k++){
      ctx.beginPath();
      for(let x=-20;x<=404;x+=6){
        const y=42+k*48+Math.sin(x*.026+k*1.7)*18+Math.sin(x*.061+k*.8)*6;
        if(x===-20)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.strokeStyle=k%3===0?"rgba(130,122,114,.18)":"rgba(159,151,142,.1)";
      ctx.lineWidth=k%3===0?1.15:.7;ctx.stroke();
    }
  }else{
    for(let y=0;y<384;y+=13)for(let x=(y/13)%2?6:0;x<384;x+=17){
      const a=.025+((x+y)%41)/1600;ctx.fillStyle="rgba(255,255,255,"+a+")";ctx.fillRect(x,y,2,2);
    }
    for(let k=0;k<5;k++){ctx.beginPath();for(let x=0;x<=384;x+=8){const y=55+k*66+Math.sin(x*.04+k)*11;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.strokeStyle="rgba(210,205,198,.08)";ctx.lineWidth=.8;ctx.stroke()}
  }
  const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(1.7,1.7);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;stoneTextureCache.set(id,tex);return tex;
}
function builtInSurfaceTexture(id:string|undefined,colour:string){
  return id?stoneTexture(id,colour)??woodTexture(colour):woodTexture(colour);
}

const roomTextureCache=new Map<string,THREE.CanvasTexture>();
function oakFloorTexture(){
  const key="oak-floor";
  const cached=roomTextureCache.get(key);if(cached)return cached;
  if(typeof document==="undefined")return null;
  const canvas=document.createElement("canvas");canvas.width=512;canvas.height=512;
  const ctx=canvas.getContext("2d");if(!ctx)return null;
  ctx.fillStyle="#c7ad8b";ctx.fillRect(0,0,512,512);
  const plankH=64;
  for(let row=0;row<8;row++){
    const y=row*plankH;
    ctx.fillStyle=row%2?"rgba(110,73,42,.035)":"rgba(255,255,255,.045)";
    ctx.fillRect(0,y,512,plankH);
    ctx.strokeStyle="rgba(80,54,35,.18)";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();
    const offset=row%2?110:0;
    for(let x=-offset;x<512;x+=190){
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+plankH);ctx.stroke();
    }
    for(let gy=y+9;gy<y+plankH-5;gy+=10){
      ctx.beginPath();
      for(let x=0;x<=512;x+=8){
        const wave=Math.sin((x+gy)*.036)*1.8+Math.sin(x*.09+row)*.8;
        if(x===0)ctx.moveTo(x,gy+wave);else ctx.lineTo(x,gy+wave);
      }
      ctx.strokeStyle="rgba(91,61,39,.09)";ctx.lineWidth=.7;ctx.stroke();
    }
  }
  const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(4,4);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
  roomTextureCache.set(key,tex);return tex;
}

function builtInFloorTexture(id:string,colour:string){
  if(id==="floor-oak")return oakFloorTexture();
  const key="floor-"+id,existing=roomTextureCache.get(key);if(existing)return existing;
  if(typeof document==="undefined")return null;
  const canvas=document.createElement("canvas");canvas.width=512;canvas.height=512;
  const ctx=canvas.getContext("2d");if(!ctx)return null;
  ctx.fillStyle=colour;ctx.fillRect(0,0,512,512);
  if(id==="floor-walnut"){
    for(let row=0;row<8;row++){
      const y=row*64;ctx.strokeStyle="rgba(38,23,15,.25)";ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();
      const offset=row%2?90:0;for(let x=-offset;x<512;x+=180){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+64);ctx.stroke()}
      for(let gy=y+10;gy<y+59;gy+=9){ctx.beginPath();for(let x=0;x<=512;x+=8){const wave=Math.sin((x+gy)*.04)*1.6;if(x===0)ctx.moveTo(x,gy+wave);else ctx.lineTo(x,gy+wave)}ctx.strokeStyle="rgba(30,17,10,.11)";ctx.stroke()}
    }
  }else{
    const tile=128;ctx.strokeStyle="rgba(75,72,68,.18)";ctx.lineWidth=2;
    for(let p=0;p<=512;p+=tile){ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,512);ctx.stroke();ctx.beginPath();ctx.moveTo(0,p);ctx.lineTo(512,p);ctx.stroke()}
    for(let n=0;n<110;n++){const x=(n*79)%512,y=(n*137)%512;ctx.fillStyle="rgba(85,82,78,.035)";ctx.fillRect(x,y,18+(n%5)*5,2)}
  }
  const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(4,4);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;roomTextureCache.set(key,tex);return tex;
}

function RoomShell({rw,rh,rd,showWalls,realistic,floorMaterial,studioMode=false}:{rw:number;rh:number;rd:number;showWalls:boolean;realistic:boolean;floorMaterial:Material;studioMode?:boolean}){
  const uploadedFloor=useDataTexture(floorMaterial.textureDataUrl);
  const floor=studioMode?null:realistic?(uploadedFloor??builtInFloorTexture(floorMaterial.id,floorMaterial.colour)):null;
  const skirting=.095,skirtingD=.018;
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.014,0]} receiveShadow>
      <boxGeometry args={[rw,rd,.028]}/>
      <meshStandardMaterial map={floor??undefined} color={studioMode?"#d8cdbc":floor?"#ffffff":floorMaterial.colour} roughness={studioMode?.9:realistic?.72:.9}/>
    </mesh>
    {showWalls&&<>
      <mesh position={[0,rh/2,-rd/2]} receiveShadow>
        <boxGeometry args={[rw,rh,.05]}/>
        <meshStandardMaterial color={realistic?"#eeeae2":"#f7f6f3"} roughness={realistic ? .93 : .96}/>
      </mesh>
      <mesh position={[-rw/2,rh/2,0]} receiveShadow>
        <boxGeometry args={[.05,rh,rd]}/>
        <meshStandardMaterial color={realistic?"#f4f1eb":"#f4f3f0"} roughness={realistic ? .93 : .96}/>
      </mesh>
      {realistic&&<>
        <mesh position={[0,skirting/2,-rd/2+.032]} receiveShadow><boxGeometry args={[rw,skirting,skirtingD]}/><meshStandardMaterial color="#f8f7f3" roughness={.78}/></mesh>
        <mesh position={[-rw/2+.032,skirting/2,0]} receiveShadow><boxGeometry args={[skirtingD,skirting,rd]}/><meshStandardMaterial color="#f8f7f3" roughness={.78}/></mesh>
        <mesh position={[0,rh-.028,-rd/2+.034]}><boxGeometry args={[rw,.035,.02]}/><meshStandardMaterial color="#faf9f6" roughness={.82}/></mesh>
        <mesh position={[-rw/2+.034,rh-.028,0]}><boxGeometry args={[.02,.035,rd]}/><meshStandardMaterial color="#faf9f6" roughness={.82}/></mesh>
      </>}
    </>}
    {realistic&&<>
      <pointLight position={[-rw*.24,Math.max(2.1,rh-.18),-rd*.22]} intensity={9} distance={4.4} decay={2} color="#fff4df"/>
      <pointLight position={[rw*.12,Math.max(2.1,rh-.18),-rd*.18]} intensity={7} distance={4.2} decay={2} color="#fff8ea"/>
      <pointLight position={[rw*.28,Math.max(2.1,rh-.18),rd*.18]} intensity={5} distance={3.8} decay={2} color="#fff8ef"/>
    </>}
  </group>;
}

function Panel({position,size,colour,front=false,materialId,part}:{position:[number,number,number];size:[number,number,number];colour:string;front?:boolean;materialId?:string;part?:JoineryPart}){
  const picker=useContext(PartSelectionContext);
  const exact=materialId?sceneMaterial(materialId):undefined;
  const baseColour=exact?.colour??colour;
  const custom=exact?.textureDataUrl?exact:activeCustomMaterials.find(m=>m.colour===baseColour&&m.textureDataUrl);
  const uploaded=useDataTexture(custom?.textureDataUrl);
  if(uploaded){
    const repeatX=Math.max(1,Math.min(8,size[0]/.45)),repeatY=Math.max(1,Math.min(8,Math.max(size[1],size[2])/.45));
    uploaded.repeat.set(repeatX,repeatY);
  }
  const tex=uploaded??builtInSurfaceTexture(materialId,baseColour);
  const category=exact?.category??custom?.category??"";
  const isStone=category==="Worktop",isMetal=category==="Metal";
  const roughness=isMetal?.2:isStone?.26:front?.42:.64,metalness=isMetal?.78:0;
  const picked=!!part&&picker.selected&&picker.selectedPart===part;
  return <mesh position={position} castShadow receiveShadow onClick={part?e=>{if(picker.selected){e.stopPropagation();picker.onSelectPart?.(part)}}:undefined}>
    <boxGeometry args={size}/>
    <meshStandardMaterial map={tex??undefined} color={tex?"#ffffff":front?boardColour(baseColour,.025):baseColour} roughness={roughness} metalness={metalness}/>
    {picked&&<lineSegments><edgesGeometry args={[new THREE.BoxGeometry(...size)]}/><lineBasicMaterial color="#c8102e"/></lineSegments>}
  </mesh>
}
function Metal({position,size,rotation=[0,0,0]}:{position:[number,number,number];size:[number,number,number];rotation?:[number,number,number]}){
  return <mesh position={position} rotation={rotation} castShadow>
    <boxGeometry args={size}/>
    <meshStandardMaterial color="#343434" roughness={.26} metalness={.72}/>
  </mesh>
}

function HingePair({height,side=1}:{height:number;side?:number}){
  const x=side*.012;
  return <>{[-.28,.28].map((y,n)=><group key={n} position={[x,y*height,.014]}>
    <mesh rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.016,.016,.012,20]}/><meshStandardMaterial color="#b9b9b6" metalness={.82} roughness={.18}/></mesh>
    <Metal position={[side*.025,0,-.006]} size={[.05,.024,.012]}/>
  </group>)}</>
}

function KitchenShelfProps({w,h,d,levels=2}:{w:number;h:number;d:number;levels?:number}){
  if(!activeConstructionView)return null;
  const count=Math.max(1,levels);
  return <group>{Array.from({length:count},(_,n)=>{
    const y=-h/2+(h*(n+1))/(count+1)+.035,z=d*.14,offset=Math.min(.11,w*.2),plateR=Math.min(.075,Math.max(.035,w*.1));
    return <group key={n} position={[0,y,z]}>
      <mesh position={[-offset,0,0]} castShadow><cylinderGeometry args={[plateR,plateR,.028,28]}/><meshStandardMaterial color="#e7e1d7" roughness={.58}/></mesh>
      <mesh position={[-offset,.018,0]} castShadow><cylinderGeometry args={[plateR*.92,plateR*.92,.012,28]}/><meshStandardMaterial color="#f2ede5" roughness={.52}/></mesh>
      <mesh position={[offset,.035,.015]} castShadow><cylinderGeometry args={[.042,.035,.07,22]}/><meshStandardMaterial color={n%2?"#c6b7a3":"#d8d3ca"} roughness={.62}/></mesh>
    </group>
  })}</group>;
}

function DrawerBox({w,h,d,z,colour}:{w:number;h:number;d:number;z:number;colour:string}){
  const side=.012,bottom=.009,boxH=Math.max(.08,h*.56),boxD=Math.max(.12,d*.72);
  return <group position={[0,0,z-boxD/2]}>
    <Panel position={[-w/2+side/2,0,0]} size={[side,boxH,boxD]} colour={boardColour(colour,-.08)}/>
    <Panel position={[w/2-side/2,0,0]} size={[side,boxH,boxD]} colour={boardColour(colour,-.08)}/>
    <Panel position={[0,-boxH/2+bottom/2,0]} size={[Math.max(.03,w-side*2),bottom,boxD]} colour={boardColour(colour,.08)}/>
    <Panel position={[0,0,-boxD/2+side/2]} size={[Math.max(.03,w-side*2),boxH,side]} colour={boardColour(colour,-.04)}/>
    <Metal position={[-w/2-.004,-boxH*.15,0]} size={[.008,.022,boxD*.78]}/>
    <Metal position={[w/2+.004,-boxH*.15,0]} size={[.008,.022,boxD*.78]}/>
    {activeConstructionView&&w>.38&&<>
      <mesh position={[-Math.min(.13,w*.2),-.005,.02]} castShadow><cylinderGeometry args={[.075,.065,.075,28]}/><meshStandardMaterial color="#2d2e2d" metalness={.22} roughness={.38}/></mesh>
      <mesh position={[Math.min(.12,w*.18),-.012,-.025]} castShadow><cylinderGeometry args={[.06,.052,.06,28]}/><meshStandardMaterial color="#4a4138" metalness={.1} roughness={.48}/></mesh>
    </>}
  </group>
}

function DimensionOverlay({i}:{i:JoineryItem}){
  const w=mm(i.width),h=mm(i.height),d=mm(i.depth),offset=.11;
  const red="#4b4640";
  return <group>
    <Line points={[[-w/2,-h/2-offset,d/2+offset],[w/2,-h/2-offset,d/2+offset]]} color={red} lineWidth={1.4}/>
    <Line points={[[-w/2-offset,-h/2,d/2+offset],[-w/2-offset,h/2,d/2+offset]]} color={red} lineWidth={1.4}/>
    <Line points={[[w/2+offset,-h/2,d/2],[w/2+offset,-h/2,-d/2]]} color={red} lineWidth={1.4}/>
    <Html position={[0,-h/2-offset-.025,d/2+offset]} center distanceFactor={7}><span className="modelDimension">{i.width} mm</span></Html>
    <Html position={[-w/2-offset-.025,0,d/2+offset]} center distanceFactor={7}><span className="modelDimension">{i.height} mm</span></Html>
    <Html position={[w/2+offset,-h/2,-.02]} center distanceFactor={7}><span className="modelDimension">{i.depth} mm</span></Html>
  </group>
}

function RoomDimensionOverlay({rw,rh,rd,project}:{rw:number;rh:number;rd:number;project:Project}){
  const line="#5b554e",off=.24;
  return <group>
    <Line points={[[-rw/2,.025,-rd/2-off],[rw/2,.025,-rd/2-off]]} color={line} lineWidth={1}/>
    <Line points={[[rw/2+off,.025,-rd/2],[rw/2+off,.025,rd/2]]} color={line} lineWidth={1}/>
    <Line points={[[-rw/2-off,0,-rd/2],[-rw/2-off,rh,-rd/2]]} color={line} lineWidth={1}/>
    <Html position={[0,.025,-rd/2-off-.03]} center distanceFactor={8}><span className="modelDimension">Room {project.roomWidth} mm</span></Html>
    <Html position={[rw/2+off+.03,.025,0]} center distanceFactor={8}><span className="modelDimension">{project.roomDepth} mm</span></Html>
    <Html position={[-rw/2-off-.03,rh/2,-rd/2]} center distanceFactor={8}><span className="modelDimension">{project.roomHeight} mm</span></Html>
  </group>;
}

function ConstructionLabels({i}:{i:JoineryItem}){
  const w=mm(i.width),h=mm(i.height),d=mm(i.depth);
  const hasDoors=i.doors>0,hasPlinth=!!i.plinthStyle&&i.plinthStyle!=="none";
  return <group>
    <Html position={[-w/2-.09,h*.18,0]} center distanceFactor={7}><span className="constructionLabel">Carcass</span></Html>
    {hasDoors&&<Html position={[0,h*.08,d/2+.16]} center distanceFactor={7}><span className="constructionLabel accent">Doors / fronts</span></Html>}
    <Html position={[-w/2-.12,0,d/2-.05]} center distanceFactor={7}><span className="constructionLabel">Left side</span></Html>
    <Html position={[w/2+.12,0,d/2-.05]} center distanceFactor={7}><span className="constructionLabel">Right side</span></Html>
    {hasPlinth&&<Html position={[0,-h/2+.07,d/2+.12]} center distanceFactor={7}><span className="constructionLabel">Plinth</span></Html>}
    {(i.type==="Base cabinet"||i.type==="Sink base"||i.type==="Hob base"||i.type==="Drawer unit"||i.type==="Kitchen island")&&<Html position={[0,h/2+.12,0]} center distanceFactor={7}><span className="constructionLabel">Worktop line</span></Html>}
  </group>
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

function Plinth({w,d,h,colour,materialId,style="recessed",recessMm=65}:{w:number;d:number;h:number;colour:string;materialId?:string;style?:"recessed"|"flush"|"none";recessMm?:number}){
  if(style==="none")return null;
  const recess=style==="flush"?0:Math.min(mm(Math.max(0,recessMm)),d*.3);
  const frontZ=d/2-recess-.012;
  if(activeConstructionView&&style==="recessed"){
    const lx=Math.max(.08,w*.38),lz=Math.max(.08,d*.32);
    return <group>
      {[[-lx,-lz],[lx,-lz],[-lx,lz],[lx,lz]].map(([x,z],n)=><group key={n} position={[x,h*.42,z-recess*.35]}>
        <mesh castShadow><cylinderGeometry args={[.024,.031,h*.72,20]}/><meshStandardMaterial color="#232323" roughness={.45}/></mesh>
        <mesh position={[0,-h*.36,0]}><cylinderGeometry args={[.042,.042,.012,24]}/><meshStandardMaterial color="#151515" roughness={.6}/></mesh>
      </group>)}
      <Panel position={[0,h*.55,frontZ+.05]} size={[Math.max(.05,w-.04),h*.9,.018]} colour={colour} materialId={materialId} part="plinth" front/>
    </group>
  }
  return <group>
    <Panel position={[0,h/2,-recess/2]} size={[Math.max(.05,w-.05),h,Math.max(.04,d-recess)]} colour={colour} materialId={materialId} part="plinth"/>
    <Panel position={[0,h-.009,d/2-.035]} size={[Math.max(.05,w-.04),.018,.05]} colour={colour} materialId={materialId} part="plinth"/>
  </group>;
}
function Carcass({i,w,h,d,colour,shelves=0,openBack=false}:{i:JoineryItem;w:number;h:number;d:number;colour:string;shelves?:number;openBack?:boolean}){
  const carcassId=i.carcassMaterialId??i.materialId;
  const leftId=i.leftSideMaterialId??i.sideMaterialId??carcassId;
  const rightId=i.rightSideMaterialId??i.sideMaterialId??carcassId;
  const leftColour=sceneMaterial(leftId).colour,rightColour=sceneMaterial(rightId).colour,carcassColour=sceneMaterial(carcassId).colour;
  const t=mm(BOARD),back=mm(BACK),innerW=Math.max(.02,w-2*t),innerH=Math.max(.02,h-2*t),bodyD=Math.max(.04,d);
  const shelfD=Math.max(.03,bodyD-t*.7),explode=activeConstructionView ? .11 : 0,topExplode=activeConstructionView ? .075 : 0,backExplode=activeConstructionView ? .08 : 0;
  return <group>
    <Panel position={[-w/2+t/2-explode,0,0]} size={[t,h,bodyD]} colour={leftColour} materialId={leftId} part="left-side"/>
    <Panel position={[w/2-t/2+explode,0,0]} size={[t,h,bodyD]} colour={rightColour} materialId={rightId} part="right-side"/>
    <Panel position={[0,h/2-t/2+topExplode,0]} size={[innerW,t,bodyD]} colour={carcassColour} materialId={carcassId} part="carcass"/>
    <Panel position={[0,-h/2+t/2-topExplode,0]} size={[innerW,t,bodyD]} colour={carcassColour} materialId={carcassId} part="carcass"/>
    {!openBack&&<Panel position={[0,0,-bodyD/2+back/2+.006-backExplode]} size={[innerW,innerH,back]} colour={boardColour(carcassColour,-.04)} materialId={carcassId} part="carcass"/>}
    {Array.from({length:Math.max(0,shelves)},(_,n)=>{
      const y=-h/2+t+(innerH*(n+1))/(shelves+1);
      const shelfExplode=activeConstructionView ? (n%2===0 ? .022 : -.022) : 0;
      return <Panel key={n} position={[shelfExplode,y,.005]} size={[innerW,t,shelfD]} colour={boardColour(carcassColour,.015)} materialId={carcassId} part="carcass"/>
    })}
    {activeConstructionView&&w>.9&&<Panel position={[0,0,.018]} size={[t,innerH,shelfD]} colour={boardColour(carcassColour,-.02)} materialId={carcassId} part="carcass"/>}
    {activeConstructionView&&<>
      {[-.34,.34].map((y,n)=><mesh key={"drill"+n} position={[-w/2+t+.006-explode,y*h,bodyD/2+.002]}><cylinderGeometry args={[.004,.004,.004,12]}/><meshStandardMaterial color="#64615c"/></mesh>)}
      <mesh position={[-w/2+t/2-explode,0,bodyD/2+.001]}><boxGeometry args={[t*.92,h-.01,.0025]}/><meshStandardMaterial color={boardColour(leftColour,-.12)} roughness={.52}/></mesh>
      <mesh position={[w/2-t/2+explode,0,bodyD/2+.001]}><boxGeometry args={[t*.92,h-.01,.0025]}/><meshStandardMaterial color={boardColour(rightColour,-.12)} roughness={.52}/></mesh>
      <mesh position={[0,h/2-t/2+topExplode,bodyD/2+.001]}><boxGeometry args={[innerW,t*.92,.0025]}/><meshStandardMaterial color={boardColour(carcassColour,-.1)} roughness={.52}/></mesh>
      <mesh position={[0,-h/2+t/2-topExplode,bodyD/2+.001]}><boxGeometry args={[innerW,t*.92,.0025]}/><meshStandardMaterial color={boardColour(carcassColour,-.1)} roughness={.52}/></mesh>
    </>}
  </group>;
}
function DoorFronts({i,w,h,d,colour}:{i:JoineryItem;w:number;h:number;d:number;colour:string}){
  const faceId=i.doorMaterialId??i.materialId,faceColour=sceneMaterial(faceId).colour;
  const count=Math.max(1,i.doors),gap=mm(REVEAL),frontT=mm(BOARD);
  const baseOpen=Math.min(110,(i.openAmount??0)*1.1),constructionOpen=activeConstructionView?Math.max(78,baseOpen):baseOpen,open=THREE.MathUtils.degToRad(constructionOpen);
  const faceW=(w-gap*(count+1))/count,faceH=h-gap*2,z=d/2-frontT/2+(activeConstructionView ? .09 : 0);
  return <>{Array.from({length:count},(_,n)=>{
    const x=-w/2+gap+faceW/2+n*(faceW+gap);
    const leftHinge=n<count/2,pivot=x+(leftHinge?-faceW/2:faceW/2),localX=leftHinge?faceW/2:-faceW/2;
    return <group key={n} position={[pivot,0,z]} rotation={[0,leftHinge?-open:open,0]}>
      <Panel position={[localX,0,0]} size={[faceW,faceH,frontT]} colour={faceColour} materialId={faceId} part="fronts" front/>
      {open>.08&&<HingePair height={faceH} side={leftHinge?1:-1}/>}
      <Handle x={localX+(leftHinge?faceW*.38:-faceW*.38)} y={-.02} z={frontT/2+.014} height={faceH} hardware={i.hardware}/>
    </group>;
  })}</>;
}
function DrawerFronts({i,w,h,d,colour}:{i:JoineryItem;w:number;h:number;d:number;colour:string}){
  const faceId=i.doorMaterialId??i.materialId,faceColour=sceneMaterial(faceId).colour;
  const count=Math.max(2,i.doors||3),gap=mm(REVEAL),frontT=mm(BOARD),faceW=w-gap*2,faceH=(h-gap*(count+1))/count;
  const requested=Math.min(.38,(i.openAmount??0)/100*.38);
  return <>{Array.from({length:count},(_,n)=>{
    const y=-h/2+gap+faceH/2+n*(faceH+gap);
    const stagger=activeConstructionView ? .12+Math.min(.16,(count-1-n)*.035) : 0;
    const openDist=Math.max(requested,stagger),z=d/2-frontT/2+openDist;
    return <group key={n}>
      {openDist>.02&&<group position={[0,y,0]}><DrawerBox w={faceW*.92} h={faceH*.78} d={d*.78} z={z-frontT/2} colour={sceneMaterial(i.carcassMaterialId??i.materialId).colour}/></group>}
      <Panel position={[0,y,z]} size={[faceW,faceH,frontT]} colour={faceColour} materialId={faceId} part="fronts" front/>
      <Handle x={0} y={y+faceH*.28} z={z+frontT/2+.014} height={faceW} hardware={i.hardware} orientation="horizontal"/>
    </group>;
  })}</>;
}
function Wardrobe({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  const plinth=.08,bodyH=Math.max(.3,h-plinth),bodyY=-h/2+plinth+bodyH/2,bodyD=d-mm(BOARD);
  return <group>
    <Plinth w={w} d={d} h={plinth} colour={sceneMaterial(i.plinthMaterialId??i.carcassMaterialId??i.materialId).colour} materialId={i.plinthMaterialId??i.carcassMaterialId??i.materialId} style={i.plinthStyle} recessMm={i.plinthRecess}/>
    <group position={[0,bodyY,-mm(BOARD)/2]}>
      <Carcass i={i} w={w} h={bodyH} d={bodyD} colour={c} shelves={Math.max(1,i.shelves)}/>
      <mesh position={[0,bodyH*.16,bodyD*.18]} rotation={[0,0,Math.PI/2]} castShadow>
        <cylinderGeometry args={[.011,.011,Math.max(.08,w-mm(90)),18]}/>
        <meshStandardMaterial color="#9b9b98" metalness={.75} roughness={.25}/>
      </mesh>
      {i.doors>0&&<DoorFronts i={i} w={w} h={bodyH} d={bodyD} colour={c}/>}
    </group>
  </group>;
}

function BaseCabinet({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  const plinth=.1,top=.025,bodyH=Math.max(.25,h-plinth-top),bodyY=-h/2+plinth+bodyH/2,bodyD=d-mm(BOARD),explode=activeConstructionView;
  return <group>
    <group position={[0,explode?-.055:0,explode?.035:0]}><Plinth w={w} d={d} h={plinth} colour={sceneMaterial(i.plinthMaterialId??i.carcassMaterialId??i.materialId).colour} materialId={i.plinthMaterialId??i.carcassMaterialId??i.materialId} style={i.plinthStyle} recessMm={i.plinthRecess}/></group>
    <group position={[0,bodyY,-mm(BOARD)/2+(explode?-.045:0)]}>
      <Carcass i={i} w={w} h={bodyH} d={bodyD} colour={c} shelves={Math.max(0,i.shelves)}/>
      {i.doors>0&&<DoorFronts i={i} w={w} h={bodyH} d={bodyD} colour={c}/>}
    </group>
    <Panel position={[0,h/2-top/2+(explode?.055:0),.008+(explode?.025:0)]} size={[w+.02,top,d+.02]} colour={boardColour(c,.05)} materialId={i.carcassMaterialId??i.materialId} part="carcass" front/>
  </group>;
}

function CornerCabinet({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  const plinth=.1,top=.025,bodyH=Math.max(.25,h-plinth-top),bodyY=-h/2+plinth+bodyH/2;
  const carcassId=i.carcassMaterialId??i.materialId,faceId=i.doorMaterialId??i.materialId;
  const carcassColour=sceneMaterial(carcassId).colour,faceColour=sceneMaterial(faceId).colour;
  const t=mm(BOARD),legD=Math.max(.22,Math.min(d*.52,.5)),legW=Math.max(.22,Math.min(w*.52,.5)),explode=activeConstructionView;
  const rearZ=-d/2+legD/2-(explode?.045:0),sideDepth=Math.max(.12,d-legD),sideZ=-d/2+legD+sideDepth/2;
  const shelfT=Math.max(.012,t),doorW=Math.max(.22,Math.min(.5,Math.hypot(Math.max(.12,w-legW),Math.max(.12,d-legD))*.72));
  const requested=Math.min(105,(i.openAmount??0)*1.05),open=THREE.MathUtils.degToRad(activeConstructionView?Math.max(72,requested):requested);
  const doorZ=d*.18+(explode?.09:0),doorX=w*.18+(explode?.06:0);
  const shelfLevels=Math.max(1,i.shelves||1);
  return <group>
    <group position={[0,explode?-.055:0,explode?.035:0]}>
      <Plinth w={w} d={legD} h={plinth} colour={sceneMaterial(i.plinthMaterialId??carcassId).colour} materialId={i.plinthMaterialId??carcassId} style={i.plinthStyle} recessMm={i.plinthRecess}/>
      <group position={[-w/2+legW/2,0,legD/2]}><Plinth w={legW} d={Math.max(.08,d-legD)} h={plinth} colour={sceneMaterial(i.plinthMaterialId??carcassId).colour} materialId={i.plinthMaterialId??carcassId} style={i.plinthStyle} recessMm={i.plinthRecess}/></group>
    </group>
    <group position={[0,bodyY,0]}>
      <Panel position={[0,0,rearZ]} size={[w,bodyH,legD]} colour={carcassColour} materialId={carcassId} part="carcass"/>
      <Panel position={[-w/2+legW/2-(explode?.045:0),0,sideZ]} size={[legW,bodyH,sideDepth]} colour={sceneMaterial(i.leftSideMaterialId??i.sideMaterialId??carcassId).colour} materialId={i.leftSideMaterialId??i.sideMaterialId??carcassId} part="left-side"/>
      {Array.from({length:shelfLevels},(_,n)=>{
        const y=-bodyH/2+(bodyH*(n+1))/(shelfLevels+1);
        return <group key={n} position={[0,y+(explode?(n%2?-.02:.02):0),0]}>
          <Panel position={[0,0,rearZ]} size={[Math.max(.08,w-t*2),shelfT,Math.max(.08,legD-t*2)]} colour={boardColour(carcassColour,.015)} materialId={carcassId} part="carcass"/>
          <Panel position={[-w/2+legW/2,0,sideZ]} size={[Math.max(.08,legW-t*2),shelfT,Math.max(.08,sideDepth-t*2)]} colour={boardColour(carcassColour,.015)} materialId={carcassId} part="carcass"/>
        </group>
      })}
      <group position={[doorX,0,doorZ]} rotation={[0,-Math.PI/4-open,0]}>
        <Panel position={[0,0,0]} size={[doorW,Math.max(.16,bodyH-mm(REVEAL*2)),t]} colour={faceColour} materialId={faceId} part="fronts" front/>
        <Handle x={doorW*.32} y={-.02} z={t/2+.014} height={bodyH} hardware={i.hardware}/>
        {(open>.08||activeConstructionView)&&<HingePair height={bodyH*.82} side={-1}/>}
      </group>
    </group>
    <group position={[0,h/2-top/2+(explode?.055:0),0]}>
      <Panel position={[0,0,-d/2+legD/2]} size={[w+.02,top,legD+.02]} colour={boardColour(c,.05)} materialId={i.worktopMaterialId??carcassId} part="worktop" front/>
      <Panel position={[-w/2+legW/2,0,legD/2]} size={[legW+.02,top,Math.max(.08,d-legD)+.02]} colour={boardColour(c,.05)} materialId={i.worktopMaterialId??carcassId} part="worktop" front/>
    </group>
  </group>;
}

function TallCabinet({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  const plinth=.1,bodyH=Math.max(.4,h-plinth),bodyY=-h/2+plinth+bodyH/2,bodyD=d-mm(BOARD),explode=activeConstructionView;
  return <group>
    <group position={[0,explode?-.06:0,explode?.04:0]}><Plinth w={w} d={d} h={plinth} colour={sceneMaterial(i.plinthMaterialId??i.carcassMaterialId??i.materialId).colour} materialId={i.plinthMaterialId??i.carcassMaterialId??i.materialId} style={i.plinthStyle} recessMm={i.plinthRecess}/></group>
    <group position={[0,bodyY+(explode?.025:0),-mm(BOARD)/2+(explode?-.05:0)]}>
      <Carcass i={i} w={w} h={bodyH} d={bodyD} colour={c} shelves={Math.max(2,i.shelves)}/>
      <KitchenShelfProps w={w} h={bodyH} d={bodyD} levels={Math.min(4,Math.max(2,i.shelves))}/>
      {i.doors>0&&<DoorFronts i={i} w={w} h={bodyH} d={bodyD} colour={c}/>}
    </group>
  </group>;
}

function WallCabinet({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  const bodyD=d-mm(BOARD),explode=activeConstructionView;
  return <group position={[0,0,-mm(BOARD)/2]}>
    <group position={[0,0,explode?-.045:0]}>
      <Carcass i={i} w={w} h={h} d={bodyD} colour={c} shelves={Math.max(1,i.shelves)}/>
      <KitchenShelfProps w={w} h={h} d={bodyD} levels={Math.min(3,Math.max(1,i.shelves))}/>
    </group>
    {i.doors>0&&<DoorFronts i={i} w={w} h={h} d={bodyD} colour={c}/>}
    <Panel position={[0,-h/2+.008-(explode?.045:0),.012+(explode?.03:0)]} size={[Math.max(.03,w-.04),.01,Math.max(.03,d-.05)]} colour={boardColour(c,-.06)}/>
    {!activeConstructionView&&<>
      <mesh position={[0,-h/2-.006,d*.18]}><boxGeometry args={[Math.max(.08,w-.08),.012,.025]}/><meshStandardMaterial color="#fff1c8" emissive="#ffe7a8" emissiveIntensity={2.2} roughness={.35}/></mesh>
      <pointLight position={[0,-h/2-.06,d*.2]} intensity={2.1} distance={1.55} decay={2} color="#ffe4aa"/>
    </>}
  </group>;
}

function DrawerUnit({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  const plinth=.1,bodyH=Math.max(.25,h-plinth),bodyY=-h/2+plinth+bodyH/2,bodyD=d-mm(BOARD),explode=activeConstructionView;
  return <group>
    <group position={[0,explode?-.055:0,explode?.035:0]}><Plinth w={w} d={d} h={plinth} colour={sceneMaterial(i.plinthMaterialId??i.carcassMaterialId??i.materialId).colour} materialId={i.plinthMaterialId??i.carcassMaterialId??i.materialId} style={i.plinthStyle} recessMm={i.plinthRecess}/></group>
    <group position={[0,bodyY,-mm(BOARD)/2+(explode?-.045:0)]}>
      <Carcass i={i} w={w} h={bodyH} d={bodyD} colour={c}/>
      <DrawerFronts i={i} w={w} h={bodyH} d={bodyD} colour={c}/>
    </group>
  </group>;
}

function MediaUnit({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  const plinth=.07,bodyH=Math.max(.22,h-plinth),bodyY=-h/2+plinth+bodyH/2,bodyD=d-mm(BOARD);
  return <group>
    <Plinth w={w} d={d} h={plinth} colour={sceneMaterial(i.plinthMaterialId??i.carcassMaterialId??i.materialId).colour} materialId={i.plinthMaterialId??i.carcassMaterialId??i.materialId} style={i.plinthStyle} recessMm={i.plinthRecess}/>
    <group position={[0,bodyY,-mm(BOARD)/2]}>
      <Carcass i={i} w={w} h={bodyH} d={bodyD} colour={c}/>
      <DrawerFronts i={i} w={w} h={bodyH} d={bodyD} colour={c}/>
    </group>
  </group>;
}

function OpenShelving({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  return <group>
    <Carcass i={i} w={w} h={h} d={Math.max(.08,d-mm(BOARD))} colour={c} shelves={Math.max(2,i.shelves)} openBack/>
  </group>;
}


function WorktopSurface({w,h,d,materialId,position=[0,0,0]}:{w:number;h:number;d:number;materialId:string;position?:[number,number,number]}){
  const picker=useContext(PartSelectionContext),m=sceneMaterial(materialId),uploaded=useDataTexture(m.textureDataUrl);
  if(uploaded){uploaded.repeat.set(Math.max(1,w/.5),Math.max(1,d/.5));}
  const tex=uploaded??builtInSurfaceTexture(materialId,m.colour),picked=picker.selected&&picker.selectedPart==="worktop";
  return <RoundedBox args={[w,h,d]} radius={Math.min(.007,h*.24)} smoothness={4} position={position} castShadow receiveShadow onClick={e=>{if(picker.selected){e.stopPropagation();picker.onSelectPart?.("worktop")}}}>
    <meshStandardMaterial map={tex??undefined} color={tex?"#ffffff":m.colour} roughness={m.category==="Worktop"?.22:.48} metalness={0}/>
    {picked&&<lineSegments><edgesGeometry args={[new THREE.BoxGeometry(w,h,d)]}/><lineBasicMaterial color="#c8102e"/></lineSegments>}
  </RoundedBox>
}

function Countertop({w,d,y,colour="#e8e4dc",materialId}:{w:number;d:number;y:number;colour?:string;materialId?:string}){
  const id=materialId??"stone-light";
  return <WorktopSurface w={w+.025} h={.032} d={d+.025} materialId={id} position={[0,y,0]}/>;
}

function Sink({i,w,d,y}:{i:JoineryItem;w:number;d:number;y:number}){
  const style=i.productStyle??"Inset stainless",sw=Math.min(.56,w*.72),sd=Math.min(.43,d*.7),rim=.026,basinH=.18;
  const finish=i.colourVariant==="Black"?"#242729":i.colourVariant==="White ceramic"?"#efeeea":"#b7bcbd";
  if(style==="Belfast ceramic"){
    return <group position={[0,y-.055,d*.03]}>
      <RoundedBox args={[Math.min(.62,w*.78),.24,Math.min(.46,d*.72)]} radius={.035} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={i.colourVariant==="Black"?"#313131":"#f1efea"} roughness={.32}/>
      </RoundedBox>
      <RoundedBox args={[Math.min(.54,w*.68),.18,Math.min(.38,d*.6)]} radius={.03} smoothness={4} position={[0,.025,0]}>
        <meshStandardMaterial color="#d8d5cf" roughness={.45}/>
      </RoundedBox>
      <mesh position={[0,-.095,0]} rotation={[-Math.PI/2,0,0]}><cylinderGeometry args={[.025,.025,.01,28]}/><meshStandardMaterial color="#9ca1a3" metalness={.76} roughness={.18}/></mesh>
    </group>;
  }
  if(style==="Undermount"){
    return <group position={[0,y-.018,d*.03]}>
      <RoundedBox args={[sw-rim*1.2,basinH,sd-rim*1.2]} radius={.026} smoothness={4} position={[0,-basinH/2,0]} castShadow receiveShadow>
        <meshStandardMaterial color={finish} roughness={.18} metalness={i.colourVariant==="White ceramic"?0:.72}/>
      </RoundedBox>
      <mesh position={[0,-basinH+.018,0]} rotation={[-Math.PI/2,0,0]}><cylinderGeometry args={[.024,.024,.008,28]}/><meshStandardMaterial color="#b9bec0" metalness={.84} roughness={.14}/></mesh>
    </group>;
  }
  return <group position={[0,y,d*.03]}>
    <mesh position={[0,-basinH/2+.004,0]} receiveShadow castShadow><boxGeometry args={[sw-rim*2,basinH,sd-rim*2]}/><meshStandardMaterial color={i.colourVariant==="Black"?"#2f3436":"#6f777a"} roughness={.2} metalness={.72}/></mesh>
    <mesh position={[0,.003,0]} receiveShadow castShadow><boxGeometry args={[sw,.012,sd]}/><meshStandardMaterial color={finish} roughness={.12} metalness={i.colourVariant==="White ceramic"?0:.82}/></mesh>
    <mesh position={[0,.01,0]}><boxGeometry args={[sw-rim*2,.014,sd-rim*2]}/><meshStandardMaterial color={i.colourVariant==="White ceramic"?"#d8d5cf":"#303639"} roughness={.22} metalness={i.colourVariant==="White ceramic"?0:.52}/></mesh>
    <mesh position={[0,-basinH+.018,0]} rotation={[-Math.PI/2,0,0]}><cylinderGeometry args={[.024,.024,.008,28]}/><meshStandardMaterial color="#b9bec0" metalness={.84} roughness={.14}/></mesh>
    <mesh position={[0,-basinH+.024,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.034,.003,8,28]}/><meshStandardMaterial color="#5d6467" metalness={.7} roughness={.2}/></mesh>
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


function applianceFinish(name="Stainless steel"){return name==="Black"?"#202225":name==="White"?"#eeeeeb":name==="Graphite"?"#4c4f52":name==="Cream"?"#e5dccb":"#b9bec0"}
function Dishwasher({i,w,h,d}:{i:JoineryItem;w:number;h:number;d:number}){
  const finish=applianceFinish(i.colourVariant),style=i.productStyle??"Contemporary",professional=style==="Professional",minimal=style==="Minimal";
  return <group>
    <mesh castShadow receiveShadow><boxGeometry args={[w,h,d]}/><meshStandardMaterial color={finish} metalness={i.colourVariant==="White"?.05:.42} roughness={minimal?.24:.36}/></mesh>
    {!minimal&&<ApplianceGlass position={[0,h*.23,d/2+.012]} size={[w-.08,.13,.024]}/>}
    <Metal position={[0,h*(professional?.32:.37),d/2+.028]} size={[w*(professional?.78:.7),professional?.028:.018,.018]}/>
    {style==="Classic"&&[-.24,0,.24].map((x,n)=><mesh key={n} position={[x*w,h*.29,d/2+.03]}><cylinderGeometry args={[.014,.014,.012,16]}/><meshStandardMaterial color="#444" metalness={.45}/></mesh>)}
  </group>;
}

function WashingMachine({i,w,h,d}:{i:JoineryItem;w:number;h:number;d:number}){
  const finish=applianceFinish(i.colourVariant??"White"),style=i.productStyle??"Contemporary",professional=style==="Professional",classic=style==="Classic";
  const ring=Math.min(w,h)*(professional?.31:.29);
  return <group>
    <mesh castShadow receiveShadow><boxGeometry args={[w,h,d]}/><meshStandardMaterial color={finish} roughness={style==="Minimal"?.34:.48}/></mesh>
    <mesh position={[0,-h*.05,d/2+.016]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[ring,ring,.035,40]}/><meshStandardMaterial color={professional?"#1f2224":"#2c3134"} metalness={.25} roughness={.24}/></mesh>
    <mesh position={[0,-h*.05,d/2+.038]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[ring*.69,ring*.69,.016,40]}/><meshStandardMaterial color="#66808c" transparent opacity={.55} roughness={.12}/></mesh>
    <Metal position={[w*.23,h*.34,d/2+.025]} size={[professional?.11:.08,professional?.032:.025,.018]}/>
    {classic&&<>{[-.12,.03,.18].map((x,n)=><mesh key={n} position={[x*w,h*.35,d/2+.031]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.021,.021,.013,20]}/><meshStandardMaterial color="#444" metalness={.5}/></mesh>)}</>}
  </group>;
}
function Microwave({i,w,h,d}:{i:JoineryItem;w:number;h:number;d:number}){
  const finish=applianceFinish(i.colourVariant??"Black"),style=i.productStyle??"Contemporary",minimal=style==="Minimal",professional=style==="Professional";
  return <group>
    <mesh castShadow><boxGeometry args={[w,h,d]}/><meshStandardMaterial color={finish} metalness={.25} roughness={minimal?.2:.3}/></mesh>
    <ApplianceGlass position={[-w*.07,0,d/2+.014]} size={[w*(minimal?.77:.68),h*.72,.025]}/>
    {!minimal&&<mesh position={[w*.36,.08,d/2+.025]}><boxGeometry args={[w*.12,h*.36,.02]}/><meshStandardMaterial color="#17191a"/></mesh>}
    <Metal position={[-w*(minimal?.4:.32),0,d/2+.035]} size={[professional?.022:.015,h*(professional?.58:.5),.018]}/>
    {style==="Classic"&&<><mesh position={[w*.34,h*.22,d/2+.038]}><cylinderGeometry args={[.022,.022,.012,20]}/><meshStandardMaterial color="#777" metalness={.6}/></mesh><mesh position={[w*.34,.02,d/2+.038]}><cylinderGeometry args={[.022,.022,.012,20]}/><meshStandardMaterial color="#777" metalness={.6}/></mesh></>}
  </group>;
}
function ExtractorHood({i,w,h,d}:{i:JoineryItem;w:number;h:number;d:number}){
  const finish=applianceFinish(i.colourVariant),style=i.productStyle??"Contemporary",minimal=style==="Minimal",professional=style==="Professional";
  return <group>
    {minimal?<mesh position={[0,-h*.18,.02]} castShadow><boxGeometry args={[w,.12,d*.62]}/><meshStandardMaterial color={finish} metalness={.62} roughness={.22}/></mesh>:<>
      <mesh position={[0,-h*.28,.04]} castShadow><boxGeometry args={[w,professional?.16:.11,d]}/><meshStandardMaterial color={finish} metalness={.65} roughness={.24}/></mesh>
      <mesh position={[0,.05,-d*.18]} castShadow><boxGeometry args={[w*(professional?.42:.34),h*.58,d*.34]}/><meshStandardMaterial color={finish} metalness={.62} roughness={.25}/></mesh>
    </>}
    <mesh position={[0,-h*.35,d*.28]} rotation={[Math.PI/2,0,0]}><circleGeometry args={[w*.18,32]}/><meshStandardMaterial color="#242729"/></mesh>
    {style==="Classic"&&<Metal position={[0,-h*.18,d*.42]} size={[w*.66,.018,.018]}/>}
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
    <Carcass i={i} w={w} h={h} d={bodyD} colour={c} shelves={Math.max(2,i.shelves)}/>
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
    <group position={[0,bodyY,0]}><Carcass i={i} w={w} h={bodyH} d={d-.02} colour={c}/><DrawerFronts i={{...i,doors:Math.max(2,i.doors)}} w={w} h={bodyH} d={d-.02} colour={c}/></group>
    <Panel position={[-w/2+.04,-h/2+.12,0]} size={[.05,.24,d*.82]} colour={boardColour(c,-.04)}/>
    <Panel position={[w/2-.04,-h/2+.12,0]} size={[.05,.24,d*.82]} colour={boardColour(c,-.04)}/>
  </group>;
}

function BedsideCabinet({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  return <group><Carcass i={i} w={w} h={h} d={d-.02} colour={c}/><DrawerFronts i={{...i,doors:Math.max(2,i.doors)}} w={w} h={h} d={d-.02} colour={c}/><Panel position={[0,h/2+.014,0]} size={[w+.015,.028,d+.015]} colour={boardColour(c,.04)} front/></group>;
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
    <Plinth w={w} d={d} h={plinth} colour={sceneMaterial(i.plinthMaterialId??i.carcassMaterialId??i.materialId).colour} materialId={i.plinthMaterialId??i.carcassMaterialId??i.materialId} style={i.plinthStyle} recessMm={i.plinthRecess}/>
    <group position={[0,bodyY,0]}><Carcass i={i} w={w} h={bodyH} d={d-.04} colour={c}/><DrawerFronts i={{...i,doors:Math.max(3,i.doors)}} w={w} h={bodyH} d={d-.04} colour={c}/></group>
    <Countertop w={w+.06} d={d+.08} y={h/2-.014} materialId={i.worktopMaterialId??"stone-light"} colour="#ddd7cc"/>
  </group>;
}

function SinkBase({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  return <group><BaseCabinet i={i} w={w} h={h} d={d} c={c}/><Sink i={i} w={w} d={d} y={h/2+.048}/></group>;
}

function HobBase({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  return <group><BaseCabinet i={i} w={w} h={h} d={d} c={c}/><Hob w={w} d={d} y={h/2+.044}/></group>;
}

function OvenTower({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  const plinth=.1,bodyH=Math.max(.9,h-plinth),bodyY=-h/2+plinth+bodyH/2,bodyD=d-mm(BOARD);
  const ovenH=Math.min(.62,bodyH*.3),lowerH=Math.max(.34,bodyH*.29),topH=Math.max(.34,bodyH-ovenH-lowerH-.035);
  const lowerY=-bodyH/2+lowerH/2,ovenY=lowerY+lowerH/2+ovenH/2+.012,topY=bodyH/2-topH/2;
  return <group>
    <Plinth w={w} d={d} h={plinth} colour={sceneMaterial(i.plinthMaterialId??i.carcassMaterialId??i.materialId).colour} materialId={i.plinthMaterialId??i.carcassMaterialId??i.materialId} style={i.plinthStyle} recessMm={i.plinthRecess}/>
    <group position={[0,bodyY,-mm(BOARD)/2]}>
      <Carcass i={i} w={w} h={bodyH} d={bodyD} colour={c} shelves={activeConstructionView?3:0}/>
      <group position={[0,lowerY,0]}><DoorFronts i={{...i,doors:1}} w={w} h={lowerH-.012} d={bodyD} colour={c}/></group>
      <group position={[0,topY,0]}><DoorFronts i={{...i,doors:1}} w={w} h={topH-.012} d={bodyD} colour={c}/></group>
      <mesh position={[0,ovenY,bodyD/2+.002]} castShadow><boxGeometry args={[w-.055,ovenH-.02,.08]}/><meshStandardMaterial color="#242628" metalness={.28} roughness={.25}/></mesh>
      <ApplianceGlass position={[0,ovenY,bodyD/2+.049]} size={[w-.11,ovenH-.115,.026]}/>
      <Metal position={[0,ovenY+ovenH*.34,bodyD/2+.071]} size={[w-.18,.018,.018]}/>
      {activeConstructionView&&<>
        <mesh position={[0,ovenY,bodyD*.08]} castShadow><boxGeometry args={[Math.max(.2,w-.12),Math.max(.2,ovenH-.11),Math.max(.18,bodyD*.58)]}/><meshStandardMaterial color="#333638" roughness={.48} metalness={.12}/></mesh>
        <Html position={[0,ovenY,bodyD/2+.18]} center distanceFactor={7}><span className="constructionLabel accent">Oven cavity</span></Html>
      </>}
    </group>
  </group>;
}

function FridgeHousing({i,w,h,d,c}:{i:JoineryItem;w:number;h:number;d:number;c:string}){
  const plinth=.1,bodyH=Math.max(.9,h-plinth),bodyY=-h/2+plinth+bodyH/2,bodyD=d-mm(BOARD),split=.42;
  const lowerH=bodyH*split,upperH=bodyH-lowerH-.012,lowerY=-bodyH/2+lowerH/2,upperY=bodyH/2-upperH/2;
  return <group>
    <Plinth w={w} d={d} h={plinth} colour={sceneMaterial(i.plinthMaterialId??i.carcassMaterialId??i.materialId).colour} materialId={i.plinthMaterialId??i.carcassMaterialId??i.materialId} style={i.plinthStyle} recessMm={i.plinthRecess}/>
    <group position={[0,bodyY,-mm(BOARD)/2]}>
      <Carcass i={i} w={w} h={bodyH} d={bodyD} colour={c} shelves={activeConstructionView?2:0}/>
      <mesh position={[0,0,bodyD*.03]} castShadow><boxGeometry args={[Math.max(.2,w-.09),Math.max(.5,bodyH-.08),Math.max(.22,bodyD*.7)]}/><meshStandardMaterial color="#4d5153" metalness={.14} roughness={.42}/></mesh>
      <group position={[0,lowerY,0]}><DoorFronts i={{...i,doors:1}} w={w} h={lowerH-.01} d={bodyD} colour={c}/></group>
      <group position={[0,upperY,0]}><DoorFronts i={{...i,doors:1}} w={w} h={upperH-.01} d={bodyD} colour={c}/></group>
      <mesh position={[0,-bodyH/2+.045,bodyD/2+.018]}><boxGeometry args={[w*.62,.035,.018]}/><meshStandardMaterial color="#26282a" metalness={.25} roughness={.3}/></mesh>
      {activeConstructionView&&<Html position={[0,.08,bodyD/2+.19]} center distanceFactor={7}><span className="constructionLabel accent">Integrated fridge cavity</span></Html>}
    </group>
  </group>;
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
    return <group key={n} position={[x,-h/2+sh/2,0]}><Carcass i={i} w={sw} h={sh} d={d} colour={c} shelves={n%2}/><DoorFronts i={{...i,doors:1}} w={sw} h={sh} d={d} colour={c}/></group>
  })}</group>;
}


function SimpleBlock({w,h,d,c,materialId,part}:{w:number;h:number;d:number;c:string;materialId?:string;part?:JoineryPart}){return <Panel position={[0,0,0]} size={[w,h,d]} colour={c} materialId={materialId} part={part} front/>}
function HangingRail({w}:{w:number}){return <mesh rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[.012,.012,Math.max(.04,w-.06),18]}/><meshStandardMaterial color="#9b9b98" metalness={.78} roughness={.22}/></mesh>}
function Radiator({w,h,d}:{w:number;h:number;d:number}){const count=Math.max(5,Math.round(w/.09));return <group>{Array.from({length:count},(_,n)=><mesh key={n} position={[-w/2+w*(n+.5)/count,0,0]} castShadow><boxGeometry args={[Math.max(.025,w/count-.014),h,d]}/><meshStandardMaterial color="#f0efeb" roughness={.55}/></mesh>)}<Metal position={[0,-h/2+.06,d/2+.018]} size={[w*.88,.018,.018]}/></group>}
function ServicePlate({w,h,d,c="#f5f3ee"}:{w:number;h:number;d:number;c?:string}){return <group><mesh castShadow><boxGeometry args={[w,h,Math.max(.012,d)]}/><meshStandardMaterial color={c} roughness={.58}/></mesh><mesh position={[0,0,d/2+.008]}><boxGeometry args={[w*.22,h*.34,.012]}/><meshStandardMaterial color="#555" roughness={.5}/></mesh></group>}
function MirrorPanel({w,h,d}:{w:number;h:number;d:number}){return <group><mesh><boxGeometry args={[w,h,Math.max(.012,d)]}/><meshPhysicalMaterial color="#c7d3d8" metalness={.15} roughness={.06} transmission={.18}/></mesh><lineSegments><edgesGeometry args={[new THREE.BoxGeometry(w,h,Math.max(.012,d))]}/><lineBasicMaterial color="#777"/></lineSegments></group>}
function CeilingLight({w,h,d}:{w:number;h:number;d:number}){return <mesh rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[Math.max(.05,w/2),Math.max(.05,w/2),Math.max(.025,h),32]}/><meshStandardMaterial color="#eee7cf" emissive="#fff2c5" emissiveIntensity={.55} roughness={.38}/></mesh>}
function PendantLight({w,h}:{w:number;h:number}){return <group><Metal position={[0,h*.25,0]} size={[.012,h*.5,.012]}/><mesh position={[0,-h*.2,0]} castShadow><coneGeometry args={[Math.max(.08,w/2),Math.max(.12,h*.35),32,1,true]}/><meshStandardMaterial color="#3d3a36" metalness={.35} roughness={.35} side={THREE.DoubleSide}/></mesh><pointLight position={[0,-h*.35,0]} intensity={2.2} distance={2.2} color="#fff0d2"/></group>}
function metalFinish(name="Chrome"){return name==="Matt black"?"#202224":name==="Brass"?"#b18a45":name==="Brushed steel"?"#8d9395":"#b9bec0"}
function TapObject({i,w,h,d}:{i:JoineryItem;w:number;h:number;d:number}){
  const style=i.productStyle??(i.type==="Bridge tap"?"Bridge":i.type==="Pull-out tap"?"Pull-out":"Arc mixer"),finish=metalFinish(i.colourVariant),r=Math.max(.009,w*.05);
  const mat=<meshStandardMaterial color={finish} metalness={.84} roughness={i.colourVariant==="Brushed steel"?.28:.16}/>;
  if(style==="Bridge")return <group>
    <mesh position={[-w*.22,-h*.12,0]} castShadow><cylinderGeometry args={[r,r,h*.58,18]}/>{mat}</mesh>
    <mesh position={[w*.22,-h*.12,0]} castShadow><cylinderGeometry args={[r,r,h*.58,18]}/>{mat}</mesh>
    <mesh position={[0,h*.1,0]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[r,r,w*.5,18]}/>{mat}</mesh>
    <mesh position={[0,h*.24,d*.18]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[r,r,d*.72,18]}/>{mat}</mesh>
    <mesh position={[-w*.22,h*.02,d*.12]}><sphereGeometry args={[r*1.8,16,16]}/>{mat}</mesh><mesh position={[w*.22,h*.02,d*.12]}><sphereGeometry args={[r*1.8,16,16]}/>{mat}</mesh>
  </group>;
  if(style==="Square neck")return <group>
    <mesh position={[0,-h*.1,0]} castShadow><boxGeometry args={[r*2.2,h*.62,r*2.2]}/>{mat}</mesh>
    <mesh position={[0,h*.2,d*.16]} castShadow><boxGeometry args={[r*2.2,r*2.2,d*.48]}/>{mat}</mesh>
    <mesh position={[0,h*.2,d*.39]} castShadow><boxGeometry args={[r*2.2,h*.14,r*2.2]}/>{mat}</mesh>
    <mesh position={[w*.14,-h*.02,0]} rotation={[0,0,-.55]} castShadow><boxGeometry args={[r*1.5,h*.22,r*1.5]}/>{mat}</mesh>
  </group>;
  return <group>
    <mesh position={[0,-h*.14,0]} castShadow><cylinderGeometry args={[r,r*1.05,h*.68,20]}/>{mat}</mesh>
    <mesh position={[0,h*.16,d*.12]} rotation={[Math.PI/2,0,0]} castShadow><torusGeometry args={[Math.max(.06,h*.22),r,12,32,Math.PI]}/>{mat}</mesh>
    {style==="Pull-out"&&<><mesh position={[0,h*.22,d*.34]} castShadow><cylinderGeometry args={[r*1.55,r*1.25,Math.max(.06,d*.24),18]}/>{mat}</mesh><mesh position={[w*.15,-h*.02,0]} rotation={[0,0,-.55]} castShadow><cylinderGeometry args={[r*.7,r*.7,h*.2,14]}/>{mat}</mesh></>}
  </group>
}

function FreestandingFridge({i,w,h,d}:{i:JoineryItem;w:number;h:number;d:number}){
  const finish=applianceFinish(i.colourVariant),style=i.productStyle??"Contemporary",minimal=style==="Minimal",professional=style==="Professional";
  return <group>
    <mesh castShadow receiveShadow><boxGeometry args={[w,h,d]}/><meshStandardMaterial color={finish} metalness={.32} roughness={minimal?.24:.34}/></mesh>
    {!minimal&&<lineSegments position={[0,0,d/2+.006]}><edgesGeometry args={[new THREE.BoxGeometry(w-.025,h-.025,.01)]}/><lineBasicMaterial color="#555"/></lineSegments>}
    {professional?<><Metal position={[-w*.22,0,d/2+.03]} size={[.018,h*.55,.022]}/><Metal position={[w*.22,0,d/2+.03]} size={[.018,h*.55,.022]}/></>:!minimal&&<Metal position={[w*.32,0,d/2+.025]} size={[.018,h*.42,.018]}/>}
    {style==="Classic"&&<mesh position={[0,h*.34,d/2+.025]}><boxGeometry args={[w*.32,.055,.018]}/><meshStandardMaterial color="#ddd7ca" roughness={.4}/></mesh>}
  </group>
}
function SingleOven({i,w,h,d}:{i:JoineryItem;w:number;h:number;d:number}){
  const finish=applianceFinish(i.colourVariant??"Black"),style=i.productStyle??"Contemporary",minimal=style==="Minimal",professional=style==="Professional";
  return <group>
    <mesh castShadow><boxGeometry args={[w,h,d]}/><meshStandardMaterial color={finish} metalness={.3} roughness={minimal?.2:.28}/></mesh>
    <ApplianceGlass position={[0,-h*.05,d/2+.018]} size={[w*(minimal?.86:.78),h*(minimal?.66:.58),.03]}/>
    {!minimal&&<Metal position={[0,h*.32,d/2+.035]} size={[w*(professional?.78:.68),professional?.026:.018,.018]}/>}
    {(style==="Classic"||professional)&&[-.18,.18].map((x,n)=><mesh key={n} position={[x*w,h*.34,d/2+.04]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[professional?.024:.02,professional?.024:.02,.014,20]}/><meshStandardMaterial color="#85898b" metalness={.72}/></mesh>)}
  </group>
}
function RangeCooker({i,w,h,d}:{i:JoineryItem;w:number;h:number;d:number}){
  const finish=applianceFinish(i.colourVariant??"Graphite"),style=i.productStyle??"Professional",professional=style==="Professional";
  return <group>
    <mesh castShadow><boxGeometry args={[w,h,d]}/><meshStandardMaterial color={finish} metalness={.28} roughness={style==="Minimal"?.22:.3}/></mesh>
    <ApplianceGlass position={[-w*.23,-h*.1,d/2+.018]} size={[w*.4,h*.48,.03]}/><ApplianceGlass position={[w*.23,-h*.1,d/2+.018]} size={[w*.4,h*.48,.03]}/>
    {[-.3,-.1,.1,.3].map((x,n)=><mesh key={n} position={[x*w,h/2+.012,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[w*.075,.008,10,28]}/><meshStandardMaterial color="#222" metalness={.35}/></mesh>)}
    <Metal position={[0,h*.25,d/2+.036]} size={[w*(professional?.82:.68),professional?.028:.018,.018]}/>
    {(style==="Classic"||professional)&&[-.3,-.1,.1,.3].map((x,n)=><mesh key={"knob"+n} position={[x*w,h*.36,d/2+.04]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.022,.022,.016,18]}/><meshStandardMaterial color="#777" metalness={.65}/></mesh>)}
  </group>
}
function Backsplash({i,w,h,d}:{i:JoineryItem;w:number;h:number;d:number}){const m=sceneMaterial(i.materialId);return <group><Panel position={[0,0,0]} size={[w,h,Math.max(.012,d)]} colour={m.colour} materialId={i.materialId} part="backsplash" front/><lineSegments position={[0,0,d/2+.004]}><edgesGeometry args={[new THREE.BoxGeometry(w,h,.008)]}/><lineBasicMaterial color="#918a82"/></lineSegments></group>}

function CabinetGeometry({i,construction=false}:{i:JoineryItem;construction?:boolean}){
  const renderItem=construction?{...i,openAmount:Math.max(72,i.openAmount??0)}:i;
  const c=sceneMaterial(renderItem.carcassMaterialId??renderItem.materialId).colour,w=mm(renderItem.width),h=mm(renderItem.height),d=mm(renderItem.depth);
  i=renderItem;
  if(i.type==="Worktop"){const topId=i.worktopMaterialId??i.materialId;return <WorktopSurface w={w} h={h} d={d} materialId={topId}/>;}
  if(i.type==="Wall segment"||i.type==="Chimney breast"||i.type==="Column"||i.type==="Ceiling bulkhead"||i.type==="Filler panel"||i.type==="End panel"||i.type==="Internal divider"||i.type==="Loft box")return <SimpleBlock w={w} h={h} d={d} c={c} materialId={i.materialId}/>;
  if(i.type==="Corner cabinet")return <CornerCabinet i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Hanging rail")return <HangingRail w={w}/>;
  if(i.type==="Internal drawers")return <DrawerUnit i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Shoe rack")return <OpenShelving i={i} w={w} h={h} d={d} c={c}/>;
  if(i.type==="Radiator")return <Radiator w={w} h={h} d={d}/>;
  if(i.type==="Socket"||i.type==="Switch")return <ServicePlate w={w} h={h} d={d}/>;
  if(i.type==="Mirror")return <MirrorPanel w={w} h={h} d={d}/>;
  if(i.type==="Ceiling light")return <CeilingLight w={w} h={h} d={d}/>;
  if(i.type==="Pendant light")return <PendantLight w={w} h={h}/>;
  if(i.type==="Tap"||i.type.endsWith(" tap"))return <TapObject i={i} w={w} h={h} d={d}/>;
  if(i.type==="Backsplash")return <Backsplash i={i} w={w} h={h} d={d}/>;
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
  if(i.type==="Dishwasher")return <Dishwasher i={i} w={w} h={h} d={d}/>;
  if(i.type==="Washing machine")return <WashingMachine i={i} w={w} h={h} d={d}/>;
  if(i.type==="Microwave")return <Microwave i={i} w={w} h={h} d={d}/>;
  if(i.type==="Extractor hood")return <ExtractorHood i={i} w={w} h={h} d={d}/>;
  if(i.type==="Freestanding fridge")return <FreestandingFridge i={i} w={w} h={h} d={d}/>;
  if(i.type==="Single oven")return <SingleOven i={i} w={w} h={h} d={d}/>;
  if(i.type==="Range cooker")return <RangeCooker i={i} w={w} h={h} d={d}/>;
  if(i.type==="Door opening")return <DoorOpening w={w} h={h} d={d} c={c}/>;
  if(i.type==="Window")return <WindowFrame w={w} h={h} d={d}/>;
  if(i.type==="Glass balustrade")return <GlassBalustrade w={w} h={h} d={d}/>;
  if(i.type==="Timber balustrade")return <TimberBalustrade w={w} h={h} d={d} c={c}/>;
  return <OpenShelving i={i} w={w} h={h} d={d} c={c}/>;
}

function ItemNode({i,project,selected,selectedPart,mode,construction,onSelect,onSelectPart,onMove,onRotate,onMoveStart}:{i:JoineryItem;project:Project;selected:boolean;selectedPart?:JoineryPart|null;mode:"translate"|"rotate";construction:boolean;onSelect?:(id:string|null)=>void;onSelectPart?:(id:string,part:JoineryPart)=>void;onMove?:(id:string,x:number,y:number,z:number)=>void;onRotate?:(id:string,rotation:number)=>void;onMoveStart?:()=>void}){
  const group=useRef<THREE.Group>(null);
  const fp=footprint(i),rotation=normalizeRotation(i.rotation??0);
  const position:[number,number,number]=[mm(i.x+fp.width/2-project.roomWidth/2),mm(i.y+i.height/2),mm(i.z+fp.depth/2-project.roomDepth/2)];
  const sync=()=>{const g=group.current;if(!g)return;if(mode==="rotate"){onRotate?.(i.id,normalizeRotation(THREE.MathUtils.radToDeg(g.rotation.y)));return}const current={...i,rotation},box=footprint(current);const raw={...current,x:(g.position.x+mm(project.roomWidth)/2)*1000-box.width/2,y:g.position.y*1000-i.height/2,z:(g.position.z+mm(project.roomDepth)/2)*1000-box.depth/2};const q=clampItemToRoom(raw,project);onMove?.(i.id,q.x,q.y,q.z)};
  const node=<group ref={group} position={position} rotation={[0,THREE.MathUtils.degToRad(rotation),0]} onClick={e=>{e.stopPropagation();onSelect?.(i.id)}}>
    <PartSelectionContext.Provider value={{selected,selectedPart,onSelectPart:part=>onSelectPart?.(i.id,part)}}><CabinetGeometry i={i} construction={construction}/></PartSelectionContext.Provider>
    {selected&&construction&&<><DimensionOverlay i={i}/><ConstructionLabels i={i}/></>}
    {selected&&!selectedPart&&<mesh><boxGeometry args={[mm(i.width)+.035,mm(i.height)+.035,mm(i.depth)+.035]}/><meshBasicMaterial color="#c8102e" wireframe transparent opacity={.4}/></mesh>}
  </group>;
  if(!selected||i.locked)return node;
  return <TransformControls mode={mode} translationSnap={Math.max(1,project.rules.snap)/1000} rotationSnap={Math.PI/2} showX={mode==="translate"} showY={mode==="translate"||mode==="rotate"} showZ={mode==="translate"} onMouseDown={()=>onMoveStart?.()} onObjectChange={sync}>{node}</TransformControls>;
}

function DropProjector({rw,rd,onReady}:{rw:number;rd:number;onReady:(fn:(clientX:number,clientY:number)=>{x:number;y:number;z:number})=>void}){
  const {camera,gl}=useThree();
  useEffect(()=>{
    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),floor=new THREE.Plane(new THREE.Vector3(0,1,0),0),point=new THREE.Vector3();
    const project=(clientX:number,clientY:number)=>{
      const rect=gl.domElement.getBoundingClientRect();
      pointer.set(((clientX-rect.left)/Math.max(1,rect.width))*2-1,-((clientY-rect.top)/Math.max(1,rect.height))*2+1);
      raycaster.setFromCamera(pointer,camera);
      if(!raycaster.ray.intersectPlane(floor,point))return {x:rw*500,y:0,z:rd*500};
      return {x:Math.max(0,Math.min(rw*1000,(point.x+rw/2)*1000)),y:0,z:Math.max(0,Math.min(rd*1000,(point.z+rd/2)*1000))};
    };
    onReady(project);
  },[camera,gl,rw,rd,onReady]);
  return null;
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

export function Scene3D({project,selected,selectedPart,transformMode="translate",onSelect,onSelectPart,onDropType,onMove,onRotate,onMoveStart}:{project:Project;selected?:string|null;selectedPart?:JoineryPart|null;transformMode?:"translate"|"rotate";onSelect?:(id:string|null)=>void;onSelectPart?:(id:string,part:JoineryPart)=>void;onDropType?:(type:string,x:number,y:number,z:number)=>void;onMove?:(id:string,x:number,y:number,z:number)=>void;onRotate?:(id:string,rotation:number)=>void;onMoveStart?:()=>void}){
  activeCustomMaterials=project.customMaterials??[];
  const rw=mm(project.roomWidth),rh=mm(project.roomHeight),rd=mm(project.roomDepth),roomMax=Math.max(rw,rh,rd),floorMaterial=sceneMaterial(project.floorMaterialId??"floor-oak");
  const [preset,setPreset]=useState<CameraPreset>("iso"),[showGrid,setShowGrid]=useState(false),[showWalls,setShowWalls]=useState(true),[renderMode,setRenderMode]=useState<"presentation"|"technical"|"construction">("presentation"),[dropReady,setDropReady]=useState(false);
  const realistic=renderMode!=="technical",construction=renderMode==="construction";
  const dropProjector=useRef<((clientX:number,clientY:number)=>{x:number;y:number;z:number})|null>(null);
  activeConstructionView=construction;
  return <div className={"three "+(construction?"constructionView ":"")+(dropReady?"dropReady":"")} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="copy";setDropReady(true)}} onDragLeave={e=>{if(e.currentTarget===e.target)setDropReady(false)}} onDrop={e=>{e.preventDefault();setDropReady(false);const type=e.dataTransfer.getData("application/x-joinery-component")||e.dataTransfer.getData("text/plain");if(!type)return;const point=dropProjector.current?.(e.clientX,e.clientY)??{x:project.roomWidth/2,y:0,z:project.roomDepth/2};onDropType?.(type,point.x,point.y,point.z)}}><div className="sceneToolbar"><div className="cameraPresets">{(["iso","front","side","top"] as CameraPreset[]).map(v=><button key={v} className={preset===v?"active":""} onClick={()=>setPreset(v)}>{v==="iso"?"Iso":v[0].toUpperCase()+v.slice(1)}</button>)}</div><div className="sceneToggles renderModes"><button className={renderMode==="presentation"?"active":""} onClick={()=>setRenderMode("presentation")}>Presentation</button><button className={renderMode==="technical"?"active":""} onClick={()=>setRenderMode("technical")}>Technical</button><button className={renderMode==="construction"?"active":""} onClick={()=>{setRenderMode("construction");setPreset("iso");setShowGrid(false)}}>Construction</button><span className="sceneToggleDivider"/><button className={showGrid?"active":""} onClick={()=>setShowGrid(v=>!v)}>Grid</button>{!construction&&<button className={showWalls?"active":""} onClick={()=>setShowWalls(v=>!v)}>Walls</button>}</div></div><Canvas onPointerMissed={()=>onSelect?.(null)} camera={{position:[Math.max(3.7,rw*.95),Math.max(2.2,rh*.78),Math.max(4.3,rd*1.35)],fov:38}} dpr={[1,1.5]} performance={{min:.6}} shadows gl={{antialias:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.08}}>
    <CameraRig preset={preset} rw={rw} rh={rh} rd={rd}/>
    <DropProjector rw={rw} rd={rd} onReady={fn=>{dropProjector.current=fn}}/>
    <color attach="background" args={[construction?"#e7ded1":realistic?"#e7e2da":"#f2f1ee"]}/>
    <ambientLight intensity={realistic ? .5 : .72}/>
    <hemisphereLight args={["#fffaf0",realistic?"#8f826f":"#b6afa5",realistic ? .9 : 1.25]}/>
    <directionalLight castShadow position={[3.5,6.5,4.5]} intensity={realistic?2.7:2.15} color={realistic?"#fff6e8":"#ffffff"} shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.00018}/>
    <RoomShell rw={rw} rh={rh} rd={rd} showWalls={showWalls&&!construction} realistic={realistic} floorMaterial={floorMaterial} studioMode={construction}/>
{showGrid&&<Grid position={[0,.002,0]} args={[Math.max(rw,rd)*1.25,Math.max(rw,rd)*1.25]} cellSize={.1} sectionSize={.5} cellColor="#cbc6bf" sectionColor="#aaa49b" fadeDistance={15} fadeStrength={1.5}/>}

    {construction&&<RoomDimensionOverlay rw={rw} rh={rh} rd={rd} project={project}/>}
    {project.items.filter(i=>i.visible!==false).map(i=><ItemNode key={i.id} i={i} project={project} selected={selected===i.id} selectedPart={selected===i.id?selectedPart:null} mode={transformMode} construction={construction} onSelect={onSelect} onSelectPart={onSelectPart} onMove={onMove} onRotate={onRotate} onMoveStart={onMoveStart}/>)}
    <ContactShadows position={[0,.003,0]} opacity={construction?.52:realistic?.42:.32} scale={Math.max(5,roomMax*1.8)} blur={construction?2.4:realistic?3.2:2.6} far={Math.max(5,roomMax*1.8)}/>
    <OrbitControls makeDefault target={[0,Math.min(1.15,rh*.48),0]} enableDamping dampingFactor={.08} enablePan enableZoom minDistance={1} maxDistance={Math.max(8,roomMax*4)}/>
    <GizmoHelper alignment="bottom-right" margin={[70,70]}><GizmoViewport axisColors={["#c8102e","#2f8f5b","#315fa8"]} labelColor="#222"/></GizmoHelper>
  </Canvas></div>;
}
