import type { DfiftStandards } from '@/src/types/dfift';
import type { Gender } from '@/src/screens/UserContext';
import type { TrainingLog } from '@/src/screens/TrainingContext';
import { getDateValue } from '@/src/utils/trainingLogUtils';

export type DfiftEventStatus = {
  key: 'pushUps' | 'sitUps' | 'run' | 'skinfold';
  label: string;
  standard: string;
  result: string | null;
  pass: boolean | null;
  margin: number | null;
};

export type DfiftSnapshot = {
  rows: DfiftEventStatus[];
  loggedEvents: number;
  passedEvents: number;
  weakPoint: DfiftEventStatus | null;
  recommendation: string;
};

function formatSeconds(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function parseFirstNumber(str: string): number | null {
  const match = str.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function parseRunSeconds(duration: string): number | null {
  const mmss = duration.match(/(\d{1,2}):(\d{2})/);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);

  const minutes = duration.toLowerCase().match(/(\d+(\.\d+)?)\s*(min|mins|minute|minutes)/);
  if (minutes) return Math.round(Number(minutes[1]) * 60);

  return null;
}

function findLatest(testLogs: TrainingLog[], ...keywords: string[]) {
  return testLogs.find((log) => keywords.some((keyword) => log.type.toLowerCase().includes(keyword))) ?? null;
}

export function buildDfiftSnapshot(logs: TrainingLog[], standards: DfiftStandards, gender: Gender): DfiftSnapshot {
  const testLogs = [...logs.filter((log) => log.category === 'Test')]
    .sort((a, b) => getDateValue(b.date) - getDateValue(a.date) || b.id - a.id);

  const pushLog = findLatest(testLogs, 'push');
  const sitLog = findLatest(testLogs, 'sit');
  const runLog = findLatest(testLogs, '2.4', 'run');
  const skinfoldLog = findLatest(testLogs, 'skin', 'fold');

  const pushLimit = gender === 'F' ? standards.events.pushUps.female : standards.events.pushUps.male;
  const sitLimit = gender === 'F' ? standards.events.sitUps.female : standards.events.sitUps.male;
  const runLimit = gender === 'F' ? standards.events.run.femaleMaxSeconds : standards.events.run.maleMaxSeconds;
  const skinfoldLimit = gender === 'F' ? standards.events.skinfold.femaleMaxMm : standards.events.skinfold.maleMaxMm;

  const pushReps = pushLog ? parseFirstNumber(pushLog.distanceLoad) : null;
  const sitReps = sitLog ? parseFirstNumber(sitLog.distanceLoad) : null;
  const runSeconds = runLog ? parseRunSeconds(runLog.duration) : null;
  const skinfoldMm = skinfoldLog ? parseFirstNumber(skinfoldLog.distanceLoad) : null;

  const rows: DfiftEventStatus[] = [
    {
      key: 'pushUps',
      label: 'Push-ups',
      standard: `${pushLimit} reps in 60s (${gender})`,
      result: pushReps !== null ? `${pushReps} reps` : null,
      pass: pushReps !== null ? pushReps >= pushLimit : null,
      margin: pushReps !== null ? pushReps - pushLimit : null,
    },
    {
      key: 'sitUps',
      label: 'Sit-ups',
      standard: `${sitLimit} reps in 60s (${gender})`,
      result: sitReps !== null ? `${sitReps} reps` : null,
      pass: sitReps !== null ? sitReps >= sitLimit : null,
      margin: sitReps !== null ? sitReps - sitLimit : null,
    },
    {
      key: 'run',
      label: '2.4km Run',
      standard: `Under ${formatSeconds(runLimit)} (${gender})`,
      result: runSeconds !== null ? formatSeconds(runSeconds) : null,
      pass: runSeconds !== null ? runSeconds <= runLimit : null,
      margin: runSeconds !== null ? runLimit - runSeconds : null,
    },
    {
      key: 'skinfold',
      label: 'Skinfold',
      standard: `Under ${skinfoldLimit}mm (${gender})`,
      result: skinfoldMm !== null ? `${skinfoldMm}mm` : null,
      pass: skinfoldMm !== null ? skinfoldMm <= skinfoldLimit : null,
      margin: skinfoldMm !== null ? skinfoldLimit - skinfoldMm : null,
    },
  ];

  const loggedEvents = rows.filter((row) => row.pass !== null).length;
  const passedEvents = rows.filter((row) => row.pass === true).length;
  const weakPoint = rows.find((row) => row.pass === false) ?? rows.find((row) => row.pass === null) ?? null;

  let recommendation = 'Log each DFIFT event to build a complete test picture.';
  if (loggedEvents === rows.length && passedEvents === rows.length) {
    recommendation = 'All logged DFIFT events meet the reference threshold. Maintain readiness and avoid fatigue before assessment.';
  } else if (weakPoint?.pass === false) {
    recommendation = `${weakPoint.label} is the current weak point. Put one focused practice block into the next training week.`;
  } else if (weakPoint?.pass === null) {
    recommendation = `${weakPoint.label} has no logged result yet. Add a controlled baseline when readiness is green.`;
  }

  return {
    rows,
    loggedEvents,
    passedEvents,
    weakPoint,
    recommendation,
  };
}
