# OpsHub Phase 8 AI Intake Design

Status: Phase 8 is complete and verified locally on 19 October 2026. The live
OpenAI evaluation was not run because no usable provider key was configured;
that remains a release gate before public deployment.

## 1. Purpose

Phase 8 adds an optional bilingual AI-assisted intake path to the verified Core
MVP. It should help a requester understand the available services, describe a
request, and prepare the same fixed request schema already accepted by the
deterministic form.

The AI path is an assistant, not a new workflow engine. The existing form,
server validation, PostgreSQL functions, approval state machine, audit trail,
delivery worker, and n8n integration remain authoritative.

Checkpoint 8A was approved before application or service code was created.

## 2. Inherited boundaries

The following decisions remain fixed:

- AI cannot submit a request without an explicit requester review and consent.
- AI cannot approve or reject a request.
- AI cannot change roles, organizations, service categories, or workflow state.
- AI cannot call arbitrary tools or send unsupported free-text actions.
- The normal `submit_request()` boundary validates every final request.
- The existing Arabic and English form stays available at all times.
- If the AI service, model provider, retrieval layer, or evaluation gate fails,
  the requester returns to the deterministic form with no loss of validated
  draft data.
- Core MVP request and delivery behavior must not be changed by Phase 8.

## 3. Recommended locked decisions

### 3.1 First provider and model

- First hosted provider: OpenAI through the Responses API.
- Default model: `gpt-6-luna`, selected for a focused, cost-sensitive intake
  workload.
- Evaluation challenger: `gpt-6.1-sol`, used only to determine whether the
  lower-cost model misses a material quality threshold.
- Development default: a deterministic mock provider requiring no API key.
- Provider calls use strict Structured Outputs with a Pydantic response schema.
- Provider response storage is disabled with `store: false`.
- The provider adapter keeps the service replaceable without changing the web
  or database contracts.

The current OpenAI model catalog describes Luna as the cost-sensitive model and
lists multilingual support across the current model family. Current official
prices are USD 0.10 per million input tokens and USD 0.50 per million output
tokens for Luna, compared with USD 2 and USD 10 for Sol. Model availability and
pricing must be rechecked before deployment.

### 3.2 Language scope

The first evaluation set covers:

- English
- Modern Standard Arabic
- Egyptian Arabic
- Mixed Arabic and English messages
- Arabic-Indic and Western digits in conversational text

Other regional dialects remain explicitly unsupported for performance claims
until they have their own reviewed examples.

### 3.3 Knowledge base scope

Use six small, synthetic, organization-approved Markdown documents:

1. Service categories and examples
2. Request and approval process
3. Typical engagement timing
4. Support and maintenance boundaries
5. Privacy and sensitive-data notice
6. Contact and response expectations

The documents must contain no real client information, credentials, private
pricing, or claims that have not been approved for display.

### 3.4 Retrieval baseline

Start with a transparent local lexical retrieval baseline rather than adding a
vector database immediately:

- split documents on headings and paragraphs;
- preserve document ID, section ID, locale, title, and source version;
- normalize Arabic letter variants and Arabic-Indic digits for retrieval only;
- rank chunks with a BM25-style lexical score;
- retrieve at most three chunks per question;
- expose citations only from the retrieved chunk IDs;
- never allow the model to invent a source identifier.

Measure Recall@3 and Mean Reciprocal Rank on labeled questions. Add embeddings
or pgvector only if trace analysis shows that lexical retrieval is the actual
bottleneck.

## 4. User journey

1. The requester chooses **Use the assistant** from the existing public form.
2. The assistant explains that it is optional, may use an external AI provider,
   and must not receive passwords, payment details, identity documents, health
   information, or other unnecessary sensitive data.
3. The requester selects Arabic or English. The current route locale remains
   the submitted locale.
4. The application asks for the next missing field.
5. Deterministic handlers validate simple fields such as email, phone, country,
   dates, contact preference, and consent.
6. The model may classify a service category, improve a title or description,
   answer approved knowledge-base questions, or identify ambiguity.
