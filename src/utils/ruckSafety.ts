export type RuckSafetyAlert = {
  id: string;
  level: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
};

export type LiveRuckSafetyInput = {
  distanceKm: number;
  elapsedSeconds: number;
  targetDistanceKm: number;
  targetMinutes: number;
  packWeightKg: number;
  gpsQualityWarning: string | null;
};

export type SavedRuckSafetyInput = LiveRuckSafetyInput & {
  readiness: number;
  rpe: number;
  routeConfidence: 'High' | 'Medium' | 'Low';
};

function projectedFinishMinutes(input: LiveRuckSafetyInput): number {
  const elapsedMinutes = input.elapsedSeconds / 60;
  if (input.distanceKm <= 0 || input.targetDistanceKm <= 0) return 0;
  return (elapsedMinutes / input.distanceKm) * input.targetDistanceKm;
}

export function buildLiveRuckSafetyAlerts(input: LiveRuckSafetyInput): RuckSafetyAlert[] {
  const alerts: RuckSafetyAlert[] = [];
  const projected = projectedFinishMinutes(input);
  const projectedOverrun = projected > 0 && input.targetMinutes > 0
    ? projected - input.targetMinutes
    : 0;

  if (input.gpsQualityWarning) {
    alerts.push({
      id: 'gps-quality',
      level: 'warning',
      title: 'GPS QUALITY',
      message: 'GPS confidence is degraded. Keep recording, but avoid using this route as a hard distance benchmark.',
    });
  }

  if (input.packWeightKg >= 25) {
    alerts.push({
      id: 'load-risk',
      level: 'danger',
      title: 'LOAD RISK',
      message: 'Pack load is high. Hold pace steady and avoid adding distance today.',
    });
  } else if (input.packWeightKg >= 18 && projectedOverrun > 5) {
    alerts.push({
      id: 'load-overrun',
      level: 'warning',
      title: 'LOAD + OVERRUN',
      message: 'Loaded pace is drifting behind target. Keep posture tight and resist chasing time.',
    });
  }

  if (projectedOverrun > 10) {
    alerts.push({
      id: 'projected-overrun',
      level: 'warning',
      title: 'PROJECTED OVERRUN',
      message: `Projected finish is about ${Math.round(projectedOverrun)} min over target. Hold effort instead of forcing pace.`,
    });
  }

  if (input.targetDistanceKm > 0 && input.distanceKm > input.targetDistanceKm * 1.05) {
    alerts.push({
      id: 'distance-exceeded',
      level: 'info',
      title: 'TARGET EXCEEDED',
      message: 'Distance target is complete. Stop clean or cool down rather than extending under load.',
    });
  }

  return alerts;
}

export function buildSavedRuckSafetyAlerts(input: SavedRuckSafetyInput): RuckSafetyAlert[] {
  const alerts = buildLiveRuckSafetyAlerts({
    distanceKm: input.distanceKm,
    elapsedSeconds: input.elapsedSeconds,
    targetDistanceKm: input.targetDistanceKm,
    targetMinutes: input.targetMinutes,
    packWeightKg: input.packWeightKg,
    gpsQualityWarning: input.routeConfidence === 'Low' ? 'Low route confidence' : input.gpsQualityWarning,
  });

  if (input.readiness > 0 && input.readiness <= 5) {
    alerts.push({
      id: 'low-readiness',
      level: 'warning',
      title: 'LOW READINESS',
      message: 'Readiness was low for a loaded session. Repeat or deload before progressing.',
    });
  }

  if (input.rpe >= 8) {
    alerts.push({
      id: 'high-rpe',
      level: 'danger',
      title: 'HIGH RPE',
      message: 'Reported effort was high. Prioritize recovery and avoid increasing load next ruck.',
    });
  }

  return alerts;
}
