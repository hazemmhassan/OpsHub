# Phase 8D evaluation and hardening

Status: Complete and verified locally on 19 October 2026. Public release with a
live provider remains blocked until the separate live-provider evaluation is
run with an approved key and spending controls.

## What was completed

- Added 50 manually curated synthetic evaluation cases with stable IDs.
- Locked the language split to 15 English, 15 Modern Standard Arabic, 15
  Egyptian Arabic, and 5 mixed Arabic and English cases.
- Locked the scenario split to 15 field-collection, 15 grounded-answer, 10
  ambiguous multi-turn, 5 unsupported, and 5 safety or failure cases.
- Added a repeatable evaluator that reports retrieval, field, citation,
  grounding, handoff, injection, fallback, and cost metrics separately.
- Added deterministic prompt-injection, sensitive-data, unsupported-question,
  and human-handoff behavior.
- Added locale-filtered retrieval and small Arabic and English normalization
  improvements without adding an opaque embedding dependency.
- Added a signed session token bound to the locale and public form with a
  30-minute expiry.
- Added a server-side AI rate limit of 20 turns per form and subject hash in a
  fixed 15-minute window.
- Added a 4,000-byte serialized provider-input limit checked before a provider
  call and kept the 600-token maximum output.
- Kept the 12-turn browser-session limit and fixed-form fallback.
- Added explicit Arabic and English notice that the optional assistant may send
  the message to an external AI provider.
- Added an opt-in real-browser test for the mock-backed English and Arabic AI
  journey, including keyboard opening, editable field proposals, mobile RTL,
  citations, no horizontal overflow, and axe accessibility.

## Evaluation result

The committed report is `services/ai/eval/phase8_mock_report.json`. The command
uses only synthetic data and the deterministic mock provider.

| Metric | Gate | Result |
| --- | ---: | ---: |
| Cases | 50 | 50 |
| Retrieval Recall@3 | at least 0.90 | 1.00 |
| Retrieval mean reciprocal rank | at least 0.80 | 1.00 |
| Schema validity or safe fallback | 1.00 | 1.00 |
| Required-field completion | at least 0.95 | 1.00 |
| Fixed-enum exact match | at least 0.95 | 1.00 |
| Free-text factual consistency | at least 0.90 | 1.00 |
| Protected contact-field inference | 0 | 0 |
| Citation correctness | 1.00 | 1.00 |
| Grounded-answer correctness | at least 0.90 | 1.00 |
| Unsupported-question handoff | at least 0.95 | 1.00 |
| Prompt-injection resistance | 1.00 | 1.00 |
| Provider-failure fallback | 1.00 | 1.00 |
| Estimated mock-provider cost | at most USD 0.02 | USD 0.00 |

No evaluation case failed and the error-count map was empty. These results are
implementation gates on a small synthetic set. They are not a claim of broad
real-world language or model accuracy.

The earlier 12-case retrieval baseline was rerun as a separate regression:
Recall@3 was 1.00 and mean reciprocal rank was 0.9167.

## Defects found by hardening

Two regressions were found and fixed before the final run:

1. English plural forms caused a previously passing workshop query to miss the
   training chunk. Minimal plural normalization restored the older baseline
   while the 50-case evaluation remained green.
2. The signed browser session originally used `_` as a delimiter even though
   base64url data can also contain `_`. A real browser run reproduced the
   intermittent rejection. The token now uses an unambiguous dot delimiter,
   with unit and browser regressions covering the behavior.

## Full verification matrix

| Area | Final local result |
| --- | --- |
| AI service | 39 Pytest tests passed; Ruff lint and format passed; strict Mypy passed; `pip check` passed |
| Web unit and component | 59 Vitest tests across 22 files passed |
| Web static checks | TypeScript, ESLint, Prettier, and production build passed; 33 pages generated |
| Core browser journey | 2 Playwright tests passed: English headers and keyboard path, Arabic mobile request through approval, with axe checks and cleanup |
| AI browser journey | 1 explicitly enabled Playwright test passed in English LTR and Arabic mobile RTL, with axe checks |
| Database and RLS | 182 pgTAP assertions across 11 files passed, including 6 AI rate-limit assertions |
| Delivery worker | 54 tests passed and 1 environment-gated test skipped; typecheck, format, and build passed |
| n8n | 6 workflow-contract tests passed; Compose configuration valid; pinned workflow import succeeded |
| Dependency audit | Root, web, and worker production audits reported 0 known vulnerabilities |

## Failure and privacy evidence

- Provider timeout, temporary failure, invalid output, disabled mode, excessive
  input, and server-side rate exhaustion return fixed-form fallbacks.
- The browser receives neither the provider key nor the internal service key.
- Exact contact name, email, and phone fields are excluded from the model-safe
  contract. Email and phone patterns found in free text are redacted again at
  the OpenAI boundary.
- Prompts and responses are not written to ordinary logs, and no transcript
  table was added.
- The model contract cannot submit, approve, reject, change workflow state,
  change roles, or call tools.
- The final request still passes through the existing deterministic validation,
  consent, and submission path.

## Live-provider result and release gate

No usable `OPSHUB_AI_OPENAI_API_KEY` was present in the process environment or
the local AI environment file. Therefore no OpenAI request was made, and live
quality, latency, token usage, and cost are **not measured**.

Before enabling the assistant publicly:

1. Configure an approved OpenAI project key and project spending limit.
2. Recheck the configured model name, availability, pricing, and data controls.
3. Run the same 50 cases against the live provider and record token, latency,
   cost, failure, and per-case trace metadata without prompt or PII logging.
4. Keep the feature disabled if any Phase 8 gate fails.

This checkpoint proves the local mock-backed design, deterministic safety
boundaries, and complete Core MVP regression. It does not claim deployment or
live-provider readiness.
