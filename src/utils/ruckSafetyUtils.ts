export type AlertLevel = 'green' | 'amber' | 'red';

export type SafetyAlert = {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
};

export type RuckSafetyInput = {
  gpsQualityWarning: string | null;
  loadKg: number | undefined;
  distanceKm: number;
  elapsedSeconds: number;
  targetDistanceKm: number;
  targetMinutes: number;
};

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatPace(distanceKm: number, elapsedSeconds: number): string {
  if (distanceKm <= 0.01) return '--:-- /km';
  const paceSeconds = elapsedSeconds / distanceKm;
  const pm = Math.floor(paceSeconds / 60);
  const ps = Math.round(paceSeconds % 60);
  return `${pm}:${String(ps).padStart(2, '0')} /km`;
}

export function buildSafetyAlerts(input: RuckSafetyInput): SafetyAlert[] {
  const { gpsQualityWarning, loadKg, distanceKm, elapsedSeconds, targetDistanceKm, targetMinutes } = input;
  const alerts: SafetyAlert[] = [];

  if (gpsQualityWarning) {
    alerts.push({
      id: 'gps_degraded',
      level: 'red',
      title: 'GPS DEGRADED',
      detail: gpsQualityWarning,
    });
  }

  if (loadKg != null && loadKg > 0) {
    if (loadKg >= 50) {
      alerts.push({
        id: 'heavy_load',
        level: 'red',
        title: 'EXTREME LOAD',
        detail: `${loadKg.toFixed(1)} kg — risk of injury, reduce if possible`,
      });
    } else if (loadKg >= 35) {
      alerts.push({
        id: 'heavy_load',
        level: 'amber',
        title: 'HEAVY LOAD',
        detail: `${loadKg.toFixed(1)} kg — monitor for fatigue and form`,
      });
    }
  }

  const hasMission = targetDistanceKm > 0 && targetMinutes > 0;
  const hasDistanceTarget = targetDistanceKm > 0;
  const elapsedMinutes = elapsedSeconds / 60;
  const paceMinPerKm = distanceKm > 0.01 ? elapsedMinutes / distanceKm : null;
  const targetPaceMinPerKm = hasMission ? targetMinutes / targetDistanceKm : null;

  if (paceMinPerKm !== null && targetPaceMinPerKm !== null && paceMinPerKm < targetPaceMinPerKm * 0.85) {
    alerts.push({
      id: 'pace_fast',
      level: 'amber',
      title: 'PACE ABOVE TARGET',
      detail: `Current ${paceMinPerKm.toFixed(1)} min/km vs target ${targetPaceMinPerKm.toFixed(1)} min/km`,
    });
  }

  if (paceMinPerKm !== null && hasMission) {
    const projectedMinutes = paceMinPerKm * targetDistanceKm;
    if (projectedMinutes > targetMinutes * 1.1) {
      alerts.push({
        id: 'projected_overtime',
        level: 'amber',
        title: 'PROJECTED OVERTIME',
        detail: `Est. ${Math.round(projectedMinutes)} min vs ${targetMinutes} min target`,
      });
    }
  }

  if (hasDistanceTarget && distanceKm > 0) {
    if (distanceKm > targetDistanceKm * 1.1) {
      alerts.push({
        id: 'distance_exceeded',
        level: 'red',
        title: 'DISTANCE EXCEEDED',
        detail: `${distanceKm.toFixed(2)} km — target was ${targetDistanceKm.toFixed(2)} km`,
      });
    } else if (distanceKm > targetDistanceKm * 1.02) {
      alerts.push({
        id: 'distance_exceeded',
        level: 'amber',
        title: 'APPROACHING LIMIT',
        detail: `${distanceKm.toFixed(2)} km of ${targetDistanceKm.toFixed(2)} km target`,
      });
    }
  }

  if (hasMission && alerts.length === 0 && distanceKm > 0.01) {
    alerts.push({
      id: 'within_plan',
      level: 'green',
      title: 'WITHIN PLAN',
      detail: `On track for ${targetDistanceKm.toFixed(1)} km in ${targetMinutes} min`,
    });
  }

  return alerts;
}
