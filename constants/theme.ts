import { Platform } from 'react-native';

/**
 * Design System (DS) - Sentinel Ready Tactical Platform
 * Centralized theme constants to maintain a consistent UI/UX.
 */
export const DS = {
  // Backgrounds
  bgPrimary: '#050e09',      // Deepest tactical dark green/black
  bgCard: '#0c1008',         // Standard card/surface background
  bgCardAlt: '#141810',      // Elevated or alternating card background
  bgSurface: '#0b1510',      // Legacy surface color
  
  // Borders
  border: 'rgba(181,133,44,0.12)', // Subtle gold/olive border for standard separation
  borderSolid: '#3F4727',    // Legacy solid border color
  borderHighlight: 'rgba(181,133,44,0.3)', // Stronger border for active/focused elements

  // Accents
  gold: '#B5852C',           // Primary tactical gold (buttons, main accents)
  goldSoft: '#F4BD5F',       // Bright/soft gold (headers, highlights, active states)
  
  // Typography Colors
  textPrimary: '#dae5dc',    // Main readable text (warm off-white, easy on OLED)
  textSecondary: '#b8c0b0',  // Muted/secondary text (descriptions, sub-labels)
  textMuted: '#7a8a7a',      // Muted text (inactive, disabled)
  
  // Status Indicators
  success: '#21e371',        // Tactical green (Systems Operational, Pass)
  warning: '#ffaa44',        // Amber warning (Fatigue, Monitor)
  danger: '#e05050',         // Critical red (Fail, Stop)
  info: '#1A74D4',

  // Map
  mapRoute: '#B5852C',
  mapMarkerStart: '#5E7A2F',
  mapMarkerEnd: '#e05050',
  mapBackground: '#050e09',
  
  // Standardized layout properties
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 2,
    md: 4,
    lg: 8,
  },

  // Hero card state backgrounds
  bgHeroActive: '#102016',
  bgHeroRecovery: '#1a0f0b',

  // Warning state surfaces (amber fatigue/alert cards)
  bgWarn: 'rgba(212,160,26,0.1)',
  borderWarn: 'rgba(255,170,68,0.3)',

  // Row dividers (week list, target list separators)
  rowDivider: '#162218',
  rowDividerRest: '#0e1710',
} as const;

export const CATEGORY_PALETTE: Record<string, { color: string; bg: string; border: string }> = {
  Ruck: { color: '#5E7A2F', bg: 'rgba(94,122,47,0.12)', border: 'rgba(94,122,47,0.4)' },
  Run: { color: DS.info, bg: 'rgba(26,116,212,0.12)', border: 'rgba(26,116,212,0.4)' },
  Strength: { color: DS.gold, bg: 'rgba(181,133,44,0.12)', border: 'rgba(181,133,44,0.4)' },
  Recovery: { color: '#4A8FAF', bg: 'rgba(74,143,175,0.12)', border: 'rgba(74,143,175,0.4)' },
  Mobility: { color: '#4A8FAF', bg: 'rgba(74,143,175,0.12)', border: 'rgba(74,143,175,0.4)' },
  Test: { color: DS.gold, bg: 'rgba(181,133,44,0.12)', border: 'rgba(181,133,44,0.4)' },
};

const DEFAULT_PALETTE = { color: DS.gold, bg: 'rgba(181,133,44,0.12)', border: 'rgba(181,133,44,0.4)' };

export function getCategoryPalette(category: string) {
  return CATEGORY_PALETTE[category] ?? DEFAULT_PALETTE;
}

export const Colors = {
  light: {
    text: '#11181C',
    background: '#f5f0e8',
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
    sans: "'Akzidenz Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    serif: "'Goudy Old Style', Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
