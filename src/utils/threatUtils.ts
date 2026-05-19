import type { TrainingLog } from '@/src/screens/TrainingContext';
import { buildWeekSummary, getReadinessNumber, isFatigueWatch } from '@/src/utils/trainingLogUtils';

export type ThreatLevel = 'RED' | 'AMBER' | 'GREEN' | 'CLEAR';

export type Threat = {
  id: string;
  level: 'RED' | 'AMBER' | 'GREEN';
  label: string;
  message: string;
  action: string;
};

export type ThreatAssessment = {
  threats: Threat[];
  overallLevel: ThreatLevel;
  actionableCount: number;
};

function daysSince(dateStr: string): number {
  const then = new Date(dateStr + 'T00:00:00').getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - then) / 86400000);
}

export function buildThreatAssessment(logs: TrainingLog[]): ThreatAssessment {
  if (logs.length === 0) {
    return { threats: [], overallLevel: 'CLEAR', actionableCount: 0 };
  }

  const threats: Threat[] = [];
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  const thisWeek = buildWeekSummary(logs, 0);
  const lastWeek = buildWeekSummary(logs, 1);
  const twoWeeksAgo = buildWeekSummary(logs, 2);

  const thisReadiness = Number(thisWeek.averageReadiness);
  const lastReadiness = Number(lastWeek.averageReadiness);

  // Overtraining trajectory: two consecutive high-load weeks with declining readiness
  if (
    thisWeek.total >= 4 && lastWeek.total >= 4 &&
    thisReadiness > 0 && lastReadiness > 0 &&
    thisReadiness < lastReadiness - 1.5
  ) {
    threats.push({
      id: 'overtraining',
      level: 'RED',
      label: 'OVERTRAINING TRAJECTORY',
      message: 'Two consecutive high-load weeks with declining readiness. Overtraining risk is elevated.',
      action: 'Reduce session volume by 30%. Prioritise sleep and recovery before the next heavy block.',
    });
  }

  // Consecutive fatigue: 3+ of last 5 sessions at readiness ≤5
  const recent5 = sorted.slice(0, 5);
  const recentFatigue = recent5.filter((l) => isFatigueWatch(l.readiness)).length;
  if (recentFatigue >= 3) {
    threats.push({
      id: 'consecutive_fatigue',
      level: 'RED',
      label: 'CONSECUTIVE FATIGUE',
      message: `${recentFatigue} of the last ${recent5.length} sessions logged with readiness ≤5.`,
      action: 'Mandatory deload. No high-intensity sessions until readiness holds above 6.',
    });
  } else if (recentFatigue >= 2) {
    threats.push({
      id: 'fatigue_cluster',
      level: 'AMBER',
      label: 'FATIGUE CLUSTER',
      message: `${recentFatigue} of the last ${recent5.length} sessions showed low readiness. Pattern is building.`,
      action: 'Cap intensity at moderate. Add a recovery or mobility session this week.',
    });
  }

  // Readiness decline velocity: last 3 readings all declining
  const recent3 = sorted
    .slice(0, 3)
    .map((l) => getReadinessNumber(l.readiness))
    .filter((r) => r > 0);
  if (recent3.length === 3 && recent3[0] < recent3[1] && recent3[1] < recent3[2]) {
    const drop = recent3[2] - recent3[0];
    if (drop >= 3) {
      threats.push({
        id: 'readiness_rapid_decline',
        level: 'RED',
        label: 'RAPID READINESS DECLINE',
        message: `Readiness has dropped ${drop} pts across the last 3 sessions. Velocity is unsustainable.`,
        action: 'Initiate recovery protocol. No high RPE sessions. Monitor for 48 hours.',
      });
    } else if (drop >= 1.5) {
      threats.push({
        id: 'readiness_softening',
        level: 'AMBER',
        label: 'READINESS SOFTENING',
        message: `Readiness has declined across the last 3 sessions (↓${drop.toFixed(1)} pts). Monitor trajectory.`,
        action: 'Reduce load and ensure quality sleep before next session.',
      });
    }
  }

  // Recovery deficit: 4+ sessions this week with no recovery/mobility
  if (thisWeek.total >= 4 && thisWeek.recovery === 0) {
    threats.push({
      id: 'recovery_deficit',
      level: 'AMBER',
      label: 'RECOVERY DEFICIT',
      message: `${thisWeek.total} sessions this week with no recovery or mobility logged.`,
      action: 'Schedule a recovery or mobility session before the end of the week.',
    });
  }

  // Deload overdue: 3 consecutive weeks at 4+ sessions
  if (thisWeek.total >= 4 && lastWeek.total >= 4 && twoWeeksAgo.total >= 4) {
    threats.push({
      id: 'deload_overdue',
      level: 'AMBER',
      label: 'DELOAD OVERDUE',
      message: '3+ consecutive high-load weeks without a deload cycle detected.',
      action: 'Plan a deload week: 2–3 sessions at 60% intensity.',
    });
  }

  // Inactivity risk: no sessions in 7+ days
  const daysSinceLast = daysSince(sorted[0].date);
  if (daysSinceLast >= 7) {
    threats.push({
      id: 'inactivity',
      level: 'AMBER',
      label: 'INACTIVITY RISK',
      message: `No sessions logged in ${daysSinceLast} days. Deconditioning risk is building.`,
      action: 'Resume with a low-intensity session. Reassess readiness before increasing load.',
    });
  } else if (daysSinceLast >= 4 && thisWeek.total === 0) {
    threats.push({
      id: 'low_activity',
      level: 'GREEN',
      label: 'LOW ACTIVITY',
      message: `No sessions logged this week. Last session was ${daysSinceLast} days ago.`,
      action: 'Log at least one session this week to maintain base fitness.',
    });
  }

  // Progression opportunity: 3 stable high-load weeks with good readiness
  if (
    thisWeek.total > 0 && lastWeek.total > 0 && twoWeeksAgo.total > 0 &&
    thisWeek.total <= twoWeeksAgo.total &&
    thisReadiness >= 7
  ) {
    threats.push({
      id: 'progression_opportunity',
      level: 'GREEN',
      label: 'PROGRESSION OPPORTUNITY',
      message: 'Load volume stable for 3 weeks with readiness holding above 7.',
      action: 'Consider adding one session or a 5–10% load increase next week.',
    });
  }

  const hasRed = threats.some((t) => t.level === 'RED');
  const hasAmber = threats.some((t) => t.level === 'AMBER');
  const overallLevel: ThreatLevel = hasRed ? 'RED' : hasAmber ? 'AMBER' : threats.length > 0 ? 'GREEN' : 'CLEAR';
  const actionableCount = threats.filter((t) => t.level !== 'GREEN').length;

  return { threats, overallLevel, actionableCount };
}
