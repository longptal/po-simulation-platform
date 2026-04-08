# Design System: PO Simulation Platform

Last Updated: 2026-04-08
Platform: Web (Next.js + Tailwind CSS, PWA)
Domain: Training / Educational SaaS Dashboard
Style: Minimalism — Virtual Office (clean, professional, focus-oriented)
Mood: Confident + Professional

---

## Mood Constraints

| Constraint | Value | Reasoning |
|------------|-------|-----------|
| Color Temperature | Cool-neutral (zinc-slate) | Confidence without coldness; professional for work context |
| Typography Weight | Medium-heavy (500-700) for headings, 400-500 body | Readable emphasis without shouting |
| Whitespace | Balanced (md-xl) | Enough room to breathe, not wasted — data-dense sections exist |
| Animation | Subtle (0.2-0.3s ease) | Never distract from decision-making moments |
| Shadow | Standard, crisp elevation | Clear hierarchy without softness; defined surfaces |

---

## Color Tokens

### Primitives (Tailwind-compatible)

```
Primary Brand:
  brand-50:  #eff6ff
  brand-100: #dbeafe
  brand-200: #bfdbfe
  brand-500: #3b82f6
  brand-600: #2563eb
  brand-700: #1d4ed8

Neutral (Zinc):
  zinc-50:  #fafafa
  zinc-100: #f4f4f5
  zinc-200: #e4e4e7
  zinc-300: #d4d4d8
  zinc-400: #a1a1aa
  zinc-500: #71717a
  zinc-600: #52525b
  zinc-700: #3f3f46
  zinc-800: #27272a
  zinc-900: #18181b

Semantic:
  success-500: #22c55e
  success-600: #16a34a
  warning-500: #f59e0b
  warning-600: #d97706
  error-500:   #ef4444
  error-600:   #dc2626
  info-500:    #3b82f6

Agent Identity:
  agent-ba:          #8b5cf6  (violet)
  agent-stakeholder: #f97316  (orange)
  agent-designer:    #ec4899  (pink)   [Phase 2]
  agent-dev:         #10b981  (emerald)[Phase 2]
  agent-customer:    #06b6d4  (cyan)   [Phase 2]
```

### Semantic Tokens (meaning-mapped)

```
--bg-base:        zinc-50 (#fafafa)   — page background
--bg-surface:     white (#ffffff)     — card/panel background
--bg-elevated:    white + shadow-md   — modal/dropdown, overlays
--bg-subtle:      zinc-100 (#f4f4f5) — alternate row, sidebar bg
--bg-brand:       brand-600 (#2563eb) — primary action button

--text-primary:   zinc-900 (#18181b)  — headings, labels
--text-secondary: zinc-500 (#71717a)  — descriptions, timestamps
--text-muted:     zinc-400 (#a1a1aa)  — disabled, placeholders
--text-inverse:   white (#ffffff)     — text on dark/brand bg
--text-brand:     brand-600 (#2563eb) — links, clickable hints

--border:         zinc-200 (#e4e4e7)  — default border
--border-strong:  zinc-300 (#d4d4d8)  — focused, selected borders

--accent:         brand-600 (#2563eb) — primary action, active nav
--accent-hover:   brand-700 (#1d4ed8) — hover state for accent

--success:        success-500 (#22c55e)  — positive outcome, complete
--danger:         error-500 (#ef4444)    — errors, blockers, urgent
--warning:        warning-500 (#f59e0b)  — caution, attention needed
--info:           info-500 (#3b82f6)     — informational, coach tips

--sim-label:      zinc-400 (#a1a1aa)  — "simulated" label color
```

### Contrast Verification (WCAG 2.2 AA)

| Foreground | Background | Ratio | Pass |
|------------|------------|-------|------|
| zinc-900 | zinc-50 | 15.5:1 | ✅ 4.5:1 |
| zinc-700 | zinc-50 | 10.2:1 | ✅ 4.5:1 |
| zinc-500 | zinc-50 | 5.6:1 | ✅ 4.5:1 |
| white | brand-600 | 4.6:1 | ✅ 4.5:1 |
| zinc-900 | white | 15.2:1 | ✅ 4.5:1 |
| zinc-500 (18px+) | white | 3.1:1 | ✅ 3:1 large |
| error-500 | white | 3.6:1 | ✅ 3:1 large/UI |
| brand-600 (18px+) | white | 4.1:1 | ✅ 3:1 large/UI |
| success-500 | white | 2.9:1 | ⚠️ 1.8:1 — use with icon/text label, never color alone |
| warning-500 | white | 1.8:1 | ⚠️ Below 3:1 — requires icon + text, bg-50 container |

