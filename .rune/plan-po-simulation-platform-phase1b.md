# Phase 1B: Orchestrator Integration

## Goal
Tích hợp EventBus, AgentDispatcher, ScoringEngine vào XState flow. Hoàn thiện DecisionEngine, CheckpointService, ScenarioLoader. Wire SSE endpoint. XState state machine trở thành "đầu não" điều phối mọi thứ.

---

## Data Flow

```
PO submits POST /sessions/:id/decision
    │
    │ Hono route → SessionManager
    ▼
XState: waitingForDecision → processingDecision
    │
    ├── DecisionEngine.scoreDecision()  ← real-time scoring
    │       │
    │       └── EventBus.publish(session:{id}:metrics, updatedMetrics)
    │
    └── AgentDispatcher.dispatchSequential('ba', job)  ← BA job
            │ (BullMQ)
            ▼
        BAAgent completes → EventBus.publish(agent:job:complete)
            │
            ▼
        AgentDispatcher → dispatchSequential('stakeholder', job)  ← Stakeholder job
            │
            ▼
        StakeholderAgent completes → EventBus.publish(session:{id}:events, {type, output})
            │
            ▼
XState: waitingForAgents → waitingForDecision (next node)
    │
    ├── CheckpointService.save(stateSnapshot)  ← PostgreSQL JSONB
    └── SSE broadcaster → connected web clients
```

---

## Code Contracts

```typescript
// apps/orchestrator/src/services/decision-engine.ts (NEW)
interface DecisionEngine {
  // Called inside XState processingDecision state
  processDecision(
    context: SessionContext,
    optionId: string,
    timeTaken: number
  ): Promise<{
    nextNodeId: string | null;
    updatedMetrics: ProductMetrics;
    sprintScore: SprintScore;
  }>;
}

// apps/orchestrator/src/services/checkpoint-service.ts (NEW)
interface CheckpointService {
  save(sessionId: string, snapshot: unknown): Promise<void>;
  load(sessionId: string): Promise<unknown | null>;
  listActive(): Promise<Session[]>;
}

// apps/orchestrator/src/services/scenario-loader.ts (NEW)
interface ScenarioLoader {
  load(scenarioId: string): Promise<ScenarioValidated>;
  seedFromYaml(): Promise<void>;  // called on startup
  getFromCache(scenarioId: string): ScenarioValidated | null;
}

// apps/orchestrator/src/routes/index.ts (MODIFY — add SSE)
interface SSEEndpoint {
  GET /sessions/:id/stream → SSE stream (text/event-stream)
  // Events: session:events, session:metrics
}
```

**XState session.machine.ts modifications** (fill TODOs):
- `loadScenarioActor` → call `ScenarioLoader.load()`
- `processDecisionActor` → call `DecisionEngine.processDecision()` + `AgentDispatcher.dispatchSequential()`
- `waitForAgentsActor` → subscribe to `EventBus` on `agent:job:complete`, resolve when all done
- After every transition → `CheckpointService.save()`

**SSE Events emitted:**
```typescript
type SSEEvent =
  | { type: 'decision_prompt'; node: DecisionNodeValidated }
  | { type: 'metrics_update'; metrics: ProductMetrics }
  | { type: 'agent_message'; agent: AgentRole; content: string }
  | { type: 'error'; error: string }
  | { type: 'session_complete'; score: SessionScore }
  | { type: 'sprint_complete'; sprint: number; score: SprintScore };
```

---

## Tasks

### Wave 1 (types and utilities — no dependencies)

- [ ] Task 1 — SSE constants + types
  - File: `apps/orchestrator/src/services/sse/types.ts` (new)
  - Test: `apps/orchestrator/src/services/sse/__tests__/types.test.ts` (new)
  - Verify: `npm test -- --grep "SSEEvent" --prefix apps/orchestrator`
  - Commit: `feat(orchestrator): add SSE event types`
  - Logic: define all SSEEvent union types, helper `createSSEvent(type, data)`
  - No dependencies — pure types

- [ ] Task 2 — ScenarioLoader service
  - File: `apps/orchestrator/src/services/scenario-loader.ts` (new)
  - Test: `apps/orchestrator/src/services/__tests__/scenario-loader.test.ts` (new)
  - Verify: `npm test -- --grep "ScenarioLoader" --prefix apps/orchestrator`
  - Commit: `feat(orchestrator): add ScenarioLoader — YAML → DB → in-memory cache`
  - Logic:
    1. `seedFromYaml()`: read `scenarios/*.yaml`, Zod validate, upsert to PostgreSQL
    2. `load()`: check cache first (Map), else load from DB, validate, cache
    3. Uses existing `parseScenarioFromYaml()` from `packages/shared/src/utils/scenario-parser.ts`
  - Edge: scenario not found → throw `NotFoundError`, YAML parse fails → throw `ValidationError`

