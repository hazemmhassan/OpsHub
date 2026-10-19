# OpsHub MVP and Portfolio V1 Specification

**Working title:** OpsHub<br>
**Product description:** Arabic-first request, approval, and automation platform<br>
**Document status:** Proposed implementation baseline<br>
**Last updated:** 2026-10-14

## 1. Executive decision

OpsHub will be the flagship project, but it will not be implemented as three
large products at once.

The implementation has two separate finish lines:

1. **Core MVP:** a reliable, deterministic request-to-approval-to-integration
   workflow.
2. **Portfolio V1:** the Core MVP plus an evaluated Arabic and English AI intake
   assistant.

The Core MVP must work completely without an LLM. The AI assistant may improve
the intake experience, but it must not control approvals, bypass validation, or
become a single point of failure.

## 2. Product positioning

### One-line description

OpsHub helps small B2B service teams collect Arabic and English requests,
approve them through a controlled workflow, and synchronize approved records
with external tools without losing history or manually retyping data.

### Primary initial use case

The first use case is **B2B service request intake and approval**.

Example:

1. A customer opens a public Arabic or English request page.
2. The customer identifies as an individual or company.
3. The customer submits contact details, request type, and request details.
4. The system validates and stores the request.
5. An approver reviews it and approves or rejects it with a reason.
6. An approved request creates a durable integration job.
7. The job sends the approved data to an n8n webhook.
8. n8n adds the record to Google Sheets.
9. OpsHub records the delivery result in the audit timeline.
10. A failed delivery can be inspected and retried by an authorized user.

### Primary target user

A small B2B service or outsourcing team that currently receives requests in
forms, spreadsheets, email, or messages and needs a controlled approval and
handoff process.

### Secondary potential users

- Training and education providers
- Agencies and consultancies
- Internal operations teams
- Supplier or partner onboarding teams
- Service companies with request-review workflows

These segments are future adaptations, not separate MVPs.

## 3. Problem statement

Small teams frequently collect requests through disconnected channels and then
copy data manually into spreadsheets or other systems. This creates missing or
invalid fields, unclear approval ownership, duplicate work, failed handoffs,
and no trustworthy record of who performed each action.

Generic chatbots do not solve this problem because a useful operational request
must be structured, validated, approved, delivered reliably, and auditable.

## 4. Product hypotheses to validate

The following are hypotheses until Phase 0 supports them with current evidence:

- Arabic-first and RTL workflows are underserved for the selected customer
  segment.
- Request intake and approval automation appears repeatedly in freelance work.
- Google Sheets and generic webhooks are useful initial integrations.
- Businesses will value conversational AI intake more when it produces validated
  records and supports human handoff.
- Salla or Shopify connectors are commercially useful enough to justify future
  implementation.

Phase 0 must separate verified marketplace evidence from assumptions. It should
not delay implementation once repeated patterns are clear.

## 5. Goals

### User goals

1. Allow a requester to submit a complete bilingual service request without
   needing an account.
2. Give an approver one place to review, approve, reject, and inspect request
   history.
3. Deliver approved records to an external workflow without silently losing
   failed deliveries.
4. Provide a clear audit trail for every material action.
5. Allow Arabic and English users to complete the main flow comfortably on
   desktop and mobile.

### Portfolio and learning goals

1. Demonstrate full-stack TypeScript development with Next.js.
2. Demonstrate PostgreSQL data modeling, migrations, Supabase Auth, RLS, and
   tenant isolation.
3. Demonstrate reliable webhook integration using idempotency, an outbox, retry
   states, and observable errors.
4. Demonstrate workflow automation using n8n without making the application
   dependent on permanently free n8n hosting.
5. Add an evaluated Arabic and English AI capability after the deterministic
   product works.
6. Produce a project that can be split honestly into smaller freelance
   services.

## 6. Non-goals

The following are explicitly outside the Core MVP:

- A visual drag-and-drop form builder
- Arbitrary workflow diagrams or unlimited approval logic
- WhatsApp Business API integration
- Payments or subscriptions
- Tax-authority or e-invoicing integrations
- A full CRM
- Mobile applications
- Salla and Shopify production connectors
- Multiple AI providers
- Automatic AI approval or rejection
- A connector marketplace
- Scraping protected websites
- Enterprise analytics

