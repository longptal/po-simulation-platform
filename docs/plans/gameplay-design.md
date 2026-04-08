# Gameplay Design — Approved v3

**Approved:** 2026-04-07 (revised sau research 10+ narrative simulation games)
**Research base:** Papers Please, Reigns, This War of Mine, Disco Elysium, Orwell, 80 Days, Lifeline, Simulacra, Her Story, Game Dev Tycoon
**Game Genre:** Narrative Simulation — scripted arc + AI dialogue + cumulative micro-decisions

---

## Core Design Principle

> "If everything is possible, nothing is meaningful." — Management Simulator Design Theory

Gameplay không phải về 3-4 pivot decisions lớn. Gameplay là **27-45 micro-decisions tích lũy** qua 9 ngày, mỗi cái có asymmetric tradeoff thật sự, hậu quả delay 1-2 sprints, và endings xuất từ **pattern hành xử** chứ không phải từ "bạn chọn path nào".

---

## Resource System (Reigns Model)

6 metrics hoạt động trong "survival band" — cả quá cao lẫn quá thấp đều nguy hiểm:

```
┌─────────────────────────────────────────────────┐
│  NPS Score         [====●==========] 42/100     │
│  Team Morale       [=========●=====] 68/100     │
│  Stakeholder Trust [====●==========] 35/100     │
│  Technical Debt    [===========●===] 72/100     │ ← nguy hiểm nếu > 80
│  Delivery Velocity [=======●=======] 52/100     │
│  Product Quality   [========●======] 58/100     │
└─────────────────────────────────────────────────┘
```

- Mỗi decision làm tăng 1-2 metrics và giảm 1-2 metrics khác
- **Không có đáp án đúng** — mọi lựa chọn đều có cost thật
- Extremes unlock **crisis events**: Tech Debt > 80 → "architecture breakdown sprint"; Team Morale < 20 → "key engineer resignation"
- Threshold values defined trong scenario YAML, không hardcode

---

## Micro-Decision Structure (Papers Please Model)

**Không có "pivot moment" rõ ràng.** Mỗi ngày có 3-5 decisions nhỏ. Player không biết quyết định nào là "quan trọng nhất" cho đến khi thấy consequences.

```
Event-day Checkpoint = 1 PO decision moment (thường kèm agent interaction)
  [Context] BA Minh gửi spec draft — PO cần phản hồi
  [Choices]
    A. "Approve ngay" → Velocity +8, Quality -5 (thiếu review time)
    B. "Review kỹ, feedback chi tiết" → Quality +10, Velocity -8, Morale+BA +3
    C. "Schedule review meeting sáng mai" → Delay +1 checkpoint, nhưng align team
    D. "Delegate cho Dev Lead review" → Velocity neutral, nhưng nếu Dev Lead overload → Morale -5

Ngày không có event = auto-skipped (Career Mode fast-forward)
```

**Tổng cộng:** 9 event-day checkpoints × ~3 decisions = ~27 decisions nhỏ trong 1 session (3 sprints)

---

## Consequence Delay (This War of Mine + Lifeline Model)

**Hậu quả KHÔNG xuất hiện ngay.** Player phải commit mà không biết full impact.

```
Checkpoint 2 (Day 3): Approve spec nhanh không review kỹ
  → Checkpoint 3 (Day 5): Không có gì xảy ra (false sense of success)
  → Checkpoint 5 (Day 9): Customer report bug từ edge case thiếu AC
  → Checkpoint 7 (Day 13): Tech Debt +15, NPS -8, stakeholder trust -5
  → Checkpoint 9 (Day 16): "Vì sao sản phẩm có nhiều bug?" — trong Sprint Retro
```

Rules:
- Positive consequences delay 1 turn (player không ngay lập tức biết mình đúng)
- Negative consequences delay 2-3 turns (player có thể không nhớ quyết định nào gây ra)
- **Sprint Retro** là lúc player thấy chuỗi nhân quả đầy đủ — đây là learning moment

---

## Information-Gating (Orwell Model)

Trước một số decisions, player có thể chọn **đầu tư thời gian thu thập context** trước khi quyết định:

