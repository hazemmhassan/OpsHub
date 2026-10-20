# OpsHub Case Study

## The problem

Small businesses often receive service requests across messages, forms, and
spreadsheets. Details get lost, nobody has a dependable approval history, and
an automation failure can be mistaken for a successful handoff.

OpsHub brings that journey into one controlled workflow in Arabic and English:
a requester submits a structured request, authorized staff review it, the first
valid final decision wins, and an approved request enters a durable delivery
queue before it reaches n8n and Google Sheets.

## The product decision

The first release deliberately solves one workflow well instead of becoming a
general workflow builder. It has one fixed service-request schema, one approval
step, two staff roles, and one external destination. That small boundary made
tenant isolation, accessibility, retries, auditability, and idempotency
testable end to end.

## What was built

- Arabic RTL and English LTR public request journeys
- individual and company field branches with server-side normalization
- Supabase authentication and organization-scoped staff access
- linear request states with idempotent Start Review
- first-final-decision-wins approval and rejection handling
- append-only audit events and immutable request snapshots
- durable delivery jobs with leases, fencing tokens, retry budgets, and manual
  administrator recovery
- HMAC-signed n8n delivery and Google Sheets upsert by stable request reference
- an optional, bounded bilingual intake assistant that can only propose edits
- deterministic tests across web, database, worker, n8n, browser, and AI layers

## Important engineering choices

PostgreSQL and server validation enforce authority rather than trusting the
browser. Composite tenant foreign keys prevent cross-organization child rows.
Approval and job creation happen atomically, but external HTTP calls happen
outside database transactions. Delivery is at least once, so the receiver
performs an idempotent external update.

The assistant is isolated from every authoritative action. It retrieves from a
small reviewed knowledge base, returns structured proposals and citations, and
falls back to the normal form if it is unavailable or uncertain.

## Verification evidence

The Core MVP was verified locally with clean database rebuilds, SQL tests,
component tests, browser journeys, accessibility scans, worker fault handling,
n8n contract tests, production builds, and dependency audits. A live local n8n
workflow completed a Google Sheets append followed by an update using the same
reference, demonstrating receiver-side idempotency.

The optional assistant passed a 50-case synthetic mock evaluation covering
English, Modern Standard Arabic, Egyptian Arabic, mixed language, grounding,
ambiguity, safety, and provider failure. A live model-provider evaluation has
not been completed.

A temporary public HTTPS demo also passed a synthetic request-to-delivery
smoke test. It runs from the local stack and is available only while the local
machine and tunnel are running, so it is evidence of a shareable demonstration,
not an always-on production deployment.

## Result

OpsHub now provides a reproducible base for a small team that needs structured
request intake, controlled approval, and observable automation. Its strongest
value is not a large feature count. It is the reliability boundary around a
small operational workflow and the evidence showing how that boundary behaves.

## Current limitations

- requesters do not yet receive automatic outcome notifications or public
  tracking
- the Core MVP has one form, one approval step, and one Sheets destination
- staff contact requesters manually
- the AI assistant is optional and not approved for public provider use yet
- permanent hosting, production monitoring, and backup rehearsal remain
  environment-specific deployment work
