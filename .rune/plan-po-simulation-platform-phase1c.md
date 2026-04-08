# Phase 1C: Frontend Dashboard

## Goal
Xây dựng dashboard UI: DashboardLayout, ChatThread, MetricsPanel, DecisionPrompt. Kết nối Zustand stores với SSE stream từ Phase 1B. Dashboard hiển thị scenario prompt, agent responses (chat), và real-time metrics.

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js App (apps/web)                                     │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │DecisionPrompt│  │  ChatThread  │  │  MetricsPanel   │   │
│  │             │  │              │  │                 │   │
│  │[Option A]   │  │ ← BA: spec   │  │ dau: 12,500 ▲  │   │
│  │[Option B]   │  │ ← SH: feedback│ │ nps: +5 ▼      │   │
│  │[Freeform]   │  │              │  │ debt: +2       │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘   │
│         │                │                   │             │
│         ▼                │                   │             │
│  ┌─────────────────────────────┐             │             │
│  │  SessionStore (Zustand)      │             │             │
│  │  - currentNode               │             │             │
│  │  - messages[]                 │             │             │
│  │  - metrics                   │             │             │
│  │  - status                    │             │             │
│  └──────────────┬───────────────┘             │             │
│                 │                              │             │
│                 │ useSessionSync()              │             │
│                 ▼                              │             │
│         SSE /sessions/:id/stream ◄──────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

---

## Code Contracts

```typescript
// apps/web/src/stores/session-store.ts (MODIFY existing or create)
interface SessionStore {
  sessionId: string | null;
  status: 'idle' | 'loading' | 'active' | 'paused' | 'completed';
  currentNode: DecisionNodeValidated | null;
  currentSprint: number;
  messages: ChatMessage[];
  metrics: ProductMetrics;
  submitDecision(optionId: string): void;
  reset(): void;
}

interface ChatMessage {
  id: string;
  agentRole: AgentRole;
  content: string;
  timestamp: Date;
}

// apps/web/src/hooks/use-session-sync.ts (MODIFY existing)
function useSessionSync(sessionId: string): {
  isConnected: boolean;
  error: string | null;
}
// Subscribes to SSE /sessions/:id/stream, dispatches events to SessionStore

// apps/web/src/components/dashboard/DashboardLayout.tsx (NEW)
function DashboardLayout({ sessionId }: { sessionId: string }): JSX.Element;

// apps/web/src/components/dashboard/DecisionPrompt.tsx (NEW)
function DecisionPrompt({
  node,
  onSubmit,
}: {
  node: DecisionNodeValidated;
  onSubmit: (optionId: string) => void;
}): JSX.Element;

// apps/web/src/components/dashboard/ChatThread.tsx (NEW)
function ChatThread({
  messages,
}: {
  messages: ChatMessage[];
}): JSX.Element;

// apps/web/src/components/dashboard/MetricsPanel.tsx (NEW)
function MetricsPanel({
  metrics,
  previousMetrics,
}: {
  metrics: ProductMetrics;
  previousMetrics: ProductMetrics | null;
}): JSX.Element;
```

**SSE Events consumed (from Phase 1B):**
```typescript
type SSEEvent =
  | { type: 'decision_prompt'; node: DecisionNodeValidated }
  | { type: 'metrics_update'; metrics: ProductMetrics }
  | { type: 'agent_message'; agent: AgentRole; content: string }
  | { type: 'error'; error: string }
  | { type: 'session_complete'; score: SessionScore }
  | { type: 'sprint_complete'; sprint: number; score: SprintScore };
```

---

## Tasks

### Wave 1 (stores and hooks — no dependencies)

- [ ] Task 1 — SessionStore (Zustand)
  - File: `apps/web/src/stores/session-store.ts` (new — existing `ui-store.ts` is separate)
  - Test: `apps/web/src/stores/__tests__/session-store.test.ts` (new)
  - Verify: `npm test -- --grep "SessionStore" --prefix apps/web`
  - Commit: `feat(web): add Zustand SessionStore — session state, metrics, messages`
  - Logic: Zustand store with `sessionId`, `status`, `currentNode`, `messages[]`, `metrics`, actions
  - SSE events update store: `decision_prompt` → set `currentNode`, `metrics_update` → set `metrics`, `agent_message` → append to `messages`, `session_complete` → set `status: completed`
  - Edge: SSE disconnect → `isConnected: false`, retry connection every 5s

