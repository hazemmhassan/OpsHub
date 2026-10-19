# Phase 7 Core MVP hardening

Status: Complete locally on 19 October 2026.

Phase 7 closes the Core MVP with security, privacy, accessibility,
responsiveness, clean-setup, and end-to-end evidence. All browser scenarios use
synthetic data. The Playwright suite creates its own temporary administrator and
removes that account and its request data after the run.

## Improvements made

- Added a committed Playwright and Chromium end-to-end suite.
- Added automated axe accessibility scans for the English entry point, Arabic
  request form, and mobile staff request detail.
- Added a localized keyboard skip link and visible focus treatment.
- Moved focus to the public validation summary when client or server validation
  fails.
- Added browser autofill metadata for contact and company fields.
- Removed a redundant brand `aria-label` that conflicted with the visible name.
- Kept the honeypot out of the accessibility tree while preserving server-side
  bot detection.
- Added Content Security Policy, clickjacking, MIME-sniffing, referrer,
  cross-origin, and browser-permission response headers.
- Added `private, no-store` caching for staff routes and production-only HSTS.
- Added a production bundle check that keeps server credentials out of browser
  assets.
- Removed the incorrect Turbopack workspace-root warning from clean builds.

## Core MVP acceptance evidence

| Acceptance criterion                           | Result | Evidence                                                                                                                                 |
| ---------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Arabic mobile submission                       | Passed | Phase 7 Playwright submits the Arabic company form at 390 by 844 pixels.                                                                 |
| English LTR submission                         | Passed | Phase 5 recorded an English individual submission; Phase 7 rechecks English `dir=ltr`.                                                   |
| Arabic-Indic and Western digit normalization   | Passed | Web normalization tests and the Arabic Playwright journey store `٠١٠١٢٣٤٥٦٧٨` as `+201012345678`.                                        |
| Raw phone, E.164, and mismatch warning         | Passed | Web tests cover the warning without rejection; the browser detail shows normalized E.164 while database tests protect both fields.       |
| Company-only fields dropped for individuals    | Passed | Request parser tests submit company values with `individual` and assert that the server result removes them.                             |
| Submitted locale stored automatically          | Passed | Submission RPC tests and the bilingual browser journeys verify `ar` and `en`.                                                            |
| Versioned consent with server time and locale  | Passed | Submission schema and RPC assertions verify the text version, server timestamp, and locale.                                              |
| Same idempotency key creates one request       | Passed | Concurrent submission RPC test returns one original request and one replay.                                                              |
| Different idempotency keys remain separate     | Passed | Submission RPC assertions keep otherwise identical submissions separate.                                                                 |
| Public client cannot choose an organization    | Passed | The public action derives the organization from the active form; tenant and RPC tests reject cross-organization links.                   |
| Random reference grants no data access         | Passed | References satisfy the random 10-character format; confirmation shows no requester data and there is no public lookup route.             |
| Approver or administrator can decide           | Passed | Workflow RPC tests cover both roles and Phase 7 completes the administrator approval journey.                                            |
| Start Review is idempotent                     | Passed | Concurrent RPC assertions return the current state with one review event.                                                                |
| Rejection requires a reason                    | Passed | Validation and workflow RPC tests reject missing or short reasons.                                                                       |
| A second final decision is refused             | Passed | Workflow RPC assertions return `request_conflict`.                                                                                       |
| Concurrent final decisions have one winner     | Passed | Phase 5 concurrency evidence and RPC locking assertions show one result, one conflict, and the winning actor.                            |
| Approval and delivery creation are atomic      | Passed | Workflow RPC assertions verify the final decision, audit event, immutable payload, and pending delivery in one transaction.              |
| One approval creates one integration event     | Passed | Unique constraints and workflow tests keep one delivery per approved request across retries.                                             |
| Successful n8n delivery creates one Sheets row | Passed | Phase 6 sent the same signed reference twice and verified one row followed by one update.                                                |
| Failed delivery is visible                     | Passed | Delivery component tests and the Phase 6 browser scenario show safe failure details.                                                     |
| Authorized retry recovers failed work          | Passed | Delivery RPC and Phase 6 browser evidence verify pending status, one added attempt, and preserved history.                               |
| Unauthorized retry is refused                  | Passed | RLS and manual-retry RPC assertions reject non-administrators.                                                                           |
| Tenant isolation                               | Passed | Cross-organization reads, writes, decisions, delivery access, and composite relationships are covered by database tests.                 |
| Material actions are audited                   | Passed | Submission, review, decision, delivery, failure, success, dead-letter, and manual-retry events are asserted with actors and timestamps.  |
| Full synthetic E2E                             | Passed | Playwright covers Arabic intake, normalization, safe failed login, valid staff login, Start Review, approval, and delivery-job activity. |
| Clean setup                                    | Passed | The empty local database was rebuilt successfully from all seven migrations and `supabase/seed.sql`, then the full suite passed.         |

