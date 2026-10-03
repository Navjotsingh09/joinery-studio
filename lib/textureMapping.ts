import {Material} from '@/types/model';
export function textureDimensions(m?:Material){return {width:Math.max(50,Math.min(10000,m?.textureWidthMm??650))/1000,height:Math.max(50,Math.min(10000,m?.textureHeightMm??1200))/1000,rotation:m?.textureRotation===90?90:0};}
// Inputs are physical metres so cut-out worktops and solid panels share grain scale.
export function textureUV(x:number,y:number,m?:Material):[number,number]{const d=textureDimensions(m);return d.rotation===90?[y/d.width,-x/d.height]:[x/d.width,y/d.height];}
