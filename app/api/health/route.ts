import {NextResponse} from "next/server";

export const dynamic="force-dynamic";

export function GET(){
  return NextResponse.json({
    ok:true,
    service:"joinery-studio",
    supabaseConfigured:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    commit:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12)??null,
    environment:process.env.VERCEL_ENV??process.env.NODE_ENV??"unknown",
    checkedAt:new Date().toISOString()
  },{headers:{"Cache-Control":"no-store"}});
}
