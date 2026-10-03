import {Project} from '@/types/model';
import {footprint} from '@/lib/geometry';
import {material} from '@/lib/materials';

/** A live plan derived from saved objects, never a generic room illustration. */
export function ProjectPreview({project}:{project:Project}){
  const scale=Math.min(330/Math.max(1,project.roomWidth),148/Math.max(1,project.roomDepth)),w=project.roomWidth*scale,d=project.roomDepth*scale,x=(400-w)/2,z=(190-d)/2;
  const items=project.items.filter(i=>i.visible!==false).sort((a,b)=>a.y-b.y);
  return <svg viewBox="0 0 400 190" role="img" aria-label={`Plan preview of ${project.name}, ${items.length} objects`}>
    <rect width="400" height="190" fill="#eeece4"/>
    <rect x={x-3} y={z-3} width={w+6} height={d+6} rx="2" fill="#b8b5aa"/>
    <rect x={x} y={z} width={w} height={d} fill={material(project.floorMaterialId??'floor-oak',project.customMaterials).colour}/>
    <svg x={x} y={z} width={w} height={d} viewBox={`0 0 ${project.roomWidth} ${project.roomDepth}`} overflow="hidden">
      {items.map(i=>{const f=footprint(i),m=material(i.worktopMaterialId??i.doorMaterialId??i.materialId,project.customMaterials);return <g key={i.id}><rect x={i.x} y={i.z} width={f.width} height={f.depth} fill={m.colour} stroke="#393d34" strokeWidth={Math.max(6,1/scale)} opacity={i.y>1000?.65:1}/>{i.doors>1&&Array.from({length:Math.min(12,i.doors)-1},(_,n)=><line key={n} x1={i.x+f.width*(n+1)/Math.min(12,i.doors)} x2={i.x+f.width*(n+1)/Math.min(12,i.doors)} y1={i.z} y2={i.z+f.depth} stroke="#54584c" strokeWidth={Math.max(4,.5/scale)}/>)}</g>})}
    </svg>
    <text x="12" y="178" fontSize="8" fill="#454b3f" fontFamily="Arial">{project.roomWidth} × {project.roomDepth} mm · PLAN</text>
    {!items.length&&<text x="200" y="98" textAnchor="middle" fontSize="12" fill="#414739">Empty room · ready to design</text>}
  </svg>;
}