## Security and privacy review

No P0 security or privacy defect remains in the local Core MVP.

- Server credentials remain in ignored environment files and server-only
  modules. They are not present in the browser bundle or tracked files.
- Public and staff inputs are validated at the server boundary. Staff mutations
  re-check active membership and role before calling service-role-only RPCs.
- PostgreSQL RLS, composite foreign keys, explicit grants, and locked RPC state
  transitions enforce tenant and workflow boundaries independently of the UI.
- Worker logs contain fixed event names and safe error codes, not request
  payloads, signatures, credentials, or arbitrary exception messages.
- The public confirmation page exposes only the random reference. Requester
  details remain available only to authorized organization staff.
- The n8n export contains no credential identifiers or secrets. Live Google
  credentials remain in the ignored local n8n credential store.

Two accepted conditions are recorded rather than hidden:

1. Next.js hydration currently requires `unsafe-inline` in `script-src`; the
   policy still restricts scripts to the application origin, blocks framing and
   plugins, and removes `unsafe-eval` in production. A nonce-based policy can be
   added when the deployment platform is selected.
2. The full development dependency audit reports the current unfixed
   `braces` glob-depth advisory through Next's ESLint tooling. Production
   dependency audits are clean, the affected tool runs only on trusted source
   patterns, and npm's proposed fix is an incompatible Next ESLint downgrade.

For deployment, place the application behind a trusted proxy that overwrites
client IP forwarding headers. The local rate-limit subject intentionally uses
those headers because Next.js does not expose a portable remote address.

## Final verification results

| Check                                              | Result                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| Fresh database rebuild                             | Seven migrations and seed data applied successfully                       |
| PostgreSQL and pgTAP                               | 176 assertions passed across 10 files                                     |
| Database lint                                      | No schema errors                                                          |
| Web unit and component tests                       | 46 passed across 19 files                                                 |
| Playwright browser tests                           | 2 passed in Chromium                                                      |
| Accessibility scans                                | No axe violations on the tested English, Arabic, public, or staff screens |
| Worker tests                                       | 54 passed; 1 environment-gated integration test skipped by default        |
| n8n workflow contract                              | 6 passed                                                                  |
| n8n import and Compose validation                  | Passed with pinned n8n 2.43.7                                             |
| TypeScript, ESLint, and formatting                 | Passed                                                                    |
| Web and worker production builds                   | Passed                                                                    |
| Root, web, and worker production dependency audits | 0 known vulnerabilities                                                   |
| Production browser-bundle secret scan              | No server secret found                                                    |
| Production response headers                        | Required headers present; no production `unsafe-eval`                     |
| Browser-test cleanup                               | 0 temporary users and 0 temporary requests remained                       |

## Reproducible verification

From the repository root, with Docker Desktop and local Supabase running:

```bash
npm run db:test
npx supabase db lint --local
npm --prefix apps/web test
npm --prefix apps/web run test:e2e
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
npm --prefix apps/web run format:check
npm --prefix apps/web run build
npm run worker:test
npm run worker:typecheck
npm run worker:build
npm run n8n:test
```

Install the Playwright browser once on a new machine:

```bash
npm --prefix apps/web exec playwright install chromium
```

The live Google Sheets result is recorded in the Phase 6 checkpoint and is not
repeated automatically because it depends on the developer's private Google
credential.
