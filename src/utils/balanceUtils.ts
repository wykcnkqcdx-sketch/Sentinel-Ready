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
      nextFocus: 'Start with one strength session, one aerobic session and one recovery entry.',
      gaps: ['No sessions this week'],
      overloads: [],
    };
  }

  const gaps: string[] = [];
  const overloads: string[] = [];
  let score = 100;

  if (week.ruck === 0) gaps.push('No ruck');
  if (week.run === 0) gaps.push('No run');
  if (week.strength === 0) gaps.push('No strength');
  if (week.recovery + week.mobility === 0) gaps.push('No recovery or mobility');

  if (week.ruck >= 3) overloads.push('High ruck frequency');
  if (week.run >= 4) overloads.push('High run frequency');
  if (week.total >= 6 && week.recovery + week.mobility === 0) overloads.push('High load without recovery');
  if (week.fatigueWatch >= 2) overloads.push('Multiple fatigue-watch sessions');

  score -= gaps.length * 12;
  score -= overloads.length * 18;
  score = Math.max(0, Math.min(100, score));

  const nextFocus =
    gaps.includes('No recovery or mobility') ? 'Add recovery or mobility before more load.'
    : gaps.includes('No strength') ? 'Add a controlled strength session.'
    : gaps.includes('No ruck') ? 'Add a base ruck if readiness is stable.'
    : gaps.includes('No run') ? 'Add a steady aerobic run.'
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
      message: 'This week is missing one or more key training pillars.',
      nextFocus,
      gaps,
      overloads,
    };
  }

  return {
    score,
    status: 'balanced',
    label: 'Balanced',
    message: 'This week includes strength, endurance, ruck and recovery work.',
    nextFocus,
    gaps,
    overloads,
  };
}
