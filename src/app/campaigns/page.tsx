"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const defaultBody = `Dear Recruitment Team,

I hope this email finds you well.

My name is Temidayo, representing OAATZ Cosult Ltd, a Nigeria-based recruitment and workforce-sourcing company.

We would like to explore a B2B recruitment partnership. OAATZ can source and pre-screen qualified Nigerian candidates against your manpower requirements, while your organisation manages employer placement and destination-country employment procedures.

Could we arrange a brief meeting to discuss your current recruitment needs and partnership process?

Kind regards,
Temidayo
OAATZ Cosult Ltd
temidayo@oaatz.com
www.oaatz.com`;

export default function CampaignsPage() {
  const [secret, setSecret] = useState("");
  const [name, setName] = useState("GCC Recruitment Partners – Wave 2");
  const [description, setDescription] = useState("New prospecting campaign for recruitment and manpower agencies across the GCC.");
  const [subject, setSubject] = useState("Recruitment Partnership Opportunity – Nigerian Manpower Sourcing | OAATZ Cosult Ltd");
  const [body, setBody] = useState(defaultBody);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!secret) return;
    const r = await fetch("/api/campaigns", { headers: { Authorization: `Bearer ${secret}` } });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Could not load campaigns");
    setCampaigns(d.campaigns || []);
  }
  useEffect(() => { if (secret) load().catch(e => setError(e.message)); }, [secret]);

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const r = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ name, description, subject, body }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not create campaign");
      setMessage("Campaign created as DRAFT. No emails were sent.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Campaign creation failed"); }
    finally { setBusy(false); }
  }

  return <main className="shell">
    <header className="top"><div><div className="brand">OAATZ COSULT LTD</div><h1>Campaign Manager</h1><p className="muted">Create and manage separate recruitment outreach campaigns.</p></div><Link href="/">← Dashboard</Link></header>
    <section className="panel">
      <h2>Campaign access</h2>
      <label>Campaign access key</label>
      <input type="password" value={secret} onChange={e => setSecret(e.target.value)} autoComplete="off" placeholder="Enter campaign key" />
      <p className="muted">The key is used only for these requests and is not saved in the browser.</p>
    </section>
    <form className="panel" onSubmit={createCampaign}>
      <h2>Create a new campaign</h2>
      <label>Campaign name</label><input value={name} onChange={e => setName(e.target.value)} required minLength={3}/>
      <label>Description</label><input value={description} onChange={e => setDescription(e.target.value)}/>
      <label>Email subject</label><input value={subject} onChange={e => setSubject(e.target.value)} required/>
      <label>Email message</label><textarea rows={14} value={body} onChange={e => setBody(e.target.value)} required/>
      <button type="submit" disabled={busy || !secret}>{busy ? "Creating..." : "Create campaign draft"}</button>
      {message && <p>{message}</p>}{error && <p role="alert">{error}</p>}
      <p className="muted">Campaigns are saved as drafts. Creating one does not send emails or change the current sending pause.</p>
    </form>
    <section className="panel"><h2>Saved campaigns</h2>
      {!secret ? <p className="muted">Enter the access key to view saved campaigns.</p> : campaigns.length === 0 ? <p className="muted">No campaigns found.</p> :
      <table><thead><tr><th>Campaign</th><th>Status</th><th>Prospects</th><th>Email records</th><th>Created</th></tr></thead><tbody>
        {campaigns.map(c => <tr key={c.id}><td><strong>{c.name}</strong><br/><span className="muted">{c.subject}</span></td><td>{c.status}</td><td>{c._count.prospects}</td><td>{c._count.emails}</td><td>{new Date(c.createdAt).toLocaleDateString()}</td></tr>)}
      </tbody></table>}
    </section>
  </main>;
}
