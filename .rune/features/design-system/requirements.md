# Requirements Document: PO Simulation Platform Design System

Created: 2026-04-08 | BA Session: Design System and UI Mockups

---

## Context

The PO Simulation Platform is a "flight simulator for Product Owners" — a professional training environment where POs practice real product decisions with AI teammates. The design system must create an immersive "virtual office" experience that feels like Slack/Jira, not a game. Every design decision should reduce cognitive load during decision-making and emphasize learning through doing.

---

## Stakeholders

### Primary User: Product Owners
- **Experience level**: 0-3 years PO experience (new to intermediate)
- **Age range**: 25-45 professionals
- **Technical comfort**: Familiar with Slack, Jira, Confluence, Figma — expect similar UX patterns
- **Context of use**: Desktop/laptop (primary), tablet (secondary), office or remote work environment
- **Session length**: 25-40 minutes per session
- **Mental model**: "Going to work" not "playing a game"

### Secondary Stakeholders
- **AI Agents** (BA, Stakeholder, Designer, Dev, Customer): Need clear visual identity in chat
- **Coach/System**: Needs non-intrusive feedback delivery mechanism
- **Metrics Engine**: Needs dashboard real estate for scoring visualization

### Affected Systems
- Next.js frontend (apps/web)
- Tailwind CSS styling system
- Zustand state management (UI state)
- WebSocket chat interface
- SSE notification system

---

## User Stories

### US-1: Dashboard Overview
As a Product Owner, I want to see my daily priorities at a glance so that I can focus on the most important decisions.

- **AC-1.1**: GIVEN I open the app WHEN the dashboard loads THEN I see a 3-column layout (sidebar | main workspace | right panel)
- **AC-1.2**: GIVEN it's a new simulation day WHEN I view the dashboard THEN "Today's Focus" shows 3-5 priority items sorted by urgency
- **AC-1.3**: GIVEN agents are working WHEN I view the right panel THEN I see each agent's current status in real-time
- **AC-1.4**: GIVEN I have unread notifications WHEN I view the sidebar THEN badge counts appear on relevant sections

### US-2: Decision Interface
As a Product Owner, I want clear decision options with visible trade-offs so that I can make informed choices.

- **AC-2.1**: GIVEN a decision is required WHEN I view the decision interface THEN I see the context, 2-4 options, and consequences for each
- **AC-2.2**: GIVEN I'm considering an option WHEN I hover/focus on it THEN I see expanded details without leaving the current view
- **AC-2.3**: GIVEN I select an option WHEN I confirm my decision THEN I receive immediate visual feedback (loading → confirmation)
- **AC-2.4**: GIVEN I made a decision WHEN coach feedback is available THEN it appears as a non-blocking toast/whisper

### US-3: Agent Chat Interface
As a Product Owner, I want to chat with AI agents in a familiar format so that I can communicate naturally.

- **AC-3.1**: GIVEN I'm in a chat WHEN messages appear THEN they follow Slack-like threading (avatar, name, timestamp, message)
- **AC-3.2**: GIVEN a message contains structured data (spec, criteria) WHEN I view it THEN it renders as a formatted card, not raw text
- **AC-3.3**: GIVEN an agent is typing WHEN I'm waiting for response THEN I see a typing indicator within 500ms
- **AC-3.4**: GIVEN different agents WHEN they send messages THEN each has a distinct visual identity (avatar, color accent)

### US-4: Agent Feedback Panel
As a Product Owner, I want to see agent feedback organized by source so that I can track team responses.

- **AC-4.1**: GIVEN multiple agents respond WHEN I view the feedback panel THEN responses are grouped by agent with clear headers
- **AC-4.2**: GIVEN feedback has different priorities WHEN I view it THEN urgent items have visual emphasis (color, icon, position)
- **AC-4.3**: GIVEN an agent references previous context WHEN I view the message THEN I can click to jump to the referenced item
- **AC-4.4**: GIVEN feedback requires action WHEN I view it THEN actionable items have clear CTA buttons (Approve, Review, Reply)

