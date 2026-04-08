# Metrics, Output & Coaching System — Detailed Plan

## 1. "Real Output" Definition

### App được deploy dạng gì?

**Dạng output: Progressive Web App (PWA) deployed trên subdomain duy nhất per simulation.**

```
https://{simulation-id}.posim.app
```

| Giai đoạn Sprint | Output dạng | Ví dụ |
|---|---|---|
| Sprint 1-2 | Static landing + core flow | Single-page app với signup/onboarding flow |
| Sprint 3-4 | Functional prototype | App có 2-3 features hoạt động thật, có DB |
| Sprint 5+ | Iterative product | Feature mới được thêm dựa trên PO decisions |

**Deploy stack:**
- **Build:** Dev agent dùng Codex CLI / Claude CLI tạo code thật (Next.js / Remix)
- **Deploy:** Auto-deploy lên Vercel/Cloudflare Pages per commit
- **Database:** Turso (SQLite edge) hoặc Supabase — lightweight, free tier đủ dùng
- **URL thật:** Mỗi simulation có URL public, PO có thể share cho người khác xem

**Tại sao PWA chứ không phải prototype/Figma:**
- Figma prototype không thu được usage metrics thật
- PWA cho phép synthetic users "dùng" app qua headless browser
- PO thấy product thật, không phải mockup — tăng tính immersive

---

## 2. Simulated Users System

> **⚠️ Phase 1 vs Phase 2 Note:**
> Phase 1 uses a pure model-based approach — **no Playwright**. Metrics are **calculated** from decision modifiers using LLM reasoning, not measured from real browser sessions. The full synthetic user system described in this section is a **Phase 2 vision** to validate the Phase 1 model against real behavior.

### Architecture

```
┌─────────────────────────────────────────────┐
│           Synthetic User Engine              │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Persona  │  │ Behavior │  │ Session   │  │
│  │ Generator│→ │ Model    │→ │ Simulator │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│       ↑                            │        │
│  PO decisions                 Playwright    │
│  influence                    headless      │
│  personas                     browser       │
└─────────────────────────────────────────────┘
```

### Persona Generation

Mỗi simulation tạo **cohort 200-500 synthetic users** với distribution thực tế:

```typescript
interface SyntheticUser {
  id: string;
  persona: {
    archetype: "early_adopter" | "mainstream" | "skeptic" | "power_user" | "casual";
    tech_savviness: number;      // 1-10
    patience_threshold: number;  // seconds before bounce
    feature_discovery_rate: number; // probability of finding non-obvious features
    retention_baseline: number;  // base probability of returning
  };
  context: {
    acquisition_channel: "organic" | "referral" | "paid" | "social";
    device: "mobile" | "desktop";
    time_zone: string;
    usage_window: "morning" | "afternoon" | "evening";
  };
}
```

**Distribution mặc định (fintech scenario):**
- 15% early adopters (khám phá mọi feature)
- 40% mainstream (dùng happy path)
- 20% skeptics (bounce nhanh nếu UX kém)
- 10% power users (dùng nhiều, report bugs)
- 15% casual (vào xem rồi quên)

### Behavior Model — Cách PO decisions ảnh hưởng user behavior

Mỗi PO decision có **modifier set** áp dụng lên synthetic users:

```typescript
interface DecisionImpact {
  decision_id: string;
  modifiers: {
    // Ví dụ: PO quyết định bỏ onboarding tutorial
    acquisition_conversion: number;  // -0.15 (ít người hoàn thành signup)
    d1_retention: number;            // -0.20 (confused users không quay lại)
    feature_discovery: number;       // -0.30 (không biết feature ở đâu)
    power_user_satisfaction: number; // +0.10 (power users thích skip tutorial)
    time_to_value: number;           // +2.0 (thêm 2 phút để hiểu app)
  };
  affected_personas: string[];       // ["mainstream", "skeptic"] — most affected
  delay_sprints: number;             // 0 = immediate, 2 = shows after 2 sprints
}
```

