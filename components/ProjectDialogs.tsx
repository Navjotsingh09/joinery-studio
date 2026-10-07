"use client";
import {createContext,useCallback,useContext,useEffect,useId,useMemo,useRef,useState,ReactNode} from "react";

type Request={kind:"confirm"|"alert"|"prompt";message:string;initial?:string};
type Dialogs={confirm:(message:string)=>Promise<boolean>;alert:(message:string)=>Promise<void>;prompt:(message:string,initial?:string)=>Promise<string|null>};
const Context=createContext<Dialogs|null>(null);
export function useProjectDialogs(){const value=useContext(Context);if(!value)throw new Error("Project dialogs require a provider");return value}
export function ProjectDialogs({children}:{children:ReactNode}){
 const [request,setRequest]=useState<Request|null>(null),[value,setValue]=useState("");
 const pending=useRef<((result:string|boolean|null)=>void)|null>(null),dialog=useRef<HTMLDialogElement>(null),titleId=useId(),messageId=useId();
 const ask=useCallback((next:Request)=>new Promise<string|boolean|null>(resolve=>{
  // Repeated shortcuts cannot replace an outstanding confirmation.
  if(pending.current){resolve(null);return}
  pending.current=resolve;setValue(next.initial??"");setRequest(next);
 }),[]);
 const finish=useCallback((result:string|boolean|null)=>{const resolve=pending.current;pending.current=null;dialog.current?.close();setRequest(null);resolve?.(result)},[]);
 useEffect(()=>{if(request&&!dialog.current?.open)dialog.current?.showModal()},[request]);
 useEffect(()=>()=>{pending.current?.(null);pending.current=null},[]);
 const api=useMemo<Dialogs>(()=>({confirm:async message=>(await ask({kind:"confirm",message}))===true,alert:async message=>{await ask({kind:"alert",message})},prompt:async(message,initial)=>{const result=await ask({kind:"prompt",message,initial});return typeof result==="string"?result:null}}),[ask]);
 const destructive=request?.kind==="confirm"&&/^(Delete|Remove|Replace)/i.test(request.message);
 const heading=request?.kind==="prompt"?"Name your material":request?.kind==="alert"?"Project notice":destructive?(/^Replace/i.test(request.message)?"Replace projects?":/^Remove/i.test(request.message)?"Remove material?":"Confirm deletion"):"Confirm project change";
 const action=request?.kind==="alert"?"Got it":request?.kind==="prompt"?"Save material":destructive?(/^Replace/i.test(request.message)?"Replace projects":/^Remove/i.test(request.message)?"Remove material":"Delete"):"Continue";
 return <Context.Provider value={api}>{children}<dialog ref={dialog} className="projectDialog" aria-labelledby={titleId} aria-describedby={messageId} onCancel={e=>{e.preventDefault();finish(null)}}>
  {request&&<form onSubmit={e=>{e.preventDefault();finish(request.kind==="prompt"?value.trim():true)}}>
   <div className="projectDialogBrand"><span>JS</span> JOINERY STUDIO</div>
   <h2 id={titleId}>{heading}</h2><p id={messageId}>{request.message}</p>
   {request.kind==="prompt"&&<label>Material name<input autoFocus value={value} maxLength={120} required onChange={e=>setValue(e.target.value)}/></label>}
   <div className="projectDialogActions">{request.kind!=="alert"&&<button type="button" autoFocus={request.kind==="confirm"} onClick={()=>finish(null)}>Cancel</button>}<button type="submit" className={destructive?"destructive":"primary"} autoFocus={request.kind==="alert"} disabled={request.kind==="prompt"&&!value.trim()}>{action}</button></div>
  </form>}
 </dialog></Context.Provider>;
}
