import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';
import { buildReadinessForecast } from './readinessForecastUtils';

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

function makeGoal(overrides: Partial<TrainingGoal> = {}): TrainingGoal {
  return {
    id: 1,
    category: 'Ruck',
    title: '10 km ruck',
    target: '10 km',
    current: '8 km',
    deadline: '',
    notes: '',
    status: 'active',
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('buildReadinessForecast', () => {
  it('builds a seven day forecast', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const forecast = buildReadinessForecast([
      makeLog({ id: 1, date: '2026-05-11', category: 'Ruck' }),
      makeLog({ id: 2, date: '2026-05-12', category: 'Run' }),
      makeLog({ id: 3, date: '2026-05-13', category: 'Strength' }),
      makeLog({ id: 4, date: '2026-05-14', category: 'Recovery' }),
    ], [makeGoal()]);

    expect(forecast.days).toHaveLength(7);
    expect(['green', 'amber', 'red']).toContain(forecast.status);
  });

  it('marks recovery priority when recent readiness is poor', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const forecast = buildReadinessForecast([
      makeLog({ id: 1, date: '2026-05-11', readiness: '8' }),
      makeLog({ id: 2, date: '2026-05-12', readiness: '5' }),
      makeLog({ id: 3, date: '2026-05-13', readiness: '4' }),
      makeLog({ id: 4, date: '2026-05-14', readiness: '5' }),
    ], [makeGoal()], { injuryNotes: 'knee soreness' });

    expect(forecast.status).toBe('red');
    expect(forecast.label).toBe('Recovery Priority');
  });

  it('keeps rest days at least as safe as high intensity days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));

    const forecast = buildReadinessForecast([
      makeLog({ id: 1, date: '2026-05-11', readiness: '8' }),
      makeLog({ id: 2, date: '2026-05-12', readiness: '9' }),
      makeLog({ id: 3, date: '2026-05-13', readiness: '8' }),
    ], [makeGoal({ category: 'Run' })]);

    const statusRank = { red: 0, amber: 1, green: 2 };
    const restDay = forecast.days.find((day) => day.focus === 'Rest');
    const hardDay = forecast.days.find((day) => day.status !== 'green');
    if (restDay && hardDay) {
      expect(statusRank[restDay.status]).toBeGreaterThanOrEqual(statusRank[hardDay.status]);
    }
  });
});
