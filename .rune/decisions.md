# Architecture Decisions

| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
| 2026-04-07 | Hono over Fastify for backend | Lighter weight, better TypeScript ecosystem, enables type sharing with Next.js frontend | Decided |
| 2026-04-07 | Zustand + XState (both, not either) | Zustand for UI state, XState for scenario/session state machine — different concerns | Decided |
| 2026-04-07 | Model-based metrics in Phase 1 (no Playwright) | Faster to build, sufficient to validate learning loop; Playwright deferred to Phase 2 | Decided |
| 2026-04-07 | YAML for scenario storage | Human-readable, version-controllable, editable without tooling; 50 scenarios manageable | Decided |
| 2026-04-07 | LLM cost tiering: Sonnet for complex agents, Haiku for simple | Target <$2.00/session; Haiku ~10x cheaper for reactive/simple responses | Decided |
| 2026-04-07 | Turborepo monorepo: apps/ + packages/ | Shared types between frontend/backend without publishing; build caching across services | Decided |
| 2026-04-07 | BullMQ for task queue (not direct async/await) | Retry, rate limiting, timeout, job visibility built-in; Redis already required for Pub/Sub | Decided |
| 2026-04-07 | Drizzle ORM over Prisma | Lighter runtime, better JSONB support, closer to raw SQL, better for PostgreSQL-specific features | Decided |
