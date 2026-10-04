'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import StudioLoader from './StudioLoader';
import {hasSupabase,supabase} from '@/lib/supabase';
export default function StudioGate(){const [state,setState]=useState<'checking'|'open'|'login'|'unconfigured'>('checking'),[owner,setOwner]=useState<string|null>(null),ownerRef=useRef<string|null|undefined>(undefined);
useEffect(()=>{if(!hasSupabase()){setState('unconfigured');return}let active=true,generation=0;const change=(id:string|null)=>{if(!active||ownerRef.current===id)return;ownerRef.current=id;setOwner(id);setState(id?'open':'login')};const ticket=++generation;supabase().auth.getUser().then(({data,error})=>{if(active&&ticket===generation)change(!error&&data.user?data.user.id:null)});const {data}=supabase().auth.onAuthStateChange((_event,session)=>{generation++;change(session?.user.id??null)});return()=>{active=false;data.subscription.unsubscribe()}},[]);
if(state==='open')return <StudioLoader key={owner}/>;
const kind=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('kind'):null;
return <main className="studioGate"><Link href="/">← Joinery Studio</Link><h1>{state==='checking'?'Checking your account…':state==='unconfigured'?'The studio is being prepared.':'Your designs are private.'}</h1><p>{state==='unconfigured'?'Account access needs to be configured before this deployment can open the studio.':state==='login'?'Log in to open your workspace.':''}</p>{state==='login'&&<Link href={'/login'+(kind&&['kitchen','bedroom','stairs'].includes(kind)?'?kind='+kind:'')}>Log in →</Link>}</main>}
