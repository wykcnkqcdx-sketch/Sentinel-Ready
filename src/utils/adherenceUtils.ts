import type { TrainingGoal, TrainingLog, TrainingCategory } from '@/src/screens/TrainingContext';
import type { TrainingProfileInput } from '@/src/utils/trainingLogUtils';
import { buildWeekPlan, buildWeekSummary } from '@/src/utils/trainingLogUtils';

export type PlanAdherenceStatus = 'on-track' | 'partial' | 'off-track' | 'no-data';

export type PlanAdherence = {
  score: number;
  status: PlanAdherenceStatus;
  label: string;
  message: string;
  matched: string[];
  missing: string[];
  extra: string[];
  nextAction: string;
};

function focusToCategory(focus: string): TrainingCategory | 'Conditioning' | null {
  const lower = focus.toLowerCase();
  if (lower.includes('ruck')) return 'Ruck';
  if (lower.includes('run')) return 'Run';
  if (lower.includes('strength') || lower.includes('conditioning')) return 'Strength';
  if (lower.includes('mobility')) return 'Mobility';
  if (lower.includes('recovery')) return 'Recovery';
  if (lower.includes('test')) return 'Test';
  return null;
}

function unique<T extends string>(values: T[]) {
  return [...new Set(values)];
}

function isPlannedCategory(value: TrainingCategory | 'Conditioning' | null): value is TrainingCategory | 'Conditioning' {
  return value !== null;
}

export function buildPlanAdherence(
  logs: TrainingLog[],
  goals: TrainingGoal[] = [],
  profile: TrainingProfileInput = {}
): PlanAdherence {
  const week = buildWeekSummary(logs, 0);

  if (week.total === 0) {
    return {
      score: 0,
      status: 'no-data',
      label: 'No Data',
      message: 'No sessions logged this week to compare against the plan.',
      matched: [],
      missing: ['Ruck', 'Run', 'Strength', 'Recovery'],
      extra: [],
      nextAction: 'Log the next planned session to start tracking adherence.',
    };
  }

  const plan = buildWeekPlan(logs, goals, profile);
  const planned = unique(
    plan.days
      .filter((day) => !day.isRest)
      .map((day) => focusToCategory(day.focus))
      .filter(isPlannedCategory)
      .map((category) => String(category))
  );
  const logged = unique([
    week.ruck > 0 ? 'Ruck' : '',
    week.run > 0 ? 'Run' : '',
    week.strength > 0 ? 'Strength' : '',
    week.mobility > 0 ? 'Mobility' : '',
    week.recovery > 0 ? 'Recovery' : '',
    week.test > 0 ? 'Test' : '',
  ].filter(Boolean));

  const matched = planned.filter((category) => logged.includes(category));
  const missing = planned.filter((category) => !logged.includes(category));
  const extra = logged.filter((category) => !planned.includes(category));
  const score = planned.length > 0 ? Math.round((matched.length / planned.length) * 100) : 0;

  const nextAction =
    missing.includes('Recovery') || missing.includes('Mobility') ? 'Add recovery or mobility before adding more load.'
    : missing.includes('Strength') ? 'Log the planned strength session next.'
    : missing.includes('Ruck') ? 'Log the planned ruck session when readiness is stable.'
    : missing.includes('Run') ? 'Log the planned run session at controlled intensity.'
    : 'Plan adherence is strong. Keep the next session aligned with readiness.';

  if (score >= 75) {
    return {
      score,
      status: 'on-track',
      label: 'On Track',
      message: 'This week’s logged split matches most planned priorities.',
      matched,
      missing,
      extra,
      nextAction,
    };
  }

  if (score >= 40) {
    return {
      score,
      status: 'partial',
      label: 'Partial',
      message: 'Some planned priorities are logged, but the week still has gaps.',
      matched,
      missing,
      extra,
      nextAction,
    };
  }

  return {
    score,
    status: 'off-track',
    label: 'Off Track',
    message: 'Logged training is not matching the planned weekly priorities yet.',
    matched,
    missing,
    extra,
    nextAction,
  };
}
