import type { TrainingGoal, TrainingLog } from '@/src/screens/TrainingContext';
import type { TrainingProfileInput } from '@/src/utils/trainingLogUtils';
import { buildRecoveryDebt } from '@/src/utils/recoveryUtils';
import { buildTrainingBalance } from '@/src/utils/balanceUtils';
import { buildWeeklyLoadRisk, buildWeekPlan, getReadinessNumber } from '@/src/utils/trainingLogUtils';

export type ForecastStatus = 'green' | 'amber' | 'red';

export type ForecastDay = {
  day: string;
  focus: string;
  status: ForecastStatus;
  message: string;
};

export type ReadinessForecast = {
  status: ForecastStatus;
  label: string;
  summary: string;
  days: ForecastDay[];
};

function statusFromScore(score: number): ForecastStatus {
  if (score < 55) return 'red';
  if (score < 75) return 'amber';
  return 'green';
}

export function buildReadinessForecast(
  logs: TrainingLog[],
  goals: TrainingGoal[] = [],
  profile: TrainingProfileInput = {}
): ReadinessForecast {
  const plan = buildWeekPlan(logs, goals, profile);
  const recoveryDebt = buildRecoveryDebt(logs, profile.injuryNotes ?? '');
  const balance = buildTrainingBalance(logs);
  const loadRisk = buildWeeklyLoadRisk(logs);
  const latestReadiness = logs.length > 0 ? getReadinessNumber(logs[0].readiness) : 0;

  let baseScore = latestReadiness > 0 ? latestReadiness * 10 : 65;
  if (recoveryDebt.status === 'red') baseScore -= 25;
  if (recoveryDebt.status === 'amber') baseScore -= 12;
  if (balance.status === 'overload') baseScore -= 15;
  if (balance.status === 'gap') baseScore -= 5;
  if (loadRisk.status === 'high') baseScore -= 20;
  if (loadRisk.status === 'moderate') baseScore -= 8;

  const days = plan.days.map((day, index) => {
    let score = baseScore;
    if (day.intensity === 'High') score -= 12;
    if (day.intensity === 'Moderate') score -= 6;
    if (day.intensity === 'Low') score += 6;
    if (day.intensity === 'Rest') score += 12;
    score += index * 2;

    const status = statusFromScore(Math.max(0, Math.min(100, score)));
    const message =
      status === 'red' ? 'Keep this low intensity or convert to recovery.'
      : status === 'amber' ? 'Train controlled and avoid extra volume.'
      : 'Ready for planned work if warm-up feels normal.';

    return {
      day: day.day,
      focus: day.focus,
      status,
      message,
    };
  });

  const redDays = days.filter((day) => day.status === 'red').length;
  const amberDays = days.filter((day) => day.status === 'amber').length;
  const status = redDays > 0 ? 'red' : amberDays >= 3 ? 'amber' : 'green';

  return {
    status,
    label: status === 'red' ? 'Recovery Priority' : status === 'amber' ? 'Controlled Week' : 'Ready Week',
    summary:
      status === 'red' ? 'Forecast shows at least one high-risk day. Reduce load before progressing.'
      : status === 'amber' ? 'Forecast is workable, but several days need controlled intensity.'
      : 'Forecast supports the planned week. Keep progression controlled.',
    days,
  };
}