- [ ] Task 2 — useSessionSync hook
  - File: `apps/web/src/hooks/use-session-sync.ts` (modify existing)
  - Test: `apps/web/src/hooks/__tests__/use-session-sync.test.ts` (new)
  - Verify: `npm test -- --grep "useSessionSync" --prefix apps/web`
  - Commit: `feat(web): wire useSessionSync → SSE stream → SessionStore`
  - Logic:
    1. `fetch('/sessions/' + sessionId + '/stream')` as EventSource
    2. Parse SSE events: `event: data` lines
    3. Dispatch parsed events to SessionStore
    4. `useRef` for EventSource, cleanup on unmount
  - Edge: fetch error → set `error` state, retry after 5s; event parse error → log + ignore

### Wave 2 (components — depends on Wave 1)

- [ ] Task 3 — DecisionPrompt component
  - File: `apps/web/src/components/dashboard/DecisionPrompt.tsx` (new)
  - Test: `apps/web/src/components/dashboard/__tests__/DecisionPrompt.test.tsx` (new)
  - Verify: `npm test -- --grep "DecisionPrompt" --prefix apps/web && tsc --noEmit --prefix apps/web`
  - Commit: `feat(web): add DecisionPrompt — display options + freeform input`
  - Logic:
    - Show `node.prompt` as question text
    - Render each `option.label` as a button
    - If `node.allow_freeform` → show `<textarea>` for custom input
    - On option click → `onSubmit(optionId)` → calls `POST /sessions/:id/decision`
    - Show `node.time_pressure_seconds` as countdown timer if set (optional enhancement)
    - Disable after submit until next `decision_prompt` event
  - Edge: no options available → show "Loading..." skeleton; submit in progress → disable buttons

- [ ] Task 4 — ChatThread component
  - File: `apps/web/src/components/dashboard/ChatThread.tsx` (new)
  - Test: `apps/web/src/components/dashboard/__tests__/ChatThread.test.tsx` (new)
  - Verify: `npm test -- --grep "ChatThread" --prefix apps/web`
  - Commit: `feat(web): add ChatThread — scrollable agent message history`
  - Logic:
    - Render `messages[]` in reverse chronological (newest at bottom, auto-scroll)
    - Each message: avatar (icon by AgentRole), name, content, timestamp
    - BA messages: blue tint, "BA Agent" label
    - Stakeholder messages: orange tint, role name label
    - Empty state: "Agent responses will appear here..."
  - Edge: long messages → truncate with "Show more" toggle; special formatting for JSON in BA spec (code block)

- [ ] Task 5 — MetricsPanel component
  - File: `apps/web/src/components/dashboard/MetricsPanel.tsx` (new)
  - Test: `apps/web/src/components/dashboard/__tests__/MetricsPanel.test.tsx` (new)
  - Verify: `npm test -- --grep "MetricsPanel" --prefix apps/web`
  - Commit: `feat(web): add MetricsPanel — real-time metrics with delta indicators`
  - Logic:
    - Display `metrics.dau`, `metrics.revenue_mrr`, `metrics.nps`, `metrics.churn_rate`, `metrics.bug_count`
    - Compare with `previousMetrics`: show ▲ green / ▼ red delta
    - Sprint indicator: "Sprint N" badge
    - Animated number transitions (CSS transition on value change)
  - Edge: `previousMetrics` is null on first render → no delta shown; metrics = 0 → show "—"

### Wave 3 (layout + API — depends on Wave 2)

- [ ] Task 6 — DashboardLayout + API client
  - File: `apps/web/src/components/dashboard/DashboardLayout.tsx` (new)
  - File: `apps/web/src/lib/api.ts` (modify — add decision submission)
  - Test: `apps/web/src/components/dashboard/__tests__/DashboardLayout.test.tsx` (new)
  - Verify: `npm test -- --grep "DashboardLayout" --prefix apps/web && tsc --noEmit --prefix apps/web`
  - Commit: `feat(web): add DashboardLayout — 3-column grid with header`
  - Layout: Header (sprint indicator, scenario title, status) + 3 columns:
    - Left: DecisionPrompt (top), ChatThread (bottom)
    - Right: MetricsPanel
  - Connect to API: `POST /sessions/:id/decision` via `api.ts`
  - Edge: session not found → show error screen; network error → toast notification

