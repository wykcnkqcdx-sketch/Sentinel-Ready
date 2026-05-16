import type { TrainingLog } from '@/src/screens/TrainingContext';
import { describe, expect, it } from 'vitest';
import { buildInjuryWatch } from './injuryWatchUtils';

function makeLog(overrides: Partial<TrainingLog> = {}): TrainingLog {
  return {
    id: 1,
    date: '2026-05-11',
    category: 'Ruck',
    type: 'Loaded Ruck',
    duration: '60 minutes',
    distanceLoad: '6 km with 15 kg',
    readiness: '8',
    notes: 'Steady session with controlled effort and no unusual issues.',
    ...overrides,
  };
}

describe('buildInjuryWatch', () => {
  it('returns no-data when there are no logs or injury notes', () => {
    expect(buildInjuryWatch([])).toMatchObject({
      status: 'no-data',
      label: 'No Data',
    });
  });

  it('monitors profile injury notes', () => {
    const watch = buildInjuryWatch([], 'left knee soreness');

    expect(watch.status).toBe('monitor');
    expect(watch.flags).toContain('knee');
    expect(watch.flags).toContain('sore');
  });

  it('marks high watch for repeated recent pain signals', () => {
    const watch = buildInjuryWatch([
      makeLog({ id: 1, date: '2026-05-11', notes: 'Knee pain after ruck.', readiness: '5' }),
      makeLog({ id: 2, date: '2026-05-12', notes: 'Calf tightness and shin soreness.', readiness: '5' }),
      makeLog({ id: 3, date: '2026-05-13', notes: 'Blister and ankle ache.', readiness: '6' }),
    ]);

    expect(watch.status).toBe('high');
    expect(watch.flaggedLogs).toHaveLength(3);
  });

  it('stays clear when recent notes have no warning keywords', () => {
    const watch = buildInjuryWatch([
      makeLog({ id: 1, date: '2026-05-11', notes: 'Controlled effort. Breathing steady. No issues.' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Recovery', notes: 'Mobility complete. Felt better after.' }),
    ]);

    expect(watch.status).toBe('clear');
    expect(watch.score).toBe(100);
  });

  it('marks high watch when cumulative score drops below 55 even with fewer than 3 flagged logs', () => {
    const watch = buildInjuryWatch([
      makeLog({ id: 1, date: '2026-05-11', category: 'Ruck', notes: 'Knee soreness.', readiness: '4' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Ruck', notes: 'Still sore.', readiness: '5' }),
    ], 'lower back issues');

    expect(watch.status).toBe('high');
    expect(watch.score).toBeLessThan(55);
  });
});