### Session Simulation (Phase 2 Vision)

> **This section describes Phase 2 only.** In Phase 1, session simulation is replaced by model-based calculation (see Section 3).

In Phase 2, synthetic users "dùng" app thật qua **Playwright headless browser:**

1. Playwright navigate tới deployed app URL
2. Thực hiện actions theo persona behavior model
3. Record: pages visited, clicks, time on page, bounce point
4. Data ghi vào analytics DB giống real analytics

**Tần suất:** Chạy simulation batch sau mỗi sprint (hoặc sau mỗi deploy mới).

---

## 3. Metrics System

### Core Metrics

| Metric | Cách tính | Source |
|---|---|---|
| **Signup Conversion** | completed_signups / landing_visits | Session simulator |
| **Activation Rate** | users_completed_core_action / signups | Session simulator |
| **D1 Retention** | users_return_day1 / activated_users | Persona retention model |
| **D7 Retention** | users_return_day7 / activated_users | Persona retention model |
| **D30 Retention** | users_return_day30 / activated_users | Persona retention model |
| **Feature Adoption** | users_using_feature_X / active_users | Session simulator |
| **Time to Value** | avg_seconds_to_first_core_action | Session simulator |
| **NPS (simulated)** | Weighted score from persona satisfaction | Satisfaction model |
| **Churn Rate** | users_stopped_returning / total_active | Retention model |
| **Revenue Proxy** | active_users * conversion_rate * ARPU | Composite model |

### Retention Calculation Model

```python
def calculate_retention(user: SyntheticUser, sprint: int, decisions: list[Decision]) -> float:
    base = user.persona.retention_baseline  # e.g., 0.40 for mainstream

    # Apply cumulative decision modifiers
    for decision in decisions:
        if sprint >= decision.made_at_sprint + decision.delay_sprints:
            if user.persona.archetype in decision.affected_personas:
                base += decision.modifiers.get(f"d{days}_retention", 0)

    # Apply natural decay curve
    decay = 0.85 ** (sprint - 1)  # Natural retention decay per sprint

    # Clamp to realistic range
    return max(0.02, min(0.95, base * decay))
```

### Metrics Dashboard Data Structure

```typescript
interface SprintMetrics {
  sprint_number: number;
  date_range: { start: string; end: string };
  cohort_size: number;

  acquisition: {
    total_visits: number;
    signups: number;
    conversion_rate: number;
    by_channel: Record<string, number>;
  };

  activation: {
    activated_users: number;
    activation_rate: number;
    avg_time_to_value_seconds: number;
  };

  retention: {
    d1: number;
    d7: number;
    d30: number;
    retention_curve: number[];  // day-by-day
  };

  engagement: {
    dau: number;
    wau: number;
    mau: number;
    avg_session_duration: number;
    features_used: Record<string, { adoption_rate: number; frequency: number }>;
  };

  decisions_this_sprint: string[];
  metric_changes: Array<{
    metric: string;
    previous: number;
    current: number;
    delta: number;
    attributed_to: string[];  // decision IDs
  }>;
}
```

---

## 4. Causal Mapping: Decision -> Impact Model

### Decision Categories & Impact Chains

```yaml
decision_categories:
  - name: "feature_prioritization"
    examples:
      - "Add social login"
      - "Build notification system"
      - "Add dark mode"
    primary_metrics: ["feature_adoption", "activation_rate", "retention"]

  - name: "ux_design"
    examples:
      - "Remove onboarding flow"
      - "Simplify navigation to 3 tabs"
      - "Add loading skeletons"
    primary_metrics: ["time_to_value", "activation_rate", "bounce_rate"]

  - name: "technical_debt"
    examples:
      - "Refactor auth system"
      - "Migrate database"
    primary_metrics: ["reliability_score", "page_load_time"]
    delay_sprints: 1-2

  - name: "growth_strategy"
    examples:
      - "Add referral program"
      - "Implement freemium model"
    primary_metrics: ["acquisition", "conversion", "revenue_proxy"]

  - name: "scope_management"
    examples:
      - "Cut feature X from sprint"
      - "Extend deadline by 1 sprint"
    primary_metrics: ["feature_completeness", "user_satisfaction"]
```

