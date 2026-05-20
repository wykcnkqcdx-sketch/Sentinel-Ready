import { colours } from './colours';

export const tokens = {
  // Base surfaces
  bgScreen: '#000D1A',
  bgPanel: '#00253D',
  bgPanelAlt: '#003050',
  bgPanelDim: '#00253D',
  bgPanelWarn: 'rgba(212,160,26,0.1)',

  // Borders
  borderDefault: 'rgba(255,255,255,0.08)',
  borderAlt: 'rgba(181,133,44,0.3)',
  borderWarn: 'rgba(212,160,26,0.3)',
  borderChip: '#274b32',
  borderDim: 'rgba(255,255,255,0.08)',
  divider: '#162218',

  // Text
  textPrimary: '#FFFFFF',
  textPrimaryBright: '#ffffff',
  textMuted: '#8FAEC8',
  textMuted2: '#c4cec0',
  textMuted3: '#B5852C',
  textOk: '#B5852C',
  textWarn: '#D4A01A',
  textNeutral: '#8FAEC8',

  // Accents / semantic
  accentGood: '#B5852C',
  accentWarn: '#D4A01A',
  accentNeutral: '#8FAEC8',

  // Inputs
  inputBg: '#000D1A',
  inputBorder: 'rgba(255,255,255,0.08)',
  placeholder: '#617061',

  // Reuse existing palette for anything else not explicitly tokenized yet
  raw: colours,
} as const;