### Wave 2 (core services — depends on Phase 1A)

- [ ] Task 3 — CheckpointService
  - File: `apps/orchestrator/src/services/checkpoint-service.ts` (new)
  - Test: `apps/orchestrator/src/services/__tests__/checkpoint-service.test.ts` (new)
  - Verify: `npm test -- --grep "CheckpointService" --prefix apps/orchestrator`
  - Commit: `feat(orchestrator): add CheckpointService — XState snapshot → PostgreSQL`
  - Logic:
    1. `save()`: serialize XState snapshot → `sessions.state_snapshot` (JSONB) + update `updated_at`
    2. `load()`: deserialize `state_snapshot` → XState state (or null if none)
    3. `listActive()`: query sessions where status = 'active'
  - Edge: DB write fails → retry 3x with exponential backoff, then throw
  - Import from `packages/db/src/schema.ts` (already exists ✅)

- [ ] Task 4 — DecisionEngine
  - File: `apps/orchestrator/src/services/decision-engine.ts` (new)
  - Test: `apps/orchestrator/src/services/__tests__/decision-engine.test.ts` (new)
  - Verify: `npm test -- --grep "DecisionEngine" --prefix apps/orchestrator`
  - Commit: `feat(orchestrator): add DecisionEngine — score decision, update metrics, route next node`
  - Logic:
    1. Find chosen option from `currentNode.options[optionId]`
    2. Apply `scoreModifiers` from option → `ScoringEngine.computeSprintScore()`
    3. Apply `sideEffects` from option → update `currentMetrics`
    4. Route to `nextNodeId` from option (or null if scenario end)
    5. Return `{nextNodeId, updatedMetrics, sprintScore}`
  - Uses: `ScoringEngine` from `packages/shared/src/scoring/engine.ts` (already exists ✅)
  - Edge: option not found → throw `ValidationError`

### Wave 3 (XState wiring — depends on Wave 2 + Phase 1A)

- [ ] Task 5 — Wire XState session.machine.ts (fill TODOs)
  - File: `apps/orchestrator/src/state-machine/session.machine.ts` (modify)
  - Test: `apps/orchestrator/src/state-machine/__tests__/session-machine.test.ts` (new)
  - Verify: `npm test -- --grep "sessionMachine" --prefix apps/orchestrator && tsc --noEmit --prefix apps/orchestrator`
  - Commit: `feat(orchestrator): wire XState → DecisionEngine → AgentDispatcher → CheckpointService`
  - Logic (fill these TODOs in `session.machine.ts`):
    - `loadScenarioActor`: call `ScenarioLoader.load(scenarioId)`, set `scenario` and `currentNodeId` in context
    - `processDecisionActor`: call `DecisionEngine.processDecision(context, optionId, timeTaken)`, update context
    - `waitForAgentsActor`: subscribe to EventBus `agent:job:complete`, resolve when BA + Stakeholder done
    - `setScenario` action: set `scenario` and `currentNodeId = scenario.decision_tree.id`
    - `moveToNextNode` action: after processDecisionActor resolves, update `currentNodeId`, `currentMetrics`, `currentSprint`
    - After EVERY `assign()`: call `CheckpointService.save(sessionId, updatedSnapshot)`
  - Edge: Actor throws → XState transitions to `error` state

- [ ] Task 6 — SSE endpoint + SSE broadcaster
  - File: `apps/orchestrator/src/services/sse/sse-broadcaster.ts` (new)
  - File: `apps/orchestrator/src/routes/index.ts` (modify — add SSE route)
  - Test: `apps/orchestrator/src/services/sse/__tests__/sse-broadcaster.test.ts` (new)
  - Verify: `npm test -- --grep "SSEBroadcaster" --prefix apps/orchestrator`
  - Commit: `feat(orchestrator): add SSE endpoint — stream session events to web clients`
  - Logic:
    - `SSEBroadcaster`: singleton class, Map<sessionId, Set<ReadableStreamController>>, `broadcast(sessionId, event)`
    - SSE route: `GET /sessions/:id/stream` returns `Response` with `Content-Type: text/event-stream`
    - SessionManager calls `SSEBroadcaster.broadcast()` after every XState transition
  - Edge: client disconnects → remove from Set (memory cleanup)

### Wave 4 (session manager wiring — depends on all above)

