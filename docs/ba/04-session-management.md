# BA Document: Session Management & State Machine

**Note:** This document covers the full system (Phase 1 + Phase 2). Phase 1 MVP scope
is highlighted below. For the simplified Phase 1-only state machine, see
`ai-agent-orchestration-plan.md §4.2`.

**Phiên bản:** 1.1 (updated: Phase 1 MVP scope + Career Mode model)  
**Ngày:** 2026-04-08  
**Người phân tích:** BA Agent  
**Mảng nghiệp vụ:** Session Management & State Machine

---

## 1. Tổng quan nghiệp vụ

### 1.1 Định nghĩa Session

**Session** là một phiên làm việc hoàn chỉnh của Product Owner trong hệ thống simulation, bao gồm:
- Một scenario được chọn (ví dụ: "E-commerce Feature Launch")
- Nhiều sprints (thường 3 sprints cho MVP)
- Chuỗi quyết định của PO và phản hồi từ AI agents
- Trạng thái tiến độ và artifacts được tạo ra (specs, designs, code)
- Metrics và scoring được tích lũy theo thời gian

**Mục đích nghiệp vụ:**
- Cho phép PO làm việc liên tục trong nhiều ngày mà không mất tiến độ
- Lưu trữ toàn bộ lịch sử quyết định để phân tích và coaching
- Đảm bảo tính nhất quán của workflow khi có gián đoạn
- Hỗ trợ nhiều PO làm việc đồng thời mà không xung đột

### 1.2 Vòng đời Session

```
[Khởi tạo] → [Làm việc] → [Tạm dừng] → [Tiếp tục] → [Hoàn thành] → [Lưu trữ]
     ↓            ↓            ↓            ↓             ↓            ↓
  Chọn        Các sprints   Checkpoint   Resume từ    Scoring +    Archive
  scenario    + decisions                checkpoint   coaching     + cleanup
```

**Thời gian trung bình:**
- MVP Phase 1: 1 session = 3 sprints = 1 scenario each = ~25-40 phút real-time
- Phase 2: 1 session = 5-7 sprints = 2-3 giờ (thường 2-3 ngày làm việc)

**Career Mode time model:** PO progress qua event-day checkpoints, skip uneventful days.
1 scenario = 1 sprint (~2 simulated weeks) = 4-6 checkpoints × ~5-7 phút/checkpoint.

---

## 2. Session States & Transitions

### 2.1 State Machine Design (XState v5)

**Phase 1 MVP scope:** Only states marked `[P1]` are implemented.
Phase 1 = BA Agent + Stakeholder Agent only (no Designer, Dev, Customer agents).
Phase 2 = full 5-agent flow.

```typescript
enum SessionState {
  // Initialization
  CREATED = 'created',                    // Session vừa được tạo
  ONBOARDING = 'onboarding',              // PO đang làm onboarding

  // Active work states — Phase 1 MVP [P1]
  INITIATED = 'initiated',               // Sẵn sàng bắt đầu [P1]
  SPEC_DRAFTING = 'spec_drafting',        // BA Agent đang tạo spec (async) [P1]
  SPEC_REVIEW = 'spec_review',            // PO review spec [P1]
  STAKEHOLDER_FEEDBACK = 'stakeholder_feedback', // Stakeholder reviewing async [P1]
  DECISION_FINAL = 'decision_final',      // PO final call (ship/iterate) [P1]
  SPRINT_COMPLETE = 'sprint_complete',   // Score + update metrics [P1]

  // Active work states — Phase 2 only (Designer, Dev, Customer agents)
  DESIGN_IN_PROGRESS = 'design_in_progress',  // Designer Agent làm việc [P2]
  DESIGN_REVIEW = 'design_review',        // PO review design [P2]
  DEV_IN_PROGRESS = 'dev_in_progress',    // Dev Agent code [P2]
  DEV_TESTING = 'dev_testing',            // Auto-test đang chạy [P2]
  USER_TESTING = 'user_testing',          // Customer Agent test [P2]
  STAKEHOLDER_REVIEW = 'stakeholder_review', // Stakeholder final review [P2]
  FINAL_REVIEW = 'final_review',          // PO quyết định cuối [P2]

  // Time model — Career Mode [P1]
  EVENT_DAY_WAIT = 'event_day_wait',       // Time passes; PO fast-forwards [P1]

  // Sprint transitions
  SPRINT_RETROSPECTIVE = 'sprint_retrospective', // Cuối sprint [P2]
  SPRINT_PLANNING = 'sprint_planning',     // Đầu sprint mới [P2]

  // Pause/Resume
  PAUSED = 'paused',                      // PO tạm dừng
  WAITING_FOR_PO = 'waiting_for_po',      // Chờ PO input

  // Terminal states
  SESSION_COMPLETE = 'session_complete',  // Hoàn thành thành công [P1]
  COMPLETED = 'completed',                // Deprecated: use SESSION_COMPLETE [P1]
  FAILED = 'failed',                      // Thất bại (timeout, error)
  ABANDONED = 'abandoned',                // PO bỏ dở
  ARCHIVED = 'archived'                   // Đã lưu trữ
}
```

