# Design: Job Completion Notification Flow

## Sequence Diagram

```
PO User             Orchestrator API        XState Machine        JobCompletionService      Redis (BullMQ)         BA Worker
   │                       │                      │                        │                       │                     │
   │──POST /decisions─────►│                      │                        │                       │                     │
   │                       │──processDecision()───│                        │                       │                     │
   │                       │                      │                        │                       │                     │
   │                       │                      │──baQueue.add()───────►│                       │                     │
   │                       │                      │                        │                       │──job dispatched────►│
   │                       │                      │                        │                       │                     │
   │                       │                      │                        │◄──'completed' event────│                     │
   │                       │                      │                        │  {jobId, returnvalue}  │                     │
   │                       │                      │                        │                       │                     │
   │                       │                      │                        │──db.getAgentJobByBullmqId()                  │
   │                       │                      │                        │◄───────────────agentJob record              │
   │                       │                      │                        │                       │                     │
   │                       │                      │                        │──validate BA output (Zod)                     │
   │                       │                      │                        │                       │                     │
   │                       │                      │                        │──db.updateAgentJobStatus('completed')         │
   │                       │                      │                        │                       │                     │
   │                       │                      │◄──AGENT_COMPLETE───────│                        │                     │
   │                       │                      │    {output, role}      │                       │                     │
   │                       │                      │                        │                       │                     │
   │                       │                      │──storeAgentResult()   │◄─────────────────────────────────────────────│
   │                       │                      │◄──waitingForDecision──│                       │                     │
   │◄──200 {jobId, state}──│                      │                        │                       │                     │
```

## Error Flow

```
BA Worker ──throws Error──► Redis (BullMQ) ──'failed' {jobId, failedReason}──► JobCompletionService
                                                                                            │
                                                                           db.updateAgentJobStatus('failed')
                                                                                            │
                                                                                      XState ERROR event
                                                                                            ▼
                                                                                   error state (user notified)
```

## Key Design Decisions

1. **QueueEvents vs polling**: QueueEvents provides real-time notification via Redis streams.
   BullMQ guarantees delivery as long as the listener is active. (9/10 completeness)

2. **Correlation via bullmq_job_id**: The `agent_jobs` table now has a `bullmq_job_id` column
   to map BullMQ job IDs to database records. This avoids ambiguity when multiple sessions have
   pending jobs.

3. **Validation before persistence**: BA output is validated against the Zod returnvalue. On
   validation failure, the job is marked as 'failed' with the validation error message.

4. **Handler registry**: `JobCompletionService.registerHandler(sessionId, actorRef)` maps
   each active session to its XState actor. Unregistered on session end.

5. **DB update before XState dispatch**: The database is updated first so that if the XState
   dispatch fails, the job result is persisted and can be recovered.

## Files Changed

| File | Change |
|------|--------|
| `packages/db/src/schema.ts` | Added `bullmq_job_id` column to agent_jobs |
| `packages/db/src/index.ts` | Added `getAgentJobByBullmqId()`, `updateAgentJobStatus()` |
| `apps/orchestrator/src/services/job-completion.service.ts` | **CREATE** QueueEvents listener |
| `apps/orchestrator/src/services/orchestrator.service.ts` | Initialize JobCompletionService, register handler on session create |
| `apps/orchestrator/src/state-machine/session.machine.ts` | Add `storeAgentResult` action, update context with `agentResults` |
| `apps/orchestrator/src/routes/index.ts` | Register session handler on create, unregister on delete |
