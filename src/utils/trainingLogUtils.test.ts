import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TrainingLog } from '@/src/screens/TrainingContext';
import {
  buildReadinessTrend,
  buildSessionRecommendation,
  buildWeeklyLoadRisk,
  buildWeekPlan,
  buildWeekSummary,
  calculateTrainingLogHealthScore,
  filterAndSortLogs,
  getCompletionScore,
  getWeakLogReasons,
} from './trainingLogUtils';

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

describe('training log completion and quality', () => {
  it('scores a complete log at 100 percent', () => {
    expect(
      getCompletionScore(
        '2026-05-11',
        'Ruck',
        'Loaded Ruck',
        '60 minutes',
        '6 km with 15 kg',
        '8',
        'Steady effort, good posture, breathing controlled, no pain.'
      )
    ).toBe(100);
  });

  it('reports weak log reasons for missing or invalid fields', () => {
    expect(
      getWeakLogReasons(
        makeLog({
          date: 'bad-date',
          type: 'ok',
          duration: '',
          distanceLoad: '5',
          readiness: '12',
          notes: 'ok',
        })
      )
    ).toEqual(['date', 'session type', 'duration', 'distance/load', 'readiness score', 'notes too brief']);
  });
});

describe('readiness trend', () => {
  it('detects improving readiness from the latest two valid logs', () => {
    const trend = buildReadinessTrend([
      makeLog({ id: 1, date: '2026-05-09', readiness: '5' }),
      makeLog({ id: 2, date: '2026-05-10', readiness: '8' }),
      makeLog({ id: 3, date: '2026-05-11', readiness: 'not a number' }),
    ]);

    expect(trend).toMatchObject({
      latest: 8,
      previous: 5,
      change: 3,
      label: 'Improving',
      status: 'good',
    });
  });

  it('detects dropping readiness', () => {
    expect(
      buildReadinessTrend([
        makeLog({ id: 1, date: '2026-05-10', readiness: '8' }),
        makeLog({ id: 2, date: '2026-05-11', readiness: '5' }),
      ]).status
    ).toBe('warning');
  });
});

describe('weekly summaries and health', () => {
  it('summarises only logs in the requested week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const summary = buildWeekSummary([
      makeLog({ id: 1, date: '2026-05-11', category: 'Ruck', readiness: '8' }),
      makeLog({ id: 2, date: '2026-05-13', category: 'Strength', readiness: '6' }),
      makeLog({ id: 3, date: '2026-05-04', category: 'Run', readiness: '9' }),
    ]);

    expect(summary).toMatchObject({
      weekStart: '2026-05-11',
      weekEnd: '2026-05-17',
      total: 2,
      averageReadiness: '7.0',
      ruck: 1,
      strength: 1,
      run: 0,
    });
  });

  it('penalises weak and fatigue-watch logs in the health score', () => {
    const healthScore = calculateTrainingLogHealthScore([
      makeLog({ id: 1, readiness: '8' }),
      makeLog({ id: 2, readiness: '4' }),
      makeLog({ id: 3, readiness: '7', notes: 'ok' }),
    ]);

    expect(healthScore).toBe(46);
  });
});

describe('weekly load risk', () => {
  it('returns no data when no logs exist in the last 7 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    expect(buildWeeklyLoadRisk([makeLog({ id: 1, date: '2026-05-01' })])).toMatchObject({
      status: 'no-data',
      label: 'No Data',
      totalSessions: 0,
    });
  });

  it('marks high risk for multiple fatigue-watch sessions', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const risk = buildWeeklyLoadRisk([
      makeLog({ id: 1, date: '2026-05-10', readiness: '5' }),
      makeLog({ id: 2, date: '2026-05-11', readiness: '4' }),
      makeLog({ id: 3, date: '2026-05-12', readiness: '7' }),
    ]);

    expect(risk).toMatchObject({
      status: 'high',
      label: 'High',
      fatigueWatchSessions: 2,
    });
    expect(risk.factors).toContain('Multiple fatigue-watch sessions');
  });

  it('marks moderate risk when load is building without recovery', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    expect(
      buildWeeklyLoadRisk([
        makeLog({ id: 1, date: '2026-05-10', category: 'Strength', readiness: '7' }),
        makeLog({ id: 2, date: '2026-05-11', category: 'Run', readiness: '7' }),
        makeLog({ id: 3, date: '2026-05-12', category: 'Ruck', readiness: '7' }),
      ]).status
    ).toBe('moderate');
  });

  it('marks low risk when recent load is controlled', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    expect(
      buildWeeklyLoadRisk([
        makeLog({ id: 1, date: '2026-05-10', category: 'Strength', readiness: '8' }),
        makeLog({ id: 2, date: '2026-05-12', category: 'Recovery', readiness: '8' }),
      ]).status
    ).toBe('low');
  });
});

describe('recommendations and plans', () => {
  it('recommends recovery when readiness drops and fatigue watch is recent', () => {
    const recommendation = buildSessionRecommendation([
      makeLog({ id: 1, date: '2026-05-09', readiness: '8' }),
      makeLog({ id: 2, date: '2026-05-10', readiness: '5' }),
      makeLog({ id: 3, date: '2026-05-11', readiness: '4' }),
    ]);

    expect(recommendation).toMatchObject({
      sessionType: 'Active Recovery',
      actionType: 'add-log',
      status: 'warning',
    });
  });

  it('points users to weak logs when most saved logs need improvement', () => {
    const recommendation = buildSessionRecommendation([
      makeLog({ id: 1, date: '2026-05-09', readiness: '7', notes: 'ok' }),
      makeLog({ id: 2, date: '2026-05-10', readiness: '7', duration: '' }),
      makeLog({ id: 3, date: '2026-05-11', readiness: '7' }),
    ]);

    expect(recommendation).toMatchObject({
      sessionType: 'Fix Training Data',
      actionType: 'weak-logs',
      status: 'caution',
    });
  });

  it('builds a recovery week when readiness is dropping', () => {
    const plan = buildWeekPlan([
      makeLog({ id: 1, date: '2026-05-10', readiness: '8' }),
      makeLog({ id: 2, date: '2026-05-11', readiness: '5' }),
    ]);

    expect(plan.planType).toBe('recovery');
    expect(plan.days).toHaveLength(7);
  });
});

describe('filtering and sorting', () => {
  it('filters by category and search text before sorting', () => {
    const visibleLogs = filterAndSortLogs(
      [
        makeLog({ id: 1, date: '2026-05-10', category: 'Run', type: 'Steady Run', readiness: '6' }),
        makeLog({ id: 2, date: '2026-05-11', category: 'Ruck', type: 'Loaded Ruck', readiness: '8' }),
        makeLog({ id: 3, date: '2026-05-12', category: 'Ruck', type: 'Easy Ruck', readiness: '5' }),
      ],
      'Ruck',
      'loaded',
      'Highest Readiness',
      false
    );

    expect(visibleLogs.map((log) => log.id)).toEqual([2]);
  });
});
