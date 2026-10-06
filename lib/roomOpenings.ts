import {Project,WallSide} from '@/types/model';
import {isItemOnWall,wallItemRect} from './geometry';
export type WallCell={x:number;y:number;width:number;height:number};
// Subdivide the wall face and omit cells inside openings, including overlaps.
export function wallCells(p:Project,wall:WallSide):WallCell[]{
  const width=wall==='back'||wall==='front'?p.roomWidth:p.roomDepth,height=p.roomHeight;
  const holes=p.items.filter(i=>i.visible!==false&&['Window','Door opening'].includes(i.type)&&isItemOnWall(p,i,wall,140)).map(i=>wallItemRect(i,p,wall)).map(r=>({x:Math.max(0,r.left),y:Math.max(0,height-r.top-r.height),right:Math.min(width,r.left+r.width),top:Math.min(height,height-r.top)})).filter(r=>r.right>r.x&&r.top>r.y);
  const xs=[...new Set([0,width,...holes.flatMap(r=>[r.x,r.right])])].sort((a,b)=>a-b),ys=[...new Set([0,height,...holes.flatMap(r=>[r.y,r.top])])].sort((a,b)=>a-b),cells:WallCell[]=[];
  for(let a=1;a<xs.length;a++)for(let b=1;b<ys.length;b++){const x=(xs[a]+xs[a-1])/2,y=(ys[b]+ys[b-1])/2;if(!holes.some(h=>x>h.x&&x<h.right&&y>h.y&&y<h.top))cells.push({x:xs[a-1],y:ys[b-1],width:xs[a]-xs[a-1],height:ys[b]-ys[b-1]})}
  return cells;
}