Adding a new P0 feature requires removing another P0 feature or explicitly
creating a later release.

## 7. Personas and roles

### Public requester

Does not need an account. Submits a request and receives an opaque confirmation
reference. Public status tracking is deferred until P1; staff contact the
requester manually in the Core MVP.

### Approver

Views requests belonging to the organization, reviews their content, and
approves or rejects them. Rejection requires a recorded reason.

### Administrator

Manages basic organization settings, authorized users, integration settings,
failed jobs, and audit access. For the Core MVP, the administrator role includes
approver permission so a small organization does not require a separate user.

### Deferred roles

Dedicated workflow designer, integration operator, auditor, and organization
invitation flows are deferred until their need is demonstrated.

## 8. User stories

### Public requester

- As an Arabic-speaking requester, I want an RTL request experience so that I
  can submit information naturally.
- As a requester, I want the form to show only fields relevant to an individual
  or company so that I do not answer irrelevant questions.
- As a requester, I want clear validation errors so that I can correct the
  request before submission.
- As a requester, I want a confirmation reference so that I know the request
  was received.
- As a requester, I want to state my preferred contact method so that staff know
  how to contact me manually about the outcome.

### Approver

- As an approver, I want to see pending requests so that I know what needs a
  decision.
- As an approver, I want to inspect the original submitted data before making a
  decision.
- As an approver, I want rejection to require a reason so that the decision is
  understandable and auditable.
- As an approver, I want approved requests to be synchronized automatically so
  that I do not retype data.

### Administrator

- As an administrator, I want organization data isolated from other
  organizations so that users cannot access unrelated requests.
- As an administrator, I want to see failed synchronization jobs so that silent
  data loss does not occur.
- As an administrator, I want to retry a failed job safely so that temporary
  integration failures can be recovered.
- As an administrator, I want an audit timeline so that I can identify who did
  what and when.

## 9. Core MVP scope (P0)

### 9.1 Bilingual application shell

- Arabic and English navigation and content
- RTL and LTR layout support
- Responsive desktop and mobile design
- Accessible labels, keyboard navigation, and visible focus states
- Loading, empty, success, validation, and system-error states

### 9.2 Authentication and tenant isolation

- Supabase email authentication for staff
- One seeded demo organization
- Administrator and approver roles
- Tenant-aware schema with `org_id` on every tenant-owned table
- RLS policies on tenant-owned data
- Server-side authorization checks in addition to UI restrictions
- Tests proving that users cannot read or change another organization's data

The schema may support multiple organizations, but self-service organization
creation and member invitations are not required in the Core MVP.

### 9.3 Public request intake

- One predefined B2B service-request schema
- Arabic and English labels
- Server-side and client-side Zod validation
- Honeypot protection
- PostgreSQL-backed server-side rate limiting
- Idempotency key to prevent duplicate processing of the same submission
- Safe server-side resolution of the target organization using a public form
  identifier
- A random, non-sequential, 10-character Crockford Base32 confirmation reference
  after successful submission

The fixed service-category values are stored as language-neutral enum values and
configured with Arabic and English labels:

- Consulting
- IT and software
- Marketing
- Training
- Support and maintenance
- Other

The request fields and validation rules are:

| Field | Rule |
|---|---|
| Requester type | Required enum: `individual` or `company`; controls the visible and accepted branching fields |
| Contact name | Required; trim and collapse whitespace; accept Unicode without a Latin-only restriction |
| Email | Required; trim and lowercase |
| Phone | Required; accept Arabic-Indic digits; preserve the raw input and store a normalized E.164 value using `libphonenumber-js` with the selected country as the default region |
| Country | Required full country list with Egypt, Saudi Arabia, and the United Arab Emirates first; a valid phone/country mismatch produces a warning but does not block submission |
| Service category | Required enum from the fixed bilingual configuration |
| Request title | Required; 5 to 120 characters after trimming |
| Description | Required; 20 to 2,000 characters after trimming; show a short notice not to include sensitive data |
| Desired start date | Optional date-only value; today or later using the organization's configured timezone |
| Preferred contact method | Optional enum: `email` or `phone`; staff use the required email when no preference is supplied |
| Consent | Required; store the consent text version, server timestamp, and locale rather than only a boolean |
| Company name | Required only when requester type is `company` |
| Job title | Optional and accepted only when requester type is `company` |
| Company website | Optional and accepted only for companies; permit only HTTP or HTTPS, add `https://` when the scheme is missing, reject other schemes, and never fetch the URL server-side |
| Submitted locale | Store automatically as `ar` or `en` so staff know the requester's language |

