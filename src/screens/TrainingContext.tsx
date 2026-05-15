import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

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
      typeof (item as TrainingLog).notes === 'string'
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

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export function TrainingProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [goals, setGoals] = useState<TrainingGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const logsRef = useRef<TrainingLog[]>([]);
  const goalsRef = useRef<TrainingGoal[]>([]);

  const commitLogs = async (updatedLogs: TrainingLog[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
    logsRef.current = updatedLogs;
    setLogs(updatedLogs);
  };

  const commitGoals = async (updatedGoals: TrainingGoal[]) => {
    await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(updatedGoals));
    goalsRef.current = updatedGoals;
    setGoals(updatedGoals);
  };

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const storedLogs = await AsyncStorage.getItem(STORAGE_KEY);
        const storedGoals = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
        if (storedLogs) {
          let parsedLogs: unknown;
          try {
            parsedLogs = JSON.parse(storedLogs);
          } catch {
            parsedLogs = null;
          }
          if (isValidLogArray(parsedLogs)) {
            logsRef.current = parsedLogs;
            setLogs(parsedLogs);
          } else {
            console.warn('Stored logs failed validation — loading starter logs');
            logsRef.current = starterLogs;
            setLogs(starterLogs);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(starterLogs));
          }
        } else {
          // First time opening the app, set the starter logs
          logsRef.current = starterLogs;
          setLogs(starterLogs);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(starterLogs));
        }

        if (storedGoals) {
          let parsedGoals: unknown;
          try {
            parsedGoals = JSON.parse(storedGoals);
          } catch {
            parsedGoals = null;
          }
          if (isValidGoalArray(parsedGoals)) {
            goalsRef.current = parsedGoals;
            setGoals(parsedGoals);
          } else {
            goalsRef.current = starterGoals;
            setGoals(starterGoals);
            await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(starterGoals));
          }
        } else {
          goalsRef.current = starterGoals;
          setGoals(starterGoals);
          await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(starterGoals));
        }
      } catch (error) {
        console.error('Failed to load logs', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLogs();
  }, []);

  const updateLog = async (id: number, updatedLogData: Omit<TrainingLog, 'id'>) => {
    try {
      const updatedLogs = logsRef.current.map((log) =>
        log.id === id
          ? {
              ...updatedLogData,
              id,
            }
          : log
      );

      await commitLogs(updatedLogs);
    } catch (error) {
      console.error('Failed to update log', error);
      throw error;
    }
  };

  const deleteLog = async (id: number) => {
    try {
      const updatedLogs = logsRef.current.filter((log) => log.id !== id);
      await commitLogs(updatedLogs);
    } catch (error) {
      console.error('Failed to delete log', error);
      throw error;
    }
  };

  const addLog = async (newLogData: Omit<TrainingLog, 'id'>) => {
    try {
      const currentLogs = logsRef.current;
      const newId = currentLogs.length > 0 ? Math.max(...currentLogs.map(l => l.id)) + 1 : Date.now();
      const newLog: TrainingLog = {
        ...newLogData,
        id: newId,
      };
      // Insert new log at the top of the list
      const updatedLogs = [newLog, ...currentLogs];
      await commitLogs(updatedLogs);
    } catch (error) {
      console.error('Failed to save log', error);
      throw error;
    }
  };

  const duplicateLog = async (id: number) => {
    const source = logsRef.current.find((log) => log.id === id);
    if (!source) return;

    await addLog({
      ...source,
      date: new Date().toISOString().slice(0, 10),
      notes: `${source.notes} Duplicated from ${source.date}.`.trim(),
    });
  };

  const addGoal = async (goalData: Omit<TrainingGoal, 'id'>) => {
    const currentGoals = goalsRef.current;
    const newId = currentGoals.length > 0 ? Math.max(...currentGoals.map((goal) => goal.id)) + 1 : Date.now();
    await commitGoals([{ ...goalData, id: newId }, ...currentGoals]);
  };

  const updateGoal = async (id: number, goalData: Omit<TrainingGoal, 'id'>) => {
    await commitGoals(goalsRef.current.map((goal) => (goal.id === id ? { ...goalData, id } : goal)));
  };

  const deleteGoal = async (id: number) => {
    await commitGoals(goalsRef.current.filter((goal) => goal.id !== id));
  };

  const exportLogsCsv = () => {
    const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const header = ['id', 'date', 'category', 'type', 'duration', 'distanceLoad', 'readiness', 'notes'];
    const rows = logsRef.current.map((log) =>
      [log.id, log.date, log.category, log.type, log.duration, log.distanceLoad, log.readiness, log.notes]
        .map(escapeCsv)
        .join(',')
    );
    return [header.join(','), ...rows].join('\n');
  };

  const importLogsCsv = async (csv: string) => {
    const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return 0;

    const imported: TrainingLog[] = [];
    const categories: TrainingCategory[] = ['Ruck', 'Strength', 'Run', 'Mobility', 'Test', 'Recovery'];

    for (const line of lines.slice(1)) {
      const fields = line.match(/("([^"]|"")*"|[^,]+)/g)?.map((field) =>
        field.replace(/^"|"$/g, '').replace(/""/g, '"')
      );
      if (!fields || fields.length < 8) continue;
      const category = categories.includes(fields[2] as TrainingCategory) ? fields[2] as TrainingCategory : 'Ruck';
      imported.push({
        id: Number(fields[0]) || Date.now() + imported.length,
        date: fields[1],
        category,
        type: fields[3],
        duration: fields[4],
        distanceLoad: fields[5],
        readiness: fields[6],
        notes: fields[7],
      });
    }

    const existingIds = new Set(logsRef.current.map((log) => log.id));
    const normalised = imported.map((log, index) => ({
      ...log,
      id: existingIds.has(log.id) ? Date.now() + index : log.id,
    }));
    await commitLogs([...normalised, ...logsRef.current]);
    return normalised.length;
  };

  return (
    <TrainingContext.Provider value={{
      logs,
      goals,
      addLog,
      deleteLog,
      updateLog,
      duplicateLog,
      addGoal,
      updateGoal,
      deleteGoal,
      exportLogsCsv,
      importLogsCsv,
      isLoading,
    }}>
      {children}
    </TrainingContext.Provider>
  );
}

export function useTraining() {
  const context = useContext(TrainingContext);
  if (context === undefined) {
    throw new Error('useTraining must be used within a TrainingProvider');
  }
  return context;
}
