import type { TrainingLog } from '@/src/screens/TrainingContext';
import { buildWeekSummary } from '@/src/utils/trainingLogUtils';

export type TrainingBalanceStatus = 'balanced' | 'gap' | 'overload' | 'no-data';

export type TrainingBalance = {
  score: number;
  status: TrainingBalanceStatus;
  label: string;
  message: string;
  nextFocus: string;
  gaps: string[];
  overloads: string[];
};

export function buildTrainingBalance(logs: TrainingLog[]): TrainingBalance {
  const week = buildWeekSummary(logs, 0);

  if (week.total === 0) {
    return {
      score: 0,
      status: 'no-data',
      label: 'No Data',
      message: 'Log this week’s sessions to assess training balance.',
      nextFocus: 'Start with one strength or resistance session, one load-carriage session and one recovery entry.',
      gaps: ['No sessions this week'],
      overloads: [],
    };
  }

  const gaps: string[] = [];
  const overloads: string[] = [];
  let score = 100;

  const loadCarriage = week.ruck + week.hiking;
  const strengthResistance = week.strength + week.resistance;
  const aerobicTerrain = week.run + week.hiking;
  const recovery = week.recovery + week.mobility;

  if (loadCarriage === 0) gaps.push('No load carriage');
  if (aerobicTerrain === 0) gaps.push('No aerobic or hiking');
  if (week.military === 0) gaps.push('No military skills');

  if (recovery === 0) gaps.push('No recovery or mobility');

  if (loadCarriage >= 3) overloads.push('High load-carriage frequency');
  if (week.run >= 4) overloads.push('High run frequency');
  if (strengthResistance >= 4) overloads.push('High strength/resistance frequency');
  if (week.military >= 2 && recovery === 0) overloads.push('Field skills without recovery');
  if (week.total >= 6 && recovery === 0) overloads.push('High load without recovery');
  if (week.fatigueWatch >= 2) overloads.push('Multiple fatigue-watch sessions');

  score -= gaps.length * 12;
  score -= overloads.length * 18;
  score = Math.max(0, Math.min(100, score));

  const nextFocus =
    gaps.includes('No recovery or mobility') ? 'Add recovery or mobility before more load.'
    : gaps.includes('No strength or resistance') ? 'Add controlled strength or resistance work.'
    : gaps.includes('No load carriage') ? 'Add a base ruck or terrain hike if readiness is stable.'
    : gaps.includes('No aerobic or hiking') ? 'Add a steady run or terrain hike.'
    : gaps.includes('No military skills') ? 'Add a low-risk military skills block.'
    : overloads.length > 0 ? 'Hold progression and reduce intensity.'
    : 'Maintain the current split and progress one variable only.';

  if (overloads.length > 0) {
    return {
      score,
      status: 'overload',
      label: 'Overload Risk',
      message: 'Weekly split is skewed toward load or fatigue. Balance recovery before progressing.',
      nextFocus,
      gaps,
      overloads,
    };
  }

  if (gaps.length > 0) {
    return {
      score,
      status: 'gap',
      label: 'Split Gaps',
      message: 'This week is missing one or more military-readiness training pillars.',
      nextFocus,
      gaps,
      overloads,
    };
  }

  return {
    score,
    status: 'balanced',
    label: 'Balanced',
    message: 'This week includes load carriage, strength/resistance, endurance, military skills and recovery work.',
    nextFocus,
    gaps,
    overloads,
  };
}
