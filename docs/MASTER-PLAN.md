# PO Simulator — Master Development Plan

## 1. Executive Summary

**Vision:** Xay dung "flight simulator cho Product Owner" — mot moi truong thuc hanh ao noi PO moi co the hoc bang cach lam viec thuc su voi team AI (BA, Designer, Dev, Stakeholder, Customer).

**Target User:** PO moi (0-3 nam kinh nghiem) muon hoc ky nang product management thuc chien, khong chi ly thuyet.

**Core Loop:**
```
Nhan viec -> Ra quyet dinh -> Thay ket qua (metrics thuc) -> Nhan coaching feedback -> Lam tot hon
```
(PO progresses through event-day checkpoints; 1 scenario = 1 sprint; Career Mode style — skip uneventful days, pause at decisions)

**Unique Value vs Competitors:**
- Khong phai khoa hoc hay video — PO "di lam" that su trong moi truong mo phong
- AI agents dong vai team members that (BA, Dev, Designer, Stakeholder) voi tinh cach rieng
- Moi quyet dinh anh huong den metrics that (retention, conversion, NPS) qua mo hinh synthetic users
- Output la app that (deploy duoc), khong phai mockup — tang tinh immersive
- Coaching ca nhan hoa: phat hien pattern sai lam, goi y cu the, cite real-world cases

---

## 2. System Architecture

```
                    +---------------------------+
                    |     PO Interface (PWA)    |
                    |   Next.js + Tailwind CSS  |
                    +-------------+-------------+
                                  |
                         WebSocket / SSE
                                  |
                    +-------------v-------------+
                    |      Orchestrator         |
                    |   (Session Manager +      |
                    |    Flow Controller +      |
                    |    State Machine XState)  |
                    +--+-------+-------+-------+
                       |       |       |
              +--------+   +--v--+   +-v---------+
              | Event   |  |Task |   | State     |
              | Bus     |  |Queue|   | Store     |
              | (Redis  |  |(Bull|   | (Postgres |
              | Pub/Sub)|  | MQ) |   | + Redis)  |
              +----+----+  +--+--+   +-----------+
                   |          |
        +----------+----------+----------+----------+
        |          |          |          |          |
   +----v---+ +---v----+ +--v-----+ +--v------+ +-v-------+
   |   BA   | |Designer| |  Dev   | |Stakeh.  | |Customer |
   | Agent  | | Agent  | | Agent  | | Agent   | | Agent   |
   +--------+ +---+----+ +---+----+ +---------+ +---------+
                   |          |
              Stitch MCP  Codex/Claude CLI
```

**4 Subsystems chinh:**

1. **Scenario Engine** — Quan ly scenarios (50+ tinh huong), decision trees (DAG), progression system (20 levels, 6 skill branches), XP/leveling, difficulty scaling
2. **AI Agent Orchestration** — Dieu phoi 5 AI agents (BA, Designer, Dev, Stakeholder, Customer) theo hybrid pattern (orchestrator + event-driven), xu ly async tasks qua BullMQ, error handling voi circuit breaker + checkpoint/resume
3. **Metrics & Coaching** — Tinh toan metrics tu PO decisions qua synthetic user model, causal mapping (decision -> impact chain), coaching engine (real-time whispers + sprint retrospectives), skill matrix tracking
4. **UX & PO Interface** — PWA web-first, 3-column dashboard ("van phong ao"), chat interface (giong Slack), design review, PR review (PO-friendly view), onboarding 10 phut

**Ket noi giua cac subsystems:**
- Scenario Engine cung cap context + decision tree cho Orchestrator
- Orchestrator dieu phoi AI Agents va cap nhat State Store
- Metrics & Coaching lang nghe events tu Orchestrator, tinh toan impact, generate feedback
- UX Interface hien thi tat ca va nhan input tu PO, gui ve Orchestrator

---

## 3. Unified Tech Stack

