# Phase 8C retrieval and conversational intake

Status: Complete locally on 19 October 2026. Checkpoint 8D was completed later
and is recorded in `phase-8d-evaluation-and-hardening.md`.

## Scope completed

- Added six synthetic bilingual Markdown knowledge documents covering the five
  configured service categories and the request process.
- Added a content-aware loader that produces 12 stable Arabic and English
  chunks while preserving document, section, locale, and title metadata.
- Added a dependency-free lexical BM25 baseline with Arabic normalization and
  light handling for common prefixes and question words.
- Added 12 hand-written seed retrieval cases split evenly across Arabic and
  English.
- Added deterministic turn logic for the next missing safe field,
  `review_ready`, valid citations, the 12-turn ceiling, and safe handoff.
- Added mock-provider proposals for safe request fields and grounded answers
  from retrieved content.
- Added the private Next.js server boundary with a server-held internal key,
  strict input and output validation, a 13-second web timeout, and `no-store`.
- Added an optional Arabic and English assistant to the existing public form.
  It can propose only service category, request title, description, requester
  type, company name, job title, and company website.
- Kept contact values, consent, final validation, and request submission on the
  existing deterministic form path.
- Added a local client fallback for an interrupted server action so the normal
  form remains available and the user's draft is preserved.

## Retrieval evidence

The seed set is intentionally small and is not the final Phase 8 evaluation
dataset.

| Measure | Result |
| --- | --- |
| Seed cases | 12 |
| Knowledge documents | 6 |
| Searchable chunks | 12 |
| Recall@3 | 1.0000 |
| Mean reciprocal rank | 0.9444 |

The real Arabic browser question `هل يمكن تتبع حالة الطلب بالرقم المرجعي؟`
initially ranked the training chunk first. A focused regression test reproduced
the failure. Arabic normalization was then improved so the request-process
chunk ranks first. The harder question replaced the easier Arabic process case
in the seed set before the final metric run.

## Browser evidence

The local web application, local Supabase stack, and FastAPI mock provider were
used together through the real browser interface.

| Flow | Verified result |
| --- | --- |
| English opt-in | Assistant is hidden until the requester chooses it |
| English proposal | IT and software, title, and description populate the editable form |
| English knowledge question | Correct request-process answer and citation shown |
| Arabic opt-in | Arabic labels and privacy notice shown with document direction `rtl` |
| Arabic knowledge question | Correct Arabic request-process answer and citation shown |
| Browser console | No errors or warnings after the final run |
| Final submission boundary | Existing `Send request` form remains authoritative |

The assistant was exercised in mock mode. No OpenAI API key or live provider
request was used.

## Automated verification

| Check | Result |
| --- | --- |
| Python Pytest | 29 tests passed |
| Ruff lint | Passed |
| Ruff format check | Passed |
| Mypy strict type check | Passed for 14 source files |
| Python dependency consistency | Passed |
| Packaged knowledge check | All 6 Markdown documents present in the wheel |
| Web Vitest | 55 tests passed across 21 files |
| Web TypeScript | Passed |
| Web ESLint | Passed |
| Web Prettier check | Passed |
| Next.js production build | Passed; 33 static pages generated |

## Security and product boundaries verified

- AI is disabled by default and a disabled or misconfigured AI service does not
  remove the normal form.
- The browser never receives the FastAPI internal key and never calls the AI
  service directly.
- The server action verifies that the public form exists and is active before
  it calls the AI boundary.
- Exact contact name, email, and phone values are not part of the AI contract.
  Only boolean presence markers are allowed for contact fields.
- The AI contract contains no submission, approval, rejection, role, tenant,
  workflow-state, or arbitrary-tool action.
- Provider citations are accepted only when their chunk IDs were retrieved for
  that turn.
- Next.js development server-function invocation logging is disabled so action
  arguments do not write assistant messages or draft content to the terminal.
- Invalid provider output, provider failure, timeout, disabled mode, and a
  rejected page action all return or display the fixed-form fallback.

## Honest boundaries before Checkpoint 8D

- This is a 12-case seed retrieval check, not the approved 50-case reviewed
  Phase 8 dataset.
- Modern Standard Arabic and English have direct seed coverage. Egyptian Arabic
  and mixed-language quality have not yet been evaluated at the required scale.
- The OpenAI adapter has not been evaluated with a live provider, so model
  quality, latency, token use, and cost are not yet measured.
- Rate and cost limit hardening, mobile and keyboard review, broader
  accessibility checks, and the complete Core MVP regression matrix remain in
  Checkpoint 8D.
- These results prove local behavior only. They do not claim a deployed AI
  service or production readiness.