### Impact Calculation Engine

```typescript
interface CausalChain {
  decision: string;
  direct_effects: Effect[];
  indirect_effects: Effect[];
  timeline: "immediate" | "next_sprint" | "gradual";
}

interface Effect {
  metric: string;
  direction: "positive" | "negative";
  magnitude: number;        // -1.0 to 1.0
  confidence: number;       // how certain this effect is
  affected_segments: string[]; // which user personas
  explanation: string;       // human-readable why
}
```

### Ví dụ cụ thể: 1 Decision -> Full Impact Chain

**Scenario:** PO trong fintech simulation quyết định **"Bỏ email verification, cho user dùng app ngay sau signup"**

```
DECISION: Skip email verification at signup
Category: ux_design + scope_management
Sprint: 3

DIRECT EFFECTS (immediate):
├── Signup conversion: +18%
│   Why: Friction giảm, users không cần check email
│   Affected: ALL personas, đặc biệt skeptics (+25%)
│
├── Time to value: -45 seconds
│   Why: Bỏ bước verify → vào app nhanh hơn
│   Affected: ALL
│
└── Activation rate: +12%
    Why: Nhiều user hơn reach core action vì không drop off ở verify step
    Affected: mainstream, casual

INDIRECT EFFECTS (next sprint):
├── Spam/fake accounts: +30%
│   Why: Không có email verify → bots và fake signups
│   Impact on metrics: DAU inflated, engagement/user giảm
│
├── D7 retention: -8%
│   Why: Fake accounts don't return + some real users
│   forgot which app (no email reminder)
│   Affected: casual, mainstream
│
├── Email re-engagement impossible: -15% on D30 retention
│   Why: Không có verified email → không gửi được
│   win-back campaigns
│   Affected: ALL churned users
│
└── Trust perception: -10% NPS for power_users
    Why: Power users thấy thiếu security → giảm trust

COACHING TRIGGER:
  Type: async_report (sprint retrospective)
  Message: "Signup conversion tăng 18% — tốt! Nhưng D7 retention
  giảm 8% và bạn mất khả năng email re-engagement. Đây là
  trade-off kinh điển giữa activation friction và long-term
  retention. Gợi ý: Thêm 'soft verification' — cho dùng ngay
  nhưng nhắc verify sau 24h để unlock full features."

SKILL TAG: #activation-vs-retention #growth-tradeoffs
```

### Causal Graph Storage

```typescript
// Mỗi simulation maintain 1 causal graph
interface CausalGraph {
  nodes: Array<{
    id: string;
    type: "decision" | "metric" | "user_segment";
    sprint: number;
    value: number;
  }>;
  edges: Array<{
    from: string;
    to: string;
    weight: number;      // -1.0 to 1.0
    delay_sprints: number;
    explanation: string;
  }>;
}
```

AI agent (LLM) tính toán impact dựa trên:
1. Decision category → lookup baseline modifiers
2. Current app state (features đã có, technical debt)
3. Historical patterns từ product management literature
4. Interaction effects giữa multiple decisions

---

## 5. Coaching Engine

### Trigger System

```typescript
type CoachingTrigger =
  | { type: "realtime"; event: "decision_made"; decision_id: string }
  | { type: "realtime"; event: "metric_anomaly"; metric: string; threshold: number }
  | { type: "async"; event: "sprint_complete"; sprint: number }
  | { type: "async"; event: "milestone_reached"; milestone: string }
  | { type: "proactive"; event: "skill_gap_detected"; skill: string };
```

### Khi nào trigger feedback?

