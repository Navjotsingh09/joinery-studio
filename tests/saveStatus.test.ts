import {describe,it,expect} from 'vitest';
import {trackedStorage,getLocalSaveStatus} from '@/lib/saveStatus';
describe('local save reporting',()=>{
  it('reports quota failures and recovers after a successful write',()=>{let fail=true;const store=trackedStorage({setItem(){if(fail)throw new Error('quota')},getItem(){return null},removeItem(){},clear(){},key(){return null},length:0});expect(()=>store.setItem('project','data')).not.toThrow();expect(getLocalSaveStatus()).toBe('error');fail=false;store.setItem('project','data');expect(getLocalSaveStatus()).toBe('saved')});
});
