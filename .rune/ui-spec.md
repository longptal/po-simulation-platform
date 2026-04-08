# UI Specification: PO Simulation Platform
Locked: 2026-04-08 | Mood: Confident + Professional

## Layout Decisions
- Page max-width: 100vw (3-column dashboard fills viewport)
- Header height: 56px — logo left, sprint/time center, profile right
- 3-column layout: Sidebar (240px fixed) | Main Workspace (60% flexible) | Right Panel (320px fixed)
  - Breakpoint <1024px: right panel → drawer, main → full
  - Breakpoint <768px: sidebar → collapse to icons, right panel hidden
- Content density: Balanced — data readable but not sparse
- Column gaps: 8px between sidebar/main, 16px between main/right
- Card sizing: Uniform — all cards same padding (16px) and border (zinc-200)
  - Section headers within cards are consistent (text-lg, font-semibold, zinc-900)

## Visual Hierarchy Rules
- Primary action: brand-600 button, size md (40px height), font-medium — ONE per viewport
- Secondary action: ghost button with zinc-700 text — max 2 per section
- Data emphasis: tabular-nums for ALL numbers, brand-600 color for actionable metrics
- Section separation: spacing (16px between cards, 24px between sections)
- Urgency hierarchy:
  - URGENT: red text + "!" icon + card border-red
  - HIGH: amber text + warning icon
  - NORMAL: zinc text, no special indicator

## Navigation
- Sidebar: fixed left, 240px, 7-8 items, active item highlighted with brand-600 left border + brand-50 bg
- Top bar: fixed, 56px height, contains: logo/sprint name | sprint progress/time | notifications bell | profile
- Breadcrumbs: not used — sidebar provides navigation context

## Component Decisions
- Card style: elevated (white bg, 1px zinc-200 border, sm shadow on hover) — clean, not flat
- Table style: minimal (borders between rows, no stripes, hover bg-zinc-50 on row)
- Form layout: stacked (label above input, 8px gap) — standard for all forms
- Chat style: message bubbles with agent avatar left, name+timestamp header, message body
  - User (PO): right-aligned, brand-50 bg
  - Agent: left-aligned, zinc-50 bg
  - Structured data (specs, criteria): rendered as bordered card within chat
- Toast notification: bottom-right, 3s auto-dismiss, slide-up animation
- Badge: small, rounded-full, colored bg with dark text (not white on color — fails contrast)

## Locked Anti-Decisions (things we explicitly chose NOT to do)
- ❌ Sidebar with 10+ nav items — keeps navigation focused on essential tasks
- ❌ Dark mode in MVP — target users work during day with office tools; defers to P1
- ❌ Gamification elements (trophies, levels, confetti) — "virtual office" not "game"
- ❌ Purple/indigo brand accent — reserved for BA Agent identity, use as UI accent would confuse
- ❌ Orange brand accent — reserved for Stakeholder Agent identity
- ❌ Card grid for dashboard sections — structured layout (list, feed, stacked) per section type
- ❌ Coach whisper as full overlay — whisper is small toast, non-blocking
- ❌ Metric values without trend arrows — always show direction (up/down/steady)
- ❌ Simulated metrics without "Simulated" label — always labeled clearly
- ❌ Bouncy/spring animations — contradicts Professional mood
- ❌ Gradient backgrounds — decorative, competes with decision content
- ❌ Custom fonts — Inter system font is sufficient for all roles
