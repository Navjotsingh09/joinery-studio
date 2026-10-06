"use client";
import {useEffect,useRef,useState} from "react";
import {DisplayUnit,fromMm,toMm} from "@/lib/units";
export function MeasureInput({value,unit="mm",min=0,onCommit}:{value:number;unit?:DisplayUnit;min?:number;onCommit:(mm:number)=>void}){
  const dirty=useRef(false);
  const [draft,setDraft]=useState(String(fromMm(value,unit)));
  useEffect(()=>{dirty.current=false;setDraft(String(fromMm(value,unit)))},[value,unit]);
  const commit=()=>{if(!dirty.current)return;dirty.current=false;const n=Number(draft);if(draft.trim()&&Number.isFinite(n)&&toMm(n,unit)>=min)onCommit(toMm(n,unit));setDraft(String(fromMm(value,unit)))};
  return <input type="number" min={fromMm(min,unit)} step="any" value={draft} onChange={e=>{dirty.current=true;setDraft(e.target.value)}} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();if(e.key==="Escape"){dirty.current=false;setDraft(String(fromMm(value,unit)));e.currentTarget.blur()}}}/>;
}
