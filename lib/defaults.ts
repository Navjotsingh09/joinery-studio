import {Project,JoineryItem} from "@/types/model";
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
"Straight staircase":{width:950,height:2400,depth:3200,shelves:0,doors:0,y:0},
"L staircase":{width:2000,height:2400,depth:3000,shelves:0,doors:0,y:0},
"U staircase":{width:2100,height:2400,depth:2400,shelves:0,doors:0,y:0},
"Under-stair storage":{width:900,height:1500,depth:600,shelves:2,doors:3,y:0}};
export function newItem(type="Wardrobe"):JoineryItem{const p=PRESETS[type]??PRESETS.Wardrobe;return{id:crypto.randomUUID(),name:type,type,x:100,y:p.y,z:0,width:p.width,height:p.height,depth:p.depth,shelves:p.shelves,doors:p.doors,materialId:"h1180",finish:"ST9 Matt",notes:"",locked:false,hardware:["Shelving","Straight staircase","L staircase","U staircase","Bed wall","Bed"].includes(type)?"None":type==="Drawer unit"||type==="Dressing table"?"Bar handle":type==="Under-stair storage"?"Push-to-open":"Handleless",edgeBanding:"Matching 1mm"}}
export function newProject(name="New project"):Project{return{id:crypto.randomUUID(),name,customer:"",reference:"JS-"+String(Date.now()).slice(-5),status:"Draft",revision:1,roomWidth:3600,roomHeight:2400,roomDepth:3000,rules:{wallClearance:20,componentGap:2,snap:50},items:[],revisions:[],createdAt:now(),updatedAt:now()}}