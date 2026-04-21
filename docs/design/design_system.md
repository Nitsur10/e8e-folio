# folio.e8e — Design System for Implementation

**Version:** 1.0 (matches walkthrough v2.1)
**Audience:** Opus 4.7 and human reviewer
**Source of truth for visuals:** `folio.e8e_design_walkthrough_v2.1.html`

---

## 1. How to use this document

When implementing any UI task from `HANDOFF_02`, consult:

1. **This document** for tokens, patterns, and rules
2. **`folio.e8e_design_walkthrough_v2.1.html`** for the exact visual reference of each screen
3. The specific walkthrough screen referenced by the task (e.g., "matches walkthrough screen 09")

**Primary principle:** the walkthrough HTML is the visual source of truth. When ambiguity exists, match what the walkthrough shows, not what this spec describes in words.

---

## 2. Design tokens

All tokens are defined as CSS variables on the web, and as TypeScript constants on mobile. Extract into `/shared/design-tokens/tokens.ts` and consume from both platforms.

### 2.1 Colors

```ts
export const colors = {
  // Backgrounds
  bg: '#0f100d',         // App background, warm off-black
  bgElev: '#17181410',   // Elevated surface with slight transparency
  surface: '#1c1d19',    // Card surface
  surface2: '#222320',   // Secondary surface (slightly lighter)
  surface3: '#2a2b27',   // Tertiary surface (interactive hover)

  // Ink (text)
  ink: '#f6f4ee',        // Primary text, warm cream
  inkDim: '#b8b4a7',     // Secondary text
  inkQuiet: '#767367',   // Tertiary text, labels

  // Rules (borders)
  rule: '#2d2e2a',       // Standard border
  ruleSoft: '#23241f',   // Subtle border

  // Amber — AGENT VOICE (sacred, use sparingly)
  amber: '#d4a25e',      // Primary amber, antique ochre
  amberSoft: '#e0b67e',  // Amber text on amber background
  amberBg: '#2e2614',    // Amber background tint

  // Teal — CONFIRMED / CLOSED / PAPER STATE
  teal: '#6fb3a4',
  tealSoft: '#9ecec2',
  tealBg: '#1a2f2b',

  // Sage — HEALTHY / PROFIT / PASSING
  sage: '#8ea87c',
  sageBg: '#1f2a18',

  // Rose — DESTRUCTIVE / LOSS / HALT (very limited use)
  rose: '#d97867',
  roseBg: '#3a1e18',

  // Cream — EDITORIAL / EDUCATIONAL (future)
  cream: '#f6efe0',

  // Semantic aliases (USE THESE, not raw colors, in P&L contexts)
  profit: '#8ea87c',  // Same as sage
  loss: '#c97464',    // Slightly more muted than rose, for P&L specifically
};
```

### 2.2 Typography

Three fonts, each with a specific role. Never mix roles.

```ts
export const fonts = {
  serif: "'Fraunces', Georgia, serif",       // Editorial, display, headlines
  sans: "'Inter Tight', -apple-system, sans-serif",  // Body, voice, UI labels
  mono: "'JetBrains Mono', ui-monospace, monospace", // Numbers, tickers, timestamps, technical
};

export const fontSettings = {
  frauncesDisplay: '"opsz" 144',  // Optical size for large display
  frauncesBody: '"opsz" 16',      // Optical size for body serif
  featureSettings: '"ss01", "ss02", "cv11"',  // Inter Tight stylistic sets
};
```

**Font loading (both platforms):**
- Web: Google Fonts with `preconnect` and `display=swap`
- Mobile: `expo-font` loading from the same family names

**Typography scale:**

