# Scenario Engine -- Plan Chi Tiet

---

## 1. Cau Truc Du Lieu Scenario (Schema)

```yaml
Scenario:
  id: string (UUID)
  title: string
  domain: enum [fintech, edtech, healthtech, ecommerce, saas_b2b, marketplace]
  type: enum [daily_work, unexpected_event, strategic_decision]
  difficulty: integer (1-10)
  required_po_level: integer (1-20)
  estimated_duration_minutes: integer
  tags: string[]

  context:
    product_name: string
    product_stage: enum [ideation, mvp, growth, mature]
    team_composition:
      - role: string
        personality: string
        skill_level: string
    current_sprint:
      day: integer
      velocity: integer
      committed_points: integer
    existing_backlog: BacklogItem[]
    active_metrics:
      dau: integer
      revenue_mrr: number
      nps: number
      churn_rate: number
      bug_count: integer

  trigger:
    description: string
    delivered_by: enum [slack_message, email, meeting, dashboard_alert, stakeholder_call]
    urgency: enum [low, medium, high, critical]
    attachments: Artifact[]

  decision_tree: DecisionNode

  scoring:
    dimensions:
      - name: string
        weight: float
    rubric: ScoringRubric[]

  outcomes:
    success_criteria: string
    failure_modes: string[]
    learning_objectives: string[]
```

```yaml
DecisionNode:
  id: string
  prompt: string
  decision_type: enum [prioritize, communicate, negotiate, analyze, delegate, accept_reject]
  options: Option[]
  allow_freeform: boolean
  time_pressure_seconds: integer | null
  consequences: Consequence[]

Option:
  id: string
  label: string
  is_optimal: boolean
  score_modifiers: {dimension: string, delta: float}[]
  next_node_id: string | null
  side_effects: SideEffect[]

SideEffect:
  target: enum [metric, team_morale, stakeholder_trust, technical_debt, timeline]
  operation: enum [increase, decrease, set]
  value: number
  delay_turns: integer
```

---

## 2. Cac Loai Tinh Huong

### 2.1 Daily Work (70% scenarios)


| Category                 | Vi du cu the                                                                 |
| ------------------------ | ---------------------------------------------------------------------------- |
| **Backlog grooming**     | Dev team bao 3 stories qua lon, can split truoc sprint planning              |
| **Sprint planning**      | Team co 40 story points capacity nhung stakeholder muon 55 points            |
| **Standup decisions**    | Developer bao blocked 2 ngay vi API dependency, can quyet dinh re-prioritize |
| **Stakeholder update**   | CEO hoi tien do feature X -- dang delay 1 tuan, can communicate              |
| **User feedback triage** | 15 bug reports tu CS team, can phan loai va prioritize                       |
| **Metric review**        | Conversion rate giam 12% sau release, can quyet dinh revert hay investigate  |
| **Story writing**        | Designer xong mockup, can viet acceptance criteria cho dev                   |
| **Release decision**     | 2 bugs P2 con open, co nen release hay hold?                                 |


### 2.2 Unexpected Events (20% scenarios)


| Category                | Vi du cu the                                                           |
| ----------------------- | ---------------------------------------------------------------------- |
| **Production incident** | Payment gateway down luc 2pm, 500 users affected                       |
| **Key person leaving**  | Lead developer nghi viec, 3 features dang lam do dang                  |
| **Scope creep bomb**    | VP Sales hua voi khach hang enterprise 1 feature chua co trong roadmap |
| **Competitor move**     | Doi thu launch feature giong het feature dang build                    |
| **Data breach alert**   | Security team phat hien data leak                                      |
| **Budget cut**          | Company cat 30% budget                                                 |


### 2.3 Strategic Decisions (10% scenarios)


| Category             | Vi du cu the                                                   |
| -------------------- | -------------------------------------------------------------- |
| **Build vs Buy**     | Can CRM integration: tu build 3 thang hay dung Salesforce API? |
| **Pivot proposal**   | Data cho thay user segment B co LTV gap 3 lan segment A        |
| **Tech debt payoff** | System response time tang 40%, dev xin 1 sprint refactor       |
| **Market expansion** | Co nen localize product cho thi truong VN?                     |


---

## 3. Progression System

### 3.1 PO Levels (1-20)


