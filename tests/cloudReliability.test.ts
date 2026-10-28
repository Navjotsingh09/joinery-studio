import {beforeEach,describe,it,expect,vi} from 'vitest';
const db=vi.hoisted(()=>({auth:{getUser:vi.fn()},rpc:vi.fn(),from:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:()=>db,hasSupabase:()=>true}));
import {saveCloud,loadCloud,clearCloudSession} from '@/lib/cloud';
import {newProject,newItem} from '@/lib/defaults';
describe('complete atomic cloud saves',()=>{
 beforeEach(()=>{vi.clearAllMocks();clearCloudSession('account-a');db.auth.getUser.mockResolvedValue({data:{user:{id:'account-a'}}})});
 it('writes every setting and revision in one RPC, including worktop edges',async()=>{const p=newProject();p.items=[{...newItem('Worktop'),worktopEdge:'rounded'}];db.rpc.mockResolvedValue({data:1,error:null});await saveCloud(p);expect(db.rpc).toHaveBeenCalledTimes(1);expect(db.from).not.toHaveBeenCalled();expect(db.rpc.mock.calls[0][1].design).toEqual(p)});
 it('serializes overlapping saves and advances optimistic versions',async()=>{const p=newProject();let release:(value:unknown)=>void=()=>{};db.rpc.mockImplementationOnce(()=>new Promise(resolve=>release=resolve)).mockResolvedValueOnce({data:2,error:null});const first=saveCloud(p),second=saveCloud({...p,name:'Later'});await vi.waitFor(()=>expect(db.rpc).toHaveBeenCalledTimes(1));release({data:1,error:null});await Promise.all([first,second]);expect(db.rpc.mock.calls[1][1].expected_version).toBe(1);expect(db.rpc.mock.calls[1][1].design.name).toBe('Later')});
 it('reports conflicts without falling back to non-atomic writes',async()=>{db.rpc.mockResolvedValue({data:null,error:{message:'Save conflict'}});await expect(saveCloud(newProject())).rejects.toThrow('another tab');expect(db.from).not.toHaveBeenCalled()});
 it('cancels a queued save after account switching',async()=>{const pending=saveCloud(newProject());clearCloudSession('account-b');db.auth.getUser.mockResolvedValue({data:{user:{id:'account-b'}}});await expect(pending).rejects.toThrow('Account changed');expect(db.rpc).not.toHaveBeenCalled()});
 it('restores full snapshots and their server version',async()=>{const p=newProject();p.items=[{...newItem('Worktop'),worktopEdge:'rounded'}];db.from.mockReturnValue({select:()=>({order:async()=>({data:[{id:p.id,design_snapshot:p,save_version:7}],error:null})})});const projects=await loadCloud();expect(projects[0].items[0].worktopEdge).toBe('rounded');expect(projects[0].cloudVersion).toBe(7)});
});
