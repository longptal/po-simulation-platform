# Plan: Gameplay Loop — Narrative Simulation v3
**Feature:** gameplay-narrative-sim | **Approved:** 2026-04-07 (v3 — post research)
**Design Doc:** `docs/plans/gameplay-design.md`

## Overview
PO Simulator: 27-45 micro-decisions tích lũy qua 9 ngày. Endings từ cumulative dimension scores,
không phải pivot paths. Consequence delay, information-gating, stat-gating, NPC autonomy.
Primary UI: Slack-style chat. Hard gate quiz trước khi vào game.

## Phase Table

| # | Phase | Deliverable | Status | Est. LOC |
|---|-------|-------------|--------|----------|
| 1 | **Content Schema** | YAML schema: resource metrics, decision nodes, delay system, stat-gates, NPC autonomy triggers | ⬚ Pending | ~220 |
| 2 | **Resource & Consequence Engine** | 6-metric system, consequence delay queue, threshold event triggers | ⬚ Pending | ~300 |
| 3 | **Decision Engine** | Stat-gating resolver, information-gathering sub-dialogue, option unlock logic | ⬚ Pending | ~280 |
| 4 | **NPC System** | Character sheet loader, autonomy trigger handlers, AI dialogue (Haiku + guardrails) | ⬚ Pending | ~300 |
| 5 | **Endings Engine** | Dimension score accumulator, endings calculator (6 endings), narrative text renderer | ⬚ Pending | ~200 |
| 6 | **Quiz + Onboarding** | Hard gate quiz engine, doc reader, shuffle/retry logic | ⬚ Pending | ~150 |
| 7 | **Orchestrator & API** | XState v5 session machine (day loop), Hono endpoints, SSE stream | ⬚ Pending | ~250 |
| 8 | **Frontend Shell** | Slack-like chat UI, metrics panel, morning briefing, endings screen | ⬚ Pending | ~480 |

## Build Order

```
Phase 1 → Phase 2 → Phase 3 ──> Phase 7 ──> Phase 8
                └──> Phase 4 ──/
Phase 1 → Phase 5 ──────────────/
Phase 6 (parallel với Phase 2-5)
```

## Key Decisions

| # | Decision | Rationale (từ research) |
|---|----------|------------------------|
| D1 | 27-45 micro-decisions thay vì 3-4 pivots | Papers Please model: endings từ pattern, không phải single choices |
| D2 | Consequence delay mandatory cho tất cả major decisions | This War of Mine: tension đến từ không biết hậu quả ngay |
| D3 | 6-metric resource system với survival bands | Reigns model: asymmetric tradeoffs, không có "đúng hoàn toàn" |
| D4 | Stat-gating trên options (Disco Elysium model) | Replay value + teach "building capital before using it" |
| D5 | NPC autonomy khi metrics vượt threshold | Lifeline model: loss of control = authentic PM experience |
| D6 | Information-gathering sub-dialogue unlock thêm options | Orwell model: quality of decision varies by knowledge depth |
| D7 | Endings từ cumulative 4-dimension scores, không phải path | Papers Please: 6 endings, không phải 2^N branches |
| D8 | Primary UI: Slack-like chat (not dialog boxes) | Simulacra/Lifeline: matches real async PM work feel |
| D9 | Consequence delay field trong YAML SideEffect schema | Reuses existing schema từ scenario-engine-plan.md |

## Architecture Map

```
scenarios/
  ecommerce-v1/
    scenario.yaml          ← product brief, team, initial metrics, quiz
    days/day-01.yaml       ← decision nodes, options, metric deltas, delay_turns
    ...
    crisis/                ← 3 scripted crisis events (1 per sprint)
    npc/ba-minh.yaml       ← character sheet, autonomy thresholds, scripted lines
    npc/stakeholder-lan.yaml
    npc/dev-hung.yaml
    endings.yaml           ← dimension score ranges → ending ID → narrative text

packages/shared/
  types/scenario.ts        ← DecisionNode, Option (với requires[]), SideEffect (với delay_turns)
  types/game.ts            ← GameState, ResourceMetrics, DimensionScores, ConsequenceQueue
  resource-engine.ts       ← applyDelta(), checkThreshold(), triggerCrisis()
  consequence-queue.ts     ← enqueue(effect, delay), tick(), flushDue()
  decision-engine.ts       ← resolveOptions(state) → available options với stat-gating
  endings-engine.ts        ← computeDimensions(history) → EndingID

packages/npc/
  character-loader.ts      ← loadCharacterSheet()
  autonomy-watcher.ts      ← watchMetrics() → trigger autonomous NPC actions
  ai-dialogue.ts           ← generateDialogue(characterSheet, beatContext, storyFlags)

apps/orchestrator/
  src/machines/day-loop.ts ← XState v5: morning→decisions→eod→[next-day|sprint-retro|ending]
  src/routes/game.ts       ← REST + SSE

apps/web/
  src/app/onboarding/      ← Doc reader + quiz UI
  src/app/game/            ← Main chat interface (Slack-like)
  src/components/chat/     ← MessageBubble, DecisionCard, InfoGatherButton
  src/components/metrics/  ← ResourcePanel (6 metrics + survival bands)
  src/app/ending/          ← 6 ending narrative screens
```

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Consequence delay làm player confused ("tôi không hiểu tại sao metric giảm") | High | Sprint Retro hiển thị causal chain rõ ràng: "Ngày 3, bạn approve spec không review → ngày 6 bug xuất hiện" |
| Stat-gating không balance — player stuck không có options | Medium | Luôn có ≥ 2 options không cần stat-gate; stat-gate chỉ unlock thêm, không block cơ bản |
| NPC autonomy cảm thấy unfair ("tôi không làm gì mà bị phạt") | Medium | NPC autonomy chỉ trigger khi metrics đã ở threshold xấu ≥ 2 turns — có warning trước |
| 35 decision nodes quá nhiều content để viết | High | AI-assist draft nội dung, human review learning objective; MVP content sprint riêng |
| 8 phases → tăng so với v2 | Medium | Phase 6 (quiz) độc lập, có thể parallel; Phase 5+6 nhỏ (<200 LOC mỗi cái) |

---
*Awaiting approval để viết phase files.*
