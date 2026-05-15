import type { TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';
import { buildTrainingBalance } from '@/src/utils/balanceUtils';
import { buildMissionBrief } from '@/src/utils/missionBriefUtils';
import { getNoteStarter } from '@/src/utils/trainingLogUtils';

export type SmartLogDraft = Omit<TrainingLog, 'id'>;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function buildSmartLogDraft(
  logs: TrainingLog[],
  goals: TrainingGoal[] = [],
  profile: { injuryNotes?: string } = {}
): SmartLogDraft {
  const mission = buildMissionBrief(logs, goals, profile);
  const balance = buildTrainingBalance(logs);
  const activeGoal = goals.find((goal) => goal.status === 'active');

  if (mission.status === 'red') {
    return {
      date: today(),
      category: 'Recovery',
      type: 'Active Recovery',
      duration: '25 minutes',
      distanceLoad: 'Mobility - easy walk - breathing',
      readiness: '5',
      notes: `${getNoteStarter('Recovery')} Mission brief: ${mission.title}.`,
    };
  }

  if (balance.status === 'gap') {
    if (balance.gaps.includes('No recovery or mobility')) {
      return {
        date: today(),
        category: 'Mobility',
        type: 'Mobility Reset',
        duration: '25 minutes',
        distanceLoad: 'Hips - calves - hamstrings - shoulders',
        readiness: '7',
        notes: getNoteStarter('Mobility'),
      };
    }

    if (balance.gaps.includes('No strength')) {
      return {
        date: today(),
        category: 'Strength',
        type: 'Full Body Strength',
        duration: '50 minutes',
        distanceLoad: 'Squat - Press - Pull - Hinge - Carry',
        readiness: '7',
        notes: getNoteStarter('Strength'),
      };
    }
  }

  if (activeGoal?.category === 'Run') {
    return {
      date: today(),
      category: 'Run',
      type: 'Goal Run Session',
      duration: '35 minutes',
      distanceLoad: activeGoal.current || '5 km',
      readiness: '7',
      notes: `Goal focus: ${activeGoal.title}. ${getNoteStarter('Run')}`,
    };
  }

  if (activeGoal?.category === 'Strength') {
    return {
      date: today(),
      category: 'Strength',
      type: 'Goal Strength Session',
      duration: '50 minutes',
      distanceLoad: activeGoal.current || 'Main lift - assistance - carry',
      readiness: '7',
      notes: `Goal focus: ${activeGoal.title}. ${getNoteStarter('Strength')}`,
    };
  }

  if (activeGoal?.category === 'Test') {
    return {
      date: today(),
      category: 'Test',
      type: 'Controlled Test Practice',
      duration: '40 minutes',
      distanceLoad: activeGoal.current || 'Practice result',
      readiness: '8',
      notes: `Goal focus: ${activeGoal.title}. ${getNoteStarter('Test')}`,
    };
  }

  return {
    date: today(),
    category: 'Ruck',
    type: activeGoal?.category === 'Ruck' ? 'Goal Ruck Session' : 'Loaded Ruck',
    duration: '60 minutes',
    distanceLoad: activeGoal?.current || '6 km with 15 kg',
    readiness: '7',
    notes: activeGoal
      ? `Goal focus: ${activeGoal.title}. ${getNoteStarter('Ruck')}`
      : getNoteStarter('Ruck'),
  };
}
