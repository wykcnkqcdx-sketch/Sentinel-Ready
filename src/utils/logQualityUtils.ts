import type { TrainingCategory, TrainingLog } from '@/src/screens/TrainingContext';
import { getDateValue } from './trainingLogCore';
import { getReadinessNumber, isFatigueWatch } from './readinessUtils';
import type { SortMode, TrainingFilter } from './trainingLogCore';

export function getNotesQualityMessage(notes: string) {
  const cleanNotes = notes.trim().toLowerCase();
  if (!cleanNotes) return 'missing notes';

  const weakNotes = ['ok', 'okay', 'good', 'fine', 'grand', 'easy', 'hard', 'done', 'completed'];
  if (weakNotes.includes(cleanNotes)) return 'notes too brief';
  if (cleanNotes.length < 15) return 'notes need more detail';

  return '';
}

export function getNotesQualityWarning(notes: string): string {
  const cleanNotes = notes.trim().toLowerCase();
  if (cleanNotes.length === 0) return 'Add a short note about effort, fatigue, pain, pace, load or recovery.';
  const weakNotes = ['ok', 'okay', 'good', 'fine', 'grand', 'easy', 'hard', 'done', 'completed'];
  if (weakNotes.includes(cleanNotes)) return 'Note is too brief. Add effort, soreness, pace, load, breathing or recovery detail.';
  if (cleanNotes.length < 15) return 'Note is short. Add one more useful detail about how the session felt.';
  return '';
}

export function getNoteStarter(category: TrainingCategory): string {
  if (category === 'Ruck') return 'Ruck notes: pace felt controlled, pack sat well, feet checked after session, shoulders manageable, breathing steady, no major hot spots.';
  if (category === 'Run') return 'Run notes: pace controlled, breathing steady, legs felt good, calves monitored, finished with energy left, no unusual pain.';
  if (category === 'Strength') return 'Strength notes: main lifts completed, form stayed solid, effort controlled, no grinding reps, joints felt comfortable, recovery needed.';
  if (category === 'Resistance') return 'Resistance notes: circuit completed, movement quality tracked, grip/core fatigue noted, carries controlled, breathing steady, recovery cost recorded.';
  if (category === 'Hiking') return 'Hiking notes: terrain, pace, footing, climbs, navigation stops, feet/calves/hips and post-session energy recorded.';
  if (category === 'Military') return 'Military notes: field skill focus, kit setup, movement quality, navigation accuracy, tactical drills, fatigue and recovery cost recorded.';
  if (category === 'Recovery') return 'Recovery notes: mobility completed, hips/calves/hamstrings worked, stiffness reduced, hydration checked, sleep and soreness monitored.';
  if (category === 'Test') return 'Test notes: result recorded, pacing reviewed, weak points identified, breathing controlled, fatigue noted, next improvement target set.';
  return 'Session notes: effort level, fatigue, soreness, breathing, load, pace, recovery and anything unusual recorded.';
}

export function getCompletionScore(
  date: string,
  category: TrainingCategory,
  type: string,
  duration: string,
  distanceLoad: string,
  readiness: string,
  notes: string
): number {
  const readinessNumber = Number(readiness);
  const checks = [
    date.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date.trim()),
    Boolean(category),
    type.trim().length >= 3,
    duration.trim().length >= 3,
    distanceLoad.trim().length >= 5,
    !Number.isNaN(readinessNumber) && readinessNumber >= 1 && readinessNumber <= 10,
    !getNotesQualityMessage(notes),
  ];
  const complete = checks.filter(Boolean).length;
  return Math.round((complete / checks.length) * 100);
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
    resistance: logs.filter((log) => log.category === 'Resistance').length,
    run: logs.filter((log) => log.category === 'Run').length,
    hiking: logs.filter((log) => log.category === 'Hiking').length,
    military: logs.filter((log) => log.category === 'Military').length,
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
