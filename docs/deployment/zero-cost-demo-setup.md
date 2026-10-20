# OpsHub Zero-Cost Demo Setup

**Selected profile:** Shareable local demo

**Cost:** USD 0

**Prepared:** 20 October 2026

**Current state:** The application and its production-style containers are
verified locally. No paid account or public resource has been created.

## 1. Purpose

This profile lets Hazem demonstrate the complete OpsHub workflow through a
temporary public HTTPS address without paying for hosting.

The application remains on Hazem's computer. Cloudflare Quick Tunnel forwards
requests to it while the demo is running. The address stops working when the
tunnel or computer stops and usually changes the next time it starts.

This is suitable for portfolio reviews, recorded demonstrations, and guided
client calls. It is not described as an always-on production deployment.

## 2. Demo layout

| Component | Location | Public? |
| --- | --- | --- |
| Next.js web application | Hazem's computer | Through the temporary tunnel |
| PostgreSQL and authentication | Local Supabase containers | No |
| Delivery worker | Hazem's computer | No |
| n8n and its persistent local volume | Local Docker | No |
| Google Sheets | Hazem's private Google account | Only through the existing n8n credential |
| Optional AI service | Hazem's computer, mock mode | No |

Only the web application needs a tunnel. The worker can call the local n8n
webhook directly, and n8n makes the outbound Google Sheets request.

## 3. Cost boundary

- Do not enter a payment card for this demo.
- Do not create Railway, Render, Vercel Pro, Supabase Pro, or another paid
  resource.
- Do not enable a free trial that automatically converts to a paid plan.
- Stop if any provider asks for payment or billing authorization.

Cloudflare documents Quick Tunnels as free, temporary, and available without
an account or domain. They are intended for testing and demonstrations and do
not provide an uptime guarantee.

Reference:

- [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)

## 4. Safe demo data

- Use synthetic names, email addresses, phone numbers, company details, and
  request descriptions.
- Never collect a real client's confidential or personal information through
  this temporary environment.
- Keep the AI intake disabled or in deterministic mock mode.
- Do not share the n8n editor, Supabase Studio, environment files, or staff
  credentials.
- Use Cloudflare's email restriction when sharing with one known reviewer.

## 5. Start the complete local stack

Docker Desktop must be running. From the repository root:

```powershell
npm.cmd run db:start
docker compose --env-file n8n/.env -f n8n/compose.yml up -d
```

Start the delivery worker in its own terminal:

```powershell
npm.cmd run worker:dev
```

Start the web application in another terminal:

```powershell
Set-Location apps/web
npm.cmd run build
npm.cmd run start
```

The optional AI service remains disabled for the normal Core MVP demo. Its mock
mode can be started separately only when demonstrating the Phase 8 assistant.

## 6. Create the temporary HTTPS address

In a new terminal, expose the local web application:

```powershell
docker run --rm cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://host.docker.internal:3000
```

Cloudflare prints a random `https://*.trycloudflare.com` address. Share only
that address. The Docker form is used because Docker Desktop is already part of
the OpsHub local environment. Stop the tunnel with `Ctrl+C` when the
demonstration ends.

For a private review, install or run the current `cloudflared` release and
restrict access to the reviewer's email:

```powershell
cloudflared tunnel --url http://127.0.0.1:3000 --allowed-mail reviewer@example.com
```

Replace the example address with the real reviewer address. Do not commit it.

## 7. Demo smoke test

1. Open the temporary English and Arabic landing pages.
2. Submit one synthetic request.
3. Sign in as local staff and start review.
4. Approve the request.
5. Confirm the worker delivers it through local n8n.
6. Confirm exactly one Google Sheets row exists for the request reference.
7. Retry the same delivery and confirm the row updates instead of duplicating.
8. Stop the tunnel and confirm the temporary public address no longer works.

## 8. Honest service boundary

The repository and demo prove the implemented workflow. A real client's
always-on deployment requires hosting supplied and paid for by that client, or
infrastructure they already own. Hazem does not need to personally fund client
hosting to offer implementation, customization, setup, training, or support.
