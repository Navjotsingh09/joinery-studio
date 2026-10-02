import {Project,JoineryItem} from "@/types/model";
const now=()=>new Date().toISOString();
type Preset=Pick<JoineryItem,"width"|"height"|"depth"|"shelves"|"doors"|"y">;
const PRESETS:Record<string,Preset>={
"Wardrobe":{width:1000,height:2200,depth:600,shelves:4,doors:2,y:0},
"Base cabinet":{width:600,height:720,depth:560,shelves:1,doors:2,y:0},
"Wall cabinet":{width:600,height:720,depth:350,shelves:1,doors:2,y:1400},
"Tall cabinet":{width:600,height:2200,depth:600,shelves:4,doors:1,y:0},
"Shelving":{width:900,height:2000,depth:350,shelves:6,doors:0,y:0},
"Media unit":{width:1800,height:550,depth:450,shelves:1,doors:3,y:0}};
export function newItem(type="Wardrobe"):JoineryItem{const p=PRESETS[type]??PRESETS.Wardrobe;return{id:crypto.randomUUID(),name:type,type,x:100,y:p.y,z:0,width:p.width,height:p.height,depth:p.depth,shelves:p.shelves,doors:p.doors,materialId:"h1180",finish:"ST9 Matt",notes:"",locked:false,hardware:type==="Shelving"?"None":"Handleless",edgeBanding:"Matching 1mm"}}
export function newProject(name="New project"):Project{return{id:crypto.randomUUID(),name,customer:"",reference:"JS-"+String(Date.now()).slice(-5),status:"Draft",revision:1,roomWidth:3600,roomHeight:2400,roomDepth:3000,rules:{wallClearance:20,componentGap:2,snap:50},items:[],revisions:[],createdAt:now(),updatedAt:now()}}