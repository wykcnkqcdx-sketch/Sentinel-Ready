import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TrainingLog } from '@/src/screens/TrainingContext';
import { buildPlanAdherence } from './adherenceUtils';

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

afterEach(() => {
  vi.useRealTimers();
});

describe('buildPlanAdherence', () => {
  it('returns no-data when there are no logs this week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    expect(buildPlanAdherence([])).toMatchObject({
      score: 0,
      status: 'no-data',
      label: 'No Data',
    });
  });

  it('detects partial adherence when only some planned categories are logged', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const adherence = buildPlanAdherence([
      makeLog({ id: 1, date: '2026-05-11', category: 'Ruck' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Strength' }),
      makeLog({ id: 3, date: '2026-05-13', category: 'Resistance' }),
    ]);

    expect(adherence.status).toBe('partial');
    expect(adherence.matched).toContain('Ruck');
    expect(adherence.missing.length).toBeGreaterThan(0);
  });

  it('marks the week on track when most planned categories are logged', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const adherence = buildPlanAdherence([
      makeLog({ id: 1, date: '2026-05-11', category: 'Ruck' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Run' }),
      makeLog({ id: 3, date: '2026-05-13', category: 'Strength' }),
      makeLog({ id: 4, date: '2026-05-14', category: 'Resistance' }),
      makeLog({ id: 5, date: '2026-05-14', category: 'Hiking' }),
      makeLog({ id: 6, date: '2026-05-14', category: 'Military' }),
    ]);

    expect(adherence.status).toBe('on-track');
    expect(adherence.score).toBeGreaterThanOrEqual(75);
  });
});
