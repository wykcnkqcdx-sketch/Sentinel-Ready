import type { TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';
import type { UserProfile } from '@/src/screens/UserContext';

export const BACKUP_VERSION = 1;

export type SentinelBackup = {
  app: 'Sentinel Ready';
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  logs: TrainingLog[];
  goals: TrainingGoal[];
  profile: UserProfile;
};

export function buildSentinelBackup(input: {
  logs: TrainingLog[];
  goals: TrainingGoal[];
  profile: UserProfile;
  now?: Date;
}): SentinelBackup {
  return {
    app: 'Sentinel Ready',
    version: BACKUP_VERSION,
    exportedAt: (input.now ?? new Date()).toISOString(),
    logs: input.logs,
    goals: input.goals,
    profile: input.profile,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasString(value: Record<string, unknown>, key: string) {
  return typeof value[key] === 'string';
}

function isTrainingLog(value: unknown): value is TrainingLog {
  return (
    isObject(value) &&
    typeof value.id === 'number' &&
    hasString(value, 'date') &&
    hasString(value, 'category') &&
    hasString(value, 'type') &&
    hasString(value, 'duration') &&
    hasString(value, 'distanceLoad') &&
    hasString(value, 'readiness') &&
    hasString(value, 'notes')
  );
}

function isTrainingGoal(value: unknown): value is TrainingGoal {
  return (
    isObject(value) &&
    typeof value.id === 'number' &&
    hasString(value, 'category') &&
    hasString(value, 'title') &&
    hasString(value, 'target') &&
    hasString(value, 'current') &&
    hasString(value, 'deadline') &&
    hasString(value, 'notes') &&
    (value.status === 'active' || value.status === 'complete')
  );
}

function isUserProfile(value: unknown): value is UserProfile {
  return (
    isObject(value) &&
    (value.gender === 'M' || value.gender === 'F') &&
    (typeof value.testDate === 'string' || value.testDate === null) &&
    hasString(value, 'age') &&
    hasString(value, 'role') &&
    (value.trainingLevel === 'Foundation' || value.trainingLevel === 'Intermediate' || value.trainingLevel === 'Advanced') &&
    hasString(value, 'equipment') &&
    hasString(value, 'injuryNotes')
  );
}

export function parseSentinelBackup(json: string): SentinelBackup {
  const parsed = JSON.parse(json) as unknown;

  if (!isObject(parsed) || parsed.app !== 'Sentinel Ready' || parsed.version !== BACKUP_VERSION) {
    throw new Error('Unsupported backup file.');
  }

  if (!Array.isArray(parsed.logs) || !parsed.logs.every(isTrainingLog)) {
    throw new Error('Backup logs are invalid.');
  }

  if (!Array.isArray(parsed.goals) || !parsed.goals.every(isTrainingGoal)) {
    throw new Error('Backup goals are invalid.');
  }

  if (!isUserProfile(parsed.profile)) {
    throw new Error('Backup profile is invalid.');
  }

  return parsed as SentinelBackup;
}
