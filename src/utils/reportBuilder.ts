import type { TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';
import {
  buildGoalSummary,
  buildGoalAction,
  buildReadinessTrend,
  buildSessionRecommendation,
  buildSummary,
  buildWeekSummary,
  buildWeeklyLoadRisk,
  calculateTrainingLogHealthScore,
  getTrainingLogHealthLabel,
  getGoalProgress,
  getWeakLogReasons,
  isFatigueWatch,
} from '@/src/utils/trainingLogUtils';

export type WeeklyReport = {
  title: string;
  generatedAt: string;
  text: string;
};

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sanitiseField(value: string): string {
  return value.replace(/\n+/g, ' ').replace(/\|/g, '-').trim();
}

function formatLogLine(log: TrainingLog): string {
  return `${log.date} | ${log.category} | ${log.type} | ${log.duration} | ${sanitiseField(log.distanceLoad)} | R${log.readiness}/10`;
}

function buildKeyNotes(logs: TrainingLog[]): string[] {
  return logs
    .filter((log) => log.notes.trim().length > 0)
    .slice(0, 3)
    .map((log) => `${log.date} ${log.category}: ${sanitiseField(log.notes)}`);
}

export function buildWeeklyReport(logs: TrainingLog[], now: Date = new Date(), goals: TrainingGoal[] = []): WeeklyReport {
  const thisWeek = buildWeekSummary(logs, 0);
  const summary = buildSummary(logs);
  const healthScore = calculateTrainingLogHealthScore(logs);
  const healthLabel = getTrainingLogHealthLabel(healthScore);
  const readinessTrend = buildReadinessTrend(logs);
  const weeklyLoadRisk = buildWeeklyLoadRisk(logs, now);
  const recommendation = buildSessionRecommendation(logs);
  const goalSummary = buildGoalSummary(goals);
  const goalAction = buildGoalAction(goals, logs);

  const recentLogs = [...logs]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .slice(0, 5);
  const weakLogs = logs.filter((log) => getWeakLogReasons(log).length > 0);
  const fatigueWatchLogs = logs.filter((log) => isFatigueWatch(log.readiness));
  const keyNotes = buildKeyNotes(recentLogs);

  const lines = [
    'SENTINEL READY WEEKLY REPORT',
    `Generated: ${formatDate(now)}`,
    `Week: ${thisWeek.weekStart} to ${thisWeek.weekEnd}`,
    '',
    'SUMMARY',
    `Training Log Health: ${healthScore}/100 (${healthLabel})`,
    `Readiness Trend: ${readinessTrend.label} (${readinessTrend.latest}/10 latest, ${readinessTrend.previous}/10 previous)`,
    `Weekly Load Risk: ${weeklyLoadRisk.label}`,
    `Recommended Next Session: ${recommendation.sessionType}`,
    `Active Goals: ${goalSummary.active}`,
    `Average Goal Progress: ${goalSummary.averageProgress}%`,
    `Next Goal Action: ${goalAction.title}`,
    '',
    'TRAINING SPLIT',
    `Total Logs: ${summary.total}`,
    `This Week: ${thisWeek.total} sessions`,
    `Ruck: ${thisWeek.ruck}`,
    `Strength: ${thisWeek.strength}`,
    `Run: ${thisWeek.run}`,
    `Mobility: ${thisWeek.mobility}`,
    `Test: ${thisWeek.test}`,
    `Recovery: ${thisWeek.recovery}`,
    '',
    'WATCH ITEMS',
    `Weak Logs: ${weakLogs.length}`,
    `Fatigue Watch Logs: ${fatigueWatchLogs.length}`,
    `Load Risk Factors: ${weeklyLoadRisk.factors.join(', ')}`,
    '',
    'GOALS',
    goalSummary.message,
    `Next Action: ${goalAction.action}`,
    ...(goals.length > 0
      ? goals.slice(0, 5).map((goal) => {
          const progress = getGoalProgress(goal);
          return `${goal.status.toUpperCase()} | ${goal.category} | ${goal.title} | ${progress.label} | Target: ${sanitiseField(goal.target)} | Current: ${sanitiseField(goal.current || 'Not recorded')}`;
        })
      : ['No goals recorded.']),
    '',
    'NEXT SESSION GUIDANCE',
    `Reason: ${recommendation.reason}`,
    `Suggested Session: ${recommendation.suggestion}`,
    '',
    'RECENT SESSIONS',
    ...(recentLogs.length > 0 ? recentLogs.map(formatLogLine) : ['No recent sessions logged.']),
    '',
    'KEY NOTES',
    ...(keyNotes.length > 0 ? keyNotes : ['No key notes available.']),
  ];

  return {
    title: 'Sentinel Ready Weekly Report',
    generatedAt: formatDate(now),
    text: lines.join('\n'),
  };
}
