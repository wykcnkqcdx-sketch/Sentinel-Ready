import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BodyCompEntry } from '@/src/types/bodyComp';

const STORAGE_KEY = 'sentinel_body_comp';

export async function loadBodyCompEntries(): Promise<BodyCompEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BodyCompEntry[];
  } catch {
    return [];
  }
}

export async function saveBodyCompEntry(entry: BodyCompEntry): Promise<void> {
  const all = await loadBodyCompEntries();
  const idx = all.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    all[idx] = entry;
  } else {
    all.push(entry);
  }
  all.sort((a, b) => b.date.localeCompare(a.date));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export async function deleteBodyCompEntry(id: string): Promise<void> {
  const all = await loadBodyCompEntries();
  const filtered = all.filter((e) => e.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