| Trigger | Timing | Format |
|---|---|---|
| PO vừa ra 1 quyết định | Real-time (< 5s) | Quick insight card |
| Metric drop > 10% so với sprint trước | Real-time notification | Alert + explanation |
| Sprint kết thúc | Async (end of sprint) | Full retrospective report |
| PO lặp lại cùng 1 sai lầm | Real-time warning | Pattern recognition alert |
| PO đạt milestone | Async | Achievement + next challenge |
| PO inactive > 2 sprints | Proactive nudge | "Here's what happened to your product..." |

### Feedback Formats

**1. Quick Insight Card (real-time, sau mỗi decision)**

```markdown
┌─────────────────────────────────────────┐
│ 📊 Decision Impact Preview              │
│                                         │
│ "Bỏ email verification"                │
│                                         │
│ Expected impact:                        │
│  ↑ Signup conversion: +15-20%          │
│  ↑ Activation: +10-15%                 │
│  ↓ D7 Retention: -5-10%               │
│  ⚠ Email re-engagement: disabled       │
│                                         │
│ Similar decisions in real products:     │
│  • Slack initially skipped verification │
│    → reversed after spam wave           │
│                                         │
│ [Proceed] [Reconsider] [Learn more]    │
└─────────────────────────────────────────┘
```

**2. Metric Anomaly Alert**

```markdown
⚠️ D7 Retention dropped from 32% → 24%

Root cause analysis:
- 60% attributed to: "Removed onboarding tutorial" (Sprint 2)
- 25% attributed to: "Skipped email verification" (Sprint 3)
- 15%: Natural cohort decay

Recommendation: Consider adding progressive onboarding
(show tips on first 3 sessions, not a blocking tutorial)
```

**3. Sprint Retrospective (chi tiết ở Section 7)**

### Coaching Tone & Approach

```typescript
interface CoachingConfig {
  style: "socratic" | "directive" | "collaborative";
  // socratic: Hỏi PO tại sao ra quyết định, gợi ý suy nghĩ
  // directive: Nói thẳng nên làm gì (cho beginner)
  // collaborative: Đưa options, để PO chọn

  difficulty_adaptation: boolean;
  // true → coaching khó hơn khi PO improve

  real_world_references: boolean;
  // true → cite real product cases (Slack, Spotify, etc.)
}
```

---

## 6. PO Progress Tracking — Skill Matrix

> **📦 MVP Scope (Phase 1):**
> - **Included:** Basic metrics calculation, decision → impact modifier mapping, sprint retrospective report, real-time coaching cards
> - **Phase 2/3 items:** Playwright session simulation (Section 2), skill matrix tracking, adaptive difficulty, causal graph visualization

### Skill Taxonomy

```yaml
skill_matrix:
  discovery:
    - name: "Problem identification"
      indicators: ["Asks user research questions to BA", "Validates assumptions before building"]
    - name: "Market awareness"
      indicators: ["Considers competitors in decisions", "Identifies differentiation"]

  prioritization:
    - name: "Impact vs effort assessment"
      indicators: ["Correctly estimates feature ROI", "Uses frameworks like RICE/ICE"]
    - name: "Scope management"
      indicators: ["Says no to low-impact features", "Manages stakeholder expectations"]
    - name: "Trade-off reasoning"
      indicators: ["Articulates why X over Y", "Considers long-term vs short-term"]

  execution:
    - name: "Sprint planning"
      indicators: ["Appropriate sprint scope", "Clear acceptance criteria"]
    - name: "Stakeholder communication"
      indicators: ["Proactive updates", "Manages conflicting requests"]

  analytics:
    - name: "Metric literacy"
      indicators: ["Tracks right metrics", "Understands leading vs lagging"]
    - name: "Data-driven decisions"
      indicators: ["References metrics when deciding", "Sets measurable goals"]
    - name: "Causal reasoning"
      indicators: ["Links decisions to outcomes", "Avoids vanity metrics"]

  growth:
    - name: "Activation optimization"
      indicators: ["Reduces time to value", "Improves onboarding"]
    - name: "Retention thinking"
      indicators: ["Considers long-term engagement", "Builds habit loops"]
```

