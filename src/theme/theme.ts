// Theme — v4 Darkroom palette
// Used by components and server files alike.
// Legacy aliases (primary/secondary/tertiary) are kept so existing server-side
// files that reference theme.primary / theme.secondary don't break during migration.

export const theme = {
  // ── Darkroom design tokens ──────────────────────────────────────────────
  nearBlack:   '#0e0e0e',
  forestGreen: '#2D4739',
  rosyBrown:   '#9B8384',
  warmWhite:   '#f0ebe3',
  silver:      '#c8c0b8',
  gold:        '#b8936a',

  // ── Legacy aliases (keep until every referencing component is migrated) ──
  primary:   '#2D4739',   // forest green — nav, accents
  secondary: '#9B8384',   // rosy brown — labels, borders
  tertiary:  '#0e0e0e',   // was #E8E7E7; now near-black for dark backgrounds

  // transparent variant used by navbar scrolled state
  tertiaryTransparent80: 'rgba(14, 14, 14, 0.85)',

  background: {
    light: '#f0ebe3',  // warm white — text on dark bg, light surfaces
    dark:  '#0e0e0e',  // near black — page background
  },
  text: {
    primary: '#9B8384',                    // rosy brown — labels
    light:   '#f0ebe3',                    // warm white — body text on dark
    dim:     'rgba(200, 192, 184, 0.45)',  // muted labels
  },
};
