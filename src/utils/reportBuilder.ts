import type { TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';
import type { Gender } from '@/src/screens/UserContext';
import type { DfiftStandards } from '@/src/types/dfift';
import { buildPlanAdherence } from '@/src/utils/adherenceUtils';
import { buildTrainingBalance } from '@/src/utils/balanceUtils';
import { buildDfiftSnapshot } from '@/src/utils/dfiftUtils';
import { buildGoalSuggestions } from '@/src/utils/goalSuggestionUtils';
import { buildInjuryWatch } from '@/src/utils/injuryWatchUtils';
import { buildMilestones, getEarnedMilestones, getNextMilestone } from '@/src/utils/milestoneUtils';
import { buildMissionBrief } from '@/src/utils/missionBriefUtils';
import { buildReadinessForecast } from '@/src/utils/readinessForecastUtils';
import { buildRecoveryDebt } from '@/src/utils/recoveryUtils';
import {
  buildGoalAction,
  buildGoalSummary,
  buildPerformanceSnapshot,
  buildReadinessTrend,
  buildSessionRecommendation,
  buildSummary,
  buildWeekSummary,
  buildWeeklyLoadRisk,
  calculateTrainingLogHealthScore,
  getGoalProgress,
  getTrainingLogHealthLabel
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
  const forecast = buildReadinessForecast(logs, goals, profile);
  const adherence = buildPlanAdherence(logs, goals, profile);
  const injuryWatch = buildInjuryWatch(logs, profile?.injuryNotes ?? '');
  const milestones = buildMilestones(logs, goals, dfift);
  const earnedMilestones = getEarnedMilestones(milestones);
  const nextMilestone = getNextMilestone(milestones);

  const title = 'Sentinel Ready Weekly Report';
  
  let text = `================================================
SENTINEL READY WEEKLY REPORT
Generated: ${formatDate(now)}
================================================

TRAINING LOG HEALTH
Training Log Health: ${healthScore}/100 - ${healthLabel}
Total Sessions: ${summary.total}
Weak Logs: ${summary.weakLogs}
Average Readiness: ${summary.averageReadiness}
Fatigue Watch Logs: ${summary.fatigueWatch}

READINESS TREND
Readiness Trend: ${readinessTrend.label} (${readinessTrend.change > 0 ? '+' : ''}${readinessTrend.change})
Latest: ${readinessTrend.latest}/10, Previous: ${readinessTrend.previous}/10

WEEKLY LOAD RISK
Weekly Load Risk: ${weeklyLoadRisk.label}
${weeklyLoadRisk.message}

NEXT RECOMMENDED SESSION
Recommended Next Session: ${recommendation.sessionType}
Reason: ${recommendation.reason}
Suggestion: ${recommendation.suggestion}

PERFORMANCE SNAPSHOT
Best Ruck: ${performance.bestRuckDistanceKm} km
Best Run: ${performance.bestRunDistanceKm} km
Longest Session: ${performance.longestSessionMinutes} mins
Consistency: ${performance.consistencyLabel}
`;

  if (dfiftSnapshot) {
    text += `
DFIFT SNAPSHOT
Passed: ${dfiftSnapshot.passedEvents} / ${dfiftSnapshot.rows.length}
Recommendation: ${dfiftSnapshot.recommendation}
`;
  }

  text += `
TRAINING BALANCE
${trainingBalance.label}
Focus: ${trainingBalance.nextFocus}

RECOVERY DEBT
${recoveryDebt.label} (${recoveryDebt.score}%)
Action: ${recoveryDebt.action}

INJURY WATCH
${injuryWatch.label} (${injuryWatch.score}%)
Action: ${injuryWatch.action}

PLAN ADHERENCE
${adherence.label} (${adherence.score}%)
Action: ${adherence.nextAction}

ACTIVE GOALS
`;

  if (goals.length > 0) {
    goals.filter(g => g.status === 'active').forEach(g => {
      const progress = getGoalProgress(g);
      text += `- ${g.title}: ${progress.label}\n`;
    });
  } else {
    text += 'No active goals set.\n';
  }

  text += `
GOAL ACTION
${goalAction.title}
${goalAction.action}
`;

  if (goalSuggestions.length > 0) {
    text += `
SUGGESTED GOALS
`;
    goalSuggestions.slice(0, 2).forEach(s => {
      text += `- ${s.title}: ${s.reason}\n`;
    });
  }

  text += `
WEEKLY SPLIT
Ruck: ${thisWeek.ruck}
Strength: ${thisWeek.strength}
Run: ${thisWeek.run}
Recovery: ${thisWeek.recovery}
Mobility: ${thisWeek.mobility}

RECENT SESSIONS (THIS WEEK)
`;

  const thisWeekLogs = logs.filter(l => l.date >= thisWeek.weekStart && l.date <= thisWeek.weekEnd)
    .sort((a, b) => b.id - a.id);

  if (thisWeekLogs.length > 0) {
    thisWeekLogs.forEach(l => {
      text += `${formatLogLine(l)}\n`;
    });
  } else {
    text += 'No sessions logged this week.\n';
  }

  const keyNotes = buildKeyNotes(logs);
  if (keyNotes.length > 0) {
    text += `
KEY NOTES
`;
    keyNotes.forEach(n => {
      text += `${n}\n`;
    });
  }

  return {
    title,
    generatedAt: formatDate(now),
    text,
  };
}