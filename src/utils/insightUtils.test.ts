import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TrainingLog } from '@/src/screens/TrainingContext';
import { buildTrainingInsights } from './insightUtils';

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

describe('buildTrainingInsights', () => {
  it('returns a baseline insight with no logs', () => {
    expect(buildTrainingInsights([])[0]).toMatchObject({
      title: 'No patterns yet',
      severity: 'neutral',
    });
  });

  it('detects dropping readiness', () => {
    const insights = buildTrainingInsights([
      makeLog({ id: 1, date: '2026-05-11', readiness: '8' }),
      makeLog({ id: 2, date: '2026-05-12', readiness: '5' }),
    ]);

    expect(insights.some((insight) => insight.title === 'Readiness is dropping')).toBe(true);
  });

  it('detects ruck fatigue patterns', () => {
    const insights = buildTrainingInsights([
      makeLog({ id: 1, date: '2026-05-11', category: 'Ruck', readiness: '5' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Ruck', readiness: '5' }),
    ]);

    expect(insights.some((insight) => insight.title === 'Ruck fatigue pattern')).toBe(true);
  });

  it('detects missing recovery when volume builds', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const insights = buildTrainingInsights([
      makeLog({ id: 1, date: '2026-05-11', category: 'Ruck' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Run' }),
      makeLog({ id: 3, date: '2026-05-13', category: 'Strength' }),
    ]);

    expect(insights.some((insight) => insight.title === 'Recovery is missing')).toBe(true);
  });

  it('returns stable fallback when no major pattern is detected', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const insights = buildTrainingInsights([
      makeLog({ id: 1, date: '2026-05-11', category: 'Ruck', readiness: '8' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Recovery', readiness: '8' }),
    ]);

    expect(insights.some((insight) => insight.title === 'Training pattern is stable')).toBe(true);
  });
});