### US-5: Metrics Visualization
As a Product Owner, I want to see my performance metrics visually so that I understand my progress.

- **AC-5.1**: GIVEN a sprint ends WHEN I view metrics THEN I see 4 category scores (Prioritization, Communication, Analytics, Stakeholder Mgmt)
- **AC-5.2**: GIVEN I have score history WHEN I view metrics THEN I see trend lines showing improvement over time
- **AC-5.3**: GIVEN a score is below threshold WHEN I view it THEN it's highlighted with coaching tip attached
- **AC-5.4**: GIVEN metrics are model-based WHEN displayed THEN a clear label states "Simulated metrics for training purposes"

### US-6: Morning Briefing / End of Day
As a Product Owner, I want structured day transitions so that I can prepare and reflect.

- **AC-6.1**: GIVEN a new day starts WHEN I view morning briefing THEN I see overnight updates, suggested focus items, and a "Start Day" CTA
- **AC-6.2**: GIVEN a day ends WHEN I view end-of-day summary THEN I see completed items, key decisions, and coach feedback
- **AC-6.3**: GIVEN I'm in a briefing modal WHEN I want to skip THEN I can dismiss with one click (not forced to read)

### US-7: Onboarding Flow
As a new user, I want guided introduction so that I understand how to use the platform.

- **AC-7.1**: GIVEN I'm a new user WHEN I first open the app THEN I see a welcome screen with experience level selection
- **AC-7.2**: GIVEN I select experience level WHEN I proceed THEN difficulty and coach hint frequency adjust accordingly
- **AC-7.3**: GIVEN I'm in onboarding WHEN viewing the dashboard THEN tooltips highlight key areas (5 tips, skippable)
- **AC-7.4**: GIVEN I complete onboarding WHEN I continue THEN my first decision is auto-triggered with coach whisper support

---

## Scope

### In Scope

**Design System Foundation**
- Color palette (light mode primary, dark mode optional P1)
- Typography scale (headings, body, code, labels)
- Spacing system (4px base grid)
- Border radius, shadows, elevation system
- Icon set (consistent style, 24px default)

**Component Library**
- Layout components: Sidebar, Header, 3-column grid, Panel
- Navigation: Tabs, Breadcrumbs, Badge
- Feedback: Toast, Alert, Modal, Tooltip, Whisper
- Data display: Card, List, Table, Chart, Progress bar, Score gauge
- Input: Button, Input, Textarea, Select, Checkbox, Radio
- Chat: Message bubble, Typing indicator, Avatar, Thread
- Agent-specific: Agent avatar with status, Agent card, Feedback item

**Key Screens (Mockups)**
1. Dashboard (3-column layout with all panels)
2. Chat interface (BA/Stakeholder conversation)
3. Decision interface (options with trade-offs)
4. Agent feedback panel
5. Metrics dashboard (4 categories + trends)
6. Morning briefing modal
7. End of day summary modal
8. Onboarding flow (4 screens)

### Out of Scope

- Mobile-native design (responsive web only, no iOS/Android native)
- Dark mode (P1 feature, not MVP)
- Animation library (basic transitions only, no complex animations)
- Design review screen with annotation (Phase 2 - Designer Agent)
- PR review screen (Phase 2 - Dev Agent)
- Multiplayer UI elements (Phase 3)
- Visual scenario editor (Phase 2)
- Custom theme/branding options

### Assumptions

1. **Tailwind CSS is the styling system** — design tokens must map to Tailwind config
2. **No Figma/design tool integration** — mockups will be high-fidelity HTML/CSS or detailed specs
3. **Stitch MCP available** — can be used for AI-assisted mockup generation
4. **Icons from existing library** — using Heroicons or Lucide, not custom icons
5. **Single language (English)** — no i18n in MVP
6. **Left-to-right layout only** — no RTL support in MVP

### Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Next.js app structure | Available | apps/web exists |
| Tailwind CSS | Available | Part of tech stack |
| Heroicons/Lucide | To install | Icon library needed |
| Inter/system font | Available | Web-safe fallback |
| Stitch MCP | To verify | For mockup generation |

---

## Non-Functional Requirements