**Career Mode time model (Phase 1):** Session halts ONLY at event-day checkpoints.
Between checkpoints, time passes freely (skip days). PO fast-forwards through
uneventful days — similar to Career Mode in a football game. A sprint (scenario)
covers 2 simulated weeks but PO only needs to act at 4-6 checkpoint days.

### 2.2 State Transitions

**Quy tắc chuyển đổi:**
- `[P1]` = Phase 1 MVP scope
- `[P2]` = Phase 2 only
- Phase 1 transitions form a simple loop: SPEC_REVIEW → STAKEHOLDER_FEEDBACK → DECISION_FINAL → SPRINT_COMPLETE → EVENT_DAY_WAIT → back to INITIATED
- Phase 2 transitions add the full Designer→Dev→Customer pipeline between SPEC_REVIEW and SPRINT_RETROSPECTIVE

| Từ State | Đến State | Trigger | Phase |
|----------|-----------|---------|-------|
| `CREATED` | `ONBOARDING` | User starts | — |
| `ONBOARDING` | `INITIATED` | Onboarding complete | — |
| `INITIATED` | `SPEC_DRAFTING` | PO makes decision | [P1] |
| `SPEC_DRAFTING` | `SPEC_REVIEW` | BA Agent done | [P1] |
| `SPEC_REVIEW` | `STAKEHOLDER_FEEDBACK` | PO approves | [P1] |
| `SPEC_REVIEW` | `SPEC_DRAFTING` | PO requests revision | [P1] |
| `STAKEHOLDER_FEEDBACK` | `DECISION_FINAL` | Stakeholder done | [P1] |
| `DECISION_FINAL` | `SPRINT_COMPLETE` | PO ships | [P1] |
| `DECISION_FINAL` | `SPEC_DRAFTING` | PO iterates | [P1] |
| `SPRINT_COMPLETE` | `EVENT_DAY_WAIT` | More sprints | [P1] |
| `SPRINT_COMPLETE` | `SESSION_COMPLETE` | All sprints done | [P1] |
| `EVENT_DAY_WAIT` | `INITIATED` | Next checkpoint | [P1] |
| Phase 2 only: |
| `SPEC_REVIEW` | `DESIGN_IN_PROGRESS` | PO approves (P2) | [P2] |
| `DESIGN_IN_PROGRESS` | `DESIGN_REVIEW` | Designer done | [P2] |
| `DESIGN_REVIEW` | `DEV_IN_PROGRESS` | PO approves | [P2] |
| `DEV_IN_PROGRESS` | `DEV_TESTING` | Dev Agent done | [P2] |
| `DEV_TESTING` | `USER_TESTING` | Tests pass | [P2] |
| `DEV_TESTING` | `DEV_IN_PROGRESS` | Tests fail | [P2] |
| `USER_TESTING` | `STAKEHOLDER_REVIEW` | Customer feedback ready | [P2] |
| `STAKEHOLDER_REVIEW` | `FINAL_REVIEW` | Stakeholder done | [P2] |
| `FINAL_REVIEW` | `SPRINT_RETROSPECTIVE` | PO ships feature | [P2] |
| `SPRINT_RETROSPECTIVE` | `SPRINT_PLANNING` | Review done | [P2] |
| `SPRINT_RETROSPECTIVE` | `COMPLETED` | All sprints done | [P2] |
| Common: |
| Any active state | `PAUSED` | PO closes app | — |
| `PAUSED` | Previous state | PO returns | — |
| Any active state | `WAITING_FOR_PO` | Agent needs input | — |
| `WAITING_FOR_PO` | Previous state | PO responds | — |
| Any state | `FAILED` | System error | — |
| Any state | `ABANDONED` | Timeout | — |

