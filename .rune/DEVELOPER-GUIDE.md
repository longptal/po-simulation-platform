# Developer Guide: PO Simulation Platform

## What This Does
A virtual training environment where Product Owners practice real PM decisions with AI teammates (BA, Designer, Dev, Stakeholder, Customer agents). Every decision affects simulated product metrics — the goal is learning by doing, not watching videos.

## Current State
**Planning phase complete. Implementation has not started.**
All architecture decisions are in `docs/`. Start reading from `docs/MASTER-PLAN.md`.

## Planned Quick Setup (once implementation begins)

```bash
# Prerequisites: Node.js 20+, Docker (for PostgreSQL + Redis)

# Install dependencies (Turborepo monorepo)
npm install

# Start infrastructure (PostgreSQL + Redis)
docker compose up -d

# Copy environment template
cp .env.example .env
# Fill in: ANTHROPIC_API_KEY, DATABASE_URL, REDIS_URL

# Run database migrations
npm run db:migrate

# Start all services in dev mode
npm run dev

# Run tests
npm run test

# Lint
npm run lint
```

## Key Architecture Files (once created)

- `packages/shared/types/` — All TypeScript interfaces for agent contracts
- `packages/db/schema.ts` — Drizzle ORM schema (source of truth for DB)
- `apps/orchestrator/src/state-machine.ts` — XState session state machine
- `apps/workers/src/agents/ba-agent.ts` — BA Agent (reference implementation)
- `apps/web/src/app/` — Next.js App Router pages
- `scenarios/` — YAML scenario files (decision trees)

## Architecture Reading Order
1. `docs/MASTER-PLAN.md` — vision, tech stack, phased roadmap
2. `docs/ai-agent-orchestration-plan.md` — agent contracts (TypeScript interfaces), event flow
3. `docs/scenario-engine-plan.md` — YAML schema, decision tree structure
4. `docs/metrics-coaching-plan.md` — how decisions affect metrics
5. `docs/ux-plan.md` — UI layout, daily workflow UX

## Build Order (Phase 1)
1. `packages/shared` + `packages/db` — types and DB schema first
2. Scenario parser + XState state machine
3. BA Agent + Stakeholder Agent
4. Orchestrator event bus wiring
5. Chat UI + Dashboard (Next.js)
6. Scoring engine + sprint retrospective

## Key Design Decisions
- **Hono** for backend API (not Express/Fastify) — enables shared types with frontend
- **XState v5** for session flow, **Zustand** for UI state — both are used
- **BullMQ** for agent jobs — handles retry, timeout, dead-letter automatically
- **Haiku** for Stakeholder/Customer agents, **Sonnet** for BA/Designer/Dev — cost control

## Common Issues (anticipated)

- **LLM output fails Zod validation** → Check agent system prompt includes output format instructions; check Zod schema matches actual LLM response shape
- **XState not transitioning** → Ensure you're using `actor.send()` not direct state mutation; check guard conditions
- **BullMQ job stuck** → Check Redis connection; check worker process is running; check `attempts` config