The server must discard all company-only fields when requester type is
`individual`, even when a modified, stale, or malicious client sends them.
Tests must cover this behavior.

An invalid phone number fails validation. A valid number whose calling code does
not match the selected country produces a non-blocking warning for review.

Idempotency applies only to repeated processing with the same idempotency key.
Exact-duplicate or same-person detection is outside the Core MVP: two separately
submitted requests are two requests even when their content is identical.

The confirmation reference is suitable for display and staff communication but
is not an authentication credential. If public tracking is added later, it must
require email verification or a separate high-entropy tracking secret stored as
a hash; the short reference alone must not grant access to request data.

The browser must not be allowed to choose an arbitrary `org_id` or insert
directly into protected request tables.

### 9.4 Request management

- Request list with status and basic search/filtering
- Request detail page
- Request statuses: `submitted`, `under_review`, `approved`, and `rejected`
- Explicit Start Review action; opening a request does not change its status
- Idempotent Start Review behavior: if an authorized user acts on a request that
  is already `under_review`, return the current state without a hard conflict
- Approve action
- Reject action with required reason
- Immutable submission snapshot for the reviewed request
- Request activity timeline, including read-only integration events for delivery
  creation, success, failure, and manual retry

### 9.5 Approval workflow

- One predefined approval step for the initial MVP
- Pool model: any organization member with approver permission may decide
- The administrator role includes approver permission in the Core MVP
- Approval decision stored separately from the request
- Only an authorized approver or administrator can decide
- The first valid decision wins; row locking, a valid-state check, and a database
  uniqueness constraint prevent competing final decisions
- A losing concurrent decision receives a conflict response
- The audit log records the actual acting user and effective role
- Approved requests create exactly one integration event
- Workflow data model must allow ordered approval steps later without building a
  visual workflow editor now

### 9.6 Audit trail

- Append-only audit records for submission, review start, approval, rejection,
  integration job creation, delivery success, delivery failure, and manual retry
- Actor, organization, request, action, timestamp, and safe metadata
- No secrets or sensitive raw integration payloads in logs
- Audit entries cannot be edited through the application UI

### 9.7 Reliable integration

- Transactional outbox record created when approval succeeds
- Database-backed job states: pending, processing, succeeded, failed, and dead
- Idempotency key for each delivery
- Versioned outbound event schema
- One HMAC-signed outbound webhook
- One n8n workflow that receives the event and writes an approved record to
  Google Sheets
- Delivery result recorded in OpsHub
- Failed-jobs page with safe error information
- Authorized manual retry
- Retry attempt limit and dead-letter state

The web request must never wait for a long-running external workflow. No
long-running `wait` operation belongs inside a Next.js request handler.

### 9.8 Demonstration data

- Synthetic organizations, users, requests, approvals, failures, and audit
  events
- A repeatable seed command
- A script or fixture that simulates a representative day of requests
- No real customer or employer data

### 9.9 Testing

- Unit tests for normalization, validation, status transitions, and idempotency
- Integration tests for submission, authorization, approval, outbox creation,
  and retry behavior
- RLS tests for cross-user and cross-organization access
- One Playwright E2E test covering the primary journey
- One negative E2E or integration test for a failed webhook and retry

## 10. Core MVP acceptance criteria

The Core MVP is complete only when all of the following are demonstrated:

- [x] An Arabic requester can submit the predefined request on a mobile-sized
      screen.
- [x] An English requester can submit the same workflow in LTR mode.
- [x] Arabic-Indic and Western digits normalize consistently.
- [x] A valid phone is stored as both raw input and normalized E.164; a selected
      country mismatch warns without rejecting the request.
