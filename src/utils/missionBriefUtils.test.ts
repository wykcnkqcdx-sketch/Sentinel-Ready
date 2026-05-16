import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';
import { buildMissionBrief } from './missionBriefUtils';

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

describe('buildMissionBrief', () => {
  it('returns a baseline brief with no logs', () => {
    expect(buildMissionBrief([], [])).toMatchObject({
      status: 'no-data',
      title: 'Build Baseline',
    });
  });

  it('returns red when recovery debt is high', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const brief = buildMissionBrief([
      makeLog({ id: 1, date: '2026-05-11', readiness: '8' }),
      makeLog({ id: 2, date: '2026-05-12', readiness: '5' }),
      makeLog({ id: 3, date: '2026-05-13', readiness: '4' }),
      makeLog({ id: 4, date: '2026-05-14', readiness: '5' }),
    ], [makeGoal()], { injuryNotes: 'knee soreness' });

    expect(brief.status).toBe('red');
    expect(brief.title).toBe('Reduce Load Today');
  });

  it('returns amber when the weekly split has gaps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const brief = buildMissionBrief([
      makeLog({ id: 1, date: '2026-05-11', category: 'Ruck' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Run' }),
    ], [makeGoal()]);

    expect(brief.status).toBe('amber');
    expect(brief.title).toBe('Fill the Split');
    expect(brief.primaryAction).toContain('recovery');
  });

  it('returns green when readiness, recovery and balance are controlled', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const brief = buildMissionBrief([
      makeLog({ id: 1, date: '2026-05-11', category: 'Ruck' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Run' }),
      makeLog({ id: 3, date: '2026-05-13', category: 'Strength' }),
      makeLog({ id: 4, date: '2026-05-14', category: 'Recovery' }),
      makeLog({ id: 5, date: '2026-05-14', category: 'Military' }),
    ], [makeGoal()]);

    expect(brief.status).toBe('green');
    expect(brief.title).toBe('Ready to Execute');
  });
});
