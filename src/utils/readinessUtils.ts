import type { TrainingLog } from '@/src/screens/TrainingContext';
import { getDateValue } from './trainingLogCore';

export function getReadinessNumber(readiness: string) {
  const score = Number(readiness);
  return Number.isNaN(score) ? 0 : score;
}

export function isFatigueWatch(readiness: string) {
  const score = Number(readiness);
  return !Number.isNaN(score) && score <= 5;
}

export function getReadinessLabel(readiness: string) {
  const score = Number(readiness);
  if (Number.isNaN(score)) return 'Unknown';
  if (score <= 3) return 'Low';
  if (score <= 5) return 'Fatigue Watch';
  if (score <= 7) return 'Moderate';
  return 'High';
}

export function buildReadinessTrend(logs: TrainingLog[]) {
  const sortedLogs = [...logs]
    .filter((log) => getReadinessNumber(log.readiness) > 0)
    .sort((a, b) => getDateValue(b.date) - getDateValue(a.date) || b.id - a.id);

  if (sortedLogs.length === 0) {
    return {
      latest: 0,
      previous: 0,
      change: 0,
      label: 'No Data',
      message: 'Add readiness scores to start tracking readiness trends.',
      status: 'neutral' as const,
    };
  }

  if (sortedLogs.length === 1) {
    const latest = getReadinessNumber(sortedLogs[0].readiness);
    return {
      latest,
      previous: 0,
      change: 0,
      label: 'Baseline',
      message: 'Only one readiness score is logged. Add more sessions to show a trend.',
      status: 'neutral' as const,
    };
  }

  const latest = getReadinessNumber(sortedLogs[0].readiness);
  const previous = getReadinessNumber(sortedLogs[1].readiness);
  const change = latest - previous;

  if (change >= 2) {
    return {
      latest,
      previous,
      change,
      label: 'Improving',
      message: 'Readiness is improving. Progress carefully and avoid increasing load too aggressively.',
      status: 'good' as const,
    };
  }

  if (change <= -2) {
    return {
      latest,
      previous,
      change,
      label: 'Dropping',
      message: 'Readiness has dropped. Hold intensity, reduce volume, and prioritise recovery.',
      status: 'warning' as const,
    };
  }

  return {
    latest,
    previous,
    change,
    label: 'Stable',
    message: 'Readiness is stable. Continue controlled progression and keep logging session quality.',
    status: 'neutral' as const,
  };
}

export function hasRecentReadinessImprovement(logs: TrainingLog[]) {
  const sortedLogs = [...logs]
    .filter((log) => getReadinessNumber(log.readiness) > 0)
    .sort((a, b) => getDateValue(b.date) - getDateValue(a.date) || b.id - a.id)
    .slice(0, 7);

  if (sortedLogs.length < 2) return false;

  const latest = getReadinessNumber(sortedLogs[0].readiness);
  const oldest = getReadinessNumber(sortedLogs[sortedLogs.length - 1].readiness);
  return latest - oldest >= 2;
}