| Token | Usage | Size/Weight | Font |
|---|---|---|---|
| `display` | Hero headlines, splash wordmark | 52-64px / 400 | Fraunces |
| `h1` | Page titles | 32-44px / 400 | Fraunces |
| `h2` | Section heads | 24-30px / 400-500 | Fraunces |
| `h3` | Card titles, subsections | 18-22px / 500 | Fraunces |
| `body` | Main content | 14-16px / 400 | Inter Tight |
| `bodySmall` | Secondary content | 12-13px / 400 | Inter Tight |
| `bodyDim` | Tertiary / supporting | 11-12px / 400 | Inter Tight |
| `number` | Prices, percentages, Greeks | varies / 500-600 | JetBrains Mono |
| `label` | UI labels, tags | 8-10px / 500, UPPERCASE, letter-spacing 0.2em | JetBrains Mono |
| `micro` | Timestamps, IDs | 8-9px / 400 | JetBrains Mono |

### 2.3 Spacing

Use a 4px base. Prefer these tokens over raw numbers:

```ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
  '5xl': 64,
  '6xl': 96,
};
```

### 2.4 Radii

```ts
export const radii = {
  sm: 6,   // Small pills, tiny buttons
  md: 10,  // Standard buttons, inputs
  lg: 14,  // Cards, panels
  xl: 20,  // Large surfaces
  full: 9999,  // Pills, dots
};
```

### 2.5 Motion

```ts
export const motion = {
  fadeUp: {
    duration: 700,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
  pulse: {
    duration: 2000,
    easing: 'ease-in-out',
    iterations: 'infinite',
  },
};
```

Used sparingly. Motion should feel considered, not decorative.

---

## 3. Component library

Build these as shared primitives in `/components/`, consumed by both web and mobile where applicable.

### 3.1 Core components

**`<StatusBar />`** — Mobile status bar styling, matches walkthrough phone frame.

**`<AppTop greet date />`** — Header for app screens. Fraunces greeting + JetBrains Mono date.

**`<Card label pill>children</Card>`** — Primary container.
- Background: `surface`
- Border: 1px `ruleSoft`
- Radius: `lg`
- Padding: `lg`
- Optional label in micro-caps; optional pill (amber/teal/sage variants)

**`<PortfolioCard value delta sparkline />`** — Portfolio display.
- Big Fraunces number with italic currency sign
- Delta row with teal/rose
- Optional inline sparkline SVG

**`<AgentCard name sub health body meta>` — Wheel/Advisor agent state.**
- Fraunces name with italic-amber portion
- Monospaced sub
- Health chip with pulsing dot
- Dashed-border body section
- Three-cell meta grid

**`<DecisionHero ...>`** — The Advisor/Wheel decision card (walkthrough screens 11, 12).
- Amber border, amber pulse indicator
- Fraunces title with italic-amber portion
- Monospaced trade details table
- Italic Fraunces reason blockquote with amber left border
- Signal chips
- Constraint chips with checkmarks
- Approve/halve/skip action stack

**`<Button variant>`** — Three variants:
- `primary` — amber background, dark ink text
- `secondary` — transparent, rule border, dim ink text
- `ghost` — transparent, quiet ink text, smaller

**`<Dock items activeItem />`** — Mobile bottom tab bar.
- 4 equal columns
- Micro-caps labels
- Active = amber

**`<NewsItem score body time />`** — Signal row in feeds.
- Left score pill (amber / teal / rose tint)
- Main body with title + tag
- Right timestamp

**`<TraceStep label body variant>`** — Reasoning trace step.
- Left connector line
- Colored dot (amber / sage / teal)
- Label in monospaced caps
- Body in dim text

**`<RegimeBanner lbl msg icon />`** — Pre-market regime indicator.
- Gradient surface to amber-bg
- Amber circle icon
- Italic Fraunces message

**`<Retrospective stamp amount subtitle timeline lesson />`** — Post-trade retro.
- Teal hero with big Fraunces amount
- Timeline of retrospective steps
- Italic "what I learned" section

### 3.2 Layout primitives

**`<Shell>`** — Page shell with max-width, responsive padding.

**`<Masthead wordmark tagline meta />`** — Top-of-page branding.

**`<Act num title caption lead />`** — Section divider.

**`<SplitGrid left right ratio>`** — Two-column responsive grid.

---

## 4. Mobile-first rules

folio.e8e is a mobile-first product. Every screen must work at 320px and look great at 1600px.

### 4.1 Breakpoints

