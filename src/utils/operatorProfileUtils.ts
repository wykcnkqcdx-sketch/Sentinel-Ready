import type { TrainingLog, TrainingGoal } from '@/src/screens/TrainingContext';
import { getReadinessNumber } from '@/src/utils/trainingLogUtils';

export type CategoryStat = {
  category: string;
  count: number;
  pct: number;
};

export type PersonalBest = {
  label: string;
  value: string;
  date: string;
};

export type OperatorProfile = {
  serviceNumber: string;
  role: string;
  trainingLevel: string;
  testDate: string | null;
  firstMission: string;
  lastMission: string;
  totalSessions: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  totalRuckSessions: number;
  totalRuckDistanceKm: number;
  totalLoadKgKm: number;
  fastestPace: string;
  avgReadiness: number;
  goalsActive: number;
  goalsComplete: number;
  categoryBreakdown: CategoryStat[];
  personalBests: PersonalBest[];
};

function fmtPace(sPerKm: number): string {
  if (!sPerKm || !Number.isFinite(sPerKm)) return '—';
  const m = Math.floor(sPerKm / 60);
  const s = Math.round(sPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

function fmtDate(dateStr: string): string {
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const d = new Date(dateStr + 'T12:00:00');
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function computeStreaks(logs: TrainingLog[]): { current: number; longest: number } {
  if (logs.length === 0) return { current: 0, longest: 0 };

  const weekSet = new Set(logs.map((l) => getWeekMonday(l.date)));
  const weeks = [...weekSet].sort();

  let longest = 1;
  let run = 1;
  for (let i = 1; i < weeks.length; i++) {
    const prev = new Date(weeks[i - 1] + 'T12:00:00');
    const curr = new Date(weeks[i] + 'T12:00:00');
    const diff = Math.round((curr.getTime() - prev.getTime()) / 604800000); // 7 days in ms
    if (diff === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  const thisWeekMonday = getWeekMonday(new Date().toISOString().slice(0, 10));
  let current = 0;
  let check = thisWeekMonday;
  for (let i = 0; i < weeks.length + 1; i++) {
    if (weekSet.has(check)) {
      current++;
      const d = new Date(check + 'T12:00:00');
      d.setDate(d.getDate() - 7);
      check = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } else break;
  }

  return { current, longest };
}

export function buildOperatorProfile(
  logs: TrainingLog[],
  goals: TrainingGoal[],
  userRole: string,
  userLevel: string,
  userTestDate: string | null,
): OperatorProfile {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    return {
      serviceNumber: 'SNT-000000',
      role: userRole,
      trainingLevel: userLevel,
      testDate: userTestDate,
      firstMission: '—',
      lastMission: '—',
      totalSessions: 0,
      activeDays: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalRuckSessions: 0,
      totalRuckDistanceKm: 0,
      totalLoadKgKm: 0,
      fastestPace: '—',
      avgReadiness: 0,
      goalsActive: goals.filter((g) => g.status === 'active').length,
      goalsComplete: goals.filter((g) => g.status === 'complete').length,
      categoryBreakdown: [],
      personalBests: [],
    };
  }

  const firstLog = sorted[0];
  const lastLog = sorted[sorted.length - 1];
  const serviceNumber = `SNT-${firstLog.date.replace(/-/g, '').slice(2)}`;

  const activeDays = new Set(logs.map((l) => l.date)).size;
  const { current, longest } = computeStreaks(logs);

  const ruckLogs = logs.filter((l) => l.category === 'Ruck' && l.ruck);
  const totalRuckDistanceKm = ruckLogs.reduce((s, l) => s + (l.ruck?.distanceKm ?? 0), 0);
  const totalLoadKgKm = ruckLogs.reduce((s, l) => s + (l.ruck ? l.ruck.distanceKm * l.ruck.packWeightKg : 0), 0);
  const fastestLog = ruckLogs.reduce<TrainingLog | null>((best, l) => {
    const pace = l.ruck?.paceSecondsPerKm ?? Infinity;
    if (!best || pace < (best.ruck?.paceSecondsPerKm ?? Infinity)) return l;
    return best;
  }, null);
  const fastestPace = fastestLog?.ruck ? fmtPace(fastestLog.ruck.paceSecondsPerKm) : '—';

  const readinessLogs = logs.filter((l) => getReadinessNumber(l.readiness) > 0);
  const avgReadiness = readinessLogs.length > 0
    ? readinessLogs.reduce((s, l) => s + getReadinessNumber(l.readiness), 0) / readinessLogs.length
    : 0;

  // Category breakdown
  const catCounts: Record<string, number> = {};
  for (const log of logs) catCounts[log.category] = (catCounts[log.category] ?? 0) + 1;
  const categoryBreakdown: CategoryStat[] = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count, pct: Math.round((count / logs.length) * 100) }));

  // Personal bests
  const personalBests: PersonalBest[] = [];
  if (fastestLog?.ruck) {
    personalBests.push({ label: 'RUCK PACE', value: fastestPace, date: fmtDate(fastestLog.date) });
  }
  const longestRuck = ruckLogs.reduce<TrainingLog | null>((best, l) =>
    !best || (l.ruck?.distanceKm ?? 0) > (best.ruck?.distanceKm ?? 0) ? l : best, null);
  if (longestRuck?.ruck) {
    personalBests.push({ label: 'RUCK DISTANCE', value: `${longestRuck.ruck.distanceKm.toFixed(1)} km`, date: fmtDate(longestRuck.date) });
  }
  const heaviestRuck = ruckLogs.reduce<TrainingLog | null>((best, l) =>
    !best || (l.ruck?.packWeightKg ?? 0) > (best.ruck?.packWeightKg ?? 0) ? l : best, null);
  if (heaviestRuck?.ruck) {
    personalBests.push({ label: 'PACK WEIGHT', value: `${heaviestRuck.ruck.packWeightKg.toFixed(0)} kg`, date: fmtDate(heaviestRuck.date) });
  }
  const bestReadinessLog = readinessLogs.reduce<TrainingLog | null>((best, l) =>
    !best || getReadinessNumber(l.readiness) > getReadinessNumber(best.readiness) ? l : best, null);
  if (bestReadinessLog) {
    personalBests.push({ label: 'BEST READINESS', value: `${bestReadinessLog.readiness}/10`, date: fmtDate(bestReadinessLog.date) });
  }

  return {
    serviceNumber,
    role: userRole,
    trainingLevel: userLevel,
    testDate: userTestDate,
    firstMission: fmtDate(firstLog.date),
    lastMission: fmtDate(lastLog.date),
    totalSessions: logs.length,
    activeDays,
    currentStreak: current,
    longestStreak: longest,
    totalRuckSessions: ruckLogs.length,
    totalRuckDistanceKm,
    totalLoadKgKm,
    fastestPace,
    avgReadiness,
    goalsActive: goals.filter((g) => g.status === 'active').length,
    goalsComplete: goals.filter((g) => g.status === 'complete').length,
    categoryBreakdown,
    personalBests,
  };
}