## Design Tokens Mapping
## Design Tokens

### Color Palette
The design system uses Tailwind CSS with Zinc neutrals and Blue as the primary accent color. This combination provides a professional, trustworthy, and calm appearance suitable for Product Owners in training scenarios. Key characteristics:

- **Zinc** (neutral): Used for text, backgrounds, borders, and subtle UI elements
- **Blue** (primary): Used for primary actions, links, active states, and brand elements
- **Status colors**: Semantic colors for success (green), warning (amber), error (red), and info (blue)

**Color Palette Table:**

| Role | Hex | Usage |
|------|-----|-------|
| `--bg-base` | #fafafa | Page background |
| `--bg-surface` | #ffffff | Card/panel background |
| `--bg-elevated` | #f8f9fa | Modal/dropdown background |
| `--bg-subtle` | #f4f4f5 | Alternate row, sidebar |
| `--text-primary` | #18181b | Primary text (headings, labels) |
| `--text-secondary` | #71717a | Secondary text (subtitles, notes) |
| `--text-muted` | #a1a1aa | Muted text (placeholders, disabled) |
| `--text-inverse` | #ffffff | Text on dark/brand elements |
| `--accent` | #2563eb | Primary action buttons, links, active |
| `--accent-hover` | #1d4ed8 | Hover state for accent elements |
| `--border` | #e4e4e7 | Default border |
| `--border-strong` | #d4d4d8 | Strong border |
| `--success` | #22c55e | Positive state (success, complete) |
| `--warning` | #f59e0b | Warning/attention state |
| `--danger` | #ef4444 | Negative state (error, reject) |
| `--info` | #3b82f6 | Informational state |

### Agent Identity Colors

| Agent | Hex | Semantic |
|-------|-----|----------|
| BA | #8b5cf6 | Analysis, specification |
| Stakeholder | #f97316 | Business pressure, priority |
| Designer | #ec4899 | Design review (Phase 2) |
| Dev | #10b981 | Development (Phase 2) |
| Customer | #06b6d4 | User feedback (Phase 2) |

### Typography

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| `--font-heading` | Inter | 20px | 700 | 1.2 |
| `--font-body` | Inter | 16px | 400 | 1.5 |
| `--font-small` | Inter | 14px | 400 | 1.4 |
| `--font-label` | Inter | 12px | 700 | 1.3 |
| `--font-mono` | JetBrains Mono | 14px | 400 | 1.5 |

### Spacing

| Unit | Value |
|------|-------|
| `--spacing-xs` | 4px |
| `--spacing-sm` | 8px |
| `--spacing-md` | 16px |
| `--spacing-lg` | 24px |
| `--spacing-xl` | 32px |
| `--spacing-2xl` | 40px |

### Border Radius

| Level | Value |
|-------|-------|
| `--radius-sm` | 4px |
| `--radius-md` | 6px |
| `--radius-lg` | 8px |
| `--radius-xl` | 12px |

### Shadows

| Level | Value |
|-------|-------|
| `--shadow-sm` | 0 1px 2px 0 rgba(0,0,0,0.05) |
| `--shadow-md` | 0 4px 6px -1px rgba(0,0,0,0.1) |
| `--shadow-lg` | 0 10px 15px -3px rgba(0,0,0,0.1) |
| `--shadow-xl` | 0 20px 25px -5px rgba(0,0,0,0.1) |

## Typography

### Font Family

| Role | Font | Weights | Reasoning |
|------|------|---------|-----------|
| Headings | Inter | 600, 700 | Data Dense pairing — readable, structured |
| Body/UI | Inter | 400, 500 | Consistent, professional |
| Labels/Badges | Inter | 500, 600 | Tracking-wide for legibility at small sizes |
| Numbers/Metrics | Inter (default), JetBrains Mono (optional) | 500, 600 | Metrics display benefits from tabular-nums |

Numbers rule: `font-variant-numeric: tabular-nums` on ALL metric values, scores, and times to prevent layout shift during updates.

### Type Scale (Tailwind)

