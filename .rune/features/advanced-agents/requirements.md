# Requirements Document: Advanced Agents (HTML Designer & Customer)
Created: 2026-04-08 | BA Session: Phase 2 Agents

## Context
Phase 2 requires the addition of two new agents to the `workers` app: a Designer Agent and a Customer Agent. The Dev Agent is explicitly excluded from this phase (dev execution is mocked/simulated). To simplify architecture, the Designer Agent will directly generate HTML components instead of relying on external MCPs like Stitch.

## Stakeholders
- Primary user: PO (interacting indirectly via simulation events).
- Affected systems: Orchestrator, Event Bus, Shared Types.

## User Stories
US-1: As a Designer Agent, I want to generate raw HTML/Tailwind code based on BA specs so that the PO can review the design without external tools.
  AC-1.1: GIVEN a design request WHEN the agent processes it THEN it outputs valid HTML strings with Tailwind classes.
  AC-1.2: GIVEN the orchestrator receives the HTML WHEN passing it to the frontend THEN it can be rendered safely.

US-2: As a Customer Agent, I want to simulate usability feedback so that the PO understands the impact of their UX decisions.
  AC-2.1: GIVEN a deployed feature WHEN the customer agent reviews it THEN it provides structured JSON feedback on usability and satisfaction.

## Scope
### In Scope
- Prompt and logic for `DesignerAgent` using Claude Sonnet/Haiku.
- Prompt and logic for `CustomerAgent` simulating end-user feedback.
- Zod schemas for the inputs/outputs of these new agents in `packages/shared`.
- Queue setup for these agents in BullMQ (in `apps/workers`).

### Out of Scope
- Dev Agent implementation.
- Integration with external UI tools (Stitch MCP).

### Assumptions
- Orchestrator can route events to these new agents similarly to the BA and Stakeholder agents.

## Next Step
→ Hand off to advanced-agent-dev to execute `rune:cook` for implementation.