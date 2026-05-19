import type { TrainingLog } from '@/src/screens/TrainingContext';
import { describe, expect, it } from 'vitest';
import { buildAAR } from './aarUtils';

function makeBaseLog(overrides?: Partial<TrainingLog>): TrainingLog {
  return {
    id: 42,
    date: '2026-05-10',
    category: 'Strength',
    type: 'Gym Strength',
    duration: '60 min',
    distanceLoad: '—',
    readiness: '7',
    notes: 'Solid session.',
    ...overrides,
  };
}

function makeRuckLog(overrides?: Partial<TrainingLog>): TrainingLog {
  return {
    ...makeBaseLog({ category: 'Ruck', type: 'Loaded Ruck' }),
    ruck: {
      distanceKm: 10,
      packWeightKg: 15,
      paceSecondsPerKm: 480,
      durationSeconds: 4800,
      rpe: 6,
      routeConfidence: 'High',
      rejectedPointCount: 0,
    },
    ...overrides,
  };
}

describe('buildAAR — log without ruck', () => {
  it('returns BASELINE outcome', () => {
    const doc = buildAAR(makeBaseLog());
    expect(doc.outcome).toBe('BASELINE');
    expect(doc.outcomeTone).toBe('good');
  });

  it('returns a single notes section', () => {
    const doc = buildAAR(makeBaseLog());
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0].id).toBe('notes');
  });

  it('operationRef matches OP-XXXXXX format', () => {
    const doc = buildAAR(makeBaseLog({ id: 123456 }));
    expect(doc.operationRef).toMatch(/^OP-\d{6}$/);
  });
});

describe('buildAAR — ruck log without mission', () => {
  it('returns 7 sections', () => {
    const doc = buildAAR(makeRuckLog());
    expect(doc.sections).toHaveLength(7);
  });

  it('returns BASELINE outcome when no mission', () => {
    const doc = buildAAR(makeRuckLog());
    expect(doc.outcome).toBe('BASELINE');
  });

  it('section ids are in expected order', () => {
    const doc = buildAAR(makeRuckLog());
    const ids = doc.sections.map((s) => s.id);
    expect(ids).toEqual(['mission', 'execution', 'intel', 'sustain', 'improve', 'next', 'notes']);
  });

  it('uses log date', () => {
    const doc = buildAAR(makeRuckLog({ date: '2026-05-15' }));
    expect(doc.date).toBe('2026-05-15');
  });
});

describe('buildAAR — ruck log with mission met', () => {
  it('returns MISSION MET when distance and time targets hit with good readiness', () => {
    const log: TrainingLog = {
      ...makeRuckLog(),
      readiness: '8',
      ruck: {
        distanceKm: 10.5,
        packWeightKg: 15,
        paceSecondsPerKm: 450,
        durationSeconds: 4500,
        rpe: 6,
        routeConfidence: 'High',
        rejectedPointCount: 0,
        mission: {
          targetDistanceKm: 10,
          targetMinutes: 80,
          checkpointIntervalKm: 0,
        },
      },
    };
    const doc = buildAAR(log);
    expect(doc.outcome).toBe('MISSION MET');
    expect(doc.outcomeTone).toBe('good');
  });

  it('returns PARTIAL when distance met but time overran', () => {
    const log: TrainingLog = {
      ...makeRuckLog(),
      readiness: '7',
      ruck: {
        distanceKm: 10.2,
        packWeightKg: 15,
        paceSecondsPerKm: 540,
        durationSeconds: 5400,
        rpe: 6,
        routeConfidence: 'High',
        rejectedPointCount: 0,
        mission: {
          targetDistanceKm: 10,
          targetMinutes: 60,
          checkpointIntervalKm: 0,
        },
      },
    };
    const doc = buildAAR(log);
    expect(doc.outcome).toBe('PARTIAL');
  });

  it('returns REVIEW REQUIRED when GPS confidence is Low', () => {
    const log: TrainingLog = {
      ...makeRuckLog(),
      ruck: {
        distanceKm: 10,
        packWeightKg: 15,
        paceSecondsPerKm: 480,
        durationSeconds: 4800,
        rpe: 6,
        routeConfidence: 'Low',
        rejectedPointCount: 0,
        mission: {
          targetDistanceKm: 10,
          targetMinutes: 80,
          checkpointIntervalKm: 0,
        },
      },
    };
    const doc = buildAAR(log);
    expect(doc.outcome).toBe('REVIEW REQUIRED');
  });
});
