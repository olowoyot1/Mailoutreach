"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Prospect = {
  id: string; companyName: string; contactName: string | null; email: string | null;
  country: string; website: string | null; notes: string | null; status: string;
};
type Bucket = { id: string; name: string; description: string | null; createdAt: string; count: number; prospects: Prospect[] };

export default function BucketsPage() {
  const [secret, setSecret] = useState("");
  const [name, setName] = useState("OAATZ Global Investors 2026");
  const [description, setDescription] = useState("Global angel investors and family offices for OAATZ accounting technology, AI and business automation.");
  const [file, setFile] = useState<File | null>(null);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<any>(null);

  async function load() {
    if (!secret) return;
    const r = await fetch("/api/buckets", { headers: { Authorization: `Bearer ${secret}` } });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Could not load buckets");
    setBuckets(d.buckets || []);
    if (!selected && d.buckets?.[0]) setSelected(d.buckets[0].id);
  }
  useEffect(() => { if (secret) load().catch(e => setError(e.message)); }, [secret]);

  async function importBucket(e: React.FormEvent) {
    e.preventDefault();
    if (!secret || !file) { setError("Enter the campaign access key and choose the investor CSV."); return; }
    setBusy(true); setError(""); setNotice(""); setResult(null);
    try {
      const csv = await file.text();
      const r = await fetch("/api/buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ name, description, csv }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Bucket import failed");
      setResult(d);
      setNotice("Investor bucket saved. No emails were sent.");
      await load();
      setSelected(d.bucketId);
    } catch (e) { setError(e instanceof Error ? e.message : "Bucket import failed"); }
    finally { setBusy(false); }
  }

  const active = buckets.find(b => b.id === selected);
  const withEmail = active?.prospects.filter(p => !!p.email).length || 0;

  return <main className="shell">
    <header className="top"><div><div className="brand">OAATZ COSULT LTD</div><h1>Investor Buckets</h1><p className="muted">Organise investor prospects separately from sending campaigns.</p></div><Link href="/">← Dashboard</Link></header>
    <section className="panel">
      <h2>Bucket access</h2>
      <label>Campaign access key</label>
      <input type="password" value={secret} onChange={e => setSecret(e.target.value)} autoComplete="off" placeholder="Enter campaign key" />
      <p className="muted">Access key is used for authenticated requests and is not saved in the browser.</p>
    </section>
    <form className="panel" onSubmit={importBucket}>
      <h2>Create or update investor bucket</h2>
      <label>Bucket name</label><input value={name} onChange={e => setName(e.target.value)} required minLength={3}/>
      <label>Description</label><input value={description} onChange={e => setDescription(e.target.value)}/>
      <label>Investor CSV</label><input type="file" accept=".csv,text/csv" onChange={e => setFile(e.target.files?.[0] || null)} required/>
      <p className="muted">Required CSV columns: company,email. Email can be blank. Optional: contact,website,country,notes. Duplicate emails are matched and skipped. Missing emails remain blank and are clearly flagged.</p>
      <button type="submit" disabled={busy || !secret || !file}>{busy ? "Saving bucket..." : "Save investor bucket"}</button>
      {notice && <p>{notice}</p>}{error && <p role="alert" className="error">{error}</p>}
      {result && <p><strong>{result.linked}</strong> investor records linked · <strong>{result.missingEmail}</strong> without verified emails · <strong>{result.invalidEmail}</strong> invalid email rows skipped · <strong>{result.emailsSent}</strong> emails sent.</p>}
    </form>
    <section className="panel">
      <h2>Saved buckets</h2>
      {!secret ? <p className="muted">Enter the access key to view saved buckets.</p> : buckets.length === 0 ? <p className="muted">No investor buckets yet.</p> :
        <div className="contact-list">{buckets.map(b => <button type="button" className={selected === b.id ? "contact active" : "contact"} key={b.id} onClick={() => setSelected(b.id)}><strong>{b.name}</strong><small>{b.count} prospects · {new Date(b.createdAt).toLocaleDateString()}</small></button>)}</div>}
    </section>
    {active && <section className="panel">
      <h2>{active.name}</h2>
      <p className="muted">{active.description}</p>
      <p><strong>{active.count}</strong> prospects · <strong>{withEmail}</strong> with email · <strong>{active.count - withEmail}</strong> awaiting verified email</p>
      <table><thead><tr><th>Investor</th><th>Category / focus</th><th>Country</th><th>Email</th><th>LinkedIn / notes</th></tr></thead><tbody>
        {active.prospects.map(p => {
          const notes = p.notes || "";
          const category = notes.match(/Investor category: ([^|]+)/)?.[1]?.trim() || "—";
          const focus = notes.match(/Investment focus: ([^|]+)/)?.[1]?.trim() || "";
          const linkedin = notes.match(/LinkedIn: (https?:\/\/[^|]+)/)?.[1]?.trim();
          return <tr key={p.id}><td><strong>{p.contactName || p.companyName}</strong></td><td>{category}<br/><span className="muted">{focus}</span></td><td>{p.country}</td><td>{p.email || <span className="muted">Not verified</span>}</td><td>{linkedin ? <a href={linkedin} target="_blank" rel="noreferrer">LinkedIn search</a> : <span className="muted">See prospect notes</span>}</td></tr>;
        })}
      </tbody></table>
    </section>}
  </main>;
}
