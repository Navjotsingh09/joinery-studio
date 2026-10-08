import {Material} from '@/types/model';

export type SurfaceMaps={colour:string;normal:string;roughness:string;width:number;height:number;tint:boolean};
const surface=(asset:string,width:number,height:number,tint=false):SurfaceMaps=>({colour:`/materials/pbr/${asset}-colour.jpg`,normal:`/materials/pbr/${asset}-normal.jpg`,roughness:`/materials/pbr/${asset}-roughness.jpg`,width,height,tint});
const oak=surface('oak_veneer_01',1800,3600,true),floor=surface('wood_floor',1700,1700),marble=surface('marble012',2000,2000);
// A supplied texture always takes priority over the photographed built-in finish.
export function surfaceMaps(m?:Material):SurfaceMaps|null{
  if(!m||m.textureDataUrl||m.textureImage)return null;
  if(m.category==='Woodgrain'||m.worktopStyle==='Wood'||['mdf','birch'].includes(m.id))return oak;
  if(m.id==='floor-oak'||m.id==='floor-walnut')return {...floor,tint:m.id==='floor-walnut'};
  if(m.id==='stone-light'||m.worktopStyle==='Marble')return marble;
  return null;
}
export function surfaceMapping(m:Material):Material{const p=surfaceMaps(m);return p?{...m,textureWidthMm:m.textureWidthMm??p.width,textureHeightMm:m.textureHeightMm??p.height}:m}
