import {kitchenProject,kitchenSpecification} from './kitchenConfig';
import {jsPDF} from 'jspdf';
import {Project,JoineryItem,WallSide} from '@/types/model';
import {material} from './materials';
import {itemRect,normalizeRotation,wallItemRect,wallViewSize,isItemOnWall,footprint} from './geometry';
import {dimensionStops,itemColour,numberItems,onPlan,PlanKind,referenceLabel} from './drawingPack';
import {worktopCutouts} from './renderGeometry';

const WALLS:WallSide[]=['back','right','front','left'];
const WALL_NAMES=['A · BACK','B · RIGHT','C · FRONT','D · LEFT'];
const visible=(p:Project)=>p.items.filter(i=>i.visible!==false);
const fmt=(n:number)=>String(Math.round(n*10)/10);
type Rect={left:number;top:number;width:number;height:number};
function text(doc:jsPDF,value:string,x:number,y:number,size=8,align:'left'|'center'|'right'='left'){
  doc.setFontSize(size);doc.setTextColor(40,53,48);doc.text(value,x,y,{align});
}
function header(doc:jsPDF,p:Project,title:string){
  doc.setFillColor(35,53,47);doc.rect(0,0,420,29,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text(title,15,13);
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(doc.splitTextToSize(`${p.name} | ${p.reference} | Revision ${p.revision}`,390).slice(0,2),15,21);
}
function scale(w:number,h:number,boxW:number,boxH:number){return 1/([10,15,20,25,30,40,50,75,100,150,200,500,1000].find(n=>w/n<=boxW&&h/n<=boxH)??Math.ceil(Math.max(w/boxW,h/boxH)))}
function hdim(doc:jsPDF,stops:number[],x:number,edge:number,y:number,sc:number,overall=false){
  doc.setDrawColor(106,118,112);doc.setLineWidth(.15);
  const list=overall?[stops[0],stops.at(-1)!]:stops;
  list.forEach(v=>{const px=x+v*sc;doc.line(px,edge,px,y+2);doc.line(px-1,y+1,px+1,y-1)});
  doc.line(x+list[0]*sc,y,x+list.at(-1)!*sc,y);
  for(let k=1;k<list.length;k++){const a=list[k-1],b=list[k];if((b-a)*sc<7&&!overall)continue;text(doc,fmt(b-a),x+(a+b)*sc/2,y-1,6.5,'center')}
}
function vdim(doc:jsPDF,stops:number[],y:number,edge:number,x:number,sc:number,overall=false){
  const list=overall?[stops[0],stops.at(-1)!]:stops;doc.setDrawColor(106,118,112);doc.setLineWidth(.15);
  list.forEach(v=>{const py=y+v*sc;doc.line(edge,py,x-2,py);doc.line(x-1,py-1,x+1,py+1)});doc.line(x,y+list[0]*sc,x,y+list.at(-1)!*sc);
  for(let k=1;k<list.length;k++){const a=list[k-1],b=list[k];if((b-a)*sc<7&&!overall)continue;doc.setFontSize(6.5);doc.setTextColor(70);doc.text(fmt(b-a),x-2,y+(a+b)*sc/2,{angle:90,align:'center'})}
}
function object(doc:jsPDF,p:Project,i:JoineryItem,r:Rect,x:number,y:number,sc:number,ghost=false,elevation=false){
  const rgb=ghost?[247,247,246]:itemColour(i);doc.setDrawColor(ghost?218:91,ghost?220:105,ghost?216:99);doc.setFillColor(rgb[0],rgb[1],rgb[2]);doc.setLineWidth(ghost?.12:.25);doc.rect(x+r.left*sc,y+r.top*sc,r.width*sc,r.height*sc,'FD');
  if(ghost)return;
  if(elevation&&i.doors>0&&i.layer!=='Services'&&r.width*sc>12&&r.height*sc>12){
    const drawers=['Drawer unit','Media unit','Internal drawers'].includes(i.type)||(i.type==='Kitchen island'&&i.islandFront!=='doors'),plinth=i.plinthStyle==='none'?0:Math.min(i.plinthHeight??100,i.height*.25),px=x+r.left*sc,py=y+r.top*sc,rw=r.width*sc,rh=r.height*sc,bodyH=rh-plinth*sc,count=Math.min(12,Math.max(1,i.doors));doc.setDrawColor(144,148,134);doc.setLineWidth(.15);
    if(plinth>0)doc.line(px,py+bodyH,px+rw,py+bodyH);
    for(let n=0;n<count;n++){const fx=drawers?px:px+rw*n/count,fy=drawers?py+bodyH*n/count:py,fw=drawers?rw:rw/count,fh=drawers?bodyH/count:bodyH;
      if(n)doc.line(fx,fy,drawers?fx+fw:fx,drawers?fy:fy+fh);
      if(['shaker','slim-shaker','raised-panel'].includes(i.frontStyle??'')&&fw>4&&fh>4)doc.rect(fx+1.2,fy+1.2,fw-2.4,fh-2.4);
      if(i.frontStyle==='fluted'){for(let u=fx+1;u<fx+fw;u+=Math.max(.7,25*sc))doc.line(u,fy+.4,u,fy+fh-.4)}
      if(!['None','Handleless','Push-to-open'].includes(i.hardware)){const hx=drawers?fx+fw/2:fx+fw*.82,hy=drawers?fy+fh*.25:fy+fh*.5;doc.line(hx-1,hy,hx+1,hy)}
    }
  }
  if(i.type!=='Worktop'&&r.width*sc>=10&&r.height*sc>=7){const cx=x+(r.left+r.width/2)*sc,cy=y+(r.top+r.height/2)*sc;doc.setFillColor(255,255,255);doc.roundedRect(cx-4.7,cy-2.4,9.4,4.8,1,1,'F');text(doc,referenceLabel(i),cx,cy+1,6,'center')}
}
function legend(doc:jsPDF,p:Project,items:JoineryItem[],x=329,y=47){
  text(doc,'DRAWING KEY',x,y,10);y+=7;
  for(const [name,rgb] of [['Base units',[247,242,220]],['Wall units',[222,235,249]],['Tall units',[247,222,229]],['Worktops',[224,238,226]],['Services',[241,230,216]],['Architecture',[237,235,231]]] as [string,number[]][]){doc.setFillColor(rgb[0],rgb[1],rgb[2]);doc.rect(x,y-3,5,4,'F');text(doc,name,x+8,y,7);y+=6}
  y+=5;text(doc,'UNIT REFERENCES',x,y,9);y+=6;
  const max=23;
  items.slice(0,max).forEach(i=>{const label=referenceLabel(i),lines=doc.splitTextToSize(i.name,64).slice(0,2) as string[];text(doc,label,x,y,6.5);doc.setFontSize(6.5);doc.text(lines,x+13,y);y+=Math.max(5,lines.length*3.3)});
  if(items.length>max)text(doc,`+ ${items.length-max} in item schedule`,x,y,7);
  text(doc,'All dimensions in mm.',x,251,7);text(doc,'References stay the same across sheets.',x,257,6.5);text(doc,`Exported ${new Date().toISOString().slice(0,10)}`,x,263,7);
}
function plan(doc:jsPDF,p:Project,kind:PlanKind){
  const title=kind==='base'?'BASE UNIT PLAN':kind==='wall'?'WALL UNIT PLAN':'WORKTOP PLAN';header(doc,p,title);
  const sc=scale(p.roomWidth,p.roomDepth,253,170),w=p.roomWidth*sc,h=p.roomDepth*sc,x=45+(253-w)/2,y=62+(170-h)/2;
  const selected=visible(p).filter(i=>onPlan(i,kind));
  text(doc,`Scale 1:${fmt(1/sc)} at A3 · origin X0 / Z0`,15,38,8);
  // Ghosted cabinets retain orientation context on upper and surface sheets.
  if(kind!=='base')visible(p).filter(i=>onPlan(i,'base')).forEach(i=>object(doc,p,i,itemRect(i,p,'top'),x,y,sc,true));
  selected.forEach(i=>object(doc,p,i,itemRect(i,p,'top'),x,y,sc));
  doc.setDrawColor(35,53,47);doc.setLineWidth(.4);doc.rect(x,y,w,h);
  text(doc,'WALL C',x+w/2,y-4,7,'center');text(doc,'WALL A',x+w/2,y+h+5,7,'center');text(doc,'D',x-5,y+h/2,7);text(doc,'B',x+w+4,y+h/2,7);
  text(doc,'X0 / Z0',x-2,y+h+3,7,'right');
  const rects=selected.filter(i=>i.layer!=='Services'||i.width>=300).map(i=>itemRect(i,p,'top'));
  hdim(doc,dimensionStops(rects.flatMap(r=>[r.left,r.left+r.width]),p.roomWidth),x,y,y-10,sc);
  hdim(doc,[0,p.roomWidth],x,y,y-20,sc,true);
  vdim(doc,dimensionStops(rects.flatMap(r=>[r.top,r.top+r.height]),p.roomDepth),y,x,x-10,sc);
  vdim(doc,[0,p.roomDepth],y,x,x-20,sc,true);
  if(kind==='worktop'){
    for(const top of selected){const fp=footprint(top),a=normalizeRotation(top.rotation)*Math.PI/180;
      for(const hole of worktopCutouts(top,p.items)){
        const cross=normalizeRotation(top.rotation)%180!==0;
        const cx=top.x+fp.width/2+(hole.x*Math.cos(a)+hole.z*Math.sin(a))*1000,cz=top.z+fp.depth/2+(-hole.x*Math.sin(a)+hole.z*Math.cos(a))*1000;
        const hw=(cross?hole.depth:hole.width)*1000,hd=(cross?hole.width:hole.depth)*1000;
        doc.setDrawColor(78,109,132);doc.setFillColor(255,255,255);doc.rect(x+(cx-hw/2)*sc,y+(p.roomDepth-cz-hd/2)*sc,hw*sc,hd*sc,'FD');
      }
      const r=itemRect(top,p,'top'),edges=top.worktopFinishedEdges??['front','left','right'];doc.setDrawColor(44,140,85);doc.setLineWidth(.8);
      // Local edges are transformed so front/side finishes follow rotated slabs.
      const pt=(lx:number,lz:number)=>[x+(top.x+fp.width/2+lx*Math.cos(a)+lz*Math.sin(a))*sc,y+(p.roomDepth-top.z-fp.depth/2+lx*Math.sin(a)-lz*Math.cos(a))*sc];
      for(const e of edges){const x1=e==='right'?top.width/2:-top.width/2,x2=e==='left'?-top.width/2:top.width/2,z1=e==='front'?top.depth/2:-top.depth/2,z2=e==='back'?-top.depth/2:top.depth/2;const A=pt(x1,z1),B=pt(x2,z2);doc.line(A[0],A[1],B[0],B[1])}
      text(doc,referenceLabel(top),x+(r.left+Math.min(200,r.width*.2))*sc,y+(r.top+Math.min(100,r.height*.2))*sc+2,7,'center');
    }
    text(doc,'Green edges: finished · section boundaries: joins · cutouts: white',15,271,7);
  }else text(doc,'Small fillers and service points are identified in the full schedule.',15,271,7);
  legend(doc,p,selected);
}
function elevation(doc:jsPDF,p:Project,wall:WallSide,index:number){
  header(doc,p,`WALL ${WALL_NAMES[index]} ELEVATION`);
  const sz=wallViewSize(p,wall),sc=scale(sz.w,sz.h,253,165),x=45+(253-sz.w*sc)/2,y=63+(165-sz.h*sc)/2;
  const items=visible(p).filter(i=>isItemOnWall(p,i,wall));text(doc,`Scale 1:${fmt(1/sc)} at A3 · heights from finished floor level 0`,15,38,8);
  items.forEach(i=>object(doc,p,i,wallItemRect(i,p,wall),x,y,sc,false,true));
  doc.setDrawColor(35,53,47);doc.setLineWidth(.4);doc.rect(x,y,sz.w*sc,sz.h*sc);
  const rects=items.filter(i=>i.layer!=='Services'||i.width>=300).map(i=>wallItemRect(i,p,wall));hdim(doc,dimensionStops(rects.flatMap(r=>[r.left,r.left+r.width]),sz.w),x,y+sz.h*sc,y+sz.h*sc+12,sc);
  hdim(doc,[0,sz.w],x,y+sz.h*sc,y+sz.h*sc+22,sc,true);
  // Inverted drawing axis displays actual segment heights; the floor datum is 0.
  vdim(doc,dimensionStops(rects.flatMap(r=>[r.top,r.top+r.height]),sz.h),y,x,x-10,sc);vdim(doc,[0,sz.h],y,x,x-20,sc,true);
  text(doc,'FFL 0',x-3,y+sz.h*sc+2,7,'right');legend(doc,p,items);
  text(doc,'Service positions and heights are listed in the service schedule.',15,271,7);
}
function schedule(doc:jsPDF,p:Project,services=false){
  const cols=[15,33,104,144,194,241,281,402],heads=['Ref','Item','Type','W / H / D','X / Y / Z','Rotation','Specification'];let y=0;
  const page=()=>{doc.addPage();header(doc,p,services?'SERVICE / APPLIANCE SCHEDULE':'UNIT / MATERIAL SCHEDULE');doc.setFillColor(236,240,231);doc.rect(15,34,387,10,'F');heads.forEach((h,n)=>text(doc,h,cols[n]+2,40,7));y=44};page();
  const items=visible(p).filter(i=>services?i.layer==='Services':i.layer!=='Services');
  for(const i of items){const mat=(id?:string)=>material(id??i.materialId,p.customMaterials??[]).code;
    const spec=i.type==='Worktop'?`Surface ${mat(i.worktopMaterialId)}; ${i.height} mm; ${i.worktopEdge??'square'}; finished edges: ${(i.worktopFinishedEdges??['front','left','right']).join(', ')}; cutouts ${worktopCutouts(i,p.items).map(h=>`${fmt(h.width*1000)} x ${fmt(h.depth*1000)}`).join('; ')||'none'}`:services?`${i.productStyle??'Generic'}; ${i.colourVariant??i.finish}; ${i.notes||'Confirm connection positions on site.'}`:`Carcass ${mat(i.carcassMaterialId)}; fronts ${mat(i.doorMaterialId)} / ${i.frontStyle??'slab'}; sides ${mat(i.leftSideMaterialId??i.sideMaterialId)} / ${mat(i.rightSideMaterialId??i.sideMaterialId)}; plinth ${mat(i.plinthMaterialId)}; ${kitchenSpecification(i)}; ${i.notes}`;
    const values=[referenceLabel(i),i.name,i.type,`${fmt(i.width)} / ${fmt(i.height)} / ${fmt(i.depth)}`,`${fmt(i.x)} / ${fmt(i.y)} / ${fmt(i.z)}`,`${normalizeRotation(i.rotation)} deg`,spec];doc.setFontSize(7);const lines=values.map((v,k)=>doc.splitTextToSize(v,cols[k+1]-cols[k]-4) as string[]),height=Math.max(12,...lines.map(a=>a.length*3.5+5));if(y+height>272)page();doc.setTextColor(40,53,48);lines.forEach((v,k)=>doc.text(v,cols[k]+2,y+5));doc.setDrawColor(213,220,215);doc.line(15,y+height,402,y+height);y+=height;
  }
  if(!items.length)text(doc,'No items in this schedule.',17,53,9);
}
export function exportPdf(input:Project,download=true){
  const resolved=kitchenProject(input),p={...resolved,...numberItems(resolved)},doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a3'});
  (['base','wall','worktop'] as PlanKind[]).forEach((kind,n)=>{if(n)doc.addPage();plan(doc,p,kind)});
  WALLS.forEach((wall,n)=>{doc.addPage();elevation(doc,p,wall,n)});schedule(doc,p);schedule(doc,p,true);
  if(p.notes){doc.addPage();header(doc,p,'PROJECT NOTES');const lines=doc.splitTextToSize(p.notes,380);for(let n=0;n<lines.length;n+=48){if(n){doc.addPage();header(doc,p,'PROJECT NOTES / CONTINUED')}doc.setFontSize(9);doc.text(lines.slice(n,n+48),15,40)}}
  const total=doc.getNumberOfPages();for(let n=1;n<=total;n++){doc.setPage(n);doc.setDrawColor(194,205,197);doc.line(15,280,402,280);text(doc,'Design drawings · verify site dimensions, cutout templates and connections before manufacture.',15,287,7);text(doc,`${p.reference} / Rev ${p.revision} · ${n} / ${total}`,402,287,7,'right')}
  if(download)doc.save(p.reference+'-rev-'+p.revision+'.pdf');return doc;
}
