import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TrainingLog } from '@/src/screens/TrainingContext';
import type { TrainingGoal } from '@/src/screens/TrainingContext';
import { calculateReadinessPercentage } from '@/src/screens/TrainingContext';
import {
  buildReadinessTrend,
  buildGoalAction,
  buildPerformanceSnapshot,
  buildSessionRecommendation,
  buildWeeklyLoadRisk,
  buildWeekPlan,
  buildWeekSummary,
  calculateTrainingLogHealthScore,
  filterAndSortLogs,
  getGoalProgress,
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

function makeGoal(overrides: Partial<TrainingGoal> = {}): TrainingGoal {
  return {
    id: 1,
    category: 'Ruck',
    title: '10 km ruck',
    target: '10 km with 18 kg',
    current: '8 km with 18 kg',
    deadline: '',
    notes: '',
    status: 'active',
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

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

  it('recommends a deload day when weekly load risk is high', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const recommendation = buildSessionRecommendation([
      makeLog({ id: 1, date: '2026-05-10', category: 'Ruck', readiness: '7' }),
      makeLog({ id: 2, date: '2026-05-11', category: 'Ruck', readiness: '7' }),
      makeLog({ id: 3, date: '2026-05-12', category: 'Ruck', readiness: '7' }),
    ]);

    expect(recommendation).toMatchObject({
      sessionType: 'Deload Day',
      actionType: 'add-log',
      status: 'warning',
    });
  });

  it('recommends mobility when weekly load is moderate without recovery', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const recommendation = buildSessionRecommendation([
      makeLog({ id: 1, date: '2026-05-10', category: 'Strength', readiness: '7' }),
      makeLog({ id: 2, date: '2026-05-11', category: 'Run', readiness: '7' }),
      makeLog({ id: 3, date: '2026-05-12', category: 'Ruck', readiness: '7' }),
    ]);

    expect(recommendation).toMatchObject({
      sessionType: 'Mobility Session',
      actionType: 'add-log',
      status: 'caution',
    });
  });

  it('points users to weak logs when most saved logs need improvement', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

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
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const plan = buildWeekPlan([
      makeLog({ id: 1, date: '2026-05-10', readiness: '8' }),
      makeLog({ id: 2, date: '2026-05-11', readiness: '5' }),
    ]);

    expect(plan.planType).toBe('recovery');
    expect(plan.days).toHaveLength(7);
  });
});

describe('goal progress', () => {
  it('extracts numeric progress from current and target text', () => {
    expect(getGoalProgress(makeGoal())).toMatchObject({
      percent: 80,
      label: '80% toward target',
      hasNumericProgress: true,
    });
  });

  it('caps complete goals at 100 percent', () => {
    expect(getGoalProgress(makeGoal({ status: 'complete', current: '2 km', target: '10 km' }))).toMatchObject({
      percent: 100,
      label: 'Complete',
      hasNumericProgress: true,
    });
  });

  it('falls back to text status when numbers are missing', () => {
    expect(getGoalProgress(makeGoal({ current: 'Building baseline', target: 'Improve consistency' }))).toMatchObject({
      percent: 0,
      label: 'Building baseline',
      hasNumericProgress: false,
    });
  });
});

describe('goal action', () => {
  it('asks for a priority goal when no active goals exist', () => {
    expect(buildGoalAction([], [])).toMatchObject({
      title: 'Set Priority Goal',
      status: 'neutral',
    });
  });

  it('protects readiness when fatigue risk is elevated', () => {
    const action = buildGoalAction(
      [makeGoal()],
      [
        makeLog({ id: 1, date: '2026-05-11', readiness: '5' }),
        makeLog({ id: 2, date: '2026-05-12', readiness: '4' }),
      ]
    );

    expect(action).toMatchObject({
      title: 'Protect Readiness',
      status: 'warning',
    });
  });

  it('builds category-specific guidance for ruck goals', () => {
    const action = buildGoalAction([makeGoal()], [makeLog({ readiness: '8' })]);

    expect(action).toMatchObject({
      title: 'Goal Ruck Session',
      status: 'good',
    });
    expect(action.action).toContain('controlled ruck');
  });
});

