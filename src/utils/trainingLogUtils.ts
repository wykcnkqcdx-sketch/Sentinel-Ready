import type { GoalCategory, TrainingCategory, TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';

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

export function getReadinessNumber(readiness: string) {
  const score = Number(readiness);
  return Number.isNaN(score) ? 0 : score;
}

export function isFatigueWatch(readiness: string) {
  const score = Number(readiness);
  return !Number.isNaN(score) && score <= 5;
}

export function getDateValue(date: string) {
  const time = new Date(date + 'T00:00:00').getTime();
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

function hasRecentReadinessImprovement(logs: TrainingLog[]) {
  const sortedLogs = [...logs]
    .filter((log) => getReadinessNumber(log.readiness) > 0)
    .sort((a, b) => getDateValue(b.date) - getDateValue(a.date) || b.id - a.id)
    .slice(0, 7);

  if (sortedLogs.length < 2) return false;

  const latest = getReadinessNumber(sortedLogs[0].readiness);
  const oldest = getReadinessNumber(sortedLogs[sortedLogs.length - 1].readiness);
  return latest - oldest >= 2;
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

function getWeekBounds(weeksAgo: number): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday - weeksAgo * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: formatLocalDate(monday),
    end: formatLocalDate(sunday),
  };
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type WeekSummary = {
  weekStart: string;
  weekEnd: string;
  total: number;
  averageReadiness: string;
  fatigueWatch: number;
  weakLogs: number;
  ruck: number;
  strength: number;
  run: number;
  mobility: number;
  test: number;
  recovery: number;
};

export function buildWeekSummary(logs: TrainingLog[], weeksAgo: number = 0): WeekSummary {
  const { start, end } = getWeekBounds(weeksAgo);
  const weekLogs = logs.filter((log) => log.date >= start && log.date <= end);
  const summary = buildSummary(weekLogs);

  return {
    weekStart: start,
    weekEnd: end,
    total: summary.total,
    averageReadiness: summary.averageReadiness,
    fatigueWatch: summary.fatigueWatch,
    weakLogs: summary.weakLogs,
    ruck: summary.ruck,
    strength: summary.strength,
    run: summary.run,
    mobility: weekLogs.filter((log) => log.category === 'Mobility').length,
    test: weekLogs.filter((log) => log.category === 'Test').length,
    recovery: summary.recovery,
  };
}

export type WeeklyLoadRiskStatus = 'low' | 'moderate' | 'high' | 'no-data';

export type WeeklyLoadRisk = {
  status: WeeklyLoadRiskStatus;
  label: 'Low' | 'Moderate' | 'High' | 'No Data';
  message: string;
  factors: string[];
  totalSessions: number;
  ruckSessions: number;
  runSessions: number;
  strengthSessions: number;
  recoverySessions: number;
  fatigueWatchSessions: number;
};

function getDateDaysAgo(daysAgo: number, now: Date = new Date()): string {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  return formatLocalDate(date);
}

export function buildWeeklyLoadRisk(logs: TrainingLog[], now: Date = new Date()): WeeklyLoadRisk {
  const start = getDateDaysAgo(6, now);
  const end = getDateDaysAgo(0, now);
  const recentLogs = logs.filter((log) => log.date >= start && log.date <= end);
  const trend = buildReadinessTrend(recentLogs);

  const totalSessions = recentLogs.length;
  const ruckSessions = recentLogs.filter((log) => log.category === 'Ruck').length;
  const runSessions = recentLogs.filter((log) => log.category === 'Run').length;
  const strengthSessions = recentLogs.filter((log) => log.category === 'Strength').length;
  const recoverySessions = recentLogs.filter((log) => log.category === 'Recovery' || log.category === 'Mobility').length;
  const fatigueWatchSessions = recentLogs.filter((log) => isFatigueWatch(log.readiness)).length;
  const factors: string[] = [];

  if (totalSessions === 0) {
    return {
      status: 'no-data',
      label: 'No Data',
      message: 'Log sessions this week to assess training load risk.',
      factors: ['No sessions logged in the last 7 days'],
      totalSessions,
      ruckSessions,
      runSessions,
      strengthSessions,
      recoverySessions,
      fatigueWatchSessions,
    };
  }

  if (fatigueWatchSessions >= 2) factors.push('Multiple fatigue-watch sessions');
  if (ruckSessions >= 3) factors.push('High ruck frequency');
  if (runSessions >= 4) factors.push('High run frequency');
  if (totalSessions >= 6) factors.push('High total session count');
  if (totalSessions >= 3 && recoverySessions === 0) factors.push('No recovery or mobility logged');
  if (trend.status === 'warning') factors.push('Readiness trend is dropping');

  const highRisk =
    fatigueWatchSessions >= 2 ||
    ruckSessions >= 3 ||
    runSessions >= 4 ||
    (totalSessions >= 6 && recoverySessions === 0) ||
    (trend.status === 'warning' && fatigueWatchSessions >= 1);

  if (highRisk) {
    return {
      status: 'high',
      label: 'High',
      message: 'Load risk is elevated. Reduce intensity, prioritise recovery, and avoid adding ruck or run volume.',
      factors,
      totalSessions,
      ruckSessions,
      runSessions,
      strengthSessions,
      recoverySessions,
      fatigueWatchSessions,
    };
  }

  const moderateRisk =
    totalSessions >= 5 ||
    ruckSessions >= 2 ||
    runSessions >= 3 ||
    (totalSessions >= 3 && recoverySessions === 0) ||
    trend.status === 'warning';

  if (moderateRisk) {
    return {
      status: 'moderate',
      label: 'Moderate',
      message: 'Load is building. Keep progression controlled and add recovery before increasing distance, load or intensity.',
      factors: factors.length > 0 ? factors : ['Training load is building'],
      totalSessions,
      ruckSessions,
      runSessions,
      strengthSessions,
      recoverySessions,
      fatigueWatchSessions,
    };
  }

  return {
    status: 'low',
    label: 'Low',
    message: 'Training load is controlled. Continue steady progression and keep logging recovery quality.',
    factors: ['Controlled recent load'],
    totalSessions,
    ruckSessions,
    runSessions,
    strengthSessions,
    recoverySessions,
    fatigueWatchSessions,
  };
}

export function buildNextWeekRecommendation(thisWeek: WeekSummary, lastWeek: WeekSummary): string {
  const readiness = Number(thisWeek.averageReadiness);
  const lastReadiness = Number(lastWeek.averageReadiness);
  const readinessDrop = lastWeek.total > 0 && readiness < lastReadiness - 1;

  if (thisWeek.total === 0) {
    return 'No sessions logged this week. Aim for 3 to 4 sessions next week with at least one ruck or run and one strength session.';
  }

  if (thisWeek.fatigueWatch >= 2 || (readiness > 0 && readiness < 5)) {
    return 'Prioritise recovery next week. Keep sessions short, add mobility work, and avoid increasing load until readiness recovers above 6.';
  }

  if (readinessDrop) {
    return 'Hold current load next week. Readiness has dropped from last week. Keep intensity moderate and monitor fatigue before progressing.';
  }

  if (thisWeek.weakLogs > 0) {
    return 'Improve log quality next week. Fix missing details in weak logs from this week. Clean data gives more accurate guidance.';
  }

  if (readiness >= 7 && thisWeek.fatigueWatch === 0) {
    return 'Ready to progress next week. Readiness is strong and no fatigue flags. Consider adding one extra session or a small increase in load.';
  }

  return 'Continue at current load next week. Readiness is stable and no fatigue flags. Maintain session frequency and keep notes detailed.';
}

export type RecommendationStatus = 'good' | 'warning' | 'caution' | 'neutral';
export type RecommendationActionType = 'add-log' | 'weak-logs';

export type SessionRecommendation = {
  sessionType: string;
  reason: string;
  suggestion: string;
  actionLabel: string;
  actionType: RecommendationActionType;
  status: RecommendationStatus;
};

export function buildSessionRecommendation(logs: TrainingLog[]): SessionRecommendation {
  if (logs.length === 0) {
    return {
      sessionType: 'Start Logging',
      reason: 'No training data has been recorded yet.',
      suggestion: 'Add your first session to start getting personalised recommendations based on readiness and load.',
      actionLabel: 'Add Training Log',
      actionType: 'add-log',
      status: 'neutral',
    };
  }

  const trend = buildReadinessTrend(logs);
  const thisWeek = buildWeekSummary(logs, 0);
  const weeklyLoadRisk = buildWeeklyLoadRisk(logs);
  const readinessImproving = trend.status === 'good' || hasRecentReadinessImprovement(logs);

  const recentLogs = [...logs]
    .sort((a, b) => getDateValue(b.date) - getDateValue(a.date) || b.id - a.id)
    .slice(0, 7);

  const recentFatigueWatch = recentLogs.filter((log) => isFatigueWatch(log.readiness)).length;
  const weakLogsCount = logs.filter((log) => logNeedsImprovement(log)).length;
  const weakLogRatio = weakLogsCount / logs.length;

  if (trend.status === 'warning' && recentFatigueWatch >= 2) {
    return {
      sessionType: 'Active Recovery',
      reason: 'Readiness has dropped and fatigue-watch logs are present.',
      suggestion: '20–30 minutes of mobility work, an easy walk, hydration focus and early sleep. Avoid any intensity today.',
      actionLabel: 'Log Recovery Session',
      actionType: 'add-log',
      status: 'warning',
    };
  }

  if (trend.status === 'warning') {
    return {
      sessionType: 'Active Recovery',
      reason: 'Readiness is dropping. Avoid adding load until scores recover.',
      suggestion: '20–30 minutes of light mobility, stretching and breathing work. Focus on sleep and hydration.',
      actionLabel: 'Log Recovery Session',
      actionType: 'add-log',
      status: 'warning',
    };
  }

  if (recentFatigueWatch >= 2) {
    return {
      sessionType: 'Active Recovery',
      reason: 'Multiple recent sessions show low readiness scores.',
      suggestion: '20–30 minutes of easy movement, hip and calf mobility, and a full rest from intensity.',
      actionLabel: 'Log Recovery Session',
      actionType: 'add-log',
      status: 'warning',
    };
  }

  if (logs.length >= 3 && weakLogRatio > 0.5) {
    return {
      sessionType: 'Fix Training Data',
      reason: 'More than half your logs are missing key details.',
      suggestion: 'Review recent logs and add missing notes, duration, load and readiness scores before making training decisions.',
      actionLabel: 'View Weak Logs',
      actionType: 'weak-logs',
      status: 'caution',
    };
  }

  if (weeklyLoadRisk.status === 'high') {
    return {
      sessionType: 'Deload Day',
      reason: `Weekly load risk is high: ${weeklyLoadRisk.factors.slice(0, 2).join(', ').toLowerCase()}.`,
      suggestion: 'Keep today easy. Use mobility, walking, hydration and sleep focus. Avoid adding ruck, run or strength volume.',
      actionLabel: 'Log Recovery Session',
      actionType: 'add-log',
      status: 'warning',
    };
  }

  if (readinessImproving && recentFatigueWatch === 0) {
    return {
      sessionType: 'Progressive Load',
      reason: 'Readiness is improving and no recent fatigue watch sessions.',
      suggestion: 'Choose a session that suits your weekly split. Consider a small increase in distance, load or session count.',
      actionLabel: 'Add Training Log',
      actionType: 'add-log',
      status: 'good',
    };
  }

  if (weeklyLoadRisk.status === 'moderate' && weeklyLoadRisk.recoverySessions === 0) {
    return {
      sessionType: 'Mobility Session',
      reason: 'Weekly load is building and no recovery or mobility session is logged.',
      suggestion: '20-30 minutes of mobility, easy walking and breathing work. Keep intensity low before adding more load.',
      actionLabel: 'Log Recovery Session',
      actionType: 'add-log',
      status: 'caution',
    };
  }

  if (weeklyLoadRisk.status === 'moderate') {
    return {
      sessionType: 'Controlled Session',
      reason: 'Weekly load risk is moderate. Progression is possible, but only with controlled intensity.',
      suggestion: 'Choose a short ruck, steady run or strength session without increasing distance, load and intensity together.',
      actionLabel: 'Add Training Log',
      actionType: 'add-log',
      status: 'caution',
    };
  }

  const readiness = Number(thisWeek.averageReadiness);
  const readinessGood = readiness >= 6 || thisWeek.total === 0;

  if (readinessGood && thisWeek.ruck === 0) {
    return {
      sessionType: 'Base Ruck',
      reason: 'No ruck session logged this week and readiness is good.',
      suggestion: '45–60 minutes at a steady tactical pace with 10–15 kg. Focus on posture, breathing and foot care.',
      actionLabel: 'Add Training Log',
      actionType: 'add-log',
      status: 'good',
    };
  }

  if (readinessGood && thisWeek.strength === 0) {
    return {
      sessionType: 'Strength Session',
      reason: 'No strength session logged this week and readiness is good.',
      suggestion: '45–55 minutes covering squat, press, pull and hinge patterns. Keep intensity controlled and form strict.',
      actionLabel: 'Add Training Log',
      actionType: 'add-log',
      status: 'good',
    };
  }

  if (readinessGood && thisWeek.run === 0) {
    return {
      sessionType: 'Steady Run',
      reason: 'No run logged this week and readiness is good.',
      suggestion: '30–40 minutes at a comfortable aerobic pace. Keep effort conversational and finish with a short cooldown.',
      actionLabel: 'Add Training Log',
      actionType: 'add-log',
      status: 'good',
    };
  }

  return {
    sessionType: 'Continue Progression',
    reason: 'Readiness is stable with no fatigue flags.',
    suggestion: 'Maintain current session frequency. Keep notes detailed and monitor readiness between sessions.',
    actionLabel: 'Add Training Log',
    actionType: 'add-log',
    status: 'neutral',
  };
}

/**
 * Calculates an estimated physiological difficulty score for a ruck map route
 * based on Naismith's Rule (adjusted for pack weight).
 */
export function calculateRuckDifficulty(route: RouteData): { score: number; label: string; estimatedHours: number } {
  if (!route.distanceKm) return { score: 0, label: 'Unknown', estimatedHours: 0 };

  // Base walking speed: ~5 km/h
  const baseTimeHours = route.distanceKm / 5;
  
  // Naismith's rule: Add 1 hour for every 600 meters of ascent
  const elevationTimeHours = (route.elevationGainMeters || 0) / 600;
  
  // Load factor: Assume 1.5% slower per kg of pack weight
  const weightFactor = 1 + ((route.packWeightKg || 0) * 0.015);

  const estimatedHours = (baseTimeHours + elevationTimeHours) * weightFactor;
  const score = Math.round(estimatedHours * 20); // Scale to an arbitrary 0-100+ score

  let label = 'Light';
  if (score >= 80) label = 'Epic';
  else if (score >= 50) label = 'Hard';
  else if (score >= 30) label = 'Moderate';
  else if (score >= 15) label = 'Steady';

  return { score, label, estimatedHours: Number(estimatedHours.toFixed(2)) };
}

export type DayPlan = {
  day: string;
  focus: string;
  session: string;
  warmup?: string;
  mainWork?: string;
  cooldown?: string;
  adjustment?: string;
  intensity: 'Rest' | 'Low' | 'Moderate' | 'High';
  isRest: boolean;
};

export type WeekPlan = {
  days: DayPlan[];
  planType: 'recovery' | 'standard' | 'progressive';
  rationale: string;
};

export type TrainingProfileInput = {
  trainingLevel?: 'Foundation' | 'Intermediate' | 'Advanced';
  equipment?: string;
  injuryNotes?: string;
  role?: string;
};

export type GoalSummary = {
  active: number;
  complete: number;
  priority: TrainingGoal | null;
  byCategory: Record<GoalCategory, number>;
  averageProgress: number;
  message: string;
};

export type GoalProgress = {
  percent: number;
  label: string;
  hasNumericProgress: boolean;
};

export type GoalAction = {
  title: string;
  reason: string;
  action: string;
  status: RecommendationStatus;
};

export type PerformanceSnapshot = {
  totalSessions: number;
  currentWeekSessions: number;
  averageReadiness: string;
  bestRuckDistanceKm: number;
  bestRunDistanceKm: number;
  longestSessionMinutes: number;
  consistencyLabel: string;
  highlight: string;
};

function createDayPlan(input: Omit<DayPlan, 'warmup' | 'mainWork' | 'cooldown' | 'adjustment'> & Partial<Pick<DayPlan, 'warmup' | 'mainWork' | 'cooldown' | 'adjustment'>>): DayPlan {
  return {
    warmup: input.isRest ? 'No formal warm-up needed.' : '5-10 min easy movement, joint prep and breathing check.',
    mainWork: input.session,
    cooldown: input.isRest ? 'Keep hydration and sleep consistent.' : '5-10 min easy cooldown, foot or joint check and notes.',
    adjustment: 'If readiness is 5 or below, reduce volume by 30-50% and keep effort easy.',
    ...input,
  };
}

export function getDayPlanDetails(plan: DayPlan): Required<Pick<DayPlan, 'warmup' | 'mainWork' | 'cooldown' | 'adjustment'>> {
  const defaults = createDayPlan({
    day: plan.day,
    focus: plan.focus,
    session: plan.session,
    intensity: plan.intensity,
    isRest: plan.isRest,
  });

  return {
    warmup: plan.warmup ?? defaults.warmup ?? '5-10 min easy movement and readiness check.',
    mainWork: plan.mainWork ?? defaults.mainWork ?? plan.session,
    cooldown: plan.cooldown ?? defaults.cooldown ?? 'Cooldown, check feet or joints, and log notes.',
    adjustment: plan.adjustment ?? defaults.adjustment ?? 'If readiness is low, reduce volume and keep effort easy.',
  };
}

export function buildGoalSummary(goals: TrainingGoal[]): GoalSummary {
  const activeGoals = goals.filter((goal) => goal.status === 'active');
  const completeGoals = goals.filter((goal) => goal.status === 'complete');
  const byCategory = goals.reduce<Record<GoalCategory, number>>((counts, goal) => {
    counts[goal.category] = (counts[goal.category] ?? 0) + 1;
    return counts;
  }, {
    Ruck: 0,
    Run: 0,
    Strength: 0,
    Recovery: 0,
    Test: 0,
    Consistency: 0,
  });

  const datedGoals = activeGoals
    .filter((goal) => /^\d{4}-\d{2}-\d{2}$/.test(goal.deadline))
    .sort((a, b) => getDateValue(a.deadline) - getDateValue(b.deadline));
  const priority = datedGoals[0] ?? activeGoals[0] ?? null;
  const numericProgress = activeGoals
    .map((goal) => getGoalProgress(goal))
    .filter((progress) => progress.hasNumericProgress);
  const averageProgress = numericProgress.length > 0
    ? Math.round(numericProgress.reduce((sum, progress) => sum + progress.percent, 0) / numericProgress.length)
    : 0;

  return {
    active: activeGoals.length,
    complete: completeGoals.length,
    priority,
    byCategory,
    averageProgress,
    message: priority
      ? `Priority: ${priority.title}. Target ${priority.target}.`
      : completeGoals.length > 0
        ? 'All goals are complete. Add the next target when ready.'
        : 'Set one active goal to anchor the next plan.',
  };
}

function getFirstNumber(value: string) {
  const match = value.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

export function getGoalProgress(goal: TrainingGoal): GoalProgress {
  if (goal.status === 'complete') {
    return { percent: 100, label: 'Complete', hasNumericProgress: true };
  }

  const current = getFirstNumber(goal.current);
  const target = getFirstNumber(goal.target);

  if (current > 0 && target > 0) {
    const percent = Math.max(0, Math.min(100, Math.round((current / target) * 100)));
    return {
      percent,
      label: `${percent}% toward target`,
      hasNumericProgress: true,
    };
  }

  return {
    percent: 0,
    label: goal.current.trim() ? goal.current.trim() : 'Progress not quantified',
    hasNumericProgress: false,
  };
}

export function buildGoalAction(goals: TrainingGoal[], logs: TrainingLog[]): GoalAction {
  const summary = buildGoalSummary(goals);
  const priority = summary.priority;

  if (!priority) {
    return {
      title: 'Set Priority Goal',
      reason: 'No active goal is available to guide the next training decision.',
      action: 'Create one specific goal with a target and current status.',
      status: 'neutral',
    };
  }

  const recentLogs = [...logs]
    .sort((a, b) => getDateValue(b.date) - getDateValue(a.date) || b.id - a.id)
    .slice(0, 5);
  const recentFatigue = recentLogs.filter((log) => isFatigueWatch(log.readiness)).length;
  const trend = buildReadinessTrend(logs);
  const progress = getGoalProgress(priority);

  if (recentFatigue >= 2 || trend.status === 'warning') {
    return {
      title: 'Protect Readiness',
      reason: `Priority goal is ${priority.title}, but recent fatigue risk is elevated.`,
      action: 'Use recovery or low-intensity work before pushing goal progress again.',
      status: 'warning',
    };
  }

  if (priority.category === 'Ruck') {
    return {
      title: 'Goal Ruck Session',
      reason: progress.hasNumericProgress ? `${progress.label} on ${priority.title}.` : `Priority goal is ${priority.title}.`,
      action: 'Plan a controlled ruck. Progress only distance, load or pace, not all three.',
      status: progress.percent >= 80 ? 'good' : 'neutral',
    };
  }

  if (priority.category === 'Run') {
    return {
      title: 'Goal Run Session',
      reason: progress.hasNumericProgress ? `${progress.label} on ${priority.title}.` : `Priority goal is ${priority.title}.`,
      action: 'Use a steady run or tempo segment that supports the target.',
      status: progress.percent >= 80 ? 'good' : 'neutral',
    };
  }

  return {
    title: 'Goal Session',
    reason: progress.hasNumericProgress ? `${progress.label} on ${priority.title}.` : `Priority goal is ${priority.title}.`,
    action: 'Focus your next session on this priority goal.',
    status: progress.percent >= 80 ? 'good' : 'neutral',
  };
}

export function buildPerformanceSnapshot(logs: TrainingLog[]): PerformanceSnapshot {
  const thisWeek = buildWeekSummary(logs, 0);
  const totalSessions = logs.length;
  const currentWeekSessions = thisWeek.total;

  const ruckLogs = logs.filter((log) => log.category === 'Ruck');
  const runLogs = logs.filter((log) => log.category === 'Run');

  const bestRuckDistanceKm = ruckLogs.reduce((max, log) => {
    const km = getFirstNumber(log.distanceLoad);
    return km > max ? km : max;
  }, 0);

  const bestRunDistanceKm = runLogs.reduce((max, log) => {
    const km = getFirstNumber(log.distanceLoad);
    return km > max ? km : max;
  }, 0);

  const longestSessionMinutes = logs.reduce((max, log) => {
    const mins = getFirstNumber(log.duration);
    return mins > max ? mins : max;
  }, 0);

  let consistencyLabel = 'Building';
  let highlight = 'Keep logging sessions to build a consistent habit.';

  if (currentWeekSessions >= 4) {
    consistencyLabel = 'On target';
    highlight = 'Weekly consistency target is on track.';
  } else if (totalSessions >= 10) {
    consistencyLabel = 'Established';
    highlight = 'You have a solid base of logged sessions.';
  }

  return {
    totalSessions,
    currentWeekSessions,
    averageReadiness: thisWeek.averageReadiness,
    bestRuckDistanceKm,
    bestRunDistanceKm,
    longestSessionMinutes,
    consistencyLabel,
    highlight,
  };
}

export function buildWeekPlan(
  logs: TrainingLog[],
  goals: TrainingGoal[] = [],
  profile: TrainingProfileInput = {}
): WeekPlan {
  const trend = buildReadinessTrend(logs);
  const readinessImproving = trend.status === 'good' || hasRecentReadinessImprovement(logs);
  const recentFatigueWatch = [...logs]
    .sort((a, b) => getDateValue(b.date) - getDateValue(a.date) || b.id - a.id)
    .slice(0, 7)
    .filter((log) => isFatigueWatch(log.readiness)).length;
  
  if (trend.status === 'warning') {
    return {
      planType: 'recovery',
      rationale: 'Readiness is dropping. Focus on recovery this week.',
      days: Array.from({ length: 7 }).map((_, i) => ({
        day: `Day ${i + 1}`,
        focus: 'Rest',
        session: 'Active Recovery',
        intensity: 'Rest',
        isRest: true,
      })),
    };
  }

  if (readinessImproving && logs.length >= 3 && recentFatigueWatch === 0) {
    return {
      planType: 'progressive',
      rationale: 'Readiness is improving. Progress carefully while keeping recovery built into the week.',
      days: [
        { day: 'Day 1', focus: 'Strength', session: 'Full Body Strength', intensity: 'Moderate', isRest: false },
        { day: 'Day 2', focus: 'Run', session: 'Aerobic Base Run', intensity: 'Moderate', isRest: false },
        { day: 'Day 3', focus: 'Recovery', session: 'Mobility and Core', intensity: 'Low', isRest: true },
        { day: 'Day 4', focus: 'Strength', session: 'Full Body Strength Progression', intensity: 'Moderate', isRest: false },
        { day: 'Day 5', focus: 'Ruck', session: 'Loaded Ruck Progression', intensity: 'High', isRest: false },
        { day: 'Day 6', focus: 'Recovery', session: 'Active Recovery', intensity: 'Low', isRest: false },
        { day: 'Day 7', focus: 'Rest', session: 'Complete Rest', intensity: 'Rest', isRest: true },
      ],
    };
  }
  
  return {
    planType: 'standard',
    rationale: 'Readiness is stable. Follow the standard progression.',
    days: [
      { day: 'Day 1', focus: 'Strength', session: 'Full Body Strength', intensity: 'Moderate', isRest: false },
      { day: 'Day 2', focus: 'Run', session: 'Aerobic Base Run', intensity: 'Moderate', isRest: false },
      { day: 'Day 3', focus: 'Recovery', session: 'Mobility and Core', intensity: 'Low', isRest: true },
      { day: 'Day 4', focus: 'Strength', session: 'Full Body Strength', intensity: 'Moderate', isRest: false },
      { day: 'Day 5', focus: 'Ruck', session: 'Loaded Ruck Progression', intensity: 'High', isRest: false },
      { day: 'Day 6', focus: 'Recovery', session: 'Active Recovery', intensity: 'Low', isRest: false },
      { day: 'Day 7', focus: 'Rest', session: 'Complete Rest', intensity: 'Rest', isRest: true },
    ],
  };
}
