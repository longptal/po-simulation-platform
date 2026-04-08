# Requirements Document: PO Simulation Platform Integration Testing

Created: 2026-04-08 | BA Session: QA Agent test strategy analysis

## Context

The PO Simulation Platform requires comprehensive end-to-end integration testing before Phase 1 MVP completion. The system has reached ~85% completion with all core components wired (Orchestrator, Workers, Database, Queue), but no formal integration test suite exists. Testing is critical to validate the complete decision flow: User creates session → Makes decision → BA Agent processes → Returns spec.

## Stakeholders

- **Primary user**: QA Agent (automated test runner)
- **Secondary**: Development team (regression testing), CI/CD pipeline
- **Affected systems**: Orchestrator API, BullMQ Workers, PostgreSQL DB, Redis Queue, Claude API

## Test Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Integration Test Suite                        │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Unit Integration                                       │
│  ├── Scenario Parser + Zod Validation                           │
│  ├── Database CRUD Operations                                    │
│  └── XState State Machine Transitions                           │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: API Integration                                        │
│  ├── POST /sessions (create)                                    │
│  ├── GET /sessions/:id (retrieve)                               │
│  ├── POST /sessions/:id/decisions (decide)                      │
│  └── GET /health (health check)                                 │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: End-to-End Flow                                        │
│  ├── Happy Path: Session → Decision → BA Agent → Complete       │
│  ├── Error Path: Invalid inputs, missing data                   │
│  └── Retry Path: BA Agent failure + recovery                    │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: Performance & Concurrency                              │
│  ├── Response time benchmarks                                   │
│  └── Concurrent session handling                                │
└─────────────────────────────────────────────────────────────────┘
```

## User Stories

### US-1: Scenario Loading & Validation

```
US-1: As a QA engineer, I want to verify scenario YAML parsing works correctly

AC-1.1: GIVEN a valid scenario YAML file (sprint-planning-capacity.yaml)
        WHEN the scenario is parsed with parseScenarioFile()
        THEN it returns { success: true, data: ScenarioValidated }
        AND all decision_tree options have valid IDs

AC-1.2: GIVEN an invalid scenario YAML (missing required fields)
        WHEN the scenario is parsed
        THEN it returns { success: false, errors: [...] }
```

### US-2: Session Creation

```
US-2: As a QA engineer, I want to verify session creation works end-to-end

AC-2.1: GIVEN valid userId and scenarioId
        WHEN I call POST /sessions with { userId, scenarioId }
        THEN I receive HTTP 201
        AND response contains { sessionId, userId, scenarioId, state }
        AND state.value is "loadingScenario" or "waitingForDecision"

AC-2.2: GIVEN missing userId
        WHEN I call POST /sessions with { scenarioId }
        THEN I receive HTTP 400
        AND response contains { error: "userId and scenarioId are required" }

AC-2.3: GIVEN non-existent scenarioId
        WHEN I call POST /sessions with { userId, scenarioId: "invalid" }
        THEN I receive HTTP 500
        AND response contains error about scenario not found
```

### US-3: Decision Processing

```
US-3: As a QA engineer, I want to verify decision processing dispatches BA jobs

AC-3.1: GIVEN an active session exists
        WHEN I call POST /sessions/:id/decisions with { optionId: "opt_3", timeTaken: 45 }
        THEN I receive HTTP 200
        AND response contains updated session state

AC-3.2: GIVEN a decision is processed
        WHEN the orchestrator dispatches the BA job
        THEN a job appears in the "ba-agent" BullMQ queue
        AND job.data contains valid BAInput structure

AC-3.3: GIVEN missing optionId
        WHEN I call POST /sessions/:id/decisions with {}
        THEN I receive HTTP 400
        AND response contains { error: "optionId is required" }
```

### US-4: BA Agent Processing

```
US-4: As a QA engineer, I want to verify BA Agent generates valid specs

AC-4.1: GIVEN a BA Agent job in the queue
        WHEN the worker processes it
        THEN it calls Claude Sonnet 4 with correct prompts
        AND returns a BAOutput that passes Zod validation

AC-4.2: GIVEN Claude returns malformed JSON
        WHEN the BA Agent parses the response
        THEN it retries up to 2 times with format instructions
        AND logs warning for each retry attempt

AC-4.3: GIVEN all retries fail
        WHEN the BA Agent exhausts attempts
        THEN it throws an error with message containing "failed after 3 attempts"
```

### US-5: Error Handling

```
US-5: As a QA engineer, I want to verify robust error handling

AC-5.1: GIVEN non-existent sessionId
        WHEN I call GET /sessions/:id
        THEN I receive HTTP 404
        AND response contains error message

AC-5.2: GIVEN database connection fails
        WHEN any database operation is attempted
        THEN the error is caught and returned as HTTP 500
        AND error is logged for debugging

AC-5.3: GIVEN Redis connection fails
        WHEN a job is dispatched
        THEN the error is caught
        AND appropriate error response is returned
```

### US-6: Performance Requirements

```
US-6: As a QA engineer, I want to verify performance meets targets