- [ ] Task 7 — Decision submission flow
  - File: `apps/web/src/hooks/use-decision.ts` (new)
  - Test: `apps/web/src/hooks/__tests__/use-decision.test.ts` (new)
  - Verify: `npm test -- --grep "useDecision" --prefix apps/web`
  - Commit: `feat(web): add useDecision hook — submit decision + optimistic UI`
  - Logic:
    - `submitDecision(sessionId, optionId, timeTaken)` → `POST /sessions/:id/decision`
    - Optimistic: immediately show "Processing..." in ChatThread (pending BA message)
    - On success: remove pending message, SSE will deliver real agent messages
    - On error: show toast, restore previous state
  - Edge: double-click prevention (debounce 1s); network timeout (30s)

- [ ] Task 8 — Home page → redirect to session
  - File: `apps/web/src/app/page.tsx` (modify existing — replace DashboardLayout)
  - Verify: `npm run build --prefix apps/web`
  - Commit: `fix(web): wire page.tsx → DashboardLayout with session context`
  - Logic:
    - Create session automatically (or use existing session ID from URL param `?session=xxx`)
    - Pass sessionId to DashboardLayout
    - Show loading state while session initializes

---

## Failure Scenarios

| When | Then | UI Behavior |
|------|------|------------|
| SSE disconnect | retry every 5s, show "Reconnecting..." banner | Banner at top |
| `POST /decision` fails | show toast "Decision failed", allow retry | Toast notification |
| `metrics_update` with NaN | ignore event, keep previous metrics | No change |
| `session_complete` event | show completion screen with score | Full-screen overlay |
| Agent message with invalid content | show "[Message could not be loaded]" | Placeholder text |
| SSE server unreachable | `useSessionSync` sets `isConnected: false`, retry loop | Connection status indicator |

---

## Rejection Criteria (DO NOT)

- ❌ DO NOT call LLM or do computation in components — all business logic in stores/hooks/services
- ❌ DO NOT use `useState` for shared state — use Zustand for session state (only Zustand, not multiple stores competing)
- ❌ DO NOT poll REST endpoints for session state — use SSE only for state updates
- ❌ DO NOT block rendering while waiting for SSE — show skeleton/loading states immediately
- ❌ DO NOT hardcode API base URL — use `NEXT_PUBLIC_API_URL` env variable
- ❌ DO NOT use `any` type for SSE event payloads — use the SSEEvent union type from orchestrator (share via `packages/shared`)

---

## Cross-Phase Context

- **Assumes Phase 1B**: SSE endpoint at `GET /sessions/:id/stream` exists and emits documented event types
- **Assumes Phase 1B**: `POST /sessions/:id/decision` route exists in orchestrator
- **Assumes Phase 1A**: `AgentRole` types exported from `packages/shared`
- **Exports for Phase 1D**: DashboardLayout is the primary user-facing component for E2E testing

---

## Acceptance Criteria

- [ ] `npm run build` succeeds in `apps/web`
- [ ] `tsc --noEmit` passes in `apps/web`
- [ ] SSE stream connects and receives events on `session:events` channel
- [ ] Submitting a decision shows agent responses in ChatThread within 5s (mock mode)
- [ ] Metrics panel shows updated values after each decision
- [ ] Session complete screen shows score and XP
- [ ] No `any` types in component props or SSE handling
- [ ] All components have corresponding tests (Vitest + React Testing Library)

---

## Files Touched
- `apps/web/src/stores/session-store.ts` — new
- `apps/web/src/stores/__tests__/session-store.test.ts` — new
- `apps/web/src/hooks/use-session-sync.ts` — modify
- `apps/web/src/hooks/__tests__/use-session-sync.test.ts` — new
- `apps/web/src/hooks/use-decision.ts` — new
- `apps/web/src/hooks/__tests__/use-decision.test.ts` — new
- `apps/web/src/components/dashboard/DecisionPrompt.tsx` — new
- `apps/web/src/components/dashboard/__tests__/DecisionPrompt.test.tsx` — new
- `apps/web/src/components/dashboard/ChatThread.tsx` — new
- `apps/web/src/components/dashboard/__tests__/ChatThread.test.tsx` — new
- `apps/web/src/components/dashboard/MetricsPanel.tsx` — new
- `apps/web/src/components/dashboard/__tests__/MetricsPanel.test.tsx` — new
- `apps/web/src/components/dashboard/DashboardLayout.tsx` — new
- `apps/web/src/components/dashboard/__tests__/DashboardLayout.test.tsx` — new
- `apps/web/src/lib/api.ts` — modify
- `apps/web/src/app/page.tsx` — modify