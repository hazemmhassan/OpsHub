# Phase 8B AI service foundation

Status: Complete locally on 19 October 2026. Checkpoint 8C was completed later
and is recorded separately in `phase-8c-retrieval-and-intake.md`.

## Scope completed

- Added a private FastAPI service under `services/ai`.
- Added strict Pydantic schemas that reject unknown input and output fields.
- Excluded exact email and phone fields from the model-safe draft.
- Redacted email and phone values found inside free text immediately before the
  OpenAI boundary, including Arabic-Indic phone digits.
- Kept ISO dates intact when applying phone redaction.
- Added deterministic mock and disabled providers.
- Added an OpenAI Responses API adapter with typed output and `store=False`.
- Added internal-key authentication with constant-time comparison.
- Added health and readiness endpoints with no secret output.
- Added one-retry temporary-failure handling, a bounded timeout, and localized
  fixed-form fallback.
- Kept logs to provider, model, locale, status, attempt, and safe error codes.

## Test coverage

The automated tests cover:

- environment and provider credential validation;
- rejection of email and phone fields in the model-safe schema;
- rejection of unknown or approval-related output fields;
- authenticated and unauthenticated endpoint behavior;
- no secret exposure in health or readiness responses;
- mock and disabled provider behavior;
- one retry after a temporary provider failure;
- immediate fallback after a provider timeout;
- OpenAI structured output and disabled response storage;
- provider-boundary redaction for email, Western-digit phone numbers, and
  Arabic-Indic phone numbers;
- preservation of ISO date text;
- absence of prompt text from application logs.

## Verification evidence

| Check | Result |
| --- | --- |
| Pytest | 20 tests passed |
| Ruff lint | Passed |
| Ruff format check | Passed |
| Mypy strict type check | Passed |
| Python dependency consistency | Passed |
| Local mock HTTP smoke test | Health 200, readiness 200, missing key 401, authenticated turn 200 |

The final values above must match a fresh verification run before this
checkpoint is committed.

## Honest boundaries

- No OpenAI API key was used and no live provider request was made.
- No knowledge base or retrieval code exists yet.
- No Next.js boundary or requester assistant interface exists yet.
- The existing fixed form and Core MVP were not changed in this checkpoint.
- Phase 8 is not complete; retrieval and integration require explicit approval
  for Checkpoint 8C.