```ts
export const breakpoints = {
  mobile: 0,       // 320-699px
  tablet: 700,     // 700-1099px
  desktop: 1100,   // 1100-1399px
  wide: 1400,      // 1400+
};
```

### 4.2 Rules

**Design for thumbs first.** Primary actions on mobile should be reachable in the bottom 2/3 of the screen. Never require reaching to the top.

**One column by default.** Mobile layouts are single-column unless the design specifies otherwise. Web layouts can add columns at tablet+.

**Tap targets ≥44px.** Every interactive element has a minimum 44×44px hit area, padded with invisible space if needed.

**No hover-only interactions.** If a feature requires hover to discover, it's broken on mobile. Use long-press, bottom sheets, or explicit buttons.

**Font sizes are legible at 1x.** Don't use 10px body text expecting users to zoom. Minimum readable body is 14px on mobile.

**Forms are tall, not wide.** Never place form fields side-by-side on mobile; always stack.

**Bottom dock stays reachable.** Primary navigation is the 4-item dock at bottom on mobile. Secondary nav uses drawer/sheet pattern.

**Respect safe areas.** iOS notch, Android navigation bar — use `SafeAreaView` or CSS `env(safe-area-inset-*)`.

### 4.3 Mobile-specific patterns

**Pull-to-refresh** on every list view.

**Swipe gestures** for common actions (swipe-to-remove on watchlist, swipe-to-approve on decisions).

**Bottom sheets** for detail views that don't need a full-screen route.

**Haptic feedback** on primary actions (approve, reject, confirm).

**Dark mode only.** The design is built for dark ambience; no light-mode variant in MVP.

---

## 5. Voice and copy guidelines

### 5.1 Agent voice

The Advisor and any AI-generated copy use a consistent voice:

**Considered, not exuberant.** "Here's what the data shows" — not "This is a great opportunity!"

**Specific, not vague.** "MS reiterated overweight at 09:12" — not "analysts generally like this stock"

**Confidence-calibrated.** Low / medium / high confidence expressed explicitly. Never percentages that imply precision we don't have.

**User-respecting.** "Your previous notes suggest..." — the agent acknowledges it's working for the user, not dictating.

**Honest about limits.** "I can't predict earnings surprises" is better than manufacturing certainty.

### 5.2 UI copy

**Sentence case, not title case.** "Place paper buy" — not "Place Paper Buy".

**Active voice.** "The agent sold AAPL 218P" — not "AAPL 218P was sold".

**Em-dash for connecting thoughts.** "Low-vol uptrend holds — futures flat" — not colons, not semicolons.

**Italic for agent-authored strings.** Especially the agent's own reasoning, which appears in italic Fraunces with amber left border.

**Numbers always mono.** $1,842 and −0.18 in JetBrains Mono, regardless of surrounding context.

### 5.3 Disclaimers

Every user-facing surface where AI output appears must include, visibly:

> **Beta. Paper only. Not investment advice.**

Can be a persistent footer (preferred on detail views) or inline disclaimer strip (on Advisor outputs). Never hidden behind a link, never in a collapsed section.

---

## 6. Semantic color usage (the five rules)

From the design walkthrough's design charter. These are inviolable:

### Rule 1: Editorial over dashboard

Every screen reads like a considered page, not a grid of widgets. Whitespace matters. Hierarchy is clear. Avoid "data explosion" layouts with 20 competing elements.

### Rule 2: Amber is sacred

Only the agent's voice gets amber. Never decoratively.

**Correct amber usage:**
- Agent proposal states
- "Agent is asking you" signals
- Pending / urgent moments
- Italic Fraunces that marks agent voice in copy

**Incorrect amber usage:**
- Decorative accents
- Section dividers
- Hover states on non-agent elements
- Any element that's "just brand color"

### Rule 3: Show the reasoning

Every action includes: why, signals used, constraints checked. Visible, always. Never collapse reasoning behind "learn more."

### Rule 4: Numbers are monospaced

Prices, tickers, Greeks, timestamps — always JetBrains Mono. Never body font.

### Rule 5: No green-red cliché

