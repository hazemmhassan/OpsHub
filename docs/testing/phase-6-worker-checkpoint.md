# Phase 6 delivery worker checkpoint

Status: Checkpoints 6A and 6B are implemented and verified locally. Phase 6 is
not complete because the n8n workflow, Google Sheets destination, staff delivery
diagnostics, and browser-level retry flow still remain.

## Implemented in this checkpoint

- Service-role-only RPCs for claiming deliveries and recording success or
  failure
- Short leases, `FOR UPDATE SKIP LOCKED`, and a new fencing token per attempt
- Automatic dead-lettering when an expired attempt has no remaining budget
- Full-jitter exponential retry scheduling with a 30-minute ceiling
- Administrator-only manual retry that adds one attempt without erasing history
- Immutable V1 payloads generated from the submitted snapshot at approval time
- A Node.js and TypeScript worker with runtime validation at every boundary
- Exact-body HMAC-SHA256 signing and stable idempotency headers
- Exact-origin destination allowlisting, HTTPS by default, and an explicit local
  HTTP exception
- A 15-second request timeout, disabled redirects, and a 64 KiB response cap
- Strict verification of the event ID, request reference, and receiver effect
- Redacted structured worker logs that never print payloads, signatures, or
  secrets

## Verification evidence

Verified locally on 2026-10-17 after rebuilding the database from every
migration:

| Check | Result |
|---|---|
| PostgreSQL and pgTAP | 176 assertions passed across 10 files |
| Database lint | No schema errors found |
| Worker unit tests | 46 passed; the live integration test is skipped by default |
| Worker live integration | 1 passed against local Supabase and a real local HTTP receiver |
| Worker TypeScript | Passed |
| Worker formatting | Passed |
| Worker production build | Passed |
| Worker runtime dependency audit | 0 vulnerabilities |
| Existing web tests | 37 passed across 16 files |
| Existing web typecheck, ESLint, formatting, and build | Passed |
| Root dependency audit | 0 vulnerabilities |

The full worker audit reports one low-severity advisory in development-only
`esbuild` through the pinned Vitest, Vite, and tsx toolchain. The production
dependency audit is clean. An automatic npm audit fix did not change the
affected resolved version, so this checkpoint does not force an incompatible
toolchain upgrade.

## Live integration scenario

The integration test used synthetic data and performed the real sequence:

1. Insert an approved request and immutable submission snapshot.
2. Create one pending delivery through the database payload trigger.
3. Claim it through the service-role worker RPC.
4. Sign and POST the exact payload to a local HTTP receiver.
5. Independently recompute and compare the HMAC at the receiver.
6. Return a matching V1 success response.
7. Record `succeeded`, HTTP 200, the attempt count, and a cleared lease in
   PostgreSQL.
8. Remove the exact synthetic test rows and restore the seeded endpoint.

## Remaining Phase 6 work

- Importable n8n workflow with raw-body signature verification
- Idempotent Google Sheets append-or-update behavior by request reference
- A local mock receiver mode for users who do not configure Google credentials
- Staff delivery diagnostics and administrator manual-retry interface
- Browser and integration evidence for duplicates, temporary failures,
  automatic retry, dead-letter, and manual recovery
