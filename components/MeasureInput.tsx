"use client";
import {useEffect,useRef,useState} from "react";
import {DisplayUnit,fromMm,toMm} from "@/lib/units";
export function MeasureInput({value,unit="mm",min=0,max=Infinity,onCommit}:{value:number;unit?:DisplayUnit;min?:number;max?:number;onCommit:(mm:number)=>void}){
  const dirty=useRef(false);
  const [error,setError]=useState("");
  const [draft,setDraft]=useState(String(fromMm(value,unit)));
  useEffect(()=>{dirty.current=false;setDraft(String(fromMm(value,unit)))},[value,unit]);
  const commit=()=>{if(!dirty.current)return;const n=Number(draft),mm=toMm(n,unit);if(!draft.trim()||!Number.isFinite(n)||mm<min||mm>max){setError(`Enter a value from ${fromMm(min,unit)}${Number.isFinite(max)?` to ${fromMm(max,unit)}`:" or greater"} ${unit}.`);return}dirty.current=false;setError("");onCommit(mm);setDraft(String(fromMm(value,unit)))};
  return <><input type="number" min={fromMm(min,unit)} max={Number.isFinite(max)?fromMm(max,unit):undefined} step="any" value={draft} aria-invalid={!!error} onChange={e=>{dirty.current=true;setError("");setDraft(e.target.value)}} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();if(e.key==="Escape"){dirty.current=false;setError("");setDraft(String(fromMm(value,unit)));e.currentTarget.blur()}}}/>{error&&<small className="inputError" role="alert">{error}</small>}</>;
}
