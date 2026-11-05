import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
export default async function Home(){
 const [prospects,sent,replies,interested]=await Promise.all([prisma.prospect.count(),prisma.emailLog.count({where:{status:"SENT"}}),prisma.prospect.count({where:{status:"REPLIED"}}),prisma.prospect.count({where:{status:"INTERESTED"}})]);
 const latest=await prisma.prospect.findMany({orderBy:{createdAt:"desc"},take:8});
 return <main className="shell"><header className="top"><div><div className="brand">OAATZ COSULT LTD</div><h1>Recruitment Outreach</h1><p className="muted">UAE manpower partnership pipeline</p></div><span className="tag">Sending disabled until approved</span></header>
 <section className="grid">{[["Prospects",prospects],["Emails sent",sent],["Replies",replies],["Interested",interested]].map(([label,value])=><div className="card" key={String(label)}><div className="muted">{label}</div><div className="num">{value}</div></div>)}</section>
 <section className="panel"><h2>Prospect pipeline</h2><p className="muted">Add verified business contacts and record partnership conversations.</p><table><thead><tr><th>Company</th><th>Contact</th><th>Email</th><th>Status</th></tr></thead><tbody>{latest.map(p=><tr key={p.id}><td>{p.companyName}</td><td>{p.contactName||"—"}</td><td>{p.email||"—"}</td><td><span className="tag">{p.status.replaceAll("_"," ")}</span></td></tr>)}{latest.length===0&&<tr><td colSpan={4} className="muted">No prospects yet. Add your first verified UAE manpower company.</td></tr>}</tbody></table></section>
 <section className="panel"><h2>Campaign safeguards</h2><ul><li>Daily sending limit defaults to 10.</li><li>Follow-ups are planned for day 5 and day 12.</li><li>Replies, bounces and opt-outs must stop future follow-ups.</li><li>Sending remains disabled until SMTP, DNS authentication, recipients and templates are approved.</li></ul></section></main>;
}
