import { describe, expect, it } from 'vitest';
import type { TrainingLog } from '@/src/screens/TrainingContext';
import type { DfiftStandards } from '@/src/types/dfift';
import { buildDfiftSnapshot } from './dfiftUtils';

const standards: DfiftStandards = {
  name: 'DFIFT',
  shortName: 'DFIFT',
  status: 'test',
  note: '',
  events: {
    pushUps: { male: 20, female: 6, unit: 'reps', timeLimitSeconds: 60 },
    sitUps: { male: 20, female: 20, unit: 'reps', timeLimitSeconds: 60 },
    run: { distanceKm: 2.4, maleMaxSeconds: 700, femaleMaxSeconds: 790 },
    skinfold: { maleMaxMm: 70, femaleMaxMm: 80 },
  },
};

function makeLog(overrides: Partial<TrainingLog> = {}): TrainingLog {
  return {
    id: 1,
    date: '2026-05-11',
    category: 'Test',
    type: 'Push-ups',
    duration: '60 seconds',
    distanceLoad: '22 reps',
    readiness: '8',
    notes: 'Controlled test effort.',
    ...overrides,
  };
}

describe('buildDfiftSnapshot', () => {
  it('counts passed and logged DFIFT events', () => {
    const snapshot = buildDfiftSnapshot([
      makeLog({ id: 1, type: 'Push-ups', distanceLoad: '24 reps' }),
      makeLog({ id: 2, type: 'Sit-ups', distanceLoad: '22 reps' }),
      makeLog({ id: 3, type: '2.4km Run', duration: '11:20', distanceLoad: '2.4 km' }),
      makeLog({ id: 4, type: 'Skinfold', distanceLoad: '65 mm' }),
    ], standards, 'M');

    expect(snapshot.loggedEvents).toBe(4);
    expect(snapshot.passedEvents).toBe(4);
    expect(snapshot.recommendation).toContain('All logged DFIFT events');
  });

  it('identifies the first failed event as the weak point', () => {
    const snapshot = buildDfiftSnapshot([
      makeLog({ id: 1, type: 'Push-ups', distanceLoad: '12 reps' }),
      makeLog({ id: 2, type: 'Sit-ups', distanceLoad: '22 reps' }),
    ], standards, 'M');

    expect(snapshot.weakPoint?.label).toBe('Push-ups');
    expect(snapshot.recommendation).toContain('Push-ups is the current weak point');
  });

  it('flags missing event results when no failures are logged', () => {
    const snapshot = buildDfiftSnapshot([
      makeLog({ id: 1, type: 'Push-ups', distanceLoad: '24 reps' }),
    ], standards, 'M');

    expect(snapshot.loggedEvents).toBe(1);
    expect(snapshot.weakPoint?.label).toBe('Sit-ups');
    expect(snapshot.recommendation).toContain('no logged result');
  });

  it('applies female standards and parses duration in minutes', () => {
    const snapshot = buildDfiftSnapshot([
      makeLog({ id: 1, type: 'Push-ups', distanceLoad: '10 reps' }),
      makeLog({ id: 2, type: 'Sit-ups', distanceLoad: '22 reps' }),
      makeLog({ id: 3, type: '2.4km Run', duration: '12.5 mins', distanceLoad: '2.4 km' }),
      makeLog({ id: 4, type: 'Skinfold', distanceLoad: '75 mm' }),
    ], standards, 'F');

    expect(snapshot.loggedEvents).toBe(4);
    expect(snapshot.passedEvents).toBe(4);
  });

  it('handles completely unparseable run duration gracefully', () => {
    const snapshot = buildDfiftSnapshot([
      makeLog({ id: 1, type: '2.4km Run', duration: 'unknown', distanceLoad: '2.4 km' }),
    ], standards, 'M');

    const runRow = snapshot.rows.find((r) => r.key === 'run');
    expect(runRow?.result).toBeNull();
  });
});