- [x] Company-only fields are removed server-side from an individual request,
      including when the client submits them directly.
- [x] The submitted locale is stored automatically as `ar` or `en`.
- [x] Consent records include the text version, server timestamp, and locale.
- [x] Repeating a submission with the same idempotency key does not create a
      second request.
- [x] Two separate submissions with different idempotency keys remain separate
      requests even when their content is identical.
- [x] A public client cannot select an arbitrary organization identifier.
- [x] The confirmation reference is random and non-sequential and does not grant
      access to request data.
- [x] An approver or administrator can approve or reject a submitted request.
- [x] Repeating Start Review on an `under_review` request returns the current
      state without an error or duplicate transition event.
- [x] Rejection requires a reason.
- [x] A second approval or rejection of the same finalized decision is refused.
- [x] Two simultaneous valid decisions result in one success and one conflict,
      with the successful actor recorded in the audit log.
- [x] Approval and outbox creation occur atomically.
- [x] One approval creates one integration event, even when processing is
      retried.
- [x] A successful n8n workflow adds exactly one Google Sheets row.
- [x] A failed delivery appears on the failed-jobs page.
- [x] An authorized retry can recover a temporarily failed delivery.
- [x] An unauthorized user cannot trigger a retry.
- [x] A user from one organization cannot read or change another organization's
      data.
- [x] Material actions appear in the audit timeline with actor and timestamp.
- [x] The full E2E journey passes using synthetic data.
- [x] Setup instructions reproduce the project on a clean development machine.

## 11. Portfolio V1 AI module (P1)

The AI module begins only after the Core MVP acceptance criteria pass.

### 11.1 Purpose

Improve request intake by answering questions from approved business documents
and collecting the same structured fields as the fixed request form.

### 11.2 Safe architecture

The request schema and workflow engine remain authoritative.

1. The workflow schema determines the required fields.
2. The agent asks for the next missing field.
3. The model returns a typed structured result.
4. Zod or an equivalent server-side schema validates the result.
5. Invalid or uncertain results are rejected, clarified, or handed to a human.
6. The requester reviews the final structured request before submission.
7. The normal deterministic approval workflow continues.

The model cannot approve requests, change roles, call arbitrary tools, or bypass
the standard submission endpoint.

### 11.3 AI features

- Arabic and English conversational intake
- Answers from a small approved business knowledge base
- Source references for knowledge-based answers
- Structured field extraction
- Human handoff when confidence or evidence is insufficient
- Fixed-form fallback when the AI service is unavailable
- Provider interface with a log/mock provider for development
- Provider, model, latency, status, and approximate usage metadata
- No automatic sending of unsupported free-text actions

### 11.4 AI evaluation

Create a labeled synthetic test set covering Modern Standard Arabic, selected
Arabic dialect examples, English, incomplete requests, ambiguous fields, and
unsupported questions.

Measure:

- Schema-valid response rate
- Required-field completion rate
- Field extraction exact match
- Incorrect field inference rate
- Unsupported-answer rate
- Citation correctness
- Appropriate human-handoff rate
- Behavior when the AI provider is unavailable

The initial dataset target is 50 carefully reviewed examples. Increase it to at
least 100 before making strong performance claims.

## 12. Later improvements (P1/P2)

### High-value P1 improvements

- Email or Telegram outcome notifications through the provider interface
- Ordered multi-step approval definitions
- Basic organization and member invitation flow
- CSV/Excel import with validation preview
- CSV export
- Saved request filters
- Integration delivery dashboard
- Configurable request categories
- Google Calendar or another justified integration

### Future P2 considerations

- Visual form builder
- Visual workflow builder
- Conditional approval rules
- Parallel approvals
- Salla connector
- Shopify connector
- Connector marketplace
- Advanced analytics
- Service-level reports
- White-label widgets
- Production worker deployment for client environments

## 13. Recommended technology stack

Use current stable versions at implementation time and verify compatibility
before installation.

### Web application