```
Tình huống: Stakeholder Lan muốn thêm feature "loyalty points" vào sprint này

Option A — Quyết ngay:
  → Chỉ có 2 lựa chọn: Đồng ý / Từ chối

Option B — Thu thập thêm (mất 0.5 ngày):
  → Đọc customer feedback data → unlock option "Propose phased approach"
  → Hỏi Dev Lead → unlock option "Counter-propose simpler alternative"
  → Review competitor analysis → unlock option "De-prioritize vì competitors không làm"
```

Mechanic này dạy kỹ năng PM thật: **biết khi nào có đủ data để quyết định**. Quyết vội không phải lúc nào cũng tệ — đôi khi speed quan trọng hơn perfect information.

---

## Stat-Gating (Disco Elysium Model)

Một số options chỉ xuất hiện nếu player đã build đủ "relationship capital" hoặc tránh được specific failure states:

```
"Negotiate timeline với stakeholder"
  → Chỉ available nếu Stakeholder Trust > 50

"Push back on unrealistic sprint scope"
  → Chỉ available nếu đã deliver sprint trước đúng hạn (Delivery record clean)

"Rally team qua crisis"
  → Chỉ available nếu Team Morale > 60

"Escalate lên CTO"
  → Chỉ available 1 lần per scenario (dùng rồi là hết — political capital)
```

Điều này tạo ra **replay value**: lần 2 chơi, player build stats khác nhau và thấy options mới.

---

## NPC Autonomy (Lifeline Model)

Teammates đôi khi **bỏ qua quyết định của player** và tự hành động dựa trên relationship score:

```
Nếu Team Morale < 35:
  → Dev Hùng tự merge một hotfix mà không hỏi → tạo conflict với Feature X đang làm
  → BA Minh bỏ qua buổi sprint planning ("cảm thấy không được lắng nghe")

Nếu Stakeholder Trust < 25:
  → Stakeholder Lan email thẳng lên CEO, bypass PO
  → Tạo crisis event: "Executive review yêu cầu"

Nếu Product Quality < 30:
  → Customer complaint viral trên social media — không có warning
```

NPCs không phải công cụ phục tùng — họ có agency. Player học cách **influence, không phải control**.

---

## Act 0 — Onboarding (Hard Gate)

### Tài liệu sản phẩm
Player đọc (có thể tham khảo lại bất cứ lúc nào trong game):
- Product brief: ShopMate — e-commerce app đang ở growth stage
- Current metrics dashboard (DAU 45k, NPS 38, churn 6.2%, MRR $120k)
- Team bios với personality hints (BA Minh: thorough nhưng slow; Stakeholder Lan: impatient; Dev Hùng: quality-focused)
- Backlog snapshot (23 items, mix of features/bugs/tech debt)
- 2 competitor moves trong 30 ngày qua

### Quiz (Hard Gate — 5 câu, pass ≥ 4)
Đánh giá comprehension, không phải memory test:
- "Đâu là metric quan trọng nhất với Stakeholder Lan theo tài liệu?" (NPS — cô ấy nói rõ trong brief)
- "Dev Hùng có concern gì về codebase hiện tại?" (tech debt từ sprint trước)
- Fail → tài liệu vẫn visible, retry với câu hỏi shuffle

---

## Cấu Trúc 3 Sprints × Event-Day Checkpoints (Career Mode)

**Time model: Không phải đi qua tất cả 9 ngày.** Tương tự Career Mode trong game bóng đá — PO fast-forward qua những ngày không có sự kiện, chỉ **dừng lại** ở những ngày có quyết định quan trọng hoặc sự kiện bất ngờ.

Một scenario (1 sprint = 2 tuần sim) bao gồm:
- ~9 simulated days nhưng PO chỉ tương tác tại **4-6 event-day checkpoints**
- Mỗi checkpoint = 1 ngày có sự kiện/quyết định cần xử lý
- Các ngày không có event tự động skip (1 phút thực ≈ 2-3 simulated days)

