import {Project} from '@/types/model';
import {islandAppliance} from './kitchenConfig';
export const KITCHEN_ASSET_CREDITS=[
 {name:'Modern Faucet',author:'MattMump',url:'https://blendswap.com/blend/5176',license:'CC0',files:['cross-handle-mixer']},
 {name:'Kitchen Worktop',author:'MZiemys',url:'https://blendswap.com/blend/17672',license:'CC0',files:['gas-hob','inset-sink','square-mixer']},
 {name:'Kitchen Asset Library-Pack photoreal Vol.1',author:'Davilion',url:'https://blendswap.com/blend/25903',license:'CC0',files:['ceramic-mug','cooking-pot']}
];
export function requiredKitchenAssets(p:Project){
 const names=new Set<string>();
 function tap(style?:string){if(style==='Cross-handle mixer')names.add('cross-handle-mixer');if(style==='Square neck')names.add('square-mixer')}
 for(const i of p.items.filter(i=>i.visible!==false)){
  if(i.type==='Sink base'&&(i.productStyle??'Inset stainless')==='Inset stainless')names.add('inset-sink');
  if(i.type==='Hob base'&&i.hobStyle==='gas'&&(i.hobZones??4)===4)names.add('gas-hob');
  if(i.type==='Tap'||i.type.endsWith(' tap'))tap(i.productStyle);
  if(i.type==='Kitchen accessory')names.add(i.productStyle==='Cooking pot'?'cooking-pot':'ceramic-mug');
  if(i.type==='Kitchen island'){
   const appliance=islandAppliance(i);
   if(appliance==='sink'){if((i.islandSinkStyle??'Inset stainless')==='Inset stainless')names.add('inset-sink');tap(i.islandTapStyle)}
   if(appliance==='hob'&&i.hobStyle==='gas'&&(i.hobZones??4)===4)names.add('gas-hob');
  }
 }
 return [...names];
}