### Scoring Model

```typescript
interface SkillScore {
  skill: string;
  level: 1 | 2 | 3 | 4 | 5;
  // 1: Unaware — makes decisions without considering this
  // 2: Aware — mentions but doesn't act on it
  // 3: Practicing — actively tries, sometimes misses
  // 4: Competent — consistently good decisions
  // 5: Expert — teaches others, handles edge cases

  evidence: Array<{
    sprint: number;
    decision: string;
    score_delta: number;
    reason: string;
  }>;

  trend: "improving" | "stable" | "declining";
}
```

### Progress Tracking Over Time

```typescript
interface POProfile {
  user_id: string;
  simulations_completed: number;
  current_simulation: string;

  skill_scores: Record<string, SkillScore>;

  strengths: string[];     // Top 3 skills
  growth_areas: string[];  // Bottom 3 skills

  patterns: Array<{
    pattern: string;          // "Tends to over-scope sprints"
    frequency: number;        // How often observed
    improving: boolean;       // Getting better?
    last_seen: string;        // Sprint/date
  }>;

  milestones: Array<{
    name: string;             // "First successful pivot"
    achieved_at: string;
    simulation: string;
  }>;
}
```

### Adaptive Difficulty

Khi PO improve, hệ thống tự động:
- Tăng số synthetic users (bigger scale = harder decisions)
- Thêm stakeholder conflicts (CEO muốn feature A, data shows feature B)
- Introduce market events (competitor launches similar feature)
- Tighter budget constraints
- More ambiguous user feedback

---

## 7. Report Format — Sprint Retrospective

> **⏱ Career Mode Time Model:**
> 1 scenario = 1 sprint. The PO fast-forwards through uneventful days (compressed, no decisions) and the simulation **stops at event-day checkpoints** — moments with decisions, stakeholder conflicts, or metric changes. This keeps sessions focused (~15 min real-time per sprint) while preserving the rhythm of a real sprint cycle.

### Auto-generated sau mỗi sprint

