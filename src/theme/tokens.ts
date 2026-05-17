import { colours } from './colours';

export const tokens = {
  // Base surfaces — darker, crisper
  bgScreen: '#050e09',
  bgPanel: '#0a1610',
  bgPanelAlt: '#0e2018',
  bgPanelDim: '#080f0b',
  bgPanelWarn: '#1c0f08',

  // Borders — tighter, more tactical
  borderDefault: '#172c20',
  borderAlt: '#235c32',
  borderWarn: '#6b3c16',
  borderBright: 'rgba(145,230,163,0.28)',
  borderChip: '#1e3d28',
  borderDim: '#1a2e22',
  divider: '#101e15',

  // Text
  textPrimary: '#edf5ea',
  textPrimaryBright: '#ffffff',
  textMuted: '#96b09a',
  textMuted2: '#b8cbb8',
  textMuted3: '#91e6a3',
  textOk: '#91e6a3',
  textWarn: '#ffaa44',
  textNeutral: '#7aad82',

  // Accents / semantic
  accentGood: '#91e6a3',
  accentWarn: '#ffaa44',
  accentElectric: '#3fc8e4',
  accentNeutral: '#7aad82',
  accentDanger: '#e05050',

  // Card radius — angular/tactical
  radiusCard: 6,
  radiusChip: 4,
  radiusFab: 8,

  // Inputs
  inputBg: '#050e09',
  inputBorder: '#172c20',
  placeholder: '#4a6050',

  raw: colours,
} as const;

