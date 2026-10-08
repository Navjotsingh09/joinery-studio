/** Decode locally in a disposable worker so large CAD files cannot block editing. */
export async function dwgToDxf(bytes:ArrayBuffer):Promise<string>{
 if(bytes.byteLength>8000000)throw new Error('Choose a DWG under 8 MB.');
 if(!/^AC10\d\d$/.test(new TextDecoder().decode(bytes.slice(0,6))))throw new Error('This file is not a recognised DWG drawing.');
 return new Promise((resolve,reject)=>{
  const worker=new Worker('/cad-assets/dwg-worker.js',{type:'module'});
  const finish=(error?:string,text?:string)=>{clearTimeout(timer);worker.terminate();error?reject(new Error(error)):resolve(text!)};
  const timer=setTimeout(()=>finish('DWG processing timed out. Export a simpler 2D ASCII DXF and try again.'),60000);
  worker.onmessage=({data})=>finish(data.error,data.text);
  worker.onerror=()=>finish('The DWG decoder could not load. Try again or export an ASCII DXF.');
  worker.postMessage(bytes,[bytes]);
 });
}
