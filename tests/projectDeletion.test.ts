import {beforeEach,describe,it,expect} from "vitest";
import {useStudio} from "@/lib/store";
import {newProject} from "@/lib/defaults";

describe("project deletion",()=>{
  beforeEach(()=>useStudio.setState({past:[],future:[],selectedId:null}));
  it("deletes the requested old project without switching the current project",()=>{
    const current=newProject("Current"),old=newProject("Old");
    useStudio.setState({projects:[current,old],activeId:current.id});
    useStudio.getState().deleteProject(old.id);
    expect(useStudio.getState().projects.map(p=>p.id)).toEqual([current.id]);
    expect(useStudio.getState().activeId).toBe(current.id);
  });
  it("switches to a remaining project when deleting the active one",()=>{
    const current=newProject("Current"),other=newProject("Other");
    useStudio.setState({projects:[current,other],activeId:current.id,selectedId:"old-selection"});
    useStudio.getState().deleteProject(current.id);
    expect(useStudio.getState().activeId).toBe(other.id);
    expect(useStudio.getState().selectedId).toBeNull();
  });
  it("keeps a usable blank workspace after the last project is removed",()=>{
    const old=newProject("Old");useStudio.setState({projects:[old],activeId:old.id});
    useStudio.getState().deleteProject(old.id);
    expect(useStudio.getState().projects).toHaveLength(1);
    expect(useStudio.getState().projects[0].id).not.toBe(old.id);
    expect(useStudio.getState().activeId).toBe(useStudio.getState().projects[0].id);
  });
});
