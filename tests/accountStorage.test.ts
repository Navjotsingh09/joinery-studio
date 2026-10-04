import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createJSONStorage} from 'zustand/middleware';
import {switchAccountStorage,useStudio} from '@/lib/store';
import {newProject} from '@/lib/defaults';
const {entries,storage}=vi.hoisted(()=>{
 const entries=new Map<string,string>();
 const storage={getItem:(key:string)=>entries.get(key)??null,setItem:(key:string,value:string)=>{entries.set(key,value)},removeItem:(key:string)=>{entries.delete(key)}};
 Object.defineProperty(globalThis,'window',{value:{localStorage:storage},configurable:true,writable:true});
 return {entries,storage};
});
describe('account storage isolation',()=>{
 beforeEach(()=>{entries.clear();vi.stubGlobal('window',{localStorage:storage});useStudio.persist.setOptions({storage:createJSONStorage(()=>storage),name:'joinery-studio-v6:guest'})});
 afterEach(()=>vi.unstubAllGlobals());
 it('restores each account independently and clears undo history',async()=>{await switchAccountStorage('a');useStudio.getState().updateProject({name:'Private A'});useStudio.getState().saveRevision();await switchAccountStorage('b');expect(useStudio.getState().projects[0].name).toBe('New project');expect(useStudio.getState().past).toEqual([]);useStudio.getState().updateProject({name:'Private B'});await switchAccountStorage('a');expect(useStudio.getState().projects[0].name).toBe('Private A');await switchAccountStorage('b');expect(useStudio.getState().projects[0].name).toBe('Private B')});
 it('does not merge guest or legacy projects into an account',async()=>{const p=newProject('Guest private');useStudio.setState({projects:[p],activeId:p.id});entries.set('joinery-studio-v5',JSON.stringify({state:{projects:[p]}}));await switchAccountStorage('a');expect(useStudio.getState().projects.some(q=>q.id===p.id)).toBe(false);expect(entries.has('joinery-studio-v5')).toBe(true)});
 it('clears prior account memory even when browser storage is blocked',async()=>{const p=newProject('Account A');useStudio.setState({projects:[p],activeId:p.id});vi.stubGlobal('window',{localStorage:{getItem:()=>{throw new Error('Blocked')}}});await switchAccountStorage('b');expect(useStudio.getState().projects.some(q=>q.id===p.id)).toBe(false)});
});
