"use client";

import { useState } from "react";
import Link from "next/link";

export default function ImportProspectsPage() {
  const [secret, setSecret] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function importFile() {
    if (!secret || !file) { setError("Enter the campaign access key and choose a CSV file."); return; }
    setBusy(true); setError(""); setResult(null);
    try {
      const csv = await file.text();
      const response = await fetch("/api/import-prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ csv }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Import failed");
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Import failed"); }
    finally { setBusy(false); }
  }

  return <main className="shell">
    <header className="top"><div><div className="brand">OAATZ COSULT LTD</div><h1>Import prospects</h1><p className="muted">Add recruitment partners without sending emails.</p></div><Link href="/">← Dashboard</Link></header>
    <section className="panel">
      <h2>CSV import</h2>
      <p className="muted">Required columns: company,email. Optional: contact,website,country,notes. Existing email addresses are skipped. Imported records are marked NEW and are never emailed by this import.</p>
      <p><a href="/prospect-import-template.csv" download>Download CSV template</a></p>
      <label>Campaign access key</label>
      <input type="password" value={secret} onChange={e => setSecret(e.target.value)} autoComplete="off" />
      <label>Prospect CSV file</label>
      <input type="file" accept=".csv,text/csv" onChange={e => setFile(e.target.files?.[0] || null)} />
      <button onClick={importFile} disabled={busy || !file}>{busy ? "Importing..." : "Import prospects"}</button>
      {error && <p role="alert" className="error">{error}</p>}
    </section>
    {result && <section className="panel">
      <h2>Import results</h2>
      <p><strong>{result.imported}</strong> imported · <strong>{result.skipped}</strong> skipped</p>
      <p className="muted">Email sending is {result.sendingEnabled ? "enabled in the environment" : "disabled"}; this import did not send any emails.</p>
      <table><thead><tr><th>Company</th><th>Email</th><th>Result</th></tr></thead><tbody>
        {result.results.map((r: any, i: number) => <tr key={i}><td>{r.company}</td><td>{r.email}</td><td>{r.status}</td></tr>)}
      </tbody></table>
    </section>}
  </main>;
}
