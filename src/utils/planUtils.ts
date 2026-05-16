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
      rationale: 'Readiness is improving. Use a progressive military microcycle: strength, resistance, ruck, hiking, field skills and recovery, while progressing only one load variable.',
      days: [
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
      ],
    };
  }
  
  return {
    planType: 'standard',
    rationale: 'Readiness is stable. Follow a balanced military-readiness week covering strength, resistance, ruck, hiking, military skills and recovery.',
    days: [
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
    ],
  };
}
