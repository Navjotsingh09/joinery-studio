import DxfParser from 'dxf-parser';
export type CadPoint={x:number;y:number};
export type CadStroke={layer:string;points:CadPoint[]};
export type CadPlan={strokes:CadStroke[];layers:string[];unit:'mm'|'cm'|'m'|'in'|'unknown';ignored:number};
type Entity={type:string;layer?:string;vertices?:Array<CadPoint&{bulge?:number}>;shape?:boolean;center?:CadPoint;radius?:number;startAngle?:number;endAngle?:number;name?:string;position?:CadPoint;xScale?:number;yScale?:number;rotation?:number;rowCount?:number;columnCount?:number;rowSpacing?:number;columnSpacing?:number};
type Matrix=[number,number,number,number,number,number];
const identity:Matrix=[1,0,0,1,0,0];
const point=(m:Matrix,p:CadPoint)=>({x:m[0]*p.x+m[2]*p.y+m[4],y:m[1]*p.x+m[3]*p.y+m[5]});
const compose=(a:Matrix,b:Matrix):Matrix=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
function segment(a:CadPoint&{bulge?:number},b:CadPoint){
 const bulge=a.bulge??0;if(Math.abs(bulge)<1e-8)return [b];
 const dx=b.x-a.x,dy=b.y-a.y,chord=Math.hypot(dx,dy);if(!chord)return [b];
 const offset=chord*(1-bulge*bulge)/(4*bulge),cx=(a.x+b.x)/2-dy/chord*offset,cy=(a.y+b.y)/2+dx/chord*offset,r=Math.hypot(a.x-cx,a.y-cy),start=Math.atan2(a.y-cy,a.x-cx),angle=4*Math.atan(bulge),steps=Math.min(96,Math.max(2,Math.ceil(Math.abs(angle)/(Math.PI/24))));
 return Array.from({length:steps},(_,k)=>({x:cx+r*Math.cos(start+angle*(k+1)/steps),y:cy+r*Math.sin(start+angle*(k+1)/steps)}));
}
export function parseCadPlan(source:string):CadPlan{
 if(source.length>8000000||source.split('\n').length>500000)throw new Error('Choose a DXF under 8 MB with fewer than 250,000 groups.');
 if(source.startsWith('AutoCAD Binary DXF')||!source.trimEnd().endsWith('EOF'))throw new Error('Export an ASCII DXF drawing with an EOF marker. Binary DXF and DWG are not supported.');
 const parsed=new DxfParser().parseSync(source);if(!parsed)throw new Error('This DXF could not be read.');const doc=parsed;
 const strokes:CadStroke[]=[];let ignored=0,visited=0;
 function walk(entities:Entity[],matrix:Matrix,inherit='0',depth=0){
  if(depth>8)throw new Error('Nested CAD blocks exceed eight levels.');
  for(const e of entities){if(++visited>50000)throw new Error('This drawing has too many entities. Export the kitchen plan only.');
   const layer=e.layer&&e.layer!=='0'?e.layer:inherit;
   if(doc.tables?.layer?.layers[layer]?.visible===false)continue;
   if(e.type==='INSERT'){
    const block=doc.blocks?.[e.name??''];if(!block){ignored++;continue}
    const angle=(e.rotation??0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),sx=e.xScale??1,sy=e.yScale??1,origin=block.position??{x:0,y:0};
    const cols=e.columnCount??1,rows=e.rowCount??1;if(cols*rows>1000)throw new Error('CAD block array is too large.');
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
     const a=c*sx,b=s*sx,d=c*sy,k=-s*sy,ox=col*(e.columnSpacing??0),oy=row*(e.rowSpacing??0);
     walk(block.entities as Entity[],compose(matrix,[a,b,k,d,(e.position?.x??0)-a*origin.x-k*origin.y+c*ox-s*oy,(e.position?.y??0)-b*origin.x-d*origin.y+s*ox+c*oy]),layer,depth+1);
    }continue;
   }
   let points:CadPoint[]=[];
   if(['LINE','LWPOLYLINE','POLYLINE'].includes(e.type)&&e.vertices?.length){points=[e.vertices[0]];for(let n=1;n<e.vertices.length;n++)points.push(...segment(e.vertices[n-1],e.vertices[n]));if(e.shape)points.push(...segment(e.vertices[e.vertices.length-1],e.vertices[0]));}
   else if(['ARC','CIRCLE'].includes(e.type)&&e.center&&Number.isFinite(e.radius)){
    const start=e.type==='CIRCLE'?0:e.startAngle??0,end=e.endAngle??0;if(!Number.isFinite(start)||!Number.isFinite(end))throw new Error('The drawing contains invalid arc angles.');let angle=e.type==='CIRCLE'?Math.PI*2:((end-start)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);if(angle===0)angle=Math.PI*2;
    const count=Math.max(8,Math.ceil(angle/(Math.PI/32)));points=Array.from({length:count+1},(_,n)=>({x:e.center!.x+e.radius!*Math.cos(start+angle*n/count),y:e.center!.y+e.radius!*Math.sin(start+angle*n/count)}));
   }else{ignored++;continue}
   points=points.map(p=>point(matrix,p));if(points.length<2||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw new Error('The drawing contains invalid coordinates.');strokes.push({layer,points});
  }
 }
 walk(doc.entities as Entity[],identity);if(!strokes.length)throw new Error('No supported plan lines were found. Use LINE, POLYLINE, ARC or CIRCLE entities.');
 const units:Record<number,CadPlan['unit']>={1:'in',4:'mm',5:'cm',6:'m'};
 return {strokes,layers:[...new Set(strokes.map(s=>s.layer))].sort(),unit:units[Number(doc.header?.$INSUNITS)]??'unknown',ignored};
}
export function cadPlanView(plan:CadPlan,layers:string[],unit:Exclude<CadPlan['unit'],'unknown'>){
 const strokes=plan.strokes.filter(s=>layers.includes(s.layer));if(!strokes.length)throw new Error('Select at least one drawing layer.');
 const points=strokes.flatMap(s=>s.points);let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const p of points){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y)}
 const scale={mm:1,cm:10,m:1000,in:25.4}[unit],widthMm=(maxX-minX)*scale,depthMm=(maxY-minY)*scale;
 if(widthMm<100||depthMm<100||widthMm>200000||depthMm>200000)throw new Error('Check the CAD units and selected layers. Plan dimensions must be between 100 mm and 200 m.');
 const width=maxX-minX,height=maxY-minY,paths=strokes.map(s=>'<polyline points="'+s.points.map(p=>`${p.x-minX},${maxY-p.y}`).join(' ')+'"/>').join('');
 return {widthMm,depthMm,svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><g fill="none" stroke="#434951" stroke-width="${Math.max(width,height)/1200}" stroke-linejoin="round">${paths}</g></svg>`};
}
