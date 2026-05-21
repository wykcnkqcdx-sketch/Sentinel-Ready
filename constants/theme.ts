import { Platform } from 'react-native';

// ─── Irish Defence Forces Design Tokens ──────────────────────────────────────
// Source: DF Brand Guidelines
//   Gold:        #B5852C  (Pantone 125  — C27 M46 Y100 K6)
//   Navy:        #00253D  (Pantone 2965 — C100 M78 Y48 K54)  Naval Service
//   Army Green:  #3F4727  (Pantone 5743 — C66 M50 Y88 K49)  Army
//   Air Corps:   #004987  (Pantone 301  — C100 M72 Y27 K12) Air Corps
//   Black:       #000000  / White: #FFFFFF
// ─────────────────────────────────────────────────────────────────────────────
export const DS = {
  // Backgrounds
  bgPrimary:   '#000D1A',      // Very dark navy-black (app background)
  bgCard:      '#00253D',      // DF Navy — Pantone 2965
  bgCardAlt:   '#001829',      // Deeper navy (nested/alt cards)
  bgSurface:   '#003050',      // Medium navy (inputs, buttons, chips)

  // DF Gold — primary accent (Pantone 125)
  gold:        '#B5852C',
  goldSoft:    '#C9A04D',
  goldMuted:   'rgba(181,133,44,0.15)',

  // Text
  textPrimary:   '#FFFFFF',
  textSecondary: '#8FAEC8',    // muted blue-grey on navy
  textMuted:     '#4A6070',

  // Borders
  border:        'rgba(255,255,255,0.08)',
  borderActive:  'rgba(181,133,44,0.5)',

  // Semantic — mapped to DF service colours
  success:  '#5E7A2F',         // Army Green (Pantone 5743 lightened for UI readability)
  warning:  '#D4A01A',         // Bright gold-amber
  danger:   '#CC2A2A',         // Military red
  info:     '#1A74D4',         // Air Corps Blue (Pantone 301 lightened for readability)

  // Map
  mapRoute:      '#B5852C',    // DF Gold route line
  mapMarkerStart:'#5E7A2F',    // Army green start marker
  mapMarkerEnd:  '#CC2A2A',    // Red end marker
  mapBackground: '#00101F',    // Very dark navy map bg
} as const;

// ─── DF Category Colour Palette ──────────────────────────────────────────────
// Maps training categories to DF service colours for visual coding
export const CATEGORY_PALETTE: Record<string, { color: string; bg: string; border: string }> = {
  Ruck:     { color: '#5E7A2F', bg: 'rgba(94,122,47,0.12)',  border: 'rgba(94,122,47,0.4)'   }, // Army Green
  Run:      { color: '#1A74D4', bg: 'rgba(26,116,212,0.12)', border: 'rgba(26,116,212,0.4)'  }, // Air Corps Blue
  Strength: { color: '#B5852C', bg: 'rgba(181,133,44,0.12)', border: 'rgba(181,133,44,0.4)'  }, // DF Gold
  Recovery: { color: '#4A8FAF', bg: 'rgba(74,143,175,0.12)', border: 'rgba(74,143,175,0.4)'  }, // Naval steel blue
  Mobility: { color: '#4A8FAF', bg: 'rgba(74,143,175,0.12)', border: 'rgba(74,143,175,0.4)'  }, // Naval steel blue
  Test:     { color: '#B5852C', bg: 'rgba(181,133,44,0.12)', border: 'rgba(181,133,44,0.4)'  }, // DF Gold (DFITT)
};
const _DEFAULT_PALETTE = { color: '#B5852C', bg: 'rgba(181,133,44,0.12)', border: 'rgba(181,133,44,0.4)' };
export function getCategoryPalette(category: string) {
  return CATEGORY_PALETTE[category] ?? _DEFAULT_PALETTE;
}

// ─── Legacy Colors (kept for components not yet migrated) ─────────────────────
export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: DS.gold,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: DS.gold,
    mapRoute: DS.mapRoute,
    mapMarker: DS.gold,
    mapBackground: '#E5E5EA',
  },
  dark: {
    text: DS.textPrimary,
    background: DS.bgPrimary,
    tint: DS.gold,
    icon: DS.textSecondary,
    tabIconDefault: DS.textMuted,
    tabIconSelected: DS.gold,
    mapRoute: DS.mapRoute,
    mapMarker: DS.mapMarkerStart,
    mapBackground: DS.mapBackground,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    // Akzidenz Grotesk (DF brand typeface) with system fallbacks
    sans: "'Akzidenz Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    serif: "'Goudy Old Style', Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
