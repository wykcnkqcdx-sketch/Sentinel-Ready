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

  if (balance.gaps.includes('No load carriage') && !hasActiveCategory(goals, 'Ruck')) {
    suggestions.push({
      category: 'Ruck',
      title: 'Load-carriage base',
      target: '1 controlled ruck or loaded hike per week',
      current: 'No load-carriage session logged this week',
      notes: 'Build pack tolerance, foot care and posture before increasing distance or load.',
      reason: 'Load-carriage gap detected',
    });
  }

  if (balance.gaps.includes('No strength or resistance') && !hasActiveCategory(goals, 'Strength')) {
    suggestions.push({
      category: 'Strength',
      title: 'Strength base',
      target: '2 full-body strength sessions per week',
      current: 'No strength or resistance logged this week',
      notes: 'Cover squat, press, pull, hinge and carry patterns.',
      reason: 'Strength gap detected',
    });
  }

  if (balance.gaps.includes('No strength or resistance') && !hasActiveCategory(goals, 'Resistance')) {
    suggestions.push({
      category: 'Resistance',
      title: 'Resistance circuit capacity',
      target: '1 push-pull-core-carry circuit per week',
      current: 'No resistance circuit logged this week',
      notes: 'Use controlled circuits to build repeated-effort capacity without turning every session into a max test.',
      reason: 'Resistance training gap detected',
    });
  }

  if (balance.gaps.includes('No aerobic or hiking') && !hasActiveCategory(goals, 'Hiking')) {
    suggestions.push({
      category: 'Hiking',
      title: 'Terrain movement base',
      target: '1 terrain hike per week',
      current: 'No hiking or terrain session logged this week',
      notes: 'Practise climbs, descents, footing, fueling, navigation pauses and foot checks.',
      reason: 'Terrain movement gap detected',
    });
  }

  if (balance.gaps.includes('No military skills') && !hasActiveCategory(goals, 'Military')) {
    suggestions.push({
      category: 'Military',
      title: 'Field skills consistency',
      target: '1 low-risk military skills block per week',
      current: 'No military skills block logged this week',
      notes: 'Practise navigation, kit setup, tactical movement, communication and casualty-drag mechanics.',
      reason: 'Military skills gap detected',
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
