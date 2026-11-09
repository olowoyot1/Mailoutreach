import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function authorized(req: Request) {
  const secret = process.env.CAMPAIGN_CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && quoted && line[i + 1] === '"') { cell += '"'; i++; }
    else if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) { cells.push(cell.trim()); cell = ""; }
    else cell += ch;
  }
  cells.push(cell.trim());
  return cells.map(v => v.replace(/^"|"$/g, "").trim());
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const buckets = await prisma.campaign.findMany({
    where: { status: "BUCKET" },
    orderBy: { createdAt: "desc" },
    include: {
      prospects: {
        orderBy: { addedAt: "asc" },
        include: { prospect: true },
      },
      _count: { select: { prospects: true } },
    },
  });
  return NextResponse.json({
    buckets: buckets.map(b => ({
      id: b.id,
      name: b.name,
      description: b.description,
      createdAt: b.createdAt,
      count: b._count.prospects,
      prospects: b.prospects.map(x => x.prospect),
    })),
  });
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await req.json().catch(() => null) as { name?: string; description?: string; csv?: string } | null;
  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  const csv = typeof payload?.csv === "string" ? payload.csv : "";
  if (name.length < 3 || !csv.trim()) {
    return NextResponse.json({ error: "Bucket name and a non-empty CSV are required." }, { status: 400 });
  }
  if (csv.length > 500_000) return NextResponse.json({ error: "CSV exceeds the 500 KB import limit." }, { status: 413 });

  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return NextResponse.json({ error: "CSV must include a header and at least one investor." }, { status: 400 });
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[ _-]/g, ""));
  const col = (key: string) => headers.indexOf(key);
  const companyCol = col("company");
  const emailCol = col("email");
  if (companyCol < 0 || emailCol < 0) {
    return NextResponse.json({ error: "CSV headers must include company and email. Email may be blank. Optional: contact, website, country, notes." }, { status: 400 });
  }
  const get = (cells: string[], key: string) => {
    const i = col(key);
    return i < 0 ? "" : (cells[i] || "").trim();
  };

  const parsed = lines.slice(1).map(line => parseCsvLine(line)).filter(cells => cells[companyCol]?.trim());
  if (!parsed.length) return NextResponse.json({ error: "No valid investor names were found." }, { status: 400 });

  const result = await prisma.$transaction(async tx => {
    let bucket = await tx.campaign.findFirst({ where: { name, status: "BUCKET" } });
    if (!bucket) {
      bucket = await tx.campaign.create({
        data: {
          name,
          description: payload?.description?.trim() || "Investor prospect bucket. Records are not approved for sending.",
          subject: "NOT FOR SENDING — investor bucket",
          body: "This record is a prospect bucket, not an email campaign. Verify recipient and obtain approval before any outreach.",
          status: "BUCKET",
        },
      });
    }

    let imported = 0;
    let linked = 0;
    let missingEmail = 0;
    let invalidEmail = 0;
    for (const cells of parsed) {
      const company = (cells[companyCol] || "").trim();
      const rawEmail = (cells[emailCol] || "").trim().toLowerCase();
      const email = rawEmail || null;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { invalidEmail++; continue; }
      const contactName = get(cells, "contact") || null;
      const country = get(cells, "country") || "Unknown";
      const notes = [get(cells, "notes"), email ? "Email supplied; verify source and deliverability before outreach." : "Email not publicly verified; do not send until confirmed."].filter(Boolean).join(" | ");

      let prospect = email
        ? await tx.prospect.findFirst({ where: { email: { equals: email, mode: "insensitive" } } })
        : await tx.prospect.findFirst({ where: { companyName: company, country, email: null } });

      if (!prospect) {
        prospect = await tx.prospect.create({
          data: { companyName: company, contactName, email, website: get(cells, "website") || null, country, notes, status: "NEW" },
        });
        imported++;
      } else if (!prospect.notes?.includes("Email not publicly verified") && !email) {
        await tx.prospect.update({ where: { id: prospect.id }, data: { notes: [prospect.notes, notes].filter(Boolean).join(" | ") } });
      }
      const exists = await tx.campaignProspect.findUnique({
        where: { campaignId_prospectId: { campaignId: bucket.id, prospectId: prospect.id } },
        select: { id: true },
      });
      if (!exists) {
        await tx.campaignProspect.create({ data: { campaignId: bucket.id, prospectId: prospect.id } });
        linked++;
      }
      if (!email) missingEmail++;
    }
    return { bucketId: bucket.id, imported, linked, missingEmail, invalidEmail, totalRows: parsed.length };
  });

  return NextResponse.json({ ok: true, ...result, sendingEnabled: process.env.SEND_ENABLED === "true", emailsSent: 0 }, { status: 201 });
}