| Technology | Responsibility | Why it is used |
|---|---|---|
| Next.js with App Router | Web UI and server-side application endpoints | Adds a market-relevant full-stack TypeScript framework |
| TypeScript | Type-safe application code and event contracts | Reduces integration and schema mistakes |
| React | Component-based user interface | Required by Next.js and extends existing basic React skills |
| Tailwind CSS | Responsive styling and RTL-aware layout | Enables consistent design without a large custom CSS system |
| shadcn/ui | Accessible application components | Provides editable source components rather than a locked UI library |
| next-intl | Arabic/English translations and locale routing | Keeps bilingual behavior explicit and maintainable |
| React Hook Form | Form state and field interaction | Works well with complex validated forms |
| Zod | Runtime validation and typed schemas | Creates a validation boundary for public, internal, and AI data |

### Data, authentication, and storage

| Technology | Responsibility | Why it is used |
|---|---|---|
| Supabase | Managed development backend | Provides PostgreSQL, Auth, Storage, and local tooling |
| PostgreSQL | Durable operational data | Supports transactions, constraints, RLS, JSONB, and reliable state transitions |
| Supabase Auth | Staff authentication | Avoids implementing credential security from scratch |
| SQL migrations through Supabase CLI | Reproducible schema and policies | Keeps schema, constraints, functions, and RLS reviewable |
| Generated Supabase TypeScript types | Database type safety | Avoids duplicating table types manually |

Do not introduce Prisma or another ORM in the MVP unless a concrete limitation
justifies it. SQL migrations and the Supabase client are sufficient initially.

### Integration and automation

| Technology | Responsibility | Why it is used |
|---|---|---|
| PostgreSQL outbox/jobs tables | Durable events and integration jobs | Avoids losing work when an external service fails |
| Local TypeScript worker | Claims and processes queued jobs during development | Avoids relying on long-running serverless requests |
| n8n Community Edition via Docker Compose | Demonstration external workflow | Shows practical automation without requiring paid hosting |
| Google Sheets node in n8n | First destination connector | Makes the result visible and easy to demonstrate |
| HMAC-SHA256 signatures | Webhook authenticity | Allows the receiver to verify that OpsHub sent the event |

The worker should claim jobs atomically, for example through a database function
that prevents two workers from processing the same job. The exact claim design
must be reviewed before implementation.

### AI service for Portfolio V1

| Technology | Responsibility | Why it is used |
|---|---|---|
| FastAPI | Separate AI service | Aligns with existing Python experience and creates a clean boundary |
| Pydantic | AI request and response schemas | Enforces typed structured outputs on the Python side |
| A minimal RAG implementation | Retrieval over approved business documents | Demonstrates grounded answers rather than generic generation |
| pgvector only if justified | Embedding search | Keeps vector data with PostgreSQL but should not be added before retrieval requirements are defined |
| Provider adapter | Model independence and mock mode | Allows free/local testing and deterministic fallback |

Do not add LangChain automatically. Use it only if its orchestration or retrieval
abstractions reduce real complexity compared with a small direct implementation.

### Testing and developer quality

| Technology | Responsibility |
|---|---|
| Vitest | Unit tests for TypeScript business logic |
| React Testing Library | Focused UI behavior tests where valuable |
| Playwright | Main browser-level workflows in Arabic and English |
| Pytest | FastAPI and AI evaluation tests |
| ESLint and Prettier | Static quality and formatting |
| Docker Compose | Local n8n and supporting development services |

## 14. Recommended repository structure

```text
opshub/
├── apps/
│   ├── web/                 # Next.js application
│   ├── worker/              # TypeScript integration worker
│   └── ai-service/          # FastAPI service, added in Portfolio V1
├── packages/
│   ├── contracts/           # Versioned event and shared Zod schemas
│   └── config/              # Shared TypeScript/lint configuration if justified
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── tests/
├── n8n/
│   ├── workflows/
│   └── README.md
├── docs/
│   ├── product/
│   ├── architecture/
│   ├── decisions/
│   └── evaluation/
├── tests/
│   └── e2e/
├── docker-compose.yml
├── .env.example
└── README.md
```

If a monorepo causes unnecessary setup cost before the first feature, begin with
`apps/web`, `supabase`, and `docs`, then add the worker and AI service at their
implementation checkpoints. Do not create empty architecture only for visual
complexity.