### 2.3 State Metadata

Mỗi state lưu thêm metadata:

```typescript
interface StateMetadata {
  enteredAt: Date;              // Thời điểm vào state
  duration?: number;            // Thời gian ở state (ms)
  retryCount?: number;          // Số lần retry (nếu có)
  errorCount?: number;          // Số lỗi gặp phải
  agentInProgress?: string;     // Agent nào đang làm việc
  waitingFor?: string;          // Đang chờ gì (PO input, agent output)
  checkpointId?: string;        // ID của checkpoint gần nhất
}
```

---

## 3. Business Rules

### 3.1 Session Lifecycle Rules

**R1: Session Creation**
- Mỗi user có thể có tối đa 5 active sessions đồng thời
- Free tier: giới hạn 3 sessions/ngày
- Paid tier: unlimited sessions
- Session phải được gắn với 1 scenario cụ thể ngay khi tạo

**R2: Session Timeout**
- Session ở state `PAUSED` > 7 ngày → tự động chuyển sang `ABANDONED`
- Session ở state `WAITING_FOR_PO` > 24 giờ → gửi reminder notification
- Session ở state `WAITING_FOR_PO` > 72 giờ → chuyển sang `PAUSED`

**R3: Checkpoint Frequency**
- Checkpoint tự động sau mỗi state transition thành công
- Checkpoint bắt buộc trước khi chuyển sang `PAUSED`
- Checkpoint bao gồm: state, artifacts, decisions, metrics

**R4: Resume Logic**
- Resume luôn bắt đầu từ checkpoint gần nhất
- Nếu agent đang chạy khi pause → hủy job và rollback về state trước đó
- PO phải xác nhận context trước khi tiếp tục (hiển thị "You were working on...")

**R5: Concurrent Sessions**
- Mỗi session chạy độc lập, không chia sẻ state
- User có thể switch giữa các sessions, mỗi session giữ state riêng
- Không cho phép 2 sessions cùng scenario chạy đồng thời (tránh confusion)

**R6: Sprint Boundaries**
- Phase 1: Sprint kết thúc bằng SPRINT_COMPLETE (auto-score + metrics update)
- Phase 2: Sprint kết thúc bằng SPRINT_RETROSPECTIVE (full retrospective report)
- Sprint mới chỉ bắt đầu sau khi checkpoint created
- Career Mode: không cần qua tất cả các ngày — chỉ checkpoint tại event days

**R7: Agent Coordination**
- Chỉ 1 agent được phép modify session state tại 1 thời điểm
- Agents khác có thể read state nhưng không write
- Orchestrator là single source of truth cho state transitions

### 3.2 Data Integrity Rules

**R8: State Consistency**
- Mọi state transition phải được ghi vào audit log
- Không cho phép skip states (phải đi theo flow định nghĩa)
- Rollback chỉ cho phép về state trước đó 1 bước

**R9: Artifact Versioning**
- Mỗi artifact (spec, design, code) phải có version number
- Khi PO yêu cầu revision → tạo version mới, giữ version cũ
- Không cho phép overwrite artifact đã được PO approve

**R10: Decision Immutability**
- Decisions của PO không thể sửa sau khi submit
- Có thể add clarification nhưng không thể delete/edit
- Decision history phải đầy đủ để tính scoring

