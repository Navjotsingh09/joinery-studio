import {Material} from "@/types/model";
export const MATERIALS:Material[]=[
{id:"u961",code:"U961",name:"Graphite Grey",colour:"#4a4b4d",thickness:18,category:"Decorative board"},
{id:"u705",code:"U705",name:"Angora Grey",colour:"#b9b1a6",thickness:18,category:"Decorative board"},
{id:"w1000",code:"W1000",name:"Premium White",colour:"#f4f3ef",thickness:18,category:"Decorative board"},
{id:"h1180",code:"H1180",name:"Natural Halifax Oak",colour:"#b98e5d",thickness:18,category:"Woodgrain"},
{id:"h1385",code:"H1385",name:"Natural Casella Oak",colour:"#c7a477",thickness:18,category:"Woodgrain"},
{id:"u399",code:"U399",name:"Garnet Red",colour:"#7e1f28",thickness:18,category:"Decorative board"},
{id:"mdf",code:"MDF",name:"Raw MDF",colour:"#c5aa82",thickness:18,category:"Board"},
{id:"birch",code:"PLY",name:"Birch Plywood",colour:"#d7bd8b",thickness:18,category:"Board"}];
export const material=(id:string)=>MATERIALS.find(m=>m.id===id)??MATERIALS[0];