- [ ] Task 7 — SessionManager wiring
  - File: `apps/orchestrator/src/services/session-manager.ts` (modify existing)
  - Test: `apps/orchestrator/src/services/__tests__/session-manager.test.ts` (modify existing)
  - Verify: `npm test -- --grep "SessionManager" --prefix apps/orchestrator`
  - Commit: `feat(orchestrator): wire SessionManager → XState actors + SSE broadcaster`
  - Logic:
    1. On `createSession()`: load scenario via ScenarioLoader, create XState actor, save initial checkpoint
    2. On `submitDecision()`: send `MAKE_DECISION` event to XState actor
    3. After every XState transition: broadcast via SSEBroadcaster
    4. On startup: `CheckpointService.listActive()` → resume actors from snapshots
  - Uses: all Wave 1-3 services

---

## Failure Scenarios

| When | Then | Error |
|------|------|-------|
| Scenario not in DB | `ScenarioLoader.load()` throws `NotFoundError` | → XState `error` state |
| DB write fails on checkpoint | retry 3x → throw `CheckpointError` | → log + retry, don't block transition |
| DecisionEngine option not found | throw `ValidationError` | → XState `error` state |
| SSE client disconnects | remove from broadcaster Set | No error (normal) |
| Redis EventBus disconnect | self-heal with in-memory buffer (Phase 1A behavior) | No error |
| XState actor crash | restart actor from checkpoint | Brief interruption, session continues |

---

## Rejection Criteria (DO NOT)

- ❌ DO NOT call `ScoringEngine.computeScore()` (session-end) inside `DecisionEngine` — use `computeSprintScore()` only (real-time)
- ❌ DO NOT subscribe to EventBus inside XState actors directly — use a wrapper service that subscribes and sends XState events
- ❌ DO NOT skip checkpoint after any transition — every transition MUST be persisted
- ❌ DO NOT broadcast SSE without serializing the event — always use `createSSEvent()`
- ❌ DO NOT import `session-manager.ts` inside `session.machine.ts` — that creates circular dependency
- ❌ DO NOT hardcode scenario IDs in DecisionEngine — always read from XState context

---

## Cross-Phase Context

- **Assumes Phase 1A**: `EventBus`, `AgentDispatcher` already implemented and importable
- **Assumes Phase 1A**: `ScoringEngine` from `packages/shared/src/scoring/engine.ts` already exists ✅
- **Assumes Phase 1A**: `StakeholderAgent` and `BAAgent` registered in `AgentRegistry`
- **Exports for Phase 1C**: SSE endpoint at `GET /sessions/:id/stream`, EventBus channels
- **Exports for Phase 1D**: SessionManager fully wired, ready for integration test

---

## Acceptance Criteria

- [ ] `npm run lint` passes
- [ ] `tsc --noEmit` passes in `apps/orchestrator`
- [ ] `ScenarioLoader.seedFromYaml()` loads `scenarios/*.yaml` into PostgreSQL
- [ ] `CheckpointService.save()` + `CheckpointService.load()` round-trip correctly
- [ ] `DecisionEngine.processDecision()` returns correct `nextNodeId`, updated metrics, sprint score
- [ ] XState session machine: `idle → loadingScenario → waitingForDecision` flow works end-to-end
- [ ] XState session machine: `waitingForDecision → processingDecision → waitingForAgents` flow works
- [ ] SSE endpoint returns valid SSE stream with correct event format
- [ ] Checkpoint saved after every XState transition
- [ ] All tests pass

---

## Files Touched
- `apps/orchestrator/src/services/sse/types.ts` — new
- `apps/orchestrator/src/services/sse/__tests__/types.test.ts` — new
- `apps/orchestrator/src/services/scenario-loader.ts` — new
- `apps/orchestrator/src/services/__tests__/scenario-loader.test.ts` — new
- `apps/orchestrator/src/services/checkpoint-service.ts` — new
- `apps/orchestrator/src/services/__tests__/checkpoint-service.test.ts` — new
- `apps/orchestrator/src/services/decision-engine.ts` — new
- `apps/orchestrator/src/services/__tests__/decision-engine.test.ts` — new
- `apps/orchestrator/src/state-machine/session.machine.ts` — modify
- `apps/orchestrator/src/state-machine/__tests__/session-machine.test.ts` — new
- `apps/orchestrator/src/services/sse/sse-broadcaster.ts` — new
- `apps/orchestrator/src/services/sse/__tests__/sse-broadcaster.test.ts` — new
- `apps/orchestrator/src/routes/index.ts` — modify
- `apps/orchestrator/src/services/session-manager.ts` — modify