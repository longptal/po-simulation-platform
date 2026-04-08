# Requirements Document: Frontend UI Phase 2
Created: 2026-04-08 | BA Session: Frontend App Implementation

## Context
Phase 2 of the PO Simulation Platform introduces the interactive user interface. We need to build a Next.js (PWA) application using Tailwind CSS and Zustand to serve as the daily dashboard for Product Owners in the simulation. The application must support real-time interactions (via WebSocket/SSE) and complex UI elements.

## Stakeholders
- Primary user: Product Owner (PO) undergoing simulation training.
- Affected systems: Orchestrator backend (Session management, Event Bus), AI Workers.

## User Stories
US-1: As a PO, I want a 3-column dashboard so that I can see all relevant context at a glance.
  AC-1.1: GIVEN the dashboard loads WHEN viewing the left column THEN I see Document Specs (from BA).
  AC-1.2: GIVEN the dashboard loads WHEN viewing the middle column THEN I see the Chat UI and popups for pending decisions.
  AC-1.3: GIVEN the dashboard loads WHEN viewing the right column THEN I see the live simulated Metrics.

US-2: As a PO, I want the Chat UI to support rich text formatting so that I can read complex documents and tables from AI teammates.
  AC-2.1: GIVEN an AI agent sends a message with markdown WHEN it renders in chat THEN it displays properly formatted headers, bold text, and lists.
  AC-2.2: GIVEN an AI agent sends a message containing a table WHEN it renders in chat THEN the table is properly structured and readable.

US-3: As a PO, I want to make decisions directly in the UI so that the simulation progresses.
  AC-3.1: GIVEN a pending decision WHEN it appears in the middle column THEN it shows clear options as buttons.
  AC-3.2: GIVEN I click a decision button WHEN the action triggers THEN it sends the selected option ID back to the orchestrator.

## Scope
### In Scope
- Next.js application setup with Tailwind CSS.
- Zustand store for UI state management.
- 3-column layout structure.
- Chat UI component with full markdown and table rendering support.
- Decision popup component.
- Basic metrics display component (right column).
- Document display component (left column).
- WebSocket/SSE client connection setup to receive events from Orchestrator.

### Out of Scope
- Real-time coach whispers.
- Playwright testing (handled by QA agent).
- Actual backend API implementation (already handled or mocked).
- Authentic user metrics (using model-based synthetic metrics for now).

### Assumptions
- Backend orchestrator API and WebSocket endpoints will be available for integration.

## Non-Functional Requirements
| NFR | Requirement | Measurement |
|-----|-------------|-------------|
| Performance | Fast rendering of complex markdown | Visually smooth scrolling and no lag when rendering large tables |
| Usability | Clear distinction between 3 columns | Responsive/flex layout using Tailwind |

## Dependencies
- `@po-sim/shared` for Types and Zod schemas.

## Risks
- Risk: Complex markdown parsing causing performance issues in the chat stream.
  Mitigation: Use a robust markdown parser (e.g., react-markdown with remark-gfm).

## Next Step
→ Hand off to frontend-agent to execute `rune:cook` for implementation.
