import { describe, expect, it } from 'vitest';
import {
  createSaluteReport,
  EMPTY_SALUTE_DRAFT,
  formatSaluteReport,
  isSaluteDraftFileable,
  normalizeSaluteDraft,
} from './saluteReports';

describe('saluteReports', () => {
  it('normalizes draft values before filing', () => {
    expect(normalizeSaluteDraft({
      ...EMPTY_SALUTE_DRAFT,
      size: '  2 pax ',
      activity: ' moving north ',
    })).toMatchObject({
      size: '2 pax',
      activity: 'moving north',
    });
  });

  it('requires at least one core SALUTE field', () => {
    expect(isSaluteDraftFileable(EMPTY_SALUTE_DRAFT)).toBe(false);
    expect(isSaluteDraftFileable({ ...EMPTY_SALUTE_DRAFT, location: 'Grid 1234' })).toBe(true);
  });

  it('formats a copy-ready SALUTE report', () => {
    const report = createSaluteReport({
      size: '3 pax',
      activity: 'Digging near bridge',
      location: 'MGRS 29U PV 12345 67890',
      unit: 'Unknown',
      time: '2026-06-01T12:00:00.000Z',
      equipment: 'Hand tools',
      notes: 'Observed from checkpoint Alpha',
    }, new Date('2026-06-01T12:05:00.000Z'));

    const text = formatSaluteReport(report);

    expect(text).toContain('SALUTE REPORT');
    expect(text).toContain('S - Size: 3 pax');
    expect(text).toContain('A - Activity: Digging near bridge');
    expect(text).toContain('Notes: Observed from checkpoint Alpha');
  });
});