describe('performance snapshot', () => {
  it('extracts best ruck/run distances and longest duration', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const snapshot = buildPerformanceSnapshot([
      makeLog({ id: 1, date: '2026-05-11', category: 'Ruck', distanceLoad: '8 km with 15 kg', duration: '1 hr 20 min' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Run', distanceLoad: '5 miles', duration: '45 minutes' }),
      makeLog({ id: 3, date: '2026-05-13', category: 'Ruck', distanceLoad: '10 km with 18 kg', duration: '90 minutes' }),
    ]);

    expect(snapshot.bestRuckDistanceKm).toBe(10);
    expect(snapshot.bestRunDistanceKm).toBe(8);
    expect(snapshot.longestSessionMinutes).toBe(90);
    expect(snapshot.consistencyLabel).toBe('Building');
  });

  it('marks weekly consistency on target at four sessions', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const snapshot = buildPerformanceSnapshot([
      makeLog({ id: 1, date: '2026-05-11' }),
      makeLog({ id: 2, date: '2026-05-12' }),
      makeLog({ id: 3, date: '2026-05-13' }),
      makeLog({ id: 4, date: '2026-05-14' }),
    ]);

    expect(snapshot.consistencyLabel).toBe('On target');
    expect(snapshot.highlight).toBe('Weekly consistency target is on track.');
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

describe('filterAndSortLogs edge cases', () => {
  it('returns empty array when logs is empty', () => {
    expect(filterAndSortLogs([], 'All', '', 'Newest', false)).toEqual([]);
  });

  it('showWeakLogsOnly with no weak logs returns empty array', () => {
    const logs = [
      makeLog({ id: 1, readiness: '8', notes: 'Steady effort, good posture, breathing controlled, no pain.' }),
      makeLog({ id: 2, readiness: '8', notes: 'Controlled pace, no fatigue issues, breathing steady throughout.' }),
    ];
    expect(filterAndSortLogs(logs, 'All', '', 'Newest', true)).toEqual([]);
  });

  it('sort by Lowest Readiness puts lowest first', () => {
    const logs = [
      makeLog({ id: 1, readiness: '7' }),
      makeLog({ id: 2, readiness: '3' }),
      makeLog({ id: 3, readiness: '5' }),
    ];
    const sorted = filterAndSortLogs(logs, 'All', '', 'Lowest Readiness', false);
    expect(sorted[0].readiness).toBe('3');
  });

  it('search filters by category case-insensitively', () => {
    const logs = [
      makeLog({ id: 1, category: 'Ruck', type: 'Loaded Ruck' }),
      makeLog({ id: 2, category: 'Strength', type: 'Full Body Strength' }),
    ];
    const result = filterAndSortLogs(logs, 'All', 'ruck', 'Newest', false);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Ruck');
  });

  it('logs with invalid dates sort to end', () => {
    const logs = [
      makeLog({ id: 1, date: '2026-05-11' }),
      makeLog({ id: 2, date: 'invalid' }),
    ];
    const sorted = filterAndSortLogs(logs, 'All', '', 'Newest', false);
    expect(sorted[0].date).toBe('2026-05-11');
  });
});

describe('calculateReadinessPercentage', () => {
  it('returns 0 for empty logs array', () => {
    expect(calculateReadinessPercentage([])).toBe(0);
  });

  it('averages last 5 readiness scores scaled to 100', () => {
    const logs = [
      makeLog({ id: 1, date: '2026-05-07', readiness: '6' }),
      makeLog({ id: 2, date: '2026-05-08', readiness: '7' }),
      makeLog({ id: 3, date: '2026-05-09', readiness: '8' }),
      makeLog({ id: 4, date: '2026-05-10', readiness: '9' }),
      makeLog({ id: 5, date: '2026-05-11', readiness: '10' }),
    ];
    expect(calculateReadinessPercentage(logs)).toBe(80);
  });

  it('uses only last 5 logs when more than 5 exist', () => {
    const logs = [
      makeLog({ id: 1, date: '2026-05-01', readiness: '1' }),
      makeLog({ id: 2, date: '2026-05-02', readiness: '1' }),
      makeLog({ id: 3, date: '2026-05-07', readiness: '6' }),
      makeLog({ id: 4, date: '2026-05-08', readiness: '7' }),
      makeLog({ id: 5, date: '2026-05-09', readiness: '8' }),
      makeLog({ id: 6, date: '2026-05-10', readiness: '9' }),
      makeLog({ id: 7, date: '2026-05-11', readiness: '10' }),
    ];
    expect(calculateReadinessPercentage(logs)).toBe(80);
  });

  it('handles non-numeric readiness gracefully', () => {
    const result = calculateReadinessPercentage([makeLog({ readiness: 'abc' })]);
    expect(typeof result).toBe('number');
    expect(Number.isNaN(result)).toBe(false);
  });
});
