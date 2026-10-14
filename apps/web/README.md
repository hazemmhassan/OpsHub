# OpsHub web application

This folder contains the Next.js application for OpsHub. The project uses the
App Router, TypeScript, Tailwind CSS, and ESLint.

## Local setup

Install the locked dependencies:

```bash
npm ci
```

Start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Checks

```bash
npm run lint
npm run build
```

The project commands disable Next.js telemetry so local and automated builds do
not depend on a writable user settings directory.
