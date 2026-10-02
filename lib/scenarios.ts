import {DesignRules,JoineryItem} from "@/types/model";
import {newItem} from "./defaults";

export type DesignKind="kitchen"|"bedroom"|"stairs";
export type ScenarioPlan={kind:DesignKind;scenario:string;name:string;roomWidth:number;roomHeight:number;roomDepth:number;rules:DesignRules;items:JoineryItem[]};

export const DESIGN_KINDS=[
  {id:"kitchen" as const,title:"Kitchen",description:"Cabinet runs, appliances, worktops, islands and storage",scenarios:[
    {id:"straight",title:"Straight kitchen",description:"Single-wall fitted kitchen"},
    {id:"island",title:"Kitchen + island",description:"Wall run with central island"},
    {id:"galley",title:"Galley kitchen",description:"Two facing cabinet runs"}
  ]},
  {id:"bedroom" as const,title:"Bedroom",description:"Wardrobes, bed walls, dressing areas and storage",scenarios:[
    {id:"hinged",title:"Hinged wardrobe wall",description:"Full-height fitted wardrobes"},
    {id:"sliding",title:"Sliding wardrobe",description:"Wide sliding-door wardrobe system"},
    {id:"bed-wall",title:"Bed wall",description:"Headboard wall, bedsides and overhead storage"}
  ]},
  {id:"stairs" as const,title:"Stairs",description:"Staircases, landings, balustrades and under-stair storage",scenarios:[
    {id:"straight",title:"Straight staircase",description:"Single straight flight"},
    {id:"l-shape",title:"L-shaped staircase",description:"Two flights with quarter landing"},
    {id:"u-shape",title:"U-shaped staircase",description:"Return flight with half landing"},
    {id:"storage",title:"Stairs + storage",description:"Straight flight with fitted under-stair storage"}
  ]}
];

const item=(type:string,name:string,patch:Partial<JoineryItem>)=>({...newItem(type),name,...patch});

function kitchen(kind:string,w:number,h:number,d:number):JoineryItem[]{
  const run=Math.max(3000,Math.min(w,4800));
  const m=Math.floor(Math.min(700,run/5)/50)*50;
  const start=Math.max(0,(w-m*5)/2);
  const baseY=0;
  const backZ=0;
  const wallY=Math.min(Math.max(1450,h-950),1700);
  const wallH=Math.min(720,Math.max(550,h-wallY-80));
  const wall=(x:number,name:string)=>item("Wall cabinet",name,{x,y:wallY,z:0,width:m,height:wallH,depth:350,doors:2,shelves:1,materialId:"w1000"});
  const units=[
    item("Fridge housing","Integrated fridge",{x:start,y:baseY,z:backZ,width:m,height:Math.min(2250,h-100),depth:600,doors:2,shelves:3,materialId:"u705"}),
    item("Oven tower","Oven housing",{x:start+m,y:baseY,z:backZ,width:m,height:Math.min(2250,h-100),depth:600,doors:2,shelves:2,materialId:"u705"}),
    item("Sink base","Sink cabinet",{x:start+m*2,y:baseY,z:backZ,width:m,height:870,depth:600,doors:2,shelves:0,materialId:"u705"}),
    item("Drawer unit","Drawer stack",{x:start+m*3,y:baseY,z:backZ,width:m,height:870,depth:600,doors:4,shelves:0,materialId:"u705",hardware:"Bar handle"}),
    item("Hob base","Hob cabinet",{x:start+m*4,y:baseY,z:backZ,width:m,height:870,depth:600,doors:3,shelves:0,materialId:"u705"})
  ];
  const wallUnits=[wall(start+m*2,"Wall cabinet"),wall(start+m*3,"Wall cabinet"),wall(start+m*4,"Wall cabinet")];
  if(kind==="island"){
    const iw=Math.min(1800,Math.max(1200,w*.42)),iz=Math.max(900,Math.min(d*.48,d-1450));
    return [...units,...wallUnits,item("Kitchen island","Kitchen island",{x:(w-iw)/2,y:0,z:iz,width:iw,height:920,depth:900,doors:4,shelves:0,materialId:"h1385",hardware:"Handleless"})];
  }
  if(kind==="galley"){
    const gz=Math.max(1500,d-620);
    return [...units,...wallUnits,
      item("Base cabinet","Opposite base 1",{x:start+m,y:0,z:gz,width:m,height:870,depth:600,doors:2,shelves:1,materialId:"h1385"}),
      item("Drawer unit","Opposite drawers",{x:start+m*2,y:0,z:gz,width:m,height:870,depth:600,doors:4,shelves:0,materialId:"h1385",hardware:"Bar handle"}),
      item("Base cabinet","Opposite base 2",{x:start+m*3,y:0,z:gz,width:m,height:870,depth:600,doors:2,shelves:1,materialId:"h1385"})
    ];
  }
  return [...units,...wallUnits];
}

