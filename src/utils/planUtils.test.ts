import type { TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';
import { describe, expect, it } from 'vitest';
import { buildPlanLogDraft, buildWeekPlan, getDayPlanDetails } from './planUtils';

function makeLog(overrides: Partial<TrainingLog> = {}): TrainingLog {
  return {
    id: 1,
    date: '2026-05-16',
    category: 'Ruck',
    type: 'Loaded Ruck',
    duration: '60 min',
    distanceLoad: '8 km - 18 kg',
    readiness: '7',
    notes: 'Steady pace, breathing controlled, no pain.',
    ...overrides,
  };
}

function makeGoal(overrides: Partial<TrainingGoal> = {}): TrainingGoal {
  return {
    id: 1,
    category: 'Military',
    title: 'Weekly field skills block',
    target: '60 minutes field skills',
    current: 'Building baseline',
    deadline: '2026-06-01',
    notes: '',
    status: 'active',
    ...overrides,
  };
}

describe('planUtils', () => {
  it('builds a recovery plan when readiness is dropping', () => {
    const plan = buildWeekPlan([
      makeLog({ id: 1, date: '2026-05-15', readiness: '8' }),
      makeLog({ id: 2, date: '2026-05-16', readiness: '5' }),
    ]);

    expect(plan.planType).toBe('recovery');
    expect(plan.days.every((day) => day.isRest)).toBe(true);
  });

  it('builds a progressive plan when readiness improves without fatigue', () => {
    const plan = buildWeekPlan([
      makeLog({ id: 1, date: '2026-05-14', readiness: '6' }),
      makeLog({ id: 2, date: '2026-05-15', readiness: '8' }),
      makeLog({ id: 3, date: '2026-05-16', readiness: '8' }),
    ]);

    expect(plan.planType).toBe('progressive');
  });

  it('builds a detailed military-readiness week across required training pillars', () => {
    const plan = buildWeekPlan([
      makeLog({ id: 1, date: '2026-05-14', readiness: '6' }),
      makeLog({ id: 2, date: '2026-05-15', readiness: '8' }),
      makeLog({ id: 3, date: '2026-05-16', readiness: '8' }),
    ]);

    const focuses = plan.days.map((day) => day.focus);
    const mainWork = plan.days.map((day) => getDayPlanDetails(day).mainWork).join(' ');

    expect(focuses).toEqual(expect.arrayContaining(['Strength', 'Resistance', 'Ruck', 'Hiking', 'Military']));
    expect(mainWork).toContain('navigation');
    expect(mainWork).toContain('carry');
    expect(mainWork).toContain('terrain');
  });

  it('emphasizes the priority goal on the matching training day', () => {
    const plan = buildWeekPlan([
      makeLog({ id: 1, date: '2026-05-14', readiness: '6' }),
      makeLog({ id: 2, date: '2026-05-15', readiness: '8' }),
      makeLog({ id: 3, date: '2026-05-16', readiness: '8' }),
    ], [makeGoal()]);

    const militaryDay = plan.days.find((day) => day.focus === 'Military');
    const details = militaryDay ? getDayPlanDetails(militaryDay) : null;

    expect(plan.rationale).toContain('Priority goal emphasis');
    expect(militaryDay?.session).toContain('Priority Goal');
    expect(details?.mainWork).toContain('Weekly field skills block');
  });

  it('fills missing day plan details with defaults', () => {
    const details = getDayPlanDetails({
      day: 'Day 1',
      focus: 'Strength',
      session: 'Full Body Strength',
      intensity: 'Moderate',
      isRest: false,
    });

    expect(details.warmup).toContain('movement');
    expect(details.mainWork).toBe('Full Body Strength');
    expect(details.cooldown).toContain('cooldown');
    expect(details.adjustment).toContain('readiness');
  });

  it('builds an add-log draft from a planned military session', () => {
    const draft = buildPlanLogDraft({
      day: 'Day 4',
      focus: 'Military',
      session: 'Field Skills and Tactical Movement - Priority Goal',
      mainWork: 'Practise navigation, movement discipline and casualty drag mechanics.',
      adjustment: 'Keep the session technical.',
      intensity: 'Low',
      isRest: false,
    }, '2026-05-20');

    expect(draft).toMatchObject({
      date: '2026-05-20',
      category: 'Military',
      type: 'Field Skills and Tactical Movement',
      duration: '60 minutes',
    });
    expect(draft.distanceLoad).toContain('Navigation');
    expect(draft.notes).toContain('casualty drag');
  });
});
