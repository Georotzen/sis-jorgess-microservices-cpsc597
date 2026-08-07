# SIS Platform

Monorepo for the Student Information System capstone project.

## Structure

- `apps/client` — Next.js SPA (client-side rendered)
- `services/gateway` — NestJS API Gateway
- `services/identity` — Identity & Access Service
- `services/student-profile` — Student Profile Service
- `services/enrollment` — Enrollment Service
- `services/grades` — Grades Service
- `services/audit` — Audit & Logging Service
- `packages/shared-dtos` — Shared TypeScript DTOs / interface contracts
- `packages/shared-config` — Shared eslint/tsconfig/etc.
- `packages/shared-errors` — Common error filters/constants
- `infra/` — Docker, Keycloak, Vault configuration
- `docs/` — Architecture diagrams and STRIDE threat model

## Getting started

\`\`\`bash
pnpm install
pnpm dev
\`\`\`
