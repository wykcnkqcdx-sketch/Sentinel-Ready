import { describe, expect, it, vi, afterEach } from 'vitest';
import type { TrainingLog } from '@/src/screens/TrainingContext';
import { buildRecoveryDebt } from './recoveryUtils';

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

describe('buildRecoveryDebt', () => {
  it('returns no-data status when logs are empty', () => {
    expect(buildRecoveryDebt([])).toMatchObject({
      score: 0,
      status: 'no-data',
      label: 'No Data',
    });
  });

  it('marks high debt for low readiness, fatigue and no recovery work', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const debt = buildRecoveryDebt([
      makeLog({ id: 1, date: '2026-05-11', readiness: '8' }),
      makeLog({ id: 2, date: '2026-05-12', readiness: '5' }),
      makeLog({ id: 3, date: '2026-05-13', readiness: '4' }),
      makeLog({ id: 4, date: '2026-05-14', readiness: '5' }),
    ], 'left knee soreness');

    expect(debt.status).toBe('red');
    expect(debt.factors).toContain('Multiple recent fatigue-watch sessions');
    expect(debt.factors).toContain('Injury note present in profile');
  });

  it('marks controlled recovery when readiness and recovery balance are good', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const debt = buildRecoveryDebt([
      makeLog({ id: 1, date: '2026-05-11', category: 'Strength', readiness: '8' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Recovery', readiness: '8' }),
      makeLog({ id: 3, date: '2026-05-13', category: 'Run', readiness: '8' }),
    ]);

    expect(debt.status).toBe('green');
    expect(debt.score).toBeGreaterThanOrEqual(75);
    expect(debt.daysSinceRecovery).toBe(2);
  });
});
