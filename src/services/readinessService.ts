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
