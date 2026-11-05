import { NextResponse } from "next/server";
import { mailer } from "@/lib/mailer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.SMTP_TEST_SECRET;
  const authorization = req.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipient = process.env.SMTP_USER;
  if (!recipient) {
    return NextResponse.json({ error: "SMTP_USER is not configured" }, { status: 503 });
  }

  try {
    const transport = mailer();
    await transport.verify();

    const info = await transport.sendMail({
      from: `OAATZ Cosult Ltd <${recipient}>`,
      to: recipient,
      subject: "OAATZ Mailoutreach — SMTP connection test",
      text: [
        "This is a test message from the OAATZ Cosult Ltd Mailoutreach application.",
        "",
        "SMTP authentication and message submission succeeded.",
        "No recruitment contacts were emailed.",
      ].join("\n"),
    });

    return NextResponse.json({
      ok: true,
      recipient,
      messageId: info.messageId,
      message: "SMTP verification passed and the test email was submitted.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown SMTP error";
    console.error("SMTP self-test failed:", message);
    return NextResponse.json(
      { ok: false, error: "SMTP test failed. Check the SMTP credentials and cPanel mail settings." },
      { status: 502 },
    );
  }
}
