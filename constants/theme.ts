import { Platform } from 'react-native';

// ─── Mission-Ready Design Tokens ─────────────────────────────────────────────
export const DS = {
  // Backgrounds
  bgPrimary:   '#0F1115',
  bgCard:      '#1E2229',
  bgCardAlt:   '#161B22',
  bgSurface:   '#252B35',

  // Accent
  orange:      '#FC4C02',
  orangeSoft:  '#FF6B35',
  orangeMuted: 'rgba(252,76,2,0.15)',

  // Text
  textPrimary:   '#FFFFFF',
  textSecondary: '#A7ADB8',
  textMuted:     '#6B717E',

  // Borders
  border:        'rgba(255,255,255,0.08)',
  borderActive:  'rgba(252,76,2,0.4)',

  // Semantic
  success:  '#35C759',
  warning:  '#F5A623',
  danger:   '#FF453A',
  info:     '#4A9EFF',

  // Map
  mapRoute:      '#FC4C02',
  mapMarkerStart:'#35C759',
  mapMarkerEnd:  '#FF453A',
  mapBackground: '#1A1F27',
} as const;

// ─── Legacy Colors (kept for components not yet migrated) ─────────────────────
export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#FC4C02',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#FC4C02',
    mapRoute: '#FC4C02',
    mapMarker: '#FC4C02',
    mapBackground: '#E5E5EA',
  },
  dark: {
    text: DS.textPrimary,
    background: DS.bgPrimary,
    tint: DS.orange,
    icon: DS.textSecondary,
    tabIconDefault: DS.textMuted,
    tabIconSelected: DS.orange,
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
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
