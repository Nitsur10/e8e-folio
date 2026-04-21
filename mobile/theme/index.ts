import {
  breakpoints,
  colors,
  fonts,
  motion,
  radii,
  spacing,
  typeScale,
} from '@folio/shared/design-tokens';

export const theme = {
  colors,
  fonts,
  typeScale,
  spacing,
  radii,
  breakpoints,
  motion,
} as const;

export type Theme = typeof theme;
export { colors, fonts, typeScale, spacing, radii, breakpoints, motion };
