import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";

function authorized(req: Request) {
  const secret = process.env.CAMPAIGN_CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { prospects: true, emails: true } } },
  });
  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = await req.json().catch(() => null);
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const subject = typeof input?.subject === "string" ? input.subject.trim() : "";
  const body = typeof input?.body === "string" ? input.body.trim() : "";
  const description = typeof input?.description === "string" ? input.description.trim() : "";
  if (name.length < 3 || subject.length < 3 || body.length < 10) {
    return NextResponse.json({ error: "Campaign name, subject and message are required." }, { status: 400 });
  }
  const campaign = await prisma.campaign.create({
    data: { name, subject, body, description: description || null, status: "DRAFT" },
  });
  return NextResponse.json({ ok: true, campaign }, { status: 201 });
}
