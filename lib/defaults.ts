import {newId} from "@/lib/id";
import {Project,JoineryItem,ItemLayer} from "@/types/model";
const now=()=>new Date().toISOString();
type Preset=Pick<JoineryItem,"width"|"height"|"depth"|"shelves"|"doors"|"y">;
const PRESETS:Record<string,Preset>={
"Wardrobe":{width:1000,height:2250,depth:600,shelves:3,doors:2,y:0},
"Base cabinet":{width:600,height:870,depth:560,shelves:1,doors:2,y:0},
"Wall cabinet":{width:600,height:720,depth:350,shelves:1,doors:2,y:1450},
"Tall cabinet":{width:600,height:2250,depth:600,shelves:4,doors:1,y:0},
"Drawer unit":{width:600,height:870,depth:560,shelves:0,doors:4,y:0},
"Shelving":{width:900,height:2100,depth:350,shelves:6,doors:0,y:0},
"Media unit":{width:1800,height:480,depth:420,shelves:0,doors:3,y:0},
"Sliding wardrobe":{width:2400,height:2300,depth:650,shelves:5,doors:3,y:0},
"Dressing table":{width:1200,height:760,depth:500,shelves:0,doors:3,y:0},
"Bedside cabinet":{width:450,height:520,depth:420,shelves:0,doors:2,y:0},
"Bed wall":{width:1800,height:1200,depth:120,shelves:0,doors:0,y:0},
"Bed":{width:1800,height:560,depth:2100,shelves:0,doors:0,y:0},
"Sink base":{width:800,height:870,depth:600,shelves:0,doors:2,y:0},
"Hob base":{width:800,height:870,depth:600,shelves:0,doors:3,y:0},
"Oven tower":{width:600,height:2250,depth:600,shelves:2,doors:2,y:0},
"Fridge housing":{width:600,height:2250,depth:650,shelves:3,doors:2,y:0},
"Kitchen island":{width:1800,height:920,depth:900,shelves:0,doors:4,y:0},
"Corner cabinet":{width:900,height:870,depth:900,shelves:1,doors:2,y:0},
"Filler panel":{width:100,height:870,depth:600,shelves:0,doors:0,y:0},
"End panel":{width:18,height:870,depth:600,shelves:0,doors:0,y:0},
"Worktop":{width:1800,height:38,depth:650,shelves:0,doors:0,y:870},
"Straight staircase":{width:950,height:2400,depth:3200,shelves:0,doors:0,y:0},
"L staircase":{width:2000,height:2400,depth:3000,shelves:0,doors:0,y:0},
"U staircase":{width:2100,height:2400,depth:2400,shelves:0,doors:0,y:0},
"Under-stair storage":{width:900,height:1500,depth:600,shelves:2,doors:3,y:0},
"Dishwasher":{width:600,height:820,depth:570,shelves:0,doors:0,y:0},
"Washing machine":{width:600,height:850,depth:600,shelves:0,doors:0,y:0},
"Microwave":{width:600,height:400,depth:430,shelves:0,doors:0,y:1450},
"Extractor hood":{width:800,height:700,depth:450,shelves:0,doors:0,y:1450},
"Door opening":{width:900,height:2100,depth:100,shelves:0,doors:0,y:0},
"Window":{width:1200,height:1000,depth:100,shelves:0,doors:0,y:900},
"Wall segment":{width:1800,height:2400,depth:100,shelves:0,doors:0,y:0},
"Chimney breast":{width:1200,height:2400,depth:400,shelves:0,doors:0,y:0},
"Column":{width:300,height:2400,depth:300,shelves:0,doors:0,y:0},
"Ceiling bulkhead":{width:1600,height:300,depth:500,shelves:0,doors:0,y:2100},
"Radiator":{width:1000,height:600,depth:120,shelves:0,doors:0,y:150},
"Socket":{width:86,height:86,depth:20,shelves:0,doors:0,y:450},
"Switch":{width:86,height:86,depth:20,shelves:0,doors:0,y:1200},
"Mirror":{width:900,height:1200,depth:30,shelves:0,doors:0,y:900},
"Ceiling light":{width:160,height:80,depth:160,shelves:0,doors:0,y:2250},
"Pendant light":{width:300,height:600,depth:300,shelves:0,doors:0,y:1700},
"Tap":{width:140,height:300,depth:180,shelves:0,doors:0,y:870},
"Arc mixer tap":{width:160,height:360,depth:220,shelves:0,doors:0,y:870},
"Pull-out tap":{width:170,height:420,depth:240,shelves:0,doors:0,y:870},
"Bridge tap":{width:260,height:330,depth:220,shelves:0,doors:0,y:870},
"Square neck tap":{width:180,height:360,depth:230,shelves:0,doors:0,y:870},
"Backsplash":{width:1800,height:600,depth:20,shelves:0,doors:0,y:900},
"Freestanding fridge":{width:700,height:1900,depth:700,shelves:0,doors:2,y:0},
"Single oven":{width:600,height:600,depth:570,shelves:0,doors:1,y:700},
"Range cooker":{width:900,height:900,depth:650,shelves:0,doors:2,y:0},
"Hanging rail":{width:900,height:30,depth:30,shelves:0,doors:0,y:1450},
"Internal drawers":{width:800,height:550,depth:500,shelves:0,doors:3,y:100},
"Shoe rack":{width:800,height:450,depth:500,shelves:4,doors:0,y:100},
"Internal divider":{width:18,height:2100,depth:550,shelves:0,doors:0,y:0},
"Loft box":{width:1000,height:420,depth:550,shelves:1,doors:1,y:1800},
"Glass balustrade":{width:1800,height:1000,depth:70,shelves:0,doors:0,y:0},
"Timber balustrade":{width:1800,height:1000,depth:90,shelves:0,doors:0,y:0}};