| NFR | Requirement | Measurement |
|-----|-------------|-------------|
| **Accessibility** | WCAG 2.1 AA compliance | Axe audit, keyboard navigation test |
| **Color Contrast** | Minimum 4.5:1 for text, 3:1 for UI | Contrast checker tool |
| **Focus States** | All interactive elements have visible focus | Manual keyboard test |
| **Screen Reader** | All components have proper ARIA labels | VoiceOver/NVDA test |
| **Responsive** | Works on 1024px+ viewport (desktop/tablet) | Browser resize test |
| **Performance** | First Contentful Paint < 1.5s | Lighthouse |
| **Consistency** | 100% design token usage (no hardcoded values) | Code review |
| **Readability** | Body text 16px minimum, line height 1.5 | Visual inspection |

---

## Design Principles

1. **"Virtual Office" not "Game"** — Professional, calm, productivity-tool aesthetic. No gamification chrome, no reward animations, no leaderboard prominence.

2. **Focus on Decisions** — The decision interface is the hero. Minimize distractions during decision-making moments. Use progressive disclosure.

3. **Clear Visual Hierarchy** — Primary action always obvious. Urgent items visually distinct. Information density balanced (not overwhelming, not sparse).

4. **Familiar Patterns** — Leverage Slack/Jira/Notion conventions. Chat looks like chat. Dashboard looks like dashboard. Don't innovate on basic interaction patterns.

5. **Accessible by Default** — High contrast, keyboard navigable, screen reader friendly. Accessibility is not an afterthought.

6. **Calm Palette** — Blues and grays as primary. Accent colors for status (green=success, yellow=warning, red=urgent). Avoid high-saturation colors that strain eyes in long sessions.

---

## Design Token Specifications

### Color Palette (Light Mode)

```
Primary:
  primary-50:  #EFF6FF (background tint)
  primary-100: #DBEAFE (hover states)
  primary-500: #3B82F6 (default)
  primary-600: #2563EB (hover)
  primary-700: #1D4ED8 (active)

Neutral:
  gray-50:  #F9FAFB (page background)
  gray-100: #F3F4F6 (card background)
  gray-200: #E5E7EB (borders)
  gray-300: #D1D5DB (disabled)
  gray-500: #6B7280 (secondary text)
  gray-700: #374151 (primary text)
  gray-900: #111827 (headings)

Status:
  success-500: #22C55E (green)
  warning-500: #F59E0B (amber)
  error-500:   #EF4444 (red)
  info-500:    #3B82F6 (blue)

Agent Accents:
  agent-ba:          #8B5CF6 (violet)
  agent-stakeholder: #F97316 (orange)
  agent-designer:    #EC4899 (pink) [Phase 2]
  agent-dev:         #10B981 (emerald) [Phase 2]
  agent-customer:    #06B6D4 (cyan) [Phase 2]
```

### Typography

```
Font Family: Inter, system-ui, sans-serif

Scale:
  text-xs:   12px / 16px (labels, badges)
  text-sm:   14px / 20px (secondary text)
  text-base: 16px / 24px (body text)
  text-lg:   18px / 28px (lead text)
  text-xl:   20px / 28px (card titles)
  text-2xl:  24px / 32px (section headings)
  text-3xl:  30px / 36px (page titles)

Weights:
  font-normal:   400
  font-medium:   500
  font-semibold: 600
  font-bold:     700
```

### Spacing

```
Base: 4px

Scale:
  space-1:  4px
  space-2:  8px
  space-3:  12px
  space-4:  16px
  space-5:  20px
  space-6:  24px
  space-8:  32px
  space-10: 40px
  space-12: 48px
  space-16: 64px
```

### Borders & Shadows

