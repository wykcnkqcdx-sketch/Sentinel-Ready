import type { TrainingCategory, TrainingLog, TrainingGoal } from '@/src/screens/TrainingContext';
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

export type PlanLogDraft = Omit<TrainingLog, 'id'>;

const WEEK_START_DAY = 1;

function createDayPlan(input: Omit<DayPlan, 'warmup' | 'mainWork' | 'cooldown' | 'adjustment'> & Partial<Pick<DayPlan, 'warmup' | 'mainWork' | 'cooldown' | 'adjustment'>>): DayPlan {
  return {
    warmup: input.isRest ? 'No formal warm-up needed.' : '5-10 min easy movement, joint prep and breathing check.',
    mainWork: input.session,
    cooldown: input.isRest ? 'Keep hydration and sleep consistent.' : '5-10 min easy cooldown, foot or joint check and notes.',
    adjustment: 'If readiness is 5 or below, reduce volume by 30-50% and keep effort easy.',
    ...input,
  };
}

function getPriorityGoal(goals: TrainingGoal[]): TrainingGoal | null {
  const active = goals.filter((goal) => goal.status === 'active');
  if (active.length === 0) return null;

  return [...active].sort((a, b) => {
    const aDate = /^\d{4}-\d{2}-\d{2}$/.test(a.deadline) ? getDateValue(a.deadline) : Number.MAX_SAFE_INTEGER;
    const bDate = /^\d{4}-\d{2}-\d{2}$/.test(b.deadline) ? getDateValue(b.deadline) : Number.MAX_SAFE_INTEGER;
    return aDate - bDate || a.id - b.id;
  })[0];
}

function goalMatchesFocus(goal: TrainingGoal, focus: string) {
  if (goal.category === 'Consistency' || goal.category === 'Test' || goal.category === 'Recovery') return false;
  return focus.toLowerCase().includes(goal.category.toLowerCase());
}

function applyPriorityGoalToPlan(days: DayPlan[], goals: TrainingGoal[]): DayPlan[] {
  const priority = getPriorityGoal(goals);
  if (!priority) return days;

  let applied = false;
  return days.map((day) => {
    if (applied || day.isRest || !goalMatchesFocus(priority, day.focus)) return day;

    applied = true;
    return {
      ...day,
      session: `${day.session} - Priority Goal`,
      mainWork: `Priority goal: ${priority.title}. Target: ${priority.target}. ${day.mainWork ?? day.session}`,
      adjustment: `${day.adjustment ?? 'Adjust from readiness.'} Keep the goal-specific progression controlled: change only one variable and log the result clearly.`,
    };
  });
}

function withGoalRationale(rationale: string, goals: TrainingGoal[]) {
  const priority = getPriorityGoal(goals);
  if (!priority) return rationale;
  return `${rationale} Priority goal emphasis: ${priority.title}.`;
}

function focusToTrainingCategory(focus: string): TrainingCategory {
  const lower = focus.toLowerCase();
  if (lower.includes('ruck')) return 'Ruck';
  if (lower.includes('resistance') || lower.includes('circuit')) return 'Resistance';
  if (lower.includes('hiking') || lower.includes('hike') || lower.includes('terrain')) return 'Hiking';
  if (lower.includes('military') || lower.includes('field') || lower.includes('tactical')) return 'Military';
  if (lower.includes('run')) return 'Run';
  if (lower.includes('strength')) return 'Strength';
  if (lower.includes('mobility')) return 'Mobility';
  if (lower.includes('test')) return 'Test';
  return 'Recovery';
}

function getDefaultDuration(category: TrainingCategory, intensity: DayPlan['intensity']) {
  if (category === 'Ruck') return intensity === 'High' ? '75 minutes' : '60 minutes';
  if (category === 'Hiking') return intensity === 'High' ? '120 minutes' : '90 minutes';
  if (category === 'Strength') return '50 minutes';
  if (category === 'Resistance') return '40 minutes';
  if (category === 'Military') return '60 minutes';
  if (category === 'Run') return '35 minutes';
  if (category === 'Mobility' || category === 'Recovery') return '25 minutes';
  return '40 minutes';
}

function getDistanceLoadFromPlan(category: TrainingCategory, details: ReturnType<typeof getDayPlanDetails>) {
  if (category === 'Ruck') return 'Planned loaded ruck - see main work';
  if (category === 'Hiking') return 'Planned terrain hike - see main work';
  if (category === 'Strength') return 'Squat/hinge - press - pull - carry';
  if (category === 'Resistance') return 'Push - pull - hinge - lunge - carry - core';
  if (category === 'Military') return 'Navigation - tactical movement - casualty drag - kit checks';
  if (category === 'Run') return 'Planned aerobic run - see main work';
  if (category === 'Mobility' || category === 'Recovery') return 'Mobility - breathing - foot care - recovery';
  return details.mainWork.slice(0, 100);
}

