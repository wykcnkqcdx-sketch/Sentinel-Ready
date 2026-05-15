import type { TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';
import { buildDfiftSnapshot } from '@/src/utils/dfiftUtils';
import type { DfiftStandards } from '@/src/types/dfift';
import type { Gender } from '@/src/screens/UserContext';
import {
  buildGoalSummary,
  buildPerformanceSnapshot,
  buildWeekSummary,
  calculateTrainingLogHealthScore,
} from '@/src/utils/trainingLogUtils';

export type Milestone = {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  progress: number;
};

export function buildMilestones(
  logs: TrainingLog[],
  goals: TrainingGoal[] = [],
  dfift?: { standards: DfiftStandards; gender: Gender }
): Milestone[] {
  const week = buildWeekSummary(logs, 0);
  const performance = buildPerformanceSnapshot(logs);
  const goalSummary = buildGoalSummary(goals);
  const healthScore = calculateTrainingLogHealthScore(logs);
  const recoveryCount = logs.filter((log) => log.category === 'Recovery' || log.category === 'Mobility').length;
  const dfiftSnapshot = dfift ? buildDfiftSnapshot(logs, dfift.standards, dfift.gender) : null;

  const milestones: Milestone[] = [
    {
      id: 'first-log',
      title: 'First Log',
      description: 'Record your first training session.',
      earned: logs.length >= 1,
      progress: Math.min(100, logs.length * 100),
    },
    {
      id: 'first-ruck',
      title: 'First Ruck',
      description: 'Log one loaded ruck session.',
      earned: performance.bestRuckDistanceKm > 0,
      progress: performance.bestRuckDistanceKm > 0 ? 100 : 0,
    },
    {
      id: 'weekly-consistency',
      title: 'Consistency Week',
      description: 'Log four sessions in the current week.',
      earned: week.total >= 4,
      progress: Math.min(100, Math.round((week.total / 4) * 100)),
    },
    {
      id: 'recovery-discipline',
      title: 'Recovery Discipline',
      description: 'Log recovery or mobility work.',
      earned: recoveryCount >= 1,
      progress: recoveryCount >= 1 ? 100 : 0,
    },
    {
      id: 'goal-setter',
      title: 'Goal Setter',
      description: 'Keep at least one active goal.',
      earned: goalSummary.active >= 1,
      progress: goalSummary.active >= 1 ? 100 : 0,
    },
    {
      id: 'clean-data',
      title: 'Clean Data',
      description: 'Reach 80+ training log health.',
      earned: healthScore >= 80,
      progress: Math.min(100, healthScore),
    },
  ];

  if (dfiftSnapshot) {
    milestones.push({
      id: 'dfift-baseline',
      title: 'DFIFT Baseline',
      description: 'Log all four DFIFT reference events.',
      earned: dfiftSnapshot.loggedEvents >= dfiftSnapshot.rows.length,
      progress: Math.min(100, Math.round((dfiftSnapshot.loggedEvents / dfiftSnapshot.rows.length) * 100)),
    });
  }

  return milestones;
}

export function getEarnedMilestones(milestones: Milestone[]) {
  return milestones.filter((milestone) => milestone.earned);
}

export function getNextMilestone(milestones: Milestone[]) {
  return [...milestones]
    .filter((milestone) => !milestone.earned)
    .sort((a, b) => b.progress - a.progress)[0] ?? null;
}
