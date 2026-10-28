import {hasSupabase} from "./supabase";

// The no-login studio is the team's local testing workspace. Basic account
// limits apply only when cloud accounts are configured.
const BASIC_PROJECT_LIMIT=2;
export const projectLimitReached=(count:number)=>hasSupabase()&&count>=BASIC_PROJECT_LIMIT;
export const projectLimitExceeded=(count:number)=>hasSupabase()&&count>BASIC_PROJECT_LIMIT;
