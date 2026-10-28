import {describe,it,expect} from "vitest";
import {newItem,newProject} from "@/lib/defaults";
import {createScenarioPlan} from "@/lib/scenarios";
import {useStudio} from "@/lib/store";
import {clampItemToRoom,moveItemOnAxes} from "@/lib/geometry";
import {worktopCutouts} from "@/lib/renderGeometry";
import {calibratedWidth,referenceDepth} from "@/lib/drawingReference";
import {fromMm,toMm} from "@/lib/units";
import {isProjectBackup} from "@/lib/backup";

describe("blank kitchen lifecycle",()=>{
  it("keeps the kitchen type, room and undo history after deleting its last unit",()=>{
    const p={...newProject(),...createScenarioPlan("kitchen","blank",4200,2400,3400),designKind:"kitchen" as const};
    expect(p.items).toEqual([]);
    useStudio.setState({projects:[p],activeId:p.id,past:[],future:[]});
    const i={...newItem("Base cabinet"),x:0,z:0};useStudio.getState().addItem(i);useStudio.getState().deleteItem(i.id);
    expect(useStudio.getState().projects[0]).toMatchObject({designKind:"kitchen",roomWidth:4200,items:[]});
    useStudio.getState().undo();expect(useStudio.getState().projects[0].items[0].id).toBe(i.id);
  });
  it("does not change a measured elevation while moving across the floor",()=>{
    const p=newProject(),i={...newItem("Worktop"),y:870,x:125,z:225};
    expect(clampItemToRoom(i,p).y).toBe(870);
    expect(clampItemToRoom(i,p,false)).toMatchObject({x:125,y:870,z:225});
  });
});
describe("measurement conversion",()=>{
  it.each([["cm",60,600],["in",24,609.6],["mm",870,870]] as const)("converts %s input without changing the physical model",(unit,value,mm)=>{
    expect(toMm(value,unit)).toBe(mm);expect(fromMm(mm,unit)).toBe(value);
  });
});
describe("axis-specific measured movement",()=>{
  it.each([0,90,180,270])("snaps the selected axis without shifting other measurements at %i degrees",rotation=>{
    const p=newProject(),i={...newItem("Wall cabinet"),x:609.6,y:1470.2,z:225.4,rotation};
    p.rules.snap=25;const raw={x:676.9,y:1527.1,z:297.2};
    expect(moveItemOnAxes(i,p,raw,["x"])).toMatchObject({x:675,y:1470.2,z:225.4,rotation});
    expect(moveItemOnAxes(i,p,raw,["y"])).toMatchObject({x:609.6,y:1525,z:225.4,rotation});
    expect(moveItemOnAxes(i,p,raw,["z"])).toMatchObject({x:609.6,y:1470.2,z:300,rotation});
  });
  it("clamps the dragged axis to the room and honours disabled snapping",()=>{
    const p=newProject(),i={...newItem("Base cabinet"),x:609.6,y:0,z:225.4};p.rules.snap=0;
    expect(moveItemOnAxes(i,p,{x:10000,y:0,z:225.4},["x"]).x).toBe(p.roomWidth-p.rules.wallClearance-i.width);
    expect(moveItemOnAxes(i,p,{x:676.987,y:0,z:225.4},["x"])).toMatchObject({x:676.987,z:225.4});
  });
});
describe("automatic worktop apertures",()=>{
  const top={...newItem("Worktop"),x:0,y:870,z:0,width:2400,height:20,depth:625};
  it("cuts both a sink and hob, and follows their changed positions",()=>{
    const sink={...newItem("Sink base"),x:0,y:0,z:0,width:700,height:870},hob={...newItem("Hob base"),x:1400,y:0,z:0,width:700,height:870};
    expect(worktopCutouts(top,[sink,hob])).toHaveLength(2);
    expect(worktopCutouts(top,[{...hob,x:1300}])[0].x).toBeCloseTo(.45);
    expect(worktopCutouts(top,[{...hob,visible:false}])).toEqual([]);
    expect(worktopCutouts({...top,y:1200},[hob])).toEqual([]);
  });
  it.each([0,90,180,270])("keeps a rotated aperture inside its worktop at %i degrees",rotation=>{
    const t={...top,width:1200,depth:625,rotation},hob={...newItem("Hob base"),width:600,depth:600,height:870,x:0,y:0,z:0,rotation};
    const hole=worktopCutouts(t,[hob])[0];expect(hole).toBeDefined();expect(Math.abs(hole.x)+hole.width/2).toBeLessThan(t.width/2000);expect(Math.abs(hole.z)+hole.depth/2).toBeLessThan(t.depth/2000);
  });
});
describe("PDF plan calibration and persistence",()=>{
  const drawing={name:"Survey",dataUrl:"data:image/webp;base64,AAAA",pixelWidth:2000,pixelHeight:1000,widthMm:4000,x:-100,z:100,opacity:.45,visible:true};
  it("calibrates diagonals using the actual page aspect ratio",()=>{expect(calibratedWidth({x:.1,y:.1},{x:.4,y:.9},2000,2000,1000)).toBe(4000);expect(referenceDepth(drawing)).toBe(2000)});
  it("rejects zero distance and coincident points",()=>{expect(()=>calibratedWidth({x:0,y:0},{x:0,y:0},1000,2000,1000)).toThrow();expect(()=>calibratedWidth({x:0,y:0},{x:1,y:0},0,2000,1000)).toThrow()});
  it("preserves calibration in JSON, saved revisions and undo",()=>{
    const p={...newProject(),designKind:"kitchen" as const,displayUnit:"in" as const,drawingReference:drawing};
    useStudio.setState({projects:[p],activeId:p.id,past:[],future:[]});useStudio.getState().saveRevision();
    const id=useStudio.getState().projects[0].revisions[0].id;useStudio.getState().updateProject({drawingReference:undefined});useStudio.getState().restoreRevision(id);
    const roundtrip=JSON.parse(JSON.stringify(useStudio.getState().projects));expect(isProjectBackup(roundtrip)).toBe(true);expect(roundtrip[0].drawingReference).toEqual(drawing);
    roundtrip[0].drawingReference.dataUrl="javascript:alert(1)";expect(isProjectBackup(roundtrip)).toBe(false);
  });
});
