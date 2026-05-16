import type { TrainingLog } from '@/src/screens/TrainingContext';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPlanAdherence } from './adherenceUtils';

function makeLog(overrides: Partial<TrainingLog>): TrainingLog {
  return {
    id: Math.random(),
    date: '2026-05-15',
    category: 'Ruck',
    type: 'Test',
    duration: '45 min',
    distanceLoad: '',
    readiness: '7',
    notes: '',
    ...overrides,
  };
}

describe('buildPlanAdherence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns no-data status when no sessions are logged', () => {
    const result = buildPlanAdherence([]);
    expect(result.status).toBe('no-data');
    expect(result.score).toBe(0);
    expect(result.missing).toContain('Ruck');
  });

  it('returns off-track when logged sessions fall significantly short of the plan', () => {
    // Logging a single test session while the week plan expects multiple core pillars
    const logs = [makeLog({ category: 'Test' })];
    const result = buildPlanAdherence(logs);
    
    expect(result.status).toBe('off-track');
    expect(result.score).toBeLessThan(40);
    expect(result.missing.length).toBeGreaterThan(0);
    expect(result.extra).toContain('Test');
  });

  it('returns on-track when the core pillars of the week are logged', () => {
    const logs = [
      makeLog({ category: 'Ruck' }),
      makeLog({ category: 'Run' }),
      makeLog({ category: 'Strength' }),
      makeLog({ category: 'Recovery' }),
    ];
    const result = buildPlanAdherence(logs);
    
    expect(result.status).toBe('on-track');
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.matched).toContain('Ruck');
    expect(result.matched).toContain('Strength');
  });

  it('prompts the user to prioritise recovery if it is the primary missing category', () => {
    const logs = [
      makeLog({ category: 'Ruck' }),
      makeLog({ category: 'Strength' }),
      makeLog({ category: 'Run' }),
    ];
    const result = buildPlanAdherence(logs);
    expect(result.nextAction).toContain('Add recovery or mobility');
  });
  
  it('prompts the user to prioritise strength if recovery exists but strength is missing', () => {
    const logs = [
      makeLog({ category: 'Recovery' }),
    ];
    const result = buildPlanAdherence(logs);
    expect(result.nextAction).toContain('Log the planned strength session next');
  });
});