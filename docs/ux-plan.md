# UX & PO Interaction Interface Plan
## PO Virtual Simulation Platform

---

## 1. Mental Model & Dashboard

### Concept
PO mo app thay mot "van phong ao" — noi ho la PO thuc su cua mot product team. Dashboard la "ban lam viec" voi moi thu can xu ly trong ngay.

### Layout (3-column)

```
+------------------------------------------------------------------+
|  [Logo] PO Sim    Sprint 3 - Day 4/10    9:15 AM    [Profile]   |
+------------------------------------------------------------------+
|           |                              |                        |
| SIDEBAR   |     MAIN WORKSPACE           |   RIGHT PANEL          |
|           |                              |                        |
| Dashboard |  +------------------------+  |  Sprint Health         |
| Backlog   |  | TODAY'S FOCUS           |  |  +-----------+        |
| Sprint    |  | 3 items need attention  |  |  | Velocity: 24      |
| Team Chat |  +------------------------+  |  | Burndown: [chart] |
| Reviews   |  |                         |  |  | Blockers: 1       |
| Meetings  |  | [!] Stakeholder muon    |  |  +-----------+        |
| Reports   |  |     doi priority        |  |                        |
|           |  |                         |  |  Team Status           |
| --------- |  | [>] BA gui analysis     |  |  BA: Dang viet spec   |
| Settings  |  |     cho Feature X       |  |  Dev: Code Feature Y  |
| Coach     |  |                         |  |  Designer: Wireframe  |
|           |  | [?] Dev hoi clarify     |  |  QA: Test Sprint 2    |
|           |  |     acceptance criteria  |  |                        |
|           |  +------------------------+  |  Coach Tips             |
|           |                              |  "Hom nay thu tap       |
|           |  RECENT ACTIVITY FEED        |  prioritize bang RICE"  |
|           |  - 10m ago: Designer upload  |                        |
|           |  - 1h ago: Dev push PR #12   |                        |
|           |  - 2h ago: BA comment spec   |                        |
+------------------------------------------------------------------+
```

### Thong tin chinh tren Dashboard
- **Today's Focus**: 3-5 items can PO xu ly ngay (priority cao nhat)
- **Sprint Health**: velocity, burndown mini-chart, so blockers
- **Team Status**: moi AI agent dang lam gi (1 dong/agent)
- **Activity Feed**: dong thoi gian cac su kien gan nhat
- **Coach Tips**: 1 goi y nho lien quan den context hien tai

### Mental Model
PO khong "choi game" — ho "di lam". App mo ra giong nhu mo Slack/Jira buoi sang. Cam giac la "toi co viec can xu ly" chu khong phai "toi chon level de choi".

---

## 2. Daily Workflow UX

### Career Mode Time Model

**Career Mode time model**: A sprint (scenario) covers simulated 2 weeks. The PO fast-forwards through uneventful days and the simulation stops ONLY at event-day checkpoints — days with a decision to make, a meeting, a stakeholder interrupt, or a milestone. Days without events are auto-skipped. Total real-time per sprint: 25–40 minutes.

### Cau truc "Ngay lam viec"

Mot "ngay" trong simulation = **25-40 phut thuc te**, chia thanh 3 phase:

```
TIMELINE CUA MOT NGAY SIMULATION
================================================

[Morning Standup]     [Work Phase]        [End of Day]
   ~5 phut              ~20-30 phut          ~5 phut
                    
   Xem overnight       Xu ly tasks,        Review progress,
   updates,            chat voi team,      set priorities
   set plan            make decisions      cho ngay mai
```

### Morning Phase (5 phut)
- App hien **Morning Briefing** tu dong:
  ```
  +----------------------------------+
  |  SANG NAY - Day 4, Sprint 3     |
  |                                  |
  |  Overnight updates:              |
  |  * BA hoan thanh spec Feature X  |
  |  * Dev gap blocker o API auth    |
  |  * Stakeholder gui email moi     |
  |                                  |
  |  Hom nay nen tap trung:          |
  |  1. Review spec Feature X        |
  |  2. Unblock Dev ve API auth      |
  |  3. Doc email Stakeholder        |
  |                                  |
  |  [Bat dau ngay lam viec ->]      |
  +----------------------------------+
  ```

