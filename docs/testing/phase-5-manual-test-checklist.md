# Phase 5 manual testing checklist

Use this checklist to review the complete request and approval journey before
the Phase 5 commits are pushed. Test only with synthetic information.

## What is in scope

Phase 5 includes public request submission, staff request visibility, Start
Review, approval, rejection, and the activity timeline. An approval creates a
pending integration delivery, but Phase 6 will build the worker that sends it
to n8n and Google Sheets.

## 1. Public English individual request

1. Open `/en/request/opshub-demo-request-form`.
2. Keep **Individual** selected.
3. Enter a valid Egyptian phone number. Arabic-Indic digits such as
   `٠١٠١٢٣٤٥٦٧٨` should also work.
4. Enter a request title of at least 5 characters and a description of at least
   20 characters.
5. Accept consent and submit.

Expected result:

- A confirmation page appears.
- It shows a random 10-character reference.
- It does not show the requester's personal information.

## 2. Public Arabic company request

1. Open `/ar/request/opshub-demo-request-form`.
2. Confirm that the layout direction is right to left.
3. Select **شركة**.
4. Confirm that company name, job title, and company website appear.
5. Enter a website without a scheme, such as `example.com`.
6. Submit valid Arabic or English text.

Expected result:

- Company name is required, while job title and website are optional.
- The request succeeds and receives a different random reference.
- Switching back to **فرد** hides the company fields.

## 3. Public validation and abuse cases

Check these one at a time:

| Case | Expected result |
|---|---|
| Empty required field | Submission stays on the form and validation is shown |
| Request title shorter than 5 characters | Rejected |
| Description shorter than 20 characters | Rejected |
| Invalid phone number | Rejected |
| Valid phone from a different selected country | Accepted without a hard failure |
| Yesterday as the desired start date | Rejected |
| Today or a future date | Accepted |
| Consent not selected | Rejected |
| Company selected without company name | Rejected |
| Website entered as `example.com` | Accepted and normalized to HTTPS |
| Website using `javascript:` or another unsafe scheme | Rejected |
| Rapidly press submit twice | Only one request should be created for that form load |
| Submit more than five attempts within 15 minutes | The sixth attempt shows the rate-limit message |

Refresh the form before testing a genuinely separate request so it receives a
new idempotency key.

## 4. Staff authentication and list

1. Open `/en/staff`.
2. Confirm that a signed-out visitor is redirected to the sign-in page.
3. Try an incorrect password and confirm that no internal authentication detail
   is exposed.
4. Sign in with the local test staff account.
5. Confirm that the requests from sections 1 and 2 appear.
6. Search by reference, title, and contact name.
7. Filter each status: Submitted, Under review, Approved, and Rejected.

Expected result:

- Only requests belonging to the signed-in organization appear.
- Arabic submissions are marked as Arabic and English submissions as English.
- Search and status filters can be combined.

## 5. Review and approve

1. Open a submitted request.
2. Check the submitted contact, company, service, and description fields.
3. Confirm that only **Start review** is available.
4. Start the review.
5. Confirm that approval and rejection controls now appear.
6. Approve the request.

Expected result:

- The status moves in order from Submitted to Under review to Approved.
- The timeline contains Request submitted, Review started, Request approved,
  and Delivery job created.
- Final decision controls disappear after approval.

## 6. Review and reject

1. Open another submitted request and start its review.
2. Try a rejection reason shorter than 5 characters.
3. Enter a meaningful reason and reject it.

Expected result:

- The short reason is rejected.
- The final reason is visible with the Rejected decision.
- No Delivery job created event appears for the rejected request.

## 7. Concurrency edge case

1. Open the same submitted request in two browser tabs.
2. Press Start review in both tabs.
3. Refresh both tabs and confirm they show Under review without duplicate review
   timeline events.
4. If possible, submit different final decisions from the two tabs at nearly
   the same time.

Expected result:

- Start Review is idempotent.
- Only the first final decision wins.
- The losing tab receives a conflict message and shows the latest state.

## 8. Record the review

Acceptance review completed locally on 17 October 2026 with synthetic data only.

| Journey | Result | Evidence |
|---|---|---|
| English individual submission | Passed | Reference `27WNQZABBJ`; Arabic-Indic digits normalized to `+201001234567`, email lowercased, whitespace collapsed, and the non-blocking phone-country warning displayed |
| Arabic company submission | Passed | Reference `BFPKN0T36T`; RTL had no horizontal overflow, all conditional fields appeared, and `example.com` stored as `https://example.com` |
| Validation and abuse cases | Passed | Required lengths, phone, dates, consent, company name, and unsafe schemes are covered by web tests; empty-form focus, honeypot blocking, and the sixth-attempt rate message were also verified in the browser |
| Invalid or inactive public link | Passed | A safe bilingual unavailable screen is shown instead of a generic 404 or organization detail |
| Staff sign-in and filtering | Passed | Signed-out redirect, incorrect-password message, administrator and approver access, reference/title/contact searches, and all status filters passed |
| Approval journey | Passed | `27WNQZABBJ` moved through both required states after explicit confirmation; one decision, one pending delivery, and four audit events were verified |
| Rejection journey | Passed | `BFPKN0T36T` rejected a short reason, stored the valid Arabic reason, and created no delivery |
| Concurrent Start Review | Passed | Two simultaneous calls for `F2MZDPK72X` returned one transition and one idempotent replay, with one review audit event |
| Concurrent final decisions | Passed | Simultaneous approve and reject calls for `F2MZDPK72X` produced one approval and one `request_conflict`; exactly one decision and one delivery exist |
| Concurrent duplicate submission | Passed | Two simultaneous submissions with one idempotency key returned reference `DRGMW6EZMH`; one was original, one was a replay, and only one request and audit event exist |
| Automated verification | Passed | 132 database assertions, 37 web tests, schema lint, TypeScript, ESLint, Prettier, production build, and both production dependency audits |

Phase 5 is accepted locally. Phase 6 still owns the delivery worker, signed n8n
webhook, Google Sheets upsert, automatic retries, dead-letter handling, and the
administrator manual-retry interface.
