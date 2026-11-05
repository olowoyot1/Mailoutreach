"use client";

import { useState } from "react";

type Result = { email: string; status: string; detail?: string };

export default function CampaignSendPage() {
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState("");

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm("Send the previously approved partnership email individually to the six approved recruitment contacts?")) return;
    setBusy(true);
    setError("");
    setResults(null);
    try {
      const response = await fetch("/api/send-approved-campaign", {
        method: "POST",
        headers: { authorization: "Bearer " + secret },
      });
      const data = await response.json();
      if (!response.ok) setError(data.error || "Campaign request failed.");
      else setResults(data.results || []);
    } catch {
      setError("Could not reach the campaign sender. Please try again.");
    } finally {
      setBusy(false);
      setSecret("");
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <a href="/" style={{ color: "#555" }}>← Back to dashboard</a>
      <h1 style={{ marginTop: 28 }}>Approved recruitment campaign</h1>
      <p>This sends the approved email individually to the six pre-approved contacts only. It skips contacts already emailed, suppressed addresses and any sends beyond the daily limit.</p>
      <p><strong>Important:</strong> Enter the CAMPAIGN_CRON_SECRET from Vercel. Do not share it with anyone.</p>
      <form onSubmit={send}>
        <label htmlFor="secret" style={{ display: "block", fontWeight: 600, margin: "20px 0 8px" }}>Campaign security key</label>
        <input id="secret" type="password" required autoComplete="off" value={secret}
          onChange={event => setSecret(event.target.value)}
          placeholder="Enter CAMPAIGN_CRON_SECRET"
          style={{ width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid #aaa", borderRadius: 6 }} />
        <button type="submit" disabled={busy} style={{ marginTop: 16, padding: "12px 18px", border: 0, borderRadius: 6, background: "#111", color: "#fff", cursor: busy ? "wait" : "pointer" }}>
          {busy ? "Sending approved emails…" : "Send approved campaign"}
        </button>
      </form>
      {error && <p role="alert" style={{ marginTop: 20, color: "#b71c1c" }}>{error}</p>}
      {results && <section style={{ marginTop: 24 }}>
        <h2>Campaign results</h2>
        <ul>{results.map(item => <li key={item.email}>{item.email}: <strong>{item.status.replaceAll("_", " ")}</strong>{item.detail ? " — " + item.detail : ""}</li>)}</ul>
      </section>}
    </main>
  );
}
