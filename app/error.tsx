"use client";
export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f3f1ed",fontFamily:"Arial,Helvetica,sans-serif",padding:24}}>
    <section style={{maxWidth:520,background:"#fff",border:"1px solid #ddd9d3",padding:24}}>
      <strong style={{color:"#c8102e"}}>JOINERY STUDIO</strong>
      <h1 style={{fontSize:22}}>The editor hit an unexpected error.</h1>
      <p style={{color:"#666",lineHeight:1.5}}>{error.message||"The design workspace could not be loaded."}</p>
      <button onClick={reset} style={{border:"1px solid #c8102e",background:"#c8102e",color:"#fff",padding:"9px 14px",cursor:"pointer"}}>Try again</button>
    </section>
  </main>;
}