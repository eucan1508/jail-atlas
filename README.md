# Evidence-first county custody information — Phase 1

This workspace contains an independent, public-service-oriented custody verification product. The
default local and CI mode remains a synthetic Scott County, Iowa vertical slice. The repository also
contains a guarded live-ingest path for explicitly approved official sources; it requires the Neon
migration, source activation, and the environment described in `docs/live-ingest-runbook.md`.

The publisher name and canonical production origin are environment configuration, not hard-coded
brand decisions. See `.env.example` and the policy documents in `docs/`.

## Workspace

- `apps/web` — Next.js App Router public utility and private development design lab
- `apps/ingest-worker` — source-specific ingestion boundary with closed synthetic defaults and an
  explicit live mode
- `packages/domain` — validated custody and publication concepts
- `packages/database` — PostgreSQL/Drizzle schema and migrations
- `packages/source-adapters` — explicit adapter contracts and failure semantics
- `packages/editorial` — evidence-linked editorial validation
- `packages/ui` — original tokens and reusable presentation components
- `packages/test-fixtures` — clearly synthetic, non-personal test records

## Local verification

Copy `.env.example` to `.env.local`, keep `DATA_MODE=synthetic`, then run:

```sh
corepack pnpm install
corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
corepack pnpm test:a11y
corepack pnpm --filter @jail-atlas/database db:check
corepack pnpm audit --prod --audit-level moderate
```

`pnpm test` includes unit/contract tests and a production-bundle smoke suite that runs `next build`
followed by `next start`. Local development/test secrets have safe prototype defaults; production
startup requires explicit non-placeholder cursor-signing and correction-form HMAC secrets.

Production source integration is opt-in and remains disabled until each official source passes its
audit and health check. See `docs/iowa-source-audit.md` for the current Iowa status.
