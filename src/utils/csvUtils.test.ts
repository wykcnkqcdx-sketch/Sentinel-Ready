import type { TrainingLog } from '@/src/screens/TrainingContext';
import { describe, expect, it } from 'vitest';
import { buildTrainingLogsCsv, parseCsvRecords, parseTrainingLogsCsv } from './csvUtils';

function makeLog(overrides: Partial<TrainingLog> = {}): TrainingLog {
  return {
    id: 1,
    date: '2026-05-16',
    category: 'Ruck',
    type: 'Loaded Ruck',
    duration: '1 hr 20 min',
    distanceLoad: '8 km - 18 kg',
    readiness: '7',
    notes: 'Felt good, calves tight, pack sat well, no hot spots.',
    ...overrides,
  };
}

describe('parseCsvRecords', () => {
  it('keeps commas inside quoted fields', () => {
    expect(parseCsvRecords('a,"b,c",d')).toEqual([['a', 'b,c', 'd']]);
  });

  it('unescapes doubled quotes inside quoted fields', () => {
    expect(parseCsvRecords('a,"said ""steady""",d')).toEqual([['a', 'said "steady"', 'd']]);
  });

  it('keeps newlines inside quoted fields', () => {
    expect(parseCsvRecords('a,"line 1\nline 2",d')).toEqual([['a', 'line 1\nline 2', 'd']]);
  });
});

describe('training log CSV import/export', () => {
  it('round-trips notes with commas as a single notes field', () => {
    const csv = buildTrainingLogsCsv([
      makeLog({ notes: 'Felt good, calves tight, pack sat well, no hot spots.' }),
    ]);

    const imported = parseTrainingLogsCsv(csv, () => 99);

    expect(imported).toHaveLength(1);
    expect(imported[0]).toMatchObject({
      id: 99,
      date: '2026-05-16',
      category: 'Ruck',
      type: 'Loaded Ruck',
      duration: '1 hr 20 min',
      distanceLoad: '8 km - 18 kg',
      readiness: '7',
      notes: 'Felt good, calves tight, pack sat well, no hot spots.',
    });
  });

  it('round-trips quotes and multiline notes', () => {
    const notes = 'Felt "good", calves tight.\nPack sat well, no hot spots.';
    const csv = buildTrainingLogsCsv([makeLog({ notes })]);

    const imported = parseTrainingLogsCsv(csv, () => 100);

    expect(imported[0].notes).toBe(notes);
  });

  it('exports a header even when there are no logs', () => {
    expect(buildTrainingLogsCsv([])).toBe('Date,Category,Type,Duration,DistanceLoad,Readiness,Notes');
  });
});