function bedroom(kind:string,w:number,h:number,d:number):JoineryItem[]{
  if(kind==="sliding"){
    const ww=Math.min(w-200,3000);
    return [item("Sliding wardrobe","Sliding wardrobe",{x:(w-ww)/2,y:0,z:0,width:ww,height:Math.min(2350,h-50),depth:650,doors:3,shelves:5,materialId:"h1180",hardware:"Handleless"})];
  }
  if(kind==="bed-wall"){
    const bedW=Math.min(1800,w*.46),side=450,total=bedW+side*2,start=Math.max(0,(w-total)/2);
    return [
      item("Bed wall","Upholstered bed wall",{x:start+side,y:0,z:0,width:bedW,height:1200,depth:120,doors:0,shelves:0,materialId:"u705",hardware:"None"}),
      item("Bedside cabinet","Left bedside",{x:start,y:0,z:80,width:side,height:520,depth:420,doors:2,shelves:0,materialId:"h1180",hardware:"Handleless"}),
      item("Bedside cabinet","Right bedside",{x:start+side+bedW,y:0,z:80,width:side,height:520,depth:420,doors:2,shelves:0,materialId:"h1180",hardware:"Handleless"}),
      item("Wall cabinet","Over-bed cabinet",{x:start+side,y:Math.min(1750,h-650),z:0,width:bedW,height:550,depth:350,doors:3,shelves:1,materialId:"w1000",hardware:"Handleless"})
    ];
  }
  const ww=Math.min(w-160,3600),module=Math.max(600,Math.floor((ww/3)/50)*50),total=module*3,start=Math.max(0,(w-total)/2);
  return [
    item("Wardrobe","Double wardrobe",{x:start,y:0,z:0,width:module,height:Math.min(2350,h-50),depth:620,doors:2,shelves:4,materialId:"h1385"}),
    item("Drawer unit","Wardrobe drawers",{x:start+module,y:0,z:0,width:module,height:Math.min(2350,h-50),depth:620,doors:5,shelves:2,materialId:"h1385",hardware:"Bar handle"}),
    item("Wardrobe","Double wardrobe",{x:start+module*2,y:0,z:0,width:module,height:Math.min(2350,h-50),depth:620,doors:2,shelves:4,materialId:"h1385"})
  ];
}

function stairs(kind:string,w:number,h:number,d:number):JoineryItem[]{
  const stairW=Math.min(1000,Math.max(850,w*.28));
  const stairD=Math.min(d-100,Math.max(2600,d*.78));
  const sx=Math.max(50,(w-stairW)/2);
  if(kind==="l-shape")return [item("L staircase","L-shaped staircase",{x:sx,y:0,z:50,width:Math.min(w-100,stairW*2.15),height:h,depth:stairD,doors:0,shelves:0,materialId:"h1180",hardware:"None"})];
  if(kind==="u-shape")return [item("U staircase","U-shaped staircase",{x:Math.max(50,(w-stairW*2.2)/2),y:0,z:50,width:Math.min(w-100,stairW*2.2),height:h,depth:Math.min(d-100,stairD*.7),doors:0,shelves:0,materialId:"h1180",hardware:"None"})];
  const stair=item("Straight staircase","Straight staircase",{x:sx,y:0,z:50,width:stairW,height:h,depth:stairD,doors:0,shelves:0,materialId:"h1180",hardware:"None"});
  if(kind==="storage"){
    const sw=Math.min(stairW-80,900);
    return [stair,item("Under-stair storage","Under-stair storage",{x:sx+(stairW-sw)/2,y:0,z:120,width:sw,height:Math.min(1500,h*.62),depth:Math.min(600,stairD*.24),doors:3,shelves:2,materialId:"w1000",hardware:"Push-to-open"})];
  }
  return [stair];
}

export function createScenarioPlan(kind:DesignKind,scenario:string,roomWidth:number,roomHeight:number,roomDepth:number):ScenarioPlan{
  const w=Math.max(2600,roomWidth),h=Math.max(2200,roomHeight),d=Math.max(2200,roomDepth);
  const items=kind==="kitchen"?kitchen(scenario,w,h,d):kind==="bedroom"?bedroom(scenario,w,h,d):stairs(scenario,w,h,d);
  const label=DESIGN_KINDS.find(x=>x.id===kind)?.scenarios.find(x=>x.id===scenario)?.title??scenario;
  return {kind,scenario,name:label,roomWidth:w,roomHeight:h,roomDepth:d,rules:{wallClearance:0,componentGap:0,snap:50},items};
}

export function inferDesignKind(items:JoineryItem[]):DesignKind{
  if(items.some(i=>i.type.toLowerCase().includes("stair")||i.type==="Under-stair storage"))return "stairs";
  if(items.some(i=>["Sink base","Hob base","Oven tower","Fridge housing","Kitchen island"].includes(i.type)))return "kitchen";
  if(items.some(i=>["Sliding wardrobe","Bed wall","Bedside cabinet"].includes(i.type)))return "bedroom";
  if(items.some(i=>["Base cabinet","Wall cabinet"].includes(i.type)))return "kitchen";
  return "bedroom";
}

export const COMPONENTS_BY_KIND:Record<DesignKind,string[]>={
  kitchen:["Base cabinet","Drawer unit","Wall cabinet","Tall cabinet","Sink base","Hob base","Oven tower","Fridge housing","Kitchen island","Shelving"],
  bedroom:["Wardrobe","Sliding wardrobe","Drawer unit","Dressing table","Bedside cabinet","Bed wall","Wall cabinet","Shelving","Media unit"],
  stairs:["Straight staircase","L staircase","U staircase","Under-stair storage","Shelving"]
};
