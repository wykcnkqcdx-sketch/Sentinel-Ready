import type { TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';
import { describe, expect, it } from 'vitest';
import { buildGoalAction, buildGoalSummary, getGoalProgress } from './goalUtils';

function makeGoal(overrides: Partial<TrainingGoal> = {}): TrainingGoal {
  return {
    id: 1,
    category: 'Ruck',
    title: '10 km operational ruck',
    target: '10 km with 18 kg',
    current: '8 km with 18 kg',
    deadline: '2026-06-01',
    notes: '',
    status: 'active',
    ...overrides,
  };
}

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

describe('goalUtils', () => {
  it('selects the earliest dated active goal as priority', () => {
    const summary = buildGoalSummary([
      makeGoal({ id: 1, title: 'Later', deadline: '2026-07-01' }),
      makeGoal({ id: 2, title: 'Sooner', deadline: '2026-06-01' }),
    ]);

    expect(summary.priority?.title).toBe('Sooner');
  });

  it('calculates numeric goal progress from current and target text', () => {
    expect(getGoalProgress(makeGoal({ current: '8 km', target: '10 km' }))).toMatchObject({
      percent: 80,
      hasNumericProgress: true,
    });
  });

  it('recommends a ruck action for an active ruck goal when readiness is stable', () => {
    const action = buildGoalAction([makeGoal()], [
      makeLog({ id: 1, date: '2026-05-15', readiness: '7' }),
      makeLog({ id: 2, date: '2026-05-16', readiness: '7' }),
    ]);

    expect(action).toMatchObject({
      title: 'Goal Ruck Session',
      status: 'good',
    });
    expect(action.action).toContain('controlled ruck');
  });

  it('protects readiness when fatigue risk is elevated', () => {
    const action = buildGoalAction([makeGoal()], [
      makeLog({ id: 1, date: '2026-05-14', readiness: '4' }),
      makeLog({ id: 2, date: '2026-05-15', readiness: '5' }),
    ]);

    expect(action).toMatchObject({
      title: 'Protect Readiness',
      status: 'warning',
    });
  });
});
