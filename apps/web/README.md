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

Copy `.env.example` to `.env.local` when you need to override the safe local
defaults. Environment values are validated when Next.js starts or builds.

Start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

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
