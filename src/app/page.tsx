import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prospect } from "@prisma/client";
export const dynamic="force-dynamic";
export default async function Home(){
 const [prospects,sent,replies,interested]=await Promise.all([prisma.prospect.count(),prisma.emailLog.count({where:{status:"SENT"}}),prisma.prospect.count({where:{status:"REPLIED"}}),prisma.prospect.count({where:{status:"INTERESTED"}})]);
 const latest: Prospect[] = await prisma.prospect.findMany({orderBy:{createdAt:"desc"},take:8});
 return <main className="shell"><header className="top"><div><div className="brand">OAATZ COSULT LTD</div><h1>Recruitment Outreach</h1><p className="muted">UAE manpower partnership pipeline</p></div><span className="tag">Sending paused pending mail-server review</span></header>
 <section className="panel"><h2>Approved campaign</h2><p className="muted">The SMTP test passed. Send the approved partnership email individually to the six authorised contacts. Previously sent, suppressed or over-limit contacts are skipped.</p><Link href="/campaign-send">Open approved campaign sender →</Link><p><Link href="/import-prospects">Import new prospects →</Link><p><Link href="/campaigns">Campaign Manager →</Link></p></p></section>
 <section className="grid">{[["Prospects",prospects],["Emails sent",sent],["Replies",replies],["Interested",interested]].map(([label,value])=><div className="card" key={String(label)}><div className="muted">{label}</div><div className="num">{value}</div></div>)}</section>
 <section className="panel"><h2>Prospect pipeline</h2><p className="muted">Approved recruitment partnership contacts and conversation status.</p><table><thead><tr><th>Company</th><th>Contact</th><th>Email</th><th>Status</th></tr></thead><tbody>{latest.map(p=><tr key={p.id}><td>{p.companyName}</td><td>{p.contactName||"—"}</td><td>{p.email||"—"}</td><td><span className="tag">{p.status.replaceAll("_"," ")}</span></td></tr>)}{latest.length===0&&<tr><td colSpan={4} className="muted">No prospects yet.</td></tr>}</tbody></table></section>
 <section className="panel"><h2>Campaign safeguards</h2><ul><li>Daily sending limit defaults to 10.</li><li>Emails are sent individually, not as a group.</li><li>Contacts already sent, suppressed addresses and failed deliveries are handled separately.</li><li>Day 5 and day 12 follow-ups still require scheduler and reply detection implementation.</li></ul></section></main>;
}
