import type { TrainingLog } from '@/src/screens/TrainingContext';
import { getReadinessNumber } from '@/src/utils/trainingLogUtils';

export type AcwrStatus = 'no-data' | 'low' | 'optimal' | 'caution' | 'high-risk';

export type AcwrResult = {
  atl: number;
  ctl: number;
  ratio: number;
  status: AcwrStatus;
  label: string;
  message: string;
  action: string;
};

function sessionLoad(log: TrainingLog): number {
  const r = getReadinessNumber(log.readiness);
  if (r === 0) return 50;
  if (r <= 3) return 90;
  if (r <= 5) return 70;
  if (r <= 7) return 50;
  return 35;
}

export function buildAcwr(logs: TrainingLog[]): AcwrResult {
  const now = new Date().setHours(0, 0, 0, 0);
  const DAY_MS = 86_400_000;

  const workLogs = logs.filter(
    (l) => l.category !== 'Recovery' && l.category !== 'Mobility'
  );

  let atlTotal = 0;
  let ctlTotal = 0;
  let hasRecent = false;

  for (const log of workLogs) {
    const logTime = new Date(log.date + 'T00:00:00').getTime();
    const daysAgo = (now - logTime) / DAY_MS;
    if (daysAgo < 0 || daysAgo > 28) continue;
    const load = sessionLoad(log);
    if (daysAgo <= 7) { atlTotal += load; hasRecent = true; }
    ctlTotal += load;
  }

  if (!hasRecent && ctlTotal === 0) {
    return {
      atl: 0, ctl: 0, ratio: 0,
      status: 'no-data',
      label: 'No Data',
      message: 'Log training sessions over 4+ weeks to calculate your workload ratio.',
      action: 'Start logging sessions with readiness scores.',
    };
  }

  const atl = atlTotal / 7;
  const ctl = ctlTotal / 28;
  const ratio = ctl > 0 ? Math.round((atl / ctl) * 100) / 100 : 0;

  let status: AcwrStatus;
  let label: string;
  let message: string;
  let action: string;

  if (ratio === 0) {
    status = 'low';
    label = 'Underloaded';
    message = 'No recent training load. Fitness adaptations may be declining.';
    action = 'Return to training gradually. Avoid jumping straight to high intensity.';
  } else if (ratio < 0.8) {
    status = 'low';
    label = 'Underloaded';
    message = 'Acute load is well below your chronic baseline. Undertraining risk.';
    action = 'Gradually increase volume or intensity to restore training stimulus.';
  } else if (ratio <= 1.3) {
    status = 'optimal';
    label = 'Optimal Zone';
    message = 'Current workload is well matched to your training base. Low injury risk.';
    action = 'Maintain this progression. Increase load by no more than 10% per week.';
  } else if (ratio <= 1.5) {
    status = 'caution';
    label = 'Spike Risk';
    message = 'Recent load is significantly higher than your baseline. Manage fatigue closely.';
    action = 'Hold or reduce volume this week. Prioritise sleep and recovery sessions.';
  } else {
    status = 'high-risk';
    label = 'High Risk';
    message = 'Acute load far exceeds chronic baseline. Injury risk is elevated.';
    action = 'Reduce training load immediately. Do not add volume or intensity this week.';
  }

  return { atl: Math.round(atl), ctl: Math.round(ctl), ratio, status, label, message, action };
}