### Work Phase (20-30 phut)
- **Notification system** theo thoi gian thuc:
  - Popup nho goc man hinh khi agent gui message
  - Badge do tren sidebar items
  - Urgent items co highlight vang
- **Time progression**: 1 phut thuc = ~15 phut simulation time
  - Thanh thoi gian o top bar: `9:15 AM >>>>>>>---- 6:00 PM`
  - Events xay ra theo timeline (standup 9:30, meeting 2pm, etc.)
- **Interrupts**: Random events xay ra giong thuc te
  - Stakeholder dot ngot muon hop
  - Bug critical tu Production
  - Team member xin nghi

### End of Day (5 phut)
- **Daily Summary** tu dong:
  ```
  +----------------------------------+
  |  KET THUC NGAY                   |
  |                                  |
  |  Hoan thanh: 4/5 items          |
  |  Quyet dinh chinh:               |
  |  - Da prioritize Feature X > Y   |
  |  - Da approve Design v2          |
  |                                  |
  |  Coach Feedback:                 |
  |  "Ban xu ly stakeholder request  |
  |   tot. Lan sau thu hoi 'why'    |
  |   truoc khi nhan loi."          |
  |                                  |
  |  [Xem chi tiet] [Ngay tiep ->]  |
  +----------------------------------+
  ```

### Notifications & Inbox

```
+----------------------------------+
|  INBOX                     (7)   |
|                                  |
|  [!] URGENT                      |
|  Stakeholder: "Can gap ve Q3"    |
|  10 phut truoc                   |
|                                  |
|  [@] MENTION                     |
|  Dev: "PO review PR #12?"       |
|  25 phut truoc                   |
|                                  |
|  [i] INFO                        |
|  BA: Spec update pushed          |
|  1 gio truoc                     |
|                                  |
|  [Filter: All|Urgent|Mentions]   |
+----------------------------------+
```

---

## 3. Interaction Modes

### 3.1 Chat voi BA / Stakeholder

Giao dien chat giong Slack — quen thuoc, khong can hoc.

```
+------------------------------------------+
|  #channel-ba        BA Agent    [Online] |
+------------------------------------------+
|                                          |
|  BA: Toi da phan tich xong Feature X.   |
|  Day la user story:                      |
|  "As a user, I want to filter by date   |
|  so that I can find orders quickly"      |
|                                          |
|  Acceptance criteria:                    |
|  - Filter by single date                |
|  - Filter by date range                 |
|  - Default: last 7 days                 |
|                                          |
|  Ban review va confirm nhe?             |
|  [View full spec ->]                     |
|                                          |
|  PO (you): Criteria 2 can ro hon -      |
|  date range max la bao nhieu ngay?      |
|                                          |
|  BA: Good catch! De toi them constraint. |
|  Toi de xuat max 90 ngay, vi data       |
|  retention policy la 90 ngay.           |
|                                          |
+------------------------------------------+
|  [Type message...]  [Attach] [Send]      |
+------------------------------------------+
```

**Dac biet voi Stakeholder chat:**
- Tone cua Stakeholder se "kho tinh" hon — doi priority, hoi deadline, push scope
- PO phai hoc cach pushback va negotiate
- Vi du: Stakeholder noi "Them feature Z vao sprint nay" — PO can giai thich trade-off

### 3.2 Review Design Mockup

