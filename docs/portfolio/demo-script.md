# OpsHub Demo Script

Target length: 3 minutes. Use synthetic names and request details only.

## 1. The problem, 20 seconds

“Small teams often receive client requests through disconnected messages,
forms, and spreadsheets. OpsHub gives each request one clear path from intake
to human approval and reliable delivery.”

Show the English landing page, then switch to Arabic to demonstrate genuine
LTR and RTL support.

## 2. Public request, 45 seconds

Open the request form. Choose Company and point out the conditional company
fields, country-aware phone normalization, preferred contact method, privacy
notice, and consent version. Submit a synthetic request and show the random,
non-sequential reference.

Explain that repeating the same browser submission is idempotent, while a new
submission remains a separate request.

## 3. Staff review, 50 seconds

Sign in as an administrator. Search for the reference and open the immutable
submission snapshot. Start Review, mention that it is idempotent and does not
lock the request to one person, then approve after the confirmation step.

Point to the activity timeline. Explain that the first valid final decision
wins and that rejection would require a reason.

## 4. Reliable delivery, 40 seconds

Open delivery diagnostics. Show the pending job becoming succeeded and the
delivery events in the timeline. Open the synthetic Google Sheet row and point
out the request reference used as the idempotency key.

Explain leases, fencing tokens, retries, dead-letter handling, and the
administrator-only manual retry in one sentence: “A failure remains visible
and recoverable instead of being silently lost.”

## 5. Optional assistant, 35 seconds

Return to the request form and open the assistant. Ask a bilingual service
question, show its source citation and editable field proposal, and then return
to the normal form. State clearly that the assistant cannot submit, approve,
or change workflow state.

## 6. Close, 10 seconds

“OpsHub is intentionally focused: one request workflow, one human approval,
and one reliable delivery path. That small scope is what makes the security,
audit trail, and failure handling verifiable.”

## Recording checklist

- use a production build without developer overlays
- hide browser bookmarks, local keys, credentials, and personal accounts
- use only synthetic requester and company data
- record English and Arabic at readable zoom
- do not describe local or mocked behavior as publicly deployed
- add captions and remove pauses before publishing

