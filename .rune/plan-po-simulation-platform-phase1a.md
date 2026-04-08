# Phase 1A: Core Infrastructure

## Goal
Xây dựng các service nền tảng: EventBus (Redis Pub/Sub), AgentRegistry (plugin pattern), StakeholderAgent (implementation), CircuitBreaker, AgentDispatcher (sequential BullMQ dispatch). Không có dependency vào orchestrator hay web.

---

## Data Flow

```
AgentDispatcher.add('ba', jobInput)
    │
    │ BullMQ: agent:ba queue
    ▼
┌──────────────┐     ┌──────────────┐
│ BAAgent      │────►│ Zod validate │
│ (existing)   │     │ output       │
└──────┬───────┘     └──────────────┘
       │ BullMQ: agent:stakeholder queue
       ▼
┌──────────────────┐     ┌──────────────────┐
│ StakeholderAgent │────►│ Zod validate     │
│ (new)           │     │ output           │
└──────┬───────────┘     └──────────────────┘
       │ Redis Pub/Sub: session:{id}:events
       ▼
┌──────────────┐
│ SSE Broadcaster│ (Phase 1B — exported interface)
└──────────────┘
```

---

## Code Contracts

```typescript
// apps/orchestrator/src/services/event-bus.ts (NEW)
interface EventBus {
  publish(channel: string, payload: unknown): Promise<void>;
  subscribe(channel: string, handler: (payload: unknown) => void): Promise<() => void>;
}

// apps/workers/src/agent-registry.ts (NEW)
interface AgentContract<I, O> {
  run(input: I): Promise<O>;
  validateOutput(output: unknown): O;  // throws ZodError
  timeoutMs: number;
  maxRetries: number;
}

interface AgentRegistry {
  register(role: AgentRole, agent: AgentContract<unknown, unknown>): void;
  get(role: AgentRole): AgentContract<unknown, unknown>;
  list(): AgentRole[];
}

// apps/workers/src/agents/stakeholder-agent.ts (IMPLEMENT)
interface StakeholderAgent {
  run(input: StakeholderInput): Promise<StakeholderOutput>;
}

// apps/workers/src/circuit-breaker.ts (NEW)
interface CircuitBreaker {
  recordSuccess(): void;
  recordFailure(): void;
  isOpen(): boolean;  // true = pause agent
  reset(): void;
}

// apps/orchestrator/src/services/agent-dispatcher.ts (NEW)
interface AgentDispatcher {
  dispatchSequential(sessionId: string, jobs: Array<{agentRole: AgentRole; input: unknown}>): Promise<Record<AgentRole, unknown>>;
}
```

**Redis channels:**
- `session:{sessionId}:events` — Event payload: `{type: 'agent_complete' | 'metrics_update', data: unknown}`
- `session:{sessionId}:metrics` — Metrics payload: `ProductMetrics`
- `agent:job:complete` — Job complete payload: `{jobId: string, output: unknown, error?: string}`

**BullMQ queues:**
- `agent:ba` — BAAgent jobs
- `agent:stakeholder` — StakeholderAgent jobs

---

## Tasks

### Wave 1 (parallel — no dependencies)

- [ ] Task 1 — EventBus service (Redis Pub/Sub wrapper)
  - File: `apps/orchestrator/src/services/event-bus.ts` (new)
  - Test: `apps/orchestrator/src/services/__tests__/event-bus.test.ts` (new)
  - Verify: `npm test -- --grep "EventBus" --prefix apps/orchestrator`
  - Commit: `feat(infra): add EventBus with Redis Pub/Sub publish/subscribe`
  - Logic: wrap ioredis pub/sub, auto-reconnect on disconnect, typed channels
  - Edge: Redis disconnected → queue messages, flush on reconnect

- [ ] Task 2 — StakeholderAgent implementation
  - File: `apps/workers/src/agents/stakeholder-agent.ts` (modify existing stub)
  - Test: `apps/workers/src/agents/__tests__/stakeholder-agent.test.ts` (new)
  - Verify: `npm test -- --grep "StakeholderAgent" --prefix apps/workers`
  - Commit: `feat(agent): implement StakeholderAgent with mock + Anthropic Haiku`
  - Logic: mock mode when no API key, real mode with Haiku 4.5, output validated with Zod
  - Edge: format validation failure → retry 2x with format instructions → circuit breaker

- [ ] Task 3 — CircuitBreaker
  - File: `apps/workers/src/circuit-breaker.ts` (new)
  - Test: `apps/workers/src/__tests__/circuit-breaker.test.ts` (new)
  - Verify: `npm test -- --grep "CircuitBreaker" --prefix apps/workers`
  - Commit: `feat(infra): add CircuitBreaker — 5 failures → pause agent`
  - Logic: sliding window (5 attempts), increment on failure, reset on success, threshold = 5
  - Edge: already open → don't count, just reject immediately

### Wave 2 (depends on Wave 1)

