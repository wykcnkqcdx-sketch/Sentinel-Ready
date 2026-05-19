import type { TrainingLog, TrainingGoal } from '@/src/screens/TrainingContext';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export type Achievement = {
  id: string;
  title: string;
  description: string;
  tier: AchievementTier;
  xp: number;
  category: string;
  icon: string;
  earned: boolean;
  progress: number;
  earnedAt?: string;
};

export type XPLevel = {
  level: number;
  title: string;
  minXP: number;
  maxXP: number;
  color: string;
};

export const XP_LEVELS: XPLevel[] = [
  { level: 1, title: 'RECRUIT',    minXP: 0,    maxXP: 100,  color: '#7a9480' },
  { level: 2, title: 'TRAINEE',   minXP: 101,  maxXP: 300,  color: '#91e6a3' },
  { level: 3, title: 'OPERATOR',  minXP: 301,  maxXP: 600,  color: '#3fc8e4' },
  { level: 4, title: 'SPECIALIST',minXP: 601,  maxXP: 1100, color: '#ffaa44' },
  { level: 5, title: 'EXPERT',    minXP: 1101, maxXP: 2000, color: '#e05050' },
  { level: 6, title: 'ELITE',     minXP: 2001, maxXP: 99999,color: '#c084fc' },
];

export function getXPLevel(totalXP: number): XPLevel & { progressToNext: number } {
  const current = XP_LEVELS.findLast((l) => totalXP >= l.minXP) ?? XP_LEVELS[0];
  const next = XP_LEVELS.find((l) => l.level === current.level + 1);
  const progressToNext = next
    ? Math.min(100, Math.round(((totalXP - current.minXP) / (next.minXP - current.minXP)) * 100))
    : 100;
  return { ...current, progressToNext };
}

export function getTotalXP(achievements: Achievement[]): number {
  return achievements.filter((a) => a.earned).reduce((sum, a) => sum + a.xp, 0);
}

function totalRuckKm(logs: TrainingLog[]): number {
  return logs.filter((l) => l.category === 'Ruck' && l.ruck).reduce((s, l) => s + (l.ruck!.distanceKm ?? 0), 0);
}

function ruckSessionCount(logs: TrainingLog[]): number {
  return logs.filter((l) => l.category === 'Ruck').length;
}

function maxRuckDistanceKm(logs: TrainingLog[]): number {
  return Math.max(0, ...logs.filter((l) => l.ruck).map((l) => l.ruck!.distanceKm ?? 0));
}

function maxPackWeightKg(logs: TrainingLog[]): number {
  return Math.max(0, ...logs.filter((l) => l.ruck).map((l) => l.ruck!.packWeightKg ?? 0));
}

function longestStreak(logs: TrainingLog[]): number {
  const days = new Set(logs.map((l) => l.date));
  const sorted = [...days].sort();
  let max = 0;
  let cur = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) { cur = 1; continue; }
    const prev = new Date(sorted[i - 1] + 'T00:00:00');
    const curr = new Date(sorted[i] + 'T00:00:00');
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    cur = diff === 1 ? cur + 1 : 1;
    max = Math.max(max, cur);
  }
  return max;
}

function sessionsThisMonth(logs: TrainingLog[]): number {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return logs.filter((l) => l.date.startsWith(month)).length;
}

function uniqueCategories(logs: TrainingLog[]): string[] {
  return [...new Set(logs.map((l) => l.category))];
}

function avgReadiness(logs: TrainingLog[]): number {
  if (!logs.length) return 0;
  const vals = logs.map((l) => Number(l.readiness) || 0).filter((v) => v > 0);
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
}