P&L uses sage (profit) and rose/loss-muted (loss). Semantic tokens `profit` and `loss` from the palette. Never saturated green or pure red.

---

## 7. Reference: walkthrough screen map

When a task references a walkthrough screen, these are the numbered screens in `folio.e8e_design_walkthrough_v2.1.html`:

| # | Screen | Use for... |
|---|---|---|
| 01 | Splash | T5.3 onboarding |
| 02 | Value prop | T5.3 onboarding |
| 03 | Personalize | T5.3 onboarding |
| 04 | Broker | T2.1 Alpaca connect |
| 05 | Configure | T5.3 onboarding (agent config deferred) |
| 06 | Deployed | T5.3 onboarding confirm |
| 07 | Waiting | Phase 3 (post-Wheel setup) |
| 08 | Pre-market | Phase 3+ adaptive home |
| 09 | Mid-session | T4.1 Screener home |
| 10 | Push | Phase 3+ notifications |
| 11 | Decision | T8.2 Advisor UI |
| 12 | Filled | T9.1 trade execution |
| 13 | Retrospective | T10.2 Retrospective UI |
| 14 | Detail | Phase 3+ agent detail |
| 15 | Explain | T9.2 trace viewer |
| 16 | Signals | Phase 3+ signals feed |
| 17 | Kill switch | Phase 3+ |
| 18 | Settings | T5.3 onboarding (limited settings in Phase 1) |
| 19 | Desktop dashboard | Phase 3+ |
| 20 | Desktop trace | Phase 3+ (limited web version in T9.2) |

**Phase 1 scope primarily covers screens: 01-06 (onboarding), 09 (Screener home), 11-13 (Advisor and retrospective), 15 (trace).** Other screens are Phase 3+ deferred.

---

## 8. Accessibility requirements

- **WCAG AA minimum.** AAA aspirational.
- **Color contrast.** All text must meet AA contrast ratios against background.
- **Keyboard navigation.** Every web flow works without a mouse.
- **Screen reader labels.** All interactive elements have descriptive labels (not just icons).
- **Focus visible.** Focus indicators on all interactive elements, matches amber border style.
- **Reduced motion.** `prefers-reduced-motion` disables fade-up animations.
- **Dynamic type support.** iOS/Android text size settings respected on mobile.

---

## 9. Implementation notes

### 9.1 Font loading priority

1. Fraunces (display) — load first
2. JetBrains Mono — load second
3. Inter Tight — load third

Use `font-display: swap` so the page renders immediately with fallbacks while fonts load.

### 9.2 Image handling

There are no images in Phase 1 design. No logo PNG usage (we tried, reverted). Wordmark is purely typographic:

```html
<div class="wordmark">
  <span class="lede">folio</span>
  <span class="dot"></span>
  <span class="mark">e8e</span>
</div>
```

Where `mark` is italic Fraunces in amber, and `dot` is a 9px amber circle with glow shadow.

### 9.3 SVG usage

Sparklines, illustrations, and diagrams are inline SVG. Avoid external SVG files for frequently-used graphics (inline for performance). Use SVG `currentColor` where possible to inherit from parent.

### 9.4 Animation performance

All animations use CSS transforms and opacity only. No layout-triggering properties (width, height, top, left). Use `will-change` sparingly on elements about to animate.

---

## 10. Checklist for every UI task

Before marking a UI task complete, verify:

- [ ] Matches the referenced walkthrough screen
- [ ] Uses design tokens (no hardcoded colors, spacing, or fonts)
- [ ] Works at 320px width
- [ ] Works at 1600px width
- [ ] Keyboard accessible (web)
- [ ] Screen reader labeled
- [ ] Meets WCAG AA contrast
- [ ] No green-red cliché
- [ ] Numbers are monospaced
- [ ] Amber used only for agent voice or pending states
- [ ] Beta disclaimer present where AI output appears
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Empty states handled
- [ ] Tested on real device (not just simulator) at least once per week

---

**End of HANDOFF_03. Refer to walkthrough v2.1 HTML for visual source of truth on specific screens.**
