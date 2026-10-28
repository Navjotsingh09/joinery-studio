"use client";
import {useEffect,useRef,useState} from "react";
export type StudioCommand={id:string;label:string;detail:string;run:()=>void};
export function StudioCommands({open,onClose,commands}:{open:boolean;onClose:()=>void;commands:StudioCommand[]}){
 const dialog=useRef<HTMLDialogElement>(null),input=useRef<HTMLInputElement>(null);
 const [query,setQuery]=useState("");
 useEffect(()=>{if(open){setQuery("");dialog.current?.showModal();input.current?.focus()}else dialog.current?.close()},[open]);
 const matches=commands.filter(c=>(c.label+" "+c.detail).toLowerCase().includes(query.toLowerCase()));
 const run=(c:StudioCommand)=>{onClose();c.run()};
 return <dialog ref={dialog} className="commandDialog" aria-labelledby="command-title" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}}><header><h2 id="command-title">Find a tool or component</h2><button onClick={onClose} aria-label="Close command search">Esc</button></header><input ref={input} aria-label="Search studio commands" placeholder="Try wall unit, materials, export…" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&matches[0]){e.preventDefault();run(matches[0])}}}/><div className="commandResults">{matches.map(c=><button key={c.id} onClick={()=>run(c)}><b>{c.label}</b><small>{c.detail}</small><span aria-hidden="true">↗</span></button>)}{!matches.length&&<p>No matching tools. Try a component name or “plan”.</p>}</div><footer>Enter opens the first result · Tab moves through results</footer></dialog>
}