function getPlanDayIndex(date: Date) {
  return (date.getDay() - WEEK_START_DAY + 7) % 7;
}

export function getCurrentPlanDay(days: DayPlan[], date: Date = new Date()): DayPlan | null {
  if (days.length === 0) return null;
  return days[getPlanDayIndex(date) % days.length] ?? days[0] ?? null;
}

export function buildPlanLogDraft(plan: DayPlan, date: string = new Date().toISOString().slice(0, 10)): PlanLogDraft {
  const category = focusToTrainingCategory(plan.focus);
  const details = getDayPlanDetails(plan);

  return {
    date,
    category,
    type: plan.session.replace(/\s+-\s+Priority Goal$/, ''),
    duration: getDefaultDuration(category, plan.intensity),
    distanceLoad: getDistanceLoadFromPlan(category, details),
    readiness: '',
    notes: [
      `Planned ${plan.focus} session from Sentinel Ready.`,
      `Main: ${details.mainWork}`,
      `Adjust: ${details.adjustment}`,
    ].join(' '),
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
      rationale: 'Readiness is dropping. Keep the military plan in recovery mode this week and rebuild capacity before adding load.',
      days: Array.from({ length: 7 }).map((_, i) => ({
        day: `Day ${i + 1}`,
        focus: i === 3 ? 'Mobility' : 'Recovery',
        session: i === 3 ? 'Mobility, Breathing and Foot Care' : 'Active Recovery',
        warmup: 'Easy walk or breathing reset only.',
        mainWork: '20-30 minutes easy movement, hips/calves/hamstrings/shoulders, foot care and hydration. No loaded progression.',
        cooldown: 'Record soreness, sleep quality and readiness. Keep the next day easy if readiness remains 5 or below.',
        adjustment: 'If pain or illness is present, make this complete rest and seek appropriate support.',
        intensity: 'Rest',
        isRest: true,
      })),
    };
  }

  if (readinessImproving && logs.length >= 3 && recentFatigueWatch === 0) {
    return {
      planType: 'progressive',
      rationale: withGoalRationale('Readiness is improving. Use a progressive military microcycle: strength, resistance, ruck, hiking, field skills and recovery, while progressing only one load variable.', goals),
      days: applyPriorityGoalToPlan([
        createDayPlan({
          day: 'Day 1',
          focus: 'Strength',
          session: 'Lower Strength + Carries',
          warmup: '10 minutes hip, ankle and trunk prep. Add light loaded carries before main sets.',
          mainWork: 'Squat or trap-bar deadlift 4x4-6, split squat 3x8 each side, pull-ups or rows 4x6-10, farmer carry 4x40m, plank variation 3 rounds.',
          cooldown: 'Easy walk, calves/hips, and note joint response before the next load-carriage day.',
          adjustment: 'Advanced: add one back-off set. Foundation: use 3 sets and keep 2-3 reps in reserve.',
          intensity: 'Moderate',
          isRest: false,
        }),
        createDayPlan({
          day: 'Day 2',
          focus: 'Ruck',
          session: 'Loaded Ruck Intervals',
          warmup: '10 minutes unloaded walk, foot check, pack fit check and gradual pace build.',
          mainWork: '6-8 km with 15-22 kg. Alternate 8 minutes steady tactical pace with 2 minutes easier pace. Keep posture tall and stride efficient.',
          cooldown: 'Unload, walk 5 minutes, check feet/hot spots and log pack comfort.',
          adjustment: 'Progress only distance or load. If readiness is 6 or below, make it 45 minutes easy.',
          intensity: 'High',
          isRest: false,
        }),
        createDayPlan({
          day: 'Day 3',
          focus: 'Resistance',
          session: 'Resistance Circuit + Core',
          warmup: '8 minutes shoulder, hip and trunk prep with easy crawling or bear-position holds.',
          mainWork: '4-5 rounds: push-ups 12-20, rows 10-15, kettlebell swings or hip hinge 12-15, walking lunge 10 each side, sandbag or farmer carry 30-40m, dead bug or side plank.',
          cooldown: 'Breathing reset, forearm/grip release, hips and thoracic mobility.',
          adjustment: 'Keep circuit effort at 7/10. Stop one round early if movement quality drops.',
          intensity: 'Moderate',
          isRest: false,
        }),
        createDayPlan({
          day: 'Day 4',
          focus: 'Military',
          session: 'Field Skills and Tactical Movement',
          warmup: 'Kit check, 5-10 minutes easy movement, ankle/knee prep and low crawl patterning.',
          mainWork: '60 minutes low-risk skills: map/compass checks, movement discipline, short bounds, crawl mechanics, casualty drag technique and communication drills. Keep it technical, not a conditioning test.',
          cooldown: 'Review navigation errors, kit friction points, knees/elbows/feet and recovery cost.',
          adjustment: 'If legs are heavy from Day 2, remove drags and keep only navigation plus movement quality.',
          intensity: 'Low',
          isRest: false,
        }),
        createDayPlan({
          day: 'Day 5',
          focus: 'Run',
          session: 'Aerobic Run + Strides',
          warmup: '8-10 minutes easy jog, drills and calf check.',
          mainWork: '30-45 minutes comfortable aerobic running, then 4-6 relaxed 20-second strides. Keep breathing controlled.',
          cooldown: 'Walk 5 minutes, calves/hips, and note pace versus effort.',
          adjustment: 'Swap for a low-impact bike/row if impact soreness is present.',
          intensity: 'Moderate',
          isRest: false,
        }),
        createDayPlan({
          day: 'Day 6',
          focus: 'Hiking',
          session: 'Long Terrain Hike',
          warmup: 'Foot care, route check, weather check and 10 minutes easy walking.',
          mainWork: '90-150 minutes mixed terrain with light to moderate day kit. Practise steady climbing, downhill control, fueling, navigation stops and pace discipline.',
          cooldown: 'Foot inspection, calf/hip mobility and hydration. Log terrain, elevation, pack comfort and energy.',
          adjustment: 'If readiness is strong, add hills rather than speed. If readiness is low, cap at 60 minutes easy.',
          intensity: 'Moderate',
          isRest: false,
        }),
        createDayPlan({
          day: 'Day 7',
          focus: 'Recovery',
          session: 'Recovery + Test Prep Review',
          warmup: 'No formal warm-up needed.',
          mainWork: '20-30 minutes mobility, easy walk, foot care and review of test standards. Set next week targets for ruck, run, strength and field skills.',
          cooldown: 'Prioritise sleep, food prep and kit maintenance.',
          adjustment: 'Make this complete rest if readiness is 5 or below.',
          intensity: 'Rest',
          isRest: true,
        }),
      ], goals),
    };
  }
  
  return {
    planType: 'standard',
    rationale: withGoalRationale('Readiness is stable. Follow a balanced military-readiness week covering strength, resistance, ruck, hiking, military skills and recovery.', goals),
    days: applyPriorityGoalToPlan([
      createDayPlan({
        day: 'Day 1',
        focus: 'Strength',
        session: 'Full Body Strength',
        mainWork: 'Squat or hinge 3-4x5, press 3-4x6, pull 3-4x6-10, loaded carry 3x40m, trunk brace 3 rounds.',
        adjustment: 'Keep all sets controlled and stop short of grinding reps.',
        intensity: 'Moderate',
        isRest: false,
      }),
      createDayPlan({
        day: 'Day 2',
        focus: 'Ruck',
        session: 'Base Loaded Ruck',
        mainWork: '45-75 minutes with moderate load. Hold steady posture, efficient stride, foot checks and controlled breathing.',
        adjustment: 'Progress distance or load by a small amount only if readiness is 7 or above.',
        intensity: 'Moderate',
        isRest: false,
      }),
      createDayPlan({
        day: 'Day 3',
        focus: 'Resistance',
        session: 'Resistance Training Circuit',
        mainWork: '3-4 rounds of push, pull, hinge, lunge, carry and core. Keep transitions smooth and form crisp.',
        adjustment: 'Use lighter loads if Day 2 created foot, knee or back soreness.',
        intensity: 'Moderate',
        isRest: false,
      }),
      createDayPlan({
        day: 'Day 4',
        focus: 'Military',
        session: 'Military Skills Practice',
        mainWork: '45-60 minutes technical practice: navigation, kit setup, tactical movement, casualty drag mechanics and communication drills.',
        adjustment: 'Keep it technical and low impact if fatigue is present.',
        intensity: 'Low',
        isRest: false,
      }),
      createDayPlan({
        day: 'Day 5',
        focus: 'Run',
        session: 'Aerobic Base Run',
        mainWork: '30-40 minutes conversational pace plus short mobility after. The goal is aerobic base, not a test effort.',
        adjustment: 'Swap to easy bike/row or brisk walk if lower-leg soreness is building.',
        intensity: 'Moderate',
        isRest: false,
      }),
      createDayPlan({
        day: 'Day 6',
        focus: 'Hiking',
        session: 'Terrain Hike',
        mainWork: '75-120 minutes mixed terrain with day kit. Practise pacing, climbs, descents, fueling, foot care and navigation pauses.',
        adjustment: 'Keep load light if the week already included a hard ruck.',
        intensity: 'Moderate',
        isRest: false,
      }),
      createDayPlan({
        day: 'Day 7',
        focus: 'Recovery',
        session: 'Recovery Mobility',
        mainWork: '20-30 minutes hips, calves, hamstrings, shoulders, breathing and easy walking. Prep kit and plan next week.',
        adjustment: 'Make this full rest if readiness is 5 or below.',
        intensity: 'Rest',
        isRest: true,
      }),
    ], goals),
  };
}
