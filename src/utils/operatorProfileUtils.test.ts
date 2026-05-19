import type { TrainingLog, TrainingGoal } from '@/src/screens/TrainingContext';
import { describe, expect, it } from 'vitest';
import { buildOperatorProfile } from './operatorProfileUtils';

function makeLog(overrides?: Partial<TrainingLog>): TrainingLog {
  return {
    id: Math.floor(Math.random() * 100000),
    date: '2026-05-10',
    category: 'Ruck',
    type: 'Loaded Ruck',
    duration: '60 min',
    distanceLoad: '10 km - 15 kg',
    readiness: '7',
    notes: '',
    ...overrides,
  };
}

function makeRuckLog(date: string, distanceKm = 10, packWeightKg = 15, paceSecondsPerKm = 480): TrainingLog {
  return {
    ...makeLog({ date, category: 'Ruck' }),
    ruck: {
      distanceKm,
      packWeightKg,
      paceSecondsPerKm,
      durationSeconds: distanceKm * paceSecondsPerKm,
      rpe: 6,
      routeConfidence: 'High',
      rejectedPointCount: 0,
    },
  };
}

const noGoals: TrainingGoal[] = [];

describe('buildOperatorProfile — empty logs', () => {
  it('returns SNT-000000 service number', () => {
    const p = buildOperatorProfile([], noGoals, 'General', 'Intermediate', null);
    expect(p.serviceNumber).toBe('SNT-000000');
  });

  it('returns zero totals', () => {
    const p = buildOperatorProfile([], noGoals, 'General', 'Intermediate', null);
    expect(p.totalSessions).toBe(0);
    expect(p.activeDays).toBe(0);
    expect(p.currentStreak).toBe(0);
    expect(p.longestStreak).toBe(0);
    expect(p.totalRuckSessions).toBe(0);
    expect(p.avgReadiness).toBe(0);
  });

  it('reflects user role, level, testDate', () => {
    const p = buildOperatorProfile([], noGoals, 'Selection Prep', 'Advanced', '2026-09-01');
    expect(p.role).toBe('Selection Prep');
    expect(p.trainingLevel).toBe('Advanced');
    expect(p.testDate).toBe('2026-09-01');
  });
});

describe('buildOperatorProfile — with logs', () => {
  it('generates service number from first log date', () => {
    const log = makeLog({ id: 1, date: '2026-05-10' });
    const p = buildOperatorProfile([log], noGoals, 'General', 'Intermediate', null);
    // date 2026-05-10 → replace -, slice(2) = 260510
    expect(p.serviceNumber).toBe('SNT-260510');
  });

  it('counts total sessions', () => {
    const logs = [makeLog({ id: 1 }), makeLog({ id: 2 }), makeLog({ id: 3 })];
    const p = buildOperatorProfile(logs, noGoals, 'General', 'Intermediate', null);
    expect(p.totalSessions).toBe(3);
  });

  it('counts active days (distinct dates)', () => {
    const logs = [
      makeLog({ id: 1, date: '2026-05-10' }),
      makeLog({ id: 2, date: '2026-05-10' }),
      makeLog({ id: 3, date: '2026-05-11' }),
    ];
    const p = buildOperatorProfile(logs, noGoals, 'General', 'Intermediate', null);
    expect(p.activeDays).toBe(2);
  });

  it('counts ruck sessions correctly', () => {
    const logs = [makeRuckLog('2026-05-10'), makeRuckLog('2026-05-12'), makeLog({ id: 99, category: 'Strength' })];
    const p = buildOperatorProfile(logs, noGoals, 'General', 'Intermediate', null);
    expect(p.totalRuckSessions).toBe(2);
  });

  it('sums ruck distance', () => {
    const logs = [makeRuckLog('2026-05-10', 10), makeRuckLog('2026-05-12', 8)];
    const p = buildOperatorProfile(logs, noGoals, 'General', 'Intermediate', null);
    expect(p.totalRuckDistanceKm).toBeCloseTo(18);
  });

  it('averages readiness across logs with valid scores', () => {
    const logs = [
      makeLog({ id: 1, readiness: '8' }),
      makeLog({ id: 2, readiness: '6' }),
      makeLog({ id: 3, readiness: '0' }),
    ];
    const p = buildOperatorProfile(logs, noGoals, 'General', 'Intermediate', null);
    expect(p.avgReadiness).toBeCloseTo(7);
  });

  it('includes category breakdown sorted by count desc', () => {
    const logs = [
      makeLog({ id: 1, category: 'Ruck' }),
      makeLog({ id: 2, category: 'Ruck' }),
      makeLog({ id: 3, category: 'Strength' }),
    ];
    const p = buildOperatorProfile(logs, noGoals, 'General', 'Intermediate', null);
    expect(p.categoryBreakdown[0].category).toBe('Ruck');
    expect(p.categoryBreakdown[0].count).toBe(2);
  });

  it('counts active and complete goals', () => {
    const goals: TrainingGoal[] = [
      { id: 1, title: 'A', status: 'active', category: 'Ruck', target: '10 km', current: '5 km', deadline: '', notes: '' },
      { id: 2, title: 'B', status: 'complete', category: 'Ruck', target: '10 km', current: '10 km', deadline: '', notes: '' },
      { id: 3, title: 'C', status: 'active', category: 'Strength', target: '5 sessions', current: '2 sessions', deadline: '', notes: '' },
    ];
    const p = buildOperatorProfile([makeLog()], goals, 'General', 'Intermediate', null);
    expect(p.goalsActive).toBe(2);
    expect(p.goalsComplete).toBe(1);
  });
});