---

## 4. State Persistence Strategy

### 4.1 Two-Tier Storage

**Tier 1: Redis (Hot Cache)**
- Lưu active sessions (state hiện tại + metadata)
- TTL: 24 giờ cho active sessions, 7 ngày cho paused sessions
- Key pattern: `session:{sessionId}:state`
- Dùng cho: fast read/write, real-time updates

**Tier 2: PostgreSQL (Durable Storage)**
- Lưu checkpoints, audit log, artifacts
- Không có TTL, lưu vĩnh viễn
- Dùng cho: recovery, analytics, coaching

### 4.2 Database Schema

```typescript
// PostgreSQL tables
table sessions {
  id: uuid primary_key
  userId: uuid foreign_key(users.id)
  scenarioId: uuid foreign_key(scenarios.id)
  currentState: SessionState
  currentSprint: integer
  totalSprints: integer
  createdAt: timestamp
  updatedAt: timestamp
  pausedAt?: timestamp
  completedAt?: timestamp
  metadata: jsonb  // StateMetadata
}

table checkpoints {
  id: uuid primary_key
  sessionId: uuid foreign_key(sessions.id)
  state: SessionState
  stateData: jsonb  // Full state snapshot
  artifacts: jsonb  // Refs to artifacts
  decisions: jsonb  // Decisions up to this point
  metrics: jsonb    // Metrics snapshot
  createdAt: timestamp
  index(sessionId, createdAt desc)
}

table state_transitions {
  id: uuid primary_key
  sessionId: uuid foreign_key(sessions.id)
  fromState: SessionState
  toState: SessionState
  trigger: string   // 'po_decision', 'agent_complete', 'timeout'
  metadata: jsonb
  createdAt: timestamp
  index(sessionId, createdAt)
}

table artifacts {
  id: uuid primary_key
  sessionId: uuid foreign_key(sessions.id)
  type: 'spec' | 'design' | 'code' | 'feedback'
  version: integer
  content: jsonb
  createdBy: string  // Agent name
  approvedBy?: uuid  // PO user id
  createdAt: timestamp
  index(sessionId, type, version)
}
```

### 4.3 Redis Data Structures

```typescript
// Active session state (Hash)
HSET session:{sessionId}:state
  currentState: "spec_review"
  currentSprint: 2
  agentInProgress: "ba-agent"
  lastCheckpointId: "ckpt_xyz"
  updatedAt: "2026-04-08T07:00:00Z"

// Session lock (String with TTL)
SET session:{sessionId}:lock "orchestrator-1" EX 30

// Agent job status (Hash)
HSET session:{sessionId}:jobs
  ba-agent: "completed"
  designer-agent: "in_progress"
  dev-agent: "pending"

// Real-time events (Pub/Sub)
PUBLISH session:{sessionId}:events {
  type: "state_changed",
  from: "spec_drafting",
  to: "spec_review",
  timestamp: "2026-04-08T07:00:00Z"
}
```

### 4.4 Checkpoint Strategy

**Khi nào tạo checkpoint:**
1. Sau mỗi state transition thành công
2. Trước khi chuyển sang `PAUSED`
3. Sau khi PO approve artifact quan trọng (spec, design)
4. Cuối mỗi sprint (sprint retrospective)
5. Mỗi 15 phút nếu session đang active (safety net)

**Checkpoint bao gồm:**
- Full state snapshot (current state + metadata)
- References đến artifacts (không duplicate content)
- Decision history up to this point
- Metrics snapshot
- Agent job statuses

**Retention policy:**
- Giữ tất cả checkpoints trong 30 ngày
- Sau 30 ngày: chỉ giữ checkpoints ở sprint boundaries
- Sau 90 ngày: chỉ giữ checkpoint cuối cùng

---

## 5. Concurrency Handling

### 5.1 Concurrent Sessions (Same User)

**Scenario:** User có 3 sessions đang active, switch qua lại

