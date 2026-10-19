# OpsHub Service Packaging and Profile Copy

These materials describe work that can be offered honestly after discovery.
Pricing, timeline, hosting, support window, and third-party costs must be scoped
for each client before an agreement.

## Service packages

### Structured request intake

For a small team that needs a professional Arabic and English request form.

Includes one agreed request schema, individual and company paths, validation,
consent capture, mobile RTL and LTR interfaces, a confirmation reference, and a
handover guide. Staff workflow, external automation, notifications, and custom
workflow building are excluded unless added to scope.

### Request review and approval

Adds protected staff access, organization roles, searchable requests, a clear
review state, one human approval or rejection step, immutable submissions, and
an audit timeline.

### Reliable automation delivery

Adds a durable delivery queue, a signed n8n webhook, one agreed destination,
idempotent updates, retries, failure diagnostics, and administrator recovery.
Google or other third-party accounts, provider subscriptions, data cleanup, and
ongoing operations are priced separately.

### Optional guided intake

Adds a bounded bilingual assistant for service questions and editable form
proposals after the client's knowledge content and model-provider requirements
are reviewed. It never replaces consent, server validation, or human approval.

## Project description

OpsHub is a bilingual request and approval system for small businesses and
teams. It turns scattered client intake into a structured Arabic or English
request, a controlled human decision, and a reliable automation handoff. The
system includes tenant isolation, an audit timeline, idempotent delivery,
retries, failure recovery, and an optional guided intake assistant.

## CV bullets

- Built a bilingual Arabic and English B2B request and approval application
  with Next.js, TypeScript, Supabase, PostgreSQL, n8n, and Google Sheets.
- Designed tenant-safe PostgreSQL constraints and Row Level Security for
  organization-scoped staff access, immutable submissions, and append-only
  audit events.
- Implemented at-least-once integration delivery using database leases, fencing
  tokens, HMAC-signed webhooks, retry budgets, dead-letter handling, and
  receiver-side idempotency.
- Tested the workflow across SQL, component, browser, accessibility, worker,
  webhook, and production-build layers using synthetic data.
- Added an optional bounded bilingual intake assistant with citations,
  structured editable proposals, failure fallback, and a 50-case synthetic
  evaluation.

## Freelance profile description

I build practical workflow systems for small businesses and teams, especially
when requests arrive through messages, forms, and spreadsheets and become hard
to track. I can help turn that process into a clear bilingual intake form,
protected staff review, reliable automation, and visible failure recovery.

My work focuses on the complete operational path: validation, permissions,
audit history, idempotency, retries, testing, and a handover your team can
understand. I scope the first version around one real workflow, then expand only
where the process and expected result are clear.

## Discovery questions

1. Where do requests arrive today, and who decides what happens next?
2. Which fields are required, sensitive, conditional, or language-specific?
3. Who may view, approve, reject, retry, or export a request?
4. Which external destination is required, and what makes an update idempotent?
5. What should happen when the destination is unavailable?
6. What volume, response time, retention, backup, and support expectations apply?
7. Which accounts and subscription costs will the client own?
8. What acceptance test proves the workflow is ready?

