# PO Simulation Platform

> "Flight simulator for Product Owners" — Virtual training environment where POs practice real product decisions with AI teammates.

## 🎯 Project Status

**Phase 1 — Foundation: ~60% Complete**

### ✅ Completed
- ✅ Turborepo monorepo setup
- ✅ Shared TypeScript types (agent contracts + scenario types)
- ✅ Drizzle ORM schema (PostgreSQL + JSONB)
- ✅ Scenario YAML parser with Zod validation
- ✅ XState v5 session state machine
- ✅ Orchestrator API (Hono REST endpoints)
- ✅ Docker Compose (PostgreSQL 16 + Redis 7)
- ✅ Test scenario file

### 🔨 In Progress
- BA Agent skeleton with Claude API
- BullMQ job queue setup
- Database integration

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- npm 10+

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL + Redis
docker compose up -d

# Check containers are running
docker compose ps
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 4. Run Database Migrations

```bash
cd packages/db
npm run db:generate
npm run db:migrate
```

### 5. Start Orchestrator (Dev Mode)

```bash
cd apps/orchestrator
npm run dev
```

The orchestrator will start on `http://localhost:3001`

---

## 🧪 Testing the Orchestrator

### Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "orchestrator"
}
```

### Create a Session

```bash
curl -X POST http://localhost:3001/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "scenarioId": "550e8400-e29b-41d4-a716-446655440001"
  }'
```

Expected response:
```json
{
  "sessionId": "abc-123-def",
  "userId": "user-123",
  "scenarioId": "550e8400-e29b-41d4-a716-446655440001",
  "state": "loadingScenario"
}
```

### Get Session State

```bash
curl http://localhost:3001/sessions/{sessionId}
```

### Make a Decision

```bash
curl -X POST http://localhost:3001/sessions/{sessionId}/decisions \
  -H "Content-Type: application/json" \
  -d '{
    "optionId": "opt_3",
    "timeTaken": 45
  }'
```

### List Active Sessions

```bash
curl http://localhost:3001/sessions
```

---

## 📁 Project Structure

```
po-simulation-platform/
├── apps/
│   └── orchestrator/          # ✅ Session manager + XState + Hono API
│       ├── src/
│       │   ├── state-machine/ # XState v5 state machine
│       │   ├── services/      # Session manager
│       │   ├── routes/        # Hono REST API
│       │   └── index.ts       # Entry point
│       └── package.json
│
├── packages/
│   ├── shared/                # ✅ Shared types + utilities
│   │   ├── src/
│   │   │   ├── types/         # TypeScript interfaces
│   │   │   ├── schemas/       # Zod validation schemas
│   │   │   └── utils/         # Scenario parser
│   │   └── package.json
│   │
│   └── db/                    # ✅ Database layer
│       ├── src/
│       │   ├── schema.ts      # Drizzle ORM schema
│       │   ├── index.ts       # DB client
│       │   └── migrate.ts     # Migration runner
│       └── package.json
│
├── scenarios/                 # ✅ YAML scenario files
│   └── sprint-planning-capacity.yaml
│
├── docs/                      # ✅ Architecture documentation
│   ├── MASTER-PLAN.md
│   ├── ai-agent-orchestration-plan.md
│   ├── scenario-engine-plan.md
│   ├── metrics-coaching-plan.md
│   └── ux-plan.md
│
├── docker-compose.yml         # ✅ PostgreSQL + Redis
├── .env.example               # ✅ Environment template
└── turbo.json                 # ✅ Turborepo config
```

---

## 🏗️ Architecture Overview

### Core Pattern: Hybrid Orchestrator + Event-Driven

```
PO Interface (User)
        ↓
   Orchestrator (XState v5)
        ↓
   ┌────┴────┬────────┬────────┐
   ↓         ↓        ↓        ↓
Event Bus  Task Queue  State   Cache
(Redis)    (BullMQ)   (Postgres) (Redis)
   ↓
AI Agents (BA, Designer, Dev, Stakeholder, Customer)
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + Tailwind + Zustand (PWA) |
| Backend | Hono (TypeScript) |
| Real-time | WebSocket + SSE |
| Database | PostgreSQL 16 + JSONB |
| Cache | Redis 7 |
| ORM | Drizzle ORM |
| Task Queue | BullMQ |
| State Machine | XState v5 |
| LLM | Claude Sonnet 4.6 + Haiku 4.5 |
| Monorepo | Turborepo |

---

## 📚 Documentation

- [Master Plan](./docs/MASTER-PLAN.md) — Vision, tech stack, roadmap
- [AI Agent Orchestration](./docs/ai-agent-orchestration-plan.md) — Agent contracts, flow
- [Scenario Engine](./docs/scenario-engine-plan.md) — YAML schema, decision trees
- [Metrics & Coaching](./docs/metrics-coaching-plan.md) — Scoring, impact mapping
- [UX Plan](./docs/ux-plan.md) — UI layout, daily workflow

---

## 🔧 Development Commands

```bash
# Install all dependencies
npm install

# Start all services in dev mode
npm run dev

# Build all packages
npm run build

# Run linting
npm run lint

# Run tests
npm run test

# Database commands
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
```

---

## 🎯 Next Steps

1. **BA Agent Implementation** — First working agent with Claude API
2. **BullMQ Setup** — Job queue for agent tasks
3. **Database Integration** — Load scenarios, persist sessions
4. **End-to-End Test** — Complete flow from scenario load to decision

---

## 📝 License

MIT

---

## 🤝 Contributing

This is a planning/prototype phase project. Implementation is in progress.
