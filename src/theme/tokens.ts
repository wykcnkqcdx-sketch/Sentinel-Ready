import { colours } from './colours';

export const tokens = {
  // Base surfaces
  bgScreen: '#0F1115',
  bgPanel: '#1E2229',
  bgPanelDark: '#171A1F',
  bgPanelAlt: '#252B35',
  bgPanelDim: '#1E2229',
  bgPanelDeep: '#111419',
  bgField: '#171A1F',
  bgDeep: '#25160f',
  bgBadge: '#2A1B14',
  bgBadgeDark: '#241810',
  bgWarn: '#241a0c',
  bgWarnBadge: '#2d210e',
  bgPanelWarn: 'rgba(245,166,35,0.1)',
  bgInsightWarn: '#1d160d',
  bgWarnDeep: '#250f0c',
  bgWarnModerate: '#21190d',
  bgWarnModerateBadge: '#30220f',
  bgDark: '#0F1115',

  // Borders
  borderDefault: 'rgba(181,133,44,0.12)',
  borderSubtle: 'rgba(181,133,44,0.12)',
  borderField: 'rgba(255,255,255,0.10)',
  borderAlt: 'rgba(252,76,2,0.3)',
  borderTag: 'rgba(252,76,2,0.24)',
  borderChip: 'rgba(252,76,2,0.24)',
  borderAccent: '#FC4C02',
  borderWarn: 'rgba(245,166,35,0.3)',
  borderWarnMedium: '#F5A623',
  borderWarnFaint: 'rgba(245,166,35,0.18)',
  borderWarnModerate: '#F5A623',
  borderBack: 'rgba(255,255,255,0.14)',
  borderBright: 'rgba(252,76,2,0.32)',
  borderDim: 'rgba(181,133,44,0.12)',
  borderGreen: '#35C759',
  divider: '#162218',

  // Text
  textPrimary: '#FFFFFF',
  textPrimaryBright: '#ffffff',
  textPrimaryDark: '#FFFFFF',
  textWhite: '#ffffff',
  textBody: '#D6DAE1',
  textBodyAlt: '#E4E7EC',
  textMuted: '#A7ADB8',
  textMuted2: '#c4cec0',
  textMuted3: '#FC4C02',
  textMutedAccent: '#C1C6D0',
  textMutedDark: '#A7ADB8',
  textAccent: '#FC4C02',
  textHint: '#FF7A3D',
  textHintDark: '#FF7A3D',
  textWarn: '#F5A623',
  textWarnModerate: '#F5A623',
  textWarnMuted: '#E0B66D',
  textBright: '#FFFFFF',
  textDim: '#737A86',
  textSubtle: '#8A909B',
  textAction: '#FFFFFF',
  textCategory: '#D6DAE1',
  textNeutral: '#A7ADB8',

  // Accents / semantic
  textOk: '#35C759',
  accentGood: '#35C759',
  accentWarn: '#F5A623',
  accentWarnBright: '#FF7A3D',
  accentNeutral: '#A7ADB8',
  dotRed: '#FF453A',

  // Inputs
  inputBg: '#0F1115',
  inputBorder: 'rgba(181,133,44,0.12)',
  placeholder: '#737A86',

  // Radius
  radiusCard: 18,
  radiusChip: 999,
  radiusFab: 8,

  // Reuse existing palette for anything else not explicitly tokenized yet
  raw: colours,
} as const;