AC-6.1: GIVEN a healthy system
        WHEN I call POST /sessions/:id/decisions
        THEN the API response returns within 500ms
        (Note: this is job dispatch time, not completion)

AC-6.2: GIVEN a BA Agent job is processing
        WHEN Claude returns a response
        THEN total job completion time is < 30 seconds

AC-6.3: GIVEN 3 concurrent sessions
        WHEN all 3 make decisions simultaneously
        THEN all jobs complete successfully
        AND no cross-session state pollution occurs
```

## Scope

### In Scope

| Category | Items |
|----------|-------|
| **Scenario System** | YAML parsing, Zod validation, decision tree traversal |
| **API Endpoints** | /sessions CRUD, /health, error responses |
| **Database Ops** | Create session, create decision, create agent_job |
| **Queue System** | BullMQ job dispatch, worker processing |
| **BA Agent** | Claude API call, output validation, retry logic |
| **State Machine** | XState transitions (idle → loadingScenario → waitingForDecision) |
| **Error Handling** | Invalid inputs, missing data, connection failures |
| **Performance** | Response times, concurrent sessions |

### Out of Scope

| Category | Reason |
|----------|--------|
| Stakeholder Agent | Task #4 in progress, not yet complete |
| Scoring Engine | Not implemented yet |
| Frontend/UI Tests | No web app yet |
| Designer/Dev/Customer Agents | Phase 2 |
| Playwright Browser Tests | Phase 2 |
| Load Testing (>10 users) | Beyond MVP scope |
| Job Completion Notification | Task #1 in progress — use polling fallback |

### Assumptions

| Assumption | Risk if Wrong | Mitigation |
|------------|---------------|------------|
| Docker containers running | Tests fail immediately | Pre-test health check |
| ANTHROPIC_API_KEY valid | BA Agent tests fail | Skip Claude tests if no key |
| DB migrations run | Schema errors | Run migrations in test setup |
| Task #2 complete | TypeScript errors | Verified complete |
| Scenario YAML exists | File not found | Use known file path |

### Dependencies

| Dependency | Status | Test Impact |
|------------|--------|-------------|
| PostgreSQL 16 | docker-compose.yml | Required |
| Redis 7 | docker-compose.yml | Required |
| Anthropic API | External | Optional (skip if no key) |
| @po-sim/shared | Built | Required |
| @po-sim/db | Built | Required |
| sprint-planning-capacity.yaml | Available | Required |

## Non-Functional Requirements

| NFR | Requirement | Measurement | Target |
|-----|-------------|-------------|--------|
| **Performance** | API response time | Console timing | < 500ms |
| **Performance** | BA job completion | Job timestamps | < 30s |
| **Reliability** | Test consistency | 3 consecutive runs | 100% pass |
| **Isolation** | No state pollution | Unique IDs per test | Verified |
| **Cost Control** | API call efficiency | Call count | Minimize |
| **Timeout** | Test timeout | Vitest config | 60s |

## Test File Structure

```
/test-integration.ts          # Main integration test suite
  ├── describe("Health Check")
  ├── describe("Scenario Parser")
  ├── describe("Session API")
  │   ├── POST /sessions
  │   ├── GET /sessions/:id
  │   └── POST /sessions/:id/decisions
  ├── describe("BA Agent Worker")
  │   ├── Job processing
  │   └── Retry behavior
  ├── describe("End-to-End Flow")
  │   ├── Happy path
  │   └── Error handling
  └── describe("Performance")
      └── Concurrent sessions

/TEST-RESULTS.md              # Test execution report
```

## Test Environment Setup

```bash
# Prerequisites
1. Start Docker containers
   docker compose up -d

2. Run database migrations
   cd packages/db && npm run db:migrate

3. Set environment variables
   export DATABASE_URL=postgresql://posim:posim_dev_password@localhost:5432/posim_db
   export REDIS_URL=redis://localhost:6379
   export ANTHROPIC_API_KEY=your-key-here  # Optional for BA Agent tests

4. Build packages
   npm run build

5. Run tests
   npx tsx test-integration.ts
```

## Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Claude API rate limits | BA tests fail | Medium | Add delay between tests |
| Flaky async tests | False failures | Medium | Proper polling + timeouts |
| Docker not running | All tests fail | Low | Pre-flight health check |
| Schema mismatch | DB errors | Medium | Verify schema matches code |
| Job notification incomplete | Can't verify completion | High | Poll job status directly |

## Decision Classification

| Category | Item | Action |
|----------|------|--------|
| **Decision** (locked) | Use Vitest as test runner | Follow |
| **Decision** (locked) | Test against real DB/Redis | Follow |
| **Discretion** (agent decides) | Polling interval for job status | 500ms |
| **Discretion** (agent decides) | Test data fixtures | Generate unique per test |
| **Deferred** | Stakeholder Agent tests | After Task #4 |
| **Deferred** | Job completion notification tests | After Task #1 |

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test coverage | All 5 scenarios | Pass count |
| Happy path | 100% pass | Green status |
| Error handling | 100% pass | Green status |
| Performance | < 5s per decision | Timing logs |
| Reliability | 3/3 consecutive runs | No flakes |

## Next Step

→ Hand off to `rune:cook` for test suite implementation
