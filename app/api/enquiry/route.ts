import {NextRequest,NextResponse} from 'next/server';
export async function POST(req:NextRequest){
  if(req.headers.get('origin')!==req.nextUrl.origin)return NextResponse.json({message:'Request origin rejected.'},{status:403});
  if(Number(req.headers.get('content-length')??0)>12000)return NextResponse.json({message:'Enquiry is too long.'},{status:413});
  let body;try{const raw=await req.text();if(raw.length>12000)return NextResponse.json({message:'Enquiry is too long.'},{status:413});body=JSON.parse(raw)}catch{return NextResponse.json({message:'Please check your enquiry.'},{status:400})}
  if(!body||typeof body!=='object'||Array.isArray(body))return NextResponse.json({message:'Please check your enquiry.'},{status:400});
  if(body.website)return NextResponse.json({message:'Request received.'});
  if(typeof body.name!=='string'||body.name.length>120||!body.name.trim()||typeof body.email!=='string'||body.email.length>254||!/^\S+@\S+\.\S+$/.test(body.email)||typeof body.company!=='string'||!body.company.trim()||body.company.length>160||typeof body.message!=='string'||body.message.length<10||body.message.length>4000)return NextResponse.json({message:'Please complete the required fields.'},{status:400});
  const destination=process.env.ENQUIRY_WEBHOOK_URL;
  if(!destination)return NextResponse.json({message:'Enquiries are not connected yet. Your details have not been sent. Please return once access requests open.'},{status:503});
  try{const r=await fetch(destination,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:body.name,email:body.email,company:body.company,team:body.team,intent:body.intent,message:body.message}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error();return NextResponse.json({message:'Thank you. Your enquiry has been received.'})}catch{return NextResponse.json({message:'Your enquiry could not be sent. Please try again.'},{status:502})}
}