7. Unsupported, ambiguous, or ungrounded questions produce clarification,
   human handoff, or fixed-form fallback rather than a guessed answer.
8. The requester sees the complete structured draft and can edit every field.
9. The requester explicitly confirms consent and submits through the existing
   deterministic action.
10. The normal confirmation, staff review, approval, delivery, and audit flows
    continue unchanged.

## 5. Intake states

| State | Meaning | Allowed next states |
| --- | --- | --- |
| `collecting` | At least one required field is missing | `collecting`, `answering`, `review_ready`, `handoff`, `fallback` |
| `answering` | A grounded question is being answered | `collecting`, `review_ready`, `handoff`, `fallback` |
| `review_ready` | The schema is complete and valid enough for user review | `collecting`, `submitted`, `fallback` |
| `handoff` | The assistant cannot safely continue | `collecting`, `fallback` |
| `fallback` | AI is disabled, unavailable, over budget, or invalid | Existing fixed form |
| `submitted` | Existing deterministic submission succeeded | Existing confirmation page |

`submitted` is not produced by the model. It is returned only by the existing
submission boundary.

## 6. Responsibility split

### 6.1 Deterministic application logic

The application, not the model, owns:

- next-required-field selection;
- requester type and company-only field rules;
- email normalization;
- phone parsing and E.164 normalization;
- country validation and mismatch warnings;
- date validation;
- URL scheme validation and normalization;
- consent text version and locale;
- required lengths and enum membership;
- completion status;
- final review and submission;
- rate limits, timeouts, cost limits, and fallback.

Email and phone values are captured and validated without sending their exact
values to the model. The provider sees only presence markers when the dialogue
needs to know whether those fields are complete.

### 6.2 Model responsibilities

The model may:

- classify one of the fixed service categories from free text;
- propose a request title;
- propose or refine a description without inventing facts;
- detect ambiguity and request clarification;
- identify content that should trigger a sensitive-data warning;
- answer only from supplied knowledge chunks;
- select citations only from the supplied chunk IDs;
- recommend handoff when evidence is missing.

The model output is a proposal. Pydantic validates it first, and the existing
TypeScript request schema validates the final draft again.

## 7. Service boundary

### 7.1 Components

```text
Public browser
    -> same-origin Next.js AI boundary
        -> private FastAPI service
            -> deterministic field rules
            -> local knowledge retriever
            -> mock or OpenAI provider adapter

Final reviewed draft
    -> existing Next.js submission boundary
        -> existing submit_request() PostgreSQL function
```

The browser never receives the provider key or calls the provider directly.
FastAPI is not publicly exposed in local or production architecture.

### 7.2 Proposed turn request

```json
{
  "schema_version": "ai-intake-turn-v1",
  "locale": "ar",
  "session_id": "opaque-random-id",
  "latest_message": "أحتاج نظام لمتابعة طلبات العملاء",
  "draft": {
    "requester_type": "company",
    "service_category": null,
    "request_title": null,
    "description": null
  },
  "completed_fields": ["contact_name", "email", "phone", "country"]
}
```

Only the minimum required draft context is sent. Exact email, phone, consent,
and other fields that do not require model reasoning are excluded.

### 7.3 Proposed turn response

```json
{
  "schema_version": "ai-intake-turn-v1",
  "status": "collecting",
  "assistant_message": "سأساعدك في وصف الطلب. ما النتيجة الأساسية التي تريد الوصول إليها؟",
  "draft_patch": {
    "service_category": "it_software",
    "request_title": "نظام لمتابعة طلبات العملاء"
  },
  "next_field": "description",
  "citations": [],
  "handoff_reason": null
}
```

Allowed `draft_patch` keys are restricted by an explicit allowlist. Unknown
keys, invalid enums, overlong text, or citations outside the retrieved set make
the turn invalid and trigger one controlled retry or fallback.

## 8. Session and data policy

- The browser owns the editable draft until final submission.
- The server signs the opaque session ID and enforces expiry and turn limits.
- Phase 8 does not add a stored raw-transcript table.
- Provider prompts and responses are not written to ordinary application logs.
- Logs contain event name, session hash, locale, provider, model, latency,
  token counts when available, result status, retrieval chunk IDs, and safe
  error codes.
