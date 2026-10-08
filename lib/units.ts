export type DisplayUnit="mm"|"cm"|"in";
export const unitFactor:Record<DisplayUnit,number>={mm:1,cm:10,in:25.4};
export const fromMm=(value:number,unit:DisplayUnit)=>Number((value/unitFactor[unit]).toFixed(3));
export const toMm=(value:number,unit:DisplayUnit)=>Math.round(value*unitFactor[unit]*1000)/1000;
export const formatMeasure=(value:number,unit:DisplayUnit="mm")=>`${fromMm(value,unit)} ${unit}`;