const noHardware=new Set(["Shelving","Straight staircase","L staircase","U staircase","Bed wall","Bed","Dishwasher","Washing machine","Microwave","Extractor hood","Door opening","Window","Wall segment","Glass balustrade","Timber balustrade","Worktop","Filler panel","End panel","Chimney breast","Column","Ceiling bulkhead","Radiator","Socket","Switch","Mirror","Ceiling light","Pendant light","Tap","Arc mixer tap","Pull-out tap","Bridge tap","Square neck tap","Backsplash","Freestanding fridge","Single oven","Range cooker","Hanging rail","Shoe rack","Internal divider"]);
const architecture=new Set(["Door opening","Window","Wall segment","Chimney breast","Column","Ceiling bulkhead"]);
const services=new Set(["Dishwasher","Washing machine","Microwave","Extractor hood","Freestanding fridge","Single oven","Range cooker","Radiator","Socket","Switch","Ceiling light","Pendant light","Tap","Arc mixer tap","Pull-out tap","Bridge tap","Square neck tap","Backsplash"]);
const decor=new Set(["Bed","Mirror"]);
const layerFor=(type:string):ItemLayer=>architecture.has(type)?"Architecture":services.has(type)?"Services":decor.has(type)?"Decor":"Joinery";
const kitchenCabinet=new Set(["Base cabinet","Drawer unit","Wall cabinet","Tall cabinet","Sink base","Hob base","Oven tower","Fridge housing","Kitchen island","Corner cabinet"]);

export function newItem(type="Wardrobe"):JoineryItem{
  const p=PRESETS[type]??PRESETS.Wardrobe;
  const appliance=["Dishwasher","Washing machine","Microwave","Extractor hood","Freestanding fridge","Single oven","Range cooker"].includes(type);
  const tap=type==="Tap"||type.endsWith(" tap");
  const kitchen=kitchenCabinet.has(type);
  return{id:newId(),name:type,type,x:100,y:p.y,z:0,width:p.width,height:p.height,depth:p.depth,shelves:p.shelves,doors:p.doors,materialId:type==="Worktop"||type==="Backsplash"?"stone-light":kitchen?"u961":"h1180",finish:"ST9 Matt",notes:"",locked:false,hardware:noHardware.has(type)?"None":type==="Drawer unit"||type==="Dressing table"||type==="Internal drawers"?"Bar handle":type==="Under-stair storage"?"Push-to-open":"Handleless",edgeBanding:type==="Worktop"||type==="Backsplash"?"None / raw":"Matching 1mm",rotation:0,visible:true,layer:layerFor(type),carcassMaterialId:kitchen?"h1180":undefined,doorMaterialId:kitchen?"u961":undefined,sideMaterialId:kitchen?"u961":undefined,leftSideMaterialId:kitchen?"u961":undefined,rightSideMaterialId:kitchen?"u961":undefined,plinthMaterialId:kitchen?"u961":undefined,worktopMaterialId:type==="Kitchen island"?"stone-light":undefined,plinthStyle:kitchen?"recessed":undefined,plinthRecess:kitchen?70:undefined,productStyle:type==="Sink base"?"Inset stainless":appliance?"Contemporary":tap?(type==="Bridge tap"?"Bridge":type==="Pull-out tap"?"Pull-out":type==="Square neck tap"?"Square neck":"Arc mixer"):undefined,colourVariant:type==="Sink base"?"Stainless steel":appliance?"Stainless steel":tap?"Chrome":undefined,openAmount:0}
}
export function newProject(name="New project"):Project{
  return{id:newId(),name,customer:"",reference:"JS-"+String(Date.now()).slice(-5),status:"Draft",revision:1,roomWidth:3600,roomHeight:2400,roomDepth:3000,rules:{wallClearance:20,componentGap:2,snap:50,serviceClearance:50},items:[],revisions:[],createdAt:now(),updatedAt:now(),address:"",notes:"",archived:false}
}
