import {JoineryItem} from '@/types/model';
export type StairFlightPlan={width:number;run:number;rise:number;count:number;position:[number,number,number];axis:'x'|'z';reverse:boolean};
export function stairPlan(i:JoineryItem){
  const w=i.width/1000,h=i.height/1000,d=i.depth/1000,count=Math.max(4,Math.min(40,Math.round(i.stairRisers??i.height/180))),stepRise=h/count;
  const flights:StairFlightPlan[]=[],landings:{position:[number,number,number];size:[number,number,number]}[]=[];
  if(i.type==='Straight staircase')flights.push({width:w,run:d,rise:h,count,position:[0,0,0],axis:'z',reverse:false});
  else{
    const first=Math.floor(count/2),second=count-first,lower=first*stepRise,upper=second*stepRise;
    if(i.type==='L staircase'){
      const fw=Math.min(w*.48,d*.48,.95),run1=d-fw,run2=w-fw;
      flights.push({width:fw,run:run1,rise:lower,count:first,position:[-w/2+fw/2,-h/2+lower/2,fw/2],axis:'z',reverse:true},{width:fw,run:run2,rise:upper,count:second,position:[fw/2,-h/2+lower+upper/2,-d/2+fw/2],axis:'x',reverse:false});
      landings.push({position:[-w/2+fw/2,-h/2+lower-.02,-d/2+fw/2],size:[fw,.04,fw]});
    }else{
      const gap=Math.min(.14,w*.08),fw=(w-gap)/2,run=d-Math.min(fw,d*.4),landingD=d-run;
      flights.push({width:fw,run,rise:lower,count:first,position:[-fw/2-gap/2,-h/2+lower/2,landingD/2],axis:'z',reverse:true},{width:fw,run,rise:upper,count:second,position:[fw/2+gap/2,-h/2+lower+upper/2,landingD/2],axis:'z',reverse:false});
      landings.push({position:[0,-h/2+lower-.02,-d/2+landingD/2],size:[w,.04,landingD]});
    }
  }
  return {count,stepRise,flights,landings,going:flights.reduce((s,f)=>s+f.run,0)/count};
}
