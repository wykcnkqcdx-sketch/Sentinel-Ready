import type { TrainingLog } from '@/src/screens/TrainingContext';
import { getDateValue } from './trainingLogCore';
import { buildSummary } from './logQualityUtils';
import { buildReadinessTrend, isFatigueWatch } from './readinessUtils';

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