```
+----------------------------------------------------------+
|  DESIGN REVIEW - Feature X: Filter Screen                 |
+----------------------------------------------------------+
|                                                           |
|  +-------------------+    COMMENTS                       |
|  |  [Mockup Image]   |                                   |
|  |                   |    Designer: Day la v2 sau        |
|  |  Filter Panel     |    feedback lan truoc.            |
|  |  +------------+   |                                   |
|  |  |Date Range  |   |    Thay doi:                      |
|  |  |[From][To]  |   |    - Them preset "Last 7 days"   |
|  |  |            |   |    - Button "Apply" ro hon        |
|  |  |[Apply]     |   |                                   |
|  |  +------------+   |    PO: Icon calendar bi nho qua   |
|  |                   |    tren mobile. Tang len 24px?     |
|  |  Results List     |                                   |
|  |  [Item 1]         |    Designer: Dong y! Da update.  |
|  |  [Item 2]         |                                   |
|  +-------------------+    +--------+ +--------+          |
|                           |Approve | |Request |          |
|  [< Prev v1] [v2] [v3 >] |  v2    | |Changes |          |
|                           +--------+ +--------+          |
+----------------------------------------------------------+
```

**Tinh nang:**
- So sanh versions (v1 vs v2 side-by-side)
- Click vao mockup de comment truc tiep (annotation)
- Approve / Request Changes voi note

### 3.3 Approve/Reject Dev PR

```
+----------------------------------------------------------+
|  CODE REVIEW - PR #12: Add date filter API                |
+----------------------------------------------------------+
|                                                           |
|  Dev: PR nay implement filter endpoint.                  |
|  - GET /orders?from=DATE&to=DATE                         |
|  - Pagination included                                   |
|  - Unit tests: 12 passed                                |
|                                                           |
|  +----------------------------------------------+        |
|  | CHANGES SUMMARY (PO-friendly view)           |        |
|  |                                               |        |
|  | + New endpoint: filter orders by date         |        |
|  | + Pagination (20 items/page)                  |        |
|  | + Input validation: date format, max range    |        |
|  | ~ Modified: order list component              |        |
|  |                                               |        |
|  | Test coverage: 87% (+5%)                      |        |
|  | Performance: response <200ms                  |        |
|  +----------------------------------------------+        |
|                                                           |
|  Does this match acceptance criteria?                     |
|  [x] Filter by single date                               |
|  [x] Filter by date range (max 90 days)                  |
|  [ ] Default last 7 days  <-- MISSING                    |
|                                                           |
|  +----------+ +---------------+ +--------+               |
|  | Approve  | | Request       | | Ask    |               |
|  |          | | Changes       | | Dev    |               |
|  +----------+ +---------------+ +--------+               |
+----------------------------------------------------------+
```

**Diem quan trong:**
- PO khong can doc code — app dich PR thanh "business language"
- Tu dong check acceptance criteria vs PR content
- Highlight nhung gi MISSING hoac KHONG KHOP voi spec
- PO hoc cach hoi dung cau hoi thay vi doc code

---

## 4. Onboarding (10 phut dau tien)

### Flow

```
Phut 0-2: Welcome & Context
    |
Phut 2-4: Chon Scenario
    |
Phut 4-7: Guided First Day (voi coach overlay)
    |
Phut 7-10: First Decision (co feedback ngay)
```

### Phut 0-2: Welcome

```
+------------------------------------------+
|                                          |
|  Chao mung den PO Simulator!            |
|                                          |
|  Ban se lam Product Owner cua mot       |
|  team thuc su — voi BA, Designer,       |
|  Dev va Stakeholder deu la AI.          |
|                                          |
|  Moi quyet dinh cua ban anh huong       |
|  den product. Khong co dap an dung      |
|  duy nhat — chi co trade-offs.          |
|                                          |
|  Ban da co kinh nghiem PO chua?         |
|                                          |
|  [ Moi hoan toan ]                       |
|  [ Co chut it (< 1 nam) ]               |
|  [ Co kinh nghiem (1-3 nam) ]            |
|                                          |
+------------------------------------------+
```

Cau tra loi anh huong den **do kho** va **muc goi y** cua Coach.

### Phut 2-4: Chon Scenario

