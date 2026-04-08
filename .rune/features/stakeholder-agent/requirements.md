# Requirements Document: Stakeholder Agent

Created: 2026-04-08 | BA Session: Reactive feedback agent for PO training simulation

## Purpose

The Stakeholder Agent is a **reactive feedback agent** that simulates realistic stakeholder responses to Product Owner decisions in the PO Simulation Platform. Unlike the BA Agent (which generates structured specifications), the Stakeholder Agent reviews PO decisions and provides:

- **Concerns** about timeline, scope, resources, and risk
- **Pushback** on unrealistic commitments or scope creep
- **Clarifying questions** to test PO preparation
- **Conditional approval** ("approve if...") for realistic negotiation dynamics

This is a cost-optimized agent using **Claude Haiku 4.5** (~$0.10 per response) because the feedback task is simpler than document generation.

## Input Contract

```typescript
interface StakeholderInput {
  sessionId: string;
  role: 'ceo' | 'cto' | 'engineering_manager' | 'sales_lead';
  poDecision: {
    description: string;      // What the PO decided to do
    optionChosen: string;     // Which option they picked
    context: string;          // Why this decision matters
    timeTaken: number;        // Seconds the PO took to decide
  };
  scenarioContext: {
    productName: string;
    currentSprint: number;
    velocity: number;
    activeMetrics: Record<string, number>;  // DAU, MRR, NPS, churn, etc.
    urgencyLevel: 'low' | 'medium' | 'high';
    trigger?: string;  // The scenario trigger text (e.g., VP Sales message)
  };
  previousFeedback?: string[];  // Previous stakeholder feedback to avoid repetition
}
```

## Output Contract

```typescript
interface StakeholderOutput {
  overallSentiment: 'approve' | 'concerns' | 'reject';
  feedback: {
    aspect: string;           // "timeline", "scope", "resources", "risk", "quality", "customer_impact"
    comment: string;          // The actual feedback statement
    severity: 'blocker' | 'major' | 'minor' | 'suggestion';
    suggestion?: string;      // Constructive alternative (if applicable)
  }[];
  questionsForPO: string[];   // Clarifying questions (1-3, varies by sentiment)
  approvalConditions?: string[]; // "I'll approve if..." conditions
}
```

## Behavior Patterns

### When to Raise Concerns

| Trigger | Response |
|---------|----------|
| Sprint exceeds team velocity | "We're committing beyond capacity — this risks delivery quality" |
| High-severity bugs ignored | "Deferring quality issues will compound our technical debt" |
| No mention of testing/QA | "Where is the quality assurance plan for this sprint?" |
| Metrics trending negative | "The data shows {metric} is down — should we reprioritize?" |

### When to Push Back

| Trigger | Response |
|---------|----------|
| PO overcommits (> velocity) | Direct pushback: "This is not realistic given our capacity" |
| PO ignores high-priority stakeholder request | Escalate concern: "My request about X was not addressed" |
| PO picks obviously suboptimal option | Challenge: "Can you explain the reasoning behind this? X seems misaligned with {goal}" |
| PO chooses low-value items over critical fixes | Pushback: "This prioritization doesn't align with our current metrics" |

### When to Ask Clarifying Questions

| Scenario | Question Style |
|----------|---------------|
| PO decision is vague | "What does 'improve search' mean in concrete terms?" |
| PO hasn't explained trade-offs | "What are you sacrificing by choosing this over X?" |
| PO decision contradicts prior statement | "You mentioned X was important earlier — how does this decision align?" |
| PO rushes through decision | "This feels hasty. What analysis went into choosing this?" |

### When to Approve

| Signal | Action |
|--------|--------|
| PO picks optimal option with realistic scope | `approve` with short acknowledgment |
| PO negotiates scope transparently | `approve` with praise for communication |
| PO addresses critical tech debt + business value | `approve` with recognition of balance |

## Behavior by Role

| Role | Primary Lens | Cares Most About | Ignores |
|------|--------------|------------------|---------|
| **CEO** | Business viability | Revenue, market position, ROI, growth | Technical debt, code quality details |
| **CTO** | Technical health | Architecture, scalability, security, debt | Sales deals, marketing campaigns |
| **Engineering Manager** | Team delivery | Capacity, burnout, timeline, quality | Revenue targets, competitive landscape |
| **Sales Lead** | Customer wins | Deal closure, client retention, feature requests | Tech debt, code patterns, testing strategy |

## Model Strategy

| Setting | Value | Why |
|---------|-------|-----|
| Model | `claude-haiku-4-5-20250514` | Cheapest model adequate for reactive feedback |
| Max output tokens | 1500 | Limits cost, forces concise feedback |
| Temperature | 0.7 | Enough variability without instability |
| Target cost | <$0.10/response | Budget constraint |
| Max tokens total | <4000 (input+output) | Cost guardrail |

## Difference from BA Agent

| Aspect | BA Agent | Stakeholder Agent |
|--------|----------|-------------------|
| **Purpose** | Generative — creates specs | Reactive — reviews decisions |
| **Model** | Claude Sonnet 4.6 | Claude Haiku 4.5 |
| **Complexity** | High — structured documents | Medium — structured feedback |
| **Output size** | ~4000 tokens | ~1500 tokens |
| **Cost** | ~$0.04/call | ~$0.005/call |
| **Reasoning depth** | Deep — decomposes requirements | Shallow — evaluates against constraints |
| **Retry strategy** | Same (max 2 retries) | Same (max 2 retries) |
| **Validation** | Zod (complex schema) | Zod (simpler schema) |
| **State awareness** | Stateless per decision | Slight context (previousFeedback) |

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `apps/workers/src/agents/stakeholder-agent.ts` | **Create** | Main agent class with `generateFeedback()` |
| `packages/shared/src/schemas/agent-output.schema.ts` | Modify | Add `StakeholderOutputSchema` |
| `packages/shared/src/types/agents.ts` | Modify | Update types to match contracts above |
| `apps/workers/src/index.ts` | Modify | Add stakeholder worker queue |
| `apps/orchestrator/src/services/orchestrator.service.ts` | Modify | Dispatch stakeholder job after PO decision |

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Feedback feels robotic | Medium | High | Role-specific prompt variation |
| LLM outputs invalid JSON | Low | Medium | Retry with format instructions |
| Feedback too harsh | Low | Medium | Calibrate prompt: "constructive but challenging" |
| Token cost exceeds budget | Low | Low | Hard cap on input context |
