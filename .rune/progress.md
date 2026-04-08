# Progress Log

## Current Phase
**Phase 1 — Foundation (Week 1-2): ~85% Complete**

## Recent Updates

### 2026-04-08 — Doc Alignment (Cross-Document Mismatch Resolution)

All 8 planning documents have been aligned. Key decisions locked:

| Decision | Value |
|---|---|
| Backend framework | Hono (was Fastify in orchestration plan) |
| Scoring dimensions | 4 (MVP): Prioritization, Communication, Analytics, Stakeholder Management |
| Agent #5 naming | "Customer Agent" (was "QA Agent" in scenario plan) |
| MVP scenario count | 15 scenarios (was "50" in scenario plan summary — 50 is Phase 2) |
| React Flow | Deferred to Phase 2 |
| Time model | **Career Mode** — 1 scenario = 1 sprint = ~4-6 event-day checkpoints (skip days) |
| PO sessions | 1 session = 3 sprints (3 scenarios in sequence) |
| Cost target | < $2.00 per scenario (1 sprint); ~$4-6 per full 3-sprint session |
| Freeform Evaluator | Phase 1 MVP scope, inline LLM call (synchronous, ~$0.02/scenario) |
| State machine | Two versions: Phase 1 simplified (2 agents) + Phase 2 full (5 agents) |

Documents updated:
- `docs/MASTER-PLAN.md`
- `docs/ai-agent-orchestration-plan.md`
- `docs/scenario-engine-plan.md`
- `docs/metrics-coaching-plan.md`
- `docs/ux-plan.md`
- `docs/plans/architecture-design.md`
- `docs/plans/gameplay-design.md`
- `docs/ba/04-session-management.md`

---

## Completed

- [2026-04-07] Architecture planning documents finalized (8 docs in `docs/`)
- [2026-04-07] Tech stack decided (Turborepo, Hono, Next.js, XState, Drizzle, BullMQ, Redis)
- [2026-04-07] CLAUDE.md created — project context for AI sessions
- [2026-04-07] .rune/ initialized — conventions, decisions, contract files
- [2026-04-08] Initialized Turborepo monorepo (`apps/`, `packages/`)
- [2026-04-08] Defined shared TypeScript types in `packages/shared/src/types/`
  - `agents.ts` — BA, Designer, Dev, Stakeholder, Customer agent contracts
  - `scenario.ts` — Scenario engine types, decision trees, progression system
- [2026-04-08] Defined Drizzle ORM schema in `packages/db/src/schema.ts`
  - Users, Scenarios, Sessions, Agent Jobs, Decisions, Completions tables
  - JSONB columns for flexible agent data
- [2026-04-08] Docker Compose for local dev (PostgreSQL 16 + Redis 7)
- [2026-04-08] Environment template (`.env.example`)
- [2026-04-08] Built scenario YAML parser with Zod validation
  - `packages/shared/src/schemas/scenario.schema.ts` — Zod schemas
  - `packages/shared/src/utils/scenario-parser.ts` — Parser + validator
- [2026-04-08] Created test scenario YAML file
  - `scenarios/sprint-planning-capacity.yaml` — E-commerce sprint planning scenario
- [2026-04-08] Set up apps/orchestrator with XState v5
  - `state-machine/session.machine.ts` — XState v5 state machine (skeleton)
  - `services/session-manager.ts` — Session actor manager
  - `routes/index.ts` — Hono REST API
  - `index.ts` — Main entry point
- [2026-04-08] Implemented BA Agent with Claude API
  - `apps/workers/src/agents/ba-agent.ts` — BA Agent with Sonnet 4
  - `apps/workers/src/index.ts` — BullMQ worker service
  - `packages/shared/src/schemas/agent-output.schema.ts` — Zod validation
  - Retry logic, rate limiting, graceful shutdown
