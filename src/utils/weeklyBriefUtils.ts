import type { TrainingLog } from '@/src/screens/TrainingContext';
import { buildWeekSummary, buildNextWeekRecommendation, buildWeeklyLoadRisk } from '@/src/utils/trainingLogUtils';
import { getReadinessNumber } from '@/src/utils/trainingLogUtils';

export type BriefTone = 'good' | 'warn' | 'bad' | 'neutral';

export type BriefLine = {
  label: string;
  value: string;
  tone: BriefTone;
};

export type WeeklyBrief = {
  weekRef: string;
  weekRange: string;
  missionStatus: 'COMPLETE' | 'PARTIAL' | 'MINIMAL' | 'NO DATA';
  statusTone: BriefTone;
  summary: BriefLine[];
  loadAnalysis: BriefLine[];
  readinessTrend: BriefLine[];
  sustain: string[];
  improve: string[];
  directive: string;
};

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const WEEKLY_TARGET = 4;

function formatWeekRange(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  const sd = s.getDate();
  const ed = e.getDate();
  const em = MONTHS[e.getMonth()];
  const ey = e.getFullYear();
  if (s.getMonth() === e.getMonth()) return `${sd}–${ed} ${em} ${ey}`;
  return `${sd} ${MONTHS[s.getMonth()]}–${ed} ${em} ${ey}`;
}

function tone(val: number, goodThresh: number, warnThresh: number): BriefTone {
  if (val >= goodThresh) return 'good';
  if (val >= warnThresh) return 'warn';
  return 'bad';
}

