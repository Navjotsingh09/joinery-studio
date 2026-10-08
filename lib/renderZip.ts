// A small stored ZIP writer: render files remain byte-identical and need no codec.
export function renderZip(files:{name:string;bytes:Uint8Array;executable?:boolean}[]):Uint8Array{
  const enc=new TextEncoder(),chunks:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0;
  const crc=(b:Uint8Array)=>{let c=0xffffffff;for(const n of b){c^=n;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0};
  for(const f of files){const name=enc.encode(f.name),local=new Uint8Array(30+name.length),v=new DataView(local.buffer),sum=crc(f.bytes);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,sum,true);v.setUint32(18,f.bytes.length,true);v.setUint32(22,f.bytes.length,true);v.setUint16(26,name.length,true);local.set(name,30);chunks.push(local,f.bytes);
    const c=new Uint8Array(46+name.length),d=new DataView(c.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,(3<<8)|20,true);d.setUint32(38,(f.executable?0o100755:0o100644)<<16,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint32(16,sum,true);d.setUint32(20,f.bytes.length,true);d.setUint32(24,f.bytes.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);c.set(name,46);central.push(c);offset+=local.length+f.bytes.length;
  }
  const size=central.reduce((n,b)=>n+b.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);chunks.push(...central,end);const result=new Uint8Array(offset+size+22);let n=0;for(const b of chunks){result.set(b,n);n+=b.length}return result;
}
