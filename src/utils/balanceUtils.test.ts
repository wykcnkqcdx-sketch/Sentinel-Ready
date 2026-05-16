import type { TrainingLog } from '@/src/screens/TrainingContext';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTrainingBalance } from './balanceUtils';

function makeLog(overrides: Partial<TrainingLog>): TrainingLog {
  return {
    id: Math.random(),
    date: '2026-05-15',
    category: 'Ruck',
    type: 'Test Session',
    duration: '60 min',
    distanceLoad: '',
    readiness: '7',
    notes: '',
    ...overrides,
  };
}

describe('buildTrainingBalance', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns no-data status when there are no logs for the week', () => {
    const result = buildTrainingBalance([]);
    expect(result.status).toBe('no-data');
    expect(result.score).toBe(0);
    expect(result.gaps).toContain('No sessions this week');
  });

  it('returns balanced status for a well-rounded week', () => {
    const logs = [
      makeLog({ category: 'Ruck' }),
      makeLog({ category: 'Run' }),
      makeLog({ category: 'Strength' }),
      makeLog({ category: 'Recovery' }),
    ];
    const result = buildTrainingBalance(logs);
    expect(result.status).toBe('balanced');
    expect(result.score).toBe(100);
    expect(result.gaps).toHaveLength(0);
    expect(result.overloads).toHaveLength(0);
  });

  it('identifies training gaps and penalises score', () => {
    const logs = [
      makeLog({ category: 'Ruck' }),
      makeLog({ category: 'Run' }),
    ];
    const result = buildTrainingBalance(logs);
    expect(result.status).toBe('gap');
    expect(result.gaps).toContain('No strength');
    expect(result.gaps).toContain('No recovery or mobility');
    expect(result.score).toBe(76); // 100 - (2 * 12)
  });

  it('identifies overloads, sets overload status, and caps score at 0', () => {
    const logs = [
      makeLog({ category: 'Ruck' }),
      makeLog({ category: 'Ruck' }),
      makeLog({ category: 'Ruck' }), // Triggers High ruck frequency
      makeLog({ category: 'Run' }),
      makeLog({ category: 'Run' }),
      makeLog({ category: 'Run' }),
      makeLog({ category: 'Run' }), // Triggers High run frequency & High load without recovery
    ];
    
    const result = buildTrainingBalance(logs);
    expect(result.status).toBe('overload');
    expect(result.overloads.length).toBeGreaterThanOrEqual(3);
    expect(result.score).toBe(0); // Score naturally falls below 0, ensuring Math.max caps it
  });
});