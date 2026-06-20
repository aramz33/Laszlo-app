/**
 * Design tokens derived from the Laszlo design prototype
 * (docs/design/Museum AR Guide.dc.html + pitch.png):
 * dark editorial surface, warm gold accent, Newsreader serif display,
 * JetBrains Mono for small uppercase labels.
 */

export const colors = {
  // surfaces (radial dark background in the prototype)
  bgTop: "#1b1712",
  bgMid: "#100d09",
  bgBottom: "#080604",
  surface: "#0b0907",
  // accent
  accent: "#d8b06a",
  accentSoft: "rgba(216, 176, 106, 0.16)",
  accentGlow: "rgba(216, 176, 106, 0.45)",
  // text
  text: "#f4f1ea",
  textMuted: "rgba(244, 241, 234, 0.62)",
  textFaint: "rgba(244, 241, 234, 0.38)",
  onAccent: "#1a1206",
  // lines / glass
  hairline: "rgba(244, 241, 234, 0.14)",
  hairlineStrong: "rgba(244, 241, 234, 0.22)",
  glass: "rgba(16, 14, 10, 0.5)",
  glassStrong: "rgba(16, 14, 10, 0.88)"
} as const;

export const fonts = {
  serif: "Newsreader_500Medium",
  serifRegular: "Newsreader_400Regular",
  serifSemibold: "Newsreader_600SemiBold",
  mono: "JetBrainsMono_500Medium"
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24
} as const;

export const theme = { colors, fonts, radii, spacing } as const;
export type Theme = typeof theme;
