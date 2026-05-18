import { colours } from './colours';

export const tokens = {
  // Backgrounds
  bgScreen:    '#07110c',
  bgPanel:     '#0d1812',
  bgPanelDark: '#0a1510',
  bgField:     '#101a14',
  bgDeep:      '#102d1a',
  bgBadge:     '#1e3a27',
  bgWarn:      '#21140b',
  bgWarnBadge: '#2a1a0d',

  // Borders
  borderSubtle: '#203529',
  borderField:  '#26382c',
  borderTag:    '#274b32',
  borderAccent: '#2f6b3c',
  borderWarn:   '#7a4a1f',
  borderBack:   '#35523e',
  borderBright: 'rgba(145,230,163,0.28)',

  // Text
  textPrimary:     '#f2f5ef',
  textWhite:       '#ffffff',
  textBody:        '#c4cec0',
  textMuted:       '#aeb8aa',
  textMutedAccent: '#8fbf8f',
  textAccent:      '#91e6a3',
  textHint:        '#4a9e6a',
  textWarn:        '#ffb86b',
  textBright:      '#c8f7d0',
  textDim:         '#6f7d70',
  textBodyAlt:     '#dfe8da',
  textWarnMuted:   '#c8a070',
  textCategory:    '#c8d8c5',

  // Semantic aliases
  textOk:     '#91e6a3',
  accentGood: '#91e6a3',
  accentWarn: '#ffb86b',

  // Inputs
  inputBg:     '#07110c',
  inputBorder: '#203529',
  placeholder: '#4a9e6a',

  // Dashboard-variant (darker tactical theme)
  bgDark:           '#050e09',
  bgPanelAlt:       '#0a1610',
  bgPanelDeep:      '#080f0b',
  bgBadgeDark:      '#0e2018',
  bgInsightWarn:    '#110c06',
  bgWarnDeep:       '#1c0e08',
  borderDim:        '#172c20',
  borderGreen:      '#235c32',
  borderWarnMedium:   '#6b3c16',
  borderWarnFaint:    '#3a2210',
  bgWarnModerate:     '#1c1408',
  borderWarnModerate: '#6b5020',
  bgWarnModerateBadge:'#2a220d',
  textWarnModerate:   '#f0c070',
  textPrimaryDark:  '#edf5ea',
  textMutedDark:    '#5a7a62',
  textSubtle:       '#7a9480',
  textAction:       '#cddec8',
  textHintDark:     '#3a6b46',
  accentWarnBright: '#ffaa44',
  dotRed:           '#e05050',

  // Radius
  radiusCard: 18,
  radiusChip: 999,
  radiusFab:  8,

  raw: colours,
} as const;

