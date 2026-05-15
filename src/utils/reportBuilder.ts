import type { TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';
import type { DfiftStandards } from '@/src/types/dfift';
import type { Gender } from '@/src/screens/UserContext';
import { buildTrainingBalance } from '@/src/utils/balanceUtils';
import { buildDfiftSnapshot } from '@/src/utils/dfiftUtils';
import { buildGoalSuggestions } from '@/src/utils/goalSuggestionUtils';
import { buildMissionBrief } from '@/src/utils/missionBriefUtils';
import { buildReadinessForecast } from '@/src/utils/readinessForecastUtils';
import { buildRecoveryDebt } from '@/src/utils/recoveryUtils';
import {
  buildGoalSummary,
  buildGoalAction,
  buildReadinessTrend,
  buildPerformanceSnapshot,
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

export function buildWeeklyReport(
  logs: TrainingLog[],
  now: Date = new Date(),
  goals: TrainingGoal[] = [],
  dfift?: { standards: DfiftStandards; gender: Gender },
  profile?: { injuryNotes?: string }
): WeeklyReport {
  const thisWeek = buildWeekSummary(logs, 0);
  const summary = buildSummary(logs);
  const healthScore = calculateTrainingLogHealthScore(logs);
  const healthLabel = getTrainingLogHealthLabel(healthScore);
  const readinessTrend = buildReadinessTrend(logs);
  const weeklyLoadRisk = buildWeeklyLoadRisk(logs, now);
  const recommendation = buildSessionRecommendation(logs);
  const goalSummary = buildGoalSummary(goals);
  const goalAction = buildGoalAction(goals, logs);
  const performance = buildPerformanceSnapshot(logs);
  const dfiftSnapshot = dfift ? buildDfiftSnapshot(logs, dfift.standards, dfift.gender) : null;
  const goalSuggestions = buildGoalSuggestions(logs, goals, dfift);
  const recoveryDebt = buildRecoveryDebt(logs, profile?.injuryNotes ?? '', now);
  const trainingBalance = buildTrainingBalance(logs);
  const missionBrief = buildMissionBrief(logs, goals, { injuryNotes: profile?.injuryNotes });
  const forecast = buildReadinessForecast(logs, goals, { injuryNotes: profile?.injuryNotes });

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
    `Mission Brief: ${missionBrief.title}`,
    `Readiness Forecast: ${forecast.label}`,
    `Active Goals: ${goalSummary.active}`,
    `Suggested Goals: ${goalSuggestions.length}`,
    `Average Goal Progress: ${goalSummary.averageProgress}%`,
    `Next Goal Action: ${goalAction.title}`,
    `Performance Highlight: ${performance.highlight}`,
    `Recovery Debt: ${recoveryDebt.label} (${recoveryDebt.status === 'no-data' ? 'No Data' : `${recoveryDebt.score}%`})`,
    `Training Balance: ${trainingBalance.label} (${trainingBalance.status === 'no-data' ? 'No Data' : `${trainingBalance.score}%`})`,
    ...(dfiftSnapshot ? [`DFIFT Passing: ${dfiftSnapshot.passedEvents}/${dfiftSnapshot.rows.length}`] : []),
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
    'MISSION BRIEF',
    `Status: ${missionBrief.status.toUpperCase()}`,
    `Summary: ${missionBrief.summary}`,
    `Primary Action: ${missionBrief.primaryAction}`,
    `Secondary Action: ${missionBrief.secondaryAction}`,
    `Reasons: ${missionBrief.reasons.join(', ')}`,
    '',
    'READINESS FORECAST',
    `Forecast: ${forecast.label}`,
    `Summary: ${forecast.summary}`,
    ...forecast.days.map((day) => `${day.day}: ${day.focus} | ${day.status.toUpperCase()} | ${day.message}`),
    '',
    'PERFORMANCE SNAPSHOT',
    `Best Ruck: ${performance.bestRuckDistanceKm > 0 ? `${performance.bestRuckDistanceKm} km` : 'No ruck distance logged'}`,
    `Best Run: ${performance.bestRunDistanceKm > 0 ? `${performance.bestRunDistanceKm} km` : 'No run distance logged'}`,
    `Longest Session: ${performance.longestSessionMinutes > 0 ? `${performance.longestSessionMinutes} min` : 'No duration logged'}`,
    `Consistency: ${performance.consistencyLabel}`,
    '',
    'TRAINING BALANCE',
    `Balance: ${trainingBalance.label}`,
    `Next Focus: ${trainingBalance.nextFocus}`,
    `Gaps: ${trainingBalance.gaps.length > 0 ? trainingBalance.gaps.join(', ') : 'None'}`,
    `Overloads: ${trainingBalance.overloads.length > 0 ? trainingBalance.overloads.join(', ') : 'None'}`,
    '',
    ...(dfiftSnapshot ? [
      'DFIFT SNAPSHOT',
      `Events Logged: ${dfiftSnapshot.loggedEvents}/${dfiftSnapshot.rows.length}`,
      `Events Passing: ${dfiftSnapshot.passedEvents}/${dfiftSnapshot.rows.length}`,
      `Weak Point: ${dfiftSnapshot.weakPoint ? dfiftSnapshot.weakPoint.label : 'None'}`,
      `Recommendation: ${dfiftSnapshot.recommendation}`,
      '',
    ] : []),
    'RECOVERY SNAPSHOT',
    `Recovery Debt: ${recoveryDebt.label}`,
    `Recovery Action: ${recoveryDebt.action}`,
    `Recovery Factors: ${recoveryDebt.factors.join(', ')}`,
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
    'SUGGESTED GOALS',
    ...(goalSuggestions.length > 0
      ? goalSuggestions.map((suggestion) => `${suggestion.category} | ${suggestion.title} | Target: ${sanitiseField(suggestion.target)} | Reason: ${sanitiseField(suggestion.reason)}`)
      : ['No new goal suggestions right now.']),
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
