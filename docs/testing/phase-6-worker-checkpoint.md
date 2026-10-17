# Phase 6 delivery worker checkpoint

Status: Checkpoints 6A, 6B, 6D, and the local portion of 6C are implemented and
verified. Phase 6 is not complete because a real Google credential and sheet
must still be connected and verified.

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
- An importable n8n 2.43.7 workflow that authenticates the exact raw body before
  reaching the Google credential boundary
- An Append or Update Row effect keyed by the stable request reference
- A secret-free workflow export and local-only Docker Compose configuration
- A no-Google in-memory receiver that uses the same signature and response
  contracts for reproducible local testing
- Administrator-only delivery list and detail screens in Arabic and English
- Safe delivery diagnostics that exclude payloads, signatures, secrets, and
  worker lock data
- A confirmed manual-retry flow that returns failed or stopped work to pending,
  adds exactly one attempt, and records the action in the audit timeline
- A dedicated administrator-required boundary for approvers

## Verification evidence

Verified locally on 2026-10-17 after rebuilding the database from every
migration:

| Check                                                   | Result                                                         |
| ------------------------------------------------------- | -------------------------------------------------------------- |
| PostgreSQL and pgTAP                                    | 176 assertions passed across 10 files                          |
| Database lint                                           | No schema errors found                                         |
| Worker unit tests                                       | 54 passed; the live integration test is skipped by default     |
| Worker live integration                                 | 1 passed against local Supabase and a real local HTTP receiver |
| n8n workflow contract                                   | 6 executable checks passed                                     |
| n8n import validation                                   | 1 workflow imported successfully into n8n 2.43.7               |
| n8n Compose validation                                  | Configuration resolved successfully                            |
| Worker TypeScript                                       | Passed                                                         |
| Worker formatting                                       | Passed                                                         |
| Worker production build                                 | Passed                                                         |
| Worker runtime dependency audit                         | 0 vulnerabilities                                              |
| Web tests                                               | 43 passed across 18 files                                      |
| Web typecheck, ESLint, formatting, and production build | Passed                                                         |
| Root dependency audit                                   | 0 vulnerabilities                                              |

The full worker audit reports one low-severity advisory in development-only
`esbuild` through the pinned Vitest, Vite, and tsx toolchain. The production
dependency audit is clean. An automatic npm audit fix did not change the
affected resolved version, so this checkpoint does not force an incompatible
toolchain upgrade.

## Live integration scenario

The integration test used synthetic data and performed the real sequence with
the shipped no-Google receiver:

1. Insert an approved request and immutable submission snapshot.
2. Create one pending delivery through the database payload trigger.
3. Claim it through the service-role worker RPC.
4. Sign and POST the exact payload to a local HTTP receiver.
5. Independently recompute and compare the HMAC at the receiver.
6. Return a matching V1 success response.
7. Record `succeeded`, HTTP 200, the attempt count, and a cleared lease in
   PostgreSQL.
8. Remove the exact synthetic test rows and restore the seeded endpoint.

## Staff recovery browser scenario

The browser verification used exact synthetic rows that were removed afterward:

1. Sign in as an administrator and open delivery diagnostics.
2. Open a stopped delivery showing HTTP 503 and 5 of 5 attempts.
3. Confirm that retry is unavailable until the explicit confirmation step.
4. Confirm the retry and observe `pending`, 5 of 6 attempts, cleared error
   fields, a success announcement, and a new `manual_retry` timeline entry.
5. Open the same interface in Arabic and verify the localized status and attempt
   count.
6. Sign in as an approver, confirm the diagnostics link is absent, and verify a
   direct diagnostics URL reaches the administrator-required boundary.
7. Confirm that the browser console reports no errors in these flows.

## Remaining Phase 6 work

- Connect a real Google credential and sheet, then record one live append and
  one duplicate update using synthetic data
- Record the final live Google delivery evidence without storing credentials in
  Git

The repository does not claim live Google Sheets delivery yet. The exported
workflow has been behavior-tested and imported into the pinned n8n release, but
Google authentication is intentionally never stored in Git.