## 15. Initial data model

The exact schema must be reviewed before migration files are written.

### Core tables

- `organizations`
- `profiles`
- `organization_members`
- `public_forms`
- `requests`
- `request_submission_snapshots`
- `approval_decisions`
- `audit_events`
- `integration_deliveries` (the single-destination transactional outbox and job)
- `webhook_endpoints`

### Important constraints

- Tenant-owned rows include `org_id`.
- Staff membership determines organization access.
- A public form identifier maps to an organization on the server.
- Approval decisions have a uniqueness rule preventing duplicate final
  decisions for the same workflow step.
- Approval and outbox creation happen in one database transaction.
- Job idempotency keys are unique.
- Audit records are append-only through application permissions.
- Status transitions are validated by server-side business logic and database
  constraints where practical.

## 16. Security and privacy baseline

- Never expose Supabase service-role credentials to the browser.
- Apply RLS to all tenant-owned tables exposed through Supabase APIs.
- Resolve public-form ownership on the server.
- Validate every external payload at the application boundary.
- Sign outbound webhooks and compare signatures safely.
- Do not place secrets, tokens, raw documents, or sensitive request data in logs.
- Use synthetic data in the public demo.
- Rate-limit public submission endpoints using a solution compatible with the
  selected hosting environment.
- Restrict manual retry and integration configuration to authorized roles.
- Document retention and deletion behavior before using real client data.
- Do not claim legal or regulatory compliance without a dedicated review.

## 17. Delivery phases and verified checkpoints

### Phase 0: Market validation

- Review a focused sample of current freelance listings.
- Record platform, date, client problem, required integration, required stack,
  budget when visible, proposal count when visible, and repeated requirements.
- Decide whether the primary use case and first connector remain justified.

**Checkpoint:** evidence table and scope decision exist; assumptions are marked.

### Phase 1: Product specification and UX flow

- Confirm the primary request schema.
- Define Arabic and English content.
- Define requester, approver, and administrator journeys.
- Produce low-fidelity wireframes and state diagrams.

**Checkpoint:** every P0 story has testable acceptance criteria.

### Phase 2: Architecture and data design

- Define schema, RLS model, state transitions, event schema, outbox transaction,
  worker claim behavior, and test strategy.
- Record important decisions in short ADRs.

**Checkpoint:** architecture review identifies no unresolved blocking security or
data-integrity issue.

### Phase 3: Foundation and bilingual shell

- Create the smallest required project structure.
- Configure TypeScript, formatting, environment validation, tests, Supabase
  local development, translations, and the responsive shell.

**Checkpoint:** local setup is reproducible and smoke tests pass.

### Phase 4: Authentication, organizations, and RLS

- Implement staff login, organization membership, roles, and policies.
- Add cross-user and cross-organization tests.

**Checkpoint:** authorized access succeeds and unauthorized access fails.

### Phase 5: Request intake and review

- Implement the public form, normalization, idempotency, request list, request
  detail, approval, rejection, and audit timeline.

**Checkpoint:** requester-to-decision E2E flow passes in Arabic and English.

### Phase 6: Reliable integration

- Implement outbox, jobs, worker, signed webhook, n8n workflow, Google Sheets
  destination, failed-jobs page, and retry behavior.

**Checkpoint:** success, duplicate, temporary failure, retry, and dead-letter
scenarios are verified.

### Phase 7: Core MVP hardening

- Complete accessibility, responsiveness, security, privacy, test, setup, and
  demo-data reviews.

**Checkpoint:** every Core MVP acceptance criterion passes with recorded
evidence.

### Phase 8: Portfolio V1 AI intake

- Add the FastAPI service, fixed-schema conversational collection, grounded
  answers, citations, human handoff, fallback, and evaluation dataset.

**Checkpoint:** the evaluation report includes metrics, errors, and limitations;
the deterministic form remains usable when AI is disabled.

### Phase 9: Deployment and portfolio packaging

- Verify current free-tier terms before selecting hosting.
- Deploy only with explicit approval.
- Verify the live workflow.
- Produce architecture diagram, screenshots, demo video, case study, README,
  CV bullets, profile descriptions, and service breakdowns.

