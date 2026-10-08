import {Project} from '@/types/model';
import {requiredKitchenAssets} from './kitchenAssets';
export type SceneResource={id:string;url:string;label:string;kind:'model'|'texture'|'environment';status:'loading'|'ready'|'error';users:number};
const resources=new Map<string,SceneResource>(),listeners=new Set<()=>void>();
let snapshot:SceneResource[]=[];
const publish=()=>{snapshot=[...resources.values()].filter(r=>r.users>0).map(r=>({...r}));listeners.forEach(fn=>fn())};
export const subscribeSceneResources=(fn:()=>void)=>{listeners.add(fn);return ()=>{listeners.delete(fn)}};
export const getSceneResources=()=>snapshot;
export const modelResourceId=(name:string)=>'model:'+name;
export function retainSceneResource(value:Omit<SceneResource,'status'|'users'>){const r=resources.get(value.id);resources.set(value.id,r?{...r,users:r.users+1}:{...value,status:'loading',users:1});publish();return ()=>{const current=resources.get(value.id);if(!current)return;if(current.users<=1)resources.delete(value.id);else resources.set(value.id,{...current,users:current.users-1});publish()}}
export function setSceneResourceStatus(value:Omit<SceneResource,'status'|'users'>,status:SceneResource['status']){const r=resources.get(value.id);if(r?.status===status)return;resources.set(value.id,{...value,status,users:r?.users??0});publish()}
export function sceneResourceState(project:Project){
 const active=getSceneResources(),models=requiredKitchenAssets(project),wanted=new Set(models.map(modelResourceId));
 const relevant=active.filter(r=>r.kind!=='model'||wanted.has(r.id));
 const missing=models.filter(name=>!relevant.some(r=>r.id===modelResourceId(name)));
 return {failed:relevant.filter(r=>r.status==='error'),loading:relevant.filter(r=>r.status==='loading').length+missing.length};
}
export function assertSceneResourcesReady(project:Project){const s=sceneResourceState(project);if(s.failed.length)throw new Error(s.failed.map(r=>r.label).join(', ')+' could not load. Choose Retry loading before exporting.');if(s.loading)throw new Error('Materials, lighting and component models are still loading. Try exporting when loading finishes.')}
