import type { TrainingLog } from '@/src/screens/TrainingContext';
import { getDateValue } from './trainingLogCore';
import { logNeedsImprovement } from './logQualityUtils';
import { buildReadinessTrend, hasRecentReadinessImprovement, isFatigueWatch } from './readinessUtils';
import { buildWeeklyLoadRisk, buildWeekSummary } from './weeklyLoadUtils';

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
      suggestion: 'Choose a short ruck, terrain hike, steady run, resistance circuit or strength session without increasing distance, load and intensity together.',
      actionLabel: 'Add Training Log',
      actionType: 'add-log',
      status: 'caution',
    };
  }

  const readiness = Number(thisWeek.averageReadiness);
  const readinessGood = readiness >= 6 || thisWeek.total === 0;

  if (readinessGood && thisWeek.ruck + thisWeek.hiking === 0) {
    return {
      sessionType: 'Load Carriage',
      reason: 'No ruck or hiking session is logged this week and readiness is good.',
      suggestion: '45–60 minutes at a steady tactical pace with 10–15 kg. Focus on posture, breathing and foot care.',
      actionLabel: 'Add Training Log',
      actionType: 'add-log',
      status: 'good',
    };
  }

  if (readinessGood && thisWeek.strength + thisWeek.resistance === 0) {
    return {
      sessionType: 'Strength or Resistance',
      reason: 'No strength or resistance session is logged this week and readiness is good.',
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

  if (readinessGood && thisWeek.military === 0) {
    return {
      sessionType: 'Military Skills',
      reason: 'No military skills block is logged this week and readiness is good.',
      suggestion: '45-60 minutes of low-risk field skills: navigation, kit setup, tactical movement, casualty drag mechanics and communication drills.',
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
