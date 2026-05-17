import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CustomPlan, PlanDay } from '@/src/types/customPlan';

const STORAGE_KEY = 'sentinel_custom_plan';

export function emptyPlan(): CustomPlan {
  const now = new Date().toISOString();
  const days: PlanDay[] = Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i,
    sessions: [],
  }));
  return { days, createdAt: now, updatedAt: now };
}

export async function loadCustomPlan(): Promise<CustomPlan | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CustomPlan;
  } catch {
    return null;
  }
}

export async function saveCustomPlan(plan: CustomPlan): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}

export async function clearCustomPlan(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
