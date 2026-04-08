# Phase 1D: E2E Integration & Scenarios

## Goal
Wire tất cả layers lại với nhau: web ↔ orchestrator ↔ workers ↔ Redis ↔ PostgreSQL. Register agents vào BullMQ worker. Viết end-to-end test. Tạo 1 complete scenario (e-commerce, 3 sprints, ~15 decision nodes). Đạt exit criteria: user có thể chơi 1 scenario start-to-finish.

---

## Data Flow (Full System)

```
┌──────────────────────────────────────────────────────────────────┐
│  apps/web (Next.js + Zustand + SSE)                               │
│  DashboardLayout → useDecision → POST /sessions/:id/decision     │
│                   ↕ SSE /sessions/:id/stream                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP + SSE
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  apps/orchestrator (Hono)                                        │
│                                                                   │
│  Routes: POST /sessions → SessionManager.createSession()          │
│          POST /sessions/:id/decision → SessionManager.submit()    │
│          GET  /sessions/:id/stream → SSE stream                  │
│                                                                   │
│  SessionManager (XState actors)                                   │
│    │ XState: idle → loadingScenario → waitingForDecision         │
│    │         → processingDecision → waitingForAgents             │
│    │                                                            │
│    ├── DecisionEngine.processDecision()                           │
│    │     ScoringEngine.computeSprintScore() ← ScoringEngine     │
│    │     │                                                      │
│    │     └── EventBus.publish(session:{id}:metrics, ...)         │
│    │                                                            │
│    ├── AgentDispatcher.dispatchSequential('ba', input)           │
│    │     │ BullMQ: agent:ba queue                               │
│    │     ▼                                                      │
│    │ BAAgent.run() → StakeholderAgent.run()                    │
│    │     │ BullMQ: agent:stakeholder queue                      │
│    │     ▼                                                      │
│    │ EventBus.publish(session:{id}:events, ...)                  │
│    │                                                            │
│    └── CheckpointService.save(stateSnapshot) → PostgreSQL       │
└────────────────────────────┬─────────────────────────────────────┘
                             │ BullMQ + Redis Pub/Sub
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  apps/workers (Node.js + BullMQ)                                  │
│                                                                   │
│  Worker startup: AgentRegistry.register('ba', BAAgent)            │
│                  AgentRegistry.register('stakeholder', StakeholderAgent) │
│                                                                   │
│  BullMQ Queue 'agent:ba':                                         │
│    → processJob() → AgentRegistry.get('ba').run(input)           │
│    → validate output with Zod                                    │
│    → complete job, emit BullMQ 'completed' event                 │
│                                                                   │
│  BullMQ Queue 'agent:stakeholder':                                │
│    → processJob() → AgentRegistry.get('stakeholder').run()      │
│    → validate output                                             │
│    → complete job                                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## Tasks

### Wave 1 (workers startup + BullMQ wiring)

- [ ] Task 1 — Wire workers/index.ts (register agents + connect BullMQ)
  - File: `apps/workers/src/index.ts` (modify existing stub)
  - Test: `apps/workers/src/__tests__/index.test.ts` (new)
  - Verify: `npm test -- --grep "workers index" --prefix apps/workers`
  - Commit: `feat(workers): wire BullMQ → AgentRegistry → registered agents`
  - Logic:
    1. Create BullMQ Queue instances for `agent:ba` and `agent:stakeholder`
    2. Create Worker for each queue: `new Worker('agent:ba', async job => agent.run(job.data))`
    3. Worker `completed` event → Redis Pub/Sub publish to `agent:job:complete`
    4. Worker `failed` event → log error + emit `failed` event
    5. Register agents on startup: `AgentRegistry.register('ba', new BAAgent())`, `AgentRegistry.register('stakeholder', new StakeholderAgent())`
    6. Graceful shutdown: `worker.close()` + `queue.close()` on SIGTERM
  - Edge: Redis not available → retry connection 3x then exit with error; duplicate queue → ignore

### Wave 2 (orchestrator startup + routes wiring)

- [ ] Task 2 — Wire orchestrator/index.ts (startup sequence)
  - File: `apps/orchestrator/src/index.ts` (modify existing)
  - Test: `apps/orchestrator/src/__tests__/index.test.ts` (new)
  - Verify: `npm test -- --grep "orchestrator index" --prefix apps/orchestrator`
  - Commit: `feat(orchestrator): wire orchestrator startup — ScenarioLoader → EventBus → SSEBroadcaster`
  - Logic:
    1. On startup: `ScenarioLoader.seedFromYaml()` — load all scenarios from `scenarios/*.yaml` into DB
    2. `CheckpointService.listActive()` → resume any interrupted sessions
    3. Start SSEBroadcaster singleton
    4. Initialize Redis connection for EventBus
    5. Start Hono HTTP server
  - Edge: DB not ready → wait up to 30s, then exit with error; YAML file missing → log warning, skip

- [ ] Task 3 — Wire orchestrator routes (complete REST API)
  - File: `apps/orchestrator/src/routes/index.ts` (modify existing)
  - Test: `apps/orchestrator/src/routes/__tests__/index.test.ts` (new)
  - Verify: `npm test -- --grep "routes" --prefix apps/orchestrator && tsc --noEmit --prefix apps/orchestrator`
  - Commit: `feat(orchestrator): complete REST API — POST /sessions, GET /sessions/:id, POST /decision, SSE stream`
  - Routes to implement:
    - `POST /sessions` — body: `{scenarioId: string, userId: string}` → `SessionManager.createSession()` → return `{sessionId, currentNode}`
    - `GET /sessions/:id` — return current session state (for web polling fallback)
    - `POST /sessions/:id/decision` — body: `{optionId: string, timeTaken: number}` → `SessionManager.submitDecision()` → return `{accepted: true}`
    - `GET /sessions/:id/stream` — SSE stream (from Task 6 Phase 1B)
    - `GET /sessions/:id/metrics` — return current metrics (for initial page load)
    - `GET /health` — health check (DB + Redis status)
  - Edge: session not found → 404; validation error → 400 with error message

### Wave 3 (frontend integration + demo scenario)

- [ ] Task 4 — Frontend SSE + API wiring (final integration)
  - File: `apps/web/src/hooks/use-session-sync.ts` (final version)
  - File: `apps/web/src/lib/api.ts` (final version — base URL from env)
  - Verify: `npm run build --prefix apps/web`
  - Commit: `fix(web): wire final SSE stream + API endpoints`
  - Logic:
    - API base URL: `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'`
    - SSE: reconnect strategy with exponential backoff (1s, 2s, 4s, max 30s)
    - On session load: `GET /sessions/:id/metrics` to hydrate initial state
    - Auth header: `Authorization: Bearer <token>` (stub for Phase 1, always pass)

- [ ] Task 5 — Create complete e-commerce scenario YAML
  - File: `scenarios/sprint-planning-capacity.yaml` (modify — make it a full 3-sprint scenario)
  - Test: Verify with `packages/shared/src/utils/scenario-parser.ts`
  - Verify: `npm test -- --grep "scenario-parser" --prefix packages/shared`
  - Commit: `feat(scenario): add complete e-commerce scenario — 3 sprints, ~15 decision nodes`
  - Logic: Design 3 sprints with ~5 decision nodes each:
    - **Sprint 1** (Foundation): Q4 planning, capacity allocation, sprint goal negotiation
    - **Sprint 2** (Growth): Feature prioritization under deadline pressure, stakeholder conflict
    - **Sprint 3** (Edge cases)**: Scope creep, tech debt tradeoff, release timing
  - Each decision node: `prompt`, 3-4 options (at least 1 optimal, 1 suboptimal, 1 risky), `sideEffects`, `scoreModifiers`
  - Include all 4 scoring dimensions: Prioritization, Communication, Analytics, Stakeholder Management
  - Edge: invalid YAML → Zod throws `ValidationError` → must fix before proceeding

### Wave 4 (E2E test + exit criteria verification)

- [ ] Task 6 — End-to-end integration test
  - File: `apps/orchestrator/src/__tests__/e2e.test.ts` (new)
  - File: `test-orchestrator.sh` (modify existing)
  - Verify: `npm test -- --grep "e2e" --prefix apps/orchestrator`
  - Commit: `test: add e2e integration test — full decision flow`
  - Logic: Test full flow WITHOUT launching real browsers:
    1. Create session → `POST /sessions` with scenarioId
    2. Submit decision → `POST /sessions/:id/decision`
    3. Wait for SSE event `decision_prompt` for next node (poll 10x with 500ms delay)
    4. Verify metrics updated → `GET /sessions/:id/metrics`
    5. Verify agent_jobs recorded in DB
    6. Repeat for 3 decisions
    7. Complete scenario → verify `session_complete` SSE event
  - Mock mode: Agents return mock output (no real API calls)
  - Edge: SSE timeout (30s) → fail test with timeout message

- [ ] Task 7 — Verify exit criteria
  - Run full scenario test (3 sprints, ~5 decisions each = ~15 total)
  - Verify: BA agent outputs appear in ChatThread
  - Verify: Stakeholder feedback appears in ChatThread
  - Verify: Metrics update after each decision
  - Verify: Final score + XP displayed on completion
  - Verify: Session persists across orchestrator restart (checkpoint works)
  - Write results to `TEST-RESULTS.md`

---

## Failure Scenarios

| When | Then | Behavior |
|------|------|---------|
| Worker Redis disconnected | BullMQ jobs queue in memory, process on reconnect | No data loss |
| Orchestrator restart mid-session | CheckpointService resumes XState actors | Session continues |
| Agent circuit breaker open | `AgentPausedError` → SSE `error` event | Dashboard shows agent paused banner |
| Scenario YAML has invalid node | Zod validation fails on seed → logged, skipped | Scenario not loaded |
| SSE client disconnects mid-session | Web reconnects automatically (Wave 4 logic) | Brief gap, session continues |
| Database down | CheckpointService fails → log + retry 3x → error state | Session not persisted |
| All BullMQ workers down | Jobs queue in Redis, workers process on restart | No data loss |

---

## Rejection Criteria (DO NOT)

- ❌ DO NOT call real Anthropic API in tests — always mock (use `MOCK_LLM=true` env var)
- ❌ DO NOT hardcode scenario ID in frontend — always load from API response
- ❌ DO NOT skip seeding scenarios on startup — orchestrator MUST call `ScenarioLoader.seedFromYaml()`
- ❌ DO NOT skip checkpoint on `completed` state — final score must be saved to `scenario_completions`
- ❌ DO NOT expose BullMQ job IDs in SSE events to web clients — internal only
- ❌ DO NOT skip health check endpoint — needed for Wave-based orchestration

---

## Cross-Phase Context

- **Assumes Phase 1A**: EventBus, AgentRegistry, AgentDispatcher, StakeholderAgent all implemented ✅
- **Assumes Phase 1B**: ScenarioLoader, DecisionEngine, CheckpointService, SSE endpoints all implemented ✅
- **Assumes Phase 1C**: DashboardLayout, ChatThread, MetricsPanel, DecisionPrompt all implemented ✅
- **Exports**: Running production-ready system with 1 complete scenario playable start-to-finish

---

## Acceptance Criteria

- [ ] `npm run build` passes in all apps (`turbo run build`)
- [ ] `npm run lint` passes in all apps (`turbo run lint`)
- [ ] `docker-compose up` → PostgreSQL + Redis start successfully
- [ ] `apps/orchestrator` starts → seeds scenarios from YAML → ready to accept requests
- [ ] `apps/workers` starts → registers agents → ready to process jobs
- [ ] `apps/web` builds → loads at `/` → connects to SSE stream
- [ ] E2E test: create session → 15 decisions → completion → score shown
- [ ] All agent jobs recorded in `agent_jobs` table
- [ ] All decisions recorded in `decisions` table
- [ ] Session checkpoint persists across restart
- [ ] No `any` types anywhere, no hardcoded credentials

---

## Files Touched
- `apps/workers/src/index.ts` — modify
- `apps/workers/src/__tests__/index.test.ts` — new
- `apps/orchestrator/src/index.ts` — modify
- `apps/orchestrator/src/__tests__/index.test.ts` — new
- `apps/orchestrator/src/routes/index.ts` — modify (already in Phase 1B)
- `apps/orchestrator/src/routes/__tests__/index.test.ts` — new
- `apps/orchestrator/src/__tests__/e2e.test.ts` — new
- `apps/web/src/hooks/use-session-sync.ts` — modify
- `apps/web/src/lib/api.ts` — modify
- `scenarios/sprint-planning-capacity.yaml` — modify (full scenario)
- `TEST-RESULTS.md` — new (exit criteria report)