| Role | Class | Size/Line-Height | Weight |
|------|-------|------------------|--------|
| Page Title | `text-2xl` | 24px / 32px | 700 |
| Section Heading | `text-xl` | 20px / 28px | 600 |
| Card Title | `text-lg` | 18px / 28px | 600 |
| Body | `text-base` | 16px / 24px | 400 |
| Secondary Text | `text-sm` | 14px / 20px | 400 |
| Label / Badge | `text-xs` | 12px / 16px | 500 |

---

## Spacing (4px base)

```
xs:  4px   — gaps between icons/text inline
sm:  8px   — gaps between related elements (checkbox+label)
md:  16px  — card padding, section gaps
lg:  24px  — panel margins, major section breaks
xl:  32px  — major page sections, dashboard column gaps
2xl: 48px  — page-level outer margins
3xl: 64px  — header/margin below header
```

Why 4px base (vs 8px): The 3-column dashboard needs tighter granularity for agent avatars, badges, and inline elements that 8px cannot express cleanly.

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| sm: 4px | Inputs, small buttons, badges
| md: 6px | Buttons, dropdowns, tooltips
| lg: 8px | Cards, panels, modals
| xl: 12px | Large containers, overlay panels
| full: 9999px | Avatars, pill badges, circular indicators |

---

## Effects

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| sm | 0 1px 2px rgba(0,0,0,0.05) | Subtle card elevation
| md | 0 4px 6px rgba(0,0,0,0.1) | Raised cards, modals
| lg | 0 10px 15px rgba(0,0,0,0.1) | Dropdowns, popovers
| xl | 0 20px 25px rgba(0,0,0,0.15) | Large overlays, tooltips

### Focus Ring

```
focus: ring-2 ring-brand-500 ring-offset-2
```

ALL interactive elements: visible focus ring is mandatory for accessibility.

### Transitions

| Trigger | Duration | Easing |
|---------|----------|--------|
| Hover (card, button) | 150ms | ease-out
| Hover (nav) | 150ms | ease
| Focus | 150ms | ease
| Toast in/out | 200ms | ease-out
| Modal open/close | 150ms | ease

WHY no bouncy/spring: "Bouncy" animations contradict the Professional mood. Transitions serve functional purpose (state confirmation), not entertainment.

---

## Anti-Patterns (MUST NOT generate these)

These patterns have been explicitly rejected for the PO Simulation Platform domain:

