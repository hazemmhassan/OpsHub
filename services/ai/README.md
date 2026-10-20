# OpsHub AI intake service

This private FastAPI service is the optional AI boundary for OpsHub intake. It
does not replace the existing form or submission workflow. The browser reaches
it through the same-origin Next.js server boundary, never directly.

Checkpoints 8B through 8D provide the service foundation, bilingual lexical
retrieval, deterministic field-state logic, requester assistant, evaluation,
and release hardening.

## What is available

- strict request and response schemas;
- mock, disabled, and OpenAI provider adapters;
- internal-key authentication on the turn endpoint;
- health and readiness endpoints;
- a 12-second maximum provider timeout and at most one retry;
- fixed-form fallback for provider failures;
- email and phone redaction immediately before an OpenAI request;
- metadata-only logs that exclude prompts and requester values;
- OpenAI structured output with response storage disabled.
- a 4,000-byte hard provider-input budget before any paid call;
- six packaged synthetic bilingual knowledge documents;
- content-aware Markdown chunks and a lexical BM25 retrieval baseline;
- deterministic next-field, review-ready, citation, and fallback validation;
- a 12-case hand-written seed retrieval set.

The OpenAI adapter is present but has not been called with a live key. Mock mode
is the safe local default.

The web application keeps the assistant disabled by default. When enabled, the
browser calls only the Next.js server action. The service internal key remains
on the server.

## Local setup on Windows

From `services/ai`:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
Copy-Item .env.example .env.local
```

Replace `OPSHUB_AI_INTERNAL_KEY` in `.env.local` with a random value containing
at least 32 characters. One way to generate it is:

```powershell
[Convert]::ToHexString(
  [Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
).ToLower()
```

Keep `OPSHUB_AI_PROVIDER=mock` until the live-provider checkpoint is approved.
Then start the private service:

```powershell
.\.venv\Scripts\python.exe -m uvicorn opshub_ai.main:app `
  --host 127.0.0.1 --port 8001
```

Useful endpoints:

- `GET /health` checks the process;
- `GET /ready` reports the selected provider without exposing secrets;
- `POST /v1/intake/turn` requires `X-OpsHub-AI-Key`.

Interactive API documentation is deliberately disabled because this service is
not a public API.

## Verification

```powershell
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m ruff format --check .
.\.venv\Scripts\python.exe -m mypy
.\.venv\Scripts\python.exe -m pip check
.\.venv\Scripts\python.exe -m opshub_ai.evaluate_cli `
  --cases eval\phase8_cases.json
```

Do not commit `.env.local`, provider keys, internal keys, transcripts, or real
requester data.
