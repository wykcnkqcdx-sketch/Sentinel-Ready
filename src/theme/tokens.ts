import { colours } from './colours';

export const tokens = {
  // Base surfaces
  bgScreen: '#0F1115',
  bgPanel: '#1E2229',
  bgPanelAlt: '#252B35',
  bgPanelDim: '#1E2229',
  bgPanelWarn: 'rgba(245,166,35,0.1)',

  // Borders
  borderDefault: 'rgba(255,255,255,0.08)',
  borderAlt: 'rgba(252,76,2,0.3)',
  borderWarn: 'rgba(245,166,35,0.3)',
  borderChip: '#274b32',
  borderDim: 'rgba(255,255,255,0.08)',
  divider: '#162218',

  // Text
  textPrimary: '#FFFFFF',
  textPrimaryBright: '#ffffff',
  textMuted: '#A7ADB8',
  textMuted2: '#c4cec0',
  textMuted3: '#FC4C02',
  textOk: '#FC4C02',
  textWarn: '#F5A623',
  textNeutral: '#A7ADB8',

  // Accents / semantic
  accentGood: '#FC4C02',
  accentWarn: '#F5A623',
  accentNeutral: '#A7ADB8',

  // Inputs
  inputBg: '#0F1115',
  inputBorder: 'rgba(255,255,255,0.08)',
  placeholder: '#617061',

  // Reuse existing palette for anything else not explicitly tokenized yet
  raw: colours,
} as const;

