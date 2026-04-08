# Plan: PO Simulation Platform — MVP

## Overview
Xây dựng "flight simulator cho Product Owners": multi-agent orchestration (BA → Stakeholder), real-time scoring, scenario-driven sessions. Phase 1: 1 scenario e-commerce, 3 sprints, ~15 decision nodes.

## Phases
| # | Name | Status | Plan File | Summary |
|---|------|--------|-----------|---------|
| 1A | Core Infrastructure | ✅ Complete | `plan-po-simulation-platform-phase1a.md` | EventBus, AgentRegistry, StakeholderAgent, CircuitBreaker, AgentDispatcher |
| 1B | Orchestrator Integration | ⬚ Pending | `plan-po-simulation-platform-phase1b.md` | DecisionEngine, CheckpointService, ScenarioLoader, XState wiring, SSE endpoint |
| 1C | Frontend Dashboard | ⬚ Pending | `plan-po-simulation-platform-phase1c.md` | DashboardLayout, ChatThread, MetricsPanel, DecisionPrompt, Zustand stores |
| 1D | E2E Integration & Scenarios | ⬚ Pending | `plan-po-simulation-platform-phase1d.md` | Wire all layers, end-to-end test, 1 complete scenario |

## Key Decisions
- Event Bus: Hybrid — BullMQ (jobs) + Redis Pub/Sub (notifications) — approved 2026-04-08
- Agent Pipeline: Sequential BA → Stakeholder — approved 2026-04-08
- State Sync: XState (source of truth) + Zustand (UI) + PostgreSQL (persist) — approved 2026-04-08
- Session Persistence: Full XState checkpointing sau mỗi transition — approved 2026-04-08
- Scoring: Real-time trigger after every PO decision — approved 2026-04-08
- Feedback Loop: Chat (agent outputs) + Metrics panel — approved 2026-04-08
- Module Architecture: Layered (web / orchestrator / workers / packages) — approved 2026-04-08

## Architecture (Layered)
```
apps/web (Next.js + Zustand + SSE)
   ↕ REST/SSE
apps/orchestrator (Hono + XState v5 + BullMQ)
   ↕ BullMQ jobs
apps/workers (Node.js + BullMQ + Redis Pub/Sub)
   ↕ Redis Pub/Sub
packages/shared (types, Zod schemas, scoring engine)
packages/db (Drizzle ORM)
```

## Workflow Registry

### View 1: By Workflow
| Workflow | Entry Point | Components | Exit Point | Phase |
|----------|-------------|-----------|------------|-------|
| Submit decision | `POST /sessions/:id/decision` | DecisionPrompt → orchestrator → XState → AgentDispatcher | SSE → Chat + Metrics | 1D |
| Agent processing | BullMQ job | BA Agent → Stakeholder Agent → Redis Pub/Sub | orchestrator notified | 1A |
| Session checkpoint | XState transition | CheckpointService → PostgreSQL | state persisted | 1B |
| Session resume | Server restart | ScenarioLoader → XState actors | active session restored | 1B |

### View 2: By Component
| Component | Owner | Phase | Status |
|-----------|-------|-------|--------|
| EventBus | orchestrator | 1A | Missing |
| AgentRegistry | workers | 1A | Missing |
| StakeholderAgent | workers | 1A | Missing |
| CircuitBreaker | workers | 1A | Missing |
| AgentDispatcher | orchestrator | 1A | Missing |
| DecisionEngine | orchestrator | 1B | Missing |
| CheckpointService | orchestrator | 1B | Missing |
| ScenarioLoader | orchestrator | 1B | Missing |
| DashboardLayout | web | 1C | Missing |
| SSE stream | orchestrator+web | 1B+1C | Missing |

### View 3: By User Journey
| Journey | Steps | Phase |
|---------|-------|-------|
| Play 1 scenario | start → decision × N → BA → Stakeholder → feedback → metrics → complete | 1D |
| See real-time impact | decision → metrics update (< 3s) → chat feedback | 1D |

### View 4: By State
| Event | XState State | DB State | Web UI Update |
|-------|-------------|----------|---------------|
| Load scenario | `loadingScenario` → `waitingForDecision` | session created | scenario prompt shown |
| Submit decision | `waitingForDecision` → `processingDecision` | decision recorded | loading indicator |
| Agents complete | `waitingForAgents` → `waitingForDecision` | agent_jobs updated | chat + metrics updated |
| Scenario complete | → `completed` | completion recorded | score + XP shown |

## Dependencies
- PostgreSQL 16 + Redis 7: docker-compose.yml (ready)
- XState v5: already in dependencies
- BullMQ + ioredis: already in dependencies
- Vitest: already in dependencies
- `@anthropic-ai/sdk`: already in dependencies

## Risks
- Redis/PostgreSQL not running on startup: check health endpoints before dispatching jobs
- BullMQ Redis connection race: ensure Redis connected before worker starts
- XState actor snapshot version mismatch on restore: store version hash in snapshot

## Exit Criteria
- User can play 1 scenario (e-commerce, 3 sprints, ~15 decisions) start-to-finish
- BA agent generates spec after every decision
- Stakeholder agent gives feedback after every decision
- Real-time metrics update in dashboard
- Score + XP shown on session completion