| Layer | Technology | Ghi chu |
|---|---|---|
| **Frontend** | Next.js + Tailwind CSS + Zustand | PWA, responsive, zero install |
| **Backend Framework** | Hono (TypeScript) | Nhe, nhanh, chia se types voi frontend |
| **Real-time** | WebSocket (chat) + SSE (notifications) | |
| **Database** | PostgreSQL 16 + JSONB | Session state, scenarios, checkpoints, audit log |
| **Cache & Pub/Sub** | Redis 7 | Session cache, event bus, circuit breaker state |
| **ORM** | Drizzle ORM | Type-safe, lightweight |
| **Task Queue** | BullMQ (Redis-backed) | Async agent tasks, retry, rate limiting |
| **State Machine** | XState v5 | Model scenario flow, session state, persist |
| **LLM — Reasoning** | Claude Sonnet 4.6 | BA, Designer, Dev agents (can reasoning tot) |
| **LLM — Simple** | Claude Haiku 4.5 | Stakeholder, Customer, Orchestrator (tiet kiem) |
| **LLM SDK** | Anthropic SDK + OpenAI SDK | Claude + Codex |
| **MCP** | @modelcontextprotocol/sdk | Stitch (design), Codex/Claude CLI (dev) |
| **Scenario Storage** | YAML + JSON Schema | Human-readable, version-controllable |
| **Scenario Editor** | React Flow | Visual decision tree editor (P1) |
| **Deploy — App** | Vercel / Cloudflare Pages | Auto-deploy per commit |
| **Deploy — Infra** | Docker Compose (dev) / Kubernetes (prod) | Auto-scaling workers |
| **Deploy — Sim Apps** | Vercel + Turso/Supabase | Per-simulation subdomain |
| **Monitoring** | Pino logger + Prometheus | Structured logging, metrics |
| **Validation** | Zod | Output validation cho moi agent |
| **Monorepo** | Turborepo | apps/ + packages/ structure |

**Conflict Resolution:**
- Backend framework: Scenario plan de xuat Hono, Orchestration plan de xuat Fastify. **Chon Hono** — nhe hon, ecosystem TypeScript tot, chia se types voi Next.js frontend.
- State management: UX plan de xuat Zustand (frontend), Scenario plan de xuat XState (scenario flow). **Ca hai** — Zustand cho UI state, XState cho session/scenario state machine.

---

## 4. MVP Scope — Phase 1 (6-8 tuan)

### P0 Features (MUST HAVE)

| # | Feature | Source Plan | Mo ta |
|---|---------|------------|-------|
| 1 | **Dashboard + Today's Focus** | UX | 3-column layout, morning briefing, team status, activity feed |
| 2 | **Chat voi BA Agent** | UX + Orchestration | Slack-like chat, BA tao spec, PO review/approve |
| 3 | **Chat voi Stakeholder Agent** | UX + Orchestration | Stakeholder push priorities, PO negotiate/pushback |
| 4 | **1 Scenario hoan chinh** | Scenario | E-commerce domain, 3 sprints, ~15 decision nodes level 1-7 *(1 Scenario = 1 sprint scenario. Full MVP session: 3 sprints from 1 domain, ~15 decision nodes total, ~45 min real-time.)* |
| 5 | **Scenario Parser + State Machine** | Scenario | Load YAML scenarios, XState session flow |
| 6 | **Morning Briefing + End of Day** | UX | Overnight updates, daily summary, coach feedback |
| 7 | **Basic Scoring (4 categories)** | Metrics | Prioritization, Communication, Analytics, Stakeholder Mgmt |
| 8 | **Decision Log** | UX + Metrics | Xem lai moi quyet dinh + outcome + coaching tip |
| 9 | **Sprint Retrospective Report** | Metrics | Auto-generated report cuoi moi sprint voi metrics + analysis |
| 10 | **Decision -> Impact Mapping** | Metrics | Model-based metrics calculation (khong can Playwright) |
| 11 | **Onboarding Flow (10 phut)** | UX | Welcome, chon scenario, guided first day, first decision |
| 12 | **Basic Orchestrator** | Orchestration | Session manager, 2 agents (BA + Stakeholder), state transitions |
| 13 | **Inbox + Notifications** | UX | Urgent/mention/info badges, sidebar notifications |
| 14 | **Freeform Decision Evaluator** | Scenario | Parse PO freeform text -> match to decision tree (Zod-validated, retry + circuit breaker) |

