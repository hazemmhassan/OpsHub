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
implemented locally, while reliable external delivery is the next stage.

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

| Role | Core responsibility |
|---|---|
| Requester | Submit a service request in Arabic or English without creating an account |
| Approver | Review requests and make the first valid approval or rejection |
| Administrator | Perform approver actions and inspect or retry failed deliveries |

## Technology plan

| Area | Technology |
|---|---|
| Web application | Next.js, React, TypeScript |
| Interface | Tailwind CSS, shadcn/ui, next-intl |
| Forms and validation | React Hook Form, Zod, libphonenumber-js |
| Database and authentication | Supabase, PostgreSQL, Supabase Auth |
| Automation | TypeScript worker, n8n Community Edition, Google Sheets |
| Testing | Vitest, React Testing Library, Playwright, Supabase database tests |
| Later AI module | FastAPI, Pydantic, evaluated bilingual RAG intake |

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
- [ ] Implement reliable n8n and Google Sheets delivery
- [ ] Complete security, accessibility, and end to end verification
- [ ] Add and evaluate the optional bilingual AI intake module
- [ ] Prepare the verified project for teams that want to use or adapt it

## Current repository stage

I am building this repository through small, reviewed commits. The reproducible
foundation, staff authentication, organization roles, tenant isolation,
bilingual public intake, and the staff review and decision flow are implemented
locally. The next stage is the reliable delivery worker and the n8n and Google
Sheets integration.

The current acceptance checkpoint passes 132 database assertions and 37 web
tests, together with database linting, TypeScript, ESLint, formatting, dependency
audits, and the production build. The complete Phase 5 workflow has also been
exercised in a real browser in both languages, including approval, rejection,
rate limiting, honeypot protection, and concurrent submissions and decisions.
The detailed evidence is recorded in the Phase 5 testing checklist.

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
- PostgreSQL constraints and Row Level Security that isolate organizations

The delivery worker, n8n workflow, Google Sheets upsert, delivery retries, and
manual retry interface are not implemented yet. They belong to the next phase.

## Local development

The current foundation uses Node.js 24, npm 11, and Docker Desktop. Install the
repository tooling and web application dependencies separately:

```bash
npm ci
npm --prefix apps/web ci
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

## Project documents

- [Core MVP specification](docs/product/mvp-spec.md)
- [Bilingual flows and state machines](docs/architecture/phase-2a-flows-and-state-machines.md)
- [Engineering design](docs/architecture/phase-2b-engineering-design.md)
- [Phase 5 manual testing checklist](docs/testing/phase-5-manual-test-checklist.md)
