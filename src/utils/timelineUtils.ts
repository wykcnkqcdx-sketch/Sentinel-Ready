import type { TrainingCategory, TrainingLog } from '@/src/screens/TrainingContext';

export type TimelineEvent = {
  id: number;
  date: string;
  dayLabel: string;
  category: TrainingCategory;
  type: string;
  readiness: number;
  primaryMetric: string;
  secondaryMetric: string;
  confidence?: 'High' | 'Medium' | 'Low';
  rpe?: number;
  notes: string;
};

export type TimelineMonth = {
  key: string;
  label: string;
  events: TimelineEvent[];
};

const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DAY_NAMES   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

function fmtPace(secondsPerKm: number): string {
  if (!secondsPerKm || !Number.isFinite(secondsPerKm)) return '';
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

function buildDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const mon = MONTH_NAMES[d.getMonth()];
  const dow = DAY_NAMES[d.getDay()];
  return `${dow} ${day} ${mon}`;
}

function buildEvent(log: TrainingLog): TimelineEvent {
  const ruck = log.ruck;
  let primaryMetric = log.distanceLoad || '--';
  let secondaryMetric = log.duration;

  if (ruck) {
    primaryMetric = `${ruck.distanceKm.toFixed(2)} km · ${ruck.packWeightKg.toFixed(0)} kg`;
    const pace = fmtPace(ruck.paceSecondsPerKm);
    secondaryMetric = [pace, log.duration].filter(Boolean).join(' · ');
  }

  return {
    id: log.id,
    date: log.date,
    dayLabel: buildDayLabel(log.date),
    category: log.category,
    type: log.type,
    readiness: Number(log.readiness) || 0,
    primaryMetric,
    secondaryMetric,
    confidence: ruck?.routeConfidence,
    rpe: ruck?.rpe,
    notes: log.notes,
  };
}

export function buildTimeline(
  logs: TrainingLog[],
  filter?: TrainingCategory,
): TimelineMonth[] {
  const src = filter ? logs.filter((l) => l.category === filter) : logs;
  const sorted = [...src].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id,
  );

  const monthMap = new Map<string, TimelineEvent[]>();
  for (const log of sorted) {
    const key = log.date.slice(0, 7);
    if (!monthMap.has(key)) monthMap.set(key, []);
    monthMap.get(key)!.push(buildEvent(log));
  }

  return Array.from(monthMap.entries()).map(([key, events]) => {
    const [year, month] = key.split('-');
    return { key, label: `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`, events };
  });
}
