import type { UserProfile } from '@/src/screens/UserContext';
import type { TrainingLog } from '@/src/screens/TrainingContext';
import { buildWeekSummary } from '@/src/utils/trainingLogUtils';

export type PlanGoalType = 'dfift_prep' | 'ruck_event' | 'general_fitness' | 'strength_base' | 'recovery_focus';

export type AdaptiveSession = {
  category: string;
  durationMin: number;
  description: string;
  intensity: 'low' | 'moderate' | 'high';
};

export type AdaptiveDay = {
  dayIndex: number;
  label: string;
  sessions: AdaptiveSession[];
  isRestDay: boolean;
};

export type AdaptiveWeek = {
  weekNum: number;
  focus: string;
  totalMinutes: number;
  days: AdaptiveDay[];
  isDeloadWeek: boolean;
};

export type AdaptivePlan = {
  goalType: PlanGoalType;
  title: string;
  summary: string;
  weeksCount: number;
  weeks: AdaptiveWeek[];
  generatedAt: string;
};

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function rest(dayIndex: number): AdaptiveDay {
  return { dayIndex, label: DAY_LABELS[dayIndex], sessions: [], isRestDay: true };
}

function day(dayIndex: number, sessions: AdaptiveSession[]): AdaptiveDay {
  return { dayIndex, label: DAY_LABELS[dayIndex], sessions, isRestDay: false };
}

function s(category: string, durationMin: number, description: string, intensity: 'low' | 'moderate' | 'high'): AdaptiveSession {
  return { category, durationMin, description, intensity };
}

function scaleByLevel(base: number, level: UserProfile['trainingLevel']): number {
  if (level === 'Foundation') return Math.round(base * 0.75);
  if (level === 'Advanced') return Math.round(base * 1.25);
  return base;
}

function buildDeloadWeek(weekNum: number, goalType: PlanGoalType): AdaptiveWeek {
  const days: AdaptiveDay[] = [
    day(0, [s('Mobility', 20, 'Full-body mobility and foam rolling.', 'low')]),
    day(1, [s('Run', 25, 'Easy 3–4 km conversational pace.', 'low')]),
    rest(2),
    day(3, [s('Strength', 20, 'Bodyweight only — push, pull, hinge pattern each.', 'low')]),
    rest(4),
    day(5, [goalType === 'ruck_event'
      ? s('Ruck', 30, 'Easy 4 km ruck at 50% usual pack weight.', 'low')
      : s('Recovery', 30, 'Long walk or easy swim. Heart rate zone 1 only.', 'low')]),
    rest(6),
  ].map((d, i) => Array.isArray(d) ? d : (typeof d === 'function' ? rest(i) : d));

  const totalMinutes = days.flatMap((d) => d.sessions).reduce((s, sess) => s + sess.durationMin, 0);
  return { weekNum, focus: 'DELOAD — Full system reset. Cut volume by 40%.', days, isDeloadWeek: true, totalMinutes };
}

function buildDfiftWeek(weekNum: number, level: UserProfile['trainingLevel'], isDeload: boolean): AdaptiveWeek {
  if (isDeload) return buildDeloadWeek(weekNum, 'dfift_prep');
  const progressFactor = 1 + (weekNum - 1) * 0.08;
  const pushReps = Math.round(scaleByLevel(30, level) * progressFactor);
  const sitReps = Math.round(scaleByLevel(35, level) * progressFactor);
  const runKm = parseFloat((scaleByLevel(3.2, level) * Math.min(progressFactor, 1.3)).toFixed(1));

  const days: AdaptiveDay[] = [
    day(0, [
      s('Strength', 35, `Push-up sets to ${pushReps} reps total. Strict form. 3 sets.`, 'moderate'),
      s('Mobility', 10, 'Hip flexor and shoulder mobility post-session.', 'low'),
    ]),
    day(1, [s('Run', 30, `${runKm} km at target test pace. Focus on cadence and breathing.`, 'moderate')]),
    day(2, [
      s('Strength', 40, `Sit-up sets to ${sitReps} reps total. Controlled descent.`, 'moderate'),
      s('Ruck', scaleByLevel(40, level), '4–5 km ruck at moderate pace, 10–12 kg pack.', 'moderate'),
    ]),
    rest(3),
    day(4, [
      s('Strength', 45, `Superset push-ups and sit-ups. ${Math.round(pushReps * 0.7)} / ${Math.round(sitReps * 0.7)} per set.`, 'high'),
      s('Run', 20, '2 km at tempo pace — faster than test goal.', 'high'),
    ]),
    day(5, [s('Ruck', scaleByLevel(60, level), '6–8 km ruck at steady pace. Practice test-day kit.', 'moderate')]),
    day(6, [s('Recovery', 25, 'Light walk, foam rolling, stretching. No intensity.', 'low')]),
  ];

  const totalMinutes = days.flatMap((d) => d.sessions).reduce((s, sess) => s + sess.durationMin, 0);
  return { weekNum, focus: `WEEK ${weekNum} — DFIFT Prep: Push/Sit/Run/Ruck`, days, isDeloadWeek: false, totalMinutes };
}

