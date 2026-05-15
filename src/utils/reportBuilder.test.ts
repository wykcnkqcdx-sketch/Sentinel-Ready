import { describe, expect, it, vi, afterEach } from 'vitest';
import type { TrainingLog } from '@/src/screens/TrainingContext';
import { buildWeeklyReport } from './reportBuilder';

function makeLog(overrides: Partial<TrainingLog> = {}): TrainingLog {
  return {
    id: 1,
    date: '2026-05-11',
    category: 'Ruck',
    type: 'Loaded Ruck',
    duration: '60 minutes',
    distanceLoad: '6 km with 15 kg',
    readiness: '7',
    notes: 'Steady tactical pace with controlled breathing and no unusual pain.',
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('buildWeeklyReport', () => {
  it('builds a copy-ready report with readiness, risk, recommendation and split', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const report = buildWeeklyReport([
      makeLog({ id: 1, date: '2026-05-11', category: 'Ruck', readiness: '8' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Strength', readiness: '7' }),
      makeLog({ id: 3, date: '2026-05-13', category: 'Recovery', readiness: '8' }),
    ]);

    expect(report.title).toBe('Sentinel Ready Weekly Report');
    expect(report.generatedAt).toBe('2026-05-14');
    expect(report.text).toContain('SENTINEL READY WEEKLY REPORT');
    expect(report.text).toContain('Training Log Health:');
    expect(report.text).toContain('Readiness Trend:');
    expect(report.text).toContain('Weekly Load Risk:');
    expect(report.text).toContain('Recommended Next Session:');
    expect(report.text).toContain('Ruck: 1');
    expect(report.text).toContain('Strength: 1');
    expect(report.text).toContain('Recovery: 1');
  });

  it('includes weak log and fatigue-watch counts', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const report = buildWeeklyReport([
      makeLog({ id: 1, date: '2026-05-11', readiness: '4', notes: 'ok' }),
      makeLog({ id: 2, date: '2026-05-12', readiness: '7' }),
    ]);

    expect(report.text).toContain('Weak Logs: 1');
    expect(report.text).toContain('Fatigue Watch Logs: 1');
    expect(report.text).toContain('KEY NOTES');
  });
});
