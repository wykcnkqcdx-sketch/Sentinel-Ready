import type { TrainingLog } from '@/src/screens/TrainingContext';
import {
  buildReadinessTrend,
  buildWeekSummary,
  getDateValue,
  getReadinessNumber,
  isFatigueWatch,
} from '@/src/utils/trainingLogUtils';

export type RecoveryDebtStatus = 'green' | 'amber' | 'red' | 'no-data';

export type RecoveryDebt = {
  score: number;
  status: RecoveryDebtStatus;
  label: string;
  message: string;
  action: string;
  factors: string[];
  daysSinceRecovery: number | null;
};

function daysSince(dateStr: string, now: Date = new Date()): number {
  const then = new Date(dateStr + 'T00:00:00').getTime();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - then) / 86400000);
}

export function buildRecoveryDebt(logs: TrainingLog[], injuryNotes: string = '', now: Date = new Date()): RecoveryDebt {
  const sorted = [...logs].sort((a, b) => getDateValue(b.date) - getDateValue(a.date) || b.id - a.id);
  const recent = sorted.slice(0, 7);

  if (recent.length === 0) {
    return {
      score: 0,
      status: 'no-data',
      label: 'No Data',
      message: 'Log sessions with readiness scores to calculate recovery debt.',
      action: 'Add a training or recovery log after your next session.',
      factors: ['No recent logs'],
      daysSinceRecovery: null,
    };
  }

  const thisWeek = buildWeekSummary(logs, 0);
  const trend = buildReadinessTrend(logs);
  const latestRecovery = sorted.find((log) => log.category === 'Recovery' || log.category === 'Mobility');
  const daysSinceRecovery = latestRecovery ? daysSince(latestRecovery.date, now) : null;
  const recentFatigue = recent.filter((log) => isFatigueWatch(log.readiness)).length;
  const averageReadiness = recent.reduce((sum, log) => sum + getReadinessNumber(log.readiness), 0) / recent.length;
  const factors: string[] = [];

  let score = 100;
  if (averageReadiness < 6) {
    score -= 25;
    factors.push('Recent readiness average below 6');
  }
  if (recentFatigue >= 2) {
    score -= 25;
    factors.push('Multiple recent fatigue-watch sessions');
  } else if (recentFatigue === 1) {
    score -= 10;
    factors.push('One recent fatigue-watch session');
  }
  if (trend.status === 'warning') {
    score -= 20;
    factors.push('Readiness trend dropping');
  }
  if (thisWeek.total >= 4 && thisWeek.recovery === 0 && thisWeek.mobility === 0) {
    score -= 15;
    factors.push('No recovery or mobility logged this week');
  }
  if (daysSinceRecovery === null) {
    score -= 10;
    factors.push('No recovery session logged');
  } else if (daysSinceRecovery > 5) {
    score -= 10;
    factors.push(`No recovery session in ${daysSinceRecovery} days`);
  }
  if (injuryNotes.trim().length > 0) {
    score -= 10;
    factors.push('Injury note present in profile');
  }

  score = Math.max(0, Math.min(100, score));

  if (score < 50) {
    return {
      score,
      status: 'red',
      label: 'High Debt',
      message: 'Recovery debt is elevated. Training should be reduced until readiness stabilises.',
      action: 'Take a rest or active recovery day, prioritise sleep, and avoid ruck/run progression.',
      factors,
      daysSinceRecovery,
    };
  }

  if (score < 75) {
    return {
      score,
      status: 'amber',
      label: 'Moderate Debt',
      message: 'Recovery debt is building. Keep intensity controlled and add recovery work.',
      action: 'Add 20-30 minutes of mobility or easy walking before the next hard session.',
      factors: factors.length > 0 ? factors : ['Load is manageable but worth monitoring'],
      daysSinceRecovery,
    };
  }

  return {
    score,
    status: 'green',
    label: 'Controlled',
    message: 'Recovery debt is controlled. Progress carefully and keep logging recovery quality.',
    action: 'Maintain current recovery habits and progress only one training variable at a time.',
    factors: factors.length > 0 ? factors : ['Readiness and recovery balance look controlled'],
    daysSinceRecovery,
  };
}
