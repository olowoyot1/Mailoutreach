"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Contact = { company: string; email: string; contact: string };
const starter = `Dear {{greeting}},

Greetings from OAATZ Cosult Ltd, Nigeria.

We are interested in exploring a B2B recruitment partnership with {{company}}. Our team can support your recruitment operations through candidate sourcing, screening and interview preparation in Nigeria, based on your requirements and applicable regulations.

Could you direct us to the person responsible for international recruitment partnerships, or let us know whether your organisation is open to working with sourcing partners in Nigeria?

Thank you for your time. I look forward to hearing from you.

Kind regards,
Temidayo
OAATZ Cosult Ltd
temidayo@oaatz.com
www.oaatz.com
Sustaining profit, simplifying process.`;

function parseCsv(text: string): Contact[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const split = (line: string) => {
    const out:string[]=[]; let value=""; let quoted=false;
    for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'&&quoted&&line[i+1]==='"'){value+='"';i++;}else if(c==='"')quoted=!quoted;else if(c===","&&!quoted){out.push(value.trim());value="";}else value+=c;}
    out.push(value.trim());return out;
  };
  const headers=split(lines[0]).map(x=>x.toLowerCase().replace(/[ _-]/g,""));
  const company=headers.indexOf("company"), email=headers.indexOf("email"), contact=headers.indexOf("contact");
  if(company<0||email<0) throw new Error("CSV needs company and email columns.");
  return lines.slice(1).map(line=>{const c=split(line);return {company:c[company]||"your team",email:(c[email]||"").toLowerCase(),contact:contact>=0?(c[contact]||""):""};}).filter(x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email));
}
function parsePasted(text:string):Contact[]{return text.split(/[\n,;\t]+/).map(x=>x.trim()).filter(Boolean).map(x=>{const m=x.match(/^(.*?)[<\s]+([^<>\s]+@[^<>\s]+\.[^<>\s]+)>?$/);return m?{company:m[1].trim()||"your team",email:m[2].toLowerCase(),contact:""}:{company:"your team",email:x.toLowerCase(),contact:""};}).filter(x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email));}

export default function ComposerPage(){
 const [paste,setPaste]=useState(""); const [contacts,setContacts]=useState<Contact[]>([]);
 const [subject,setSubject]=useState("B2B Recruitment Partnership Opportunity – OAATZ Cosult Ltd");
 const [template,setTemplate]=useState(starter); const [selected,setSelected]=useState(0);
 const [secret,setSecret]=useState(""); const [status,setStatus]=useState("");
 const [busy,setBusy]=useState(false); const [consent,setConsent]=useState(false);
 const unique=useMemo(()=>Array.from(new Map(contacts.map(c=>[c.email,c])).values()),[contacts]);
 const current=unique[selected];
 const personalised=(c:Contact)=>template.replaceAll("{{company}}",c.company).replaceAll("{{contact}}",c.contact||"Recruitment Team").replaceAll("{{greeting}}",c.contact?c.contact:"Recruitment Team");
 function addPasted(){const next=parsePasted(paste);setContacts(old=>[...old,...next]);setPaste("");setStatus(next.length?next.length+" valid email address(es) added.":"No valid email addresses found.");}
 async function addFile(file?:File){if(!file)return;try{const next=parseCsv(await file.text());setContacts(old=>[...old,...next]);setStatus(next.length+" contact(s) loaded from CSV.");}catch(e){setStatus(e instanceof Error?e.message:"Could not read CSV.");}}
 async function send(){setBusy(true);setStatus("");try{const r=await fetch("/api/send-individual-campaign",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+secret},body:JSON.stringify({recipients:unique,subject,bodyTemplate:template,marketingConfirmed:consent})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Send request failed");setStatus("Processed: "+d.sent+" sent, "+d.skipped+" skipped, "+d.failed+" failed.");}catch(e){setStatus(e instanceof Error?e.message:"Send request failed.");}finally{setBusy(false);}}
 return <main className="shell">
 <header className="top"><div><div className="brand">OAATZ COSULT LTD</div><h1>Email campaign composer</h1><p className="muted">Prepare one personalised message per contact.</p></div><Link href="/">← Dashboard</Link></header>
 <section className="panel"><h2>1. Add recipients</h2><p className="muted">Paste email addresses (one per line, comma-separated, or Name &lt;email&gt;) or upload a CSV with company and email columns.</p><textarea rows={4} value={paste} onChange={e=>setPaste(e.target.value)} placeholder={"partner@example.com\nRecruitment Agency <hr@example.com>"} /><div className="composer-actions"><button type="button" onClick={addPasted} disabled={!paste.trim()}>Add pasted contacts</button><label className="file-button">Upload CSV<input type="file" accept=".csv,text/csv" onChange={e=>addFile(e.target.files?.[0])}/></label></div><p className="muted">{unique.length} unique valid contact(s) loaded. Duplicate email addresses are removed.</p>
 {unique.length>0&&<div className="contact-list">{unique.map((c,i)=><button type="button" className={selected===i?"contact active":"contact"} key={c.email} onClick={()=>setSelected(i)}><span>{c.company}</span><small>{c.email}</small></button>)}</div>}</section>
 <section className="panel"><h2>2. Write your campaign</h2><label>Email subject</label><input value={subject} onChange={e=>setSubject(e.target.value)}/><p className="muted">Personalisation tags: {"{{company}}"}, {"{{contact}}"}, {"{{greeting}}"}</p><label>Message template</label><textarea rows={16} value={template} onChange={e=>setTemplate(e.target.value)}/></section>
 <section className="panel"><h2>3. Preview individual email</h2>{current?<><div className="preview-meta"><div><span className="muted">To</span><strong>{current.email}</strong></div><div><span className="muted">Subject</span><strong>{subject.replaceAll("{{company}}",current.company)}</strong></div></div><pre className="email-preview">{personalised(current)}</pre><button type="button" onClick={()=>navigator.clipboard?.writeText("To: "+current.email+"\nSubject: "+subject+"\n\n"+personalised(current))}>Copy this email</button></>:<p className="muted">Add contacts to preview personalised messages.</p>}</section>
 <section className="panel"><h2>4. Send individually</h2><p className="muted">Each recipient receives a separate message addressed only to them. No CC or shared recipient list. Only contact people where you have a lawful basis to send the marketing message; honour opt-outs and suppression requests.</p><label>Campaign access key</label><input type="password" value={secret} onChange={e=>setSecret(e.target.value)} autoComplete="off"/><label className="confirm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> I confirm these contacts are appropriate recipients for this marketing outreach, and the message includes a clear way to opt out.</label><button type="button" disabled={busy||!secret||!unique.length||!subject.trim()||!consent} onClick={send}>{busy?"Processing...":"Send approved emails individually"}</button><p className="muted">Sending remains subject to the server's sending switch, daily limit, suppression list and SMTP delivery status.</p>{status&&<p role="status">{status}</p>}</section>
 </main>;
}
