# OAATZ Recruitment Outreach

Next.js + PostgreSQL starter for verified UAE manpower/recruitment partnership prospects.

## Included
- Prospect CRM dashboard and database schema
- SMTP transport for RillaHost cPanel settings
- Authenticated sending endpoint with hard sending-off switch
- Daily sending cap (default 10) and suppression list

## Setup
1. Create a PostgreSQL database (Neon or Supabase).
2. Copy .env.example to .env.local and set secrets.
3. npm install
4. npx prisma generate && npx prisma db push
5. npm run dev

## RillaHost settings
SMTP mail.oaatz.com:465 SSL/TLS; IMAP mail.oaatz.com:993 SSL/TLS. Username temidayo@oaatz.com. Put passwords only in deployment secrets, never in Git.

## Production work still required
- Add secure admin authentication and role protection.
- Implement IMAP inbox polling and reliable reply/bounce detection.
- Implement a scheduler/queue for day-5/day-12 follow-ups; check replies and opt-outs before each send.
- Configure and verify SPF, DKIM and DMARC with RillaHost.
- Add unsubscribe handling and comply with applicable privacy/anti-spam rules.
- Use verified, relevant business contacts and honour objections promptly.
- Keep SEND_ENABLED=false until recipient list and message templates are reviewed and explicitly approved.

## Vercel
Import this repository into Vercel, add environment variables from .env.example, connect PostgreSQL, then deploy.
