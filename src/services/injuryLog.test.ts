import { describe, expect, it } from 'vitest';
import {
  createInjuryEntry,
  EMPTY_INJURY_DRAFT,
  getInjuryRisk,
  isInjuryDraftFileable,
  normalizeInjuryDraft,
  summarizeInjuryEntries,
} from './injuryLog';

describe('injuryLog', () => {
  it('normalizes injury drafts', () => {
    expect(normalizeInjuryDraft({
      ...EMPTY_INJURY_DRAFT,
      bodyPart: ' left knee ',
      severity: '8',
      notes: ' soreness after ruck ',
    })).toMatchObject({
      bodyPart: 'left knee',
      severity: '5',
      notes: 'soreness after ruck',
    });
  });

  it('requires body part and date before filing', () => {
    expect(isInjuryDraftFileable(EMPTY_INJURY_DRAFT)).toBe(false);
    expect(isInjuryDraftFileable({ ...EMPTY_INJURY_DRAFT, bodyPart: 'Ankle' })).toBe(true);
  });

  it('summarizes active and recovering entries for injury watch', () => {
    const active = createInjuryEntry({ ...EMPTY_INJURY_DRAFT, bodyPart: 'Knee', severity: '4', status: 'active' });
    const healed = createInjuryEntry({ ...EMPTY_INJURY_DRAFT, bodyPart: 'Shoulder', severity: '2', status: 'healed' });

    expect(summarizeInjuryEntries([healed, active])).toContain('Knee active injury severity 4/5');
    expect(summarizeInjuryEntries([healed])).toBe('');
  });

  it('reports high risk for severe active injury', () => {
    const entry = createInjuryEntry({ ...EMPTY_INJURY_DRAFT, bodyPart: 'Shin', severity: '5', status: 'active' });
    expect(getInjuryRisk([entry])).toBe('high');
  });
});