**Giải pháp:**
- Mỗi session có state độc lập trong Redis
- Frontend track `activeSessionId` trong local storage
- Khi switch session: load state từ Redis, subscribe events mới
- Không có shared state giữa các sessions

**Lưu ý:**
- Không cho phép 2 sessions cùng scenario (business rule R5)
- UI hiển thị danh sách sessions, cho phép switch dễ dàng
- Background sessions vẫn có thể nhận notifications

### 5.2 Concurrent Agents (Same Session)

**Scenario:** Designer Agent và Stakeholder Agent chạy song song

**Giải pháp:**
- Orchestrator dispatch jobs song song qua BullMQ
- Mỗi agent chỉ write vào artifact riêng của mình
- Chỉ Orchestrator được phép update session state
- Agents emit events khi done, Orchestrator aggregate results

**Locking mechanism:**
```typescript
// Orchestrator acquire lock trước khi update state
async function transitionState(sessionId: string, newState: SessionState) {
  const lock = await redis.set(
    `session:${sessionId}:lock`,
    'orchestrator-1',
    'EX', 30,  // 30 seconds TTL
    'NX'       // Only set if not exists
  );
  
  if (!lock) {
    throw new Error('Session locked by another process');
  }
  
  try {
    // Update state in Redis
    await redis.hset(`session:${sessionId}:state`, 'currentState', newState);
    
    // Create checkpoint in PostgreSQL
    await db.insert(checkpoints).values({...});
    
    // Log transition
    await db.insert(state_transitions).values({...});
    
  } finally {
    await redis.del(`session:${sessionId}:lock`);
  }
}
```

### 5.3 Concurrent Users (Different Sessions)

**Scenario:** 1000 users đang chạy sessions đồng thời

**Giải pháp:**
- Mỗi session hoàn toàn độc lập
- BullMQ worker pool scale theo load (2-10 workers)
- Redis cluster cho high throughput
- PostgreSQL connection pooling (max 100 connections)

**Rate limiting:**
- Free tier: max 3 concurrent sessions per user
- Paid tier: max 10 concurrent sessions per user
- System-wide: max 5000 active sessions (scale limit)

---

## 6. Recovery Scenarios

### 6.1 Session Interrupted (User Closes Browser)

**Tình huống:** PO đang ở state `SPEC_REVIEW`, đóng browser đột ngột

**Recovery flow:**
1. Frontend detect `beforeunload` event → gọi API checkpoint
2. Backend tạo checkpoint với state hiện tại
3. Chuyển session sang `PAUSED`
4. Khi PO quay lại:
   - Load checkpoint gần nhất
   - Hiển thị context: "You were reviewing the spec for Feature X"
   - Resume từ state `SPEC_REVIEW`

**Thời gian recovery:** < 2 giây

### 6.2 Agent Crash (Agent Process Dies)

**Tình huống:** BA Agent đang chạy, process bị kill

**Recovery flow:**
1. BullMQ detect job timeout (15 phút)
2. Retry job lần 1 (sau 5 giây)
3. Nếu fail lần 2 → Circuit breaker kick in
4. Orchestrator rollback session về state trước đó (`INITIATED`)
5. Notify PO: "BA Agent encountered an error. Please try again."
6. PO có thể retry hoặc skip

**Fallback:** Nếu agent fail 3 lần liên tiếp → chuyển sang manual mode (PO tự viết spec)

### 6.3 Database Failure (PostgreSQL Down)

**Tình huống:** PostgreSQL không available, không thể lưu checkpoint

**Recovery flow:**
1. Redis vẫn hoạt động → session tiếp tục chạy
2. Checkpoint queue lên Redis (pending writes)
3. Khi PostgreSQL recover → flush pending checkpoints
4. Nếu PostgreSQL down > 10 phút → pause tất cả sessions
5. Notify users: "System maintenance in progress"

**Data loss risk:** Tối đa 15 phút data (khoảng cách giữa 2 checkpoints)

### 6.4 State Corruption (Inconsistent State)

**Tình huống:** Redis state khác PostgreSQL checkpoint