### Deferred tu MVP

| Feature | Defer den | Ly do |
|---|---|---|
| Designer Agent + Mockup Review | Phase 2 | UI phuc tap (image annotation) |
| Dev Agent + PR Review + Code Deploy | Phase 2 | Can "translate code to business" — phuc tap |
| Customer Agent + Synthetic User Simulation | Phase 2 | Pure model du cho MVP |
| Playwright headless browser testing | Phase 2 | Model-based metrics du cho validate |
| Real-time Coach Whisper | Phase 2 | End-of-day review du cho MVP |
| Visual Scenario Editor (React Flow) | Phase 2 | YAML + manual du cho 50 scenarios |
| Speed control (slow/fast/focus) | Phase 2 | Default speed du tot |
| Skill matrix tracking | Phase 2 | Basic 4-category scoring du |
| AI Scenario Generator | Phase 3 | Can nhieu data de train |
| Multiplayer | Phase 3 | Infrastructure phuc tap |

---

## 5. Phased Roadmap

### Phase 1 — MVP (Tuan 1-8)

**Muc tieu:** Validate core learning loop voi 2 agents (BA + Stakeholder) trong 1 scenario.

| Tuan | Focus | Deliverables |
|------|-------|-------------|
| 1-2 | **Foundation** | Monorepo setup, DB schema, scenario parser, YAML loader, basic state machine |
| 3-4 | **Core Agents** | BA Agent + Stakeholder Agent, orchestrator flow (decision -> spec -> review), chat UI |
| 5-6 | **UX Shell** | Dashboard, morning briefing, end-of-day, inbox, onboarding flow |
| 7-8 | **Metrics + Polish** | Scoring engine, decision log, sprint retrospective, impact mapping, 1 scenario content |

**Exit Criteria:** 1 user co the choi 1 scenario (3 sprints, ~45 phut) tu dau den cuoi, nhan scoring + coaching.

### Phase 2 — Full Team (Tuan 9-16)

**Muc tieu:** Them 3 agents con lai, real output (deployed app), richer feedback.

| Feature Block | Deliverables |
|---|---|
| **Designer Agent** | Stitch MCP integration, mockup review UI, design versioning |
| **Dev Agent** | Codex/Claude CLI integration, PR review (PO-friendly), auto-test |
| **Customer Agent** | Synthetic user personas, behavior model, usability feedback |
| **Real Output** | Per-simulation subdomain deploy, app that PO co the share |
| **Coaching v2** | Real-time whisper tips, pattern detection, real-world case references |
| **Content** | Them 3 scenarios (Fintech, SaaS B2B, Edtech), 35+ scenarios moi |
| **Speed Control** | Normal/Fast/Focused modes |

### Phase 3 — Scale (Tuan 17+)

| Feature Block | Deliverables |
|---|---|
| **AI Scenario Generator** | Claude + few-shot tao scenarios moi tu templates |
| **Adaptive Difficulty** | Tu dong tang do kho khi PO improve |
| **Multiplayer** | Nhieu PO cung 1 scenario, so sanh decisions |
| **Integrations** | Jira/Linear import, export certificate |
| **Causal Graph Viz** | Interactive visualization decision -> impact |
| **Playwright Validation** | Synthetic users dung app that qua headless browser |
| **Portfolio System** | PO xuat portfolio (decisions, scores, growth trajectory) |

---

## 6. Cross-component Dependencies

### Build Order

