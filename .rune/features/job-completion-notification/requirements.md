# Requirements Document: Job Completion Notification

Created: 2026-04-08 | BA Session: BullMQ integration for orchestrator-worker communication

## Context

The PO Simulation Platform dispatches AI agent jobs from Orchestrator to Workers via BullMQ. Currently, when a BA Agent completes processing, the orchestrator has no visibility — sessions get stuck in `waitingForAgents` state. This integration enables the orchestrator to receive completion notifications, persist results, and advance the session state machine.

## Stakeholders

- **Primary system**: Orchestrator service (`apps/orchestrator`)
- **Secondary system**: Worker service (`apps/workers`)
- **Affected components**: 
  - XState session machine (`session.machine.ts`)
  - Database: `agent_jobs` table
  - Redis: BullMQ event stream

## User Stories

### US-1: Job Completion Notification

As the Orchestrator, I want to receive notification when BA Agent completes a job so that I can update session state and persist results.

**AC-1.1**: GIVEN a BA job is dispatched  
WHEN the worker completes processing successfully  
THEN orchestrator receives 'completed' event within 100ms of job completion

**AC-1.2**: GIVEN a 'completed' event is received  
WHEN processing the event  
THEN agent_jobs.output is updated with validated BA output  
AND agent_jobs.status is set to 'completed'  
AND agent_jobs.completed_at is set to current timestamp

**AC-1.3**: GIVEN a 'completed' event is received  
WHEN the BA output fails Zod validation  
THEN agent_jobs.status is set to 'failed'  
AND agent_jobs.error_message contains validation error details  
AND XState receives ERROR event (not AGENT_COMPLETE)

**AC-1.4**: GIVEN a 'completed' event is received with valid output  
WHEN session state machine is in 'waitingForAgents'  
THEN XState AGENT_COMPLETE event is dispatched  
AND session transitions to 'waitingForDecision'

### US-2: Job Failure Handling

As the Orchestrator, I want to handle BA Agent job failures so that the system doesn't get stuck.

**AC-2.1**: GIVEN a BA job is dispatched  
WHEN the worker fails after all retries  
THEN orchestrator receives 'failed' event

**AC-2.2**: GIVEN a 'failed' event is received  
WHEN processing the event  
THEN agent_jobs.status is set to 'failed'  
AND agent_jobs.error_message contains failure reason  
AND XState receives ERROR event

## Scope

### In Scope

- BullMQ `QueueEvents` listener in orchestrator for BA Agent queue
- Job completion handler: validate output → update DB → trigger XState
- Job failure handler: update DB with error → trigger XState ERROR
- Correlation: BullMQ `job.id` → `agent_jobs` record lookup via `bullmq_job_id` column
- Zod validation of BA output before persistence

### Out of Scope

- Designer/Dev/Customer agent queues (Phase 2 — separate task)
- Frontend real-time notification via WebSocket (separate layer)
- Job retry logic customization (already configured in BullMQ)
- Orphaned job recovery on orchestrator restart (future hardening task)
- Distributed orchestrator instances (single instance assumed for MVP)

### Assumptions

- Orchestrator runs as single instance (no distributed event coordination needed)
- BullMQ job ID is stored in `agent_jobs.bullmq_job_id` column (confirmed in code)
- Worker returns BA output directly from job processor function
- `BAOutputSchema` exists in `@po-sim/shared` for Zod validation

### Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| `bullmq` package | ✅ Installed | Already in use |
| `ioredis` connection | ✅ Configured | `REDIS_URL` env var |
| `@po-sim/shared` schemas | ⚠️ Verify | Need `BAOutputSchema` |
| `@po-sim/db` functions | ⚠️ Extend | Need `getAgentJobByBullmqId`, `updateAgentJobStatus` |

## Non-Functional Requirements

| NFR | Requirement | Measurement |
|-----|-------------|-------------|
| Latency | Event processing < 100ms from job completion | Timestamp logging |
| Reliability | No lost completion events under normal operation | BullMQ guarantees |
| Observability | All state transitions logged with job ID + session ID | Structured console logs |

## Technical Approach

**Selected: BullMQ QueueEvents Listener** (9/10 completeness)

Rationale:
1. Built into BullMQ — no additional infrastructure
2. Handles both `completed` and `failed` events
3. Job `returnvalue` contains BA output directly
4. Same Redis connection pool
5. Production-proven pattern

### Architecture Flow

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────────┐
│   Orchestrator  │         │    Redis     │         │     Worker      │
│                 │         │   (BullMQ)   │         │                 │
│ ┌─────────────┐ │         │              │         │ ┌─────────────┐ │
│ │ QueueEvents │◄├─────────┤  'completed' ├─────────┤►│  BA Agent   │ │
│ │  Listener   │ │         │    event     │         │ │  Processor  │ │
│ └──────┬──────┘ │         │              │         │ └─────────────┘ │
│        │        │         └──────────────┘         │                 │
│        ▼        │                                  └─────────────────┘
│ ┌─────────────┐ │
│ │   Handler   │ │
│ │ 1. Validate │ │
│ │ 2. Update DB│ │
│ │ 3. XState   │ │
│ └─────────────┘ │
└─────────────────┘
```

### Implementation Components

1. **`JobCompletionService`** (new file)
   - Creates `QueueEvents` instance for 'ba-agent' queue
   - Registers 'completed' and 'failed' event handlers
   - Coordinates DB updates and XState events

2. **Database Functions** (extend `@po-sim/db`)
   - `getAgentJobByBullmqId(bullmqJobId: string)` — lookup by BullMQ job ID
   - `updateAgentJobStatus(jobId, status, output?, errorMessage?)` — atomic status update

3. **Session Actor Registry** (extend orchestrator)
   - Map of `sessionId → XState actor` for dispatching events
   - Cleanup on session complete/timeout

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| QueueEvents connection failure | Low | High | ioredis auto-reconnect; health check endpoint |
| Missing `bullmq_job_id` in lookup | Low | Medium | Fallback: query by session + role + status |
| XState actor not found | Medium | Medium | Log warning, mark job complete anyway (recoverable) |
| Validation schema mismatch | Low | High | Version BA output schema; log raw output on failure |

## Decision Classification

| Category | Item |
|----------|------|
| **Decisions** (locked) | Use BullMQ QueueEvents (not polling, not webhook) |
| **Decisions** (locked) | Validate BA output with Zod before persisting |
| **Decisions** (locked) | Update DB before triggering XState event |
| **Discretion** (agent decides) | Internal service structure and naming |
| **Discretion** (agent decides) | Logging format and verbosity |
| **Deferred** (out of scope) | Multi-agent coordination (future task) |
| **Deferred** (out of scope) | Distributed orchestrator support |

## Files to Modify/Create

| File | Action | Purpose |
|------|--------|---------|
| `apps/orchestrator/src/services/job-completion.service.ts` | Create | QueueEvents listener + handlers |
| `apps/orchestrator/src/services/orchestrator.service.ts` | Modify | Initialize job completion service |
| `apps/orchestrator/src/state-machine/session.machine.ts` | Modify | Enhance AGENT_COMPLETE handling |
| `packages/db/src/index.ts` | Modify | Add `getAgentJobByBullmqId`, `updateAgentJobStatus` |
| `packages/db/src/schema.ts` | Verify | Confirm `bullmq_job_id` column exists |
| `packages/shared/src/schemas/agent-output.schema.ts` | Verify | Confirm `BAOutputSchema` exists |

## Next Step

→ Hand off to design phase for sequence diagram, then to `rune:cook` for implementation
