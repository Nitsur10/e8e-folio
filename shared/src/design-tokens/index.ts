/**
 * folio.e8e design tokens — source of truth extracted from
 * folio.e8e_design_walkthrough_v2.1.html and HANDOFF_03.
 *
 * Single source consumed by both web (CSS variables) and mobile (theme object).
 * Do not hardcode any of these values — import from @folio/shared/design-tokens.
 */

export const colors = {
  // Backgrounds
  bg: '#0f100d',
  bgElev: '#17181410',
  surface: '#1c1d19',
  surface2: '#222320',
  surface3: '#2a2b27',

  // Ink (text)
  ink: '#f6f4ee',
  inkDim: '#b8b4a7',
  inkQuiet: '#767367',

  // Rules (borders)
  rule: '#2d2e2a',
  ruleSoft: '#23241f',

  // Amber — AGENT VOICE (sacred, use sparingly)
  amber: '#d4a25e',
  amberSoft: '#e0b67e',
  amberBg: '#2e2614',

  // Teal — CONFIRMED / CLOSED / PAPER STATE
  teal: '#6fb3a4',
  tealSoft: '#9ecec2',
  tealBg: '#1a2f2b',

  // Sage — HEALTHY / PROFIT / PASSING
  sage: '#8ea87c',
  sageBg: '#1f2a18',

  // Rose — DESTRUCTIVE / LOSS / HALT (limited use)
  rose: '#d97867',
  roseBg: '#3a1e18',

  // Cream — EDITORIAL / EDUCATIONAL
  cream: '#f6efe0',

  // P&L semantic aliases — use these, not raw green/red
  profit: '#8ea87c',
  loss: '#c97464',
} as const;

export const fonts = {
  serif: "'Fraunces', Georgia, serif",
  sans: "'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
} as const;

export const fontSettings = {
  frauncesDisplay: '"opsz" 144',
  frauncesBody: '"opsz" 16',
  interFeatures: '"ss01", "ss02", "cv11"',
} as const;

export const typeScale = {
  display: { size: 64, weight: 400, font: 'serif' as const },
  h1: { size: 40, weight: 400, font: 'serif' as const },
  h2: { size: 28, weight: 400, font: 'serif' as const },
  h3: { size: 20, weight: 500, font: 'serif' as const },
  body: { size: 15, weight: 400, font: 'sans' as const },
  bodySmall: { size: 13, weight: 400, font: 'sans' as const },
  bodyDim: { size: 12, weight: 400, font: 'sans' as const },
  number: { size: 16, weight: 500, font: 'mono' as const },
  label: {
    size: 9,
    weight: 500,
    font: 'mono' as const,
    uppercase: true,
    letterSpacing: 0.2,
  },
  micro: { size: 8, weight: 400, font: 'mono' as const },
} as const;

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
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const breakpoints = {
  mobile: 0,
  tablet: 700,
  desktop: 1100,
  wide: 1400,
} as const;

export const motion = {
  fadeUp: {
    duration: 700,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
  pulse: {
    duration: 2000,
    easing: 'ease-in-out',
  },
} as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Radii = typeof radii;
export type Fonts = typeof fonts;