| Level Range | Title               | Unlock                                                                    |
| ----------- | ------------------- | ------------------------------------------------------------------------- |
| 1-3         | **Junior PO**       | Basic scenarios, 1 domain, team size 3-4                                  |
| 4-7         | **PO**              | Sprint planning, stakeholder updates, domain thu 2, unexpected events 10% |
| 8-12        | **Senior PO**       | Release decisions, negotiation, strategic decisions, unexpected 25%       |
| 13-16       | **Lead PO**         | Portfolio management, budget, hiring, multi-team                          |
| 17-20       | **Head of Product** | Company strategy, M&A, org design                                         |


### 3.2 XP & Leveling

```
XP per scenario = base_xp * difficulty_multiplier * performance_score
  base_xp: 100
  difficulty_multiplier: 1.0 + (difficulty * 0.2)   # 1.2x to 3.0x
  performance_score: 0.0 to 1.0

Level up threshold: level * 500 XP
```

### 3.3 Skill Tree (6 nhanh)


| Skill Branch       | Mo ta                        | Unlock Abilities                                   |
| ------------------ | ---------------------------- | -------------------------------------------------- |
| **Prioritization** | Sap xep backlog, trade-off   | RICE framework tool, Impact mapping                |
| **Communication**  | Stakeholder mgmt, presenting | Executive summary template, Conflict resolution    |
| **Analytics**      | Data-driven decisions        | Advanced dashboard, A/B test scenarios             |
| **Technical**      | Hieu tech trade-offs         | Architecture decision records, Tech debt scenarios |
| **Leadership**     | Team mgmt, coaching          | 1-on-1 scenarios, Team scaling scenarios           |
| **Strategy**       | Vision, roadmap              | OKR planning, Market analysis tools                |


---

## 4. Difficulty Scaling


| Dimension                      | Level 1-3            | Level 8-12                                 |
| ------------------------------ | -------------------- | ------------------------------------------ |
| So luong quyet dinh / scenario | 1-2                  | 5-8                                        |
| Time pressure                  | Khong co             | Co countdown (60s cho production incident) |
| Ambiguity                      | Ro rang, 2-3 options | Mo ho, freeform, khong co "dap an dung"    |
| Stakeholders                   | 1 (dev team)         | 3-5 (CEO, Sales, CS, Dev, Design)          |
| Competing priorities           | Khong                | 3-4 priorities xung dot                    |
| Data availability              | Day du               | Thieu, can tu hoi them                     |
| Consequences                   | Nhe, reversible      | Nang, delayed effects, cascading failures  |
| Unexpected events              | 0%                   | 25-30% chance moi session                  |


```
effective_difficulty = base_difficulty
  + stakeholder_count * 0.5
  + (1 if time_pressure else 0) * 1.0
  + ambiguity_level * 0.8
  + competing_priorities * 0.3
  + (1 if has_delayed_consequences else 0) * 0.7
```

---

## 5. Scenario Library (MVP: 50 scenarios)


| Domain                 | Daily (70%) | Unexpected (20%) | Strategic (10%) | Total  |
| ---------------------- | ----------- | ---------------- | --------------- | ------ |
| Generic / Cross-domain | 10          | 3                | 2               | **15** |
| Fintech                | 7           | 2                | 1               | **10** |
| Edtech                 | 5           | 2                | 1               | **8**  |
| E-commerce             | 5           | 2                | 1               | **8**  |
| SaaS B2B               | 5           | 1                | 1               | **7**  |
| Healthtech (stretch)   | 0           | 0                | 2               | **2**  |


- Level 1-3: 15 scenarios (du cho ~1 tuan onboarding)
- Level 4-7: 15 scenarios
- Level 8-12: 12 scenarios
- Level 13+: 8 scenarios

---

## 6. Decision Tree Model

- **Cau truc**: DAG (Directed Acyclic Graph), khong phai binary tree
- **Freeform Decisions**: AI parse intent, map vao closest option hoac tao dynamic consequence
- **Delayed Consequences**: Side effects co `delay_turns` -- quyet dinh hom nay anh huong 3 turns sau

### Vi Du Scenario Chi Tiet: sc-fintech-001

