import { TrainingCategory, TrainingLog } from '@/src/screens/TrainingContext';

export type TrainingFilter = 'All' | TrainingCategory;
export type SortMode = 'Newest' | 'Oldest' | 'Highest Readiness' | 'Lowest Readiness';

export const filters: TrainingFilter[] = ['All', 'Ruck', 'Strength', 'Run', 'Mobility', 'Test', 'Recovery'];
export const sortModes: SortMode[] = ['Newest', 'Oldest', 'Highest Readiness', 'Lowest Readiness'];

export function getReadinessNumber(readiness: string) {
  const score = Number(readiness);
  return Number.isNaN(score) ? 0 : score;
}

export function isFatigueWatch(readiness: string) {
  const score = Number(readiness);
  return !Number.isNaN(score) && score <= 5;
}

export function getDateValue(date: string) {
  const time = new Date(date).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function getReadinessLabel(readiness: string) {
  const score = Number(readiness);
  if (Number.isNaN(score)) return 'Unknown';
  if (score <= 3) return 'Low';
  if (score <= 5) return 'Fatigue Watch';
  if (score <= 7) return 'Moderate';
  return 'High';
}

export function getNotesQualityMessage(notes: string) {
  const cleanNotes = notes.trim().toLowerCase();
  if (!cleanNotes) return 'missing notes';

  const weakNotes = ['ok', 'okay', 'good', 'fine', 'grand', 'easy', 'hard', 'done', 'completed'];
  if (weakNotes.includes(cleanNotes)) return 'notes too brief';
  if (cleanNotes.length < 15) return 'notes need more detail';

  return '';
}

export function getWeakLogReasons(log: TrainingLog) {
  const reasons: string[] = [];

  if (!log.date || !/^\d{4}-\d{2}-\d{2}$/.test(log.date)) reasons.push('date');
  if (!log.type || log.type.trim().length < 3) reasons.push('session type');
  if (!log.duration || log.duration.trim().length < 3) reasons.push('duration');
  if (!log.distanceLoad || log.distanceLoad.trim().length < 5) reasons.push('distance/load');

  const readinessNumber = Number(log.readiness);
  if (Number.isNaN(readinessNumber) || readinessNumber < 1 || readinessNumber > 10) {
    reasons.push('readiness score');
  }

  const notesIssue = getNotesQualityMessage(log.notes);
  if (notesIssue) reasons.push(notesIssue);

  return reasons;
}

export function logNeedsImprovement(log: TrainingLog) {
  return getWeakLogReasons(log).length > 0;
}

export function buildSummary(logs: TrainingLog[]) {
  const readinessScores = logs
    .map((log) => getReadinessNumber(log.readiness))
    .filter((score) => score > 0);

  const averageReadiness =
    readinessScores.length > 0
      ? (readinessScores.reduce((total, score) => total + score, 0) / readinessScores.length).toFixed(1)
      : '0.0';

  return {
    total: logs.length,
    averageReadiness,
    ruck: logs.filter((log) => log.category === 'Ruck').length,
    strength: logs.filter((log) => log.category === 'Strength').length,
    run: logs.filter((log) => log.category === 'Run').length,
    recovery: logs.filter((log) => log.category === 'Recovery').length,
    fatigueWatch: logs.filter((log) => isFatigueWatch(log.readiness)).length,
    weakLogs: logs.filter((log) => logNeedsImprovement(log)).length,
  };
}

export function calculateTrainingLogHealthScore(logs: TrainingLog[]) {
  if (logs.length === 0) return 0;

  const weakLogs = logs.filter((log) => logNeedsImprovement(log)).length;
  const fatigueLogs = logs.filter((log) => isFatigueWatch(log.readiness)).length;

  const readinessScores = logs
    .map((log) => getReadinessNumber(log.readiness))
    .filter((score) => score > 0);

  const averageReadiness =
    readinessScores.length > 0
      ? readinessScores.reduce((total, score) => total + score, 0) / readinessScores.length
      : 0;

  const readinessScore = Math.round(averageReadiness * 10);
  const weakPenalty = Math.round((weakLogs / logs.length) * 35);
  const fatiguePenalty = Math.round((fatigueLogs / logs.length) * 15);

  return Math.max(0, Math.min(100, readinessScore - weakPenalty - fatiguePenalty));
}

export function getTrainingLogHealthLabel(score: number) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Healthy';
  if (score >= 50) return 'Needs Work';
  return 'Poor Data';
}

export function getTrainingLogHealthMessage(score: number) {
  if (score >= 85) return 'Training data is strong enough for useful readiness and recovery review.';
  if (score >= 70) return 'Training data is usable. Improve weak notes and missing details to sharpen analysis.';
  if (score >= 50) return 'Training data needs work. Fix weak logs so the app can give better feedback.';
  return 'Training data is too weak for reliable analysis. Add clearer notes, duration, load and readiness scores.';
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

export function filterAndSortLogs(
  logs: TrainingLog[],
  activeFilter: TrainingFilter,
  searchQuery: string,
  sortMode: SortMode,
  showWeakLogsOnly: boolean
) {
  const query = searchQuery.trim().toLowerCase();

  const filtered = logs.filter((log) => {
    const matchesFilter = activeFilter === 'All' || log.category === activeFilter;

    const searchableText = [
      log.date,
      log.category,
      log.type,
      log.duration,
      log.distanceLoad,
      log.readiness,
      log.notes,
    ].join(' ').toLowerCase();

    const matchesSearch = query.length === 0 || searchableText.includes(query);
    const matchesWeak = !showWeakLogsOnly || logNeedsImprovement(log);

    return matchesFilter && matchesSearch && matchesWeak;
  });

  return filtered.sort((a, b) => {
    if (sortMode === 'Oldest') return getDateValue(a.date) - getDateValue(b.date) || a.id - b.id;
    if (sortMode === 'Highest Readiness') return getReadinessNumber(b.readiness) - getReadinessNumber(a.readiness) || b.id - a.id;
    if (sortMode === 'Lowest Readiness') return getReadinessNumber(a.readiness) - getReadinessNumber(b.readiness) || b.id - a.id;
    return getDateValue(b.date) - getDateValue(a.date) || b.id - a.id;
  });
}
