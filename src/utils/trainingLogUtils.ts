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
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
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

  if (trend.status === 'good' && recentFatigueWatch === 0) {
    return {
      sessionType: 'Progressive Load',
      reason: 'Readiness is improving and no recent fatigue watch sessions.',
      suggestion: 'Choose a session that suits your weekly split. Consider a small increase in distance, load or session count.',
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

export type DayPlan = {
  day: string;
  focus: string;
  session: string;
  intensity: 'Rest' | 'Low' | 'Moderate' | 'High';
  isRest: boolean;
};

export type WeekPlan = {
  days: DayPlan[];
  planType: 'recovery' | 'standard' | 'progressive';
  rationale: string;
};

const RECOVERY_WEEK: DayPlan[] = [
  { day: 'Monday',    focus: 'Active Recovery', session: '20–30 min mobility — hips, calves, shoulders and breathing work.', intensity: 'Low',  isRest: false },
  { day: 'Tuesday',   focus: 'Rest',            session: 'Full rest. Prioritise sleep, hydration and nutrition.',              intensity: 'Rest', isRest: true  },
  { day: 'Wednesday', focus: 'Mobility',         session: '20–25 min stretching and easy movement. No intensity.',             intensity: 'Low',  isRest: false },
  { day: 'Thursday',  focus: 'Light Strength',   session: 'Bodyweight only — press-ups, rows, squats. Keep effort low.',       intensity: 'Low',  isRest: false },
  { day: 'Friday',    focus: 'Active Recovery',  session: 'Easy walk 20–30 min. Focus on breathing and hydration.',            intensity: 'Low',  isRest: false },
  { day: 'Saturday',  focus: 'Easy Ruck',        session: '4–6 km with a light pack (under 10 kg). Steady pace only.',         intensity: 'Low',  isRest: false },
  { day: 'Sunday',    focus: 'Rest',             session: 'Full rest.',                                                        intensity: 'Rest', isRest: true  },
];

function buildStandardDays(gaps: { ruck: boolean; strength: boolean; run: boolean }): DayPlan[] {
  const ruckSession: DayPlan = { day: '', focus: 'Ruck', session: '8–10 km loaded ruck at 12–15 kg. Steady tactical pace. Focus on posture and foot care.', intensity: 'Moderate', isRest: false };
  const strengthSession: DayPlan = { day: '', focus: 'Strength', session: 'Squat, press, pull and hinge pattern. Controlled intensity. Leave 2 reps in reserve.', intensity: 'Moderate', isRest: false };
  const runSession: DayPlan = { day: '', focus: 'Run', session: '5 km steady aerobic run. Keep effort conversational. Short cooldown after.', intensity: 'Moderate', isRest: false };
  const condSession: DayPlan = { day: '', focus: 'Conditioning', session: 'Loaded carries, circuits or interval work. 30–40 min. Keep effort controlled.', intensity: 'Moderate', isRest: false };
  const recoveryDay: DayPlan = { day: 'Wednesday', focus: 'Recovery', session: 'Mobility, easy walk and breathing work. No intensity.', intensity: 'Low', isRest: false };
  const restDay: DayPlan = { day: 'Sunday', focus: 'Rest', session: 'Full rest or light mobility only.', intensity: 'Rest', isRest: true };

  const priority: DayPlan[] = [];
  if (gaps.ruck) priority.push(ruckSession);
  if (gaps.strength) priority.push(strengthSession);
  if (gaps.run) priority.push(runSession);

  const slots = ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday'];
  const filled: DayPlan[] = [recoveryDay, restDay];
  const fallbacks = [strengthSession, ruckSession, runSession, condSession].filter(
    (s) => !priority.some((p) => p.focus === s.focus)
  );
  const sessionPool = [...priority, ...fallbacks];

  let poolIndex = 0;
  for (const day of slots) {
    const session = { ...sessionPool[poolIndex % sessionPool.length], day };
    filled.push(session);
    poolIndex++;
  }

  return filled.sort((a, b) => {
    const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return order.indexOf(a.day) - order.indexOf(b.day);
  });
}

function buildProgressiveDays(gaps: { ruck: boolean; strength: boolean; run: boolean }): DayPlan[] {
  const ruckSession: DayPlan = { day: '', focus: 'Ruck', session: '10–12 km loaded ruck at 15–18 kg. Push pace slightly from last session.', intensity: 'High', isRest: false };
  const strengthSession: DayPlan = { day: '', focus: 'Strength', session: 'Squat, press, pull and hinge. Increase load by 5% or add one working set.', intensity: 'High', isRest: false };
  const runSession: DayPlan = { day: '', focus: 'Run', session: '6–8 km with a tempo effort in the middle 3 km. Monitor breathing throughout.', intensity: 'High', isRest: false };
  const condSession: DayPlan = { day: '', focus: 'Strength Endurance', session: 'Circuit: hinge, push, pull and loaded carry. 35–45 min at sustained effort.', intensity: 'High', isRest: false };
  const recoveryDay: DayPlan = { day: 'Wednesday', focus: 'Recovery', session: 'Mobility, easy walk and breathing work. No intensity.', intensity: 'Low', isRest: false };
  const restDay: DayPlan = { day: 'Sunday', focus: 'Rest', session: 'Full rest. Prioritise sleep and hydration.', intensity: 'Rest', isRest: true };

  const priority: DayPlan[] = [];
  if (gaps.ruck) priority.push(ruckSession);
  if (gaps.strength) priority.push(strengthSession);
  if (gaps.run) priority.push(runSession);

  const slots = ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday'];
  const filled: DayPlan[] = [recoveryDay, restDay];
  const fallbacks = [strengthSession, ruckSession, runSession, condSession].filter(
    (s) => !priority.some((p) => p.focus === s.focus)
  );
  const sessionPool = [...priority, ...fallbacks];

  let poolIndex = 0;
  for (const day of slots) {
    const session = { ...sessionPool[poolIndex % sessionPool.length], day };
    filled.push(session);
    poolIndex++;
  }

  return filled.sort((a, b) => {
    const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return order.indexOf(a.day) - order.indexOf(b.day);
  });
}

export function buildWeekPlan(logs: TrainingLog[]): WeekPlan {
  const trend = buildReadinessTrend(logs);
  const thisWeek = buildWeekSummary(logs, 0);

  const recentLogs = [...logs]
    .sort((a, b) => getDateValue(b.date) - getDateValue(a.date) || b.id - a.id)
    .slice(0, 7);
  const recentFatigueWatch = recentLogs.filter((log) => isFatigueWatch(log.readiness)).length;

  const isRecoveryWeek = trend.status === 'warning' || recentFatigueWatch >= 2;
  const isProgressiveWeek = trend.status === 'good' && thisWeek.total >= 3 && recentFatigueWatch === 0;

  if (isRecoveryWeek) {
    return {
      days: RECOVERY_WEEK,
      planType: 'recovery',
      rationale: trend.status === 'warning'
        ? 'Readiness is dropping. This week focuses on recovery and light work to restore capacity before returning to full load.'
        : 'Multiple fatigue-watch sessions detected. Load is reduced this week to protect readiness and prevent overtraining.',
    };
  }

  const gaps = {
    ruck: thisWeek.ruck === 0,
    strength: thisWeek.strength === 0,
    run: thisWeek.run === 0,
  };

  if (isProgressiveWeek) {
    return {
      days: buildProgressiveDays(gaps),
      planType: 'progressive',
      rationale: 'Readiness is improving and last week was consistent. This week builds on that with increased intensity and load.',
    };
  }

  return {
    days: buildStandardDays(gaps),
    planType: 'standard',
    rationale: 'Readiness is stable. This week maintains current load and fills any gaps in the training split.',
  };
}