- [ ] Task 4 — AgentRegistry (plugin pattern)
  - File: `apps/workers/src/agent-registry.ts` (new)
  - Test: `apps/workers/src/__tests__/agent-registry.test.ts` (new)
  - Verify: `npm test -- --grep "AgentRegistry" --prefix apps/workers`
  - Commit: `feat(infra): add AgentRegistry with plugin registration pattern`
  - Logic: Map<AgentRole, AgentContract>, register(), get(), list(), assert all required agents registered
  - Edge: duplicate register → throw ConflictError, missing required agent → throw NotFoundError
  - requires: [Task 1, Task 2, Task 3]

- [ ] Task 5 — AgentDispatcher (sequential BullMQ dispatch)
  - File: `apps/orchestrator/src/services/agent-dispatcher.ts` (new)
  - Test: `apps/orchestrator/src/services/__tests__/agent-dispatcher.test.ts` (new)
  - Verify: `npm test -- --grep "AgentDispatcher" --prefix apps/orchestrator`
  - Commit: `feat(orchestrator): add AgentDispatcher — sequential BA → Stakeholder`
  - Logic: takes array of `{agentRole, input}`, dispatches sequentially (not parallel) to BullMQ queues, waits for completion events via EventBus, returns `{ba: output, stakeholder: output}`
  - Uses BullMQ `add()` with retry: `{attempts: 3, backoff: {type: 'exponential', delay: 1000}}`
  - Edge: job failed after 3 retries → throw JobFailedError with agent role and error message
  - requires: [Task 1, Task 4]

---

## Failure Scenarios

| When | Then | Error |
|------|------|-------|
| Redis disconnected | Buffer publishes in memory, flush on reconnect | No error (self-heal) |
| Agent output Zod validation fails | Retry 2x with format instructions, then circuit breaker | CircuitBreaker open |
| Circuit breaker open | Reject all new jobs for that agent immediately | `AgentPausedError` |
| BullMQ job fails after 3 retries | throw `JobFailedError`, orchestrator catches and routes to error state | `JobFailedError` |
| Duplicate agent register | throw `ConflictError('Agent {role} already registered')` | `ConflictError` |
| StakeholderAgent no API key | Return mock output (same pattern as BAAgent mock mode) | No error |

---

## Rejection Criteria (DO NOT)

- ❌ DO NOT use `any` type — full TypeScript strict mode
- ❌ DO NOT call agents in parallel in AgentDispatcher — must be SEQUENTIAL (BA first, then Stakeholder)
- ❌ DO NOT hardcode queue names — use constants from `packages/shared/src/constants.ts` (create if not exists)
- ❌ DO NOT skip Zod validation on agent output — even mock mode output must be valid
- ❌ DO NOT import EventBus in workers — EventBus is orchestrator-side only; workers publish via BullMQ events only

---

## Cross-Phase Context

- **Assumes**: `packages/shared/src/types/agents.ts` — StakeholderInput, StakeholderOutput types already exist ✅
- **Assumes**: `packages/shared/src/schemas/agent-output.schema.ts` — Zod schemas already exist ✅
- **Exports for Phase 1B**: `AgentDispatcher`, `EventBus` interfaces; BullMQ queue names as constants
- **Exports for Phase 1D**: AgentRegistry used in `apps/workers/src/index.ts` to register agents on startup

---

## Acceptance Criteria

- [ ] `npm run lint` passes (no new lint errors)
- [ ] `tsc --noEmit` passes in both `apps/orchestrator` and `apps/workers`
- [ ] `EventBus.publish()` + `EventBus.subscribe()` work with ioredis
- [ ] `StakeholderAgent.run()` returns valid `StakeholderOutput` (mock mode + real mode)
- [ ] `CircuitBreaker.isOpen()` returns true after 5 consecutive failures
- [ ] `AgentRegistry.register()` + `AgentRegistry.get()` work correctly
- [ ] `AgentDispatcher.dispatchSequential()` dispatches BA → Stakeholder sequentially and returns both outputs
- [ ] All tests pass in `apps/workers` and `apps/orchestrator`
- [ ] No `any` types, no sequential parallel calls

---

## Files Touched
- `apps/orchestrator/src/services/event-bus.ts` — new
- `apps/orchestrator/src/services/__tests__/event-bus.test.ts` — new
- `apps/workers/src/agents/stakeholder-agent.ts` — modify (existing stub)
- `apps/workers/src/agents/__tests__/stakeholder-agent.test.ts` — new
- `apps/workers/src/circuit-breaker.ts` — new
- `apps/workers/src/__tests__/circuit-breaker.test.ts` — new
- `apps/workers/src/agent-registry.ts` — new
- `apps/workers/src/__tests__/agent-registry.test.ts` — new
- `apps/orchestrator/src/services/agent-dispatcher.ts` — new
- `apps/orchestrator/src/services/__tests__/agent-dispatcher.test.ts` — new