**Detection:**
- Health check mỗi 5 phút so sánh Redis vs PostgreSQL
- Nếu phát hiện mismatch → flag session

**Recovery flow:**
1. Pause session
2. Rebuild state từ PostgreSQL checkpoint gần nhất
3. Replay state transitions từ audit log
4. Sync lại Redis
5. Resume session

**Prevention:** Atomic writes (Redis + PostgreSQL trong transaction)

### 6.5 Orphaned Sessions (No Activity > 7 Days)

**Tình huống:** Session ở state `PAUSED`, PO không quay lại

**Cleanup flow:**
1. Cron job chạy mỗi ngày, scan sessions với `pausedAt > 7 days ago`
2. Chuyển sang state `ABANDONED`
3. Archive checkpoints vào cold storage (S3)
4. Xóa khỏi Redis
5. Gửi email cho PO: "Your session has been archived"

**Restore:** PO có thể restore session từ archive trong 90 ngày

---

## 7. Dependencies

### 7.1 Phụ thuộc vào mảng nghiệp vụ khác

| Mảng | Dependency | Lý do |
|------|-----------|-------|
| **Scenario Engine** | Scenario definition, decision tree | Session cần biết flow của scenario để validate transitions |
| **AI Agent Orchestration** | Agent contracts, job queue | Session state trigger agent jobs, nhận agent outputs |
| **Metrics & Coaching** | Scoring engine, impact mapping | Session cần lưu metrics snapshots tại checkpoints |
| **UX & PO Interface** | Frontend state management | UI cần sync với session state real-time |

### 7.2 Mảng khác phụ thuộc vào Session Management

| Mảng | Phụ thuộc gì | Lý do |
|------|-------------|-------|
| **AI Agent Orchestration** | Session state, artifacts | Agents cần biết session đang ở đâu để quyết định action |
| **Metrics & Coaching** | Decision history, checkpoints | Tính scoring dựa trên toàn bộ session history |
| **UX & PO Interface** | Real-time state updates | UI hiển thị progress, enable/disable actions dựa trên state |

### 7.3 External Dependencies

| Service | Dùng để làm gì | Failure impact |
|---------|---------------|----------------|
| **Redis** | Hot cache, pub/sub, locks | High - sessions không thể chạy |
| **PostgreSQL** | Durable storage, checkpoints | Medium - sessions chạy được nhưng không lưu được |
| **BullMQ** | Agent job queue | High - agents không thể chạy |
| **XState** | State machine logic | High - không validate được transitions |

---

## 8. Risks & Assumptions

### 8.1 Risks

**R1: State Machine Complexity**
- **Risk:** XState v5 có learning curve cao, team chưa quen
- **Impact:** High - core logic của session management
- **Mitigation:** Prototype XState flow trước khi implement full, viết tests kỹ cho transitions

**R2: Redis Single Point of Failure**
- **Risk:** Redis down → tất cả active sessions mất state
- **Impact:** High - user experience bị gián đoạn
- **Mitigation:** Redis Sentinel (auto-failover), backup checkpoints từ PostgreSQL mỗi 5 phút

**R3: Checkpoint Overhead**
- **Risk:** Checkpoint sau mỗi transition → nhiều writes vào PostgreSQL
- **Impact:** Medium - có thể gây bottleneck khi scale
- **Mitigation:** Batch writes, async checkpoint (không block state transition)

**R4: Concurrent Session Limit**
- **Risk:** User muốn chạy > 5 sessions đồng thời
- **Impact:** Low - edge case
- **Mitigation:** Paid tier tăng limit lên 10, enterprise tier unlimited

**R5: Long-Running Sessions**
- **Risk:** Session chạy nhiều ngày → state phình to, khó manage
- **Impact:** Medium - memory usage tăng
- **Mitigation:** Compress old checkpoints, archive sessions > 30 ngày

### 8.2 Assumptions

**A1: Session Duration**
- Giả định: MVP session = 25-40 phút (3 sprints × 4-6 checkpoints × 5-7 phút)
- 1 scenario = 1 sprint. Career Mode: PO skips uneventful days.

