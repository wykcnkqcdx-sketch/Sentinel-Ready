import type { TrainingLog } from '@/src/screens/TrainingContext';
import { describe, expect, it, vi } from 'vitest';
import {
  buildNextWeekRecommendation,
  buildReadinessTrend,
  buildSessionRecommendation,
  buildSummary,
  buildWeekPlan,
  calculateTrainingLogHealthScore,
  getDateValue,
  getNotesQualityMessage,
  getNotesQualityWarning,
  getNoteStarter,
  getReadinessLabel,
  getReadinessNumber,
  getTrainingLogHealthLabel,
  getTrainingLogHealthMessage,
  isFatigueWatch,
  logNeedsImprovement,
} from './trainingLogUtils';

function makeLog(overrides?: Partial<TrainingLog>): TrainingLog {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    date: '2026-05-10',
    category: 'Ruck',
    type: 'Loaded Ruck',
    duration: '60 min',
    distanceLoad: '10 km - 15 kg',
    readiness: '7',
    notes: 'Steady pace, breathing controlled, no pain.',
    ...overrides,
  };
}

describe('getReadinessNumber', () => {
  it('returns the numeric value for a valid string', () => {
    expect(getReadinessNumber('7')).toBe(7);
  });

  it('returns 0 for a non-numeric string', () => {
    expect(getReadinessNumber('abc')).toBe(0);
  });

  it('returns 0 for an empty string', () => {
    expect(getReadinessNumber('')).toBe(0);
  });
});

describe('isFatigueWatch', () => {
  it('returns true for readiness exactly 5', () => {
    expect(isFatigueWatch('5')).toBe(true);
  });

  it('returns false for readiness 6', () => {
    expect(isFatigueWatch('6')).toBe(false);
  });

  it('returns false for non-numeric readiness', () => {
    expect(isFatigueWatch('abc')).toBe(false);
  });
});

describe('getDateValue', () => {
  it('returns a positive timestamp for a valid date', () => {
    expect(getDateValue('2026-05-11')).toBeGreaterThan(0);
  });

  it('returns 0 for an invalid date string', () => {
    expect(getDateValue('not-a-date')).toBe(0);
  });
});

describe('getReadinessLabel', () => {
  it.each([
    ['2', 'Low'],
    ['3', 'Low'],
    ['4', 'Fatigue Watch'],
    ['5', 'Fatigue Watch'],
    ['6', 'Moderate'],
    ['7', 'Moderate'],
    ['8', 'High'],
    ['10', 'High'],
    ['abc', 'Unknown'],
  ])('labels readiness %s as %s', (readiness, expected) => {
    expect(getReadinessLabel(readiness)).toBe(expected);
  });
});

describe('getNotesQualityMessage', () => {
  it('returns missing notes for empty string', () => {
    expect(getNotesQualityMessage('')).toBe('missing notes');
  });

  it('returns notes too brief for single weak word', () => {
    expect(getNotesQualityMessage('good')).toBe('notes too brief');
  });

  it('returns notes need more detail for a short non-weak note', () => {
    expect(getNotesQualityMessage('felt hard')).toBe('notes need more detail');
  });

  it('returns empty string for a sufficiently detailed note', () => {
    expect(getNotesQualityMessage('Steady pace, breathing controlled, no pain.')).toBe('');
  });
});

describe('getNotesQualityWarning', () => {
  it('prompts to add notes when empty', () => {
    expect(getNotesQualityWarning('')).toContain('Add');
  });

  it('prompts to expand a weak-word note', () => {
    expect(getNotesQualityWarning('ok')).toContain('too brief');
  });

  it('prompts to add one more detail for a short note', () => {
    expect(getNotesQualityWarning('felt tired')).toContain('short');
  });

  it('returns empty string for a detailed note', () => {
    expect(getNotesQualityWarning('Breathing controlled, legs felt good, no pain at all.')).toBe('');
  });
});

