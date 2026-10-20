# OpsHub Documentation

This folder contains the product decisions, engineering design, verification
evidence, deployment guidance, and demonstration materials behind OpsHub.

Documents named after a phase are historical checkpoints. They show what was
decided or verified at that point in the build. For the current overall status,
use the release-readiness and zero-cost demo reports below.

## Start here

- [Core MVP specification](product/mvp-spec.md)
- [Engineering design](architecture/phase-2b-engineering-design.md)
- [Release-readiness evidence](testing/phase-9-release-readiness.md)
- [Zero-cost demo preflight](testing/zero-cost-demo-preflight.md)
- [Case study](portfolio/opshub-case-study.md)

## Product and architecture

- [Core MVP specification](product/mvp-spec.md)
- [Bilingual flows and state machines](architecture/phase-2a-flows-and-state-machines.md)
- [Schema, security, RPC, and worker design](architecture/phase-2b-engineering-design.md)
- [Optional AI intake design](architecture/phase-8-ai-intake-design.md)
- [Production and deployment design](architecture/phase-9-production-deployment.md)

## Verification history

- [Phase 5 manual test checkpoint](testing/phase-5-manual-test-checklist.md)
- [Phase 6 delivery worker checkpoint](testing/phase-6-worker-checkpoint.md)
- [Phase 7 Core MVP hardening](testing/phase-7-core-mvp-hardening.md)
- [Phases 1 through 7 readiness audit](testing/phases-1-to-7-readiness-audit.md)
- [Phase 8B AI service foundation](testing/phase-8b-ai-service-foundation.md)
- [Phase 8C retrieval and intake](testing/phase-8c-retrieval-and-intake.md)
- [Phase 8D evaluation and hardening](testing/phase-8d-evaluation-and-hardening.md)
- [Phase 9 release readiness](testing/phase-9-release-readiness.md)
- [Zero-cost demo preflight](testing/zero-cost-demo-preflight.md)

## Deployment and demonstration

- [Zero-cost demo setup](deployment/zero-cost-demo-setup.md)
- [n8n receiver setup](../n8n/README.md)
- [Case study](portfolio/opshub-case-study.md)
- [Three-minute demo script](portfolio/demo-script.md)
- [Service packages and profile copy](portfolio/service-packages-and-profile-copy.md)

All public demonstrations must use synthetic data. Secrets and credentials
belong only in ignored local environment files or an approved secret store.
