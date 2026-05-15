import type { TrainingLog } from '@/src/screens/TrainingContext';
import { getDateValue, isFatigueWatch } from '@/src/utils/trainingLogUtils';

export type InjuryWatchStatus = 'clear' | 'monitor' | 'high' | 'no-data';

export type InjuryWatch = {
  status: InjuryWatchStatus;
  label: string;
  score: number;
  message: string;
  action: string;
  flags: string[];
  flaggedLogs: TrainingLog[];
};

const KEYWORDS = [
  'pain',
  'ache',
  'sore',
  'soreness',
  'tight',
  'tightness',
  'hot spot',
  'hotspot',
  'blister',
  'shin',
  'knee',
  'ankle',
  'calf',
  'hip',
  'back',
  'limp',
];

function findFlags(notes: string) {
  const clean = notes.toLowerCase();
  return KEYWORDS.filter((keyword) => clean.includes(keyword));
}

export function buildInjuryWatch(logs: TrainingLog[], profileInjuryNotes: string = ''): InjuryWatch {
  const sorted = [...logs].sort((a, b) => getDateValue(b.date) - getDateValue(a.date) || b.id - a.id);
  const recent = sorted.slice(0, 10);

  if (recent.length === 0 && profileInjuryNotes.trim().length === 0) {
    return {
      status: 'no-data',
      label: 'No Data',
      score: 0,
      message: 'No logs or profile injury notes available for injury watch.',
      action: 'Record any pain, soreness, hot spots or mobility limits in session notes.',
      flags: [],
      flaggedLogs: [],
    };
  }

  const flagged = recent
    .map((log) => ({ log, flags: findFlags(log.notes) }))
    .filter((item) => item.flags.length > 0);
  const flaggedLogs = flagged.map((item) => item.log);
  const flags = [...new Set([
    ...flagged.flatMap((item) => item.flags),
    ...findFlags(profileInjuryNotes),
  ])];
  const fatigueFlags = recent.filter((log) => isFatigueWatch(log.readiness)).length;
  const ruckFlagged = flaggedLogs.filter((log) => log.category === 'Ruck').length;

  let score = 100;
  score -= flaggedLogs.length * 18;
  score -= fatigueFlags >= 2 ? 15 : fatigueFlags * 5;
  score -= ruckFlagged >= 2 ? 12 : 0;
  score -= profileInjuryNotes.trim().length > 0 ? 12 : 0;
  score = Math.max(0, Math.min(100, score));

  if (score < 55 || flaggedLogs.length >= 3) {
    return {
      status: 'high',
      label: 'High Watch',
      score,
      message: 'Multiple injury or pain signals are present in recent notes.',
      action: 'Avoid progression, reduce impact/load, and prioritise recovery. Consider professional guidance if pain persists.',
      flags,
      flaggedLogs,
    };
  }

  if (score < 80 || flaggedLogs.length > 0 || profileInjuryNotes.trim().length > 0) {
    return {
      status: 'monitor',
      label: 'Monitor',
      score,
      message: 'Some injury-watch signals are present. Progress conservatively.',
      action: 'Hold distance/load increases and log symptoms clearly after the next session.',
      flags,
      flaggedLogs,
    };
  }

  return {
    status: 'clear',
    label: 'Clear',
    score,
    message: 'No injury-watch keywords found in recent notes.',
    action: 'Keep logging pain, soreness, hot spots and lower-leg response after sessions.',
    flags: ['No recent flags'],
    flaggedLogs,
  };
}