describe('getNoteStarter', () => {
  it.each(['Ruck', 'Run', 'Strength', 'Recovery', 'Test'] as const)(
    'returns a non-empty starter for %s',
    (category) => {
      const starter = getNoteStarter(category);
      expect(starter.length).toBeGreaterThan(10);
    }
  );

  it('returns a fallback for Mobility category', () => {
    const starter = getNoteStarter('Mobility');
    expect(starter).toContain('Session notes');
  });
});

describe('logNeedsImprovement', () => {
  it('returns false for a complete, valid log', () => {
    expect(logNeedsImprovement(makeLog())).toBe(false);
  });

  it('returns true when a field is missing', () => {
    expect(logNeedsImprovement(makeLog({ duration: '' }))).toBe(true);
  });
});

describe('buildSummary', () => {
  it('returns zero averageReadiness for logs with invalid readiness', () => {
    const summary = buildSummary([makeLog({ readiness: 'abc' })]);
    expect(summary.averageReadiness).toBe('0.0');
  });

  it('counts categories correctly', () => {
    const summary = buildSummary([
      makeLog({ category: 'Ruck' }),
      makeLog({ category: 'Ruck' }),
      makeLog({ category: 'Run' }),
    ]);
    expect(summary.ruck).toBe(2);
    expect(summary.run).toBe(1);
    expect(summary.total).toBe(3);
  });
});

describe('getTrainingLogHealthLabel', () => {
  it.each([
    [90, 'Excellent'],
    [85, 'Excellent'],
    [75, 'Healthy'],
    [70, 'Healthy'],
    [55, 'Needs Work'],
    [50, 'Needs Work'],
    [49, 'Poor Data'],
    [0, 'Poor Data'],
  ])('labels score %i as %s', (score, expected) => {
    expect(getTrainingLogHealthLabel(score)).toBe(expected);
  });
});

describe('getTrainingLogHealthMessage', () => {
  it('returns a string for each threshold', () => {
    expect(getTrainingLogHealthMessage(90)).toContain('strong');
    expect(getTrainingLogHealthMessage(72)).toContain('usable');
    expect(getTrainingLogHealthMessage(55)).toContain('needs work');
    expect(getTrainingLogHealthMessage(30)).toContain('too weak');
  });
});

describe('calculateTrainingLogHealthScore', () => {
  it('returns 0 for empty logs', () => {
    expect(calculateTrainingLogHealthScore([])).toBe(0);
  });
});

describe('buildReadinessTrend edge cases', () => {
  it('returns no-data state for empty logs', () => {
    expect(buildReadinessTrend([])).toMatchObject({
      label: 'No Data',
      status: 'neutral',
      latest: 0,
    });
  });

  it('returns baseline state for a single valid log', () => {
    expect(buildReadinessTrend([makeLog({ readiness: '7' })])).toMatchObject({
      label: 'Baseline',
      status: 'neutral',
      latest: 7,
    });
  });

  it('returns stable when change is exactly 1', () => {
    expect(
      buildReadinessTrend([
        makeLog({ id: 1, date: '2026-05-10', readiness: '6' }),
        makeLog({ id: 2, date: '2026-05-11', readiness: '7' }),
      ])
    ).toMatchObject({ label: 'Stable', status: 'neutral' });
  });
});

