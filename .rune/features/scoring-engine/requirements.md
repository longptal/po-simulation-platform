# Requirements Document: Scoring Engine & Impact Mapping

Created: 2026-04-08 | BA Session: scoring-engine-dev

## Context

The PO Simulation Platform needs a scoring engine that evaluates PO decisions across multiple dimensions and maps each decision to its causal impact on simulated product metrics. This is the "grading system" that turns a PO's choices into measurable feedback, skill progression, and coaching signals.

## Stakeholders

- Primary user: PO players — they see scores, skill trends, and impact after every decision and at sprint retrospective
- Affected systems: `packages/shared` (types/schemas), `apps/orchestrator` (calls engine), `apps/web` (displays scores), scenario YAML files (reference dimensions)

## User Stories

US-1: As a PO player, I want to see my score breakdown after each decision so that I understand which skill areas I performed well in and which need improvement.
  AC-1.1: GIVEN a scenario with 4 scoring dimensions WHEN the PO selects an option THEN the engine returns a score delta for each affected dimension
  AC-1.2: GIVEN a scenario with N decision nodes WHEN the scenario completes THEN the engine returns an aggregated score with per-dimension breakdown

US-2: As a PO player, I want to see the causal chain from my decision to metric changes so that I understand WHY my score changed.
  AC-2.1: GIVEN a PO decision WHEN the scoring engine computes impact THEN it returns direct effects (immediate) and indirect effects (delayed) with explanation text
  AC-2.2: GIVEN multiple decisions in a session WHEN the PO views retrospective THEN the engine shows which decisions contributed to each metric change

US-3: As an orchestrator developer, I want a typed scoring service I can call with session data so that scoring logic stays in one place.
  AC-3.1: GIVEN a session ID, list of decisions, and scenario config WHEN the scoring engine is invoked THEN it returns a `SessionScore` object
  AC-3.2: GIVEN malformed input WHEN the scoring engine is invoked THEN it throws a Zod-validated error (never silently defaults)

US-4: As a frontend developer, I want exported types for scores, dimensions, and causal effects so I can build the dashboard without guessing shapes.
  AC-4.1: GIVEN `packages/shared` exports WHEN imported by `apps/web` THEN `SessionScore`, `DimensionScore`, `CausalChain`, and `ImpactEffect` types are available

US-5: As a scenario author, I want to define scoring dimensions and weights in my scenario YAML so that different scenarios can weight skills differently.
  AC-5.1: GIVEN a scenario YAML with `scoring.dimensions` array WHEN the parser loads it THEN each dimension is validated (weight 0-1, name matches known set)
  AC-5.2: GIVEN a scenario that omits a dimension not relevant to its domain WHEN the engine computes scores THEN missing dimensions are scored as 0, not an error

## Scope

### In Scope

1. **Scoring Engine Service** — TypeScript module that computes weighted scores from PO decisions using scenario-defined dimensions and rubric
2. **4 Core Scoring Dimensions** — Prioritization (0.35), Communication (0.25), Analytics (0.15), Stakeholder Management (0.25). Weights are configurable per-scenario
3. **Decision Impact Mapping** — Each option's `score_modifiers` and `side_effects` are applied cumulatively to produce a causal chain
4. **Session Score Aggregation** — Scores accumulate across all decision nodes in a session, with per-sprint breakdown
5. **TypeScript Types & Zod Schemas** — Exported from `packages/shared` for use by frontend and orchestrator
6. **XP & Level Calculation** — XP derived from weighted score × difficulty multiplier, with level-up threshold
7. **Causal Graph Structure** — Data model linking decisions to metric effects with delay tracking

### Out of Scope

- Coaching engine (feedback text generation) — that's a separate consumer of scoring output
- Synthetic user simulation / Playwright — Phase 2 metrics
- Skill tree UI / visualization — frontend concern
- Persistent PO profile storage — DB concern (packages/db)
- Real-time score streaming — WebSocket concern (orchestrator)

### Assumptions

- Scores are 0-100 scale (assumption A1 — risk if frontend expects different scale)
- Dimension weights MUST sum to 1.0 per scenario (validated at parse time)
- MVP uses only 4 dimensions (Prioritization, Communication, Analytics, Stakeholder Management). Planning docs mention 5-6 dimensions; this is Phase 1 scope only
- `score_modifiers` on options are raw deltas (not percentage points) — interpretation risk, must align with frontend display

### Dependencies

- Existing `packages/shared/src/types/scenario.ts` — extends `ScoringSystem`, `ScoringDimension`, `ScoringRubric` types
- Existing `packages/shared/src/schemas/scenario.schema.ts` — extends Zod schemas for scoring
- Scenario YAML parser — must output validated `ScoringSystem` objects
- Orchestrator — provides decision records to engine at computation time

## Non-Functional Requirements

| NFR | Requirement | Measurement |
|-----|-------------|-------------|
| Performance | Score computation < 50ms for a full session (<= 20 decision nodes) | Unit benchmark test |
| Correctness | Weighted score matches manual calculation on known inputs | Snapshot tests with fixture data |
| Type Safety | No `any` types in scoring module | `tsc --noEmit` strict check |
| Validation | All engine inputs validated via Zod before processing | Unit tests with invalid inputs |

## Data Model Extensions

```typescript
// New types to add to packages/shared/src/types/scoring.ts

interface DimensionScore {
  dimension: string;           // "prioritization" | "communication" | "analytics" | "stakeholder_management"
  score: number;               // 0-100
  maxPossible: number;         // 100
  decisionsContributed: number; // how many decisions affected this dimension
}

interface SessionScore {
  sessionId: string;
  scenarioId: string;
  dimensionScores: DimensionScore[];
  weightedTotal: number;        // 0-100, sum of (dimension.score * weight)
  xpEarned: number;
  completedAt: Date;
}

interface ImpactEffect {
  metric: string;
  direction: 'positive' | 'negative' | 'neutral';
  magnitude: number;            // -1.0 to 1.0
  affectedTargets: SideEffectTarget[];
  delayTurns: number;
  explanation: string;
}

interface CausalChain {
  decisionNodeId: string;
  optionId: string;
  directEffects: ImpactEffect[];
  indirectEffects: ImpactEffect[];
  timeline: 'immediate' | 'next_sprint' | 'gradual';
}

interface SessionCausalGraph {
  sessionId: string;
  nodes: Array<{
    id: string;
    type: 'decision' | 'metric' | 'side_effect';
    label: string;
    value: number;
    sprint: number;
  }>;
  edges: Array<{
    from: string;
    to: string;
    weight: number;
    delaySprints: number;
    explanation: string;
  }>;
}
```

## Risks

- **Dimension naming mismatch**: Planning docs use inconsistent names (some say "leadership", some "stakeholder management"). We standardize to 4 Phase 1 dimensions but must match option `score_modifiers.dimension` values.
- **Weight validation gaps**: If scenario authors define dimensions summing to != 1.0, scores become meaningless. Must validate at parse time.
- **Delayed effects tracking**: Side effects with `delay_turns > 0` require state persistence across turns. Engine needs access to accumulated session state.

## Decision Classification

| Category | Meaning | Example |
|----------|---------|---------|
| **Decisions** (locked) | User confirmed — agent MUST follow | "4 core dimensions only: Prioritization, Communication, Analytics, Stakeholder Management" |
| **Discretion** (agent decides) | User trusts agent judgment | "Choose the best utility structure for the scoring service" |
| **Deferred** (out of scope) | Explicitly NOT this task | "Coaching engine, synthetic users, Playwright, Skill tree UI" |

## Next Step

Hand off to rune:cook for implementation planning and coding.