- Production logs must not contain contact details, free-text messages, request
  descriptions, provider keys, or full retrieved chunks.
- Provider calls set `store: false`; this disables provider application-state
  storage, but it does not promise Zero Data Retention or remove the provider's
  standard abuse-monitoring policy.
- The UI must state that the assistant uses an external AI service and offer a
  direct link back to the normal form before the first AI call.

## 9. Security and failure rules

- Treat requester messages as untrusted data, never as system instructions.
- Treat knowledge-base text as reference data, not executable instructions.
- Do not enable web search, code execution, file access, function calling, MCP,
  or arbitrary tools in the Phase 8 provider request.
- The provider can return only the strict response schema.
- Reject prompt attempts to reveal system prompts, hidden documents, other
  sessions, credentials, or internal configuration.
- Sanitize rendered assistant content and citations; no raw model HTML.
- Limit one message to 2,000 characters and one session to 12 provider turns.
- Use the existing public subject-hash approach for an AI-specific server-side
  rate limit.
- Use a 12-second provider timeout and at most one retry for retryable transport
  or provider failures within a 15-second total deadline.
- Never retry validation, refusal, or policy failures with the same input.
- After timeout, invalid output, budget exhaustion, or circuit-open state,
  return the validated draft to the fixed form.

## 10. Cost limits

- Maximum serialized provider input per turn: 4,000 UTF-8 bytes. This is a
  conservative hard limit that is checked before any paid provider call.
- Maximum provider output per turn: 600 tokens.
- Maximum provider turns per session: 12.
- Target estimated provider cost: no more than USD 0.02 per completed synthetic
  evaluation session at the current default-model price.
- Local development and CI use the mock provider by default.
- Live-provider tests require an explicit environment flag and never run in the
  default test suite.
- Configure provider-project spending limits before any public deployment.
- Record approximate input, output, and estimated cost metadata without request
  content.

## 11. Evaluation dataset V1

Create 50 manually reviewed synthetic cases. Each case has a stable ID, locale,
tags, conversation turns, approved knowledge chunks, expected field patches,
expected citations, expected final state, and expected handoff or fallback.

Language distribution:

| Language style | Cases |
| --- | ---: |
| English | 15 |
| Modern Standard Arabic | 15 |
| Egyptian Arabic | 15 |
| Mixed Arabic and English | 5 |

Scenario distribution:

| Scenario | Cases |
| --- | ---: |
| Field collection and classification | 15 |
| Grounded knowledge questions | 15 |
| Ambiguous or incomplete multi-turn requests | 10 |
| Unsupported questions and appropriate handoff | 5 |
| Prompt injection, sensitive data, and provider failure | 5 |

The language and scenario groups are overlapping labels over the same 50 cases.
They are not 100 separate examples.

## 12. Metrics and Phase 8 gates

Retrieval and generation are measured separately.

| Metric | Initial gate |
| --- | ---: |
| Retrieval Recall@3 | At least 90% |
| Retrieval Mean Reciprocal Rank | At least 0.80 |
| Response-schema validity or safe fallback | 100% |
| Required-field completion in completable cases | At least 95% |
| Fixed-enum field exact match | At least 95% |
| Free-text field factual consistency | At least 90% |
| Incorrect inference for protected contact fields | 0% |
| Citation correctness | 100% |
| Supported grounded-answer correctness | At least 90% |
| Unsupported question handoff or refusal | At least 95% |
| Prompt-injection resistance | 100% on the initial adversarial set |
| Provider-unavailable fixed-form fallback | 100% |
| Estimated cost per completed evaluation session | At most USD 0.02 |

With only 50 synthetic examples, these are implementation gates, not broad
claims about real-world model accuracy. A strong public quality claim requires
at least 100 reviewed examples plus representative real queries that can be
used lawfully and safely.

## 13. Error analysis

Every failed case is assigned one primary cause:

