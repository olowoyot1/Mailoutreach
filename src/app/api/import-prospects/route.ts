import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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

export async function POST(req: Request) {
  const secret = process.env.CAMPAIGN_CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null) as { csv?: string } | null;
  const csv = payload?.csv;
  if (typeof csv !== "string" || !csv.trim()) {
    return NextResponse.json({ error: "Upload a non-empty CSV file." }, { status: 400 });
  }
  if (csv.length > 500_000) {
    return NextResponse.json({ error: "CSV exceeds the 500 KB import limit." }, { status: 413 });
  }

  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return NextResponse.json({ error: "CSV must include a header and at least one prospect." }, { status: 400 });

  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[ _-]/g, ""));
  const col = (name: string) => headers.indexOf(name);
  const companyCol = col("company");
  const emailCol = col("email");
  if (companyCol < 0 || emailCol < 0) {
    return NextResponse.json({ error: "CSV headers must include company and email. Optional: contact, website, country, notes." }, { status: 400 });
  }

  const get = (cells: string[], name: string) => {
    const index = col(name);
    return index < 0 ? "" : (cells[index] || "").trim();
  };
  const results: { company: string; email: string; status: string }[] = [];
  let inserted = 0;
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const company = cells[companyCol] || "";
    const email = (cells[emailCol] || "").toLowerCase();
    if (!company || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      results.push({ company: company || "(blank)", email, status: "INVALID_ROW" });
      continue;
    }
    const existing = await prisma.prospect.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      results.push({ company, email, status: "DUPLICATE_SKIPPED" });
      continue;
    }
    await prisma.prospect.create({
      data: {
        companyName: company,
        email,
        contactName: get(cells, "contact") || null,
        website: get(cells, "website") || null,
        country: get(cells, "country") || "UAE",
        notes: [get(cells, "notes"), "Imported as NEW prospect; verify contact before outreach."].filter(Boolean).join(" | "),
        status: "NEW",
      },
    });
    inserted++;
    results.push({ company, email, status: "IMPORTED" });
  }

  return NextResponse.json({
    ok: true,
    imported: inserted,
    skipped: results.filter(r => r.status !== "IMPORTED").length,
    sendingEnabled: process.env.SEND_ENABLED === "true",
    results,
  });
}
