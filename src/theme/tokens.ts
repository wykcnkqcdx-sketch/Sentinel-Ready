import { colours } from './colours';

export const tokens = {
  // Base surfaces
  bgScreen: '#07110c',
  bgPanel: '#0d1812',
  bgPanelAlt: '#102d1a',
  bgPanelDim: '#101a14',
  bgPanelWarn: '#21140b',

  // Borders
  borderDefault: '#203529',
  borderAlt: '#2f6b3c',
  borderWarn: '#7a4a1f',
  borderChip: '#274b32',
  borderDim: '#26382c',
  divider: '#162218',

  // Text
  textPrimary: '#f2f5ef',
  textPrimaryBright: '#ffffff',
  textMuted: '#aeb8aa',
  textMuted2: '#c4cec0',
  textMuted3: '#91e6a3',
  textOk: '#91e6a3',
  textWarn: '#ffb86b',
  textNeutral: '#8fbf8f',

  // Accents / semantic
  accentGood: '#91e6a3',
  accentWarn: '#ffb86b',
  accentNeutral: '#8fbf8f',

  // Inputs
  inputBg: '#07110c',
  inputBorder: '#203529',
  placeholder: '#617061',

  // Reuse existing palette for anything else not explicitly tokenized yet
  raw: colours,
} as const;

