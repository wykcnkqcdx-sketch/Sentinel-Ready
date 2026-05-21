import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReadinessLog } from '@/src/types/map';

const KEY = 'sentinel_readiness_logs';

export async function loadReadinessLogs(): Promise<ReadinessLog[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveReadinessLog(log: ReadinessLog): Promise<void> {
  const existing = await loadReadinessLogs();
  const idx = existing.findIndex(l => l.date === log.date);
  if (idx >= 0) existing[idx] = log;
  else existing.push(log);
  await AsyncStorage.setItem(KEY, JSON.stringify(existing));
}

export async function getLatestReadinessLog(): Promise<ReadinessLog | null> {
  const logs = await loadReadinessLogs();
  if (logs.length === 0) return null;
  return logs.sort((a, b) => b.date.localeCompare(a.date))[0];
}

export async function clearReadinessLogs(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

/**
 * Convert a ReadinessLog into a 0–100 score.
 *
 * Weights:
 *   sleepHours    25 %   (4 h = 0, 9+ h = 100)
 *   sleepQuality  25 %   (1 = 0, 5 = 100)
 *   soreness      20 %   (1 = 100 inverse, 5 = 0)
 *   stress        15 %   (1 = 100 inverse, 5 = 0)
 *   mood          15 %   (1 = 0, 5 = 100)
 *
 * Pain modifier: –10 if pain >= 4 and limitsTraining is true.
 */
export function computeCheckInScore(log: ReadinessLog): number {
  const sleepH = log.sleepHours ?? 7;
  const sleepHoursScore   = Math.min(100, Math.max(0, ((sleepH - 4) / 5) * 100));
  const sleepQualityScore = ((log.sleepQuality - 1) / 4) * 100;
  const sorenessScore     = ((5 - log.soreness) / 4) * 100;
  const stressScore       = log.stress !== undefined ? ((5 - log.stress) / 4) * 100 : 50;
  const moodScore         = log.mood !== undefined ? ((log.mood - 1) / 4) * 100 : 50;

  let score =
    sleepHoursScore   * 0.25 +
    sleepQualityScore * 0.25 +
    sorenessScore     * 0.20 +
    stressScore       * 0.15 +
    moodScore         * 0.15;

  if ((log.pain ?? 0) >= 4 && log.limitsTraining) {
    score = Math.max(0, score - 10);
  }

  return Math.round(score);
}