```
Sprint 1 — Survive (stakes thấp, consequences nhẹ):
  Checkpoint 1: Sprint Planning. 2-3 decisions.
  Checkpoint 2: [Day 3] First BA deliverable + stakeholder ping. 2-3 decisions.
  Checkpoint 3: [Day 5] Sprint Review + Retro. Consequences hiện ra. 2-3 decisions.

Sprint 2 — Grow (stakes tăng, NPC autonomy bắt đầu):
  Checkpoint 4: [Day 7] Competitor news + stakeholder escalation. 3-4 decisions.
  Checkpoint 5: [Day 9] Mid-sprint crisis (1 trong 3 scripted). 2-3 decisions.
  Checkpoint 6: [Day 11] Sprint Review. Consequences từ sprint 1 fully manifest. 2-3 decisions.

Sprint 3 — Thrive hoặc Survive (multi-front pressure):
  Checkpoint 7: [Day 13] Board meeting prep + team morale check. 3-4 decisions.
  Checkpoint 8: [Day 15] Climax day — unresolved threads converge. 3-4 decisions.
  Checkpoint 9: [Day 16] Final sprint + ending trigger. 2-3 decisions.
```

**Tổng cộng: 9 checkpoints × ~3 decisions = ~27 decisions nhỏ trong 1 session (3 sprints)**
Real-time: ~25-40 phút cho toàn bộ session.

---

## Endings System (Cumulative Pattern, không phải Path)

### 4 Scoring Dimensions (tích lũy qua toàn bộ 27-45 decisions)
- **Prioritization:** Bạn có chọn đúng việc để làm không?
- **Communication:** Bạn communicate với team/stakeholder như thế nào?
- **Analytics:** Bạn dựa vào data hay gut feeling?
- **Stakeholder Management:** Bạn balance được expectations không?

### 6 Endings (determined by dimension profile, không phải single decisions)

| Ending | Dimension Profile | Narrative Arc |
|--------|------------------|---------------|
| **"The Visionary"** | Tất cả cao, cân bằng | Sản phẩm thành công, team tin tưởng, stakeholder impressed |
| **"The Survivor"** | Prioritization cao, Communication thấp | Sản phẩm ổn nhưng team kiệt sức, không ai muốn làm thêm sprint |
| **"The Politician"** | Stakeholder Mgmt cao, Analytics thấp | Stakeholder happy, nhưng sản phẩm drift khỏi user needs, NPS giảm dần |
| **"The Learner"** | Mixed, improving trend | Không thành công rực rỡ nhưng PO trưởng thành — best ending cho lần đầu |
| **"The Burnout"** | Tất cả thấp, declining | Sản phẩm trì trệ, team tan vỡ, PO bị replace |
| **"The Pivot"** | Analytics cao, Stakeholder thấp | Player discover insight quan trọng nhưng không thể execute vì mất trust |

**Endings có full narrative text** — không chỉ score card. Mỗi ending explain tại sao chuỗi quyết định dẫn đến kết quả này.

---

## DAG Structure (Converging Branches)

```
Sprint 1 Decisions (9-12 nodes)
  → Tạo ra Resource State A (metrics profile sau sprint 1)

Sprint 2 Decisions (13-18 nodes)
  → Crisis type phụ thuộc vào Sprint 1 state
  → Unlock/lock options theo stat-gating

Sprint 3 Decisions (9-15 nodes)
  → Converge về 6 endings dựa trên cumulative dimension scores
```

**Không phải decision tree (exponential). Là DAG với converging paths.**

---

## Primary UI: Chat/Slack Interface (Simulacra + Lifeline Model)

- Tất cả interactions xảy ra qua chat interface (Slack-like)
- Agents ping player async — không phải realtime pressure, nhưng có time context ("sent 2h ago")
- Decisions presented như reply options trong conversation
- Information-gathering = chủ động DM teammate hoặc open analytics dashboard

---

## Technical Constraints

1. **Metric deltas scripted** per decision trong YAML — không dùng emergent simulation
2. **Consequence delay** implemented qua `delay_turns` field trong SideEffect schema (đã có trong scenario-engine-plan.md)
3. **Stat-gating** implemented qua `requires` conditions trên Option objects
4. **NPC autonomy** triggered qua threshold watchers trong orchestrator — khi metric vượt ngưỡng → inject autonomous NPC event
5. **Information-gathering** = optional sub-dialogue trước decision node, unlock thêm options
6. **Endings** computed từ final dimension scores → lookup table trong endings.yaml

---

## MVP Scope

- 1 sản phẩm: ShopMate e-commerce
- 9 ngày gameplay, ~35 decision nodes
- 3 scripted crisis events (1 per sprint)
- 6 endings
- 3 NPCs với AI dialogue: BA Minh, Stakeholder Lan, Dev Hùng
- Stat-gating cho 5-7 key options
- Consequence delay cho tất cả major decisions
