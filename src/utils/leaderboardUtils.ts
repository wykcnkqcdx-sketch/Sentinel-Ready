import type { TrainingLog } from '@/src/screens/TrainingContext';

export type LeaderboardMetric = 'ruck_km' | 'sessions' | 'readiness' | 'streak' | 'load_kg';

export type SquadMember = {
  id: string;
  callsign: string;
  rank: string;
  isYou?: boolean;
  stats: {
    ruckKmTotal: number;
    sessionsThisMonth: number;
    avgReadiness: number;
    longestStreak: number;
    totalLoadKg: number;
  };
};

export type RankedMember = SquadMember & {
  position: number;
  metricValue: number;
  metricLabel: string;
  trend: 'up' | 'down' | 'same';
};

const MOCK_SQUAD: Omit<SquadMember, 'isYou'>[] = [
  {
    id: 'alpha-1',
    callsign: 'GHOST',
    rank: 'SGT',
    stats: { ruckKmTotal: 312, sessionsThisMonth: 19, avgReadiness: 7.8, longestStreak: 9, totalLoadKg: 4860 },
  },
  {
    id: 'alpha-2',
    callsign: 'VIPER',
    rank: 'CPL',
    stats: { ruckKmTotal: 280, sessionsThisMonth: 17, avgReadiness: 7.2, longestStreak: 7, totalLoadKg: 4120 },
  },
  {
    id: 'alpha-3',
    callsign: 'HAWK',
    rank: 'PTE',
    stats: { ruckKmTotal: 195, sessionsThisMonth: 14, avgReadiness: 6.9, longestStreak: 5, totalLoadKg: 2730 },
  },
  {
    id: 'alpha-4',
    callsign: 'STONE',
    rank: 'CPL',
    stats: { ruckKmTotal: 258, sessionsThisMonth: 15, avgReadiness: 7.5, longestStreak: 6, totalLoadKg: 3870 },
  },
  {
    id: 'alpha-5',
    callsign: 'NOVA',
    rank: 'SGT',
    stats: { ruckKmTotal: 340, sessionsThisMonth: 20, avgReadiness: 8.1, longestStreak: 11, totalLoadKg: 5100 },
  },
  {
    id: 'alpha-6',
    callsign: 'WOLF',
    rank: 'LCPL',
    stats: { ruckKmTotal: 142, sessionsThisMonth: 11, avgReadiness: 6.4, longestStreak: 4, totalLoadKg: 1994 },
  },
  {
    id: 'alpha-7',
    callsign: 'ECHO',
    rank: 'PTE',
    stats: { ruckKmTotal: 88, sessionsThisMonth: 9, avgReadiness: 6.1, longestStreak: 3, totalLoadKg: 1232 },
  },
];

function computeUserStats(logs: TrainingLog[]): SquadMember['stats'] {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const ruckLogs = logs.filter((l) => l.ruck);
  const ruckKmTotal = ruckLogs.reduce((s, l) => s + (l.ruck!.distanceKm ?? 0), 0);
  const sessionsThisMonth = logs.filter((l) => l.date.startsWith(month)).length;

  const readinessVals = logs.slice(-20).map((l) => Number(l.readiness) || 0).filter((v) => v > 0);
  const avgReadiness = readinessVals.length
    ? parseFloat((readinessVals.reduce((s, v) => s + v, 0) / readinessVals.length).toFixed(1))
    : 0;

  const days = new Set(logs.map((l) => l.date));
  const sorted = [...days].sort();
  let max = 0, cur = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) { cur = 1; continue; }
    const diff = (new Date(sorted[i] + 'T00:00:00').getTime() - new Date(sorted[i - 1] + 'T00:00:00').getTime()) / 86400000;
    cur = diff === 1 ? cur + 1 : 1;
    max = Math.max(max, cur);
  }

  const totalLoadKg = ruckLogs.reduce((s, l) => s + ((l.ruck!.distanceKm ?? 0) * (l.ruck!.packWeightKg ?? 0)), 0);

  return {
    ruckKmTotal: parseFloat(ruckKmTotal.toFixed(1)),
    sessionsThisMonth,
    avgReadiness,
    longestStreak: max,
    totalLoadKg: parseFloat(totalLoadKg.toFixed(0)),
  };
}

function getMetricValue(member: SquadMember, metric: LeaderboardMetric): number {
  switch (metric) {
    case 'ruck_km':   return member.stats.ruckKmTotal;
    case 'sessions':  return member.stats.sessionsThisMonth;
    case 'readiness': return member.stats.avgReadiness;
    case 'streak':    return member.stats.longestStreak;
    case 'load_kg':   return member.stats.totalLoadKg;
  }
}

function getMetricLabel(value: number, metric: LeaderboardMetric): string {
  switch (metric) {
    case 'ruck_km':   return `${value.toFixed(1)} km`;
    case 'sessions':  return `${value} sessions`;
    case 'readiness': return `${value.toFixed(1)}/10`;
    case 'streak':    return `${value} days`;
    case 'load_kg':   return `${value.toLocaleString()} kg`;
  }
}

export function buildLeaderboard(
  logs: TrainingLog[],
  callsign: string,
  rank: string,
  metric: LeaderboardMetric,
): RankedMember[] {
  const userStats = computeUserStats(logs);
  const userMember: SquadMember = {
    id: 'you',
    callsign: callsign || 'YOU',
    rank: rank || 'PTE',
    isYou: true,
    stats: userStats,
  };

  const all: SquadMember[] = [...MOCK_SQUAD, userMember];

  const sorted = [...all].sort((a, b) => getMetricValue(b, metric) - getMetricValue(a, metric));

  return sorted.map((member, i) => ({
    ...member,
    position: i + 1,
    metricValue: getMetricValue(member, metric),
    metricLabel: getMetricLabel(getMetricValue(member, metric), metric),
    trend: member.isYou ? 'same' : i < 3 ? 'up' : 'down',
  }));
}

export type MetricOption = {
  value: LeaderboardMetric;
  label: string;
  description: string;
};

export const METRIC_OPTIONS: MetricOption[] = [
  { value: 'ruck_km',   label: 'RUCK KM',       description: 'Total ruck distance logged.' },
  { value: 'sessions',  label: 'SESSIONS/MO',   description: 'Training sessions this month.' },
  { value: 'readiness', label: 'READINESS',     description: 'Avg readiness score (last 20).' },
  { value: 'streak',    label: 'STREAK',         description: 'Longest consecutive training days.' },
  { value: 'load_kg',   label: 'TOTAL LOAD',    description: 'Cumulative ruck load (km × kg).' },
];

export function getSquadSummary(members: RankedMember[]) {
  const total = members.length;
  const you = members.find((m) => m.isYou);
  const topThird = total > 0 && you ? you.position <= Math.ceil(total / 3) : false;
  return { total, yourPosition: you?.position ?? null, topThird };
}
