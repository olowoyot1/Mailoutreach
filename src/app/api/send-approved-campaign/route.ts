import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mailer } from "@/lib/mailer";

export const runtime = "nodejs";

const approvedRecipients = [
  "hello@wesource.ae",
  "info@superrecruitment.co",
  "info@jminternationaluae.com",
  "info@ams-int.com",
  "ahr@alascogroup.com",
  "hrteam@emirates.net.ae",
];

const subject = "Recruitment Partnership Proposal – Nigerian Manpower Sourcing | OAATZ Cosult Ltd";
const body = `Dear Recruitment Team,

I hope this email finds you well.

My name is Temidayo, representing OAATZ Cosult Ltd, a Nigeria-based recruitment and workforce-sourcing company.

We are reaching out to explore a potential B2B recruitment partnership with your organisation.

OAATZ specialises in sourcing, screening and preparing qualified Nigerian candidates for international employment opportunities. We aim to support established manpower agencies and overseas employers by providing access to a reliable pool of candidates across relevant occupational categories.

Under our proposed partnership model:

- Your organisation shares its manpower requirements and job specifications.
- OAATZ sources and pre-screens suitable Nigerian candidates.
- We coordinate candidate documentation and interview readiness.
- Your team manages employer placement and destination-country employment and immigration procedures.

We would welcome an opportunity to understand your current recruitment requirements, priority occupations, candidate standards and potential partnership arrangements.

Would you be available for a brief online meeting to discuss how we could work together?

Thank you for your time. We look forward to hearing from you.

Kind regards,

Temidayo
OAATZ Cosult Ltd
Email: temidayo@oaatz.com
Website: www.oaatz.com
Tagline: Sustaining profit, simplifying process.`;

export async function POST(req: Request) {
  if (process.env.SEND_ENABLED !== "true") {
    return NextResponse.json({ error: "Campaign sending is disabled." }, { status: 403 });
  }
  const secret = process.env.CAMPAIGN_CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== "Bearer " + secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prospects = await prisma.prospect.findMany({
    where: { email: { in: approvedRecipients, mode: "insensitive" } },
  });
  const byEmail = new Map(prospects.map(p => [(p.email || "").toLowerCase(), p]));
  const missing = approvedRecipients.filter(email => !byEmail.has(email));
  const results: { email: string; status: string; detail?: string }[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let sentToday = await prisma.emailLog.count({
    where: { status: "SENT", sentAt: { gte: today } },
  });
  const dailyLimit = Number(process.env.DAILY_SEND_LIMIT || 10);
  const transport = mailer();

  for (const email of approvedRecipients) {
    const prospect = byEmail.get(email);
    if (!prospect) {
      results.push({ email, status: "NOT_FOUND" });
      continue;
    }
    const priorSent = await prisma.emailLog.findFirst({
      where: { prospectId: prospect.id, status: "SENT" },
      select: { id: true },
    });
    if (priorSent) {
      results.push({ email, status: "SKIPPED_ALREADY_SENT" });
      continue;
    }
    const blocked = await prisma.suppression.findUnique({ where: { email } });
    if (blocked) {
      results.push({ email, status: "SKIPPED_SUPPRESSED" });
      continue;
    }
    if (sentToday >= dailyLimit) {
      results.push({ email, status: "DEFERRED_DAILY_LIMIT" });
      continue;
    }

    const log = await prisma.emailLog.create({
      data: { prospectId: prospect.id, subject, body, status: "QUEUED" },
    });
    try {
      const info = await transport.sendMail({
        from: "OAATZ Cosult Ltd <" + process.env.SMTP_USER + ">",
        to: email,
        subject,
        text: body,
      });
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: "SENT", sentAt: new Date(), messageId: info.messageId },
      });
      await prisma.prospect.update({
        where: { id: prospect.id },
        data: { status: "CONTACTED" },
      });
      sentToday += 1;
      results.push({ email, status: "SENT" });
    } catch (error) {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : "Mail send failed",
        },
      });
      results.push({ email, status: "FAILED", detail: "SMTP delivery failed" });
    }
  }

  return NextResponse.json({
    ok: true,
    sent: results.filter(r => r.status === "SENT").length,
    missing,
    results,
  });
}
