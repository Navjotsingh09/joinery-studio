import React from 'react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
const hooks=vi.hoisted(()=>({states:[] as any[],refs:[] as any[],stateIndex:0,refIndex:0}));
vi.mock('react',async()=>({...await vi.importActual<any>('react'),useRef:(initial:any)=>{const n=hooks.refIndex++;return hooks.refs[n]??(hooks.refs[n]={current:initial})},useState:(initial:any)=>{const n=hooks.stateIndex++;if(!(n in hooks.states))hooks.states[n]=initial;return [hooks.states[n],(next:any)=>{hooks.states[n]=typeof next==='function'?next(hooks.states[n]):next}]},useEffect:(fn:any)=>fn()}));
import {MeasureInput} from '@/components/MeasureInput';
Object.assign(globalThis,{React});
function render(value:number,onCommit:(n:number)=>void,min=6,max=100){hooks.stateIndex=0;hooks.refIndex=0;return MeasureInput({value,min,max,onCommit}).props.children[0]}
beforeEach(()=>{hooks.states=[];hooks.refs=[]});
describe('measurement draft commit',()=>{
 it('allows typing a prefix below the minimum before committing the completed value',()=>{const commit=vi.fn();let input=render(32,commit);input.props.onChange({target:{value:'2'}});input=render(32,commit);expect(input.props.value).toBe('2');expect(commit).not.toHaveBeenCalled();input.props.onChange({target:{value:'20'}});input=render(32,commit);input.props.onBlur();expect(commit).toHaveBeenCalledWith(20)});
 it('does not restore the old field value after the store synchronously renders an accepted edit',()=>{let value=32;const commit=(n:number)=>{value=n;render(value,commit)};let input=render(value,commit);input.props.onChange({target:{value:'20'}});input=render(value,commit);input.props.onBlur();expect(value).toBe(20);expect(hooks.states[1]).toBe('20')});
 it('keeps invalid input visible with an error and leaves stored geometry unchanged',()=>{const commit=vi.fn();let input=render(32,commit);input.props.onChange({target:{value:'0'}});input=render(32,commit);input.props.onBlur();input=render(32,commit);expect(commit).not.toHaveBeenCalled();expect(input.props.value).toBe('0');expect(input.props['aria-invalid']).toBe(true)});
});
