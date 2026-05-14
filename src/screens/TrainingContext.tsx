import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

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

const STORAGE_KEY = 'sentinel_training_logs';

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

interface TrainingContextType {
  logs: TrainingLog[];
  addLog: (log: Omit<TrainingLog, 'id'>) => Promise<void>;
  updateLog: (id: number, log: Omit<TrainingLog, 'id'>) => Promise<void>;
  deleteLog: (id: number) => Promise<void>;
  isLoading: boolean;
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export function TrainingProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const storedLogs = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedLogs) {
          setLogs(JSON.parse(storedLogs));
        } else {
          // First time opening the app, set the starter logs
          setLogs(starterLogs);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(starterLogs));
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
      const updatedLogs = logs.map((log) =>
        log.id === id
          ? {
              ...updatedLogData,
              id,
            }
          : log
      );

      setLogs(updatedLogs);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
    } catch (error) {
      console.error('Failed to update log', error);
    }
  };

  const deleteLog = async (id: number) => {
    try {
      const updatedLogs = logs.filter((log) => log.id !== id);
      setLogs(updatedLogs);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
    } catch (error) {
      console.error('Failed to delete log', error);
    }
  };

  const addLog = async (newLogData: Omit<TrainingLog, 'id'>) => {
    try {
      const newLog: TrainingLog = {
        ...newLogData,
        id: Date.now(), // Generate a unique ID based on timestamp
      };
      // Insert new log at the top of the list
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
    } catch (error) {
      console.error('Failed to save log', error);
    }
  };

  return (
    <TrainingContext.Provider value={{ logs, addLog, deleteLog, updateLog, isLoading }}>
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
