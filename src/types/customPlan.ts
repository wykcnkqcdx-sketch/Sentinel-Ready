export type PlanCategory =
  | 'Ruck'
  | 'Run'
  | 'Strength'
  | 'Recovery'
  | 'Hiking'
  | 'Mobility'
  | 'Test';

export type PlanSession = {
  id: string;          // uuid-style: `${dayIndex}-${Date.now()}`
  category: PlanCategory;
  durationMin: number; // target duration in minutes (15–180, step 15)
  notes: string;       // optional free-text
};

export type PlanDay = {
  dayIndex: number; // 0=Mon … 6=Sun
  sessions: PlanSession[];
};

export type CustomPlan = {
  days: PlanDay[];     // always 7 entries, one per day
  createdAt: string;   // ISO date string
  updatedAt: string;
};
