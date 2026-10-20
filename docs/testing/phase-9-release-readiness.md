# OpsHub Phase 9 Release Readiness

**Status:** Local release package complete; temporary public demo verified

**Verified:** 20 October 2026

> This report records the Phase 9 release checkpoint. The later zero-cost demo
> verification is summarized below and documented fully in
> [zero-cost-demo-preflight.md](zero-cost-demo-preflight.md).

## What Phase 9 added

- a distinct bilingual public visual system and stronger product copy
- responsive English desktop and Arabic mobile product storytelling
- production Docker images for the TypeScript worker and FastAPI AI service
- an evidence-based production architecture, deployment order, rollback plan,
  environment boundary, and hosting comparison
- curated production-build screenshots without developer overlays
- a case study, three-minute demo script, service packages, CV bullets, and
  freelance profile copy
- README links and a truthful release status
- an automated Arabic mobile landing-page overflow and axe check

## Defect found and fixed

Production browser inspection found a background 404 on Arabic staff sign-in.
The language switcher was prefetching an authenticated alternate-locale route
under Next.js partial prefetching. Normal navigation still worked, but the
failed background request polluted the browser console.

Locale-switch links now disable prefetch. A regression test first reproduced
the missing setting, then passed after the fix. The production Arabic sign-in
page was reopened and reported zero console errors.

## Final local evidence

| Area                            | Result                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| PostgreSQL and tenant isolation | 182 pgTAP assertions passed across 11 files                                                  |
| Database lint                   | No schema errors                                                                             |
| Web unit and component tests    | 59 passed across 22 files                                                                    |
| Web static checks               | TypeScript, ESLint, and Prettier passed                                                      |
| Web production build            | Passed; 33 pages generated                                                                   |
| Core browser journey            | 2 passed in Chromium; 1 provider-gated AI journey skipped                                    |
| Accessibility                   | No axe violations on tested English and Arabic public, form, and staff screens               |
| Responsive behavior             | Arabic landing and request flow passed 390 by 844 overflow checks                            |
| Delivery worker                 | 54 passed; 1 environment-gated integration test skipped; typecheck, format, and build passed |
| n8n                             | 6 contract tests passed; Compose config and pinned workflow import passed                    |
| AI service                      | 39 Pytest tests, Ruff, strict Mypy, and `pip check` passed                                   |
| Deployment images               | Worker and AI images built; both use non-root users                                          |
| AI container smoke              | `/health` and `/ready` passed with deterministic mock provider                               |
| Production dependency audits    | Root, web, and worker reported 0 known vulnerabilities                                       |
| Browser bundle scan             | No server-only variable names or configured secret values found                              |

The browser suite created only synthetic data and completed its registered
cleanup. The live Google Sheets result from Phase 6 was not repeated because it
depends on the developer's private Google credential.

## Curated screenshots

- [`opshub-home-en.png`](../assets/screenshots/opshub-home-en.png)
- [`opshub-home-ar-mobile.png`](../assets/screenshots/opshub-home-ar-mobile.png)
- [`opshub-request-en.png`](../assets/screenshots/opshub-request-en.png)
- [`opshub-staff-signin-ar-mobile.png`](../assets/screenshots/opshub-staff-signin-ar-mobile.png)

## Claims allowed now

- implemented and verified locally
- bilingual Arabic RTL and English LTR workflow
- tested human approval, audit, retries, and idempotent n8n delivery
- local Google Sheets append-then-update evidence using one stable reference
- deterministic 50-case mock AI evaluation
- production container images build and the AI image passes local readiness
- temporary public demo verified with synthetic data while the local stack and
  tunnel are running

## Claims not allowed yet

- permanently deployed, production-ready, or used by active clients
- always-on worker or n8n hosting
- production backup, restore, uptime, or incident-response evidence
- live-provider AI quality, latency, or cost
- public customer volume, conversion, time savings, or reliability metrics

## Temporary public demo evidence

On 20 October 2026, the zero-cost demo profile passed route, security-header,
and complete synthetic request-to-delivery smoke checks through a temporary
Cloudflare Quick Tunnel. The disposable staff account and exact local database
records were removed afterward. The URL is temporary and does not represent an
always-on service.

## Remaining production gates

1. A team selects and approves its permanent hosting profile and any paid
   services.
2. Hazem provides or configures the required hosting projects, domain, and
   secret stores without sharing secrets in chat or Git.
3. The committed migrations, n8n workflow, worker, web app, and optional AI
   service are deployed in the documented order.
4. The synthetic live smoke workflow passes from request through Google Sheets.
5. Backups, monitoring, trusted proxy behavior, and rollback are verified in
   the selected environment.
6. The live-provider 50-case evaluation passes before public AI is enabled.
7. The demo script is recorded, reviewed for hidden credentials or personal
   data, captioned, and published.

Until those gates pass, the repository is locally release-ready and can be
shared as a temporary demo, but the project is not described as a live
production service.
