"use client";
import {MeasureInput} from "./MeasureInput";
import {JoineryItem} from "@/types/model";
import {HANDLE_FINISHES,ISLAND_STYLES,islandAppliance} from "@/lib/kitchenConfig";
type Props={item:JoineryItem;onChange:(patch:Partial<JoineryItem>)=>void;onApplyFronts?:()=>void;onApplyHandles?:()=>void};
export function KitchenOptions({item:i,onChange,onApplyFronts,onApplyHandles}:Props){
  const number=(key:"handleLength"|"plinthHeight"|"topThickness"|"topOverhang"|"seatingOverhang"|"counterExtension",label:string,value:number,min:number,max:number)=><label key={key}>{label} (mm)<MeasureInput value={i[key]??value} min={min} max={max} onCommit={n=>onChange({[key]:n})}/></label>;
  const hob=<><label>Hob type<select value={i.hobStyle??"induction"} onChange={e=>onChange({hobStyle:e.target.value as JoineryItem["hobStyle"]})}>{["induction","gas","ceramic","grill"].map(v=><option key={v}>{v}</option>)}</select></label><label>Cooking zones<select value={i.hobZones??4} onChange={e=>onChange({hobZones:Number(e.target.value) as 2|4|5})}>{[2,4,5].map(v=><option key={v}>{v}</option>)}</select></label></>;
  return <section className="inspectorGroup"><h4>Kitchen specification</h4>
    <div className="fieldGrid2">{onApplyFronts&&<button onClick={onApplyFronts}>Use these fronts throughout</button>}{onApplyHandles&&<button onClick={onApplyHandles}>Use these handles throughout</button>}</div>
    {!["None","Handleless","Push-to-open"].includes(i.hardware)&&<><label>Handle finish<select value={i.handleFinish??"Brushed steel"} onChange={e=>onChange({handleFinish:e.target.value as JoineryItem["handleFinish"]})}>{HANDLE_FINISHES.map(v=><option key={v}>{v}</option>)}</select></label>{number("handleLength","Handle length",160,32,400)}</>}
    {i.type!=="Wall cabinet"&&number("plinthHeight","Plinth height",100,0,250)}
    {i.type==="Tall cabinet"&&<label>Larder storage<select value={i.larderLayout??"shelves"} onChange={e=>onChange({larderLayout:e.target.value as JoineryItem["larderLayout"]})}><option value="shelves">Adjustable shelves</option><option value="pull-out">Full-height pull-out baskets</option><option value="internal-drawers">Internal drawer pantry</option></select></label>}
    {i.type==="Hob base"&&hob}
    {i.type==="Kitchen island"&&<><label>Island layout<select value={i.islandStyle??"storage"} onChange={e=>{const style=e.target.value as JoineryItem["islandStyle"];onChange({islandStyle:style,islandAppliance:style==="hob"?"hob":style==="grill"?"grill":islandAppliance(i)})}}>{ISLAND_STYLES.map(v=><option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}{v==="breakfast"?" counter":v==="dining"?" extension":" island"}</option>)}</select></label>
    <label>Island storage fronts<select value={i.islandFront??"drawers"} onChange={e=>onChange({islandFront:e.target.value as JoineryItem["islandFront"]})}><option value="drawers">Drawers</option><option value="doors">Doors with shelves</option></select></label>
    {number("topThickness","Worktop thickness",32,6,100)}
    <label>Island worktop edge<select value={i.worktopEdge??"rounded"} onChange={e=>onChange({worktopEdge:e.target.value as JoineryItem["worktopEdge"]})}><option value="square">Square</option><option value="rounded">Rounded</option></select></label>
    <label>Island worktop finish<select value={["Matt","Textured matt","Semi-gloss","Gloss","Oiled"].includes(i.finish)?i.finish:"Matt"} onChange={e=>onChange({finish:e.target.value})}>{["Matt","Textured matt","Semi-gloss","Gloss","Oiled"].map(v=><option key={v}>{v}</option>)}</select></label>{number("topOverhang","Edge overhang",30,0,150)}
    {i.islandStyle==="breakfast"&&<>{number("seatingOverhang","Breakfast seating overhang",300,150,450)}<label>Breakfast seating side<select value={i.seatingSide??"back"} onChange={e=>onChange({seatingSide:e.target.value as "back"|"front"})}><option value="back">Back of island</option><option value="front">Front of island</option></select></label></>}
    {["dining","extended"].includes(i.islandStyle??"")&&number("counterExtension","Counter extension",900,300,1800)}
    <label>Integrated island appliance<select value={islandAppliance(i)} onChange={e=>onChange({islandAppliance:e.target.value as JoineryItem["islandAppliance"]})}>{["none","sink","hob","grill"].map(v=><option key={v}>{v}</option>)}</select></label>
    {islandAppliance(i)==="hob"&&hob}
    {islandAppliance(i)==="sink"&&<>{([ ["islandSinkStyle","Sink style",["Inset stainless","Undermount","Belfast ceramic"]],["islandSinkFinish","Sink finish",["Stainless steel","Black","White ceramic"]],["islandTapStyle","Tap style",["Arc mixer","Pull-out","Bridge","Square neck","Cross-handle mixer"]],["islandTapFinish","Tap finish",["Chrome","Brushed steel","Matt black","Brass"]] ] as const).map(([key,label,values])=><label key={key}>{label}<select value={i[key]??values[0]} onChange={e=>onChange({[key]:e.target.value})}>{values.map(v=><option key={v}>{v}</option>)}</select></label>)}</>}
    <p className="surfaceHelp">The counter and cutouts follow this island in 3D and drawings. Choose the breakfast seating side; extensions attach at the right end. Dining height is 740 mm.</p></>}
  </section>;
}