- ❌ Purple-to-blue gradient backgrounds — the default AI signature, signals no design intent for SaaS training platform
- ❌ Gamification chrome (trophies, badges, confetti) — "Virtual office" not "game". Metrics show progress via scores, not rewards
- ❌ Rainbow color palettes in dashboards — max 3 status colors per context. Each additional color reduces signal value
- ❌ Inter-only typography with no scale — MUST use heading/body/label hierarchy. Inter throughout is acceptable IF size/weight vary
- ❌ Card grid monotony — every section the SAME card layout. Dashboard has structured sections: Today's Focus (list), Activity (feed), Team Status (stacked)
- ❌ Animations that delay information or decision visibility — users scan dashboard in <3s. Animations must not block data visibility
- ❌ Agent colors as UI decoration — agent accent colors identify WHO spoke, not what section they're in. Don't tint entire card backgrounds
- ❌ Generic "Loading..." text — use context-specific: "BA is analyzing your request...", "Loading scenario context..."
- ❌ Dark mode as MVP default — Light mode first. Target audience uses office tools during work hours. Dark mode optional P1
- ❌ Red for informational messages — reserve red for errors and blockers. Use amber for cautions, blue for info
- ❌ Large hero sections — this is a dashboard, not a landing page. Hero should be Today's Focus (actionable), not decorative text
- ❌ Sidebar navigation with 10+ items — keep it to essential 7-8 items (Dashboard, Backlog, Sprint, Chat, Reviews, Reports, Settings)
- ❌ Overlapping content areas — 3-column layout is structured. Columns maintain clean separation
- ❌ Coach whisper presented as full modal — whisper is small, non-blocking toast. Full coaching is in end-of-day review
- ❌ Metric scores in isolation — always show trend direction (up/down/steady) with arrow indicator
- ❌ Using purple (#8b5cf6) as brand/accent color — reserved for BA Agent identity only. Using as UI accent will confuse users
- ❌ Using orange (#f97316) as primary action — reserved for Stakeholder Agent identity
- ❌ Simulated metrics displayed without disclaimer label — MUST show "Simulated for training" label on all metric displays

---

## Platform Notes

- Default light mode (dark mode is P1)
- Dark mode support via tailwind darkMode: 'class'
- Responsive: 1440px (desktop), 1024px (tablet landscape), 768px (tablet portrait)
- 3-column layout only on 1440px+; tablet collapses right panel to drawer; mobile collapses sidebar
- PWA: offline mode is not MVP requirement (training happens during active sessions, not offline)
- Target: Chrome, Firefox, Safari, Edge — no IE11
- Font loading: next/font (Inter from Google Fonts with fallback system-ui)

---

## Component Library

No existing library detected. Will use custom components with Tailwind CSS primitives.

Recommended for MVP: shadcn/ui as base primitive component library (copy-paste, no runtime dependency, fully customizable with Tailwind config).

---

## UX Writing

### Tone
Professional, direct, and supportive. PO is at work — communication should be like a good colleague: clear, concise, and actionable. No humor, no slang, no corporate-speak.

### Microcopy Templates

| Pattern | Template | Example |
|---------|----------|---------|
| Error | "Couldn't [action]. [Reason]. [Next step]" | "Couldn't load scenario. Network connection lost. Check connection and try again." |
| Empty state | "No [items] yet. [How to start]" | "No decisions today. Check back after morning briefing." |
| Success confirmation | "[What happened]. [What's next]" | "Spec reviewed and approved. BA is moving to implementation." |
| Loading | "[Agent] is [action]..." | "BA is writing the specification..." |
| Coach whisper | "Tip: [specific action]" | "Tip: Ask BA for user data before prioritizing." |
| Urgent notification | "URGENT: [what needs attention]" | "URGENT: Stakeholder wants to discuss priority" |
| Button labels | Verb-first, specific | "Review spec", "Start day", "Approve design" |

### Agent Voice Guidelines
- **BA**: Professional, analytical. Uses "I've analyzed..." "Here are the findings..." "Recommendation: ..."
- **Stakeholder**: Direct, business-focused. Uses "I need..." "The deadline is..." "Can you explain why..."
- **Coach**: Supportive, instructive. Uses "Tip: ..." "Consider..." "Remember to..."

### Words to AVOID
- "Game", "Level", "Score" (use "Simulation", "Scenario", "Rating" / "Performance")
- "Win", "Lose" (use "Meets criteria", "Needs improvement")
- "Player" (use "PO", "You")
- Generic: "Something went wrong", "Click here", "Submit"

---

## Pre-Delivery Checklist

- [ ] Color contrast ≥ 4.5:1 for all text (verified above — note: success/warning on white require icon+text, not color alone)
- [ ] Focus-visible ring on ALL interactive elements (never outline-none alone) — focus:ring-2 ring-brand-500 ring-offset-2
- [ ] Touch targets ≥ 24×24px with 8px gap between targets
- [ ] All icon-only buttons have aria-label
- [ ] All inputs have associated <label> or aria-label
- [ ] Empty state, error state, loading state for all async data
- [ ] cursor-pointer on all clickable non-button elements
- [ ] prefers-reduced-motion respected for all animations
- [ ] Dark mode support (or explicit reasoning why not) — light mode MVP, dark mode P1
- [ ] Responsive tested at 375px / 768px / 1024px / 1440px
- [ ] "Simulated metrics" label on all metric displays without disclaimer
- [ ] Agent identity colors consistent across all chat/message components
- [ ] No purple or orange used as primary/accent brand color
- [ ] All metric values use tabular-nums font variant
- [ ] All button labels are verb-first, specific (not "Submit", "OK")
- [ ] Today's Focus shows max 5 items, not unlimited
- [ ] Sidebar shows max 8 items, not 10+

---

## 6-Pillar Visual Audit

Score: 19/24 — PASS

| Pillar | Score | Notes |
|--------|-------|-------|
| Copy | 3 | Consistent professional voice, all microcopy templates defined |
| Visuals | 3 | Lucide icon set (clean, consistent), no custom illustration yet |
| Color | 4 | Full semantic palette, WCAG reviewed, colorblind-safe with icons |
| Typography | 3 | Inter throughout with clear hierarchy, tabular-nums for metrics |
| Spacing | 3 | 4px base grid, consistent section/component/element spacing |
| UX | 3 | All states covered (empty/error/loading), coach whisper pattern defined |

---
