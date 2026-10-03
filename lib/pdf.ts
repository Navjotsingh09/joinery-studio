import {jsPDF} from "jspdf";
import {Project,WallSide} from "@/types/model";
import {material} from "./materials";
import {itemRect,viewSize,contrastText,labelFor,normalizeRotation,wallItemRect,wallViewSize,isItemOnWall} from "./geometry";

const visible=(p:Project)=>p.items.filter(i=>i.visible!==false);
export function exportPdf(p:Project){
  const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a3"});
  doc.setFont("helvetica","bold");doc.setFontSize(15);doc.text("JOINERY DESIGN DRAWING PACK",15,13);
  doc.setFontSize(7);doc.setFont("helvetica","normal");doc.text(p.name+" | "+(p.customer||"Customer")+" | "+p.reference+" | Revision "+p.revision,15,19);
  if(p.address)doc.text("Site: "+p.address,15,24);
  const views:[("front"|"top"|"side"),number,number,number,number,string][]=[["front",15,34,185,105,"FRONT ELEVATION"],["top",215,34,185,105,"PLAN"],["side",15,160,185,96,"SIDE ELEVATION"]];
  for(const [v,x,y,w,h,title] of views){
    const sz=viewSize(p,v),sc=Math.min(w/sz.w,h/sz.h);
    doc.setFont("helvetica","bold");doc.text(title,x,y-3);doc.setDrawColor(40);doc.rect(x,y,sz.w*sc,sz.h*sc);
    visible(p).forEach((i,index)=>{
      const r=itemRect(i,p,v),m=material(i.doorMaterialId??i.materialId,p.customMaterials??[]),hex=m.colour.slice(1),rgb=[0,2,4].map(k=>parseInt(hex.slice(k,k+2),16));
      doc.setFillColor(rgb[0],rgb[1],rgb[2]);doc.rect(x+r.left*sc,y+r.top*sc,r.width*sc,r.height*sc,"FD");
      doc.setTextColor(contrastText(m.colour)==="#ffffff"?255:20);doc.setFontSize(4.8);doc.text(String(index+1)+" "+i.name,x+r.left*sc+1,y+r.top*sc+4);
      doc.setFontSize(4.2);doc.text(labelFor(i,v).replace(" × "," x "),x+r.left*sc+1,y+r.top*sc+8);
      const rot=normalizeRotation(i.rotation??0);if(rot)doc.text("Rot "+rot+"°",x+r.left*sc+1,y+r.top*sc+12);
    });
    doc.setTextColor(20);doc.setFont("helvetica","normal");doc.setFontSize(6);
    doc.line(x,y+sz.h*sc+5,x+sz.w*sc,y+sz.h*sc+5);doc.text(sz.w+" mm",x+sz.w*sc/2-7,y+sz.h*sc+10);
    doc.line(x-5,y,x-5,y+sz.h*sc);doc.text(sz.h+" mm",x-14,y+sz.h*sc/2,{angle:90});
  }
  doc.setTextColor(20);doc.rect(300,235,100,38);doc.setFont("helvetica","bold");doc.text("TITLE BLOCK",304,241);doc.setFont("helvetica","normal");
  doc.text("Project: "+p.name,304,247);doc.text("Customer: "+(p.customer||"-"),304,252);doc.text("Reference: "+p.reference,304,257);doc.text("Revision: "+p.revision+"  Status: "+p.status,304,262);doc.text("All dimensions in mm. Verify site dimensions.",304,268);
  if(p.notes){const note=doc.splitTextToSize("Notes: "+p.notes,94).slice(0,2);doc.text(note,304,273)}
  addWallElevations(doc,p);
  addSchedule(doc,p);
  doc.save(p.reference+"-rev-"+p.revision+".pdf")
}
function addSchedule(doc:jsPDF,p:Project){
  const items=visible(p),rows=22;
  for(let start=0;start<items.length||start===0;start+=rows){
    doc.addPage("a3","landscape");
    doc.setFont("helvetica","bold");doc.setFontSize(15);doc.text("ITEM / MATERIAL SCHEDULE",15,15);
    doc.setFont("helvetica","normal");doc.setFontSize(7);doc.text(p.name+" · "+p.reference+" · Revision "+p.revision,15,21);
    const y0=31,rowH=9,cols=[15,27,92,135,163,191,219,247,279,326,399];
    const heads=["#","Item","Type","W","H","D","X","Y / Z","Rotation","Material / layer"];
    doc.setFillColor(238,235,230);doc.rect(15,y0,384,rowH,"F");doc.setFont("helvetica","bold");doc.setFontSize(6.5);
    heads.forEach((h,n)=>doc.text(h,cols[n]+1,y0+6));
    doc.setFont("helvetica","normal");
    items.slice(start,start+rows).forEach((i,n)=>{
      const y=y0+rowH*(n+1),m=material(i.materialId,p.customMaterials??[]),carcass=material(i.carcassMaterialId??i.materialId,p.customMaterials??[]),front=material(i.doorMaterialId??i.materialId,p.customMaterials??[]);doc.setDrawColor(210);doc.line(15,y+rowH,399,y+rowH);
      const materialSummary=i.carcassMaterialId||i.doorMaterialId?"C:"+carcass.code+" F:"+front.code:m.code+" "+m.name;
      const values=[String(start+n+1),i.name,i.type,String(i.width),String(i.height),String(i.depth),String(i.x),i.y+" / "+i.z,normalizeRotation(i.rotation??0)+"°",materialSummary+" · "+(i.layer??"Joinery")];
      values.forEach((v,k)=>doc.text(String(v).slice(0,k===9?38:22),cols[k]+1,y+6));
    });
    doc.setFontSize(6);doc.text("Hidden objects are excluded. Dimensions are design values; verify site dimensions before manufacture.",15,285);
    if(start+rows>=items.length)break;
  }
}


