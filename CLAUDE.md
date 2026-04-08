# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

**Planning phase only.** No code exists yet. The `docs/` directory contains 5 architectural planning documents. Implementation has not started.

## What This Project Is

A "flight simulator for Product Owners" — a virtual training environment where POs make real product decisions with AI teammates (BA, Designer, Dev, Stakeholder, Customer agents) and see the impact on simulated product metrics.

## Planned Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + Tailwind CSS + Zustand (PWA) |
| Backend | Hono (TypeScript) — chosen over Fastify for lighter weight + shared types with frontend |
| Real-time | WebSocket (chat) + SSE (notifications) |
| Database | PostgreSQL 16 + JSONB |
| Cache / Event Bus | Redis 7 (Pub/Sub) |
| ORM | Drizzle ORM |
| Task Queue | BullMQ (Redis-backed) |
| State Machine | XState v5 (scenario/session flow) + Zustand (UI state) |
| LLM — Complex agents | Claude Sonnet 4.6 (BA, Designer, Dev agents) |
| LLM — Simple agents | Claude Haiku 4.5 (Stakeholder, Customer, Orchestrator) |
| MCP | @modelcontextprotocol/sdk (Stitch for design, Codex/Claude CLI for dev) |
| Scenario Storage | YAML + JSON Schema |
| Monorepo | Turborepo (`apps/` + `packages/`) |
| Deploy | Vercel / Cloudflare Pages (app), Docker Compose (dev), Kubernetes (prod) |

## Planned Monorepo Structure

```
apps/
  web/          # Next.js frontend (PO Interface / PWA)
  orchestrator/ # Session manager + flow controller + XState state machine
  workers/      # AI agent runtimes (BA, Designer, Dev, Stakeholder, Customer)
packages/
  shared/       # Shared TypeScript types, Zod schemas, scoring engine, impact mapping
  db/           # Drizzle ORM schema + migrations
```

## Architecture

### Core Pattern: Hybrid Orchestrator + Event-Driven

- **Orchestrator** (central brain): routes PO decisions, manages session state, controls deterministic flow (BA → Designer → Dev)
- **Event Bus** (Redis Pub/Sub): loosely coupled agent-to-agent communication; Stakeholder/Customer agents react async
- **Task Queue** (BullMQ): async job dispatch to agents with retry + rate limiting
- **State Store** (PostgreSQL + Redis cache): session checkpoints, agent outputs, audit log

### AI Agent Contracts

Each agent has typed Input/Output contracts validated with Zod. All agent outputs MUST pass Zod validation before use. On validation failure: retry with format instructions (max 2 attempts), then circuit breaker (5 failures → pause agent).

**BA Agent** — converts PO decision into structured spec (user stories, acceptance criteria, API endpoints, UI requirements, out-of-scope)

**Stakeholder Agent** — pushes priority changes, negotiates with PO, creates urgency pressure

**Designer Agent** (Phase 2) — integrates Stitch MCP, produces mockups

**Dev Agent** (Phase 2) — integrates Codex/Claude CLI, produces PRs for PO review

**Customer Agent** (Phase 2) — synthetic user personas producing usability feedback

### Scenario System

Scenarios are stored as YAML files with a defined schema. Each scenario has:
- `decision_tree`: DAG of `DecisionNode` objects with typed options and consequences
- `scoring`: weighted rubric across 4 dimensions (Prioritization, Communication, Analytics, Stakeholder Management)
- `outcomes`: `success_criteria`, `failure_modes`, `learning_objectives`

`SideEffect` targets: `metric | team_morale | stakeholder_trust | technical_debt | timeline`

Scenarios are validated against JSON Schema at startup before being loaded into the DB.

### Metrics Model

Phase 1: model-based synthetic metrics (calibrated, not real user data — must be labeled clearly to users).
Phase 2: validate with Playwright headless browser against deployed per-simulation apps.

### Build Order (implementation sequence)

1. `packages/shared` + `packages/db` — shared types + DB schema
2. Scenario parser + XState state machine (`apps/orchestrator`)
3. BA Agent + Stakeholder Agent (`apps/workers`)
4. Orchestrator flow — session manager + event bus
5. Chat UI + Dashboard (`apps/web`)
6. Scoring engine + impact mapping (`packages/shared`)
7. Metrics dashboard + reports (`apps/web`)
8. Designer/Dev/Customer agents (Phase 2)

## MVP Scope (Phase 1)

2 agents only (BA + Stakeholder), 1 complete scenario (e-commerce domain, 3 sprints, ~15 decision nodes at levels 1–7), model-based metrics, no Playwright, no real-time coach whispers.

**Exit criteria**: a user can play 1 scenario (3 sprints, ~45 min) start-to-finish and receive scoring + coaching.

## Key Design Decisions

- **Hono over Fastify** for backend (lighter, better TypeScript ecosystem, type sharing with frontend)
- **Zustand for UI state, XState for session/scenario state machine** (not one or the other)
- **Model-based metrics in Phase 1** (no Playwright) — faster to build, still validates learning loop
- **YAML for scenario storage** — human-readable, version-controllable, editable without tooling
- **LLM cost control**: model tiering (Haiku for simple agents), prompt caching target 90% input cost reduction, free tier capped at 3 sessions/day; target < $2.00 per session

## Planning Documents

- `docs/MASTER-PLAN.md` — executive summary, unified tech stack, phased roadmap, risks
- `docs/ai-agent-orchestration-plan.md` — agent contracts (TypeScript interfaces), orchestrator flow, error handling, circuit breaker
- `docs/scenario-engine-plan.md` — scenario YAML schema, decision tree structure, progression system (20 levels, 6 skill branches)
- `docs/metrics-coaching-plan.md` — causal mapping (decision → impact chain), synthetic user model, coaching engine
- `docs/ux-plan.md` — 3-column dashboard layout, daily workflow UX (morning briefing → work phase → end-of-day), onboarding flow
