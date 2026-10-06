import {JoineryItem,Project} from '@/types/model';
import {newId} from './id';
import {islandWorktops} from './kitchenConfig';
import {newItem} from './defaults';
import {footprint,normalizeRotation} from './geometry';
const BASES=new Set(['Base cabinet','Drawer unit','Sink base','Hob base','Corner cabinet','Dishwasher','Washing machine','Kitchen island','Wine rack','Filler panel','End panel']);
export function generateWorktops(p:Project,overhang=30,thickness=38):JoineryItem[]{
  const bases=p.items.filter(i=>BASES.has(i.type)&&i.type!=='Kitchen island'&&i.visible!==false),remaining=new Set(bases.map(i=>i.id)),tops:JoineryItem[]=[],usedPrevious=new Set<string>();
  for(const start of bases){if(!remaining.has(start.id))continue;const rot=normalizeRotation(start.rotation),horizontal=rot%180===0,run:JoineryItem[]=[start];remaining.delete(start.id);
    // Connected runs only: never span a doorway or a disconnected cabinet group.
    let changed=true;while(changed){changed=false;for(const i of bases){if(!remaining.has(i.id)||normalizeRotation(i.rotation)!==rot||Math.abs(i.y+i.height-start.y-start.height)>5)continue;const f=footprint(i);const near=run.some(j=>{const g=footprint(j),along=horizontal?Math.max(i.x,j.x)-Math.min(i.x+f.width,j.x+g.width):Math.max(i.z,j.z)-Math.min(i.z+f.depth,j.z+g.depth),cross=horizontal?Math.abs(i.z-j.z):Math.abs(i.x-j.x);return along<=Math.max(60,p.rules.componentGap+1)&&cross<=40});if(near){run.push(i);remaining.delete(i.id);changed=true}}}
    const pad=Math.max(0,Math.min(300,overhang)),c=p.rules.wallClearance;
    let x=Math.min(...run.map(i=>i.x)),z=Math.min(...run.map(i=>i.z)),right=Math.max(...run.map(i=>i.x+footprint(i).width)),front=Math.max(...run.map(i=>i.z+footprint(i).depth));
    if(start.type!=='Kitchen island'&&rot===0)front+=pad;else if(start.type!=='Kitchen island'&&rot===180)z-=pad;else if(start.type!=='Kitchen island'&&rot===90)right+=pad;else if(start.type!=='Kitchen island')x-=pad;
    if(start.type==='Kitchen island'){x-=pad;z-=pad;right+=pad;front+=pad}
    x=Math.max(c,x);z=Math.max(0,z);right=Math.min(p.roomWidth-c,right);front=Math.min(p.roomDepth,front);
    const sourceUnitIds=run.map(i=>i.id).sort(),old=p.items.find(i=>i.type==='Worktop'&&i.sourceUnitIds?.slice().sort().join('|')===sourceUnitIds.join('|'))??p.items.find(i=>i.type==='Worktop'&&!usedPrevious.has(i.id)&&i.sourceUnitIds?.some(id=>sourceUnitIds.includes(id)))??p.items.find(i=>i.type==='Worktop'&&!i.sourceUnitIds&&normalizeRotation(i.rotation)===rot&&Math.abs(i.y-start.y-start.height)<5&&i.x<=x+10&&i.z<=z+10);
    if(old)usedPrevious.add(old.id);
    const name=old?.name??'Auto worktop · Section '+String.fromCharCode(65+tops.length);
    tops.push({...newItem('Worktop'),...old,name,sourceUnitIds,id:old?.id??newId(),x,z,y:start.y+start.height,width:horizontal?right-x:front-z,depth:horizontal?front-z:right-x,height:thickness,rotation:rot,wallSide:start.wallSide,worktopFinishedEdges:old?.worktopFinishedEdges??['front','left','right']});
  }
  // Butt adjoining runs at a common boundary. A corner slab owns its footprint.
  for(const a of tops)for(const b of tops){if(a===b||normalizeRotation(a.rotation)%180===normalizeRotation(b.rotation)%180||Math.abs(a.y-b.y)>5)continue;const af=footprint(a),bf=footprint(b);if(a.rotation%180!==0)continue;
    const overlapX=Math.min(a.x+af.width,b.x+bf.width)-Math.max(a.x,b.x),overlapZ=Math.min(a.z+af.depth,b.z+bf.depth)-Math.max(a.z,b.z);if(overlapX<=0||overlapZ<=0)continue;
    if(b.z>=a.z&&b.z+bf.depth>a.z+af.depth){const trim=a.z+af.depth-b.z;b.z+=trim;b.width-=trim}else if(b.z<a.z&&b.z+bf.depth<=a.z+af.depth)b.width=Math.max(1,a.z-b.z);
  }
  return [...tops.filter(t=>t.width>=100&&t.depth>=100),...p.items.flatMap(islandWorktops)];
}

// Automatic mode is explicit; independent manually drawn tops are retained otherwise.
export function connectedWorktopItems(p:Project,items:JoineryItem[]):JoineryItem[]{
 if(!p.autoWorktops)return items;
 const previous=p.items.filter(i=>i.type==="Worktop"&&i.sourceUnitIds?.length);
 const generated=generateWorktops({...p,items},p.autoWorktopOverhang??30,previous[0]?.height??38);
 return [...items.filter(i=>i.type!=="Worktop"),...generated];
}