export function buildAchievements(logs: TrainingLog[], goals: TrainingGoal[] = []): Achievement[] {
  const totalKm = totalRuckKm(logs);
  const ruckSessions = ruckSessionCount(logs);
  const maxDist = maxRuckDistanceKm(logs);
  const maxPack = maxPackWeightKg(logs);
  const streak = longestStreak(logs);
  const monthSessions = sessionsThisMonth(logs);
  const categories = uniqueCategories(logs);
  const readinessAvg = avgReadiness(logs.slice(-14));
  const recoveryLogs = logs.filter((l) => l.category === 'Recovery' || l.category === 'Mobility').length;
  const activeGoals = goals.filter((g) => g.status === 'active').length;

  const allCats = ['Ruck', 'Strength', 'Run', 'Recovery', 'Mobility'];
  const hasAllCats = allCats.every((c) => categories.includes(c));

  return [
    // ── FIRST STEPS ─────────────────────────────────────────
    {
      id: 'first-log',
      title: 'First Entry',
      description: 'Record your first training session.',
      tier: 'bronze', xp: 10, category: 'Milestones', icon: '◈',
      earned: logs.length >= 1,
      progress: Math.min(100, logs.length * 100),
    },
    {
      id: 'first-ruck',
      title: 'First Ruck',
      description: 'Complete and log one ruck session.',
      tier: 'bronze', xp: 15, category: 'Ruck', icon: '▶',
      earned: ruckSessions >= 1,
      progress: Math.min(100, ruckSessions * 100),
    },
    {
      id: 'goal-setter',
      title: 'Goal Setter',
      description: 'Set at least one active training goal.',
      tier: 'bronze', xp: 10, category: 'Milestones', icon: '◆',
      earned: activeGoals >= 1,
      progress: activeGoals >= 1 ? 100 : 0,
    },
    {
      id: 'recovery-discipline',
      title: 'Recovery Discipline',
      description: 'Log a recovery or mobility session.',
      tier: 'bronze', xp: 10, category: 'Recovery', icon: '○',
      earned: recoveryLogs >= 1,
      progress: recoveryLogs >= 1 ? 100 : 0,
    },

    // ── LOG VOLUME ───────────────────────────────────────────
    {
      id: 'ten-logs',
      title: '10 Sessions',
      description: 'Log ten total training sessions.',
      tier: 'bronze', xp: 20, category: 'Consistency', icon: '●',
      earned: logs.length >= 10,
      progress: Math.min(100, Math.round((logs.length / 10) * 100)),
    },
    {
      id: 'fifty-logs',
      title: '50 Sessions',
      description: 'Log fifty total training sessions.',
      tier: 'silver', xp: 50, category: 'Consistency', icon: '●',
      earned: logs.length >= 50,
      progress: Math.min(100, Math.round((logs.length / 50) * 100)),
    },
    {
      id: 'hundred-logs',
      title: 'Century',
      description: 'Log one hundred training sessions.',
      tier: 'gold', xp: 100, category: 'Consistency', icon: '●',
      earned: logs.length >= 100,
      progress: Math.min(100, Math.round((logs.length / 100) * 100)),
    },

    // ── RUCK DISTANCE ────────────────────────────────────────
    {
      id: 'ruck-5km',
      title: 'Tab Complete',
      description: 'Ruck 5 km in a single session.',
      tier: 'silver', xp: 25, category: 'Ruck', icon: '▶',
      earned: maxDist >= 5,
      progress: Math.min(100, Math.round((maxDist / 5) * 100)),
    },
    {
      id: 'ruck-10km',
      title: 'Long Tab',
      description: 'Ruck 10 km in a single session.',
      tier: 'gold', xp: 50, category: 'Ruck', icon: '▶',
      earned: maxDist >= 10,
      progress: Math.min(100, Math.round((maxDist / 10) * 100)),
    },
    {
      id: 'ruck-20km',
      title: 'Iron Legs',
      description: 'Ruck 20 km in a single session.',
      tier: 'platinum', xp: 150, category: 'Ruck', icon: '▶',
      earned: maxDist >= 20,
      progress: Math.min(100, Math.round((maxDist / 20) * 100)),
    },
    {
      id: 'ruck-total-50km',
      title: '50 km Total',
      description: 'Accumulate 50 km of ruck distance.',
      tier: 'silver', xp: 40, category: 'Ruck', icon: '◈',
      earned: totalKm >= 50,
      progress: Math.min(100, Math.round((totalKm / 50) * 100)),
    },
    {
      id: 'ruck-total-200km',
      title: '200 km Total',
      description: 'Accumulate 200 km of ruck distance.',
      tier: 'gold', xp: 100, category: 'Ruck', icon: '◈',
      earned: totalKm >= 200,
      progress: Math.min(100, Math.round((totalKm / 200) * 100)),
    },

    // ── RUCK LOAD ────────────────────────────────────────────
    {
      id: 'pack-15kg',
      title: 'Loaded Operator',
      description: 'Ruck with a 15 kg+ pack.',
      tier: 'silver', xp: 30, category: 'Ruck', icon: '◆',
      earned: maxPack >= 15,
      progress: Math.min(100, Math.round((maxPack / 15) * 100)),
    },
    {
      id: 'pack-25kg',
      title: 'Full Battle Rattle',
      description: 'Ruck with a 25 kg+ pack.',
      tier: 'gold', xp: 75, category: 'Ruck', icon: '◆',
      earned: maxPack >= 25,
      progress: Math.min(100, Math.round((maxPack / 25) * 100)),
    },

    // ── RUCK VOLUME ──────────────────────────────────────────
    {
      id: 'ruck-5-sessions',
      title: '5 Ruck Sessions',
      description: 'Complete five ruck sessions.',
      tier: 'silver', xp: 35, category: 'Ruck', icon: '●',
      earned: ruckSessions >= 5,
      progress: Math.min(100, Math.round((ruckSessions / 5) * 100)),
    },
    {
      id: 'ruck-20-sessions',
      title: 'Ruck Regular',
      description: 'Complete twenty ruck sessions.',
      tier: 'gold', xp: 80, category: 'Ruck', icon: '●',
      earned: ruckSessions >= 20,
      progress: Math.min(100, Math.round((ruckSessions / 20) * 100)),
    },

    // ── CONSISTENCY ──────────────────────────────────────────
    {
      id: 'streak-3',
      title: '3-Day Streak',
      description: 'Train on 3 consecutive days.',
      tier: 'bronze', xp: 20, category: 'Consistency', icon: '▲',
      earned: streak >= 3,
      progress: Math.min(100, Math.round((streak / 3) * 100)),
    },
    {
      id: 'streak-7',
      title: 'Relentless',
      description: 'Train on 7 consecutive days.',
      tier: 'gold', xp: 75, category: 'Consistency', icon: '▲',
      earned: streak >= 7,
      progress: Math.min(100, Math.round((streak / 7) * 100)),
    },
    {
      id: 'monthly-16',
      title: 'Full Op Month',
      description: 'Log 16+ sessions in a single month.',
      tier: 'gold', xp: 80, category: 'Consistency', icon: '◈',
      earned: monthSessions >= 16,
      progress: Math.min(100, Math.round((monthSessions / 16) * 100)),
    },

    // ── VARIETY & READINESS ──────────────────────────────────
    {
      id: 'all-categories',
      title: 'Well-Rounded',
      description: 'Log Ruck, Strength, Run, Recovery, and Mobility.',
      tier: 'silver', xp: 40, category: 'Milestones', icon: '◉',
      earned: hasAllCats,
      progress: Math.min(100, Math.round((allCats.filter((c) => categories.includes(c)).length / allCats.length) * 100)),
    },
    {
      id: 'readiness-8',
      title: 'Peak Readiness',
      description: 'Maintain avg readiness ≥ 8 over 14 days.',
      tier: 'gold', xp: 60, category: 'Recovery', icon: '●',
      earned: readinessAvg >= 8,
      progress: Math.min(100, Math.round((readinessAvg / 8) * 100)),
    },
    {
      id: 'recovery-5',
      title: 'Recovery Habit',
      description: 'Log 5 recovery or mobility sessions.',
      tier: 'silver', xp: 30, category: 'Recovery', icon: '○',
      earned: recoveryLogs >= 5,
      progress: Math.min(100, Math.round((recoveryLogs / 5) * 100)),
    },
  ];
}

export const TIER_COLORS: Record<AchievementTier, string> = {
  bronze:   '#c97c3a',
  silver:   '#9ab0c4',
  gold:     '#ffaa44',
  platinum: '#c084fc',
};
