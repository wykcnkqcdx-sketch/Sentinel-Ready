import { colours } from './colours';

export const tokens = {
  // Backgrounds
  bgScreen:    '#0F1115',
  bgPanel:     '#1E2229',
  bgPanelDark: '#171A1F',
  bgField:     '#171A1F',
  bgDeep:      '#25160f',
  bgBadge:     '#2A1B14',
  bgWarn:      '#241a0c',
  bgWarnBadge: '#2d210e',

  // Borders
  borderSubtle: 'rgba(255,255,255,0.08)',
  borderField:  'rgba(255,255,255,0.10)',
  borderTag:    'rgba(252,76,2,0.24)',
  borderAccent: '#FC4C02',
  borderWarn:   '#F5A623',
  borderBack:   'rgba(255,255,255,0.14)',
  borderBright: 'rgba(252,76,2,0.32)',

  // Text
  textPrimary:     '#FFFFFF',
  textWhite:       '#ffffff',
  textBody:        '#D6DAE1',
  textMuted:       '#A7ADB8',
  textMutedAccent: '#C1C6D0',
  textAccent:      '#FC4C02',
  textHint:        '#FF7A3D',
  textWarn:        '#F5A623',
  textBright:      '#FFFFFF',
  textDim:         '#737A86',
  textBodyAlt:     '#E4E7EC',
  textWarnMuted:   '#E0B66D',
  textCategory:    '#D6DAE1',

  // Semantic aliases
  textOk:     '#35C759',
  accentGood: '#35C759',
  accentWarn: '#F5A623',

  // Inputs
  inputBg:     '#171A1F',
  inputBorder: 'rgba(255,255,255,0.10)',
  placeholder: '#737A86',

  // Dashboard-variant (darker tactical theme)
  bgDark:           '#0F1115',
  bgPanelAlt:       '#171A1F',
  bgPanelDeep:      '#111419',
  bgBadgeDark:      '#241810',
  bgInsightWarn:    '#1d160d',
  bgWarnDeep:       '#250f0c',
  borderDim:        'rgba(255,255,255,0.08)',
  borderGreen:      '#35C759',
  borderWarnMedium:   '#F5A623',
  borderWarnFaint:    'rgba(245,166,35,0.18)',
  bgWarnModerate:     '#21190d',
  borderWarnModerate: '#F5A623',
  bgWarnModerateBadge:'#30220f',
  textWarnModerate:   '#F5A623',
  textPrimaryDark:  '#FFFFFF',
  textMutedDark:    '#A7ADB8',
  textSubtle:       '#8A909B',
  textAction:       '#FFFFFF',
  textHintDark:     '#FF7A3D',
  accentWarnBright: '#FF7A3D',
  dotRed:           '#FF453A',

  // Radius
  radiusCard: 18,
  radiusChip: 999,
  radiusFab:  8,

  raw: colours,
} as const;

