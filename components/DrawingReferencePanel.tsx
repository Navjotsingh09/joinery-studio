"use client";
import {useEffect,useRef,useState} from "react";
import {Project,DrawingReference} from "@/types/model";
import {MeasureInput} from "./MeasureInput";
import {calibratedWidth,ReferencePoint,referenceDepth} from "@/lib/drawingReference";
import {formatMeasure} from "@/lib/units";

export function DrawingReferencePanel({project,onChange,onPlan}:{project:Project;onChange:(r:DrawingReference|undefined)=>void;onPlan:()=>void}){
  const ref=project.drawingReference,unit=project.displayUnit??"mm";
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[file,setFile]=useState<File|null>(null),[page,setPage]=useState(1),[pages,setPages]=useState(0),[points,setPoints]=useState<ReferencePoint[]>([]),[known,setKnown]=useState(1000);
  const ticket=useRef(0),projectId=useRef(project.id);projectId.current=project.id;
  useEffect(()=>{ticket.current++;setFile(null);setPages(0);setPage(1);setPoints([]);setNotice("");setBusy(false)},[project.id]);
  useEffect(()=>()=>{ticket.current++},[]);
  const renderPdf=async(f:File,n:number)=>{
    const run=++ticket.current,id=project.id;setBusy(true);setNotice("Preparing drawing…");
    let task:import("pdfjs-dist").PDFDocumentLoadingTask|undefined;
    try{
      const pdf=await import("pdfjs-dist");pdf.GlobalWorkerOptions.workerSrc="/pdf-assets/pdf.worker.min.mjs";
      task=pdf.getDocument({data:new Uint8Array(await f.arrayBuffer()),isEvalSupported:false,cMapUrl:"/pdf-assets/cmaps/",cMapPacked:true,standardFontDataUrl:"/pdf-assets/standard_fonts/"});
      const doc=await task.promise;if(run!==ticket.current||projectId.current!==id)return;
      setPages(doc.numPages);if(n>doc.numPages)throw new Error("That page does not exist.");
      const source=await doc.getPage(n),base=source.getViewport({scale:1}),viewport=source.getViewport({scale:Math.min(2048/Math.max(base.width,base.height),3)}),canvas=document.createElement("canvas");
      canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);const ctx=canvas.getContext("2d");if(!ctx)throw new Error("The drawing could not be rendered.");
      await source.render({canvasContext:ctx,viewport,background:"white"}).promise;
      const dataUrl=canvas.toDataURL("image/webp",.9);if(dataUrl.length>=2500000)throw new Error("This page is too detailed. Export a smaller drawing page.");
      if(run!==ticket.current||projectId.current!==id)return;
      onChange({name:`${f.name} · page ${n}`,dataUrl,pixelWidth:canvas.width,pixelHeight:canvas.height,widthMm:project.roomWidth,x:0,z:0,opacity:.45,visible:true});setPoints([]);setNotice("Drawing added. Pick two points on a known dimension to calibrate the scale, then position it in the room.");onPlan();
    }catch(e){if(run===ticket.current)setNotice(e instanceof Error?e.message:"Could not read this PDF. Export an unprotected PDF and try again.")}
    finally{await task?.destroy();if(run===ticket.current)setBusy(false)}
  };
  const change=(patch:Partial<DrawingReference>)=>{if(ref)onChange({...ref,...patch})};
  return <section className="referencePanel"><h4>Drawing reference & calibration</h4><p>Trace your exported CAD plan in Top view. This is a scaled reference; it does not create editable CAD objects.</p>
    <label>Upload PDF<input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={e=>{const f=e.target.files?.[0];e.target.value="";if(!f)return;if(f.size>20000000){setNotice("Choose a PDF under 20 MB.");return}setFile(f);setPage(1);void renderPdf(f,1)}}/></label>
    {file&&pages>1&&<div className="referencePage"><label>PDF page<input type="number" min="1" max={pages} value={page} onChange={e=>setPage(Math.max(1,Math.min(pages,+e.target.value)))}/></label><button disabled={busy} onClick={()=>void renderPdf(file,page)}>Use page {page} / {pages}</button></div>}
    {ref&&<><b className="referenceName">{ref.name}</b><div className="referenceCalibration" onClick={e=>{const box=e.currentTarget.getBoundingClientRect();const point={x:(e.clientX-box.left)/box.width,y:(e.clientY-box.top)/box.height};setPoints(v=>v.length===2?[point]:[...v,point])}} role="img" aria-label="Drawing calibration preview: click two endpoints of a known dimension"><img src={ref.dataUrl} alt="Measured drawing reference preview"/>{points.map((p,n)=><i key={n} style={{left:p.x*100+"%",top:p.y*100+"%"}}>{n+1}</i>)}</div><small>Click two endpoints on a known dimension ({points.length}/2 selected).</small><label>Known distance · {unit}<MeasureInput value={known} unit={unit} min={1} onCommit={setKnown}/></label><button disabled={points.length!==2||busy} onClick={()=>{try{change({widthMm:calibratedWidth(points[0],points[1],known,ref.pixelWidth,ref.pixelHeight,ref.aspectRatio)});setNotice("Scale calibrated. Check another measured dimension before designing.")}catch(e){setNotice((e as Error).message)}}}>Calibrate drawing scale</button>
    <div className="fieldGrid2"><label>Drawing width · {unit}<MeasureInput value={ref.widthMm} unit={unit} min={100} onCommit={widthMm=>change({widthMm})}/></label><span>Depth<br/>{formatMeasure(referenceDepth(ref),unit)}</span><label>Left offset · {unit}<MeasureInput value={ref.x} unit={unit} min={-200000} onCommit={x=>change({x})}/></label><label>Back offset · {unit}<MeasureInput value={ref.z} unit={unit} min={-200000} onCommit={z=>change({z})}/></label></div>
    <label>Reference opacity<input type="range" min="0" max="1" step=".05" value={ref.opacity} onChange={e=>change({opacity:+e.target.value})}/></label><label className="checkRow"><input type="checkbox" checked={ref.visible} onChange={e=>change({visible:e.target.checked})}/>Show drawing in Top view</label><button onClick={()=>{onChange(undefined);setPoints([]);setNotice("Drawing reference removed. Units are unchanged.")}}>Remove reference</button></>}
    {notice&&<p role="status">{notice}</p>}
  </section>;
}
