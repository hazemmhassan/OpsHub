# OpsHub web application

This folder contains the Next.js application for OpsHub. The project uses the
App Router, TypeScript, Tailwind CSS, and ESLint.

## Local setup

Use Node.js 24 and npm 11. The `.nvmrc` file records the required Node major
version.

Install the locked dependencies:

```bash
npm ci
```

Copy `.env.example` to `.env.local`. Add the public local values shown by
`supabase status`, the local Supabase secret key, and a random value of at least
32 characters for `PUBLIC_SUBMISSION_RATE_LIMIT_KEY`. The two private values
must stay server-only and must never use a `NEXT_PUBLIC_` prefix.

Start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

The demo public form is available at
[http://localhost:3000/en/request/opshub-demo-request-form](http://localhost:3000/en/request/opshub-demo-request-form)
and has an Arabic version under `/ar`.

## Local staff sign-in

Use the public values shown by `supabase status` in `.env.local`. To create a
local staff account, provide the local service role key and your own test email
and password as temporary shell environment variables, then run
`npm run staff:create:local`. The helper refuses non-local Supabase URLs and
never prints the password.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run format:check
npm run build
```

The project commands disable Next.js telemetry so local and automated builds do
not depend on a writable user settings directory.
