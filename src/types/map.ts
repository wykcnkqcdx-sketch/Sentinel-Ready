export type TrackPoint = {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  timestamp: number;
};

export type MarkType =
  | 'checkpoint'
  | 'rv'
  | 'hazard'
  | 'water'
  | 'medic'
  | 'observation'
  | 'objective';

export type RuckCheckpoint = {
  id: string;
  label: string;
  markType?: MarkType;
  source: 'current' | 'manual';
  status: 'planned' | 'reached' | 'skipped';
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  accuracy: number | null;
  timestamp: number;
};

export type RuckSplit = {
  km: number;
  elapsedSeconds: number;
  splitSeconds: number;
};

export type RuckMissionPlan = {
  targetDistanceKm: number;
  targetMinutes: number;
  checkpointIntervalKm: number;
  checkpointIndex: number;
  finishMode?: 'target' | 'finalCheckpoint' | 'selectedCheckpoint';
  plannedCheckpoints: RuckCheckpoint[];
  selectedCheckpointId: string | null;
  splits?: RuckSplit[];
};

export type TrainingSession = {
  id: string;
  type: 'Ruck' | 'Strength' | 'Resistance' | 'Cardio' | 'Workout' | 'Run' | 'Hiking' | 'Military' | 'Mobility';
  title: string;
  score: number;
  durationMinutes: number;
  rpe: number;
  loadKg?: number;
  routePoints?: TrackPoint[];
  ruckMission?: RuckMissionPlan;
  note?: string;
  routeConfidence?: 'High' | 'Medium' | 'Low';
  rejectedPointCount?: number;
  averageAccuracyMeters?: number;
  completedAt?: string;
  updatedAt?: string;
};

export type ReadinessLog = {
  id: string;
  date: string;
  memberId?: string;
  memberName?: string;
  groupId?: string;
  sleepHours?: number;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  soreness: 1 | 2 | 3 | 4 | 5;
  stress?: 1 | 2 | 3 | 4 | 5;
  pain?: 1 | 2 | 3 | 4 | 5;
  hydration: 'Poor' | 'Adequate' | 'Optimal';
  mood?: 1 | 2 | 3 | 4 | 5;
  illness?: 1 | 2 | 3 | 4 | 5;
  painArea?: 'Knee' | 'Back' | 'Shoulder' | 'Hip' | 'Ankle' | 'Other';
  limitsTraining?: boolean;
  restingHR?: number;
  hrv?: number;
  updatedAt?: string;
};
