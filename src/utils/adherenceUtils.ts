import type { TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';
import { buildWeekSummary } from '@/src/utils/trainingLogUtils';

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

// The four non-negotiable military-readiness pillars. A week that hits all four
// is "on-track"; hitting two or more is "partial"; fewer is "off-track".
const CORE_PILLARS = ['Ruck', 'Strength', 'Run', 'Recovery'] as const;
type CorePillar = (typeof CORE_PILLARS)[number];

type WeekSummary = ReturnType<typeof buildWeekSummary>;

function isPillarLogged(pillar: CorePillar, week: WeekSummary): boolean {
  switch (pillar) {
    case 'Ruck':     return week.ruck > 0;
    case 'Strength': return week.strength > 0 || week.resistance > 0;
    case 'Run':      return week.run > 0 || week.hiking > 0;
    case 'Recovery': return week.recovery > 0 || week.mobility > 0;
  }
}

function loggedCategories(week: WeekSummary): string[] {
  const cats: string[] = [];
  if (week.ruck > 0)       cats.push('Ruck');
  if (week.run > 0)        cats.push('Run');
  if (week.strength > 0)   cats.push('Strength');
  if (week.resistance > 0) cats.push('Resistance');
  if (week.hiking > 0)     cats.push('Hiking');
  if (week.military > 0)   cats.push('Military');
  if (week.mobility > 0)   cats.push('Mobility');
  if (week.recovery > 0)   cats.push('Recovery');
  if (week.test > 0)       cats.push('Test');
  return cats;
}

// Returns true if `cat` is "covered by" one of the matched core pillars.
function isCoveredByPillar(cat: string, matchedPillars: string[]): boolean {
  if (matchedPillars.includes('Strength') && (cat === 'Strength' || cat === 'Resistance')) return true;
  if (matchedPillars.includes('Run')      && (cat === 'Run'      || cat === 'Hiking'))     return true;
  if (matchedPillars.includes('Recovery') && (cat === 'Recovery' || cat === 'Mobility'))   return true;
  return matchedPillars.includes(cat);
}

export type TrainingProfileInput = {
  trainingLevel?: 'Foundation' | 'Intermediate' | 'Advanced';
  equipment?: string;
  injuryNotes?: string;
  role?: string;
};

export function buildPlanAdherence(
  logs: TrainingLog[],
  _goals: TrainingGoal[] = [],
  _profile: TrainingProfileInput = {}
): PlanAdherence {
  const week = buildWeekSummary(logs, 0);

  if (week.total === 0) {
    return {
      score: 0,
      status: 'no-data',
      label: 'No Data',
      message: 'No sessions logged this week to compare against the plan.',
      matched: [],
      missing: [...CORE_PILLARS],
      extra: [],
      nextAction: 'Log the next planned session to start tracking adherence.',
    };
  }

  const matched  = CORE_PILLARS.filter((p) => isPillarLogged(p, week));
  const missing  = CORE_PILLARS.filter((p) => !isPillarLogged(p, week));
  const allLogged = loggedCategories(week);
  const extra    = allLogged.filter((cat) => !isCoveredByPillar(cat, matched));

  // Use floor to better align with user expectations and unit tests.
  const score = Math.floor((matched.length / CORE_PILLARS.length) * 100);

  // Order matters: recovery/mobility deprivation takes priority, then strength, etc.
  const nextAction =
    missing.includes('Recovery')
      ? 'Add recovery or mobility before adding more load.'
      : missing.includes('Strength')
        ? 'Log the planned strength session next.'
        : missing.includes('Run')
          ? 'Log the planned run session at controlled intensity.'
          : missing.includes('Ruck')
            ? 'Log the planned ruck session when readiness is stable.'
            : 'Plan adherence is strong. Keep the next session aligned with readiness.';

  if (score >= 75) {
    return {
      score,
      status: 'on-track',
      label: 'On Track',
      message: "This week's logged split matches most planned priorities.",
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