export function buildWeeklyBrief(logs: TrainingLog[]): WeeklyBrief {
  const thisWeek = buildWeekSummary(logs, 0);
  const lastWeek = buildWeekSummary(logs, 1);
  const loadRisk = buildWeeklyLoadRisk(logs);

  const weekRef = `WK-${thisWeek.weekStart}`;
  const weekRange = formatWeekRange(thisWeek.weekStart, thisWeek.weekEnd);

  if (thisWeek.total === 0) {
    return {
      weekRef, weekRange,
      missionStatus: 'NO DATA',
      statusTone: 'neutral',
      summary: [{ label: 'SESSIONS LOGGED', value: '0', tone: 'neutral' }],
      loadAnalysis: [],
      readinessTrend: [],
      sustain: [],
      improve: ['No sessions logged this week. Log your first session to generate a full brief.'],
      directive: 'Log at least one session this week to activate mission tracking.',
    };
  }

  // Mission status
  const hitTarget = thisWeek.total >= WEEKLY_TARGET;
  const avgReadiness = Number(thisWeek.averageReadiness);
  let missionStatus: WeeklyBrief['missionStatus'];
  let statusTone: BriefTone;
  if (hitTarget && avgReadiness >= 6) {
    missionStatus = 'COMPLETE'; statusTone = 'good';
  } else if (thisWeek.total >= 2) {
    missionStatus = 'PARTIAL'; statusTone = 'warn';
  } else {
    missionStatus = 'MINIMAL'; statusTone = 'bad';
  }

  // Summary section
  const categories = [...new Set(logs
    .filter((l) => l.date >= thisWeek.weekStart && l.date <= thisWeek.weekEnd)
    .map((l) => l.category)
  )];
  const summary: BriefLine[] = [
    { label: 'SESSIONS LOGGED', value: `${thisWeek.total} / ${WEEKLY_TARGET}`, tone: tone(thisWeek.total, WEEKLY_TARGET, 2) },
    { label: 'TARGET STATUS', value: hitTarget ? 'HIT' : `SHORT BY ${WEEKLY_TARGET - thisWeek.total}`, tone: hitTarget ? 'good' : 'warn' },
    { label: 'AVG READINESS', value: avgReadiness > 0 ? `${avgReadiness.toFixed(1)} / 10` : 'N/A', tone: tone(avgReadiness, 7, 5) },
    { label: 'CATEGORIES', value: categories.length > 0 ? categories.join(' · ') : 'NIL', tone: 'neutral' },
    { label: 'FATIGUE FLAGS', value: thisWeek.fatigueWatch > 0 ? `${thisWeek.fatigueWatch} SESSION${thisWeek.fatigueWatch > 1 ? 'S' : ''}` : 'NIL', tone: thisWeek.fatigueWatch >= 2 ? 'bad' : thisWeek.fatigueWatch === 1 ? 'warn' : 'good' },
  ];

  // Load analysis section
  const ruckHike = thisWeek.ruck + thisWeek.hiking;
  const strengthRes = thisWeek.strength + thisWeek.resistance;
  const loadAnalysis: BriefLine[] = [
    { label: 'LOAD CARRIAGE', value: ruckHike > 0 ? `${ruckHike} SESSION${ruckHike > 1 ? 'S' : ''}` : 'NIL', tone: ruckHike > 0 ? 'good' : 'neutral' },
    { label: 'STRENGTH WORK', value: strengthRes > 0 ? `${strengthRes} SESSION${strengthRes > 1 ? 'S' : ''}` : 'NIL', tone: strengthRes > 0 ? 'good' : 'neutral' },
    { label: 'AEROBIC', value: thisWeek.run > 0 ? `${thisWeek.run} SESSION${thisWeek.run > 1 ? 'S' : ''}` : 'NIL', tone: thisWeek.run > 0 ? 'good' : 'neutral' },
    { label: 'RECOVERY / MOBILITY', value: thisWeek.recovery > 0 ? `${thisWeek.recovery} SESSION${thisWeek.recovery > 1 ? 'S' : ''}` : 'NIL', tone: thisWeek.recovery > 0 ? 'good' : (thisWeek.total >= 3 ? 'warn' : 'neutral') },
    { label: 'LOAD RISK', value: loadRisk.label.toUpperCase(), tone: loadRisk.status === 'high' ? 'bad' : loadRisk.status === 'moderate' ? 'warn' : 'good' },
  ];

  // Readiness trend section
  const weekLogs = [...logs]
    .filter((l) => l.date >= thisWeek.weekStart && l.date <= thisWeek.weekEnd && getReadinessNumber(l.readiness) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const firstR = weekLogs.length > 0 ? getReadinessNumber(weekLogs[0].readiness) : 0;
  const lastR = weekLogs.length > 0 ? getReadinessNumber(weekLogs[weekLogs.length - 1].readiness) : 0;
  const direction = lastR > firstR ? '↑ IMPROVING' : lastR < firstR ? '↓ DECLINING' : '→ STABLE';
  const dirTone: BriefTone = lastR > firstR ? 'good' : lastR < firstR ? 'warn' : 'neutral';
  const bestLog = weekLogs.reduce<TrainingLog | null>((b, l) => !b || getReadinessNumber(l.readiness) > getReadinessNumber(b.readiness) ? l : b, null);
  const worstLog = weekLogs.reduce<TrainingLog | null>((b, l) => !b || getReadinessNumber(l.readiness) < getReadinessNumber(b.readiness) ? l : b, null);

  const readinessTrend: BriefLine[] = [
    { label: 'WEEK START', value: firstR > 0 ? `${firstR} / 10` : 'N/A', tone: tone(firstR, 7, 5) },
    { label: 'WEEK END', value: lastR > 0 ? `${lastR} / 10` : 'N/A', tone: tone(lastR, 7, 5) },
    { label: 'TRAJECTORY', value: weekLogs.length >= 2 ? direction : 'INSUFFICIENT DATA', tone: dirTone },
    { label: 'PEAK SESSION', value: bestLog ? `${bestLog.type} · R:${bestLog.readiness}` : 'N/A', tone: 'good' },
    { label: 'LOWEST SESSION', value: worstLog && worstLog.id !== bestLog?.id ? `${worstLog.type} · R:${worstLog.readiness}` : 'N/A', tone: 'neutral' },
  ];

  // SUSTAIN
  const sustain: string[] = [];
  if (hitTarget) sustain.push(`Session target met — ${thisWeek.total} of ${WEEKLY_TARGET} completed.`);
  if (avgReadiness >= 7) sustain.push(`Readiness held strong — ${avgReadiness.toFixed(1)} average across the week.`);
  if (thisWeek.fatigueWatch === 0) sustain.push('No fatigue-watch sessions. Load was well tolerated.');
  if (thisWeek.recovery > 0) sustain.push(`Recovery work logged — ${thisWeek.recovery} session${thisWeek.recovery > 1 ? 's' : ''}.`);
  if (ruckHike > 0 && strengthRes > 0) sustain.push('Both load carriage and strength work completed — balanced week.');
  if (sustain.length === 0) sustain.push('Logged sessions provide a baseline for tracking.');

  // IMPROVE
  const improve: string[] = [];
  if (!hitTarget) improve.push(`Session target not met — ${WEEKLY_TARGET - thisWeek.total} session${WEEKLY_TARGET - thisWeek.total > 1 ? 's' : ''} short of ${WEEKLY_TARGET}.`);
  if (thisWeek.fatigueWatch >= 2) improve.push(`${thisWeek.fatigueWatch} fatigue-watch sessions flagged. Deload and monitor readiness.`);
  if (thisWeek.recovery === 0 && thisWeek.total >= 3) improve.push('No recovery or mobility session logged. Add one before increasing load.');
  if (strengthRes === 0 && thisWeek.total >= 2) improve.push('No strength work logged. Include a strength session next week.');
  if (avgReadiness > 0 && avgReadiness < 6) improve.push(`Average readiness below threshold (${avgReadiness.toFixed(1)}). Prioritise sleep and recovery.`);
  if (thisWeek.weakLogs > 0) improve.push(`${thisWeek.weakLogs} log${thisWeek.weakLogs > 1 ? 's' : ''} missing detail. Add notes and readiness scores for better tracking.`);
  if (improve.length === 0) improve.push('No flags this week. Continue current approach.');

  const directive = buildNextWeekRecommendation(thisWeek, lastWeek);

  return { weekRef, weekRange, missionStatus, statusTone, summary, loadAnalysis, readinessTrend, sustain, improve, directive };
}