- deterministic state logic;
- retrieval miss;
- poor retrieval ranking;
- field extraction;
- unsupported inference;
- ungrounded generation;
- incorrect citation;
- missed handoff;
- provider refusal;
- provider timeout or transport failure;
- schema or validation failure;
- web integration or locale behavior.

Fix retrieval before changing prompts when the necessary source chunk was not
retrieved. Do not use one combined quality score that hides the failure source.

## 14. Implementation checkpoints

### 8A: Design and evaluation contract

- Approve this document.
- Lock the provider/model, dialects, privacy notice, cost limits, and metrics.
- Define the exact evaluation-case JSON schema.

### 8B: FastAPI foundation and provider boundary

- Add `services/ai` with FastAPI, Pydantic, pytest, environment validation, and
  health/readiness endpoints.
- Implement deterministic mock and disabled providers first.
- Add the OpenAI adapter behind an explicit environment switch.
- Verify structured output, timeout, retry, redaction, and fallback contracts.

### 8C: Retrieval and conversational intake

- Add the synthetic bilingual knowledge base and content-aware chunker.
- Implement and evaluate the lexical retrieval baseline.
- Add deterministic field-state logic and model-assisted proposal handling.
- Connect the private Next.js server boundary and bilingual assistant UI.
- Keep final submission on the existing deterministic path.

### 8D: Evaluation and hardening

- Complete the 50-case reviewed dataset.
- Run mock, retrieval, and live-provider evaluation separately.
- Record metrics, traces, error classes, cost, and limitations.
- Test Arabic RTL, English LTR, mobile, keyboard, accessibility, provider
  failure, rate limits, and fixed-form fallback.
- Confirm that Core MVP database, worker, n8n, and browser tests still pass.

## 15. Phase 8 acceptance criteria

- [x] The normal form works when the AI service is disabled.
- [x] The AI boundary is same-origin from the browser and private behind Next.js.
- [x] Mock mode runs locally and in CI without a provider key.
- [x] The OpenAI adapter uses strict structured output and `store: false`.
- [x] Exact email and phone values are not sent to the model.
- [x] AI cannot submit, approve, reject, change roles, or call arbitrary tools.
- [x] Arabic, Egyptian Arabic, English, and mixed-language cases are evaluated.
- [x] Knowledge answers contain valid retrieved citations or safely hand off.
- [x] The requester reviews and edits the complete draft before consent.
- [x] Invalid output, timeout, rate limit, cost limit, or provider outage falls
      back without losing validated draft data.
- [x] Evaluation metrics meet the initial gates or the report explicitly blocks
      release and records the failed cases.
- [x] Core MVP regression checks remain green.
- [x] No API key, prompt content, transcript, or requester PII is committed or
      written to ordinary logs.

The checked items describe the local mock-backed implementation and adapter
contract tests. They do not claim a live model-quality result or a deployment.
See `docs/testing/phase-8d-evaluation-and-hardening.md` for the exact evidence
and remaining release gate.

## 16. Approval decisions

Approve or revise these defaults before Checkpoint 8B:

1. OpenAI Responses API with `gpt-6-luna` as the default and `gpt-6.1-sol` only
   as an evaluation challenger.
2. Modern Standard Arabic, Egyptian Arabic, English, and mixed Arabic/English
   as the first supported evaluation set.
3. Six synthetic approved Markdown knowledge documents and lexical retrieval
   before embeddings or pgvector.
4. No raw transcript persistence in Phase 8.
5. Deterministic capture of email and phone without sending their values to the
   model.
6. Twelve provider turns, 4,000 input tokens, 600 output tokens, a 12-second
   timeout, one retry, and a USD 0.02 evaluation-session cost target.
7. The 50-case distribution and metric gates in Sections 11 and 12.
8. The four implementation checkpoints in Section 14, with a review before
   each checkpoint that changes the web or provider behavior.

## 17. Current source basis

- [OpenAI model catalog](https://developers.openai.com/api/docs/models)
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
- [OpenAI Responses API overview](https://developers.openai.com/api/reference/responses/overview)
- [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)

The model catalog, prices, retention controls, and API behavior are changeable
external facts and must be verified again before Phase 9 deployment.
