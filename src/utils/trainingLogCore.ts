import type { TrainingCategory } from '@/src/screens/TrainingContext';

export type TrainingFilter = 'All' | TrainingCategory;
export type SortMode = 'Newest' | 'Oldest' | 'Highest Readiness' | 'Lowest Readiness';

export const filters: TrainingFilter[] = ['All', 'Ruck', 'Strength', 'Run', 'Mobility', 'Test', 'Recovery'];
export const sortModes: SortMode[] = ['Newest', 'Oldest', 'Highest Readiness', 'Lowest Readiness'];

export type RouteData = {
  distanceKm: number;
  elevationGainMeters: number;
  packWeightKg?: number;
  polyline?: string; // Encoded polyline for map rendering
};

const dateCache = new Map<string, number>();

export function getDateValue(date: string) {
  if (!date) return 0;
  const cached = dateCache.get(date);
  if (cached !== undefined) return cached;

  const time = Date.parse(date + 'T00:00:00');
  const value = Number.isNaN(time) ? 0 : time;
  dateCache.set(date, value);
  return value;
}
