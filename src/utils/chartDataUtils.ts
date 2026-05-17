import type { TrainingLog } from '@/src/screens/TrainingContext';
import { buildWeekSummary } from '@/src/utils/trainingLogUtils';

export function weeklyLoadSeries(logs: TrainingLog[], weeks: number): number[] {
  return Array.from({ length: weeks }, (_, i) => {
    const offset = weeks - 1 - i;
    return buildWeekSummary(logs, offset).total;
  });
}

export function weeklyRuckSeries(logs: TrainingLog[], weeks: number): number[] {
  return Array.from({ length: weeks }, (_, i) => {
    const offset = weeks - 1 - i;
    return buildWeekSummary(logs, offset).ruck;
  });
}

export function weeklyRunSeries(logs: TrainingLog[], weeks: number): number[] {
  return Array.from({ length: weeks }, (_, i) => {
    const offset = weeks - 1 - i;
    return buildWeekSummary(logs, offset).run;
  });
}

export function weeklyStrengthSeries(logs: TrainingLog[], weeks: number): number[] {
  return Array.from({ length: weeks }, (_, i) => {
    const offset = weeks - 1 - i;
    return buildWeekSummary(logs, offset).strength;
  });
}

export type TestScorePoint = { date: string; score: number };

export function testScoreSeries(logs: TrainingLog[], testKey: string): TestScorePoint[] {
  const key = testKey.toLowerCase();
  return logs
    .filter((log) => log.category === 'Test')
    .filter(
      (log) =>
        log.notes?.toLowerCase().includes(key) ||
        log.type?.toLowerCase().includes(key)
    )
    .map((log) => ({ date: log.date, score: parseFloat(log.duration) || 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function normalise(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}
