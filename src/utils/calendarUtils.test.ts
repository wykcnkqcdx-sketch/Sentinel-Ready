import type { TrainingLog } from '@/src/screens/TrainingContext';
import { describe, expect, it } from 'vitest';
import { buildCalendarMonth, nextMonth, prevMonth } from './calendarUtils';

function makeLog(date: string): TrainingLog {
  return {
    id: Math.floor(Math.random() * 100000),
    date,
    category: 'Ruck',
    type: 'Loaded Ruck',
    duration: '60 min',
    distanceLoad: '10 km',
    readiness: '7',
    notes: '',
  };
}

describe('prevMonth', () => {
  it('wraps December of previous year from January', () => {
    expect(prevMonth(2026, 1)).toEqual({ year: 2025, month: 12 });
  });

  it('decrements month within year', () => {
    expect(prevMonth(2026, 6)).toEqual({ year: 2026, month: 5 });
  });
});

describe('nextMonth', () => {
  it('wraps to January of next year from December', () => {
    expect(nextMonth(2026, 12)).toEqual({ year: 2027, month: 1 });
  });

  it('increments month within year', () => {
    expect(nextMonth(2026, 5)).toEqual({ year: 2026, month: 6 });
  });
});

describe('buildCalendarMonth', () => {
  it('returns correct label', () => {
    const cal = buildCalendarMonth([], 2026, 5);
    expect(cal.label).toBe('MAY 2026');
    expect(cal.year).toBe(2026);
    expect(cal.month).toBe(5);
  });

  it('all weeks have exactly 7 days', () => {
    const cal = buildCalendarMonth([], 2026, 5);
    for (const week of cal.weeks) {
      expect(week.days).toHaveLength(7);
    }
  });

  it('total cells across all weeks are a multiple of 7', () => {
    const cal = buildCalendarMonth([], 2026, 3);
    const totalDays = cal.weeks.reduce((s, w) => s + w.days.length, 0);
    expect(totalDays % 7).toBe(0);
  });

  it('marks days in the month as isCurrentMonth true', () => {
    const cal = buildCalendarMonth([], 2026, 5);
    const currentMonthDays = cal.weeks.flatMap((w) => w.days).filter((d) => d.isCurrentMonth);
    expect(currentMonthDays).toHaveLength(31); // May has 31 days
    for (const day of currentMonthDays) {
      expect(day.date.startsWith('2026-05')).toBe(true);
    }
  });

  it('marks padding days as isCurrentMonth false', () => {
    const cal = buildCalendarMonth([], 2026, 5);
    const paddingDays = cal.weeks.flatMap((w) => w.days).filter((d) => !d.isCurrentMonth);
    for (const day of paddingDays) {
      expect(day.date.startsWith('2026-05')).toBe(false);
    }
  });

  it('includes logs on the correct date', () => {
    const log = makeLog('2026-05-15');
    const cal = buildCalendarMonth([log], 2026, 5);
    const allDays = cal.weeks.flatMap((w) => w.days);
    const day = allDays.find((d) => d.date === '2026-05-15');
    expect(day).toBeDefined();
    expect(day!.logs).toHaveLength(1);
  });

  it('totalSessions counts only current-month logs', () => {
    const logs = [makeLog('2026-05-10'), makeLog('2026-05-20'), makeLog('2026-04-30')];
    const cal = buildCalendarMonth(logs, 2026, 5);
    expect(cal.totalSessions).toBe(2);
  });

  it('week with no current-month logs has totalSessions 0', () => {
    const cal = buildCalendarMonth([], 2026, 5);
    for (const week of cal.weeks) {
      if (week.days.every((d) => !d.isCurrentMonth)) {
        expect(week.totalSessions).toBe(0);
      }
    }
  });
});
