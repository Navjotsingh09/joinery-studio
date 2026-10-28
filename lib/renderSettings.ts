import {LightingSettings,SavedCamera} from '@/types/model';
export const DEFAULT_LIGHTING:LightingSettings={exposure:.9,daylight:1.7,warmLights:true,ceiling:false};
const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
const vec=(v:unknown)=>Array.isArray(v)&&v.length===3&&v.every(finite);
export function validCamera(v:unknown):v is SavedCamera{const c=v as SavedCamera;return !!c&&typeof c.id==='string'&&typeof c.name==='string'&&c.name.length<=80&&vec(c.position)&&vec(c.target)&&vec(c.up)&&finite(c.fov)&&c.fov>=10&&c.fov<=100&&Math.hypot(...c.up)>.1&&c.position.some((n,k)=>Math.abs(n-c.target[k])>.001)}
export function validLighting(v:unknown):v is LightingSettings{const l=v as LightingSettings;return !!l&&finite(l.exposure)&&l.exposure>=.2&&l.exposure<=2&&finite(l.daylight)&&l.daylight>=0&&l.daylight<=4&&typeof l.warmLights==='boolean'&&typeof l.ceiling==='boolean'}
