import type { TrainingLog } from '@/src/screens/TrainingContext';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildWeeklyBrief } from './weeklyBriefUtils';

// Fix system time so "this week" is deterministic
// 2026-05-18 is a Monday
const FIXED_MONDAY = new Date('2026-05-18T12:00:00.000Z');

function makeLog(date: string, readiness: string, category: TrainingLog['category'] = 'Ruck'): TrainingLog {
  return {
    id: Math.floor(Math.random() * 100000),
    date,
    category,
    type: 'Loaded Ruck',
    duration: '60 min',
    distanceLoad: '10 km',
    readiness,
    notes: '',
  };
}

describe('buildWeeklyBrief', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_MONDAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns NO DATA status for empty logs', () => {
    const brief = buildWeeklyBrief([]);
    expect(brief.missionStatus).toBe('NO DATA');
    expect(brief.statusTone).toBe('neutral');
    expect(brief.sustain).toHaveLength(0);
    expect(brief.improve).toHaveLength(1);
  });

  it('returns COMPLETE when 4+ sessions this week with good readiness', () => {
    // Week: Mon 2026-05-18 to Sun 2026-05-24
    const logs = [
      makeLog('2026-05-18', '8'),
      makeLog('2026-05-19', '7'),
      makeLog('2026-05-20', '8'),
      makeLog('2026-05-21', '7'),
    ];
    const brief = buildWeeklyBrief(logs);
    expect(brief.missionStatus).toBe('COMPLETE');
    expect(brief.statusTone).toBe('good');
  });

  it('returns PARTIAL when 2 sessions this week', () => {
    const logs = [
      makeLog('2026-05-18', '7'),
      makeLog('2026-05-19', '6'),
    ];
    const brief = buildWeeklyBrief(logs);
    expect(brief.missionStatus).toBe('PARTIAL');
    expect(brief.statusTone).toBe('warn');
  });

  it('returns MINIMAL when only 1 session this week', () => {
    const logs = [makeLog('2026-05-18', '7')];
    const brief = buildWeeklyBrief(logs);
    expect(brief.missionStatus).toBe('MINIMAL');
  });

  it('sustain includes session target message when target hit', () => {
    const logs = [
      makeLog('2026-05-18', '8'),
      makeLog('2026-05-19', '8'),
      makeLog('2026-05-20', '8'),
      makeLog('2026-05-21', '8'),
    ];
    const brief = buildWeeklyBrief(logs);
    const hastarget = brief.sustain.some((s) => s.toLowerCase().includes('session target'));
    expect(hastarget).toBe(true);
  });

  it('improve includes short-of-target message when fewer than 4 sessions', () => {
    const logs = [makeLog('2026-05-18', '7'), makeLog('2026-05-19', '7')];
    const brief = buildWeeklyBrief(logs);
    const shortMsg = brief.improve.some((s) => s.toLowerCase().includes('target not met'));
    expect(shortMsg).toBe(true);
  });

  it('weekRef starts with WK-', () => {
    const logs = [makeLog('2026-05-18', '7')];
    const brief = buildWeeklyBrief(logs);
    expect(brief.weekRef).toMatch(/^WK-\d{4}-\d{2}-\d{2}$/);
  });

  it('summary has SESSIONS LOGGED line', () => {
    const logs = [makeLog('2026-05-18', '7')];
    const brief = buildWeeklyBrief(logs);
    const line = brief.summary.find((l) => l.label === 'SESSIONS LOGGED');
    expect(line).toBeDefined();
    expect(line!.value).toContain('1');
  });

  it('directive is a non-empty string', () => {
    const logs = [makeLog('2026-05-18', '7')];
    const brief = buildWeeklyBrief(logs);
    expect(typeof brief.directive).toBe('string');
    expect(brief.directive.length).toBeGreaterThan(0);
  });
});
