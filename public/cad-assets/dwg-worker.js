import {LibreDwg} from './dist/libredwg-web.js';
self.onmessage=async({data})=>{
 try{
  const decoder=await LibreDwg.create(new URL('./wasm',self.location.href).href);
  const dxf=decoder.dwg_write_dxf(data);
  if(!dxf?.length)throw new Error('This DWG could not be decoded. Export a 2D ASCII DXF from your CAD software and try again.');
  self.postMessage({text:new TextDecoder().decode(dxf)});
 }catch(error){self.postMessage({error:error instanceof Error?error.message:'DWG decoding failed.'})}
};
