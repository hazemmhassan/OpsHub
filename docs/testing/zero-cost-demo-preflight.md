# OpsHub Zero-Cost Demo Preflight

**Status:** Zero-cost public demo smoke passed

**Verified:** 20 October 2026

## Prepared in this checkpoint

- a standalone, non-root production image for the Next.js web application
- a USD 0 demo architecture with no paid hosting dependency
- a consistent public form identifier, `opshub-service-request`, across the
  landing page, seed, browser tests, and current guides
- a temporary HTTPS sharing procedure using Cloudflare Quick Tunnel
- clear limits separating a shareable demo from client production

No paid account, payment method, public endpoint, production database, or
production secret was created during this checkpoint.

## Fresh verification evidence

| Area | Result |
| --- | --- |
| Web unit and component tests | 59 passed across 22 files |
| Web static checks | TypeScript, ESLint, and Prettier passed |
| Web production build | Passed; 33 routes generated |
| Core browser flow | 2 passed in Chromium; 1 intentionally disabled AI journey skipped |
| PostgreSQL | 182 pgTAP assertions passed across 11 files |
| Database lint | No schema errors |
| Delivery worker | 54 passed; 1 environment-gated test skipped; typecheck and build passed |
| AI service | 39 tests passed; Ruff and strict Mypy passed |
| n8n | 6 contract tests passed; Compose configuration and pinned workflow import passed |
| Production dependency audit | Root, web, and worker reported 0 known production vulnerabilities; Python requirements are consistent |
| Web image | Built successfully and ran as non-root user `nextjs` |
| Web container smoke | `/en` returned 200 with `X-Frame-Options: DENY` and the corrected request link |
| Temporary HTTPS tunnel | English, Arabic, request-form, and staff sign-in routes returned 200 with `X-Frame-Options: DENY` |
| Public end-to-end smoke | Synthetic request `SJGHAVB8KV` was submitted, reviewed, approved, and delivered successfully in one attempt |
| Secret review | No tracked real environment files or high-risk token patterns found |
| Diff hygiene | `git diff --check` reported no whitespace errors |

The browser and database checks used synthetic local data. The worker reported
one claimed and one successful delivery, and the application timeline recorded
`Delivery succeeded`. The private Google Sheet itself was not opened during
this checkpoint.

The disposable staff account and all exact local database records for reference
`SJGHAVB8KV` were removed after the evidence was captured. The n8n destination
may retain the synthetic upserted row so Hazem can inspect or remove it in the
private Sheet.

## Ready state

The temporary HTTPS address can now be used for a guided review while the local
stack and tunnel remain running. This result may be called a shareable demo,
but not an always-on or production deployment.
