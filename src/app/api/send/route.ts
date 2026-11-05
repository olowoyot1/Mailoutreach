import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { mailer } from "@/lib/mailer";
const schema=z.object({prospectId:z.string(),subject:z.string().min(3),body:z.string().min(10)});
export async function POST(req:Request){
 if(process.env.SEND_ENABLED!=="true") return NextResponse.json({error:"Sending is disabled until reviewed and approved."},{status:403});
 const auth=req.headers.get("authorization");
 if(!process.env.CAMPAIGN_CRON_SECRET||auth!==`Bearer ${process.env.CAMPAIGN_CRON_SECRET}`) return NextResponse.json({error:"Unauthorized"},{status:401});
 const parsed=schema.safeParse(await req.json()); if(!parsed.success)return NextResponse.json({error:parsed.error.flatten()},{status:400});
 const prospect=await prisma.prospect.findUnique({where:{id:parsed.data.prospectId}}); if(!prospect?.email)return NextResponse.json({error:"Prospect has no email address"},{status:404});
 const blocked=await prisma.suppression.findUnique({where:{email:prospect.email.toLowerCase()}}); if(blocked)return NextResponse.json({error:"Recipient is suppressed"},{status:409});
 const today=new Date();today.setHours(0,0,0,0);const count=await prisma.emailLog.count({where:{status:"SENT",sentAt:{gte:today}}});
 if(count>=Number(process.env.DAILY_SEND_LIMIT||10))return NextResponse.json({error:"Daily send limit reached"},{status:429});
 const log=await prisma.emailLog.create({data:{prospectId:prospect.id,subject:parsed.data.subject,body:parsed.data.body,status:"QUEUED"}});
 try{const info=await mailer().sendMail({from:`OAATZ Cosult Ltd <${process.env.SMTP_USER}>`,to:prospect.email,subject:parsed.data.subject,text:parsed.data.body});await prisma.emailLog.update({where:{id:log.id},data:{status:"SENT",sentAt:new Date(),messageId:info.messageId}});await prisma.prospect.update({where:{id:prospect.id},data:{status:"CONTACTED"}});return NextResponse.json({ok:true,messageId:info.messageId});}
 catch(e){await prisma.emailLog.update({where:{id:log.id},data:{status:"FAILED",error:e instanceof Error?e.message:"Mail send failed"}});return NextResponse.json({error:"Mail send failed"},{status:502});}
}