**Checkpoint:** public claims match implemented and verified behavior.

## 18. Major risks and mitigations

| Risk | Mitigation |
|---|---|
| Scope becomes a generic workflow platform | Keep one request type and one approval step in Core MVP |
| AI delays the operational product | Add it only after Core MVP passes |
| Free serverless hosting cannot run a worker continuously | Use durable database jobs and a locally demonstrated worker; document production needs |
| Google credentials complicate the demo | Use n8n credentials locally and provide a mock receiver fallback |
| RLS misconfiguration leaks tenant data | Write negative cross-tenant tests before feature expansion |
| Retried events create duplicate external records | Use stable idempotency keys and receiver-side deduplication |
| Arabic UI is translated but not genuinely usable | Test real RTL layouts, mixed text, Arabic digits, validation, and mobile screens |
| RAG provides unsupported answers | Require sources, evaluate failures, and hand off uncertain cases |
| Product claims exceed evidence | Label market assumptions and implemented limitations explicitly |

## 19. Improvements over the original concept

This specification improves the original concept by:

1. Selecting one concrete B2B workflow instead of serving every business case.
2. Separating the Core MVP from the final AI-enabled portfolio release.
3. Replacing a general form builder with one validated request schema.
4. Replacing unlimited approval chains with one approval step and an extensible
   data model.
5. Making reliable delivery, retries, idempotency, and auditability the main
   engineering differentiators.
6. Deferring store connectors until API access and demand are verified.
7. Giving every release a measurable checkpoint.
8. Defining what AI may and may not control.
9. Adding concrete security and tenant-isolation requirements.
10. Preventing free deployment constraints from silently determining the
    architecture.

## 20. Definition of portfolio-ready

OpsHub is portfolio-ready when a reviewer can see the following without relying
on unsupported claims:

1. A complete Arabic and English request-to-approval journey.
2. Secure separation between organizations.
3. A durable integration workflow that visibly handles failure and retry.
4. An understandable audit timeline.
5. Automated tests for the most important business and security behavior.
6. An AI intake assistant that produces validated structured data, cites its
   sources, hands off uncertainty, and has a written evaluation report.
7. A live or locally reproducible demonstration using synthetic data.
8. Documentation explaining architecture, tradeoffs, limitations, and future
   production requirements.

## 21. Freelance services derived from the completed project

Only offer a service after its corresponding capability has been implemented
and tested.

- Arabic/English business request form with approval workflow
- Secure Supabase authentication, roles, and RLS setup
- Webhook integration with retries and audit logs
- n8n-to-Google-Sheets business workflow
- CSV/Excel intake validation after the import module exists
- Arabic AI website intake assistant after its evaluation is complete
- Custom Salla or Shopify synchronization only after a real connector exists

## 22. Product decisions before implementation

### Resolved blocking decisions

1. The first workflow is B2B service request intake and approval with one fixed
   bilingual service-category list.
2. The request fields and individual/company rules are defined in Section 9.3.
3. Public request status tracking is deferred until P1. Staff contact requesters
   manually during the Core MVP using their preferred contact method, with email
   as the fallback.
4. Approval uses a pool model: any authorized approver may decide, administrators
   inherit approver permission, and the first valid decision wins.

### Non-blocking

1. Final product name and visual identity
2. Which Arabic dialects enter the first AI evaluation set
3. Whether Telegram or email becomes the first notification provider
4. Which store connector is investigated first after Portfolio V1

## 23. Immediate next action

Phases 1 through 7 and the deterministic Core MVP are complete locally. The
next project checkpoint is Phase 8 planning and should:

1. Lock the first AI provider, model, supported Arabic dialects, privacy rules,
   cost limits, and failure budget before implementation.
2. Define the fixed-schema conversational intake contract and keep the existing
   deterministic form available when AI is disabled or unavailable.
3. Create a versioned Arabic and English evaluation dataset with measurable
   extraction, grounding, citation, handoff, and fallback criteria.
4. Define the FastAPI boundary, threat model, observability, and data-retention
   rules without allowing AI to approve requests or bypass validation.
5. Stop for review before implementing the Phase 8 service.