**A2: Checkpoint Frequency**
- Giả định: Checkpoint sau mỗi event-day checkpoint (4-6 per sprint), không phải mỗi state transition
- Phase 1 uses event-day checkpoints, not all states

**A3: Concurrent Users**
- Giả định: MVP có < 100 concurrent users
- Nếu sai: Cần scale Redis cluster, tăng PostgreSQL capacity

**A4: State Transitions Are Fast**
- Giả định: Mỗi transition < 100ms
- Nếu sai: Cần optimize locking mechanism, reduce checkpoint size

**A5: Agents Are Reliable**
- Giả định: Agents fail < 5% thời gian
- Nếu sai: Cần robust retry logic, fallback mechanisms

---

## 9. Success Metrics

| Metric | Target | Cách đo |
|--------|--------|---------|
| **Session completion rate** | > 70% | % sessions đạt state `COMPLETED` |
| **Resume success rate** | > 95% | % lần resume thành công từ checkpoint |
| **State transition latency (p95)** | < 200ms | Time từ trigger đến state updated |
| **Checkpoint write latency (p95)** | < 500ms | Time để lưu checkpoint vào PostgreSQL |
| **Concurrent sessions supported** | > 100 | Max concurrent sessions không bị degradation |
| **Data loss incidents** | 0 | Số lần mất data do state corruption |
| **Session recovery time** | < 5s | Time để restore session từ checkpoint |

---

## 10. Next Steps

### 10.1 Implementation Order

1. **Week 1-2:** Database schema + Redis structures
2. **Week 2-3:** XState state machine definition + transitions
3. **Week 3-4:** Checkpoint logic + persistence layer
4. **Week 4-5:** Recovery mechanisms + error handling
5. **Week 5-6:** Concurrency handling + locking
6. **Week 6-7:** Integration với Orchestrator + Agents
7. **Week 7-8:** Testing + monitoring

### 10.2 Open Questions

1. **Q:** Có cần support "fork session" (tạo branch từ checkpoint cũ)?
   - **Impact:** Cho phép PO thử nhiều decisions khác nhau
   - **Decision:** Defer to Phase 2

2. **Q:** Session có thể share giữa nhiều users không (collaborative mode)?
   - **Impact:** Multiplayer feature
   - **Decision:** Out of scope cho MVP

3. **Q:** Checkpoint có cần encrypt không (sensitive data)?
   - **Impact:** Security compliance
   - **Decision:** Yes nếu có PII trong artifacts

---

## Phụ lục: XState v5 Example

```typescript
import { createMachine, assign } from 'xstate';

const sessionMachine = createMachine({
  id: 'session',
  initial: 'created',
  context: {
    sessionId: '',
    currentSprint: 1,
    totalSprints: 3,
    artifacts: [],
    decisions: [],
  },
  states: {
    created: {
      on: {
        START_ONBOARDING: 'onboarding'
      }
    },
    onboarding: {
      on: {
        COMPLETE_ONBOARDING: 'initiated'
      }
    },
    initiated: {
      on: {
        PO_DECISION: {
          target: 'spec_drafting',
          actions: assign({
            decisions: ({ context, event }) => [
              ...context.decisions,
              event.decision
            ]
          })
        }
      }
    },
    spec_drafting: {
      invoke: {
        src: 'baAgent',
        onDone: {
          target: 'spec_review',
          actions: assign({
            artifacts: ({ context, event }) => [
              ...context.artifacts,
              { type: 'spec', content: event.output }
            ]
          })
        },
        onError: 'failed'
      }
    },
    spec_review: {
      on: {
        PO_APPROVE: 'design_in_progress',
        PO_REJECT: 'spec_drafting'
      }
    },
    // ... more states
    completed: {
      type: 'final'
    },
    failed: {
      type: 'final'
    }
  }
});
```

---

**Kết luận:** Tài liệu này cung cấp phân tích nghiệp vụ đầy đủ cho Session Management & State Machine. Implementation team có thể dùng làm reference để build hệ thống.