function addWallElevations(doc:jsPDF,p:Project){
  doc.addPage("a3","landscape");
  doc.setFont("helvetica","bold");doc.setFontSize(15);doc.text("FOUR WALL ELEVATIONS",15,15);
  doc.setFont("helvetica","normal");doc.setFontSize(7);doc.text(p.name+" · "+p.reference+" · Revision "+p.revision,15,21);
  const walls:WallSide[]=["back","right","front","left"];
  const boxes=[[15,34],[215,34],[15,162],[215,162]] as const;
  walls.forEach((wall,index)=>{
    const [x,y]=boxes[index],w=185,h=96,sz=wallViewSize(p,wall),sc=Math.min(w/sz.w,h/sz.h);
    doc.setFont("helvetica","bold");doc.setFontSize(7);doc.text(wall.toUpperCase()+" WALL",x,y-3);
    doc.setDrawColor(55);doc.rect(x,y,sz.w*sc,sz.h*sc);
    visible(p).filter(i=>isItemOnWall(p,i,wall)).forEach((i,n)=>{
      const r=wallItemRect(i,p,wall),m=material(i.materialId,p.customMaterials??[]),hex=m.colour.slice(1),rgb=[0,2,4].map(k=>parseInt(hex.slice(k,k+2),16));
      doc.setFillColor(rgb[0],rgb[1],rgb[2]);doc.rect(x+r.left*sc,y+r.top*sc,r.width*sc,r.height*sc,"FD");
      doc.setTextColor(contrastText(m.colour)==="#ffffff"?255:20);doc.setFontSize(4.4);doc.text(String(n+1)+" "+i.name,x+r.left*sc+1,y+r.top*sc+4);
    });
    doc.setTextColor(20);doc.setFont("helvetica","normal");doc.setFontSize(5.5);doc.text(sz.w+" mm",x+sz.w*sc/2-6,y+sz.h*sc+8);
  });
}