describe('buildSessionRecommendation edge cases', () => {
  it('returns start logging recommendation for empty logs', () => {
    expect(buildSessionRecommendation([])).toMatchObject({
      sessionType: 'Start Logging',
      actionType: 'add-log',
      status: 'neutral',
    });
  });

  it('recommends a ruck when none logged this week and readiness is good', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    expect(
      buildSessionRecommendation([
        makeLog({ id: 1, date: '2026-05-12', category: 'Strength', readiness: '8' }),
        makeLog({ id: 2, date: '2026-05-13', category: 'Run', readiness: '8' }),
      ])
    ).toMatchObject({ sessionType: 'Load Carriage', status: 'good' });
  });

  it('recommends strength when no strength logged this week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    expect(
      buildSessionRecommendation([
        makeLog({ id: 1, date: '2026-05-12', category: 'Ruck', readiness: '8' }),
        makeLog({ id: 2, date: '2026-05-13', category: 'Run', readiness: '8' }),
      ])
    ).toMatchObject({ sessionType: 'Strength or Resistance', status: 'good' });
  });

  it('recommends a run when no run logged this week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    expect(
      buildSessionRecommendation([
        makeLog({ id: 1, date: '2026-05-12', category: 'Ruck', readiness: '8' }),
        makeLog({ id: 2, date: '2026-05-13', category: 'Strength', readiness: '8' }),
      ])
    ).toMatchObject({ sessionType: 'Steady Run', status: 'good' });
  });

  it('recommends progressive load when trend is good and no fatigue', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    expect(
      buildSessionRecommendation([
        makeLog({ id: 1, date: '2026-05-11', category: 'Ruck', readiness: '6' }),
        makeLog({ id: 2, date: '2026-05-12', category: 'Strength', readiness: '8' }),
        makeLog({ id: 3, date: '2026-05-13', category: 'Run', readiness: '8' }),
      ])
    ).toMatchObject({ sessionType: 'Progressive Load', status: 'good' });
  });
});

describe('buildWeekPlan plan types', () => {
  it('builds a standard plan when readiness is stable', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const plan = buildWeekPlan([
      makeLog({ id: 1, date: '2026-05-11', readiness: '7' }),
      makeLog({ id: 2, date: '2026-05-12', readiness: '7' }),
    ]);

    expect(plan.planType).toBe('standard');
    expect(plan.days).toHaveLength(7);
  });

  it('builds a progressive plan when trend is good and 3+ sessions with no fatigue', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const plan = buildWeekPlan([
      makeLog({ id: 1, date: '2026-05-11', readiness: '6', category: 'Ruck' }),
      makeLog({ id: 2, date: '2026-05-12', readiness: '8', category: 'Strength' }),
      makeLog({ id: 3, date: '2026-05-13', readiness: '8', category: 'Run' }),
    ]);

    expect(plan.planType).toBe('progressive');
  });
});

describe('buildNextWeekRecommendation', () => {
  const emptyWeek = {
    total: 0,
    averageReadiness: '0',
    fatigueWatch: 0,
    weakLogs: 0,
    ruck: 0,
    strength: 0,
    resistance: 0,
    run: 0,
    hiking: 0,
    military: 0,
    mobility: 0,
    test: 0,
    recovery: 0,
    weekStart: '',
    weekEnd: '',
    fatigueWatchSessions: 0,
  };

  it('recommends logging when no sessions this week', () => {
    expect(buildNextWeekRecommendation({ ...emptyWeek }, { ...emptyWeek })).toContain('3 to 4 sessions');
  });

  it('recommends recovery when 2+ fatigue watch sessions', () => {
    expect(buildNextWeekRecommendation(
      { ...emptyWeek, total: 3, fatigueWatch: 2, averageReadiness: '4' },
      { ...emptyWeek }
    )).toContain('recovery');
  });

  it('holds load when readiness dropped more than 1 vs last week', () => {
    expect(buildNextWeekRecommendation(
      { ...emptyWeek, total: 3, averageReadiness: '5' },
      { ...emptyWeek, total: 3, averageReadiness: '7' }
    )).toContain('Hold current load');
  });

  it('suggests progressing when readiness is 7+ and no fatigue flags', () => {
    expect(buildNextWeekRecommendation(
      { ...emptyWeek, total: 3, averageReadiness: '8', fatigueWatch: 0, weakLogs: 0 },
      { ...emptyWeek, total: 3, averageReadiness: '8' }
    )).toContain('Ready to progress');
  });
});