```
Border Radius:
  rounded-sm:  4px  (small elements)
  rounded-md:  6px  (buttons, inputs)
  rounded-lg:  8px  (cards)
  rounded-xl:  12px (modals)
  rounded-full: 9999px (avatars, badges)

Shadows:
  shadow-sm:  0 1px 2px rgba(0,0,0,0.05)
  shadow-md:  0 4px 6px rgba(0,0,0,0.1)
  shadow-lg:  0 10px 15px rgba(0,0,0,0.1)
  shadow-xl:  0 20px 25px rgba(0,0,0,0.1)
```

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stitch MCP unavailable/limited | Medium | Fallback to manual mockup creation with detailed specs |
| Design tokens don't map to Tailwind | Low | Use Tailwind's built-in scale, extend config minimally |
| Accessibility requirements missed | High | Use automated testing (Axe) + manual keyboard/screen reader test |
| Design inconsistency across screens | Medium | Create component library before screens, enforce token usage |
| Scope creep into Phase 2 features | Medium | Strict adherence to Out of Scope list |

---

## Decision Classification

| Category | Items |
|----------|-------|
| **Decisions (locked)** | 3-column layout, Tailwind CSS, WCAG 2.1 AA, light mode only for MVP, Inter font |
| **Discretion (agent decides)** | Exact hex values within palette, shadow intensity, specific component styling |
| **Deferred (out of scope)** | Dark mode, mobile native, animation library, Design/PR review screens |

---

## Clarity Score

```
Clarity Score: 88%
  Goal:             [██████████] 1.0 — Clear: design system for PO training platform
  Constraints:      [█████████░] 0.9 — Clear: Tailwind, WCAG 2.1, light mode, desktop
  Success Criteria: [████████░░] 0.8 — Good: user stories with acceptance criteria
  Integration:      [████████░░] 0.8 — Good: Next.js + Tailwind, Stitch MCP TBD
  Status: CLEAR (ambiguity 12%) — ready to proceed
```

---

## Next Step

→ Proceed to **Design Phase**:
1. Create `.rune/design-system.md` with full token specifications
2. Use Stitch MCP to generate UI mockups for 8 key screens
3. Save mockups to `docs/ui-mockups/`
4. Present to user for approval before implementation

---

## Appendix: Screen Layout Specifications

### Dashboard (3-Column)
```
+------------------------------------------------------------------+
|  [Logo] PO Sim    Sprint 3 - Day 4/10    9:15 AM    [Profile]    |
+------------------------------------------------------------------+
|  SIDEBAR    |     MAIN WORKSPACE (60%)    |   RIGHT PANEL (25%)  |
|  (15%)      |                             |                       |
|  Dashboard  |  +------------------------+ |  Sprint Health        |
|  Backlog    |  | TODAY'S FOCUS          | |  Velocity: 24        |
|  Sprint     |  | 3 items need attention | |  Burndown: [chart]   |
|  Team Chat  |  +------------------------+ |  Blockers: 1         |
|  Reviews    |  |                         | |                       |
|  Meetings   |  | [!] Urgent item        | |  Team Status          |
|  Reports    |  | [>] Pending item       | |  BA: Writing spec    |
|             |  | [?] Question item      | |  Dev: Coding         |
|  -----      |  +------------------------+ |                       |
|  Settings   |                             |  Coach Tips           |
|  Coach      |  ACTIVITY FEED              |  "Focus on..."        |
+------------------------------------------------------------------+
```

### Decision Interface
```
+------------------------------------------------------------------+
|  DECISION REQUIRED                                     [X Close]  |
+------------------------------------------------------------------+
|                                                                    |
|  CONTEXT                                                          |
|  [Brief description of situation requiring decision]              |
|                                                                    |
|  +------------------------+  +------------------------+           |
|  | OPTION A               |  | OPTION B               |           |
|  | [Description]          |  | [Description]          |           |
|  |                        |  |                        |           |
|  | Trade-offs:            |  | Trade-offs:            |           |
|  | + Pro 1                |  | + Pro 1                |           |
|  | - Con 1                |  | - Con 1                |           |
|  |                        |  |                        |           |
|  | [Select Option A]      |  | [Select Option B]      |           |
|  +------------------------+  +------------------------+           |
|                                                                    |
|  +----------------------------------------------------+          |
|  | COACH WHISPER: Consider asking for more data first |          |
|  +----------------------------------------------------+          |
|                                                                    |
+------------------------------------------------------------------+
```
