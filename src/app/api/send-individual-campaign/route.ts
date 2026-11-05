import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mailer } from "@/lib/mailer";

export const runtime = "nodejs";
type Recipient = { company?: string; email?: string; contact?: string };
function render(template:string, r:Recipient) {
  return template.replaceAll("{{company}}", r.company?.trim() || "your team")
    .replaceAll("{{contact}}", r.contact?.trim() || "Recruitment Team")
    .replaceAll("{{greeting}}", r.contact?.trim() || "Recruitment Team");
}
export async function POST(req:Request) {
  const secret=process.env.CAMPAIGN_CRON_SECRET;
  if(!secret || req.headers.get("authorization") !== "Bearer "+secret) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(process.env.SEND_ENABLED !== "true") return NextResponse.json({error:"Sending is currently disabled by the server. The composer and previews are available, but delivery cannot proceed until the mail-server sending switch is enabled."},{status:403});
  const input=await req.json().catch(()=>null);
  if(input?.marketingConfirmed!==true) return NextResponse.json({error:"Confirm that these are appropriate marketing recipients before sending."},{status:400});
  const subject=typeof input?.subject==="string"?input.subject.trim():"";
  const template=typeof input?.bodyTemplate==="string"?input.bodyTemplate.trim():"";
  const recipients=Array.isArray(input?.recipients)?input.recipients as Recipient[]:[];
  if(subject.length<3||template.length<20||!recipients.length||recipients.length>100) return NextResponse.json({error:"Provide a subject, message and between 1 and 100 recipients."},{status:400});
  const clean=Array.from(new Map(recipients.map(r=>[(r.email||"").trim().toLowerCase(),r])).values()).filter(r=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email||""));
  const emails=clean.map(r=>(r.email||"").trim().toLowerCase());
  const prospects=await prisma.prospect.findMany({where:{email:{in:emails,mode:"insensitive"}}});
  const byEmail=new Map(prospects.map(p=>[(p.email||"").toLowerCase(),p]));
  const today=new Date();today.setHours(0,0,0,0);
  let sentToday=await prisma.emailLog.count({where:{status:"SENT",sentAt:{gte:today}}});
  const limit=Math.max(1,Number(process.env.DAILY_SEND_LIMIT||10));
  const result:{email:string,status:string}[]=[];
  let transport:ReturnType<typeof mailer>|null=null;
  for(const r of clean){
    const email=(r.email||"").trim().toLowerCase();
    const p=byEmail.get(email);
    if(!p){result.push({email,status:"NOT_IN_CONTACTS"});continue;}
    const suppression=await prisma.suppression.findUnique({where:{email}});
    if(suppression||p.status==="UNSUBSCRIBED"){result.push({email,status:"SUPPRESSED"});continue;}
    const sentBefore=await prisma.emailLog.findFirst({where:{prospectId:p.id,status:"SENT"},select:{id:true}});
    if(sentBefore){result.push({email,status:"ALREADY_SENT"});continue;}
    if(sentToday>=limit){result.push({email,status:"DAILY_LIMIT"});continue;}
    const body=render(template,r);
    const log=await prisma.emailLog.create({data:{prospectId:p.id,subject,body,status:"QUEUED"}});
    try{
      transport ||= mailer();
      const info=await transport.sendMail({from:"OAATZ Cosult Ltd <"+process.env.SMTP_USER+">",to:email,subject,text:body});
      await prisma.emailLog.update({where:{id:log.id},data:{status:"SENT",sentAt:new Date(),messageId:info.messageId}});
      await prisma.prospect.update({where:{id:p.id},data:{status:"CONTACTED"}});
      sentToday++;result.push({email,status:"SENT"});
    }catch{
      await prisma.emailLog.update({where:{id:log.id},data:{status:"FAILED",error:"SMTP delivery failed"}});
      result.push({email,status:"FAILED"});
    }
  }
  return NextResponse.json({ok:true,sent:result.filter(x=>x.status==="SENT").length,failed:result.filter(x=>x.status==="FAILED").length,skipped:result.filter(x=>!["SENT","FAILED"].includes(x.status)).length,results:result});
}
