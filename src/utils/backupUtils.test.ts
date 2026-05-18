import type { TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';
import type { UserProfile } from '@/src/screens/UserContext';
import { describe, expect, it } from 'vitest';
import { buildSentinelBackup, parseSentinelBackup } from './backupUtils';

const log: TrainingLog = {
  id: 1,
  date: '2026-05-16',
  category: 'Ruck',
  type: 'Loaded Ruck',
  duration: '60 min',
  distanceLoad: '8 km - 18 kg',
  readiness: '7',
  notes: 'Steady pace, no hot spots.',
};

const goal: TrainingGoal = {
  id: 1,
  category: 'Ruck',
  title: '10 km ruck',
  target: '10 km',
  current: '8 km',
  deadline: '2026-06-01',
  notes: '',
  status: 'active',
};

const profile: UserProfile = {
  gender: 'M',
  testDate: '2026-06-01',
  age: '29',
  heightCm: '178',
  role: 'Selection prep',
  trainingLevel: 'Intermediate',
  equipment: 'Ruck, gym',
  injuryNotes: '',
};

describe('backupUtils', () => {
  it('builds and parses a Sentinel Ready backup', () => {
    const backup = buildSentinelBackup({
      logs: [log],
      goals: [goal],
      profile,
      now: new Date('2026-05-16T12:00:00Z'),
    });

    const parsed = parseSentinelBackup(JSON.stringify(backup));

    expect(parsed).toMatchObject({
      app: 'Sentinel Ready',
      version: 1,
      exportedAt: '2026-05-16T12:00:00.000Z',
      logs: [log],
      goals: [goal],
      profile,
    });
  });

  it('rejects invalid backup payloads', () => {
    expect(() => parseSentinelBackup(JSON.stringify({ app: 'Other', version: 1 }))).toThrow('Unsupported');
  });

  it('rejects malformed logs', () => {
    const backup = buildSentinelBackup({ logs: [log], goals: [goal], profile });
    expect(() => parseSentinelBackup(JSON.stringify({ ...backup, logs: [{ id: 1 }] }))).toThrow('logs');
  });
});