```yaml
id: "sc-fintech-001"
title: "Sprint Planning Crunch -- Payment Feature vs Security Patch"
domain: fintech
type: daily_work
difficulty: 4
required_po_level: 4
estimated_duration_minutes: 15

context:
  product_name: "PayFlow"
  product_stage: growth
  team_composition:
    - {role: backend_dev_senior, personality: "Direct, opinionated, hates context switching", skill_level: senior}
    - {role: backend_dev_junior, personality: "Eager but needs clear specs", skill_level: junior}
    - {role: frontend_dev, personality: "Creative, pushes back on tight deadlines", skill_level: mid}
    - {role: designer, personality: "User-obsessed, slow but thorough", skill_level: senior}
    - {role: qa, personality: "Detail-oriented, finds edge cases", skill_level: mid}
  current_sprint: {day: 0, velocity: 34, committed_points: 0}
  active_metrics: {dau: 12000, revenue_mrr: 85000, nps: 42, churn_rate: 0.038, bug_count: 7}

trigger:
  description: "Sprint planning bat dau. VP Sales muon Recurring Payments (13pts). Security can PCI patch (8pts). Tong = 21pts, con 13pts buffer."
  delivered_by: meeting
  urgency: high

decision_tree:
  root:
    id: "node-1"
    prompt: "Velocity 34 pts. Recurring Payments (13pts, VP Sales). PCI patch (8pts, Security/audit deadline 3 tuan). Ban chon gi?"
    decision_type: prioritize
    options:
      - {id: opt-1a, label: "Lay ca 4 items = 31pts. Over-commit.", is_optimal: false}
      - {id: opt-1b, label: "Lay PCI+Recurring+Dashboard = 29pts. Bao VP khong 100% done.", is_optimal: false}
      - {id: opt-1c, label: "Lay PCI+Recurring+Webhook = 26pts. Conservative.", is_optimal: true}
      - {id: opt-1d, label: "Hoi Senior Dev split Recurring truoc khi commit.", is_optimal: true}
    allow_freeform: true

scoring:
  dimensions:
    - {name: prioritization, weight: 0.35}
    - {name: communication, weight: 0.25}
    - {name: analytics, weight: 0.15}
    - {name: leadership, weight: 0.15}
    - {name: technical, weight: 0.10}

outcomes:
  success_criteria: "Sprint plan co PCI patch + realistic scope, stakeholders duoc communicate ro rang"
  failure_modes:
    - "Over-commit, sprint fail, team burnout"
    - "Bo PCI patch, audit failure $200k"
    - "Khong communicate voi VP Sales, trust bi mat"
  learning_objectives:
    - "Balancing urgent vs important"
    - "Communicating trade-offs to stakeholders"
    - "Using velocity data for realistic planning"
```

---

## 7. Tech Stack


| Component                 | Tech                     | Ly do                                |
| ------------------------- | ------------------------ | ------------------------------------ |
| Scenario Schema & Storage | PostgreSQL + JSONB       | Schema linh hoat, query manh         |
| Decision Tree Runtime     | TypeScript (Node.js)     | Type safety, shared voi frontend     |
| State Machine             | XState v5                | Model scenario flow, persist state   |
| AI Agent Orchestration    | Anthropic Agent SDK (TS) | Multi-agent coordination             |
| LLM for Freeform Eval     | Claude Sonnet            | Evaluate freeform PO decisions       |
| Scoring Engine            | TypeScript service       | XP, level progression                |
| Scenario Authoring        | React Flow               | Visual decision tree editor          |
| Scenario Template         | YAML + JSON Schema       | Human-readable, version-controllable |
| AI Scenario Generator     | Claude + few-shot        | Generate new scenarios tu templates  |


### Data Flow

```
[Scenario YAML] --> [Parser/Validator] --> [PostgreSQL]
                                              |
[PO starts session] --> [State Machine (XState)] <--> [AI Agents]
                              |
                        [Scoring Engine] --> [XP/Level Update]
```

### API Layer

- Framework: Hono (TypeScript)
- Real-time: WebSocket cho live agent responses
- Queue: BullMQ (Redis) cho async AI agent tasks

### MVP Priority

- P0: Scenario parser, state machine, 1 AI agent, basic scoring
- P1: Freeform evaluation, 5 agent personalities, visual editor
- P2: AI scenario generator, multiplayer, advanced analytics

---

## Tong Ket MVP


| Item                             | Target                                 |
| -------------------------------- | -------------------------------------- |
| Scenarios                        | 50 (5 domains)                         |
| Decision nodes / scenario        | 4-6 avg                                |
| PO Levels                        | 20 (MVP test level 1-10)               |
| Skill branches                   | 6                                      |
| AI Agent roles                   | 5 (BA, Designer, Dev, Stakeholder, QA) |
| Scoring dimensions               | 6                                      |
| Estimated dev time (engine only) | 8-10 weeks / 2 engineers               |


