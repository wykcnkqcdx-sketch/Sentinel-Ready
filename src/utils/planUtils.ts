import type { TrainingLog, TrainingGoal } from '@/src/screens/TrainingContext';
import { getDateValue } from './trainingLogCore';
import { buildReadinessTrend, hasRecentReadinessImprovement, isFatigueWatch } from './readinessUtils';

export type DayPlan = {
  day: string;
  focus: string;
  session: string;
  warmup?: string;
  mainWork?: string;
  cooldown?: string;
  adjustment?: string;
  intensity: 'Rest' | 'Low' | 'Moderate' | 'High';
  isRest: boolean;
};

export type WeekPlan = {
  days: DayPlan[];
  planType: 'recovery' | 'standard' | 'progressive';
  rationale: string;
};

export type TrainingProfileInput = {
  trainingLevel?: 'Foundation' | 'Intermediate' | 'Advanced';
  equipment?: string;
  injuryNotes?: string;
  role?: string;
};

function createDayPlan(input: Omit<DayPlan, 'warmup' | 'mainWork' | 'cooldown' | 'adjustment'> & Partial<Pick<DayPlan, 'warmup' | 'mainWork' | 'cooldown' | 'adjustment'>>): DayPlan {
  return {
    warmup: input.isRest ? 'No formal warm-up needed.' : '5-10 min easy movement, joint prep and breathing check.',
    mainWork: input.session,
    cooldown: input.isRest ? 'Keep hydration and sleep consistent.' : '5-10 min easy cooldown, foot or joint check and notes.',
    adjustment: 'If readiness is 5 or below, reduce volume by 30-50% and keep effort easy.',
    ...input,
  };
}

export function getDayPlanDetails(plan: DayPlan): Required<Pick<DayPlan, 'warmup' | 'mainWork' | 'cooldown' | 'adjustment'>> {
  const defaults = createDayPlan({
    day: plan.day,
    focus: plan.focus,
    session: plan.session,
    intensity: plan.intensity,
    isRest: plan.isRest,
  });

  return {
    warmup: plan.warmup ?? defaults.warmup ?? '5-10 min easy movement and readiness check.',
    mainWork: plan.mainWork ?? defaults.mainWork ?? plan.session,
    cooldown: plan.cooldown ?? defaults.cooldown ?? 'Cooldown, check feet or joints, and log notes.',
    adjustment: plan.adjustment ?? defaults.adjustment ?? 'If readiness is low, reduce volume and keep effort easy.',
  };
}

export function buildWeekPlan(
  logs: TrainingLog[],
  goals: TrainingGoal[] = [],
  profile: TrainingProfileInput = {}
): WeekPlan {
  const trend = buildReadinessTrend(logs);
  const readinessImproving = trend.status === 'good' || hasRecentReadinessImprovement(logs);
  const recentFatigueWatch = [...logs]
    .sort((a, b) => getDateValue(b.date) - getDateValue(a.date) || b.id - a.id)
    .slice(0, 7)
    .filter((log) => isFatigueWatch(log.readiness)).length;
  
  if (trend.status === 'warning') {
    return {
      planType: 'recovery',
      rationale: 'Readiness is dropping. Focus on recovery this week.',
      days: Array.from({ length: 7 }).map((_, i) => ({
        day: `Day ${i + 1}`,
        focus: 'Rest',
        session: 'Active Recovery',
        intensity: 'Rest',
        isRest: true,
      })),
    };
  }

  if (readinessImproving && logs.length >= 3 && recentFatigueWatch === 0) {
    return {
      planType: 'progressive',
      rationale: 'Readiness is improving. Progress carefully while keeping recovery built into the week.',
      days: [
        { day: 'Day 1', focus: 'Strength', session: 'Full Body Strength', intensity: 'Moderate', isRest: false },
        { day: 'Day 2', focus: 'Run', session: 'Aerobic Base Run', intensity: 'Moderate', isRest: false },
        { day: 'Day 3', focus: 'Recovery', session: 'Mobility and Core', intensity: 'Low', isRest: true },
        { day: 'Day 4', focus: 'Strength', session: 'Full Body Strength Progression', intensity: 'Moderate', isRest: false },
        { day: 'Day 5', focus: 'Ruck', session: 'Loaded Ruck Progression', intensity: 'High', isRest: false },
        { day: 'Day 6', focus: 'Recovery', session: 'Active Recovery', intensity: 'Low', isRest: false },
        { day: 'Day 7', focus: 'Rest', session: 'Complete Rest', intensity: 'Rest', isRest: true },
      ],
    };
  }
  
  return {
    planType: 'standard',
    rationale: 'Readiness is stable. Follow the standard progression.',
    days: [
      { day: 'Day 1', focus: 'Strength', session: 'Full Body Strength', intensity: 'Moderate', isRest: false },
      { day: 'Day 2', focus: 'Run', session: 'Aerobic Base Run', intensity: 'Moderate', isRest: false },
      { day: 'Day 3', focus: 'Recovery', session: 'Mobility and Core', intensity: 'Low', isRest: true },
      { day: 'Day 4', focus: 'Strength', session: 'Full Body Strength', intensity: 'Moderate', isRest: false },
      { day: 'Day 5', focus: 'Ruck', session: 'Loaded Ruck Progression', intensity: 'High', isRest: false },
      { day: 'Day 6', focus: 'Recovery', session: 'Active Recovery', intensity: 'Low', isRest: false },
      { day: 'Day 7', focus: 'Rest', session: 'Complete Rest', intensity: 'Rest', isRest: true },
    ],
  };
}
