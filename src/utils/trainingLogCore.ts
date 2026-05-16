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

export function getDateValue(date: string) {
  const time = new Date(date + 'T00:00:00').getTime();
  return Number.isNaN(time) ? 0 : time;
}