```markdown
# Sprint 3 Retrospective — FinTrack App
## Simulation: "Day 1 PO at Fintech Startup"

### Sprint Summary
- Duration: ~15 minutes real-time (simulated 2-week sprint)
- Decisions made: 4
- Features shipped: 2 (Social login, Transaction categorization)
- Features deferred: 1 (Push notifications → Sprint 4)

---

### Metrics Dashboard

| Metric | Sprint 2 | Sprint 3 | Delta | Trend |
|---|---|---|---|---|
| Total Users | 245 | 312 | +27% | ▲ |
| Signup Conversion | 34% | 52% | +18pp | ▲▲ |
| Activation Rate | 28% | 40% | +12pp | ▲ |
| D1 Retention | 45% | 42% | -3pp | ▽ |
| D7 Retention | 32% | 24% | -8pp | ▼ |
| Avg Session Duration | 4.2min | 3.8min | -0.4min | ▽ |
| Feature: Social Login | — | 68% adoption | NEW | — |
| Feature: Categorization | — | 23% adoption | NEW | — |

---

### Decision Analysis

#### Decision 1: "Add social login (Google/Apple)"
- Impact: Signup conversion +18pp (primary driver)
- Score: ★★★★☆ — Strong decision, directly addressed biggest drop-off
- Skill demonstrated: **Activation optimization** (Level 3 → 4)

#### Decision 2: "Skip email verification"
- Impact: Signup +4pp, but D7 retention -8pp
- Score: ★★☆☆☆ — Short-term gain, long-term cost
- Skill gap: **Trade-off reasoning** (Level 2)
- Coaching: "Bạn tối ưu conversion nhưng sacrifice retention
  channel. Trong real product, đây là lỗi phổ biến sprint 1-3
  khi PO quá focus vào top-of-funnel."

#### Decision 3: "Defer push notifications to Sprint 4"
- Impact: Neutral this sprint, D7 retention could improve next sprint
- Score: ★★★☆☆ — Reasonable scope management
- Skill demonstrated: **Scope management** (Level 3)

#### Decision 4: "Prioritize transaction categorization over budgeting"
- Impact: 23% adoption (moderate), engagement neutral
- Score: ★★★☆☆ — Decent but based on assumption, not data
- Coaching: "Bạn không hỏi BA về user research trước khi chọn.
  Power users muốn budgeting (từ Sprint 2 feedback). Gợi ý:
  luôn check qualitative data trước khi prioritize."

---

### Skills Progress

```text
Discovery:        ██████░░░░ 3/5 (stable)
Prioritization:   ████░░░░░░ 2/5 (↑ from 1)
Execution:        ██████░░░░ 3/5 (stable)
Analytics:        ████░░░░░░ 2/5 (stable)
Growth:           ████████░░ 4/5 (↑ from 3)
```

### Key Patterns Detected
1. **Bias toward acquisition over retention** — 3 of 4 decisions
   this sprint optimized for new users, not existing ones
2. **Gut over data** — 2 decisions made without consulting
   available user research/metrics

---

### Recommendations for Sprint 4

1. **Must do:** Add email verification (soft — verify within 24h
   to unlock full features). This recovers your re-engagement channel.

2. **Should do:** Implement push notifications (already deferred).
   D7 retention is your biggest gap — push is the fastest lever.

3. **Consider:** Before picking features, ask the BA agent
   "What are the top 3 user complaints?" — build the habit of
   data-informed prioritization.

4. **Challenge:** Try to improve D7 retention by 5pp WITHOUT
   sacrificing signup conversion. This is the real PO skill test.

---

### Learning Moment

> "Trong real-world product management, Sprint 3 là lúc nhiều PO
> mới mắc 'growth trap' — chase vanity metrics (signups) mà quên
> retention. Spotify từng có phase tương tự khi họ optimize
> trial-to-paid conversion nhưng monthly churn tăng. Bài học: top
> of funnel dễ đo, bottom of funnel mới là business."
```

---

## Implementation Priority

| Component | Priority | Complexity | MVP? |
|---|---|---|---|
| Basic metrics calculation from decisions | P0 | Low | Yes |
| Decision → impact modifier mapping | P0 | Medium | Yes |
| Sprint retrospective report | P0 | Medium | Yes |
| Synthetic user personas | P1 | Medium | Yes |
| Playwright session simulation | P1 | High | No (Phase 2) |
| Real-time coaching cards | P1 | Medium | Yes |
| Skill matrix tracking | P2 | Medium | No |
| Adaptive difficulty | P2 | High | No |
| Causal graph visualization | P3 | High | No |

### MVP Approach (Phase 1)

Cho MVP, **KHÔNG cần Playwright simulation**. Thay vào đó:
- Synthetic users là **pure model** — LLM tính behavior dựa trên decision modifiers
- Metrics được **calculated**, không phải measured từ real sessions
- Vẫn deploy app thật (để PO thấy output), nhưng metrics đến từ model

Phase 2 mới thêm Playwright để validate model vs real behavior.

> **💰 LLM Cost Clarification:**
> Target cost is **< $2.00 per scenario** (1 sprint, ~15 min). A full session of 3 sprints runs ~$4–6. Cost control achieved via: model tiering (Haiku for simple agents like Stakeholder/Customer; Sonnet only for BA/Designer/Dev), and prompt caching targeting 90% input cost reduction. Free tier capped at 3 sessions/day.

---

## Data Flow Summary

```
PO makes decision
    ↓
Decision classifier (LLM) → categorize + extract intent
    ↓
Impact engine → lookup base modifiers + adjust for context
    ↓
Synthetic user engine → recalculate behavior for each persona
    ↓
Metrics aggregator → compute sprint metrics
    ↓
Coaching engine → check triggers → generate feedback
    ↓
Report generator → sprint retrospective
    ↓
Skill tracker → update PO profile
```
