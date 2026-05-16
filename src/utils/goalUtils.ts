import type { GoalCategory, TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';
import { getDateValue } from './trainingLogCore';
import { buildReadinessTrend, isFatigueWatch } from './readinessUtils';
import type { RecommendationStatus } from './recommendationUtils';
import { buildWeekSummary } from './weeklyLoadUtils';

export type GoalSummary = {
  active: number;
  complete: number;
  priority: TrainingGoal | null;
  byCategory: Record<GoalCategory, number>;
  averageProgress: number;
  message: string;
};

export type GoalProgress = {
  percent: number;
  label: string;
  hasNumericProgress: boolean;
};

export type GoalAction = {
  title: string;
  reason: string;
  action: string;
  status: RecommendationStatus;
};

export type PerformanceSnapshot = {
  totalSessions: number;
  currentWeekSessions: number;
  averageReadiness: string;
  bestRuckDistanceKm: number;
  bestRunDistanceKm: number;
  longestSessionMinutes: number;
  consistencyLabel: string;
  highlight: string;
};

export function buildGoalSummary(goals: TrainingGoal[]): GoalSummary {
  const activeGoals = goals.filter((goal) => goal.status === 'active');
  const completeGoals = goals.filter((goal) => goal.status === 'complete');
  const byCategory = goals.reduce<Record<GoalCategory, number>>((counts, goal) => {
    counts[goal.category] = (counts[goal.category] ?? 0) + 1;
    return counts;
  }, {
    Ruck: 0,
    Run: 0,
    Strength: 0,
    Recovery: 0,
    Test: 0,
    Consistency: 0,
  });

  const datedGoals = activeGoals
    .filter((goal) => /^\d{4}-\d{2}-\d{2}$/.test(goal.deadline))
    .sort((a, b) => getDateValue(a.deadline) - getDateValue(b.deadline));
  const priority = datedGoals[0] ?? activeGoals[0] ?? null;
  const numericProgress = activeGoals
    .map((goal) => getGoalProgress(goal))
    .filter((progress) => progress.hasNumericProgress);
  const averageProgress = numericProgress.length > 0
    ? Math.round(numericProgress.reduce((sum, progress) => sum + progress.percent, 0) / numericProgress.length)
    : 0;

  return {
    active: activeGoals.length,
    complete: completeGoals.length,
    priority,
    byCategory,
    averageProgress,
    message: priority
      ? `Priority: ${priority.title}. Target ${priority.target}.`
      : completeGoals.length > 0
        ? 'All goals are complete. Add the next target when ready.'
        : 'Set one active goal to anchor the next plan.',
  };
}

function getFirstNumber(value: string) {
  const match = value.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

export function getGoalProgress(goal: TrainingGoal): GoalProgress {
  if (goal.status === 'complete') {
    return { percent: 100, label: 'Complete', hasNumericProgress: true };
  }

  const current = getFirstNumber(goal.current);
  const target = getFirstNumber(goal.target);

  if (current > 0 && target > 0) {
    const percent = Math.max(0, Math.min(100, Math.round((current / target) * 100)));
    return {
      percent,
      label: `${percent}% toward target`,
      hasNumericProgress: true,
    };
  }

  return {
    percent: 0,
    label: goal.current.trim() ? goal.current.trim() : 'Progress not quantified',
    hasNumericProgress: false,
  };
}

export function buildGoalAction(goals: TrainingGoal[], logs: TrainingLog[]): GoalAction {
  const summary = buildGoalSummary(goals);
  const priority = summary.priority;

  if (!priority) {
    return {
      title: 'Set Priority Goal',
      reason: 'No active goal is available to guide the next training decision.',
      action: 'Create one specific goal with a target and current status.',
      status: 'neutral',
    };
  }

  const recentLogs = [...logs]
    .sort((a, b) => getDateValue(b.date) - getDateValue(a.date) || b.id - a.id)
    .slice(0, 5);
  const recentFatigue = recentLogs.filter((log) => isFatigueWatch(log.readiness)).length;
  const trend = buildReadinessTrend(logs);
  const progress = getGoalProgress(priority);

  if (recentFatigue >= 2 || trend.status === 'warning') {
    return {
      title: 'Protect Readiness',
      reason: `Priority goal is ${priority.title}, but recent fatigue risk is elevated.`,
      action: 'Use recovery or low-intensity work before pushing goal progress again.',
      status: 'warning',
    };
  }

  if (priority.category === 'Ruck') {
    return {
      title: 'Goal Ruck Session',
      reason: progress.hasNumericProgress ? `${progress.label} on ${priority.title}.` : `Priority goal is ${priority.title}.`,
      action: 'Plan a controlled ruck. Progress only distance, load or pace, not all three.',
      status: progress.percent >= 80 ? 'good' : 'neutral',
    };
  }

  if (priority.category === 'Run') {
    return {
      title: 'Goal Run Session',
      reason: progress.hasNumericProgress ? `${progress.label} on ${priority.title}.` : `Priority goal is ${priority.title}.`,
      action: 'Use a steady run or tempo segment that supports the target.',
      status: progress.percent >= 80 ? 'good' : 'neutral',
    };
  }

  return {
    title: 'Goal Session',
    reason: progress.hasNumericProgress ? `${progress.label} on ${priority.title}.` : `Priority goal is ${priority.title}.`,
    action: 'Focus your next session on this priority goal.',
    status: progress.percent >= 80 ? 'good' : 'neutral',
  };
}

export function buildPerformanceSnapshot(logs: TrainingLog[]): PerformanceSnapshot {
  const thisWeek = buildWeekSummary(logs, 0);
  const totalSessions = logs.length;
  const currentWeekSessions = thisWeek.total;

  const ruckLogs = logs.filter((log) => log.category === 'Ruck');
  const runLogs = logs.filter((log) => log.category === 'Run');

  const bestRuckDistanceKm = ruckLogs.reduce((max, log) => {
    const km = getFirstNumber(log.distanceLoad);
    return km > max ? km : max;
  }, 0);

  const bestRunDistanceKm = runLogs.reduce((max, log) => {
    const km = getFirstNumber(log.distanceLoad);
    return km > max ? km : max;
  }, 0);

  const longestSessionMinutes = logs.reduce((max, log) => {
    const mins = getFirstNumber(log.duration);
    return mins > max ? mins : max;
  }, 0);

  let consistencyLabel = 'Building';
  let highlight = 'Keep logging sessions to build a consistent habit.';

  if (currentWeekSessions >= 4) {
    consistencyLabel = 'On target';
    highlight = 'Weekly consistency target is on track.';
  } else if (totalSessions >= 10) {
    consistencyLabel = 'Established';
    highlight = 'You have a solid base of logged sessions.';
  }

  return {
    totalSessions,
    currentWeekSessions,
    averageReadiness: thisWeek.averageReadiness,
    bestRuckDistanceKm,
    bestRunDistanceKm,
    longestSessionMinutes,
    consistencyLabel,
    highlight,
  };
}
