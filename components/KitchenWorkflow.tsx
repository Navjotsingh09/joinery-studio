"use client";
import {useState} from "react";
export function KitchenWorkflow({onChoose,onFloor,onRoom}:{onChoose:(type:string)=>void;onFloor:()=>void;onRoom:()=>void}){
 const [phase,setPhase]=useState(1);
 const steps=phase===1?[["Room",onRoom],["Floor",onFloor],["Wall",()=>onChoose("Wall segment")],["Door",()=>onChoose("Door opening")],["Window",()=>onChoose("Window")],["Kitchen units",()=>{setPhase(2);onChoose("")}]] as const:[["Base units",()=>onChoose("Base cabinet")],["Wall units",()=>onChoose("Wall cabinet")],["Larder",()=>onChoose("Tall cabinet")],["Island",()=>onChoose("Kitchen island")],["Worktop",()=>onChoose("Worktop")],["Backsplash",()=>onChoose("Backsplash")]] as const;
 return <section className="kitchenWorkflow" aria-label="Kitchen assembly guide"><b>Build your kitchen step by step</b><div className="workflowPhases"><button className={phase===1?"active":""} onClick={()=>{setPhase(1);onChoose("")}}>1 · Room & openings</button><button className={phase===2?"active":""} onClick={()=>{setPhase(2);onChoose("")}}>2 · Units & surfaces</button></div><div className="workflowSteps">{steps.map(([label,action],index)=><button key={label} onClick={action}><span>{index+1}</span>{label}</button>)}</div><small>Use Top plan to place components. Select a unit to enter exact sizes. You can revisit any step.</small></section>;
}
