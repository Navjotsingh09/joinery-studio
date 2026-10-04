import {notFound} from 'next/navigation';
import StudioLoader from '@/components/StudioLoader';
export const dynamic='force-dynamic';
// Local UI verification only; this route returns 404 in production.
export default function Page(){if(process.env.NODE_ENV!=='development'||process.env.NEXT_PUBLIC_SUPABASE_URL)notFound();return <StudioLoader/>}
