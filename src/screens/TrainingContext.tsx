import type { RouteData } from '@/src/utils/trainingLogUtils';

export type TrainingCategory = 'Ruck' | 'Strength' | 'Run' | 'Mobility' | 'Test' | 'Recovery';

export type TrainingLog = {
  id: number;
  date: string;
  category: TrainingCategory;
  type: string;
  duration: string;
  distanceLoad: string;
  readiness: string;
  notes: string;
  route?: RouteData;
};

export type GoalCategory = 'Ruck' | 'Run' | 'Strength' | 'Recovery' | 'Test' | 'Consistency';
export type GoalStatus = 'active' | 'complete';

export type TrainingGoal = {
  id: number;
  category: GoalCategory;
  title: string;
  target: string;
  current: string;
  deadline: string;
  notes: string;
  status: GoalStatus;
};

const STORAGE_KEY = 'sentinel_training_logs';
const GOALS_STORAGE_KEY = 'sentinel_training_goals';

function isValidLogArray(parsed: unknown): parsed is TrainingLog[] {
  if (!Array.isArray(parsed)) return false;
  return parsed.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as TrainingLog).id === 'number' &&
      typeof (item as TrainingLog).date === 'string' &&
      typeof (item as TrainingLog).category === 'string' &&
      typeof (item as TrainingLog).type === 'string' &&
      typeof (item as TrainingLog).duration === 'string' &&
      typeof (item as TrainingLog).readiness === 'string' &&
      typeof (item as TrainingLog).notes === 'string' &&
      (typeof (item as TrainingLog).route === 'undefined' || typeof (item as TrainingLog).route === 'object')
  );
}

function isValidGoalArray(parsed: unknown): parsed is TrainingGoal[] {
  if (!Array.isArray(parsed)) return false;
  return parsed.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as TrainingGoal).id === 'number' &&
      typeof (item as TrainingGoal).category === 'string' &&
      typeof (item as TrainingGoal).title === 'string' &&
      typeof (item as TrainingGoal).target === 'string' &&
      typeof (item as TrainingGoal).current === 'string' &&
      typeof (item as TrainingGoal).deadline === 'string' &&
      typeof (item as TrainingGoal).notes === 'string' &&
      ((item as TrainingGoal).status === 'active' || (item as TrainingGoal).status === 'complete')
  );
}

export function calculateReadinessPercentage(logs: TrainingLog[]) {
  const recentLogs = [...logs]
    .sort((a, b) => {
      const ta = new Date(a.date + 'T00:00:00').getTime();
      const tb = new Date(b.date + 'T00:00:00').getTime();
      return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta) || b.id - a.id;
    })
    .slice(0, 5);
  const avgScore = recentLogs.length > 0
    ? recentLogs.reduce((sum, log) => sum + (Number(log.readiness) || 0), 0) / recentLogs.length
    : 0;
  return recentLogs.length > 0 ? Math.round((avgScore / 10) * 100) : 0;
}

function getDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const starterLogs: TrainingLog[] = [
  {
    id: 1,
    date: getDaysAgo(1),
    category: 'Ruck',
    type: 'Loaded Ruck',
    duration: '1 hr 45 min',
    distanceLoad: '12 km - 18 kg',
    readiness: '7',
    notes: 'Steady tactical pace throughout. Pack sat well. Feet checked at 6 km — no hot spots. Breathing controlled. Recovery needed after.',
    route: {
      distanceKm: 12,
      elevationGainMeters: 150,
      packWeightKg: 18,
      polyline: 'g_q~Fv_o{Om@gC_@sBw@kDe@}Bm@qDq@mEo@cEo@yD}@yCs@}Bq@aBs@mAu@aAo@cA_@s@',
    },
  },
  {
    id: 2,
    date: getDaysAgo(4),
    category: 'Strength',
    type: 'Full Body Strength',
    duration: '55 min',
    distanceLoad: 'Squat - Press - Pull - Hinge',
    readiness: '8',
    notes: 'Controlled intensity. Form stayed solid across all movements. Left two reps in reserve on every set. No joint discomfort.',
  },
  {
    id: 3,
    date: getDaysAgo(8),
    category: 'Run',
    type: 'Steady Run',
    duration: '35 min',
    distanceLoad: '5 km',
    readiness: '7',
    notes: 'Aerobic pace throughout. Breathing stayed controlled. Calves monitored — no unusual tightness. Finished with energy remaining.',
  },
  {
    id: 4,
    date: getDaysAgo(11),
    category: 'Strength',
    type: 'Full Body Strength',
    duration: '50 min',
    distanceLoad: 'Squat - Press - Pull - Hinge',
    readiness: '6',
    notes: 'Heavier session than last week. Effort was higher than expected. Form held on squats but press felt fatigued on final set.',
  },
  {
    id: 5,
    date: getDaysAgo(14),
    category: 'Recovery',
    type: 'Recovery Mobility',
    duration: '25 min',
    distanceLoad: 'Hips - Calves - Hamstrings - Shoulders',
    readiness: '5',
    notes: 'Light recovery after heavy week. Hips and calves worked. Stiffness reduced. Hydration and sleep prioritised. Felt better after.',
  },
];

const starterGoals: TrainingGoal[] = [
  {
    id: 1,
    category: 'Ruck',
    title: '10 km operational ruck',
    target: '10 km with 18 kg at steady pace',
    current: '12 km with 18 kg logged',
    deadline: '',
    notes: 'Maintain foot care and recovery while improving pace.',
    status: 'active',
  },
  {
    id: 2,
    category: 'Consistency',
    title: 'Four quality sessions per week',
    target: '4 sessions weekly with at least one recovery entry',
    current: 'Building baseline',
    deadline: '',
    notes: 'Keep readiness above 6 before adding extra load.',
    status: 'active',
  },
];

interface TrainingContextType {
  logs: TrainingLog[];
  goals: TrainingGoal[];
  addLog: (log: Omit<TrainingLog, 'id'>) => Promise<void>;
  updateLog: (id: number, log: Omit<TrainingLog, 'id'>) => Promise<void>;
  deleteLog: (id: number) => Promise<void>;
  duplicateLog: (id: number) => Promise<void>;
  addGoal: (goal: Omit<TrainingGoal, 'id'>) => Promise<void>;
  updateGoal: (id: number, goal: Omit<TrainingGoal, 'id'>) => Promise<void>;
  deleteGoal: (id: number) => Promise<void>;
  exportLogsCsv: () => string;
  importLogsCsv: (csv: string) => Promise<number>;
  isLoading: boolean;
}

const TrainingContext 