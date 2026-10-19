# OpsHub

I am building OpsHub to help small businesses and teams manage service requests,
approvals, and business automation in one clear place. It supports both Arabic
and English so each team can work in the language that suits them.

Many teams still receive requests through messages, forms, and spreadsheets.
Important details can get lost, approvals become difficult to follow, and a
failed automation may go unnoticed. OpsHub is designed around these real
problems and aims to make the whole process easier to manage and trust.

OpsHub is currently in active development. The product and engineering design
are approved, and the application is being built step by step. The features
below describe the first release. The request and review workflow is now
implemented locally, including reliable delivery through n8n to Google Sheets.

## What I want OpsHub to solve

Small teams often receive business requests through disconnected forms,
messages, and spreadsheets. This makes approvals difficult to track and
automation failures easy to miss.

With OpsHub, the full workflow can stay in one controlled system:

```mermaid
flowchart LR
    A[Bilingual service request] --> B[Staff review]
    B --> C{Decision}
    C -->|Approved| D[Durable integration delivery]
    C -->|Rejected| E[Recorded rejection reason]
    D --> F[n8n workflow]
    F --> G[Google Sheets]
```

## First release

I am starting with a focused release that is useful, secure, and testable:

- One predefined business service request form
- Arabic RTL and English LTR interfaces
- Individual and company request branches
- Staff authentication with approver and administrator roles
- A clear `submitted -> under_review -> approved | rejected` workflow
- Pool approval model where the first valid final decision wins
- Immutable request snapshot and append only audit timeline
- Idempotent public submission
- Reliable at least once delivery with retries and dead letter handling
- HMAC signed webhook to n8n
- Idempotent Google Sheets upsert using the request reference
- Isolation between organizations through PostgreSQL constraints and Row Level
  Security

Public request tracking, notifications, workflow builders, multiple connectors,
and AI assisted intake are planned for later stages.

## User roles

| Role          | Core responsibility                                                       |
| ------------- | ------------------------------------------------------------------------- |
| Requester     | Submit a service request in Arabic or English without creating an account |
| Approver      | Review requests and make the first valid approval or rejection            |
| Administrator | Perform approver actions and inspect or retry failed deliveries           |

## Technology plan

| Area                        | Technology                                                         |
| --------------------------- | ------------------------------------------------------------------ |
| Web application             | Next.js, React, TypeScript                                         |
| Interface                   | Tailwind CSS, shadcn/ui, next-intl                                 |
| Forms and validation        | React Hook Form, Zod, libphonenumber-js                            |
| Database and authentication | Supabase, PostgreSQL, Supabase Auth                                |
| Automation                  | TypeScript worker, n8n Community Edition, Google Sheets            |
| Testing                     | Vitest, React Testing Library, Playwright, Supabase database tests |
| Later AI module             | FastAPI, Pydantic, evaluated bilingual RAG intake                  |

Exact package versions are locked in the repository manifests.

## How I am building it

- The browser never chooses the authoritative organization identifier.
- Authorization is enforced on the server and in PostgreSQL, not only in the UI.
- Tenant relationships use composite foreign keys to prevent links between
  organizations
- Request state and integration delivery state are separate.
- Final decisions and delivery creation are atomic.
- Workers use short database claims, leases, and fencing tokens.
- External calls happen outside database transactions.
- Retries may repeat a webhook, so the receiver performs an idempotent upsert.
- Secrets remain in server environments and never enter client bundles.
- Public demonstrations use synthetic data only.

## Delivery roadmap

- [x] Define and validate the focused product scope
- [x] Approve bilingual flows and state machines
- [x] Approve schema, RLS, RPC, worker, webhook, and testing design
- [x] Create the reproducible project foundation
- [x] Implement authentication and tenant isolation
- [x] Implement request intake and staff review
- [x] Implement the reliable database queue and signed delivery worker
- [x] Connect and verify live n8n and Google Sheets delivery
- [x] Complete security, accessibility, and end to end verification
- [ ] Add and evaluate the optional bilingual AI intake module
- [ ] Prepare the verified project for teams that want to use or adapt it

## Current repository stage

I am building this repository through small, reviewed commits. The reproducible
foundation, staff authentication, organization roles, tenant isolation,
bilingual public intake, and the staff review and decision flow are implemented
locally. The database queue and signed delivery worker are also implemented and
verified locally.

The importable n8n receiver, Google Sheets append-or-update mapping, and a
no-Google local receiver are now implemented. The n8n workflow is active in the
pinned local n8n release and has completed a live Google Sheets append followed
by a duplicate update using the same request reference. Administrator-only
delivery diagnostics and manual recovery are implemented and verified in both
Arabic and English.

