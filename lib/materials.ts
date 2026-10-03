import {Material} from "@/types/model";
export const MATERIALS:Material[]=[
{id:"u961",code:"U961",name:"Graphite Grey",colour:"#4a4b4d",thickness:18,category:"Decorative board"},
{id:"u705",code:"U705",name:"Angora Grey",colour:"#b9b1a6",thickness:18,category:"Decorative board"},
{id:"w1000",code:"W1000",name:"Premium White",colour:"#f4f3ef",thickness:18,category:"Decorative board"},
{id:"painted-mdf",code:"PMDF",name:"Warm White Painted MDF",colour:"#eee9e1",thickness:18,category:"Painted board"},
{id:"h1180",code:"H1180",name:"Natural Halifax Oak",colour:"#b98e5d",thickness:18,category:"Woodgrain"},
{id:"h1385",code:"H1385",name:"Natural Casella Oak",colour:"#c7a477",thickness:18,category:"Woodgrain"},
{id:"u399",code:"U399",name:"Garnet Red",colour:"#7e1f28",thickness:18,category:"Decorative board"},
{id:"mdf",code:"MDF",name:"Raw MDF",colour:"#c5aa82",thickness:18,category:"Board"},
{id:"birch",code:"PLY",name:"Birch Plywood",colour:"#d7bd8b",thickness:18,category:"Board"},
{id:"stone-light",code:"QS01",name:"Carrara Quartz",colour:"#e7e3dc",thickness:20,category:"Worktop"},
{id:"stone-dark",code:"QS02",name:"Graphite Quartz",colour:"#46433f",thickness:20,category:"Worktop"},
{id:"glass-clear",code:"GLS",name:"Clear Glass",colour:"#b7d2db",thickness:10,category:"Glass"},
{id:"metal-brushed",code:"MET",name:"Brushed Steel",colour:"#9ca1a3",thickness:2,category:"Metal"},
{id:"floor-oak",code:"FL01",name:"Natural Oak Floor",colour:"#c7ad8b",thickness:14,category:"Floor"},
{id:"floor-walnut",code:"FL02",name:"Walnut Floor",colour:"#8c6546",thickness:14,category:"Floor"},
{id:"floor-stone",code:"FL03",name:"Light Stone Tile",colour:"#d8d4cc",thickness:10,category:"Floor"}];
export const material=(id:string,custom:Material[]=[])=>([...custom,...MATERIALS].find(m=>m.id===id)??MATERIALS[0]);
export const floorMaterials=(custom:Material[]=[])=>([...custom,...MATERIALS].filter(m=>m.category==="Floor"));
