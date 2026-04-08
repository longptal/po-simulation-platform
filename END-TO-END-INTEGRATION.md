# End-to-End Integration Complete

## ✅ What Was Built (Session 2)

### 1. Database Service (`packages/db/src/db.ts`)
- Drizzle ORM operations for scenarios, sessions, agent jobs, decisions
- CRUD functions: `createSession`, `getSessionById`, `updateSessionState`, `createAgentJob`, `createDecision`
- PostgreSQL connection with postgres.js

### 2. Orchestrator Service (`apps/orchestrator/src/services/orchestrator.service.ts`)
- **`loadScenario()`** — Load from DB or fallback to YAML file
- **`createSimulationSession()`** — Create session in DB + return scenario
- **`processDecision()`** — Record decision + dispatch BA Agent job to BullMQ
- BullMQ integration: `ba-agent` queue with retry logic

### 3. Updated API Routes (`apps/orchestrator/src/routes/index.ts`)
- POST `/sessions` — Now creates DB session + XState actor
- POST `/sessions/:id/decisions` — Calls `processDecision()` + dispatches BA job
- All routes integrated with database

### 4. Dependencies Added
- `uuid` + `@types/uuid` — Session ID generation
- `bullmq` + `ioredis` — Job queue in orchestrator
- `@po-sim/db` — Database package linked to orchestrator

---

## 🔄 Complete Flow (End-to-End)

```
1. POST /sessions { userId, scenarioId }
   ↓
2. orchestrator.service.createSimulationSession()
   ↓
3. Load scenario from DB (or YAML fallback)
   ↓
4. Create session record in PostgreSQL
   ↓
5. Create XState actor in SessionManager
   ↓
6. Return { sessionId, scenario, currentNode }

---

7. POST /sessions/:id/decisions { optionId, timeTaken }
   ↓
8. orchestrator.service.processDecision()
   ↓
9. Record decision in DB (decisions table)
   ↓
10. Build BAInput from decision + context
   ↓
11. Dispatch job to BullMQ: baQueue.add('generate-spec', baInput)
   ↓
12. Record agent job in DB (agent_jobs table)
   ↓
13. Update session state in DB
   ↓
14. Send MAKE_DECISION event to XState actor

---

15. Worker picks up job from BullMQ
   ↓
16. BA Agent calls Claude Sonnet 4
   ↓
17. Validate output with Zod
   ↓
18. Return structured spec (user stories, acceptance criteria, etc.)
   ↓
19. Update agent_jobs.output in DB
   ↓
20. (TODO) Notify orchestrator via Redis Pub/Sub or polling
```

---

## 📊 Phase 1 Progress: ~85% Complete

**Completed:**
- ✅ Monorepo infrastructure
- ✅ Type system + Zod schemas
- ✅ Database schema (Drizzle ORM)
- ✅ Scenario parser
- ✅ XState session state machine
- ✅ Orchestrator API (Hono)
- ✅ BA Agent implementation
- ✅ BullMQ worker setup
- ✅ **Database integration** ← NEW
- ✅ **Orchestrator ↔ BullMQ connection** ← NEW

**Remaining (~15%):**
- [ ] Test end-to-end flow with real API key
- [ ] Agent job completion notification (Redis Pub/Sub or polling)
- [ ] Stakeholder Agent (simpler reactive agent)
- [ ] Scoring engine integration
- [ ] Error handling improvements

---

## 🧪 Testing the Complete Flow

### Prerequisites
```bash
# 1. Start infrastructure
docker compose up -d

# 2. Run database migrations
cd packages/db
npm run db:migrate

# 3. Set API key
export ANTHROPIC_API_KEY=your-key-here
export DATABASE_URL=postgresql://posim:posim_dev_password@localhost:5432/posim_db
export REDIS_URL=redis://localhost:6379
```

### Start Services
```bash
# Terminal 1: Start orchestrator
cd apps/orchestrator
npm run dev
# → http://localhost:3001

# Terminal 2: Start worker
cd apps/workers
npm run dev
# → Listening for BA Agent jobs
```

### Test Flow
```bash
# 1. Create session
curl -X POST http://localhost:3001/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "scenarioId": "sprint-planning-capacity"
  }'

# Response: { sessionId, scenario, currentNode }

# 2. Make decision
curl -X POST http://localhost:3001/sessions/{sessionId}/decisions \
  -H "Content-Type: application/json" \
  -d '{
    "optionId": "opt_3",
    "timeTaken": 45
  }'

# Response: { success: true, jobId, message }

# 3. Check worker logs
# → Should see: "[BA Worker] Processing job {jobId}"
# → Should see: "[BA Worker] Job {jobId} completed successfully"

# 4. Query database
psql $DATABASE_URL -c "SELECT * FROM sessions;"
psql $DATABASE_URL -c "SELECT * FROM decisions;"
psql $DATABASE_URL -c "SELECT * FROM agent_jobs;"
```

---

## 🚀 Next Steps

1. **End-to-End Test**
   - Run complete flow with real scenario
   - Verify BA Agent generates valid spec
   - Check database records

2. **Agent Completion Notification**
   - Option A: Redis Pub/Sub (worker publishes, orchestrator subscribes)
   - Option B: Polling (orchestrator checks job status periodically)
   - Option C: Webhook (BullMQ completed event → HTTP callback)

3. **Stakeholder Agent**
   - Simpler than BA (reactive feedback, not generative)
   - Uses Claude Haiku for cost efficiency
   - Reacts to PO decisions with stakeholder feedback

4. **Scoring Engine**
   - Calculate score based on decision + BA output quality
   - Apply score modifiers from scenario
   - Track metrics over time

---

## 📝 Files Created/Modified (Session 2)

**New Files:**
- `packages/db/src/db.ts` — Database operations
- `apps/orchestrator/src/services/orchestrator.service.ts` — Core orchestration logic
- `END-TO-END-INTEGRATION.md` — This file

**Modified Files:**
- `packages/db/src/index.ts` — Export db.ts
- `apps/orchestrator/src/routes/index.ts` — Integrated with orchestrator.service
- `apps/orchestrator/package.json` — Added uuid, bullmq, ioredis, @po-sim/db
- `package.json` (root) — Added packageManager field

---

**Status**: End-to-end flow wired. Ready for integration testing. 🚀
