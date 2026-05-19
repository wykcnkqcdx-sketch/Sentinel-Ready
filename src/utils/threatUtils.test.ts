import type { TrainingLog } from '@/src/screens/TrainingContext';
import { describe, expect, it } from 'vitest';
import { buildThreatAssessment } from './threatUtils';

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

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

describe('buildThreatAssessment', () => {
  it('returns CLEAR with no threats for empty logs', () => {
    const result = buildThreatAssessment([]);
    expect(result.overallLevel).toBe('CLEAR');
    expect(result.threats).toHaveLength(0);
    expect(result.actionableCount).toBe(0);
  });

  it('detects consecutive_fatigue when 3+ of last 5 sessions have readiness ≤5', () => {
    const logs = [
      makeLog({ id: 1, date: '2026-05-10', readiness: '3' }),
      makeLog({ id: 2, date: '2026-05-09', readiness: '4' }),
      makeLog({ id: 3, date: '2026-05-08', readiness: '5' }),
      makeLog({ id: 4, date: '2026-05-07', readiness: '8' }),
      makeLog({ id: 5, date: '2026-05-06', readiness: '7' }),
    ];
    const result = buildThreatAssessment(logs);
    const ids = result.threats.map((t) => t.id);
    expect(ids).toContain('consecutive_fatigue');
    const threat = result.threats.find((t) => t.id === 'consecutive_fatigue')!;
    expect(threat.level).toBe('RED');
  });

  it('does not fire consecutive_fatigue when fewer than 3 of last 5 are fatigued', () => {
    const logs = [
      makeLog({ id: 1, date: '2026-05-10', readiness: '3' }),
      makeLog({ id: 2, date: '2026-05-09', readiness: '4' }),
      makeLog({ id: 3, date: '2026-05-08', readiness: '8' }),
      makeLog({ id: 4, date: '2026-05-07', readiness: '9' }),
      makeLog({ id: 5, date: '2026-05-06', readiness: '7' }),
    ];
    const result = buildThreatAssessment(logs);
    expect(result.threats.map((t) => t.id)).not.toContain('consecutive_fatigue');
  });

  it('adds RED test_imminent when testDate is today', () => {
    const today = daysFromNow(0);
    const result = buildThreatAssessment([makeLog({ date: today })], today);
    const threat = result.threats.find((t) => t.id === 'test_imminent');
    expect(threat).toBeDefined();
    expect(threat!.level).toBe('RED');
    expect(result.overallLevel).toBe('RED');
  });

  it('adds RED test_imminent when testDate is in 5 days', () => {
    const testDate = daysFromNow(5);
    const result = buildThreatAssessment([makeLog()], testDate);
    expect(result.threats.find((t) => t.id === 'test_imminent')).toBeDefined();
  });

  it('adds AMBER test_approaching when testDate is in 15 days', () => {
    const testDate = daysFromNow(15);
    const result = buildThreatAssessment([makeLog()], testDate);
    const threat = result.threats.find((t) => t.id === 'test_approaching');
    expect(threat).toBeDefined();
    expect(threat!.level).toBe('AMBER');
  });

  it('adds GREEN test_prep_window when testDate is in 30 days', () => {
    const testDate = daysFromNow(30);
    const result = buildThreatAssessment([makeLog()], testDate);
    const threat = result.threats.find((t) => t.id === 'test_prep_window');
    expect(threat).toBeDefined();
    expect(threat!.level).toBe('GREEN');
  });

  it('adds no test threat when testDate is in the past', () => {
    const pastDate = daysFromNow(-5);
    const result = buildThreatAssessment([makeLog()], pastDate);
    const testIds = ['test_imminent', 'test_approaching', 'test_prep_window'];
    expect(result.threats.map((t) => t.id).some((id) => testIds.includes(id))).toBe(false);
  });

  it('adds no test threat when testDate is more than 45 days away', () => {
    const farDate = daysFromNow(50);
    const result = buildThreatAssessment([makeLog()], farDate);
    const testIds = ['test_imminent', 'test_approaching', 'test_prep_window'];
    expect(result.threats.map((t) => t.id).some((id) => testIds.includes(id))).toBe(false);
  });

  it('overallLevel is RED when any threat is RED', () => {
    const logs = [
      makeLog({ id: 1, date: '2026-05-10', readiness: '3' }),
      makeLog({ id: 2, date: '2026-05-09', readiness: '3' }),
      makeLog({ id: 3, date: '2026-05-08', readiness: '3' }),
    ];
    const result = buildThreatAssessment(logs);
    expect(result.overallLevel).toBe('RED');
  });
});