```
+------------------------------------------+
|  CHON SCENARIO DAU TIEN                  |
|                                          |
|  [A] E-commerce App          [Recommend] |
|  Sprint 3/8 - Team da on dinh           |
|  Focus: Feature prioritization           |
|  Do kho: ** (vua)                        |
|                                          |
|  [B] Internal Tool                       |
|  Sprint 1/6 - Moi bat dau              |
|  Focus: Requirement gathering            |
|  Do kho: * (de)                          |
|                                          |
|  [C] Mobile App Pivot                    |
|  Sprint 5/8 - Dang gap van de           |
|  Focus: Stakeholder management           |
|  Do kho: *** (kho)                       |
|                                          |
+------------------------------------------+
```

### Phut 4-7: Guided First Day

Coach overlay (tooltip) chi dan tung buoc:

```
+------------------------------------------+
|  [Dashboard loaded]                      |
|                                          |
|  +------------------------------+        |
|  | COACH TIP          [1/5]  x |        |
|  |                              |        |
|  | Day la Dashboard cua ban.   |        |
|  | Moi sang, xem "Today's     |  <---  |
|  | Focus" truoc — do la nhung  |        |
|  | viec quan trong nhat.       |        |
|  |                              |        |
|  | [Got it ->]                  |        |
|  +------------------------------+        |
|                                          |
+------------------------------------------+
```

5 tips ngan: Dashboard -> Inbox -> Chat -> Review -> Sprint Board

### Phut 7-10: First Decision

```
+------------------------------------------+
|  [First interaction auto-triggered]      |
|                                          |
|  BA: Chao PO! Toi co 2 feature can      |
|  ban prioritize cho sprint nay:          |
|                                          |
|  Feature A: User search (high demand)    |
|  Feature B: Export CSV (CEO yeu cau)     |
|                                          |
|  Chung ta chi co bandwidth cho 1.        |
|  Ban chon cai nao?                       |
|                                          |
|  +-----------------------------+         |
|  | COACH WHISPER:              |         |
|  | Hoi BA them data truoc khi  |         |
|  | quyet dinh. "Bao nhieu      |         |
|  | user yeu cau search?"       |         |
|  +-----------------------------+         |
|                                          |
+------------------------------------------+
```

Sau khi PO quyet dinh -> feedback ngay lap tuc tu Coach:
- "Ban da hoi data truoc khi quyet dinh — tot lam!"
- Hoac: "Lan sau, thu hoi them context truoc khi commit"

---

## 5. Feedback Presentation

### 5.1 Metrics Dashboard

```
+----------------------------------------------------------+
|  PERFORMANCE OVERVIEW - Sprint 3                          |
+----------------------------------------------------------+
|                                                           |
|  OVERALL PO SCORE                                        |
|  [============================------] 78/100              |
|  (Tang 12 diem tu Sprint 2)                              |
|                                                           |
|  +------------------+  +------------------+               |
|  | DECISION QUALITY |  | COMMUNICATION    |               |
|  |                  |  |                  |               |
|  | [===========-]   |  | [========-----]  |               |
|  | 82/100           |  | 65/100           |               |
|  | "Data-driven,    |  | "Can ro rang     |               |
|  |  well-reasoned"  |  |  hon voi Dev"    |               |
|  +------------------+  +------------------+               |
|                                                           |
|  +------------------+  +------------------+               |
|  | PRIORITIZATION   |  | STAKEHOLDER MGMT |               |
|  |                  |  |                  |               |
|  | [============-]  |  | [=========----]  |               |
|  | 85/100           |  | 72/100           |               |
|  | "RICE framework  |  | "Biet noi khong  |               |
|  |  su dung tot"    |  |  nhung chua      |               |
|  +------------------+  |  thuyet phuc"    |               |
|                         +------------------+               |
+----------------------------------------------------------+
```

### 5.2 Decision Log (hoc tu sai lam)

