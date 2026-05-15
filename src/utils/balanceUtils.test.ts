import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TrainingLog } from '@/src/screens/TrainingContext';
import { buildTrainingBalance } from './balanceUtils';

function makeLog(overrides: Partial<TrainingLog> = {}): TrainingLog {
  return {
    id: 1,
    date: '2026-05-11',
    category: 'Ruck',
    type: 'Loaded Ruck',
    duration: '60 minutes',
    distanceLoad: '6 km with 15 kg',
    readiness: '7',
    notes: 'Steady session with controlled effort.',
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('buildTrainingBalance', () => {
  it('returns no data when this week has no sessions', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    expect(buildTrainingBalance([])).toMatchObject({
      score: 0,
      status: 'no-data',
      label: 'No Data',
    });
  });

  it('detects missing training pillars', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const balance = buildTrainingBalance([
      makeLog({ id: 1, date: '2026-05-11', category: 'Ruck' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Run' }),
    ]);

    expect(balance.status).toBe('gap');
    expect(balance.gaps).toContain('No strength');
    expect(balance.gaps).toContain('No recovery or mobility');
  });

  it('detects overload risk', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const balance = buildTrainingBalance([
      makeLog({ id: 1, date: '2026-05-11', category: 'Ruck', readiness: '7' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Ruck', readiness: '5' }),
      makeLog({ id: 3, date: '2026-05-13', category: 'Ruck', readiness: '4' }),
    ]);

    expect(balance.status).toBe('overload');
    expect(balance.overloads).toContain('High ruck frequency');
    expect(balance.overloads).toContain('Multiple fatigue-watch sessions');
  });

  it('marks a complete split as balanced', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const balance = buildTrainingBalance([
      makeLog({ id: 1, date: '2026-05-11', category: 'Ruck' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Run' }),
      makeLog({ id: 3, date: '2026-05-13', category: 'Strength' }),
      makeLog({ id: 4, date: '2026-05-14', category: 'Recovery' }),
    ]);

    expect(balance.status).toBe('balanced');
    expect(balance.score).toBe(100);
  });
});
