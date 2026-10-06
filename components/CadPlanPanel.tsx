"use client";
import {useEffect,useRef,useState} from 'react';
import {DrawingReference} from '@/types/model';
import {CadPlan,cadPlanView,parseCadPlan} from '@/lib/cadPlan';
export function CadPlanPanel({onChange,onPlan}:{onChange:(r:DrawingReference)=>void;onPlan:()=>void}){
 const [plan,setPlan]=useState<CadPlan|null>(null),[name,setName]=useState(''),[layers,setLayers]=useState<string[]>([]),[unit,setUnit]=useState<'mm'|'cm'|'m'|'in'>('mm'),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);const ticket=useRef(0);
 useEffect(()=>()=>{ticket.current++},[]);
 const read=async(source:Promise<string>,filename:string)=>{const run=++ticket.current;setBusy(true);try{const parsed=parseCadPlan(await source);if(run!==ticket.current)return;setPlan(parsed);setName(filename);setLayers(parsed.layers);setUnit(parsed.unit==='unknown'?'mm':parsed.unit);setNotice(parsed.unit==='unknown'?'Drawing units are unspecified. Choose the units used in CAD before adding the plan.':'Drawing units detected. Check the dimensions and choose the layers to use.')}catch(e){if(run===ticket.current)setNotice(e instanceof Error?e.message:'Could not read this drawing.')}finally{if(run===ticket.current)setBusy(false)}};
 let view:ReturnType<typeof cadPlanView>|null=null,error='';if(plan)try{view=cadPlanView(plan,layers,unit)}catch(e){error=(e as Error).message}
 const apply=async()=>{if(!view)return;const run=++ticket.current,v=view;setBusy(true);try{
  const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(v.svg);await image.decode();if(run!==ticket.current)return;
  const max=Math.max(v.widthMm,v.depthMm),canvas=document.createElement('canvas');canvas.width=Math.round(2048*v.widthMm/max);canvas.height=Math.round(2048*v.depthMm/max);const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Could not prepare the plan.');ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const dataUrl=canvas.toDataURL('image/webp',.9);if(dataUrl.length>=2500000)throw new Error('Choose fewer layers or a less detailed plan.');
  onChange({name,dataUrl,pixelWidth:canvas.width,pixelHeight:canvas.height,aspectRatio:v.widthMm/v.depthMm,widthMm:v.widthMm,x:0,z:0,opacity:.45,visible:true});onPlan();setNotice('Measured CAD reference added. Check a known dimension using the calibration controls below. Cabinets remain editable in the studio.');
 }catch(e){if(run===ticket.current)setNotice((e as Error).message)}finally{if(run===ticket.current)setBusy(false)}};
 return <section className="referencePanel"><h4>CAD plan · DXF</h4><p>Load a measured 2D CAD plan, choose its layers and design over it. Lines, polylines, arcs, circles and nested blocks are supported. DWG and 3D solids are not supported.</p>
  <label>Upload DXF<input type="file" accept=".dxf" disabled={busy} onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;if(f.size>8000000){setNotice('Choose a DXF under 8 MB.');return}void read(f.text(),f.name)}}/></label>
  <button disabled={busy} onClick={()=>void read(fetch('/examples/kitchen-plan.dxf').then(r=>{if(!r.ok)throw new Error('Example drawing unavailable.');return r.text()}),'Example kitchen plan.dxf')}>Try example DXF plan</button>
  {plan&&<><b>{name}</b><label>CAD drawing units<select aria-label="CAD drawing units" disabled={busy} value={unit} onChange={e=>setUnit(e.target.value as typeof unit)}>{['mm','cm','m','in'].map(v=><option key={v}>{v}</option>)}</select></label><fieldset><legend>Drawing layers</legend>{plan.layers.map(layer=><label key={layer} className="checkRow"><input type="checkbox" disabled={busy} checked={layers.includes(layer)} onChange={e=>setLayers(v=>e.target.checked?[...v,layer]:v.filter(x=>x!==layer))}/>{layer}</label>)}</fieldset>
   {view&&<p>Measured plan: {Math.round(view.widthMm)} × {Math.round(view.depthMm)} mm</p>}{plan.ignored>0&&<p>{plan.ignored} unsupported annotations/entities omitted. Review the reference against your original drawing.</p>}{error&&<p role="alert">{error}</p>}
   <button disabled={!view||busy} onClick={()=>void apply()}>{busy?'Preparing drawing…':'Use measured CAD reference'}</button></>}
  {notice&&<p role="status">{notice}</p>}
 </section>;
}