```
[1] Shared Types + DB Schema (packages/shared, packages/db)
     |
[2] Scenario Parser + State Machine (apps/orchestrator)
     |
[3] BA Agent + Stakeholder Agent (apps/workers)
     |          |
     |    [4] Orchestrator Flow (session manager, event bus)
     |          |
     |    [5] Chat UI + Dashboard (apps/web)
     |          |
     |    [6] Scoring Engine + Impact Mapping (packages/shared)
     |          |
     |    [7] Metrics Dashboard + Reports (apps/web)
     |
[8] Designer Agent + Stitch MCP (Phase 2)
     |
[9] Dev Agent + Codex/Claude CLI (Phase 2)
     |
[10] Customer Agent + Synthetic Users (Phase 2)
```

### Integration Points

| Point | Components | Protocol | Notes |
|---|---|---|---|
| PO -> Orchestrator | Web <-> Orchestrator | WebSocket | Real-time chat + decisions |
| Orchestrator -> Agents | Orchestrator <-> Workers | BullMQ (Redis) | Async jobs, retry, timeout |
| Agent -> Agent | Workers <-> Workers | Redis Pub/Sub | Event-driven, loosely coupled |
| Agent -> State | Workers -> DB | PostgreSQL | Checkpoint, artifacts |
| Scoring -> Frontend | Scoring -> Web | REST API + SSE | Metrics push khi co update |
| Scenario -> Orchestrator | YAML -> Parser -> DB | Startup load | Validate schema truoc khi luu |

---

## 7. Top 5 Risks & Mitigations

| # | Risk | Impact | Probability | Mitigation |
|---|------|--------|-------------|------------|
| 1 | **LLM cost qua cao** — moi session $1.50-$3.00, scale 1000 users = $3K/ngay | High | High | Model tiering (Haiku cho simple agents), prompt caching (giam 90% input cost), context pruning, incremental generation. Free tier gioi han 3 sessions/ngay |
| 2 | **Agent output khong consistent** — LLM tra ve sai format, hallucinate | High | Medium | Zod validation cho moi output, retry voi format instructions (max 2 lan), circuit breaker (5 failures -> pause agent), fallback to partial output + flag cho PO |
| 3 | **Metrics model khong realistic** — synthetic users khong phan anh thuc te, PO hoc sai | High | Medium | Phase 1 dung model-based (calibrate voi product management literature). Phase 2 validate bang Playwright. Ghi ro cho PO: "day la simulated metrics, khong phai real data" |
| 4 | **Content bottleneck** — can 50 scenarios chat luong cao, moi cai mat nhieu gio | Medium | High | MVP chi can 15 scenarios (1 domain). Dung AI scenario generator (Claude + few-shot) tu Phase 2. Community contribution cho Phase 3 |
| 5 | **Core loop khong hap dan** — PO choi 1 lan roi bo, retention thap | High | Medium | Validate voi 5-10 PO that truoc khi build Phase 2. Onboarding phai < 10 phut. Progression system (levels, skill tree) tao dong luc quay lai. Coach feedback phai actionable, khong generic |

---

## 8. Success Metrics (MVP)

| Metric | Target | Cach do |
|--------|--------|---------|
| **Onboarding completion rate** | > 80% | % users hoan thanh 10 phut onboarding |
| **Day 1 retention** | > 60% | % users quay lai ngay thu 2 |
| **Scenario completion rate** | > 40% | % users hoan thanh 1 scenario (3 sprints) |
| **Average session length** | 25-40 phut | Time in app per session |
| **User self-reported learning** | > 7/10 | Survey cuoi scenario |
| **Decision quality improvement** | > 15% score tang | So sanh scoring sprint 1 vs sprint 3 |
| **Cost per session** | < $2.00 | Cost per scenario (1 sprint). Full MVP session (3 sprints): ~$4-6. LLM API cost monitoring |
| **Agent response time (p95)** | < 8 giay | BA/Stakeholder chat response latency |
| **System uptime** | > 99% | Monitoring alerts |
| **NPS (user satisfaction)** | > 40 | Post-scenario survey |
