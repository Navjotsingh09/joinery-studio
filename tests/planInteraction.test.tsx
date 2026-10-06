import React from 'react';
import {describe,it,expect,vi,beforeEach} from 'vitest';
const hooks=vi.hoisted(()=>({refs:[] as any[]}));
vi.mock('react',async()=>({...await vi.importActual<any>('react'),useRef:(value:any)=>{const ref={current:value};hooks.refs.push(ref);return ref},useState:(value:any)=>[value,vi.fn()]}));
import {Drawing2D} from '@/components/Drawing2D';
import {newProject,newItem} from '@/lib/defaults';
Object.assign(globalThis,{React});
function setup(){
 const project=newProject();project.items=[{...newItem('Base cabinet'),id:'source',x:500,z:500}];
 const copy={...project.items[0],id:'copy',x:1800,name:'Base cabinet copy'};
 const props={project,view:'top' as const,selected:'source',onSelect:vi.fn(),onDuplicate:vi.fn(()=>copy),onMove:vi.fn(),onResize:vi.fn(),onRotate:vi.fn(),onMoveStart:vi.fn(),onContext:vi.fn(),onDropType:vi.fn()};
 const svg=Drawing2D(props);const focus=vi.fn(),capture=vi.fn();hooks.refs[0].current={focus,setPointerCapture:capture,createSVGPoint:()=>({x:0,y:0,matrixTransform(){return{x:this.x,y:this.y}}}),getScreenCTM:()=>({inverse:()=>({})})};
 function find(node:any):any{if(!node)return;if(Array.isArray(node)){for(const child of node){const found=find(child);if(found)return found}}else if(node.props){if(node.props.className?.startsWith('drawingItem'))return node;return find(node.props.children)}}
 const unit=find(svg);const event=(altKey=false,x=300)=>({altKey,clientX:x,clientY:300,pointerId:1,preventDefault:vi.fn(),stopPropagation:vi.fn()});
 return{props,svg,unit,event,focus,capture};
}
beforeEach(()=>{hooks.refs=[]});
describe('plan pointer regressions',()=>{
 it('Alt drag captures on the stable canvas and moves only one copy',()=>{const t=setup();t.unit.props.onPointerDown(t.event(true));t.svg.props.onPointerMove(t.event(true,430));t.svg.props.onPointerMove(t.event(true,460));expect(t.props.onDuplicate).toHaveBeenCalledTimes(1);expect(t.props.onMove.mock.calls.every(call=>call[0]==='copy')).toBe(true);expect(t.focus).toHaveBeenCalled();expect(t.capture).toHaveBeenCalledWith(1);expect(t.props.onMoveStart).not.toHaveBeenCalled();t.svg.props.onPointerUp();t.svg.props.onPointerMove(t.event(true,500));expect(t.props.onMove).toHaveBeenCalledTimes(2)});
 it('supports pressing Alt after pointer-down without moving the original',()=>{const t=setup();t.unit.props.onPointerDown(t.event());t.svg.props.onPointerMove(t.event(true,430));t.svg.props.onPointerMove(t.event(true,460));expect(t.props.onDuplicate).toHaveBeenCalledTimes(1);expect(t.props.onMove.mock.calls.every(call=>call[0]==='copy')).toBe(true);expect(t.props.onMoveStart).not.toHaveBeenCalled()});
 it('creates a single undo checkpoint for a normal drag',()=>{const t=setup();t.unit.props.onPointerDown(t.event());t.svg.props.onPointerMove(t.event(false,430));t.svg.props.onPointerMove(t.event(false,460));expect(t.props.onMoveStart).toHaveBeenCalledTimes(1);expect(t.props.onDuplicate).not.toHaveBeenCalled()});
});
