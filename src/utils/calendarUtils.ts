import type { TrainingLog } from '@/src/screens/TrainingContext';

export type CalendarDay = {
  date: string;
  dayNum: number;
  logs: TrainingLog[];
  isToday: boolean;
  isCurrentMonth: boolean;
};

export type CalendarWeek = {
  days: CalendarDay[];
  totalSessions: number;
};

export type CalendarMonth = {
  year: number;
  month: number;
  label: string;
  weeks: CalendarWeek[];
  totalSessions: number;
};

const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function fmt(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayStr(): string {
  const d = new Date();
  return fmt(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function buildCalendarMonth(logs: TrainingLog[], year: number, month: number): CalendarMonth {
  const today = todayStr();

  const logMap = new Map<string, TrainingLog[]>();
  for (const log of logs) {
    if (!logMap.has(log.date)) logMap.set(log.date, []);
    logMap.get(log.date)!.push(log);
  }

  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Mon-based
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: CalendarDay[] = [];

  // Pre-padding from previous month
  if (firstDow > 0) {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevDays = new Date(prevYear, prevMonth, 0).getDate();
    for (let i = firstDow - 1; i >= 0; i--) {
      const dayNum = prevDays - i;
      const date = fmt(prevYear, prevMonth, dayNum);
      cells.push({ date, dayNum, logs: logMap.get(date) ?? [], isToday: date === today, isCurrentMonth: false });
    }
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const date = fmt(year, month, d);
    cells.push({ date, dayNum: d, logs: logMap.get(date) ?? [], isToday: date === today, isCurrentMonth: true });
  }

  // Post-padding to fill last week
  const tail = cells.length % 7;
  if (tail > 0) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    for (let d = 1; d <= 7 - tail; d++) {
      const date = fmt(nextYear, nextMonth, d);
      cells.push({ date, dayNum: d, logs: logMap.get(date) ?? [], isToday: date === today, isCurrentMonth: false });
    }
  }

  const weeks: CalendarWeek[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const slice = cells.slice(i, i + 7);
    const totalSessions = slice.filter((d) => d.isCurrentMonth).reduce((s, d) => s + d.logs.length, 0);
    weeks.push({ days: slice, totalSessions });
  }

  const totalSessions = cells.filter((d) => d.isCurrentMonth).reduce((s, d) => s + d.logs.length, 0);

  return { year, month, label: `${MONTH_NAMES[month - 1]} ${year}`, weeks, totalSessions };
}

export function getInitialYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}
