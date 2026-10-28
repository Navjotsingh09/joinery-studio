// Canvas and Blob adapters for the offline glTF exporter; no browser or GPU.
import {createCanvas,ImageData,loadImage} from '@napi-rs/canvas';
class BlobReader{
 result:ArrayBuffer|string|null=null;onloadend:(()=>void)|null=null;onerror:((e:unknown)=>void)|null=null;
 readAsArrayBuffer(blob:Blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.()},e=>this.onerror?.(e))}
 readAsDataURL(blob:Blob){blob.arrayBuffer().then(value=>{this.result=`data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;this.onloadend?.()},e=>this.onerror?.(e))}
}
export function createExportCanvas(width:number,height:number){const canvas=createCanvas(width,height);Object.defineProperty(canvas,'data',{value:undefined});Object.defineProperty(canvas,'toBlob',{value:(callback:(blob:Blob)=>void)=>callback(new Blob([new Uint8Array(canvas.toBuffer('image/png'))],{type:'image/png'}))});return canvas}
export function installNodeGraphics(){Object.assign(globalThis,{FileReader:BlobReader,ImageData,HTMLCanvasElement:createCanvas(1,1).constructor,OffscreenCanvas:class {constructor(w:number,h:number){return createExportCanvas(w,h)}}})}
export async function imageCanvas(source:string|Buffer){const image=await loadImage(source),canvas=createExportCanvas(image.width,image.height);canvas.getContext('2d').drawImage(image,0,0);return canvas}