```
+----------------------------------------------------------+
|  DECISION LOG                                             |
+----------------------------------------------------------+
|                                                           |
|  Day 4: Chon Feature A thay vi Feature B                 |
|  Context: BA hoi prioritize 1 trong 2                    |
|  Outcome: [Positive]                                      |
|  Why: Ban da hoi data (200 users request search           |
|       vs 1 CEO request CSV). Data-driven.                |
|  Tip: Lan sau, communicate decision reason               |
|       cho Stakeholder (CEO) de manage expectation.       |
|                                                           |
|  Day 3: Approve Design v1 khong co mobile review         |
|  Context: Designer gui desktop mockup                     |
|  Outcome: [Needs improvement]                             |
|  Why: 60% user dung mobile — can luon hoi                |
|       "Mobile version thi sao?" khi review design.       |
|  +----------------------------------------------+        |
|  | ACTION ITEM: Tao checklist review design      |        |
|  | [ ] Desktop layout                            |        |
|  | [ ] Mobile responsive                         |        |
|  | [ ] Accessibility                             |        |
|  +----------------------------------------------+        |
|                                                           |
+----------------------------------------------------------+
```

### 5.3 Coaching Moments (contextual, khong intrusive)

3 cap do feedback:

| Level | Khi nao | Hien thi |
|-------|---------|----------|
| **Whisper** | Real-time, khi PO sap quyet dinh | Tooltip nho goc duoi: "Thu hoi 'why' truoc" |
| **Nudge** | Sau 1 action, neu co the lam tot hon | Banner nhe: "Tip: AC nen co so do luong cu the" |
| **Review** | Cuoi ngay / cuoi sprint | Full page voi metrics + analysis |

**Nguyen tac:** Feedback phai ACTIONABLE — khong chi noi "chua tot" ma phai noi "lan sau lam the nay".

---

## 6. Async vs Real-time

### Matrix

| Interaction | Mode | Ly do |
|------------|------|-------|
| Chat voi agent | **Real-time** | PO can phan hoi ngay de hoc conversation skills |
| Stakeholder meeting | **Real-time** | Negotiation can phan ung nhanh |
| BA viet spec | **Async** | Normal mode: overnight; Fast mode: minutes |
| Dev code feature | **Async (overnight)** | Dev khong code xong trong 5 phut |
| Designer tao mockup | **Async (vai gio sim)** | Design can thoi gian nhung khong lau nhu code |
| Code review ready | **Notification** | PR xong -> PO nhan notify de review |
| Bug report | **Real-time interrupt** | Urgent, PO can xu ly ngay |
| Sprint metrics | **Async (cuoi ngay)** | Tong hop cuoi ngay moi co y nghia |

### UX Flow cho Async

```
NGAY 1 - 5:30 PM (cuoi ngay)
PO: "BA, viet spec cho Feature Y nhe"
BA: "OK, toi se co spec sang mai"
[PO ket thuc ngay 1]

NGAY 2 - 9:00 AM (morning briefing)
+----------------------------------+
| Overnight Updates:               |
| * BA da hoan thanh spec Feature Y|
|   [Review now ->]                |
| * Dev push PR #15 (bug fix)     |
|   [Review now ->]                |
+----------------------------------+
```

### Speed Control
PO co the dieu chinh toc do:
- **Normal**: 1 phut thuc = 15 phut sim (mac dinh)
- **Fast**: 1 phut thuc = 30 phut sim (skip waiting)
- **Focused**: Tam dung thoi gian, chi chat (de suy nghi ky)

```
[Slow <<] [|> Normal] [>> Fast]    Sim time: 2:30 PM
```

---

## 7. Platform Choice

### De xuat: **Progressive Web App (PWA) — Web-first**

| Tieu chi | Web App (PWA) | Desktop (Electron) | CLI |
|----------|--------------|--------------------|----|
| Accessibility | Bat ky device, khong can cai | Can download | Chi developer |
| Development cost | Thap | Trung binh | Thap nhung UX kem |
| Rich UI (mockup review, charts) | Tot | Rat tot | Khong kha thi |
| Offline | Co (PWA) | Co | Co |
| Target audience fit | PO moi (non-technical) | OK | Khong phu hop |
| Iteration speed | Nhanh nhat | Cham (build process) | Nhanh |