function buildRuckWeek(weekNum: number, level: UserProfile['trainingLevel'], isDeload: boolean): AdaptiveWeek {
  if (isDeload) return buildDeloadWeek(weekNum, 'ruck_event');
  const distBase = scaleByLevel(6, level);
  const longDistBase = scaleByLevel(10, level);
  const progressKm = (distBase + (weekNum - 1) * 1.5).toFixed(1);
  const longKm = (longDistBase + (weekNum - 1) * 2).toFixed(1);
  const packKg = Math.min(25, scaleByLevel(12, level) + (weekNum - 1));

  const days: AdaptiveDay[] = [
    day(0, [s('Strength', scaleByLevel(35, level), 'Leg-dominant strength: squats, lunges, step-ups with pack.', 'moderate')]),
    day(1, [s('Ruck', scaleByLevel(45, level), `${progressKm} km ruck, ${packKg} kg pack. Goal pace.`, 'moderate')]),
    rest(2),
    day(3, [
      s('Run', scaleByLevel(30, level), '4–5 km run to build aerobic base for ruck events.', 'moderate'),
      s('Mobility', 15, 'Hip flexor, calf, and ankle mobility — ruck-specific pattern.', 'low'),
    ]),
    day(4, [s('Strength', scaleByLevel(40, level), 'Upper body and core: rows, press, plank progressions.', 'moderate')]),
    day(5, [s('Ruck', scaleByLevel(90, level), `Long ruck: ${longKm} km, ${packKg} kg. Build time on feet.`, 'high')]),
    day(6, [s('Recovery', 20, 'Active recovery walk. Foot and ankle care.', 'low')]),
  ];

  const totalMinutes = days.flatMap((d) => d.sessions).reduce((s, sess) => s + sess.durationMin, 0);
  return { weekNum, focus: `WEEK ${weekNum} — Ruck Event Prep: Distance + Load`, days, isDeloadWeek: false, totalMinutes };
}

function buildGeneralWeek(weekNum: number, level: UserProfile['trainingLevel'], isDeload: boolean): AdaptiveWeek {
  if (isDeload) return buildDeloadWeek(weekNum, 'general_fitness');
  const days: AdaptiveDay[] = [
    day(0, [s('Strength', scaleByLevel(40, level), 'Full body strength: push, pull, squat, hinge — 3 sets each.', 'moderate')]),
    day(1, [s('Run', scaleByLevel(30, level), '4–5 km easy run. Stay conversational.', 'low')]),
    day(2, [s('Ruck', scaleByLevel(50, level), `5–6 km ruck, ${8 + weekNum} kg pack. Consistent pace.`, 'moderate')]),
    rest(3),
    day(4, [s('Strength', scaleByLevel(40, level), 'Compound lifts at moderate weight — volume focus.', 'moderate')]),
    day(5, [s('Run', scaleByLevel(35, level), '5 km at slightly faster pace. Progress from Wed run.', 'moderate')]),
    day(6, [s('Recovery', 20, 'Foam rolling, stretching, mobility work.', 'low')]),
  ];

  const totalMinutes = days.flatMap((d) => d.sessions).reduce((s, sess) => s + sess.durationMin, 0);
  return { weekNum, focus: `WEEK ${weekNum} — General Fitness: Balanced Load`, days, isDeloadWeek: false, totalMinutes };
}

function buildStrengthWeek(weekNum: number, level: UserProfile['trainingLevel'], isDeload: boolean): AdaptiveWeek {
  if (isDeload) return buildDeloadWeek(weekNum, 'strength_base');
  const sets = level === 'Foundation' ? 3 : level === 'Advanced' ? 5 : 4;
  const days: AdaptiveDay[] = [
    day(0, [
      s('Strength', scaleByLevel(50, level), `Push focus: press variations. ${sets} sets. Progress weight weekly.`, 'high'),
    ]),
    day(1, [s('Mobility', 25, 'Joint prep, hip flexor and thoracic mobility.', 'low')]),
    day(2, [
      s('Strength', scaleByLevel(50, level), `Pull focus: rows and pull patterns. ${sets} sets.`, 'high'),
    ]),
    rest(3),
    day(4, [
      s('Strength', scaleByLevel(55, level), `Leg focus: squat, hinge, single-leg. ${sets} sets.`, 'high'),
      s('Ruck', scaleByLevel(30, level), '3 km easy ruck to apply leg strength under load.', 'low'),
    ]),
    day(5, [s('Run', scaleByLevel(25, level), '3 km easy conditioning run.', 'low')]),
    day(6, [s('Recovery', 20, 'Full body stretch and foam roll.', 'low')]),
  ];

  const totalMinutes = days.flatMap((d) => d.sessions).reduce((s, sess) => s + sess.durationMin, 0);
  return { weekNum, focus: `WEEK ${weekNum} — Strength Base: Push / Pull / Legs`, days, isDeloadWeek: false, totalMinutes };
}

