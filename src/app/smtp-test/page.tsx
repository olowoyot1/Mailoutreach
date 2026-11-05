"use client";

import { useState } from "react";

export default function SmtpTestPage() {
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; message?: string; error?: string } | null>(null);

  async function runTest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/smtp-test", {
        method: "POST",
        headers: { authorization: "Bearer " + secret },
      });
      const data = await response.json();
      setResult(response.ok
        ? { ok: true, message: data.message || "Test email submitted successfully." }
        : { ok: false, error: data.error || "SMTP test failed." });
    } catch {
      setResult({ ok: false, error: "Could not reach the SMTP test endpoint. Please try again." });
    } finally {
      setBusy(false);
      setSecret("");
    }
  }

  return (
    <main style={{ maxWidth: 560, margin: "48px auto", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <a href="/" style={{ color: "#555" }}>← Back to outreach dashboard</a>
      <h1 style={{ marginTop: 28 }}>SMTP connection test</h1>
      <p>This sends exactly one test email to the configured sender mailbox (temidayo@oaatz.com). It does not contact recruitment prospects or enable campaign sending.</p>
      <form onSubmit={runTest}>
        <label htmlFor="secret" style={{ display: "block", fontWeight: 600, margin: "24px 0 8px" }}>SMTP test security key</label>
        <input id="secret" type="password" autoComplete="off" required value={secret}
          onChange={event => setSecret(event.target.value)}
          placeholder="Enter the SMTP_TEST_SECRET you saved in Vercel"
          style={{ width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid #aaa", borderRadius: 6 }} />
        <button type="submit" disabled={busy} style={{ marginTop: 16, padding: "12px 18px", border: 0, borderRadius: 6, background: "#111", color: "#fff", cursor: busy ? "wait" : "pointer" }}>
          {busy ? "Testing SMTP…" : "Send test email to my mailbox"}
        </button>
      </form>
      {result && <p role="status" style={{ marginTop: 24, padding: 14, borderRadius: 6, background: result.ok ? "#e8f5e9" : "#ffebee", color: result.ok ? "#1b5e20" : "#b71c1c" }}>
        {result.ok ? result.message : result.error}
      </p>}
    </main>
  );
}
