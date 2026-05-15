import type { TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';
import { buildTrainingBalance } from '@/src/utils/balanceUtils';
import { buildRecoveryDebt } from '@/src/utils/recoveryUtils';
import {
  buildGoalAction,
  buildReadinessTrend,
  buildWeeklyLoadRisk,
  calculateTrainingLogHealthScore,
} from '@/src/utils/trainingLogUtils';

export type MissionBriefStatus = 'green' | 'amber' | 'red' | 'no-data';

export type MissionBrief = {
  status: MissionBriefStatus;
  title: string;
  summary: string;
  primaryAction: string;
  secondaryAction: string;
  reasons: string[];
};

export function buildMissionBrief(
  logs: TrainingLog[],
  goals: TrainingGoal[] = [],
  profile: { injuryNotes?: string } = {}
): MissionBrief {
  if (logs.length === 0) {
    return {
      status: 'no-data',
      title: 'Build Baseline',
      summary: 'No training logs are available yet.',
      primaryAction: 'Log your next session with duration, load, readiness and useful notes.',
      secondaryAction: 'Set one goal so the plan can prioritise your next training block.',
      reasons: ['No logs recorded'],
    };
  }

  const trend = buildReadinessTrend(logs);
  const loadRisk = buildWeeklyLoadRisk(logs);
  const recoveryDebt = buildRecoveryDebt(logs, profile.injuryNotes ?? '');
  const balance = buildTrainingBalance(logs);
  const goalAction = buildGoalAction(goals, logs);
  const healthScore = calculateTrainingLogHealthScore(logs);

  const reasons: string[] = [];
  if (trend.status === 'warning') reasons.push('Readiness trend is dropping');
  if (loadRisk.status === 'high') reasons.push('Weekly load risk is high');
  if (recoveryDebt.status === 'red') reasons.push('Recovery debt is high');
  if (balance.status === 'overload') reasons.push('Training split shows overload risk');
  if (healthScore < 60) reasons.push('Training log quality needs work');

  if (recoveryDebt.status === 'red' || loadRisk.status === 'high') {
    return {
      status: 'red',
      title: 'Reduce Load Today',
      summary: 'Fatigue or load risk is elevated. Protect readiness before chasing progression.',
      primaryAction: recoveryDebt.action,
      secondaryAction: 'Keep any training low intensity and update your log with recovery notes.',
      reasons: reasons.length > 0 ? reasons : ['Recovery or load risk elevated'],
    };
  }

  if (trend.status === 'warning' || recoveryDebt.status === 'amber' || balance.status === 'overload') {
    return {
      status: 'amber',
      title: 'Controlled Training',
      summary: 'You can train, but progression should stay conservative today.',
      primaryAction: balance.status === 'overload' ? balance.nextFocus : recoveryDebt.action,
      secondaryAction: goalAction.action,
      reasons: reasons.length > 0 ? reasons : ['Readiness needs monitoring'],
    };
  }

  if (balance.status === 'gap') {
    return {
      status: 'amber',
      title: 'Fill the Split',
      summary: 'Readiness is usable, but this week is missing a key training pillar.',
      primaryAction: balance.nextFocus,
      secondaryAction: goalAction.action,
      reasons: balance.gaps,
    };
  }

  return {
    status: 'green',
    title: 'Ready to Execute',
    summary: 'Readiness, recovery and weekly balance are controlled.',
    primaryAction: goalAction.action,
    secondaryAction: 'Progress one variable only and log the session clearly afterward.',
    reasons: ['Load, recovery and split are controlled'],
  };
}
