# OpsHub n8n receiver

This folder contains the importable n8n workflow that verifies OpsHub's signed
approval event before it reaches Google credentials, then appends or updates one
Google Sheets row using the request reference as the stable key.

## Local n8n setup

1. Copy `.env.example` to `.env`.
2. Generate a long random `N8N_ENCRYPTION_KEY`.
3. Set `OPSHUB_WEBHOOK_SIGNING_SECRET` to the same secret used by the worker.
4. Start n8n:

   ```powershell
   docker compose --env-file n8n/.env -f n8n/compose.yml up -d
   ```

5. Open `http://127.0.0.1:5678`, finish the local owner setup, and import
   `n8n/workflows/opshub-google-sheets.json`.

The compose file exposes n8n only on the local machine, allows only Node's
`crypto` built-in inside Code nodes, disables diagnostics, and keeps the real
secret outside the exported workflow.

## Google Sheets setup

1. Create a sheet named `Approved Requests`.
2. Paste the first row from `google-sheet-headers.csv` into the sheet.
3. Add the spreadsheet ID to `OPSHUB_GOOGLE_SHEET_ID` in `n8n/.env`.
4. Restart n8n after changing its environment.
5. Open **Upsert Request by Reference** and attach your Google Sheets
   credential. The exported workflow intentionally contains no credential ID.
6. Confirm that the operation is **Append or Update Row** and the matching
   column is `reference`.
7. Publish the workflow and use its production URL:
   `http://127.0.0.1:5678/webhook/opshub-approved-request`.

Keep the workflow unpublished until the credential, spreadsheet, secret, and
column mapping are configured. Use synthetic data for local demonstrations.

## No-Google local path

The worker package includes a local in-memory receiver. It performs the same
raw-body HMAC verification and request-reference upsert contract without n8n or
Google credentials:

```powershell
npm --prefix apps/worker run mock-receiver
```

Set the seeded webhook endpoint to
`http://host.docker.internal:5679/webhook/opshub` when a process inside Docker
must reach it, or `http://127.0.0.1:5679/webhook/opshub` when the worker and
database both run directly on the host. View the current in-memory rows at
`http://127.0.0.1:5679/rows`.

The mock receiver binds only to `127.0.0.1` and loses its rows when restarted.
It is a verification and demo fallback, not a production destination.

## Verification

Run the executable workflow contract tests:

```powershell
npm run n8n:test
```

Validate the export against the pinned n8n release with Docker:

```powershell
npm run n8n:validate
```