function buildRecoveryWeek(weekNum: number, level: UserProfile['trainingLevel'], isDeload: boolean): AdaptiveWeek {
  if (isDeload) return buildDeloadWeek(weekNum, 'recovery_focus');
  const days: AdaptiveDay[] = [
    day(0, [s('Mobility', 30, 'Full-body mobility session. Target hips, hamstrings, spine.', 'low')]),
    day(1, [s('Run', 25, '3–4 km very easy. Heart rate zone 1–2 only.', 'low')]),
    rest(2),
    day(3, [s('Recovery', 30, 'Breathing work, contrast showers, foam rolling.', 'low')]),
    day(4, [s('Strength', scaleByLevel(30, level), 'Bodyweight only — no external load. Focus motor patterns.', 'low')]),
    day(5, [s('Ruck', scaleByLevel(30, level), '3 km easy ruck with minimal pack weight.', 'low')]),
    day(6, [s('Mobility', 20, 'Yoga-style recovery flow or guided stretch session.', 'low')]),
  ];

  const totalMinutes = days.flatMap((d) => d.sessions).reduce((s, sess) => s + sess.durationMin, 0);
  return { weekNum, focus: `WEEK ${weekNum} — Recovery Focus: Low Intensity Base`, days, isDeloadWeek: false, totalMinutes };
}

export function generateAdaptivePlan(
  goalType: PlanGoalType,
  weeksCount: number,
  profile: UserProfile,
  logs: TrainingLog[],
): AdaptivePlan {
  const level = profile.trainingLevel ?? 'Intermediate';
  const weeks: AdaptiveWeek[] = [];

  for (let w = 1; w <= weeksCount; w++) {
    const isDeload = w % 4 === 0;
    switch (goalType) {
      case 'dfift_prep':    weeks.push(buildDfiftWeek(w, level, isDeload)); break;
      case 'ruck_event':    weeks.push(buildRuckWeek(w, level, isDeload)); break;
      case 'strength_base': weeks.push(buildStrengthWeek(w, level, isDeload)); break;
      case 'recovery_focus':weeks.push(buildRecoveryWeek(w, level, isDeload)); break;
      default:              weeks.push(buildGeneralWeek(w, level, isDeload));
    }
  }

  const GOAL_META: Record<PlanGoalType, { title: string; summary: string }> = {
    dfift_prep:      { title: 'DFIFT Preparation Plan', summary: 'Progressive push-up, sit-up, run, and ruck training targeting DFIFT standards.' },
    ruck_event:      { title: 'Ruck Event Plan', summary: 'Build distance, load tolerance, and time on feet for ruck competitions or events.' },
    general_fitness: { title: 'General Fitness Plan', summary: 'Balanced weekly load across strength, run, ruck, and recovery for broad fitness.' },
    strength_base:   { title: 'Strength Base Plan', summary: 'Progressive overload on push, pull, and leg patterns with mobility and ruck conditioning.' },
    recovery_focus:  { title: 'Recovery Focus Plan', summary: 'Low-intensity structured plan to rebuild readiness and reduce accumulated fatigue.' },
  };

  return {
    goalType,
    ...GOAL_META[goalType],
    weeksCount,
    weeks,
    generatedAt: new Date().toISOString(),
  };
}

export const GOAL_OPTIONS: { value: PlanGoalType; label: string; description: string }[] = [
  { value: 'dfift_prep',      label: 'DFIFT PREP',       description: 'Prepare for DFIFT: push-ups, sit-ups, run & ruck.' },
  { value: 'ruck_event',      label: 'RUCK EVENT',        description: 'Build for a ruck march, race, or military event.' },
  { value: 'general_fitness', label: 'GENERAL FITNESS',   description: 'Balanced strength, cardio, and ruck across the week.' },
  { value: 'strength_base',   label: 'STRENGTH BASE',     description: 'Progressive compound lifting with ruck conditioning.' },
  { value: 'recovery_focus',  label: 'RECOVERY FOCUS',    description: 'Low-intensity plan to rebuild after high load or illness.' },
];

export const INTENSITY_COLORS = { low: '#3fc8e4', moderate: '#ffaa44', high: '#e05050' };
export const CATEGORY_COLORS: Record<string, string> = {
  Ruck: '#91e6a3', Strength: '#ffaa44', Run: '#3fc8e4',
  Recovery: '#7a9480', Mobility: '#9ab0c4', Military: '#c097f7',
};