### Ly do chon Web App (PWA):

1. **Target user la PO moi** — ho can GUI than thien, khong phai CLI
2. **Review mockup va chart** bat buoc can visual UI
3. **Zero install** — mo browser la dung, giam friction onboarding
4. **PWA** cho phep install len desktop nhu app native neu muon
5. **Deploy nhanh** — cap nhat 1 lan, tat ca user co version moi
6. **Responsive** — dung duoc tren tablet khi di chuyen

### Tech stack de xuat:
- **Frontend**: Next.js + Tailwind CSS (fast development, good DX)
- **Real-time**: WebSocket cho chat, Server-Sent Events cho notifications
- **State**: Zustand (lightweight, du manh)
- **Backend**: Hono (TypeScript) API + LLM integration (OpenAI/Claude API)
- **Database**: PostgreSQL (scenario data) + Redis (session, real-time state)

---

## 8. MVP Scope

### P0 — MVP (Build truoc, 6-8 tuan)

| Feature | Ly do P0 |
|---------|----------|
| Dashboard co Today's Focus va Team Status | Core navigation, PO can noi nay de bat dau |
| Chat voi BA Agent (1 agent truoc) | Interaction co ban nhat cua PO |
| Chat voi Stakeholder Agent | Ky nang quan trong nhat PO can hoc |
| 1 Scenario hoan chinh (E-commerce, 3 sprints) | Can it nhat 1 luong choi duoc tu dau den cuoi |
| Morning Briefing + End of Day Summary | Tao cam giac "ngay lam viec", core loop |
| Basic scoring (overall + 4 categories) | PO can biet minh dang lam tot hay khong |
| Onboarding flow (10 phut) | First impression quyet dinh retention |
| Decision Log (basic) | PO xem lai va hoc tu decisions |

### P1 — Sau MVP (tuan 9-14)

| Feature | Ly do defer |
|---------|-------------|
| Designer Agent + Mockup Review | UI phuc tap (image annotation), BA/Stakeholder du de hoc core skills |
| Dev Agent + PR Review | Can "translate code to business" — phuc tap |
| Sprint Board (Kanban) | Nice-to-have, khong block learning |
| Speed control (slow/fast/focus) | Mac dinh speed du tot cho MVP |
| Them 2 scenarios | 1 scenario du cho early adopters |
| Coach Whisper (real-time tips) | Cuoi ngay review du cho MVP, real-time tips can nhieu context |

### P2 — Tuong lai (tuan 15+)

| Feature | Ly do defer |
|---------|-------------|
| Multiplayer (nhieu PO cung scenario) | Infrastructure phuc tap, khong can cho learning |
| Custom scenario builder | Can nhieu data tu P0/P1 de biet user can gi |
| Leaderboard / gamification nang cao | Sau khi validate core learning loop |
| Integration voi Jira/Linear thuc | Nice-to-have, simulation du |
| Mobile-optimized experience | Web responsive du, native mobile chua can |
| AI difficulty adaptation | Can data tu nhieu user de train |
| Export certificate / portfolio | Sau khi co ecosystem |

### MVP Success Metrics

| Metric | Target |
|--------|--------|
| Onboarding completion rate | > 80% |
| Day 1 retention (quay lai ngay thu 2) | > 60% |
| Scenario completion rate | > 40% |
| User self-reported learning | > 7/10 |
| Average session length | 25-40 phut |

---

## Tong ket

Platform nay la **"flight simulator cho PO"** — hoc bang cach lam, khong phai doc. Core loop la:

```
Nhan viec -> Quyet dinh -> Thay ket qua -> Hoc tu feedback -> Lam tot hon
```

MVP tap trung vao **chat + decisions + feedback loop** voi 2 agents (BA + Stakeholder) trong 1 scenario. Do la du de validate lieu cach hoc nay co hieu qua khong truoc khi build them.
