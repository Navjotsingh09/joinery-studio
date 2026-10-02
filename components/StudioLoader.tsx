"use client";
import dynamic from "next/dynamic";
const Studio=dynamic(()=>import("./Studio"),{ssr:false,loading:()=> <main style={{padding:24,fontFamily:"Arial"}}>Loading Joinery Studio…</main>});
export default function StudioLoader(){return <Studio/>}
