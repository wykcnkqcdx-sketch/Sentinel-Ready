import type { TrainingLog } from '@/src/screens/TrainingContext';
import {
  buildReadinessTrend,
  buildWeekSummary,
  calculateTrainingLogHealthScore,
  getDateValue,
  getReadinessNumber,
  getWeakLogReasons,
  isFatigueWatch,
} from '@/src/utils/trainingLogUtils';

export type TrainingInsight = {
  title: string;
  message: string;
  severity: 'good' | 'caution' | 'warning' | 'neutral';
};

function averageReadiness(logs: TrainingLog[]) {
  const scores = logs.map((log) => getReadinessNumber(log.readiness)).filter((score) => score > 0);
  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function buildTrainingInsights(logs: TrainingLog[]): TrainingInsight[] {
  if (logs.length === 0) {
    return [{
      title: 'No patterns yet',
      message: 'Add a few logs to start seeing training insights.',
      severity: 'neutral',
    }];
  }

  const sorted = [...logs].sort((a, b) => getDateValue(b.date) - getDateValue(a.date) || b.id - a.id);
  const recent = sorted.slice(0, 7);
  const trend = buildReadinessTrend(logs);
  const thisWeek = buildWeekSummary(logs, 0);
  const healthScore = calculateTrainingLogHealthScore(logs);
  const insights: TrainingInsight[] = [];

  if (trend.status === 'warning') {
    insights.push({
      title: 'Readiness is dropping',
      message: `Latest readiness is ${trend.latest}/10, down from ${trend.previous}/10. Hold intensity until the next score stabilises.`,
      severity: 'warning',
    });
  } else if (trend.status === 'good') {
    insights.push({
      title: 'Readiness is improving',
      message: `Latest readiness is ${trend.latest}/10. Progress one variable only if warm-up feels normal.`,
      severity: 'good',
    });
  }

  const ruckLogs = recent.filter((log) => log.category === 'Ruck');
  const ruckAverage = averageReadiness(ruckLogs);
  if (ruckLogs.length >= 2 && ruckAverage > 0 && ruckAverage < 6) {
    insights.push({
      title: 'Ruck fatigue pattern',
      message: 'Recent ruck sessions are averaging below 6/10 readiness. Hold load and add recovery before the next ruck progression.',
      severity: 'warning',
    });
  }

  const weakLogs = sorted.filter((log) => getWeakLogReasons(log).length > 0);
  if (weakLogs.length > 0 && healthScore < 70) {
    insights.push({
      title: 'Log detail is limiting guidance',
      message: `${weakLogs.length} logs need stronger detail. Fix notes, duration, load or readiness to improve recommendations.`,
      severity: 'caution',
    });
  }

  if (thisWeek.total >= 4 && thisWeek.fatigueWatch === 0) {
    insights.push({
      title: 'Consistency is on track',
      message: 'This week has at least four sessions and no fatigue-watch entries.',
      severity: 'good',
    });
  }

  if (thisWeek.total >= 3 && thisWeek.recovery + thisWeek.mobility === 0) {
    insights.push({
      title: 'Recovery is missing',
      message: 'Training volume is building without a recovery or mobility entry this week.',
      severity: 'caution',
    });
  }

  const fatigueCount = recent.filter((log) => isFatigueWatch(log.readiness)).length;
  if (fatigueCount >= 2) {
    insights.push({
      title: 'Fatigue is clustering',
      message: `${fatigueCount} of the last ${recent.length} logs are fatigue-watch sessions.`,
      severity: 'warning',
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: 'Training pattern is stable',
      message: 'No major risk pattern detected. Keep logging consistently and progress conservatively.',
      severity: 'neutral',
    });
  }

  return insights.slice(0, 4);
}
