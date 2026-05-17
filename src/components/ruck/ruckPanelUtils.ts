export function formatPace(pace: number): string {
  if (!pace) return '--';
  let mins = Math.floor(pace);
  let secs = Math.round((pace - mins) * 60);
  if (secs === 60) {
    mins += 1;
    secs = 0;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

export function formatDuration(minutes: number): string {
  if (!minutes) return '--';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export function formatDurationFromSeconds(seconds: number): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  return formatDuration(totalMinutes);
}

export function getNumberInput(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function progressPercent(value: number, target: number) {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, (value / target) * 100));
}
