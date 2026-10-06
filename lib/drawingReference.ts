import {DrawingReference} from "@/types/model";
export type ReferencePoint={x:number;y:number};
export function calibratedWidth(a:ReferencePoint,b:ReferencePoint,knownMm:number,pixelWidth:number,pixelHeight:number,aspectRatio?:number){
  const span=Math.hypot(b.x-a.x,(b.y-a.y)*(aspectRatio?1/aspectRatio:pixelHeight/pixelWidth));
  if(!Number.isFinite(span)||span<.005||!Number.isFinite(knownMm)||knownMm<=0)throw new Error("Choose two different points and enter a positive known distance.");
  const width=knownMm/span;
  if(width>200000||width<100)throw new Error("Check the measured distance: drawing width must be between 100 mm and 200 m.");
  return Math.round(width*1000)/1000;
}
export const referenceDepth=(r:DrawingReference)=>r.widthMm/(r.aspectRatio??r.pixelWidth/r.pixelHeight);
export function validDrawingReference(r:unknown):r is DrawingReference{
  if(!r||typeof r!=="object")return false;
  const v=r as DrawingReference;
  return typeof v.name==="string"&&typeof v.dataUrl==="string"&&/^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v.dataUrl)&&v.dataUrl.length<2500000&&[v.pixelWidth,v.pixelHeight,v.widthMm,v.x,v.z,v.opacity].every(Number.isFinite)&&v.pixelWidth>0&&v.pixelHeight>0&&(v.aspectRatio===undefined||Number.isFinite(v.aspectRatio)&&v.aspectRatio>0)&&v.widthMm>0&&v.opacity>=0&&v.opacity<=1&&typeof v.visible==="boolean";
}
