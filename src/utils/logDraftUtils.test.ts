import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';
import { buildSmartLogDraft } from './logDraftUtils';

function makeLog(overrides: Partial<TrainingLog> = {}): TrainingLog {
  return {
    id: 1,
    date: '2026-05-11',
    category: 'Ruck',
    type: 'Loaded Ruck',
    duration: '60 minutes',
    distanceLoad: '6 km with 15 kg',
    readiness: '8',
    notes: 'Steady session with controlled effort and no unusual pain.',
    ...overrides,
  };
}

function makeGoal(overrides: Partial<TrainingGoal> = {}): TrainingGoal {
  return {
    id: 1,
    category: 'Run',
    title: '5 km run',
    target: '5 km under 25 min',
    current: '4 km steady',
    deadline: '',
    notes: '',
    status: 'active',
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('buildSmartLogDraft', () => {
  it('builds a recovery draft when mission status is red', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const draft = buildSmartLogDraft([
      makeLog({ id: 1, date: '2026-05-11', readiness: '8' }),
      makeLog({ id: 2, date: '2026-05-12', readiness: '5' }),
      makeLog({ id: 3, date: '2026-05-13', readiness: '4' }),
      makeLog({ id: 4, date: '2026-05-14', readiness: '5' }),
    ], [makeGoal()], { injuryNotes: 'knee soreness' });

    expect(draft.category).toBe('Recovery');
    expect(draft.type).toBe('Active Recovery');
  });

  it('builds a mobility draft when recovery is the split gap', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const draft = buildSmartLogDraft([
      makeLog({ id: 1, date: '2026-05-11', category: 'Ruck' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Run' }),
      makeLog({ id: 3, date: '2026-05-13', category: 'Strength' }),
    ], [makeGoal()]);

    expect(draft.category).toBe('Mobility');
    expect(draft.type).toBe('Mobility Reset');
  });

  it('builds a goal-specific run draft', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const draft = buildSmartLogDraft([
      makeLog({ id: 1, date: '2026-05-11', category: 'Ruck' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Run' }),
      makeLog({ id: 3, date: '2026-05-13', category: 'Strength' }),
      makeLog({ id: 4, date: '2026-05-14', category: 'Recovery' }),
    ], [makeGoal()]);

    expect(draft.category).toBe('Run');
    expect(draft.type).toBe('Goal Run Session');
    expect(draft.distanceLoad).toBe('4 km steady');
  });
});
