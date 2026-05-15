import type { DfiftStandards } from '@/src/types/dfift';
import type { Gender } from '@/src/screens/UserContext';
import type { GoalCategory, TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';
import { buildTrainingBalance } from '@/src/utils/balanceUtils';
import { buildDfiftSnapshot } from '@/src/utils/dfiftUtils';
import { buildPerformanceSnapshot } from '@/src/utils/trainingLogUtils';

export type GoalSuggestion = {
  category: GoalCategory;
  title: string;
  target: string;
  current: string;
  notes: string;
  reason: string;
};

function hasActiveCategory(goals: TrainingGoal[], category: GoalCategory) {
  return goals.some((goal) => goal.status === 'active' && goal.category === category);
}

export function buildGoalSuggestions(
  logs: TrainingLog[],
  goals: TrainingGoal[] = [],
  dfift?: { standards: DfiftStandards; gender: Gender }
): GoalSuggestion[] {
  const suggestions: GoalSuggestion[] = [];
  const balance = buildTrainingBalance(logs);
  const performance = buildPerformanceSnapshot(logs);

  if (dfift) {
    const snapshot = buildDfiftSnapshot(logs, dfift.standards, dfift.gender);
    if (snapshot.weakPoint && !hasActiveCategory(goals, 'Test')) {
      suggestions.push({
        category: 'Test',
        title: `${snapshot.weakPoint.label} standard`,
        target: snapshot.weakPoint.standard,
        current: snapshot.weakPoint.result ?? 'No result logged',
        notes: snapshot.recommendation,
        reason: `DFIFT weak point: ${snapshot.weakPoint.label}`,
      });
    }
  }

  if (balance.gaps.includes('No recovery or mobility') && !hasActiveCategory(goals, 'Recovery')) {
    suggestions.push({
      category: 'Recovery',
      title: 'Weekly recovery consistency',
      target: '1-2 recovery or mobility sessions per week',
      current: 'No recovery or mobility logged this week',
      notes: 'Use recovery work to keep progression sustainable.',
      reason: 'Training balance gap detected',
    });
  }

  if (balance.gaps.includes('No strength') && !hasActiveCategory(goals, 'Strength')) {
    suggestions.push({
      category: 'Strength',
      title: 'Strength base',
      target: '2 full-body strength sessions per week',
      current: 'No strength logged this week',
      notes: 'Cover squat, press, pull, hinge and carry patterns.',
      reason: 'Strength gap detected',
    });
  }

  if (performance.bestRuckDistanceKm > 0 && !hasActiveCategory(goals, 'Ruck')) {
    const target = Math.ceil(performance.bestRuckDistanceKm + 2);
    suggestions.push({
      category: 'Ruck',
      title: `${target} km ruck progression`,
      target: `${target} km with controlled load`,
      current: `${performance.bestRuckDistanceKm} km best logged ruck`,
      notes: 'Progress distance only if readiness is stable and foot condition is good.',
      reason: 'Ruck performance baseline available',
    });
  }

  if (performance.bestRunDistanceKm > 0 && !hasActiveCategory(goals, 'Run')) {
    const target = Math.ceil(performance.bestRunDistanceKm + 1);
    suggestions.push({
      category: 'Run',
      title: `${target} km aerobic base`,
      target: `${target} km steady run`,
      current: `${performance.bestRunDistanceKm} km best logged run`,
      notes: 'Build aerobic base without chasing speed every session.',
      reason: 'Run performance baseline available',
    });
  }

  if (!hasActiveCategory(goals, 'Consistency')) {
    suggestions.push({
      category: 'Consistency',
      title: 'Four quality sessions weekly',
      target: '4 sessions per week with one recovery entry',
      current: `${performance.currentWeekSessions} sessions this week`,
      notes: 'Anchor training around consistency before adding intensity.',
      reason: 'Consistency keeps the plan reliable',
    });
  }

  return suggestions.slice(0, 3);
}