The Core MVP acceptance checkpoint now passes the database, web, browser,
worker, and n8n contract suites together with database linting, accessibility
scans, TypeScript, formatting, production dependency audits, and production
builds. The clean local database rebuild and complete evidence matrix are
recorded in the Phase 7 hardening report.

## Implemented now

The current local application includes:

- A public Arabic and English service request form
- Individual and company branches with company-only fields
- Unicode names, Arabic-Indic phone digits, country-aware phone normalization,
  safe website normalization, date rules, consent capture, and server validation
- Random non-sequential request references and idempotent double-submit handling
- Honeypot protection and a limit of five submission attempts per form and
  network subject every 15 minutes
- Staff sign-in with administrator and approver roles
- An organization-scoped request list with search and status filters
- Request details using the immutable submitted snapshot
- The required `submitted -> under_review -> approved | rejected` workflow
- Idempotent Start Review and first-final-decision-wins behavior
- A visible non-blocking warning when phone and country appear inconsistent
- An explicit confirmation step before a request is approved
- Required rejection reasons and a read-only activity timeline
- Atomic creation of a pending integration delivery after approval
- Short database claims with leases, `SKIP LOCKED`, and fencing tokens
- Immutable V1 webhook payloads without internal IDs or raw consent data
- HMAC-SHA256 signed delivery with exact-origin restrictions and no redirects
- Full-jitter retry scheduling, dead-letter handling, and admin-only retry RPC
- Safe response validation, timeout handling, and a 64 KiB response limit
- An importable n8n workflow that verifies the raw-body signature before the
  Google credential boundary
- Google Sheets Append or Update Row mapping keyed by request reference
- Live Google Sheets verification showing that a repeated reference updates the
  existing row and preserves the E.164 phone number as text
- A pinned local n8n Docker configuration with no committed credentials
- A local in-memory receiver for demonstrations without Google credentials
- Administrator-only delivery diagnostics with safe status, attempt, and error
  details
- Confirmed manual recovery for failed or stopped deliveries without erasing
  attempt history
- PostgreSQL constraints and Row Level Security that isolate organizations
- Automated English and Arabic browser journeys with mobile, keyboard,
  accessibility, security-header, and cleanup checks
- Security response headers and private no-store caching for staff pages

The live Google credential remains only in the local n8n credential store, and
the destination spreadsheet settings remain in the ignored local environment.
No Google credentials are stored in this repository.

## Local development

The current foundation uses Node.js 24, npm 11, and Docker Desktop. Install the
repository tooling and web application dependencies separately:

```bash
npm ci
npm --prefix apps/web ci
npm --prefix apps/worker ci
npm --prefix apps/web exec playwright install chromium
```

Start Docker Desktop, then use the repository commands to manage and test the
local database:

```bash
npm run db:start
npm run db:status
npm run db:test
npm run db:stop
```

The local Supabase stack is for development only and must not be exposed as a
production service.

Copy the web environment template to `apps/web/.env.local`, then use
`npx supabase status -o env` to map `API_URL` to
`NEXT_PUBLIC_SUPABASE_URL`, `PUBLISHABLE_KEY` to
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SECRET_KEY` to
`SUPABASE_SECRET_KEY`. Use a separate random value of at least 32 characters
for `PUBLIC_SUBMISSION_RATE_LIMIT_KEY`. Never commit `.env.local`.

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
npm --prefix apps/web run dev
```

Run the repeatable browser journey after Supabase is ready. It creates a
temporary synthetic administrator and request, verifies the full workflow, and
removes both afterward.

```bash
npm --prefix apps/web run test:e2e
```

To run one local worker batch, copy the worker environment template, replace
the placeholders with the local values from `npx supabase status -o env`, and
use a random signing secret of at least 32 characters:

```powershell
Copy-Item apps/worker/.env.example apps/worker/.env.local
npm run worker:dev -- --once
```

The secret value belongs only in `.env.local` and must never be committed.

## Project documents

- [Core MVP specification](docs/product/mvp-spec.md)
- [Bilingual flows and state machines](docs/architecture/phase-2a-flows-and-state-machines.md)
- [Engineering design](docs/architecture/phase-2b-engineering-design.md)
- [Phase 5 manual testing checklist](docs/testing/phase-5-manual-test-checklist.md)
- [Phase 6 delivery worker checkpoint](docs/testing/phase-6-worker-checkpoint.md)
- [Phase 7 Core MVP hardening](docs/testing/phase-7-core-mvp-hardening.md)
- [n8n receiver setup](n8n/README.md)
