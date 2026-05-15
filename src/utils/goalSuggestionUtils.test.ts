import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DfiftStandards } from '@/src/types/dfift';
import type { TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';
import { buildGoalSuggestions } from './goalSuggestionUtils';

const standards: DfiftStandards = {
  name: 'DFIFT',
  shortName: 'DFIFT',
  status: 'test',
  note: '',
  events: {
    pushUps: { male: 20, female: 6, unit: 'reps', timeLimitSeconds: 60 },
    sitUps: { male: 20, female: 20, unit: 'reps', timeLimitSeconds: 60 },
    run: { distanceKm: 2.4, maleMaxSeconds: 700, femaleMaxSeconds: 790 },
    skinfold: { maleMaxMm: 70, femaleMaxMm: 80 },
  },
};

function makeLog(overrides: Partial<TrainingLog> = {}): TrainingLog {
  return {
    id: 1,
    date: '2026-05-11',
    category: 'Ruck',
    type: 'Loaded Ruck',
    duration: '60 minutes',
    distanceLoad: '8 km with 15 kg',
    readiness: '8',
    notes: 'Steady session with controlled effort and no unusual pain.',
    ...overrides,
  };
}

function makeGoal(overrides: Partial<TrainingGoal> = {}): TrainingGoal {
  return {
    id: 1,
    category: 'Ruck',
    title: '10 km ruck',
    target: '10 km',
    current: '8 km',
    deadline: '',
    notes: '',
    status: 'active',
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('buildGoalSuggestions', () => {
  it('suggests a DFIFT weak-point goal', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const suggestions = buildGoalSuggestions([
      makeLog({ id: 1, category: 'Test', type: 'Push-ups', distanceLoad: '12 reps' }),
    ], [], { standards, gender: 'M' });

    expect(suggestions[0]).toMatchObject({
      category: 'Test',
      title: 'Push-ups standard',
    });
  });

  it('suggests recovery when the weekly split has no recovery or mobility', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const suggestions = buildGoalSuggestions([
      makeLog({ id: 1, date: '2026-05-11', category: 'Ruck' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Run', distanceLoad: '5 km' }),
      makeLog({ id: 3, date: '2026-05-13', category: 'Strength' }),
    ]);

    expect(suggestions.some((suggestion) => suggestion.category === 'Recovery')).toBe(true);
  });

  it('does not suggest a category that already has an active goal', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const suggestions = buildGoalSuggestions([
      makeLog({ id: 1, date: '2026-05-11', category: 'Ruck' }),
    ], [makeGoal()]);

    expect(suggestions.some((suggestion) => suggestion.category === 'Ruck')).toBe(false);
  });
});