- [2026-04-08] Database integration + Orchestrator ↔ BullMQ connection
  - `packages/db/src/db.ts` — Database operations
  - `apps/orchestrator/src/services/orchestrator.service.ts` — Core orchestration logic
  - End-to-end flow: API → DB → BullMQ → Worker → Claude API

## Next Up (Phase 1 — Week 1-2: Foundation)

- [x] Implement BA Agent skeleton (`apps/workers/src/agents/ba-agent.ts`)
- [x] Set up BullMQ job queue + Redis event bus
- [x] Connect orchestrator to database (load scenarios, persist sessions)
- [x] Wire orchestrator to BullMQ (dispatch BA jobs on decision)
- [ ] Rewrite Phase 1 XState machine (see below)
- [ ] Add FREE_FORM event + Freeform Evaluator (inline LLM, ~$0.02/scenario)
- [ ] Implement Stakeholder Agent (reactive feedback, async via BullMQ)
- [ ] Agent completion → SSE push to frontend (Redis Pub/Sub → web)
- [ ] Scoring engine (4 dimensions: Prioritization, Communication, Analytics, Stakeholder Mgmt)
- [ ] Test end-to-end flow with real API key

### ⚠️ State Machine Rewrite Needed

Current `session.machine.ts` uses old skeleton states (`waitingForDecision`).
Must update to Phase 1 states from `ai-agent-orchestration-plan.md §4.2`:

**Phase 1 states to implement:**
```
INIT → AWAITING_DECISION → SPEC_DRAFTING → SPEC_REVIEW
     → STAKEHOLDER_FEEDBACK → DECISION_FINAL
     → SPRINT_COMPLETE → EVENT_DAY_WAIT (back to AWAITING_DECISION or SESSION_COMPLETE)
```

**New events needed:**
- `FREE_FORM` — PO freeform input (triggers Freeform Evaluator inline)
- `APPROVE_SPEC` / `REVISE_SPEC` — PO spec review
- `SHIP` / `ITERATE` — PO final decision
- `SKIP_TO_CHECKPOINT` — Career Mode fast-forward

**Context additions:**
- `currentPhase: 'phase1' | 'phase2'`
- `currentCheckpoint: number` (1-9 across 3 sprints)
- `eventDayWait: boolean` (Career Mode skip)

## Phase 2 Work — Frontend UI (`apps/web/`)

- [x] Phase 1: UNDERSTAND — scouted codebase, reviewed requirements.md, ui-spec.md
- [ ] Phase 2: PLAN — create implementation plan for apps/web/
- [ ] Phase 3: TEST — write failing tests
- [ ] Phase 4: IMPLEMENT — build Next.js app
- [ ] Phase 5: QUALITY
- [ ] Phase 6: VERIFY
- [ ] Phase 7: COMMIT

## Phase 1 Notes

- `apps/web/` is greenfield — Next.js 14+ App Router + Tailwind CSS + Zustand
- Dependencies: react-markdown, remark-gfm, zustand
- 3-column layout: left=docs, middle=chat + decision popup, right=metrics
- UI spec locked in `.rune/ui-spec.md` (colors, spacing, card style, chat bubbles)
- Monorepo already bootstrapped with Turborepo
- `packages/shared` has agent types + Zod schemas ready to import

## Architecture Decisions Log (ADR)

| # | Decision | Rationale |
|---|---|---|
| ADR-01 | Hono over Fastify | Lighter, better TS ecosystem, shared types with Next.js |
| ADR-02 | Zustand (UI) + XState (session) | Not one or the other — separate concerns |
| ADR-03 | 4 scoring dimensions (MVP), expand in Phase 2 | Keep MVP scope tight |
| ADR-04 | Career Mode time model | Skip uneventful days, only halt at event-day checkpoints |
| ADR-05 | Freeform Evaluator inline (not BullMQ job) | Synchronous, ~800 tokens, instant feedback |
| ADR-06 | Model-based metrics (Phase 1), Playwright (Phase 2) | Faster to validate core loop |