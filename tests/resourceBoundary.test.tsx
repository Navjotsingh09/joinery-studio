import React from 'react';
import {it,expect,vi} from 'vitest';
import {create} from '@react-three/test-renderer';
import {ResourceBoundary} from '@/components/ResourceBoundary';
import {newProject} from '@/lib/defaults';
import {assertSceneResourcesReady,retainSceneResource,setSceneResourceStatus} from '@/lib/sceneResources';
Object.assign(globalThis,{React,IS_REACT_ACT_ENVIRONMENT:true});
it('keeps the scene usable after an asset failure and permits export after a successful retry',async()=>{
 const resource={id:'texture:boundary-test',url:'/missing-image.png',label:'Uploaded stone',kind:'texture' as const},release=retainSceneResource(resource),errors=vi.spyOn(console,'error').mockImplementation(()=>{}),project={...newProject(),items:[]};
 function FailedAsset():React.ReactElement{throw new Error('Simulated image download failure')}
 const renderer=await create(<ResourceBoundary resource={resource} fallback={<mesh name="Procedural preview"/>}><FailedAsset/></ResourceBoundary>);
 try{expect(renderer.scene.instance.children[0].name).toBe('Procedural preview');expect(()=>assertSceneResourcesReady(project)).toThrow('Uploaded stone could not load');await renderer.update(<ResourceBoundary key="retry" resource={resource}><mesh name="Loaded stone"/></ResourceBoundary>);setSceneResourceStatus(resource,'ready');expect(renderer.scene.instance.children[0].name).toBe('Loaded stone');expect(()=>assertSceneResourcesReady(project)).not.toThrow()}finally{await renderer.unmount();release();errors.mockRestore()}
});
