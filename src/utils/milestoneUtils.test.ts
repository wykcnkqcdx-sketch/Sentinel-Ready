import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DfiftStandards } from '@/src/types/dfift';
import type { TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';
import { buildMilestones, getEarnedMilestones, getNextMilestone } from './milestoneUtils';

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

describe('buildMilestones', () => {
  it('earns first log, first ruck and goal setter milestones', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const milestones = buildMilestones([makeLog()], [makeGoal()]);
    const earned = getEarnedMilestones(milestones).map((milestone) => milestone.id);

    expect(earned).toContain('first-log');
    expect(earned).toContain('first-ruck');
    expect(earned).toContain('goal-setter');
  });

  it('tracks the next nearest unearned milestone', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const milestones = buildMilestones([
      makeLog({ id: 1, date: '2026-05-11', category: 'Run' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Strength' }),
      makeLog({ id: 3, date: '2026-05-13', category: 'Recovery' }),
    ]);

    expect(getNextMilestone(milestones)?.id).toBe('weekly-consistency');
  });

  it('calculates DFIFT baseline progress', () => {
    const milestones = buildMilestones([
      makeLog({ id: 1, category: 'Test', type: 'Push-ups', distanceLoad: '22 reps' }),
      makeLog({ id: 2, category: 'Test', type: 'Sit-ups', distanceLoad: '22 reps' }),
    ], [], { standards, gender: 'M' });

    const baseline = milestones.find((milestone) => milestone.id === 'dfift-baseline');
    expect(baseline?.earned).toBe(false);
    expect(baseline?.progress).toBe(50);
  });
});
