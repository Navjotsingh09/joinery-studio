import {DesignRules,JoineryItem} from "@/types/model";
import {newItem} from "./defaults";

export type DesignKind="kitchen"|"bedroom"|"stairs";
export type ScenarioPlan={kind:DesignKind;scenario:string;name:string;roomWidth:number;roomHeight:number;roomDepth:number;rules:DesignRules;items:JoineryItem[]};

export const DESIGN_KINDS=[
  {id:"kitchen" as const,title:"Kitchen",description:"Cabinet runs, appliances, worktops, islands and storage",scenarios:[
    {id:"showroom",title:"Sage & oak showroom",description:"Shaker kitchen, oak island, window daylight and pendant lighting"},
    {id:"l-shape",title:"L-shaped kitchen",description:"Fitted kitchen with two connected cabinet runs"},
    {id:"straight",title:"Straight kitchen",description:"Single-wall fitted kitchen"},
    {id:"island",title:"Kitchen + island",description:"Wall run with central island"},
    {id:"galley",title:"Galley kitchen",description:"Two facing cabinet runs"},
    {id:"blank",title:"Start kitchen on your own",description:"An empty measured room. Add and configure each unit yourself."}
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
  if(kind==="showroom"){
    const fitted=kitchen("l-shape",w,h,d).filter(i=>i.name!=="Wall unit 2").map(i=>{
      if(i.type==="Worktop")return {...i,height:20,materialId:"stone-light",worktopMaterialId:"stone-light",finish:"Semi-gloss",worktopEdge:"square" as const};
      if(i.type==="Backsplash")return {...i,y:890,height:130};
      if(i.type.endsWith(" tap"))return {...i,type:"Square neck tap",name:"Square neck mixer",productStyle:"Square neck",y:888,width:100,height:300,depth:276};
      if(["Base cabinet","Drawer unit","Corner cabinet","Sink base","Hob base","Wall cabinet","Oven tower","Fridge housing"].includes(i.type))return {...i,materialId:"palette-17",doorMaterialId:"palette-17",carcassMaterialId:"w1000",leftSideMaterialId:"palette-17",rightSideMaterialId:"palette-17",plinthMaterialId:"palette-17",frontStyle:"shaker" as const,hardware:"Bar handle",...(i.type==="Hob base"?{hobStyle:"gas" as const,hobZones:4 as const}:{})};
      return i;
    });
    const sink=fitted.find(i=>i.type==="Sink base")!;
    fitted.push(item("Window","Sink window",{x:sink.x,y:1120,z:0,width:sink.width,height:980,depth:80,doors:0,shelves:0,hardware:"None",wallSide:"back"}));
    if(w>=4000&&d>=3300){
      const x=1600,z=1850,iw=Math.min(1800,w-x-100);
      fitted.push(item("Kitchen island","Oak island",{x,y:0,z,width:iw,height:920,depth:800,doors:3,shelves:0,materialId:"h1180",doorMaterialId:"h1180",carcassMaterialId:"w1000",leftSideMaterialId:"h1180",rightSideMaterialId:"h1180",plinthMaterialId:"h1180",worktopMaterialId:"stone-light",hardware:"Handleless",plinthRecess:70}));
      fitted.push(item("Kitchen accessory","Ceramic mug",{x:x+iw*.65,y:920,z:z+200,width:150,height:125,depth:120,doors:0,shelves:0,productStyle:"Ceramic mug"}));
      for(const n of [0,1]){
        const cx=x+iw*(n?.7:.25);
        fitted.push(item("Pendant light","Island pendant "+(n+1),{x:cx,y:h-620,z:z+250,width:240,height:600,depth:240,doors:0,shelves:0,hardware:"None"}));
        fitted.push(item("Bar stool","Oak stool "+(n+1),{x:cx-70,y:0,z:z+880,width:420,height:750,depth:420,doors:0,shelves:0,materialId:"h1180",hardware:"None"}));
      }
    }
    return fitted;
  }
  const run=Math.max(3000,Math.min(w,4800));
  const m=Math.floor(Math.min(700,run/5)/50)*50;
  const start=Math.max(0,(w-m*5)/2);
  const baseY=0;
  const backZ=0;
  const wallY=Math.min(Math.max(1450,h-950),1700);
  const wallH=Math.min(720,Math.max(550,h-wallY-80));
  const wall=(x:number,name:string)=>item("Wall cabinet",name,{x,y:wallY,z:0,width:m,height:wallH,depth:350,doors:2,shelves:1,materialId:"u961",carcassMaterialId:"h1180",doorMaterialId:"u961",leftSideMaterialId:"u961",rightSideMaterialId:"u961",plinthMaterialId:"u961"});
  const k=(type:string,name:string,patch:Partial<JoineryItem>)=>item(type,name,{materialId:"u961",carcassMaterialId:"h1180",doorMaterialId:"u961",sideMaterialId:"u961",leftSideMaterialId:"u961",rightSideMaterialId:"u961",plinthMaterialId:"u961",worktopMaterialId:"stone-light",plinthStyle:"recessed",plinthRecess:70,...patch});
  const units=[
    k("Fridge housing","Integrated fridge",{x:start,y:baseY,z:backZ,width:m,height:Math.min(2250,h-100),depth:600,doors:2,shelves:3}),
    k("Oven tower","Oven housing",{x:start+m,y:baseY,z:backZ,width:m,height:Math.min(2250,h-100),depth:600,doors:2,shelves:2}),
    k("Sink base","Sink cabinet",{x:start+m*2,y:baseY,z:backZ,width:m,height:870,depth:600,doors:2,shelves:0}),
    k("Drawer unit","Drawer stack",{x:start+m*3,y:baseY,z:backZ,width:m,height:870,depth:600,doors:4,shelves:0,hardware:"Bar handle"}),
    k("Hob base","Hob cabinet",{x:start+m*4,y:baseY,z:backZ,width:m,height:870,depth:600,doors:3,shelves:0,hardware:"Bar handle"})
  ];
  const wallUnits=[wall(start+m*2,"Wall cabinet"),wall(start+m*3,"Wall cabinet"),wall(start+m*4,"Wall cabinet")];
  const backFinishes=[
    item("Worktop","Main worktop",{x:start+m*2,y:870,z:0,width:m*3,height:38,depth:625,doors:0,shelves:0,materialId:"stone-light",hardware:"None"}),
    item("Backsplash","Main backsplash",{x:start+m*2,y:908,z:0,width:m*3,height:520,depth:20,doors:0,shelves:0,materialId:"stone-light",hardware:"None"}),
    item("Pull-out tap","Sink mixer",{x:start+m*2+m*.5-85,y:905,z:455,width:170,height:420,depth:220,doors:0,shelves:0,materialId:"metal-brushed",hardware:"None",productStyle:"Pull-out",colourVariant:"Brushed steel"})
  ];
  if(kind==="l-shape"){
    const door="u961",carcass="h1180",side="u961";
    const q=(type:string,name:string,patch:Partial<JoineryItem>)=>item(type,name,{materialId:door,carcassMaterialId:carcass,doorMaterialId:door,sideMaterialId:side,leftSideMaterialId:side,rightSideMaterialId:side,plinthMaterialId:door,worktopMaterialId:"stone-light",plinthStyle:"recessed",plinthRecess:70,...patch});
    const lower=(type:string,name:string,patch:Partial<JoineryItem>)=>q(type,name,{doorMaterialId:carcass,sideMaterialId:carcass,leftSideMaterialId:carcass,rightSideMaterialId:carcass,...patch});
    const hasOven=w>=3200,hasPantry=w>=4000,cornerW=600,drawerW=hasOven?650:600,sinkW=700,dishW=600,ovenW=hasOven?600:0,pantryW=hasPantry?600:0;
    // Keep the corner against the left wall so both cabinet runs meet.
    const startX=0;
    const xDrawer=startX+cornerW,xSink=xDrawer+drawerW,xDish=xSink+sinkW,xOven=xDish+dishW,xPantry=xOven+ovenW;
    const back:JoineryItem[]=[
      lower("Corner cabinet","Corner cabinet",{x:startX,y:0,z:0,width:cornerW,height:870,depth:600,doors:1,shelves:1}),
      lower("Drawer unit","Wide drawers",{x:xDrawer,y:0,z:0,width:drawerW,height:870,depth:600,doors:3,shelves:0,hardware:"Bar handle"}),
      lower("Sink base","Sink base",{x:xSink,y:0,z:0,width:sinkW,height:870,depth:600,doors:2,shelves:0}),
      q("Dishwasher","Dishwasher",{x:xDish,y:0,z:0,width:dishW,height:870,depth:600,doors:0,shelves:0,colourVariant:"Stainless steel"})
    ];
    if(hasOven)back.push(q("Oven tower","Integrated oven tower",{x:xOven,y:0,z:0,width:ovenW,height:Math.min(2250,h-80),depth:600,doors:2,shelves:4}));
    if(hasPantry)back.push(q("Fridge housing","Integrated fridge housing",{x:xPantry,y:0,z:0,width:pantryW,height:Math.min(2250,h-80),depth:650,doors:2,shelves:2}));
    const sideRun:JoineryItem[]=[
      lower("Base cabinet","Return base",{x:0,y:0,z:600,width:600,height:870,depth:600,doors:1,shelves:1,rotation:90,wallSide:"left"}),
      lower("Hob base","Hob drawers",{x:0,y:0,z:1200,width:Math.min(800,Math.max(600,d-1400)),height:870,depth:600,doors:3,shelves:0,rotation:90,wallSide:"left",hardware:"Bar handle"})
    ];
    let sideEnd=1200+sideRun[1].width;
    if(d-sideEnd>=500){
      const storageW=Math.min(600,d-sideEnd);
      sideRun.push(lower("Base cabinet","Return storage",{x:0,y:0,z:sideEnd,width:storageW,height:870,depth:600,doors:2,shelves:1,rotation:90,wallSide:"left"}));
      sideEnd+=storageW;
    }
    const wallBack:JoineryItem[]=[
      q("Wall cabinet","Wall unit 1",{x:xDrawer,y:1480,z:0,width:drawerW,height:720,depth:350,doors:2,shelves:2}),
      q("Wall cabinet","Wall unit 2",{x:xSink,y:1480,z:0,width:sinkW,height:720,depth:350,doors:2,shelves:2}),
      q("Wall cabinet","Wall unit 3",{x:xDish,y:1480,z:0,width:dishW,height:720,depth:350,doors:1,shelves:2})
    ];
    const wallSide:JoineryItem[]=[
      q("Wall cabinet","Return wall 1",{x:0,y:1480,z:600,width:600,height:720,depth:350,doors:1,shelves:2,rotation:90,wallSide:"left"}),
      q("Extractor hood","Extractor hood",{x:0,y:1550,z:sideRun[1].z,width:sideRun[1].width,height:520,depth:420,doors:0,shelves:0,rotation:90,wallSide:"left",colourVariant:"Stainless steel"})
    ];
    const backWorktopWidth=xDish+dishW-startX;
    const sideWorktopSpan=Math.max(600,sideEnd-600);
    const finishes=[
      item("Worktop","Back worktop",{x:startX,y:870,z:0,width:backWorktopWidth,height:38,depth:600,doors:0,shelves:0,materialId:"stone-light",worktopMaterialId:"stone-light",hardware:"None",wallSide:"back"}),
      item("Worktop","Return worktop",{x:0,y:870,z:600,width:sideWorktopSpan,height:38,depth:630,doors:0,shelves:0,materialId:"stone-light",worktopMaterialId:"stone-light",hardware:"None",rotation:90,wallSide:"left"}),
      item("Backsplash","Back backsplash",{x:startX,y:908,z:0,width:backWorktopWidth,height:560,depth:20,doors:0,shelves:0,materialId:"stone-light",hardware:"None",wallSide:"back"}),
      item("Backsplash","Return backsplash",{x:0,y:908,z:600,width:sideWorktopSpan,height:560,depth:20,doors:0,shelves:0,materialId:"stone-light",hardware:"None",rotation:90,wallSide:"left"}),
      item("Pull-out tap","Pull-out mixer",{x:xSink+sinkW*.5-85,y:905,z:470,width:170,height:420,depth:220,doors:0,shelves:0,materialId:"metal-brushed",hardware:"None",productStyle:"Pull-out",colourVariant:"Brushed steel"})
    ];
    return [...back,...sideRun,...wallBack,...wallSide,...finishes];
  }
  if(kind==="island"){
    const iw=Math.min(1800,Math.max(1200,w*.42)),iz=Math.max(900,Math.min(d*.48,d-1450));
    return [...units,...wallUnits,...backFinishes,k("Kitchen island","Kitchen island",{x:(w-iw)/2,y:0,z:iz,width:iw,height:920,depth:900,doors:4,shelves:0,hardware:"Handleless",worktopMaterialId:"stone-dark"})];
  }
  if(kind==="galley"){
    const gz=Math.max(1500,d-620);
    const opposite=[
      k("Base cabinet","Opposite base 1",{x:start+m,y:0,z:gz,width:m,height:870,depth:600,doors:2,shelves:1,rotation:180,wallSide:"front"}),
      k("Drawer unit","Opposite drawers",{x:start+m*2,y:0,z:gz,width:m,height:870,depth:600,doors:4,shelves:0,hardware:"Bar handle",rotation:180,wallSide:"front"}),
      k("Base cabinet","Opposite base 2",{x:start+m*3,y:0,z:gz,width:m,height:870,depth:600,doors:2,shelves:1,rotation:180,wallSide:"front"}),
      item("Worktop","Opposite worktop",{x:start+m,y:870,z:gz-25,width:m*3,height:38,depth:625,doors:0,shelves:0,materialId:"stone-dark",hardware:"None",rotation:180,wallSide:"front"}),
      item("Backsplash","Opposite backsplash",{x:start+m,y:908,z:d-20,width:m*3,height:520,depth:20,doors:0,shelves:0,materialId:"stone-dark",hardware:"None",rotation:180,wallSide:"front"})
    ];
    return [...units,...wallUnits,...backFinishes,...opposite];
  }
  return [...units,...wallUnits,...backFinishes];
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
      item("Bed","King bed",{x:start+side,y:0,z:160,width:bedW,height:560,depth:2100,doors:0,shelves:0,materialId:"u705",hardware:"None"}),
      item("Bedside cabinet","Left bedside",{x:start,y:0,z:80,width:side,height:520,depth:420,doors:2,shelves:0,materialId:"h1180",hardware:"Handleless"}),
      item("Bedside cabinet","Right bedside",{x:start+side+bedW,y:0,z:80,width:side,height:520,depth:420,doors:2,shelves:0,materialId:"h1180",hardware:"Handleless"}),
      item("Wall cabinet","Over-bed cabinet left",{x:start+side,y:Math.min(1750,h-650),z:0,width:bedW/2,height:550,depth:350,doors:2,shelves:1,materialId:"w1000",hardware:"Handleless"}),
      item("Wall cabinet","Over-bed cabinet right",{x:start+side+bedW/2,y:Math.min(1750,h-650),z:0,width:bedW/2,height:550,depth:350,doors:2,shelves:1,materialId:"w1000",hardware:"Handleless"})
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
  if(kind==="l-shape")return [item("L staircase","L-shaped staircase",{x:Math.max(50,(w-Math.min(w-100,stairW*2.15))/2),y:0,z:50,width:Math.min(w-100,stairW*2.15),height:h,depth:stairD,doors:0,shelves:0,materialId:"h1180",hardware:"None"})];
  if(kind==="u-shape")return [item("U staircase","U-shaped staircase",{x:Math.max(50,(w-stairW*2.2)/2),y:0,z:50,width:Math.min(w-100,stairW*2.2),height:h,depth:Math.min(d-100,stairD),doors:0,shelves:0,materialId:"h1180",hardware:"None"})];
  const stair=item("Straight staircase","Straight staircase",{x:sx,y:0,z:50,width:stairW,height:h,depth:stairD,doors:0,shelves:0,materialId:"h1180",hardware:"None"});
  if(kind==="storage"){
    const sw=Math.min(stairW-80,900);
    return [stair,item("Under-stair storage","Under-stair storage",{x:sx+(stairW-sw)/2,y:0,z:120,width:sw,height:Math.min(1500,h*.62),depth:Math.min(600,stairD*.24),doors:3,shelves:2,materialId:"w1000",hardware:"Push-to-open"})];
  }
  return [stair];
}

export function createScenarioPlan(kind:DesignKind,scenario:string,roomWidth:number,roomHeight:number,roomDepth:number):ScenarioPlan{
  const w=Math.max(2600,roomWidth),h=Math.max(2200,roomHeight),d=Math.max(2200,roomDepth);
  const items=scenario==="blank"?[]:kind==="kitchen"?kitchen(scenario,w,h,d):kind==="bedroom"?bedroom(scenario,w,h,d):stairs(scenario,w,h,d);
  const label=DESIGN_KINDS.find(x=>x.id===kind)?.scenarios.find(x=>x.id===scenario)?.title??scenario;
  return {kind,scenario,name:label,roomWidth:w,roomHeight:h,roomDepth:d,rules:{wallClearance:0,componentGap:0,snap:50,serviceClearance:50},items};
}

export function inferDesignKind(items:JoineryItem[]):DesignKind{
  if(items.some(i=>i.type.toLowerCase().includes("stair")||i.type==="Under-stair storage"))return "stairs";
  if(items.some(i=>["Sink base","Hob base","Oven tower","Fridge housing","Kitchen island","Corner cabinet","Worktop"].includes(i.type)))return "kitchen";
  if(items.some(i=>["Sliding wardrobe","Bed wall","Bedside cabinet"].includes(i.type)))return "bedroom";
  if(items.some(i=>["Base cabinet","Wall cabinet"].includes(i.type)))return "kitchen";
  return "bedroom";
}

export const COMPONENT_GROUPS_BY_KIND:Record<DesignKind,{title:string;items:string[]}[]>={
  kitchen:[
    {title:"Cabinetry",items:["Base cabinet","Drawer unit","Wall cabinet","Tall cabinet","Corner cabinet","Filler panel","End panel","Cornice","Wine rack","Worktop","Kitchen island","Shelving"]},
    {title:"Appliances",items:["Sink base","Hob base","Oven tower","Fridge housing","Dishwasher","Washing machine","Microwave","Extractor hood","Freestanding fridge","Single oven","Range cooker"]},
    {title:"Sinks, taps & wall finishes",items:["Tap","Arc mixer tap","Pull-out tap","Bridge tap","Square neck tap","Cross-handle tap","Backsplash"]},
    {title:"Room architecture",items:["Wall segment","Door opening","Window","Chimney breast","Column","Ceiling bulkhead"]},
    {title:"Services & context",items:["Bar stool","Kitchen accessory","Radiator","Socket","Switch","Ceiling light","Pendant light"]}
  ],
  bedroom:[
    {title:"Fitted furniture",items:["Wardrobe","Sliding wardrobe","Drawer unit","Wall cabinet","Shelving","Media unit"]},
    {title:"Wardrobe internals",items:["Hanging rail","Internal drawers","Shoe rack","Internal divider","Loft box"]},
    {title:"Furniture",items:["Bed","Dressing table","Bedside cabinet","Bed wall","Mirror"]},
    {title:"Room architecture",items:["Wall segment","Door opening","Window","Chimney breast","Column","Ceiling bulkhead"]},
    {title:"Services",items:["Radiator","Socket","Switch","Ceiling light","Pendant light"]}
  ],
  stairs:[
    {title:"Stair systems",items:["Straight staircase","L staircase","U staircase","Under-stair storage"]},
    {title:"Balustrades",items:["Glass balustrade","Timber balustrade"]},
    {title:"Room architecture",items:["Wall segment","Door opening","Window","Chimney breast","Column","Ceiling bulkhead"]},
    {title:"Services & context",items:["Radiator","Socket","Switch","Ceiling light","Pendant light","Mirror","Shelving"]}
  ]
};
export const COMPONENTS_BY_KIND:Record<DesignKind,string[]>={
  kitchen:COMPONENT_GROUPS_BY_KIND.kitchen.flatMap(g=>g.items),
  bedroom:COMPONENT_GROUPS_BY_KIND.bedroom.flatMap(g=>g.items),
  stairs:COMPONENT_GROUPS_BY_KIND.stairs.flatMap(g=>g.items)
};
