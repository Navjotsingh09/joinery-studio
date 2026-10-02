import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

export const dynamic="force-dynamic";

export async function GET(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const configured=Boolean(url&&key);
  let supabaseReachable=false;
  let supabaseError:boolean=false;

  if(url&&key){
    try{
      const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
      const {error}=await db.from("projects").select("id",{head:true,count:"exact"}).limit(1);
      supabaseReachable=!error;
      supabaseError=Boolean(error);
    }catch(e:any){
      supabaseError=true;
    }
  }

  return NextResponse.json({
    ok:true,
    service:"joinery-studio",
    supabaseConfigured:configured,
    supabaseReachable,
    supabaseError,
    commit:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12)??null,
    environment:process.env.VERCEL_ENV??process.env.NODE_ENV??"unknown",
    checkedAt:new Date().toISOString()
  },{headers:{"Cache-Control":"no-store"}});
}
